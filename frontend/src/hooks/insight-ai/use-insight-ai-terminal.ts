import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import React from "react";
import { useInsightAIWsClient } from "./use-insight-ai-ws-client";
import { getInsightAITerminalCommand } from "#/services/insight-ai-terminal-service";
import { useInsightAICommandHistory } from "./use-insight-ai-command-history";
import { parseTerminalOutput } from "#/utils/parse-terminal-output";

interface UseInsightAITerminalConfig {
  conversationId: string;
  disabled?: boolean;
}

const DEFAULT_TERMINAL_CONFIG: UseInsightAITerminalConfig = {
  conversationId: "",
  disabled: false,
};

const renderCommand = (command: any, terminal: Terminal) => {
  const { content, type } = command;

  if (type === "input") {
    terminal.write(`$ ${content}\r\n`);
  } else if (type === "output" && content) {
    terminal.writeln(
      parseTerminalOutput(content.replaceAll("\n", "\r\n").trim()),
    );
  }
};

// 持久化命令索引，保持会话期间的终端历史
const persistentLastCommandIndex = { current: 0 };

export const useInsightAITerminal = ({
  conversationId,
  disabled = false,
}: UseInsightAITerminalConfig = DEFAULT_TERMINAL_CONFIG) => {
  const { send } = useInsightAIWsClient(conversationId);
  const { commands, addCommand, addOutput, getNextCommand, getPrevCommand } =
    useInsightAICommandHistory();

  const terminal = React.useRef<Terminal | null>(null);
  const fitAddon = React.useRef<FitAddon | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const lastCommandIndex = persistentLastCommandIndex;
  const keyEventDisposable = React.useRef<{ dispose: () => void } | null>(null);

  const createTerminal = () =>
    new Terminal({
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      theme: {
        background: "#1a1a2e", // InsightAI深色主题
        foreground: "#e2e8f0",
        cursor: "#60a5fa",
        selectionBackground: "#374151",
      },
      cursorBlink: true,
      cursorStyle: "block",
    });

  const initializeTerminal = () => {
    if (terminal.current) {
      if (fitAddon.current) terminal.current.loadAddon(fitAddon.current);
      if (ref.current) terminal.current.open(ref.current);
    }
  };

  const copySelection = (selection: string) => {
    const clipboardItem = new ClipboardItem({
      "text/plain": new Blob([selection], { type: "text/plain" }),
    });
    navigator.clipboard.write([clipboardItem]);
  };

  const pasteSelection = (callback: (text: string) => void) => {
    navigator.clipboard.readText().then(callback);
  };

  const pasteHandler = (event: KeyboardEvent, cb: (text: string) => void) => {
    const isControlOrMetaPressed =
      event.type === "keydown" && (event.ctrlKey || event.metaKey);

    if (isControlOrMetaPressed) {
      if (event.code === "KeyV") {
        pasteSelection((text: string) => {
          terminal.current?.write(text);
          cb(text);
        });
      }

      if (event.code === "KeyC") {
        const selection = terminal.current?.getSelection();
        if (selection) copySelection(selection);
      }
    }

    return true;
  };

  const handleEnter = (command: string) => {
    terminal.current?.write("\r\n");
    if (command.trim()) {
      // 添加到历史记录
      addCommand(command);
      // 发送命令到WebSocket
      send(getInsightAITerminalCommand(command));
    } else {
      // 空命令时显示提示符
      terminal.current?.write("$ ");
    }
  };

  const handleBackspace = (command: string) => {
    if (command.length > 0) {
      terminal.current?.write("\b \b");
      return command.slice(0, -1);
    }
    return command;
  };

  const handleArrowUp = (currentCommand: string) => {
    const prevCommand = getPrevCommand();
    if (prevCommand) {
      // 清除当前输入
      for (let i = 0; i < currentCommand.length; i++) {
        terminal.current?.write("\b \b");
      }
      // 写入历史命令
      terminal.current?.write(prevCommand);
      return prevCommand;
    }
    return currentCommand;
  };

  const handleArrowDown = (currentCommand: string) => {
    const nextCommand = getNextCommand();
    // 清除当前输入
    for (let i = 0; i < currentCommand.length; i++) {
      terminal.current?.write("\b \b");
    }
    // 写入命令（可能为空）
    if (nextCommand) {
      terminal.current?.write(nextCommand);
    }
    return nextCommand;
  };

  // 初始化终端
  React.useEffect(() => {
    terminal.current = createTerminal();
    fitAddon.current = new FitAddon();

    if (ref.current) {
      initializeTerminal();

      // 渲染现有命令历史
      if (commands.length > lastCommandIndex.current) {
        for (let i = lastCommandIndex.current; i < commands.length; i++) {
          renderCommand(commands[i], terminal.current);
        }
        lastCommandIndex.current = commands.length;
      }

      // 显示初始提示符
      terminal.current.write("$ ");
    }

    return () => {
      terminal.current?.dispose();
    };
  }, []);

  // 处理新的命令输出
  React.useEffect(() => {
    if (
      terminal.current &&
      commands.length > 0 &&
      lastCommandIndex.current < commands.length
    ) {
      for (let i = lastCommandIndex.current; i < commands.length; i++) {
        renderCommand(commands[i], terminal.current);

        // 如果是输出类型且是最后一个，显示新的提示符
        if (i === commands.length - 1 && commands[i].type === "output") {
          terminal.current.write("$ ");
        }
      }
      lastCommandIndex.current = commands.length;
    }
  }, [commands, disabled]);

  // 处理终端大小自适应
  React.useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;

    resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });

    if (ref.current) {
      resizeObserver.observe(ref.current);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  }, []);

  // 处理键盘事件
  React.useEffect(() => {
    if (terminal.current) {
      // 清理现有监听器
      if (keyEventDisposable.current) {
        keyEventDisposable.current.dispose();
        keyEventDisposable.current = null;
      }

      let commandBuffer = "";

      if (!disabled) {
        // 添加键盘事件监听器
        keyEventDisposable.current = terminal.current.onKey(
          ({ key, domEvent }) => {
            const { keyCode } = domEvent;

            if (domEvent.key === "Enter") {
              handleEnter(commandBuffer);
              commandBuffer = "";
            } else if (domEvent.key === "Backspace") {
              commandBuffer = handleBackspace(commandBuffer);
            } else if (keyCode === 38) {
              // 上箭头
              domEvent.preventDefault();
              commandBuffer = handleArrowUp(commandBuffer);
            } else if (keyCode === 40) {
              // 下箭头
              domEvent.preventDefault();
              commandBuffer = handleArrowDown(commandBuffer);
            } else if (domEvent.key.length === 1) {
              // 普通字符输入
              commandBuffer += key;
              terminal.current?.write(key);
            }
          },
        );

        // 添加自定义键事件处理器
        terminal.current.attachCustomKeyEventHandler((event) =>
          pasteHandler(event, (text) => {
            commandBuffer += text;
          }),
        );
      } else {
        // 禁用时的noop处理器
        keyEventDisposable.current = terminal.current.onKey((e) => {
          e.domEvent.preventDefault();
          e.domEvent.stopPropagation();
        });
      }
    }

    return () => {
      if (keyEventDisposable.current) {
        keyEventDisposable.current.dispose();
        keyEventDisposable.current = null;
      }
    };
  }, [disabled]);

  return {
    ref,
    commands,
    addOutput, // 暴露给外部用于处理WebSocket输出
  };
};
