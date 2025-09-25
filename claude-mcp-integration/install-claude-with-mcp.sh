#!/bin/bash
set -e

echo "=== Installing Claude Code with MCP Services ==="

# 检测系统架构
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    CLAUDE_BINARY="claude-linux-x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    CLAUDE_BINARY="claude-linux-arm64"
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

echo "Detected architecture: $ARCH, using binary: $CLAUDE_BINARY"

# 1. 安装Claude Code
# 确定当前脚本的位置，支持从不同路径执行
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/$CLAUDE_BINARY" ]; then
    echo "Installing Claude Code..."
    cp "$SCRIPT_DIR/$CLAUDE_BINARY" /usr/local/bin/claude
    chmod +x /usr/local/bin/claude
    echo "Claude Code installed successfully"
else
    echo "Claude Code binary not found at: $SCRIPT_DIR/$CLAUDE_BINARY"
    echo "Available files in $SCRIPT_DIR:"
    ls -la "$SCRIPT_DIR/"
    exit 1
fi

# 2. 创建Claude Code配置目录
echo "Creating Claude Code configuration directories..."
mkdir -p /root/.claude
mkdir -p /home/openhands/.claude 2>/dev/null || true

# 3. 安装默认MCP配置
echo "Installing default MCP configuration..."
cp "$SCRIPT_DIR/mcp-config-template.json" /root/.claude/.mcp.json

# 如果存在openhands用户，也为其配置
if id "openhands" &>/dev/null; then
    cp "$SCRIPT_DIR/mcp-config-template.json" /home/openhands/.claude/.mcp.json
    chown -R openhands:openhands /home/openhands/.claude 2>/dev/null || true
fi

# 4. 安装用户自定义MCP配置模板（如果存在的话）
if [ -f "/claude-mcp-integration/user-mcp-config.json" ]; then
    echo "Installing user MCP configuration template..."
    cp /claude-mcp-integration/user-mcp-config.json /root/.claude/user-mcp-template.json
    if id "openhands" &>/dev/null; then
        cp /claude-mcp-integration/user-mcp-config.json /home/openhands/.claude/user-mcp-template.json
        chown openhands:openhands /home/openhands/.claude/user-mcp-template.json 2>/dev/null || true
    fi
fi

# 5. 创建MCP配置合并脚本
cat > /usr/local/bin/claude-mcp-config << 'SCRIPT'
#!/bin/bash
# Claude Code MCP配置管理脚本

CLAUDE_DIR="/root/.claude"
if [ "$USER" = "openhands" ] && [ -d "/home/openhands/.claude" ]; then
    CLAUDE_DIR="/home/openhands/.claude"
fi

CONFIG_FILE="$CLAUDE_DIR/.mcp.json"
USER_CONFIG_FILE="$CLAUDE_DIR/user-mcp-config.json"
TEMPLATE_FILE="$CLAUDE_DIR/user-mcp-template.json"

case "$1" in
    "list")
        echo "Current MCP configuration:"
        if [ -f "$CONFIG_FILE" ]; then
            cat "$CONFIG_FILE" | jq '.mcpServers | keys[]' 2>/dev/null || echo "jq not available, raw config:"
            [ $? -ne 0 ] && cat "$CONFIG_FILE"
        else
            echo "No MCP configuration found"
        fi
        ;;
    "add-user-config")
        if [ -f "$USER_CONFIG_FILE" ]; then
            echo "Merging user MCP configuration..."
            # 简单合并（需要jq支持）
            if command -v jq >/dev/null 2>&1; then
                jq -s '.[0].mcpServers * .[1].mcpServers | {mcpServers: .}' "$CONFIG_FILE" "$USER_CONFIG_FILE" > "$CONFIG_FILE.tmp"
                mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
                echo "User MCP configuration merged successfully"
            else
                echo "Warning: jq not available, manual merge required"
            fi
        else
            echo "No user MCP configuration found"
        fi
        ;;
    "template")
        if [ -f "$TEMPLATE_FILE" ]; then
            echo "User MCP configuration template:"
            cat "$TEMPLATE_FILE"
        else
            echo "No user MCP template found"
        fi
        ;;
    *)
        echo "Usage: claude-mcp-config {list|add-user-config|template}"
        echo ""
        echo "Commands:"
        echo "  list            - Show current MCP servers"
        echo "  add-user-config - Merge user MCP config with default"
        echo "  template        - Show user MCP config template"
        ;;
esac
SCRIPT

chmod +x /usr/local/bin/claude-mcp-config

# 6. 设置环境变量
echo "Setting up environment variables..."
cat >> /etc/environment << 'EOL'

# Claude Code MCP Configuration
CLAUDE_MCP_CONFIG_PATH=/root/.claude/.mcp.json
# Add your MCP service API keys here
BRAVE_API_KEY=
GITHUB_TOKEN=
TAVILY_API_KEY=
EOL

# 7. 创建Claude启动脚本（带环境变量支持）
cat > /usr/local/bin/claude-with-env << 'SCRIPT'
#!/bin/bash
# Claude Code启动脚本，支持环境变量

# 加载环境变量
if [ -f /etc/environment ]; then
    set -a
    source /etc/environment
    set +a
fi

# 检查MCP配置
CLAUDE_DIR="/root/.claude"
if [ "$USER" = "openhands" ] && [ -d "/home/openhands/.claude" ]; then
    CLAUDE_DIR="/home/openhands/.claude"
fi

if [ ! -f "$CLAUDE_DIR/.mcp.json" ]; then
    echo "Warning: No MCP configuration found at $CLAUDE_DIR/.mcp.json"
    echo "You can use 'claude-mcp-config list' to check configuration"
fi

# 启动Claude Code
exec claude "$@"
SCRIPT

chmod +x /usr/local/bin/claude-with-env

echo "=== Installation completed successfully ==="
echo ""
echo "Available commands:"
echo "  claude                 # Direct Claude Code"
echo "  claude-with-env        # Claude Code with environment variables"
echo "  claude-mcp-config      # MCP configuration management"
echo ""
echo "Configuration files:"
echo "  MCP config: $HOME/.claude/.mcp.json"
echo "  Environment: /etc/environment"
echo ""

# 验证安装
echo "Verifying installation..."
claude --version

echo "Claude Code with MCP integration is ready!"
