from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.qa import SearchResult


class ChatHistoryMessage(BaseModel):
    id: str = Field(min_length=1)
    role: Literal["user", "assistant", "error"]
    content: str
    created_at: str
    sources: list[SearchResult] = Field(default_factory=list)
    selected_document_ids: list[str] = Field(default_factory=list)
    top_k: int | None = None
    max_distance: float | None = None


class ChatHistoryResponse(BaseModel):
    messages: list[ChatHistoryMessage]


class ChatHistorySaveRequest(BaseModel):
    messages: list[ChatHistoryMessage]


class ChatHistoryDeleteResponse(BaseModel):
    deleted: bool
