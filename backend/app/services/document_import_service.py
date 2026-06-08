from mimetypes import guess_type
from pathlib import Path

from app.core.config import settings
from app.schemas.document import (
    DocumentChunkResponse,
    DocumentImportResponse,
    DocumentIndexResponse,
    DocumentTextExtractResponse,
    DocumentUploadResponse,
    LocalDocumentImportRequest,
)
from app.services.document_chunker import chunk_extracted_text
from app.services.document_catalog import list_documents
from app.services.document_metadata import get_document_metadata, upsert_document_metadata
from app.services.document_parser import extract_text_from_document
from app.services.document_storage import (
    StoredDocument,
    get_supported_file_type,
    save_local_document,
    save_uploaded_document,
)
from app.services.knowledge_base_store import add_document_to_import_knowledge_bases
from app.services.vector_store import index_document_chunks

IMAGE_FILE_TYPES = {"png", "jpg", "jpeg", "bmp", "webp"}


async def upload_document_only(file) -> DocumentUploadResponse:
    file_type = get_supported_file_type(file.filename)
    stored_document = await save_uploaded_document(file, file_type)
    ocr_status, ocr_message = _ocr_status(stored_document.file_type, 0)
    upsert_document_metadata(
        {
            "document_id": stored_document.document_id,
            "original_filename": file.filename,
            "stored_filename": stored_document.path.name,
            "file_type": stored_document.file_type,
            "content_type": file.content_type or "application/octet-stream",
            "size": stored_document.size,
            "page_count": 0,
            "character_count": 0,
            "chunk_count": 0,
            "indexed_chunk_count": 0,
            "is_indexed": False,
            "file_path": str(stored_document.path),
            "text_path": None,
            "chunks_path": None,
            "collection_name": None,
            "ocr_status": ocr_status,
            "ocr_message": ocr_message,
        }
    )

    return DocumentUploadResponse(
        document_id=stored_document.document_id,
        filename=stored_document.path.name,
        original_filename=file.filename,
        file_type=stored_document.file_type,
        content_type=file.content_type or "application/octet-stream",
        size=stored_document.size,
        is_duplicate=stored_document.is_duplicate,
    )


