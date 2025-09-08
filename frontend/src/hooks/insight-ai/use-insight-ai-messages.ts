import React from "react";
import { useInsightAIWsClient } from "./use-insight-ai-ws-client";
import { 
  shouldRenderInsightAIEvent, 
  convertEventsToInsightAIMessages,
  InsightAIMessage 
} from "#/components/insight-ai/chat/insight-ai-message-filter";
import { isTerminalCommand, isTerminalOutput } from "#/services/insight-ai-terminal-service";

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
  const safeConversationId = (conversationId && conversationId !== "placeholder") ? conversationId : "";
  const { webSocketStatus, isLoadingMessages, parsedEvents, send, events } = useInsightAIWsClient(safeConversationId);
  
  // Debug logging
  React.useEffect(() => {
    console.log('🔍 [InsightAI Debug] WebSocket status:', webSocketStatus);
    console.log('🔍 [InsightAI Debug] Loading messages:', isLoadingMessages);
    console.log('🔍 [InsightAI Debug] Raw events count:', events?.length || 0);
    console.log('🔍 [InsightAI Debug] Parsed events count:', parsedEvents?.length || 0);
    if (parsedEvents && parsedEvents.length > 0) {
      console.log('🔍 [InsightAI Debug] Latest parsed events:', parsedEvents.slice(-3));
    }
  }, [webSocketStatus, isLoadingMessages, events?.length, parsedEvents?.length, parsedEvents]);
  
  // Check if we have a valid conversation ID
  const hasValidConversationId = Boolean(conversationId && conversationId !== "placeholder" && conversationId.trim() !== "");

  // Convert OpenHands events to InsightAI messages format
  const messages = React.useMemo(() => {
    if (!hasValidConversationId || !parsedEvents || parsedEvents.length === 0) {
      console.log('🔍 [InsightAI Debug] No valid conversation or parsed events, returning empty messages');
      return [];
    }
    
    console.log('🔍 [InsightAI Debug] Processing', parsedEvents.length, 'parsed events');
    
    // Filter events that should be displayed in InsightAI
    const filteredEvents = parsedEvents.filter(shouldRenderInsightAIEvent);
    console.log('🔍 [InsightAI Debug] Filtered to', filteredEvents.length, 'events for InsightAI');
    
    // Convert to InsightAI message format
    const convertedMessages = convertEventsToInsightAIMessages(filteredEvents);
    console.log('🔍 [InsightAI Debug] Converted to', convertedMessages.length, 'messages');
    
    return convertedMessages;
  }, [parsedEvents, hasValidConversationId]);

  // Process terminal entries from parsed events
  const terminalEntries = React.useMemo(() => {
    if (!hasValidConversationId || !parsedEvents || parsedEvents.length === 0) {
      console.log('🔍 [InsightAI Debug] No valid conversation or parsed events for terminal processing');
      return [];
    }

    const entries: TerminalEntry[] = [];
    
    parsedEvents.forEach(event => {
      console.log('🔍 [Terminal Processing] Examining event:', {
        id: event.id,
        action: (event as any).action,
        observation: (event as any).observation,
        source: (event as any).source,
        type: (event as any).type,
        args: (event as any).args,
        content: (event as any).content?.substring(0, 100),
        message: (event as any).message?.substring(0, 100)
      });
      
      if (isTerminalCommand(event)) {
        const command = (event as any).args?.command || "";
        entries.push({
          id: `cmd_${event.id}`,
          type: "command",
          content: command,
          timestamp: new Date((event as any).timestamp || Date.now()),
        });
        console.log('🔍 [Terminal Processing] Added command entry:', command);
      } else if (isTerminalOutput(event)) {
        const output = (event as any).content || (event as any).message || "";
        entries.push({
          id: `out_${event.id}`,
          type: "output", 
          content: output,
          timestamp: new Date((event as any).timestamp || Date.now()),
          exitCode: (event as any).extras?.exit_code,
        });
        console.log('🔍 [Terminal Processing] Added output entry:', output.substring(0, 100));
      }
    });

    console.log('🔍 [InsightAI Debug] Processed terminal entries count:', entries.length);
    return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [parsedEvents, hasValidConversationId]);

  // Connection status  
  const isConnected = hasValidConversationId && webSocketStatus === "CONNECTED";
  const isLoading = hasValidConversationId && isLoadingMessages;
  const error = hasValidConversationId && webSocketStatus === "DISCONNECTED" && !isLoading ? 
    "WebSocket连接已断开" : null;

  // Debug connection status
  React.useEffect(() => {
    console.log('🔍 [InsightAI Debug] Connection status - isConnected:', isConnected, 'isLoading:', isLoading, 'error:', error);
  }, [isConnected, isLoading, error]);

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