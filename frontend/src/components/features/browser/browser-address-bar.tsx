import { useState, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";

interface BrowserAddressBarProps {
  url: string;
  isLoading: boolean;
  canGoBack?: boolean;
  canGoForward?: boolean;
  onNavigate: (url: string) => void;
  onRefresh: () => void;
  onDownload: () => void;
  onGoBack?: () => void;
  onGoForward?: () => void;
}

export function BrowserAddressBar({ 
  url, 
  isLoading,
  canGoBack = false,
  canGoForward = false, 
  onNavigate, 
  onRefresh, 
  onDownload,
  onGoBack,
  onGoForward
}: BrowserAddressBarProps) {
  const { t } = useTranslation();
  const [inputUrl, setInputUrl] = useState(url);
  const [isEditing, setIsEditing] = useState(false);

  // Update input when url prop changes
  if (!isEditing && inputUrl !== url) {
    setInputUrl(url);
  }

  const validateAndFormatUrl = (inputUrl: string): string => {
    const trimmed = inputUrl.trim();
    
    // If empty, return as is
    if (!trimmed) {
      return trimmed;
    }

    // If already has protocol, return as is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // If starts with localhost or an IP address, use http://
    if (trimmed.startsWith('localhost') || 
        trimmed.startsWith('127.0.0.1') ||
        /^\d+\.\d+\.\d+\.\d+/.test(trimmed)) {
      return `http://${trimmed}`;
    }

    // For everything else, use https://
    return `https://${trimmed}`;
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleNavigate();
    }
  };

  const handleNavigate = () => {
    const formattedUrl = validateAndFormatUrl(inputUrl);
    if (formattedUrl && formattedUrl !== url) {
      onNavigate(formattedUrl);
    }
    setIsEditing(false);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleInputBlur = () => {
    setIsEditing(false);
    // Reset to current URL if input is empty or unchanged
    if (!inputUrl.trim() || inputUrl === url) {
      setInputUrl(url);
    }
  };

  return (
    <div className="flex items-center space-x-2 p-3 bg-neutral-800 border-b border-neutral-600">
      {/* Back Button */}
      <button
        onClick={onGoBack}
        disabled={!canGoBack}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="后退"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Forward Button */}
      <button
        onClick={onGoForward}
        disabled={!canGoForward}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="前进"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Refresh Button */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={t(I18nKey.BROWSER$REFRESH_BUTTON) || "刷新"}
      >
        <div className={`w-4 h-4 border-2 border-current border-t-transparent rounded-full ${isLoading ? 'animate-spin' : ''}`} />
      </button>

      {/* Address Bar */}
      <div className="flex-1 relative">
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-md text-neutral-200 placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:bg-neutral-600 transition-colors"
          placeholder="Enter URL..."
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {isEditing && (
          <button
            onClick={handleNavigate}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors"
          >
            Go
          </button>
        )}
      </div>

      {/* Download Button */}
      <button
        onClick={onDownload}
        disabled={isLoading || !url}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title={t(I18nKey.BROWSER$DOWNLOAD_BUTTON) || "下载HTML"}
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </button>
    </div>
  );
}