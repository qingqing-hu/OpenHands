/**
 * InsightAI Browser Components Export
 * 统一导出浏览器相关组件
 */

export { InsightAIBrowserPanel } from './insight-ai-browser-panel';
export { InsightAIAddressBar } from './insight-ai-address-bar';
export { InsightAIBrowserIframe } from './insight-ai-browser-iframe';
export { InsightAIBrowserError } from './insight-ai-browser-error';
export { InsightAIBrowserErrorBoundary } from './insight-ai-browser-error-boundary';

// 重新导出相关类型
export type {
  InsightAIBrowserState,
  BrowserErrorInfo,
  InsightAIBrowserHookResult,
  UseInsightAIBrowserOptions,
} from '#/types/insight-ai-browser';

// 重新导出 Hooks
export {
  useInsightAIBrowser,
  useInsightAIUrlValidation,
  useInsightAIBrowserHistory,
  useInsightAIAutoSwitch,
} from '#/hooks/insight-ai/use-insight-ai-browser';

// 重新导出 API 服务
export { InsightAIBrowserService } from '#/api/insight-ai-browser-service';