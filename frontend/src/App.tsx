import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BackendStatus } from "./components/BackendStatus";
import { ChatPanel } from "./components/ChatPanel";
import { ConfirmModal } from "./components/ConfirmModal";
import { DocumentPanel } from "./components/DocumentPanel";
import { DocumentPreviewDrawer } from "./components/DocumentPreviewDrawer";
import { KnowledgeBaseSelectModal } from "./components/KnowledgeBaseSelectModal";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { TextInputModal } from "./components/TextInputModal";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useChat } from "./hooks/useChat";
import { useDocuments } from "./hooks/useDocuments";
import { useImportFlow } from "./hooks/useImportFlow";
import { useKnowledgeBases } from "./hooks/useKnowledgeBases";
import { usePreview } from "./hooks/usePreview";
import { useSettings } from "./hooks/useSettings";
import { useSettingsModal } from "./hooks/useSettingsModal";
import type { DocumentItem } from "./types/document";
import type { ConversationItem, KnowledgeBaseItem } from "./types/knowledgeBase";
import type { RetrievalSettings } from "./types/qa";

type TextModalMode =
  | "createKnowledgeBase"
  | "renameKnowledgeBase"
  | "renameConversation";

interface PendingTextModal {
  id: number;
  mode: TextModalMode;
  knowledgeBase?: KnowledgeBaseItem;
  conversation?: ConversationItem;
}

