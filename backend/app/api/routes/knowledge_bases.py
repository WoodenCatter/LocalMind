from fastapi import APIRouter, status

from app.schemas.knowledge_base import (
    ConversationCreateRequest,
    ConversationItem,
    ConversationKnowledgeBasesRequest,
    ConversationListResponse,
    ConversationUpdateRequest,
    KnowledgeBaseCreateRequest,
    KnowledgeBaseItem,
    KnowledgeBaseListResponse,
    KnowledgeBaseUpdateRequest,
)
from app.services.chat_history import delete_conversation_history
from app.services.knowledge_base_store import (
    create_conversation,
    create_knowledge_base,
    delete_conversation,
    delete_knowledge_base,
    list_conversations,
    list_knowledge_bases,
    rename_knowledge_base,
    set_conversation_knowledge_base_ids,
    update_conversation,
)

router = APIRouter(tags=["knowledge-bases"])


@router.get("/knowledge-bases", response_model=KnowledgeBaseListResponse)
def get_knowledge_bases() -> KnowledgeBaseListResponse:
    return KnowledgeBaseListResponse(
        knowledge_bases=[
            KnowledgeBaseItem(**knowledge_base)
            for knowledge_base in list_knowledge_bases()
        ]
    )


@router.post(
    "/knowledge-bases",
    response_model=KnowledgeBaseItem,
    status_code=status.HTTP_201_CREATED,
)
def add_knowledge_base(request: KnowledgeBaseCreateRequest) -> KnowledgeBaseItem:
    return KnowledgeBaseItem(**create_knowledge_base(request.name))


@router.patch("/knowledge-bases/{knowledge_base_id}", response_model=KnowledgeBaseItem)
def update_knowledge_base(
    knowledge_base_id: str,
    request: KnowledgeBaseUpdateRequest,
) -> KnowledgeBaseItem:
    return KnowledgeBaseItem(**rename_knowledge_base(knowledge_base_id, request.name))


@router.delete("/knowledge-bases/{knowledge_base_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_knowledge_base(knowledge_base_id: str) -> None:
    delete_knowledge_base(knowledge_base_id)


@router.get("/conversations", response_model=ConversationListResponse)
def get_conversations() -> ConversationListResponse:
    return ConversationListResponse(
        conversations=[
            ConversationItem(**conversation)
            for conversation in list_conversations()
        ]
    )


@router.post(
    "/conversations",
    response_model=ConversationItem,
    status_code=status.HTTP_201_CREATED,
)
def add_conversation(request: ConversationCreateRequest) -> ConversationItem:
    return ConversationItem(
        **create_conversation(request.title, request.knowledge_base_ids)
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationItem)
def patch_conversation(
    conversation_id: str,
    request: ConversationUpdateRequest,
) -> ConversationItem:
    return ConversationItem(
        **update_conversation(
            conversation_id,
            title=request.title,
            knowledge_base_ids=request.knowledge_base_ids,
        )
    )


@router.put("/conversations/{conversation_id}/knowledge-bases", response_model=ConversationItem)
def replace_conversation_knowledge_bases(
    conversation_id: str,
    request: ConversationKnowledgeBasesRequest,
) -> ConversationItem:
    set_conversation_knowledge_base_ids(conversation_id, request.knowledge_base_ids)
    conversation = next(
        item for item in list_conversations() if item["id"] == conversation_id
    )
    return ConversationItem(**conversation)


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_conversation(conversation_id: str) -> None:
    delete_conversation(conversation_id)
    delete_conversation_history(conversation_id)
