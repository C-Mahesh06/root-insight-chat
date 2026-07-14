"""
Cross-encoder reranking service.
Model: cross-encoder/ms-marco-MiniLM-L-6-v2 (best free reranker, 2026)
- Dramatically improves precision over bi-encoder retrieval
- ~22M params — fast on CPU, ~50ms for 15 pairs
- Loads once at startup
"""

from sentence_transformers import CrossEncoder

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("reranker")

_reranker: CrossEncoder | None = None


def load_reranker() -> CrossEncoder | None:
    """Load the cross-encoder reranker model once at startup."""
    global _reranker
    if _reranker is not None:
        return _reranker

    settings = get_settings()
    if not settings.RERANKER_MODEL:
        logger.info("reranker_disabled")
        return None

    logger.info("loading_reranker", model=settings.RERANKER_MODEL)
    _reranker = CrossEncoder(settings.RERANKER_MODEL, max_length=512)
    logger.info("reranker_loaded", model=settings.RERANKER_MODEL)
    return _reranker


def get_reranker() -> CrossEncoder | None:
    """Get the loaded reranker (lazy-load if needed)."""
    if _reranker is None:
        return load_reranker()
    return _reranker


def rerank_chunks(
    query: str,
    chunks: list[dict],
    top_k: int = 5,
    score_threshold: float = -5.0,
) -> list[dict]:
    """
    Rerank retrieved chunks with a cross-encoder.

    Cross-encoders consider the full (query, passage) pair jointly —
    far more accurate than bi-encoder cosine similarity.

    Steps:
        1. Build (query, chunk) pairs
        2. Score all pairs in a single batch
        3. Filter by score_threshold to drop clearly irrelevant chunks
        4. Return top_k sorted by score

    Args:
        query: The condensed search query.
        chunks: Retrieved chunks from hybrid search.
        top_k: Number of top chunks to return.
        score_threshold: Minimum raw logit score to retain a chunk.

    Returns:
        Top-k chunks with added 'rerank_score' field.
    """
    if not chunks:
        return []

    settings = get_settings()

    reranker = get_reranker()
    if reranker is None:
        # Fallback: sort by vector similarity
        for chunk in chunks:
            chunk["rerank_score"] = chunk.get("similarity", 0.0)
        chunks_sorted = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)
        logger.info("reranking_skipped_fallback", returned=min(top_k, len(chunks_sorted)))
        return chunks_sorted[:top_k]

    # Truncate chunk content to avoid slow scoring on very long texts
    pairs = [(query, chunk["content"][:512]) for chunk in chunks]
    scores = reranker.predict(pairs, show_progress_bar=False)

    for chunk, score in zip(chunks, scores):
        chunk["rerank_score"] = float(score)

    # Filter by threshold then sort
    filtered = [c for c in chunks if c["rerank_score"] >= score_threshold]
    reranked = sorted(filtered, key=lambda c: c["rerank_score"], reverse=True)

    result = reranked[:top_k]

    logger.info(
        "reranking_done",
        input_count=len(chunks),
        filtered_count=len(filtered),
        output_count=len(result),
        top_score=round(result[0]["rerank_score"], 3) if result else 0,
        bottom_score=round(result[-1]["rerank_score"], 3) if result else 0,
    )

    return result
