import { apiClient } from "./client";
import type {
  DocumentDeleteResponse,
  DocumentFileActionResponse,
  DocumentImportResponse,
  DocumentListResponse
} from "../types/document";

export async function fetchDocuments() {
  const response = await apiClient.get<DocumentListResponse>("/api/documents");
  return response.data;
}

export async function importDocument(file: File) {
  const formData = new FormData();
  formData.append("file", file);

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

export async function deleteDocument(documentId: string) {
  const response = await apiClient.delete<DocumentDeleteResponse>(
    `/api/documents/${documentId}`
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
