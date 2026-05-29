import { Upload } from "lucide-react";
import { useRef } from "react";

interface UploadButtonProps {
  isUploading: boolean;
  onUpload: (file: File) => void;
}

export function UploadButton({ isUploading, onUpload }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <button
        className="inline-flex h-8 items-center gap-2 rounded-md bg-neutral-950 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        <Upload size={14} />
        {isUploading ? "导入中" : "上传文档"}
      </button>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".pdf,.docx,.pptx,.txt,.md"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onUpload(file);
            event.target.value = "";
          }
        }}
      />
    </>
  );
}

