import { useCallback, useState } from "react";
import { getApiErrorMessage } from "../api/client";
import { fetchSettings, saveLLMSettings, testLLMSettings } from "../api/settings";
import type { AppSettings, LLMSettingsRequest } from "../types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchSettings();
      setSettings(data);
      return data;
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (request: LLMSettingsRequest) => {
    setIsSaving(true);
    setError(null);
    setTestMessage(null);

    try {
      const data = await saveLLMSettings(request);
      setSettings(data);
      return data;
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const testSettings = useCallback(async (request: LLMSettingsRequest) => {
    setIsTesting(true);
    setError(null);
    setTestMessage(null);

    try {
      const data = await testLLMSettings(request);
      setTestMessage(data.message);
      return data;
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
      return null;
    } finally {
      setIsTesting(false);
    }
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    isTesting,
    error,
    testMessage,
    loadSettings,
    saveSettings,
    testSettings,
    setError
  };
}
