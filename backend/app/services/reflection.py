"""
Self-reflection / answer quality evaluation service.
$0 cost — uses the same free Groq LLM to validate its own answers.

What it does:
    1. After generating an answer with thin context (few chunks retrieved)
    2. Ask the LLM to evaluate: Is this answer grounded? Is it complete?
    3. If the answer is poor quality → trigger a refined retry with a
       broader/rephrased query
    4. Return the better of the two answers

This mirrors "Constitutional AI" and "Self-Consistency" patterns from
research papers used by Anthropic and Google.

Only activates when context is thin (< min_context_chunks) to avoid
unnecessary extra Groq API calls on well-answered queries.
"""

from langchain_core.messages import HumanMessage, SystemMessage
from app.utils.logger import get_logger

logger = get_logger("reflection")

REFLECTION_SYSTEM = """You are a quality evaluator for an agricultural AI assistant.
Given a question and an AI-generated answer, evaluate the answer quality.

Respond with ONLY one of these verdicts, followed by a brief reason:
- APPROVED: The answer directly addresses the question with specific, actionable agricultural advice.
- RETRY: The answer is vague, off-topic, or lacks specific plant disease/treatment information.

Format: VERDICT | reason (one sentence)"""


def _parse_verdict(reflection_text: str) -> tuple[bool, str]:
    """Parse APPROVED/RETRY verdict from reflection response."""
    text = reflection_text.strip().upper()
    approved = "APPROVED" in text
    reason = reflection_text.split("|", 1)[-1].strip() if "|" in reflection_text else ""
    return approved, reason


async def reflect_and_retry(
    original_query: str,
    condensed_query: str,
    answer: str,
    context_chunk_count: int,
    generate_fn,
    build_messages_fn,
    system_prompt: str,
    history: list[dict],
    min_context_chunks: int = 2,
) -> tuple[str, bool]:
    """
    Evaluate answer quality and retry if poor.

    Args:
        original_query: The user's original message.
        condensed_query: The condensed standalone query used for retrieval.
        answer: The LLM's initial answer.
        context_chunk_count: Number of context chunks used.
        generate_fn: async function to call for LLM completion.
        build_messages_fn: function to build message list.
        system_prompt: Current system prompt (without context).
        history: Conversation history.
        min_context_chunks: Only reflect when fewer chunks than this.

    Returns:
        (final_answer, was_retried) tuple.
    """
    # Only reflect when context is thin — saves API calls
    if context_chunk_count >= min_context_chunks:
        return answer, False

    # Skip reflection for very short answers (likely a refusal or greeting)
    if len(answer.split()) < 20:
        return answer, False

    reflection_prompt = (
        f"Question: {original_query}\n\n"
        f"Answer: {answer}\n\n"
        "Evaluate the answer quality:"
    )
    reflection_messages = [
        SystemMessage(content=REFLECTION_SYSTEM),
        HumanMessage(content=reflection_prompt),
    ]

    try:
        reflection = await generate_fn(reflection_messages)
        approved, reason = _parse_verdict(reflection)

        logger.info(
            "reflection_result",
            approved=approved,
            reason=reason[:80],
            context_chunks=context_chunk_count,
        )

        if approved:
            return answer, False

        # Retry with a broader, more explicit prompt
        retry_system = (
            f"{system_prompt}\n\n"
            "IMPORTANT: The previous answer was flagged as insufficient. "
            "Provide a detailed, specific answer with concrete treatment steps, "
            "dosages, and organic alternatives. Be thorough."
        )
        retry_query = (
            f"Please provide a comprehensive answer for: {original_query}\n"
            f"Focus on: {condensed_query}"
        )
        retry_messages = build_messages_fn(retry_system, history, retry_query, None)
        retried_answer = await generate_fn(retry_messages)

        logger.info(
            "reflection_retry_done",
            original_len=len(answer),
            retried_len=len(retried_answer),
        )
        return retried_answer, True

    except Exception as e:
        logger.warning("reflection_failed", error=str(e))
        return answer, False
