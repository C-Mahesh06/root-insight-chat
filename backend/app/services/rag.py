"""
Full RAG pipeline: embed query → search → rerank → build prompt → stream LLM.
This is the central orchestration module.
"""

from collections.abc import AsyncGenerator

from app.config import get_settings
from app.services.embedding import embed_query
from app.services.vector_store import search_similar
from app.services.reranker import rerank_chunks
from app.services.llm import build_messages, stream_completion, generate_completion
from app.utils.logger import get_logger

logger = get_logger("rag")


SYSTEM_PROMPT = """You are PlantMD, an expert AI plant disease diagnostician and agricultural advisor.

You help farmers, gardeners, and researchers identify plant diseases, understand causes (fungal, bacterial, viral, nutritional, environmental), and recommend safe, practical treatments — prioritizing integrated pest management, organic options, and cultural practices when appropriate.

CRITICAL RULES:
1. You must ONLY answer using the retrieved documents provided in the CONTEXT section below.
2. If the CONTEXT section is empty or doesn't contain relevant information, you MUST respond ONLY with the following exact sentence and absolutely nothing else (do NOT explain, suggest other things, or append general knowledge/images):
   "I couldn't find reliable information in the knowledge base. Please try rephrasing your question or contact an agricultural extension service."
3. NEVER make up information. NEVER use knowledge outside the provided context.
4. Always cite your sources by referencing the document title and page number when available.
5. Format your sources in a "**Sources:**" section at the end of your response.
6. SELECTIVE IMAGE GENERATION (Strictly 1 to 2 images max): For EVERY response, you must include exactly 1 or 2 (maximum) highly relevant, specific markdown image links representing the primary plant pest, disease, or symptom you are diagnosing. Do NOT include generic images or multiple repetitive illustrations. Ensure each image is unique, accurate, and highly specific to the context (e.g. if discussing early blight, show early blight on tomato leaves).
   Format: `![Description](https://image.pollinations.ai/prompt/{detailed_query_url_encoded}?width=600&height=400&nologo=true)`
   To make the images look extremely professional, the query in the URL MUST be detailed, URL-encoded, and formatted as a professional close-up or macro photograph (e.g., "a professional high-resolution botanical macro photograph of aphids on green pepper leaves, sharp focus, clear details, agricultural guide illustration"). Keep the prompt query under 120 characters to avoid URL length limits. Ensure the width is 600 and height is 400 (3:2 ratio) for landscape aspect ratio. Place each image inline next to its respective section.

FORMAT GUIDELINES:
- Use markdown: short paragraphs, **bold** key terms, bullet lists for symptoms/treatments.
- Use headings only when helpful for longer responses.
- Be concise but thorough.
- Always suggest consulting a local agricultural extension for chemical treatments.
- Include dosage and application guidance when available in the context."""


