export type ModelProvider = "deepseek" | "ollama";

export interface AppSettings {
  provider: ModelProvider;
  is_configured: boolean;
  has_deepseek_api_key: boolean;
  masked_deepseek_api_key: string | null;
  model: string;
  api_base: string;
  deepseek_model: string;
  deepseek_api_base: string;
  ollama_model: string;
  ollama_api_base: string;
}

export interface LLMSettingsRequest {
  provider: ModelProvider;
  deepseek_api_key?: string | null;
  deepseek_model: string;
  deepseek_api_base: string;
  ollama_model: string;
  ollama_api_base: string;
}

export interface DeepSeekSettingsRequest {
  api_key?: string | null;
  model: string;
  api_base: string;
}

export interface SettingsTestResponse {
  success: boolean;
  provider: ModelProvider;
  message: string;
}
