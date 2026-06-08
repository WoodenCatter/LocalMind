import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, status

from app.core.config import BASE_DIR
from app.services.document_metadata import list_document_metadata

STATE_PATH = BASE_DIR / "data" / "knowledge_base_state.json"
DEFAULT_KB_ID = "default"
DEFAULT_CONVERSATION_ID = "default-conversation"
DEFAULT_KB_NAME = "默认知识库"


def ensure_knowledge_base_state() -> dict[str, Any]:
    state = _read_state()
    changed = _ensure_default_records(state)
    changed = _migrate_existing_documents(state) or changed

    if changed:
        _write_state(state)

    return state


def list_knowledge_bases() -> list[dict[str, Any]]:
    state = ensure_knowledge_base_state()
    counts = _document_counts(state)

    return [
        {
            **knowledge_base,
            "document_count": counts.get(knowledge_base["id"], 0),
        }
        for knowledge_base in state["knowledge_bases"]
    ]


def create_knowledge_base(name: str) -> dict[str, Any]:
    state = ensure_knowledge_base_state()
    now = _utc_now()
    knowledge_base = {
        "id": uuid4().hex,
        "name": name.strip(),
        "is_default": False,
        "created_at": now,
        "updated_at": now,
    }
    state["knowledge_bases"].append(knowledge_base)
    _write_state(state)
    return {**knowledge_base, "document_count": 0}


def rename_knowledge_base(knowledge_base_id: str, name: str) -> dict[str, Any]:
    state = ensure_knowledge_base_state()
    knowledge_base = _get_knowledge_base_record(state, knowledge_base_id)
    knowledge_base["name"] = name.strip()
    knowledge_base["updated_at"] = _utc_now()
    _write_state(state)
    return {
        **knowledge_base,
        "document_count": _document_counts(state).get(knowledge_base_id, 0),
    }


def delete_knowledge_base(knowledge_base_id: str) -> None:
    state = ensure_knowledge_base_state()
    knowledge_base = _get_knowledge_base_record(state, knowledge_base_id)

    if knowledge_base.get("is_default"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="默认知识库不能删除。",
        )

    if len(state["knowledge_bases"]) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="禁止删除最后一个知识库。",
        )

    state["knowledge_bases"] = [
        item for item in state["knowledge_bases"] if item["id"] != knowledge_base_id
    ]
    state["document_kb_relations"] = [
        relation
        for relation in state["document_kb_relations"]
        if relation["knowledge_base_id"] != knowledge_base_id
    ]
    state["conversation_kb_relations"] = [
        relation
        for relation in state["conversation_kb_relations"]
        if relation["knowledge_base_id"] != knowledge_base_id
    ]
    _ensure_conversations_have_knowledge_base(state)
    _write_state(state)


def list_conversations() -> list[dict[str, Any]]:
    state = ensure_knowledge_base_state()
    return [
        {
            **conversation,
            "knowledge_base_ids": get_conversation_knowledge_base_ids(conversation["id"]),
        }
        for conversation in state["conversations"]
    ]


def create_conversation(
    title: str | None = None,
    knowledge_base_ids: list[str] | None = None,
) -> dict[str, Any]:
    state = ensure_knowledge_base_state()
    now = _utc_now()
    conversation = {
        "id": uuid4().hex,
        "title": (title or "新对话").strip(),
        "created_at": now,
        "updated_at": now,
    }
    state["conversations"].append(conversation)
    _set_conversation_knowledge_base_ids(
        state,
        conversation["id"],
        knowledge_base_ids or [get_default_knowledge_base_id()],
    )
    _write_state(state)
    return {
        **conversation,
        "knowledge_base_ids": get_conversation_knowledge_base_ids(conversation["id"]),
    }


def update_conversation(
    conversation_id: str,
    title: str | None = None,
    knowledge_base_ids: list[str] | None = None,
) -> dict[str, Any]:
    state = ensure_knowledge_base_state()
    conversation = _get_conversation_record(state, conversation_id)

    if title is not None:
        conversation["title"] = title.strip()

    if knowledge_base_ids is not None:
        _set_conversation_knowledge_base_ids(state, conversation_id, knowledge_base_ids)

    conversation["updated_at"] = _utc_now()
    _write_state(state)
    return {
        **conversation,
        "knowledge_base_ids": get_conversation_knowledge_base_ids(conversation_id),
    }


def delete_conversation(conversation_id: str) -> None:
    state = ensure_knowledge_base_state()
    _get_conversation_record(state, conversation_id)

    state["conversations"] = [
        item for item in state["conversations"] if item["id"] != conversation_id
    ]
    state["conversation_kb_relations"] = [
        relation
        for relation in state["conversation_kb_relations"]
        if relation["conversation_id"] != conversation_id
    ]
    _write_state(state)


def get_default_knowledge_base_id() -> str:
    ensure_knowledge_base_state()
    return DEFAULT_KB_ID


