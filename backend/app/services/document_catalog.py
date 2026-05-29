import json
import re
from pathlib import Path

from app.core.config import BASE_DIR, settings
from app.services.document_metadata import list_document_metadata, upsert_document_metadata
from app.services.document_storage import SUPPORTED_FILE_TYPES
from app.services.vector_store import get_indexed_document_ids


def list_documents() -> list[dict]:
    documents = list_document_metadata()
    if documents:
        return documents

    _bootstrap_metadata_from_local_files()
    return list_document_metadata()


def _bootstrap_metadata_from_local_files() -> None:
    document_ids = _collect_document_ids()
    indexed_document_ids = get_indexed_document_ids()

    for document_id in sorted(document_ids):
        file_path, file_type = _find_uploaded_file(document_id)
        text_path = BASE_DIR / "extracted_text" / f"{document_id}.txt"
        chunks_path = BASE_DIR / "chunks" / f"{document_id}.json"
        chunk_count = _count_chunks(chunks_path)
        stored_filename = file_path.name if file_path else f"{document_id}.{file_type}"

        upsert_document_metadata(
            {
                "document_id": document_id,
                "original_filename": stored_filename,
                "stored_filename": stored_filename,
                "file_type": file_type,
                "content_type": _content_type_for(file_type),
                "size": file_path.stat().st_size if file_path else 0,
                "page_count": _count_pages(text_path),
                "character_count": _count_characters(text_path),
                "chunk_count": chunk_count,
                "indexed_chunk_count": chunk_count if document_id in indexed_document_ids else 0,
                "is_indexed": document_id in indexed_document_ids,
                "file_path": str(file_path) if file_path else str(Path(settings.upload_dir) / stored_filename),
                "text_path": str(text_path) if text_path.exists() else None,
                "chunks_path": str(chunks_path) if chunks_path.exists() else None,
                "collection_name": settings.chroma_collection_name if document_id in indexed_document_ids else None,
            }
        )


def _collect_document_ids() -> set[str]:
    document_ids = set()

    for directory, extension in [
        (Path(settings.upload_dir), "*"),
        (BASE_DIR / "extracted_text", "*.txt"),
        (BASE_DIR / "chunks", "*.json"),
    ]:
        if not directory.exists():
            continue

        for path in directory.glob(extension):
            if path.is_file() and _is_valid_document_id(path.stem):
                document_ids.add(path.stem)

    return document_ids


def _count_chunks(chunks_path: Path) -> int:
    if not chunks_path.exists():
        return 0

    try:
        return len(json.loads(chunks_path.read_text(encoding="utf-8")))
    except json.JSONDecodeError:
        return 0


def _count_pages(text_path: Path) -> int:
    if not text_path.exists():
        return 0

    text = text_path.read_text(encoding="utf-8")
    return len(re.findall(r"--- Page \d+ ---", text))


def _count_characters(text_path: Path) -> int:
    if not text_path.exists():
        return 0

    return len(text_path.read_text(encoding="utf-8"))


def _find_uploaded_file(document_id: str) -> tuple[Path | None, str]:
    upload_dir = Path(settings.upload_dir)

    for extension, file_type in SUPPORTED_FILE_TYPES.items():
        candidate = upload_dir / f"{document_id}{extension}"
        if candidate.exists():
            return candidate, file_type

    return None, "pdf"


def _content_type_for(file_type: str) -> str:
    return {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "txt": "text/plain",
        "md": "text/markdown",
    }.get(file_type, "application/octet-stream")


def _is_valid_document_id(document_id: str) -> bool:
    return len(document_id) == 64 and all(char in "0123456789abcdef" for char in document_id)
