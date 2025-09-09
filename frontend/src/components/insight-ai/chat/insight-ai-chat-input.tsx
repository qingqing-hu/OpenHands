import React from "react";
import { MdAttachFile } from "react-icons/md";
import { BsFillArrowUpCircleFill } from "react-icons/bs";
import { validateFiles } from "../../../utils/file-validation";
import { isFileImage } from "../../../utils/is-file-image";
import { displayErrorToast } from "../../../utils/custom-toast-handlers";
import { FileList } from "../../features/files/file-list";
import { ImageCarousel } from "../../features/images/image-carousel";

interface InsightAIChatInputProps {
  onSendMessage: (message: string, images?: File[], files?: File[]) => void;
  disabled?: boolean;
}

export function InsightAIChatInput({
  onSendMessage,
  disabled = false,
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
    if (e.key === "Enter" && !e.shiftKey) {
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

      <form onSubmit={handleSubmit} className="insight-ai-input-form">
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
            placeholder="询问任何问题"
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
      </form>
    </div>
  );
}
