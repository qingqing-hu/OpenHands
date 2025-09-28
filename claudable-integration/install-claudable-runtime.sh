#!/bin/bash
# =============================================================================
# Claudable Runtime Integration Script
# 基于手动部署经验的自动化安装脚本
# =============================================================================
set -e

# 设置日志文件，记录完整的安装过程
INSTALL_LOG="/tmp/claudable-install.log"
exec > >(tee "$INSTALL_LOG") 2>&1

echo "=== Claudable Installation Started at $(date) ==="
echo "=== Environment Variables Check ==="
echo "ANTHROPIC_BASE_URL: ${ANTHROPIC_BASE_URL:-'<NOT SET>'}"
echo "ANTHROPIC_AUTH_TOKEN: ${ANTHROPIC_AUTH_TOKEN:-'<NOT SET>'}"
echo "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-'<NOT SET>'}"
echo "APP_PORT_1: ${APP_PORT_1:-'<NOT SET>'}"
echo "APP_PORT_2: ${APP_PORT_2:-'<NOT SET>'}"
echo "USER: $(whoami)"
echo "PWD: $(pwd)"
echo "=== Environment Variables Check Complete ==="

# 配置变量
CLAUDABLE_DIR="/opt/claudable"
CLAUDABLE_API_PORT="${APP_PORT_1:-50396}"
CLAUDABLE_WEB_PORT="${APP_PORT_2:-57023}" 
LOG_PREFIX="[Claudable]"

# 日志函数
log_info() {
    echo "✅ $LOG_PREFIX $1"
}

log_warn() {
    echo "⚠️  $LOG_PREFIX $1"
}

log_error() {
    echo "❌ $LOG_PREFIX $1"
}

# 检查必要的环境变量
check_environment() {
    log_info "Checking environment variables..."
    
    if [[ -z "$ANTHROPIC_API_KEY" && -z "$ANTHROPIC_AUTH_TOKEN" ]]; then
        log_warn "No ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN found. Claudable will work in demo mode."
    fi
    
    log_info "Using ports: API=$CLAUDABLE_API_PORT, Web=$CLAUDABLE_WEB_PORT"
}

# 复制Claudable应用文件
setup_claudable_files() {
    log_info "Setting up Claudable application files..."
    
    # 创建目标目录
    mkdir -p "$CLAUDABLE_DIR"
    
    # 检查是否需要复制应用文件
    if [[ ! -d "$CLAUDABLE_DIR/apps" ]]; then
        # 从当前脚本目录复制apps文件夹（脚本在integration包中）
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [[ -d "$SCRIPT_DIR/apps" ]]; then
            log_info "Copying application files from $SCRIPT_DIR/apps to $CLAUDABLE_DIR/"
            cp -r "$SCRIPT_DIR/apps" "$CLAUDABLE_DIR/"
            log_info "Application files copied successfully"
        else
            log_error "Application files not found in $SCRIPT_DIR/apps"
            return 1
        fi
    else
        log_info "Application files already exist at $CLAUDABLE_DIR/apps"
    fi
}

# 安装Python依赖 
install_backend_deps() {
    log_info "Installing Python backend dependencies..."
    
    cd "$CLAUDABLE_DIR/apps/api"
    
    # 确定正确的Python和pip命令
    PYTHON_CMD="/usr/local/bin/python3.12"
    PIP_CMD="/usr/local/bin/pip3.12"
    
    if ! command -v "$PYTHON_CMD" &> /dev/null; then
        PYTHON_CMD="python3.12"
        PIP_CMD="pip3.12"
        if ! command -v "$PYTHON_CMD" &> /dev/null; then
            PYTHON_CMD="python3"
            PIP_CMD="pip3"
            log_warn "Using python3/pip3 instead of python3.12/pip3.12"
        fi
    fi
    
    log_info "Using Python: $PYTHON_CMD, Pip: $PIP_CMD"
    
    # 检查并安装依赖
    if ! "$PYTHON_CMD" -c "import fastapi, sqlalchemy, uvicorn" 2>/dev/null; then
        log_info "Installing Python dependencies with $PIP_CMD..."
        if "$PIP_CMD" install -r requirements.txt --quiet --root-user-action=ignore; then
            log_info "Backend dependencies installed successfully"
        else
            log_error "Failed to install backend dependencies"
            return 1
        fi
    else
        log_info "Backend dependencies already available"
    fi
    
    # 验证关键模块
    "$PYTHON_CMD" -c "import fastapi, sqlalchemy, uvicorn; print('✅ Core modules verified')" || {
        log_error "Failed to verify core Python modules"
        return 1
    }
}

# 安装Node.js依赖并修复已知问题
install_frontend_deps() {
    log_info "Installing Node.js frontend dependencies..."
    
    cd "$CLAUDABLE_DIR/apps/web"
    
    # 安装依赖（包括缺失的react-icons）
    npm install --silent react-icons
    npm install --silent
    
    # 修复TypeScript类型错误（基于手动部署经验）
    if [[ -f "app/[project_id]/chat/page.tsx" ]]; then
        sed -i 's/href={publishedUrl}/href={publishedUrl || "#"}/g' "app/[project_id]/chat/page.tsx" || true
        log_info "Fixed TypeScript type errors"
    fi
    
    log_info "Frontend dependencies installed successfully"
}

