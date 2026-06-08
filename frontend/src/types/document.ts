export interface DocumentItem {
  document_id: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  content_type: string;
  size: number;
  uploaded_at: string;
  updated_at: string;
  page_count: number;
  character_count: number;
  chunk_count: number;
  indexed_chunk_count: number;
  is_indexed: boolean;
  file_path: string;
  text_path?: string | null;
  chunks_path?: string | null;
  collection_name?: string | null;
  knowledge_base_ids: string[];
  ocr_status?: string | null;
  ocr_message?: string | null;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
  total: number;
}

export interface DocumentImportResponse {
  document_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  content_type: string;
  size: number;
  is_duplicate: boolean;
  page_count: number;
  character_count: number;
  text_filename: string;
  chunks_filename: string;
  chunk_count: number;
  indexed_chunk_count: number;
  collection_name: string;
  knowledge_base_ids: string[];
  ocr_status?: string | null;
  ocr_message?: string | null;
}

export interface DocumentDeleteResponse {
  document_id: string;
  deleted_metadata: boolean;
  deleted_files: string[];
  missing_files: string[];
  deleted_vector_count: number;
  removed_knowledge_base_id?: string | null;
  is_orphan?: boolean;
}

export interface DocumentFileActionResponse {
  document_id: string;
  file_path: string;
  action: string;
  success: boolean;
}

export interface DocumentPreviewResponse {
  document_id: string;
  filename: string;
  file_type: string;
  preview_supported: boolean;
  preview_mode: "pdf" | "text" | "image" | "unsupported";
  content?: string | null;
  file_url?: string | null;
  page?: number | null;
  chunk_index?: number | null;
  message?: string | null;
}

export interface DocumentKnowledgeBaseResponse {
  document_id: string;
  knowledge_base_ids: string[];
}

export interface PendingImportFile {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  file?: File;
  filePath?: string;
}

export type DocumentTypeFilter = "all" | "pdf" | "docx" | "pptx" | "txt" | "md" | "image";
