import React from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export interface WebSocketConnectionErrorProps {
  /** 重连回调函数 */
  onReconnect?: () => void;
  /** 显示模式 */
  variant?: "full" | "compact" | "inline";
  /** 自定义错误描述 */
  description?: string;
  /** 是否显示重连按钮 */
  showReconnectButton?: boolean;
  /** 重连按钮文案 */
  reconnectText?: string;
  /** 自定义CSS类名 */
  className?: string;
}

/**
 * WebSocket连接异常统一显示组件
 * 
 * 使用场景：
 * - full: 完整的错误页面显示（loading states、conversation error）
 * - compact: 紧凑的模态框显示
 * - inline: 内联的简单显示（terminal）
 */
export function WebSocketConnectionError({
  onReconnect,
  variant = "full",
  description = "无法连接上WebSocket服务器，对话内容不可查看。",
  showReconnectButton = true,
  reconnectText = "立即重连",
  className = "",
}: WebSocketConnectionErrorProps) {
  const [isReconnecting, setIsReconnecting] = React.useState(false);

  const handleReconnect = async () => {
    if (isReconnecting) return; // 防止重复点击
    
    setIsReconnecting(true);
    
    try {
      if (onReconnect) {
        await onReconnect();
      } else {
        // 如果没有提供重连回调，则刷新页面作为fallback
        window.location.reload();
      }
    } catch (error) {
      console.error("重连失败:", error);
    } finally {
      // 延迟重置状态，让用户看到缓冲效果
      setTimeout(() => {
        setIsReconnecting(false);
      }, 1500);
    }
  };

  // 内联模式 - 用于terminal等场景
  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span style={{ color: "#FF5370" }}>⚠️</span>
        <div style={{ color: "#FF5370" }} className="font-medium">
          WebSocket连接异常
        </div>
      </div>
    );
  }

  // 紧凑模式 - 用于模态框
  if (variant === "compact") {
    return (
      <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <WifiOff className="w-4 h-4 text-red-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-800">
            WebSocket连接异常
          </h4>
          <p className="text-xs text-red-600 mt-0.5">
            {description}
          </p>
        </div>
        {showReconnectButton && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className={`p-1 rounded transition-colors flex-shrink-0 ${
              isReconnecting 
                ? "bg-red-100 cursor-not-allowed" 
                : "hover:bg-red-100"
            }`}
            title={isReconnecting ? "重连中..." : reconnectText}
          >
            <RefreshCw className={`w-4 h-4 text-red-600 ${isReconnecting ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
    );
  }

  // 完整模式 - 用于主要错误显示
  return (
    <div className={`text-center ${className}`}>
      <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-2xl flex items-center justify-center">
        <WifiOff className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-red-400 mb-2">
        WebSocket连接异常
      </h3>
      <p className="text-gray-600 mb-4 text-sm">
        {description}
      </p>
      {showReconnectButton && (
        <button
          onClick={handleReconnect}
          disabled={isReconnecting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md transition-colors font-medium text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3 h-3 ${isReconnecting ? "animate-spin" : ""}`} />
          {isReconnecting ? "重连中..." : reconnectText}
        </button>
      )}
    </div>
  );
}