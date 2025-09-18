import React from "react";
import { useInsightAIWsClient } from "./use-insight-ai-ws-client";
import { type UseInsightAIWsClient } from "./use-insight-ai-ws-client";
import {
  shouldRenderInsightAIEvent,
  convertEventsToInsightAIMessages,
} from "#/components/insight-ai/chat/insight-ai-message-filter";
import {
  isTerminalCommand,
  isTerminalOutput,
} from "#/services/insight-ai-terminal-service";

export interface TerminalEntry {
  id: string;
  type: "command" | "output";
  content: string;
  timestamp: Date;
  exitCode?: number;
}

/**
 * Hook for processing WebSocket events into InsightAI messages
 * Uses InsightAI-specific WebSocket client to avoid route dependency issues
 * 支持共享WebSocket连接以避免双重连接问题
 */
export function useInsightAIMessages(
  conversationId: string,
  sharedWsConnection?: UseInsightAIWsClient
) {
  // 🏆 如果提供了共享连接，直接使用；否则创建独立连接
  const safeConversationId =
    conversationId && conversationId !== "placeholder" ? conversationId : "";

  // 只有在没有共享连接时才创建独立连接，避免双重连接
  const independentConnection = useInsightAIWsClient(
    sharedWsConnection ? "SHARED_CONNECTION_SKIP" : safeConversationId
  );

  const activeConnection = sharedWsConnection || independentConnection;

  const {
    webSocketStatus,
    isLoadingMessages,
    parsedEvents,
    send,
    events,
    conversationData,
    hasConnectionError,
    reconnect,
    dismissConnectionError,
  } = activeConnection;

  // Check if we have a valid conversation ID
  const hasValidConversationId = Boolean(
    conversationId &&
      conversationId !== "placeholder" &&
      conversationId.trim() !== "",
  );

  // Convert OpenHands events to InsightAI messages format
  const messages = React.useMemo(() => {
    if (!hasValidConversationId || !parsedEvents || parsedEvents.length === 0) {
      return [];
    }

    // Filter events that should be displayed in InsightAI
    const filteredEvents = parsedEvents.filter(shouldRenderInsightAIEvent);

    // Convert to InsightAI message format
    const convertedMessages = convertEventsToInsightAIMessages(filteredEvents);

    return convertedMessages;
  }, [parsedEvents, hasValidConversationId]);

  // Process terminal entries from parsed events
  const terminalEntries = React.useMemo(() => {
    if (!hasValidConversationId || !parsedEvents || parsedEvents.length === 0) {
      return [];
    }

    const entries: TerminalEntry[] = [];

    parsedEvents.forEach((event) => {
      if (isTerminalCommand(event as any)) {
        const command = (event as any).args?.command || "";
        entries.push({
          id: `cmd_${event.id}`,
          type: "command",
          content: command,
          timestamp: new Date((event as any).timestamp || Date.now()),
        });
      } else if (isTerminalOutput(event as any)) {
        const output = (event as any).content || (event as any).message || "";
        entries.push({
          id: `out_${event.id}`,
          type: "output",
          content: output,
          timestamp: new Date((event as any).timestamp || Date.now()),
          exitCode: (event as any).extras?.exit_code,
        });
      }
    });

    return entries.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }, [parsedEvents, hasValidConversationId]);

  // Connection status
  const isConnected = hasValidConversationId && webSocketStatus === "CONNECTED";
  const isLoading = hasValidConversationId && isLoadingMessages;
  // 移除error设置，让loading state来处理错误显示，避免重复显示
  const error = null;

  return {
    messages,
    terminalEntries, // 新增终端数据
    isConnected,
    isLoading,
    error,
    send,
    // Additional status for debugging
    webSocketStatus,
    rawEvents: events,
    parsedEvents,
    conversationData, // Expose conversation data
    // WebSocket error modal properties
    hasConnectionError,
    reconnect,
    dismissConnectionError,
  };
}
