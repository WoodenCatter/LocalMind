import logging

from fastapi import APIRouter

from app.schemas.chat import ChatHistoryMessage
from app.schemas.qa import AskRequest, AskResponse, SearchRequest, SearchResponse, SearchResult
from app.services.chat_history import load_chat_history
from app.services.deepseek_client import (
    ConversationMessage,
    generate_answer,
    rewrite_question_for_retrieval,
)
from app.services.knowledge_base_store import (
    get_conversation_knowledge_base_ids,
    get_document_ids_for_knowledge_bases,
)
from app.services.vector_store import SearchResult as VectorSearchResult
from app.services.vector_store import search_relevant_chunks

router = APIRouter(tags=["qa"])

logger = logging.getLogger(__name__)

NO_RELEVANT_CONTEXT_ANSWER = (
    "根据当前知识库内容，未检索到与问题足够相关的文档片段。"
)
MAX_HISTORY_MESSAGES = 10


@router.post("/search", response_model=SearchResponse)
def search_documents(request: SearchRequest) -> SearchResponse:
    document_ids = _resolve_search_document_ids(request)
    if document_ids == []:
        return SearchResponse(
            question=request.question,
            selected_document_ids=[],
            results=[],
        )

    results = search_relevant_chunks(
        question=request.question,
        top_k=request.top_k,
        document_id=request.document_id,
        document_ids=document_ids,
        max_distance=request.max_distance,
        hybrid_search_enabled=request.hybrid_search_enabled,
        vector_candidate_count=request.vector_candidate_count,
        keyword_candidate_count=request.keyword_candidate_count,
    )

    return SearchResponse(
        question=request.question,
        selected_document_ids=_selected_document_ids(results),
        results=[_to_api_search_result(result) for result in results],
    )


@router.post("/ask", response_model=AskResponse)
def ask_question(request: AskRequest) -> AskResponse:
    history_messages = _recent_history_messages(
        request.question,
        request.conversation_id,
    )
    retrieval_question = rewrite_question_for_retrieval(
        question=request.question,
        history_messages=history_messages,
    )
    document_ids = _resolve_search_document_ids(request)
    if document_ids == []:
        _log_qa_context(request.question, retrieval_question, len(history_messages), 0)
        return AskResponse(
            question=request.question,
            answer=NO_RELEVANT_CONTEXT_ANSWER,
            selected_document_ids=[],
            sources=[],
        )

    results = search_relevant_chunks(
        question=retrieval_question,
        top_k=request.top_k,
        document_id=request.document_id,
        document_ids=document_ids,
        max_distance=request.max_distance,
        hybrid_search_enabled=request.hybrid_search_enabled,
        vector_candidate_count=request.vector_candidate_count,
        keyword_candidate_count=request.keyword_candidate_count,
    )

    _log_qa_context(request.question, retrieval_question, len(history_messages), len(results))

    if not results:
        return AskResponse(
            question=request.question,
            answer=NO_RELEVANT_CONTEXT_ANSWER,
            selected_document_ids=[],
            sources=[],
        )

    answer = generate_answer(
        question=request.question,
        history_messages=history_messages,
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
        sources=[_to_api_search_result(result) for result in results],
    )


def _recent_history_messages(
    current_question: str,
    conversation_id: str | None,
) -> list[ConversationMessage]:
    history = [
        message
        for message in load_chat_history(conversation_id)
        if message.role in ("user", "assistant") and message.content.strip()
    ]
    history = _exclude_current_question(history, current_question)
    recent_history = history[-MAX_HISTORY_MESSAGES:]

    return [
        {
            "role": message.role,
            "content": message.content.strip(),
        }
        for message in recent_history
        if message.role in ("user", "assistant")
    ]


def _exclude_current_question(
    history: list[ChatHistoryMessage],
    current_question: str,
) -> list[ChatHistoryMessage]:
    if not history:
        return history

    last_message = history[-1]
    if (
        last_message.role == "user"
        and last_message.content.strip() == current_question.strip()
    ):
        return history[:-1]

    return history


def _resolve_search_document_ids(request: SearchRequest | AskRequest) -> list[str] | None:
    if request.document_id or request.document_ids:
        return request.document_ids

    knowledge_base_ids = request.knowledge_base_ids
    if knowledge_base_ids is None:
        knowledge_base_ids = get_conversation_knowledge_base_ids(request.conversation_id)

    return get_document_ids_for_knowledge_bases(knowledge_base_ids)


def _selected_document_ids(results: list[VectorSearchResult]) -> list[str]:
    document_ids = []

    for result in results:
        if result.document_id not in document_ids:
            document_ids.append(result.document_id)

    return document_ids


def _to_api_search_result(result: VectorSearchResult) -> SearchResult:
    return SearchResult(
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
        retrieval_source=result.retrieval_source,
        final_score=result.final_score,
        vector_rank=result.vector_rank,
        keyword_rank=result.keyword_rank,
        vector_score=result.vector_score,
        keyword_score=result.keyword_score,
    )


def _log_qa_context(
    question: str,
    retrieval_question: str,
    history_count: int,
    source_count: int,
) -> None:
    logger.info("QA original question: %s", question)
    logger.info("QA rewritten retrieval question: %s", retrieval_question)
    logger.info("QA history message count: %s", history_count)
    logger.info("QA source count: %s", source_count)
