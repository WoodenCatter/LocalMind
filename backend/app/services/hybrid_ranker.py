from app.services.keyword_search import MIN_KEYWORD_SCORE
from app.services.retrieval_types import SearchResult

RRF_K = 60


def fuse_with_rrf(
    vector_results: list[SearchResult],
    keyword_results: list[SearchResult],
) -> list[SearchResult]:
    merged: dict[str, SearchResult] = {}

    # Reciprocal Rank Fusion avoids mixing raw Chroma distances and BM25 scores,
    # because those score scales are not directly comparable.
    for rank, result in enumerate(vector_results, start=1):
        current = merged.get(result.chunk_id) or copy_result(result)
        current.vector_rank = rank
        current.vector_score = max(0.0, 1.0 - result.distance)
        current.distance = result.distance
        current.final_score += 1.0 / (RRF_K + rank)
        current.retrieval_source = "vector"
        merged[result.chunk_id] = current

    for rank, result in enumerate(keyword_results, start=1):
        current = merged.get(result.chunk_id) or copy_result(result)
        current.keyword_rank = rank
        current.keyword_score = result.keyword_score
        current.final_score += 1.0 / (RRF_K + rank)
        current.retrieval_source = "hybrid" if current.vector_rank is not None else "keyword"
        merged[result.chunk_id] = current

    for result in merged.values():
        result.score = result.final_score

    return sorted(merged.values(), key=lambda result: result.final_score, reverse=True)


def vector_only_results(vector_results: list[SearchResult]) -> list[SearchResult]:
    results = []
    for rank, result in enumerate(vector_results, start=1):
        copied = copy_result(result)
        copied.vector_rank = rank
        copied.vector_score = max(0.0, 1.0 - copied.distance)
        copied.final_score = copied.vector_score
        copied.score = copied.final_score
        copied.retrieval_source = "vector"
        results.append(copied)

    return results


def filter_fused_results(
    results: list[SearchResult],
    max_distance: float,
) -> list[SearchResult]:
    filtered = []

    for result in results:
        has_vector_signal = result.vector_rank is not None and result.distance <= max_distance
        has_keyword_signal = result.keyword_rank is not None and result.keyword_score > MIN_KEYWORD_SCORE

        if has_vector_signal or has_keyword_signal:
            filtered.append(result)

    return filtered


def copy_result(result: SearchResult) -> SearchResult:
    return SearchResult(
        chunk_id=result.chunk_id,
        document_id=result.document_id,
        chunk_index=result.chunk_index,
        text=result.text,
        distance=result.distance,
        score=result.score,
        original_filename=result.original_filename,
        file_type=result.file_type,
        page=result.page,
        text_preview=result.text_preview,
        retrieval_source=result.retrieval_source,
        final_score=result.final_score,
        vector_rank=result.vector_rank,
        keyword_rank=result.keyword_rank,
        vector_score=result.vector_score,
        keyword_score=result.keyword_score,
    )
