import { Check, ExternalLink, FileText, FolderOpen, Trash2 } from "lucide-react";
import type { DocumentItem } from "../types/document";

interface DocumentListProps {
  documents: DocumentItem[];
  isLoading: boolean;
  deletingId: string | null;
  actionDocumentId: string | null;
  selectedDocumentIds: string[];
  totalCount: number;
  onToggleSelect: (documentId: string) => void;
  onDelete: (document: DocumentItem) => void;
  onOpen: (document: DocumentItem) => void;
  onShowInFolder: (document: DocumentItem) => void;
}

export function DocumentList({
  documents,
  isLoading,
  deletingId,
  actionDocumentId,
  selectedDocumentIds,
  totalCount,
  onToggleSelect,
  onDelete,
  onOpen,
  onShowInFolder
}: DocumentListProps) {
  if (isLoading) {
    return <div className="p-4 text-sm text-neutral-500">正在加载文档...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 text-sm leading-6 text-neutral-500">
        {totalCount === 0
          ? "还没有导入文档。点击上方按钮添加 PDF、DOCX、PPTX、TXT 或 MD 文件。"
          : "没有找到匹配的文档。可以换一个关键词或文件类型。"}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {documents.map((document) => {
        const isSelected = selectedDocumentIds.includes(document.document_id);
        const isFileActionRunning = actionDocumentId === document.document_id;

        return (
          <div
            key={document.document_id}
            role="button"
            tabIndex={0}
            className={
              isSelected
                ? "w-full rounded-md border border-neutral-950 bg-neutral-50 p-3 text-left shadow-sm"
                : "w-full rounded-md border border-neutral-200 bg-white p-3 text-left hover:border-neutral-300 hover:bg-neutral-50"
            }
            onClick={() => onToggleSelect(document.document_id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggleSelect(document.document_id);
              }
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  isSelected
                    ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-950 text-white"
                    : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-700"
                }
              >
                {isSelected ? <Check size={17} /> : <FileText size={17} />}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  title={document.original_filename}
                >
                  {document.original_filename}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span>{document.file_type.toUpperCase()}</span>
                  <span>/</span>
                  <span>{document.chunk_count} chunks</span>
                  <span>/</span>
                  <span>{document.is_indexed ? "已索引" : "未索引"}</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
                  disabled={isFileActionRunning}
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(document);
                  }}
                  aria-label={`打开文件 ${document.original_filename}`}
                  title="打开文件"
                >
                  <ExternalLink size={14} />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
                  disabled={isFileActionRunning}
                  onClick={(event) => {
                    event.stopPropagation();
                    onShowInFolder(document);
                  }}
                  aria-label={`在文件夹中显示 ${document.original_filename}`}
                  title="在文件夹中显示"
                >
                  <FolderOpen size={14} />
                </button>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  disabled={deletingId === document.document_id}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(document);
                  }}
                  aria-label={`删除 ${document.original_filename}`}
                  title="删除文档"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
