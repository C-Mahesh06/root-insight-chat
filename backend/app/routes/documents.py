"""
Document management API routes.
Handles PDF upload, listing, and deletion.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File

from app.middleware.auth import require_admin, get_current_user
from app.models.document import DocumentOut, DocumentUploadResponse, DocumentDeleteResponse
from app.services.ingestion import ingest_pdf, delete_document
from app.middleware.auth import get_supabase
from app.utils.logger import get_logger

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = get_logger("document_routes")

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    """
    Upload and process a PDF document.
    Admin only. Parses, chunks, embeds, and stores the document.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    # Read file
    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    logger.info("document_upload_start", filename=file.filename, size=len(file_bytes))

    try:
        result = await ingest_pdf(
            file_bytes=file_bytes,
            filename=file.filename,
            user_id=admin["user_id"],
        )
        return DocumentUploadResponse(**result)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("document_upload_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/", response_model=list[DocumentOut])
async def list_documents(admin: dict = Depends(require_admin)):
    """List all documents in the knowledge base. Admin only."""
    supabase = get_supabase()
    result = supabase.table("documents").select(
        "id, title, status, page_count, file_size, category, created_at"
    ).order("created_at", desc=True).execute()

    docs = result.data or []
    return [
        DocumentOut(
            id=d["id"],
            title=d["title"],
            status=d.get("status", "unknown"),
            chunk_count=d.get("page_count", 0),
            page_count=d.get("page_count", 0),
            file_size=d.get("file_size"),
            category=d.get("category", "general"),
            created_at=d["created_at"],
        )
        for d in docs
    ]


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
async def remove_document(
    document_id: str,
    admin: dict = Depends(require_admin),
):
    """Delete a document and its chunks. Admin only."""
    try:
        await delete_document(document_id)
        return DocumentDeleteResponse(id=document_id)
    except Exception as e:
        logger.error("document_delete_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
