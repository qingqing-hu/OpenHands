import React from "react";
import { VscRobot } from "react-icons/vsc";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  InsightAIMessage,
  InsightAIMessageCategory,
} from "./insight-ai-message-filter";
import { insightAICode } from "../markdown/insight-ai-code";
import { InsightAIStatusIndicator } from "../shared/insight-ai-status-indicator";
import { InsightAIUnifiedMessage } from "./insight-ai-unified-message";
import { InsightAIErrorMessage } from "../shared/insight-ai-error-message";
// import { useScrollbarVisibility } from "../../hooks/insight-ai/use-scrollbar-visibility";

interface InsightAICollapsibleMessageProps {
  messages: InsightAIMessage[];
  isLoading: boolean;
  isAwaitingUserConfirmation?: boolean;
  onSend?: (event: Record<string, unknown>) => void;
}

// Category styling configuration
const getCategoryConfig = (category: InsightAIMessageCategory) => {
  switch (category) {
    case "command":
      return {
        label: "Command",
        bgColor: "",
        textColor: "",
        customStyle: {
          backgroundColor: "#e0f2f7", // Light version of #146C91
          color: "#146C91",
        },
      };
    case "sql":
      return {
        label: "SQL",
        bgColor: "bg-teal-100",
        textColor: "text-teal-700",
      };
    case "code":
      return {
        label: "Code",
        bgColor: "bg-purple-100",
        textColor: "text-purple-700",
      };
    case "edit":
      return {
        label: "Edit",
        bgColor: "bg-indigo-100",
        textColor: "text-indigo-700",
      };
    case "json":
      return {
        label: "JSON",
        bgColor: "bg-amber-100",
        textColor: "text-amber-700",
      };
    case "mcp":
      return {
        label: "MCP",
        bgColor: "bg-cyan-100",
        textColor: "text-cyan-700",
      };
    case "think":
      return {
        label: "Thinking",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
      };
    case "error":
      return {
        label: "Error",
        bgColor: "bg-red-100",
        textColor: "text-red-700",
      };
    case "system":
      return {
        label: "System",
        bgColor: "bg-blue-100",
        textColor: "text-blue-700",
      };
    case "browse":
      return {
        label: "Browse",
        bgColor: "bg-green-100",
        textColor: "text-green-700",
      };
    case "message":
    default:
      return {
        label: "Message",
        bgColor: "bg-white",
        textColor: "text-gray-600",
      };
  }
};

// Full message with markdown (only rendered when expanded) - with width constraints and horizontal scrolling
const ExpandedMessage = React.memo(({ content }: { content: string }) => (
  <div className="text-xs">
    <div className="overflow-x-auto">
      <Markdown
        components={{
          code: insightAICode,
          // Override default paragraph to match smaller expanded content size
          p: ({ children }) => (
            <p className="text-xs break-words whitespace-pre-wrap overflow-wrap-anywhere mb-2">
              {children}
            </p>
          ),
          // Override headings to match smaller text size
          h1: ({ children }) => (
            <h1 className="text-xs font-semibold break-words mb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-semibold break-words mb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-medium break-words mb-1">{children}</h3>
          ),
          // Override pre to handle long content with horizontal scrolling - soft style
          pre: ({ children }) => (
            <pre
              className="text-xs overflow-x-auto whitespace-pre p-3 rounded-md"
              style={{
                backgroundColor: "#f8f9fa",
                color: "#495057",
              }}
            >
              <code className="text-xs">{children}</code>
            </pre>
          ),
          // Override lists to match smaller text size
          ul: ({ children }) => (
            <ul className="text-xs break-words mb-2 pl-4">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="text-xs break-words mb-2 pl-4">{children}</ol>
          ),
          // Override tables to handle overflow - remove all borders
          table: ({ children }) => (
            <div className="overflow-x-auto mb-2">
              <table className="text-xs">{children}</table>
            </div>
          ),
          // Override table cells to remove borders
          th: ({ children }) => (
            <th className="text-xs p-2 text-left">{children}</th>
          ),
          td: ({ children }) => <td className="text-xs p-2">{children}</td>,
          // Override blockquotes to remove borders
          blockquote: ({ children }) => (
            <blockquote className="text-xs pl-4 italic text-gray-600 mb-2">
              {children}
            </blockquote>
          ),
          // Override horizontal rules to remove borders
          hr: () => (
            <hr
              className="my-2 opacity-30"
              style={{
                border: "none",
                height: "1px",
                backgroundColor: "#e5e7eb",
              }}
            />
          ),
        }}
        remarkPlugins={[remarkGfm, remarkBreaks]}
      >
        {content}
      </Markdown>
    </div>
  </div>
));

