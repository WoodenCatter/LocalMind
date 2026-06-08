import { FileText, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PendingImportFile } from "../types/document";
import type { KnowledgeBaseItem } from "../types/knowledgeBase";

interface KnowledgeBaseSelectModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  knowledgeBases: KnowledgeBaseItem[];
  defaultSelectedIds: string[];
  confirmText?: string;
  pendingFiles?: PendingImportFile[];
  isBusy?: boolean;
  onChooseFiles?: () => void;
  onRemovePendingFile?: (index: number) => void;
  onClose: () => void;
  onConfirm: (knowledgeBaseIds: string[]) => void;
}

export function KnowledgeBaseSelectModal({
  isOpen,
  title,
  description,
  knowledgeBases,
  defaultSelectedIds,
  confirmText = "确认",
  pendingFiles = [],
  isBusy = false,
  onChooseFiles,
  onRemovePendingFile,
  onClose,
  onConfirm
}: KnowledgeBaseSelectModalProps) {
  const isUploadMode = Boolean(onChooseFiles);
  const defaultKnowledgeBase = knowledgeBases.find((item) => item.is_default);
  const lockedKnowledgeBaseId = isUploadMode ? defaultKnowledgeBase?.id : undefined;
  const initialSelectedIds = useMemo(
    () => mergeSelectedIds(defaultSelectedIds, lockedKnowledgeBaseId),
    [defaultSelectedIds, lockedKnowledgeBaseId]
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const initialSelectedKey = initialSelectedIds.join("|");

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
    }
  }, [initialSelectedKey, isOpen]);

  if (!isOpen) {
    return null;
  }

  const toggle = (id: string) => {
    if (id === lockedKnowledgeBaseId) {
      return;
    }

    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const confirm = () => {
    onConfirm(mergeSelectedIds(selectedIds, lockedKnowledgeBaseId));
  };

  const canConfirm =
    selectedIds.length > 0 && !isBusy && (!isUploadMode || pendingFiles.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-md rounded-md bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-neutral-500">{description}</p>
          ) : null}
        </div>

        <div className="max-h-[420px] overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            {knowledgeBases.map((knowledgeBase) => {
              const isLocked = knowledgeBase.id === lockedKnowledgeBaseId;
              return (
                <label
                  key={knowledgeBase.id}
                  className={
                    isLocked
                      ? "flex cursor-default items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
                      : "flex cursor-pointer items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50"
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(knowledgeBase.id)}
                      disabled={isLocked}
                      onChange={() => toggle(knowledgeBase.id)}
                    />
                    <span className="truncate">{knowledgeBase.name}</span>
                    {isLocked ? (
                      <span className="shrink-0 rounded bg-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-600">
                        必选
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-neutral-500">
                    {knowledgeBase.document_count} 文件
                  </span>
                </label>
              );
            })}
          </div>

          {isUploadMode ? (
            <div className="mt-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-800">待导入文件</p>
                <span className="text-xs text-neutral-500">{pendingFiles.length} 个</span>
              </div>

              {pendingFiles.length > 0 ? (
                <div className="max-h-36 space-y-2 overflow-y-auto">
                  {pendingFiles.map((file, index) => (
                    <div
                      key={`${file.id}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText size={14} className="shrink-0 text-neutral-500" />
                        <span className="truncate">{file.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] uppercase text-neutral-500">
                          {getFileExtension(file.name)}
                        </span>
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          onClick={() => onRemovePendingFile?.(index)}
                          title="移除"
                        >
                          <X size={13} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-dashed border-neutral-300 bg-white px-3 py-3 text-sm text-neutral-500">
                  还没有选择文件。可以先点击下方“继续选择文件”。
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            className="h-9 rounded-md border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            disabled={isBusy}
            onClick={onClose}
          >
            取消
          </button>
          {onChooseFiles ? (
            <button
              type="button"
              className="h-9 rounded-md border border-neutral-200 px-3 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
              disabled={isBusy}
              onClick={onChooseFiles}
            >
              继续选择文件
            </button>
          ) : null}
          <button
            type="button"
            className="h-9 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white disabled:opacity-50"
            disabled={!canConfirm}
            onClick={confirm}
          >
            {isBusy ? "导入中..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function mergeSelectedIds(ids: string[], lockedId?: string) {
  const merged = lockedId ? [lockedId, ...ids] : ids;
  return Array.from(new Set(merged.filter(Boolean)));
}

function getFileExtension(filename: string) {
  const extension = filename.split(".").pop();
  return extension ? extension.toLowerCase() : "file";
}
