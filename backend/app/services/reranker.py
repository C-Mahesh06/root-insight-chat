"""
Cross-encoder reranking service using BAAI/bge-reranker-base.
Reranks retrieved chunks by relevance to the query.
"""

from sentence_transformers import CrossEncoder

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("reranker")

_reranker: CrossEncoder | None = None


def load_reranker() -> CrossEncoder | None:
    """Load the cross-encoder reranker model (called once at startup)."""
    global _reranker
    if _reranker is not None:
        return _reranker

    settings = get_settings()
    if not settings.RERANKER_MODEL:
        logger.info("reranker_disabled")
        return None

    logger.info("loading_reranker", model=settings.RERANKER_MODEL)
    _reranker = CrossEncoder(settings.RERANKER_MODEL)
    logger.info("reranker_loaded")
    return _reranker


def get_reranker() -> CrossEncoder | None:
    """Get the loaded reranker model."""
    if _reranker is None:
        return load_reranker()
    return _reranker


def rerank_chunks(
    query: str,
    chunks: list[dict],
    top_k: int = 5,
) -> list[dict]:
    """
    Rerank retrieved chunks using a cross-encoder.

    The cross-encoder scores each (query, chunk) pair directly,
    providing more accurate relevance scores than bi-encoder similarity.

    Args:
        query: The user's search query.
        chunks: Retrieved chunks from vector search.
        top_k: Number of top chunks to return after reranking.

    Returns:
        Top-k chunks sorted by reranker score, with added 'rerank_score'.
    """
    if not chunks:
        return []

    settings = get_settings()
    if not settings.RERANKER_MODEL:
        logger.info("reranking_skipped", input_count=len(chunks))
        # Fallback: assign similarity score as rerank_score
        for chunk in chunks:
            chunk["rerank_score"] = chunk.get("similarity", 0.0)
        return chunks[:top_k]

    reranker = get_reranker()
    if reranker is None:
        for chunk in chunks:
            chunk["rerank_score"] = chunk.get("similarity", 0.0)
        return chunks[:top_k]

    # Create (query, chunk_content) pairs
    pairs = [(query, chunk["content"]) for chunk in chunks]
    scores = reranker.predict(pairs)

    # Attach scores and sort
    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)

    reranked = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)

    logger.info(
        "reranking_done",
        input_count=len(chunks),
        output_count=min(top_k, len(reranked)),
        top_score=reranked[0]["rerank_score"] if reranked else 0,
    )

    return reranked[:top_k]
