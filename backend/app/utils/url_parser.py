"""
URL content parser (HTML web pages and PDF links).
Fetches the content, detects content type, parses, and extracts text.
"""

from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup

from app.utils.pdf_parser import ParsedDocument, PageContent, parse_pdf
from app.utils.logger import get_logger

logger = get_logger("url_parser")


async def parse_url(url: str) -> ParsedDocument:
    """
    Fetch content from a URL and extract text into a ParsedDocument.
    Supports HTML pages and direct PDF links.

    Args:
        url: The web URL to parse.

    Returns:
        ParsedDocument containing the extracted title and content.
    """
    logger.info("parse_url_start", url=url)

    # Validate URL structure
    parsed_url = urlparse(url)
    if not parsed_url.scheme or not parsed_url.netloc:
        raise ValueError("Invalid URL scheme or format. Must start with http:// or https://")

    # Fetch Content
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        )
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as e:
        logger.error("url_fetch_http_error", url=url, status_code=e.response.status_code)
        raise ValueError(f"Failed to fetch URL: HTTP {e.response.status_code}")
    except Exception as e:
        logger.error("url_fetch_failed", url=url, error=str(e))
        raise ValueError(f"Failed to fetch URL: {str(e)}")

    content_type = response.headers.get("Content-Type", "").lower()
    
    # 1. Handle PDF
    if "application/pdf" in content_type or url.lower().split("?")[0].endswith(".pdf"):
        logger.info("parsing_url_as_pdf", url=url)
        file_bytes = response.content
        filename = url.split("/")[-1].split("?")[0]
        if not filename.lower().endswith(".pdf"):
            filename += ".pdf"
        if not filename:
            filename = "document.pdf"
        return parse_pdf(file_bytes, filename)

    # 2. Handle HTML Webpage (fallback/default)
    logger.info("parsing_url_as_html", url=url)
    html_content = response.text
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract Title
    title = None
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        title = f"Webpage: {parsed_url.netloc}{parsed_url.path}"

    # Decompose script, style, navigation, headers, footers
    for tag in soup(["script", "style", "header", "footer", "nav", "aside", "form"]):
        tag.decompose()

    # Extract main text
    text = soup.get_text(separator="\n")

    # Clean whitespace and empty lines
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
    cleaned_text = "\n".join(chunk for chunk in chunks if chunk)

    if not cleaned_text.strip():
        raise ValueError("Could not extract any readable text from the webpage")

    logger.info(
        "url_html_parsed",
        url=url,
        title=title,
        text_length=len(cleaned_text),
    )

    return ParsedDocument(
        title=title,
        total_pages=1,
        pages=[PageContent(page_number=1, text=cleaned_text)],
        full_text=cleaned_text,
    )
