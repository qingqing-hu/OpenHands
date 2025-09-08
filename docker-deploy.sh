#!/bin/bash

# OpenHands Docker专用部署脚本
# 支持代码修改后的快速部署和重启

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
WORKSPACE_DIR="./workspace"
BACKEND_PORT=5000
FRONTEND_PORT=5001
DOCKER_COMPOSE_FILE="docker-compose.yml"
DOCKER_COMPOSE_DEV_FILE="docker-compose.dev.yml"
DOCKER_COMPOSE_LOGS_FILE="docker-compose.logs.yml"
LOGS_DIR="./logs"
BACKEND_LOGS_DIR="./logs/backend"
FRONTEND_LOGS_DIR="./logs/frontend"
SESSION_ID=${SESSION_ID:-$(date +%Y%m%d_%H%M%S)}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    echo -e "${GREEN}OpenHands Docker部署脚本${NC}"
    echo "用法: $0 [选项]"
    echo ""
    echo "环境变量:"
    echo "  SESSION_ID=xxx           设置会话ID（默认：时间戳）"
    echo ""
    echo "选项:"
    echo "  --help, -h              显示帮助信息"
    echo "  --up                    启动服务"
    echo "  --down                  停止服务"
    echo "  --restart               重启服务"
    echo "  --rebuild               重建镜像并启动"
    echo "  --logs                  查看日志（交互式选择）"
    echo "  --logs-backend, -lb     查看后端日志"
    echo "  --logs-frontend, -lf    查看前端日志"
    echo "  --status                查看状态"
    echo "  --dev                   使用开发模式启动（代码热重载）"
    echo "  --update                更新代码后重启"
    echo ""
    echo "会话隔离说明:"
    echo "  每个会话使用独立的工作空间目录"
    echo "  默认会话ID: YYYYMMDD_HHMMSS 格式"
    echo ""
    echo "开发模式说明:"
    echo "  --dev 选项会将代码目录挂载到容器 /app 目录"
    echo "  代码修改将自动触发服务重载，无需重启容器"
    echo "  适用于开发调试，不推荐生产环境使用"
    echo ""
    echo "示例:"
    echo "  $0 --up                 # 启动服务"
    echo "  SESSION_ID=mytask $0 --dev    # 指定会话ID启动"
    echo "  $0 --restart            # 重启服务"
    echo "  $0 --rebuild            # 重建镜像"
    echo "  $0 --update             # 代码更新后重启"
    echo "  $0 --logs-backend       # 直接查看后端日志"
    echo "  $0 --logs-frontend      # 直接查看前端日志"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装"
        exit 1
    fi

    if ! command -v sudo docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose未安装"
        exit 1
    fi

    print_success "Docker环境检查通过"
}

prepare_environment() {
    print_status "准备环境..."

    # 创建会话隔离的工作目录
    SESSION_WORKSPACE_DIR="$WORKSPACE_DIR/$SESSION_ID"
    mkdir -p "$SESSION_WORKSPACE_DIR"
    mkdir -p "$LOGS_DIR"

    # 设置权限
    chmod 755 "$SESSION_WORKSPACE_DIR"

    # 检查配置文件
    if [[ ! -f "config.toml" ]]; then
        print_status "创建默认配置文件..."
        cat > config.toml << EOF
[core]
workspace_base="./workspace"

[llm]
model="gemini-2.5-pro"
api_key="AIzaSyD8MJJ169vC1mWBuIBCNnhhnDgQgIcqh5A"

[sandbox]
local_runtime_url="http://localhost"

[app]
port=3000
frontend_port=3001
EOF
        print_warning "请修改config.toml文件中的API密钥"
    fi

    print_success "环境准备完成 (会话ID: $SESSION_ID)"
    print_status "工作空间: $SESSION_WORKSPACE_DIR"
}

