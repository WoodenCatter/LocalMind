import { useCallback, useState } from "react";
import { getApiErrorMessage } from "../api/client";
import { fetchSettings, saveDeepSeekSettings } from "../api/settings";
import type { AppSettings, DeepSeekSettingsRequest } from "../types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const saveSettings = useCallback(async (request: DeepSeekSettingsRequest) => {
    setIsSaving(true);
    setError(null);

    try {
      const data = await saveDeepSeekSettings(request);
      setSettings(data);
      return data;
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    settings,
    isLoading,
    isSaving,
    error,
    loadSettings,
    saveSettings,
    setError
  };
}
