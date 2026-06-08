import { apiClient } from "./client";
import type { ChatHistoryResponse, ChatMessage } from "../types/qa";

export async function fetchChatHistory(conversationId?: string | null) {
  const response = await apiClient.get<ChatHistoryResponse>("/api/chat/history", {
    params: conversationId ? { conversation_id: conversationId } : undefined
  });
  return response.data;
}

export async function saveChatHistory(
  messages: ChatMessage[],
  conversationId?: string | null
) {
  const response = await apiClient.post<ChatHistoryResponse>("/api/chat/history", {
    conversation_id: conversationId,
    messages
  });
  return response.data;
}

export async function clearChatHistory(conversationId?: string | null) {
  await apiClient.delete("/api/chat/history", {
    params: conversationId ? { conversation_id: conversationId } : undefined
  });
}
