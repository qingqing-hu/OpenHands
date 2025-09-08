import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "#/store";
import { BrowserAddressBar } from "./browser-address-bar";
import { BrowserIframe } from "./browser-iframe";
import { BrowserErrorDisplay } from "./browser-error-display";
import { EmptyBrowserMessage } from "./empty-browser-message";
import {
  navigateToUrl,
  setLoading,
  setError,
  addToHistory,
  refresh,
  downloadPage,
  setDownloadComplete,
  goBack,
  goForward,
} from "#/state/browser-slice";

interface RealBrowserTabProps {
  conversationId: string;
}

export function RealBrowserTab({ conversationId }: RealBrowserTabProps) {
  const {
    currentUrl,
    isLoading,
    error,
    history,
    historyIndex,
    downloadInProgress,
  } = useSelector((state: RootState) => state.browser);
  
  const dispatch = useDispatch();
  const [hasContent, setHasContent] = useState(false);
  // Remove unused ref since we access iframe differently

  // Update hasContent when currentUrl changes
  useEffect(() => {
    setHasContent(!!currentUrl && currentUrl.trim() !== "");
  }, [currentUrl]);

  const handleNavigate = (url: string) => {
    if (url && url.trim()) {
      dispatch(setLoading(true));
      dispatch(setError(undefined));
      dispatch(navigateToUrl(url));
      setHasContent(true);
    }
  };

  const handleRefresh = () => {
    if (currentUrl) {
      dispatch(setLoading(true));
      dispatch(setError(undefined));
      dispatch(refresh());
      // Force iframe to reload by finding it in DOM
      const iframe = document.querySelector('iframe[title="Browser Content"]') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    }
  };

  const handleDownload = async () => {
    if (!currentUrl || downloadInProgress) return;
    
    dispatch(downloadPage());
    
    try {
      // Try to get HTML content from iframe (same-origin only)
      const iframe = document.querySelector('iframe[title="Browser Content"]') as HTMLIFrameElement;
      if (iframe && iframe.contentDocument) {
        const htmlContent = iframe.contentDocument.documentElement.outerHTML;
        downloadHtmlContent(htmlContent, currentUrl);
      } else {
        // Fallback: show error for cross-origin content
        dispatch(setError('由于CORS限制无法下载此页面的HTML内容。'));
      }
    } catch (error) {
      dispatch(setError('下载失败：无法访问页面内容。这可能是由于CORS限制。'));
    } finally {
      dispatch(setDownloadComplete());
    }
  };

  const downloadHtmlContent = (content: string, url: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `page_${timestamp}.html`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  };

  const handleIframeLoad = () => {
    dispatch(setLoading(false));
    dispatch(setError(undefined));
  };

  const handleIframeError = (errorMessage: string) => {
    dispatch(setLoading(false));
    dispatch(setError(errorMessage));
  };

  const handleUrlChange = (newUrl: string) => {
    // Handle iframe navigation (same-origin only)
    if (newUrl !== currentUrl) {
      dispatch(addToHistory(newUrl));
    }
  };

  // Determine navigation button states
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const handleGoBack = () => {
    if (canGoBack) {
      dispatch(goBack());
    }
  };

  const handleGoForward = () => {
    if (canGoForward) {
      dispatch(goForward());
    }
  };

  if (error && !isLoading) {
    return (
      <div className="h-full w-full flex flex-col text-neutral-400">
        <BrowserAddressBar
          url={currentUrl}
          isLoading={isLoading}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
          onNavigate={handleNavigate}
          onRefresh={handleRefresh}
          onDownload={handleDownload}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
        />
        <div className="flex-1">
          <BrowserErrorDisplay 
            error={error}
            onRetry={() => {
              dispatch(setError(undefined));
              handleRefresh();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col text-neutral-400">
      <BrowserAddressBar
        url={currentUrl}
        isLoading={isLoading}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onNavigate={handleNavigate}
        onRefresh={handleRefresh}
        onDownload={handleDownload}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
      />
      <div className="flex-1 overflow-hidden">
        {hasContent ? (
          <BrowserIframe
            src={currentUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            onUrlChange={handleUrlChange}
          />
        ) : (
          <EmptyBrowserMessage />
        )}
      </div>
    </div>
  );
}