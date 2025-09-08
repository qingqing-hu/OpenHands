"""HTML文件预览核心服务"""

import os
import re
import mimetypes
from pathlib import Path
from typing import Tuple, Dict, Optional
from urllib.parse import urljoin, urlparse

from openhands.core.logger import openhands_logger as logger


class SecurityError(Exception):
    """安全相关错误"""
    pass


class FilePreviewService:
    """文件预览服务类"""
    
    def __init__(self, workspace_base: str = "/app/workspace"):
        """
        初始化文件预览服务
        
        Args:
            workspace_base: workspace基础路径，主容器中通常是 /app/workspace
        """
        self.workspace_base = Path(workspace_base).resolve()
        self.allowed_extensions = {
            '.html', '.htm', '.css', '.js', '.json',
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
            '.woff', '.woff2', '.ttf', '.eot', '.otf',
            '.pdf', '.txt', '.md'
        }
        logger.info(f"FilePreviewService initialized with workspace_base: {self.workspace_base}")
    
    async def get_preview_content(
        self, 
        file_path: str, 
        base_url: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        获取预览内容
        
        Args:
            file_path: 文件相对路径
            base_url: 基础URL用于路径重写
            
        Returns:
            (content, content_type) 元组
        """
        try:
            # 验证和解析文件路径
            resolved_path = self._validate_file_path(file_path)
            
            # 检查文件是否存在
            if not resolved_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")
            
            # 获取MIME类型
            mime_type, _ = mimetypes.guess_type(str(resolved_path))
            if not mime_type:
                mime_type = 'application/octet-stream'
            
            # 读取文件内容
            if mime_type.startswith('text/') or resolved_path.suffix in {'.html', '.htm', '.css', '.js', '.json', '.md'}:
                content = await self._read_text_file(resolved_path)
                
                # 如果是HTML文件且提供了base_url，则重写路径
                if resolved_path.suffix in {'.html', '.htm'} and base_url:
                    content = self._rewrite_html_paths(content, base_url, file_path)
                    
            else:
                # 对于二进制文件，返回文件路径用于直接访问
                content = str(resolved_path)
            
            logger.debug(f"Successfully loaded preview content for: {file_path}")
            return content, mime_type
            
        except Exception as e:
            logger.error(f"Error loading preview content for {file_path}: {str(e)}")
            raise
    
    async def get_static_asset(self, file_path: str) -> Tuple[bytes, str]:
        """
        获取静态资源文件
        
        Args:
            file_path: 文件相对路径
            
        Returns:
            (binary_content, content_type) 元组
        """
        try:
            # 验证和解析文件路径
            resolved_path = self._validate_file_path(file_path)
            
            # 检查文件是否存在
            if not resolved_path.exists():
                raise FileNotFoundError(f"Asset not found: {file_path}")
            
            # 获取MIME类型
            mime_type, _ = mimetypes.guess_type(str(resolved_path))
            if not mime_type:
                # 根据扩展名推断MIME类型
                ext = resolved_path.suffix.lower()
                mime_type = self._get_mime_type_by_extension(ext)
            
            # 读取二进制文件内容
            with open(resolved_path, 'rb') as f:
                content = f.read()
            
            logger.debug(f"Successfully loaded static asset: {file_path}, size: {len(content)} bytes")
            return content, mime_type
            
        except Exception as e:
            logger.error(f"Error loading static asset {file_path}: {str(e)}")
            raise
    
    async def get_preview_content_for_conversation(
        self, 
        conversation_id: str,
        file_path: str, 
        base_url: Optional[str] = None
    ) -> Tuple[str, str]:
        """
        获取指定会话的预览内容
        
        Args:
            conversation_id: 会话ID
            file_path: 文件相对路径
            base_url: 基础URL用于路径重写
            
        Returns:
            (content, content_type) 元组
        """
        try:
            # 验证和解析会话隔离的文件路径
            resolved_path = self._validate_file_path_for_conversation(conversation_id, file_path)
            
            # 检查文件是否存在
            if not resolved_path.exists():
                raise FileNotFoundError(f"File not found: {conversation_id}/{file_path}")
            
            # 获取MIME类型
            mime_type, _ = mimetypes.guess_type(str(resolved_path))
            if not mime_type:
                mime_type = 'application/octet-stream'
            
            # 读取文件内容
            if mime_type.startswith('text/') or resolved_path.suffix in {'.html', '.htm', '.css', '.js', '.json', '.md'}:
                content = await self._read_text_file(resolved_path)
                
                # 如果是HTML文件且提供了base_url，则重写路径
                if resolved_path.suffix in {'.html', '.htm'} and base_url:
                    content = self._rewrite_html_paths_for_conversation(
                        content, base_url, conversation_id, file_path
                    )
                    
            else:
                # 对于二进制文件，返回文件路径用于直接访问
                content = str(resolved_path)
            
            logger.debug(f"Successfully loaded preview content for: {conversation_id}/{file_path}")
            return content, mime_type
            
        except Exception as e:
            logger.error(f"Error loading preview content for {conversation_id}/{file_path}: {str(e)}")
            raise
    
    async def get_static_asset_for_conversation(
        self, 
        conversation_id: str,
        file_path: str
    ) -> Tuple[bytes, str]:
        """
        获取指定会话的静态资源文件
        
        Args:
            conversation_id: 会话ID
            file_path: 文件相对路径
            
        Returns:
            (binary_content, content_type) 元组
        """
        try:
            # 验证和解析会话隔离的文件路径
            resolved_path = self._validate_file_path_for_conversation(conversation_id, file_path)
            
            # 检查文件是否存在
            if not resolved_path.exists():
                raise FileNotFoundError(f"Asset not found: {conversation_id}/{file_path}")
            
            # 获取MIME类型
            mime_type, _ = mimetypes.guess_type(str(resolved_path))
            if not mime_type:
                # 根据扩展名推断MIME类型
                ext = resolved_path.suffix.lower()
                mime_type = self._get_mime_type_by_extension(ext)
            
            # 读取二进制文件内容
            with open(resolved_path, 'rb') as f:
                content = f.read()
            
            logger.debug(f"Successfully loaded static asset: {conversation_id}/{file_path}, size: {len(content)} bytes")
            return content, mime_type
            
        except Exception as e:
            logger.error(f"Error loading static asset {conversation_id}/{file_path}: {str(e)}")
            raise
    
    def _validate_file_path_for_conversation(self, conversation_id: str, file_path: str) -> Path:
        """验证会话隔离的文件路径安全性"""
        if not file_path or not file_path.strip():
            raise ValueError("File path cannot be empty")
        
        if not conversation_id or not conversation_id.strip():
            raise ValueError("Conversation ID cannot be empty")
        
        # 清理路径
        file_path = file_path.strip().lstrip('/')
        conversation_id = conversation_id.strip()
        
        # 构建会话工作区路径
        conversation_workspace = self.workspace_base / conversation_id
        
        # 解析路径，防止目录遍历攻击
        try:
            resolved_path = (conversation_workspace / file_path).resolve()
        except Exception as e:
            raise SecurityError(f"Invalid file path: {conversation_id}/{file_path}")
        
        # 确保路径在会话workspace内
        try:
            resolved_path.relative_to(conversation_workspace)
        except ValueError:
            raise SecurityError(f"Access denied - path outside conversation workspace: {conversation_id}/{file_path}")
        
        # 检查文件扩展名
        if resolved_path.suffix.lower() not in self.allowed_extensions:
            raise SecurityError(f"File type not allowed: {resolved_path.suffix}")
        
        # 检查文件大小限制 (50MB)
        if resolved_path.exists():
            file_size = resolved_path.stat().st_size
            if file_size > 50 * 1024 * 1024:
                raise SecurityError(f"File too large: {file_size} bytes")
        
        return resolved_path
    
    def _rewrite_html_paths_for_conversation(
        self, 
        html_content: str, 
        base_url: str, 
        conversation_id: str,
        current_file: str
    ) -> str:
        """为会话隔离环境重写HTML路径"""
        # 使用会话隔离的资源URL  
        assets_base_url = f"{base_url.rstrip('/')}"
        current_dir = str(Path(current_file).parent) if Path(current_file).parent != Path('.') else ''
        
        # 调用原始的路径重写方法，但使用会话隔离的URL
        return self._rewrite_html_paths(html_content, assets_base_url, current_file)
    
    def _validate_file_path(self, file_path: str) -> Path:
        """验证文件路径安全性"""
        if not file_path or not file_path.strip():
            raise ValueError("File path cannot be empty")
        
        # 清理路径
        file_path = file_path.strip().lstrip('/')
        
        # 解析路径，防止目录遍历攻击
        try:
            resolved_path = (self.workspace_base / file_path).resolve()
        except Exception as e:
            raise SecurityError(f"Invalid file path: {file_path}")
        
        # 确保路径在workspace内
        try:
            resolved_path.relative_to(self.workspace_base)
        except ValueError:
            raise SecurityError(f"Access denied - path outside workspace: {file_path}")
        
        # 检查文件扩展名
        if resolved_path.suffix.lower() not in self.allowed_extensions:
            raise SecurityError(f"File type not allowed: {resolved_path.suffix}")
        
        # 检查文件大小限制 (50MB)
        if resolved_path.exists():
            file_size = resolved_path.stat().st_size
            if file_size > 50 * 1024 * 1024:
                raise SecurityError(f"File too large: {file_size} bytes")
        
        return resolved_path
    
    async def _read_text_file(self, file_path: Path) -> str:
        """读取文本文件内容"""
        try:
            # 尝试UTF-8编码
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                # 回退到latin-1编码
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception:
                # 最后尝试忽略错误
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
    
    def _rewrite_html_paths(self, html_content: str, base_url: str, current_file: str) -> str:
        """重写HTML中的相对路径"""
        base_url = base_url.rstrip('/')
        current_dir = str(Path(current_file).parent) if Path(current_file).parent != Path('.') else ''
        
        # 定义需要重写的属性模式
        patterns = [
            (r'(<link[^>]+href=)["\']([^"\']+)["\']', 'href'),
            (r'(<script[^>]+src=)["\']([^"\']+)["\']', 'src'),
            (r'(<img[^>]+src=)["\']([^"\']+)["\']', 'src'),
            (r'(<a[^>]+href=)["\']([^"\']+)["\']', 'href'),
            # CSS中的url()
            (r'(url\()["\']?([^"\')\s]+)["\']?(\))', 'css-url'),
        ]
        
        for pattern, attr_type in patterns:
            html_content = self._rewrite_pattern(html_content, pattern, base_url, current_dir, attr_type)
        
        return html_content
    
    def _rewrite_pattern(self, content: str, pattern: str, base_url: str, current_dir: str, attr_type: str) -> str:
        """重写特定模式的路径"""
        def replace_func(match):
            if attr_type == 'css-url':
                prefix, original_url, suffix = match.groups()
                new_url = self._build_asset_url(original_url, base_url, current_dir)
                return f'{prefix}"{new_url}"{suffix}'
            else:
                prefix, original_url = match.groups()
                
                # 跳过绝对URL和特殊URL
                if self._should_skip_url(original_url):
                    return match.group(0)
                
                new_url = self._build_asset_url(original_url, base_url, current_dir)
                return f'{prefix}"{new_url}"'
        
        return re.sub(pattern, replace_func, content)
    
    def _should_skip_url(self, url: str) -> bool:
        """判断是否应该跳过URL重写"""
        skip_patterns = [
            'http://', 'https://', 'data:', '//', '#', 'javascript:', 'mailto:', 'tel:'
        ]
        return any(url.startswith(pattern) for pattern in skip_patterns)
    
    def _build_asset_url(self, relative_path: str, base_url: str, current_dir: str) -> str:
        """构建资源文件的完整URL"""
        # 处理相对路径
        if relative_path.startswith('./'):
            relative_path = relative_path[2:]
        elif relative_path.startswith('../'):
            relative_path = self._resolve_parent_path(relative_path, current_dir)
        elif current_dir and not relative_path.startswith('/'):
            # 如果是相对路径且有当前目录，则加上当前目录
            relative_path = f"{current_dir}/{relative_path}"
        
        # 清理路径
        relative_path = relative_path.lstrip('/')
        
        return f"{base_url}/assets/{relative_path}"
    
    def _resolve_parent_path(self, path: str, current_dir: str) -> str:
        """解析包含../的相对路径"""
        # 将当前目录和相对路径合并
        if current_dir:
            full_path = f"{current_dir}/{path}"
        else:
            full_path = path
        
        # 分解路径并解析..
        parts = full_path.split('/')
        resolved_parts = []
        
        for part in parts:
            if part == '..':
                if resolved_parts:
                    resolved_parts.pop()
            elif part and part != '.':
                resolved_parts.append(part)
        
        return '/'.join(resolved_parts)
    
    def _get_mime_type_by_extension(self, ext: str) -> str:
        """根据扩展名获取MIME类型"""
        mime_types = {
            '.html': 'text/html',
            '.htm': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.webp': 'image/webp',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject',
            '.otf': 'font/otf',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
        }
        return mime_types.get(ext, 'application/octet-stream')
    
    def get_workspace_info(self) -> Dict:
        """获取workspace信息，用于调试"""
        try:
            return {
                'workspace_base': str(self.workspace_base),
                'exists': self.workspace_base.exists(),
                'is_dir': self.workspace_base.is_dir(),
                'allowed_extensions': list(self.allowed_extensions),
                'files_count': len(list(self.workspace_base.rglob('*'))) if self.workspace_base.exists() else 0,
            }
        except Exception as e:
            return {
                'workspace_base': str(self.workspace_base),
                'error': str(e)
            }


# 单例实例
file_preview_service = FilePreviewService()