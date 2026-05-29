from fastapi import APIRouter

from app.schemas.qa import AskRequest, AskResponse, SearchRequest, SearchResponse, SearchResult
from app.services.deepseek_client import generate_answer
from app.services.vector_store import search_relevant_chunks

router = APIRouter(tags=["qa"])

NO_RELEVANT_CONTEXT_ANSWER = "根据当前知识库内容，未检索到与问题足够相关的文档片段。"


@router.post("/search", response_model=SearchResponse)
def search_documents(request: SearchRequest) -> SearchResponse:
    results = search_relevant_chunks(
        question=request.question,
        top_k=request.top_k,
        document_id=request.document_id,
        document_ids=request.document_ids,
        max_distance=request.max_distance,
    )

    return SearchResponse(
        question=request.question,
        selected_document_ids=_selected_document_ids(results),
        results=[
            SearchResult(
                chunk_id=result.chunk_id,
                document_id=result.document_id,
                original_filename=result.original_filename,
                file_type=result.file_type,
                page=result.page,
                chunk_index=result.chunk_index,
                text=result.text,
                text_preview=result.text_preview,
                distance=result.distance,
                score=result.score,
            )
            for result in results
        ],
    )


@router.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest) -> AskResponse:
    results = search_relevant_chunks(
        question=request.question,
        top_k=request.top_k,
        document_id=request.document_id,
        document_ids=request.document_ids,
        max_distance=request.max_distance,
    )

    if not results:
        return AskResponse(
            question=request.question,
            answer=NO_RELEVANT_CONTEXT_ANSWER,
            selected_document_ids=[],
            sources=[],
        )

    answer = generate_answer(
        question=request.question,
        sources=[
            {
                "document_id": result.document_id,
                "original_filename": result.original_filename,
                "page": result.page,
                "chunk_index": result.chunk_index,
                "text": result.text,
            }
            for result in results
        ],
    )

    return AskResponse(
        question=request.question,
        answer=answer,
        selected_document_ids=_selected_document_ids(results),
        sources=[
            SearchResult(
                chunk_id=result.chunk_id,
                document_id=result.document_id,
                original_filename=result.original_filename,
                file_type=result.file_type,
                page=result.page,
                chunk_index=result.chunk_index,
                text=result.text,
                text_preview=result.text_preview,
                distance=result.distance,
                score=result.score,
            )
            for result in results
        ],
    )


def _selected_document_ids(results) -> list[str]:
    document_ids = []

    for result in results:
        if result.document_id not in document_ids:
            document_ids.append(result.document_id)

    return document_ids
