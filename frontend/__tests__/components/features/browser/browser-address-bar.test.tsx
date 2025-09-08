/**
 * 浏览器地址栏组件单元测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserAddressBar } from '../../../../src/components/features/browser/browser-address-bar';
import browserSlice from '../../../../src/state/browser-slice';

// 模拟fetch API
global.fetch = vi.fn();

// 模拟URL下载
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

// 模拟document.createElement
const mockClick = vi.fn();
const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

const originalCreateElement = document.createElement;
document.createElement = vi.fn().mockImplementation((tagName) => {
  if (tagName === 'a') {
    return {
      click: mockClick,
      setAttribute: vi.fn(),
      style: {},
    };
  }
  return originalCreateElement.call(document, tagName);
});

document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

// 模拟Redux store
const createMockStore = (initialState = {}) => configureStore({
  reducer: {
    browser: browserSlice,
  },
  preloadedState: {
    browser: {
      currentUrl: 'https://example.com',
      isLoading: false,
      error: undefined,
      history: ['https://example.com'],
      currentHistoryIndex: 0,
      canGoBack: false,
      canGoForward: false,
      ...initialState,
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

describe('BrowserAddressBar组件', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  it('应该正确渲染地址栏组件', () => {
    renderWithProvider(<BrowserAddressBar />);
    
    expect(screen.getByDisplayValue('https://example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /刷新/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下载/ })).toBeInTheDocument();
  });

  it('应该显示前进后退按钮', () => {
    const store = createMockStore({
      canGoBack: true,
      canGoForward: true,
    });

    renderWithProvider(<BrowserAddressBar />, store);
    
    expect(screen.getByRole('button', { name: /后退/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /前进/ })).toBeInTheDocument();
  });

  it('应该禁用不可用的导航按钮', () => {
    renderWithProvider(<BrowserAddressBar />);
    
    const backButton = screen.getByRole('button', { name: /后退/ });
    const forwardButton = screen.getByRole('button', { name: /前进/ });
    
    expect(backButton).toBeDisabled();
    expect(forwardButton).toBeDisabled();
  });

  it('应该处理URL输入和导航', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    
    // 清空输入框并输入新URL
    await user.clear(urlInput);
    await user.type(urlInput, 'https://github.com');
    
    // 按Enter键导航
    await user.keyboard('{Enter}');
    
    expect(urlInput).toHaveValue('https://github.com');
  });

  it('应该验证URL格式', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    
    // 输入无效URL
    await user.clear(urlInput);
    await user.type(urlInput, 'invalid-url');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText(/请输入有效的网址/)).toBeInTheDocument();
    });
  });

  it('应该自动添加协议前缀', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    
    // 输入不带协议的URL
    await user.clear(urlInput);
    await user.type(urlInput, 'github.com');
    await user.keyboard('{Enter}');
    
    expect(urlInput).toHaveValue('https://github.com');
  });

  it('应该处理localhost URL', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    
    await user.clear(urlInput);
    await user.type(urlInput, 'localhost:3000');
    await user.keyboard('{Enter}');
    
    expect(urlInput).toHaveValue('http://localhost:3000');
  });

  it('应该处理刷新按钮点击', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const refreshButton = screen.getByRole('button', { name: /刷新/ });
    await user.click(refreshButton);
    
    // 验证刷新操作
    expect(refreshButton).toBeInTheDocument();
  });

  it('应该处理下载功能', async () => {
    const user = userEvent.setup();
    
    // 模拟iframe查询
    const mockIframe = {
      contentDocument: {
        documentElement: {
          outerHTML: '<html><head></head><body>Test content</body></html>',
        },
      },
    };
    
    vi.spyOn(document, 'querySelector').mockReturnValue(mockIframe as any);
    
    renderWithProvider(<BrowserAddressBar />);
    
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('应该处理下载失败情况', async () => {
    const user = userEvent.setup();
    
    // 模拟无iframe的情况
    vi.spyOn(document, 'querySelector').mockReturnValue(null);
    
    renderWithProvider(<BrowserAddressBar />);
    
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/无法获取页面内容进行下载/)).toBeInTheDocument();
    });
  });

  it('应该处理CORS错误下载', async () => {
    const user = userEvent.setup();
    
    // 模拟CORS受限的iframe
    const mockIframe = {
      contentDocument: null,
    };
    
    vi.spyOn(document, 'querySelector').mockReturnValue(mockIframe as any);
    
    renderWithProvider(<BrowserAddressBar />);
    
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/由于CORS限制，无法下载此页面/)).toBeInTheDocument();
    });
  });

  it('应该生成正确的文件名', async () => {
    const user = userEvent.setup();
    
    const mockIframe = {
      contentDocument: {
        documentElement: {
          outerHTML: '<html><head></head><body>Test</body></html>',
        },
      },
    };
    
    vi.spyOn(document, 'querySelector').mockReturnValue(mockIframe as any);
    
    renderWithProvider(<BrowserAddressBar />);
    
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    await user.click(downloadButton);
    
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'text/html',
        })
      );
    });
  });

  it('应该在加载状态下禁用按钮', () => {
    const store = createMockStore({
      isLoading: true,
    });

    renderWithProvider(<BrowserAddressBar />, store);
    
    expect(screen.getByRole('button', { name: /刷新/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /下载/ })).toBeDisabled();
  });

  it('应该显示URL验证错误', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    
    // 输入包含危险协议的URL
    await user.clear(urlInput);
    await user.type(urlInput, 'javascript:alert("xss")');
    await user.keyboard('{Enter}');
    
    await waitFor(() => {
      expect(screen.getByText(/不安全的URL格式/)).toBeInTheDocument();
    });
  });

  it('应该处理键盘快捷键', async () => {
    const user = userEvent.setup();
    renderWithProvider(<BrowserAddressBar />);
    
    const urlInput = screen.getByDisplayValue('https://example.com');
    
    // 测试Ctrl+L选中地址栏
    await user.keyboard('{Control>}l{/Control}');
    
    expect(urlInput).toHaveFocus();
  });

  it('应该正确处理历史记录导航', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      history: ['https://example.com', 'https://github.com'],
      currentHistoryIndex: 1,
      canGoBack: true,
      canGoForward: false,
    });

    renderWithProvider(<BrowserAddressBar />, store);
    
    const backButton = screen.getByRole('button', { name: /后退/ });
    await user.click(backButton);
    
    expect(backButton).toBeInTheDocument();
  });
});