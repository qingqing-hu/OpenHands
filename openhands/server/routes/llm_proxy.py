"""
LLM代理路由模块

支持Claude、Kimi、O3三种模型的请求格式转换和内网代理调用。
将标准API格式转换为公司内网代理LLM接口格式。
"""

import json
import os
import time
from typing import Any, Dict, List, Optional, Union

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from openhands.core.logger import openhands_logger as logger

app = APIRouter(prefix='/api/llm-proxy')

# 模型配置映射
MODEL_CONFIGS = {
    'claude-sonnet-4-20250514': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/claude/v3/chat/completions',
        'type': 'claude'
    },
    'claude-3-5-sonnet-20241022': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/claude/v3/chat/completions',
        'type': 'claude'
    },
    'claude-3-5-sonnet': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/claude/v3/chat/completions',
        'type': 'claude'
    },
    'moonshot-v1-8k': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/kimi_moonshot/v2/chat/completions',
        'type': 'kimi'
    },
    'kimi-k2-0711-preview': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/kimi_moonshot/v2/chat/completions',
        'type': 'kimi'
    },
    'o3': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/chatgpt/v3/chat/completions',
        'type': 'o3'
    },
    'o3-2025-04-16': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/chatgpt/v3/chat/completions',
        'type': 'o3'
    },
    'o3-mini': {
        'url': 'http://172.21.54.74:28000/vtuber/ai_access/chatgpt/v3/chat/completions',
        'type': 'o3'
    }
}

# 固定的请求头部
FIXED_HEADERS = {
    'host': 'arsenal-openai-server',
    'X-Arsenal-Auth': 'arsenal-tools',
    'Content-Type': 'application/json'
}


class Message(BaseModel):
    """消息模型 - 支持OpenAI完整格式"""
    role: str
    content: Union[str, List[Dict[str, Any]], None] = None
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    tool_call_id: Optional[str] = None


class ClaudeRequest(BaseModel):
    """Claude API请求格式"""
    model: str
    max_tokens: Optional[int] = 1024
    messages: List[Message]
    temperature: Optional[float] = 0.0
    system: Optional[str] = None


class OpenAIRequest(BaseModel):
    """OpenAI/Kimi兼容API请求格式"""
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.0
    max_tokens: Optional[int] = None
    max_completion_tokens: Optional[int] = None
    tools: Optional[List[Dict[str, Any]]] = None
    tool_choice: Optional[Any] = None


def read_llm_api_key() -> str:
    """
    从/.openhands/settings.json文件中读取llm_api_key
    
    Returns:
        str: LLM API Key
        
    Raises:
        HTTPException: 当文件不存在或读取失败时
    """
    settings_path = '/.openhands/settings.json'
    
    try:
        if not os.path.exists(settings_path):
            logger.error(f'Settings file not found: {settings_path}')
            raise HTTPException(status_code=500, detail='Settings file not found')
        
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        api_key = settings.get('llm_api_key')
        if not api_key:
            logger.error('llm_api_key not found in settings.json')
            raise HTTPException(status_code=500, detail='LLM API key not configured')
        
        logger.info(f'Successfully read LLM API key from {settings_path}')
        return api_key
        
    except json.JSONDecodeError as e:
        logger.error(f'Failed to parse settings.json: {e}')
        raise HTTPException(status_code=500, detail='Invalid settings file format')
    except Exception as e:
        logger.error(f'Failed to read LLM API key: {e}')
        raise HTTPException(status_code=500, detail='Failed to read API key')


def convert_claude_to_internal(request: ClaudeRequest) -> Dict[str, Any]:
    """
    将Claude API格式转换为内网代理格式
    
    Args:
        request: Claude请求对象
        
    Returns:
        Dict: 内网代理请求格式
    """
    logger.info(f'Converting Claude request for model: {request.model}')
    
    # Claude的消息格式转换为OpenAI兼容格式
    messages = []
    
    # 如果有system消息，添加到messages的开头
    if request.system:
        messages.append({
            'role': 'system',
            'content': request.system
        })
    
    # 添加用户消息，保持完整的消息格式
    for msg in request.messages:
        message_dict = {'role': msg.role}
        if msg.content is not None:
            message_dict['content'] = msg.content
        if msg.name is not None:
            message_dict['name'] = msg.name
        if msg.tool_calls is not None:
            message_dict['tool_calls'] = msg.tool_calls
        if msg.tool_call_id is not None:
            message_dict['tool_call_id'] = msg.tool_call_id
        messages.append(message_dict)
    
    return {
        'model': request.model,
        'messages': messages,
        'max_tokens': request.max_tokens,
        'temperature': request.temperature
    }


