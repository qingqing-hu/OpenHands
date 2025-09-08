import React from "react";
import { User, Cpu } from "lucide-react";
import { InsightAIMessage } from "./insight-ai-message-filter";
import { InsightAICopyButton } from "../shared/insight-ai-copy-button";
import { InsightAIFileAttachments } from "../shared/insight-ai-file-attachments";
import { InsightAIStatusIndicator } from "../shared/insight-ai-status-indicator";
import { InsightAIErrorMessage } from "../shared/insight-ai-error-message";
import { decodeHtmlEntities } from "../shared/html-entity-decoder";

// Simple markdown detection - avoid heavy markdown parsing for simple text
const needsMarkdown = (content: string): boolean =>
  content.includes("```") ||
  content.includes("**") ||
  content.includes("*") ||
  content.includes("[") ||
  content.includes("#") ||
  content.includes("`");

// Memoized simple text renderer with HTML entity decoding
const SimpleTextRenderer = React.memo(({ content }: { content: string }) => (
  <div
    className="whitespace-pre-wrap break-words"
    dangerouslySetInnerHTML={{
      __html: decodeHtmlEntities(content),
    }}
  />
));

// Memoized markdown renderer - only loaded when needed
const MarkdownRenderer = React.memo(({ content }: { content: string }) => {
  const [Markdown, setMarkdown] = React.useState<any>(null);
  const [remarkGfm, setRemarkGfm] = React.useState<any>(null);
  const [remarkBreaks, setRemarkBreaks] = React.useState<any>(null);
  const [insightAICode, setInsightAICode] = React.useState<any>(null);

  React.useEffect(() => {
    // Load markdown dependencies asynchronously
    Promise.all([
      import("react-markdown"),
      import("remark-gfm"),
      import("remark-breaks"),
      import("../markdown/insight-ai-code"),
    ]).then(([md, gfm, breaks, code]) => {
      setMarkdown(() => md.default);
      setRemarkGfm(() => gfm.default);
      setRemarkBreaks(() => breaks.default);
      setInsightAICode(() => code.insightAICode);
    });
  }, []);

  if (!Markdown || !remarkGfm || !remarkBreaks || !insightAICode) {
    return <SimpleTextRenderer content={content} />;
  }

  return (
    <Markdown
      components={{ code: insightAICode }}
      remarkPlugins={[remarkGfm, remarkBreaks]}
    >
      {content}
    </Markdown>
  );
});

interface InsightAIChatMessagesProps {
  messages: InsightAIMessage[];
  isLoading: boolean;
}

// Optimized individual message component
const MessageItem = React.memo(
  ({
    message,
    isHovered,
    onMouseEnter,
    onMouseLeave,
  }: {
    message: InsightAIMessage;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  }) => {
    const formatTime = React.useMemo(
      () =>
        message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      [message.timestamp],
    );

    const hasComplexContent = React.useMemo(
      () =>
        needsMarkdown(message.content) ||
        message.imageUrls?.length ||
        message.fileUrls?.length,
      [message.content, message.imageUrls, message.fileUrls],
    );

    return (
      <div
        className={`flex items-start gap-3 ${
          message.type === "user" ? "flex-row-reverse" : ""
        }`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {/* Avatar */}
        <div
          className={`
        ${message.type === "user" ? "w-8 h-8" : "w-6 h-6"} rounded-full flex items-center justify-center flex-shrink-0
        ${
          message.type === "user"
            ? "bg-insight-primary text-white"
            : "bg-insight-surface-hover text-insight-text-secondary"
        }
      `}
        >
          {message.type === "user" ? (
            <User className="w-5 h-5" />
          ) : (
            <Cpu className="w-3 h-3" />
          )}
        </div>

        {/* Message Content */}
        <div
          className={`
        max-w-[80%] min-w-0 relative
        ${message.type === "user" ? "items-end" : "items-start"}
      `}
        >
          {/* Copy Button - only render when needed */}
          {isHovered && (
            <div
              className={`
            absolute -top-2 -right-2 z-10
            ${message.type === "user" ? "-left-2 -right-auto" : ""}
          `}
            >
              <InsightAICopyButton text={message.content} isVisible />
            </div>
          )}

          {message.isError && message.type !== "user" ? (
            // Error messages for non-user messages
            <InsightAIErrorMessage message={message} />
          ) : (
            <div
              className={`
              insight-ai-message ${message.type}
              ${message.type === "user" ? "ml-auto" : "mr-auto"}
            `}
            >
              {/* Message text - choose renderer based on content complexity */}
              <div className="break-words">
                {hasComplexContent ? (
                  <MarkdownRenderer content={message.content} />
                ) : (
                  <SimpleTextRenderer content={message.content} />
                )}
              </div>

              {/* File and Image attachments - only render if present */}
              {(message.imageUrls?.length || message.fileUrls?.length) && (
                <InsightAIFileAttachments
                  images={message.imageUrls}
                  files={message.fileUrls}
                />
              )}

              {/* Timestamp and Status */}
              <div
                className={`
                flex items-center gap-2 text-xs mt-2 opacity-70
                ${message.type === "user" ? "justify-end" : "justify-start"}
              `}
              >
                {message.status && (
                  <InsightAIStatusIndicator status={message.status} />
                )}
                <span>{formatTime}</span>
                {/* Show system text for system category messages */}
                {message.category === "system" && (
                  <span className="text-xs text-blue-600 ml-1 font-medium">
                    system
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

function InsightAIChatMessagesComponent({
  messages,
  isLoading,
}: InsightAIChatMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = React.useState<string | null>(
    null,
  );

  // Optimized scroll effect
  React.useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages?.length ?? 0]);

  // Optimize hover callbacks
  const handleMouseEnter = React.useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);

  const handleMouseLeave = React.useCallback(() => {
    setHoveredMessageId(null);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto insight-ai-scrollbar p-4 space-y-4">
      {(messages || []).map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isHovered={hoveredMessageId === message.id}
          onMouseEnter={() => handleMouseEnter(message.id)}
          onMouseLeave={handleMouseLeave}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-insight-surface-hover text-insight-text-secondary flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5" />
          </div>

          <div className="insight-ai-message assistant">
            <div className="flex items-center gap-1">
              <div className="insight-ai-skeleton w-2 h-2 rounded-full animate-pulse" />
              <div
                className="insight-ai-skeleton w-2 h-2 rounded-full animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="insight-ai-skeleton w-2 h-2 rounded-full animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

// Memoized component for better performance
export const InsightAIChatMessages = React.memo(
  InsightAIChatMessagesComponent,
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if messages content or loading state changes
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }

    if (!prevProps.messages && !nextProps.messages) {
      return true;
    }

    if (!prevProps.messages || !nextProps.messages) {
      return false;
    }

    if (prevProps.messages.length !== nextProps.messages.length) {
      return false;
    }

    // Deep comparison of message content
    for (let i = 0; i < prevProps.messages.length; i++) {
      const prevMsg = prevProps.messages[i];
      const nextMsg = nextProps.messages[i];

      if (
        prevMsg.id !== nextMsg.id ||
        prevMsg.content !== nextMsg.content ||
        prevMsg.type !== nextMsg.type ||
        prevMsg.status !== nextMsg.status ||
        prevMsg.isError !== nextMsg.isError
      ) {
        return false;
      }
    }

    return true;
  },
);
