"""
Embedding service using BAAI/bge-large-en-v1.5.
Loads the model once at startup and provides batch embedding.
"""

from sentence_transformers import SentenceTransformer
import numpy as np

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("embedding")

_model: SentenceTransformer | None = None


def load_embedding_model() -> SentenceTransformer:
    """Load the embedding model (called once at startup)."""
    global _model
    if _model is not None:
        return _model

    settings = get_settings()
    logger.info("loading_embedding_model", model=settings.EMBEDDING_MODEL)
    _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    logger.info("embedding_model_loaded", dimension=settings.EMBEDDING_DIMENSION)
    return _model


def get_embedding_model() -> SentenceTransformer:
    """Get the loaded embedding model."""
    if _model is None:
        return load_embedding_model()
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts.

    BGE models perform best with the instruction prefix for queries.
    For documents (passages), no prefix is needed.

    Args:
        texts: List of text strings to embed.

    Returns:
        List of embedding vectors (1024-dim for bge-large-en-v1.5).
    """
    model = get_embedding_model()
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(query: str) -> list[float]:
    """
    Generate an embedding for a search query.

    Uses the BGE instruction prefix for optimal retrieval performance.
    """
    model = get_embedding_model()
    # BGE models benefit from a query instruction prefix
    prefixed = f"Represent this sentence for searching relevant passages: {query}"
    embedding = model.encode([prefixed], normalize_embeddings=True, show_progress_bar=False)
    return embedding[0].tolist()
