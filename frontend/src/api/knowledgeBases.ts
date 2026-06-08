import { apiClient } from "./client";
import type {
  ConversationItem,
  ConversationListResponse,
  KnowledgeBaseItem,
  KnowledgeBaseListResponse
} from "../types/knowledgeBase";

export async function fetchKnowledgeBases() {
  const response = await apiClient.get<KnowledgeBaseListResponse>("/api/knowledge-bases");
  return response.data;
}

export async function createKnowledgeBase(name: string) {
  const response = await apiClient.post<KnowledgeBaseItem>("/api/knowledge-bases", {
    name
  });
  return response.data;
}

export async function renameKnowledgeBase(id: string, name: string) {
  const response = await apiClient.patch<KnowledgeBaseItem>(`/api/knowledge-bases/${id}`, {
    name
  });
  return response.data;
}

export async function deleteKnowledgeBase(id: string) {
  await apiClient.delete(`/api/knowledge-bases/${id}`);
}

export async function fetchConversations() {
  const response = await apiClient.get<ConversationListResponse>("/api/conversations");
  return response.data;
}

export async function createConversation(title?: string, knowledgeBaseIds?: string[]) {
  const response = await apiClient.post<ConversationItem>("/api/conversations", {
    title,
    knowledge_base_ids: knowledgeBaseIds
  });
  return response.data;
}

export async function updateConversation(
  id: string,
  request: { title?: string; knowledge_base_ids?: string[] }
) {
  const response = await apiClient.patch<ConversationItem>(
    `/api/conversations/${id}`,
    request
  );
  return response.data;
}

export async function deleteConversation(id: string) {
  await apiClient.delete(`/api/conversations/${id}`);
}

export async function setConversationKnowledgeBases(
  id: string,
  knowledgeBaseIds: string[]
) {
  const response = await apiClient.put<ConversationItem>(
    `/api/conversations/${id}/knowledge-bases`,
    {
      knowledge_base_ids: knowledgeBaseIds
    }
  );
  return response.data;
}
