import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse, Response
from pathspec import PathSpec
from pathspec.patterns import GitWildMatchPattern
from starlette.background import BackgroundTask

from openhands.core.exceptions import AgentRuntimeUnavailableError
from openhands.core.logger import openhands_logger as logger
from openhands.events.action import (
    FileReadAction,
)
from openhands.events.action.files import FileWriteAction
from openhands.events.observation import (
    ErrorObservation,
    FileReadObservation,
)
from openhands.runtime.base import Runtime
from openhands.server.dependencies import get_dependencies
from openhands.server.file_config import FILES_TO_IGNORE
from openhands.server.files import POSTUploadFilesModel
from openhands.server.session.conversation import ServerConversation
from openhands.server.user_auth import get_user_id
from openhands.server.utils import get_conversation, get_conversation_store
from openhands.storage.conversation.conversation_store import ConversationStore
from openhands.utils.async_utils import call_sync_from_async
from openhands.server.services.file_preview_service import file_preview_service
from openhands.server.security.file_access_validator import file_access_validator
from openhands.server.processors.html_processor import create_html_processor

app = APIRouter(
    prefix='/api/conversations/{conversation_id}', dependencies=get_dependencies()
)


@app.get(
    '/list-files',
    response_model=list[str],
    responses={
        404: {'description': 'Runtime not initialized', 'model': dict},
        500: {'description': 'Error listing or filtering files', 'model': dict},
    },
)
async def list_files(
    conversation: ServerConversation = Depends(get_conversation),
    path: str | None = None,
) -> list[str] | JSONResponse:
    """List files in the specified path.

    This function retrieves a list of files from the agent's runtime file store,
    excluding certain system and hidden files/directories.

    To list files:
    ```sh
    curl http://localhost:3000/api/conversations/{conversation_id}/list-files
    ```

    Args:
        request (Request): The incoming request object.
        path (str, optional): The path to list files from. Defaults to None.

    Returns:
        list: A list of file names in the specified path.

    Raises:
        HTTPException: If there's an error listing the files.
    """
    if not conversation.runtime:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={'error': 'Runtime not yet initialized'},
        )

    runtime: Runtime = conversation.runtime
    try:
        file_list = await call_sync_from_async(runtime.list_files, path)
    except AgentRuntimeUnavailableError as e:
        logger.error(f'Error listing files: {e}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Error listing files: {e}'},
        )
    if path:
        file_list = [os.path.join(path, f) for f in file_list]

    file_list = [f for f in file_list if f not in FILES_TO_IGNORE]

    async def filter_for_gitignore(file_list: list[str], base_path: str) -> list[str]:
        gitignore_path = os.path.join(base_path, '.gitignore')
        try:
            read_action = FileReadAction(gitignore_path)
            observation = await call_sync_from_async(runtime.run_action, read_action)
            spec = PathSpec.from_lines(
                GitWildMatchPattern, observation.content.splitlines()
            )
        except Exception as e:
            logger.warning(e)
            return file_list
        file_list = [entry for entry in file_list if not spec.match_file(entry)]
        return file_list

    try:
        file_list = await filter_for_gitignore(file_list, '')
    except AgentRuntimeUnavailableError as e:
        logger.error(f'Error filtering files: {e}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Error filtering files: {e}'},
        )

    return file_list


