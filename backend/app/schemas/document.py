from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    original_filename: str
    file_type: str
    content_type: str
    size: int
    is_duplicate: bool


class DocumentTextExtractResponse(BaseModel):
    document_id: str
    text_filename: str
    page_count: int
    character_count: int
    preview: str


class DocumentChunkResponse(BaseModel):
    document_id: str
    chunks_filename: str
    chunk_count: int
    chunk_size: int
    chunk_overlap: int
    first_chunk_preview: str


class DocumentIndexResponse(BaseModel):
    document_id: str
    collection_name: str
    indexed_chunk_count: int
    persist_directory: str


class DocumentImportResponse(BaseModel):
    document_id: str
    filename: str
    original_filename: str
    file_type: str
    content_type: str
    size: int
    is_duplicate: bool
    page_count: int
    character_count: int
    text_filename: str
    chunks_filename: str
    chunk_count: int
    indexed_chunk_count: int
    collection_name: str


class DocumentListItem(BaseModel):
    document_id: str
    original_filename: str
    stored_filename: str
    file_type: str
    content_type: str
    size: int
    uploaded_at: str
    updated_at: str
    page_count: int
    chunk_count: int
    is_indexed: bool
    file_path: str
    text_path: str | None = None
    chunks_path: str | None = None
    collection_name: str | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItem]
    total: int


class DocumentDetailResponse(DocumentListItem):
    character_count: int = 0
    indexed_chunk_count: int = 0


class DocumentDeleteResponse(BaseModel):
    document_id: str
    deleted_metadata: bool
    deleted_files: list[str]
    missing_files: list[str]
    deleted_vector_count: int


class DocumentFileActionResponse(BaseModel):
    document_id: str
    file_path: str
    action: str
    success: bool
