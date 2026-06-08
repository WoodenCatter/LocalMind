from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import settings
from app.services.document_opener import (
    open_managed_document,
    show_managed_document_in_folder,
)


def get_managed_file_path(metadata: dict) -> Path:
    file_path = Path(str(metadata.get("file_path") or ""))
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Managed document file was not found.",
        )

    upload_dir = Path(settings.upload_dir).resolve()
    resolved_file_path = file_path.resolve()
    if upload_dir not in resolved_file_path.parents and resolved_file_path != upload_dir:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Preview is only allowed for managed LocalMind files.",
        )

    return resolved_file_path


def open_imported_file(document_id: str) -> Path:
    return open_managed_document(document_id)


def show_imported_file_in_folder(document_id: str) -> Path:
    return show_managed_document_in_folder(document_id)
