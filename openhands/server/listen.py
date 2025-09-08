import os

import socketio

from openhands.server.app import app as base_app
from openhands.server.listen_socket import sio
from openhands.server.middleware import (
    CacheControlMiddleware,
    LocalhostCORSMiddleware,
)
from openhands.server.static import SPAStaticFiles

if os.getenv('SERVE_FRONTEND', 'true').lower() == 'true':
    # Get frontend base path from environment variable
    frontend_base_path = os.getenv('FRONTEND_BASE_PATH', '/openhands')
    
    # Ensure the base path starts with /
    if not frontend_base_path.startswith('/'):
        frontend_base_path = '/' + frontend_base_path
    
    # Mount frontend static files at the specified base path BEFORE adding middleware
    # This allows socket.io to handle its own routes without conflict
    base_app.mount(
        frontend_base_path, SPAStaticFiles(directory='./frontend/build', html=True), name='dist'
    )
    
    # Also mount at root path for backward compatibility (optional)
    # Comment out the next 3 lines if you only want the prefixed path
    if frontend_base_path != '/':
        base_app.mount(
            '/', SPAStaticFiles(directory='./frontend/build', html=True), name='dist_root'
        )

base_app.add_middleware(LocalhostCORSMiddleware)
base_app.add_middleware(CacheControlMiddleware)

# Get frontend base path for WebSocket routing
frontend_base_path = os.getenv('FRONTEND_BASE_PATH', '/openhands')
if not frontend_base_path.startswith('/'):
    frontend_base_path = '/' + frontend_base_path

# Debug logging for WebSocket routing
print(f'[DEBUG] listen.py: Frontend base path: {frontend_base_path}')

# Create the main Socket.IO ASGI app
socketio_app = socketio.ASGIApp(sio, other_asgi_app=base_app)

# Create a custom ASGI app that handles both the original and prefixed paths
class CustomASGIApp:
    def __init__(self, socketio_app, base_path):
        self.socketio_app = socketio_app
        self.base_path = base_path
        
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" or scope["type"] == "websocket":
            path = scope["path"]
            print(f'[DEBUG] Incoming request path: {path}')
            
            # If the path starts with our base path + /socket.io/, strip the base path
            if path.startswith(f'{self.base_path}/socket.io/'):
                # Modify the path to remove the base path prefix
                scope = dict(scope)
                scope["path"] = path[len(self.base_path):]
                print(f'[DEBUG] Rewritten path: {scope["path"]}')
        
        return await self.socketio_app(scope, receive, send)

app = CustomASGIApp(socketio_app, frontend_base_path)
