/**
 * InsightAI Browser Hooks
 * 管理浏览器状态和操作的自定义 Hook
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InsightAIBrowserService } from '#/api/insight-ai-browser-service';
import {
  InsightAIBrowserState,
  BrowserErrorInfo,
  InsightAIBrowserHookResult,
  UseInsightAIBrowserOptions,
  BrowserHistoryItem,
  BrowserEvent,
  BrowserEventType,
} from '#/types/insight-ai-browser';

/**
 * 主浏览器 Hook
 */
export function useInsightAIBrowser(
  options: UseInsightAIBrowserOptions
): InsightAIBrowserHookResult {
  const { 
    conversationId, 
    initialUrl = '', 
    autoSwitchEnabled = true,
    onNavigationSuccess,
    onNavigationError 
  } = options;

  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 本地状态管理
  const [state, setState] = useState<InsightAIBrowserState>({
    currentUrl: initialUrl,
    isLoading: false,
    error: undefined,
    history: initialUrl ? [initialUrl] : [],
    historyIndex: initialUrl ? 0 : -1,
    autoSwitchEnabled,
    downloadInProgress: false,
  });

  const [error, setError] = useState<BrowserErrorInfo | null>(null);

  // 导航历史管理
  const addToHistory = useCallback((url: string) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(url);
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        currentUrl: url,
      };
    });
  }, []);

  // URL 导航
  const navigationMutation = useMutation({
    mutationFn: async (url: string) => {
      // 前端安全检查
      const safetyCheck = InsightAIBrowserService.validateUrlSafety(url);
      if (!safetyCheck.valid) {
        throw new Error(safetyCheck.error);
      }

      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      setError(null);

      const response = await InsightAIBrowserService.navigateToUrl(conversationId, {
        url,
        auto_switch: autoSwitchEnabled,
      });

      if (!response.success) {
        throw new Error(response.error || 'Navigation failed');
      }

      return response;
    },
    onSuccess: (response, url) => {
      setState(prev => ({ ...prev, isLoading: false }));
      addToHistory(url);
      onNavigationSuccess?.(url);
      
      // 触发浏览器事件
      emitBrowserEvent('navigation_success', { url });

      // 刷新相关查询
      queryClient.invalidateQueries({
        queryKey: ['insight-ai-browser', conversationId],
      });
    },
    onError: (error: Error, url) => {
      const browserError: BrowserErrorInfo = {
        type: 'navigation',
        message: error.message,
        details: { url },
      };
      
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      setError(browserError);
      onNavigationError?.(browserError);
      
      // 触发浏览器事件
      emitBrowserEvent('navigation_error', { url, error: browserError });
    },
  });

  // 文件预览
  const previewMutation = useMutation({
    mutationFn: async (filePath: string) => {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      setError(null);

      const response = await InsightAIBrowserService.previewLocalFile(conversationId, {
        file_path: filePath,
        auto_switch: autoSwitchEnabled,
      });

      if (!response.success) {
        throw new Error(response.error || 'File preview failed');
      }

      return response;
    },
    onSuccess: (response) => {
      setState(prev => ({ ...prev, isLoading: false }));
      addToHistory(response.preview_url);
      
      // 触发浏览器事件
      emitBrowserEvent('preview_success', { url: response.preview_url });
    },
    onError: (error: Error, filePath) => {
      const browserError: BrowserErrorInfo = {
        type: 'preview',
        message: error.message,
        details: { filePath },
      };
      
      setState(prev => ({ ...prev, isLoading: false, error: error.message }));
      setError(browserError);
      
      // 触发浏览器事件
      emitBrowserEvent('preview_error', { error: browserError });
    },
  });

  // 页面下载
  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!state.currentUrl) {
        throw new Error('No URL to download');
      }

      setState(prev => ({ ...prev, downloadInProgress: true }));
      
      // 尝试从 iframe 获取内容（同源策略限制）
      try {
        const iframe = iframeRef.current;
        if (iframe && iframe.contentDocument) {
          const htmlContent = iframe.contentDocument.documentElement.outerHTML;
          return { content: htmlContent, fromIframe: true };
        } else {
          // 回退到 API 调用
          const response = await InsightAIBrowserService.downloadPageHtml(
            conversationId, 
            state.currentUrl
          );
          return { content: response.data?.content || '', fromIframe: false };
        }
      } catch (error) {
        throw new Error('由于 CORS 限制无法下载此页面内容');
      }
    },
    onSuccess: (result) => {
      setState(prev => ({ ...prev, downloadInProgress: false }));
      
      // 下载文件
      downloadHtmlContent(result.content, state.currentUrl);
      
      // 触发浏览器事件
      emitBrowserEvent('download_success', { url: state.currentUrl });
    },
    onError: (error: Error) => {
      const browserError: BrowserErrorInfo = {
        type: 'download',
        message: error.message,
        details: { url: state.currentUrl },
      };
      
      setState(prev => ({ ...prev, downloadInProgress: false }));
      setError(browserError);
      
      // 触发浏览器事件
      emitBrowserEvent('download_error', { error: browserError });
    },
  });

  // 辅助函数：下载 HTML 内容
  const downloadHtmlContent = useCallback((content: string, url: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const domain = InsightAIBrowserService.getDomain(url) || 'page';
    const filename = `${domain}_${timestamp}.html`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadUrl);
  }, []);

  // 历史导航
  const goBack = useCallback(() => {
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      const url = state.history[newIndex];
      setState(prev => ({
        ...prev,
        historyIndex: newIndex,
        currentUrl: url,
        error: undefined,
      }));
      setError(null);
    }
  }, [state.historyIndex, state.history]);

  const goForward = useCallback(() => {
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      const url = state.history[newIndex];
      setState(prev => ({
        ...prev,
        historyIndex: newIndex,
        currentUrl: url,
        error: undefined,
      }));
      setError(null);
    }
  }, [state.historyIndex, state.history]);

  // 刷新页面
  const refresh = useCallback(() => {
    if (state.currentUrl) {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));
      setError(null);
      
      // 重新加载 iframe
      const iframe = iframeRef.current;
      if (iframe) {
        iframe.src = iframe.src;
      }
      
      setTimeout(() => {
        setState(prev => ({ ...prev, isLoading: false }));
      }, 1000);
    }
  }, [state.currentUrl]);

  // 清除错误
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
    setError(null);
  }, []);

  // 设置自动切换
  const setAutoSwitch = useCallback((enabled: boolean) => {
    setState(prev => ({ ...prev, autoSwitchEnabled: enabled }));
  }, []);

  // 事件发射器
  const emitBrowserEvent = useCallback((
    type: BrowserEventType, 
    metadata: Record<string, any> = {}
  ) => {
    const event: BrowserEvent = {
      type,
      timestamp: new Date(),
      conversationId,
      ...metadata,
    };
    
    // 可以在这里添加事件监听逻辑
    console.debug('[InsightAI Browser Event]', event);
  }, [conversationId]);

  // 返回 Hook 结果
  return {
    // 状态
    currentUrl: state.currentUrl,
    isLoading: state.isLoading || navigationMutation.isPending || previewMutation.isPending,
    error,
    canGoBack: state.historyIndex > 0,
    canGoForward: state.historyIndex < state.history.length - 1,
    downloadInProgress: state.downloadInProgress || downloadMutation.isPending,
    
    // 操作方法
    navigate: navigationMutation.mutateAsync,
    goBack,
    goForward,
    refresh,
    downloadPage: downloadMutation.mutateAsync,
    previewFile: previewMutation.mutateAsync,
    validateUrl: async (url: string) => {
      try {
        const response = await InsightAIBrowserService.validateUrl(conversationId, { url });
        return response.valid;
      } catch {
        return false;
      }
    },
    
    // 状态控制
    clearError,
    setAutoSwitch,
  };
}