# NOTE: We use response_model=None for endpoints that can return multiple response types
# (like FileResponse | JSONResponse). This is because FastAPI's response_model expects a
# Pydantic model, but Starlette response classes like FileResponse are not Pydantic models.
# Instead, we document the possible responses using the 'responses' parameter and maintain
# proper type annotations for mypy.
@app.get(
    '/select-file',
    response_model=None,
    responses={
        200: {'description': 'File content returned as JSON', 'model': dict[str, str]},
        500: {'description': 'Error opening file', 'model': dict},
        415: {'description': 'Unsupported media type', 'model': dict},
    },
)
async def select_file(
    file: str, conversation: ServerConversation = Depends(get_conversation)
) -> FileResponse | JSONResponse:
    """Retrieve the content of a specified file.

    To select a file:
    ```sh
    curl http://localhost:3000/api/conversations/{conversation_id}select-file?file=<file_path>
    ```

    Args:
        file (str): The path of the file to be retrieved.
            Expect path to be absolute inside the runtime.
        request (Request): The incoming request object.

    Returns:
        dict: A dictionary containing the file content.

    Raises:
        HTTPException: If there's an error opening the file.
    """
    runtime: Runtime = conversation.runtime

    file = os.path.join(runtime.config.workspace_mount_path_in_sandbox, file)
    read_action = FileReadAction(file)
    try:
        observation = await call_sync_from_async(runtime.run_action, read_action)
    except AgentRuntimeUnavailableError as e:
        logger.error(f'Error opening file {file}: {e}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Error opening file: {e}'},
        )

    if isinstance(observation, FileReadObservation):
        content = observation.content
        return JSONResponse(content={'code': content})
    elif isinstance(observation, ErrorObservation):
        logger.error(f'Error opening file {file}: {observation}')

        if 'ERROR_BINARY_FILE' in observation.message:
            return JSONResponse(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                content={'error': f'Unable to open binary file: {file}'},
            )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Error opening file: {observation}'},
        )
    else:
        # Handle unexpected observation types
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Unexpected observation type: {type(observation)}'},
        )


@app.get(
    '/zip-directory',
    response_model=None,
    responses={
        200: {'description': 'Zipped workspace returned as FileResponse'},
        500: {'description': 'Error zipping workspace', 'model': dict},
    },
)
def zip_current_workspace(
    conversation: ServerConversation = Depends(get_conversation),
) -> FileResponse | JSONResponse:
    try:
        logger.debug('Zipping workspace')
        runtime: Runtime = conversation.runtime
        path = runtime.config.workspace_mount_path_in_sandbox
        try:
            zip_file_path = runtime.copy_from(path)
        except AgentRuntimeUnavailableError as e:
            logger.error(f'Error zipping workspace: {e}')
            return JSONResponse(
                status_code=500,
                content={'error': f'Error zipping workspace: {e}'},
            )
        return FileResponse(
            path=zip_file_path,
            filename='workspace.zip',
            media_type='application/zip',
            background=BackgroundTask(lambda: os.unlink(zip_file_path)),
        )
    except Exception as e:
        logger.error(f'Error zipping workspace: {e}')
        raise HTTPException(
            status_code=500,
            detail='Failed to zip workspace',
        )


@app.get(
    '/git/changes',
    response_model=list[dict[str, str]],
    responses={
        404: {'description': 'Not a git repository', 'model': dict},
        500: {'description': 'Error getting changes', 'model': dict},
    },
)
async def git_changes(
    conversation: ServerConversation = Depends(get_conversation),
    conversation_store: ConversationStore = Depends(get_conversation_store),
    user_id: str = Depends(get_user_id),
) -> list[dict[str, str]] | JSONResponse:
    runtime: Runtime = conversation.runtime
    cwd = runtime.config.workspace_mount_path_in_sandbox
    logger.info(f'Getting git changes in {cwd}')

    try:
        changes = await call_sync_from_async(runtime.get_git_changes, cwd)
        if changes is None:
            return JSONResponse(
                status_code=404,
                content={'error': 'Not a git repository'},
            )
        return changes
    except AgentRuntimeUnavailableError as e:
        logger.error(f'Runtime unavailable: {e}')
        return JSONResponse(
            status_code=500,
            content={'error': f'Error getting changes: {e}'},
        )
    except Exception as e:
        logger.error(f'Error getting changes: {e}')
        return JSONResponse(
            status_code=500,
            content={'error': str(e)},
        )