// Function to determine category for expandable messages based on title and content
const getExpandableMessageCategory = (
  message: InsightAIMessage,
): InsightAIMessageCategory => {
  // Special handling for condensation messages - always treat as system
  if (
    message.originalEvent &&
    (message.originalEvent as any).action === "condensation"
  ) {
    return "system";
  }

  const titleContent =
    message.content.split("\n")[0].trim() || message.content.trim();
  const expandedContent = message.detailedContent || message.content;
  const titleLower = titleContent.toLowerCase();
  const contentLower = expandedContent.toLowerCase();

  // Check title/operation context first
  if (
    titleLower.includes("读取") ||
    titleLower.includes("写入") ||
    titleLower.includes("编辑")
  ) {
    // Check file extension in title
    const codeFileExtensions =
      /\.(py|js|ts|jsx|tsx|html|css|java|cpp|c|go|rs|rb|php|swift|kt|dart|scala|sh|sql)(\s|$|:|\/)/i;
    const documentExtensions = /\.(md|txt|rst|doc|docx|pdf)(\s|$|:|\/)/i;

    if (codeFileExtensions.test(titleContent)) {
      return "code";
    }
    if (documentExtensions.test(titleContent)) {
      return "message";
    }
  }

  // Check for SQL operations
  const sqlKeywords = [
    "select ",
    "insert ",
    "update ",
    "delete ",
    "create table",
    "drop table",
    "alter table",
  ];
  const hasSQLKeywords = sqlKeywords.some((keyword) =>
    contentLower.includes(keyword),
  );
  if (
    hasSQLKeywords &&
    (titleLower.includes("sql") ||
      titleLower.includes("查询") ||
      titleLower.includes("数据库"))
  ) {
    return "sql";
  }

  // Check for JSON output
  if (contentLower.length > 0) {
    try {
      const parsed = JSON.parse(expandedContent.trim());
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (titleLower.includes("输出") ||
          titleLower.includes("output") ||
          titleLower.includes("result"))
      ) {
        return "json";
      }
    } catch {
      // Not JSON
    }
  }

  // Check for command execution
  if (
    titleLower.includes("执行命令") ||
    titleLower.includes("运行") ||
    titleLower.includes("command")
  ) {
    return "command";
  }

  // Check for code content (but not in documentation)
  const hasCodeKeywords =
    /(def |function |class |import |from |<html|<!DOCTYPE|<script|<style)/i.test(
      contentLower,
    );
  if (
    hasCodeKeywords &&
    !/(\.md|\.txt|markdown)(\s|$|:|\/)/i.test(titleContent)
  ) {
    return "code";
  }

  // Default to original category or message
  return message.category !== "message" ? message.category : "message";
};

