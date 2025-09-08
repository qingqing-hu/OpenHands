import React from "react";
import ReactJsonView from "@microlink/react-json-view";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { FaRegLightbulb } from "react-icons/fa";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import {
  InsightAIMessage,
  InsightAIMessageCategory,
} from "./insight-ai-message-filter";
import {
  isOpenHandsAction,
  isOpenHandsObservation,
} from "#/types/core/guards";
import { decodeHtmlEntities } from "../shared/html-entity-decoder";
// import { useScrollbarVisibility } from "../../hooks/insight-ai/use-scrollbar-visibility";

// InsightAI light theme for JSON viewer - for MCP messages (white background)
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

interface InsightAIUnifiedMessageProps {
  message: InsightAIMessage;
}

// Get category-specific configuration
const getCategoryDisplayConfig = (category: InsightAIMessageCategory) => {
  switch (category) {
    case "command":
      return {
        title: "命令执行",
        headerBg: "bg-cyan-50",
        textColor: "text-cyan-700",
      };
    case "code":
      return {
        title: "代码执行",
        headerBg: "bg-purple-50",
        textColor: "text-purple-700",
      };
    case "edit":
      return {
        title: "文件编辑",
        headerBg: "bg-indigo-50",
        textColor: "text-indigo-700",
      };
    case "sql":
      return {
        title: "SQL查询",
        headerBg: "bg-teal-50",
        textColor: "text-teal-700",
      };
    case "mcp":
      return {
        title: "MCP工具调用",
        headerBg: "bg-cyan-50",
        textColor: "text-cyan-700",
      };
    case "think":
      return {
        title: "Thinking",
        headerBg: "bg-orange-50",
        textColor: "text-orange-700",
      };
    case "error":
      return {
        title: "错误信息",
        headerBg: "bg-red-50",
        textColor: "text-red-700",
      };
    case "system":
      return {
        title: "系统消息",
        headerBg: "bg-green-50",
        textColor: "text-green-700",
      };
    default:
      return {
        title: "消息内容",
        headerBg: "bg-gray-50",
        textColor: "text-gray-700",
      };
  }
};

// Try to parse content as JSON, fallback to original content
const parseContent = (content: string) => {
  try {
    return JSON.parse(content.trim());
  } catch {
    return content;
  }
};

// Process JSON data without modifying escape characters
const processJsonForDisplay = (obj: any): any =>
  // Just return the original object without any string processing
  obj;
// Parse MCP tool call result content and extract the actual content
const parseMCPContent = (content: string) => {
  try {
    const parsed = JSON.parse(content.trim());

    // Check if this is a CallToolResult structure
    if (parsed && typeof parsed === "object") {
      // Handle error case
      if (parsed.isError) {
        return parsed.error || "工具执行失败";
      }

      // Handle content array
      if (Array.isArray(parsed.content) && parsed.content.length > 0) {
        // Process each content block
        const contentParts: string[] = [];

        for (const block of parsed.content) {
          if (block && typeof block === "object") {
            switch (block.type) {
              case "text":
                contentParts.push(block.text || "");
                break;
              case "image":
                contentParts.push(`[图片: ${block.mimeType || "unknown"}]`);
                break;
              case "audio":
                contentParts.push(`[音频: ${block.mimeType || "unknown"}]`);
                break;
              case "resource":
                contentParts.push(`[资源: ${block.uri || "unknown"}]`);
                break;
              case "embedded_resource":
                contentParts.push(`[嵌入资源: ${block.mimeType || "unknown"}]`);
                break;
              default:
                // Unknown content type, try to stringify
                contentParts.push(JSON.stringify(block, null, 2));
            }
          }
        }

        return contentParts.join("\n\n");
      }

      // If no content array, check for structured content
      if (parsed.structuredContent) {
        return JSON.stringify(parsed.structuredContent, null, 2);
      }
    }

    // Fallback to original parsed content
    return parsed;
  } catch {
    // If parsing fails, return original content
    return content;
  }
};

