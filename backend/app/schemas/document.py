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
    knowledge_base_ids: list[str] = []
    ocr_status: str | None = None
    ocr_message: str | None = None


class LocalDocumentImportRequest(BaseModel):
    file_path: str
    knowledge_base_ids: list[str] = []
    chunk_size: int = 1000
    chunk_overlap: int = 200


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
    character_count: int = 0
    chunk_count: int
    indexed_chunk_count: int = 0
    is_indexed: bool
    file_path: str
    text_path: str | None = None
    chunks_path: str | None = None
    collection_name: str | None = None
    knowledge_base_ids: list[str] = []
    ocr_status: str | None = None
    ocr_message: str | None = None


class DocumentListResponse(BaseModel):
    documents: list[DocumentListItem]
    total: int


class DocumentDetailResponse(DocumentListItem):
    pass


class DocumentDeleteResponse(BaseModel):
    document_id: str
    deleted_metadata: bool
    deleted_files: list[str]
    missing_files: list[str]
    deleted_vector_count: int
    removed_knowledge_base_id: str | None = None
    is_orphan: bool = False


class DocumentFileActionResponse(BaseModel):
    document_id: str
    file_path: str
    action: str
    success: bool


class DocumentPreviewResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    preview_supported: bool
    preview_mode: str
    content: str | None = None
    file_url: str | None = None
    page: int | None = None
    chunk_index: int | None = None
    message: str | None = None


class DocumentKnowledgeBaseResponse(BaseModel):
    document_id: str
    knowledge_base_ids: list[str]
