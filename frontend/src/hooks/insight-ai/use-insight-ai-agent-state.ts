import React from "react";
import { AgentState } from "#/types/agent-state";
import { isAgentStateChangeObservation } from "#/types/core/guards";
import { OpenHandsParsedEvent } from "#/types/core";

interface UseInsightAIAgentState {
  agentState: AgentState;
  isWaitingForUserInput: boolean;
  isInputDisabled: boolean;
  getAgentStateMessage: () => string;
}

interface UseInsightAIAgentStateOptions {
  /** WebSocket连接状态 */
  webSocketStatus?: "CONNECTING" | "CONNECTED" | "DISCONNECTED";
  /** 重连函数，用于超时时触发重连 */
  reconnect?: () => void;
}

/**
 * InsightAI专用的智能体状态管理Hook
 * 监听WebSocket事件中的智能体状态变更，提供状态查询和输入控制逻辑
 * 添加了超时恢复和状态同步机制
 */
export function useInsightAIAgentState(
  parsedEvents: (any)[],
  options: UseInsightAIAgentStateOptions = {}
): UseInsightAIAgentState {
  const { webSocketStatus, reconnect } = options;
  const [agentState, setAgentState] = React.useState<AgentState>(AgentState.INIT);
  const stateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastStateChangeRef = React.useRef<number>(Date.now());

  // 缓存最新的智能体状态事件，避免重复计算
  const latestAgentStateEvent = React.useMemo(() => {
    if (!parsedEvents || parsedEvents.length === 0) {
      return null;
    }

    // 从最新的事件中查找最后一个智能体状态变更
    return [...parsedEvents]
      .reverse()
      .find((event: OpenHandsParsedEvent) => isAgentStateChangeObservation(event)) || null;
  }, [parsedEvents]);

  // 清理超时定时器
  const clearStateTimeout = React.useCallback(() => {
    if (stateTimeoutRef.current) {
      clearTimeout(stateTimeoutRef.current);
      stateTimeoutRef.current = null;
    }
  }, []);

  // 设置状态超时检查
  const setStateTimeout = React.useCallback((state: AgentState, timeoutMs: number) => {
    clearStateTimeout();
    stateTimeoutRef.current = setTimeout(() => {
      console.warn(`[InsightAI-AgentState] State "${state}" timeout after ${timeoutMs}ms`);
      
      if (state === AgentState.LOADING) {
        console.log(`[InsightAI-AgentState] LOADING timeout detected`);
        
        // 检查WebSocket是否仍然连接
        if (webSocketStatus === "CONNECTED") {
          console.log(`[InsightAI-AgentState] WebSocket still connected during timeout, extending timeout period`);
          // 如果WebSocket仍然连接，说明对话可能仍在进行
          // 延长超时时间而不是强制重置，避免中断正在运行的任务
          setStateTimeout(state, timeoutMs); // 再给一个周期的时间
          return;
        }
        
        // 只有在WebSocket断开时才尝试恢复
        if (webSocketStatus === "DISCONNECTED" && reconnect) {
          console.log(`[InsightAI-AgentState] WebSocket disconnected, triggering reconnect`);
          reconnect();
        } else {
          // 如果WebSocket状态未知或无重连函数，保持当前状态不变
          // 不要强制重置为INIT，避免干扰正在运行的对话
          console.log(`[InsightAI-AgentState] Timeout but cannot determine safe recovery action, maintaining current state`);
        }
      }
    }, timeoutMs);
  }, [webSocketStatus, reconnect, clearStateTimeout]);

  // 仅在智能体状态事件真正改变时更新状态
  React.useEffect(() => {
    if (!latestAgentStateEvent || !isAgentStateChangeObservation(latestAgentStateEvent)) {
      return;
    }

    const newState = latestAgentStateEvent.extras.agent_state as AgentState;
    setAgentState(prevState => {
      if (newState !== prevState) {
        console.log(`[InsightAI-AgentState] State changed: ${prevState} -> ${newState}`);
        lastStateChangeRef.current = Date.now();
        
        // 清理之前的超时定时器
        clearStateTimeout();
        
        // 为LOADING状态设置超时检查
        if (newState === AgentState.LOADING) {
          console.log(`[InsightAI-AgentState] Setting timeout for LOADING state`);
          setStateTimeout(newState, 30000); // 30秒超时
        }
        
        return newState;
      }
      return prevState;
    });
  }, [latestAgentStateEvent, clearStateTimeout, setStateTimeout]);

  // WebSocket连接状态变化时的处理
  React.useEffect(() => {
    if (webSocketStatus === "CONNECTED") {
      console.log(`[InsightAI-AgentState] WebSocket connected, current state: ${agentState}`);
      
      // 只有在LOADING状态且没有超时定时器时才设置超时
      if (agentState === AgentState.LOADING && !stateTimeoutRef.current) {
        console.log(`[InsightAI-AgentState] Setting timeout for LOADING state after WebSocket connection`);
        setStateTimeout(AgentState.LOADING, 60000); // 增加到60秒，给更多时间
      }
      
      // 对于INIT状态，不需要任何特殊处理，等待自然状态变化
      if (agentState === AgentState.INIT) {
        console.log(`[InsightAI-AgentState] Connected in INIT state, waiting for natural state progression`);
      }
    } else if (webSocketStatus === "DISCONNECTED") {
      console.log(`[InsightAI-AgentState] WebSocket disconnected, clearing timeouts`);
      // 连接断开时清理超时定时器
      clearStateTimeout();
    }
  }, [webSocketStatus, agentState, setStateTimeout, clearStateTimeout]);

  // 组件卸载时清理定时器
  React.useEffect(() => {
    return () => {
      clearStateTimeout();
    };
  }, [clearStateTimeout]);

  // 计算是否等待用户输入
  const isWaitingForUserInput = React.useMemo(() => {
    return agentState === AgentState.AWAITING_USER_INPUT || 
           agentState === AgentState.FINISHED;
  }, [agentState]);

  // 计算输入框是否应该禁用
  const isInputDisabled = React.useMemo(() => {
    return agentState === AgentState.LOADING || 
           agentState === AgentState.INIT ||  // INIT状态也应该禁用输入，因为智能体还未准备好
           agentState === AgentState.AWAITING_USER_CONFIRMATION;
  }, [agentState]);

  // 获取智能体状态消息
  const getAgentStateMessage = React.useCallback((): string => {
    switch (agentState) {
      case AgentState.LOADING:
      case AgentState.INIT:
        // 合并显示：两种状态都是用户无法交互的初始化阶段
        return "正在初始化智能体...";
      case AgentState.RUNNING:
        return "智能体正在执行任务...";
      case AgentState.AWAITING_USER_INPUT:
        return "智能体正在等待用户输入...";
      case AgentState.PAUSED:
        return "智能体已暂停";
      case AgentState.STOPPED:
        return "智能体已停止";
      case AgentState.FINISHED:
        return "智能体已完成任务";
      case AgentState.REJECTED:
        return "智能体拒绝任务";
      case AgentState.ERROR:
        return "智能体遇到错误";
      case AgentState.RATE_LIMITED:
        return "智能体已达到速率限制。正在重试...";
      case AgentState.AWAITING_USER_CONFIRMATION:
        return "代理正在等待用户确认待处理的操作。";
      case AgentState.USER_CONFIRMED:
        return "代理操作已确认！";
      case AgentState.USER_REJECTED:
        return "代理操作已被拒绝！";
      default:
        return "智能体状态未知";
    }
  }, [agentState]);

  return {
    agentState,
    isWaitingForUserInput,
    isInputDisabled,
    getAgentStateMessage,
  };
}