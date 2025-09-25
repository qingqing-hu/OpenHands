# Claude Code + MCP服务集成指南

## 概述

这个方案将Claude Code和MCP服务完全集成到OpenHands runtime容器中，实现：
- 🚀 启动即用：容器启动时Claude Code已安装并配置好MCP服务
- 🔧 配置文件驱动：通过JSON配置文件管理MCP服务，无需UI
- 🏗️ 构建时集成：在镜像构建时安装，无需每次启动时下载

## 文件结构

```
claude-mcp-integration/
├── claude-linux-arm64              # ARM64架构的Claude Code二进制文件
├── claude-linux-x64                # x86-64架构的Claude Code二进制文件  
├── mcp-config-template.json        # 默认MCP服务配置
├── user-mcp-config.json            # 用户自定义MCP服务模板
├── install-claude-with-mcp.sh      # 集成安装脚本
└── mcp-servers/                    # （可选）自定义MCP服务目录
```

## 配置文件说明

### mcp-config-template.json
默认包含常用MCP服务：
- **filesystem**: 文件系统访问
- **git**: Git操作
- **brave-search**: Brave搜索引擎（需要API key）
- **github**: GitHub集成（需要token）

### user-mcp-config.json  
用户自定义MCP服务的模板，您可以：
1. 修改此文件添加您的MCP服务配置
2. 在容器中使用 `claude-mcp-config add-user-config` 合并配置

## 使用方式

### 方式1：集成到runtime构建中（推荐）

```python
# 在构建runtime镜像时添加extra_deps
extra_deps = """
COPY ./claude-mcp-integration /claude-mcp-integration
RUN /claude-mcp-integration/install-claude-with-mcp.sh && rm -rf /claude-mcp-integration
RUN apt-get update && apt-get install -y jq && apt-get clean
"""

build_runtime_image(
    base_image="all-hands-ai/runtime:0.55-nikolaik",
    runtime_builder=runtime_builder,
    extra_deps=extra_deps,
    ...
)
```

### 方式2：手动安装到现有容器

```bash
# 1. 复制集成包到容器
docker cp claude-mcp-integration container_id:/

# 2. 进入容器执行安装
docker exec container_id /claude-mcp-integration/install-claude-with-mcp.sh
```

## 容器内使用

安装完成后，在runtime容器中可以使用：

```bash
# 直接使用Claude Code
claude

# 使用带环境变量的启动脚本  
claude-with-env

# 管理MCP配置
claude-mcp-config list              # 查看当前MCP服务
claude-mcp-config template          # 查看用户配置模板
claude-mcp-config add-user-config   # 合并用户自定义配置
```

## 环境变量配置

在 `/etc/environment` 中设置API keys：

```bash
BRAVE_API_KEY=your-brave-api-key
GITHUB_TOKEN=your-github-token
TAVILY_API_KEY=your-tavily-key
```

## 添加自定义MCP服务

1. 编辑 `user-mcp-config.json`：
```json
{
  "mcpServers": {
    "your-service": {
      "command": "your-command",
      "args": ["arg1", "arg2"],
      "env": {
        "API_KEY": "${YOUR_API_KEY:-}"
      }
    }
  }
}
```

2. 在容器中合并配置：
```bash
claude-mcp-config add-user-config
```

## 架构支持

自动检测并支持：
- ✅ ARM64 (aarch64) - 使用 claude-linux-arm64
- ✅ x86-64 (x86_64) - 使用 claude-linux-x64

## 注意事项

1. **Node.js依赖**: 大部分MCP服务需要Node.js，runtime镜像已包含
2. **网络访问**: 某些MCP服务需要访问外部API，确保容器有网络权限
3. **API Keys**: 将敏感信息通过环境变量传递，不要硬编码在配置中
4. **权限**: 确保Claude Code二进制文件有执行权限

## 故障排除

- **配置问题**: 使用 `claude-mcp-config list` 检查配置
- **权限问题**: 检查文件权限和用户身份
- **网络问题**: 确保MCP服务的网络访问正常
- **依赖问题**: 确保相关的npm包或命令可用
