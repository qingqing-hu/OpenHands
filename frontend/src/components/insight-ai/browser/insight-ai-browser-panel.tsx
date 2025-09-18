import React, { useState, useCallback } from 'react';
import { Globe, AlertCircle } from 'lucide-react';
import { useInsightAIBrowser } from '#/hooks/insight-ai/use-insight-ai-browser';
import { InsightAIAddressBar } from './insight-ai-address-bar';
import { InsightAIBrowserIframe } from './insight-ai-browser-iframe';
import { InsightAIBrowserError } from './insight-ai-browser-error';
import { InsightAIBrowserErrorBoundary } from './insight-ai-browser-error-boundary';

interface InsightAIBrowserPanelProps {
  conversationId: string;
  className?: string;
  initialUrl?: string;
  autoSwitchEnabled?: boolean;
  useContainerLayout?: boolean;
}

export function InsightAIBrowserPanel({
  conversationId,
  className = '',
  initialUrl = '',
  autoSwitchEnabled = true,
  useContainerLayout = false,
}: InsightAIBrowserPanelProps) {
  const [hasContent, setHasContent] = useState(!!initialUrl);

  // 使用浏览器 Hook
  const browser = useInsightAIBrowser({
    conversationId,
    initialUrl,
    autoSwitchEnabled,
    onNavigationSuccess: (url) => {
      setHasContent(true);
      console.log('[InsightAI Browser] Navigation successful:', url);
    },
    onNavigationError: (error) => {
      console.error('[InsightAI Browser] Navigation error:', error);
    },
  });

  // 处理导航
  const handleNavigate = useCallback((url: string) => {
    if (url && url.trim()) {
      browser.navigate(url);
      setHasContent(true);
    }
  }, [browser]);

  // 处理 iframe 加载完成
  const handleIframeLoad = useCallback(() => {
    // iframe 加载完成，可以执行额外逻辑
  }, []);

  // 处理 iframe 加载错误
  const handleIframeError = useCallback((errorMessage: string) => {
    console.error('[InsightAI Browser] iframe error:', errorMessage);
  }, []);

  // 处理 URL 变化（同源页面导航）
  const handleUrlChange = useCallback((newUrl: string) => {
    if (newUrl !== browser.currentUrl) {
      // 更新历史记录，但不触发新的导航
      console.log('[InsightAI Browser] URL changed:', newUrl);
    }
  }, [browser.currentUrl]);

  // 处理刷新
  const handleRefresh = useCallback(() => {
    browser.refresh();
  }, [browser]);

  // 处理下载
  const handleDownload = useCallback(async () => {
    try {
      await browser.downloadPage();
    } catch (error) {
      console.error('[InsightAI Browser] Download error:', error);
    }
  }, [browser]);

  // 错误重试
  const handleRetryError = useCallback(() => {
    browser.clearError();
    if (browser.currentUrl) {
      handleRefresh();
    }
  }, [browser, handleRefresh]);

  // 空状态消息组件
  const EmptyBrowserMessage = () => (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
        <Globe className="w-8 h-8 text-gray-400" />
      </div>
    </div>
  );

  // 浏览器内容组件
  const BrowserContent = () => (
    <>
      {/* 地址栏 */}
      <InsightAIAddressBar
        url={browser.currentUrl}
        isLoading={browser.isLoading}
        canGoBack={browser.canGoBack}
        canGoForward={browser.canGoForward}
        onNavigate={handleNavigate}
        onGoBack={browser.goBack}
        onGoForward={browser.goForward}
        onRefresh={handleRefresh}
        onDownload={handleDownload}
        conversationId={conversationId}
        downloadInProgress={browser.downloadInProgress}
        useContainerStyle={useContainerLayout}
      />
      
      {/* 浏览器内容区域 */}
      <div className="flex-1 overflow-hidden bg-white">
        {browser.error && !browser.isLoading ? (
          <InsightAIBrowserError 
            error={browser.error.message}
            onRetry={handleRetryError}
            url={browser.currentUrl}
          />
        ) : hasContent && browser.currentUrl ? (
          <InsightAIBrowserIframe
            src={browser.currentUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            onUrlChange={handleUrlChange}
            className="insight-ai-browser-content"
          />
        ) : (
          <EmptyBrowserMessage />
        )}
      </div>
      
      {/* 底部状态栏（可选） */}
      {browser.currentUrl && !useContainerLayout && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {browser.isLoading && (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>正在加载...</span>
                </>
              )}
              {browser.error && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">加载失败</span>
                </>
              )}
              {!browser.isLoading && !browser.error && (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>已连接</span>
                </>
              )}
            </div>
            
            <div className="text-right">
              {browser.currentUrl && (
                <span className="truncate max-w-xs">
                  {new URL(browser.currentUrl).hostname}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );

  // 根据布局模式返回不同的结构
  if (useContainerLayout) {
    return (
      <InsightAIBrowserErrorBoundary>
        <div className="h-full border border-gray-200 rounded-xl overflow-hidden flex flex-col bg-white">
          <BrowserContent />
        </div>
      </InsightAIBrowserErrorBoundary>
    );
  }

  return (
    <InsightAIBrowserErrorBoundary>
      <div className={`insight-ai-browser h-full w-full flex flex-col bg-white ${className}`}>
        <BrowserContent />
      </div>
    </InsightAIBrowserErrorBoundary>
  );
}