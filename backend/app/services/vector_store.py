"""
Qdrant vector store service.
Handles collection management, upsert, search, and deletion.
"""

import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    SearchParams,
)

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("vector_store")

_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    """Get or create Qdrant client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None
        )
        logger.info("qdrant_connected", url=settings.QDRANT_URL)
    return _client


def ensure_collection() -> None:
    """Create the vector collection if it doesn't exist."""
    settings = get_settings()
    client = get_qdrant_client()
    collections = client.get_collections().collections
    exists = any(c.name == settings.QDRANT_COLLECTION for c in collections)

    if not exists:
        client.create_collection(
            collection_name=settings.QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=settings.EMBEDDING_DIMENSION,
                distance=Distance.COSINE,
            ),
        )
        logger.info("collection_created", name=settings.QDRANT_COLLECTION)
    else:
        logger.info("collection_exists", name=settings.QDRANT_COLLECTION)


def upsert_chunks(
    document_id: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> int:
    """
    Upsert document chunks with their embeddings into Qdrant.

    Args:
        document_id: Parent document UUID.
        chunks: List of chunk dicts with content, metadata.
        embeddings: Corresponding embedding vectors.

    Returns:
        Number of points upserted.
    """
    settings = get_settings()
    client = get_qdrant_client()

    points = []
    for chunk, embedding in zip(chunks, embeddings):
        point_id = str(uuid.uuid4())
        points.append(PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "document_id": document_id,
                "document_title": chunk.get("document_title", ""),
                "content": chunk.get("content", ""),
                "chunk_index": chunk.get("chunk_index", 0),
                "page_number": chunk.get("page_number"),
                "category": chunk.get("category", "general"),
            },
        ))

    # Upsert in batches of 100
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i : i + batch_size]
        client.upsert(
            collection_name=settings.QDRANT_COLLECTION,
            points=batch,
        )

    logger.info("chunks_upserted", document_id=document_id, count=len(points))
    return len(points)


def search_similar(
    query_embedding: list[float],
    top_k: int = 10,
    score_threshold: float = 0.35,
) -> list[dict]:
    """
    Search for similar chunks in Qdrant.

    Args:
        query_embedding: Query vector.
        top_k: Number of results to return.
        score_threshold: Minimum similarity score.

    Returns:
        List of dicts with content, metadata, and similarity score.
    """
    settings = get_settings()
    client = get_qdrant_client()

    results = client.search(
        collection_name=settings.QDRANT_COLLECTION,
        query_vector=query_embedding,
        limit=top_k,
        score_threshold=score_threshold,
        search_params=SearchParams(hnsw_ef=128, exact=False),
    )

    chunks = []
    for hit in results:
        chunks.append({
            "id": str(hit.id),
            "content": hit.payload.get("content", ""),
            "document_id": hit.payload.get("document_id", ""),
            "document_title": hit.payload.get("document_title", ""),
            "page_number": hit.payload.get("page_number"),
            "chunk_index": hit.payload.get("chunk_index", 0),
            "category": hit.payload.get("category", "general"),
            "similarity": hit.score,
        })

    logger.info("search_completed", results=len(chunks), top_k=top_k)
    return chunks


def delete_document_chunks(document_id: str) -> None:
    """Delete all chunks belonging to a document."""
    settings = get_settings()
    client = get_qdrant_client()

    client.delete(
        collection_name=settings.QDRANT_COLLECTION,
        points_selector=Filter(
            must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))]
        ),
    )
    logger.info("chunks_deleted", document_id=document_id)