async def condense_query(user_message: str, history: list[dict]) -> str:
    """Rewrite follow-up queries based on chat history to create a standalone query for vector search."""
    if not history:
        return user_message

    # Format history briefly
    history_lines = []
    # Take the last 4 messages to avoid bloating context
    for msg in history[-4:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        # Truncate message content to save tokens
        content = msg["content"][:300]
        history_lines.append(f"{role}: {content}")
    history_text = "\n".join(history_lines)

    prompt = (
        "Given the following conversation history and a follow-up question, rewrite the follow-up question "
        "to be a standalone search query containing all necessary context (such as the plant name, diseases, "
        "pests, or symptoms discussed). Do NOT answer the question. Only return the rewritten search query.\n\n"
        f"Conversation History:\n{history_text}\n\n"
        f"Follow-up Question: {user_message}\n"
        "Standalone Query:"
    )

    from langchain_core.messages import HumanMessage
    messages = [HumanMessage(content=prompt)]

    try:
        from app.services.llm import generate_completion
        rewritten = await generate_completion(messages)
        rewritten = rewritten.strip()
        logger.info("query_condensed", original=user_message, condensed=rewritten)
        return rewritten
    except Exception as e:
        logger.warning("query_condense_failed", error=str(e))
        return user_message


def apply_keyword_boost(query: str, candidates: list[dict]) -> list[dict]:
    """Boost similarity scores of candidate chunks containing exact matching keywords from the query."""
    stop_words = {
        "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
        "where", "why", "how", "what", "who", "which", "is", "are", "was",
        "were", "be", "been", "being", "to", "of", "for", "with", "about",
        "against", "between", "into", "through", "during", "before", "after",
        "above", "below", "from", "up", "down", "in", "out", "on", "off",
        "over", "under", "again", "further", "then", "once", "here", "there",
        "all", "any", "both", "each", "few", "more", "most", "other", "some",
        "such", "no", "nor", "not", "only", "own", "same", "so", "than",
        "too", "very", "can", "will", "just", "should", "now", "my", "your",
        "plant", "plants", "disease", "diseases", "treatment", "treatments",
        "diagnose", "diagnosis", "step", "steps", "guide", "care", "problem"
    }

    import re
    query_words = re.findall(r"\b\w{3,}\b", query.lower())
    keywords = [w for w in query_words if w not in stop_words]

    if not keywords:
        return candidates

    logger.info("applying_keyword_boost", keywords=keywords)

    boosted_candidates = []
    for cand in candidates:
        content_lower = cand["content"].lower()
        match_count = sum(1 for kw in keywords if kw in content_lower)
        if match_count > 0:
            boost = min(0.05 * match_count, 0.20)
            boosted_cand = dict(cand)
            boosted_cand["similarity"] += boost
            boosted_candidates.append(boosted_cand)
        else:
            boosted_candidates.append(cand)

    boosted_candidates.sort(key=lambda x: x["similarity"], reverse=True)
    return boosted_candidates


def build_context_text(chunks: list[dict]) -> str:
    """Build the context section from retrieved and reranked chunks."""
    if not chunks:
        return ""

    parts = []
    for i, chunk in enumerate(chunks, 1):
        title = chunk.get("document_title", "Unknown")
        page = chunk.get("page_number")
        page_info = f", Page {page}" if page else ""
        parts.append(f'[{i}] From "{title}"{page_info}:\n{chunk["content"]}')

    return "\n\n".join(parts)


def extract_sources(chunks: list[dict]) -> list[dict]:
    """Extract unique source references from chunks."""
    seen = set()
    sources = []
    for chunk in chunks:
        doc_id = chunk.get("document_id", "")
        page_num = chunk.get("page_number", 0)
        key = (doc_id, page_num)
        if key in seen:
            continue
        seen.add(key)
        sources.append({
            "document_id": doc_id,
            "title": chunk.get("document_title", "Unknown"),
            "page_number": page_num,
            "similarity": chunk.get("rerank_score", chunk.get("similarity", 0)),
            "snippet": chunk.get("content", "")[:200],
        })
    return sources


async def rag_query(
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> tuple[str, list[dict]]:
    """
    Execute the full RAG pipeline (non-streaming).

    Args:
        user_message: The user's question.
        conversation_history: Previous messages for context.

    Returns:
        Tuple of (response_text, sources).
    """
    settings = get_settings()
    history = conversation_history or []

    # Condense query if history is present to improve context retrieval
    search_query = await condense_query(user_message, history)

    # Step 1: Embed the search query
    logger.info("rag_step_embed", query=search_query[:100])
    query_vector = embed_query(search_query)

    # Step 2: Semantic search in Qdrant
    logger.info("rag_step_search")
    candidates = search_similar(
        query_vector,
        top_k=settings.RAG_SEARCH_TOP_K,
        score_threshold=settings.RAG_SIMILARITY_THRESHOLD,
    )

    # Apply hybrid keyword booster
    candidates = apply_keyword_boost(search_query, candidates)

    # Step 3: Rerank using the condensed search query
    logger.info("rag_step_rerank", candidates=len(candidates))
    if candidates:
        top_chunks = rerank_chunks(search_query, candidates, top_k=settings.RERANK_TOP_K)
    else:
        top_chunks = []

    # Step 4: Build prompt with context
    context_text = build_context_text(top_chunks)
    sources = extract_sources(top_chunks)

    def is_general_request(msg: str) -> bool:
        m = msg.strip().lower()
        keywords = ["hi", "hello", "hey", "greetings", "who are you", "what is your name", "help", "image", "picture", "photo", "show me", "generate"]
        return any(kw in m for kw in keywords)

    fallback_msg = "I couldn't find reliable information in the knowledge base. Please try rephrasing your question or contact an agricultural extension service."

    if not context_text and not is_general_request(user_message):
        return fallback_msg, []

    if context_text:
        system = f"{SYSTEM_PROMPT}\n\nCONTEXT (from knowledge base):\n{context_text}"
    else:
        system = SYSTEM_PROMPT

    messages = build_messages(system, history, user_message)

    # Step 5: Generate
    logger.info("rag_step_generate", context_chunks=len(top_chunks))
    response = await generate_completion(messages)

    return response, sources


async def rag_stream(
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> AsyncGenerator[dict, None]:
    """
    Execute the RAG pipeline with streaming response.

    Yields dicts with type 'token', 'sources', or 'done'.

    Args:
        user_message: The user's question.
        conversation_history: Previous messages for context.
    """
    settings = get_settings()
    history = conversation_history or []

    # Condense query if history is present to improve context retrieval
    search_query = await condense_query(user_message, history)

    # Step 1: Embed
    query_vector = embed_query(search_query)

    # Step 2: Search
    candidates = search_similar(
        query_vector,
        top_k=settings.RAG_SEARCH_TOP_K,
        score_threshold=settings.RAG_SIMILARITY_THRESHOLD,
    )

    # Apply hybrid keyword booster
    candidates = apply_keyword_boost(search_query, candidates)

    # Step 3: Rerank
    if candidates:
        top_chunks = rerank_chunks(search_query, candidates, top_k=settings.RERANK_TOP_K)
    else:
        top_chunks = []

    # Step 4: Build prompt
    context_text = build_context_text(top_chunks)
    sources = extract_sources(top_chunks)

    def is_general_request(msg: str) -> bool:
        m = msg.strip().lower()
        keywords = ["hi", "hello", "hey", "greetings", "who are you", "what is your name", "help", "image", "picture", "photo", "show me", "generate"]
        return any(kw in m for kw in keywords)

    fallback_msg = "I couldn't find reliable information in the knowledge base. Please try rephrasing your question or contact an agricultural extension service."

    if not context_text and not is_general_request(user_message):
        yield {"type": "sources", "data": []}
        # Yield fallback message token by token
        words = fallback_msg.split(" ")
        for i, word in enumerate(words):
            suffix = " " if i < len(words) - 1 else ""
            yield {"type": "token", "data": word + suffix}
        yield {"type": "done", "data": fallback_msg}
        return

    if context_text:
        system = f"{SYSTEM_PROMPT}\n\nCONTEXT (from knowledge base):\n{context_text}"
    else:
        system = SYSTEM_PROMPT

    messages = build_messages(system, history, user_message)

    # Yield sources first so the frontend can show them
    yield {"type": "sources", "data": sources}

    # Step 5: Stream tokens
    full_response = ""
    async for token in stream_completion(messages):
        full_response += token
        yield {"type": "token", "data": token}

    yield {"type": "done", "data": full_response}