@app.get(
    '/git/diff',
    response_model=dict[str, Any],
    responses={500: {'description': 'Error getting diff', 'model': dict}},
)
async def git_diff(
    path: str,
    conversation_store: Any = Depends(get_conversation_store),
    conversation: ServerConversation = Depends(get_conversation),
) -> dict[str, Any] | JSONResponse:
    runtime: Runtime = conversation.runtime

    cwd = await get_cwd(
        conversation_store,
        conversation.sid,
        runtime.config.workspace_mount_path_in_sandbox,
    )

    try:
        diff = await call_sync_from_async(runtime.get_git_diff, path, cwd)
        return diff
    except AgentRuntimeUnavailableError as e:
        logger.error(f'Error getting diff: {e}')
        return JSONResponse(
            status_code=500,
            content={'error': f'Error getting diff: {e}'},
        )


async def get_cwd(
    conversation_store: ConversationStore,
    conversation_id: str,
    workspace_mount_path_in_sandbox: str,
) -> str:
    metadata = await conversation_store.get_metadata(conversation_id)
    cwd = workspace_mount_path_in_sandbox
    if metadata and metadata.selected_repository:
        repo_dir = metadata.selected_repository.split('/')[-1]
        cwd = os.path.join(cwd, repo_dir)

    return cwd


@app.post('/upload-files', response_model=POSTUploadFilesModel)
async def upload_files(
    files: list[UploadFile],
    conversation: ServerConversation = Depends(get_conversation),
):
    uploaded_files = []
    skipped_files = []
    runtime: Runtime = conversation.runtime

    for file in files:
        file_path = os.path.join(
            runtime.config.workspace_mount_path_in_sandbox, str(file.filename)
        )
        try:
            file_content = await file.read()
            write_action = FileWriteAction(
                # TODO: DISCUSS UTF8 encoding here
                path=file_path,
                content=file_content.decode('utf-8', errors='replace'),
            )
            # TODO: DISCUSS file name unique issues
            await call_sync_from_async(runtime.run_action, write_action)
            uploaded_files.append(file_path)
        except Exception as e:
            skipped_files.append({'name': file.filename, 'reason': str(e)})
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            'uploaded_files': uploaded_files,
            'skipped_files': skipped_files,
        },
    )


# 权限验证辅助函数
async def has_conversation_access(user_id: str, conversation_id: str) -> bool:
    """检查用户是否有权访问指定会话的文件"""
    try:
        # 简化实现：暂时允许所有认证用户访问任何会话
        # 在生产环境中，这里应该实现具体的权限检查逻辑
        # 例如：检查用户是否是会话的创建者或参与者
        
        # 基础验证：确保conversation_id和user_id都存在
        if not conversation_id or not conversation_id.strip():
            logger.warning(f"Invalid conversation_id: {conversation_id}")
            return False
            
        if not user_id or not user_id.strip():
            logger.warning(f"Invalid user_id: {user_id}")
            return False
        
        # TODO: 实际的权限检查逻辑
        # 这里可以查询数据库，检查用户是否有权限访问该会话
        # 目前为了功能实现，暂时返回True
        logger.debug(f"Access granted for user {user_id} to conversation {conversation_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error checking conversation access for {user_id}/{conversation_id}: {e}")
        return False


# 新增：文件预览路由（支持会话隔离）
preview_app = APIRouter(prefix='/api/files', dependencies=get_dependencies())


