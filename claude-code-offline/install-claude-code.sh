#!/bin/bash
set -e

echo "=== Installing Claude Code from offline package ==="

# 检查文件是否存在
if [ ! -f "/claude-code-offline/claude-linux-x64" ]; then
    echo "Claude Code binary not found!"
    exit 1
fi

# 安装二进制文件
echo "Installing Claude Code binary..."
cp /claude-code-offline/claude-linux-x64 /usr/local/bin/claude
chmod +x /usr/local/bin/claude

# 验证安装
if command -v claude &> /dev/null; then
    echo "Claude Code installation completed successfully!"
    claude --version
else
    echo "Claude Code installation failed!"
    exit 1
fi

echo "=== Claude Code is now available. You can run 'claude' command ==="
