import React from "react";
import ReactJsonView from "@microlink/react-json-view";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { InsightAIMessage } from "./insight-ai-message-filter";
import { decodeHtmlEntities } from "../shared/html-entity-decoder";

// InsightAI light theme for JSON viewer - consistent with the UI design
const INSIGHT_AI_JSON_THEME = {
  base00: "#ffffff", // white background
  base01: "#f8f9fa", // very light gray background
  base02: "#e9ecef", // light gray selection
  base03: "#6c757d", // medium gray for comments
  base04: "#495057", // dark gray
  base05: "#212529", // almost black text
  base06: "#495057", // dark gray
  base07: "#000000", // black
  base08: "#dc3545", // red for errors/special
  base09: "#fd7e14", // orange for numbers
  base0A: "#ffc107", // yellow for warnings
  base0B: "#198754", // green for strings
  base0C: "#0dcaf0", // cyan for support
  base0D: "#0d6efd", // blue for functions
  base0E: "#6f42c1", // purple for keywords
  base0F: "#dc3545", // red for deprecated
};

interface InsightAIMCPObservationProps {
  message: InsightAIMessage;
}

export function InsightAIMCPObservation({
  message,
}: InsightAIMCPObservationProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Since we now only render MCP observations (not actions), always check for output
  let outputData: unknown = null;
  let hasOutput = false;

  // Parse output data from MCP observation content
  if (message.content && message.content.trim()) {
    hasOutput = true;
    try {
      // Try to parse as JSON to get the full structure
      outputData = JSON.parse(message.content);
    } catch (e) {
      // If parsing fails, use the raw content
      outputData = message.content;
    }
  }

  // Check for arguments in message extras (extracted from the paired MCP action)
  // Show arguments section if arguments exist (even if empty {})
  const hasArguments = message.extras?.arguments !== undefined;

  // Get tool name from extras (extracted from the paired MCP action) or default
  const toolName = message.extras?.tool || "MCP工具";

  return (
    <div
      className="rounded-lg overflow-hidden insight-ai-message-outer"
      style={{ backgroundColor: "#fafafa", padding: "8px" }}
    >
      {/* MCP Tool Header - White background content with visible gray background layer */}
      <div
        className="flex items-center justify-between gap-4 px-3 py-1 rounded-md insight-ai-message-inner"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-800">MCP工具调用：{toolName}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Expanded content - Clean, card-based layout */}
      {isExpanded && (
        <div className="px-0 pt-1 space-y-2">
          {/* Arguments section */}
          {hasArguments && message.extras?.arguments && (
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden insight-ai-message-inner">
              <div className="bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Play className="w-3 h-3 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-700">
                    调用参数
                  </span>
                </div>
              </div>
              <div
                className="max-h-[200px] overflow-auto"
                style={{ backgroundColor: "#fafafa" }}
              >
                <div className="p-3">
                  <ReactJsonView
                    name={false}
                    src={message.extras.arguments}
                    theme={INSIGHT_AI_JSON_THEME}
                    collapsed={false}
                    displayDataTypes={false}
                    displayObjectSize={false}
                    enableClipboard={false}
                    indentWidth={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Output section - only show if we have output */}
          {hasOutput && (
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden insight-ai-message-inner">
              <div className="bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">
                    执行结果
                  </span>
                </div>
              </div>
              <div
                className="max-h-[300px] overflow-auto"
                style={{ backgroundColor: "#fafafa" }}
              >
                <div className="p-3">
                  {typeof outputData === "object" && outputData !== null ? (
                    <ReactJsonView
                      name={false}
                      src={outputData as object}
                      theme={INSIGHT_AI_JSON_THEME}
                      collapsed={false}
                      displayDataTypes={false}
                      displayObjectSize={false}
                      enableClipboard={false}
                      indentWidth={2}
                    />
                  ) : (
                    <div
                      className="text-sm text-gray-800 whitespace-pre-wrap font-mono"
                      dangerouslySetInnerHTML={{
                        __html: decodeHtmlEntities(
                          String(outputData) || "无输出内容",
                        ),
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Show message if no output is available */}
          {!hasOutput && (
            <div className="bg-white rounded-md border border-gray-200 overflow-hidden insight-ai-message-inner">
              <div className="bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-sm font-medium text-gray-700">
                    执行结果
                  </span>
                </div>
              </div>
              <div
                className="p-3 text-center"
                style={{ backgroundColor: "#fafafa" }}
              >
                <div className="text-sm text-gray-500 italic">暂无输出内容</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
