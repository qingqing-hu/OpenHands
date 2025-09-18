import React from "react";
import { MdAttachFile } from "react-icons/md";
import { BsFillArrowUpCircleFill } from "react-icons/bs";
import { Bot } from "lucide-react";
import { FaArrowDown } from "react-icons/fa6";
import { validateFiles } from "../../../utils/file-validation";
import { isFileImage } from "../../../utils/is-file-image";
import { displayErrorToast } from "../../../utils/custom-toast-handlers";
import { FileList } from "../../features/files/file-list";
import { ImageCarousel } from "../../features/images/image-carousel";
import { AgentState } from "#/types/agent-state";

interface InsightAIChatInputProps {
  onSendMessage: (message: string, images?: File[], files?: File[]) => void;
  disabled?: boolean;
  agentStateMessage?: string;
  agentState?: AgentState;
  onScrollToBottom?: () => void;
  showScrollToBottom?: boolean;
}

export function InsightAIChatInput({
  onSendMessage,
  disabled = false,
  agentStateMessage,
  agentState,
  onScrollToBottom,
  showScrollToBottom = false,
}: InsightAIChatInputProps) {
  const [message, setMessage] = React.useState("");
  const [images, setImages] = React.useState<File[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (message.trim() || images.length > 0 || files.length > 0) &&
      !disabled
    ) {
      onSendMessage(message.trim(), images, files);
      setMessage("");
      setImages([]);
      setFiles([]);
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 避免在输入法组合输入过程中触发发送
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleUpload(selectedFiles);
    }
  };

  const handleUpload = (selectedFiles: File[]) => {
    // Validate files before adding them
    const validation = validateFiles(selectedFiles, [...images, ...files]);
    if (!validation.isValid) {
      displayErrorToast(`Error: ${validation.errorMessage}`);
      return; // Don't add any files if validation fails
    }
    // Filter valid files by type
    const validFiles = selectedFiles.filter((f) => !isFileImage(f));
    const validImages = selectedFiles.filter((f) => isFileImage(f));
    setFiles((prevFiles) => [...prevFiles, ...validFiles]);
    setImages((prevImages) => [...prevImages, ...validImages]);
  };

  const removeElementByIndex = <T,>(array: T[], index: number): T[] => {
    const newArray = [...array];
    newArray.splice(index, 1);
    return newArray;
  };

  // 智能体状态指示器组件
  const AgentStateIndicator = React.memo(({ 
    state, 
    message 
  }: { 
    state: AgentState;
    message: string;
  }) => {
    const [showTooltip, setShowTooltip] = React.useState(false);
    
    const getStateConfig = () => {
      switch (state) {
        case AgentState.AWAITING_USER_INPUT:
          return {
            color: "text-blue-500 animate-pulse",
            bgColor: "bg-blue-100",
            dotColor: "bg-blue-600 animate-pulse",
            tooltipBg: "bg-blue-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-blue-600",
          };
        case AgentState.RUNNING:
          return {
            color: "text-green-500 animate-pulse",
            bgColor: "bg-green-100",
            dotColor: "bg-green-600 animate-pulse",
            tooltipBg: "bg-green-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-green-600",
          };
        case AgentState.LOADING:
        case AgentState.INIT:
          // 合并显示：LOADING表示正在连接智能体，INIT表示正在初始化智能体
          // 两个状态都是用户无法交互的准备阶段，使用相同的琥珀色和脉冲动画
          return {
            color: "text-amber-500 animate-pulse",
            bgColor: "bg-amber-100",
            dotColor: "bg-amber-600 animate-pulse",
            tooltipBg: "bg-amber-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-amber-600",
          };
        case AgentState.PAUSED:
          return {
            color: "text-orange-500 animate-pulse",
            bgColor: "bg-orange-100",
            dotColor: "bg-orange-600 animate-pulse",
            tooltipBg: "bg-orange-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-orange-600",
          };
        case AgentState.STOPPED:
        case AgentState.ERROR:
          return {
            color: "text-red-500 animate-pulse",
            bgColor: "bg-red-100",
            dotColor: "bg-red-600 animate-pulse",
            tooltipBg: "bg-red-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-red-600",
          };
        case AgentState.FINISHED:
          return {
            color: "text-emerald-500 animate-pulse",
            bgColor: "bg-emerald-100",
            dotColor: "bg-emerald-600 animate-pulse",
            tooltipBg: "bg-emerald-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-emerald-600",
          };
        default:
          return {
            color: "text-slate-500 animate-pulse",
            bgColor: "bg-slate-100",
            dotColor: "bg-slate-600 animate-pulse",
            tooltipBg: "bg-slate-600",
            tooltipText: "text-white",
            tooltipArrow: "border-t-slate-600",
          };
      }
    };

    const config = getStateConfig();

    return (
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* 状态指示器 */}
        <div className="relative pointer-events-auto">
          <div
            className={`relative flex items-center justify-center w-8 h-8 ${config.color} ${config.bgColor} rounded-full cursor-pointer pointer-events-auto`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Bot className="w-4 h-4" />
            {/* 状态小圆点 */}
            <div 
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${config.dotColor} rounded-full border border-white`}
            />
          </div>
          
          {/* 自定义tooltip */}
          {showTooltip && (
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 px-2 py-1 ${config.tooltipBg} rounded-md shadow-lg whitespace-nowrap z-50 pointer-events-none`}>
              <div className={`${config.tooltipText} text-xs font-medium`}>
                {message}
              </div>
              {/* 小箭头 */}
              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-t-3 border-l-transparent border-r-transparent ${config.tooltipArrow}`}></div>
            </div>
          )}
        </div>
        
      </div>
    );
  });

  const handleRemoveFile = (index: number) => {
    setFiles(removeElementByIndex(files, index));
  };

  const handleRemoveImage = (index: number) => {
    setImages(removeElementByIndex(images, index));
  };

  return (
    <div className="insight-ai-chat-input-container">
      {/* File displays */}
      {images.length > 0 && (
        <div className="mb-2">
          <ImageCarousel
            size="small"
            images={images.map((image) => URL.createObjectURL(image))}
            onRemove={handleRemoveImage}
          />
        </div>
      )}
      {files.length > 0 && (
        <div className="mb-2">
          <FileList
            files={files.map((f) => f.name)}
            onRemove={handleRemoveFile}
          />
        </div>
      )}

      {/* 输入框和状态指示器的容器 */}
      <div className="relative flex items-center justify-center gap-3 w-full">
        {/* 智能体状态指示器 - 位于输入框左侧 */}
        {agentState && agentStateMessage && (
          <AgentStateIndicator
            state={agentState}
            message={agentStateMessage}
          />
        )}

        <form onSubmit={handleSubmit} className="insight-ai-input-form relative">
          {/* File attachment button */}
          <button
            type="button"
            onClick={handleFileAttach}
            className="insight-ai-add-file-button"
            title="添加文件"
            aria-label="添加文件"
            disabled={disabled}
          >
            <MdAttachFile className="w-6 h-6" />
          </button>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileChange}
            accept="image/*,text/*,.pdf,.doc,.docx,.json,.xml,.csv"
          />

          {/* Message input container */}
          <div className="insight-ai-input-wrapper">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={disabled && agentStateMessage ? agentStateMessage : "询问任何问题"}
              className="insight-ai-textarea"
              disabled={disabled}
              rows={1}
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={
                !(message.trim() || images.length > 0 || files.length > 0) ||
                disabled
              }
              className={`insight-ai-send-button ${
                message.trim() || images.length > 0 || files.length > 0
                  ? "has-content"
                  : "no-content"
              }`}
              aria-label="发送提示"
            >
              <BsFillArrowUpCircleFill className="w-7 h-7" />
            </button>
          </div>

          {/* Scroll to bottom button - positioned relative to the form */}
          {showScrollToBottom && onScrollToBottom && (
            <div
              className="absolute left-full top-1/2 transform -translate-y-1/2 ml-3"
              style={{
                zIndex: 9999,
                pointerEvents: 'auto'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (onScrollToBottom) {
                    onScrollToBottom();
                  }
                }}
                className="group flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex-shrink-0"
                aria-label="滑到底部"
                style={{
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  zIndex: 9999,
                  position: 'relative'
                }}
              >
                <FaArrowDown
                  className="w-3 h-3 text-gray-600 group-hover:text-gray-800 transition-colors duration-200"
                  style={{ pointerEvents: 'none' }}
                />
              </button>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                滑到底部
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-800"></div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
