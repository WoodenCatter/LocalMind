from fastapi import APIRouter, HTTPException, status

from app.schemas.settings import DeepSeekSettingsRequest, SettingsResponse
from app.services.settings_store import get_deepseek_settings, save_deepseek_settings

router = APIRouter(tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings() -> SettingsResponse:
    values = get_deepseek_settings()
    return SettingsResponse(
        has_deepseek_api_key=bool(values["has_deepseek_api_key"]),
        masked_deepseek_api_key=values["masked_deepseek_api_key"],
        model=str(values["model"]),
        api_base=str(values["api_base"]),
    )


@router.post("/deepseek", response_model=SettingsResponse)
def update_deepseek_settings(request: DeepSeekSettingsRequest) -> SettingsResponse:
    current_values = get_deepseek_settings()
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
    return SettingsResponse(
        has_deepseek_api_key=bool(values["has_deepseek_api_key"]),
        masked_deepseek_api_key=values["masked_deepseek_api_key"],
        model=str(values["model"]),
        api_base=str(values["api_base"]),
    )
