export interface KnowledgeBaseItem {
  id: string;
  name: string;
  is_default: boolean;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseListResponse {
  knowledge_bases: KnowledgeBaseItem[];
}

export interface ConversationItem {
  id: string;
  title: string;
  knowledge_base_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  conversations: ConversationItem[];
}
