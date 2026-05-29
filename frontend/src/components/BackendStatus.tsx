import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import type { BackendHealthStatus } from "../hooks/useBackendHealth";

interface BackendStatusProps {
  status: BackendHealthStatus;
  error: string | null;
  onRetry: () => void;
}

export function BackendStatus({ status, error, onRetry }: BackendStatusProps) {
  const isConnected = status === "connected";
  const isChecking = status === "checking";

  return (
    <div
      className={
        isConnected
          ? "flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700"
          : "flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800"
      }
      title={error ?? undefined}
    >
      {isChecking ? (
        <Loader2 size={15} className="animate-spin" />
      ) : isConnected ? (
        <CheckCircle2 size={15} />
      ) : (
        <AlertCircle size={15} />
      )}
      <span>
        {isChecking
          ? "正在连接后端"
          : isConnected
            ? "后端已连接"
            : "后端未连接"}
      </span>
      {!isConnected && !isChecking ? (
        <button
          className="ml-1 flex h-6 w-6 items-center justify-center rounded text-amber-900 hover:bg-amber-100"
          onClick={onRetry}
          title="重新检测后端"
          aria-label="重新检测后端"
        >
          <RefreshCw size={13} />
        </button>
      ) : null}
    </div>
  );
}
