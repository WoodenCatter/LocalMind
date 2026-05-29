import os
from pathlib import Path

from dotenv import dotenv_values

from app.core.config import BASE_DIR, settings

ENV_PATH = BASE_DIR / ".env"


def get_deepseek_settings() -> dict[str, str | bool | None]:
    values = _read_env_values()
    api_key = _get_value(values, "DEEPSEEK_API_KEY") or settings.deepseek_api_key or ""
    api_base = (
        _get_value(values, "DEEPSEEK_API_BASE")
        or settings.deepseek_api_base
        or "https://api.deepseek.com"
    )
    model = _get_value(values, "DEEPSEEK_MODEL") or settings.deepseek_model

    return {
        "has_deepseek_api_key": bool(api_key.strip()),
        "masked_deepseek_api_key": _mask_api_key(api_key),
        "api_key": api_key,
        "api_base": api_base,
        "model": model,
    }


def save_deepseek_settings(
    api_key: str | None,
    model: str,
    api_base: str,
) -> dict[str, str | bool | None]:
    values = _read_env_values()
    current_api_key = _get_value(values, "DEEPSEEK_API_KEY") or settings.deepseek_api_key or ""
    next_api_key = api_key.strip() if api_key is not None else ""
    values["DEEPSEEK_API_KEY"] = next_api_key or current_api_key
    values["DEEPSEEK_API_BASE"] = api_base.strip().rstrip("/")
    values["DEEPSEEK_MODEL"] = model.strip()
    _write_env_values(values)

    settings.deepseek_api_key = values["DEEPSEEK_API_KEY"]
    settings.deepseek_api_base = values["DEEPSEEK_API_BASE"]
    settings.deepseek_model = values["DEEPSEEK_MODEL"]

    return get_deepseek_settings()


def get_deepseek_runtime_config() -> dict[str, str]:
    values = get_deepseek_settings()
    return {
        "api_key": str(values.get("api_key") or ""),
        "api_base": str(values.get("api_base") or "https://api.deepseek.com"),
        "model": str(values.get("model") or "deepseek-v4-flash"),
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
