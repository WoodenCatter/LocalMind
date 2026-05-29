import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../api/client";
import {
  deleteDocument,
  fetchDocuments,
  importDocument,
  openDocument,
  showDocumentInFolder
} from "../api/documents";
import type { DocumentItem, DocumentTypeFilter } from "../types/document";

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionDocumentId, setActionDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentTypeFilter>("all");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotice(null);

    try {
      const data = await fetchDocuments();
      setDocuments(data.documents);
      setSelectedDocumentIds((current) =>
        current.filter((documentId) =>
          data.documents.some((document) => document.document_id === documentId)
        )
      );
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const uploadDocument = useCallback(
    async (file: File) => {
      setIsUploading(true);
      setError(null);
      setNotice(null);

      try {
        await importDocument(file);
        await loadDocuments();
        setNotice("文档已导入。");
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      } finally {
        setIsUploading(false);
      }
    },
    [loadDocuments]
  );

  const removeDocument = useCallback(
    async (document: DocumentItem) => {
      const confirmed = window.confirm(
        `确定删除“${document.original_filename}”吗？`
      );
      if (!confirmed) {
        return;
      }

      setDeletingId(document.document_id);
      setError(null);
      setNotice(null);

      try {
        await deleteDocument(document.document_id);
        setSelectedDocumentIds((current) =>
          current.filter((documentId) => documentId !== document.document_id)
        );
        await loadDocuments();
        setNotice("文档已删除。");
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      } finally {
        setDeletingId(null);
      }
    },
    [loadDocuments]
  );

  const openManagedDocument = useCallback(async (document: DocumentItem) => {
    setActionDocumentId(document.document_id);
    setError(null);
    setNotice(null);

    try {
      await openDocument(document.document_id);
      setNotice(`已请求系统打开：${document.original_filename}`);
    } catch (currentError) {
      setError(`打开文件失败：${getApiErrorMessage(currentError)}`);
    } finally {
      setActionDocumentId(null);
    }
  }, []);

  const showManagedDocumentInFolder = useCallback(async (document: DocumentItem) => {
    setActionDocumentId(document.document_id);
    setError(null);
    setNotice(null);

    try {
      await showDocumentInFolder(document.document_id);
      setNotice(`已在文件夹中定位：${document.original_filename}`);
    } catch (currentError) {
      setError(`在文件夹中显示失败：${getApiErrorMessage(currentError)}`);
    } finally {
      setActionDocumentId(null);
    }
  }, []);

  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocumentIds((current) =>
      current.includes(documentId)
        ? current.filter((id) => id !== documentId)
        : [...current, documentId]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedDocumentIds([]);
  }, []);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesSearch =
        !normalizedSearch ||
        document.original_filename.toLowerCase().includes(normalizedSearch);
      const matchesType =
        typeFilter === "all" || document.file_type.toLowerCase() === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [documents, searchQuery, typeFilter]);

  return {
    documents,
    filteredDocuments,
    isLoading,
    isUploading,
    deletingId,
    actionDocumentId,
    error,
    notice,
    searchQuery,
    typeFilter,
    selectedDocumentIds,
    setSearchQuery,
    setTypeFilter,
    loadDocuments,
    uploadDocument,
    removeDocument,
    openManagedDocument,
    showManagedDocumentInFolder,
    toggleDocumentSelection,
    clearSelection
  };
}