# 配置环境文件
setup_environment_files() {
    log_info "Setting up environment configuration..."
    
    # 后端环境配置
    # 确保API KEY正确设置
    EFFECTIVE_API_KEY="${ANTHROPIC_API_KEY:-${ANTHROPIC_AUTH_TOKEN:-}}"
    EFFECTIVE_BASE_URL="${ANTHROPIC_BASE_URL:-}"
    
    cat > "$CLAUDABLE_DIR/apps/api/.env" << EOF
DATABASE_URL=sqlite:///$CLAUDABLE_DIR/claudable.db
API_PORT=$CLAUDABLE_API_PORT
ANTHROPIC_API_KEY=$EFFECTIVE_API_KEY
ANTHROPIC_BASE_URL=$EFFECTIVE_BASE_URL
EOF

    # 前端环境配置
    cat > "$CLAUDABLE_DIR/apps/web/.env.local" << EOF
PORT=$CLAUDABLE_WEB_PORT
HOSTNAME=0.0.0.0
NEXT_PUBLIC_API_BASE=http://localhost:$CLAUDABLE_API_PORT
NEXT_PUBLIC_WS_BASE=ws://localhost:$CLAUDABLE_API_PORT
EOF

    log_info "Environment files configured"
}

# 启动后端API服务
start_backend_service() {
    log_info "Starting Claudable API service on port $CLAUDABLE_API_PORT..."
    
    cd "$CLAUDABLE_DIR/apps/api"
    
    # 确定正确的Python命令
    PYTHON_CMD="/usr/local/bin/python3.12"
    if ! command -v "$PYTHON_CMD" &> /dev/null; then
        PYTHON_CMD="python3.12"
        if ! command -v "$PYTHON_CMD" &> /dev/null; then
            PYTHON_CMD="python3"
            log_warn "Using python3 instead of python3.12 - may cause compatibility issues"
        fi
    fi
    
    log_info "Using Python: $PYTHON_CMD (version: $($PYTHON_CMD --version))"
    
    # 验证依赖是否正确安装
    if ! "$PYTHON_CMD" -c "import fastapi, sqlalchemy, uvicorn" 2>/dev/null; then
        log_warn "Python dependencies not found, attempting to install..."
        "$PYTHON_CMD" -m pip install -r requirements.txt --quiet || {
            log_error "Failed to install Python dependencies"
            return 1
        }
    fi
    
    # 设置环境变量
    export PYTHONPATH="$CLAUDABLE_DIR/apps/api"
    export DATABASE_URL="sqlite:///$CLAUDABLE_DIR/claudable.db"
    
    # 环境变量设置前的状态检查
    log_info "=== Environment Variables Before Processing ==="
    log_info "ANTHROPIC_BASE_URL: ${ANTHROPIC_BASE_URL:-'<NOT SET>'}"
    log_info "ANTHROPIC_AUTH_TOKEN: ${ANTHROPIC_AUTH_TOKEN:-'<NOT SET>'}" 
    log_info "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-'<NOT SET>'}"
    
    # 确保ANTHROPIC_API_KEY正确设置
    if [[ -z "$ANTHROPIC_API_KEY" && -n "$ANTHROPIC_AUTH_TOKEN" ]]; then
        export ANTHROPIC_API_KEY="$ANTHROPIC_AUTH_TOKEN"
        log_info "✅ Set ANTHROPIC_API_KEY from ANTHROPIC_AUTH_TOKEN"
    elif [[ -n "$ANTHROPIC_API_KEY" ]]; then
        log_info "✅ ANTHROPIC_API_KEY already set"
    else
        log_warn "❌ No ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN available"
    fi
    
    # 确保ANTHROPIC_BASE_URL被传递
    if [[ -n "$ANTHROPIC_BASE_URL" ]]; then
        export ANTHROPIC_BASE_URL="$ANTHROPIC_BASE_URL"
        log_info "✅ Using ANTHROPIC_BASE_URL: $ANTHROPIC_BASE_URL"
    else
        log_warn "❌ ANTHROPIC_BASE_URL not set"
    fi
    
    # 环境变量设置后的状态检查
    log_info "=== Environment Variables After Processing ==="
    log_info "ANTHROPIC_BASE_URL: ${ANTHROPIC_BASE_URL:-'<NOT SET>'}"
    log_info "ANTHROPIC_AUTH_TOKEN: ${ANTHROPIC_AUTH_TOKEN:-'<NOT SET>'}"
    log_info "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-'<NOT SET>'}"
    
    # 启动API服务，重定向输出以便调试
    log_info "Starting uvicorn with: $PYTHON_CMD -m uvicorn app.main:app --host 0.0.0.0 --port $CLAUDABLE_API_PORT"
    nohup "$PYTHON_CMD" -m uvicorn app.main:app --host 0.0.0.0 --port "$CLAUDABLE_API_PORT" \
        > /tmp/claudable-api.log 2>&1 &
    
    API_PID=$!
    echo $API_PID > /tmp/claudable-api.pid
    
    # 等待进程确实启动
    sleep 2
    if ! kill -0 "$API_PID" 2>/dev/null; then
        log_error "API service process died immediately, check logs:"
        cat /tmp/claudable-api.log 2>/dev/null | tail -10
        return 1
    fi
    
    # 等待API启动
    wait_for_service() {
        local port=$1
        local max_attempts=30
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
                return 0
            fi
            sleep 1
            ((attempt++))
        done
        return 1
    }
    
    if wait_for_service "$CLAUDABLE_API_PORT"; then
        log_info "API service started successfully (PID: $API_PID)"
    else
        log_error "API service failed to start within 30 seconds"
        return 1
    fi
}

