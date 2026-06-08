from fastapi import APIRouter, HTTPException, status

from app.schemas.settings import (
    DeepSeekSettingsRequest,
    LLMSettingsRequest,
    SettingsResponse,
    SettingsTestResponse,
)
from app.services.llm_client import test_llm_connection
from app.services.settings_store import (
    get_llm_runtime_config,
    get_llm_settings,
    save_deepseek_settings,
    save_llm_settings,
)

router = APIRouter(tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings() -> SettingsResponse:
    return _to_settings_response(get_llm_settings())


@router.post("/llm", response_model=SettingsResponse)
def update_llm_settings(request: LLMSettingsRequest) -> SettingsResponse:
    current_values = get_llm_settings()
    if (
        request.provider == "deepseek"
        and not (request.deepseek_api_key or "").strip()
        and not current_values["has_deepseek_api_key"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请填写 DeepSeek API Key。",
        )

    values = save_llm_settings(
        provider=request.provider,
        deepseek_api_key=request.deepseek_api_key,
        deepseek_model=request.deepseek_model,
        deepseek_api_base=request.deepseek_api_base,
        ollama_model=request.ollama_model,
        ollama_api_base=request.ollama_api_base,
    )
    return _to_settings_response(values)


@router.post("/deepseek", response_model=SettingsResponse)
def update_deepseek_settings(request: DeepSeekSettingsRequest) -> SettingsResponse:
    current_values = get_llm_settings()
    if not (request.api_key or "").strip() and not current_values["has_deepseek_api_key"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="请填写 DeepSeek API Key。",
        )

    values = save_deepseek_settings(
        api_key=request.api_key,
        model=request.model,
        api_base=request.api_base,
    )
    return _to_settings_response(values)


@router.post("/test", response_model=SettingsTestResponse)
def test_settings_connection(request: LLMSettingsRequest) -> SettingsTestResponse:
    current = get_llm_runtime_config()
    config = {
        "provider": request.provider,
        "deepseek_api_key": (request.deepseek_api_key or current["deepseek_api_key"]).strip(),
        "deepseek_api_base": request.deepseek_api_base.strip().rstrip("/"),
        "deepseek_model": request.deepseek_model.strip(),
        "ollama_api_base": request.ollama_api_base.strip().rstrip("/"),
        "ollama_model": request.ollama_model.strip(),
    }
    message = test_llm_connection(config)  # type: ignore[arg-type]
    return SettingsTestResponse(
        success=True,
        provider=request.provider,
        message=message,
    )


def _to_settings_response(values: dict[str, str | bool | None]) -> SettingsResponse:
    return SettingsResponse(
        provider="ollama" if values.get("provider") == "ollama" else "deepseek",
        is_configured=bool(values["is_configured"]),
        has_deepseek_api_key=bool(values["has_deepseek_api_key"]),
        masked_deepseek_api_key=values["masked_deepseek_api_key"],
        model=str(values["model"]),
        api_base=str(values["api_base"]),
        deepseek_model=str(values["deepseek_model"]),
        deepseek_api_base=str(values["deepseek_api_base"]),
        ollama_model=str(values["ollama_model"]),
        ollama_api_base=str(values["ollama_api_base"]),
    )
