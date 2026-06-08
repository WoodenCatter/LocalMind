from fastapi import APIRouter, Query

from app.schemas.chat import (
    ChatHistoryDeleteResponse,
    ChatHistoryResponse,
    ChatHistorySaveRequest,
)
from app.services.chat_history import (
    clear_chat_history,
    load_chat_history,
    save_chat_history,
)

router = APIRouter(tags=["chat"])


@router.get("/history", response_model=ChatHistoryResponse)
def get_chat_history(
    conversation_id: str | None = Query(default=None),
) -> ChatHistoryResponse:
    return ChatHistoryResponse(
        conversation_id=conversation_id,
        messages=load_chat_history(conversation_id),
    )


@router.post("/history", response_model=ChatHistoryResponse)
def update_chat_history(request: ChatHistorySaveRequest) -> ChatHistoryResponse:
    return ChatHistoryResponse(
        conversation_id=request.conversation_id,
        messages=save_chat_history(request.messages, request.conversation_id),
    )


@router.delete("/history", response_model=ChatHistoryDeleteResponse)
def delete_chat_history(
    conversation_id: str | None = Query(default=None),
) -> ChatHistoryDeleteResponse:
    clear_chat_history(conversation_id)
    return ChatHistoryDeleteResponse(deleted=True)
