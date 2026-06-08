import { useState } from "react";
import { openDocument } from "../api/documents";
import type { DocumentItem } from "../types/document";
import type { Source } from "../types/qa";

export interface PreviewRequest {
  documentId: string;
  page?: number | null;
  chunkIndex?: number | null;
}

export function usePreview() {
  const [previewRequest, setPreviewRequest] = useState<PreviewRequest | null>(null);

  const previewDocument = (document: DocumentItem) => {
    setPreviewRequest({ documentId: document.document_id });
  };

  const previewSource = (source: Source) => {
    setPreviewRequest({
      documentId: source.document_id,
      page: source.page,
      chunkIndex: source.chunk_index
    });
  };

  const closePreview = () => {
    setPreviewRequest(null);
  };

  const openPreviewOriginal = (documentId: string) => {
    void openDocument(documentId);
  };

  return {
    previewRequest,
    previewDocument,
    previewSource,
    closePreview,
    openPreviewOriginal
  };
}
