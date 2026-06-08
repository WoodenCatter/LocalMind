import json
from typing import Any

from app.core.config import BASE_DIR
from app.schemas.chat import ChatHistoryMessage
from app.services.knowledge_base_store import get_default_conversation_id

CHAT_HISTORY_PATH = BASE_DIR / "data" / "chat_history.json"


def load_chat_history(conversation_id: str | None = None) -> list[ChatHistoryMessage]:
    history_map = _read_history_map()
    active_conversation_id = conversation_id or get_default_conversation_id()
    return history_map.get(active_conversation_id, [])


def save_chat_history(
    messages: list[ChatHistoryMessage],
    conversation_id: str | None = None,
) -> list[ChatHistoryMessage]:
    active_conversation_id = conversation_id or get_default_conversation_id()
    history_map = _read_history_map()
    history_map[active_conversation_id] = messages
    _write_history_map(history_map)
    return messages


def clear_chat_history(conversation_id: str | None = None) -> None:
    active_conversation_id = conversation_id or get_default_conversation_id()
    history_map = _read_history_map()
    history_map[active_conversation_id] = []
    _write_history_map(history_map)


def delete_conversation_history(conversation_id: str) -> None:
    history_map = _read_history_map()
    history_map.pop(conversation_id, None)
    _write_history_map(history_map)


def _read_history_map() -> dict[str, list[ChatHistoryMessage]]:
    if not CHAT_HISTORY_PATH.exists():
        return {}

    try:
        raw_data = json.loads(CHAT_HISTORY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}

    if isinstance(raw_data, list):
        return {
            get_default_conversation_id(): _parse_messages(raw_data),
        }

    if not isinstance(raw_data, dict):
        return {}

    raw_conversations: Any = raw_data.get("conversations", {})
    if not isinstance(raw_conversations, dict):
        return {}

    return {
        str(conversation_id): _parse_messages(raw_messages)
        for conversation_id, raw_messages in raw_conversations.items()
        if isinstance(raw_messages, list)
    }


def _write_history_map(history_map: dict[str, list[ChatHistoryMessage]]) -> None:
    CHAT_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 2,
        "conversations": {
            conversation_id: [
                message.model_dump(mode="json")
                for message in messages
            ]
            for conversation_id, messages in history_map.items()
        },
    }
    temporary_path = CHAT_HISTORY_PATH.with_suffix(".tmp")
    temporary_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(CHAT_HISTORY_PATH)


def _parse_messages(raw_messages: list[Any]) -> list[ChatHistoryMessage]:
    messages: list[ChatHistoryMessage] = []
    for raw_message in raw_messages:
        try:
            messages.append(ChatHistoryMessage.model_validate(raw_message))
        except ValueError:
            continue
    return messages
