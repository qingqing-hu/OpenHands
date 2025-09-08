/**
 * 真实浏览器选项卡主组件集成测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { RealBrowserTab } from '../../../../src/components/features/browser/real-browser-tab';
import browserSlice from '../../../../src/state/browser-slice';
import tabSlice from '../../../../src/state/tab-slice';

// 模拟API调用
global.fetch = vi.fn();

// 模拟WebSocket
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  default: () => mockSocket,
}));

// 模拟浏览器API
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// 模拟document方法
const mockClick = vi.fn();
document.createElement = vi.fn().mockImplementation((tagName) => {
  if (tagName === 'a') {
    return {
      click: mockClick,
      setAttribute: vi.fn(),
      style: {},
    };
  }
  return document.createElement(tagName);
});

const createMockStore = (initialState = {}) => configureStore({
  reducer: {
    browser: browserSlice,
    tab: tabSlice,
  },
  preloadedState: {
    browser: {
      currentUrl: '',
      isLoading: false,
      error: undefined,
      history: [],
      currentHistoryIndex: -1,
      canGoBack: false,
      canGoForward: false,
      ...initialState.browser,
    },
    tab: {
      activeTab: 'browser',
      availableTabs: ['chat', 'browser', 'code'],
      autoSwitchTriggered: false,
      ...initialState.tab,
    },
  },
});

const renderWithProvider = (component: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('RealBrowserTab主组件集成测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockClear();
  });

  it('应该正确渲染浏览器选项卡', () => {
    renderWithProvider(<RealBrowserTab />);
    
    expect(screen.getByRole('textbox', { name: /网址/ })).toBeInTheDocument();
    expect(screen.getByText('请输入要访问的网址')).toBeInTheDocument();
  });

  it('应该处理完整的导航流程', async () => {
    const user = userEvent.setup();
    
    // 模拟成功的API响应
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        url: 'https://github.com',
        message: 'Navigation successful',
      }),
    });

    renderWithProvider(<RealBrowserTab />);
    
    const urlInput = screen.getByRole('textbox', { name: /网址/ });
    
    // 输入URL并导航
    await user.type(urlInput, 'https://github.com');
    await user.keyboard('{Enter}');
    
    // 等待导航完成
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/browser/'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://github.com',
            auto_switch: true,
          }),
        })
      );
    });
  });

  it('应该处理导航API错误', async () => {
    const user = userEvent.setup();
    
    // 模拟API错误响应
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Invalid URL',
    });

    renderWithProvider(<RealBrowserTab />);
    
    const urlInput = screen.getByRole('textbox', { name: /网址/ });
    
    await user.type(urlInput, 'invalid-url');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText(/导航失败/)).toBeInTheDocument();
    });
  });

  it('应该处理网络错误', async () => {
    const user = userEvent.setup();
    
    // 模拟网络错误
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider(<RealBrowserTab />);
    
    const urlInput = screen.getByRole('textbox', { name: /网址/ });
    
    await user.type(urlInput, 'https://example.com');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText(/网络连接错误/)).toBeInTheDocument();
    });
  });

  it('应该响应WebSocket自动切换消息', async () => {
    const store = createMockStore({
      tab: {
        activeTab: 'chat',
        availableTabs: ['chat', 'browser', 'code'],
        autoSwitchTriggered: false,
      },
    });

    renderWithProvider(<RealBrowserTab />, store);
    
    // 模拟接收WebSocket消息
    const switchMessage = {
      conversation_id: 'test-conversation',
      action: 'switch_to_browser_tab',
      timestamp: Date.now(),
    };
    
    // 找到注册的事件处理器并调用
    const onHandler = mockSocket.on.mock.calls.find(call => 
      call[0] === 'browser_tab_switch'
    )?.[1];
    
    if (onHandler) {
      onHandler(switchMessage);
    }
    
    await waitFor(() => {
      // 验证选项卡切换被触发
      expect(mockSocket.on).toHaveBeenCalledWith(
        'browser_tab_switch',
        expect.any(Function)
      );
    });
  });

  it('应该处理iframe和地址栏的同步', async () => {
    const store = createMockStore({
      browser: {
        currentUrl: 'https://example.com',
        isLoading: false,
        error: undefined,
        history: ['https://example.com'],
        currentHistoryIndex: 0,
        canGoBack: false,
        canGoForward: false,
      },
    });

    renderWithProvider(<RealBrowserTab />, store);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    const iframe = screen.getByTitle('Browser Content');
    
    expect(urlInput).toHaveValue('https://example.com');
    expect(iframe).toHaveAttribute('src', 'https://example.com');
  });

  it('应该处理下载功能集成', async () => {
    const user = userEvent.setup();
    
    // 模拟iframe内容
    const mockIframe = {
      contentDocument: {
        documentElement: {
          outerHTML: '<html><head><title>Test Page</title></head><body>Content</body></html>',
        },
      },
    };
    
    vi.spyOn(document, 'querySelector').mockReturnValue(mockIframe as any);
    
    const store = createMockStore({
      browser: {
        currentUrl: 'https://example.com',
        isLoading: false,
        error: undefined,
        history: ['https://example.com'],
        currentHistoryIndex: 0,
        canGoBack: false,
        canGoForward: false,
      },
    });

    renderWithProvider(<RealBrowserTab />, store);
    
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('应该处理历史记录导航', async () => {
    const user = userEvent.setup();
    
    const store = createMockStore({
      browser: {
        currentUrl: 'https://github.com',
        isLoading: false,
        error: undefined,
        history: ['https://example.com', 'https://github.com'],
        currentHistoryIndex: 1,
        canGoBack: true,
        canGoForward: false,
      },
    });

    renderWithProvider(<RealBrowserTab />, store);
    
    const backButton = screen.getByRole('button', { name: /后退/ });
    expect(backButton).not.toBeDisabled();
    
    await user.click(backButton);
    
    // 验证后退操作
    expect(backButton).toBeInTheDocument();
  });

  it('应该在组件卸载时清理WebSocket连接', () => {
    const { unmount } = renderWithProvider(<RealBrowserTab />);
    
    unmount();
    
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('应该处理多种URL格式', async () => {
    const user = userEvent.setup();
    
    const testCases = [
      { input: 'example.com', expected: 'https://example.com' },
      { input: 'localhost:3000', expected: 'http://localhost:3000' },
      { input: 'https://secure.com', expected: 'https://secure.com' },
      { input: '127.0.0.1:8080', expected: 'http://127.0.0.1:8080' },
    ];

    for (const testCase of testCases) {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          url: testCase.expected,
          message: 'Navigation successful',
        }),
      });

      renderWithProvider(<RealBrowserTab />);
      
      const urlInput = screen.getByRole('textbox', { name: /网址/ });
      
      await user.clear(urlInput);
      await user.type(urlInput, testCase.input);
      await user.keyboard('{Enter}');
      
      expect(urlInput).toHaveValue(testCase.expected);
    }
  });

  it('应该显示适当的加载和错误状态', () => {
    const loadingStore = createMockStore({
      browser: {
        currentUrl: 'https://loading.com',
        isLoading: true,
        error: undefined,
      },
    });

    const { rerender } = renderWithProvider(<RealBrowserTab />, loadingStore);
    
    expect(screen.getByText('正在加载页面...')).toBeInTheDocument();
    
    // 切换到错误状态
    const errorStore = createMockStore({
      browser: {
        currentUrl: 'https://error.com',
        isLoading: false,
        error: '页面加载失败',
      },
    });

    rerender(
      <Provider store={errorStore}>
        <RealBrowserTab />
      </Provider>
    );
    
    expect(screen.getByText('页面加载失败')).toBeInTheDocument();
  });

  it('应该处理iframe安全错误', async () => {
    const store = createMockStore({
      browser: {
        currentUrl: 'https://security-restricted.com',
        isLoading: false,
        error: undefined,
      },
    });

    renderWithProvider(<RealBrowserTab />, store);
    
    const iframe = screen.getByTitle('Browser Content');
    
    // 模拟X-Frame-Options错误
    const securityError = new Error('X-Frame-Options: DENY');
    fireEvent.error(iframe, { error: securityError });
    
    await waitFor(() => {
      expect(screen.getByText(/此网站不允许在iframe中显示/)).toBeInTheDocument();
    });
  });
});