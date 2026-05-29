import { apiClient } from "./client";
import type { AskRequest, AskResponse } from "../types/qa";

export async function askQuestion(request: AskRequest) {
  const response = await apiClient.post<AskResponse>("/api/qa/ask", request);
  return response.data;
}
