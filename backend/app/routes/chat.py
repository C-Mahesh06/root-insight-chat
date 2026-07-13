"""
Chat API routes.
Handles conversations, messages, and streaming RAG responses.
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.middleware.auth import get_current_user
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ConversationSummary,
    ConversationDetail,
    MessageOut,
    SourceReference,
)
from app.services.rag import rag_stream
from app.services.chat_history import (
    create_conversation,
    get_conversation,
    list_conversations,
    delete_conversation,
    add_message,
    get_messages,
    get_recent_history,
    rename_conversation,
)
from app.config import get_settings
from app.utils.logger import get_logger

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = get_logger("chat_routes")


@router.post("/")
async def chat(request: ChatRequest, user: dict = Depends(get_current_user)):
    """
    Send a message and get a streaming RAG response.
    Returns a Server-Sent Events stream.
    """
    settings = get_settings()
    user_id = user["user_id"]

    # Get or create conversation
    conversation_id = request.conversation_id
    if conversation_id:
        conv = get_conversation(conversation_id, user_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        conv = create_conversation(user_id)
        conversation_id = conv["id"]

    # Save user message
    add_message(conversation_id, "user", request.message)

    # Get conversation history for context
    history = get_recent_history(conversation_id, settings.MAX_CONVERSATION_HISTORY)
    # Remove the last message (the one we just added) since we pass it separately
    if history and history[-1]["role"] == "user":
        history = history[:-1]

    async def event_stream():
        full_response = ""
        sources = []

        try:
            # Send conversation_id first
            yield f"data: {json.dumps({'type': 'conversation_id', 'data': conversation_id})}\n\n"

            async for event in rag_stream(request.message, history):
                if event["type"] == "sources":
                    sources = event["data"]
                    yield f"data: {json.dumps({'type': 'sources', 'data': sources})}\n\n"
                elif event["type"] == "token":
                    yield f"data: {json.dumps({'type': 'token', 'data': event['data']})}\n\n"
                elif event["type"] == "done":
                    full_response = event["data"]

            # Save assistant response
            add_message(conversation_id, "assistant", full_response, sources)

            yield f"data: {json.dumps({'type': 'done', 'data': {'conversation_id': conversation_id}})}\n\n"

        except Exception as e:
            logger.error("chat_stream_error", error=str(e))
            error_msg = "I encountered an error processing your request. Please try again."
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"
            # Still save the error response
            add_message(conversation_id, "assistant", error_msg)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/conversations", response_model=list[ConversationSummary])
async def get_conversations(user: dict = Depends(get_current_user)):
    """List all conversations for the current user."""
    conversations = list_conversations(user["user_id"])
    return [
        ConversationSummary(
            id=c["id"],
            title=c["title"],
            created_at=c["created_at"],
            updated_at=c["updated_at"],
            message_count=c.get("message_count", 0),
        )
        for c in conversations
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation_detail(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Get a conversation with all its messages."""
    conv = get_conversation(conversation_id, user["user_id"])
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = get_messages(conversation_id)

    return ConversationDetail(
        id=conv["id"],
        title=conv["title"],
        messages=[
            MessageOut(
                id=m["id"],
                role=m["role"],
                content=m["content"],
                sources=[SourceReference(**s) for s in (m.get("sources") or [])],
                created_at=m["created_at"],
            )
            for m in messages
        ],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
    )


@router.delete("/conversations/{conversation_id}")
async def remove_conversation(
    conversation_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a conversation and all its messages."""
    success = delete_conversation(conversation_id, user["user_id"])
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}


@router.patch("/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    body: dict,
    user: dict = Depends(get_current_user),
):
    """Rename a conversation."""
    title = body.get("title")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")

    success = rename_conversation(conversation_id, user["user_id"], title)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"ok": True}
