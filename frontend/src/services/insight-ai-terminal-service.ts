import ActionType from "#/types/action-type";

export function getInsightAITerminalCommand(command: string, hidden: boolean = false) {
  // Use USER source for user-initiated terminal commands
  // This matches the valid EventSource enum values in the backend
  const event = { 
    action: ActionType.RUN, 
    args: { command, hidden },
    source: 'user'  // Valid EventSource value for user-initiated commands
  };
  console.log('🔍 [Terminal Service] Creating terminal command event:', JSON.stringify(event));
  return event;
}

export function isTerminalCommand(event: any): boolean {
  const isCommand = event?.action === ActionType.RUN;
  if (isCommand) {
    console.log('🔍 [Terminal Service] Identified as terminal command:', {
      action: event.action,
      args: event.args,
      source: event.source
    });
  }
  return isCommand;
}

export function isTerminalOutput(event: any): boolean {
  let isOutput = false;
  let reason = "";
  
  // Check for command output patterns
  if (event?.source === "agent" && event?.content) {
    isOutput = true;
    reason = "agent source with content";
  }
  
  // Check for observation type that contains command output
  if (event?.observation === "run" && event?.content) {
    isOutput = true;
    reason = "run observation with content";
  }
  
  // Check for stdout/stderr patterns
  if (event?.extras?.command_id && (event?.content || event?.message)) {
    isOutput = true;
    reason = "command_id with content/message";
  }
  
  if (isOutput) {
    console.log('🔍 [Terminal Service] Identified as terminal output:', {
      reason,
      observation: event?.observation,
      source: event?.source,
      content: event?.content?.substring(0, 100),
      message: event?.message?.substring(0, 100),
      extras: event?.extras
    });
  }
  
  return isOutput;
}