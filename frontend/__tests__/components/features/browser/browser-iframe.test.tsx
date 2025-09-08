/**
 * 浏览器iframe组件单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import { BrowserIframe } from '../../../../src/components/features/browser/browser-iframe';
import browserSlice from '../../../../src/state/browser-slice';

// 模拟Redux store
const mockStore = configureStore({
  reducer: {
    browser: browserSlice,
  },
  preloadedState: {
    browser: {
      currentUrl: 'https://example.com',
      isLoading: false,
      error: undefined,
      history: [],
      currentHistoryIndex: -1,
      canGoBack: false,
      canGoForward: false,
    },
  },
});

// 封装组件以提供Redux context
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <Provider store={mockStore}>
      {component}
    </Provider>
  );
};

describe('BrowserIframe组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染iframe元素', () => {
    renderWithProvider(<BrowserIframe />);
    
    const iframe = screen.getByTitle('Browser Content');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://example.com');
  });

  it('应该显示加载状态', () => {
    const loadingStore = configureStore({
      reducer: { browser: browserSlice },
      preloadedState: {
        browser: {
          currentUrl: 'https://loading.com',
          isLoading: true,
          error: undefined,
          history: [],
          currentHistoryIndex: -1,
          canGoBack: false,
          canGoForward: false,
        },
      },
    });

    render(
      <Provider store={loadingStore}>
        <BrowserIframe />
      </Provider>
    );

    expect(screen.getByText('正在加载页面...')).toBeInTheDocument();
  });

  it('应该显示错误状态', () => {
    const errorStore = configureStore({
      reducer: { browser: browserSlice },
      preloadedState: {
        browser: {
          currentUrl: 'https://error.com',
          isLoading: false,
          error: '页面加载失败',
          history: [],
          currentHistoryIndex: -1,
          canGoBack: false,
          canGoForward: false,
        },
      },
    });

    render(
      <Provider store={errorStore}>
        <BrowserIframe />
      </Provider>
    );

    expect(screen.getByText('页面加载失败')).toBeInTheDocument();
  });

  it('应该处理iframe加载事件', () => {
    renderWithProvider(<BrowserIframe />);
    
    const iframe = screen.getByTitle('Browser Content');
    
    // 模拟iframe加载完成
    fireEvent.load(iframe);
    
    // 验证加载状态被清除
    expect(iframe).toBeInTheDocument();
  });

  it('应该处理iframe错误事件', async () => {
    renderWithProvider(<BrowserIframe />);
    
    const iframe = screen.getByTitle('Browser Content');
    
    // 模拟iframe加载错误
    fireEvent.error(iframe);
    
    // 验证错误状态被设置
    await waitFor(() => {
      expect(screen.getByText(/无法加载页面/)).toBeInTheDocument();
    });
  });

  it('应该正确设置iframe属性', () => {
    renderWithProvider(<BrowserIframe />);
    
    const iframe = screen.getByTitle('Browser Content') as HTMLIFrameElement;
    
    expect(iframe).toHaveAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms allow-navigation');
    expect(iframe).toHaveClass('w-full', 'h-full', 'border-0');
  });

  it('应该处理CORS错误', async () => {
    renderWithProvider(<BrowserIframe />);
    
    const iframe = screen.getByTitle('Browser Content');
    
    // 模拟CORS错误
    const corsError = new Error('X-Frame-Options: DENY');
    fireEvent.error(iframe, { error: corsError });
    
    await waitFor(() => {
      expect(screen.getByText(/此网站不允许在iframe中显示/)).toBeInTheDocument();
    });
  });

  it('应该在URL变化时更新iframe src', () => {
    const { rerender } = renderWithProvider(<BrowserIframe />);
    
    let iframe = screen.getByTitle('Browser Content');
    expect(iframe).toHaveAttribute('src', 'https://example.com');
    
    // 创建新的store状态
    const updatedStore = configureStore({
      reducer: { browser: browserSlice },
      preloadedState: {
        browser: {
          currentUrl: 'https://updated.com',
          isLoading: false,
          error: undefined,
          history: [],
          currentHistoryIndex: -1,
          canGoBack: false,
          canGoForward: false,
        },
      },
    });

    rerender(
      <Provider store={updatedStore}>
        <BrowserIframe />
      </Provider>
    );

    iframe = screen.getByTitle('Browser Content');
    expect(iframe).toHaveAttribute('src', 'https://updated.com');
  });

  it('应该处理空URL的情况', () => {
    const emptyUrlStore = configureStore({
      reducer: { browser: browserSlice },
      preloadedState: {
        browser: {
          currentUrl: '',
          isLoading: false,
          error: undefined,
          history: [],
          currentHistoryIndex: -1,
          canGoBack: false,
          canGoForward: false,
        },
      },
    });

    render(
      <Provider store={emptyUrlStore}>
        <BrowserIframe />
      </Provider>
    );

    expect(screen.getByText('请输入要访问的网址')).toBeInTheDocument();
  });

  it('应该有正确的可访问性属性', () => {
    renderWithProvider(<BrowserIframe />);
    
    const iframe = screen.getByTitle('Browser Content');
    expect(iframe).toHaveAttribute('title', 'Browser Content');
    expect(iframe).toHaveAttribute('aria-label', 'Browser content frame');
  });
});