const CollapsibleMessageItem = React.memo(
  ({ 
    message, 
    isLastMessage, 
    isAwaitingUserConfirmation,
    onSend
  }: { 
    message: InsightAIMessage;
    isLastMessage?: boolean;
    isAwaitingUserConfirmation?: boolean;
    onSend?: (event: Record<string, unknown>) => void;
  }) => {
    // Determine default expand/collapse state based on native OpenHands patterns
    const getDefaultExpandedState = React.useCallback(() => {
      // ChatMessage (user/assistant regular messages without expandable content) are never collapsed in native OpenHands
      if (
        message.type === "user" ||
        (message.type === "assistant" &&
          message.category === "message" &&
          !message.hasExpandableContent)
      ) {
        return true; // Always expanded
      }

      // All messages with expandable content should default to collapsed
      if (
        message.hasExpandableContent ||
        message.content.length > 100 ||
        message.content.includes("```")
      ) {
        return false; // Default collapsed
      }

      // MCP observations use GenericEventMessage which defaults to collapsed (useState(false))
      if (message.category === "mcp") {
        return false; // Default collapsed
      }

      // Other observation messages (command, code, sql, json) use GenericEventMessage pattern
      if (message.type === "observation") {
        return false; // Default collapsed
      }

      // Default expanded for other cases (simple messages)
      return true;
    }, [message.type, message.category, message.hasExpandableContent, message.content]);

    const [isExpanded, setIsExpanded] = React.useState(() => 
      getDefaultExpandedState()
    );

    const formatTime = React.useMemo(() => {
      const date = message.timestamp;
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${month}-${day} ${hours}:${minutes}:${seconds}`;
    }, [message.timestamp]);

    // Check if this is an MCP observation
    const isMCPObservation =
      message.type === "observation" &&
      (message.extras?.tool || message.extras?.arguments);

    // Determine if message should be collapsible based on native OpenHands patterns and new hasExpandableContent
    const shouldShowCollapsed = React.useMemo(() => {
      // User messages and assistant regular messages without detailed content are never collapsible
      if (
        message.type === "user" ||
        (message.type === "assistant" &&
          message.category === "message" &&
          !message.hasExpandableContent)
      ) {
        return false;
      }

      // MCP observations have their own internal collapse/expand - don't add external collapse button
      if (message.category === "mcp") {
        return false;
      }

      // Use the new hasExpandableContent flag which is set based on detailed content length
      return (
        message.hasExpandableContent ||
        message.content.length > 100 ||
        message.content.includes("```")
      );
    }, [message.type, message.category, message.hasExpandableContent, message.content]);

    return (
      <div
        className="mb-4"
        style={
          message.type === "user"
            ? { width: "100%" }
            : { maxWidth: "80%", width: "fit-content" }
        }
      >
        {message.type === "user" ? (
          // User message layout (no avatar, right-aligned)
          <div className="flex items-start justify-end w-full">
            <div className="flex flex-col items-end w-full">
              {/* Timestamp */}
              <div className="flex items-center gap-2 mb-1 justify-end">
                <div className="text-xs text-gray-500">{formatTime}</div>
              </div>

              {/* User message content */}
              <div
                className="px-3 py-2 rounded-lg shadow-sm bg-blue-600 text-white"
                style={{
                  minHeight: "38px",
                  maxWidth: "80%",
                  width: "fit-content",
                }}
              >
                <div className="text-sm leading-relaxed">
                  <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {message.content}
                  </Markdown>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Non-user message layout (avatar and timestamp at top, message box below)
          <div className="flex flex-col">
            {/* Avatar and Timestamp row */}
            <div className="flex items-center gap-2 mb-2">
              {/* Avatar */}
              <div className="flex items-center justify-center flex-shrink-0">
                <VscRobot className="w-5 h-5 text-gray-500" />
              </div>

              {/* Timestamp and category label */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-gray-500">{formatTime}</div>
                {/* Show category label for expandable messages OR MCP messages OR think messages */}
                {(shouldShowCollapsed ||
                  message.category === "mcp" ||
                  message.category === "think") &&
                  (() => {
                    const expandableCategory = shouldShowCollapsed
                      ? getExpandableMessageCategory(message)
                      : message.category;
                    const expandableCategoryConfig =
                      getCategoryConfig(expandableCategory);
                    if (expandableCategory !== "message" && expandableCategoryConfig.label) {
                      return (
                        <div
                          className={`px-1.5 py-0.5 rounded-md font-medium ${expandableCategoryConfig.bgColor} ${expandableCategoryConfig.textColor}`}
                          style={{
                            fontSize: "10px",
                            ...expandableCategoryConfig.customStyle,
                          }}
                        >
                          {expandableCategoryConfig.label}
                        </div>
                      );
                    }
                    return null;
                  })()}
              </div>
            </div>

            {/* Message content row - aligned with avatar position */}
            <div style={{ minWidth: "200px", width: "100%", position: "relative" }}>
              {/* Message content */}
              <div
                className="inline-block"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  boxSizing: "border-box"
                }}
              >
                {/* Message Content */}
                {message.isError ? (
                  // Error messages - use dedicated error component
                  <InsightAIErrorMessage message={message} />
                ) : (
                  // All non-user messages - use unified renderer
                  <InsightAIUnifiedMessage
                    message={message}
                    isLastMessage={isLastMessage}
                    isAwaitingUserConfirmation={isAwaitingUserConfirmation}
                    onSend={onSend}
                  />
                )}
              </div>

              {/* Status indicators - positioned outside the 80% width constraint */}
              {((message.category === "mcp" && message.status) ||
                (message.category === "command" && message.status && (
                  message.type === "observation" ||
                  (message.type === "assistant" && (message.status === "rejected" || message.status === "awaiting" || message.status === "success" || message.status === "error"))
                )) ||
                (message.category === "code" && message.status && (
                  message.type === "observation" ||
                  (message.type === "assistant" && (message.status === "rejected" || message.status === "awaiting" || message.status === "success" || message.status === "error"))
                ))) && (
                <div
                  className="inline-flex items-center gap-1 ml-2"
                  style={{
                    position: "absolute",
                    right: "-28px", // 位置在80%容器外面
                    top: "50%", // 垂直居中对齐
                    transform: "translateY(-50%)", // 精确居中
                    zIndex: 1
                  }}
                >
                  <InsightAIStatusIndicator status={message.status} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // 只有在关键属性真正改变时才重新渲染
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.message.status === nextProps.message.status &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.isAwaitingUserConfirmation === nextProps.isAwaitingUserConfirmation
    );
  }
);

export interface ScrollState {
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
}

export function InsightAICollapsibleMessages({
  messages,
  isLoading,
  isAwaitingUserConfirmation = false,
  onSend,
  onScrollStateChange,
}: InsightAICollapsibleMessageProps & {
  onScrollStateChange?: (scrollState: ScrollState) => void;
}) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);

  // Scroll to bottom function
  const scrollToBottom = React.useCallback(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    }
  }, []);

  // Handle scroll detection
  const handleScroll = React.useCallback(() => {
    if (!scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Show button if user scrolled up more than 100px from bottom
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const shouldShow = !isNearBottom && messages.length > 0;


    setShowScrollToBottom(shouldShow);
  }, [messages.length]);

  // Update scroll state when it changes
  React.useEffect(() => {
    if (onScrollStateChange) {
      onScrollStateChange({
        showScrollToBottom,
        scrollToBottom,
      });
    }
  }, [showScrollToBottom, scrollToBottom, onScrollStateChange]);

  // Add scroll event listener
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  // Auto scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (messages && messages.length > 0) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [messages?.length]);

  if (!messages || messages.length === 0) {
    if (isLoading) {
      return (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">加载对话历史中...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500">暂无消息</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-4 insight-ai-scrollbar"
    >
      {messages.map((message, index) => (
        <CollapsibleMessageItem
          key={message.id}
          message={message}
          isLastMessage={index === messages.length - 1}
          isAwaitingUserConfirmation={isAwaitingUserConfirmation}
          onSend={onSend}
        />
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="ml-2 text-gray-600">Loading...</span>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
