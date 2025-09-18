import React, { useEffect, useRef, useState } from 'react';
import { InsightAIBrowserService } from '#/api/insight-ai-browser-service';
import { InsightAIBrowserError } from './insight-ai-browser-error';

interface InsightAIBrowserIframeProps {
  src: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onUrlChange?: (url: string) => void;
  className?: string;
}

export function InsightAIBrowserIframe({ 
  src, 
  onLoad, 
  onError, 
  onUrlChange,
  className = '' 
}: InsightAIBrowserIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedSuccessfully, setHasLoadedSuccessfully] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      setIsLoading(false);
      setHasLoadedSuccessfully(true);
      setError(null);
      onLoad?.();
      
      // 尝试检测 URL 变化（仅限同源）
      try {
        const iframeUrl = iframe.contentWindow?.location.href;
        if (iframeUrl && iframeUrl !== src) {
          onUrlChange?.(iframeUrl);
        }
      } catch (error) {
        // 跨域限制，忽略错误
      }
    };

    const handleError = () => {
      setIsLoading(false);
      const errorMessage = 'Failed to load the webpage.';
      setError(errorMessage);
      onError?.(errorMessage);
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    // 重置状态
    setIsLoading(true);
    setError(null);
    setHasLoadedSuccessfully(false);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [src, onLoad, onError, onUrlChange]);

  // 检测安全限制（X-Frame-Options 等）
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // 跳过本地文件的安全检查
    const isLocalFile = InsightAIBrowserService.isLocalPreviewUrl(src);
    if (isLocalFile) {
      return;
    }

    const checkForSecurityErrors = () => {
      // 如果页面已经成功加载或已有错误，不进行检查
      if (hasLoadedSuccessfully || error) return;

      try {
        // 尝试访问 iframe 内容，如果被阻止会抛出异常
        const testAccess = iframe.contentDocument?.body;
        if (testAccess) {
          return; // 页面可访问，无安全问题
        }
      } catch (securityError) {
        const errorMessage = securityError instanceof Error ? securityError.message : String(securityError);
        
        // 检查是否为安全限制错误
        if (!hasLoadedSuccessfully && 
            (errorMessage.includes('cross-origin') || 
             errorMessage.includes('X-Frame-Options') || 
             errorMessage.includes('frame') ||
             errorMessage.includes('Permission denied'))) {
          const displayError = '此网站不允许在 iframe 中显示。这是该网站的安全设置。';
          setError(displayError);
          onError?.(displayError);
        }
      }
    };

    // 延迟检查，避免误报
    const timeoutId = setTimeout(() => {
      if (isLoading && !hasLoadedSuccessfully && !error) {
        checkForSecurityErrors();
      }
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [src, onError, isLoading, hasLoadedSuccessfully, error]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = src;
    }
  };

  // 错误状态
  if (error) {
    return (
      <div className={`w-full h-full ${className}`}>
        <InsightAIBrowserError 
          error={error} 
          onRetry={handleRetry}
          url={src}
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* 加载指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-sm text-gray-600">正在加载页面...</span>
            </div>
            
            {/* 加载进度条动画 */}
            <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
        </div>
      )}
      
      {/* 主要 iframe */}
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0"
        style={{ 
          minHeight: '400px',
          backgroundColor: '#ffffff'
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-navigation allow-downloads"
        loading="lazy"
        title="Browser Content"
        allow="fullscreen; camera; microphone; geolocation"
      />
    </div>
  );
}