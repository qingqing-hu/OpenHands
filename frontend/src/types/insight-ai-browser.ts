/**
 * InsightAI Browser 相关类型定义
 * 基于 OpenHands 浏览器功能扩展
 */

export interface InsightAIBrowserState {
  currentUrl: string;
  isLoading: boolean;
  error?: string;
  history: string[];
  historyIndex: number;
  autoSwitchEnabled: boolean;
  downloadInProgress: boolean;
}

export interface BrowserNavigationRequest {
  url: string;
  auto_switch?: boolean;
}

export interface BrowserNavigationResponse {
  success: boolean;
  url: string;
  message?: string;
  error?: string;
  auto_switch?: boolean;
}

export interface BrowserPreviewRequest {
  file_path: string;
  auto_switch?: boolean;
}

export interface BrowserPreviewResponse {
  success: boolean;
  preview_url: string;
  file_path: string;
  message?: string;
  error?: string;
  auto_switch?: boolean;
}

export interface BrowserValidationRequest {
  url: string;
}

export interface BrowserValidationResponse {
  valid: boolean;
  url: string;
  error?: string;
  conversation_id: string;
}

export interface BrowserAutoSwitchResponse {
  success: boolean;
  action: string;
  message?: string;
  error?: string;
}

export interface BrowserErrorInfo {
  type: 'network' | 'cors' | 'security' | 'validation' | 'unknown';
  message: string;
  code?: string;
  details?: any;
}

export interface InsightAIBrowserConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  autoSwitchEnabled: boolean;
  urlValidationEnabled: boolean;
}

export interface BrowserHistoryItem {
  url: string;
  title?: string;
  timestamp: Date;
  success: boolean;
}

export interface InsightAIBrowserHookResult {
  // 状态
  currentUrl: string;
  isLoading: boolean;
  error: BrowserErrorInfo | null;
  canGoBack: boolean;
  canGoForward: boolean;
  downloadInProgress: boolean;
  
  // 操作方法
  navigate: (url: string) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  refresh: () => void;
  downloadPage: () => Promise<void>;
  previewFile: (filePath: string) => Promise<void>;
  validateUrl: (url: string) => Promise<boolean>;
  
  // 状态控制
  clearError: () => void;
  setAutoSwitch: (enabled: boolean) => void;
}

export interface UseInsightAIBrowserOptions {
  conversationId: string;
  initialUrl?: string;
  autoSwitchEnabled?: boolean;
  onNavigationSuccess?: (url: string) => void;
  onNavigationError?: (error: BrowserErrorInfo) => void;
}

// API 响应的基础类型
export interface InsightAIBrowserApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 浏览器事件类型
export type BrowserEventType = 
  | 'navigation_start'
  | 'navigation_success' 
  | 'navigation_error'
  | 'download_start'
  | 'download_success'
  | 'download_error'
  | 'preview_start'
  | 'preview_success'
  | 'preview_error';

export interface BrowserEvent {
  type: BrowserEventType;
  timestamp: Date;
  conversationId: string;
  url?: string;
  error?: BrowserErrorInfo;
  metadata?: Record<string, any>;
}