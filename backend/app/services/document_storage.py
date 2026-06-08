from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
import shutil

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

SUPPORTED_FILE_TYPES = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".pptx": "pptx",
    ".txt": "txt",
    ".md": "md",
    ".png": "png",
    ".jpg": "jpg",
    ".jpeg": "jpeg",
    ".bmp": "bmp",
    ".webp": "webp",
}


@dataclass
class StoredDocument:
    document_id: str
    path: Path
    size: int
    is_duplicate: bool
    file_type: str


def get_supported_file_type(filename: str | None) -> str:
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a filename.",
        )

    extension = Path(filename).suffix.lower()
    file_type = SUPPORTED_FILE_TYPES.get(extension)
    if not file_type:
        allowed = ", ".join(sorted(SUPPORTED_FILE_TYPES))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed extensions: {allowed}.",
        )

    return file_type


async def save_uploaded_document(file: UploadFile, file_type: str) -> StoredDocument:
    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    content = await file.read()
    document_id = sha256(content).hexdigest()
    destination = upload_dir / f"{document_id}.{file_type}"
    is_duplicate = destination.exists()

    if not is_duplicate:
        destination.write_bytes(content)

    return StoredDocument(
        document_id=document_id,
        path=destination,
        size=len(content),
        is_duplicate=is_duplicate,
        file_type=file_type,
    )


def save_local_document(source_path: Path, file_type: str) -> StoredDocument:
    if not source_path.exists() or not source_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected file does not exist.",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    digest = sha256()
    with source_path.open("rb") as source_file:
        for block in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(block)

    document_id = digest.hexdigest()
    destination = upload_dir / f"{document_id}.{file_type}"
    is_duplicate = destination.exists()

    if not is_duplicate:
        shutil.copyfile(source_path, destination)

    return StoredDocument(
        document_id=document_id,
        path=destination,
        size=source_path.stat().st_size,
        is_duplicate=is_duplicate,
        file_type=file_type,
    )


async def save_uploaded_pdf(file: UploadFile) -> StoredDocument:
    return await save_uploaded_document(file, "pdf")