async def import_uploaded_document(
    *,
    file,
    knowledge_base_ids: list[str] | None,
    chunk_size: int,
    chunk_overlap: int,
) -> DocumentImportResponse:
    file_type = get_supported_file_type(file.filename)
    stored_document = await save_uploaded_document(file, file_type)
    return complete_document_import(
        stored_document=stored_document,
        original_filename=file.filename or stored_document.path.name,
        content_type=file.content_type or "application/octet-stream",
        knowledge_base_ids=knowledge_base_ids,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


def import_local_document_file(request: LocalDocumentImportRequest) -> DocumentImportResponse:
    source_path = Path(request.file_path)
    file_type = get_supported_file_type(source_path.name)
    content_type = guess_type(source_path.name)[0] or "application/octet-stream"
    stored_document = save_local_document(source_path, file_type)

    return complete_document_import(
        stored_document=stored_document,
        original_filename=source_path.name,
        content_type=content_type,
        knowledge_base_ids=request.knowledge_base_ids,
        chunk_size=request.chunk_size,
        chunk_overlap=request.chunk_overlap,
    )


def complete_document_import(
    *,
    stored_document: StoredDocument,
    original_filename: str,
    content_type: str,
    knowledge_base_ids: list[str] | None,
    chunk_size: int,
    chunk_overlap: int,
) -> DocumentImportResponse:
    existing_metadata = _get_existing_metadata(stored_document.document_id)
    if (
        existing_metadata
        and (existing_metadata.get("is_indexed") or _is_image_type(stored_document.file_type))
        and existing_metadata.get("text_path")
    ):
        selected_knowledge_base_ids = add_document_to_import_knowledge_bases(
            stored_document.document_id,
            knowledge_base_ids,
        )
        return _import_response_from_metadata(
            stored_document=stored_document,
            metadata=existing_metadata,
            original_filename=original_filename,
            content_type=content_type,
            knowledge_base_ids=selected_knowledge_base_ids,
        )

    extracted_text = extract_text_from_document(
        document_id=stored_document.document_id,
        file_path=stored_document.path,
        file_type=stored_document.file_type,
    )
    chunking_result = chunk_extracted_text(
        document_id=stored_document.document_id,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    if chunking_result.chunk_count > 0:
        indexing_result = index_document_chunks(stored_document.document_id)
        indexed_chunk_count = indexing_result.indexed_chunk_count
        collection_name = indexing_result.collection_name
        is_indexed = True
    else:
        indexed_chunk_count = 0
        collection_name = settings.chroma_collection_name
        is_indexed = False

    ocr_status, ocr_message = _ocr_status(
        stored_document.file_type,
        extracted_text.character_count,
    )
    upsert_document_metadata(
        {
            "document_id": stored_document.document_id,
            "original_filename": original_filename,
            "stored_filename": stored_document.path.name,
            "file_type": stored_document.file_type,
            "content_type": content_type,
            "size": stored_document.size,
            "page_count": extracted_text.page_count,
            "character_count": extracted_text.character_count,
            "chunk_count": chunking_result.chunk_count,
            "indexed_chunk_count": indexed_chunk_count,
            "is_indexed": is_indexed,
            "file_path": str(stored_document.path),
            "text_path": str(extracted_text.path),
            "chunks_path": str(chunking_result.path),
            "collection_name": collection_name,
            "ocr_status": ocr_status,
            "ocr_message": ocr_message,
        }
    )

    selected_knowledge_base_ids = add_document_to_import_knowledge_bases(
        stored_document.document_id,
        knowledge_base_ids,
    )

    return DocumentImportResponse(
        document_id=stored_document.document_id,
        filename=stored_document.path.name,
        original_filename=original_filename,
        file_type=stored_document.file_type,
        content_type=content_type,
        size=stored_document.size,
        is_duplicate=stored_document.is_duplicate,
        page_count=extracted_text.page_count,
        character_count=extracted_text.character_count,
        text_filename=extracted_text.path.name,
        chunks_filename=chunking_result.path.name,
        chunk_count=chunking_result.chunk_count,
        indexed_chunk_count=indexed_chunk_count,
        collection_name=collection_name,
        knowledge_base_ids=selected_knowledge_base_ids,
        ocr_status=ocr_status,
        ocr_message=ocr_message,
    )


def extract_document_text_for_import(document_id: str) -> DocumentTextExtractResponse:
    list_documents()
    metadata = get_document_metadata(document_id)
    extracted_text = extract_text_from_document(
        document_id=document_id,
        file_path=Path(metadata["file_path"]),
        file_type=metadata["file_type"],
    )
    ocr_status, ocr_message = _ocr_status(
        str(metadata.get("file_type") or ""),
        extracted_text.character_count,
    )
    upsert_document_metadata(
        {
            "document_id": document_id,
            "page_count": extracted_text.page_count,
            "character_count": extracted_text.character_count,
            "text_path": str(extracted_text.path),
            "ocr_status": ocr_status,
            "ocr_message": ocr_message,
        }
    )

    return DocumentTextExtractResponse(
        document_id=document_id,
        text_filename=extracted_text.path.name,
        page_count=extracted_text.page_count,
        character_count=extracted_text.character_count,
        preview=extracted_text.preview,
    )


def chunk_document_text_for_import(
    document_id: str,
    chunk_size: int,
    chunk_overlap: int,
) -> DocumentChunkResponse:
    chunking_result = chunk_extracted_text(
        document_id=document_id,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )
    upsert_document_metadata(
        {
            "document_id": document_id,
            "chunk_count": chunking_result.chunk_count,
            "chunks_path": str(chunking_result.path),
        }
    )

    return DocumentChunkResponse(
        document_id=document_id,
        chunks_filename=chunking_result.path.name,
        chunk_count=chunking_result.chunk_count,
        chunk_size=chunking_result.chunk_size,
        chunk_overlap=chunking_result.chunk_overlap,
        first_chunk_preview=chunking_result.first_chunk_preview,
    )


def index_document_for_import(document_id: str) -> DocumentIndexResponse:
    indexing_result = index_document_chunks(document_id)
    upsert_document_metadata(
        {
            "document_id": document_id,
            "indexed_chunk_count": indexing_result.indexed_chunk_count,
            "is_indexed": True,
            "collection_name": indexing_result.collection_name,
        }
    )

    return DocumentIndexResponse(
        document_id=document_id,
        collection_name=indexing_result.collection_name,
        indexed_chunk_count=indexing_result.indexed_chunk_count,
        persist_directory=indexing_result.persist_directory,
    )


def _get_existing_metadata(document_id: str) -> dict | None:
    try:
        return get_document_metadata(document_id)
    except Exception:
        return None


def _is_image_type(file_type: str) -> bool:
    return file_type.lower() in IMAGE_FILE_TYPES


def _ocr_status(file_type: str, character_count: int) -> tuple[str | None, str | None]:
    if not _is_image_type(file_type):
        return None, None

    if character_count > 0:
        return "success", f"OCR成功，提取文字：{character_count}字。"

    return "empty", "未检测到可识别文字，该图片不会参与知识库问答。"


def _import_response_from_metadata(
    *,
    stored_document: StoredDocument,
    metadata: dict,
    original_filename: str,
    content_type: str,
    knowledge_base_ids: list[str],
) -> DocumentImportResponse:
    return DocumentImportResponse(
        document_id=stored_document.document_id,
        filename=stored_document.path.name,
        original_filename=str(metadata.get("original_filename") or original_filename),
        file_type=stored_document.file_type,
        content_type=content_type,
        size=stored_document.size,
        is_duplicate=True,
        page_count=int(metadata.get("page_count") or 0),
        character_count=int(metadata.get("character_count") or 0),
        text_filename=Path(str(metadata.get("text_path") or "")).name,
        chunks_filename=Path(str(metadata.get("chunks_path") or "")).name,
        chunk_count=int(metadata.get("chunk_count") or 0),
        indexed_chunk_count=int(metadata.get("indexed_chunk_count") or 0),
        collection_name=str(metadata.get("collection_name") or ""),
        knowledge_base_ids=knowledge_base_ids,
        ocr_status=metadata.get("ocr_status"),
        ocr_message=metadata.get("ocr_message"),
    )
