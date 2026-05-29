import { apiClient } from "./client";
import type { AppSettings, DeepSeekSettingsRequest } from "../types/settings";

export async function fetchSettings() {
  const response = await apiClient.get<AppSettings>("/api/settings");
  return response.data;
}

export async function saveDeepSeekSettings(request: DeepSeekSettingsRequest) {
  const response = await apiClient.post<AppSettings>(
    "/api/settings/deepseek",
    request
  );
  return response.data;
}
