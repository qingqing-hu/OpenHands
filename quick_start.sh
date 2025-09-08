#!/bin/bash
# OpenHands 快速启动脚本

set -e

# 项目根目录配置
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 项目根目录: $PROJECT_ROOT"

# 切换到项目根目录
cd "$PROJECT_ROOT"

echo "🚀 OpenHands 本地部署快速启动脚本"
echo "=================================="

# 检查并清理已存在的进程
echo "🔍 检查已存在的 OpenHands 进程..."

# 查找并kill已存在的后端进程
BACKEND_PIDS=$(pgrep -f "python -m openhands.server" || true)
if [[ -n "$BACKEND_PIDS" ]]; then
    echo "⚠️  发现已存在的后端进程: $BACKEND_PIDS"
    echo "🛑 正在停止后端进程..."
    kill $BACKEND_PIDS
    sleep 2

    # 确保进程已停止
    if pgrep -f "python -m openhands.server" > /dev/null; then
        echo "🔥 强制停止后端进程..."
        pkill -9 -f "python -m openhands.server"
    fi
    echo "✅ 后端进程已清理"
else
    echo "✅ 未发现已存在的后端进程"
fi

# 查找并kill已存在的前端进程
FRONTEND_PIDS=$(pgrep -f "npm run start" || true)
if [[ -n "$FRONTEND_PIDS" ]]; then
    echo "⚠️  发现已存在的前端进程: $FRONTEND_PIDS"
    echo "🛑 正在停止前端进程..."
    kill $FRONTEND_PIDS
    sleep 2

    # 确保进程已停止
    if pgrep -f "npm run start" > /dev/null; then
        echo "🔥 强制停止前端进程..."
        pkill -9 -f "npm run start"
    fi
    echo "✅ 前端进程已清理"
else
    echo "✅ 未发现已存在的前端进程"
fi

# 检查端口占用情况
check_port() {
    local port=$1
    local service=$2
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  端口 $port 已被占用 ($service)"
        PID=$(lsof -t -i :$port)
        echo "🛑 正在释放端口 $port (PID: $PID)..."
        kill $PID
        sleep 1

        # 如果仍然占用，强制kill
        if lsof -i :$port > /dev/null 2>&1; then
            kill -9 $PID
        fi
        echo "✅ 端口 $port 已释放"
    fi
}

# 检查常用端口
check_port 3000 "前端服务"
check_port 8000 "后端API"
check_port 8001 "后端服务"

echo ""

# 检查系统要求
echo "📋 检查系统要求..."

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 未安装，请先安装 Python 3.11+"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
if [[ "$PYTHON_VERSION" < "3.11" ]]; then
    echo "❌ Python 版本过低，需要 3.11+，当前版本: $PYTHON_VERSION"
    exit 1
fi
echo "✅ Python 版本: $PYTHON_VERSION"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 18.17+"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1,2)
if [[ "$NODE_VERSION" < "18.17" ]]; then
    echo "❌ Node.js 版本过低，需要 18.17+，当前版本: $NODE_VERSION"
    exit 1
fi
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker 20.10+"
    exit 1
fi
echo "✅ Docker 已安装"

# 检查 Git
if ! command -v git &> /dev/null; then
    echo "❌ Git 未安装，请先安装 Git"
    exit 1
fi
echo "✅ Git 已安装"

# 检查配置文件
if [[ ! -f "config.toml" ]]; then
    echo "📄 创建配置文件..."
    cp config.template.toml config.toml
    echo "⚠️  请编辑 config.toml 文件，设置你的 API key"
    echo "   在 [llm] 部分设置 api_key = 'your-api-key-here'"
else
    echo "✅ 配置文件已存在"
fi

# 安装后端依赖（每次都检查更新）
echo "📦 安装后端依赖..."
if ! command -v poetry &> /dev/null; then
    echo "📥 安装 Poetry..."
    pip install poetry
fi
poetry install

# 安装前端依赖（每次都检查更新）
echo "📦 安装前端依赖..."
cd frontend
npm install
cd ..

# 构建项目（由外部参数决定，默认需要构建）
echo "🔨 构建项目..."
if [[ "$1" == "--skip-build" ]]; then
    echo "⏭️  跳过构建步骤（使用 --skip-build 参数）"
else
    echo "🔨 执行项目构建..."
    make build
fi

# 启动服务
echo "🚀 启动 OpenHands..."
echo "   Web 界面: http://localhost:3000"
echo "   API 文档: http://localhost:3000/api/docs"
echo "   后端 API: http://localhost:8000"
echo ""
echo "按 Ctrl+C 停止服务"

make run
