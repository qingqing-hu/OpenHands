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

export type WebSocketStatus = "CONNECTING" | "CONNECTED" | "DISCONNECTED";

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
 * InsightAI专用的WebSocket客户端
 * 复用WsClientProvider的核心逻辑，但避免路由依赖问题
 */
export function useInsightAIWsClient(
  conversationId: string,
): UseInsightAIWsClient {
  const { removeOptimisticUserMessage } = useOptimisticUserMessage();
  const { removeErrorMessage } = useWSErrorMessage();
  const queryClient = useQueryClient();
  const sioRef = React.useRef<Socket | null>(null);
  const [webSocketStatus, setWebSocketStatus] =
    React.useState<WebSocketStatus>("DISCONNECTED");
  const [events, setEvents] = React.useState<Record<string, unknown>[]>([]);
  const [parsedEvents, setParsedEvents] = React.useState<
    (OpenHandsAction | OpenHandsObservation)[]
  >([]);
  const lastEventRef = React.useRef<Record<string, unknown> | null>(null);
  const { providers } = useUserProviders();

  // 添加连接防护状态
  const isConnectingRef = React.useRef(false);
  const connectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const currentConversationRef = React.useRef<string>("");

  // WebSocket连接错误状态
  const [hasConnectionError, setHasConnectionError] = React.useState(false);

  const messageRateHandler = useRate({ threshold: 250 });
  const { data: conversation, refetch: refetchConversation } =
    useUserConversation(conversationId);

  // 定期检查对话状态变化，特别是检测从外部启动的对话
  React.useEffect(() => {
    if (!conversationId || conversationId === "placeholder") {
      return () => undefined;
    }

    // 只有在对话可能处于未同步状态时才启动轮询
    // 1. 对话状态未知（数据还在加载）
    // 2. 对话状态为STOPPED但WebSocket已断开（可能从外部启动了）
    // 3. WebSocket断开且对话状态不是RUNNING/STARTING（状态可能过期）
    const shouldPoll =
      !conversation ||
      (conversation.status === "STOPPED" &&
        webSocketStatus === "DISCONNECTED") ||
      (webSocketStatus === "DISCONNECTED" &&
        conversation.status !== "RUNNING" &&
        conversation.status !== "STARTING");

    if (!shouldPoll) {
      return () => undefined;
    }

    console.log(
      `[WS-Client] Starting conversation status polling for ${conversationId} (status: ${conversation?.status}, ws: ${webSocketStatus})`,
    );

    const pollInterval = setInterval(() => {
      console.log(
        `[WS-Client] Polling conversation status for ${conversationId}`,
      );
      refetchConversation();
    }, 5000); // 每5秒检查一次状态，减少服务器压力

    return () => {
      console.log(
        `[WS-Client] Stopping conversation status polling for ${conversationId}`,
      );
      clearInterval(pollInterval);
    };
  }, [
    conversationId,
    conversation?.status,
    webSocketStatus,
    refetchConversation,
  ]);

  function send(event: Record<string, unknown>) {
    if (!sioRef.current) {
      EventLogger.error("WebSocket is not connected.");
      return;
    }

    sioRef.current.emit("oh_user_action", event);
  }

  // 手动重连函数
  const reconnect = React.useCallback(() => {
    setHasConnectionError(false);

    // 强制重新连接
    const sio = sioRef.current;
    if (sio?.connected) {
      sio.disconnect();
    }

    // 重置连接状态，触发重新连接
    isConnectingRef.current = false;
    currentConversationRef.current = "";
  }, []);

  // 关闭错误提醒
  const dismissConnectionError = React.useCallback(() => {
    setHasConnectionError(false);
  }, []);

  function handleConnect() {
    isConnectingRef.current = false;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setWebSocketStatus("CONNECTED");
    removeErrorMessage();

    // 清除连接错误状态
    setHasConnectionError(false);
  }

  function handleMessage(event: Record<string, unknown>) {
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

    // Check if this could be a terminal-related event
    if (
      (event as any).action === "run" ||
      (event as any).observation === "run" ||
      (event as any).content ||
      (event as any).message
    ) {
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
        // InsightAI不显示右上角错误弹窗，使用自己的错误显示机制
        // setErrorMessage(errorMessage);

        return;
      }

      if (isOpenHandsAction(event) || isOpenHandsObservation(event)) {
        setParsedEvents((prevEvents) => [...prevEvents, event]);
      } else {
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
          // Do not refetch if we are still receiving messages at a high rate
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

    setEvents((prevEvents) => {
      const newEvents = [...prevEvents, event];
      return newEvents;
    });
    if (!Number.isNaN(parseInt(event.id as string, 10))) {
      lastEventRef.current = event;
    }
  }

  function handleDisconnect(data: unknown) {
    isConnectingRef.current = false;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    setWebSocketStatus("DISCONNECTED");

    // 设置连接错误状态以启用重连功能
    setHasConnectionError(true);

    const sio = sioRef.current;
    if (!sio) {
      return;
    }
    sio.io.opts.query = sio.io.opts.query || {};
    sio.io.opts.query.latest_event_id = lastEventRef.current?.id;
    updateStatusWhenErrorMessagePresent(data);

    // InsightAI不显示右上角错误弹窗，使用自己的错误显示机制
    // setErrorMessage(hasValidMessageProperty(data) ? data.message : "");
  }

  function handleError(data: unknown) {
    isConnectingRef.current = false;
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    // set status
    setWebSocketStatus("DISCONNECTED");

    // 设置连接错误状态以启用重连功能
    setHasConnectionError(true);

    updateStatusWhenErrorMessagePresent(data);

    // InsightAI不显示右上角错误弹窗，使用自己的错误显示机制
    // setErrorMessage(
    //   hasValidMessageProperty(data)
    //     ? data.message
    //     : "An unknown error occurred on the WebSocket connection.",
    // );

    // check if something went wrong with the conversation.
    refetchConversation();
  }

  React.useEffect(() => {
    lastEventRef.current = null;

    // reset events when conversationId changes
    setEvents([]);
    setParsedEvents([]);
    setWebSocketStatus("CONNECTING");
  }, [conversationId]);

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
      setWebSocketStatus("DISCONNECTED");
      setEvents([]);
      setParsedEvents([]);
      return () => undefined;
    }

    // 检查对话是否可以连接（只有RUNNING或STARTING状态才能连接）
    // 如果明确知道对话状态，优先使用status判断
    const canConnect =
      conversation?.status === "RUNNING" || conversation?.status === "STARTING";

    if (!canConnect) {
      // 明确设置为DISCONNECTED状态，防止循环连接
      setWebSocketStatus("DISCONNECTED");
      isConnectingRef.current = false;
      currentConversationRef.current = "";
      return () => undefined; // conversation not ready for connection
    }

    // 防止重复连接相同的对话
    if (
      currentConversationRef.current === conversationId &&
      isConnectingRef.current
    ) {
      return () => undefined;
    }

    // 防止在已连接状态下重复连接
    if (
      webSocketStatus === "CONNECTED" &&
      currentConversationRef.current === conversationId
    ) {
      return () => undefined;
    }

    // 设置连接防护
    currentConversationRef.current = conversationId;
    isConnectingRef.current = true;

    let sio = sioRef.current;

    if (sio?.connected) {
      sio.disconnect();
    }

    // Set initial status...
    setWebSocketStatus("CONNECTING");

    const lastEvent = lastEventRef.current;
    const query = {
      latest_event_id: lastEvent?.id ?? -1,
      conversation_id: conversationId,
      providers_set: providers,
      session_api_key: conversation.session_api_key, // Have to set here because socketio doesn't support custom headers. :(
    };

    let baseUrl = null;
    if (conversation.url && !conversation.url.startsWith("/")) {
      baseUrl = new URL(conversation.url).host;
    } else {
      baseUrl = import.meta.env.VITE_BACKEND_BASE_URL || window?.location.host;
    }

    sio = io(baseUrl, {
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
      if (isConnectingRef.current && webSocketStatus !== "CONNECTED") {
        isConnectingRef.current = false;
        setWebSocketStatus("DISCONNECTED");
        setHasConnectionError(true);
      }
    }, 10000); // 10秒超时

    sioRef.current = sio;

    return () => {
      sio.off("connect", handleConnect);
      sio.off("oh_event", handleMessage);
      sio.off("connect_error", handleError);
      sio.off("connect_failed", handleError);
      sio.off("disconnect", handleDisconnect);
    };
  }, [
    conversationId,
    // 依赖对话状态，当状态变化时重新评估连接
    conversation?.status,
    conversation?.url,
    conversation?.session_api_key,
    // providers变化较少，保留
    providers,
  ]);

  React.useEffect(
    () => () => {
      isConnectingRef.current = false;
      currentConversationRef.current = "";

      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }

      const sio = sioRef.current;
      if (sio) {
        sio.off("disconnect", handleDisconnect);
        sio.disconnect();
      }
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