/**
 * URL 验证 Hook
 */
export function useInsightAIUrlValidation(conversationId: string) {
  const [validationCache, setValidationCache] = useState<Map<string, boolean>>(new Map());
  
  const validateUrl = useCallback(async (url: string): Promise<boolean> => {
    // 检查缓存
    if (validationCache.has(url)) {
      return validationCache.get(url)!;
    }

    // 前端预检查
    const safetyCheck = InsightAIBrowserService.validateUrlSafety(url);
    if (!safetyCheck.valid) {
      setValidationCache(prev => new Map(prev).set(url, false));
      return false;
    }

    try {
      const response = await InsightAIBrowserService.validateUrl(conversationId, { url });
      const isValid = response.valid;
      
      // 更新缓存
      setValidationCache(prev => new Map(prev).set(url, isValid));
      
      return isValid;
    } catch {
      setValidationCache(prev => new Map(prev).set(url, false));
      return false;
    }
  }, [conversationId, validationCache]);

  const clearValidationCache = useCallback(() => {
    setValidationCache(new Map());
  }, []);

  return {
    validateUrl,
    clearValidationCache,
    validationCache: Object.fromEntries(validationCache),
  };
}

/**
 * 浏览器历史 Hook
 */
export function useInsightAIBrowserHistory(conversationId: string) {
  const [history, setHistory] = useState<BrowserHistoryItem[]>([]);

  const addHistoryItem = useCallback((item: Omit<BrowserHistoryItem, 'timestamp'>) => {
    const historyItem: BrowserHistoryItem = {
      ...item,
      timestamp: new Date(),
    };
    
    setHistory(prev => [historyItem, ...prev.slice(0, 99)]); // 保留最近 100 条记录
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const getRecentUrls = useCallback((limit: number = 10) => {
    return history
      .filter(item => item.success)
      .slice(0, limit)
      .map(item => item.url);
  }, [history]);

  return {
    history,
    addHistoryItem,
    clearHistory,
    getRecentUrls,
  };
}

/**
 * 自动切换 Hook
 */
export function useInsightAIAutoSwitch(conversationId: string) {
  const triggerAutoSwitch = useCallback(async () => {
    try {
      const response = await InsightAIBrowserService.triggerAutoSwitch(conversationId);
      return response.success;
    } catch (error) {
      console.error('[InsightAI Browser] Auto switch failed:', error);
      return false;
    }
  }, [conversationId]);

  return {
    triggerAutoSwitch,
  };
}