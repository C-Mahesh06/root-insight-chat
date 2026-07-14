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


def get_llm(model_override: str | None = None) -> ChatOpenAI:
    """Get or create the LangChain LLM instance with optional model override."""
    settings = get_settings()
    model = model_override or settings.OPENAI_MODEL
    return ChatOpenAI(
        model=model,
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL,
        temperature=settings.LLM_TEMPERATURE,
        max_tokens=settings.LLM_MAX_TOKENS,
        streaming=True,
    )


def build_messages(
    system_prompt: str,
    conversation_history: list[dict],
    user_message: str,
    images: list[str] | None = None,
) -> list:
    """
    Build LangChain message objects from conversation history and user message,
    supporting multi-modal inputs.
    """
    messages = [SystemMessage(content=system_prompt)]

    for msg in conversation_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    if images:
        content_list = [{"type": "text", "text": user_message}]
        for img in images:
            # Ensure proper data URI prefix
            if not img.startswith("data:image/"):
                img_url = f"data:image/jpeg;base64,{img}"
            else:
                img_url = img
            content_list.append({
                "type": "image_url",
                "image_url": {
                    "url": img_url
                }
            })
        messages.append(HumanMessage(content=content_list))
    else:
        messages.append(HumanMessage(content=user_message))

    return messages


async def stream_completion(messages: list, model_override: str | None = None) -> AsyncGenerator[str, None]:
    """
    Stream LLM completion token by token. Supports automatic fallback on rate limits/429.
    """
    llm = get_llm(model_override)
    logger.info("streaming_start", message_count=len(messages), model=llm.model_name)

    try:
        async for chunk in llm.astream(messages):
            if chunk.content:
                yield chunk.content
    except Exception as e:
        err_msg = str(e).lower()
        if "rate limit" in err_msg or "429" in err_msg or "quota" in err_msg or "limit reached" in err_msg:
            fallback_model = "llama-3.1-8b-instant"
            if llm.model_name != fallback_model:
                logger.warning("rate_limit_detected_switching_to_fallback", model=llm.model_name, fallback=fallback_model, error=str(e))
                try:
                    fallback_llm = get_llm(fallback_model)
                    async for chunk in fallback_llm.astream(messages):
                        if chunk.content:
                            yield chunk.content
                    return
                except Exception as fallback_err:
                    logger.error("fallback_failed", error=str(fallback_err))
        raise e


async def generate_completion(messages: list, model_override: str | None = None) -> str:
    """
    Generate a full (non-streaming) completion. Supports automatic fallback on rate limits/429.
    """
    llm = get_llm(model_override)
    try:
        result = await llm.ainvoke(messages)
        return result.content
    except Exception as e:
        err_msg = str(e).lower()
        if "rate limit" in err_msg or "429" in err_msg or "quota" in err_msg or "limit reached" in err_msg:
            fallback_model = "llama-3.1-8b-instant"
            if llm.model_name != fallback_model:
                logger.warning("rate_limit_detected_switching_to_fallback", model=llm.model_name, fallback=fallback_model, error=str(e))
                try:
                    fallback_llm = get_llm(fallback_model)
                    result = await fallback_llm.ainvoke(messages)
                    return result.content
                except Exception as fallback_err:
                    logger.error("fallback_failed", error=str(fallback_err))
        raise e
