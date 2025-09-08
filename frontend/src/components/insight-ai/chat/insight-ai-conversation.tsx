import React from "react";
import { BarChart3, WifiOff } from "lucide-react";
import { LuPanelLeft, LuPanelRight } from "react-icons/lu";
import { InsightAICollapsibleMessages } from "./insight-ai-collapsible-message";
import { InsightAIChatInput } from "./insight-ai-chat-input";
import { createChatMessage } from "#/services/chat-service";
import { useInsightAIMessages } from "#/hooks/insight-ai/use-insight-ai-messages";

interface InsightAIConversationProps {
  conversationId: string;
  conversationTitle?: string;
  onTogglePanel?: () => void;
  isPanelExpanded?: boolean;
}

// 独立的头部组件，确保始终显示
const ConversationHeader = React.memo(
  ({
    conversationTitle,
    onTogglePanel,
    isPanelExpanded,
  }: {
    conversationTitle: string;
    onTogglePanel?: () => void;
    isPanelExpanded?: boolean;
  }) => (
    <div className="bg-white px-6 py-3" style={{ height: "64px" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <h2
            className="font-semibold text-gray-900 truncate min-w-0"
            style={{ fontSize: "16px" }}
          >
            {conversationTitle}
          </h2>
          <div className="text-gray-200 flex-shrink-0">|</div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50/50 rounded flex-shrink-0">
            <BarChart3 className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-normal text-blue-500">数据分析</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 面板展开/收起按钮 */}
          {onTogglePanel && (
            <button
              onClick={onTogglePanel}
              className="flex items-center justify-center w-8 h-8 cursor-pointer rounded-lg hover:bg-black/6 transition-all duration-200"
              title={isPanelExpanded ? "收起中间栏" : "展开中间栏"}
            >
              {isPanelExpanded ? (
                <LuPanelRight className="w-4 h-4 text-gray-500" />
              ) : (
                <LuPanelLeft className="w-4 h-4 text-gray-500" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  ),
);

export function InsightAIConversation({
  conversationId,
  conversationTitle = "数据分析对话",
  onTogglePanel,
  isPanelExpanded,
}: InsightAIConversationProps) {
  // Default conversation title
  const defaultTitle = conversationTitle;

  // ===== 所有的 React Hooks 必须在组件顶层无条件调用 =====

  // 使用简化的InsightAI消息处理hook
  const { messages, isConnected, isLoading, error, send } =
    useInsightAIMessages(conversationId);

  // Debug logging for InsightAI conversation
  React.useEffect(() => {
    console.log("🔍 [InsightAI Conversation] conversationId:", conversationId);
    console.log(
      "🔍 [InsightAI Conversation] messages count:",
      messages?.length || 0,
    );
    console.log("🔍 [InsightAI Conversation] isConnected:", isConnected);
    console.log("🔍 [InsightAI Conversation] isLoading:", isLoading);
    console.log("🔍 [InsightAI Conversation] error:", error);
  }, [conversationId, messages?.length, isConnected, isLoading, error]);

  // Handle sending messages
  const handleSendMessage = async (
    content: string,
    images?: File[],
    files?: File[],
  ) => {
    if (
      !content.trim() &&
      (!images || images.length === 0) &&
      (!files || files.length === 0)
    ) {
      return;
    }

    try {
      // 创建消息事件，模仿原生OpenHands的实现
      const timestamp = new Date().toISOString();
      // TODO: 实际上传文件到服务器并获取URLs
      // 这里需要调用OpenHands的文件上传API
      const imageUrls: string[] = [];
      const fileUrls: string[] = [];

      const messageEvent = createChatMessage(
        content,
        imageUrls, // 后续需要实际上传后的URLs
        fileUrls, // 后续需要实际上传后的URLs
        timestamp,
      );

      console.log("发送消息到WebSocket:", messageEvent);

      // 发送到WebSocket
      send(messageEvent);
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  };

  // ===== 渲染逻辑 - 在所有 hooks 调用之后 =====

  if (isLoading || !messages || messages.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50 py-2 px-1.5">
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
          <ConversationHeader
            conversationTitle={defaultTitle}
            onTogglePanel={onTogglePanel}
            isPanelExpanded={isPanelExpanded}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">加载对话历史中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-gray-50 py-2 px-1.5">
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
          <ConversationHeader
            conversationTitle={defaultTitle}
            onTogglePanel={onTogglePanel}
            isPanelExpanded={isPanelExpanded}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                连接错误
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 insight-ai-conversation-container py-2 px-1.5">
      <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
        <ConversationHeader
          conversationTitle={defaultTitle}
          onTogglePanel={onTogglePanel}
          isPanelExpanded={isPanelExpanded}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages using collapsible renderer (performance optimized) */}
          <InsightAICollapsibleMessages
            messages={messages}
            isLoading={isLoading}
          />

          {/* Chat input - only show when connected */}
          <InsightAIChatInput
            onSendMessage={handleSendMessage}
            disabled={!isConnected}
          />
        </div>
      </div>
    </div>
  );
}
