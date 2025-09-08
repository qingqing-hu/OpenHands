import React from "react";
import { User, Cpu } from "lucide-react";
import { InsightAIMessage } from "./insight-ai-message-filter";
import { InsightAIErrorMessage } from "../shared/insight-ai-error-message";
import { decodeHtmlEntities } from "../shared/html-entity-decoder";

interface InsightAISimpleMessagesProps {
  messages: InsightAIMessage[];
  isLoading: boolean;
}

// Ultra-lightweight message renderer - no markdown, no hover effects, just pure performance
const SimpleMessageItem = React.memo(
  ({ message }: { message: InsightAIMessage }) => {
    const formatTime = React.useMemo(
      () =>
        message.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      [message.timestamp],
    );

    return (
      <div
        className={`flex items-start gap-3 mb-4 ${message.type === "user" ? "flex-row-reverse" : ""}`}
      >
        {/* Avatar */}
        <div
          className={`
        ${message.type === "user" ? "w-8 h-8" : "w-6 h-6"} rounded-full flex items-center justify-center flex-shrink-0
        ${
          message.type === "user"
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-600"
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
          className={`max-w-[80%] min-w-0 ${message.type === "user" ? "items-end" : "items-start"}`}
        >
          {message.isError && message.type !== "user" ? (
            // Error messages for non-user messages
            <InsightAIErrorMessage message={message} />
          ) : (
            <div
              className={`
              p-3 rounded-lg shadow-sm
              ${
                message.type === "user"
                  ? "bg-blue-600 text-white ml-auto"
                  : "bg-white text-gray-900 mr-auto border border-gray-200"
              }
            `}
            >
              {/* Simple text rendering with HTML entity decoding */}
              <div
                className="text-sm whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{
                  __html: decodeHtmlEntities(message.content),
                }}
              />

              {/* Timestamp */}
              <div
                className={`text-xs mt-2 opacity-70 ${message.type === "user" ? "text-right" : "text-left"}`}
              >
                {formatTime}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

export function InsightAISimpleMessages({
  messages,
  isLoading,
}: InsightAISimpleMessagesProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Simple scroll effect
  React.useEffect(() => {
    if (messages && messages.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
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
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((message) => (
        <SimpleMessageItem key={message.id} message={message} />
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
