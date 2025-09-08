import React from "react";
import { useInsightAITerminal } from "#/hooks/insight-ai/use-insight-ai-terminal";
import "@xterm/xterm/css/xterm.css";

interface InsightAITerminalProps {
  conversationId: string;
  className?: string;
  disabled?: boolean;
}

export function InsightAITerminal({ 
  conversationId, 
  className = "",
  disabled = false 
}: InsightAITerminalProps) {
  const { ref } = useInsightAITerminal({
    conversationId,
    disabled,
  });

  return (
    <div className={`insight-ai-terminal h-full flex flex-col ${className}`}>
      {disabled && (
        <div className="w-full h-full flex items-center text-center justify-center text-2xl text-gray-500">
          <div className="text-center">
            <div className="mb-4">⚠️</div>
            <p>终端功能暂时不可用</p>
            <p className="text-sm text-gray-400 mt-2">等待会话连接...</p>
          </div>
        </div>
      )}
      
      <div
        ref={ref}
        className={
          disabled
            ? "w-0 h-0 opacity-0 overflow-hidden"
            : "h-full w-full terminal-container"
        }
      />
    </div>
  );
}

export default InsightAITerminal;