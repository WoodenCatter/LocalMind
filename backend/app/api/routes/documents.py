from pathlib import Path

from fastapi import APIRouter, File, Query, UploadFile, status

from app.schemas.document import (
    DocumentChunkResponse,
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentFileActionResponse,
    DocumentImportResponse,
    DocumentIndexResponse,
    DocumentListItem,
    DocumentListResponse,
    DocumentTextExtractResponse,
    DocumentUploadResponse,
)
from app.services.document_chunker import chunk_extracted_text
from app.services.document_catalog import list_documents
from app.services.document_lifecycle import delete_document
from app.services.document_metadata import get_document_metadata, upsert_document_metadata
from app.services.document_opener import (
    open_managed_document,
    show_managed_document_in_folder,
)
from app.services.document_parser import extract_text_from_document
from app.services.document_storage import get_supported_file_type, save_uploaded_document
from app.services.vector_store import index_document_chunks

router = APIRouter(tags=["documents"])


def _get_file_type(file: UploadFile) -> str:
    return get_supported_file_type(file.filename)


@router.get("", response_model=DocumentListResponse)
def get_documents() -> DocumentListResponse:
    documents = [
        DocumentListItem(**document)
        for document in list_documents()
    ]

    return DocumentListResponse(
        documents=documents,
        total=len(documents),
    )


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(document_id: str) -> DocumentDetailResponse:
    list_documents()
    return DocumentDetailResponse(**get_document_metadata(document_id))


@router.post("/{document_id}/open", response_model=DocumentFileActionResponse)
def open_document_file(document_id: str) -> DocumentFileActionResponse:
    file_path = open_managed_document(document_id)
    return DocumentFileActionResponse(
        document_id=document_id,
        file_path=str(file_path),
        action="open",
        success=True,
    )


@router.post("/{document_id}/show-in-folder", response_model=DocumentFileActionResponse)
def show_document_file_in_folder(document_id: str) -> DocumentFileActionResponse:
    file_path = show_managed_document_in_folder(document_id)
    return DocumentFileActionResponse(
        document_id=document_id,
        file_path=str(file_path),
        action="show-in-folder",
        success=True,
    )


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(file: UploadFile = File(...)) -> DocumentUploadResponse:
    file_type = _get_file_type(file)

    stored_document = await save_uploaded_document(file, file_type)
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


@router.post(
    "/import",
    response_model=DocumentImportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_document(
    file: UploadFile = File(...),
    chunk_size: int = Query(default=1000, ge=200, le=4000),
    chunk_overlap: int = Query(default=200, ge=0, le=1000),
) -> DocumentImportResponse:
    file_type = _get_file_type(file)

    stored_document = await save_uploaded_document(file, file_type)
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
    indexing_result = index_document_chunks(stored_document.document_id)
    upsert_document_metadata(
        {
            "document_id": stored_document.document_id,
            "original_filename": file.filename,
            "stored_filename": stored_document.path.name,
            "file_type": stored_document.file_type,
            "content_type": file.content_type or "application/octet-stream",
            "size": stored_document.size,
            "page_count": extracted_text.page_count,
            "character_count": extracted_text.character_count,
            "chunk_count": chunking_result.chunk_count,
            "indexed_chunk_count": indexing_result.indexed_chunk_count,
            "is_indexed": True,
            "file_path": str(stored_document.path),
            "text_path": str(extracted_text.path),
            "chunks_path": str(chunking_result.path),
            "collection_name": indexing_result.collection_name,
        }
    )

    return DocumentImportResponse(
        document_id=stored_document.document_id,
        filename=stored_document.path.name,
        original_filename=file.filename,
        file_type=stored_document.file_type,
        content_type=file.content_type or "application/octet-stream",
        size=stored_document.size,
        is_duplicate=stored_document.is_duplicate,
        page_count=extracted_text.page_count,
        character_count=extracted_text.character_count,
        text_filename=extracted_text.path.name,
        chunks_filename=chunking_result.path.name,
        chunk_count=chunking_result.chunk_count,
        indexed_chunk_count=indexing_result.indexed_chunk_count,
        collection_name=indexing_result.collection_name,
    )


@router.post("/{document_id}/extract-text", response_model=DocumentTextExtractResponse)
def extract_document_text(document_id: str) -> DocumentTextExtractResponse:
    list_documents()
    metadata = get_document_metadata(document_id)
    extracted_text = extract_text_from_document(
        document_id=document_id,
        file_path=Path(metadata["file_path"]),
        file_type=metadata["file_type"],
    )
    upsert_document_metadata(
        {
            "document_id": document_id,
            "page_count": extracted_text.page_count,
            "character_count": extracted_text.character_count,
            "text_path": str(extracted_text.path),
        }
    )

    return DocumentTextExtractResponse(
        document_id=document_id,
        text_filename=extracted_text.path.name,
        page_count=extracted_text.page_count,
        character_count=extracted_text.character_count,
        preview=extracted_text.preview,
    )


@router.post("/{document_id}/chunks", response_model=DocumentChunkResponse)
def chunk_document_text(
    document_id: str,
    chunk_size: int = Query(default=1000, ge=200, le=4000),
    chunk_overlap: int = Query(default=200, ge=0, le=1000),
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


@router.post("/{document_id}/index", response_model=DocumentIndexResponse)
def index_document(document_id: str) -> DocumentIndexResponse:
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


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
def remove_document(document_id: str) -> DocumentDeleteResponse:
    list_documents()
    result = delete_document(document_id)

    return DocumentDeleteResponse(
        document_id=result.document_id,
        deleted_metadata=result.deleted_metadata,
        deleted_files=result.deleted_files,
        missing_files=result.missing_files,
        deleted_vector_count=result.deleted_vector_count,
    )