start_services() {
    print_status "启动OpenHands服务..."

    prepare_environment

    # 创建日志目录
    mkdir -p "$BACKEND_LOGS_DIR"
    mkdir -p "$FRONTEND_LOGS_DIR"

    # 检查是否在开发模式
    if [[ "$1" == "dev" ]]; then
        if [[ -f "$DOCKER_COMPOSE_DEV_FILE" ]]; then
            print_status "使用开发模式启动（代码热重载）..."
            print_status "会话ID: $SESSION_ID"
            print_status "工作空间: $WORKSPACE_DIR/$SESSION_ID"
            print_status "代码修改将自动重载服务"
            SESSION_ID="$SESSION_ID" sudo docker-compose -f "$DOCKER_COMPOSE_DEV_FILE"  up --build
        else
            print_error "开发模式配置文件不存在: $DOCKER_COMPOSE_DEV_FILE"
            exit 1
        fi
    else
        if [[ -f "$DOCKER_COMPOSE_LOGS_FILE" ]]; then
            print_status "使用docker-compose.logs.yml启动（带日志分离）..."
            sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" up -d
        elif [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
            print_status "使用docker-compose.yml启动..."
            sudo docker-compose up -d
        else
            print_status "使用Docker直接启动..."
            docker run -d \
                --name openhands-backend \
                -p "$BACKEND_PORT:3000" \
                -v "$(pwd)/workspace:/workspace" \
                -v "$(pwd)/config.toml:/app/config.toml" \
                -e WORKSPACE_BASE="/workspace" \
                ghcr.io/all-hands-ai/runtime:oh_v0.50.0
        fi

        print_success "服务启动完成"
        print_status "后端: http://localhost:$BACKEND_PORT"
        print_status "前端: http://localhost:$FRONTEND_PORT"
        print_status "后端日志目录: $BACKEND_LOGS_DIR"
        print_status "前端日志目录: $FRONTEND_LOGS_DIR"
    fi
}

stop_services() {
    print_status "停止OpenHands服务..."

    if [[ -f "$DOCKER_COMPOSE_DEV_FILE" ]] && sudo docker-compose -f "$DOCKER_COMPOSE_DEV_FILE" ps | grep -q "Up"; then
        print_status "停止开发模式服务..."
        sudo docker-compose -f "$DOCKER_COMPOSE_DEV_FILE" down
    elif [[ -f "$DOCKER_COMPOSE_LOGS_FILE" ]]; then
        sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" down
    elif [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        sudo docker-compose down
    else
        sudo docker stop openhands-backend 2>/dev/null || true
        sudo docker rm openhands-backend 2>/dev/null || true
    fi

    # 清理所有openhands容器
    sudo docker ps -q -f "name=^openhands" | xargs -r sudo docker stop
    sudo docker ps -aq -f "name=^openhands" | xargs -r sudo docker rm

    print_success "服务已停止"
}

restart_services() {
    print_status "重启服务..."
    stop_services
    sleep 2
    start_services
}

rebuild_services() {
    print_status "重建镜像并启动..."

    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        sudo docker-compose down
        sudo docker-compose build --no-cache
        sudo docker-compose up -d
    else
        sudo docker pull ghcr.io/all-hands-ai/runtime:oh_v0.50.0
        stop_services
        start_services
    fi

    print_success "镜像重建完成"

    # Validate DataTransmissionAgent registration
    print_status "Validating DataTransmissionAgent registration..."
    if [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        sudo docker-compose exec openhands python -c "
import sys
sys.path.insert(0, '/app')
try:
    import openhands.agenthub
    from openhands.controller.agent import Agent
    agents = Agent.list_agents()
    print('Available agents:', agents)
    if 'DataTransmissionAgent' in agents:
        print('✅ DataTransmissionAgent is registered')
    else:
        print('❌ DataTransmissionAgent not found')
        print('Available:', [a for a in agents if 'Agent' in a])
except Exception as e:
    print('Error:', e)
import traceback
traceback.print_exc()
" || print_warning "Agent validation failed - check logs"
    fi
}

update_and_restart() {
    print_status "更新代码后快速重启..."

    # 停止服务
    stop_services

    # 清理旧镜像（可选）
    print_status "清理旧镜像..."
    sudo docker image prune -f

    # 拉取最新镜像
    print_status "拉取最新镜像..."
    sudo docker pull ghcr.io/all-hands-ai/runtime:oh_v0.50.0

    # 重新启动
    start_services

    print_success "更新完成"
}

show_logs() {
    print_status "查看日志..."

    if [[ -f "$DOCKER_COMPOSE_LOGS_FILE" ]]; then
        echo -e "${GREEN}选择要查看的日志:${NC}"
        echo "1) 后端日志 (openhands-app)"
        echo "2) 前端日志 (openhands-frontend)"
        echo "3) 所有服务日志"
        echo "4) 退出"
        echo ""
        read -p "请输入选项 (1-4): " choice

        case $choice in
            1)
                sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" logs -f openhands
                ;;
            2)
                sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" logs -f frontend
                ;;
            3)
                sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" logs -f
                ;;
            4)
                return
                ;;
            *)
                print_error "无效选项，显示所有日志..."
                sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" logs -f
                ;;
        esac
    elif [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        sudo docker-compose logs -f
    else
        sudo docker logs openhands-backend
    fi
}

