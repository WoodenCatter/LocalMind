import logging

from fastapi import HTTPException, status

from app.services.document_metadata import get_document_metadata_map
from app.services.hybrid_ranker import (
    filter_fused_results,
    fuse_with_rrf,
    vector_only_results,
)
from app.services.keyword_search import search_keyword_candidates
from app.services.retrieval_types import IndexingResult, SearchResult
from app.services.vector_search import (
    delete_document_vectors,
    get_indexed_document_ids,
    index_document_chunks,
    search_vector_candidates,
)

logger = logging.getLogger(__name__)

DEFAULT_MAX_DISTANCE = 0.8
HYBRID_SEARCH_ENABLED = True
VECTOR_CANDIDATE_MULTIPLIER = 5
KEYWORD_CANDIDATE_MULTIPLIER = 5


def search_relevant_chunks(
    question: str,
    top_k: int = 5,
    document_id: str | None = None,
    document_ids: list[str] | None = None,
    max_distance: float | None = None,
    hybrid_search_enabled: bool = HYBRID_SEARCH_ENABLED,
    vector_candidate_count: int | None = None,
    keyword_candidate_count: int | None = None,
) -> list[SearchResult]:
    question = question.strip()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question cannot be empty.",
        )

    selected_document_ids = _resolve_document_filter(document_id, document_ids)
    active_max_distance = DEFAULT_MAX_DISTANCE if max_distance is None else max_distance
    vector_limit = vector_candidate_count or max(top_k * VECTOR_CANDIDATE_MULTIPLIER, 10)
    keyword_limit = keyword_candidate_count or max(top_k * KEYWORD_CANDIDATE_MULTIPLIER, 10)

    try:
        vector_results = search_vector_candidates(
            question=question,
            document_ids=selected_document_ids,
            limit=vector_limit,
        )
    except Exception as exc:
        logger.warning("Vector search failed: %s", exc)
        vector_results = []

    if hybrid_search_enabled:
        keyword_results = search_keyword_candidates(
            question=question,
            document_ids=selected_document_ids,
            limit=keyword_limit,
        )
        fused_results = fuse_with_rrf(vector_results, keyword_results)
    else:
        keyword_results = []
        fused_results = vector_only_results(vector_results)

    filtered_results = filter_fused_results(fused_results, active_max_distance)
    final_results = _enrich_results(filtered_results[:top_k])
    _log_hybrid_results(vector_results, keyword_results, final_results)

    return final_results


def _enrich_results(results: list[SearchResult]) -> list[SearchResult]:
    metadata_map = get_document_metadata_map()

    for result in results:
        metadata = metadata_map.get(result.document_id, {})
        result.original_filename = str(metadata.get("original_filename", ""))
        result.file_type = str(metadata.get("file_type", ""))
        result.text_preview = result.text[:300]

    return results


def _log_hybrid_results(
    vector_results: list[SearchResult],
    keyword_results: list[SearchResult],
    final_results: list[SearchResult],
) -> None:
    logger.info("Hybrid search vector result count: %s", len(vector_results))
    logger.info("Hybrid search BM25 result count: %s", len(keyword_results))
    logger.info("Hybrid search fused result count: %s", len(final_results))
    for result in final_results:
        logger.info(
            "Hybrid source document_id=%s chunk_index=%s source=%s final_score=%.4f "
            "vector_rank=%s keyword_rank=%s",
            result.document_id,
            result.chunk_index,
            result.retrieval_source,
            result.final_score,
            result.vector_rank,
            result.keyword_rank,
        )


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


def _is_valid_document_id(document_id: str) -> bool:
    return len(document_id) == 64 and all(char in "0123456789abcdef" for char in document_id)


__all__ = [
    "IndexingResult",
    "SearchResult",
    "delete_document_vectors",
    "get_indexed_document_ids",
    "index_document_chunks",
    "search_relevant_chunks",
]
