import React from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import EventLogger from "#/utils/event-logger";
import { handleAssistantMessage } from "#/services/actions";
import { trackError } from "#/utils/error-handler";
import { useRate } from "#/hooks/use-rate";
import { OpenHandsParsedEvent } from "#/types/core";
import {
  AssistantMessageAction,
  CommandAction,
  FileEditAction,
  FileWriteAction,
  OpenHandsAction,
  UserMessageAction,
} from "#/types/core/actions";
import { Conversation } from "#/api/open-hands.types";
import { useUserProviders } from "#/hooks/use-user-providers";
import { useUserConversation } from "#/hooks/query/use-user-conversation";
import { OpenHandsObservation } from "#/types/core/observations";
import {
  isAgentStateChangeObservation,
  isErrorObservation,
  isOpenHandsAction,
  isOpenHandsObservation,
  isStatusUpdate,
  isUserMessage,
} from "#/types/core/guards";
import { useOptimisticUserMessage } from "#/hooks/use-optimistic-user-message";
import { useWSErrorMessage } from "#/hooks/use-ws-error-message";
import { shouldRenderInsightAIEvent } from "#/components/insight-ai/chat/insight-ai-message-filter";

export type WebSocketStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "NOT_CONNECTED";

// InsightAI不使用右上角错误弹窗，注释掉相关类型检查函数
// const hasValidMessageProperty = (obj: unknown): obj is { message: string } =>
//   typeof obj === "object" &&
//   obj !== null &&
//   "message" in obj &&
//   typeof obj.message === "string";

const isOpenHandsEvent = (event: unknown): event is OpenHandsParsedEvent =>
  typeof event === "object" &&
  event !== null &&
  "id" in event &&
  "source" in event &&
  "message" in event &&
  "timestamp" in event;

const isFileWriteAction = (
  event: OpenHandsParsedEvent,
): event is FileWriteAction => "action" in event && event.action === "write";

const isFileEditAction = (
  event: OpenHandsParsedEvent,
): event is FileEditAction => "action" in event && event.action === "edit";

const isCommandAction = (event: OpenHandsParsedEvent): event is CommandAction =>
  "action" in event && event.action === "run";

const isAssistantMessage = (
  event: OpenHandsParsedEvent,
): event is AssistantMessageAction =>
  "source" in event &&
  "type" in event &&
  event.source === "agent" &&
  event.type === "message";

const isMessageAction = (
  event: OpenHandsParsedEvent,
): event is UserMessageAction | AssistantMessageAction =>
  isUserMessage(event) || isAssistantMessage(event);

interface UseInsightAIWsClient {
  webSocketStatus: WebSocketStatus;
  isLoadingMessages: boolean;
  events: Record<string, unknown>[];
  parsedEvents: (OpenHandsAction | OpenHandsObservation)[];
  send: (event: Record<string, unknown>) => void;
  conversationData?: Conversation;
  hasConnectionError: boolean;
  reconnect: () => void;
  dismissConnectionError: () => void;
}

export function updateStatusWhenErrorMessagePresent(data: any) {
  // InsightAI不显示右上角弹窗，仅用于兼容性检查
  const isObject = (val: unknown): val is object =>
    !!val && typeof val === "object";
  const isString = (val: unknown): val is string => typeof val === "string";

  if (isObject(data) && "message" in data && isString(data.message)) {
    if (data.message === "websocket error" || data.message === "timeout") {
    }
    // InsightAI使用自己的模态框错误处理，不显示右上角弹窗
  }
}

/**
 * 全局连接管理器，确保每个conversation只有一个WebSocket连接
 */
const globalConnections = new Map<string, {
  socket: Socket | null;
  status: WebSocketStatus;
  events: Record<string, unknown>[];
  parsedEvents: (OpenHandsAction | OpenHandsObservation)[];
  hasConnectionError: boolean;
  reconnectCounter: number;
  clients: Set<string>;
  subscriptions: Set<(data: any) => void>;
}>();

let clientCounter = 0;

/**
 * InsightAI专用的WebSocket客户端
 * 复用WsClientProvider的核心逻辑，但避免路由依赖问题
 */
