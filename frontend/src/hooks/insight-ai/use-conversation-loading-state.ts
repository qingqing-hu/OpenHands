import React from "react";
import { ConversationLoadingState } from "#/components/insight-ai/shared/insight-ai-loading-states";
import { WebSocketStatus } from "./use-insight-ai-ws-client";
import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsObservation } from "#/types/core/observations";

interface UseConversationLoadingStateProps {
  conversationId: string;
  webSocketStatus: WebSocketStatus;
  parsedEvents: (OpenHandsAction | OpenHandsObservation)[];
  hasValidConversationId: boolean;
  conversationStatus?: string;
  conversationRuntimeStatus?: boolean;
}

export function useConversationLoadingState({
  conversationId,
  webSocketStatus,
  parsedEvents,
  hasValidConversationId,
  conversationStatus,
  conversationRuntimeStatus,
}: UseConversationLoadingStateProps) {
  // 检查对话是否正在运行或启动中（与WebSocket客户端逻辑保持一致）
  const isConversationActiveOrStarting = () => {
    // 如果明确知道对话状态，优先使用conversationStatus
    if (conversationStatus) {
      return (
        conversationStatus === "RUNNING" || conversationStatus === "STARTING"
      );
    }
    // 如果对话状态是STOPPED，明确不连接，无论runtime_status如何
    if (conversationStatus === "STOPPED") {
      return false;
    }
    // 只有在conversationStatus完全未知时才依赖runtime_status
    return Boolean(conversationRuntimeStatus);
  };

  // 根据初始状态智能设置初始值，避免状态闪烁
  const getInitialState = (): ConversationLoadingState => {
    if (!hasValidConversationId || !conversationId) {
      return "idle";
    }
    // 如果对话状态已知且未启动，直接设置为unstarted
    if (
      (conversationStatus || conversationRuntimeStatus !== undefined) &&
      !isConversationActiveOrStarting()
    ) {
      return "unstarted";
    }
    // 如果对话状态已知且正在运行/启动，从connecting开始
    if (isConversationActiveOrStarting()) {
      return "connecting";
    }
    // 如果对话状态未知（还在加载），保持idle状态等待数据
    return "idle";
  };

  const [loadingState, setLoadingState] =
    React.useState<ConversationLoadingState>(getInitialState);
  const [error, setError] = React.useState<string>("");

  // 记录当前处理的对话ID，用于检测切换
  const currentConversationRef = React.useRef<string>("");

  // 重置状态当对话ID变化时
  React.useEffect(() => {
    // 检测对话ID是否真正发生了变化
    const isConversationChanged =
      currentConversationRef.current !== conversationId;
    currentConversationRef.current = conversationId;

    if (!hasValidConversationId || !conversationId) {
      setLoadingState("idle");
      setError("");
      return;
    }

    // 如果对话ID发生变化，智能设置初始状态
    if (isConversationChanged && conversationId) {
      // 根据可用信息智能设置初始状态，避免错误的"connecting"状态
      const intelligentInitialState = getInitialState();
      setLoadingState(intelligentInitialState);
      setError("");
    }

    // 如果对话状态还未加载，保持当前状态等待
    // 严格等待conversationStatus加载，避免基于不完整数据做判断
    if (!conversationStatus) {
      return;
    }

    // 检查对话是否未启动（与WebSocket客户端逻辑保持一致）
    if (!isConversationActiveOrStarting()) {
      // 只有当前状态不是unstarted时才设置，避免不必要的重新渲染
      if (loadingState !== "unstarted") {
        setLoadingState("unstarted");
      }
      setError("");
      return;
    }

    // 对话正在运行/启动，设置为连接状态
    if (isConversationActiveOrStarting()) {
      // 只有在必要时才改变loading state，避免触发不必要的状态变化
      // 如果WebSocket已经连接且状态是ready，不要改变状态
      if (webSocketStatus === "CONNECTED" && loadingState === "ready") {
        // WebSocket已连接且UI状态正确，不需要任何操作
      } else if (loadingState !== "connecting" && loadingState !== "connected" && loadingState !== "ready") {
        setLoadingState("connecting");
      }
      setError("");
    }
  }, [
    conversationId,
    hasValidConversationId,
    conversationStatus,
    conversationRuntimeStatus,
    webSocketStatus,
    loadingState,
  ]);

  // 监听WebSocket状态变化
  React.useEffect(() => {
    if (!hasValidConversationId) return;

    // 如果当前是未启动状态，不应该被WebSocket状态改变覆盖
    if (loadingState === "unstarted") {
      return;
    }

    switch (webSocketStatus) {
      case "CONNECTING":
        // 只有在非ready和非unstarted状态时才设置为connecting
        if (
          loadingState !== "ready" &&
          (loadingState as ConversationLoadingState) !== "unstarted"
        ) {
          setLoadingState("connecting");
        }
        setError("");
        break;
      case "CONNECTED":
        // 只有在非ready和非unstarted状态时才设置为connected
        if (
          loadingState !== "ready" &&
          (loadingState as ConversationLoadingState) !== "unstarted"
        ) {
          setLoadingState("connected");
        }
        setError("");
        break;
      case "NOT_CONNECTED":
        // NOT_CONNECTED状态表示从未尝试连接，对于已停止的对话是正常状态
        if (!isConversationActiveOrStarting()) {
          // 对话未启动或已停止，设置为unstarted状态
          if ((loadingState as ConversationLoadingState) !== "unstarted") {
            setLoadingState("unstarted");
          }
        }
        break;
      case "DISCONNECTED":
        // 如果对话未启动，保持unstarted状态，否则显示错误
        if (!isConversationActiveOrStarting()) {
          // 对话未启动或已停止，保持unstarted状态
          if ((loadingState as ConversationLoadingState) !== "unstarted") {
            setLoadingState("unstarted");
          }
        } else if (
          loadingState !== "ready" &&
          (loadingState as ConversationLoadingState) !== "unstarted"
        ) {
          setLoadingState("error");
          setError("WebSocket连接断开");
        }
        break;
      default:
        // No action needed for unknown status
        break;
    }
  }, [
    webSocketStatus,
    hasValidConversationId,
    // 移除loadingState依赖，避免WebSocket状态监听的循环
    conversationStatus,
    conversationRuntimeStatus,
  ]);

  // 监听消息数据变化
  React.useEffect(() => {
    if (!hasValidConversationId || webSocketStatus !== "CONNECTED") return;

    // 如果连接成功但还没有数据，显示加载历史状态
    if (parsedEvents.length === 0 && loadingState === "connected") {
      setLoadingState("loading_history");
      return;
    }

    // 有数据了，显示处理状态然后设为准备就绪
    if (parsedEvents.length > 0 && loadingState !== "ready") {
      if (loadingState !== "processing_messages") {
        setLoadingState("processing_messages");

        // 短暂延迟后设为准备就绪
        const timeoutId = setTimeout(() => {
          setLoadingState("ready");
        }, 200);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [parsedEvents.length, hasValidConversationId, webSocketStatus]);

  // 空对话超时处理
  React.useEffect(() => {
    if (!hasValidConversationId || webSocketStatus !== "CONNECTED") return;

    if (loadingState === "loading_history" && parsedEvents.length === 0) {
      const timeoutId = setTimeout(() => {
        setLoadingState("ready");
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [
    loadingState,
    parsedEvents.length,
    hasValidConversationId,
    webSocketStatus,
  ]);

  // 错误处理
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      if (loadingState === "connecting") {
        setLoadingState("error");
        setError("连接超时，请检查网络连接");
      }
    }, 10000); // 10秒连接超时

    return () => clearTimeout(timeout);
  }, [loadingState]);

  return {
    loadingState,
    error,
    messageCount: parsedEvents.length,
  };
}
