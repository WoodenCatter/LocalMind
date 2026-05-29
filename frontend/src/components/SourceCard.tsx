import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useState } from "react";
import { getApiErrorMessage } from "../api/client";
import { openDocument } from "../api/documents";
import type { Source } from "../types/qa";

interface SourceCardProps {
  source: Source;
  index: number;
}

function getLocationLabel(source: Source) {
  const fileType = source.file_type?.toLowerCase();

  if (["txt", "md", "docx"].includes(fileType) && source.page === 1) {
    return "文档内容";
  }

  if (fileType === "pptx") {
    return `Slide ${source.page ?? "?"}`;
  }

  if (fileType === "pdf") {
    return `Page ${source.page ?? "?"}`;
  }

  return source.page ? `Page ${source.page}` : "文档内容";
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const fullText = source.text || source.text_preview;
  const shouldShowToggle = fullText.length > 180;
  const visibleText =
    isExpanded || !shouldShowToggle ? fullText : `${fullText.slice(0, 180)}...`;

  const handleOpenSource = async () => {
    setIsOpening(true);
    setActionMessage(null);

    try {
      await openDocument(source.document_id);
      setActionMessage("已请求系统打开来源文件。");
    } catch (error) {
      setActionMessage(`打开来源文件失败：${getApiErrorMessage(error)}`);
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span className="rounded bg-neutral-900 px-1.5 py-0.5 font-medium text-white">
          Source {index}
        </span>
        <span className="font-medium text-neutral-800">
          {source.original_filename || source.document_id}
        </span>
        <span>/</span>
        <span>{getLocationLabel(source)}</span>
        <span>/</span>
        <span>Chunk {source.chunk_index}</span>
        <span>/</span>
        <span>Score {source.score.toFixed(2)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-neutral-600">
        {visibleText}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {shouldShowToggle ? (
          <button
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-950"
            onClick={() => setIsExpanded((current) => !current)}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {isExpanded ? "收起原文" : "展开原文"}
          </button>
        ) : null}
        <button
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-950 disabled:opacity-60"
          disabled={isOpening}
          onClick={handleOpenSource}
        >
          <ExternalLink size={13} />
          {isOpening ? "正在打开..." : "打开来源文件"}
        </button>
      </div>
      {actionMessage ? (
        <p className="mt-2 text-xs leading-5 text-neutral-500">{actionMessage}</p>
      ) : null}
    </div>
  );
}
