"""
BM25 sparse retrieval service.
Implements the BM25 (Okapi BM25) algorithm for keyword-based search.
Combined with dense vector search = Hybrid RAG (best retrieval quality).

Why BM25?
- Dense embeddings miss exact keyword matches (medical terms, species names)
- BM25 excels at rare/specific terms: "Phytophthora infestans", "azoxystrobin"
- Hybrid = best of both worlds; used by Elasticsearch, Qdrant's own hybrid search

Cost: $0 — pure Python, no API calls, no GPU required.
"""

import re
import math
import time
import threading
from collections import Counter
from dataclasses import dataclass, field
from typing import Optional

from app.utils.logger import get_logger

logger = get_logger("bm25")

# ─────────────────────────────────────────────────────────────
# BM25 Index Singleton Cache
# ─────────────────────────────────────────────────────────────

_BM25_CACHE_TTL_SECONDS = 600  # Rebuild at most once every 10 minutes

@dataclass
class _BM25Cache:
    index: Optional["BM25Index"] = None
    built_at: float = 0.0
    lock: threading.Lock = field(default_factory=threading.Lock)

_bm25_cache = _BM25Cache()


def get_or_build_bm25_index(chunks: list[dict]) -> Optional["BM25Index"]:
    """
    Return the cached BM25Index if it was built within the TTL window.
    Otherwise rebuild it from `chunks` and cache the new instance.

    This avoids rebuilding the full BM25 index (60-80 MB) on every RAG request.
    """
    if not chunks:
        return None

    now = time.monotonic()
    with _bm25_cache.lock:
        age = now - _bm25_cache.built_at
        if _bm25_cache.index is not None and age < _BM25_CACHE_TTL_SECONDS:
            logger.debug("bm25_cache_hit", age_seconds=round(age, 1))
            return _bm25_cache.index

        logger.info("bm25_index_rebuilding", chunks=len(chunks), reason="cache_miss_or_expired")
        _bm25_cache.index = BM25Index(chunks)
        _bm25_cache.built_at = time.monotonic()
        return _bm25_cache.index


def invalidate_bm25_cache() -> None:
    """Force the next request to rebuild the BM25 index. Call after ingesting new documents."""
    with _bm25_cache.lock:
        _bm25_cache.index = None
        _bm25_cache.built_at = 0.0
    logger.info("bm25_cache_invalidated")

# BM25 hyperparameters (TREC-tested defaults)
K1 = 1.5   # Term frequency saturation
B = 0.75   # Length normalization factor


def _tokenize(text: str) -> list[str]:
    """
    Lightweight tokenizer: lowercase, split on non-alpha, remove stopwords.
    Keeps domain-specific terms intact (no stemming to preserve exact plant terms).
    """
    _STOPWORDS = {
        "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "this", "that", "these", "those",
        "it", "its", "as", "up", "my", "your", "our", "i", "we", "you", "he",
        "she", "they", "their", "what", "which", "who", "when", "where", "how",
    }
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    return [t for t in tokens if t not in _STOPWORDS and len(t) > 1]


class BM25Index:
    """
    In-memory BM25 index built over a corpus of text chunks.

    Usage:
        index = BM25Index(chunks)
        results = index.search(query, top_k=10)
    """

    def __init__(self, chunks: list[dict]) -> None:
        """
        Build BM25 index from a list of chunk dicts.

        Args:
            chunks: List of dicts with at minimum a 'content' key.
        """
        self.chunks = chunks
        self.n = len(chunks)
        self.tokenized: list[list[str]] = [_tokenize(c["content"]) for c in chunks]
        self.doc_lengths: list[int] = [len(t) for t in self.tokenized]
        self.avgdl: float = sum(self.doc_lengths) / max(self.n, 1)

        # Build inverted index: term → {doc_idx: term_freq}
        self.idf: dict[str, float] = {}
        self.tf: list[dict[str, int]] = []

        df: dict[str, int] = {}
        for tokens in self.tokenized:
            tf = Counter(tokens)
            self.tf.append(dict(tf))
            for term in set(tokens):
                df[term] = df.get(term, 0) + 1

        # IDF with smoothing
        for term, n_docs in df.items():
            self.idf[term] = math.log(
                (self.n - n_docs + 0.5) / (n_docs + 0.5) + 1.0
            )

        logger.info("bm25_index_built", docs=self.n, avgdl=round(self.avgdl, 1))

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """
        Score all documents for query using BM25 and return top_k.

        Args:
            query: Search query string.
            top_k: Number of top results to return.

        Returns:
            List of chunk dicts with added 'bm25_score' (0.0–1.0 normalized).
        """
        query_tokens = _tokenize(query)
        if not query_tokens:
            return []

        scores: list[float] = []
        for i, tf in enumerate(self.tf):
            dl = self.doc_lengths[i]
            score = 0.0
            for term in query_tokens:
                if term not in self.idf:
                    continue
                freq = tf.get(term, 0)
                # BM25 formula
                numerator = self.idf[term] * freq * (K1 + 1)
                denominator = freq + K1 * (1 - B + B * dl / self.avgdl)
                score += numerator / max(denominator, 1e-9)
            scores.append(score)

        # Normalize to [0, 1]
        max_score = max(scores) if scores else 1.0
        if max_score == 0:
            return []

        # Collect top_k non-zero results
        indexed = [(i, s / max_score) for i, s in enumerate(scores) if s > 0]
        indexed.sort(key=lambda x: x[1], reverse=True)
        top = indexed[:top_k]

        results = []
        for idx, norm_score in top:
            chunk = dict(self.chunks[idx])
            chunk["bm25_score"] = round(norm_score, 4)
            results.append(chunk)

        logger.info("bm25_search_done", query_tokens=query_tokens, returned=len(results))
        return results


def reciprocal_rank_fusion(
    dense_results: list[dict],
    bm25_results: list[dict],
    dense_weight: float = 0.7,
    bm25_weight: float = 0.3,
    rrf_k: int = 60,
) -> list[dict]:
    """
    Fuse dense and sparse results using Reciprocal Rank Fusion (RRF).

    RRF is better than simple score normalization because it's robust to
    score scale differences between retrieval methods.

    Score formula: weight / (k + rank)

    Args:
        dense_results: Chunks from vector search (sorted by similarity).
        bm25_results: Chunks from BM25 search (sorted by bm25_score).
        dense_weight: Weight for dense ranking score (default 0.7).
        bm25_weight: Weight for BM25 ranking score (default 0.3).
        rrf_k: RRF constant — higher = more rank-insensitive fusion.

    Returns:
        De-duplicated list of chunks sorted by fused RRF score.
    """
    fused: dict[str, dict] = {}

    # Score dense results
    for rank, chunk in enumerate(dense_results, 1):
        cid = chunk.get("id", chunk.get("content", "")[:40])
        if cid not in fused:
            fused[cid] = dict(chunk)
            fused[cid]["rrf_score"] = 0.0
        fused[cid]["rrf_score"] += dense_weight / (rrf_k + rank)

    # Score BM25 results
    for rank, chunk in enumerate(bm25_results, 1):
        cid = chunk.get("id", chunk.get("content", "")[:40])
        if cid not in fused:
            fused[cid] = dict(chunk)
            fused[cid]["rrf_score"] = 0.0
        fused[cid]["rrf_score"] += bm25_weight / (rrf_k + rank)

    sorted_chunks = sorted(fused.values(), key=lambda c: c["rrf_score"], reverse=True)

    logger.info(
        "rrf_fusion_done",
        dense=len(dense_results),
        bm25=len(bm25_results),
        fused=len(sorted_chunks),
    )
    return sorted_chunks
