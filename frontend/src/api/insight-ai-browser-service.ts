/**
 * InsightAI Browser API 服务
 * 对接 OpenHands 浏览器后端 API
 */

import { openHands } from "./open-hands-axios";
import {
  BrowserNavigationRequest,
  BrowserNavigationResponse,
  BrowserPreviewRequest,
  BrowserPreviewResponse,
  BrowserValidationRequest,
  BrowserValidationResponse,
  BrowserAutoSwitchResponse,
  InsightAIBrowserApiResponse,
  BrowserErrorInfo,
} from "#/types/insight-ai-browser";

export class InsightAIBrowserService {
  private static readonly API_PREFIX = "/api/browser";
  private static readonly DEFAULT_TIMEOUT = 30000; // 30秒超时
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY = 1000; // 1秒重试延迟

  /**
   * 导航到指定 URL
   */
  static async navigateToUrl(
    conversationId: string,
    request: BrowserNavigationRequest
  ): Promise<BrowserNavigationResponse> {
    try {
      const { data } = await openHands.post<BrowserNavigationResponse>(
        `${this.API_PREFIX}/${conversationId}/navigate`,
        {
          url: request.url,
          auto_switch: request.auto_switch ?? true,
        },
        {
          timeout: this.DEFAULT_TIMEOUT,
        }
      );
      return data;
    } catch (error) {
      console.error('[InsightAI Browser] Navigation failed:', error);
      throw this.handleApiError(error, 'navigation');
    }
  }

  /**
   * 预览本地文件
   */
  static async previewLocalFile(
    conversationId: string,
    request: BrowserPreviewRequest
  ): Promise<BrowserPreviewResponse> {
    try {
      const { data } = await openHands.post<BrowserPreviewResponse>(
        `${this.API_PREFIX}/${conversationId}/preview-file`,
        {
          file_path: request.file_path,
          auto_switch: request.auto_switch ?? true,
        },
        {
          timeout: this.DEFAULT_TIMEOUT,
        }
      );
      return data;
    } catch (error) {
      console.error('[InsightAI Browser] File preview failed:', error);
      throw this.handleApiError(error, 'preview');
    }
  }

  /**
   * 验证 URL 格式和安全性
   */
  static async validateUrl(
    conversationId: string,
    request: BrowserValidationRequest
  ): Promise<BrowserValidationResponse> {
    try {
      const { data } = await openHands.get<BrowserValidationResponse>(
        `${this.API_PREFIX}/${conversationId}/validate-url`,
        {
          params: { url: request.url },
          timeout: 5000, // URL 验证用较短超时
        }
      );
      return data;
    } catch (error) {
      console.error('[InsightAI Browser] URL validation failed:', error);
      throw this.handleApiError(error, 'validation');
    }
  }

  /**
   * 触发自动切换到浏览器标签
   */
  static async triggerAutoSwitch(
    conversationId: string
  ): Promise<BrowserAutoSwitchResponse> {
    try {
      const { data } = await openHands.post<BrowserAutoSwitchResponse>(
        `${this.API_PREFIX}/${conversationId}/auto-switch`,
        {},
        {
          timeout: 5000,
        }
      );
      return data;
    } catch (error) {
      console.error('[InsightAI Browser] Auto switch failed:', error);
      throw this.handleApiError(error, 'auto_switch');
    }
  }

  /**
   * 下载页面 HTML 内容
   * 注意：由于 CORS 限制，实际实现可能需要在前端处理
   */
  static async downloadPageHtml(
    conversationId: string,
    url: string
  ): Promise<InsightAIBrowserApiResponse<{ content: string; filename: string }>> {
    try {
      const { data } = await openHands.get(
        `${this.API_PREFIX}/${conversationId}/download`,
        {
          params: { url },
          timeout: this.DEFAULT_TIMEOUT,
        }
      );
      return data;
    } catch (error) {
      console.error('[InsightAI Browser] HTML download failed:', error);
      throw this.handleApiError(error, 'download');
    }
  }

  /**
   * 带重试机制的请求包装器
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = this.MAX_RETRY_ATTEMPTS
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // 最后一次尝试失败时抛出错误
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // 等待后重试
        await this.delay(this.RETRY_DELAY * attempt);
        console.warn(`[InsightAI Browser] Retry attempt ${attempt}/${maxAttempts}:`, error);
      }
    }
    
    throw lastError!;
  }

  /**
   * URL 安全性检查（前端预检查）
   */
  static validateUrlSafety(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
      return { valid: false, error: "URL 不能为空" };
    }

    const trimmedUrl = url.trim();

    // 基础格式检查
    try {
      const parsed = new URL(trimmedUrl);
      
      // 协议检查
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: "只允许 HTTP 和 HTTPS 协议" };
      }

      // 危险协议检查
      const dangerousPatterns = [
        /^javascript:/i,
        /^data:/i,
        /^file:/i,
        /^vbscript:/i,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(trimmedUrl)) {
          return { valid: false, error: "检测到不安全的 URL 协议" };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: "URL 格式无效" };
    }
  }

  /**
   * 防抖 URL 验证
   */
  static debounceValidation = (() => {
    let timeoutId: NodeJS.Timeout;
    
    return (
      url: string,
      conversationId: string,
      callback: (result: BrowserValidationResponse) => void,
      delay: number = 500
    ) => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await this.validateUrl(conversationId, { url });
          callback(result);
        } catch (error) {
          callback({
            valid: false,
            url,
            error: error instanceof Error ? error.message : '验证失败',
            conversation_id: conversationId,
          });
        }
      }, delay);
    };
  })();

  /**
   * 错误处理器
   */
  private static handleApiError(error: any, context: string): BrowserErrorInfo {
    console.error(`[InsightAI Browser] ${context} error:`, error);

    // 网络错误
    if (!error.response) {
      return {
        type: 'network',
        message: '网络连接失败，请检查网络连接',
        details: error.message,
      };
    }

    // HTTP 错误响应
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return {
          type: 'validation',
          message: data?.error || '请求参数无效',
          code: 'BAD_REQUEST',
          details: data,
        };
        
      case 403:
        return {
          type: 'security',
          message: data?.error || '访问被拒绝，可能是安全限制',
          code: 'FORBIDDEN',
          details: data,
        };
        
      case 404:
        return {
          type: 'validation',
          message: data?.error || '请求的资源不存在',
          code: 'NOT_FOUND',
          details: data,
        };
        
      case 500:
        return {
          type: 'unknown',
          message: '服务器内部错误，请稍后重试',
          code: 'INTERNAL_SERVER_ERROR',
          details: data,
        };
        
      default:
        return {
          type: 'unknown',
          message: data?.error || `HTTP ${status} 错误`,
          code: `HTTP_${status}`,
          details: data,
        };
    }
  }

  /**
   * 延迟工具函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 取消正在进行的请求
   */
  static createCancelToken() {
    return new AbortController();
  }

  /**
   * 检查 URL 是否为本地文件预览 URL
   */
  static isLocalPreviewUrl(url: string): boolean {
    return url.includes('/api/files/preview/') || 
           url.startsWith('data:') || 
           url.startsWith('blob:');
  }

  /**
   * 格式化文件大小
   */
  static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * 获取 URL 的域名
   */
  static getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  /**
   * 检查是否为同源 URL
   */
  static isSameOrigin(url: string): boolean {
    try {
      const targetUrl = new URL(url);
      const currentUrl = new URL(window.location.href);
      
      return targetUrl.origin === currentUrl.origin;
    } catch {
      return false;
    }
  }
}