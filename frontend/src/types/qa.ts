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
  retrieval_source: "vector" | "keyword" | "hybrid" | string;
  final_score: number;
  vector_rank: number | null;
  keyword_rank: number | null;
  vector_score: number;
  keyword_score: number;
}

export interface AskRequest {
  question: string;
  top_k?: number;
  document_id?: string | null;
  document_ids?: string[] | null;
  knowledge_base_ids?: string[] | null;
  conversation_id?: string | null;
  max_distance?: number | null;
  hybrid_search_enabled?: boolean;
  vector_candidate_count?: number | null;
  keyword_candidate_count?: number | null;
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
  knowledgeBaseIds: string[];
  conversationId: string | null;
  retrievalSettings: RetrievalSettings;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  created_at?: string;
  sources?: Source[];
  selected_document_ids?: string[];
  knowledge_base_ids?: string[];
  conversation_id?: string | null;
  top_k?: number | null;
  max_distance?: number | null;
  requestContext?: AssistantRequestContext;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
}
