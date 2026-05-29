import { apiClient } from "./client";

export interface HealthResponse {
  status: string;
}

export async function fetchHealth() {
  const response = await apiClient.get<HealthResponse>("/health");
  return response.data;
}
