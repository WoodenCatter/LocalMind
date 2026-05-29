export interface AppSettings {
  has_deepseek_api_key: boolean;
  masked_deepseek_api_key: string | null;
  model: string;
  api_base: string;
}

export interface DeepSeekSettingsRequest {
  api_key?: string | null;
  model: string;
  api_base: string;
}
