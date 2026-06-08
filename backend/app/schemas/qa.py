from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    document_id: str | None = None
    document_ids: list[str] | None = None
    knowledge_base_ids: list[str] | None = None
    conversation_id: str | None = None
    max_distance: float | None = Field(default=None, ge=0, le=2)
    hybrid_search_enabled: bool = True
    vector_candidate_count: int | None = Field(default=None, ge=1, le=100)
    keyword_candidate_count: int | None = Field(default=None, ge=1, le=100)


class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    document_id: str | None = None
    document_ids: list[str] | None = None
    knowledge_base_ids: list[str] | None = None
    conversation_id: str | None = None
    max_distance: float | None = Field(default=None, ge=0, le=2)
    hybrid_search_enabled: bool = True
    vector_candidate_count: int | None = Field(default=None, ge=1, le=100)
    keyword_candidate_count: int | None = Field(default=None, ge=1, le=100)


class SearchResult(BaseModel):
    chunk_id: str
    document_id: str
    original_filename: str = ""
    file_type: str = ""
    page: int | None = None
    chunk_index: int
    text: str
    text_preview: str = ""
    distance: float
    score: float = 0.0
    retrieval_source: str = "vector"
    final_score: float = 0.0
    vector_rank: int | None = None
    keyword_rank: int | None = None
    vector_score: float = 0.0
    keyword_score: float = 0.0


class SearchResponse(BaseModel):
    question: str
    results: list[SearchResult]
    selected_document_ids: list[str] = []


class AskResponse(BaseModel):
    question: str
    answer: str
    sources: list[SearchResult]
    selected_document_ids: list[str] = []
