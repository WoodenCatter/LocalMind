import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.config import BASE_DIR

DATA_DIR = BASE_DIR / "data"
DOCUMENTS_FILE = DATA_DIR / "documents.json"


def list_document_metadata() -> list[dict[str, Any]]:
    records = _read_records()
    return sorted(records, key=lambda record: record.get("uploaded_at", ""), reverse=True)


def get_document_metadata(document_id: str) -> dict[str, Any]:
    _ensure_document_id(document_id)
    records = _read_records()

    for record in records:
        if record.get("document_id") == document_id:
            return record

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Document metadata was not found.",
    )


def get_document_metadata_map() -> dict[str, dict[str, Any]]:
    return {
        record["document_id"]: record
        for record in _read_records()
        if record.get("document_id")
    }


def upsert_document_metadata(document: dict[str, Any]) -> dict[str, Any]:
    document_id = str(document.get("document_id", ""))
    _ensure_document_id(document_id)

    records = _read_records()
    existing_index = _find_record_index(records, document_id)
    now = _utc_now()

    if existing_index is None:
        record = {
            **_default_record(document_id),
            **document,
            "uploaded_at": document.get("uploaded_at") or now,
            "updated_at": now,
        }
        records.append(record)
    else:
        existing = records[existing_index]
        record = {
            **existing,
            **document,
            "uploaded_at": existing.get("uploaded_at") or document.get("uploaded_at") or now,
            "updated_at": now,
        }
        records[existing_index] = record

    _write_records(records)
    return record


def delete_document_metadata(document_id: str) -> bool:
    _ensure_document_id(document_id)
    records = _read_records()
    next_records = [
        record
        for record in records
        if record.get("document_id") != document_id
    ]

    if len(next_records) == len(records):
        return False

    _write_records(next_records)
    return True


def _read_records() -> list[dict[str, Any]]:
    if not DOCUMENTS_FILE.exists():
        return []

    try:
        data = json.loads(DOCUMENTS_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document metadata file is invalid JSON.",
        ) from exc

    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Document metadata file must contain a JSON list.",
        )

    return data


def _write_records(records: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOCUMENTS_FILE.write_text(
        json.dumps(records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def _find_record_index(records: list[dict[str, Any]], document_id: str) -> int | None:
    for index, record in enumerate(records):
        if record.get("document_id") == document_id:
            return index

    return None


def _default_record(document_id: str) -> dict[str, Any]:
    return {
        "document_id": document_id,
        "original_filename": f"{document_id}.pdf",
        "stored_filename": f"{document_id}.pdf",
        "file_type": "pdf",
        "content_type": "application/pdf",
        "size": 0,
        "page_count": 0,
        "character_count": 0,
        "chunk_count": 0,
        "indexed_chunk_count": 0,
        "is_indexed": False,
        "file_path": str(BASE_DIR / "uploads" / f"{document_id}.pdf"),
        "text_path": None,
        "chunks_path": None,
        "collection_name": None,
    }


def _ensure_document_id(document_id: str) -> None:
    if not _is_valid_document_id(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id.",
        )


def _is_valid_document_id(document_id: str) -> bool:
    return len(document_id) == 64 and all(char in "0123456789abcdef" for char in document_id)


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
