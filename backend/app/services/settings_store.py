import os
from pathlib import Path
from typing import Literal, TypedDict

from dotenv import dotenv_values

from app.core.config import BASE_DIR, settings

ENV_PATH = BASE_DIR / ".env"
Provider = Literal["deepseek", "ollama"]


class LLMRuntimeConfig(TypedDict):
    provider: Provider
    deepseek_api_key: str
    deepseek_api_base: str
    deepseek_model: str
    ollama_api_base: str
    ollama_model: str


def get_llm_settings() -> dict[str, str | bool | None]:
    values = _read_env_values()
    provider = _normalize_provider(_get_value(values, "LOCALMIND_LLM_PROVIDER") or "deepseek")
    deepseek_api_key = _get_value(values, "DEEPSEEK_API_KEY") or settings.deepseek_api_key or ""
    deepseek_api_base = (
        _get_value(values, "DEEPSEEK_API_BASE")
        or settings.deepseek_api_base
        or "https://api.deepseek.com"
    )
    deepseek_model = _get_value(values, "DEEPSEEK_MODEL") or settings.deepseek_model or "deepseek-chat"
    ollama_api_base = _get_value(values, "OLLAMA_API_BASE") or "http://localhost:11434"
    ollama_model = _get_value(values, "OLLAMA_MODEL") or "qwen2.5:7b"
    has_deepseek_api_key = bool(deepseek_api_key.strip())

    return {
        "provider": provider,
        "is_configured": provider == "ollama" or has_deepseek_api_key,
        "has_deepseek_api_key": has_deepseek_api_key,
        "masked_deepseek_api_key": _mask_api_key(deepseek_api_key),
        "deepseek_api_key": deepseek_api_key,
        "deepseek_api_base": deepseek_api_base.rstrip("/"),
        "deepseek_model": deepseek_model,
        "ollama_api_base": ollama_api_base.rstrip("/"),
        "ollama_model": ollama_model,
        # Backward-compatible names used by older frontend/backend code.
        "api_key": deepseek_api_key,
        "api_base": deepseek_api_base.rstrip("/"),
        "model": deepseek_model,
    }


def get_deepseek_settings() -> dict[str, str | bool | None]:
    return get_llm_settings()


def save_llm_settings(
    *,
    provider: Provider,
    deepseek_api_key: str | None,
    deepseek_model: str,
    deepseek_api_base: str,
    ollama_model: str,
    ollama_api_base: str,
) -> dict[str, str | bool | None]:
    values = _read_env_values()
    current_api_key = _get_value(values, "DEEPSEEK_API_KEY") or settings.deepseek_api_key or ""
    next_api_key = deepseek_api_key.strip() if deepseek_api_key is not None else ""

    values["LOCALMIND_LLM_PROVIDER"] = _normalize_provider(provider)
    values["DEEPSEEK_API_KEY"] = next_api_key or current_api_key
    values["DEEPSEEK_API_BASE"] = deepseek_api_base.strip().rstrip("/") or "https://api.deepseek.com"
    values["DEEPSEEK_MODEL"] = deepseek_model.strip() or "deepseek-chat"
    values["OLLAMA_API_BASE"] = ollama_api_base.strip().rstrip("/") or "http://localhost:11434"
    values["OLLAMA_MODEL"] = ollama_model.strip() or "qwen2.5:7b"
    _write_env_values(values)

    settings.deepseek_api_key = values["DEEPSEEK_API_KEY"]
    settings.deepseek_api_base = values["DEEPSEEK_API_BASE"]
    settings.deepseek_model = values["DEEPSEEK_MODEL"]

    return get_llm_settings()


def save_deepseek_settings(
    api_key: str | None,
    model: str,
    api_base: str,
) -> dict[str, str | bool | None]:
    current = get_llm_settings()
    return save_llm_settings(
        provider="deepseek",
        deepseek_api_key=api_key,
        deepseek_model=model,
        deepseek_api_base=api_base,
        ollama_model=str(current.get("ollama_model") or "qwen2.5:7b"),
        ollama_api_base=str(current.get("ollama_api_base") or "http://localhost:11434"),
    )


def get_llm_runtime_config() -> LLMRuntimeConfig:
    values = get_llm_settings()
    return {
        "provider": _normalize_provider(str(values.get("provider") or "deepseek")),
        "deepseek_api_key": str(values.get("deepseek_api_key") or ""),
        "deepseek_api_base": str(values.get("deepseek_api_base") or "https://api.deepseek.com"),
        "deepseek_model": str(values.get("deepseek_model") or "deepseek-chat"),
        "ollama_api_base": str(values.get("ollama_api_base") or "http://localhost:11434"),
        "ollama_model": str(values.get("ollama_model") or "qwen2.5:7b"),
    }


def get_deepseek_runtime_config() -> dict[str, str]:
    values = get_llm_runtime_config()
    return {
        "api_key": values["deepseek_api_key"],
        "api_base": values["deepseek_api_base"],
        "model": values["deepseek_model"],
    }


def _read_env_values() -> dict[str, str]:
    if not ENV_PATH.exists():
        return {}

    parsed = dotenv_values(ENV_PATH)
    return {
        key: str(value)
        for key, value in parsed.items()
        if key and value is not None
    }


def _write_env_values(values: dict[str, str]) -> None:
    ENV_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [f"{key}={_escape_env_value(value)}" for key, value in values.items()]
    ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _get_value(values: dict[str, str], key: str) -> str | None:
    return values.get(key) or os.getenv(key)


def _normalize_provider(provider: str) -> Provider:
    return "ollama" if provider == "ollama" else "deepseek"


def _mask_api_key(api_key: str) -> str | None:
    api_key = api_key.strip()
    if not api_key:
        return None

    if len(api_key) <= 8:
        return "****"

    return f"{api_key[:3]}****{api_key[-4:]}"


def _escape_env_value(value: str) -> str:
    value = value.strip()
    if not value:
        return ""

    if any(char.isspace() for char in value) or "#" in value:
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'

    return value
