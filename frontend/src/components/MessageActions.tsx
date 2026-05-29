import { Check, Copy, RefreshCw } from "lucide-react";
import { useState } from "react";

interface MessageActionsProps {
  content: string;
  canRegenerate: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

export function MessageActions({
  content,
  canRegenerate,
  isRegenerating,
  onRegenerate
}: MessageActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(content);
    setCopyState("copied");
    window.setTimeout(() => setCopyState("idle"), 1600);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-600 hover:bg-neutral-50"
        onClick={copyAnswer}
      >
        {copyState === "copied" ? <Check size={13} /> : <Copy size={13} />}
        {copyState === "copied" ? "已复制" : "复制"}
      </button>
      {canRegenerate ? (
        <button
          className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          disabled={isRegenerating}
          onClick={onRegenerate}
        >
          <RefreshCw size={13} className={isRegenerating ? "animate-spin" : ""} />
          重新生成
        </button>
      ) : null}
    </div>
  );
}
