import { setCurrentAgentState } from "#/state/agent-slice";
import { setUrl, navigateToUrl, setError } from "#/state/browser-slice";
import { switchToBrowserTab } from "#/state/tab-slice";
import store from "#/store";
import { ObservationMessage } from "#/types/message";
import { appendOutput } from "#/state/command-slice";
import { appendJupyterOutput } from "#/state/jupyter-slice";
import ObservationType from "#/types/observation-type";

export function handleObservationMessage(message: ObservationMessage) {
  switch (message.observation) {
    case ObservationType.RUN: {
      if (message.extras.hidden) break;
      let { content } = message;

      if (content.length > 5000) {
        const halfLength = 2500;
        const head = content.slice(0, halfLength);
        const tail = content.slice(content.length - halfLength);
        content = `${head}\r\n\n... (truncated ${message.content.length - 5000} characters) ...\r\n\n${tail}`;
      }

      store.dispatch(appendOutput(content));
      break;
    }
    case ObservationType.RUN_IPYTHON:
      store.dispatch(
        appendJupyterOutput({
          content: message.content,
          imageUrls: Array.isArray(message.extras?.image_urls)
            ? message.extras.image_urls
            : undefined,
        }),
      );
      break;
    case ObservationType.BROWSE:
    case ObservationType.BROWSE_INTERACTIVE:
      // Legacy screenshot mode - still support for backward compatibility
      if (message.extras?.url) {
        store.dispatch(setUrl(message.extras.url));
      }
      if (message.error) {
        store.dispatch(setError(message.content));
      }
      break;
    case ObservationType.REAL_BROWSE: // New real browser mode
      if (message.extras?.url) {
        store.dispatch(navigateToUrl(message.extras.url));
      }
      if (message.extras?.auto_switch_triggered) {
        store.dispatch(switchToBrowserTab());
      }
      if (message.error) {
        store.dispatch(setError(message.content));
      }
      break;
    case ObservationType.AGENT_STATE_CHANGED:
      store.dispatch(setCurrentAgentState(message.extras.agent_state));
      break;
    case ObservationType.DELEGATE:
    case ObservationType.READ:
    case ObservationType.EDIT:
    case ObservationType.THINK:
    case ObservationType.NULL:
    case ObservationType.RECALL:
    case ObservationType.ERROR:
    case ObservationType.MCP:
      break; // We don't display the default message for these observations
    default:
      break;
  }
  if (!message.extras?.hidden) {
    // Convert the message to the appropriate observation type
    const { observation } = message;

    switch (observation) {
      case "browse":
        // Screenshot functionality removed - now using iframe browser
        if (message.extras?.url) {
          store.dispatch(setUrl(message.extras.url));
        }
        break;
      case "browse_interactive":
        // Screenshot functionality removed - now using iframe browser
        if (message.extras?.url) {
          store.dispatch(setUrl(message.extras.url));
        }
        break;
      default:
        // For any unhandled observation types, just ignore them
        break;
    }
  }
}
