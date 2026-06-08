import { Eye, EyeOff, Loader2, Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppSettings, LLMSettingsRequest, ModelProvider } from "../types/settings";

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings | null;
  isSaving: boolean;
  isTesting: boolean;
  error: string | null;
  testMessage: string | null;
  onClose: () => void;
  onSave: (values: LLMSettingsRequest) => Promise<boolean>;
  onTest: (values: LLMSettingsRequest) => Promise<boolean>;
}

export function SettingsModal({
  isOpen,
  settings,
  isSaving,
  isTesting,
  error,
  testMessage,
  onClose,
  onSave,
  onTest
}: SettingsModalProps) {
  const [provider, setProvider] = useState<ModelProvider>("deepseek");
  const [deepseekApiKey, setDeepseekApiKey] = useState("");
  const [deepseekApiBase, setDeepseekApiBase] = useState("https://api.deepseek.com");
  const [deepseekModel, setDeepseekModel] = useState("deepseek-chat");
  const [ollamaApiBase, setOllamaApiBase] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("qwen2.5:7b");
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setProvider(settings?.provider || "deepseek");
    setDeepseekApiKey("");
    setDeepseekApiBase(settings?.deepseek_api_base || "https://api.deepseek.com");
    setDeepseekModel(settings?.deepseek_model || "deepseek-chat");
    setOllamaApiBase(settings?.ollama_api_base || "http://localhost:11434");
    setOllamaModel(settings?.ollama_model || "qwen2.5:7b");
    setIsKeyVisible(false);
  }, [isOpen, settings]);

  if (!isOpen) {
    return null;
  }

  const values = buildRequest();

  const save = async () => {
    const ok = await onSave(values);
    if (ok) {
      onClose();
    }
  };

  const test = async () => {
    await onTest(values);
  };

  function buildRequest(): LLMSettingsRequest {
    return {
      provider,
      deepseek_api_key: deepseekApiKey.trim() || null,
      deepseek_api_base: deepseekApiBase.trim(),
      deepseek_model: deepseekModel.trim(),
      ollama_api_base: ollamaApiBase.trim(),
      ollama_model: ollamaModel.trim()
    };
  }

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
          <div className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">模型提供商</span>
            <div className="grid grid-cols-2 gap-2">
              <ProviderButton
                active={provider === "deepseek"}
                title="DeepSeek API"
                description="云端 API，速度稳定"
                onClick={() => setProvider("deepseek")}
              />
              <ProviderButton
                active={provider === "ollama"}
                title="Ollama 本地模型"
                description="本机运行，数据更本地"
                onClick={() => setProvider("ollama")}
              />
            </div>
          </div>

          {provider === "deepseek" ? (
            <DeepSeekFields
              settings={settings}
              apiKey={deepseekApiKey}
              apiBase={deepseekApiBase}
              model={deepseekModel}
              isKeyVisible={isKeyVisible}
              onApiKeyChange={setDeepseekApiKey}
              onApiBaseChange={setDeepseekApiBase}
              onModelChange={setDeepseekModel}
              onToggleKeyVisible={() => setIsKeyVisible((current) => !current)}
            />
          ) : (
            <OllamaFields
              apiBase={ollamaApiBase}
              model={ollamaModel}
              onApiBaseChange={setOllamaApiBase}
              onModelChange={setOllamaModel}
            />
          )}

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          {testMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-700">
              {testMessage}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            className="h-9 rounded-md border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={onClose}
            disabled={isSaving || isTesting}
          >
            取消
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={test}
            disabled={isSaving || isTesting}
          >
            {isTesting ? <Loader2 size={15} className="animate-spin" /> : null}
            测试连接
          </button>
          <button
            className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={save}
            disabled={isSaving || isTesting}
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : null}
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
}

function ProviderButton({
  active,
  title,
  description,
  onClick
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? "rounded-md border border-neutral-950 bg-neutral-50 px-3 py-2 text-left"
          : "rounded-md border border-neutral-200 bg-white px-3 py-2 text-left hover:bg-neutral-50"
      }
      onClick={onClick}
    >
      <span className="block text-sm font-medium text-neutral-900">{title}</span>
      <span className="mt-1 block text-xs text-neutral-500">{description}</span>
    </button>
  );
}

function DeepSeekFields({
  settings,
  apiKey,
  apiBase,
  model,
  isKeyVisible,
  onApiKeyChange,
  onApiBaseChange,
  onModelChange,
  onToggleKeyVisible
}: {
  settings: AppSettings | null;
  apiKey: string;
  apiBase: string;
  model: string;
  isKeyVisible: boolean;
  onApiKeyChange: (value: string) => void;
  onApiBaseChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onToggleKeyVisible: () => void;
}) {
  return (
    <div className="space-y-4">
      {!settings?.has_deepseek_api_key ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
          DeepSeek 模式需要填写 API Key 后才能使用 AI 问答功能。
        </div>
      ) : (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          当前已配置：{settings.masked_deepseek_api_key}
        </div>
      )}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-neutral-700">DeepSeek API Key</span>
        <div className="flex gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
            type={isKeyVisible ? "text" : "password"}
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder={
              settings?.has_deepseek_api_key
                ? "留空则继续使用当前 Key"
                : "请输入 DeepSeek API Key"
            }
          />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            onClick={onToggleKeyVisible}
            type="button"
            aria-label={isKeyVisible ? "隐藏 API Key" : "显示 API Key"}
            title={isKeyVisible ? "隐藏" : "显示"}
          >
            {isKeyVisible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </label>

      <TextField label="DeepSeek Base URL" value={apiBase} onChange={onApiBaseChange} />
      <TextField label="DeepSeek 模型名" value={model} onChange={onModelChange} />
    </div>
  );
}

function OllamaFields({
  apiBase,
  model,
  onApiBaseChange,
  onModelChange
}: {
  apiBase: string;
  model: string;
  onApiBaseChange: (value: string) => void;
  onModelChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-600">
        使用 Ollama 前，请先启动 Ollama，并提前拉取模型，例如：
        <span className="ml-1 font-mono text-neutral-900">ollama pull qwen2.5:7b</span>
      </div>
      <TextField label="Ollama Base URL" value={apiBase} onChange={onApiBaseChange} />
      <TextField
        label="Ollama 模型名"
        value={model}
        onChange={onModelChange}
        placeholder="qwen2.5:7b"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
