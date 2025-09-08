from fastapi.staticfiles import StaticFiles
from starlette.responses import Response
from starlette.types import Scope
from starlette.exceptions import HTTPException


class SPAStaticFiles(StaticFiles):
    async def __call__(self, scope: Scope, receive, send):
        # Don't handle WebSocket requests - raise 404 to let routing continue
        if scope["type"] == "websocket":
            raise HTTPException(status_code=404, detail="Not Found")
        
        return await super().__call__(scope, receive, send)

    async def get_response(self, path: str, scope: Scope) -> Response:
        try:
            return await super().get_response(path, scope)
        except Exception:
            # FIXME: just making this HTTPException doesn't work for some reason
            return await super().get_response('index.html', scope)
