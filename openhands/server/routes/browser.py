"""Browser API routes for real browser tab functionality."""

from typing import Dict, Any
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse

from openhands.core.logger import openhands_logger as logger
from openhands.server.services.browser_service import browser_service
from openhands.server.user_auth import get_user_id


class NavigateRequest(BaseModel):
    """Request model for browser navigation."""
    url: str
    auto_switch: bool = True


class PreviewFileRequest(BaseModel):
    """Request model for local file preview."""
    file_path: str
    auto_switch: bool = True


class BrowserStateResponse(BaseModel):
    """Response model for browser state."""
    current_url: str
    is_loading: bool
    error: str | None = None
    can_go_back: bool
    can_go_forward: bool


class DownloadResponse(BaseModel):
    """Response model for HTML download."""
    filename: str
    content: str
    content_type: str = "text/html"


app = APIRouter(prefix="/api", tags=["browser"])


@app.post("/browser/{conversation_id}/navigate")
async def navigate_to_url(
    conversation_id: str, 
    request: NavigateRequest,
    user_id: str = Depends(get_user_id)
) -> JSONResponse:
    """
    Navigate to a URL in the browser tab.
    
    Args:
        conversation_id: The conversation ID
        request: Navigation request containing URL and options
        user_id: User ID from authentication
        
    Returns:
        JSON response with navigation result
    """
    try:
        logger.info(f"Navigation request for conversation {conversation_id}: {request.url}")
        
        result = await browser_service.navigate_to_url(
            url=request.url,
            conversation_id=conversation_id
        )
        
        if result["success"]:
            # 自动切换逻辑通过runtime的RealBrowserObservation处理
            # 不在这里直接触发WebSocket
            
            return JSONResponse(
                content={
                    "success": True,
                    "url": result["url"],
                    "message": result.get("message", "Navigation successful"),
                    "auto_switch": request.auto_switch
                },
                status_code=status.HTTP_200_OK
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "error": result["error"],
                    "url": request.url
                },
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"Error in navigate_to_url: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Navigation failed: {str(e)}"
        )


@app.get("/browser/{conversation_id}/download")
async def download_page_html(
    conversation_id: str,
    url: str,
    user_id: str = Depends(get_user_id)
) -> JSONResponse:
    """
    Download current page HTML content.
    Note: This endpoint is primarily for API completeness.
    The actual HTML extraction happens in the frontend due to CORS restrictions.
    
    Args:
        conversation_id: The conversation ID
        url: The URL to download HTML from
        user_id: User ID from authentication
        
    Returns:
        JSON response indicating download status
    """
    try:
        logger.info(f"HTML download request for conversation {conversation_id}: {url}")
        
        # Validate URL first
        is_valid, error_msg = browser_service.validate_url(url)
        if not is_valid:
            return JSONResponse(
                content={
                    "success": False,
                    "error": error_msg
                },
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        # In practice, HTML content extraction is handled by frontend
        # due to CORS restrictions with iframes
        return JSONResponse(
            content={
                "success": True,
                "message": "HTML download should be handled by frontend due to CORS restrictions",
                "url": url,
                "conversation_id": conversation_id
            },
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Error in download_page_html: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Download failed: {str(e)}"
        )


@app.post("/browser/{conversation_id}/auto-switch")
async def trigger_auto_switch(
    conversation_id: str,
    user_id: str = Depends(get_user_id)
) -> JSONResponse:
    """
    Trigger automatic switch to browser tab.
    This is typically called by Agent actions.
    
    Args:
        conversation_id: The conversation ID
        user_id: User ID from authentication
        
    Returns:
        JSON response with switch result
    """
    try:
        logger.info(f"Auto-switch request for conversation {conversation_id}")
        
        result = await browser_service.trigger_auto_switch(conversation_id)
        
        if result["success"]:
            return JSONResponse(
                content={
                    "success": True,
                    "action": result["action"],
                    "message": result["message"]
                },
                status_code=status.HTTP_200_OK
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "error": result["error"]
                },
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"Error in trigger_auto_switch: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auto-switch failed: {str(e)}"
        )


@app.get("/browser/{conversation_id}/validate-url")
async def validate_url(
    conversation_id: str,
    url: str,
    user_id: str = Depends(get_user_id)
) -> JSONResponse:
    """
    Validate a URL before navigation.
    
    Args:
        conversation_id: The conversation ID
        url: The URL to validate
        user_id: User ID from authentication
        
    Returns:
        JSON response with validation result
    """
    try:
        logger.info(f"URL validation request for conversation {conversation_id}: {url}")
        
        is_valid, error_msg = browser_service.validate_url(url)
        
        return JSONResponse(
            content={
                "valid": is_valid,
                "url": url,
                "error": error_msg,
                "conversation_id": conversation_id
            },
            status_code=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Error in validate_url: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"URL validation failed: {str(e)}"
        )


@app.post("/browser/{conversation_id}/preview-file")
async def preview_local_file(
    conversation_id: str, 
    request: PreviewFileRequest,
    user_id: str = Depends(get_user_id)
) -> JSONResponse:
    """
    预览本地HTML文件
    
    Args:
        conversation_id: 会话ID
        request: 预览请求，包含文件路径和选项
        user_id: 用户ID
        
    Returns:
        包含预览URL的JSON响应
    """
    try:
        logger.info(f"Local file preview request for conversation {conversation_id}: {request.file_path}")
        
        # 创建会话隔离的预览URL
        preview_url = await browser_service.serve_local_file_for_conversation(
            conversation_id, request.file_path
        )
        
        # 导航到预览URL
        result = await browser_service.navigate_to_url(
            url=preview_url,
            conversation_id=conversation_id
        )
        
        if result["success"]:
            # 自动切换逻辑通过runtime的RealBrowserObservation处理
            # 不在这里直接触发WebSocket
            
            return JSONResponse(
                content={
                    "success": True,
                    "preview_url": preview_url,
                    "file_path": request.file_path,
                    "message": "File preview URL created successfully",
                    "auto_switch": request.auto_switch
                },
                status_code=status.HTTP_200_OK
            )
        else:
            return JSONResponse(
                content={
                    "success": False,
                    "error": f"Failed to create preview for file: {result['error']}",
                    "file_path": request.file_path
                },
                status_code=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"Error in preview_local_file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File preview failed: {str(e)}"
        )