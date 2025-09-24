# LLM代理接口使用指南

## 概述

LLM代理接口为OpenHands主容器提供了统一的LLM模型调用能力，支持Claude、Kimi、O3三种模型的标准API格式，并自动转换为公司内网代理LLM接口格式。

## 接口地址

基础地址：`http://localhost:5002/openhands/api/llm-proxy` (开发环境) 或 `http://localhost:5000/openhands/api/llm-proxy` (生产环境)

**注意**: URL必须包含`/openhands`前缀，这是由`FRONTEND_BASE_PATH`环境变量配置的。

## 支持的模型

### Claude模型
- `claude-sonnet-4-20250514`
- `claude-3-5-sonnet-20241022` 
- `claude-3-5-sonnet`

### Kimi模型
- `moonshot-v1-8k`
- `kimi-k2-0711-preview`

### O3模型
- `o3`
- `o3-2025-04-16`
- `o3-mini`

## API接口

### 1. Claude API兼容接口

#### 请求格式
```bash
POST /openhands/api/llm-proxy/claude/chat/completions
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "temperature": 0.0,
  "system": "你是一个有用的AI助手",
  "messages": [
    {
      "role": "user",
      "content": "请介绍一下李小龙"
    }
  ]
}
```

#### curl示例
```bash
curl -X POST http://localhost:5002/openhands/api/llm-proxy/claude/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: claude-test-001" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "temperature": 0.0,
    "messages": [
      {
        "role": "user",
        "content": "请介绍一下李小龙"
      }
    ]
  }'
```

### 2. OpenAI API兼容接口

#### 请求格式
```bash
POST /openhands/api/llm-proxy/openai/chat/completions
Content-Type: application/json

{
  "model": "o3",
  "temperature": 0.0,
  "max_completion_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "请介绍一下李小龙"
    }
  ]
}
```

#### curl示例 - O3模型
```bash
curl -X POST http://localhost:5002/openhands/api/llm-proxy/openai/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: o3-test-001" \
  -d '{
    "model": "o3",
    "temperature": 0.0,
    "max_completion_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "请介绍一下李小龙"
      }
    ]
  }'
```

#### curl示例 - Kimi模型
```bash
curl -X POST http://localhost:5002/openhands/api/llm-proxy/openai/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Trace-Id: kimi-test-001" \
  -d '{
    "model": "kimi-k2-0711-preview",
    "temperature": 0.0,
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "请介绍一下李小龙"
      }
    ]
  }'
```

### 3. 带工具调用的请求示例

```bash
curl -X POST http://localhost:5002/openhands/api/llm-proxy/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "o3",
    "temperature": 0.0,
    "max_completion_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "今天的天气怎么样？"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "获取指定城市的天气信息",
          "parameters": {
            "type": "object",
            "properties": {
              "city": {
                "type": "string",
                "description": "城市名称"
              }
            },
            "required": ["city"]
          }
        }
      }
    ],
    "tool_choice": "auto"
  }'
```

### 4. 管理接口

#### 查看支持的模型
```bash
curl -X GET http://localhost:5002/openhands/api/llm-proxy/models
```

#### 健康检查
```bash
curl -X GET http://localhost:5002/openhands/api/llm-proxy/health
```

## 响应格式

所有接口都返回内网代理的原始响应，保持与OpenAI API兼容的格式：

