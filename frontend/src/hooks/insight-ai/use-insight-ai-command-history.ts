import React from "react";

export interface TerminalCommand {
  id: string;
  command: string;
  output?: string;
  timestamp: Date;
  type: "input" | "output";
  exitCode?: number;
}

export const useInsightAICommandHistory = () => {
  const [commands, setCommands] = React.useState<TerminalCommand[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(-1);

  const addCommand = React.useCallback((command: string) => {
    const newCommand: TerminalCommand = {
      id: Date.now().toString(),
      command,
      timestamp: new Date(),
      type: "input",
    };
    setCommands((prev) => [...prev, newCommand]);
    setCurrentIndex(-1); // Reset navigation index
  }, []);

  const addOutput = React.useCallback(
    (commandId: string, output: string, exitCode?: number) => {
      const outputEntry: TerminalCommand = {
        id: `${commandId}_output`,
        command: "",
        output,
        timestamp: new Date(),
        type: "output",
        exitCode,
      };
      setCommands((prev) => [...prev, outputEntry]);
    },
    [],
  );

  const getNextCommand = React.useCallback(() => {
    const inputCommands = commands.filter((cmd) => cmd.type === "input");
    if (inputCommands.length === 0 || currentIndex <= 0) return "";

    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return inputCommands[inputCommands.length - 1 - newIndex]?.command || "";
  }, [commands, currentIndex]);

  const getPrevCommand = React.useCallback(() => {
    const inputCommands = commands.filter((cmd) => cmd.type === "input");
    if (inputCommands.length === 0) return "";

    const maxIndex = inputCommands.length - 1;
    const newIndex = Math.min(currentIndex + 1, maxIndex);
    setCurrentIndex(newIndex);
    return inputCommands[inputCommands.length - 1 - newIndex]?.command || "";
  }, [commands, currentIndex]);

  const clearHistory = React.useCallback(() => {
    setCommands([]);
    setCurrentIndex(-1);
  }, []);

  return {
    commands,
    addCommand,
    addOutput,
    getNextCommand,
    getPrevCommand,
    clearHistory,
  };
};
