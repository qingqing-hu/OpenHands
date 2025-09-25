# Claude Code + MCP 集成方案 - 最终实施指南

## 🎯 目标
在OpenHands runtime容器构建时集成Claude Code和MCP服务，实现容器启动即可使用的体验。

## 📁 准备工作

### 1. 集成包目录结构
```
claude-mcp-integration/
├── claude-linux-arm64              # ARM64二进制文件
├── claude-linux-x64                # x86-64二进制文件  
├── mcp-config-template.json        # MCP服务配置
├── user-mcp-config.json            # 用户自定义配置模板
├── install-claude-with-mcp.sh      # 安装脚本
└── integration-guide.md            # 使用指南
```

### 2. MCP配置文件 (mcp-config-template.json)
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
      "env": {}
    },
    "git": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-git", "/workspace"],
      "env": {}
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY:-}"
      }
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN:-}"
      }
    }
  }
}
```

## 🏗️ 集成到Runtime构建

### 方法1：修改runtime_build.py
```python
# 在 openhands/runtime/utils/runtime_build.py 中
# 或在您的构建脚本中添加

def build_claude_mcp_runtime():
    """构建集成Claude Code的runtime镜像"""
    
    # 1. 准备extra_deps
    extra_deps = """
# Install Claude Code with MCP Services
COPY ./claude-mcp-integration /claude-mcp-integration
RUN /claude-mcp-integration/install-claude-with-mcp.sh && rm -rf /claude-mcp-integration

# Install jq for MCP configuration management
RUN apt-get update && apt-get install -y jq && apt-get clean && rm -rf /var/lib/apt/lists/*
"""

    # 2. 构建镜像
    runtime_image = build_runtime_image(
        base_image="all-hands-ai/runtime:0.55-nikolaik",
        runtime_builder=DockerRuntimeBuilder(docker.from_env()),
        extra_deps=extra_deps,
        enable_browser=True,
    )
    
    return runtime_image
```

### 方法2：修改Dockerfile.j2模板
在 `openhands/runtime/utils/runtime_templates/Dockerfile.j2` 的最后添加：
```dockerfile
# Install Claude Code with MCP Services (if enabled)
{% if install_claude_mcp %}
COPY ./claude-mcp-integration /claude-mcp-integration
RUN /claude-mcp-integration/install-claude-with-mcp.sh && rm -rf /claude-mcp-integration
RUN apt-get update && apt-get install -y jq && apt-get clean && rm -rf /var/lib/apt/lists/*
{% endif %}
```

## 🚀 部署和使用

### 1. 构建新的runtime镜像
```bash
# 将claude-mcp-integration目录放在构建上下文中
cp -r claude-mcp-integration /path/to/openhands/

# 执行构建
python your-build-script.py
```

### 2. 容器中的使用方式
容器启动后，Claude Code已经安装并配置好：

```bash
# 直接使用Claude Code
claude

# 使用带环境变量的版本
claude-with-env

# 查看MCP配置
claude-mcp-config list

# 添加用户自定义MCP服务
claude-mcp-config add-user-config
```

### 3. 配置API Keys
在runtime容器启动时通过环境变量传入：
```bash
docker run -e BRAVE_API_KEY=your-key \
           -e GITHUB_TOKEN=your-token \
           your-runtime-image
```

## 📝 自定义MCP服务

### 添加您的MCP服务
1. 修改 `user-mcp-config.json`:
```json
{
  "mcpServers": {
    "your-custom-service": {
      "command": "node",
      "args": ["/path/to/your/mcp-service.js"],
      "env": {
        "API_KEY": "${YOUR_API_KEY:-}",
        "DEBUG": "false"
      }
    }
  }
}
```

2. 在容器中合并配置：
```bash
claude-mcp-config add-user-config
```

## ✅ 验证安装
容器启动后验证Claude Code和MCP服务：
```bash
# 检查Claude Code版本
claude --version

# 检查MCP服务配置  
claude-mcp-config list

# 测试MCP服务（在Claude Code中）
claude
> 请列出当前目录的文件 (会使用filesystem MCP服务)
```

## 🔧 故障排除

### 常见问题
1. **架构不匹配**: 确保使用正确的二进制文件(ARM64/x86-64)
2. **权限问题**: 检查Claude Code二进制文件执行权限
3. **MCP服务不可用**: 检查网络访问和API keys配置
4. **Node.js依赖**: 确保runtime镜像包含Node.js环境

### 调试命令
```bash
# 检查Claude Code安装
which claude

# 检查MCP配置文件
cat ~/.claude/.mcp.json

# 检查环境变量
env | grep -E "(BRAVE|GITHUB|TAVILY)"
```

## 📋 完整集成清单

- [x] Claude Code二进制文件 (ARM64 + x86-64)
- [x] MCP配置模板
- [x] 自动安装脚本  
- [x] 配置管理工具
- [x] 环境变量支持
- [x] 架构自动检测
- [x] 构建集成方案
- [x] 使用文档

## 🎉 最终效果
- runtime容器启动时，Claude Code已安装并配置好MCP服务
- 支持filesystem、git、search、github等常用MCP服务
- 通过配置文件管理MCP服务，无需UI操作
- 支持用户自定义MCP服务扩展
- 完全离线运行，适合内网环境
