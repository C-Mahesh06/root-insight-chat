"""
Document management API routes.
Handles PDF upload, listing, and deletion.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks

from app.middleware.auth import require_admin, get_current_user
from app.models.document import DocumentOut, DocumentUploadResponse, DocumentDeleteResponse, DocumentUploadUrlRequest
from app.services.ingestion import process_document_background, process_url_background, delete_document
from app.middleware.auth import get_supabase
from app.utils.logger import get_logger
from app.utils.pdf_parser import parse_pdf

router = APIRouter(prefix="/api/documents", tags=["documents"])
logger = get_logger("document_routes")

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    admin: dict = Depends(require_admin),
):
    """
    Upload and process a PDF document.
    Admin only. Parses synchronously (fast), then chunks, embeds and stores in background.
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
        # Parse PDF synchronously (fast) to get title and page count
        parsed = parse_pdf(file_bytes, file.filename)

        if not parsed.full_text.strip():
            raise ValueError("No extractable text found in the PDF")

        # Create document record in Supabase immediately with processing status
        supabase = get_supabase()
        doc_result = supabase.table("documents").insert({
            "title": parsed.title,
            "storage_path": f"uploads/{file.filename}",
            "file_size": len(file_bytes),
            "page_count": parsed.total_pages,
            "uploaded_by": admin["user_id"],
            "status": "processing",
        }).execute()

        if not doc_result.data:
            raise RuntimeError("Failed to create document record")

        document_id = doc_result.data[0]["id"]

        # Add vector embedding/indexing to background tasks
        background_tasks.add_task(
            process_document_background,
            document_id=document_id,
            parsed=parsed,
        )

        return DocumentUploadResponse(
            id=document_id,
            title=parsed.title,
            chunks_created=0,
            status="processing",
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("document_upload_failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/upload-url", response_model=DocumentUploadResponse)
async def upload_document_url(
    payload: DocumentUploadUrlRequest,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(require_admin),
):
    """
    Ingest a document from a URL (webpage or direct PDF).
    Admin only. Schedules URL fetch, parse, and embedding in the background.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")

    logger.info("document_url_upload_start", url=url)

    # Generate quick placeholder title from URL
    from urllib.parse import urlparse
    parsed_url = urlparse(url)
    placeholder_title = parsed_url.path.split("/")[-1] or parsed_url.netloc
    if not placeholder_title:
        placeholder_title = url

    try:
        # Create document record in Supabase immediately with processing status
        supabase = get_supabase()
        doc_result = supabase.table("documents").insert({
            "title": placeholder_title,
            "storage_path": url,
            "file_size": None,
            "page_count": None,
            "uploaded_by": admin["user_id"],
            "status": "processing",
        }).execute()

        if not doc_result.data:
            raise RuntimeError("Failed to create document record")

        document_id = doc_result.data[0]["id"]

        # Add URL parsing & embedding to background tasks
        background_tasks.add_task(
            process_url_background,
            document_id=document_id,
            url=url,
        )

        return DocumentUploadResponse(
            id=document_id,
            title=placeholder_title,
            chunks_created=0,
            status="processing",
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("document_url_upload_failed", url=url, error=str(e))
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


@router.get("/{document_id}/chunks")
async def get_chunks(
    document_id: str,
    admin: dict = Depends(require_admin),
):
    """Retrieve all text chunks for a document. Admin only."""
    from app.services.vector_store import get_document_chunks
    try:
        chunks = get_document_chunks(document_id)
        return chunks
    except Exception as e:
        logger.error("document_chunks_fetch_failed", document_id=document_id, error=str(e))
        raise HTTPException(status_code=500, detail=str(e))
