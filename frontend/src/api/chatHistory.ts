import { apiClient } from "./client";
import type { ChatHistoryResponse, ChatMessage } from "../types/qa";

export async function fetchChatHistory() {
  const response = await apiClient.get<ChatHistoryResponse>("/api/chat/history");
  return response.data;
}

export async function saveChatHistory(messages: ChatMessage[]) {
  const response = await apiClient.post<ChatHistoryResponse>("/api/chat/history", {
    messages
  });
  return response.data;
}

export async function clearChatHistory() {
  await apiClient.delete("/api/chat/history");
}