// Check if content should be rendered as JSON
const shouldRenderAsJSON = (content: unknown) =>
  typeof content === "object" && content !== null;

export function InsightAIUnifiedMessage({
  message,
}: InsightAIUnifiedMessageProps) {
  const [isExpanded, setIsExpanded] = React.useState(
    message.category === "think",
  );
  // const mcpArgsScrollRef = useScrollbarVisibility<HTMLDivElement>();
  // const mcpOutputScrollRef = useScrollbarVisibility<HTMLDivElement>();
  // const expandedContentScrollRef = useScrollbarVisibility<HTMLDivElement>();

  const config = getCategoryDisplayConfig(message.category);

  // Extract title from message content
  const getTitle = () => {
    if (message.category === "mcp" && message.extras?.tool) {
      return `${config.title}：${message.extras.tool}`;
    }

    // For error messages, use a simplified format instead of full content
    if (message.category === "error") {
      // Extract error type from original event if available
      const { originalEvent } = message;
      if (originalEvent && (originalEvent as any).extras?.error_id) {
        const errorId = (originalEvent as any).extras.error_id;
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
      return "智能体遇到错误";
    }

    const firstLine =
      message.content.split("\n")[0].trim() || message.content.trim();
    if (firstLine === "Output:") {
      return "输出内容";
    }

    return firstLine.length > 80
      ? `${firstLine.substring(0, 80)}...`
      : firstLine;
  };

  // Get detailed content for expansion
  const getDetailedContent = () => {
    // For regular message category, only return detailedContent if explicitly set
    if (message.category === "message") {
      return message.detailedContent || null;
    }

    // For MCP messages, ensure we show the detailed content properly
    if (message.category === "mcp") {
      
      // If we have detailedContent, use it; otherwise, extract from originalEvent
      if (message.detailedContent && message.detailedContent !== message.content) {
        return message.detailedContent;
      }
      
      // Fallback: generate detailed content from original event
      if (message.originalEvent) {
        try {
          if (isOpenHandsAction(message.originalEvent) && (message.originalEvent as any).action === "call_tool_mcp") {
            // For MCP actions, show formatted tool call details
            const args = (message.originalEvent as any).args || {};
            const name = args.name || "Unknown Tool";
            const arguments_obj = args.arguments || {};
            let details = `**MCP Tool Call:** ${name}\n\n`;
            if (args.thought) {
              details += `**Thought:**\n${args.thought}\n\n`;
            }
            details += `**Arguments:**\n\`\`\`json\n${JSON.stringify(arguments_obj, null, 2)}\n\`\`\``;
            return details;
          } else if (isOpenHandsObservation(message.originalEvent) && (message.originalEvent as any).observation === "mcp") {
            // For MCP observations, extract and show the actual execution result
            const event = message.originalEvent;
            let executionResult = "无执行结果";
            
            if (event.content) {
              try {
                // Parse the outer JSON structure
                const parsedContent = JSON.parse(event.content);
                
                if (parsedContent.content && Array.isArray(parsedContent.content)) {
                  // Look for the actual tool result in content[0].text
                  const firstItem = parsedContent.content[0];
                  if (firstItem && firstItem.text && typeof firstItem.text === 'string') {
                    try {
                      // Parse the nested JSON in the text field
                      const actualResult = JSON.parse(firstItem.text);
                      
                      // Format the result nicely - show the important parts
                      if (actualResult.success) {
                        // For successful results, show all meaningful fields
                        const resultObj: any = {
                          success: actualResult.success,
                        };
                        
                        // Add data if present (for SQL query results)
                        if (actualResult.data) {
                          resultObj.data = actualResult.data;
                        }
                        
                        // Add file path if present (for export results)
                        if (actualResult.file_path) {
                          resultObj.file_path = actualResult.file_path;
                        }
                        
                        // Add row count if present
                        if (actualResult.row_count !== null && actualResult.row_count !== undefined) {
                          resultObj.row_count = actualResult.row_count;
                        }
                        
                        // Add columns if present
                        if (actualResult.columns) {
                          resultObj.columns = actualResult.columns;
                        }
                        
                        // Add query type if present
                        if (actualResult.query_type) {
                          resultObj.query_type = actualResult.query_type;
                        }
                        
                        // Add message if present
                        if (actualResult.message) {
                          resultObj.message = actualResult.message;
                        }
                        
                        executionResult = JSON.stringify(resultObj, null, 2);
                      } else {
                        // For failed results, show error info
                        executionResult = JSON.stringify(actualResult, null, 2);
                      }
                    } catch (nestedParseError) {
                      // If nested parsing fails, use the text as is
                      executionResult = firstItem.text;
                    }
                  }
                }
              } catch (e) {
                // If JSON parsing fails, use content as plain text
                executionResult = event.content;
              }
            }
            
            // Include tool name and arguments if available from message extras
            let details = "";
            if (message.extras?.tool) {
              details += `**工具名称:** ${message.extras.tool}\n\n`;
            }
            if (message.extras?.arguments) {
              details += `**调用参数:**\n\`\`\`json\n${JSON.stringify(message.extras.arguments, null, 2)}\n\`\`\`\n\n`;
            }
            details += `**执行结果:**\n\`\`\`\n${executionResult}\n\`\`\``;
            
            return details;
          }
        } catch (error) {
          console.warn("Failed to generate MCP detailed content:", error);
        }
      }
      
      return null; // No detailed content available
    }

    const content = message.detailedContent || message.content;

    // For non-MCP messages, extract content from code blocks
    if ((message.category as string) !== "mcp" && content.includes("```")) {
      // Extract content between ``` markers
      const codeBlockRegex = /```[\s\S]*?\n([\s\S]*?)\n```/g;
      const matches = [...content.matchAll(codeBlockRegex)];

      if (matches.length > 0) {
        // If there are multiple code blocks, join them
        const extractedContent = matches
          .map((match) => match[1].trim())
          .join("\n\n");
        return extractedContent || content;
      }
    }

    return content;
  };

  // Check if MCP message has arguments
  const hasArguments =
    message.category === "mcp" &&
    message.extras?.arguments &&
    Object.keys(message.extras.arguments).length > 0;

  // Check if MCP message has output
  const hasOutput =
    message.category === "mcp" && 
    (message.content && message.content.trim() || message.extras?.result);

  const detailedContent = getDetailedContent();
  const hasExpandableContent =
    detailedContent &&
    (message.hasExpandableContent ||
      message.content.includes("```") ||
      message.category !== "message");

  // Check if this is an agent, environment, or user message
  // Both agent and environment messages should use the same styling (gray background + white with gray text)
  const isAgentMessage =
    message.originalEvent?.source === "agent" ||
    message.originalEvent?.source === "environment";
  const isUserMessage = message.originalEvent?.source === "user";

  return (
    <div
      className="rounded-lg overflow-hidden insight-ai-message-outer"
      style={{
        backgroundColor:
          isAgentMessage || isUserMessage ? "#f5f5f5" : "#fafafa",
        padding: "4px",
        minWidth: "200px",
        maxWidth: "100%",
        width: "100%",
      }}
    >
      {/* For regular messages, show content in header style. For think messages, show content directly. For technical messages, show header with title */}
      {message.category === "message" ? (
        <div className="bg-white px-3 py-2 rounded-md insight-ai-message-inner">
          {(() => {
            // Check if content is primarily English for font optimization
            const isEnglishContent =
              /^[\x00-\x7F\s]*$/.test(message.content) &&
              /\b(the|and|or|to|of|in|for|with|on|at|by|from|as|is|was|are|were|be|been|have|has|had|do|does|did|will|would|could|should|can|may|might)\b/i.test(
                message.content,
              );

            return (
              <div
                className={`text-black text-sm ${isEnglishContent ? "leading-6 font-sans" : "leading-relaxed"} break-words`}
                style={{
                  ...(isEnglishContent
                    ? {
                        fontFamily:
                          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      }
                    : {}),
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              >
                <Markdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    // Override pre to ensure code blocks wrap properly
                    pre: ({ children }) => (
                      <pre
                        className="text-xs whitespace-pre-wrap p-2 rounded bg-gray-100 overflow-x-auto"
                        style={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {children}
                      </pre>
                    ),
                    // Override code to ensure inline code wraps
                    code: ({ children, ...props }) => (
                      <code
                        {...props}
                        className="bg-gray-100 px-1 py-0.5 rounded text-xs break-words"
                        style={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {children}
                      </code>
                    ),
                    // Override paragraphs to ensure proper wrapping
                    p: ({ children }) => (
                      <p
                        className="mb-2 break-words"
                        style={{
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        {children}
                      </p>
                    ),
                  }}
                >
                  {message.content}
                </Markdown>
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 px-3 py-1 rounded-md bg-white insight-ai-message-inner">
          <div className="flex items-center gap-2">
            {message.category === "think" && (
              <FaRegLightbulb className="w-3 h-3 text-orange-400" />
            )}
            <span className="text-sm text-black">
              {message.category === "think"
                ? "思考过程"
                : decodeHtmlEntities(getTitle())}
            </span>
          </div>
          {hasExpandableContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded transition-colors flex-shrink-0 hover:bg-gray-100 text-black"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && hasExpandableContent && (
        <div
          className="px-0 pt-1"
          style={{ maxWidth: "100%", overflow: "hidden" }}
        >
          {message.category === "mcp" ? (
            <>
              {/* MCP Arguments section */}
              {hasArguments && (
                <div className="bg-white rounded-md border border-gray-200 overflow-hidden insight-ai-message-inner">
                  <div className="bg-blue-50 px-3 py-1">
                    <div className="flex items-center gap-2">
                      <Play className="w-3 h-3 text-yellow-400" />
                      <span className="text-sm text-gray-600">调用参数</span>
                    </div>
                  </div>
                  <div
                    className="max-h-60 overflow-auto insight-ai-scrollbar"
                    style={{ backgroundColor: "#fafafa" }}
                  >
                    <div className="p-3" style={{ paddingBottom: 0 }}>
                      <ReactJsonView
                        name={false}
                        src={processJsonForDisplay(
                          message.extras!.arguments as object,
                        )}
                        theme={INSIGHT_AI_JSON_THEME}
                        collapsed={false}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        enableClipboard
                        indentWidth={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MCP Output section */}
              {hasOutput && (
                <div
                  className={`bg-white rounded-md border border-gray-200 overflow-hidden insight-ai-message-inner ${hasArguments ? "mt-2" : ""}`}
                >
                  <div className="bg-blue-50 px-3 py-1">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full" />
                      <span className="text-sm text-gray-600">执行结果</span>
                    </div>
                  </div>
                  <div
                    className="max-h-80 overflow-auto insight-ai-scrollbar"
                    style={{ backgroundColor: "#fafafa" }}
                  >
                    <div className="p-3" style={{ paddingBottom: 0 }}>
                      {(() => {
                        // For MCP messages, if we have result in extras, use it directly (like arguments)
                        if (message.category === "mcp" && message.extras?.result) {
                          
                          // If result is already an object, render with ReactJsonView
                          if (typeof message.extras.result === 'object' && message.extras.result !== null) {
                            return (
                              <ReactJsonView
                                name={false}
                                src={processJsonForDisplay(message.extras.result)}
                                theme={INSIGHT_AI_JSON_THEME}
                                collapsed={false}
                                displayDataTypes={false}
                                displayObjectSize={false}
                                enableClipboard
                                indentWidth={2}
                              />
                            );
                          } else {
                            // If result is a string, render as plain text
                            return (
                              <div className="text-sm text-gray-800 whitespace-pre-wrap font-mono break-words">
                                {String(message.extras.result)}
                              </div>
                            );
                          }
                        }
                        
                        // Fallback: if no extras.result, show a simple placeholder
                        return (
                          <div className="text-sm text-gray-600">
                            执行结果无法显示
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Non-MCP messages - unified content display using think message format */
            <div
              className="px-3 py-2 max-h-80 overflow-auto insight-ai-scrollbar"
              style={{
                backgroundColor: "#fafafa",
                maxWidth: "100%",
                width: "100%",
              }}
            >
              {(() => {
                const content = detailedContent || message.content;

                // Check if content is already an object (JSON)
                if (typeof content === "object" && content !== null) {
                  return (
                    <div style={{ marginBottom: 0, paddingBottom: 0 }}>
                      <ReactJsonView
                        name={false}
                        src={processJsonForDisplay(content)}
                        theme={INSIGHT_AI_JSON_THEME}
                        collapsed={false}
                        displayDataTypes={false}
                        displayObjectSize={false}
                        enableClipboard
                        indentWidth={2}
                      />
                    </div>
                  );
                }

                // If content is a string, try to parse as JSON
                if (typeof content === "string") {
                  try {
                    const jsonContent = JSON.parse(content);
                    return (
                      <div style={{ marginBottom: 0, paddingBottom: 0 }}>
                        <ReactJsonView
                          name={false}
                          src={processJsonForDisplay(jsonContent)}
                          theme={INSIGHT_AI_JSON_THEME}
                          collapsed={false}
                          displayDataTypes={false}
                          displayObjectSize={false}
                          enableClipboard
                          indentWidth={2}
                        />
                      </div>
                    );
                  } catch (e) {
                    // Not JSON, render as Markdown with think message format
                    return (
                      <div
                        className="text-sm leading-relaxed break-words"
                        style={{
                          color: "#666666",
                          marginBottom: 0,
                          paddingBottom: 0,
                          wordWrap: "break-word",
                          overflowWrap: "break-word",
                        }}
                      >
                        <Markdown
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            // Override pre to ensure code blocks wrap properly
                            pre: ({ children }) => (
                              <pre
                                className="text-xs whitespace-pre-wrap p-2 rounded bg-gray-100 overflow-x-auto"
                                style={{
                                  wordWrap: "break-word",
                                  overflowWrap: "break-word",
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {children}
                              </pre>
                            ),
                            // Override code to ensure inline code wraps
                            code: ({ children, ...props }) => (
                              <code
                                {...props}
                                className="bg-gray-100 px-1 py-0.5 rounded text-xs break-words"
                                style={{
                                  wordWrap: "break-word",
                                  overflowWrap: "break-word",
                                }}
                              >
                                {children}
                              </code>
                            ),
                            // Override paragraphs to ensure proper wrapping
                            p: ({ children }) => (
                              <p
                                className="mb-2 break-words"
                                style={{
                                  wordWrap: "break-word",
                                  overflowWrap: "break-word",
                                }}
                              >
                                {children}
                              </p>
                            ),
                          }}
                        >
                          {content}
                        </Markdown>
                      </div>
                    );
                  }
                }

                // Fallback: render as Markdown with think message format
                return (
                  <div
                    className="text-sm leading-relaxed break-words"
                    style={{
                      color: "#666666",
                      marginBottom: 0,
                      paddingBottom: 0,
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    <Markdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      components={{
                        // Override pre to ensure code blocks wrap properly
                        pre: ({ children }) => (
                          <pre
                            className="text-xs whitespace-pre-wrap p-2 rounded bg-gray-100 overflow-x-auto"
                            style={{
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {children}
                          </pre>
                        ),
                        // Override code to ensure inline code wraps
                        code: ({ children, ...props }) => (
                          <code
                            {...props}
                            className="bg-gray-100 px-1 py-0.5 rounded text-xs break-words"
                            style={{
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            {children}
                          </code>
                        ),
                        // Override paragraphs to ensure proper wrapping
                        p: ({ children }) => (
                          <p
                            className="mb-2 break-words"
                            style={{
                              wordWrap: "break-word",
                              overflowWrap: "break-word",
                            }}
                          >
                            {children}
                          </p>
                        ),
                      }}
                    >
                      {String(content) || "无内容"}
                    </Markdown>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
