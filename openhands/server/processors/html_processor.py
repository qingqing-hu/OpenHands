"""HTML内容处理器"""

import os
import re
import json
from typing import Dict, Optional
from pathlib import Path

from openhands.core.logger import openhands_logger as logger


class HtmlContentProcessor:
    """HTML内容处理和优化器"""
    
    def __init__(self, base_url: str, development_mode: bool = True):
        """
        初始化HTML处理器
        
        Args:
            base_url: 基础URL
            development_mode: 是否为开发模式
        """
        self.base_url = base_url.rstrip('/')
        self.development_mode = development_mode
        logger.info(f"HtmlContentProcessor initialized with base_url: {base_url}")
    
    def process_html_content(self, html_content: str, file_path: str) -> str:
        """
        处理HTML内容
        
        Args:
            html_content: 原始HTML内容
            file_path: 文件路径
            
        Returns:
            处理后的HTML内容
        """
        try:
            # 1. 基础清理和格式化
            html_content = self._clean_html_content(html_content)
            
            # 2. 路径重写
            html_content = self._rewrite_relative_paths(html_content, file_path)
            
            # 3. 注入调试信息（开发模式）
            if self.development_mode:
                html_content = self._inject_debug_info(html_content, file_path)
            
            # 4. 注入预览增强功能
            html_content = self._inject_preview_enhancements(html_content)
            
            # 5. 内容安全处理
            html_content = self._apply_security_enhancements(html_content)
            
            logger.debug(f"Successfully processed HTML content for: {file_path}")
            return html_content
            
        except Exception as e:
            logger.error(f"Error processing HTML content for {file_path}: {str(e)}")
            # 返回原始内容，避免完全失败
            return html_content
    
    def _clean_html_content(self, html_content: str) -> str:
        """清理HTML内容"""
        # 移除BOM标记
        if html_content.startswith('\ufeff'):
            html_content = html_content[1:]
        
        # 统一换行符
        html_content = html_content.replace('\r\n', '\n').replace('\r', '\n')
        
        return html_content
    
    def _rewrite_relative_paths(self, html_content: str, file_path: str) -> str:
        """重写HTML中的相对路径"""
        current_dir = str(Path(file_path).parent) if Path(file_path).parent != Path('.') else ''
        
        # 定义需要重写的模式
        rewrite_patterns = [
            # link标签的href
            (r'(<link[^>]+href=)["\']([^"\']+)["\']([^>]*>)', self._rewrite_link_href),
            # script标签的src
            (r'(<script[^>]+src=)["\']([^"\']+)["\']([^>]*>)', self._rewrite_script_src),
            # img标签的src
            (r'(<img[^>]+src=)["\']([^"\']+)["\']([^>]*>)', self._rewrite_img_src),
            # a标签的href（仅限相对路径）
            (r'(<a[^>]+href=)["\']([^"\'#][^"\']*)["\']([^>]*>)', self._rewrite_link_href),
            # CSS中的url()
            (r'(url\()["\']?([^"\')\s]+)["\']?(\))', self._rewrite_css_url),
        ]
        
        for pattern, rewrite_func in rewrite_patterns:
            def replace_func(match):
                return rewrite_func(match, current_dir)
            
            html_content = re.sub(pattern, replace_func, html_content, flags=re.IGNORECASE)
        
        return html_content
    
    def _rewrite_link_href(self, match, current_dir: str) -> str:
        """重写link标签的href属性"""
        prefix, url, suffix = match.groups()
        
        if self._should_skip_url_rewrite(url):
            return match.group(0)
        
        new_url = self._build_asset_url(url, current_dir)
        return f'{prefix}"{new_url}"{suffix}'
    
    def _rewrite_script_src(self, match, current_dir: str) -> str:
        """重写script标签的src属性"""
        prefix, url, suffix = match.groups()
        
        if self._should_skip_url_rewrite(url):
            return match.group(0)
        
        new_url = self._build_asset_url(url, current_dir)
        return f'{prefix}"{new_url}"{suffix}'
    
    def _rewrite_img_src(self, match, current_dir: str) -> str:
        """重写img标签的src属性"""
        prefix, url, suffix = match.groups()
        
        if self._should_skip_url_rewrite(url):
            return match.group(0)
        
        new_url = self._build_asset_url(url, current_dir)
        return f'{prefix}"{new_url}"{suffix}'
    
    def _rewrite_css_url(self, match, current_dir: str) -> str:
        """重写CSS中的url()"""
        prefix, url, suffix = match.groups()
        
        if self._should_skip_url_rewrite(url):
            return match.group(0)
        
        new_url = self._build_asset_url(url, current_dir)
        return f'{prefix}"{new_url}"{suffix}'
    
    def _should_skip_url_rewrite(self, url: str) -> bool:
        """判断是否应该跳过URL重写"""
        if not url or not url.strip():
            return True
        
        skip_patterns = [
            'http://', 'https://', 'data:', '//', '#', 'javascript:', 'mailto:', 'tel:',
            'blob:', 'about:', 'chrome:', 'file:'
        ]
        
        url_lower = url.lower().strip()
        return any(url_lower.startswith(pattern) for pattern in skip_patterns)
    
    def _build_asset_url(self, relative_path: str, current_dir: str) -> str:
        """构建资源文件的完整URL"""
        # 清理路径
        relative_path = relative_path.strip()
        
        # 处理相对路径
        if relative_path.startswith('./'):
            relative_path = relative_path[2:]
        elif relative_path.startswith('../'):
            relative_path = self._resolve_parent_path(relative_path, current_dir)
        elif current_dir and not relative_path.startswith('/'):
            # 相对于当前目录
            relative_path = f"{current_dir}/{relative_path}"
        
        # 清理最终路径
        relative_path = relative_path.lstrip('/')
        
        return f"{self.base_url}/assets/{relative_path}"
    
    def _resolve_parent_path(self, path: str, current_dir: str) -> str:
        """解析包含../的相对路径"""
        if current_dir:
            full_path = f"{current_dir}/{path}"
        else:
            full_path = path
        
        parts = full_path.split('/')
        resolved_parts = []
        
        for part in parts:
            if part == '..':
                if resolved_parts:
                    resolved_parts.pop()
            elif part and part != '.':
                resolved_parts.append(part)
        
        return '/'.join(resolved_parts)
    
    def _inject_debug_info(self, html_content: str, file_path: str) -> str:
        """注入调试信息"""
        debug_script = f"""
<script>
console.log('[OpenHands Preview] Loading file: {file_path}');
console.log('[OpenHands Preview] Base URL: {self.base_url}');
console.log('[OpenHands Preview] Timestamp: {{"timestamp": "{os.environ.get("TIMESTAMP", "unknown")}"}}');

// 添加调试面板
if (localStorage.getItem('openhands-debug') === 'true') {{
    const debugPanel = document.createElement('div');
    debugPanel.id = 'openhands-debug-panel';
    debugPanel.innerHTML = `
        <div style="position: fixed; top: 0; right: 0; background: #000; color: #00ff00; 
                    padding: 10px; font-family: monospace; font-size: 12px; z-index: 10000;
                    max-width: 300px; border: 1px solid #00ff00;">
            <strong>OpenHands Preview Debug</strong><br>
            File: {file_path}<br>
            Base URL: {self.base_url}<br>
            <button onclick="this.parentElement.parentElement.style.display='none'"
                    style="background: #00ff00; color: #000; border: none; padding: 2px 5px; cursor: pointer;">
                Hide
            </button>
        </div>
    `;
    document.body.appendChild(debugPanel);
}}

// 添加错误监听
window.addEventListener('error', function(e) {{
    console.error('[OpenHands Preview] JavaScript Error:', e.error);
}});

window.addEventListener('unhandledrejection', function(e) {{
    console.error('[OpenHands Preview] Unhandled Promise Rejection:', e.reason);
}});
</script>
"""
        
        # 在</head>前插入调试脚本，如果没有</head>则在开头插入
        if '</head>' in html_content:
            html_content = html_content.replace('</head>', debug_script + '</head>')
        elif '<html>' in html_content:
            html_content = html_content.replace('<html>', f'<html>{debug_script}')
        else:
            html_content = debug_script + html_content
        
        return html_content
    
    def _inject_preview_enhancements(self, html_content: str) -> str:
        """注入预览增强功能"""
        enhancement_script = """
<script>
// OpenHands Preview 增强功能
(function() {
    'use strict';
    
    // 添加样式增强
    const style = document.createElement('style');
    style.textContent = `
        /* OpenHands Preview 增强样式 */
        .openhands-preview-highlight {
            outline: 2px solid #00ff00 !important;
            outline-offset: 2px !important;
        }
        
        .openhands-preview-error {
            background-color: rgba(255, 0, 0, 0.1) !important;
            border: 1px dashed red !important;
        }
        
        /* 响应式增强 */
        @media (max-width: 768px) {
            body {
                overflow-x: hidden !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // 图片加载错误处理
    document.addEventListener('DOMContentLoaded', function() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            img.addEventListener('error', function() {
                console.warn('[OpenHands Preview] Image load failed:', this.src);
                this.classList.add('openhands-preview-error');
                this.alt = this.alt || 'Image load failed: ' + this.src;
                this.title = 'Image load failed: ' + this.src;
            });
        });
        
        // 外部资源加载检测
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        links.forEach(link => {
            link.addEventListener('error', function() {
                console.warn('[OpenHands Preview] Stylesheet load failed:', this.href);
            });
        });
        
        const scripts = document.querySelectorAll('script[src]');
        scripts.forEach(script => {
            script.addEventListener('error', function() {
                console.warn('[OpenHands Preview] Script load failed:', this.src);
            });
        });
    });
    
    // 键盘快捷键
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'r':
                    // Ctrl+R 刷新
                    e.preventDefault();
                    window.location.reload();
                    break;
                case 'd':
                    // Ctrl+D 切换调试模式
                    e.preventDefault();
                    const isDebug = localStorage.getItem('openhands-debug') === 'true';
                    localStorage.setItem('openhands-debug', (!isDebug).toString());
                    console.log('[OpenHands Preview] Debug mode:', !isDebug ? 'enabled' : 'disabled');
                    break;
            }
        }
    });
})();
</script>
"""
        
        # 在</body>前插入增强脚本，如果没有</body>则在结尾插入
        if '</body>' in html_content:
            html_content = html_content.replace('</body>', enhancement_script + '</body>')
        else:
            html_content = html_content + enhancement_script
        
        return html_content
    
    def _apply_security_enhancements(self, html_content: str) -> str:
        """应用安全增强"""
        # 添加内容安全策略（可选，根据需要调整）
        security_headers = """
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:;
    img-src 'self' data: blob: https: http:;
    font-src 'self' data: https: http:;
    connect-src 'self' https: http: ws: wss:;
    media-src 'self' data: blob: https: http:;
">
<meta http-equiv="X-Content-Type-Options" content="nosniff">
<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">
"""
        
        # 在<head>中插入安全头，如果没有<head>则创建
        if '<head>' in html_content:
            html_content = html_content.replace('<head>', f'<head>{security_headers}')
        elif '<html>' in html_content:
            html_content = html_content.replace('<html>', f'<html><head>{security_headers}</head>')
        else:
            html_content = f'<head>{security_headers}</head>{html_content}'
        
        return html_content
    
    def get_processor_info(self) -> Dict:
        """获取处理器信息，用于调试"""
        return {
            'base_url': self.base_url,
            'development_mode': self.development_mode,
            'version': '1.0.0'
        }


# 工厂函数
def create_html_processor(base_url: str, development_mode: bool = True) -> HtmlContentProcessor:
    """创建HTML处理器实例"""
    return HtmlContentProcessor(base_url, development_mode)