"""
Contextual compression service.
Strips irrelevant sentences from retrieved chunks before passing to the LLM.

Why this matters:
    - Retrieved chunks often contain surrounding context that isn't relevant
    - Sending less noise → LLM focuses on what matters → better answers
    - Reduces token usage → faster streaming, lower API cost

Implementation: Rule-based sentence filtering (no LLM call needed → $0 cost)
    1. Split chunk into sentences
    2. Score each sentence by keyword overlap with query
    3. Keep sentences above threshold; always keep first sentence for context
"""

import re
from app.utils.logger import get_logger

logger = get_logger("compression")

# Min sentence length to consider (very short = likely header/footer)
MIN_SENTENCE_LENGTH = 20


def _sentence_split(text: str) -> list[str]:
    """Split text into sentences using punctuation patterns."""
    # Split on sentence-ending punctuation followed by space + capital
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text)
    return [s.strip() for s in sentences if s.strip()]


def _score_sentence(sentence: str, query_keywords: set[str]) -> float:
    """
    Score a sentence by keyword overlap with query keywords.
    Returns ratio of matched keywords (0.0 to 1.0).
    """
    if not query_keywords:
        return 1.0  # Keep all if no keywords extracted

    sentence_lower = sentence.lower()
    matched = sum(1 for kw in query_keywords if kw in sentence_lower)
    return matched / len(query_keywords)


def _extract_keywords(query: str) -> set[str]:
    """Extract meaningful keywords from query for sentence scoring."""
    _STOPWORDS = {
        "the", "a", "an", "and", "or", "is", "are", "was", "were", "what",
        "how", "why", "when", "where", "which", "can", "do", "does", "did",
        "my", "your", "i", "we", "to", "for", "with", "on", "in", "at", "of",
        "it", "be", "been", "being", "have", "has", "had", "this", "that",
        "will", "would", "could", "should", "may", "might", "not", "but",
        "plant", "plants", "crop", "crops",  # Too generic for plant domain
    }
    words = re.findall(r'\b[a-z][a-z0-9-]{2,}\b', query.lower())
    return {w for w in words if w not in _STOPWORDS}


def compress_chunk(
    chunk: dict,
    query: str,
    min_score: float = 0.15,
    min_chars: int = 80,
) -> dict | None:
    """
    Compress a single chunk by retaining only relevant sentences.

    Args:
        chunk: Chunk dict with 'content' key.
        query: User's search query for keyword extraction.
        min_score: Minimum keyword overlap score to keep a sentence.
        min_chars: Minimum compressed content length to return.

    Returns:
        Chunk dict with compressed 'content', or None if nothing relevant found.
    """
    content = chunk.get("content", "")
    if not content:
        return None

    keywords = _extract_keywords(query)
    sentences = _sentence_split(content)

    if len(sentences) <= 2:
        # Too short to compress — return as-is
        return chunk

    kept = []
    for i, sentence in enumerate(sentences):
        if len(sentence) < MIN_SENTENCE_LENGTH:
            continue

        # Always keep first sentence (provides context)
        if i == 0:
            kept.append(sentence)
            continue

        score = _score_sentence(sentence, keywords)
        if score >= min_score:
            kept.append(sentence)

    compressed = " ".join(kept).strip()

    # If compression is too aggressive, fall back to original
    if len(compressed) < min_chars:
        return chunk

    compressed_chunk = dict(chunk)
    compressed_chunk["content"] = compressed
    original_len = len(content)
    compressed_len = len(compressed)
    ratio = compressed_len / max(original_len, 1)

    return compressed_chunk


def compress_chunks(
    chunks: list[dict],
    query: str,
    enabled: bool = True,
) -> list[dict]:
    """
    Apply contextual compression to a list of reranked chunks.

    Args:
        chunks: Reranked chunks to compress.
        query: User query for relevance scoring.
        enabled: If False, returns chunks unchanged.

    Returns:
        Compressed chunks list (same length or shorter if any dropped).
    """
    if not enabled or not chunks:
        return chunks

    compressed = []
    dropped = 0
    saved_chars = 0

    for chunk in chunks:
        result = compress_chunk(chunk, query)
        if result is None:
            dropped += 1
            continue
        saved = len(chunk.get("content", "")) - len(result.get("content", ""))
        saved_chars += max(saved, 0)
        compressed.append(result)

    logger.info(
        "compression_done",
        input=len(chunks),
        output=len(compressed),
        dropped=dropped,
        saved_chars=saved_chars,
    )

    return compressed if compressed else chunks
