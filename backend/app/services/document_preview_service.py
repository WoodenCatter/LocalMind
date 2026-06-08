from mimetypes import guess_type
from pathlib import Path

from fastapi import HTTPException, status
from fastapi.responses import FileResponse

from app.schemas.document import DocumentPreviewResponse
from app.services.document_file_service import get_managed_file_path
from app.services.document_metadata import get_document_metadata
from app.services.document_parser import parse_document

TEXT_PREVIEW_TYPES = {"txt", "md", "docx", "pptx"}
PDF_PREVIEW_TYPES = {"pdf"}
IMAGE_PREVIEW_TYPES = {"png", "jpg", "jpeg", "bmp", "webp"}


def build_document_preview(
    document_id: str,
    page: int | None = None,
    chunk_index: int | None = None,
) -> DocumentPreviewResponse:
    metadata = get_document_metadata(document_id)
    file_type = str(metadata.get("file_type", "")).lower()
    filename = str(metadata.get("original_filename") or metadata.get("stored_filename") or document_id)

    if file_type in PDF_PREVIEW_TYPES:
        return DocumentPreviewResponse(
            document_id=document_id,
            filename=filename,
            file_type=file_type,
            preview_supported=True,
            preview_mode="pdf",
            file_url=f"/api/documents/{document_id}/preview-file",
            page=page,
            chunk_index=chunk_index,
        )

    if file_type in IMAGE_PREVIEW_TYPES:
        get_managed_file_path(metadata)
        return DocumentPreviewResponse(
            document_id=document_id,
            filename=filename,
            file_type=file_type,
            preview_supported=True,
            preview_mode="image",
            content=_ocr_preview_content(metadata),
            file_url=f"/api/documents/{document_id}/preview-file",
            page=page,
            chunk_index=chunk_index,
        )

    if file_type in TEXT_PREVIEW_TYPES:
        file_path = get_managed_file_path(metadata)
        return DocumentPreviewResponse(
            document_id=document_id,
            filename=filename,
            file_type=file_type,
            preview_supported=True,
            preview_mode="text",
            content=_text_preview_content(file_path, file_type),
            page=page,
            chunk_index=chunk_index,
        )

    return DocumentPreviewResponse(
        document_id=document_id,
        filename=filename,
        file_type=file_type,
        preview_supported=False,
        preview_mode="unsupported",
        page=page,
        chunk_index=chunk_index,
        message="暂不支持该格式预览。",
    )


def build_preview_file_response(document_id: str) -> FileResponse:
    metadata = get_document_metadata(document_id)
    file_type = str(metadata.get("file_type", "")).lower()
    if file_type not in PDF_PREVIEW_TYPES and file_type not in IMAGE_PREVIEW_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and image preview files are supported.",
        )

    file_path = get_managed_file_path(metadata)
    media_type = "application/pdf" if file_type in PDF_PREVIEW_TYPES else guess_type(file_path.name)[0]
    return FileResponse(
        path=file_path,
        media_type=media_type or "application/octet-stream",
        filename=str(metadata.get("original_filename") or file_path.name),
        content_disposition_type="inline",
    )


def _read_text_preview(file_path: Path) -> str:
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return file_path.read_text(encoding="gb18030", errors="replace")


def _text_preview_content(file_path: Path, file_type: str) -> str:
    if file_type in {"txt", "md"}:
        content = _read_text_preview(file_path).strip()
        return content or "该文档暂无可预览文本。"

    try:
        parsed_document = parse_document(file_path, file_type)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="预览失败，可尝试打开原文件。",
        ) from exc

    if file_type == "docx":
        content = "\n\n".join(
            section.text.strip()
            for section in parsed_document.sections
            if section.text.strip()
        ).strip()
        return content or "该 DOCX 文档暂无可提取文本。"

    if file_type == "pptx":
        slide_blocks = []
        for section in parsed_document.sections:
            slide_text = section.text.strip() or "该页暂无可提取文本。"
            slide_blocks.append(f"=== Slide {section.page} ===\n{slide_text}")

        return "\n\n".join(slide_blocks).strip() or "该 PPTX 文档暂无可提取文本。"

    return "暂不支持该格式预览。"


def _ocr_preview_content(metadata: dict) -> str:
    text_path_value = metadata.get("text_path")
    if text_path_value:
        text_path = Path(str(text_path_value))
        if text_path.exists() and text_path.is_file():
            return _read_text_preview(text_path).strip()

    return ""
