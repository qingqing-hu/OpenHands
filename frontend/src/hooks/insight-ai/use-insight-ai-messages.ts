import React from "react";
import { useInsightAIWsClient } from "./use-insight-ai-ws-client";
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
 */
export function useInsightAIMessages(conversationId: string) {
  // Always call the WebSocket hook, but pass safe defaults
  const safeConversationId =
    conversationId && conversationId !== "placeholder" ? conversationId : "";
  const { webSocketStatus, isLoadingMessages, parsedEvents, send, events } =
    useInsightAIWsClient(safeConversationId);


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
  const error =
    hasValidConversationId && webSocketStatus === "DISCONNECTED" && !isLoading
      ? "WebSocket连接已断开"
      : null;


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
  };
}