def get_default_conversation_id() -> str:
    return DEFAULT_CONVERSATION_ID


def get_document_ids_for_knowledge_bases(knowledge_base_ids: list[str]) -> list[str]:
    state = ensure_knowledge_base_state()
    selected_ids = _clean_knowledge_base_ids(
        state,
        knowledge_base_ids or [DEFAULT_KB_ID],
    )
    document_ids = []

    for relation in state["document_kb_relations"]:
        if relation["knowledge_base_id"] in selected_ids:
            document_id = relation["document_id"]
            if document_id not in document_ids:
                document_ids.append(document_id)

    return document_ids


def get_document_knowledge_base_ids(document_id: str) -> list[str]:
    state = ensure_knowledge_base_state()
    return [
        relation["knowledge_base_id"]
        for relation in state["document_kb_relations"]
        if relation["document_id"] == document_id
    ]


def add_document_to_knowledge_bases(
    document_id: str,
    knowledge_base_ids: list[str] | None,
) -> list[str]:
    state = ensure_knowledge_base_state()
    selected_ids = _clean_knowledge_base_ids(
        state,
        knowledge_base_ids or [DEFAULT_KB_ID],
    )

    for knowledge_base_id in selected_ids:
        _add_document_relation(state, document_id, knowledge_base_id)

    _write_state(state)
    return get_document_knowledge_base_ids(document_id)


def add_document_to_import_knowledge_bases(
    document_id: str,
    knowledge_base_ids: list[str] | None,
) -> list[str]:
    requested_ids = [DEFAULT_KB_ID, *(knowledge_base_ids or [])]
    return add_document_to_knowledge_bases(document_id, requested_ids)


def move_document_to_knowledge_bases(
    document_id: str,
    from_knowledge_base_id: str,
    target_knowledge_base_ids: list[str],
) -> list[str]:
    state = ensure_knowledge_base_state()
    _clean_knowledge_base_ids(state, [from_knowledge_base_id])
    selected_targets = _clean_knowledge_base_ids(state, target_knowledge_base_ids)

    if from_knowledge_base_id != DEFAULT_KB_ID:
        state["document_kb_relations"] = [
            relation
            for relation in state["document_kb_relations"]
            if not (
                relation["document_id"] == document_id
                and relation["knowledge_base_id"] == from_knowledge_base_id
            )
        ]

    _add_document_relation(state, document_id, DEFAULT_KB_ID)
    for knowledge_base_id in selected_targets:
        _add_document_relation(state, document_id, knowledge_base_id)

    _write_state(state)
    return get_document_knowledge_base_ids(document_id)


def remove_document_from_knowledge_base(document_id: str, knowledge_base_id: str) -> bool:
    state = ensure_knowledge_base_state()
    _clean_knowledge_base_ids(state, [knowledge_base_id])
    before_count = len(state["document_kb_relations"])
    state["document_kb_relations"] = [
        relation
        for relation in state["document_kb_relations"]
        if not (
            relation["document_id"] == document_id
            and relation["knowledge_base_id"] == knowledge_base_id
        )
    ]
    changed = len(state["document_kb_relations"]) != before_count
    if changed:
        _write_state(state)
    return changed


def remove_document_from_all_knowledge_bases(document_id: str) -> None:
    state = ensure_knowledge_base_state()
    state["document_kb_relations"] = [
        relation
        for relation in state["document_kb_relations"]
        if relation["document_id"] != document_id
    ]
    _write_state(state)


def document_has_knowledge_base(document_id: str) -> bool:
    return bool(get_document_knowledge_base_ids(document_id))


def get_conversation_knowledge_base_ids(conversation_id: str | None) -> list[str]:
    state = ensure_knowledge_base_state()
    if not conversation_id:
        return [DEFAULT_KB_ID]

    active_conversation_id = conversation_id
    _get_conversation_record(state, active_conversation_id)
    knowledge_base_ids = [
        relation["knowledge_base_id"]
        for relation in state["conversation_kb_relations"]
        if relation["conversation_id"] == active_conversation_id
    ]
    return knowledge_base_ids or [DEFAULT_KB_ID]


def set_conversation_knowledge_base_ids(
    conversation_id: str,
    knowledge_base_ids: list[str],
) -> list[str]:
    state = ensure_knowledge_base_state()
    _get_conversation_record(state, conversation_id)
    selected_ids = _set_conversation_knowledge_base_ids(
        state,
        conversation_id,
        knowledge_base_ids or [DEFAULT_KB_ID],
    )
    _write_state(state)
    return selected_ids


def _read_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return _empty_state()

    try:
        state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return _empty_state()

    if not isinstance(state, dict):
        return _empty_state()

    return {
        **_empty_state(),
        **state,
        "knowledge_bases": list(state.get("knowledge_bases") or []),
        "conversations": list(state.get("conversations") or []),
        "document_kb_relations": list(state.get("document_kb_relations") or []),
        "conversation_kb_relations": list(state.get("conversation_kb_relations") or []),
    }