```json
{
  "choices": [
    {
      "content_filter_results": {
        "hate": {"filtered": false, "severity": "safe"},
        "protected_material_code": {"filtered": false, "detected": false},
        "protected_material_text": {"filtered": false, "detected": false},
        "self_harm": {"filtered": false, "severity": "safe"},
        "sexual": {"filtered": false, "severity": "safe"},
        "violence": {"filtered": false, "severity": "safe"}
      },
      "finish_reason": "stop",
      "index": 0,
      "logprobs": null,
      "message": {
        "annotations": [],
        "content": "李小龙（Bruce Lee，1940年11月27日-1973年7月20日）...",
        "refusal": null,
        "role": "assistant"
      }
    }
  ],
  "created": 1758589785,
  "id": "chatcmpl-CIlpJv5WwgzFRcP05Q4Nye0l5gBDN",
  "model": "o3-2025-04-16",
  "object": "chat.completion",
  "prompt_filter_results": [...],
  "system_fingerprint": null,
  "usage": {
    "completion_tokens": 6002,
    "completion_tokens_details": {
      "accepted_prediction_tokens": 0,
      "audio_tokens": 0,
      "reasoning_tokens": 5440,
      "rejected_prediction_tokens": 0
    },
    "prompt_tokens": 16,
    "prompt_tokens_details": {
      "audio_tokens": 0,
      "cached_tokens": 0
    },
    "total_tokens": 6018
  }
}
```

## 配置要求

### 1. API密钥配置

接口需要从 `/.openhands/settings.json` 文件中读取 `llm_api_key`：

```json
{
  "llm_api_key": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "其他配置": "..."
}
```

### 2. 内网连接

确保主容器能够访问以下内网地址：
- `http://172.21.54.74:28000/vtuber/ai_access/claude/v3/chat/completions`
- `http://172.21.54.74:28000/vtuber/ai_access/kimi_moonshot/v2/chat/completions`
- `http://172.21.54.74:28000/vtuber/ai_access/chatgpt/v3/chat/completions`

## 错误处理

### 常见错误码

- `400` - 不支持的模型或请求参数错误
- `500` - API密钥配置错误或文件读取失败
- `502` - 内网代理连接失败或响应格式错误
- `503` - 服务不健康
- `504` - 请求超时

### 错误响应示例

```json
{
  "detail": "Unsupported model: gpt-4"
}
```

## 测试方法

### 1. 验证服务状态
```bash
curl -X GET http://localhost:5002/openhands/api/llm-proxy/health
```

### 2. 查看支持的模型
```bash
curl -X GET http://localhost:5002/openhands/api/llm-proxy/models
```

### 3. 测试基本对话
```bash
curl -X POST http://localhost:5002/openhands/api/llm-proxy/openai/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "o3",
    "messages": [{"role": "user", "content": "你好"}],
    "max_completion_tokens": 100
  }'
```

## 使用注意事项

1. **API密钥安全**: 每次请求都会重新读取API密钥，确保密钥的实时性，但不会缓存以保证安全性

2. **请求头部**: 可以通过 `X-Trace-Id` 头部传递自定义追踪ID，用于日志跟踪

3. **模型类型**: 不同接口端点对应不同的模型类型，确保使用正确的端点

4. **超时设置**: 默认请求超时时间为120秒，适合处理复杂的推理任务

5. **日志记录**: 所有请求都会记录详细日志，便于问题排查

## 集成示例

### Python示例

```python
import httpx
import json

async def call_llm_proxy(model: str, messages: list, **kwargs):
    """调用LLM代理接口"""
    
    # 根据模型类型选择端点
    if model.startswith('claude'):
        endpoint = '/api/llm-proxy/claude/chat/completions'
        data = {
            'model': model,
            'messages': messages,
            'max_tokens': kwargs.get('max_tokens', 1024),
            'temperature': kwargs.get('temperature', 0.0)
        }
    else:
        endpoint = '/api/llm-proxy/openai/chat/completions'
        data = {
            'model': model,
            'messages': messages,
            'max_completion_tokens': kwargs.get('max_tokens', 1024),
            'temperature': kwargs.get('temperature', 0.0)
        }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f'http://localhost:5002/openhands{endpoint}',
            json=data,
            headers={'Content-Type': 'application/json'}
        )
        return response.json()

# 使用示例
messages = [{'role': 'user', 'content': '你好'}]
result = await call_llm_proxy('o3', messages, max_tokens=100)
print(result['choices'][0]['message']['content'])
```

这个LLM代理接口现在已经完全实现，可以开始使用了！