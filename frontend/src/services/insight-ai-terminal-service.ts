import ActionType from "#/types/action-type";

export function getInsightAITerminalCommand(
  command: string,
  hidden: boolean = false,
) {
  // Use USER source for user-initiated terminal commands
  // This matches the valid EventSource enum values in the backend
  const event = {
    action: ActionType.RUN,
    args: { command, hidden },
    source: "user", // Valid EventSource value for user-initiated commands
  };
  return event;
}

interface TerminalEvent {
  source?: string;
  observation?: string;
  action?: string;
  content?: string;
  message?: string;
  extras?: Record<string, unknown>;
  args?: Record<string, unknown>;
  [key: string]: unknown;
}

export function isTerminalCommand(event: TerminalEvent): boolean {
  return event?.action === ActionType.RUN;
}

export function isTerminalOutput(event: TerminalEvent): boolean {
  let isOutput = false;

  // Check for command output patterns
  if (event?.source === "agent" && event?.content) {
    isOutput = true;
  }

  // Check for observation type that contains command output
  if (event?.observation === "run" && event?.content) {
    isOutput = true;
  }

  // Check for stdout/stderr patterns
  if ((event?.extras as any)?.command_id && (event?.content || event?.message)) {
    isOutput = true;
  }

  return isOutput;
}
