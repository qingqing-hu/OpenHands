import os
import httpx
import time
from typing import Any, Dict

from openai import OpenAI


# ==================================================================================================
# OPENAI
# TODO: Move this to EventStream Actions when DockerRuntime is fully implemented
# NOTE: we need to get env vars inside functions because they will be set in IPython
# AFTER the agentskills is imported (the case for DockerRuntime)
# ==================================================================================================
def _get_openai_api_key() -> str:
    return os.getenv('OPENAI_API_KEY', os.getenv('SANDBOX_ENV_OPENAI_API_KEY', ''))


def _get_openai_base_url() -> str:
    return os.getenv('OPENAI_BASE_URL', 'https://api.openai.com/v1')


def _get_openai_model() -> str:
    return os.getenv('OPENAI_MODEL', 'gpt-4o')


def _get_max_token() -> int:
    return int(os.getenv('MAX_TOKEN', '500'))


def _is_custom_proxy() -> bool:
    """检查是否使用内网代理"""
    return os.getenv('USE_TOKEN_AUTH', 'false').lower() == 'true'


def _get_response_wrapper_field() -> str:
    """获取响应包装字段"""
    return os.getenv('RESPONSE_WRAPPER_FIELD', '')


class CustomProxyHTTPClient(httpx.Client):
    """自定义 HTTP 客户端，支持内网代理的 token 认证和响应解包"""
    
    def __init__(self, api_key: str, response_wrapper_field: str = '', **kwargs):
        super().__init__(**kwargs)
        self.api_key = api_key
        self.response_wrapper_field = response_wrapper_field
    
    def request(self, method: str, url: str, **kwargs) -> httpx.Response:
        # 修改请求头，使用 token 认证
        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        
        kwargs['headers']['token'] = self.api_key
        kwargs['headers']['X-Trace-Id'] = str(int(time.time() * 1000000))
        kwargs['headers']['Content-Type'] = 'application/json'
        
        # 发送请求
        response = super().request(method, url, **kwargs)
        
        # 如果需要解包响应数据
        if self.response_wrapper_field and response.headers.get('content-type', '').startswith('application/json'):
            try:
                original_json = response.json()
                if self.response_wrapper_field in original_json:
                    # 获取解包后的数据
                    unwrapped_data = original_json[self.response_wrapper_field]
                    
                    # 重新构造响应内容
                    import json
                    new_content = json.dumps(unwrapped_data).encode('utf-8')
                    
                    # 创建新的响应对象
                    new_response = httpx.Response(
                        status_code=response.status_code,
                        headers=response.headers,
                        content=new_content,
                        request=response.request
                    )
                    return new_response
            except Exception:
                pass  # 如果解包失败，使用原始响应
        
        return response


def _get_openai_client() -> OpenAI:
    if _is_custom_proxy():
        # 使用自定义代理配置
        api_key = _get_openai_api_key()
        base_url = _get_openai_base_url()
        response_wrapper_field = _get_response_wrapper_field()
        
        # 创建自定义 HTTP 客户端
        http_client = CustomProxyHTTPClient(
            api_key=api_key,
            response_wrapper_field=response_wrapper_field,
            timeout=120.0
        )
        
        # 创建 OpenAI 客户端，使用自定义 HTTP 客户端
        client = OpenAI(
            api_key=api_key,  # 这里仍然需要传递，虽然实际认证在 HTTP 客户端中处理
            base_url=base_url,
            http_client=http_client
        )
        return client
    else:
        # 使用标准 OpenAI 配置
        client = OpenAI(api_key=_get_openai_api_key(), base_url=_get_openai_base_url())
        return client
