from dataclasses import dataclass
from pathlib import Path

from app.core.config import BASE_DIR, settings
from app.services.document_metadata import delete_document_metadata, get_document_metadata
from app.services.vector_store import delete_document_vectors


@dataclass
class DeleteDocumentResult:
    document_id: str
    deleted_metadata: bool
    deleted_files: list[str]
    missing_files: list[str]
    deleted_vector_count: int


def delete_document(document_id: str) -> DeleteDocumentResult:
    metadata = get_document_metadata(document_id)
    file_paths = _document_file_paths(document_id, metadata)
    deleted_files = []
    missing_files = []

    for file_path in file_paths:
        if file_path.exists():
            file_path.unlink()
            deleted_files.append(str(file_path))
        else:
            missing_files.append(str(file_path))

    deleted_vector_count = delete_document_vectors(document_id)
    deleted_metadata = delete_document_metadata(document_id)

    return DeleteDocumentResult(
        document_id=document_id,
        deleted_metadata=deleted_metadata,
        deleted_files=deleted_files,
        missing_files=missing_files,
        deleted_vector_count=deleted_vector_count,
    )


def _document_file_paths(document_id: str, metadata: dict) -> list[Path]:
    candidates = [
        metadata.get("file_path"),
        metadata.get("text_path"),
        metadata.get("chunks_path"),
        str(Path(settings.upload_dir) / f"{document_id}.pdf"),
        str(BASE_DIR / "extracted_text" / f"{document_id}.txt"),
        str(BASE_DIR / "chunks" / f"{document_id}.json"),
    ]

    paths = []
    seen = set()
    for candidate in candidates:
        if not candidate:
            continue

        path = Path(candidate)
        if not path.is_absolute():
            path = BASE_DIR / path

        resolved_path = path.resolve()
        if not resolved_path.is_relative_to(BASE_DIR):
            continue

        if resolved_path not in seen:
            seen.add(resolved_path)
            paths.append(resolved_path)

    return paths
