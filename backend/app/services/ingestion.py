"""
Document ingestion service.
PDF → parse → chunk → embed → store in Qdrant + metadata in Supabase.
"""

from app.services.embedding import embed_texts
from app.services.vector_store import upsert_chunks, delete_document_chunks
from app.utils.pdf_parser import parse_pdf, ParsedDocument
from app.utils.chunker import chunk_document, TextChunk
from app.utils.url_parser import parse_url
from app.middleware.auth import get_supabase
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("ingestion")


async def process_document_background(
    document_id: str,
    parsed: ParsedDocument,
) -> None:
    """
    Background task to chunk, generate embeddings, and index document chunks in Qdrant.
    Updates the Supabase status when done or failed.
    """
    settings = get_settings()
    supabase = get_supabase()

    try:
        # Step 3: Chunk the document
        chunks = chunk_document(
            parsed,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP,
        )

        if not chunks:
            raise ValueError("Document produced no viable text chunks")

        # Step 4: Generate embeddings in batches
        logger.info("generating_embeddings_background", chunk_count=len(chunks), document_id=document_id)
        batch_size = 32
        all_embeddings: list[list[float]] = []

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            batch_texts = [c.content for c in batch]
            embeddings = embed_texts(batch_texts)
            all_embeddings.extend(embeddings)

        # Step 5: Upsert to Qdrant
        chunk_dicts = [
            {
                "content": c.content,
                "chunk_index": c.chunk_index,
                "page_number": c.page_number,
                "document_title": c.document_title,
                "category": c.category,
            }
            for c in chunks
        ]
        upserted = upsert_chunks(document_id, chunk_dicts, all_embeddings)

        # Step 6: Update document status
        supabase.table("documents").update({
            "status": "ready",
            "page_count": parsed.total_pages,
        }).eq("id", document_id).execute()

        logger.info(
            "ingestion_complete_background",
            document_id=document_id,
            title=parsed.title,
            chunks=upserted,
        )

    except Exception as e:
        # Mark document as failed in Supabase
        supabase.table("documents").update({
            "status": "failed",
        }).eq("id", document_id).execute()
        logger.error("ingestion_failed_background", document_id=document_id, error=str(e))


async def process_url_background(
    document_id: str,
    url: str,
) -> None:
    """
    Background task to fetch, parse, chunk, embed, and store a URL.
    """
    supabase = get_supabase()
    try:
        parsed = await parse_url(url)

        if not parsed.full_text.strip():
            raise ValueError("No extractable text found at the URL")

        file_size = len(parsed.full_text.encode("utf-8"))

        # Update document title and page count in Supabase before embedding
        supabase.table("documents").update({
            "title": parsed.title,
            "page_count": parsed.total_pages,
            "file_size": file_size,
        }).eq("id", document_id).execute()

        # Call document processing background task
        await process_document_background(document_id, parsed)

    except Exception as e:
        supabase.table("documents").update({
            "status": "failed",
        }).eq("id", document_id).execute()
        logger.error("url_ingestion_failed_background", document_id=document_id, error=str(e))




async def delete_document(document_id: str) -> bool:
    """
    Delete a document and its chunks from both Supabase and Qdrant.

    Args:
        document_id: UUID of the document to delete.

    Returns:
        True if deleted successfully.
    """
    supabase = get_supabase()

    # Delete from Qdrant
    delete_document_chunks(document_id)

    # Delete from Supabase (cascades to document_chunks table)
    supabase.table("documents").delete().eq("id", document_id).execute()

    logger.info("document_deleted", document_id=document_id)
    return True
