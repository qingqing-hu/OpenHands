# Claudable项目技术分析报告

## 项目概述

Claudable是一个创新的Web应用平台，它结合了Claude Code、Cursor CLI、Gemini CLI、Qwen Code等多种AI编程助手，提供了统一的web界面来与这些大模型进行交互，专门用于构建现代全栈web应用程序。该项目基于Monorepo架构，使用Next.js作为前端框架，FastAPI作为后端API服务。

## 核心技术架构

### 1. 整体架构设计
- **架构模式**: 前后端分离 + WebSocket实时通信
- **项目结构**: Monorepo (apps/api + apps/web)
- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **后端**: FastAPI + SQLAlchemy + SQLite/PostgreSQL
- **实时通信**: WebSocket + Server-Sent Events

### 2. Claude交互核心流程

#### 2.1 Claude Code SDK集成 (`apps/api/app/services/claude_act.py`)
```python
# 核心函数: generate_diff_with_logging
async def generate_diff_with_logging(
    instruction: str, 
    allow_globs: list[str], 
    repo_path: str,
    log_callback: Optional[Callable] = None,
    resume_session_id: Optional[str] = None,
    system_prompt: str = None
) -> Tuple[str, str, Optional[str]]:
```

**关键特性**:
- 使用claude-code-sdk>=0.0.20进行Claude Code集成
- 支持会话恢复 (resume_session_id)
- 实时日志回调机制 (log_callback)
- 动态系统提示词加载和缓存
- 工具使用跟踪 (Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS)

#### 2.2 系统提示词管理
- 动态加载: `app/prompt/system-prompt.md`
- 缓存机制: 内存缓存避免重复读取
- 回退策略: 文件不存在时使用内置默认提示词

#### 2.3 多CLI支持架构
项目支持多种AI编程助手:
- **Claude Code**: Anthropic官方编程助手
- **Cursor CLI**: Cursor编辑器的CLI版本
- **Codex CLI**: OpenAI Codex
- **Gemini CLI**: Google Gemini
- **Qwen Code**: 阿里巴巴Qwen模型

### 3. 数据库设计

#### 3.1 核心数据模型关系图
```
Project (项目管理)
├── active_claude_session_id
├── active_cursor_session_id  
├── preferred_cli (claude/cursor)
├── selected_model
└── fallback_enabled

Project → Messages (1:N)
Project → Sessions (1:N)
Project → UserRequests (1:N)
Project → ToolUsage (1:N)

Session → Messages (1:N)
Session → ToolUsage (1:N)
Session → UserRequests (1:N)

UserRequest → Message (1:1)
```

#### 3.2 关键数据表分析

**Projects表** (`projects.py:7`):
- 支持多CLI会话管理
- CLI偏好设置和回退机制
- 项目状态跟踪 (idle, running, stopped, error)

**Messages表** (`messages.py:10`):
- 统一消息模型 (chat, thinking, tool_use, tool_result, error)
- 支持消息线程和会话关联
- 性能和成本跟踪 (duration_ms, token_count, cost_usd)

**Sessions表** (`sessions.py:10`):
- Claude Code会话跟踪
- 转录文件管理
- 性能指标汇总

**UserRequests表** (`user_requests.py:11`):
- 韩语注释的用户请求状态跟踪
- 请求类型区分 (act vs chat)
- 完成状态和成功率监控

### 4. API设计

#### 4.1 核心API端点 (`apps/api/app/api/chat/act.py`)

**ACT端点** (`act.py:路由`):
```python
@router.post("/{project_id}/act", response_model=ActResponse)
async def run_act(project_id: str, body: ActRequest, background_tasks: BackgroundTasks)
```
- 异步后台任务执行
- 实时WebSocket状态广播
- 错误处理和状态跟踪

**CHAT端点**:
- 类似ACT的处理流程
- 区别在于交互语义和用户体验

#### 4.2 WebSocket通信 (`apps/api/app/api/chat/websocket.py`)
```python
@router.websocket("/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str)
```
- 项目级别的WebSocket连接
- 实时消息推送和状态更新
- 连接管理和错误处理

### 5. 前端架构

#### 5.1 组件层次结构
```
ChatInterface (主聊天界面)
├── ChatHeader (模式切换: chat/act)
├── CLISelector (AI助手选择器)
├── MessageList (消息列表)
└── MessageInput (消息输入)

Hooks层:
├── useChat (聊天状态管理)
├── useWebSocket (WebSocket连接)
├── useCLI (CLI偏好管理)
└── useUserRequests (用户请求跟踪)
```

#### 5.2 实时通信机制 (`hooks/useWebSocket.ts`)
**关键特性**:
- 自动重连机制 (指数退避算法)
- 连接状态管理
- 消息类型路由 (message, status, error)
- 心跳检测 (ping/pong)

```typescript
// WebSocket URL构建
const wsUrl = process.env.NEXT_PUBLIC_WS_BASE || 'ws://localhost:8080';
const fullUrl = `${wsUrl}/api/chat/${projectId}`;
```

#### 5.3 聊天状态管理 (`hooks/useChat.ts`)
**智能消息合并**:
- 相同角色5秒内消息自动合并
- 避免工具消息被合并
- 保持消息时序和完整性

**多模态支持**:
- 图片上传和处理
- 服务器端路径解析
- CLI工具可访问的绝对路径

### 6. 关键技术流程

