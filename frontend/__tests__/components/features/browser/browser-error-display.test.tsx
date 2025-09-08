/**
 * 浏览器错误显示组件单元测试
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { BrowserErrorDisplay } from '../../../../src/components/features/browser/browser-error-display';

describe('BrowserErrorDisplay组件', () => {
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该显示通用错误消息', () => {
    render(
      <BrowserErrorDisplay 
        error="页面加载失败"
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText('页面加载失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /重试/ })).toBeInTheDocument();
  });

  it('应该显示CORS错误的特殊处理', () => {
    render(
      <BrowserErrorDisplay 
        error="X-Frame-Options: DENY"
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText(/此网站不允许在iframe中显示/)).toBeInTheDocument();
    expect(screen.getByText(/这是该网站的安全设置/)).toBeInTheDocument();
  });

  it('应该显示网络错误的特殊处理', () => {
    render(
      <BrowserErrorDisplay 
        error="Network Error"
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText(/网络连接错误/)).toBeInTheDocument();
    expect(screen.getByText(/请检查网络连接/)).toBeInTheDocument();
  });

  it('应该显示超时错误的特殊处理', () => {
    render(
      <BrowserErrorDisplay 
        error="Request timeout"
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText(/请求超时/)).toBeInTheDocument();
    expect(screen.getByText(/页面响应时间过长/)).toBeInTheDocument();
  });

  it('应该处理重试按钮点击', async () => {
    const user = userEvent.setup();
    
    render(
      <BrowserErrorDisplay 
        error="测试错误"
        onRetry={mockOnRetry}
      />
    );
    
    const retryButton = screen.getByRole('button', { name: /重试/ });
    await user.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('应该显示错误图标', () => {
    render(
      <BrowserErrorDisplay 
        error="测试错误"
        onRetry={mockOnRetry}
      />
    );
    
    // 检查是否有错误图标（SVG或图标类名）
    expect(document.querySelector('[data-testid="error-icon"]') || 
           document.querySelector('.error-icon') ||
           screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('应该不显示重试按钮当onRetry未提供时', () => {
    render(
      <BrowserErrorDisplay error="测试错误" />
    );
    
    expect(screen.queryByRole('button', { name: /重试/ })).not.toBeInTheDocument();
  });

  it('应该处理空错误消息', () => {
    render(
      <BrowserErrorDisplay 
        error=""
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText(/未知错误/)).toBeInTheDocument();
  });

  it('应该处理长错误消息的显示', () => {
    const longError = '这是一个非常长的错误消息，应该能够正确显示而不会破坏布局。'.repeat(5);
    
    render(
      <BrowserErrorDisplay 
        error={longError}
        onRetry={mockOnRetry}
      />
    );
    
    expect(screen.getByText(longError)).toBeInTheDocument();
  });

  it('应该有正确的可访问性属性', () => {
    render(
      <BrowserErrorDisplay 
        error="可访问性测试错误"
        onRetry={mockOnRetry}
      />
    );
    
    const errorContainer = screen.getByRole('alert') || 
                          document.querySelector('[role="alert"]') ||
                          screen.getByText('可访问性测试错误').closest('div');
    
    expect(errorContainer).toBeInTheDocument();
  });

  it('应该正确识别各种CORS相关错误', () => {
    const corsErrors = [
      'X-Frame-Options: DENY',
      'X-Frame-Options: SAMEORIGIN', 
      'Content-Security-Policy',
      'Refused to display',
      'same-origin policy',
    ];

    corsErrors.forEach(error => {
      const { unmount } = render(
        <BrowserErrorDisplay 
          error={error}
          onRetry={mockOnRetry}
        />
      );
      
      expect(screen.getByText(/此网站不允许在iframe中显示/) || 
             screen.getByText(/安全限制/)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('应该正确识别各种网络错误', () => {
    const networkErrors = [
      'Network Error',
      'Failed to fetch',
      'Connection refused',
      'DNS lookup failed',
      'ERR_INTERNET_DISCONNECTED',
    ];

    networkErrors.forEach(error => {
      const { unmount } = render(
        <BrowserErrorDisplay 
          error={error}
          onRetry={mockOnRetry}
        />
      );
      
      expect(screen.getByText(/网络/) || 
             screen.getByText(/连接/)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('应该提供错误分类功能', () => {
    // 测试不同类型的错误是否被正确分类和处理
    const errorTypes = [
      { error: 'X-Frame-Options: DENY', type: 'security' },
      { error: 'Network Error', type: 'network' },
      { error: 'Request timeout', type: 'timeout' },
      { error: '404 Not Found', type: 'http' },
      { error: '500 Internal Server Error', type: 'server' },
      { error: '随机错误', type: 'generic' },
    ];

    errorTypes.forEach(({ error, type }) => {
      const { unmount } = render(
        <BrowserErrorDisplay 
          error={error}
          onRetry={mockOnRetry}
        />
      );
      
      // 根据错误类型验证显示的内容
      switch (type) {
        case 'security':
          expect(screen.getByText(/安全/) || screen.getByText(/iframe/)).toBeInTheDocument();
          break;
        case 'network':
          expect(screen.getByText(/网络/) || screen.getByText(/连接/)).toBeInTheDocument();
          break;
        case 'timeout':
          expect(screen.getByText(/超时/) || screen.getByText(/响应时间/)).toBeInTheDocument();
          break;
        default:
          expect(screen.getByText(error) || screen.getByText(/错误/)).toBeInTheDocument();
      }
      
      unmount();
    });
  });
});