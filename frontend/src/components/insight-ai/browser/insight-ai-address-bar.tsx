import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Download, 
  Globe, 
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { InsightAIBrowserService } from '#/api/insight-ai-browser-service';

interface InsightAIAddressBarProps {
  url: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onRefresh: () => void;
  onDownload: () => void;
  conversationId: string;
  downloadInProgress?: boolean;
  useContainerStyle?: boolean;
}

export function InsightAIAddressBar({
  url,
  isLoading,
  canGoBack,
  canGoForward,
  onNavigate,
  onGoBack,
  onGoForward,
  onRefresh,
  onDownload,
  conversationId,
  downloadInProgress = false,
  useContainerStyle = false,
}: InsightAIAddressBarProps) {
  const [inputValue, setInputValue] = useState(url);
  const [urlValidation, setUrlValidation] = useState<{
    valid?: boolean;
    error?: string;
    isValidating?: boolean;
  }>({});
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // 同步外部 URL 变化
  useEffect(() => {
    if (!isFocused && url !== inputValue) {
      setInputValue(url);
      setUrlValidation({});
    }
  }, [url, isFocused, inputValue]);

  // URL 验证防抖
  const validateUrlDebounced = useCallback((urlToValidate: string) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!urlToValidate.trim()) {
      setUrlValidation({});
      return;
    }

    // 前端预检查
    const safetyCheck = InsightAIBrowserService.validateUrlSafety(urlToValidate);
    if (!safetyCheck.valid) {
      setUrlValidation({ valid: false, error: safetyCheck.error });
      return;
    }

    setUrlValidation({ isValidating: true });

    validationTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await InsightAIBrowserService.validateUrl(conversationId, { 
          url: urlToValidate 
        });
        setUrlValidation({ 
          valid: response.valid, 
          error: response.error 
        });
      } catch (error) {
        setUrlValidation({ 
          valid: false, 
          error: '验证失败' 
        });
      }
    }, 500);
  }, [conversationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    validateUrlDebounced(newValue);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const handleNavigate = () => {
    const trimmedUrl = inputValue.trim();
    if (!trimmedUrl) return;

    // 如果没有协议，添加 https://
    const finalUrl = trimmedUrl.includes('://') 
      ? trimmedUrl 
      : `https://${trimmedUrl}`;

    onNavigate(finalUrl);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    // 聚焦时选中全部内容
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // 失焦时恢复为当前 URL
    if (inputValue !== url) {
      setInputValue(url);
      setUrlValidation({});
    }
  };

  const getValidationIcon = () => {
    if (urlValidation.isValidating) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }
    if (urlValidation.valid === true) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (urlValidation.valid === false) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    return <Globe className="w-4 h-4 text-gray-400" />;
  };

  const getInputClassName = () => {
    let baseClass = "flex-1 px-3 py-2 text-sm bg-transparent border-0 outline-none placeholder-gray-400 text-gray-900";
    
    if (urlValidation.valid === false) {
      baseClass += " text-red-600";
    } else if (urlValidation.valid === true) {
      baseClass += " text-green-600";
    }
    
    return baseClass;
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`browser-address-bar bg-white ${useContainerStyle ? 'border-b border-gray-200' : 'border-b border-gray-200'}`}>
      <div className="flex items-center px-4 py-2 gap-2">
        {/* 导航按钮 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className="browser-nav-button flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            title="后退"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className="browser-nav-button flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            title="前进"
          >
            <ArrowRight className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="browser-nav-button flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            title="刷新"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* 地址栏 */}
        <div className="flex-1 relative">
          <div className={`flex items-center bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 ${
            isFocused ? 'border-blue-300 bg-white shadow-sm' : 'hover:border-gray-300'
          }`}>
            <div className="flex items-center pl-3">
              {getValidationIcon()}
            </div>
            
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="输入网址..."
              className={`browser-address-input ${getInputClassName()}`}
            />
            
            {inputValue && inputValue !== url && (
              <button
                onClick={handleNavigate}
                className="flex items-center justify-center w-8 h-8 mr-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200"
                title="访问"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* 验证错误提示 */}
          {urlValidation.error && (
            <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-lg shadow-sm z-10">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-600">{urlValidation.error}</span>
              </div>
            </div>
          )}
        </div>

        {/* 功能按钮 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onDownload}
            disabled={!url || downloadInProgress}
            className="browser-nav-button flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-200"
            title="下载页面"
          >
            <Download className={`w-4 h-4 text-gray-600 ${downloadInProgress ? 'animate-pulse' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* 加载进度条 */}
      {isLoading && (
        <div className="h-0.5 bg-gray-100">
          <div className="h-full bg-blue-600 animate-pulse" style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
}