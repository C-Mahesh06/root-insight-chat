"""
Application configuration using pydantic-settings.
All settings are loaded from environment variables.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- App ---
    APP_NAME: str = "PlantMD API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # --- Supabase ---
    SUPABASE_URL: str = "https://swaommrqxzptutjxdtri.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # --- OpenAI / LLM ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_BASE_URL: str = "https://api.groq.com/openai/v1"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 2048

    # --- Qdrant ---
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION: str = "plant_disease_docs"

    # --- Embedding ---
    # BAAI/bge-small-en-v1.5 = best free lightweight embedding model (fits in 512MB RAM on Render)
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384

    # --- Reranker ---
    # cross-encoder/ms-marco-MiniLM-L-6-v2 = best free cross-encoder
    RERANKER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    RERANK_TOP_K: int = 5

    # --- RAG Retrieval ---
    RAG_SEARCH_TOP_K: int = 15        # Dense retrieval candidates
    RAG_BM25_TOP_K: int = 10          # BM25 sparse candidates
    RAG_SIMILARITY_THRESHOLD: float = 0.30
    RAG_BM25_WEIGHT: float = 0.3      # BM25 weight in hybrid fusion (0.3)
    RAG_DENSE_WEIGHT: float = 0.7     # Dense weight in hybrid fusion (0.7)

    # --- Chunking ---
    CHUNK_SIZE: int = 800             # Smaller = more precise retrieval
    CHUNK_OVERLAP: int = 150

    # --- Contextual Compression ---
    COMPRESSION_ENABLED: bool = True   # Strip irrelevant sentences from chunks
    COMPRESSION_MIN_CHARS: int = 80    # Keep sentences with ≥ N chars matching keywords

    # --- Self-Reflection ---
    SELF_REFLECTION_ENABLED: bool = True  # Validate answer quality before returning
    SELF_REFLECTION_MIN_CONTEXT_CHUNKS: int = 2  # Only reflect when context is thin

    # --- Semantic Cache ---
    CACHE_ENABLED: bool = True
    CACHE_DIR: str = "/tmp/plantmd_cache"
    CACHE_SIMILARITY_THRESHOLD: float = 0.92  # Cosine sim to count as cache hit
    CACHE_MAX_SIZE_MB: int = 200

    # --- Conversation ---
    MAX_CONVERSATION_HISTORY: int = 12

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Cache and return application settings."""
    return Settings()
