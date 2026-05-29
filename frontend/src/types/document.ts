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
  chunk_count: number;
  is_indexed: boolean;
  file_path: string;
  text_path?: string | null;
  chunks_path?: string | null;
  collection_name?: string | null;
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
}

export interface DocumentDeleteResponse {
  document_id: string;
  deleted_metadata: boolean;
  deleted_files: string[];
  missing_files: string[];
  deleted_vector_count: number;
}

export interface DocumentFileActionResponse {
  document_id: string;
  file_path: string;
  action: string;
  success: boolean;
}

export type DocumentTypeFilter = "all" | "pdf" | "docx" | "pptx" | "txt" | "md";
