import ReactMarkdown from "react-markdown";

interface MarkdownAnswerProps {
  content: string;
}

export function MarkdownAnswer({ content }: MarkdownAnswerProps) {
  return (
    <div className="markdown-answer">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
