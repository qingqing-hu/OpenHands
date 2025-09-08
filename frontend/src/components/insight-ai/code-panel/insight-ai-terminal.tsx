import React, { useState, useRef, useEffect } from 'react';
import { useInsightAIMessages } from "#/hooks/insight-ai/use-insight-ai-messages";
import { getInsightAITerminalCommand } from "#/services/insight-ai-terminal-service";

interface InsightAITerminalProps {
  taskId: string;
}

export function InsightAITerminal({ taskId }: InsightAITerminalProps) {
  const [commandInput, setCommandInput] = useState("");
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { terminalEntries, send, isConnected } = useInsightAIMessages(taskId || "");

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
    
    return entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [terminalEntries, pendingCommand]);

  // Handle terminal command execution
  const handleSendCommand = (command: string = commandInput.trim()) => {
    if (!command) return;
    
    if (!isConnected) {
      console.log("🔍 [Terminal] WebSocket not connected");
      return;
    }
    
    const commandEvent = getInsightAITerminalCommand(command);
    console.log("🔍 [Terminal] Sending command:", command);
    
    try {
      // Add to command history
      setCommandHistory(prev => [...prev, command]);
      setHistoryIndex(-1);
      
      // Show command immediately in terminal
      setPendingCommand(command);
      
      // Send the command
      send(commandEvent);
      
      // Clear input immediately
      setCommandInput("");
      
      // Clear pending command after a timeout if no response received
      setTimeout(() => {
        setPendingCommand(prev => prev === command ? null : prev);
      }, 5000);
    } catch (error) {
      console.error("🔍 [Terminal] Failed to send command:", error);
      setPendingCommand(null);
    }
  };

  // Handle key events for command input and history navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  // Auto focus terminal input when clicked
  const handleTerminalClick = () => {
    if (!inputRef.current?.matches(':focus')) {
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
        .filter(entry => entry.type === "command")
        .pop();
      
      if (lastCommand && lastCommand.content === pendingCommand) {
        setPendingCommand(null);
      }
    }
  }, [terminalEntries, pendingCommand]);

  // Auto focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto re-focus input when command execution completes
  useEffect(() => {
    // When pendingCommand changes from a value to null (command completed)
    // or when new terminal entries are added, refocus the input
    if (!pendingCommand && isConnected) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [pendingCommand, isConnected, terminalEntries.length]);

  // Keep focus on input even during command execution
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const terminalElement = terminalRef.current;
      if (terminalElement && terminalElement.contains(e.target as Node)) {
        // If clicking anywhere inside terminal, focus the input
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  return (
    <div 
      className="h-full bg-gray-900 rounded-xl overflow-hidden cursor-text"
      onClick={handleTerminalClick}
      style={{ 
        fontFamily: 'Fira Code, Monaco, Cascadia Code, Roboto Mono, monospace',
        fontSize: '12px',
        lineHeight: '1.5'
      }}
    >
      <div 
        ref={terminalRef}
        className="h-full overflow-auto p-4"
        style={{ 
          backgroundColor: '#212121', 
          color: '#EEFFFF',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit'
        }}
      >
        {/* Terminal header */}
        <div className="mb-2 text-sm opacity-75">
          <span style={{ color: '#89DDFF' }}>InsightAI Terminal</span>
          <span className="ml-4" style={{ color: isConnected ? '#C3E88D' : '#FF5370' }}>
            {isConnected ? '● Connected' : '● Disconnected'}
          </span>
        </div>

        {/* Terminal history and output */}
        {displayEntries.map((entry) => (
          <div key={entry.id} className="mb-1">
            {entry.type === "command" ? (
              <div className="flex">
                <span style={{ color: '#FFCB6B' }}>insight-ai@workspace</span>
                <span style={{ color: '#89DDFF' }}>:</span>
                <span style={{ color: '#89DDFF' }}>~</span>
                <span style={{ color: '#89DDFF' }}>$ </span>
                <span style={{ color: '#EEFFFF' }}>{entry.content}</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap pl-4" style={{ color: '#C3E88D' }}>
                {entry.content}
                {entry.exitCode !== undefined && entry.exitCode !== 0 && (
                  <span style={{ color: '#FF5370' }}> [Exit: {entry.exitCode}]</span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Welcome message when no terminal data */}
        {displayEntries.length === 0 && (
          <div className="mb-4 opacity-75">
            <div style={{ color: '#89DDFF' }}>Welcome to InsightAI Terminal</div>
            <div style={{ color: '#C3E88D' }}>Type commands and press Enter to execute</div>
            <div className="mt-1 text-xs" style={{ color: '#808080' }}>
              Use ↑/↓ for command history
            </div>
          </div>
        )}

        {/* Show execution status if command is pending */}
        {pendingCommand && (
          <div className="mb-1 opacity-75" style={{ color: '#FFCB6B' }}>
            Executing: {pendingCommand}
            <span className="animate-pulse ml-1" style={{ color: '#89DDFF' }}>_</span>
          </div>
        )}

        {/* Current command input line */}
        <div className="flex items-center">
          <span style={{ color: '#FFCB6B' }}>insight-ai@workspace</span>
          <span style={{ color: '#89DDFF' }}>:</span>
          <span style={{ color: '#89DDFF' }}>~</span>
          <span style={{ color: '#89DDFF' }}>$ </span>
          <input
            ref={inputRef}
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            readOnly={!!pendingCommand}
            className="flex-1 bg-transparent border-none outline-none text-inherit"
            style={{ 
              color: '#EEFFFF',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
            placeholder={!isConnected ? "Connecting..." : (pendingCommand ? "Executing..." : "")}
            autoComplete="off"
          />
          {!pendingCommand && isConnected && (
            <span className="animate-pulse" style={{ color: '#89DDFF' }}>_</span>
          )}
        </div>

        {/* Spacer to ensure there's always scrollable space */}
        <div className="h-4"></div>
      </div>
    </div>
  );
}