def convert_openai_to_internal(request: OpenAIRequest) -> Dict[str, Any]:
    """
    将OpenAI/Kimi API格式转换为内网代理格式
    
    Args:
        request: OpenAI请求对象
        
    Returns:
        Dict: 内网代理请求格式
    """
    logger.info(f'Converting OpenAI/Kimi request for model: {request.model}')
    
    # 获取模型配置
    model_config = MODEL_CONFIGS.get(request.model, {})
    
    # 构建请求数据，保持完整的消息格式
    messages = []
    for msg in request.messages:
        message_dict = {'role': msg.role}
        if msg.content is not None:
            message_dict['content'] = msg.content
        if msg.name is not None:
            message_dict['name'] = msg.name
        if msg.tool_calls is not None:
            message_dict['tool_calls'] = msg.tool_calls
        if msg.tool_call_id is not None:
            message_dict['tool_call_id'] = msg.tool_call_id
        messages.append(message_dict)
    
    internal_request = {
        'model': request.model,
        'messages': messages
    }
    
    # 添加可选参数 - O3模型的temperature限制处理
    if request.temperature is not None:
        model_type = model_config.get('type', '')
        if model_type == 'o3':
            # O3模型只支持默认temperature(1.0)，忽略用户设置的temperature
            logger.info(f'Ignoring temperature={request.temperature} for O3 model (using default)')
            # 不设置temperature参数，使用默认值
        else:
            internal_request['temperature'] = request.temperature
    
    # 处理max_tokens参数 - O3模型只支持max_completion_tokens
    max_tokens = request.max_completion_tokens or request.max_tokens
    if max_tokens is not None:
        # O3模型使用max_completion_tokens，其他模型可以使用max_tokens
        model_type = model_config.get('type', '')
        if model_type == 'o3':
            internal_request['max_completion_tokens'] = max_tokens
            logger.info(f'Using max_completion_tokens={max_tokens} for O3 model')
        else:
            internal_request['max_tokens'] = max_tokens
            logger.info(f'Using max_tokens={max_tokens} for {model_type} model')
    
    # 添加工具调用参数 - O3模型的函数名长度限制处理
    if request.tools is not None:
        model_type = model_config.get('type', '')
        if model_type == 'o3':
            # O3模型对函数名有64字符限制，需要处理过长的函数名
            processed_tools = []
            for tool in request.tools:
                processed_tool = tool.copy()
                if 'function' in processed_tool and 'name' in processed_tool['function']:
                    original_name = processed_tool['function']['name']
                    if len(original_name) > 64:
                        # 截断函数名并添加后缀以保持唯一性
                        truncated_name = original_name[:60] + '_' + str(hash(original_name) % 1000)
                        processed_tool['function']['name'] = truncated_name
                        logger.info(f'Truncated function name for O3 model: {original_name} -> {truncated_name}')
                processed_tools.append(processed_tool)
            internal_request['tools'] = processed_tools
        else:
            internal_request['tools'] = request.tools
    
    if request.tool_choice is not None:
        internal_request['tool_choice'] = request.tool_choice
    
    return internal_request


def prepare_internal_headers(trace_id: Optional[str] = None) -> Dict[str, str]:
    """
    准备内网代理请求头部
    
    Args:
        trace_id: 可选的追踪ID
        
    Returns:
        Dict: 完整的请求头部
    """
    # 读取API密钥
    api_key = read_llm_api_key()
    
    # 构建请求头
    headers = FIXED_HEADERS.copy()
    headers['token'] = api_key
    
    # 添加追踪ID
    if not trace_id:
        trace_id = str(int(time.time() * 1000000))
    headers['X-Trace-Id'] = trace_id
    
    logger.info(f'Prepared headers with trace ID: {trace_id}')
    return headers


async def call_internal_proxy(
    url: str, 
    request_data: Dict[str, Any], 
    headers: Dict[str, str],
    timeout: int = 120
) -> Dict[str, Any]:
    """
    调用内网代理LLM接口
    
    Args:
        url: 内网代理URL
        request_data: 请求数据
        headers: 请求头部
        timeout: 超时时间（秒）
        
    Returns:
        Dict: 响应数据
        
    Raises:
        HTTPException: 请求失败时
    """
    logger.info(f'Calling internal proxy: {url}')
    logger.debug(f'Request data: {request_data}')
    logger.debug(f'Request headers: {list(headers.keys())}')
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                json=request_data,
                headers=headers
            )
            
            logger.info(f'Received response with status: {response.status_code}')
            
            # 解析响应
            response_data = response.json()
            logger.info(f'Successfully received response from internal proxy')
            logger.debug(f'Response keys: {list(response_data.keys())}')
            
            # 检查是否是错误响应
            if response.status_code != 200:
                logger.error(f'Internal proxy returned error: {response.status_code} - {response_data}')
                # 如果内网代理返回的是错误信息，需要转换为标准错误格式
                error_message = response_data.get('message', str(response_data))
                raise HTTPException(
                    status_code=400,
                    detail=f'LLM service error: {error_message}'
                )
            
            # 检查响应是否包含错误信息
            # 检查标准错误字段
            if 'error' in response_data:
                error_info = response_data['error']
                error_message = error_info.get('message', str(error_info))
                logger.error(f'Internal proxy returned error in response: {error_message}')
                raise HTTPException(
                    status_code=400,
                    detail=f'LLM service error: {error_message}'
                )
            
            # 检查内网代理特有的错误格式
            if response_data.get('success') == False or 'status_msg' in response_data:
                status_msg = response_data.get('status_msg', '')
                if status_msg:
                    try:
                        # 尝试解析status_msg中的JSON错误信息
                        import json
                        error_data = json.loads(status_msg)
                        error_message = error_data.get('message', status_msg)
                    except:
                        error_message = status_msg
                else:
                    error_message = 'Unknown error from internal proxy'
                
                logger.error(f'Internal proxy returned error via status_msg: {error_message}')
                raise HTTPException(
                    status_code=400,
                    detail=f'LLM service error: {error_message}'
                )
            
            return response_data
            
    except httpx.TimeoutException as e:
        logger.error(f'Request timeout: {e}')
        raise HTTPException(status_code=504, detail='Request timeout')
    except httpx.RequestError as e:
        logger.error(f'Request error: {e}')
        raise HTTPException(status_code=502, detail='Failed to connect to internal proxy')
    except json.JSONDecodeError as e:
        logger.error(f'Failed to parse response JSON: {e}')
        raise HTTPException(status_code=502, detail='Invalid response format from internal proxy')
    except Exception as e:
        logger.error(f'Unexpected error: {e}')
        raise HTTPException(status_code=500, detail='Internal server error')


