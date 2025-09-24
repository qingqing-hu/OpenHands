# InsightAI Browser 功能

这个模块为 InsightAI 前端提供了完整的浏览器功能集成，对接 OpenHands 后端 API。

## 功能特性

- 🌐 **完整的浏览器功能**: 地址栏、导航、刷新、下载
- 🔒 **安全性**: URL 验证、CORS 处理、危险协议拦截
- 🎨 **样式一致性**: 完全继承 InsightAI 设计语言
- ⚡ **性能优化**: 懒加载、防抖、缓存、错误边界
- 📱 **响应式设计**: 支持各种屏幕尺寸
- ♿ **可访问性**: 支持键盘导航、屏幕阅读器

## 组件架构

```
browser/
├── index.ts                           # 统一导出
├── insight-ai-browser-panel.tsx       # 主浏览器面板
├── insight-ai-address-bar.tsx         # 地址栏组件
├── insight-ai-browser-iframe.tsx      # iframe 容器
├── insight-ai-browser-error.tsx       # 错误显示
├── insight-ai-browser-error-boundary.tsx # 错误边界
└── README.md                          # 文档
```

## 使用方法

### 基础使用

```tsx
import { InsightAIBrowserPanel } from '#/components/insight-ai/browser';

function MyComponent() {
  return (
    <InsightAIBrowserPanel
      conversationId="your-conversation-id"
      autoSwitchEnabled={true}
      initialUrl="https://example.com"
    />
  );
}
```

### 使用 Hook

```tsx
import { useInsightAIBrowser } from '#/components/insight-ai/browser';

function CustomBrowser() {
  const browser = useInsightAIBrowser({
    conversationId: 'your-conversation-id',
    onNavigationSuccess: (url) => console.log('Navigated to:', url),
    onNavigationError: (error) => console.error('Navigation failed:', error),
  });

  return (
    <div>
      <input
        value={browser.currentUrl}
        onChange={(e) => browser.navigate(e.target.value)}
      />
      <button onClick={browser.goBack} disabled={!browser.canGoBack}>
        后退
      </button>
      <button onClick={browser.goForward} disabled={!browser.canGoForward}>
        前进
      </button>
    </div>
  );
}
```

## API 参考

### InsightAIBrowserPanel Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| conversationId | string | - | 必需，会话 ID |
| className | string | '' | 额外的 CSS 类名 |
| initialUrl | string | '' | 初始 URL |
| autoSwitchEnabled | boolean | true | 是否启用自动切换 |

### useInsightAIBrowser Hook

#### 参数

```typescript
interface UseInsightAIBrowserOptions {
  conversationId: string;
  initialUrl?: string;
  autoSwitchEnabled?: boolean;
  onNavigationSuccess?: (url: string) => void;
  onNavigationError?: (error: BrowserErrorInfo) => void;
}
```

#### 返回值

```typescript
interface InsightAIBrowserHookResult {
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
```

## 样式自定义

浏览器组件使用 CSS 变量，可以轻松自定义主题：

```css
.insight-ai-browser {
  --browser-primary: #2563eb;
  --browser-bg-primary: #ffffff;
  --browser-text-primary: #1e293b;
  /* ... 更多变量 */
}
```

## 安全性

- **URL 验证**: 前端和后端双重验证
- **协议限制**: 只允许 HTTP/HTTPS
- **CORS 处理**: 优雅处理跨域限制
- **内容安全**: 使用 sandbox 属性限制 iframe

## 性能优化

- **懒加载**: 组件按需加载
- **防抖**: 输入验证防抖
- **缓存**: URL 验证结果缓存
- **错误边界**: 防止崩溃传播
- **内存管理**: 及时清理资源

## 错误处理

组件提供多层错误处理：

1. **API 错误**: 网络请求失败
2. **验证错误**: URL 格式或安全检查失败
3. **CORS 错误**: 跨域限制
4. **组件错误**: 使用错误边界捕获

## 浏览器支持

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 开发指南

### 本地开发

1. 确保后端 API 运行在正确端口
2. 检查 CORS 配置
3. 使用开发模式查看详细错误信息

### 调试

- 开启浏览器开发者工具
- 查看 Console 中的 `[InsightAI Browser]` 日志
- 使用 React DevTools 检查组件状态

### 贡献

请遵循以下原则：

1. 保持与 InsightAI 设计语言一致
2. 添加适当的错误处理
3. 编写单元测试
4. 更新文档

## 故障排除

### 常见问题

**Q: 页面无法加载**
A: 检查 URL 格式、网络连接和 CORS 设置

**Q: 验证失败**
A: 确认 URL 使用 HTTP/HTTPS 协议

**Q: 下载失败**
A: 由于 CORS 限制，某些页面无法下载

**Q: 样式不一致**
A: 确保导入了 `insight-ai-browser.css`

### 日志

所有操作都会记录到控制台，前缀为 `[InsightAI Browser]`：

```
[InsightAI Browser] Navigation successful: https://example.com
[InsightAI Browser] URL validation failed: Invalid protocol
[InsightAI Browser] Download error: CORS restriction
```