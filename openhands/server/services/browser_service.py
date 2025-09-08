"""Browser service for managing real browser tab functionality."""

import re
import time
from typing import Dict, Any, Optional
from urllib.parse import urlparse

from openhands.core.logger import openhands_logger as logger


class BrowserService:
    """Service for browser navigation and content management."""
    
    def __init__(self):
        """Initialize the browser service."""
        self.url_pattern = re.compile(
            r'^https?://' # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+'  # domain
            r'(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|'  # top-level domain
            r'localhost|'  # localhost
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # IP address
            r'(?::\d+)?'  # optional port
            r'(?:/.*)?$', re.IGNORECASE)

    async def navigate_to_url(self, url: str, conversation_id: str) -> Dict[str, Any]:
        """
        Navigate to specified URL.
        
        Args:
            url: The URL to navigate to
            conversation_id: The conversation ID
            
        Returns:
            Dictionary containing navigation result
        """
        try:
            # Validate URL
            is_valid, error_msg = self.validate_url(url)
            if not is_valid:
                return {
                    "success": False,
                    "error": error_msg,
                    "url": url,
                    "conversation_id": conversation_id
                }
            
            # For iframe-based browser, we simply return the URL
            # The actual navigation happens in the frontend iframe
            logger.info(f"Browser navigation requested: {url} for conversation {conversation_id}")
            
            return {
                "success": True,
                "url": url,
                "conversation_id": conversation_id,
                "message": "Navigation initiated"
            }
            
        except Exception as e:
            logger.error(f"Error navigating to URL {url}: {str(e)}")
            return {
                "success": False,
                "error": f"Navigation failed: {str(e)}",
                "url": url,
                "conversation_id": conversation_id
            }

    async def get_page_html(self, url: str) -> str:
        """
        Get page HTML content for download.
        Note: This is a placeholder. In practice, the HTML content 
        comes from the frontend iframe due to CORS restrictions.
        
        Args:
            url: The URL to get HTML from
            
        Returns:
            HTML content string
        """
        # For iframe-based approach, this would typically be called
        # from the frontend after extracting HTML from the iframe
        logger.warning(f"get_page_html called for {url} - this should be handled by frontend")
        return ""

    def validate_url(self, url: str) -> tuple[bool, Optional[str]]:
        """
        Validate URL format and safety.
        
        Args:
            url: URL to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not url or not url.strip():
            return False, "URL cannot be empty"
        
        url = url.strip()
        
        # Basic format validation
        try:
            parsed = urlparse(url)
            if not parsed.scheme:
                return False, "URL must include protocol (http:// or https://)"
            
            if parsed.scheme not in ['http', 'https']:
                return False, "Only HTTP and HTTPS protocols are allowed"
            
            if not parsed.netloc:
                return False, "URL must include a valid domain"
                
        except Exception as e:
            return False, f"Invalid URL format: {str(e)}"
        
        # Pattern validation
        if not self.url_pattern.match(url):
            return False, "URL format is invalid"
        
        # Security checks - block potentially dangerous URLs
        dangerous_patterns = [
            r'file://',
            r'javascript:',
            r'data:',
            r'vbscript:',
        ]
        
        url_lower = url.lower()
        for pattern in dangerous_patterns:
            if pattern in url_lower:
                return False, f"URL protocol '{pattern}' is not allowed for security reasons"
        
        return True, None

    async def serve_local_file(self, file_path: str) -> str:
        """
        创建本地HTML文件的预览URL (兼容旧接口，使用默认会话)
        
        Args:
            file_path: 相对于workspace的文件路径
            
        Returns:
            可以在浏览器中访问的预览URL
        """
        # 为了向后兼容，使用默认会话ID
        return await self.serve_local_file_for_conversation("default", file_path)
    
    async def serve_local_file_for_conversation(self, conversation_id: str, file_path: str) -> str:
        """
        为指定会话创建本地HTML文件的预览URL
        
        Args:
            conversation_id: 会话ID，用于文件隔离
            file_path: 相对于workspace的文件路径
            
        Returns:
            可以在浏览器中访问的预览URL
        """
        try:
            # 1. 基础路径清理
            file_path = file_path.strip().lstrip('/')
            conversation_id = conversation_id.strip()
            
            # 2. 基础安全检查
            if not file_path or '..' in file_path:
                logger.error(f"Invalid file path: {file_path}")
                raise ValueError("Invalid file path")
            
            if not conversation_id:
                logger.error("Invalid conversation ID")
                raise ValueError("Invalid conversation ID")
            
            # 3. 检查是否为HTML文件
            if not file_path.lower().endswith(('.html', '.htm')):
                logger.warning(f"File is not HTML: {file_path}")
                # 对于非HTML文件，可能需要不同的处理
                
            # 4. 构建会话隔离的预览URL
            import os
            frontend_base_path = os.getenv('FRONTEND_BASE_PATH', '/openhands')
            preview_url = f"{frontend_base_path}/api/files/preview/{conversation_id}/{file_path}"
            
            logger.info(f"Local file preview URL created: {preview_url} for conversation: {conversation_id}")
            return preview_url
            
        except Exception as e:
            logger.error(f"Error creating preview URL for {conversation_id}/{file_path}: {str(e)}")
            raise

    async def trigger_auto_switch(self, conversation_id: str) -> Dict[str, Any]:
        """
        Trigger automatic switch to browser tab via WebSocket.
        
        Args:
            conversation_id: The conversation ID
            
        Returns:
            Dictionary containing switch result
        """
        try:
            logger.info(f"Auto-switch to browser tab triggered for conversation {conversation_id}")
            
            # Import here to avoid circular imports
            from openhands.server.shared import sio
            
            # Send WebSocket message to all clients connected to this conversation
            # The frontend will handle switching to the browser tab
            await sio.emit('browser_tab_switch', {
                'conversation_id': conversation_id,
                'action': 'switch_to_browser_tab',
                'timestamp': int(time.time() * 1000)
            }, room=f'conversation_{conversation_id}')
            
            logger.info(f"WebSocket browser tab switch message sent for conversation {conversation_id}")
            
            return {
                "success": True,
                "conversation_id": conversation_id,
                "action": "switch_to_browser_tab",
                "message": "Browser tab switch WebSocket message sent"
            }
            
        except Exception as e:
            logger.error(f"Error triggering auto-switch for conversation {conversation_id}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "conversation_id": conversation_id
            }


# Singleton instance
browser_service = BrowserService()