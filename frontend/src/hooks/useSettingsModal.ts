import { useEffect, useState } from "react";
import type { AppSettings, LLMSettingsRequest, SettingsTestResponse } from "../types/settings";

interface UseSettingsModalOptions {
  isBackendConnected: boolean;
  isLlmConfigured: boolean;
  loadSettings: () => Promise<AppSettings | null>;
  saveSettings: (values: LLMSettingsRequest) => Promise<AppSettings | null>;
  testSettings: (values: LLMSettingsRequest) => Promise<SettingsTestResponse | null>;
}

export function useSettingsModal({
  isBackendConnected,
  isLlmConfigured,
  loadSettings,
  saveSettings,
  testSettings
}: UseSettingsModalOptions) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasPromptedForApiKey, setHasPromptedForApiKey] = useState(false);

  useEffect(() => {
    if (!isBackendConnected) {
      return;
    }

    void loadSettings().then((settings) => {
      if (settings && !settings.is_configured && !hasPromptedForApiKey) {
        setIsSettingsOpen(true);
        setHasPromptedForApiKey(true);
      }
    });
  }, [hasPromptedForApiKey, isBackendConnected, loadSettings]);

  const openSettings = () => {
    setIsSettingsOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  const ensureSettingsBeforeAsk = () => {
    if (isLlmConfigured) {
      return true;
    }

    setIsSettingsOpen(true);
    return false;
  };

  const handleSaveSettings = async (values: LLMSettingsRequest) => {
    const saved = await saveSettings(values);
    return Boolean(saved);
  };

  const handleTestSettings = async (values: LLMSettingsRequest) => {
    const tested = await testSettings(values);
    return Boolean(tested);
  };

  return {
    isSettingsOpen,
    openSettings,
    closeSettings,
    ensureSettingsBeforeAsk,
    handleSaveSettings,
    handleTestSettings
  };
}
