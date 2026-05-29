from fastapi import APIRouter

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
def get_chat_history() -> ChatHistoryResponse:
    return ChatHistoryResponse(messages=load_chat_history())


@router.post("/history", response_model=ChatHistoryResponse)
def update_chat_history(request: ChatHistorySaveRequest) -> ChatHistoryResponse:
    return ChatHistoryResponse(messages=save_chat_history(request.messages))


@router.delete("/history", response_model=ChatHistoryDeleteResponse)
def delete_chat_history() -> ChatHistoryDeleteResponse:
    clear_chat_history()
    return ChatHistoryDeleteResponse(deleted=True)
