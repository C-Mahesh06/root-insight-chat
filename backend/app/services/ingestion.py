"""
Document ingestion service.
PDF → parse → chunk → embed → store in Qdrant + metadata in Supabase.
"""

from app.services.embedding import embed_texts
from app.services.vector_store import upsert_chunks, delete_document_chunks
from app.utils.pdf_parser import parse_pdf
from app.utils.chunker import chunk_document, TextChunk
from app.middleware.auth import get_supabase
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("ingestion")


async def ingest_pdf(
    file_bytes: bytes,
    filename: str,
    user_id: str,
) -> dict:
    """
    Full ingestion pipeline for a PDF document.

    1. Parse PDF to extract text
    2. Split into chunks with metadata
    3. Generate embeddings
    4. Store vectors in Qdrant
    5. Store document metadata in Supabase

    Args:
        file_bytes: Raw PDF file bytes.
        filename: Original filename.
        user_id: Uploading user's ID.

    Returns:
        Dict with document_id, title, chunks_created, status.
    """
    settings = get_settings()
    supabase = get_supabase()

    # Step 1: Parse PDF
    logger.info("ingestion_start", filename=filename)
    parsed = parse_pdf(file_bytes, filename)

    if not parsed.full_text.strip():
        raise ValueError("No extractable text found in the PDF")

    # Step 2: Create document record in Supabase
    doc_result = supabase.table("documents").insert({
        "title": parsed.title,
        "storage_path": f"uploads/{filename}",
        "file_size": len(file_bytes),
        "page_count": parsed.total_pages,
        "uploaded_by": user_id,
        "status": "processing",
    }).execute()

    if not doc_result.data:
        raise RuntimeError("Failed to create document record")

    document_id = doc_result.data[0]["id"]

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
        logger.info("generating_embeddings", chunk_count=len(chunks))
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
            "ingestion_complete",
            document_id=document_id,
            title=parsed.title,
            chunks=upserted,
        )

        return {
            "id": document_id,
            "title": parsed.title,
            "chunks_created": upserted,
            "status": "ready",
        }

    except Exception as e:
        # Mark document as failed
        supabase.table("documents").update({
            "status": "failed",
        }).eq("id", document_id).execute()
        logger.error("ingestion_failed", document_id=document_id, error=str(e))
        raise


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
