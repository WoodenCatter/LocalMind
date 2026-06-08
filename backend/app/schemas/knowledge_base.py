from pydantic import BaseModel, Field


class KnowledgeBaseItem(BaseModel):
    id: str
    name: str
    is_default: bool = False
    document_count: int = 0
    created_at: str
    updated_at: str


class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: list[KnowledgeBaseItem]


class KnowledgeBaseCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class KnowledgeBaseUpdateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class ConversationItem(BaseModel):
    id: str
    title: str
    knowledge_base_ids: list[str] = []
    created_at: str
    updated_at: str


class ConversationListResponse(BaseModel):
    conversations: list[ConversationItem]


class ConversationCreateRequest(BaseModel):
    title: str | None = Field(default=None, max_length=80)
    knowledge_base_ids: list[str] | None = None


class ConversationUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=80)
    knowledge_base_ids: list[str] | None = None


class ConversationKnowledgeBasesRequest(BaseModel):
    knowledge_base_ids: list[str] = []


class DocumentKnowledgeBaseRequest(BaseModel):
    knowledge_base_ids: list[str]


class DocumentMoveRequest(BaseModel):
    from_knowledge_base_id: str
    target_knowledge_base_ids: list[str]
