import { Eye, EyeOff, Loader2, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppSettings } from "../types/settings";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings | null;
  isSaving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: {
    api_key?: string | null;
    model: string;
    api_base: string;
  }) => Promise<boolean>;
}

export function SettingsModal({
  isOpen,
  settings,
  isSaving,
  error,
  onClose,
  onSave
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState("https://api.deepseek.com");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setApiKey("");
    setApiBase(settings?.api_base || "https://api.deepseek.com");
    setModel(settings?.model || "deepseek-v4-flash");
    setIsKeyVisible(false);
  }, [isOpen, settings]);

  if (!isOpen) {
    return null;
  }

  const save = async () => {
    const ok = await onSave({
      api_key: apiKey.trim() || null,
      api_base: apiBase.trim(),
      model: model.trim()
    });

    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-lg rounded-md border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-neutral-600" />
            <h2 className="text-sm font-semibold">设置</h2>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"
            onClick={onClose}
            aria-label="关闭设置"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {!settings?.has_deepseek_api_key ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
              请填写 DeepSeek API Key 后再使用 AI 问答功能。
            </div>
          ) : (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              当前已配置：{settings.masked_deepseek_api_key}
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">
              DeepSeek API Key
            </span>
            <div className="flex gap-2">
              <input
                className="h-10 min-w-0 flex-1 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
                type={isKeyVisible ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={
                  settings?.has_deepseek_api_key
                    ? "留空则继续使用当前 Key"
                    : "请输入 DeepSeek API Key"
                }
              />
              <button
                className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                onClick={() => setIsKeyVisible((current) => !current)}
                type="button"
                aria-label={isKeyVisible ? "隐藏 API Key" : "显示 API Key"}
                title={isKeyVisible ? "隐藏" : "显示"}
              >
                {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">模型</span>
            <input
              className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              value={model}
              onChange={(event) => setModel(event.target.value)}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-700">API Base</span>
            <input
              className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
              value={apiBase}
              onChange={(event) => setApiBase(event.target.value)}
            />
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            className="h-9 rounded-md border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={onClose}
            disabled={isSaving}
          >
            取消
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={save}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}
