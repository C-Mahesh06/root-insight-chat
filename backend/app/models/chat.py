"""
Pydantic schemas for chat-related API requests and responses.
"""

from pydantic import BaseModel, Field
from datetime import datetime


class ChatMessage(BaseModel):
    """A single message in a conversation."""
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class ChatRequest(BaseModel):
    """Request body for the chat endpoint."""
    conversation_id: str | None = Field(None, description="Existing conversation ID, or null for new")
    message: str = Field(..., min_length=1, max_length=10000)
    images: list[str] | None = Field(None, description="Optional base64 images or image URLs")
    model: str | None = Field(None, description="Model selection: my-own-model, chatgpt, gemini, llama")


class SourceReference(BaseModel):
    """A source document cited in an AI response."""
    document_id: str
    title: str
    page_number: int | None = None
    similarity: float
    snippet: str = ""


class ChatResponse(BaseModel):
    """Full (non-streaming) chat response."""
    conversation_id: str
    message: str
    sources: list[SourceReference] = []


class ConversationSummary(BaseModel):
    """Summary of a conversation for the sidebar list."""
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class MessageOut(BaseModel):
    """A message returned from the API."""
    id: str
    role: str
    content: str
    sources: list[SourceReference] = []
    images: list[str] | None = None
    created_at: datetime


class ConversationDetail(BaseModel):
    """Full conversation with all messages."""
    id: str
    title: str
    messages: list[MessageOut] = []
    created_at: datetime
    updated_at: datetime
