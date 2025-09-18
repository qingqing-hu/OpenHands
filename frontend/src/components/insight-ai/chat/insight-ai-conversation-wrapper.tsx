import React from "react";
import { InsightAIConversation } from "./insight-ai-conversation";
import { useInsightAILayoutWsContext } from "#/routes/insight-ai-layout";

interface InsightAIConversationWrapperProps {
  conversationId: string;
  conversationTitle?: string;
  onTogglePanel?: () => void;
  isPanelExpanded?: boolean;
}

/**
 * 包装器组件，使用布局级别的共享WebSocket连接
 * 避免中间栏创建独立的WebSocket连接
 */
export function InsightAIConversationWrapper(props: InsightAIConversationWrapperProps) {
  // 使用布局级别的共享WebSocket连接
  const sharedWsConnection = useInsightAILayoutWsContext();

  return (
    <InsightAIConversation
      {...props}
      // 传递共享的WebSocket连接数据
      sharedWsConnection={sharedWsConnection}
    />
  );
}