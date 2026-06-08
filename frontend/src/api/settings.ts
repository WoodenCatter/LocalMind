import { apiClient } from "./client";
import type {
  AppSettings,
  DeepSeekSettingsRequest,
  LLMSettingsRequest,
  SettingsTestResponse
} from "../types/settings";

export async function fetchSettings() {
  const response = await apiClient.get<AppSettings>("/api/settings");
  return response.data;
}

export async function saveLLMSettings(request: LLMSettingsRequest) {
  const response = await apiClient.post<AppSettings>("/api/settings/llm", request);
  return response.data;
}

export async function testLLMSettings(request: LLMSettingsRequest) {
  const response = await apiClient.post<SettingsTestResponse>("/api/settings/test", request);
  return response.data;
}

export async function saveDeepSeekSettings(request: DeepSeekSettingsRequest) {
  const response = await apiClient.post<AppSettings>(
    "/api/settings/deepseek",
    request
  );
  return response.data;
}
