from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    has_deepseek_api_key: bool
    masked_deepseek_api_key: str | None = None
    model: str
    api_base: str


class DeepSeekSettingsRequest(BaseModel):
    api_key: str | None = None
    model: str = Field(default="deepseek-v4-flash", min_length=1)
    api_base: str = Field(default="https://api.deepseek.com", min_length=1)
