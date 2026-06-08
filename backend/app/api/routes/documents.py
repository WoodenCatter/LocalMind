from fastapi import APIRouter, File, Form, Query, UploadFile, status
from fastapi.responses import FileResponse

from app.schemas.document import (
    DocumentChunkResponse,
    DocumentDeleteResponse,
    DocumentDetailResponse,
    DocumentFileActionResponse,
    DocumentImportResponse,
    DocumentIndexResponse,
    DocumentKnowledgeBaseResponse,
    DocumentListItem,
    DocumentListResponse,
    DocumentPreviewResponse,
    DocumentTextExtractResponse,
    DocumentUploadResponse,
    LocalDocumentImportRequest,
)
from app.schemas.knowledge_base import DocumentKnowledgeBaseRequest, DocumentMoveRequest
from app.services.document_catalog import list_documents
from app.services.document_file_service import (
    open_imported_file,
    show_imported_file_in_folder,
)
from app.services.document_import_service import (
    chunk_document_text_for_import,
    extract_document_text_for_import,
    import_local_document_file,
    import_uploaded_document,
    index_document_for_import,
    upload_document_only,
)
from app.services.document_lifecycle import delete_document
from app.services.document_metadata import get_document_metadata
from app.services.document_preview_service import (
    build_document_preview,
    build_preview_file_response,
)
from app.services.knowledge_base_store import (
    add_document_to_knowledge_bases,
    document_has_knowledge_base,
    get_default_knowledge_base_id,
    get_document_knowledge_base_ids,
    get_document_ids_for_knowledge_bases,
    move_document_to_knowledge_bases,
    remove_document_from_all_knowledge_bases,
    remove_document_from_knowledge_base,
)

router = APIRouter(tags=["documents"])


@router.get("", response_model=DocumentListResponse)
def get_documents(
    knowledge_base_id: str | None = Query(default=None),
) -> DocumentListResponse:
    allowed_document_ids = None
    if knowledge_base_id:
        allowed_document_ids = set(get_document_ids_for_knowledge_bases([knowledge_base_id]))

    documents = []
    for document in list_documents():
        document_id = document["document_id"]
        if allowed_document_ids is not None and document_id not in allowed_document_ids:
            continue

        documents.append(
            DocumentListItem(
                **document,
                knowledge_base_ids=get_document_knowledge_base_ids(document_id),
            )
        )

    return DocumentListResponse(
        documents=documents,
        total=len(documents),
    )


@router.get("/{document_id}/preview", response_model=DocumentPreviewResponse)
def preview_document(
    document_id: str,
    page: int | None = Query(default=None),
    chunk_index: int | None = Query(default=None),
) -> DocumentPreviewResponse:
    return build_document_preview(
        document_id=document_id,
        page=page,
        chunk_index=chunk_index,
    )


@router.get("/{document_id}/preview-file")
def preview_document_file(document_id: str) -> FileResponse:
    return build_preview_file_response(document_id)


@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document(document_id: str) -> DocumentDetailResponse:
    list_documents()
    return DocumentDetailResponse(**get_document_metadata(document_id))


@router.post("/{document_id}/open", response_model=DocumentFileActionResponse)
def open_document_file(document_id: str) -> DocumentFileActionResponse:
    file_path = open_imported_file(document_id)
    return DocumentFileActionResponse(
        document_id=document_id,
        file_path=str(file_path),
        action="open",
        success=True,
    )


@router.post("/{document_id}/show-in-folder", response_model=DocumentFileActionResponse)
def show_document_file_in_folder(document_id: str) -> DocumentFileActionResponse:
    file_path = show_imported_file_in_folder(document_id)
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
    return await upload_document_only(file)


@router.post(
    "/import",
    response_model=DocumentImportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_document(
    file: UploadFile = File(...),
    knowledge_base_ids: list[str] | None = Form(default=None),
    chunk_size: int = Query(default=1000, ge=200, le=4000),
    chunk_overlap: int = Query(default=200, ge=0, le=1000),
) -> DocumentImportResponse:
    return await import_uploaded_document(
        file=file,
        knowledge_base_ids=knowledge_base_ids,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


@router.post(
    "/import-local",
    response_model=DocumentImportResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_local_document(request: LocalDocumentImportRequest) -> DocumentImportResponse:
    return import_local_document_file(request)


@router.post("/{document_id}/copy-to-knowledge-bases", response_model=DocumentKnowledgeBaseResponse)
def copy_document_to_knowledge_bases(
    document_id: str,
    request: DocumentKnowledgeBaseRequest,
) -> DocumentKnowledgeBaseResponse:
    list_documents()
    knowledge_base_ids = add_document_to_knowledge_bases(
        document_id,
        request.knowledge_base_ids,
    )
    return DocumentKnowledgeBaseResponse(
        document_id=document_id,
        knowledge_base_ids=knowledge_base_ids,
    )


@router.post("/{document_id}/move-to-knowledge-bases", response_model=DocumentKnowledgeBaseResponse)
def move_document_between_knowledge_bases(
    document_id: str,
    request: DocumentMoveRequest,
) -> DocumentKnowledgeBaseResponse:
    list_documents()
    knowledge_base_ids = move_document_to_knowledge_bases(
        document_id,
        request.from_knowledge_base_id,
        request.target_knowledge_base_ids,
    )
    return DocumentKnowledgeBaseResponse(
        document_id=document_id,
        knowledge_base_ids=knowledge_base_ids,
    )


@router.post("/{document_id}/extract-text", response_model=DocumentTextExtractResponse)
def extract_document_text(document_id: str) -> DocumentTextExtractResponse:
    return extract_document_text_for_import(document_id)


@router.post("/{document_id}/chunks", response_model=DocumentChunkResponse)
def chunk_document_text(
    document_id: str,
    chunk_size: int = Query(default=1000, ge=200, le=4000),
    chunk_overlap: int = Query(default=200, ge=0, le=1000),
) -> DocumentChunkResponse:
    return chunk_document_text_for_import(
        document_id=document_id,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )


@router.post("/{document_id}/index", response_model=DocumentIndexResponse)
def index_document(document_id: str) -> DocumentIndexResponse:
    return index_document_for_import(document_id)


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
def remove_document(
    document_id: str,
    knowledge_base_id: str | None = Query(default=None),
    delete_entity: bool = Query(default=False),
) -> DocumentDeleteResponse:
    list_documents()

    if knowledge_base_id and not delete_entity:
        if knowledge_base_id == get_default_knowledge_base_id():
            remove_document_from_all_knowledge_bases(document_id)
        else:
            remove_document_from_knowledge_base(document_id, knowledge_base_id)
        is_orphan = not document_has_knowledge_base(document_id)
        return DocumentDeleteResponse(
            document_id=document_id,
            deleted_metadata=False,
            deleted_files=[],
            missing_files=[],
            deleted_vector_count=0,
            removed_knowledge_base_id=knowledge_base_id,
            is_orphan=is_orphan,
        )

    remove_document_from_all_knowledge_bases(document_id)
    result = delete_document(document_id)

    return DocumentDeleteResponse(
        document_id=result.document_id,
        deleted_metadata=result.deleted_metadata,
        deleted_files=result.deleted_files,
        missing_files=result.missing_files,
        deleted_vector_count=result.deleted_vector_count,
    )
