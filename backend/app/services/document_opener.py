import os
import subprocess
import sys
from pathlib import Path

from fastapi import HTTPException, status

from app.services.document_metadata import get_document_metadata


def get_managed_document_path(document_id: str) -> Path:
    metadata = get_document_metadata(document_id)
    file_path = Path(str(metadata.get("file_path") or "")).resolve()

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The imported document copy was not found.",
        )

    return file_path


def open_managed_document(document_id: str) -> Path:
    file_path = get_managed_document_path(document_id)

    if os.name == "nt":
        os.startfile(str(file_path))  # type: ignore[attr-defined]
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(file_path)])
    else:
        subprocess.Popen(["xdg-open", str(file_path)])

    return file_path


def show_managed_document_in_folder(document_id: str) -> Path:
    file_path = get_managed_document_path(document_id)

    if os.name == "nt":
        subprocess.Popen(["explorer", f"/select,{file_path}"])
    elif sys.platform == "darwin":
        subprocess.Popen(["open", "-R", str(file_path)])
    else:
        subprocess.Popen(["xdg-open", str(file_path.parent)])

    return file_path
