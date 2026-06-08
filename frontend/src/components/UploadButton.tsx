import { Upload } from "lucide-react";

interface UploadButtonProps {
  isUploading: boolean;
  onClick: () => void;
}

export function UploadButton({ isUploading, onClick }: UploadButtonProps) {
  return (
    <button
      className="inline-flex h-8 items-center gap-2 rounded-md bg-neutral-950 px-3 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isUploading}
      onClick={onClick}
    >
      <Upload size={14} />
      {isUploading ? "导入中" : "上传文档"}
    </button>
  );
}