@app.post('/claude/chat/completions')
async def claude_chat_completions(request: ClaudeRequest, http_request: Request):
    """
    Claude API兼容接口
    
    接受Claude格式的请求，转换为内网代理格式并调用相应的内网接口
    """
    logger.info(f'Received Claude chat completion request for model: {request.model}')
    
    # 检查模型是否支持
    if request.model not in MODEL_CONFIGS:
        logger.error(f'Unsupported model: {request.model}')
        raise HTTPException(status_code=400, detail=f'Unsupported model: {request.model}')
    
    model_config = MODEL_CONFIGS[request.model]
    if model_config['type'] != 'claude':
        logger.error(f'Model {request.model} is not a Claude model')
        raise HTTPException(status_code=400, detail=f'Model {request.model} is not a Claude model')
    
    try:
        # 转换请求格式
        internal_request = convert_claude_to_internal(request)
        
        # 准备请求头部
        trace_id = http_request.headers.get('X-Trace-Id')
        headers = prepare_internal_headers(trace_id)
        
        # 调用内网代理
        response_data = await call_internal_proxy(
            model_config['url'],
            internal_request,
            headers
        )
        
        logger.info(f'Successfully processed Claude request for model: {request.model}')
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Failed to process Claude request: {e}')
        raise HTTPException(status_code=500, detail='Failed to process request')


@app.post('/openai/chat/completions')
async def openai_chat_completions(request: OpenAIRequest, http_request: Request):
    """
    OpenAI API兼容接口
    
    接受OpenAI/Kimi/O3格式的请求，转换为内网代理格式并调用相应的内网接口
    """
    logger.info(f'Received OpenAI chat completion request for model: {request.model}')
    
    # 检查模型是否支持
    if request.model not in MODEL_CONFIGS:
        logger.error(f'Unsupported model: {request.model}')
        raise HTTPException(status_code=400, detail=f'Unsupported model: {request.model}')
    
    model_config = MODEL_CONFIGS[request.model]
    
    try:
        # 转换请求格式
        internal_request = convert_openai_to_internal(request)
        
        # 准备请求头部
        trace_id = http_request.headers.get('X-Trace-Id')
        headers = prepare_internal_headers(trace_id)
        
        # 调用内网代理
        response_data = await call_internal_proxy(
            model_config['url'],
            internal_request,
            headers
        )
        
        logger.info(f'Successfully processed OpenAI request for model: {request.model}')
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f'Failed to process OpenAI request: {e}')
        raise HTTPException(status_code=500, detail='Failed to process request')


@app.get('/models')
async def list_models():
    """
    列出支持的模型
    
    Returns:
        Dict: 支持的模型列表
    """
    logger.info('Received list models request')
    
    models = []
    for model_name, config in MODEL_CONFIGS.items():
        models.append({
            'id': model_name,
            'object': 'model',
            'created': int(time.time()),
            'owned_by': 'openhands',
            'type': config['type'],
            'url': config['url']
        })
    
    return {
        'object': 'list',
        'data': models
    }


@app.get('/health')
async def health_check():
    """
    健康检查接口
    
    Returns:
        Dict: 健康状态
    """
    logger.info('Health check request')
    
    try:
        # 尝试读取API密钥以验证配置
        api_key = read_llm_api_key()
        
        return {
            'status': 'healthy',
            'timestamp': int(time.time()),
            'api_key_configured': bool(api_key),
            'supported_models': len(MODEL_CONFIGS)
        }
    except Exception as e:
        logger.error(f'Health check failed: {e}')
        raise HTTPException(status_code=503, detail='Service unhealthy')