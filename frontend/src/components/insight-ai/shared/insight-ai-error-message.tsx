import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { BiError } from "react-icons/bi";
import { useTranslation } from "react-i18next";
import { InsightAIMessage } from "../chat/insight-ai-message-filter";
import { decodeHtmlEntities } from "./html-entity-decoder";
import i18n from "#/i18n";

interface InsightAIErrorMessageProps {
  message: InsightAIMessage;
}

export function InsightAIErrorMessage({ message }: InsightAIErrorMessageProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // 从originalEvent的extras中获取error_id
  const errorId = (message.originalEvent as any)?.extras?.error_id as
    | string
    | undefined;

  // 使用简化的错误消息格式
  const getErrorMessage = () => {
    if (errorId) {
      const errorMessages: Record<string, string> = {
        AGENT_ERROR$ERROR_ACTION_NOT_EXECUTED: "操作未执行",
        AGENT_ERROR$ERROR_TIMEOUT: "操作超时",
        AGENT_ERROR$ERROR_INVALID_INPUT: "输入无效",
        AGENT_ERROR$ERROR_PERMISSION_DENIED: "权限不足",
        AGENT_ERROR$ERROR_FILE_NOT_FOUND: "文件未找到",
        AGENT_ERROR$ERROR_NETWORK_FAILURE: "网络连接失败",
        AGENT_ERROR$ERROR_PARSE_FAILURE: "解析失败",
        AGENT_ERROR$ERROR_UNKNOWN: "未知错误",
      };

      const errorType = errorMessages[errorId] || "未知错误";
      return `智能体遇到错误 - ${errorType}`;
    }

    return "智能体遇到错误 - 未知错误";
  };

  // 获取详细错误信息 - 使用中文版本
  const getErrorDetails = () => {
    // 如果有errorId，使用i18n获取中文详细描述
    if (errorId && i18n.exists(errorId)) {
      return i18n.t(errorId);
    }

    // Fallback到原始消息
    return (
      message.originalEvent?.message || message.content || t("ERROR$UNKNOWN")
    );
  };

  const errorMessage = getErrorMessage();
  const errorDetails = getErrorDetails();

  // 检查是否为agent/environment消息以确定背景色
  const isAgentMessage =
    message.originalEvent?.source === "agent" ||
    message.originalEvent?.source === "environment";
  const isUserMessage = message.originalEvent?.source === "user";

  return (
    <div
      className="rounded-lg overflow-hidden insight-ai-message-outer"
      style={{
        backgroundColor:
          isAgentMessage || isUserMessage ? "#f5f5f5" : "#fafafa",
        padding: "8px",
      }}
    >
      {/* Error message header - consistent with other message types */}
      <div className="flex items-center justify-between gap-4 px-3 py-1 rounded-md bg-white border border-red-200 insight-ai-message-inner">
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-600 font-medium">
            {errorMessage}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded transition-colors flex-shrink-0 hover:bg-gray-100 text-black"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Expanded content - consistent with other message types */}
      {isExpanded && (
        <div className="px-0 pt-1 space-y-2">
          <div className="bg-white rounded-md border border-red-200 overflow-hidden insight-ai-message-inner">
            {/* Error details header */}
            <div className="bg-blue-50 px-3 py-1">
              <div className="flex items-center gap-2">
                <BiError className="w-3 h-3 text-red-600" />
                <span className="text-sm text-gray-600">错误详情</span>
              </div>
            </div>
            {/* Error details content - adaptive height based on content length */}
            <div
              className={`p-3 overflow-y-auto insight-ai-scrollbar text-gray-600 text-sm ${(() => {
                if (errorDetails.length <= 200) return "max-h-[120px]";
                if (errorDetails.length <= 500) return "max-h-[200px]";
                if (errorDetails.length <= 1000) return "max-h-[300px]";
                return "max-h-[400px]";
              })()} min-h-[80px]`}
              style={{ backgroundColor: "#fafafa" }}
            >
              <div
                className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: decodeHtmlEntities(errorDetails),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
