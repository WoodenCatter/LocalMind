import json
import re
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import BASE_DIR


@dataclass
class ChunkingResult:
    path: Path
    chunk_count: int
    chunk_size: int
    chunk_overlap: int
    first_chunk_preview: str


def chunk_extracted_text(
    document_id: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> ChunkingResult:
    if not _is_valid_document_id(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id.",
        )

    if chunk_overlap >= chunk_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="chunk_overlap must be smaller than chunk_size.",
        )

    text_path = BASE_DIR / "extracted_text" / f"{document_id}.txt"
    if not text_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Extracted text was not found. Run extract-text first.",
        )

    text = text_path.read_text(encoding="utf-8")
    pages = _split_pages(text)

    chunk_dir = BASE_DIR / "chunks"
    chunk_dir.mkdir(parents=True, exist_ok=True)
    chunk_path = chunk_dir / f"{document_id}.json"
    chunk_records = []
    for page_number, page_text in pages:
        normalized_text = _normalize_text(page_text)
        chunks = _split_text(normalized_text, chunk_size, chunk_overlap)

        for chunk in chunks:
            index = len(chunk_records)
            chunk_records.append(
                {
                    "chunk_id": f"{document_id}_{index}",
                    "document_id": document_id,
                    "index": index,
                    "page": page_number,
                    "text": chunk,
                    "character_count": len(chunk),
                }
            )
    chunk_path.write_text(
        json.dumps(chunk_records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return ChunkingResult(
        path=chunk_path,
        chunk_count=len(chunk_records),
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        first_chunk_preview=chunk_records[0]["text"][:500] if chunk_records else "",
    )


def _normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_pages(text: str) -> list[tuple[int | None, str]]:
    pattern = re.compile(r"--- Page (\d+) ---")
    matches = list(pattern.finditer(text))

    if not matches:
        return [(None, text)]

    pages = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        pages.append((int(match.group(1)), text[start:end]))

    return pages


def _split_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + chunk_size, len(text))
        split_at = _find_split_point(text, start, end)
        chunk = text[start:split_at].strip()

        if chunk:
            chunks.append(chunk)

        if split_at >= len(text):
            break

        start = max(split_at - chunk_overlap, start + 1)

    return chunks


def _find_split_point(text: str, start: int, end: int) -> int:
    if end >= len(text):
        return len(text)

    paragraph_break = text.rfind("\n\n", start, end)
    if paragraph_break > start:
        return paragraph_break

    sentence_marks = ["\u3002", "\uff01", "\uff1f", ".", "!", "?"]
    sentence_breaks = [text.rfind(mark, start, end) for mark in sentence_marks]
    sentence_break = max(sentence_breaks)
    if sentence_break > start:
        return sentence_break + 1

    whitespace = text.rfind(" ", start, end)
    if whitespace > start:
        return whitespace

    return end


def _is_valid_document_id(document_id: str) -> bool:
    return len(document_id) == 64 and all(char in "0123456789abcdef" for char in document_id)
