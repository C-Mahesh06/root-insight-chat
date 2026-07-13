"""
Chat history service using Supabase PostgreSQL.
Stores conversations and messages for persistent memory.
"""

from datetime import datetime
from app.middleware.auth import get_supabase
from app.utils.logger import get_logger

logger = get_logger("chat_history")


def create_conversation(user_id: str, title: str = "New chat") -> dict:
    """Create a new conversation and return its data."""
    supabase = get_supabase()
    result = supabase.table("conversations").insert({
        "user_id": user_id,
        "title": title,
    }).execute()

    if not result.data:
        raise RuntimeError("Failed to create conversation")

    logger.info("conversation_created", user_id=user_id, conversation_id=result.data[0]["id"])
    return result.data[0]


def get_conversation(conversation_id: str, user_id: str) -> dict | None:
    """Get a conversation by ID, ensuring it belongs to the user."""
    supabase = get_supabase()
    result = supabase.table("conversations").select("*").eq(
        "id", conversation_id
    ).eq("user_id", user_id).maybe_single().execute()
    return result.data


def list_conversations(user_id: str) -> list[dict]:
    """List all conversations for a user, most recent first."""
    supabase = get_supabase()

    # Get conversations with message count
    result = supabase.table("conversations").select(
        "id, title, created_at, updated_at"
    ).eq("user_id", user_id).order("updated_at", desc=True).execute()

    conversations = result.data or []

    # Get message counts
    for conv in conversations:
        count_result = supabase.table("messages").select(
            "id", count="exact"
        ).eq("conversation_id", conv["id"]).execute()
        conv["message_count"] = count_result.count or 0

    return conversations


def delete_conversation(conversation_id: str, user_id: str) -> bool:
    """Delete a conversation and its messages."""
    supabase = get_supabase()

    # Verify ownership
    conv = get_conversation(conversation_id, user_id)
    if not conv:
        return False

    supabase.table("conversations").delete().eq("id", conversation_id).execute()
    logger.info("conversation_deleted", conversation_id=conversation_id)
    return True


def add_message(
    conversation_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None,
) -> dict:
    """Add a message to a conversation."""
    supabase = get_supabase()
    result = supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "sources": sources or [],
    }).execute()

    if not result.data:
        raise RuntimeError("Failed to add message")

    # Update conversation timestamp and auto-title
    update_data: dict = {"updated_at": datetime.utcnow().isoformat()}

    if role == "user":
        # Auto-title from first user message
        conv = supabase.table("conversations").select("title").eq(
            "id", conversation_id
        ).single().execute()
        if conv.data and conv.data.get("title") == "New chat":
            update_data["title"] = content[:60]

    supabase.table("conversations").update(update_data).eq(
        "id", conversation_id
    ).execute()

    return result.data[0]


def get_messages(
    conversation_id: str,
    limit: int = 50,
) -> list[dict]:
    """Get messages for a conversation, ordered by creation time."""
    supabase = get_supabase()
    result = supabase.table("messages").select("*").eq(
        "conversation_id", conversation_id
    ).order("created_at", desc=False).limit(limit).execute()
    return result.data or []


def get_recent_history(
    conversation_id: str,
    max_messages: int = 10,
) -> list[dict]:
    """
    Get the most recent messages for conversation memory.

    Returns messages in chronological order, limited to max_messages.
    """
    supabase = get_supabase()
    result = supabase.table("messages").select("role, content").eq(
        "conversation_id", conversation_id
    ).order("created_at", desc=True).limit(max_messages).execute()

    messages = result.data or []
    messages.reverse()  # Chronological order
    return messages


def rename_conversation(conversation_id: str, user_id: str, title: str) -> bool:
    """Rename a conversation."""
    conv = get_conversation(conversation_id, user_id)
    if not conv:
        return False

    supabase = get_supabase()
    supabase.table("conversations").update({"title": title}).eq(
        "id", conversation_id
    ).execute()
    return True
