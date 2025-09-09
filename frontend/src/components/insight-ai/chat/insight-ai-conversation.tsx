import React from "react";
import { BarChart3, WifiOff, RefreshCw, Wifi } from "lucide-react";
import { LuPanelLeft, LuPanelRight } from "react-icons/lu";
import { useQueryClient } from "@tanstack/react-query";
import { InsightAICollapsibleMessages } from "./insight-ai-collapsible-message";
import { InsightAIChatInput } from "./insight-ai-chat-input";
import { createChatMessage } from "#/services/chat-service";
import { useInsightAIMessages } from "#/hooks/insight-ai/use-insight-ai-messages";
import { useConversationLoadingState } from "#/hooks/insight-ai/use-conversation-loading-state";
import { ConversationLoadingIndicator } from "../shared/insight-ai-loading-states";
import OpenHands from "#/api/open-hands";
import { insightAIKeys } from "#/hooks/insight-ai/use-insight-ai-tasks";

interface InsightAIConversationProps {
  conversationId: string;
  conversationTitle?: string;
  onTogglePanel?: () => void;
  isPanelExpanded?: boolean;
}

// WebSocket状态指示器组件
const WebSocketStatusIcon = React.memo(({ status }: { status: string }) => {
  const getStatusConfig = () => {
    switch (status) {
      case "CONNECTED":
        return {
          icon: Wifi,
          color: "text-green-500",
          title: "已连接",
        };
      case "CONNECTING":
        return {
          icon: Wifi,
          color: "text-yellow-500 animate-pulse",
          title: "连接中...",
        };
      case "DISCONNECTED":
      default:
        return {
          icon: WifiOff,
          color: "text-red-500",
          title: "连接断开",
        };
    }
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  return (
    <div
      className={`flex items-center justify-center w-6 h-6 ${config.color}`}
      title={config.title}
    >
      <IconComponent className="w-4 h-4" />
    </div>
  );
});

// 独立的头部组件，确保始终显示
const ConversationHeader = React.memo(
  ({
    conversationTitle,
    onTogglePanel,
    isPanelExpanded,
    webSocketStatus,
  }: {
    conversationTitle: string;
    onTogglePanel?: () => void;
    isPanelExpanded?: boolean;
    webSocketStatus?: string;
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
          {/* WebSocket状态指示器 */}
          {webSocketStatus && <WebSocketStatusIcon status={webSocketStatus} />}

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
  const queryClient = useQueryClient();

  // 启动对话的加载状态
  const [isStarting, setIsStarting] = React.useState(false);

  // ===== 所有的 React Hooks 必须在组件顶层无条件调用 =====

  // 使用简化的InsightAI消息处理hook
  const {
    messages,
    isConnected,
    isLoading,
    error,
    send,
    webSocketStatus,
    parsedEvents,
    conversationData,
    reconnect,
  } = useInsightAIMessages(conversationId);

  // 检查是否有有效的对话ID
  const hasValidConversationId = Boolean(
    conversationId &&
      conversationId !== "placeholder" &&
      conversationId.trim() !== "",
  );

  // 使用新的加载状态管理
  const {
    loadingState,
    error: loadingError,
    messageCount,
  } = useConversationLoadingState({
    conversationId,
    webSocketStatus,
    parsedEvents,
    hasValidConversationId,
    conversationStatus: conversationData?.status,
    conversationRuntimeStatus: Boolean(conversationData?.runtime_status),
  });

  // 监听对话状态变化，同步更新左侧栏任务列表
  React.useEffect(() => {
    if (conversationData?.status) {
      // 当对话状态发生变化时，刷新InsightAI任务列表以保持同步
      queryClient.invalidateQueries({
        queryKey: insightAIKeys.tasks(),
      });
    }
  }, [conversationData?.status, queryClient]);

  // Handle starting conversation
  const handleStartConversation = async () => {
    if (isStarting) return; // 防止重复点击

    try {
      setIsStarting(true);
      console.log(`Starting conversation: ${conversationId}`);
      await OpenHands.startConversation(conversationId);

      // Invalidate queries to refetch conversation data and conversation list
      queryClient.invalidateQueries({
        queryKey: ["user", "conversation", conversationId],
      });

      // Also invalidate the conversations list to update sidebar status
      queryClient.invalidateQueries({
        queryKey: ["user", "conversations"],
      });

      // Additionally invalidate InsightAI tasks list to update left sidebar status
      queryClient.invalidateQueries({
        queryKey: insightAIKeys.tasks(),
      });

      console.log(`Conversation ${conversationId} started successfully`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
    } finally {
      setIsStarting(false);
    }
  };

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

      // 发送到WebSocket
      send(messageEvent);
    } catch (error) {
      console.error("发送消息失败:", error);
    }
  };

  // ===== 渲染逻辑 - 在所有 hooks 调用之后 =====

  // 显示加载状态
  if (loadingState !== "ready") {
    return (
      <div className="flex flex-col h-full bg-gray-50 py-2 px-1.5">
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
          <ConversationHeader
            conversationTitle={defaultTitle}
            onTogglePanel={onTogglePanel}
            isPanelExpanded={isPanelExpanded}
            webSocketStatus={webSocketStatus}
          />
          <ConversationLoadingIndicator
            state={loadingState}
            error={loadingError || error || undefined}
            messageCount={messageCount}
            onStartConversation={handleStartConversation}
            onReconnect={reconnect}
            isStarting={isStarting}
          />
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
            webSocketStatus={webSocketStatus}
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
                <WifiOff className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                WebSocket连接异常
              </h3>
              <p className="text-gray-600 mb-4">
                与WebSocket服务器的连接异常断开，导致无法查看对话内容。
              </p>
              <button
                onClick={reconnect}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                立即重连
              </button>
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
          webSocketStatus={webSocketStatus}
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
