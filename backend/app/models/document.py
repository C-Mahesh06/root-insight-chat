"""
Pydantic schemas for document-related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime


class DocumentOut(BaseModel):
    """Document metadata returned from the API."""
    id: str
    title: str
    status: str
    chunk_count: int = 0
    page_count: int = 0
    file_size: int | None = None
    category: str = "general"
    created_at: datetime


class DocumentUploadResponse(BaseModel):
    """Response after uploading and processing a document."""
    id: str
    title: str
    chunks_created: int
    status: str = "ready"


class DocumentDeleteResponse(BaseModel):
    """Response after deleting a document."""
    ok: bool = True
    id: str


class DocumentUploadUrlRequest(BaseModel):
    """Request payload to upload/ingest a URL."""
    url: str = Field(..., description="The URL of the webpage or PDF file to ingest")