def _write_state(state: dict[str, Any]) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = STATE_PATH.with_suffix(".tmp")
    temporary_path.write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(STATE_PATH)


def _empty_state() -> dict[str, Any]:
    return {
        "version": 1,
        "knowledge_bases": [],
        "conversations": [],
        "document_kb_relations": [],
        "conversation_kb_relations": [],
    }


def _ensure_default_records(state: dict[str, Any]) -> bool:
    changed = False
    now = _utc_now()

    if not any(item.get("id") == DEFAULT_KB_ID for item in state["knowledge_bases"]):
        state["knowledge_bases"].insert(
            0,
            {
                "id": DEFAULT_KB_ID,
                "name": DEFAULT_KB_NAME,
                "is_default": True,
                "created_at": now,
                "updated_at": now,
            },
        )
        changed = True

    for knowledge_base in state["knowledge_bases"]:
        knowledge_base["is_default"] = knowledge_base.get("id") == DEFAULT_KB_ID

    return changed


def _migrate_existing_documents(state: dict[str, Any]) -> bool:
    changed = False
    default_document_ids = {
        relation["document_id"] for relation in state["document_kb_relations"]
        if relation["knowledge_base_id"] == DEFAULT_KB_ID
    }

    for document in list_document_metadata():
        document_id = document.get("document_id")
        if document_id and document_id not in default_document_ids:
            _add_document_relation(state, document_id, DEFAULT_KB_ID)
            default_document_ids.add(document_id)
            changed = True

    return changed


def _ensure_conversations_have_knowledge_base(state: dict[str, Any]) -> None:
    for conversation in state["conversations"]:
        if not any(
            relation["conversation_id"] == conversation["id"]
            for relation in state["conversation_kb_relations"]
        ):
            _add_conversation_relation(state, conversation["id"], DEFAULT_KB_ID)


def _get_knowledge_base_record(
    state: dict[str, Any],
    knowledge_base_id: str,
) -> dict[str, Any]:
    for knowledge_base in state["knowledge_bases"]:
        if knowledge_base["id"] == knowledge_base_id:
            return knowledge_base

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="知识库不存在。",
    )


def _get_conversation_record(
    state: dict[str, Any],
    conversation_id: str,
) -> dict[str, Any]:
    for conversation in state["conversations"]:
        if conversation["id"] == conversation_id:
            return conversation

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="对话不存在。",
    )


def _clean_knowledge_base_ids(
    state: dict[str, Any],
    knowledge_base_ids: list[str],
) -> list[str]:
    cleaned_ids = []
    for knowledge_base_id in knowledge_base_ids:
        if knowledge_base_id not in cleaned_ids:
            _get_knowledge_base_record(state, knowledge_base_id)
            cleaned_ids.append(knowledge_base_id)

    if not cleaned_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请至少选择一个知识库。",
        )

    return cleaned_ids


def _set_conversation_knowledge_base_ids(
    state: dict[str, Any],
    conversation_id: str,
    knowledge_base_ids: list[str],
) -> list[str]:
    selected_ids = _clean_knowledge_base_ids(state, knowledge_base_ids or [DEFAULT_KB_ID])
    state["conversation_kb_relations"] = [
        relation
        for relation in state["conversation_kb_relations"]
        if relation["conversation_id"] != conversation_id
    ]
    for knowledge_base_id in selected_ids:
        _add_conversation_relation(state, conversation_id, knowledge_base_id)
    return selected_ids


def _add_document_relation(
    state: dict[str, Any],
    document_id: str,
    knowledge_base_id: str,
) -> None:
    if any(
        relation["document_id"] == document_id
        and relation["knowledge_base_id"] == knowledge_base_id
        for relation in state["document_kb_relations"]
    ):
        return

    state["document_kb_relations"].append(
        {
            "document_id": document_id,
            "knowledge_base_id": knowledge_base_id,
            "created_at": _utc_now(),
        }
    )


def _add_conversation_relation(
    state: dict[str, Any],
    conversation_id: str,
    knowledge_base_id: str,
) -> None:
    if any(
        relation["conversation_id"] == conversation_id
        and relation["knowledge_base_id"] == knowledge_base_id
        for relation in state["conversation_kb_relations"]
    ):
        return

    state["conversation_kb_relations"].append(
        {
            "conversation_id": conversation_id,
            "knowledge_base_id": knowledge_base_id,
            "created_at": _utc_now(),
        }
    )


def _document_counts(state: dict[str, Any]) -> dict[str, int]:
    counts: dict[str, int] = {}
    seen = set()

    for relation in state["document_kb_relations"]:
        key = (relation["knowledge_base_id"], relation["document_id"])
        if key in seen:
            continue
        seen.add(key)
        counts[relation["knowledge_base_id"]] = counts.get(relation["knowledge_base_id"], 0) + 1

    return counts


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()
