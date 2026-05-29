import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage } from "../api/client";
import { fetchHealth } from "../api/health";

export type BackendHealthStatus = "checking" | "connected" | "disconnected";

export function useBackendHealth() {
  const [status, setStatus] = useState<BackendHealthStatus>("checking");
  const [error, setError] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setStatus("checking");
    setError(null);

    try {
      const health = await fetchHealth();
      if (health.status === "ok") {
        setStatus("connected");
      } else {
        setStatus("disconnected");
        setError("后端状态异常，请检查 FastAPI 服务。");
      }
    } catch (currentError) {
      setStatus("disconnected");
      setError(getApiErrorMessage(currentError));
    }
  }, []);

  useEffect(() => {
    void checkHealth();

    const timer = window.setInterval(() => {
      void checkHealth();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [checkHealth]);

  return {
    status,
    error,
    checkHealth
  };
}
