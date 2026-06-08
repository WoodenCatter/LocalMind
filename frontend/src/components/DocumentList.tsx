import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  MoveRight,
  Trash2
} from "lucide-react";
import type { ReactNode } from "react";
import type { DocumentItem } from "../types/document";

const IMAGE_FILE_TYPES = new Set(["png", "jpg", "jpeg", "bmp", "webp"]);

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
  onPreview: (document: DocumentItem) => void;
  onShowInFolder: (document: DocumentItem) => void;
  onCopy: (document: DocumentItem) => void;
  onMove: (document: DocumentItem) => void;
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
  onPreview,
  onShowInFolder,
  onCopy,
  onMove
}: DocumentListProps) {
  if (isLoading) {
    return <div className="p-4 text-sm text-neutral-500">正在加载文档...</div>;
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 text-sm leading-6 text-neutral-500">
        {totalCount === 0
          ? "当前知识库还没有文档。点击上方按钮添加 PDF、DOCX、PPTX、TXT、MD 或图片文件。"
          : "没有找到匹配的文档。可以换一个关键词或文件类型。"}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3">
      {documents.map((document) => {
        const isSelected = selectedDocumentIds.includes(document.document_id);
        const isFileActionRunning = actionDocumentId === document.document_id;
        const canPreview = isPreviewSupported(document.file_type);
        const isImage = isImageFile(document.file_type);

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
                {isSelected ? (
                  <Check size={17} />
                ) : isImage ? (
                  <ImageIcon size={17} />
                ) : (
                  <FileText size={17} />
                )}
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
                  {isImage ? (
                    <>
                      <span>/</span>
                      <span>{getOcrLabel(document)}</span>
                    </>
                  ) : (
                    <>
                      <span>/</span>
                      <span>{document.chunk_count} chunks</span>
                      <span>/</span>
                      <span>{document.is_indexed ? "已索引" : "未索引"}</span>
                    </>
                  )}
                </div>
                {isImage ? (
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    {document.character_count > 0
                      ? `提取文字：${document.character_count}字`
                      : "未检测到可识别文字"}
                  </p>
                ) : null}
              </div>
              <div className="grid shrink-0 grid-cols-3 gap-1">
                <IconButton
                  title="打开文件"
                  disabled={isFileActionRunning}
                  onClick={() => onOpen(document)}
                >
                  <ExternalLink size={14} />
                </IconButton>
                <IconButton
                  title={canPreview ? "预览" : "暂不支持该格式预览"}
                  disabled={!canPreview}
                  onClick={() => onPreview(document)}
                >
                  <Eye size={14} />
                </IconButton>
                <IconButton
                  title="在文件夹中显示"
                  disabled={isFileActionRunning}
                  onClick={() => onShowInFolder(document)}
                >
                  <FolderOpen size={14} />
                </IconButton>
                <IconButton
                  title="复制到知识库"
                  disabled={isFileActionRunning}
                  onClick={() => onCopy(document)}
                >
                  <Copy size={14} />
                </IconButton>
                <IconButton
                  title="移动到知识库"
                  disabled={isFileActionRunning}
                  onClick={() => onMove(document)}
                >
                  <MoveRight size={14} />
                </IconButton>
                <IconButton
                  title="删除文档"
                  danger
                  disabled={deletingId === document.document_id}
                  onClick={() => onDelete(document)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  children,
  danger = false,
  disabled,
  title,
  onClick
}: {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      className={
        danger
          ? "flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          : "flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
      }
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={title}
      title={title}
    >
      {children}
    </button>
  );
}

function isImageFile(fileType: string) {
  return IMAGE_FILE_TYPES.has(fileType.toLowerCase());
}

function isPreviewSupported(fileType: string) {
  return ["pdf", "txt", "md", "docx", "pptx", ...IMAGE_FILE_TYPES].includes(
    fileType.toLowerCase()
  );
}

function getOcrLabel(document: DocumentItem) {
  if (document.ocr_status === "success" || document.character_count > 0) {
    return "OCR成功";
  }

  if (document.ocr_status === "empty") {
    return "OCR未识别到文字";
  }

  return document.is_indexed ? "OCR成功" : "OCR待处理";
}
