import { Settings } from "lucide-react";
import { useEffect } from "react";
import { BackendStatus } from "./components/BackendStatus";
import { ChatPanel } from "./components/ChatPanel";
import { SettingsModal } from "./components/SettingsModal";
import { Sidebar } from "./components/Sidebar";
import { useState } from "react";
import { useBackendHealth } from "./hooks/useBackendHealth";
import { useChat } from "./hooks/useChat";
import { useDocuments } from "./hooks/useDocuments";
import { useSettings } from "./hooks/useSettings";
import type { RetrievalSettings } from "./types/qa";

function App() {
  const backendHealth = useBackendHealth();
  const documents = useDocuments();
  const chat = useChat();
  const appSettings = useSettings();
  const isBackendConnected = backendHealth.status === "connected";
  const hasDeepSeekApiKey = Boolean(appSettings.settings?.has_deepseek_api_key);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasPromptedForApiKey, setHasPromptedForApiKey] = useState(false);
  const [hasLoadedChatHistory, setHasLoadedChatHistory] = useState(false);
  const [retrievalSettings, setRetrievalSettings] = useState<RetrievalSettings>({
    topK: 5,
    maxDistance: null
  });

  useEffect(() => {
    if (!isBackendConnected) {
      setHasLoadedChatHistory(false);
      return;
    }

    void appSettings.loadSettings().then((settings) => {
      if (settings && !settings.has_deepseek_api_key && !hasPromptedForApiKey) {
        setIsSettingsOpen(true);
        setHasPromptedForApiKey(true);
      }
    });
  }, [appSettings.loadSettings, hasPromptedForApiKey, isBackendConnected]);

  useEffect(() => {
    if (!isBackendConnected || hasLoadedChatHistory) {
      return;
    }

    void chat
      .loadHistory()
      .catch((error) => console.error("Failed to load chat history", error))
      .finally(() => setHasLoadedChatHistory(true));
  }, [chat.loadHistory, hasLoadedChatHistory, isBackendConnected]);

  const handleAsk = (question: string) => {
    if (!hasDeepSeekApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    void chat.ask(question, documents.selectedDocumentIds, retrievalSettings);
  };

  const handleSaveSettings = async (values: {
    api_key?: string | null;
    model: string;
    api_base: string;
  }) => {
    const saved = await appSettings.saveSettings(values);
    return Boolean(saved);
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
            onClick={() => setIsSettingsOpen(true)}
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

      <main className="grid min-h-0 flex-1 grid-cols-[340px_1fr]">
        <Sidebar
          documents={documents.documents}
          filteredDocuments={documents.filteredDocuments}
          isLoading={documents.isLoading}
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
          onUpload={documents.uploadDocument}
          onDelete={documents.removeDocument}
          onOpen={documents.openManagedDocument}
          onShowInFolder={documents.showManagedDocumentInFolder}
          onRefresh={documents.loadDocuments}
        />
        <ChatPanel
          messages={chat.messages}
          isAsking={chat.isAsking}
          regeneratingId={chat.regeneratingId}
          selectedDocumentCount={documents.selectedDocumentIds.length}
          isBackendConnected={isBackendConnected}
          hasDeepSeekApiKey={hasDeepSeekApiKey}
          retrievalSettings={retrievalSettings}
          onRetrievalSettingsChange={setRetrievalSettings}
          onAsk={handleAsk}
          onRegenerate={chat.regenerate}
          onClear={chat.clearMessages}
          onClearSelection={documents.clearSelection}
        />
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={appSettings.settings}
        isSaving={appSettings.isSaving}
        error={appSettings.error}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
