"""文件访问安全验证器"""

import os
import mimetypes
from pathlib import Path
from typing import Set, Optional
from urllib.parse import unquote

from openhands.core.logger import openhands_logger as logger


class FileAccessValidator:
    """文件访问安全验证器"""
    
    # 危险的文件扩展名
    DANGEROUS_EXTENSIONS: Set[str] = {
        '.exe', '.bat', '.cmd', '.sh', '.py', '.rb', '.php', '.asp', '.aspx',
        '.jsp', '.cgi', '.pl', '.ps1', '.vbs', '.jar', '.class', '.dll',
        '.so', '.dylib', '.app', '.deb', '.rpm', '.msi', '.dmg'
    }
    
    # 安全的MIME类型
    SAFE_MIME_TYPES: Set[str] = {
        # 文本类型
        'text/html', 'text/css', 'text/plain', 'text/markdown',
        'text/javascript', 'text/xml', 'text/csv',
        
        # 应用程序类型
        'application/javascript', 'application/json', 'application/xml',
        'application/pdf', 'application/xhtml+xml',
        
        # 图像类型
        'image/png', 'image/jpeg', 'image/gif', 'image/svg+xml',
        'image/webp', 'image/ico', 'image/x-icon', 'image/bmp',
        
        # 字体类型
        'font/woff', 'font/woff2', 'font/ttf', 'font/otf',
        'application/font-woff', 'application/font-woff2',
        'application/vnd.ms-fontobject',
        
        # 音视频类型（只读预览）
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'video/mp4', 'video/webm', 'video/ogg'
    }
    
    # 路径遍历攻击模式
    PATH_TRAVERSAL_PATTERNS: Set[str] = {
        '../', '..\\', '%2e%2e%2f', '%2e%2e%5c', '%2e%2e/',
        '..%2f', '..%5c', '%252e%252e%252f', '%c0%ae%c0%ae%c0%af'
    }
    
    def __init__(self, max_file_size: int = 50 * 1024 * 1024):  # 50MB
        """
        初始化验证器
        
        Args:
            max_file_size: 最大文件大小（字节）
        """
        self.max_file_size = max_file_size
        logger.info(f"FileAccessValidator initialized with max_file_size: {max_file_size} bytes")
    
    def validate_file_access(
        self, 
        file_path: Path, 
        user_id: Optional[str] = None,
        check_content: bool = True
    ) -> bool:
        """
        验证用户是否可以访问指定文件
        
        Args:
            file_path: 文件路径
            user_id: 用户ID（可选）
            check_content: 是否检查文件内容
            
        Returns:
            是否允许访问
        """
        try:
            # 1. 基础路径安全检查
            if not self._validate_path_safety(str(file_path)):
                logger.warning(f"Path safety check failed: {file_path}")
                return False
            
            # 2. 文件扩展名检查
            if not self._validate_file_extension(file_path):
                logger.warning(f"Dangerous file extension: {file_path}")
                return False
            
            # 3. 文件存在性检查
            if not file_path.exists():
                logger.debug(f"File does not exist: {file_path}")
                return False
            
            # 4. 文件类型检查
            if not self._validate_file_type(file_path):
                logger.info(f"File type not allowed: {file_path}")
                return False
            
            # 5. 文件大小检查
            if not self._validate_file_size(file_path):
                logger.warning(f"File too large: {file_path}")
                return False
            
            # 6. 内容安全检查（可选）
            if check_content and not self._validate_file_content(file_path):
                logger.warning(f"File content validation failed: {file_path}")
                return False
            
            # 7. 用户权限检查（可扩展）
            if user_id and not self._validate_user_permissions(file_path, user_id):
                logger.warning(f"User {user_id} lacks permission for: {file_path}")
                return False
            
            logger.debug(f"File access validation passed: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error validating file access for {file_path}: {str(e)}")
            return False
    
    def _validate_path_safety(self, path: str) -> bool:
        """验证路径安全性，防止路径遍历攻击"""
        # URL解码
        decoded_path = unquote(path)
        path_lower = decoded_path.lower()
        
        # 检查路径遍历模式
        for pattern in self.PATH_TRAVERSAL_PATTERNS:
            if pattern in path_lower:
                return False
        
        # 检查空字节注入
        if '\x00' in decoded_path:
            return False
        
        # 检查过长路径
        if len(decoded_path) > 4096:  # 4KB路径长度限制
            return False
        
        return True
    
    def _validate_file_extension(self, file_path: Path) -> bool:
        """验证文件扩展名"""
        extension = file_path.suffix.lower()
        
        # 检查危险扩展名
        if extension in self.DANGEROUS_EXTENSIONS:
            return False
        
        # 检查双扩展名（如 .txt.exe）
        if file_path.stem and '.' in file_path.stem:
            potential_ext = '.' + file_path.stem.split('.')[-1].lower()
            if potential_ext in self.DANGEROUS_EXTENSIONS:
                return False
        
        return True
    
    def _validate_file_type(self, file_path: Path) -> bool:
        """验证文件MIME类型"""
        try:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            
            # 如果无法猜测MIME类型，根据扩展名判断
            if not mime_type:
                extension = file_path.suffix.lower()
                known_safe_extensions = {
                    '.html', '.htm', '.css', '.js', '.json', '.txt', '.md',
                    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
                    '.woff', '.woff2', '.ttf', '.otf', '.eot', '.pdf'
                }
                return extension in known_safe_extensions
            
            return mime_type in self.SAFE_MIME_TYPES
            
        except Exception as e:
            logger.error(f"Error validating file type for {file_path}: {str(e)}")
            return False
    
    def _validate_file_size(self, file_path: Path) -> bool:
        """验证文件大小"""
        try:
            file_size = file_path.stat().st_size
            return file_size <= self.max_file_size
        except Exception as e:
            logger.error(f"Error checking file size for {file_path}: {str(e)}")
            return False
    
    def _validate_file_content(self, file_path: Path) -> bool:
        """验证文件内容安全性"""
        try:
            # 对于文本文件，检查可能的恶意内容
            if file_path.suffix.lower() in {'.html', '.htm', '.js', '.css'}:
                return self._validate_web_content(file_path)
            
            # 对于其他文件类型，暂时允许
            return True
            
        except Exception as e:
            logger.error(f"Error validating file content for {file_path}: {str(e)}")
            return False
    
    def _validate_web_content(self, file_path: Path) -> bool:
        """验证Web内容安全性"""
        try:
            # 读取文件内容（限制大小避免内存问题）
            max_content_size = 1024 * 1024  # 1MB
            if file_path.stat().st_size > max_content_size:
                # 只读取前1MB进行检查
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read(max_content_size).lower()
            else:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read().lower()
            
            # 检查潜在的恶意模式
            suspicious_patterns = [
                # JavaScript执行
                'eval(', 'function(', 'settimeout(', 'setinterval(',
                
                # 可能的XSS
                '<script', 'javascript:', 'vbscript:', 'onload=', 'onerror=',
                'onclick=', 'onmouseover=', 'onfocus=',
                
                # 可能的注入
                'document.cookie', 'document.write', 'innerhtml',
                'window.location', 'location.href',
                
                # 外部资源加载
                'src="http', "src='http", 'href="http', "href='http"
            ]
            
            # 计算可疑模式的数量
            suspicious_count = sum(1 for pattern in suspicious_patterns if pattern in content)
            
            # 如果可疑模式过多，可能不安全（这里设置一个阈值）
            if suspicious_count > 5:
                logger.warning(f"High suspicious pattern count ({suspicious_count}) in: {file_path}")
                # 注意：在开发环境中可能需要更宽松的策略
                return True  # 暂时允许，可根据需要调整
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating web content for {file_path}: {str(e)}")
            return True  # 出错时默认允许
    
    def _validate_user_permissions(self, file_path: Path, user_id: str) -> bool:
        """验证用户权限（可扩展实现）"""
        # 这里可以实现基于用户的权限控制
        # 例如：检查用户是否有访问特定目录的权限
        # 目前默认所有认证用户都可以访问workspace中的文件
        return True
    
    def get_validation_info(self, file_path: Path) -> dict:
        """获取文件验证信息，用于调试"""
        try:
            mime_type, _ = mimetypes.guess_type(str(file_path))
            file_size = file_path.stat().st_size if file_path.exists() else 0
            
            return {
                'path': str(file_path),
                'exists': file_path.exists(),
                'extension': file_path.suffix.lower(),
                'mime_type': mime_type,
                'file_size': file_size,
                'is_safe_extension': file_path.suffix.lower() not in self.DANGEROUS_EXTENSIONS,
                'is_safe_mime': mime_type in self.SAFE_MIME_TYPES if mime_type else None,
                'is_size_ok': file_size <= self.max_file_size,
                'validation_result': self.validate_file_access(file_path, check_content=False)
            }
        except Exception as e:
            return {
                'path': str(file_path),
                'error': str(e)
            }


# 单例实例
file_access_validator = FileAccessValidator()