export function useInsightAIWsClient(
  conversationId: string,
): UseInsightAIWsClient {

  const { removeOptimisticUserMessage } = useOptimisticUserMessage();
  const { removeErrorMessage } = useWSErrorMessage();
  const queryClient = useQueryClient();
  const { providers } = useUserProviders();

  // 生成客户端ID
  const clientId = React.useRef(`client-${++clientCounter}`).current;
  
  // 获取或创建全局连接
  const getOrCreateConnection = React.useCallback((convId: string) => {
    if (!globalConnections.has(convId)) {
      const connection = {
        socket: null,
        status: "NOT_CONNECTED" as WebSocketStatus,
        events: [],
        parsedEvents: [],
        hasConnectionError: false,
        reconnectCounter: 0,
        clients: new Set<string>(),
        subscriptions: new Set<(data: any) => void>(),
      };
      globalConnections.set(convId, connection);
    }
    return globalConnections.get(convId)!;
  }, []);

  // 获取连接对象
  const connection = React.useMemo(() => {
    if (!conversationId || conversationId === "placeholder") return null;
    return getOrCreateConnection(conversationId);
  }, [conversationId, getOrCreateConnection]);

  // 本地状态，从全局连接同步
  const [webSocketStatus, setWebSocketStatus] = React.useState<WebSocketStatus>(
    connection?.status || "NOT_CONNECTED"
  );
  const [events, setEvents] = React.useState<Record<string, unknown>[]>(
    connection?.events || []
  );
  const [parsedEvents, setParsedEvents] = React.useState<(OpenHandsAction | OpenHandsObservation)[]>(
    connection?.parsedEvents || []
  );
  const [hasConnectionError, setHasConnectionError] = React.useState(
    connection?.hasConnectionError || false
  );
  const [reconnectCounter, setReconnectCounter] = React.useState(
    connection?.reconnectCounter || 0
  );

  // 注册客户端并订阅全局状态变化
  React.useEffect(() => {
    if (!connection) return;

    connection.clients.add(clientId);

    // 订阅状态变化
    const subscription = (data: { 
      status?: WebSocketStatus; 
      events?: Record<string, unknown>[];
      parsedEvents?: (OpenHandsAction | OpenHandsObservation)[];
      hasConnectionError?: boolean;
      reconnectCounter?: number;
    }) => {
      if (data.status !== undefined) {
        connection.status = data.status;
        setWebSocketStatus(data.status);
      }
      if (data.events !== undefined) {
        connection.events = data.events;
        setEvents(data.events);
      }
      if (data.parsedEvents !== undefined) {
        connection.parsedEvents = data.parsedEvents;
        setParsedEvents(data.parsedEvents);
      }
      if (data.hasConnectionError !== undefined) {
        connection.hasConnectionError = data.hasConnectionError;
        setHasConnectionError(data.hasConnectionError);
      }
      if (data.reconnectCounter !== undefined) {
        connection.reconnectCounter = data.reconnectCounter;
        setReconnectCounter(data.reconnectCounter);
      }
    };

    connection.subscriptions.add(subscription);

    return () => {
      connection.clients.delete(clientId);
      connection.subscriptions.delete(subscription);
      // 如果没有客户端了，清理连接
      if (connection.clients.size === 0) {
        if (connection.socket?.connected) {
          connection.socket.disconnect();
        }
        globalConnections.delete(conversationId);
      }
    };
  }, [connection, conversationId, clientId]);

  // 广播状态变化给所有订阅者
  const broadcastUpdate = React.useCallback((data: any) => {
    if (!connection) return;
    connection.subscriptions.forEach(callback => callback(data));
  }, [connection]);

  const lastEventRef = React.useRef<Record<string, unknown> | null>(null);

  // 连接防护状态
  const isConnectingRef = React.useRef(false);
  const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentConversationRef = React.useRef<string>("");

  const messageRateHandler = useRate({ threshold: 250 });
  const { data: conversation, refetch: refetchConversation } =
    useUserConversation(conversationId);

  // 定期检查对话状态变化，特别是检测从外部启动的对话
  React.useEffect(() => {
    if (!conversationId || conversationId === "placeholder") {
      return () => undefined;
    }

    // 更严格的轮询条件，避免在WebSocket已连接时不必要的轮询
    // 移除对conversation.status的直接依赖，使用稳定的轮询条件
    const shouldPoll = !conversation || webSocketStatus === "DISCONNECTED";

    if (!shouldPoll) {
      return () => undefined;
    }


    const pollInterval = setInterval(() => {
      // 在轮询前再次检查是否应该继续轮询，避免状态竞争
      if (webSocketStatus === "CONNECTED" || webSocketStatus === "CONNECTING") {
        return;
      }
      refetchConversation();
    }, 8000); // 增加到8秒，减少轮询频率

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    conversationId,
    // 移除conversation?.status依赖，避免状态变化触发不必要的轮询重启
    webSocketStatus,
    refetchConversation,
    // 添加connection存在性检查
    !!conversation,
  ]);

  function send(event: Record<string, unknown>) {
    if (!connection?.socket) {
      EventLogger.error("WebSocket is not connected.");
      return;
    }

    connection.socket.emit("oh_user_action", event);
  }

  // 保持接口兼容性的空重连函数，与OpenHands原生前端一致
  const reconnect = React.useCallback(async () => {
    // 空函数，保持接口兼容性
  }, []);

  // 关闭错误提醒
  const dismissConnectionError = React.useCallback(() => {
    const currentConnection = globalConnections.get(conversationId);
    if (!currentConnection) return;
    
    currentConnection.hasConnectionError = false;
    currentConnection.subscriptions.forEach(callback => callback({ hasConnectionError: false }));
  }, [conversationId]);

  const handleConnect = React.useCallback(() => {
    const currentConnection = globalConnections.get(conversationId);
    if (!currentConnection) return;
    
    isConnectingRef.current = false;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    removeErrorMessage();
    
    console.log(`[InsightAI-WS-${clientId}] WebSocket connected to conversation ${conversationId}`);
    
    // 直接更新全局状态并广播
    currentConnection.status = "CONNECTED";
    currentConnection.hasConnectionError = false;
    currentConnection.subscriptions.forEach(callback => callback({ 
      status: "CONNECTED" as WebSocketStatus,
      hasConnectionError: false
    }));
  }, [conversationId, clientId]); // 只保留稳定的依赖

  // 创建事件处理器的单例引用，确保同一个连接只有一个处理器在工作
  const handleMessage = React.useCallback((event: Record<string, unknown>) => {
    const currentConnection = globalConnections.get(conversationId);
    if (!currentConnection) return;
    
    // 检查是否已经处理过这个事件（通过事件ID去重）
    const eventId = event.id as string;
    if (eventId && currentConnection.events.some(e => e.id === eventId)) {
      return;
    }

    // 只打印会在前端渲染的消息的原始数据，使用收缩的console group
    if (
      isOpenHandsEvent(event) &&
      (isOpenHandsAction(event) || isOpenHandsObservation(event))
    ) {
      if (shouldRenderInsightAIEvent(event)) {
        console.groupCollapsed(
          `[InsightAI-WS-RAW] Raw message data - ${event.action || event.observation || "unknown"}`,
        );
        console.log(JSON.stringify(event, null, 2));
        console.groupEnd();
      }
    } else {
      // 对于非OpenHands事件，检查是否是需要打印的类型
      const eventType = (event.action ||
        event.observation ||
        "unknown") as string;
      const noRenderTypes = [
        "system",
        "agent_state_changed",
        "change_agent_state",
      ];
      if (!noRenderTypes.includes(eventType)) {
        console.groupCollapsed(
          `[InsightAI-WS-RAW] Raw message data - ${eventType}`,
        );
        console.log(JSON.stringify(event, null, 2));
        console.groupEnd();
      }
    }

    handleAssistantMessage(event);

    if (isOpenHandsEvent(event)) {
      const isStatusUpdateError =
        isStatusUpdate(event) && event.type === "error";

      const isAgentStateChangeError =
        isAgentStateChangeObservation(event) &&
        event.extras.agent_state === "error";

      if (isStatusUpdateError || isAgentStateChangeError) {
        const errorMessage = isStatusUpdate(event)
          ? event.message
          : event.extras.reason || "Unknown error";

        trackError({
          message: errorMessage,
          source: "chat",
          metadata: { msgId: event.id },
        });
        return;
      }

      if (isOpenHandsAction(event) || isOpenHandsObservation(event)) {
        const newParsedEvents = [...currentConnection.parsedEvents, event];
        currentConnection.parsedEvents = newParsedEvents;
        currentConnection.subscriptions.forEach(callback => callback({ parsedEvents: newParsedEvents }));
      }

      if (isErrorObservation(event)) {
        trackError({
          message: event.message,
          source: "chat",
          metadata: { msgId: event.id },
        });
      } else {
        removeErrorMessage();
      }

      if (isUserMessage(event)) {
        removeOptimisticUserMessage();
      }

      if (isMessageAction(event)) {
        messageRateHandler.record(new Date().getTime());
      }

      // Invalidate diffs cache when a file is edited or written
      if (
        isFileEditAction(event) ||
        isFileWriteAction(event) ||
        isCommandAction(event)
      ) {
        queryClient.invalidateQueries(
          {
            queryKey: ["file_changes", conversationId],
          },
          { cancelRefetch: false },
        );

        // Invalidate file diff cache when a file is edited or written
        if (!isCommandAction(event)) {
          const cachedConversaton = queryClient.getQueryData<Conversation>([
            "user",
            "conversation",
            conversationId,
          ]);
          const clonedRepositoryDirectory =
            cachedConversaton?.selected_repository?.split("/").pop();

          let fileToInvalidate = event.args.path.replace("/workspace/", "");
          if (clonedRepositoryDirectory) {
            fileToInvalidate = fileToInvalidate.replace(
              `${clonedRepositoryDirectory}/`,
              "",
            );
          }

          queryClient.invalidateQueries({
            queryKey: ["file_diff", conversationId, fileToInvalidate],
          });
        }
      }
    }
    
    // 添加事件到全局事件列表（已去重）
    const newEvents = [...currentConnection.events, event];
    currentConnection.events = newEvents;
    currentConnection.subscriptions.forEach(callback => callback({ events: newEvents }));
    
    if (!Number.isNaN(parseInt(event.id as string, 10))) {
      lastEventRef.current = event;
    }
  }, [conversationId, clientId]); // 大幅简化依赖数组

  const handleDisconnect = React.useCallback((data: unknown) => {
    const currentConnection = globalConnections.get(conversationId);
    if (!currentConnection) return;
    
    console.log(`[InsightAI-WS-${clientId}] WebSocket disconnected from conversation ${conversationId}`, data);
    
    isConnectingRef.current = false;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (currentConnection.socket) {
      currentConnection.socket.io.opts.query = currentConnection.socket.io.opts.query || {};
      currentConnection.socket.io.opts.query.latest_event_id = lastEventRef.current?.id;
    }
    updateStatusWhenErrorMessagePresent(data);

    currentConnection.status = "DISCONNECTED";
    currentConnection.hasConnectionError = true;
    currentConnection.subscriptions.forEach(callback => callback({ 
      status: "DISCONNECTED" as WebSocketStatus,
      hasConnectionError: true
    }));
  }, [conversationId, clientId]);

  const handleError = React.useCallback((data: unknown) => {
    const currentConnection = globalConnections.get(conversationId);
    if (!currentConnection) return;
    
    console.log(`[InsightAI-WS-${clientId}] WebSocket error for conversation ${conversationId}`, data);
    
    isConnectingRef.current = false;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // 重置连接状态记录，避免卡住
    currentConversationRef.current = "";
    
    updateStatusWhenErrorMessagePresent(data);

    currentConnection.status = "DISCONNECTED";
    currentConnection.hasConnectionError = true;
    currentConnection.subscriptions.forEach(callback => callback({ 
      status: "DISCONNECTED" as WebSocketStatus,
      hasConnectionError: true
    }));

    // check if something went wrong with the conversation.
    refetchConversation();
  }, [conversationId, clientId, refetchConversation]);

  React.useEffect(() => {
    lastEventRef.current = null;

    // reset events when conversationId changes
    if (connection) {
      connection.events = [];
      connection.parsedEvents = [];
      broadcastUpdate({ 
        events: [],
        parsedEvents: [],
        status: "NOT_CONNECTED" as WebSocketStatus
      });
    }
  }, [conversationId, connection, broadcastUpdate]);

  // 使用稳定的ref来跟踪conversation状态，避免不必要的重连
  // 移除conversationStatusRef，简化状态管理

  React.useEffect(() => {
    
    // 清除之前的连接超时
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (
      !conversationId ||
      conversationId.trim() === "" ||
      conversationId === "placeholder"
    ) {
      currentConversationRef.current = "";
      isConnectingRef.current = false;
      setWebSocketStatus("NOT_CONNECTED");
      setEvents([]);
      setParsedEvents([]);
      return () => undefined;
    }

    // 只允许第一个客户端创建连接
    if (connection && connection.clients.size > 0 && !connection.clients.has(clientId)) {
      const firstClientId = Array.from(connection.clients)[0];
      if (firstClientId !== clientId) {
        return () => undefined;
      }
    }

    // 只在必要时检查连接条件，避免频繁的状态变化触发重连
    // 如果已经有活跃连接且状态适合，跳过重复检查
    if (connection?.socket?.connected && 
        (connection.status === "CONNECTED" || connection.status === "CONNECTING")) {
      return () => undefined;
    }

    // 参考OpenHands原生实现：简化连接条件检查，允许STARTING和RUNNING状态连接
    const canConnect = conversation?.status === "RUNNING" || conversation?.status === "STARTING" || conversation?.runtime_status;
    if (!canConnect) {
        if (currentConversationRef.current === conversationId && connection) {
        // 如果对话状态是STOPPED，设置为NOT_CONNECTED；其他情况设置为DISCONNECTED
        const wsStatus = conversation?.status === "STOPPED" ? "NOT_CONNECTED" : "DISCONNECTED";
        isConnectingRef.current = false;
        currentConversationRef.current = "";
        broadcastUpdate({ status: wsStatus });
      }
      return () => undefined;
    }

    // 防止STARTING->RUNNING状态变化导致的重连：如果已经连接且对话ID相同，跳过重新连接
    if (connection?.socket?.connected && 
        currentConversationRef.current === conversationId &&
        (connection.status === "CONNECTED" || connection.status === "CONNECTING")) {
      return () => undefined;
    }

    // 设置连接防护
    currentConversationRef.current = conversationId;
    isConnectingRef.current = true;

    // 如果已有连接且连接的是同一个对话，先断开
    if (connection?.socket?.connected) {
      connection.socket.disconnect();
    }

    // Set initial status...
    if (connection) {
      broadcastUpdate({ status: "CONNECTING" as WebSocketStatus });
    }

    const lastEvent = lastEventRef.current;
    const query = {
      latest_event_id: lastEvent?.id ?? -1,
      conversation_id: conversationId,
      providers_set: providers,
      session_api_key: conversation?.session_api_key, // Have to set here because socketio doesn't support custom headers. :(
    };

    let baseUrl = null;
    if (conversation?.url && !conversation.url.startsWith("/")) {
      baseUrl = new URL(conversation.url).host;
    } else {
      baseUrl = import.meta.env.VITE_BACKEND_BASE_URL || window?.location.host;
    }

    const sio = io(baseUrl, {
      transports: ["websocket"],
      query,
      // 禁用自动重连，由我们手动控制
      autoConnect: true,
      reconnection: false,
      timeout: 10000, // 10秒连接超时
    });

    sio.on("connect", handleConnect);
    sio.on("oh_event", handleMessage);
    sio.on("connect_error", handleError);
    sio.on("connect_failed", handleError);
    sio.on("disconnect", handleDisconnect);

    // 设置连接超时
    connectionTimeoutRef.current = setTimeout(() => {
      if (isConnectingRef.current && connection && connection.status !== "CONNECTED") {
        isConnectingRef.current = false;
        broadcastUpdate({ 
          status: "DISCONNECTED" as WebSocketStatus,
          hasConnectionError: true
        });
      }
    }, 10000); // 10秒超时

    if (connection) {
      connection.socket = sio;
    }

    return () => {
      sio.off("connect", handleConnect);
      sio.off("oh_event", handleMessage);
      sio.off("connect_error", handleError);
      sio.off("connect_failed", handleError);
      sio.off("disconnect", handleDisconnect);
    };
  }, [
    conversationId,
    // 只保留真正需要触发重连的依赖，避免状态变化导致的意外重连
    conversation?.url,
    conversation?.session_api_key,
    providers,
    // 手动重连计数器，用于触发重连
    reconnectCounter,
    // 移除 conversation?.status 和 conversation?.runtime_status
    // 这些状态变化会在useEffect内部动态检查，不应该作为依赖触发重连
    // conversation?.status - 移除！这是导致STARTING→RUNNING重连的根本原因
    // conversation?.runtime_status - 移除！避免运行时状态变化触发重连
    // 移除不稳定的回调依赖，使用 React.useCallback 配合空依赖数组
    // handleConnect, handleMessage, handleError, handleDisconnect
  ]);

  React.useEffect(
    () => () => {
      isConnectingRef.current = false;
      currentConversationRef.current = "";

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      // 注意：清理工作由客户端注册的cleanup来处理，这里不直接操作socket
    },
    [],
  );

  return {
    webSocketStatus,
    isLoadingMessages: messageRateHandler.isUnderThreshold,
    events,
    parsedEvents,
    send,
    conversationData: conversation || undefined,
    hasConnectionError,
    reconnect,
    dismissConnectionError,
  };
}