@preview_app.get(
    '/preview/{conversation_id}/{file_path:path}',
    response_model=None,
    responses={
        200: {'description': 'Preview content returned', 'model': dict[str, str]},
        403: {'description': 'Access denied', 'model': dict},
        404: {'description': 'File not found', 'model': dict},
        500: {'description': 'Internal server error', 'model': dict},
    },
)
async def preview_file(
    conversation_id: str, file_path: str, user_id: str = Depends(get_user_id)
) -> Response:
    """
    获取指定会话的文件预览内容
    
    Args:
        conversation_id: 会话ID，用于文件隔离
        file_path: 文件相对路径
        user_id: 用户ID
        
    Returns:
        处理后的文件内容或错误信息
    """
    try:
        # 1. 权限验证：检查用户是否可以访问此会话
        if not await has_conversation_access(user_id, conversation_id):
            logger.warning(f"No conversation access: {conversation_id}, user: {user_id}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={'error': 'No access to this conversation'}
            )
        
        # 2. 构建会话隔离的文件路径
        from pathlib import Path
        conversation_workspace = Path(file_preview_service.workspace_base) / conversation_id
        resolved_path = conversation_workspace / file_path
        
        # 3. 安全验证
        if not file_access_validator.validate_file_access(resolved_path, user_id):
            logger.warning(f"Access denied: {conversation_id}/{file_path}, user: {user_id}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={'error': 'Access denied'}
            )
        
        # 4. 获取预览内容
        import os
        frontend_base_path = os.getenv('FRONTEND_BASE_PATH', '/openhands')
        base_url = f"{frontend_base_path}"
        
        content, content_type = await file_preview_service.get_preview_content_for_conversation(
            conversation_id, file_path, base_url
        )
        
        # 5. 如果是HTML文件，进行额外处理
        if content_type == 'text/html':
            # 使用会话隔离的资源URL
            assets_base_url = f"{base_url}/api/files/assets/{conversation_id}"
            html_processor = create_html_processor(assets_base_url, development_mode=True)
            content = html_processor.process_html_content(content, file_path)
            
            return Response(
                content=content,
                media_type=content_type,
                headers={
                    'X-Frame-Options': 'SAMEORIGIN',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Conversation-ID': conversation_id
                }
            )
        else:
            # 6. 对于其他文件类型，返回JSON格式
            return JSONResponse(
                content={
                    'content': content,
                    'content_type': content_type,
                    'file_path': file_path,
                    'conversation_id': conversation_id
                }
            )
            
    except FileNotFoundError:
        logger.info(f"File not found: {conversation_id}/{file_path}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={'error': f'File not found: {file_path}'}
        )
    except Exception as e:
        logger.error(f"Error previewing file {conversation_id}/{file_path}: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Internal server error: {str(e)}'}
        )


@preview_app.get(
    '/assets/{conversation_id}/{file_path:path}',
    response_model=None,
    responses={
        200: {'description': 'Static asset returned'},
        403: {'description': 'Access denied', 'model': dict},
        404: {'description': 'File not found', 'model': dict},
        500: {'description': 'Internal server error', 'model': dict},
    },
)
async def get_static_asset(
    conversation_id: str, file_path: str, user_id: str = Depends(get_user_id)
) -> Response:
    """
    获取指定会话的静态资源文件
    
    Args:
        conversation_id: 会话ID，用于文件隔离
        file_path: 文件相对路径
        user_id: 用户ID
        
    Returns:
        二进制文件内容或错误信息
    """
    try:
        # 1. 权限验证：检查用户是否可以访问此会话
        if not await has_conversation_access(user_id, conversation_id):
            logger.warning(f"No conversation access for asset: {conversation_id}, user: {user_id}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={'error': 'No access to this conversation'}
            )
        
        # 2. 构建会话隔离的文件路径
        from pathlib import Path
        conversation_workspace = Path(file_preview_service.workspace_base) / conversation_id
        resolved_path = conversation_workspace / file_path
        
        # 3. 安全验证
        if not file_access_validator.validate_file_access(resolved_path, user_id):
            logger.warning(f"Access denied for asset: {conversation_id}/{file_path}, user: {user_id}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={'error': 'Access denied'}
            )
        
        # 4. 获取静态资源
        binary_content, content_type = await file_preview_service.get_static_asset_for_conversation(
            conversation_id, file_path
        )
        
        # 5. 返回二进制内容
        return Response(
            content=binary_content,
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=3600',  # 1小时缓存
                'X-Content-Type-Options': 'nosniff',
                'X-Conversation-ID': conversation_id
            }
        )
        
    except FileNotFoundError:
        logger.info(f"Asset not found: {conversation_id}/{file_path}")
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={'error': f'Asset not found: {file_path}'}
        )
    except Exception as e:
        logger.error(f"Error serving asset {conversation_id}/{file_path}: {str(e)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={'error': f'Internal server error: {str(e)}'}
        )
