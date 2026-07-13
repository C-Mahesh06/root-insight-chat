"""
PDF text extraction using PyMuPDF.
Extracts text page by page with metadata.
"""

from dataclasses import dataclass
import fitz  # PyMuPDF

from app.utils.logger import get_logger

logger = get_logger("pdf_parser")


@dataclass
class PageContent:
    """Represents extracted text from a single PDF page."""
    page_number: int
    text: str


@dataclass
class ParsedDocument:
    """Represents a fully parsed PDF document."""
    title: str
    total_pages: int
    pages: list[PageContent]
    full_text: str


def parse_pdf(file_bytes: bytes, filename: str = "document.pdf") -> ParsedDocument:
    """
    Extract text from a PDF file.

    Args:
        file_bytes: Raw bytes of the PDF file.
        filename: Original filename for title extraction.

    Returns:
        ParsedDocument with page-by-page text and metadata.
    """
    logger.info("parsing_pdf", filename=filename, size_bytes=len(file_bytes))

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[PageContent] = []

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text("text").strip()
        if text:
            pages.append(PageContent(page_number=page_num + 1, text=text))

    doc.close()

    full_text = "\n\n".join(p.text for p in pages)

    # Extract title: use PDF metadata or filename
    title = filename.rsplit(".", 1)[0] if filename else "Untitled"

    logger.info(
        "pdf_parsed",
        filename=filename,
        total_pages=len(pages),
        text_length=len(full_text),
    )

    return ParsedDocument(
        title=title,
        total_pages=len(pages),
        pages=pages,
        full_text=full_text,
    )
