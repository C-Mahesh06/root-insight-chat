"""
PlantMD FastAPI Application
Main entry point with CORS, lifespan events, and route registration.
"""

# Reloader trigger spacer comment
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.utils.logger import setup_logging, get_logger
from app.routes import chat, documents, health, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    settings = get_settings()
    setup_logging(debug=settings.DEBUG)
    logger = get_logger("main")

    logger.info("starting_up", app=settings.APP_NAME, version=settings.APP_VERSION)

    # Load ML models at startup (in background to not block)
    try:
        from app.services.embedding import load_embedding_model
        from app.services.reranker import load_reranker
        from app.services.vector_store import ensure_collection

        logger.info("loading_ml_models")
        load_embedding_model()
        load_reranker()
        ensure_collection()
        logger.info("ml_models_loaded")
    except Exception as e:
        logger.error("startup_error", error=str(e))
        # Don't crash — models will lazy-load on first request

    yield

    logger.info("shutting_down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="AI Plant Disease Chatbot with RAG Pipeline",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger = get_logger("error")
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
            error=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again."},
        )

    # Register routes
    app.include_router(health.router)
    app.include_router(chat.router)
    app.include_router(documents.router)
    app.include_router(users.router)

    return app


app = create_app()
