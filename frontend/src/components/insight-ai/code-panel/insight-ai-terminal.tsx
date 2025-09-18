import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { useInsightAIMessages } from "#/hooks/insight-ai/use-insight-ai-messages";
import { getInsightAITerminalCommand } from "#/services/insight-ai-terminal-service";
import {
  isTerminalCommand,
  isTerminalOutput,
} from "#/services/insight-ai-terminal-service";
import { useInsightAIWsContext } from "./insight-ai-code-panel";
import { RootState } from "#/store";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";

interface TerminalEntry {
  id: string;
  type: "command" | "output";
  content: string;
  timestamp: Date;
  exitCode?: number;
}

interface InsightAITerminalProps {
  taskId: string;
}

export function InsightAITerminal({ taskId }: InsightAITerminalProps) {
  const [commandInput, setCommandInput] = useState("");
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false);
  const [promptInfo, setPromptInfo] = useState<{
    username?: string;
    hostname?: string;
  }>({});

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取智能体状态
  const { curAgentState } = useSelector((state: RootState) => state.agent);
  const isRuntimeInactive = RUNTIME_INACTIVE_STATES.includes(curAgentState);
  const isAgentError = curAgentState === "error";

  // 🏆 使用共享的WebSocket连接而不是创建新连接
  const sharedWsConnection = useInsightAIWsContext();

  // 从共享连接中提取终端所需的数据和方法
  const {
    parsedEvents,
    send,
    webSocketStatus,
    hasConnectionError,
  } = sharedWsConnection;

  // 处理终端条目，从共享的事件流中提取
  const terminalEntries = React.useMemo(() => {
    if (!parsedEvents || parsedEvents.length === 0) {
      return [];
    }

    const entries: TerminalEntry[] = [];

    parsedEvents.forEach((event: any) => {
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

        // 尝试从事件中提取用户名和hostname信息
        const metadata = (event as any).metadata;
        if (metadata?.username && metadata?.hostname) {
          setPromptInfo({
            username: metadata.username,
            hostname: metadata.hostname,
          });
        }

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
  }, [parsedEvents]);

  const isConnected = webSocketStatus === "CONNECTED";
  const canExecuteCommands = isConnected && !isRuntimeInactive && !isAgentError;

  // 生成动态提示符
  const getPromptPrefix = () => {
    const username = promptInfo.username || "ai";
    const hostname = promptInfo.hostname || "sandbox";
    return `${username}@${hostname}`;
  };

  // Combine real terminal entries with pending command
  const displayEntries = React.useMemo(() => {
    const entries = [...terminalEntries];

    // Add pending command if exists
    if (pendingCommand) {
      entries.push({
        id: `pending_${Date.now()}`,
        type: "command" as const,
        content: pendingCommand,
        timestamp: new Date(),
      });
    }

    return entries.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }, [terminalEntries, pendingCommand]);

  // Handle terminal command execution
  const handleSendCommand = (command: string = commandInput.trim()) => {
    if (!command) return;

    if (!canExecuteCommands) {
      return;
    }

    const commandEvent = getInsightAITerminalCommand(command);

    try {
      // Add to command history
      setCommandHistory((prev) => [...prev, command]);
      setHistoryIndex(-1);

      // Show command immediately in terminal
      setPendingCommand(command);

      // Send the command
      send(commandEvent);

      // Clear input immediately
      setCommandInput("");

      // Clear pending command after a timeout if no response received
      setTimeout(() => {
        setPendingCommand((prev) => (prev === command ? null : prev));
      }, 5000);
    } catch (error) {
      console.error("🔍 [Terminal] Failed to send command:", error);
      setPendingCommand(null);
    }
  };

  // Handle composition events for IME input
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // Handle key events for command input and history navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If we're in the middle of IME composition, don't handle Enter
    if (isComposing) {
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCommandInput(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCommandInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Could add tab completion in the future
    }
  };

  // Auto focus terminal input when clicked (only if commands can be executed)
  const handleTerminalClick = () => {
    if (canExecuteCommands && !inputRef.current?.matches(":focus")) {
      inputRef.current?.focus();
    }
  };

  // Auto scroll to bottom when new entries are added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayEntries, pendingCommand]);

  // Clear pending command when new terminal entries are received
  useEffect(() => {
    if (terminalEntries.length > 0 && pendingCommand) {
      const lastCommand = terminalEntries
        .filter((entry) => entry.type === "command")
        .pop();

      if (lastCommand && lastCommand.content === pendingCommand) {
        setPendingCommand(null);
      }
    }
  }, [terminalEntries, pendingCommand]);

  // Auto focus on mount (only if commands can be executed)
  useEffect(() => {
    if (canExecuteCommands) {
      inputRef.current?.focus();
    }
  }, [canExecuteCommands]);

  // Auto re-focus input when command execution completes
  useEffect(() => {
    // When pendingCommand changes from a value to null (command completed)
    // or when new terminal entries are added, refocus the input
    if (!pendingCommand && canExecuteCommands) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [pendingCommand, canExecuteCommands, terminalEntries.length]);

  // Keep focus on input even during command execution (only when commands can be executed)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const terminalElement = terminalRef.current;
      if (terminalElement && terminalElement.contains(e.target as Node) && canExecuteCommands) {
        // If clicking anywhere inside terminal, focus the input only when commands can be executed
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    };

    if (canExecuteCommands) {
      document.addEventListener("click", handleGlobalClick);
      return () => document.removeEventListener("click", handleGlobalClick);
    }
  }, [canExecuteCommands]);

  return (
    <div
      className={`h-full bg-gray-900 rounded-xl overflow-hidden ${canExecuteCommands ? "cursor-text" : "cursor-default"}`}
      onClick={handleTerminalClick}
      style={{
        fontFamily: "Fira Code, Monaco, Cascadia Code, Roboto Mono, monospace",
        fontSize: "12px",
        lineHeight: "1.5",
      }}
    >
      <div
        ref={terminalRef}
        className="h-full overflow-auto p-4"
        style={{
          backgroundColor: "#212121",
          color: "#EEFFFF",
          fontFamily: "inherit",
          fontSize: "inherit",
          lineHeight: "inherit",
        }}
      >
        {/* Terminal header */}
        <div className="mb-2 text-sm opacity-75">
          <span style={{ color: "#89DDFF" }}>InsightAI Terminal</span>
          <span
            className={`ml-4 ${webSocketStatus === "CONNECTING" ? "animate-pulse" : ""}`}
            style={{
              color:
                webSocketStatus === "CONNECTED"
                  ? "#C3E88D"
                  : webSocketStatus === "CONNECTING"
                    ? "#FFCB6B"
                    : "#FF5370",
            }}
          >
            {webSocketStatus === "CONNECTED"
              ? "● Connected"
              : webSocketStatus === "CONNECTING"
                ? "● Connecting..."
                : "● Disconnected"}
          </span>
        </div>

        {/* Terminal history and output */}
        {displayEntries.map((entry) => {
          const promptPrefix = getPromptPrefix();
          return (
            <div key={entry.id} className="mb-1">
              {entry.type === "command" ? (
                <div className="flex overflow-x-auto whitespace-nowrap min-w-0">
                  <span className="whitespace-nowrap flex-shrink-0" style={{ color: "#FFCB6B" }}>
                    {promptPrefix}
                    <span style={{ color: "#89DDFF" }}>:</span>
                    <span style={{ color: "#89DDFF" }}>~</span>
                  </span>
                  <span className="flex-shrink-0" style={{ color: "#89DDFF" }}>$ </span>
                  <span className="flex-shrink-0" style={{ color: "#EEFFFF" }}>{entry.content}</span>
                </div>
              ) : (
                <div
                  className="whitespace-pre-wrap pl-4"
                  style={{ color: "#C3E88D" }}
                >
                  {entry.content}
                  {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                    <span style={{ color: "#FF5370" }}>
                      {" "}
                      [Exit: {entry.exitCode}]
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Welcome message when connected and no terminal data */}
        {displayEntries.length === 0 && isConnected && !isRuntimeInactive && (
          <div className="mb-4 opacity-75">
            <div style={{ color: "#89DDFF" }}>
              Welcome to InsightAI Terminal
            </div>
            <div style={{ color: "#C3E88D" }}>
              Type commands and press Enter to execute
            </div>
            <div className="mt-1 text-xs" style={{ color: "#808080" }}>
              Use ↑/↓ for command history
            </div>
          </div>
        )}

        {/* Runtime inactive message when connected but agent not ready */}
        {isConnected && isRuntimeInactive && (
          <div className="mb-2 p-2 rounded border-l-4" style={{
            backgroundColor: "rgba(255, 203, 107, 0.1)",
            borderLeftColor: "#FFCB6B"
          }}>
            <div className="flex items-center gap-2">
              <span style={{ color: "#FFCB6B", fontSize: "12px" }}>⚡</span>
              <div style={{ color: "#FFCB6B", fontSize: "12px" }} className="font-medium">
                智能体未就绪
              </div>
            </div>
            <div className="mt-0.5" style={{ color: "#C3E88D", fontSize: "12px" }}>
              当前智能体处于 {curAgentState} 状态，终端命令功能暂时不可用
            </div>
          </div>
        )}

        {/* WebSocket connection error message - only show if WebSocket actually disconnected */}
        {webSocketStatus === "DISCONNECTED" && (
          <div className="mb-2 p-2 rounded border-l-4" style={{
            backgroundColor: "rgba(255, 83, 112, 0.1)",
            borderLeftColor: "#FF5370"
          }}>
            <div className="flex items-center gap-2">
              <span style={{ color: "#FF5370", fontSize: "12px" }}>⚠️</span>
              <div style={{ color: "#FF5370", fontSize: "12px" }} className="font-medium">
                WebSocket连接已断开
              </div>
            </div>
            <div className="mt-0.5" style={{ color: "#C3E88D", fontSize: "12px" }}>
              网络连接中断，请刷新页面重试
            </div>
          </div>
        )}

        {/* Sandbox container error message - show when agent is in error state but WebSocket is connected */}
        {isAgentError && webSocketStatus === "CONNECTED" && (
          <div className="mb-2 p-2 rounded border-l-4" style={{
            backgroundColor: "rgba(255, 83, 112, 0.1)",
            borderLeftColor: "#FF5370"
          }}>
            <div className="flex items-center gap-2">
              <span style={{ color: "#FF5370", fontSize: "12px" }}>🚫</span>
              <div style={{ color: "#FF5370", fontSize: "12px" }} className="font-medium">
                智能体遇到错误
              </div>
            </div>
            <div className="mt-0.5" style={{ color: "#C3E88D", fontSize: "12px" }}>
              智能体执行过程中发生异常，智能体不可用
            </div>
          </div>
        )}



        {/* Current command input line - only show when connected AND agent is ready (not in runtime inactive states) */}
        {isConnected && !isRuntimeInactive && (
          <div className="flex items-center overflow-x-auto whitespace-nowrap min-w-0">
            <span className="whitespace-nowrap flex-shrink-0" style={{ color: "#FFCB6B" }}>
              {getPromptPrefix()}
              <span style={{ color: "#89DDFF" }}>:</span>
              <span style={{ color: "#89DDFF" }}>~</span>
            </span>
            <span className="flex-shrink-0" style={{ color: "#89DDFF" }}>$ </span>
            <input
              ref={inputRef}
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              disabled={!canExecuteCommands}
              readOnly={!!pendingCommand}
              className="flex-1 bg-transparent border-none outline-none text-inherit min-w-0"
              style={{
                color: "#EEFFFF",
                fontFamily: "inherit",
                fontSize: "inherit",
              }}
              placeholder=""
              autoComplete="off"
            />
            {!pendingCommand && webSocketStatus === "CONNECTED" && (
              <span className="animate-pulse flex-shrink-0" style={{ color: "#89DDFF" }}>
                _
              </span>
            )}
          </div>
        )}

        {/* Spacer to ensure there's always scrollable space */}
        <div className="h-4" />
      </div>
    </div>
  );
}
