import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../api/client";
import {
  copyDocumentToKnowledgeBases,
  deleteDocumentEntity,
  fetchDocuments,
  importDocument,
  importLocalDocument,
  moveDocumentToKnowledgeBases,
  openDocument,
  removeDocumentFromKnowledgeBase,
  showDocumentInFolder
} from "../api/documents";
import type { DocumentItem, DocumentTypeFilter, PendingImportFile } from "../types/document";

const DEFAULT_KNOWLEDGE_BASE_ID = "default";
const IMAGE_FILE_TYPES = new Set(["png", "jpg", "jpeg", "bmp", "webp"]);

interface RemoveDocumentOptions {
  deleteOrphanEntity?: boolean;
}

export function useDocuments(activeKnowledgeBaseId: string | null) {
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
      const data = await fetchDocuments(activeKnowledgeBaseId);
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
  }, [activeKnowledgeBaseId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const uploadDocument = useCallback(
    async (file: File, knowledgeBaseIds: string[]) => {
      setIsUploading(true);
      setError(null);
      setNotice(null);

      try {
        await importDocument(file, knowledgeBaseIds);
        await loadDocuments();
        setNotice("文件已导入。");
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      } finally {
        setIsUploading(false);
      }
    },
    [loadDocuments]
  );

  const uploadDocuments = useCallback(
    async (files: PendingImportFile[], knowledgeBaseIds: string[]) => {
      if (files.length === 0) {
        return;
      }

      setIsUploading(true);
      setError(null);
      setNotice(null);

      try {
        for (const file of files) {
          if (file.filePath) {
            await importLocalDocument(file.filePath, knowledgeBaseIds);
          } else if (file.file) {
            await importDocument(file.file, knowledgeBaseIds);
          }
        }
        await loadDocuments();
        setNotice(`已导入 ${files.length} 个文件。`);
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      } finally {
        setIsUploading(false);
      }
    },
    [loadDocuments]
  );

  const removeDocument = useCallback(
    async (document: DocumentItem, options: RemoveDocumentOptions = {}) => {
      if (!activeKnowledgeBaseId) {
        return;
      }

      const isDefaultKnowledgeBase = activeKnowledgeBaseId === DEFAULT_KNOWLEDGE_BASE_ID;
      setDeletingId(document.document_id);
      setError(null);
      setNotice(null);

      try {
        const result = await removeDocumentFromKnowledgeBase(
          document.document_id,
          activeKnowledgeBaseId
        );
        setSelectedDocumentIds((current) =>
          current.filter((documentId) => documentId !== document.document_id)
        );

        if (result.is_orphan) {
          if (options.deleteOrphanEntity) {
            await deleteDocumentEntity(document.document_id);
            setNotice("文件实体已彻底删除。");
          } else {
            setNotice(
              isDefaultKnowledgeBase
                ? "已从所有知识库移除关联，文件实体仍保留。"
                : "已移除知识库关联，文件实体仍保留。"
            );
          }
        } else {
          setNotice(
            isDefaultKnowledgeBase
              ? "已从所有知识库移除。"
              : "已从当前知识库移除。"
          );
        }

        await loadDocuments();
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      } finally {
        setDeletingId(null);
      }
    },
    [activeKnowledgeBaseId, loadDocuments]
  );

  const copyDocument = useCallback(
    async (document: DocumentItem, knowledgeBaseIds: string[]) => {
      setActionDocumentId(document.document_id);
      setError(null);
      setNotice(null);

      try {
        await copyDocumentToKnowledgeBases(document.document_id, knowledgeBaseIds);
        await loadDocuments();
        setNotice("已复制到目标知识库。");
      } catch (currentError) {
        setError(`复制失败：${getApiErrorMessage(currentError)}`);
      } finally {
        setActionDocumentId(null);
      }
    },
    [loadDocuments]
  );

  const moveDocument = useCallback(
    async (document: DocumentItem, knowledgeBaseIds: string[]) => {
      if (!activeKnowledgeBaseId) {
        return;
      }

      setActionDocumentId(document.document_id);
      setError(null);
      setNotice(null);

      try {
        await moveDocumentToKnowledgeBases(
          document.document_id,
          activeKnowledgeBaseId,
          knowledgeBaseIds
        );
        await loadDocuments();
        setNotice(
          activeKnowledgeBaseId === DEFAULT_KNOWLEDGE_BASE_ID
            ? "已添加到目标知识库，默认知识库中仍然保留。"
            : "已移动到目标知识库。"
        );
      } catch (currentError) {
        setError(`移动失败：${getApiErrorMessage(currentError)}`);
      } finally {
        setActionDocumentId(null);
      }
    },
    [activeKnowledgeBaseId, loadDocuments]
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
      const documentType = document.file_type.toLowerCase();
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "image" && IMAGE_FILE_TYPES.has(documentType)) ||
        documentType === typeFilter;

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
    uploadDocuments,
    removeDocument,
    copyDocument,
    moveDocument,
    openManagedDocument,
    showManagedDocumentInFolder,
    toggleDocumentSelection,
    clearSelection
  };
}
