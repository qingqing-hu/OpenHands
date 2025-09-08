import { OpenHandsAction } from "#/types/core/actions";
import { OpenHandsEventType } from "#/types/core/base";
import {
  isCommandAction,
  isCommandObservation,
  isOpenHandsAction,
  isOpenHandsObservation,
  isErrorObservation,
} from "#/types/core/guards";
import { OpenHandsObservation } from "#/types/core/observations";
import { InsightAIStatusType } from "../shared/insight-ai-status-indicator";
import { getActionContent } from "../../features/chat/event-content-helpers/get-action-content";
import { getObservationContent } from "../../features/chat/event-content-helpers/get-observation-content";
import i18n from "#/i18n";

/**
 * Type guard helpers
 */
const hasPathProperty = (
  obj: Record<string, unknown>,
): obj is { path: string } => typeof obj.path === "string";

const hasCommandProperty = (
  obj: Record<string, unknown>,
): obj is { command: string } => typeof obj.command === "string";

const trimText = (text: string, maxLength: number): string => {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

/**
 * Gets localized message content for InsightAI (plain text version)
 * Similar to getEventContent but returns strings instead of React components
 */
const getLocalizedMessageContent = (
  event: OpenHandsAction | OpenHandsObservation,
): string => {
  if (isOpenHandsAction(event)) {
    const actionKey = `ACTION_MESSAGE$${event.action.toUpperCase()}`;

    // If translation key exists, use it
    if (i18n.exists(actionKey)) {
      const template = i18n.t(actionKey, {
        path: hasPathProperty(event.args) ? event.args.path : "",
        command: hasCommandProperty(event.args)
          ? trimText(event.args.command, 80)
          : "",
        mcp_tool_name: event.action === "call_tool_mcp" ? event.args.name : "",
      });

      // Remove HTML-like tags for plain text display
      return template
        .replace(/<path>/g, "")
        .replace(/<\/path>/g, "")
        .replace(/<cmd>/g, "")
        .replace(/<\/cmd>/g, "");
    }

    // Fallback to original message or action type
    return event.message || event.action.toUpperCase();
  }

  if (isOpenHandsObservation(event)) {
    const observationKey = `OBSERVATION_MESSAGE$${event.observation.toUpperCase()}`;

    // If translation key exists, use it
    if (i18n.exists(observationKey)) {
      const template = i18n.t(observationKey, {
        path: hasPathProperty(event.extras) ? event.extras.path : "",
        command: hasCommandProperty(event.extras)
          ? trimText(event.extras.command, 80)
          : "",
        mcp_tool_name: event.observation === "mcp" ? event.extras?.name : "",
      });

      // Remove HTML-like tags for plain text display
      return template
        .replace(/<path>/g, "")
        .replace(/<\/path>/g, "")
        .replace(/<cmd>/g, "")
        .replace(/<\/cmd>/g, "");
    }

    // Fallback to original message or observation type
    return event.message || event.observation.toUpperCase();
  }

  return (event as any).message || "";
};

/**
 * Message types that are always hidden from the chat interface
 */
const COMMON_NO_RENDER_LIST: OpenHandsEventType[] = [
  "system",
  "agent_state_changed",
  "change_agent_state",
];

/**
 * Action types that are always hidden from the chat interface
 */
const ACTION_NO_RENDER_LIST: OpenHandsEventType[] = ["recall"];

/**
 * Determines if an event/message should be rendered in the InsightAI chat interface
 * Uses the same filtering logic as the main OpenHands frontend
 */
export const shouldRenderInsightAIEvent = (
  event: OpenHandsAction | OpenHandsObservation,
): boolean => {
  if (isOpenHandsAction(event)) {
    // Hide user commands from chat interface to avoid technical clutter
    if (isCommandAction(event) && event.source === "user") {
      return false;
    }

    // Note: MCP actions are NOT filtered out in native OpenHands
    // They display thoughts and details following standard action-observation pairing logic

    const noRenderList = COMMON_NO_RENDER_LIST.concat(ACTION_NO_RENDER_LIST);
    return !noRenderList.includes(event.action);
  }

  if (isOpenHandsObservation(event)) {
    // Hide user command observations from chat interface
    if (isCommandObservation(event) && event.source === "user") {
      return false;
    }

    // Hide think observations (they're just confirmation messages)
    if (event.observation === "think") {
      return false;
    }

    return !COMMON_NO_RENDER_LIST.includes(event.observation);
  }

  return true;
};

/**
 * Check if an action will have an observation pair (for single-event processing)
 * This is used to determine if we should render the action or wait for the observation
 */
export const actionShouldWaitForObservation = (
  action: OpenHandsAction,
): boolean => {
  // Actions that typically generate observations
  const actionsThatGenerateObservations = [
    "read",
    "write",
    "edit",
    "run",
    "browse",
    "delegate",
    "call_tool_mcp",
    "think",
  ];

  return actionsThatGenerateObservations.includes(action.action);
};

/**
 * Message categories for visual differentiation
 */
export type InsightAIMessageCategory =
  | "message" // Regular chat messages
  | "command" // Shell/bash commands
  | "sql" // SQL queries
  | "code" // Code files/editing
  | "edit" // File edit operations
  | "json" // JSON data/API responses
  | "mcp" // MCP tool calls
  | "think" // Think actions
  | "system" // System messages (includes condensation)
  | "error"; // Error messages

/**
 * Simplified message type for InsightAI display
 */
export interface InsightAIMessage {
  id: string;
  type: "user" | "assistant" | "observation";
  category: InsightAIMessageCategory;
  content: string;
  timestamp: Date;
  originalEvent?: OpenHandsAction | OpenHandsObservation;
  imageUrls?: string[];
  fileUrls?: string[];
  status?: InsightAIStatusType;
  isError?: boolean;
  extras?: {
    tool?: string;
    arguments?: Record<string, any>;
  };
  // New fields for enhanced content
  thought?: string; // Separated thought content
  detailedContent?: string; // Detailed action/observation content
  hasExpandableContent?: boolean; // Whether this message has expandable details
}

/**
 * Checks if an action has thought property (similar to OpenHands native)
 */
const hasThoughtProperty = (
  obj: Record<string, unknown>,
): obj is { thought: string } => "thought" in obj && !!obj.thought;

/**
 * Extracts thought content from action args
 */
const extractThought = (
  event: OpenHandsAction | OpenHandsObservation,
): string | undefined => {
  if (isOpenHandsAction(event) && hasThoughtProperty(event.args)) {
    return event.args.thought;
  }
  return undefined;
};

/**
 * Gets detailed content for action/observation (similar to OpenHands native detail content)
 */
const getDetailedContent = (
  event: OpenHandsAction | OpenHandsObservation,
): string | undefined => {
  try {
    // For error events, return the Chinese detailed message instead of JSON
    if (isErrorObservation(event) || (event as any).extras?.error_id) {
      // For error events, directly use i18n to get Chinese content
      const errorId = ((event as any).extras as any)?.error_id as
        | string
        | undefined;
      if (errorId && i18n.exists(errorId)) {
        const chineseContent = i18n.t(errorId);
        return chineseContent;
      }

      // Fallback to localized content
      const localizedContent = getLocalizedMessageContent(event);
      return localizedContent || event.message || "发生了未知错误。";
    }

    if (isOpenHandsAction(event)) {
      const content = getActionContent(event);
      return content && content.trim() ? content : undefined;
    }
    if (isOpenHandsObservation(event)) {
      const content = getObservationContent(event);
      return content && content.trim() ? content : undefined;
    }
  } catch (error) {
    console.warn("Failed to get detailed content:", error);
  }
  return undefined;
};

/**
 * Gets simplified error message content for main display
 */
const getErrorMessageContent = (event: OpenHandsObservation): string => {
  const errorId = (event.extras as any)?.error_id as string | undefined;

  if (errorId) {
    const errorMessages: Record<string, string> = {
      AGENT_ERROR$ERROR_ACTION_NOT_EXECUTED: "操作未执行",
      AGENT_ERROR$ERROR_TIMEOUT: "操作超时",
      AGENT_ERROR$ERROR_INVALID_INPUT: "输入无效",
      AGENT_ERROR$ERROR_PERMISSION_DENIED: "权限不足",
      AGENT_ERROR$ERROR_FILE_NOT_FOUND: "文件未找到",
      AGENT_ERROR$ERROR_NETWORK_FAILURE: "网络连接失败",
      AGENT_ERROR$ERROR_PARSE_FAILURE: "解析失败",
      AGENT_ERROR$ERROR_UNKNOWN: "未知错误",
    };

    const errorType = errorMessages[errorId] || "未知错误";
    return `智能体遇到错误 - ${errorType}`;
  }
  return "智能体遇到错误 - 未知错误";
};

/**
 * Extracts clean message content, using localized translations when possible
 */
const parseMessageContent = (
  event: OpenHandsAction | OpenHandsObservation,
): string => {
  // Check if this is an error observation or has error_id first
  if (isErrorObservation(event) || (event as any).extras?.error_id) {
    // For error observations, return simplified error message
    return getErrorMessageContent(event as OpenHandsObservation);
  }

  // For MCP events, return appropriate content
  const isMCPAction =
    isOpenHandsAction(event) && event.action === "call_tool_mcp";
  const isMCPObservation =
    isOpenHandsObservation(event) && event.observation === "mcp";

  if (isMCPAction) {
    // For MCP actions, use localized content
    return getLocalizedMessageContent(event);
  }

  if (isMCPObservation) {
    // For MCP observations, return the content (tool output)
    return event.content || "";
  }

  // Check if this is a user message with file attachments
  if (event.source === "user" && (event as any).args?.file_urls) {
    // Remove file attachment metadata (similar to OpenHands parseMessageFromEvent)
    const { message } = event;
    const delimiter = "Files attached:"; // Simplified delimiter
    const parts = message.split(delimiter);
    return parts[0].trim();
  }

  // For other events, use localized content instead of raw message
  return getLocalizedMessageContent(event);
};

/**
 * Determines the message category based on OpenHands native event types
 * Uses only native event type classification for maximum accuracy and simplicity
 */
const getMessageCategory = (
  event: OpenHandsAction | OpenHandsObservation,
): InsightAIMessageCategory => {
  // Check for error first (both standard error observations and events with error_id)
  if (isErrorObservation(event) || (event as any).extras?.error_id) {
    return "error";
  }

  // Action types direct mapping
  if (isOpenHandsAction(event)) {
    switch (event.action) {
      case "run":
        return "command";
      case "run_ipython":
        return "code";
      case "write":
      case "edit":
      case "read":
        return "message"; // File operations don't need category icons
      case "call_tool_mcp":
        return "mcp";
      case "think":
        return "think";
      case "system":
        return "system";
      // case "condensation":
      //   return "system"; // Condensation actions should be treated as system messages
      case "message":
        return "message";
      default:
        return "message";
    }
  }

  // Observation types direct mapping
  if (isOpenHandsObservation(event)) {
    switch (event.observation) {
      case "run":
        return "command";
      case "run_ipython":
        return "code";
      case "read":
        return "message"; // File read operations don't need category icons
      case "edit":
        return "edit"; // File edit operations should show expandable content
      case "mcp":
        return "mcp";
      case "recall":
        return "system";
      default:
        return "message";
    }
  }

  // Handle error observations separately
  if (isErrorObservation(event)) {
    return "error";
  }

  return "message";
};

/**
 * Determines the status of a message based on the event
 */
const getMessageStatus = (
  event: OpenHandsAction | OpenHandsObservation,
): InsightAIStatusType | undefined => {
  if (isErrorObservation(event)) {
    return "error";
  }

  // Check if event has isError field (for MCP and other events)
  if ("isError" in event && typeof event.isError === "boolean") {
    return event.isError ? "error" : "success";
  }

  // Special handling for MCP observations - parse nested content for success indicators
  if (isOpenHandsObservation(event) && event.observation === "mcp") {
    const content = event.content || "";

    try {
      // Try to parse the outer JSON structure
      const parsedContent = JSON.parse(content);
      if (parsedContent?.content && Array.isArray(parsedContent.content)) {
        // Look for success field in the nested text content
        for (const item of parsedContent.content) {
          if (item?.text && typeof item.text === "string") {
            const textContent = item.text;
            if (
              textContent.includes('"success": true') ||
              textContent.includes('"success":true')
            ) {
              return "success";
            }
            if (
              textContent.includes('"success": false') ||
              textContent.includes('"success":false')
            ) {
              return "error";
            }
          }
        }
      }
    } catch (e) {
      // If JSON parsing fails, fall back to simple string search
      if (
        content.includes('"success": true') ||
        content.includes('"success":true')
      ) {
        return "success";
      }
      if (
        content.includes('"success": false') ||
        content.includes('"success":false')
      ) {
        return "error";
      }
    }
  }

  if (isOpenHandsObservation(event)) {
    // Check for success/error indicators in observation content
    const content = event.content?.toLowerCase() || "";
    if (content.includes("error") || content.includes("failed")) {
      return "error";
    }
    if (content.includes("success") || content.includes("completed")) {
      return "success";
    }
    if (content.includes("timeout")) {
      return "timeout";
    }
  }

  return undefined;
};

/**
 * Converts OpenHands events to InsightAI message format with filtering
 */
export const convertEventsToInsightAIMessages = (
  events: (OpenHandsAction | OpenHandsObservation)[],
): InsightAIMessage[] => {
  const filteredEvents = events.filter(shouldRenderInsightAIEvent);

  const convertedMessages: InsightAIMessage[] = [];

  // For single event processing (typical WebSocket case), apply OpenHands native logic
  if (events.length === 1) {
    const event = events[0];

    // Special handling for actions that will have observations in single event processing
    if (isOpenHandsAction(event) && actionShouldWaitForObservation(event)) {
      const thought = extractThought(event);

      // If no thought, don't create a message - wait for the observation
      if (!thought) {
        return [];
      }

      // Create thought message (for both think and other actions like MCP)
      convertedMessages.push({
        id: event.id.toString(),
        type: "assistant",
        category:
          event.action === "think" || (event as any).action === "condensation"
            ? getMessageCategory(event)
            : "message", // Only think and condensation show icons
        content: thought,
        timestamp: new Date(event.timestamp),
        originalEvent: event,
        imageUrls: (event as any).args?.image_urls || undefined,
        fileUrls: (event as any).args?.file_urls || undefined,
        status: undefined, // No status for thought messages
        isError: false,
        extras: undefined,
        thought: undefined,
        detailedContent: undefined,
        hasExpandableContent: false,
      });

      return convertedMessages;
    }

    // For all other single events (observations, actions without observations, etc.)
    // proceed with standard processing below
  }

  // Multi-event processing or single events that don't need pairing logic
  // Check if we have action-observation pairs in this batch
  const actionMap = new Map<number, OpenHandsAction>();
  const observationMap = new Map<number, OpenHandsObservation>();

  filteredEvents.forEach((event) => {
    if (isOpenHandsAction(event)) {
      actionMap.set(event.id, event);
    } else if (isOpenHandsObservation(event) && event.cause) {
      observationMap.set(event.cause, event);
    }
  });

  filteredEvents.forEach((event) => {
    const eventArgs = (event as any).args || {};

    // Handle action-observation pairs (batch processing)
    if (isOpenHandsAction(event) && observationMap.has(event.id)) {
      const observation = observationMap.get(event.id)!;

      // Special handling for think action - only show thought content, hide observation
      if (event.action === "think") {
        const thought = extractThought(event);
        if (thought) {
          convertedMessages.push({
            id: event.id.toString(),
            type: "assistant",
            category: getMessageCategory(event),
            content: thought,
            timestamp: new Date(event.timestamp),
            originalEvent: event,
            imageUrls: eventArgs.image_urls || undefined,
            fileUrls: eventArgs.file_urls || undefined,
            status: undefined,
            isError: false,
            extras: undefined,
            thought: undefined,
            detailedContent: undefined,
            hasExpandableContent: false,
          });
        }
        return; // Skip observation processing for think action
      }

      // Create a combined message with action thought and observation content
      const thought = extractThought(event);

      // If there's a thought, show it as a separate message first
      if (thought) {
        convertedMessages.push({
          id: `${event.id}-thought`,
          type: "assistant",
          category: "message",
          content: thought,
          timestamp: new Date(event.timestamp),
          originalEvent: event,
          imageUrls: eventArgs.image_urls || undefined,
          fileUrls: eventArgs.file_urls || undefined,
          status: getMessageStatus(observation), // Use observation status
          isError: false,
          extras: undefined,
          thought: undefined,
          detailedContent: undefined,
          hasExpandableContent: false,
        });
      }

      // Create the main message showing the observation result
      const observationStatus = getMessageStatus(observation);
      const observationCategory = getMessageCategory(observation);

      convertedMessages.push({
        id: observation.id.toString(),
        type: "observation",
        category: observationCategory,
        content: parseMessageContent(observation),
        timestamp: new Date(observation.timestamp),
        originalEvent: observation,
        imageUrls: eventArgs.image_urls || undefined,
        fileUrls: eventArgs.file_urls || undefined,
        status: observationStatus,
        isError: isErrorObservation(observation),
        extras: undefined,
        thought: undefined,
        detailedContent: getDetailedContent(observation),
        hasExpandableContent: !!getDetailedContent(observation),
      });

      return; // Skip individual processing
    }

    // Skip observations that are paired with actions (batch processing)
    if (
      isOpenHandsObservation(event) &&
      event.cause &&
      actionMap.has(event.cause)
    ) {
      return; // Already handled as part of action-observation pair
    }

    // Handle standalone events (no action-observation pairing)
    // Check if this is an MCP-related event (either action or observation)
    const isMCPAction =
      isOpenHandsAction(event) && event.action === "call_tool_mcp";
    const isMCPObservation =
      isOpenHandsObservation(event) && event.observation === "mcp";

    let messageType: "user" | "assistant" | "observation" = "assistant";
    let extras: { tool?: string; arguments?: Record<string, any> } | undefined;

    if (event.source === "user") {
      messageType = "user";
    } else if (isMCPAction) {
      // MCP actions are assistant messages (showing thoughts/intent)
      messageType = "assistant";

      // Extract MCP tool info from action args
      const eventArgs = (event as any).args || {};
      if (eventArgs.name || eventArgs.arguments) {
        extras = {
          tool: eventArgs.name, // Tool name is in args.name for actions
          arguments: eventArgs.arguments,
        };
      }
    } else if (isMCPObservation) {
      // MCP observations are tool results/output
      messageType = "observation";

      // Extract MCP tool info from observation extras
      const eventExtras = (event as any).extras || {};
      if (eventExtras.name || eventExtras.arguments) {
        extras = {
          tool: eventExtras.name, // Tool name is in extras.name for observations
          arguments: eventExtras.arguments,
        };
      }
    }

    // Extract additional content
    const thought = extractThought(event);
    const detailedContent = getDetailedContent(event);
    const hasExpandableContent = !!detailedContent;

    // If this is an action with thought, create separate messages (like OpenHands native)
    if (thought && isOpenHandsAction(event)) {
      // First, add the thought message
      convertedMessages.push({
        id: `${event.id}-thought`,
        type: "assistant",
        category: "message",
        content: thought,
        timestamp: new Date(event.timestamp),
        originalEvent: event,
        imageUrls: eventArgs.image_urls || undefined,
        fileUrls: eventArgs.file_urls || undefined,
        status: getMessageStatus(event),
        isError: false,
        extras,
        thought: undefined, // Thought is already the main content
        detailedContent: undefined,
        hasExpandableContent: false,
      });

      // Then add the action message (if it has meaningful content beyond thought)
      if (detailedContent || messageType === "observation") {
        convertedMessages.push({
          id: event.id.toString(),
          type: messageType,
          category: getMessageCategory(event),
          content: parseMessageContent(event),
          timestamp: new Date(event.timestamp),
          originalEvent: event,
          imageUrls: eventArgs.image_urls || undefined,
          fileUrls: eventArgs.file_urls || undefined,
          status: getMessageStatus(event),
          isError: isErrorObservation(event),
          extras,
          thought: undefined, // Thought already shown separately
          detailedContent,
          hasExpandableContent,
        });
      }
    } else {
      // Standard single message
      const eventStatus = getMessageStatus(event);
      const eventCategory = getMessageCategory(event);
      const isErrorEvent = isErrorObservation(event);

      convertedMessages.push({
        id: event.id.toString(),
        type: messageType,
        category: eventCategory,
        content: parseMessageContent(event),
        timestamp: new Date(event.timestamp),
        originalEvent: event,
        imageUrls: eventArgs.image_urls || undefined,
        fileUrls: eventArgs.file_urls || undefined,
        status: eventStatus,
        isError: isErrorEvent,
        extras,
        thought,
        detailedContent,
        hasExpandableContent,
      });
    }
  });

  return convertedMessages;
};
