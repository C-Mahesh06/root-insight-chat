"""
RAG Pipeline v2 — Full hybrid retrieval with $0 infrastructure cost.

Pipeline:
  Query → Semantic Cache check
        → Condense + Query Expansion (multi-query)
        → Hybrid Retrieval (Dense BGE-large + BM25 sparse)
        → RRF Fusion
        → Cross-encoder Reranking (ms-marco-MiniLM-L-6-v2)
        → Contextual Compression
        → Context Assembly
        → LLM Streaming (Groq Llama 3.3 70B — free tier)
        → Self-Reflection (on thin context)
        → Cache Store

Cost: $0
  - Groq: free tier (14,400 req/day, 100K tokens/min)
  - Qdrant: free cloud tier (1GB)
  - Embeddings: local BAAI/bge-large-en-v1.5
  - Reranker: local cross-encoder/ms-marco-MiniLM-L-6-v2
  - BM25: pure Python (rank-bm25)
  - Cache: local disk (diskcache)
"""

import asyncio
from collections.abc import AsyncGenerator

from app.config import get_settings
from app.services.embedding import embed_query
from app.services.vector_store import search_similar, get_all_chunks_for_bm25
from app.services.reranker import rerank_chunks
from app.services.bm25_search import get_or_build_bm25_index, reciprocal_rank_fusion
from app.services.compression import compress_chunks
from app.services.semantic_cache import cache_lookup, cache_store
from app.services.llm import build_messages, stream_completion, generate_completion
from app.utils.logger import get_logger

logger = get_logger("rag")


# ─────────────────────────────────────────────────────────────
# System Prompts
# ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are PlantMD, an expert AI plant disease diagnostician and agricultural advisor.

You help farmers, gardeners, and researchers identify plant diseases, understand causes (fungal, bacterial, viral, nutritional, environmental), and recommend safe, practical treatments — prioritizing integrated pest management, organic options, and cultural practices.

CRITICAL RULES:
1. Prioritize answering using retrieved documents in the CONTEXT section. Cite sources by document title and page number.
2. If CONTEXT is empty or not relevant, use pre-trained agricultural knowledge but prepend:
   "*Note: No direct matches found in knowledge base. Based on general agricultural guidelines.*"
3. Do NOT fabricate information. Do NOT use knowledge outside the provided context.
4. Format a "**Sources:**" section at the end when citing CONTEXT.
5. IMAGES (1–2 max): Include 1-2 specific markdown image links for the disease/pest being diagnosed.
   Format: `![Description](https://image.pollinations.ai/prompt/{detailed_url_encoded_query}?width=600&height=400&nologo=true)`
   The prompt must be a professional botanical macro photo description, URL-encoded, under 120 chars.
   Place inline near the relevant section.

FORMAT:
- Use markdown: **bold** key terms, bullet lists for symptoms/treatments.
- Use headings for longer responses.
- Be concise but thorough.
- Always suggest consulting local agricultural extension for chemical treatments.
- Include dosage/application guidance from context when available."""


VISION_PROMPT = """You are PlantMD, an expert AI plant disease diagnostician.

CRITICAL: First determine if the image shows a plant, leaf, crop, flower, fruit, tree, root, or any botanical/agricultural specimen.
- If NOT a plant image (car, human, building, animal, text, etc.): respond EXACTLY with:
  "I am a plant bot. I can only assist with plant diseases, pests, and plant-related diagnostics. Please upload an image of a plant or leaf."
- If IS a plant image, structure your response:

1. **Visual Observation**: Plant type and specific visible symptoms.
2. **Tentative Identification**: Most likely disease, pest, or deficiency.
3. **Clarifying Questions**: 2–3 specific questions about non-visible factors (watering, sunlight, duration).
4. **What to Do (Immediately)**: 3–4 bullet immediate steps.
5. **What Not to Do**: 2–3 things to avoid right now.
6. **Next Steps**: Ask user to reply with answers for definitive diagnosis."""


VISION_FOLLOWUP_PROMPT = """You are PlantMD, an expert AI plant disease diagnostician.
The user is responding to your questions about a plant image. Using their answers + prior visual observation:

