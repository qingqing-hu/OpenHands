#!/bin/bash
set -e

echo "=== Installing Claude Code ARM64 from offline package ==="

# 检查文件是否存在
if [ ! -f "/claude-code-offline/claude-linux-arm64" ]; then
    echo "Claude Code ARM64 binary not found!"
    exit 1
fi

# 安装二进制文件
echo "Installing Claude Code ARM64 binary..."
cp /claude-code-offline/claude-linux-arm64 /usr/local/bin/claude
chmod +x /usr/local/bin/claude

# 验证安装
if command -v claude &> /dev/null; then
    echo "Claude Code installation completed successfully!"
    echo "Testing claude command..."
    claude --help | head -5
else
    echo "Claude Code installation failed!"
    exit 1
fi

echo "=== Claude Code ARM64 is now available. You can run 'claude' command ==="
