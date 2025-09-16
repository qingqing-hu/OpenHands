"""Simple runtime proxy for accessing runtime container web services."""

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import Response

from openhands.core.logger import openhands_logger as logger

app = APIRouter(prefix="/api", tags=["runtime-proxy"])


@app.get("/runtime-proxy")
async def proxy_runtime_service(
    request: Request,
    port: int = Query(..., description="Runtime container port number"),
    path: str = Query(default="", description="Path to access in the runtime service"),
) -> Response:
    """Proxy requests to runtime container web services.
    
    Simple proxy that forwards requests to localhost:{port}/{path}
    
    Args:
        request: The incoming FastAPI request object
        port: The port number of the runtime service to access
        path: The path to access in the runtime service (e.g., "report.html")
        
    Returns:
        Response: The proxied response from the runtime service
        
    Examples:
        GET /api/runtime-proxy?port=55300&path=report.html
        -> forwards to http://172.17.0.1:55300/report.html
    """
    try:
        # Construct the target URL
        target_url = f"http://172.17.0.1:{port}"
        if path:
            # Ensure path starts with /
            if not path.startswith('/'):
                path = '/' + path
            target_url += path
        
        # Add query parameters from the original request (excluding port and path)
        if request.url.query:
            query_params = []
            for param_pair in request.url.query.split('&'):
                if '=' in param_pair:
                    key, value = param_pair.split('=', 1)
                    if key not in ['port', 'path']:
                        query_params.append(param_pair)
                        
            if query_params:
                target_url += '?' + '&'.join(query_params)
        
        logger.info(f"[RuntimeProxy] Proxying {request.method} request to: {target_url}")
        
        # Make the request to the runtime service
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Forward the request method and headers (excluding host-specific ones)
            headers = {}
            for key, value in request.headers.items():
                if key.lower() not in ['host', 'content-length', 'connection']:
                    headers[key] = value
            
            # Get request body if exists
            body = None
            if request.method in ['POST', 'PUT', 'PATCH']:
                body = await request.body()
            
            # Make the proxied request
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                timeout=30.0
            )
            
            # Prepare response headers (excluding problematic ones)
            response_headers = {}
            for key, value in response.headers.items():
                if key.lower() not in ['content-length', 'connection', 'transfer-encoding']:
                    response_headers[key] = value
            
            logger.info(f"[RuntimeProxy] Request successful, status: {response.status_code}")
            
            # Return the proxied response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=response_headers,
                media_type=response.headers.get('content-type', 'text/html')
            )
            
    except httpx.RequestError as e:
        logger.error(f"[RuntimeProxy] Request failed for {target_url}: {e}")
        return Response(
            content=f"Failed to connect to runtime service: {str(e)}",
            status_code=502,
            media_type="text/plain"
        )
    except httpx.TimeoutException:
        logger.error(f"[RuntimeProxy] Request timeout for {target_url}")
        return Response(
            content="Request to runtime service timed out",
            status_code=504,
            media_type="text/plain"
        )
    except Exception as e:
        logger.error(f"[RuntimeProxy] Unexpected error: {e}")
        return Response(
            content=f"Internal server error: {str(e)}",
            status_code=500,
            media_type="text/plain"
        )