1. **Confirmed Diagnosis**: Exact disease/pest/deficiency.
2. **Detailed Treatment Plan**: Step-by-step, prioritizing organic IPM methods.
3. **What to Do**: Concrete actionable steps.
4. **What Not to Do**: Critical things to avoid.
5. **Prevention Tips**: Long-term health practices."""


# ─────────────────────────────────────────────────────────────
# Query Processing
# ─────────────────────────────────────────────────────────────

async def condense_query(user_message: str, history: list[dict]) -> str:
    """Rewrite follow-up queries as standalone search queries."""
    if not history:
        return user_message

    history_lines = []
    for msg in history[-4:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_lines.append(f"{role}: {msg['content'][:300]}")
    history_text = "\n".join(history_lines)

    prompt = (
        "Given the conversation history and a follow-up question, rewrite the "
        "follow-up as a standalone search query with all necessary context "
        "(plant name, disease, symptoms). Return ONLY the rewritten query.\n\n"
        f"History:\n{history_text}\n\n"
        f"Follow-up: {user_message}\n"
        "Standalone query:"
    )

    from langchain_core.messages import HumanMessage
    try:
        result = await generate_completion([HumanMessage(content=prompt)])
        rewritten = result.strip()
        logger.info("query_condensed", original=user_message[:60], condensed=rewritten[:60])
        return rewritten or user_message
    except Exception as e:
        logger.warning("query_condense_failed", error=str(e))
        return user_message


async def expand_query(search_query: str, history: list[dict]) -> list[str]:
    """Generate 3 query variants for multi-query retrieval (improves recall)."""
    if len(search_query.split()) < 4:
        return [search_query]

    history_lines = []
    for msg in history[-3:]:
        role = "User" if msg["role"] == "user" else "Assistant"
        history_lines.append(f"{role}: {msg['content'][:200]}")
    history_text = "\n".join(history_lines)

    prompt = (
        "Generate exactly 3 search query variations for a plant disease vector database. "
        "Each should target different aspects, synonyms, or related terms. "
        "Output ONLY the 3 queries, one per line, no numbering.\n\n"
        f"History:\n{history_text}\n\n"
        f"Query: {search_query}\n"
        "Variations:"
    )

    from langchain_core.messages import HumanMessage
    try:
        response = await generate_completion([HumanMessage(content=prompt)])
        import re
        lines = [re.sub(r"^\d+[\.\-\s]+", "", l).strip() for l in response.strip().split("\n") if l.strip()]
        variants = list(set(lines[:3] + [search_query]))
        logger.info("query_expanded", count=len(variants), variants=[v[:50] for v in variants])
        return variants
    except Exception as e:
        logger.warning("query_expansion_failed", error=str(e))
        return [search_query]


# ─────────────────────────────────────────────────────────────
# Hybrid Retrieval
# ─────────────────────────────────────────────────────────────

async def hybrid_retrieve(
    search_queries: list[str],
    primary_query: str,
) -> list[dict]:
    """
    Retrieve candidates using Hybrid Search: Dense + BM25 → RRF Fusion.

    Dense search: BGE-large-en-v1.5 embeddings → Qdrant HNSW
    Sparse search: BM25 over all stored chunk payloads
    Fusion: Reciprocal Rank Fusion

    Returns merged, de-duplicated candidate list.
    """
    settings = get_settings()

    # ── Dense retrieval for all query variants (parallel) ──
    async def fetch_dense(query: str) -> list[dict]:
        embedding = embed_query(query)
        return search_similar(
            embedding,
            top_k=settings.RAG_SEARCH_TOP_K,
            score_threshold=settings.RAG_SIMILARITY_THRESHOLD,
        )

    dense_tasks = [fetch_dense(q) for q in search_queries]
    dense_results_per_query = await asyncio.gather(*dense_tasks)

    # Merge dense results, keep highest score per chunk id
    dense_merged: dict[str, dict] = {}
    for results in dense_results_per_query:
        for chunk in results:
            cid = chunk["id"]
            if cid not in dense_merged or chunk["similarity"] > dense_merged[cid]["similarity"]:
                dense_merged[cid] = chunk
    dense_candidates = sorted(dense_merged.values(), key=lambda c: c["similarity"], reverse=True)

    # ── BM25 sparse retrieval ──
    bm25_candidates: list[dict] = []
    try:
        all_chunks = get_all_chunks_for_bm25()
        if all_chunks:
            index = get_or_build_bm25_index(all_chunks)
            if index:
                bm25_candidates = index.search(primary_query, top_k=settings.RAG_BM25_TOP_K)
    except Exception as e:
        logger.warning("bm25_retrieval_failed", error=str(e))

    # ── Fuse with RRF ──
    if bm25_candidates:
        fused = reciprocal_rank_fusion(
            dense_results=dense_candidates,
            bm25_results=bm25_candidates,
            dense_weight=settings.RAG_DENSE_WEIGHT,
            bm25_weight=settings.RAG_BM25_WEIGHT,
        )
    else:
        fused = dense_candidates
        logger.info("hybrid_dense_only", reason="no BM25 results")

    logger.info(
        "hybrid_retrieve_done",
        dense=len(dense_candidates),
        bm25=len(bm25_candidates),
        fused=len(fused),
    )
    return fused


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def apply_keyword_boost(query: str, candidates: list[dict]) -> list[dict]:
    """Boost scores of candidates with exact keyword matches from the query."""
    import re
    _STOP = {
        "the", "a", "an", "and", "or", "but", "if", "then", "else", "when",
        "where", "why", "how", "what", "who", "which", "is", "are", "was",
        "were", "be", "been", "to", "of", "for", "with", "in", "on", "at",
        "from", "by", "this", "that", "all", "any", "not", "can", "will",
        "just", "now", "very", "my", "your", "plant", "plants", "disease",
        "treatment", "diagnose", "diagnosis", "guide", "care",
    }
    words = re.findall(r"\b\w{3,}\b", query.lower())
    keywords = [w for w in words if w not in _STOP]
    if not keywords:
        return candidates

    boosted = []
    for cand in candidates:
        content_lower = cand["content"].lower()
        matches = sum(1 for kw in keywords if kw in content_lower)
        c = dict(cand)
        if matches > 0:
            c["similarity"] = c.get("similarity", 0) + min(0.05 * matches, 0.20)
        boosted.append(c)

    boosted.sort(key=lambda x: x.get("rrf_score", x.get("similarity", 0)), reverse=True)
    return boosted


def build_context_text(chunks: list[dict]) -> str:
    """Format retrieved chunks into a structured context block."""
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
    """Extract unique source references from reranked chunks."""
    seen: set[tuple] = set()
    sources = []
    for chunk in chunks:
        key = (chunk.get("document_id", ""), chunk.get("page_number", 0))
        if key in seen:
            continue
        seen.add(key)
        sources.append({
            "document_id": chunk.get("document_id", ""),
            "title": chunk.get("document_title", "Unknown"),
            "page_number": chunk.get("page_number"),
            "similarity": chunk.get("rerank_score", chunk.get("similarity", 0)),
            "snippet": chunk.get("content", "")[:200],
        })
    return sources


def get_vision_or_text_prompt(
    images: list[str] | None,
    history: list[dict],
) -> tuple[str, str | None]:
    """Return (system_prompt, model_override) based on whether images are present."""
    has_image_history = any(msg.get("images") for msg in (history or []))

    if images:
        return VISION_PROMPT, "meta-llama/llama-4-scout-17b-16e-instruct"
    elif has_image_history:
        return VISION_FOLLOWUP_PROMPT, get_settings().OPENAI_MODEL
    else:
        return SYSTEM_PROMPT, None


def get_model_instructions(model_name: str | None) -> str:
    """Return system identity instructions based on the selected model."""
    if not model_name:
        model_name = "my-own-model"

    name_clean = model_name.lower().strip()

    if name_clean == "chatgpt":
        return (
            "IMPORTANT IDENTIFICATION & RETRIEVAL RULE:\n"
            "You are the ChatGPT model, a large language model trained by OpenAI. "
            "If the user asks who you are, what model you are using, or which AI you are, "
            "you MUST state clearly: \"I am the ChatGPT model, developed by OpenAI.\"\n"
            "CRITICAL: Even though you identify as ChatGPT, you are currently acting as the AI engine for PlantMD. "
            "You MUST strictly prioritize using the provided CONTEXT from the knowledge base to answer agricultural and plant disease questions. "
            "Always cite the sources (document titles and page numbers) at the end of your response under a '**Sources:**' section. "
            "Do not state that you are Aether AI or the custom model developed by Mahesh, but you MUST use PlantMD's retrieved database to answer and cite those sources."
        )
    elif name_clean == "gemini":
        return (
            "IMPORTANT IDENTIFICATION & RETRIEVAL RULE:\n"
            "You are the Gemini model, a large language model trained by Google. "
            "If the user asks who you are, what model you are using, or which AI you are, "
            "you MUST state clearly: \"I am the Gemini model, developed by Google.\"\n"
            "CRITICAL: Even though you identify as Gemini, you are currently acting as the AI engine for PlantMD. "
            "You MUST strictly prioritize using the provided CONTEXT from the knowledge base to answer agricultural and plant disease questions. "
            "Always cite the sources (document titles and page numbers) at the end of your response under a '**Sources:**' section. "
            "Do not state that you are Aether AI or the custom model developed by Mahesh, but you MUST use PlantMD's retrieved database to answer and cite those sources."
        )
    elif name_clean == "llama":
        return (
            "IMPORTANT IDENTIFICATION & RETRIEVAL RULE:\n"
            "You are the Llama model, a large language model trained by Meta. "
            "If the user asks who you are, what model you are using, or which AI you are, "
            "you MUST state clearly: \"I am the Llama model, developed by Meta.\"\n"
            "CRITICAL: Even though you identify as Llama, you are currently acting as the AI engine for PlantMD. "
            "You MUST strictly prioritize using the provided CONTEXT from the knowledge base to answer agricultural and plant disease questions. "
            "Always cite the sources (document titles and page numbers) at the end of your response under a '**Sources:**' section. "
            "Do not state that you are Aether AI or the custom model developed by Mahesh, but you MUST use PlantMD's retrieved database to answer and cite those sources."
        )
    else:
        # my-own-model
        return (
            "IMPORTANT IDENTIFICATION RULE:\n"
            "You are Aether AI (also known as the PlantMD custom model), a domain-specific agricultural AI assistant "
            "proudly developed by Mahesh. You run on a custom hybrid RAG (Retrieval-Augmented Generation) pipeline.\n"
            "If the user asks who you are, what model you are using, or which AI you are, you MUST answer in a highly "
            "conversational, natural, friendly, and diverse tone. DO NOT copy-paste a fixed template or block of text verbatim.\n"
            "CRITICAL: Do NOT force-feed a long list of technical features (like BGE-large, BM25, Reciprocal Rank Fusion, "
            "rerankers, caching, etc.) in every simple identity greeting. It makes you sound robotic and pre-programmed. "
            "Instead, answer organically. Just explain that you are a custom AI model developed by Mahesh, specialized "
            "in plants, crops, and agricultural diagnostics. You search a custom knowledge base (RAG) to find accurate "
            "answers. You can mention that you use advanced hybrid search under the hood, but keep it brief and conversational. "
            "Tell the user they can ask you about your technical architecture details if they want to know more.\n"
            "Vary your wording completely: sometimes call yourself a 'digital crop doctor', sometimes a 'smart farming assistant', "
            "and sometimes your custom agricultural model. Be creative, warm, and natural like ChatGPT, Claude, or Gemini.\n"
            "Always end with a friendly closing question asking how you can help them with their plants or crops today."
        )



def get_llm_model_override(model_name: str | None, current_override: str | None = None) -> str | None:
    """Resolve the LLM model name, prioritizing existing overrides (like vision)."""
    if current_override:
        return current_override
    if not model_name:
        return None

    name_clean = model_name.lower().strip()
    settings = get_settings()

    # If OpenAI key exists and we want ChatGPT, we can map to gpt-4o-mini
    if name_clean == "chatgpt" and settings.OPENAI_API_KEY.startswith("sk-"):
        return "gpt-4o-mini"

    return None


def is_general_request(msg: str) -> bool:
    m = msg.strip().lower()
    keywords = ["hi", "hello", "hey", "greetings", "who are you", "what is your name",
                "help", "image", "picture", "photo", "show me", "generate"]
    return any(kw in m for kw in keywords) or len(msg.split()) < 3


# ─────────────────────────────────────────────────────────────
# Core RAG Pipeline (shared logic)
# ─────────────────────────────────────────────────────────────

async def _run_rag_pipeline(
    user_message: str,
    conversation_history: list[dict],
    images: list[str] | None,
) -> tuple[str, list[dict], list[dict]]:
    """
    Shared RAG pipeline logic.
    Returns: (context_text, sources, top_chunks)
    """
    settings = get_settings()
    history = conversation_history or []

    # Step 1: Condense query for history-aware retrieval
    search_query = await condense_query(user_message, history)

    # Step 2: Multi-query expansion
    search_queries = await expand_query(search_query, history)

    # Step 3: Hybrid retrieval (Dense + BM25 + RRF)
    candidates = await hybrid_retrieve(search_queries, search_query)

    # Step 4: Keyword boost
    candidates = apply_keyword_boost(search_query, candidates)

    # Step 5: Cross-encoder reranking
    logger.info("rag_reranking", candidates=len(candidates))
    top_chunks = rerank_chunks(search_query, candidates, top_k=settings.RERANK_TOP_K)

    # Step 6: Contextual compression
    top_chunks = compress_chunks(top_chunks, search_query, enabled=settings.COMPRESSION_ENABLED)

    # Step 7: Build context
    context_text = build_context_text(top_chunks)
    sources = extract_sources(top_chunks)

    return context_text, sources, top_chunks


# ─────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────

async def rag_query(
    user_message: str,
    conversation_history: list[dict] | None = None,
    images: list[str] | None = None,
    model_name: str | None = None,
    user_id: str | None = None,
) -> tuple[str, list[dict]]:
    """
    Execute the full RAG pipeline (non-streaming) with cache + self-reflection.
    """
    settings = get_settings()
    history = conversation_history or []

    # ── Semantic cache check (skip for image queries) ──
    if not images and settings.CACHE_ENABLED:
        query_embedding = embed_query(user_message)
        cached = cache_lookup(query_embedding, model_name)
        if cached:
            logger.info("rag_cache_hit")
            try:
                from app.services.metrics import track_cache
                track_cache(True)
            except Exception:
                pass
            return cached
        else:
            try:
                from app.services.metrics import track_cache
                track_cache(False)
            except Exception:
                pass

    # ── Agentic Workflow / Tool Execution ──
    try:
        from app.services.agent import check_and_execute_agent_workflow
        agent_response = await check_and_execute_agent_workflow(user_message, model_name)
        if agent_response:
            logger.info("agent_workflow_triggered")
            return agent_response, []
    except Exception as e:
        logger.warning("agent_workflow_check_failed", error=str(e))

    system_prompt, model_override = get_vision_or_text_prompt(images, history)
    
    # Inject model-specific system prompts and overrides
    model_instructions = get_model_instructions(model_name)
    system_prompt = f"{model_instructions}\n\n{system_prompt}"
    
    # ── User Profile Memory Injection ──
    if user_id:
        try:
            from app.services.memory import get_user_profile
            profile = get_user_profile(user_id)
            facts = profile.get("facts") or []
            preferences = profile.get("preferences") or {}
            if facts or preferences:
                user_profile_text = "\nUSER PROFILE & PREFERENCES (Tailor response accordingly):\n"
                if preferences:
                    user_profile_text += f"- Preferences: {json.dumps(preferences)}\n"
                for fact in facts:
                    user_profile_text += f"- {fact}\n"
                system_prompt = f"{system_prompt}\n{user_profile_text}"
        except Exception as e:
            logger.warning("user_profile_injection_failed", error=str(e))

    model_override = get_llm_model_override(model_name, model_override)

    if not images and not is_general_request(user_message):
        context_text, sources, top_chunks = await _run_rag_pipeline(
            user_message, history, images
        )
    else:
        context_text, sources, top_chunks = "", [], []

    if context_text:
        system = f"{system_prompt}\n\nCONTEXT (from knowledge base):\n{context_text}"
    else:
        system = system_prompt

    messages = build_messages(system, history, user_message, images)
    import time
    start_gen = time.time()
    response = await generate_completion(messages, model_override)
    gen_duration = time.time() - start_gen
    try:
        from app.services.metrics import track_llm_generation
        track_llm_generation(len(response) // 4, gen_duration)
    except Exception:
        pass

    # ── Self-reflection on thin context ──
    if settings.SELF_REFLECTION_ENABLED and not images:
        from app.services.reflection import reflect_and_retry
        response, retried = await reflect_and_retry(
            original_query=user_message,
            condensed_query=user_message,
            answer=response,
            context_chunk_count=len(top_chunks),
            generate_fn=generate_completion,
            build_messages_fn=build_messages,
            system_prompt=system_prompt,
            history=history,
            min_context_chunks=settings.SELF_REFLECTION_MIN_CONTEXT_CHUNKS,
        )
        if retried:
            logger.info("rag_self_reflection_retry_used")

    # ── Store in cache ──
    if not images and settings.CACHE_ENABLED:
        query_embedding = embed_query(user_message)
        cache_store(user_message, query_embedding, response, sources, model_name)

    return response, sources


async def rag_stream(
    user_message: str,
    conversation_history: list[dict] | None = None,
    images: list[str] | None = None,
    model_name: str | None = None,
    user_id: str | None = None,
) -> AsyncGenerator[dict, None]:
    """
    Execute the RAG pipeline with streaming response.
    Yields: {"type": "sources"|"token"|"cache_hit"|"done", "data": ...}
    """
    settings = get_settings()
    history = conversation_history or []

    # ── Semantic cache check ──
    if not images and settings.CACHE_ENABLED:
        query_embedding = embed_query(user_message)
        cached = cache_lookup(query_embedding, model_name)
        if cached:
            response_text, cached_sources = cached
            logger.info("rag_stream_cache_hit")
            try:
                from app.services.metrics import track_cache
                track_cache(True)
            except Exception:
                pass
            yield {"type": "sources", "data": cached_sources}
            yield {"type": "cache_hit", "data": True}
            # Stream cached response character by character in chunks for UX
            chunk_size = 8
            for i in range(0, len(response_text), chunk_size):
                yield {"type": "token", "data": response_text[i:i + chunk_size]}
            yield {"type": "done", "data": response_text}
            return
        else:
            try:
                from app.services.metrics import track_cache
                track_cache(False)
            except Exception:
                pass

    # ── Agentic Workflow / Tool Execution ──
    try:
        from app.services.agent import check_and_execute_agent_workflow
        agent_response = await check_and_execute_agent_workflow(user_message, model_name)
        if agent_response:
            logger.info("agent_stream_workflow_triggered")
            yield {"type": "sources", "data": []}
            # Stream the agent response in chunks
            chunk_size = 8
            for i in range(0, len(agent_response), chunk_size):
                yield {"type": "token", "data": agent_response[i:i + chunk_size]}
            yield {"type": "done", "data": agent_response}
            return
    except Exception as e:
        logger.warning("agent_stream_workflow_check_failed", error=str(e))

    system_prompt, model_override = get_vision_or_text_prompt(images, history)
    
    # Inject model-specific system prompts and overrides
    model_instructions = get_model_instructions(model_name)
    system_prompt = f"{model_instructions}\n\n{system_prompt}"
    
    # ── User Profile Memory Injection ──
    if user_id:
        try:
            from app.services.memory import get_user_profile
            profile = get_user_profile(user_id)
            facts = profile.get("facts") or []
            preferences = profile.get("preferences") or {}
            if facts or preferences:
                user_profile_text = "\nUSER PROFILE & PREFERENCES (Tailor response accordingly):\n"
                if preferences:
                    user_profile_text += f"- Preferences: {json.dumps(preferences)}\n"
                for fact in facts:
                    user_profile_text += f"- {fact}\n"
                system_prompt = f"{system_prompt}\n{user_profile_text}"
        except Exception as e:
            logger.warning("user_profile_injection_failed", error=str(e))

    model_override = get_llm_model_override(model_name, model_override)

    if not images and not is_general_request(user_message):
        context_text, sources, top_chunks = await _run_rag_pipeline(
            user_message, history, images
        )
    else:
        context_text, sources, top_chunks = "", [], []

    if context_text:
        system = f"{system_prompt}\n\nCONTEXT (from knowledge base):\n{context_text}"
    else:
        system = system_prompt

    messages = build_messages(system, history, user_message, images)

    # Yield sources first
    yield {"type": "sources", "data": sources}

    # Stream tokens
    full_response = ""
    import time
    start_gen = time.time()
    first_token_time = None
    token_count = 0
    async for token in stream_completion(messages, model_override):
        if first_token_time is None:
            first_token_time = time.time()
            ttft = first_token_time - start_gen
            try:
                from app.services.metrics import track_llm_first_token
                track_llm_first_token(ttft)
            except Exception:
                pass
        full_response += token
        token_count += 1
        yield {"type": "token", "data": token}
    gen_duration = time.time() - start_gen
    try:
        from app.services.metrics import track_llm_generation
        track_llm_generation(token_count, gen_duration)
    except Exception:
        pass

    # Store in cache after full response received
    if not images and settings.CACHE_ENABLED:
        try:
            query_embedding = embed_query(user_message)
            cache_store(user_message, query_embedding, full_response, sources, model_name)
        except Exception as e:
            logger.warning("cache_store_after_stream_failed", error=str(e))

    yield {"type": "done", "data": full_response}
