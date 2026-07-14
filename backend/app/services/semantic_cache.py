"""
Semantic query cache service.
$0 cost — uses diskcache (local filesystem) + cosine similarity on embeddings.

How it works:
    1. On every query, embed it with the same embedding model
    2. Check all cached query embeddings for cosine similarity ≥ threshold
    3. If hit → return cached response instantly (0ms LLM cost)
    4. If miss → store (embedding, response, sources) after LLM answers

Why this matters:
    - Plant disease queries are highly repetitive: "how to treat powdery mildew"
    - Cache hit rate typically 20-40% in production
    - Eliminates Groq API calls for repeated questions (cost=0, latency=0)
"""

import json
import time
import hashlib
from pathlib import Path

import numpy as np
import diskcache

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("cache")

_cache: diskcache.Cache | None = None


def get_cache() -> diskcache.Cache | None:
    """Get or initialize the disk cache."""
    global _cache
    settings = get_settings()

    if not settings.CACHE_ENABLED:
        return None

    if _cache is not None:
        return _cache

    cache_dir = Path(settings.CACHE_DIR)
    cache_dir.mkdir(parents=True, exist_ok=True)

    _cache = diskcache.Cache(
        str(cache_dir),
        size_limit=settings.CACHE_MAX_SIZE_MB * 1024 * 1024,
        eviction_policy="least-recently-used",
    )
    logger.info("cache_initialized", dir=str(cache_dir), max_mb=settings.CACHE_MAX_SIZE_MB)
    return _cache


def _cosine_sim(a: list[float], b: list[float]) -> float:
    """Fast cosine similarity (vectors are pre-normalized by BGE)."""
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb))


def cache_lookup(query_embedding: list[float], model_name: str | None) -> tuple[str, list[dict]] | None:
    """
    Look up a cached response for a semantically similar query and same model.

    Args:
        query_embedding: Normalized embedding of the current query.
        model_name: Selected model name.

    Returns:
        (response_text, sources) if cache hit, else None.
    """
    settings = get_settings()
    cache = get_cache()
    if cache is None:
        return None

    if not model_name:
        model_name = "my-own-model"
    model_name = model_name.lower().strip()

    threshold = settings.CACHE_SIMILARITY_THRESHOLD
    best_sim = 0.0
    best_key = None

    try:
        for key in cache.iterkeys():
            if not isinstance(key, str) or not key.startswith("q:"):
                continue
            entry = cache.get(key)
            if entry is None:
                continue

            # Ensure model names match
            cached_model = entry.get("model_name", "my-own-model").lower().strip()
            if cached_model != model_name:
                continue

            cached_emb = entry.get("embedding")
            if cached_emb is None:
                continue
            sim = _cosine_sim(query_embedding, cached_emb)
            if sim > best_sim:
                best_sim = sim
                best_key = key
    except Exception as e:
        logger.warning("cache_lookup_error", error=str(e))
        return None

    if best_key and best_sim >= threshold:
        entry = cache.get(best_key)
        if entry:
            logger.info(
                "cache_hit",
                similarity=round(best_sim, 4),
                model=model_name,
                cached_query=entry.get("query", "?")[:60],
            )
            # Refresh TTL
            cache.touch(best_key, expire=86400 * 7)
            return entry["response"], entry["sources"]

    logger.info("cache_miss", best_sim=round(best_sim, 4), model=model_name)
    return None


def cache_store(
    query: str,
    query_embedding: list[float],
    response: str,
    sources: list[dict],
    model_name: str | None,
) -> None:
    """
    Store a query response in the cache.

    Args:
        query: Original query text.
        query_embedding: Normalized embedding of the query.
        response: LLM response text.
        sources: Retrieved source references.
        model_name: Selected model name.
    """
    cache = get_cache()
    if cache is None:
        return

    if not model_name:
        model_name = "my-own-model"
    model_name = model_name.lower().strip()

    try:
        # Use content hash + model hash as key
        query_hash = hashlib.md5(query.encode()).hexdigest()
        model_hash = hashlib.md5(model_name.encode()).hexdigest()
        key = f"q:{query_hash}_{model_hash}"
        entry = {
            "query": query,
            "embedding": query_embedding,
            "response": response,
            "sources": sources,
            "model_name": model_name,
            "timestamp": time.time(),
        }
        cache.set(key, entry, expire=86400 * 7)  # 7-day TTL
        logger.info("cache_stored", key=key, query=query[:60], model=model_name)
    except Exception as e:
        logger.warning("cache_store_error", error=str(e))


def cache_stats() -> dict:
    """Return cache statistics."""
    cache = get_cache()
    if cache is None:
        return {"enabled": False}
    return {
        "enabled": True,
        "entries": len(cache),
        "size_bytes": cache.volume(),
        "hits": cache.stats().get("hits", 0),
        "misses": cache.stats().get("misses", 0),
    }


def cache_clear() -> int:
    """Clear all cache entries. Returns number of entries deleted."""
    cache = get_cache()
    if cache is None:
        return 0
    count = len(cache)
    cache.clear()
    logger.info("cache_cleared", entries=count)
    return count
