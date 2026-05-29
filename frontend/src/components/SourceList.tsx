import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Source } from "../types/qa";
import { SourceCard } from "./SourceCard";

interface SourceListProps {
  sources: Source[];
}

export function SourceList({ sources }: SourceListProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (sources.length === 0) {
    return (
      <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
        未找到相关引用来源
      </div>
    );
  }

  return (
    <div className="mt-3">
      <button
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        引用来源 {sources.length}
      </button>
      {isOpen ? (
        <div className="mt-2 space-y-2">
          {sources.map((source, index) => (
            <SourceCard
              key={source.chunk_id}
              source={source}
              index={index + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
