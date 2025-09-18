import React, { useState } from "react";
import { FileText, Copy, Download, RefreshCw, X, Globe } from "lucide-react";
import { IoMdClose } from "react-icons/io";
import {
  useInsightAITaskLogs,
  useInsightAITaskFiles,
  useInsightAIFileOperations,
} from "#/hooks/insight-ai/use-insight-ai-tasks";
import { InsightAITerminal } from "./insight-ai-terminal";
import { InsightAIBrowserPanel } from "../browser";

interface FileItem {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  modified?: Date;
  content?: string;
}

interface InsightAICodePanelProps {
  taskId?: string;
  isRunning?: boolean;
  onStop?: () => void;
  onRestart?: () => void;
  onClose?: () => void;
  onClosePanel?: () => void;
}

type ViewMode = "terminal" | "files" | "browser";

export function InsightAICodePanel({
  taskId,
  isRunning = false,
  onRestart,
  onClose,
  onClosePanel,
}: InsightAICodePanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("terminal");
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  // Use real API data for files
  const { data: logsData } = useInsightAITaskLogs(taskId || "");
  const { data: filesData } = useInsightAITaskFiles(taskId || "");
  const fileOperations = useInsightAIFileOperations(taskId || "");

  // Convert API data to component format
  const logs = React.useMemo(() => {
    if (!logsData?.logs || !Array.isArray(logsData.logs)) return [];
    return logsData.logs.map((log) => ({
      ...log,
      timestamp: new Date(log.timestamp),
    }));
  }, [logsData?.logs]);

  const files = React.useMemo(() => {
    if (!filesData?.files || !Array.isArray(filesData.files)) return [];
    return filesData.files.map((file) => ({
      ...file,
      modified: file.modified ? new Date(file.modified) : undefined,
    }));
  }, [filesData?.files]);

  const formatFileSize = (bytes: number) => {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const copyContent = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error("Failed to copy content:", error);
    }
  };

  const handleDownloadFile = async (filePath: string) => {
    if (!taskId) return;
    try {
      await fileOperations.downloadFile(filePath);
    } catch (error) {
      console.error("Failed to download file:", error);
    }
  };

  const handleFileSelect = async (file: FileItem) => {
    setSelectedFile(file);
    if (!taskId || file.content) return;

    try {
      const content = await fileOperations.getFileContent(file.path);
      setSelectedFile({ ...file, content });
    } catch (error) {
      console.error("Failed to load file content:", error);
    }
  };

  const segmentedOptions = [
    {
      value: "terminal",
      label: "终端",
    },
    {
      value: "files",
      label: "文件",
    },
    {
      value: "browser",
      label: "浏览器",
    },
  ];

  const renderTerminalContentInline = () => (
    <div
      id="rc-tabs-terminal-panel"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="rc-tabs-terminal-tab"
      aria-hidden={false}
      className="ant-tabs-tabpane ant-tabs-tabpane-active h-full px-4 pt-1 pb-4"
    >
      <InsightAITerminal taskId={taskId || ""} />
    </div>
  );

  const renderBrowserContentInline = () => (
    <div
      id="rc-tabs-browser-panel"
      role="tabpanel"
      tabIndex={0}
      aria-labelledby="rc-tabs-browser-tab"
      aria-hidden={false}
      className="ant-tabs-tabpane ant-tabs-tabpane-active h-full px-4 pt-1 pb-4"
    >
      <InsightAIBrowserPanel
        conversationId={taskId || ""}
        className="h-full"
        autoSwitchEnabled={true}
        useContainerLayout={true}
      />
    </div>
  );

  const renderWorkspaceContentInline = () => (
    <div className="h-full flex flex-col px-4 pt-1 pb-4">
      <div className="h-full border border-gray-200 rounded-xl overflow-hidden flex flex-col">
        {/* File List Header */}
        <div className="p-4 flex items-center justify-between bg-white">
          <h3 style={{ fontSize: "14px", color: "#999999" }}>文件列表</h3>
          <button
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* File Browser */}
        <div className="flex-1 overflow-y-auto insight-ai-scrollbar bg-white">
          {(files || []).map((file, index) => (
            <div
              key={index}
              onClick={() => handleFileSelect(file)}
              className={`
                  p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between
                  ${selectedFile?.path === file.path ? "bg-blue-50 border-blue-200" : ""}
                `}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-6 h-6 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {file.name}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {file.size && <span>{formatFileSize(file.size)}</span>}
                {file.modified && (
                  <span>{file.modified.toLocaleDateString()}</span>
                )}
              </div>
            </div>
          ))}

          {(!files || files.length === 0) && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No files found</p>
              </div>
            </div>
          )}
        </div>

        {/* File Content Panel - Only show when file is selected */}
        {selectedFile && (
          <div className="border-t border-gray-200 bg-white">
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">
                {selectedFile.name}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    selectedFile.content && copyContent(selectedFile.content)
                  }
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    selectedFile && handleDownloadFile(selectedFile.path)
                  }
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto insight-ai-scrollbar">
              <pre className="p-4 text-sm text-gray-800 font-mono bg-gray-50">
                <code>{selectedFile.content || "Loading..."}</code>
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Single white container for both header and content */}
      <div className="h-full py-2 px-1.5 bg-gray-50">
        <div className="bg-white rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
          {/* Top Header with Segmented Control */}
          <div className="px-4 py-3 bg-white">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2
                  style={{
                    fontSize: "18px",
                    color: "#000000",
                    fontWeight: "500",
                  }}
                >
                  工作台
                </h2>
                {onClosePanel && (
                  <button
                    onClick={onClosePanel}
                    className="insight-ai-panel-close-btn flex items-center justify-center w-8 h-8 cursor-pointer"
                    style={{
                      padding: "6px",
                      borderRadius: "10px",
                    }}
                    title="关闭右侧栏"
                  >
                    <IoMdClose className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {/* Segmented Control */}
                  <div
                    role="radiogroup"
                    aria-label="segmented control"
                    tabIndex={0}
                    className="ant-segmented acss-1hehoax css-131v83g"
                  >
                    <div className="ant-segmented-group flex">
                      {segmentedOptions.map((option) => {
                        const isSelected = viewMode === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`ant-segmented-item ${isSelected ? "ant-segmented-item-selected" : ""}`}
                            style={{
                              paddingInline: "12px",
                              borderRadius: "10px",
                            }}
                          >
                            <input
                              className="ant-segmented-item-input sr-only"
                              type="radio"
                              name="group"
                              value={option.value}
                              checked={isSelected}
                              onChange={() =>
                                setViewMode(option.value as ViewMode)
                              }
                            />
                            <div
                              className="ant-segmented-item-label cursor-pointer"
                              aria-selected={isSelected}
                            >
                              <div
                                className="ant-flex css-131v83g ant-flex-align-center flex items-center"
                                style={{ gap: "4px", flexDirection: "row" }}
                              >
                                {option.value === "terminal" ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-square-terminal"
                                    aria-hidden="true"
                                  >
                                    <path d="m7 11 2-2-2-2" />
                                    <path d="M11 13h4" />
                                    <rect
                                      width="18"
                                      height="18"
                                      x="3"
                                      y="3"
                                      rx="2"
                                      ry="2"
                                    />
                                  </svg>
                                ) : option.value === "files" ? (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="transparent"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-folder-code"
                                    aria-hidden="true"
                                  >
                                    <path d="M10 10.5 8 13l2 2.5" />
                                    <path d="m14 10.5 2 2.5-2 2.5" />
                                    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" />
                                  </svg>
                                ) : (
                                  <Globe size={16} />
                                )}
                                <div>{option.label}</div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center" style={{ gap: "10px" }}>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      style={{
                        borderRadius: "5px",
                        height: "32.4px",
                        width: "32.4px",
                      }}
                      title="Close"
                    >
                      <X size={18} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content directly controlled by segmented control */}
          <div className="flex-1 overflow-hidden">
            {viewMode === "terminal" && renderTerminalContentInline()}
            {viewMode === "files" && renderWorkspaceContentInline()}
            {viewMode === "browser" && renderBrowserContentInline()}
          </div>
        </div>
      </div>
    </div>
  );
}
