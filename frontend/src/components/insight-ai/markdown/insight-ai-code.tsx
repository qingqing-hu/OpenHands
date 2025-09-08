import React from "react";
import { ExtraProps } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";

// InsightAI light theme - soft and gentle colors
const insightAITheme = {
  ...vs,
  'code[class*="language-"]': {
    ...vs['code[class*="language-"]'],
    color: "#495057",
    background: "#f8f9fa",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },
  'pre[class*="language-"]': {
    ...vs['pre[class*="language-"]'],
    color: "#495057",
    background: "#f8f9fa",
    borderRadius: "6px",
  },
  "token.comment": {
    color: "#6c757d",
    fontStyle: "italic",
  },
  "token.keyword": {
    color: "#6f42c1",
    fontWeight: "bold",
  },
  "token.string": {
    color: "#198754",
  },
  "token.number": {
    color: "#fd7e14",
  },
  "token.function": {
    color: "#0d6efd",
  },
  "token.operator": {
    color: "#495057",
  },
  "token.punctuation": {
    color: "#6c757d",
  },
};

// Content type detection
const detectLanguage = (content: string): string => {
  const trimmedContent = content.trim();

  // JSON detection
  if (
    (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) ||
    (trimmedContent.startsWith("[") && trimmedContent.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmedContent);
      return "json";
    } catch {
      // Not valid JSON, continue detection
    }
  }

  // SQL detection (case insensitive)
  const sqlKeywords = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "CREATE",
    "DROP",
    "ALTER",
    "FROM",
    "WHERE",
  ];
  const upperContent = trimmedContent.toUpperCase();
  if (sqlKeywords.some((keyword) => upperContent.includes(keyword))) {
    return "sql";
  }

  // Python detection
  if (
    trimmedContent.includes("def ") ||
    trimmedContent.includes("import ") ||
    trimmedContent.includes("from ") ||
    trimmedContent.includes("print(") ||
    trimmedContent.includes("if __name__")
  ) {
    return "python";
  }

  // JavaScript/TypeScript detection
  if (
    trimmedContent.includes("function ") ||
    trimmedContent.includes("const ") ||
    trimmedContent.includes("let ") ||
    trimmedContent.includes("var ") ||
    trimmedContent.includes("=>") ||
    trimmedContent.includes("console.log")
  ) {
    return "javascript";
  }

  // HTML detection
  if (
    trimmedContent.includes("<") &&
    trimmedContent.includes(">") &&
    (trimmedContent.includes("<html>") ||
      trimmedContent.includes("<div") ||
      trimmedContent.includes("<span") ||
      trimmedContent.includes("<!DOCTYPE"))
  ) {
    return "html";
  }

  // CSS detection
  if (
    trimmedContent.includes("{") &&
    trimmedContent.includes("}") &&
    trimmedContent.includes(":") &&
    trimmedContent.includes(";")
  ) {
    return "css";
  }

  // XML detection
  if (
    trimmedContent.includes("<?xml") ||
    (trimmedContent.includes("<") &&
      trimmedContent.includes("/>") &&
      !trimmedContent.includes("html"))
  ) {
    return "xml";
  }

  // Markdown detection
  if (
    trimmedContent.includes("#") ||
    trimmedContent.includes("**") ||
    trimmedContent.includes("*") ||
    (trimmedContent.includes("[") && trimmedContent.includes("]("))
  ) {
    return "markdown";
  }

  // Default to text
  return "text";
};

/**
 * InsightAI code component for markdown rendering with syntax highlighting
 * Adapted from OpenHands frontend code.tsx
 */
export function insightAICode({
  children,
  className,
}: React.ClassAttributes<HTMLElement> &
  React.HTMLAttributes<HTMLElement> &
  ExtraProps) {
  const match = /language-(\w+)/.exec(className || ""); // get the language

  if (!match) {
    const isMultiline = String(children).includes("\n");

    if (!isMultiline) {
      return (
        <code
          className={className}
          style={{
            backgroundColor: "#f8f9fa",
            padding: "0.2em 0.4em",
            borderRadius: "4px",
            color: "#495057",
          }}
        >
          {children}
        </code>
      );
    }

    return (
      <pre
        style={{
          backgroundColor: "#f8f9fa",
          padding: "1em",
          borderRadius: "6px",
          color: "#495057",
          overflow: "auto",
          maxWidth: "100%",
        }}
      >
        <code className={className}>{String(children).replace(/\n$/, "")}</code>
      </pre>
    );
  }

  // Auto-detect language if not specified
  const detectedLanguage = match?.[1] || detectLanguage(String(children));

  return (
    <div className="max-w-full overflow-x-auto">
      <SyntaxHighlighter
        className="rounded-lg"
        style={insightAITheme}
        language={detectedLanguage}
        PreTag="div"
        customStyle={{
          maxWidth: "100%",
          overflowX: "auto",
          background: "#f8f9fa",
          borderRadius: "6px",
          color: "#495057",
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}