function App() {
  const backendHealth = useBackendHealth();
  const knowledge = useKnowledgeBases();
  const documents = useDocuments(knowledge.activeKnowledgeBaseId);
  const chat = useChat();
  const appSettings = useSettings();
  const textModalIdRef = useRef(0);
  const hasLoadedKnowledgeAfterConnectRef = useRef(false);
  const isBackendConnected = backendHealth.status === "connected";
  const isLlmConfigured = Boolean(appSettings.settings?.is_configured);
  const [textModal, setTextModal] = useState<PendingTextModal | null>(null);
  const [conversationToDelete, setConversationToDelete] =
    useState<ConversationItem | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);
  const [knowledgeBaseToDelete, setKnowledgeBaseToDelete] =
    useState<KnowledgeBaseItem | null>(null);
  const [retrievalSettings, setRetrievalSettings] = useState<RetrievalSettings>({
    topK: 5,
    maxDistance: null
  });
  const preview = usePreview();
  const settingsModal = useSettingsModal({
    isBackendConnected,
    isLlmConfigured,
    loadSettings: appSettings.loadSettings,
    saveSettings: appSettings.saveSettings,
    testSettings: appSettings.testSettings
  });
  const importFlow = useImportFlow({
    defaultKnowledgeBase: knowledge.defaultKnowledgeBase,
    activeKnowledgeBaseId: knowledge.activeKnowledgeBaseId,
    activeKnowledgeBaseIds: knowledge.activeKnowledgeBaseIds,
    uploadDocuments: documents.uploadDocuments,
    copyDocument: documents.copyDocument,
    moveDocument: documents.moveDocument,
    loadKnowledgeBases: knowledge.loadAll
  });

  const activeKnowledgeBase =
    knowledge.knowledgeBases.find((item) => item.id === knowledge.activeKnowledgeBaseId) ??
    null;

  const openTextModal = (modal: Omit<PendingTextModal, "id">) => {
    textModalIdRef.current += 1;
    setTextModal({ ...modal, id: textModalIdRef.current });
  };

  useEffect(() => {
    if (!isBackendConnected) {
      hasLoadedKnowledgeAfterConnectRef.current = false;
      return;
    }

    if (hasLoadedKnowledgeAfterConnectRef.current) {
      return;
    }

    hasLoadedKnowledgeAfterConnectRef.current = true;
    void knowledge.loadAll();
  }, [isBackendConnected, knowledge.loadAll]);

  useEffect(() => {
    if (!knowledge.currentConversationId) {
      chat.resetMessages();
      return;
    }

    if (!isBackendConnected) {
      return;
    }

    void chat
      .loadHistory(knowledge.currentConversationId)
      .catch((error) => console.error("Failed to load chat history", error));
  }, [chat.loadHistory, chat.resetMessages, isBackendConnected, knowledge.currentConversationId]);

  const handleAsk = (question: string) => {
    if (!knowledge.currentConversationId) {
      return;
    }

    if (!settingsModal.ensureSettingsBeforeAsk()) {
      return;
    }

    void chat.ask(
      question,
      documents.selectedDocumentIds,
      knowledge.activeKnowledgeBaseIds,
      knowledge.currentConversationId,
      retrievalSettings
    );
  };

  const createConversationWithTimestamp = () => {
    void knowledge.createConversationByTitle(formatNewConversationTitle());
  };

  const textModalConfig = (() => {
    if (!textModal) {
      return {
        title: "",
        label: "",
        initialValue: "",
        confirmText: "确认"
      };
    }

    if (textModal.mode === "createKnowledgeBase") {
      return {
        title: "新建知识库",
        label: "知识库名称",
        initialValue: "",
        confirmText: "创建"
      };
    }

    if (textModal.mode === "renameKnowledgeBase") {
      return {
        title: "重命名知识库",
        label: "知识库名称",
        initialValue: textModal.knowledgeBase?.name ?? "",
        confirmText: "保存"
      };
    }

    return {
      title: "重命名对话",
      label: "对话名称",
      initialValue: textModal.conversation?.title ?? "",
      confirmText: "保存"
    };
  })();

  const handleTextModalConfirm = async (value: string) => {
    const currentModal = textModal;
    if (!currentModal) {
      return;
    }

    if (currentModal.mode === "createKnowledgeBase") {
      await knowledge.createKnowledgeBaseByName(value);
    } else if (currentModal.mode === "renameKnowledgeBase" && currentModal.knowledgeBase) {
      await knowledge.renameKnowledgeBaseByName(currentModal.knowledgeBase, value);
    } else if (currentModal.mode === "renameConversation" && currentModal.conversation) {
      await knowledge.renameConversationByTitle(currentModal.conversation, value);
    }

    setTextModal(null);
  };

  const blurActiveElement = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const confirmDeleteConversation = async () => {
    const conversation = conversationToDelete;
    if (!conversation) {
      return;
    }

    blurActiveElement();
    setConversationToDelete(null);
    await knowledge.removeConversation(conversation);
  };

  const confirmDeleteKnowledgeBase = async () => {
    const knowledgeBase = knowledgeBaseToDelete;
    if (!knowledgeBase) {
      return;
    }

    blurActiveElement();
    setKnowledgeBaseToDelete(null);
    await knowledge.removeKnowledgeBase(knowledgeBase);
  };

  const confirmDeleteDocument = async () => {
    const documentItem = documentToDelete;
    if (!documentItem) {
      return;
    }

    blurActiveElement();
    setDocumentToDelete(null);
    await documents.removeDocument(documentItem, { deleteOrphanEntity: true });
    await knowledge.loadAll();
  };

  return (
    <div className="flex h-screen flex-col bg-neutral-100 text-neutral-950">
      <header className="flex h-14 items-center justify-between border-b border-neutral-200 bg-white px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-950 text-white">
            LM
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">LocalMind</h1>
            <p className="text-xs text-neutral-500">本地 AI 知识库</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={settingsModal.openSettings}
          >
            <Settings size={15} />
            设置
          </button>
          <BackendStatus
            status={backendHealth.status}
            error={backendHealth.error}
            onRetry={backendHealth.checkHealth}
          />
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-[220px_380px_1fr]">
        <Sidebar
          knowledgeBases={knowledge.knowledgeBases}
          conversations={knowledge.conversations}
          activeKnowledgeBaseId={knowledge.activeKnowledgeBaseId}
          currentConversationId={knowledge.currentConversationId}
          error={knowledge.error}
          onSelectKnowledgeBase={knowledge.setActiveKnowledgeBaseId}
          onCreateKnowledgeBase={() => openTextModal({ mode: "createKnowledgeBase" })}
          onRenameKnowledgeBase={(knowledgeBase) =>
            openTextModal({ mode: "renameKnowledgeBase", knowledgeBase })
          }
          onDeleteKnowledgeBase={setKnowledgeBaseToDelete}
          onSelectConversation={knowledge.setCurrentConversationId}
          onCreateConversation={createConversationWithTimestamp}
          onRenameConversation={(conversation) =>
            openTextModal({ mode: "renameConversation", conversation })
          }
          onDeleteConversation={setConversationToDelete}
        />
        <DocumentPanel
          activeKnowledgeBase={activeKnowledgeBase}
          documents={documents.documents}
          filteredDocuments={documents.filteredDocuments}
          isLoading={documents.isLoading || knowledge.isLoading}
          isUploading={documents.isUploading}
          deletingId={documents.deletingId}
          actionDocumentId={documents.actionDocumentId}
          error={documents.error}
          notice={documents.notice}
          searchQuery={documents.searchQuery}
          typeFilter={documents.typeFilter}
          selectedDocumentIds={documents.selectedDocumentIds}
          onSearchChange={documents.setSearchQuery}
          onTypeChange={documents.setTypeFilter}
          onToggleSelect={documents.toggleDocumentSelection}
          onClearSelection={documents.clearSelection}
          onUploadClick={importFlow.openUploadFlow}
          onDelete={setDocumentToDelete}
          onOpen={documents.openManagedDocument}
          onPreview={preview.previewDocument}
          onShowInFolder={documents.showManagedDocumentInFolder}
          onCopy={importFlow.openCopyFlow}
          onMove={importFlow.openMoveFlow}
          onRefresh={documents.loadDocuments}
        />
        <ChatPanel
          messages={chat.messages}
          isAsking={chat.isAsking}
          regeneratingId={chat.regeneratingId}
          selectedDocumentCount={documents.selectedDocumentIds.length}
          knowledgeBases={knowledge.knowledgeBases}
          activeKnowledgeBaseIds={knowledge.activeKnowledgeBaseIds}
          currentConversationTitle={knowledge.currentConversation?.title ?? "未选择对话"}
          currentConversationId={knowledge.currentConversationId}
          isBackendConnected={isBackendConnected}
          hasDeepSeekApiKey={isLlmConfigured}
          retrievalSettings={retrievalSettings}
          onRetrievalSettingsChange={setRetrievalSettings}
          onToggleKnowledgeBase={knowledge.toggleConversationKnowledgeBase}
          onAsk={handleAsk}
          onRegenerate={chat.regenerate}
          onPreviewSource={preview.previewSource}
          onClear={() => chat.clearMessages(knowledge.currentConversationId)}
        />
      </main>

      <DocumentPreviewDrawer
        request={preview.previewRequest}
        onClose={preview.closePreview}
        onOpenOriginal={preview.openPreviewOriginal}
      />

      <input
        ref={importFlow.fileInputRef}
        className="hidden"
        type="file"
        multiple
        accept=".pdf,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.bmp,.webp"
        onChange={importFlow.handleFileInputChange}
      />

      <KnowledgeBaseSelectModal
        isOpen={Boolean(importFlow.selectionModal)}
        title={
          importFlow.selectionModal?.mode === "upload"
            ? "选择要加入的知识库"
            : importFlow.selectionModal?.mode === "copy"
              ? "复制到知识库"
              : "移动到知识库"
        }
        description={
          importFlow.selectionModal?.mode === "upload"
            ? "默认知识库是总库，会自动勾选且不能取消；也可以额外选择其他知识库。"
            : "可以选择一个或多个目标知识库。"
        }
        knowledgeBases={knowledge.knowledgeBases}
        defaultSelectedIds={importFlow.defaultSelectionIds}
        confirmText={importFlow.selectionModal?.mode === "upload" ? "确定" : "确认"}
        pendingFiles={
          importFlow.selectionModal?.mode === "upload" ? importFlow.pendingUploadFiles : undefined
        }
        isBusy={documents.isUploading}
        onChooseFiles={
          importFlow.selectionModal?.mode === "upload" ? importFlow.chooseUploadFiles : undefined
        }
        onRemovePendingFile={
          importFlow.selectionModal?.mode === "upload"
            ? importFlow.removePendingUploadFile
            : undefined
        }
        onClose={importFlow.closeSelectionModal}
        onConfirm={importFlow.handleSelectionConfirm}
      />

      <TextInputModal
        key={textModal?.id ?? "closed-text-modal"}
        isOpen={Boolean(textModal)}
        title={textModalConfig.title}
        label={textModalConfig.label}
        initialValue={textModalConfig.initialValue}
        confirmText={textModalConfig.confirmText}
        onClose={() => setTextModal(null)}
        onConfirm={handleTextModalConfirm}
      />

      <ConfirmModal
        isOpen={Boolean(conversationToDelete)}
        title="删除对话"
        message={
          conversationToDelete
            ? `确定删除对话“${conversationToDelete.title}”吗？`
            : ""
        }
        confirmText="删除"
        danger
        onCancel={() => setConversationToDelete(null)}
        onConfirm={confirmDeleteConversation}
      />

      <ConfirmModal
        isOpen={Boolean(documentToDelete)}
        title="删除文件"
        message={
          documentToDelete
            ? knowledge.activeKnowledgeBaseId === "default"
              ? `确定从默认知识库删除“${documentToDelete.original_filename}”吗？这会同时从所有其他知识库中移除该文件；如果文件不再属于任何知识库，会清理文件副本和索引。`
              : `确定从当前知识库移除“${documentToDelete.original_filename}”吗？默认知识库中的文件不会受影响。`
            : ""
        }
        confirmText="删除"
        cancelText="取消"
        danger
        onCancel={() => setDocumentToDelete(null)}
        onConfirm={confirmDeleteDocument}
      />

      <ConfirmModal
        isOpen={Boolean(knowledgeBaseToDelete)}
        title="删除知识库"
        message={
          knowledgeBaseToDelete
            ? `确定删除知识库“${knowledgeBaseToDelete.name}”吗？文件实体不会被删除。`
            : ""
        }
        confirmText="删除"
        cancelText="取消"
        danger
        onCancel={() => setKnowledgeBaseToDelete(null)}
        onConfirm={confirmDeleteKnowledgeBase}
      />

      <SettingsModal
        isOpen={settingsModal.isSettingsOpen}
        settings={appSettings.settings}
        isSaving={appSettings.isSaving}
        isTesting={appSettings.isTesting}
        error={appSettings.error}
        testMessage={appSettings.testMessage}
        onClose={settingsModal.closeSettings}
        onSave={settingsModal.handleSaveSettings}
        onTest={settingsModal.handleTestSettings}
      />
    </div>
  );
}

function formatNewConversationTitle() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  ].map((part) => String(part).padStart(2, "0"));

  return `新对话${parts.join("/")}`;
}

export default App;
