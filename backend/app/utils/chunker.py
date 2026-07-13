"""
Smart text chunking with sentence-aware boundaries.
Uses LangChain RecursiveCharacterTextSplitter for intelligent splitting.
"""

from dataclasses import dataclass
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.utils.logger import get_logger
from app.utils.pdf_parser import ParsedDocument

logger = get_logger("chunker")


@dataclass
class TextChunk:
    """A single chunk of text with metadata."""
    content: str
    chunk_index: int
    page_number: int | None
    document_title: str
    category: str


def detect_category(text: str) -> str:
    """Auto-detect document category from content keywords."""
    text_lower = text.lower()
    keywords = {
        "disease": ["disease", "infection", "pathogen", "blight", "wilt", "rot", "mildew", "rust", "canker"],
        "pest": ["pest", "insect", "aphid", "beetle", "caterpillar", "mite", "nematode", "weevil"],
        "treatment": ["treatment", "fungicide", "pesticide", "herbicide", "spray", "chemical", "organic"],
        "nutrition": ["nutrient", "deficiency", "nitrogen", "phosphorus", "potassium", "fertilizer"],
    }
    scores: dict[str, int] = {}
    for category, words in keywords.items():
        scores[category] = sum(1 for w in words if w in text_lower)

    if max(scores.values(), default=0) == 0:
        return "general"
    return max(scores, key=lambda k: scores[k])


def chunk_document(
    parsed_doc: ParsedDocument,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[TextChunk]:
    """
    Split a parsed document into chunks with metadata.

    Uses sentence-aware recursive splitting to maintain semantic coherence.

    Args:
        parsed_doc: The parsed PDF document.
        chunk_size: Target chunk size in characters.
        chunk_overlap: Overlap between consecutive chunks.

    Returns:
        List of TextChunk objects with content and metadata.
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", ", ", " ", ""],
        length_function=len,
    )

    chunks: list[TextChunk] = []
    chunk_index = 0

    for page in parsed_doc.pages:
        if not page.text.strip():
            continue

        page_chunks = splitter.split_text(page.text)

        for text in page_chunks:
            text = text.strip()
            if len(text) < 50:  # Skip very small chunks
                continue

            chunks.append(TextChunk(
                content=text,
                chunk_index=chunk_index,
                page_number=page.page_number,
                document_title=parsed_doc.title,
                category=detect_category(text),
            ))
            chunk_index += 1

    logger.info(
        "document_chunked",
        title=parsed_doc.title,
        total_chunks=len(chunks),
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    return chunks
