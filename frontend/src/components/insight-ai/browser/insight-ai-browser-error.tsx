import React from 'react';
import { 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Shield, 
  Wifi,
  Globe 
} from 'lucide-react';
import { InsightAIBrowserService } from '#/api/insight-ai-browser-service';

interface InsightAIBrowserErrorProps {
  error: string;
  onRetry?: () => void;
  onReportIssue?: () => void;
  url?: string;
  className?: string;
}

export function InsightAIBrowserError({ 
  error, 
  onRetry, 
  onReportIssue,
  url = '',
  className = '' 
}: InsightAIBrowserErrorProps) {
  
  // 根据错误类型确定图标和样式
  const getErrorDetails = () => {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('cors') || lowerError.includes('frame') || lowerError.includes('x-frame-options')) {
      return {
        icon: Shield,
        type: 'security',
        title: '安全限制',
        description: '此网站禁止在嵌入式浏览器中显示',
        suggestion: '这是网站的安全设置，可以尝试在新标签页中打开',
        color: 'orange'
      };
    }
    
    if (lowerError.includes('network') || lowerError.includes('connection') || lowerError.includes('timeout')) {
      return {
        icon: Wifi,
        type: 'network',
        title: '网络连接错误',
        description: '无法连接到目标网站',
        suggestion: '请检查网络连接并重试',
        color: 'red'
      };
    }
    
    if (lowerError.includes('not found') || lowerError.includes('404')) {
      return {
        icon: Globe,
        type: 'not_found',
        title: '页面未找到',
        description: '请求的页面不存在',
        suggestion: '请检查网址是否正确',
        color: 'blue'
      };
    }
    
    return {
      icon: AlertCircle,
      type: 'unknown',
      title: '加载失败',
      description: error,
      suggestion: '请稍后重试',
      color: 'gray'
    };
  };

  const errorDetails = getErrorDetails();
  const Icon = errorDetails.icon;

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          icon: 'text-orange-500',
          title: 'text-orange-800',
          text: 'text-orange-700',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          text: 'text-red-700',
          button: 'bg-red-600 hover:bg-red-700'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-500',
          title: 'text-blue-800',
          text: 'text-blue-700',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-500',
          title: 'text-gray-800',
          text: 'text-gray-700',
          button: 'bg-gray-600 hover:bg-gray-700'
        };
    }
  };

  const colors = getColorClasses(errorDetails.color);

  const handleOpenInNewTab = () => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getDomain = () => {
    if (!url) return '';
    return InsightAIBrowserService.getDomain(url);
  };

  return (
    <div className={`w-full h-full flex items-center justify-center p-6 ${className}`}>
      <div className={`max-w-md w-full ${colors.bg} ${colors.border} border rounded-xl p-6`}>
        {/* 错误图标和标题 */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-3">
            <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center border-2 ${colors.border}`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
          </div>
          
          <h3 className={`text-lg font-semibold ${colors.title} mb-2`}>
            {errorDetails.title}
          </h3>
          
          <p className={`text-sm ${colors.text} mb-1`}>
            {errorDetails.description}
          </p>
          
          {getDomain() && (
            <p className="text-xs text-gray-500 mb-3">
              域名: {getDomain()}
            </p>
          )}
          
          <p className={`text-xs ${colors.text} opacity-75`}>
            {errorDetails.suggestion}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className={`flex items-center justify-center gap-2 px-4 py-2 ${colors.button} text-white rounded-lg transition-colors duration-200 text-sm font-medium`}
            >
              <RefreshCw className="w-4 h-4" />
              重新加载
            </button>
          )}
          
          {url && errorDetails.type === 'security' && (
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              在新标签页中打开
            </button>
          )}
          
          {onReportIssue && (
            <button
              onClick={onReportIssue}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              反馈问题
            </button>
          )}
        </div>

        {/* 错误详情（调试信息） */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className={`text-xs ${colors.text} cursor-pointer hover:underline`}>
              错误详情 (开发模式)
            </summary>
            <pre className={`mt-2 p-2 bg-gray-100 rounded text-xs ${colors.text} whitespace-pre-wrap break-all`}>
              {error}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}