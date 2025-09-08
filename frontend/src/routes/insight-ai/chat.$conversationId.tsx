import React from "react";
import { useParams } from "react-router";
import { InsightAIConversation } from "#/components/insight-ai/chat/insight-ai-conversation";

export default function InsightAIChatRoute() {
  const { conversationId } = useParams<{ conversationId: string }>();
  
  if (!conversationId) {
    return (
      <div className="insight-ai-content flex items-center justify-center">
        <div className="text-insight-text-secondary">
          No conversation selected
        </div>
      </div>
    );
  }

  return <InsightAIConversation conversationId={conversationId} />;
}