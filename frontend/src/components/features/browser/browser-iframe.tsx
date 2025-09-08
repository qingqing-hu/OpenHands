import { useEffect, useRef, useState } from "react";
import { BrowserErrorDisplay } from "./browser-error-display";

interface BrowserIframeProps {
  src: string;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onUrlChange?: (url: string) => void;
}

export function BrowserIframe({ 
  src, 
  onLoad, 
  onError, 
  onUrlChange 
}: BrowserIframeProps) {
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
      setError(null); // Clear any previous errors on successful load
      onLoad?.();
      
      // Try to detect URL changes within iframe (same origin only)
      try {
        const iframeUrl = iframe.contentWindow?.location.href;
        if (iframeUrl && iframeUrl !== src) {
          onUrlChange?.(iframeUrl);
        }
      } catch (error) {
        // Cross-origin restriction, expected for external sites
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

    // Set loading state and clear error when src changes
    setIsLoading(true);
    setError(null);
    setHasLoadedSuccessfully(false);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [src, onLoad, onError, onUrlChange]);

  // Handle iframe security errors (X-Frame-Options, CSP) - Only for external URLs
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Skip security check for local/Agent generated files
    const isLocalFile = src.includes('/api/files/preview/') || src.startsWith('data:') || src.startsWith('blob:');
    if (isLocalFile) {
      return;
    }

    const checkForSecurityErrors = () => {
      // Don't check if page has already loaded successfully or is in error state
      if (hasLoadedSuccessfully || error) return;

      try {
        // This will throw if iframe is blocked by X-Frame-Options
        const testAccess = iframe.contentDocument?.body;
        if (testAccess) {
          // Page is accessible, no security issue
          return;
        }
      } catch (securityError) {
        const errorMessage = securityError instanceof Error ? securityError.message : String(securityError);
        
        // Only set error if this is clearly a security restriction
        // And only if the iframe hasn't loaded successfully via normal load event
        if (!hasLoadedSuccessfully && 
            (errorMessage.includes('cross-origin') || 
             errorMessage.includes('X-Frame-Options') || 
             errorMessage.includes('frame') ||
             errorMessage.includes('Permission denied'))) {
          const displayError = '此网站不允许在iframe中显示。这是该网站的安全设置。';
          setError(displayError);
          onError?.(displayError);
        }
      }
    };

    // Only run security check once after initial load delay
    // Don't run repeatedly to avoid false positives causing loading state
    const timeoutId = setTimeout(() => {
      // Only check if we're still in loading state and haven't loaded successfully
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

  const handleReportIssue = () => {
    // TODO: Implement issue reporting
    console.log('Report issue for URL:', src);
  };

  if (error) {
    return (
      <div className="w-full h-full">
        <BrowserErrorDisplay 
          error={error} 
          onRetry={handleRetry}
          onReportIssue={handleReportIssue}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800 bg-opacity-75 z-10">
          <div className="flex items-center space-x-2 text-neutral-400">
            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            <span>Loading...</span>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={src}
        className="w-full h-full border-0 rounded-xl"
        style={{ 
          minHeight: '400px',
          backgroundColor: '#ffffff'
        }}
        sandbox="allow-same-origin allow-scripts allow-forms allow-navigation"
        loading="lazy"
        title="Browser Content"
      />
    </div>
  );
}