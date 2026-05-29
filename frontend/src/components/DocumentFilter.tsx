import { Search } from "lucide-react";
import type { DocumentTypeFilter } from "../types/document";

const filterOptions: Array<{ label: string; value: DocumentTypeFilter }> = [
  { label: "全部", value: "all" },
  { label: "PDF", value: "pdf" },
  { label: "DOCX", value: "docx" },
  { label: "PPTX", value: "pptx" },
  { label: "TXT", value: "txt" },
  { label: "MD", value: "md" }
];

interface DocumentFilterProps {
  searchQuery: string;
  typeFilter: DocumentTypeFilter;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: DocumentTypeFilter) => void;
}

export function DocumentFilter({
  searchQuery,
  typeFilter,
  onSearchChange,
  onTypeChange
}: DocumentFilterProps) {
  return (
    <div className="mt-3 space-y-3">
      <label className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
        <Search size={15} className="shrink-0" />
        <input
          className="min-w-0 flex-1 bg-transparent text-neutral-800 outline-none placeholder:text-neutral-400"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索文件名"
        />
      </label>
      <div className="grid grid-cols-3 gap-1">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            className={
              typeFilter === option.value
                ? "h-8 rounded-md bg-neutral-950 text-xs font-medium text-white"
                : "h-8 rounded-md border border-neutral-200 bg-white text-xs text-neutral-600 hover:bg-neutral-50"
            }
            onClick={() => onTypeChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
