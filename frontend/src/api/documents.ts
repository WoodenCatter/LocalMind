import { apiClient } from "./client";
import type {
  DocumentDeleteResponse,
  DocumentFileActionResponse,
  DocumentKnowledgeBaseResponse,
  DocumentImportResponse,
  DocumentListResponse,
  DocumentPreviewResponse
} from "../types/document";

export async function fetchDocuments(knowledgeBaseId?: string | null) {
  const response = await apiClient.get<DocumentListResponse>("/api/documents", {
    params: knowledgeBaseId ? { knowledge_base_id: knowledgeBaseId } : undefined
  });
  return response.data;
}

export async function importDocument(file: File, knowledgeBaseIds: string[]) {
  const formData = new FormData();
  formData.append("file", file);
  knowledgeBaseIds.forEach((id) => formData.append("knowledge_base_ids", id));

  const response = await apiClient.post<DocumentImportResponse>(
    "/api/documents/import",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}

export async function importLocalDocument(filePath: string, knowledgeBaseIds: string[]) {
  const response = await apiClient.post<DocumentImportResponse>(
    "/api/documents/import-local",
    {
      file_path: filePath,
      knowledge_base_ids: knowledgeBaseIds
    }
  );

  return response.data;
}

export async function deleteDocument(documentId: string) {
  const response = await apiClient.delete<DocumentDeleteResponse>(
    `/api/documents/${documentId}`
  );
  return response.data;
}

export async function removeDocumentFromKnowledgeBase(
  documentId: string,
  knowledgeBaseId: string
) {
  const response = await apiClient.delete<DocumentDeleteResponse>(
    `/api/documents/${documentId}`,
    {
      params: {
        knowledge_base_id: knowledgeBaseId
      }
    }
  );
  return response.data;
}

export async function deleteDocumentEntity(documentId: string) {
  const response = await apiClient.delete<DocumentDeleteResponse>(
    `/api/documents/${documentId}`,
    {
      params: {
        delete_entity: true
      }
    }
  );
  return response.data;
}

export async function copyDocumentToKnowledgeBases(
  documentId: string,
  knowledgeBaseIds: string[]
) {
  const response = await apiClient.post<DocumentKnowledgeBaseResponse>(
    `/api/documents/${documentId}/copy-to-knowledge-bases`,
    {
      knowledge_base_ids: knowledgeBaseIds
    }
  );
  return response.data;
}

export async function moveDocumentToKnowledgeBases(
  documentId: string,
  fromKnowledgeBaseId: string,
  targetKnowledgeBaseIds: string[]
) {
  const response = await apiClient.post<DocumentKnowledgeBaseResponse>(
    `/api/documents/${documentId}/move-to-knowledge-bases`,
    {
      from_knowledge_base_id: fromKnowledgeBaseId,
      target_knowledge_base_ids: targetKnowledgeBaseIds
    }
  );
  return response.data;
}

export async function openDocument(documentId: string) {
  const response = await apiClient.post<DocumentFileActionResponse>(
    `/api/documents/${documentId}/open`
  );
  return response.data;
}

export async function showDocumentInFolder(documentId: string) {
  const response = await apiClient.post<DocumentFileActionResponse>(
    `/api/documents/${documentId}/show-in-folder`
  );
  return response.data;
}

export async function fetchDocumentPreview(
  documentId: string,
  options?: { page?: number | null; chunkIndex?: number | null }
) {
  const response = await apiClient.get<DocumentPreviewResponse>(
    `/api/documents/${documentId}/preview`,
    {
      params: {
        page: options?.page ?? undefined,
        chunk_index: options?.chunkIndex ?? undefined
      }
    }
  );
  return response.data;
}

export function getDocumentPreviewFileUrl(documentId: string, page?: number | null) {
  const baseUrl = apiClient.defaults.baseURL ?? "";
  const fileUrl = `${baseUrl}/api/documents/${documentId}/preview-file`;
  return page ? `${fileUrl}#page=${page}` : fileUrl;
}
