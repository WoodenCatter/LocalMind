import hashlib
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import BASE_DIR, settings
from app.services.document_metadata import get_document_metadata_map

EMBEDDING_DIMENSION = 384
DEFAULT_MAX_DISTANCE = 0.8
MIN_RELEVANCE_SCORE = 0.35
MIN_ANCHOR_SCORE = 0.05
ANCHOR_MAX_DISTANCE = 1.2
COMMON_QUERY_TERMS = {
    "是什",
    "是什么",
    "为什么",
    "什么",
    "怎么",
    "如何",
    "哪些",
    "哪个",
    "多少",
    "是否",
    "可以",
    "关于",
    "这个",
    "那个",
    "文档",
    "资料",
    "内容",
    "问题",
    "介绍",
    "说明",
    "时候",
    "时间",
    "吗",
    "呢",
}
CHINESE_SUBJECT_SUFFIXES = (
    "奖",
    "机",
    "论",
    "测试",
    "论坛",
    "讲坛",
    "模型",
    "理论",
    "问题",
)


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
    distance: float
    score: float = 0.0
    lexical_score: float = 0.0
    anchor_match_count: int = 0
    original_filename: str = ""
    file_type: str = ""
    page: int | None = None
    text_preview: str = ""


class LocalHashEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        return [_embed_text(text) for text in input]


def index_document_chunks(document_id: str) -> IndexingResult:
    if not _is_valid_document_id(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id.",
        )

    chunks_path = BASE_DIR / "chunks" / f"{document_id}.json"
    if not chunks_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chunks were not found. Run chunks first.",
        )

    chunk_records = json.loads(chunks_path.read_text(encoding="utf-8"))
    if not chunk_records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No chunks were found for this document.",
        )

    collection = _get_collection()
    collection.upsert(
        ids=[record["chunk_id"] for record in chunk_records],
        documents=[record["text"] for record in chunk_records],
        metadatas=[
            {
                "document_id": record["document_id"],
                "chunk_index": record["index"],
                "character_count": record["character_count"],
                "page": record.get("page") or 0,
            }
            for record in chunk_records
        ],
    )

    return IndexingResult(
        collection_name=settings.chroma_collection_name,
        indexed_chunk_count=len(chunk_records),
        persist_directory=str(Path(settings.chroma_persist_dir)),
    )


def delete_document_vectors(document_id: str) -> int:
    if not _is_valid_document_id(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id.",
        )

    collection = _get_collection()
    existing = collection.get(where={"document_id": document_id})
    existing_ids = existing.get("ids", [])

    if existing_ids:
        collection.delete(where={"document_id": document_id})

    return len(existing_ids)


def search_relevant_chunks(
    question: str,
    top_k: int = 5,
    document_id: str | None = None,
    document_ids: list[str] | None = None,
    max_distance: float | None = None,
) -> list[SearchResult]:
    question = question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )

    selected_document_ids = _resolve_document_filter(document_id, document_ids)
    active_max_distance = DEFAULT_MAX_DISTANCE if max_distance is None else max_distance

    try:
        collection = _get_collection()
        if collection.count() == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No indexed chunks were found. Run index first.",
            )

        query_args = {
            "query_texts": [question],
            "n_results": max(top_k * 5, 10),
            "include": ["documents", "metadatas", "distances"],
        }
        if selected_document_ids:
            query_args["where"] = _document_where_filter(selected_document_ids)

        query_result = collection.query(
            **query_args,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ChromaDB query failed: {exc}",
        ) from exc

    ids = query_result.get("ids", [[]])[0]
    documents = query_result.get("documents", [[]])[0]
    metadatas = query_result.get("metadatas", [[]])[0]
    distances = query_result.get("distances", [[]])[0]

    results = []
    for index, chunk_id in enumerate(ids):
        metadata = metadatas[index] or {}
        results.append(
            SearchResult(
                chunk_id=chunk_id,
                document_id=str(metadata.get("document_id", "")),
                chunk_index=int(metadata.get("chunk_index", -1)),
                text=documents[index],
                distance=float(distances[index]),
                page=_metadata_page(metadata),
            )
        )

    candidates = _merge_candidates(
        results,
        _load_local_chunk_candidates(question, selected_document_ids),
    )
    anchor_terms = _anchor_terms(question, candidates)
    reranked = _rerank_results(question, candidates, anchor_terms)
    filtered = _filter_by_relevance(reranked, active_max_distance, bool(anchor_terms))

    return _enrich_results(filtered[:top_k])


