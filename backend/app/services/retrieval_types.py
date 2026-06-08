from dataclasses import dataclass


@dataclass
class IndexingResult:
    collection_name: str
    indexed_chunk_count: int
    persist_directory: str


@dataclass
class SearchResult:
    chunk_id: str
    document_id: str
    chunk_index: int
    text: str
    distance: float = 1.0
    score: float = 0.0
    original_filename: str = ""
    file_type: str = ""
    page: int | None = None
    text_preview: str = ""
    retrieval_source: str = "vector"
    final_score: float = 0.0
    vector_rank: int | None = None
    keyword_rank: int | None = None
    vector_score: float = 0.0
    keyword_score: float = 0.0


@dataclass
class ChunkCandidate:
    chunk_id: str
    document_id: str
    chunk_index: int
    text: str
    page: int | None = None
