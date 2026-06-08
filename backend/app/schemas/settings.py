from typing import Literal

from pydantic import BaseModel, Field


class SettingsResponse(BaseModel):
    provider: Literal["deepseek", "ollama"] = "deepseek"
    is_configured: bool = False
    has_deepseek_api_key: bool
    masked_deepseek_api_key: str | None = None
    model: str = "deepseek-chat"
    api_base: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"
    deepseek_api_base: str = "https://api.deepseek.com"
    ollama_model: str = "qwen2.5:7b"
    ollama_api_base: str = "http://localhost:11434"


class DeepSeekSettingsRequest(BaseModel):
    api_key: str | None = None
    model: str = Field(default="deepseek-chat", min_length=1)
    api_base: str = Field(default="https://api.deepseek.com", min_length=1)


class LLMSettingsRequest(BaseModel):
    provider: Literal["deepseek", "ollama"] = "deepseek"
    deepseek_api_key: str | None = None
    deepseek_model: str = Field(default="deepseek-chat", min_length=1)
    deepseek_api_base: str = Field(default="https://api.deepseek.com", min_length=1)
    ollama_model: str = Field(default="qwen2.5:7b", min_length=1)
    ollama_api_base: str = Field(default="http://localhost:11434", min_length=1)


class SettingsTestResponse(BaseModel):
    success: bool
    provider: Literal["deepseek", "ollama"]
    message: str
