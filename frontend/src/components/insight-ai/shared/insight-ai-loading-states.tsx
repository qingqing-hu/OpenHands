import React, { useState } from "react";
import { Play, RefreshCw } from "lucide-react";
import { WebSocketConnectionError } from "./websocket-connection-error";

export type ConversationLoadingState =
  | "idle" // 空闲状态
  | "unstarted" // 对话未启动状态
  | "connecting" // WebSocket连接中
  | "connected" // WebSocket已连接
  | "loading_history" // 加载历史消息中
  | "processing_messages" // 处理消息数据中
  | "ready" // 完成加载
  | "error"; // 连接或加载错误

interface ConversationLoadingIndicatorProps {
  state: ConversationLoadingState;
  error?: string;
  messageCount?: number;
  onStartConversation?: () => void;
  onReconnect?: () => void;
  isStarting?: boolean;
}

export function ConversationLoadingIndicator({
  state,
  error,
  messageCount = 0,
  onStartConversation,
  onReconnect,
  isStarting = false,
}: ConversationLoadingIndicatorProps) {
  const getStateConfig = (state: ConversationLoadingState) => {
    switch (state) {
      case "idle":
        return {
          title: "准备中",
          description: "准备加载对话...",
          showSpinner: false,
          color: "text-gray-600",
        };
      case "unstarted":
        return {
          title: "对话未启动",
          description: "此对话尚未启动，需要先启动后才能查看内容。",
          showSpinner: false,
          color: "text-orange-600",
        };
      case "connecting":
        return {
          title: "连接中",
          description: "正在连接到服务器...",
          showSpinner: true,
          color: "text-yellow-600",
        };
      case "connected":
        return {
          title: "连接成功",
          description: "已连接到服务器，加载历史数据...",
          showSpinner: true,
          color: "text-green-600",
        };
      case "loading_history":
        return {
          title: "加载历史",
          description: "正在从服务器获取对话历史...",
          showSpinner: true,
          color: "text-blue-600",
        };
      case "processing_messages":
        return {
          title: "处理数据",
          description: `正在处理 ${messageCount} 条消息...`,
          showSpinner: true,
          color: "text-green-500",
        };
      case "ready":
        return {
          title: "加载完成",
          description: "对话已准备就绪",
          showSpinner: false,
          color: "text-green-600",
        };
      case "error":
        return {
          title: "WebSocket连接异常",
          description:
            "无法连接上WebSocket服务器，对话内容不可查看。",
          showSpinner: false,
          color: "text-red-600",
        };
      default:
        return {
          title: "未知状态",
          description: "状态异常",
          showSpinner: false,
          color: "text-gray-600",
        };
    }
  };

  const config = getStateConfig(state);

  if (state === "ready") {
    // 不显示任何loading界面，直接显示消息
    return null;
  }

  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const handleStartClick = () => {
    setShowStartConfirm(true);
  };

  const handleStartConfirm = () => {
    if (onStartConversation) {
      setHasStarted(true);
      onStartConversation();
    }
  };

  // 只有在真正启动过程完成后才自动关闭对话框
  React.useEffect(() => {
    if (hasStarted && !isStarting) {
      // 启动完成后立即关闭对话框，不延迟
      setShowStartConfirm(false);
      setHasStarted(false); // 重置状态
    }
  }, [hasStarted, isStarting]);

  const handleStartCancel = () => {
    setShowStartConfirm(false);
    setHasStarted(false); // 重置启动状态
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        {config.showSpinner && (
          <div
            className={`animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-4 ${config.color}`}
          />
        )}
        {/* Only show title and description for non-error states */}
        {state !== "error" && (
          <>
            <h3 className={`text-lg font-semibold mb-2 ${config.color}`}>
              {config.title}
            </h3>
            <p className="text-gray-600 text-sm mb-6 max-w-md">
              {config.description}
            </p>
          </>
        )}

        {/* 未启动状态显示启动按钮 */}
        {state === "unstarted" && onStartConversation && (
          <>
            {!showStartConfirm ? (
              <button
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm ${
                  isStarting
                    ? "bg-green-600 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                }`}
                onClick={isStarting ? undefined : handleStartClick}
                disabled={isStarting}
              >
                {isStarting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                    启动中...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    启动对话
                  </>
                )}
              </button>
            ) : null}
          </>
        )}

        {/* Start Confirmation Dialog - 与左侧栏保持一致的全屏模态框 */}
        {state === "unstarted" && showStartConfirm && onStartConversation && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop overlay with 50% opacity */}
            <div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
              onClick={isStarting ? undefined : handleStartCancel}
            />

            {/* Centered dialog box */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-sm w-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Play className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 mb-1 text-left">
                      启动对话
                    </h3>
                    <p className="text-sm text-gray-600 text-left">
                      确定要启动这个已停止的对话吗？
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={isStarting ? undefined : handleStartCancel}
                    disabled={isStarting}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      isStarting
                        ? "text-gray-400 bg-gray-50 cursor-not-allowed"
                        : "text-gray-700 bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    取消
                  </button>
                  <button
                    onClick={isStarting ? undefined : handleStartConfirm}
                    disabled={isStarting}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-2 ${
                      isStarting
                        ? "text-white bg-green-600 cursor-not-allowed"
                        : "text-white bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {isStarting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                        启动中...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        启动
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WebSocket连接异常显示 */}
        {state === "error" && onReconnect && (
          <WebSocketConnectionError
            onReconnect={onReconnect}
            variant="full"
          />
        )}

        {/* 没有重连回调时的fallback显示 */}
        {state === "error" && !onReconnect && (
          <WebSocketConnectionError
            variant="full"
            reconnectText="刷新页面"
          />
        )}
      </div>
    </div>
  );
}
