export interface Source {
  chunk_id: string;
  document_id: string;
  original_filename: string;
  file_type: string;
  page: number | null;
  chunk_index: number;
  text: string;
  text_preview: string;
  distance: number;
  score: number;
}

export interface AskRequest {
  question: string;
  top_k?: number;
  document_id?: string | null;
  document_ids?: string[] | null;
  max_distance?: number | null;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: Source[];
  selected_document_ids: string[];
}

export type ChatRole = "user" | "assistant" | "error";

export interface RetrievalSettings {
  topK: number;
  maxDistance: number | null;
}

export interface AssistantRequestContext {
  question: string;
  selectedDocumentIds: string[];
  retrievalSettings: RetrievalSettings;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
  sources?: Source[];
  selected_document_ids?: string[];
  top_k?: number | null;
  max_distance?: number | null;
  requestContext?: AssistantRequestContext;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}
