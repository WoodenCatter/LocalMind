import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DocumentItem, PendingImportFile } from "../types/document";
import type { KnowledgeBaseItem } from "../types/knowledgeBase";

type SelectionMode = "upload" | "copy" | "move";

interface PendingSelection {
  mode: SelectionMode;
  document?: DocumentItem;
}

interface UseImportFlowOptions {
  defaultKnowledgeBase?: KnowledgeBaseItem | null;
  activeKnowledgeBaseId: string | null;
  activeKnowledgeBaseIds: string[];
  uploadDocuments: (files: PendingImportFile[], knowledgeBaseIds: string[]) => Promise<void>;
  copyDocument: (document: DocumentItem, knowledgeBaseIds: string[]) => Promise<void>;
  moveDocument: (document: DocumentItem, knowledgeBaseIds: string[]) => Promise<void>;
  loadKnowledgeBases: () => Promise<void>;
}

export function useImportFlow({
  defaultKnowledgeBase,
  activeKnowledgeBaseId,
  activeKnowledgeBaseIds,
  uploadDocuments,
  copyDocument,
  moveDocument,
  loadKnowledgeBases
}: UseImportFlowOptions) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectionModal, setSelectionModal] = useState<PendingSelection | null>(null);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<PendingImportFile[]>([]);

  const defaultSelectionIds = useMemo(
    () =>
      selectionModal?.mode === "upload"
        ? ([defaultKnowledgeBase?.id, activeKnowledgeBaseId].filter(Boolean) as string[])
        : activeKnowledgeBaseId
          ? [activeKnowledgeBaseId]
          : activeKnowledgeBaseIds,
    [
      activeKnowledgeBaseId,
      activeKnowledgeBaseIds,
      defaultKnowledgeBase?.id,
      selectionModal?.mode
    ]
  );

  const openUploadFlow = () => {
    setPendingUploadFiles([]);
    setSelectionModal({ mode: "upload" });
  };

  const openCopyFlow = (document: DocumentItem) => {
    setSelectionModal({ mode: "copy", document });
  };

  const openMoveFlow = (document: DocumentItem) => {
    setSelectionModal({ mode: "move", document });
  };

  const closeSelectionModal = () => {
    if (selectionModal?.mode === "upload") {
      setPendingUploadFiles([]);
    }
    setSelectionModal(null);
  };

  const addPendingUploadFiles = (files: PendingImportFile[]) => {
    setPendingUploadFiles((current) => {
      const existingKeys = new Set(current.map(getFileKey));
      const nextFiles = [...current];

      for (const file of files) {
        const key = getFileKey(file);
        if (!existingKeys.has(key)) {
          nextFiles.push(file);
          existingKeys.add(key);
        }
      }

      return nextFiles;
    });
  };

  const chooseUploadFiles = async () => {
    if (window.localmind?.selectImportFiles) {
      const selectedFiles = await window.localmind.selectImportFiles();
      addPendingUploadFiles(
        selectedFiles.map((file) => ({
          id: getLocalFileKey(file),
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          filePath: file.filePath
        }))
      );
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      addPendingUploadFiles(
        files.map((file) => ({
          id: getBrowserFileKey(file),
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          file
        }))
      );
      event.target.value = "";
    }
  };

  const removePendingUploadFile = (index: number) => {
    setPendingUploadFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSelectionConfirm = async (knowledgeBaseIds: string[]) => {
    const currentSelection = selectionModal;

    if (!currentSelection) {
      return;
    }

    if (currentSelection.mode === "upload") {
      if (pendingUploadFiles.length === 0) {
        return;
      }

      await uploadDocuments(pendingUploadFiles, knowledgeBaseIds);
      setPendingUploadFiles([]);
      setSelectionModal(null);
      await loadKnowledgeBases();
      return;
    }

    setSelectionModal(null);

    if (!currentSelection.document) {
      return;
    }

    if (currentSelection.mode === "copy") {
      await copyDocument(currentSelection.document, knowledgeBaseIds);
    } else {
      await moveDocument(currentSelection.document, knowledgeBaseIds);
    }
    await loadKnowledgeBases();
  };

  return {
    fileInputRef,
    selectionModal,
    pendingUploadFiles,
    defaultSelectionIds,
    openUploadFlow,
    openCopyFlow,
    openMoveFlow,
    closeSelectionModal,
    chooseUploadFiles,
    handleFileInputChange,
    removePendingUploadFile,
    handleSelectionConfirm
  };
}

function getFileKey(file: PendingImportFile) {
  return file.id;
}

function getBrowserFileKey(file: File) {
  return `browser:${file.name}-${file.size}-${file.lastModified}`;
}

function getLocalFileKey(file: LocalMindSelectedFile) {
  return `local:${file.filePath}-${file.size}-${file.lastModified}`;
}
