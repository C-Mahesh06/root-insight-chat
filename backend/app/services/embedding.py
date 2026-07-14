"""
Embedding service using BAAI/bge-large-en-v1.5 (1024-dim).
- Best free open-source embedding model as of 2026
- Uses instruction prefix for queries (BGE best practice)
- Loads once at startup; thread-safe for concurrent requests
"""

from sentence_transformers import SentenceTransformer
import numpy as np

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("embedding")

_model: SentenceTransformer | None = None

# BGE query prefix — improves retrieval accuracy by 5-8%
BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def load_embedding_model() -> SentenceTransformer:
    """Load the embedding model once at startup."""
    global _model
    if _model is not None:
        return _model

    settings = get_settings()
    logger.info("loading_embedding_model", model=settings.EMBEDDING_MODEL)
    _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    logger.info(
        "embedding_model_loaded",
        model=settings.EMBEDDING_MODEL,
        dimension=settings.EMBEDDING_DIMENSION,
    )
    return _model


def get_embedding_model() -> SentenceTransformer:
    """Get the loaded embedding model (lazy-load if needed)."""
    if _model is None:
        return load_embedding_model()
    return _model


def embed_texts(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """
    Generate normalized embeddings for a list of document passages.
    No instruction prefix for documents — only for queries.

    Args:
        texts: Document passage strings to embed.
        batch_size: Encode batch size (tune for available RAM).

    Returns:
        List of normalized 1024-dim embedding vectors.
    """
    if not texts:
        return []

    model = get_embedding_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Generate a normalized embedding for a search query.
    Uses BGE instruction prefix for optimal retrieval performance.

    Args:
        query: User's search query.

    Returns:
        Normalized 1024-dim embedding vector.
    """
    model = get_embedding_model()
    prefixed = f"{BGE_QUERY_PREFIX}{query}"
    embedding = model.encode(
        [prefixed],
        normalize_embeddings=True,
        show_progress_bar=False,
        convert_to_numpy=True,
    )
    return embedding[0].tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two normalized vectors."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    # Vectors are pre-normalized so dot product == cosine sim
    return float(np.dot(va, vb))
