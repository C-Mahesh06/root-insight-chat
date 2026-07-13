"""
LLM service using LangChain with OpenAI-compatible API.
Configurable for GPT-5.5 or any OpenAI-compatible provider.
"""

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from collections.abc import AsyncGenerator

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger("llm")

_llm: ChatOpenAI | None = None


def get_llm() -> ChatOpenAI:
    """Get or create the LangChain LLM instance."""
    global _llm
    if _llm is None:
        settings = get_settings()
        _llm = ChatOpenAI(
            model=settings.OPENAI_MODEL,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
            streaming=True,
        )
        logger.info("llm_initialized", model=settings.OPENAI_MODEL)
    return _llm


def build_messages(
    system_prompt: str,
    conversation_history: list[dict],
    user_message: str,
) -> list:
    """
    Build LangChain message objects from conversation history.

    Args:
        system_prompt: The system instruction.
        conversation_history: Previous messages [{role, content}].
        user_message: The current user message.

    Returns:
        List of LangChain message objects.
    """
    messages = [SystemMessage(content=system_prompt)]

    for msg in conversation_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    messages.append(HumanMessage(content=user_message))
    return messages


async def stream_completion(messages: list) -> AsyncGenerator[str, None]:
    """
    Stream LLM completion token by token.

    Args:
        messages: List of LangChain message objects.

    Yields:
        Individual text tokens as they arrive.
    """
    llm = get_llm()
    logger.info("streaming_start", message_count=len(messages))

    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content


async def generate_completion(messages: list) -> str:
    """
    Generate a full (non-streaming) completion.

    Args:
        messages: List of LangChain message objects.

    Returns:
        Complete response text.
    """
    llm = get_llm()
    result = await llm.ainvoke(messages)
    return result.content