def get_indexed_document_ids() -> set[str]:
    collection = _get_collection()
    if collection.count() == 0:
        return set()

    result = collection.get(include=["metadatas"])
    metadatas = result.get("metadatas", [])

    return {
        str(metadata.get("document_id"))
        for metadata in metadatas
        if metadata and metadata.get("document_id")
    }


def _get_collection():
    try:
        import chromadb
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ChromaDB is not installed. Run: pip install -r requirements.txt",
        ) from exc

    persist_directory = Path(settings.chroma_persist_dir)
    persist_directory.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(persist_directory))
    return client.get_or_create_collection(
        name=settings.chroma_collection_name,
        embedding_function=LocalHashEmbeddingFunction(),
        metadata={"hnsw:space": "cosine"},
    )


def _embed_text(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    tokens = _tokenize(text)

    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSION
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector

    return [value / norm for value in vector]


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+|[\u4e00-\u9fff]", text.lower())


def _load_local_chunk_candidates(
    question: str,
    document_ids: list[str] | None = None,
) -> list[SearchResult]:
    chunk_dir = BASE_DIR / "chunks"
    if not chunk_dir.exists():
        return []

    chunk_files = (
        [chunk_dir / f"{document_id}.json" for document_id in document_ids]
        if document_ids
        else chunk_dir.glob("*.json")
    )
    candidates = []
    query_embedding = _embed_text(question)

    for chunk_path in chunk_files:
        if not chunk_path.exists():
            continue

        chunk_records = json.loads(chunk_path.read_text(encoding="utf-8"))
        for record in chunk_records:
            candidates.append(
                SearchResult(
                    chunk_id=record["chunk_id"],
                    document_id=record["document_id"],
                    chunk_index=int(record["index"]),
                    text=record["text"],
                    distance=_cosine_distance(query_embedding, _embed_text(record["text"])),
                    page=record.get("page"),
                )
            )

    return candidates


def _merge_candidates(*result_groups: list[SearchResult]) -> list[SearchResult]:
    merged = {}

    for results in result_groups:
        for result in results:
            existing = merged.get(result.chunk_id)
            if existing is None or result.distance < existing.distance:
                merged[result.chunk_id] = result

    return list(merged.values())


def _rerank_results(
    question: str,
    results: list[SearchResult],
    anchor_terms: list[str],
) -> list[SearchResult]:
    question_terms = _query_terms(question)

    for result in results:
        lexical_score = _lexical_score(question_terms, result.text)
        vector_score = max(0.0, 1.0 - result.distance)
        anchor_match_count = _match_count(anchor_terms, result.text)
        result.lexical_score = lexical_score
        result.anchor_match_count = anchor_match_count
        result.score = lexical_score * 10.0 + vector_score
        if anchor_match_count:
            result.score += anchor_match_count * 2.0

    return sorted(results, key=lambda result: result.score, reverse=True)


def _filter_by_relevance(
    results: list[SearchResult],
    max_distance: float,
    has_anchor_terms: bool,
) -> list[SearchResult]:
    filtered = []

    for result in results:
        passes_distance_gate = (
            result.distance <= max_distance and result.score >= MIN_RELEVANCE_SCORE
        )
        passes_anchor_gate = (
            has_anchor_terms
            and result.anchor_match_count > 0
            and result.score >= MIN_ANCHOR_SCORE
            and result.distance <= max(max_distance, ANCHOR_MAX_DISTANCE)
        )

        if passes_distance_gate or passes_anchor_gate:
            filtered.append(result)

    return filtered


def _cosine_distance(left: list[float], right: list[float]) -> float:
    if not left or not right:
        return 1.0

    similarity = sum(left_value * right_value for left_value, right_value in zip(left, right))
    return max(0.0, 1.0 - similarity)


def _enrich_results(results: list[SearchResult]) -> list[SearchResult]:
    metadata_map = get_document_metadata_map()

    for result in results:
        metadata = metadata_map.get(result.document_id, {})
        result.original_filename = str(metadata.get("original_filename", ""))
        result.file_type = str(metadata.get("file_type", ""))
        result.text_preview = result.text[:300]

    return results


def _query_terms(text: str) -> list[str]:
    lower_text = text.lower()
    terms = _distinctive_query_terms(lower_text)
    if terms:
        return terms

    return [term for term in re.findall(r"[\u4e00-\u9fff]", lower_text) if term.strip()]


def _anchor_terms(question: str, results: list[SearchResult]) -> list[str]:
    terms = _distinctive_query_terms(question)
    if not terms:
        return []

    frequencies = {}
    for term in terms:
        frequencies[term] = sum(1 for result in results if _term_in_text(term, result.text))

    matched_frequencies = [frequency for frequency in frequencies.values() if frequency > 0]
    if not matched_frequencies:
        return []

    rare_frequency_limit = max(1, min(matched_frequencies))
    return [
        term
        for term, frequency in frequencies.items()
        if 0 < frequency <= rare_frequency_limit
    ]


def _distinctive_query_terms(text: str) -> list[str]:
    lower_text = text.lower()
    terms = set()

    for token in re.findall(r"[a-z0-9]+", lower_text):
        if len(token) >= 2:
            terms.add(token)

    chinese_text = "".join(re.findall(r"[\u4e00-\u9fff]+", lower_text))
    for size in (4, 3, 2):
        for index in range(0, max(len(chinese_text) - size + 1, 0)):
            term = chinese_text[index : index + size]
            if not _is_common_query_term(term):
                terms.add(term)

    return sorted(terms, key=lambda term: (-len(term), term))


def _is_common_query_term(term: str) -> bool:
    if term in COMMON_QUERY_TERMS:
        return True

    if term.endswith("是"):
        return True

    return any(common_term in term for common_term in COMMON_QUERY_TERMS if len(common_term) > 1)


def _match_count(terms: list[str], text: str) -> int:
    return sum(1 for term in terms if _term_in_text(term, text))


def _lexical_score(question_terms: list[str], text: str) -> float:
    if not question_terms:
        return 0.0

    score = 0.0

    for term in question_terms:
        if _term_in_text(term, text):
            score += len(term)

    return score / len(question_terms)


def _term_in_text(term: str, text: str) -> bool:
    lower_text = text.lower()
    term = term.lower()

    if not re.fullmatch(r"[\u4e00-\u9fff]{2}", term):
        return term in lower_text

    start = 0
    while True:
        index = lower_text.find(term, start)
        if index == -1:
            return False

        suffix = lower_text[index + len(term) :]
        if not suffix.startswith(CHINESE_SUBJECT_SUFFIXES):
            return True

        start = index + 1


def _metadata_page(metadata: dict) -> int | None:
    page = metadata.get("page")
    if page in (None, 0, "0", ""):
        return None

    try:
        return int(page)
    except (TypeError, ValueError):
        return None


def _resolve_document_filter(
    document_id: str | None,
    document_ids: list[str] | None,
) -> list[str] | None:
    if document_id and document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use either document_id or document_ids, not both.",
        )

    if document_ids is not None:
        cleaned_document_ids = []
        for value in document_ids:
            if value not in cleaned_document_ids:
                cleaned_document_ids.append(value)

        if not cleaned_document_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="document_ids cannot be empty when provided.",
            )

        for value in cleaned_document_ids:
            if not _is_valid_document_id(value):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid document_id in document_ids: {value}",
                )

        return cleaned_document_ids

    if document_id:
        if not _is_valid_document_id(document_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid document_id.",
            )

        return [document_id]

    return None


def _document_where_filter(document_ids: list[str]) -> dict:
    if len(document_ids) == 1:
        return {"document_id": document_ids[0]}

    return {"document_id": {"$in": document_ids}}


def _is_valid_document_id(document_id: str) -> bool:
    return len(document_id) == 64 and all(char in "0123456789abcdef" for char in document_id)
