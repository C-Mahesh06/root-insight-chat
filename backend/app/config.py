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
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # --- Supabase ---
    SUPABASE_URL: str = "https://swaommrqxzptutjxdtri.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # --- OpenAI / LLM ---
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_TEMPERATURE: float = 0.3
    LLM_MAX_TOKENS: int = 2048

    # --- Qdrant ---
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "plant_disease_docs"

    # --- Embedding ---
    EMBEDDING_MODEL: str = "BAAI/bge-large-en-v1.5"
    EMBEDDING_DIMENSION: int = 1024

    # --- Reranker ---
    RERANKER_MODEL: str = "BAAI/bge-reranker-base"
    RERANK_TOP_K: int = 5

    # --- RAG ---
    RAG_SEARCH_TOP_K: int = 10
    RAG_SIMILARITY_THRESHOLD: float = 0.35
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    # --- Conversation ---
    MAX_CONVERSATION_HISTORY: int = 10

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Cache and return application settings."""
    return Settings()
