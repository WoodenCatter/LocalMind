import type { ChatMessage as ChatMessageType, Source } from "../types/qa";
import { MarkdownAnswer } from "./MarkdownAnswer";
import { MessageActions } from "./MessageActions";
import { SourceList } from "./SourceList";

interface ChatMessageProps {
  message: ChatMessageType;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onPreviewSource: (source: Source) => void;
}

export function ChatMessage({
  message,
  isRegenerating,
  onRegenerate,
  onPreviewSource
}: ChatMessageProps) {
  if (message.role === "user") {
    return (
      <article className="ml-auto max-w-[78%] rounded-md bg-neutral-950 px-4 py-3 text-sm leading-6 text-white shadow-sm">
        <div className="mb-1 text-xs font-medium text-neutral-300">你</div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </article>
    );
  }

  if (message.role === "error") {
    return (
      <article className="mr-auto max-w-[88%] rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700 shadow-sm">
        <div className="mb-1 text-xs font-medium text-red-500">LocalMind</div>
        <div className="whitespace-pre-wrap">{message.content}</div>
      </article>
    );
  }

  return (
    <article className="mr-auto max-w-[88%] rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-800 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs font-medium text-neutral-500">LocalMind</div>
        <MessageActions
          content={message.content}
          canRegenerate={Boolean(message.requestContext)}
          isRegenerating={isRegenerating}
          onRegenerate={onRegenerate}
        />
      </div>
      <MarkdownAnswer content={message.content} />
      {message.sources ? (
        <SourceList sources={message.sources} onPreview={onPreviewSource} />
      ) : null}
    </article>
  );
}
