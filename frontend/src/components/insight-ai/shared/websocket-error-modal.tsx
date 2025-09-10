import React, { useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

interface WebSocketErrorModalProps {
  isOpen: boolean;
  onReconnect: () => Promise<void> | void;
}

export function WebSocketErrorModal({
  isOpen,
  onReconnect,
}: WebSocketErrorModalProps) {
  const [isReconnecting, setIsReconnecting] = useState(false);

  const handleReconnect = async () => {
    if (isReconnecting) return; // 防止重复点击

    setIsReconnecting(true);
    try {
      await onReconnect();
      // 给用户一点时间感知重连完成
      setTimeout(() => {
        setIsReconnecting(false);
      }, 500);
    } catch (error) {
      console.error("重连失败:", error);
      setIsReconnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="inline-flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4 text-red-600" />
        <div>
          <h4 className="text-sm font-medium text-red-800">
            WebSocket连接异常
          </h4>
          <p className="text-xs text-red-600">
            无法连接到WebSocket服务器，导致数据无法实时接收和发送。
          </p>
        </div>
      </div>
      <button
        onClick={handleReconnect}
        disabled={isReconnecting}
        className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="立即重连"
      >
        {isReconnecting ? (
          <RefreshCw className="w-3 h-3 text-red-600 animate-spin" />
        ) : (
          <RefreshCw className="w-3 h-3 text-red-600" />
        )}
      </button>
    </div>
  );
}