show_status() {
    print_status "服务状态:"

    if [[ -f "$DOCKER_COMPOSE_LOGS_FILE" ]]; then
        sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" ps
    elif [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
        sudo docker-compose ps
    else
        sudo docker ps -f name=openhands
    fi

    echo ""
    echo "日志目录状态:"
    echo "  后端日志目录: $BACKEND_LOGS_DIR"
    echo "  前端日志目录: $FRONTEND_LOGS_DIR"

    if [[ -d "$BACKEND_LOGS_DIR" ]]; then
        echo "  后端日志文件:"
        ls -la "$BACKEND_LOGS_DIR"/*.log 2>/dev/null | head -3 || echo "    无日志文件"
    fi

    if [[ -d "$FRONTEND_LOGS_DIR" ]]; then
        echo "  前端日志文件:"
        ls -la "$FRONTEND_LOGS_DIR"/*.log 2>/dev/null | head -3 || echo "    无日志文件"
    fi

    echo ""
    echo "端口检查:"
    netstat -tlnp 2>/dev/null | grep ":$BACKEND_PORT\|$FRONTEND_PORT" || echo "端口未占用"
}

# 主程序
main() {
    case "${1:-}" in
        --up|-u)
            check_docker
            start_services
            ;;
        --down|-d)
            stop_services
            ;;
        --restart|-r)
            check_docker
            restart_services
            ;;
        --rebuild|-b)
            check_docker
            rebuild_services
            ;;
        --dev)
            check_docker
            start_services dev
            ;;
        --logs|-l)
            show_logs
            ;;
        --logs-backend|-lb)
            print_status "查看后端日志..."
            if [[ -f "$DOCKER_COMPOSE_LOGS_FILE" ]]; then
                sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" logs -f openhands
            elif [[ -f "$DOCKER_COMPOSE_FILE" ]]; then
                sudo docker-compose logs -f
            else
                sudo docker logs -f openhands-backend
            fi
            ;;
        --logs-frontend|-lf)
            print_status "查看前端日志..."
            if [[ -f "$DOCKER_COMPOSE_LOGS_FILE" ]]; then
                sudo docker-compose -f "$DOCKER_COMPOSE_LOGS_FILE" logs -f frontend
            else
                print_warning "前端日志仅在使用docker-compose.logs.yml时可用"
            fi
            ;;
        --status|-s)
            show_status
            ;;
        --update)
            check_docker
            update_and_restart
            ;;
        --help|-h|"")
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 如果直接运行脚本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
