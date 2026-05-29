import { BookOpen, RefreshCw, X } from "lucide-react";
import type { DocumentItem, DocumentTypeFilter } from "../types/document";
import { DocumentFilter } from "./DocumentFilter";
import { DocumentList } from "./DocumentList";
import { UploadButton } from "./UploadButton";

interface SidebarProps {
  documents: DocumentItem[];
  filteredDocuments: DocumentItem[];
  isLoading: boolean;
  isUploading: boolean;
  deletingId: string | null;
  actionDocumentId: string | null;
  error: string | null;
  notice: string | null;
  searchQuery: string;
  typeFilter: DocumentTypeFilter;
  selectedDocumentIds: string[];
  onSearchChange: (value: string) => void;
  onTypeChange: (value: DocumentTypeFilter) => void;
  onToggleSelect: (documentId: string) => void;
  onClearSelection: () => void;
  onUpload: (file: File) => void;
  onDelete: (document: DocumentItem) => void;
  onOpen: (document: DocumentItem) => void;
  onShowInFolder: (document: DocumentItem) => void;
  onRefresh: () => void;
}

export function Sidebar({
  documents,
  filteredDocuments,
  isLoading,
  isUploading,
  deletingId,
  actionDocumentId,
  error,
  notice,
  searchQuery,
  typeFilter,
  selectedDocumentIds,
  onSearchChange,
  onTypeChange,
  onToggleSelect,
  onClearSelection,
  onUpload,
  onDelete,
  onOpen,
  onShowInFolder,
  onRefresh
}: SidebarProps) {
  return (
    <aside className="flex min-h-0 flex-col border-r border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BookOpen size={17} className="shrink-0 text-neutral-600" />
            <h2 className="truncate text-sm font-semibold">文档库</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-60"
              disabled={isLoading}
              onClick={onRefresh}
              title="刷新文档列表"
              aria-label="刷新文档列表"
            >
              <RefreshCw size={14} />
            </button>
            <UploadButton isUploading={isUploading} onUpload={onUpload} />
          </div>
        </div>

        <DocumentFilter
          searchQuery={searchQuery}
          typeFilter={typeFilter}
          onSearchChange={onSearchChange}
          onTypeChange={onTypeChange}
        />

        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>
            共 {documents.length} 个文档
            {selectedDocumentIds.length > 0
              ? ` · 已选择 ${selectedDocumentIds.length} 个`
              : ""}
          </span>
          {selectedDocumentIds.length > 0 ? (
            <button
              className="inline-flex items-center gap-1 text-neutral-700 hover:text-neutral-950"
              onClick={onClearSelection}
            >
              <X size={13} />
              清除
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-700">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <DocumentList
          documents={filteredDocuments}
          totalCount={documents.length}
          isLoading={isLoading}
          deletingId={deletingId}
          actionDocumentId={actionDocumentId}
          selectedDocumentIds={selectedDocumentIds}
          onToggleSelect={onToggleSelect}
          onDelete={onDelete}
          onOpen={onOpen}
          onShowInFolder={onShowInFolder}
        />
      </div>
    </aside>
  );
}
