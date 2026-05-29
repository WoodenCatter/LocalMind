import { Loader2, MessageSquare, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ChatMessage as ChatMessageType,
  RetrievalSettings
} from "../types/qa";
import { ChatMessage } from "./ChatMessage";

const topKOptions = [3, 5, 8, 10];
const maxDistanceOptions: Array<{ label: string; value: number | null }> = [
  { label: "默认 0.8", value: null },
  { label: "0.6 更严格", value: 0.6 },
  { label: "0.8 推荐", value: 0.8 },
  { label: "1.0 较宽松", value: 1.0 },
  { label: "1.2 很宽松", value: 1.2 }
];

const topKHelp =
  "检索片段数：最多从知识库里取回多少个相关文本片段。数值越大，参考内容越多，但也可能带入弱相关内容。";
const maxDistanceHelp =
  "相关性阈值：用于过滤不够相关的文本片段。distance 越小表示越相关；阈值越低越严格，阈值越高越宽松。";

interface ChatPanelProps {
  messages: ChatMessageType[];
  isAsking: boolean;
  regeneratingId: string | null;
  selectedDocumentCount: number;
  isBackendConnected: boolean;
  hasDeepSeekApiKey: boolean;
  retrievalSettings: RetrievalSettings;
  onRetrievalSettingsChange: (settings: RetrievalSettings) => void;
  onAsk: (question: string) => void;
  onRegenerate: (messageId: string) => void;
  onClear: () => void;
  onClearSelection: () => void;
}

export function ChatPanel({
  messages,
  isAsking,
  regeneratingId,
  selectedDocumentCount,
  isBackendConnected,
  hasDeepSeekApiKey,
  retrievalSettings,
  onRetrievalSettingsChange,
  onAsk,
  onRegenerate,
  onClear,
  onClearSelection
}: ChatPanelProps) {
  const [question, setQuestion] = useState("");
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const modeText =
    selectedDocumentCount === 0
      ? "全库问答"
      : selectedDocumentCount === 1
        ? "已选择 1 个文档"
        : `已选择 ${selectedDocumentCount} 个文档`;

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isAsking, regeneratingId]);

  const sendQuestion = () => {
    const trimmed = question.trim();
    if (!trimmed || isAsking || !isBackendConnected || !hasDeepSeekApiKey) {
      return;
    }

    onAsk(trimmed);
    setQuestion("");
  };

  return (
    <section className="flex min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-neutral-600" />
          <h2 className="text-sm font-semibold">知识库问答</h2>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 text-xs text-neutral-600">
            {modeText}
            {selectedDocumentCount > 0 ? (
              <button
                className="flex h-5 w-5 items-center justify-center rounded text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
                onClick={onClearSelection}
                title="取消选择"
                aria-label="取消选择"
              >
                <X size={12} />
              </button>
            ) : null}
          </span>
          <label
            className="flex items-center gap-1.5 text-xs text-neutral-500"
            title={topKHelp}
          >
            检索片段数
            <select
              className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-700 outline-none"
              value={retrievalSettings.topK}
              disabled={isAsking}
              title={topKHelp}
              onChange={(event) =>
                onRetrievalSettingsChange({
                  ...retrievalSettings,
                  topK: Number(event.target.value)
                })
              }
            >
              {topKOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label
            className="flex items-center gap-1.5 text-xs text-neutral-500"
            title={maxDistanceHelp}
          >
            相关性阈值
            <select
              className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-700 outline-none"
              value={retrievalSettings.maxDistance ?? "default"}
              disabled={isAsking}
              title={maxDistanceHelp}
              onChange={(event) => {
                const nextValue = event.target.value;
                onRetrievalSettingsChange({
                  ...retrievalSettings,
                  maxDistance:
                    nextValue === "default" ? null : Number(nextValue)
                });
              }}
            >
              {maxDistanceOptions.map((option) => (
                <option
                  key={option.value ?? "default"}
                  value={option.value ?? "default"}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
            disabled={messages.length === 0 || isAsking}
            onClick={onClear}
          >
            <Trash2 size={13} />
            清空对话
          </button>
        </div>
      </div>

      {!isBackendConnected ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          后端未连接。请先启动后端服务，再刷新或重新检测连接。
        </div>
      ) : null}

      {isBackendConnected && !hasDeepSeekApiKey ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          尚未配置 DeepSeek API Key。请点击右上角“设置”填写后再使用 AI 问答功能。
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 ? (
            <div className="rounded-md border border-dashed border-neutral-300 bg-white p-6 text-sm leading-6 text-neutral-500">
              输入一个问题，LocalMind 会从当前问答范围内检索相关内容并调用 DeepSeek 回答。
            </div>
          ) : null}

          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isRegenerating={regeneratingId === message.id}
              onRegenerate={() => onRegenerate(message.id)}
            />
          ))}

          {isAsking ? (
            <div className="mr-auto flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-500 shadow-sm">
              <Loader2 size={16} className="animate-spin" />
              正在检索文档并生成回答...
            </div>
          ) : null}
          <div ref={scrollAnchorRef} />
        </div>
      </div>

      <div className="border-t border-neutral-200 bg-white p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-2">
          <textarea
            className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-5 outline-none placeholder:text-neutral-400 disabled:cursor-not-allowed"
            placeholder={
              !isBackendConnected
                ? "请先启动后端服务"
                : hasDeepSeekApiKey
                  ? "向本地知识库提问..."
                  : "请先在设置中填写 DeepSeek API Key"
            }
            value={question}
            disabled={isAsking || !isBackendConnected || !hasDeepSeekApiKey}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendQuestion();
              }
            }}
          />
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={
              !question.trim() ||
              isAsking ||
              !isBackendConnected ||
              !hasDeepSeekApiKey
            }
            onClick={sendQuestion}
            aria-label="发送问题"
          >
            {isAsking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </section>
  );
}