#### 6.1 ACT执行流程
1. **前端**: 用户输入指令 → `executeAct()`
2. **图片处理**: 上传图片获取服务器路径
3. **API调用**: POST `/api/chat/{project_id}/act`
4. **后台任务**: `BackgroundTasks.add_task()`
5. **Claude集成**: `generate_diff_with_logging()`
6. **实时反馈**: WebSocket推送工具使用状态
7. **结果返回**: 提交消息和变更摘要

#### 6.2 实时日志流程 (`claude_act.py:185`)
```python
# 工具使用开始
await log_callback("tool_start", {
    "tool_id": block.id,
    "tool_name": block.name,
    "summary": extract_tool_summary(block.name, block.input),
    "input": block.input
})

# 工具执行结果
await log_callback("tool_result", {
    "tool_id": block.tool_use_id,
    "tool_name": tool_info.get("name"),
    "summary": tool_info.get("summary"),
    "is_error": block.is_error,
    "content": str(block.content)[:500],
    "diff_info": diff_info
})
```

#### 6.3 会话管理流程
- **会话创建**: 每个ACT/CHAT请求创建新会话
- **会话恢复**: 支持通过session_id恢复Claude Code会话
- **状态跟踪**: 实时更新会话状态 (active, completed, failed)
- **性能监控**: 记录耗时、令牌消费、成本

### 7. 安全和性能特性

#### 7.1 安全措施
- 文件访问权限控制 (`allow_globs`)
- API密钥环境变量管理
- CORS中间件配置
- 输入验证和错误处理

#### 7.2 性能优化
- 系统提示词缓存
- 消息智能合并
- WebSocket连接复用
- 异步后台任务处理
- 数据库索引优化

### 8. 部署和配置

#### 8.1 环境配置
```bash
# 核心配置
ANTHROPIC_API_KEY=sk-...           # Claude API密钥
DATABASE_URL=sqlite:///./app.db    # 数据库连接
API_PORT=8080                      # API服务端口
WEB_PORT=3000                      # Web服务端口
```

#### 8.2 开发工作流
```json
// package.json scripts
{
  "dev": "concurrently \"npm run dev:api\" \"npm run dev:web\"",
  "dev:api": "cd apps/api && uvicorn app.main:app --reload --port 8080",
  "dev:web": "cd apps/web && npm run dev"
}
```

## 技术创新点

1. **统一CLI管理器**: 首个支持多种AI编程助手的统一平台
2. **会话恢复机制**: 支持中断后继续之前的Claude Code会话
3. **实时工具跟踪**: 细粒度的工具使用监控和反馈
4. **智能消息合并**: 优化聊天体验的消息处理算法
5. **多模态输入**: 支持文本和图片的混合输入处理

## 关键文件代码参考

### 后端核心文件

#### `apps/api/app/services/claude_act.py` (Claude集成核心)
- **第135-306行**: `generate_diff_with_logging()` 主函数
- **第108-133行**: 工具摘要提取函数 `extract_tool_summary()`
- **第45-89行**: 系统提示词动态加载和缓存机制

#### `apps/api/app/api/chat/act.py` (ACT API端点)
- **第15行**: `@router.post("/{project_id}/act")` ACT执行端点
- **第33行**: 后台任务执行 `background_tasks.add_task()`

#### `apps/api/app/api/chat/websocket.py` (WebSocket通信)
- **第15-37行**: WebSocket连接处理和消息路由

#### `apps/api/app/models/projects.py` (项目数据模型)
- **第20-27行**: 多CLI会话管理字段定义
- **第38-44行**: 数据库关系定义

### 前端核心文件

#### `apps/web/components/chat/ChatInterface.tsx` (主聊天界面)
- **第40-54行**: `handleSendMessage()` 消息发送处理
- **第19-38行**: Chat和CLI钩子集成

#### `apps/web/hooks/useWebSocket.ts` (WebSocket钩子)
- **第31-113行**: WebSocket连接和重连机制
- **第52-81行**: 消息类型路由处理

#### `apps/web/hooks/useChat.ts` (聊天状态管理)
- **第149-239行**: `executeAct()` ACT执行逻辑
- **第33-69行**: 智能消息合并算法

## 技术亮点分析

### 1. Claude Code SDK深度集成
项目通过claude-code-sdk实现了与Claude的原生集成，支持所有Claude Code工具 (Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS)，并提供实时工具使用跟踪和结果反馈。

### 2. 多AI助手统一管理
创新性地实现了多种AI编程助手的统一管理，用户可以在单一界面中选择和切换不同的AI助手，并支持fallback机制。

### 3. 实时通信架构
采用WebSocket实现前后端实时通信，支持工具使用状态的实时推送，提供流畅的用户体验。

### 4. 会话恢复机制
支持Claude Code会话的恢复功能，确保长时间对话的连续性，这在AI编程助手中是相对少见的高级特性。

### 5. 智能消息处理
前端实现了智能消息合并算法，自动合并相同角色短时间内的连续消息，优化聊天界面显示效果。

## 总结

Claudable项目是一个技术先进、架构清晰的AI编程助手平台。它成功地将多种AI编程工具统一到一个web界面中，通过claude-code-sdk与Claude进行深度集成，提供了实时、交互式的代码生成和编辑体验。项目在系统架构、数据建模、实时通信、用户体验等方面都体现了现代web应用的最佳实践。

---

*分析完成时间: 2025年*  
*分析对象: Claudable项目 (github.com/claudable)*  
*技术栈: Next.js + FastAPI + Claude Code SDK*