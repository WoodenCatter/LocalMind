import json
from pathlib import Path

from app.core.config import BASE_DIR
from app.schemas.chat import ChatHistoryMessage

CHAT_HISTORY_PATH = BASE_DIR / "data" / "chat_history.json"


def load_chat_history() -> list[ChatHistoryMessage]:
    if not CHAT_HISTORY_PATH.exists():
        return []

    try:
        raw_messages = json.loads(CHAT_HISTORY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(raw_messages, list):
        return []

    messages: list[ChatHistoryMessage] = []
    for raw_message in raw_messages:
        try:
            messages.append(ChatHistoryMessage.model_validate(raw_message))
        except ValueError:
            continue
    return messages


def save_chat_history(messages: list[ChatHistoryMessage]) -> list[ChatHistoryMessage]:
    CHAT_HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = [message.model_dump(mode="json") for message in messages]
    temporary_path = CHAT_HISTORY_PATH.with_suffix(".tmp")
    temporary_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    temporary_path.replace(CHAT_HISTORY_PATH)
    return messages


def clear_chat_history() -> None:
    if CHAT_HISTORY_PATH.exists():
        CHAT_HISTORY_PATH.unlink()