# 启动前端Web服务
start_frontend_service() {
    log_info "Starting Claudable Web service on port $CLAUDABLE_WEB_PORT..."
    
    cd "$CLAUDABLE_DIR/apps/web"
    
    # 启动Web服务（开发模式，基于手动部署经验）
    PORT="$CLAUDABLE_WEB_PORT" \
    HOSTNAME="0.0.0.0" \
    npm run dev >/tmp/claudable-web.log 2>&1 &
    
    WEB_PID=$!
    echo $WEB_PID > /tmp/claudable-web.pid
    
    # 等待Web服务编译完成
    wait_for_web_service() {
        local max_attempts=60  # Next.js需要更长时间编译
        local attempt=1
        
        while [[ $attempt -le $max_attempts ]]; do
            if curl -s -I "http://localhost:$CLAUDABLE_WEB_PORT" | grep -q "200 OK"; then
                return 0
            fi
            sleep 2
            ((attempt++))
        done
        return 1
    }
    
    if wait_for_web_service; then
        log_info "Web service started successfully (PID: $WEB_PID)"
    else
        log_warn "Web service may still be starting (PID: $WEB_PID, check /tmp/claudable-web.log)"
    fi
}

# 验证安装
verify_installation() {
    log_info "Verifying Claudable installation..."
    
    # 检查API健康状态
    if curl -s "http://localhost:$CLAUDABLE_API_PORT/health" | grep -q '"ok":true'; then
        log_info "✅ API service is healthy"
    else
        log_error "❌ API service health check failed"
        return 1
    fi
    
    # 检查Web服务响应
    if curl -s -I "http://localhost:$CLAUDABLE_WEB_PORT" | grep -q "200 OK"; then
        log_info "✅ Web service is responding"
    else
        log_warn "⚠️  Web service may still be compiling"
    fi
    
    return 0
}

# 主安装流程
main() {
    log_info "Starting Claudable installation in OpenHands runtime container..."
    log_info "Installation directory: $CLAUDABLE_DIR"
    
    # 检查是否已经安装并正常运行
    if [[ -f "/tmp/claudable-api.pid" ]] && kill -0 "$(cat /tmp/claudable-api.pid)" 2>/dev/null; then
        # 检查API是否真的响应
        if curl -s "http://localhost:$CLAUDABLE_API_PORT/health" >/dev/null 2>&1; then
            log_info "Claudable services are already running and healthy"
            return 0
        else
            log_warn "Claudable process exists but API not responding, restarting..."
            # 清理旧进程
            pkill -f "uvicorn.*claudable" 2>/dev/null || true
            rm -f /tmp/claudable-api.pid /tmp/claudable-web.pid
        fi
    fi
    
    # 执行安装步骤
    check_environment
    setup_claudable_files
    install_backend_deps
    install_frontend_deps
    setup_environment_files
    start_backend_service
    start_frontend_service
    
    # 验证安装
    if verify_installation; then
        log_info "🎉 Claudable installation completed successfully!"
        log_info "📊 Access URLs (from host machine):"
        log_info "   🔧 Claudable API: http://localhost:$CLAUDABLE_API_PORT"
        log_info "   🌐 Claudable Web: http://localhost:$CLAUDABLE_WEB_PORT"
        log_info "   📊 OpenHands:     http://localhost:3000 (original)"
        
        # 最终环境变量状态
        log_info "=== Final Environment Variables Status ==="
        log_info "ANTHROPIC_BASE_URL: ${ANTHROPIC_BASE_URL:-'<NOT SET>'}"
        log_info "ANTHROPIC_AUTH_TOKEN: ${ANTHROPIC_AUTH_TOKEN:-'<NOT SET>'}"
        log_info "ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-'<NOT SET>'}"
        log_info "=== Installation Log saved to: $INSTALL_LOG ==="
        
        return 0
    else
        log_error "Installation verification failed"
        log_error "=== Installation Log saved to: $INSTALL_LOG ==="
        return 1
    fi
}

# 错误处理
trap 'log_error "Installation failed at line $LINENO"' ERR

# 执行主函数
main "$@"