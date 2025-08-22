# OpenHands 本地部署指南

## 系统要求

- **操作系统**: Linux/macOS/Windows (推荐 Linux/macOS)
- **Python**: 3.11 或更高版本
- **Node.js**: 18.17 或更高版本
- **Docker**: 20.10 或更高版本
- **Git**: 2.20 或更高版本

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/All-Hands-AI/OpenHands.git
cd OpenHands
```

### 2. 安装依赖

#### 后端依赖
```bash
# 使用 Poetry 安装 Python 依赖
pip install poetry
poetry install
```

#### 前端依赖
```bash
# 安装前端依赖
cd frontend
npm install
cd ..
```

### 3. 配置环境

#### 创建配置文件
```bash
# 复制配置文件模板
cp config.template.toml config.toml
```

#### 编辑配置文件
编辑 `config.toml` 文件，设置必要的配置项：
- 在 `[llm]` 部分设置你的 API key
- 根据需要调整其他配置

### 4. 启动服务

#### 方式一：使用 Docker (推荐)
```bash
# 启动完整服务
make build
make run
```

#### 方式二：本地开发模式
```bash
# 启动后端
make start-backend

# 启动前端 (新终端)
make start-frontend
```

#### 方式三：手动启动
```bash
# 启动后端 API
poetry run python -m openhands.server.listen

# 启动前端 (新终端)
cd frontend
npm run dev
```

## 配置说明

### 核心配置 (`config.toml`)

#### LLM 配置
```toml
[llm]
api_key = "your-api-key-here"
model = "gpt-4o"
base_url = ""
temperature = 0.0
```

#### 沙箱配置
```toml
[sandbox]
runtime = "docker"
base_container_image = "nikolaik/python-nodejs:python3.12-nodejs22"
```

#### 安全配置
```toml
[security]
confirmation_mode = true
enable_security_analyzer = false
```

## 常用命令

### 开发命令
```bash
# 安装所有依赖
make install

# 运行测试
make test

# 代码格式化
make format

# 代码检查
make lint

# 构建项目
make build
```

### Docker 命令
```bash
# 构建镜像
make build

# 启动容器
make run

# 停止容器
make stop

# 查看日志
make logs
```

## 访问服务

启动成功后，可以通过以下地址访问：

- **Web 界面**: http://localhost:3000
- **API 文档**: http://localhost:3000/api/docs
- **后端 API**: http://localhost:8000

## 故障排除

### 常见问题

#### 1. Docker 权限问题
```bash
# 将用户添加到 docker 组
sudo usermod -aG docker $USER
# 重新登录或重启系统
```

#### 2. 端口冲突
如果端口 3000 或 8000 被占用，可以修改配置：
```toml
# 在 config.toml 中修改端口
[core]
port = 3001  # 或其他可用端口
```

#### 3. 内存不足
```bash
# 增加 Docker 内存限制
# 在 Docker Desktop 设置中调整内存限制到至少 4GB
```

#### 4. API 连接问题
- 检查网络连接
- 验证 API key 是否正确
- 检查防火墙设置

### 日志查看

```bash
# 查看 Docker 日志
docker logs openhands-app

# 查看后端日志
tail -f logs/openhands.log

# 查看前端日志
cd frontend && npm run dev
```

## 高级配置

### 多模型配置
```toml
[llm.gpt4o]
api_key = "your-openai-key"
model = "gpt-4o"

[llm.claude]
api_key = "your-anthropic-key"
model = "claude-3-5-sonnet-20241022"

[llm.local]
api_key = "not-needed"
base_url = "http://localhost:11434"
model = "ollama/llama3.1"
```

### 自定义沙箱
```toml
[sandbox]
base_container_image = "your-custom-image:latest"
runtime_extra_deps = "package1 package2"
volumes = "/host/path:/container/path:rw"
```

## 性能优化

### 资源限制
```toml
[sandbox]
timeout = 300
resource_cpu_request = "2"
resource_memory_request = "2Gi"
resource_memory_limit = "4Gi"
```

### 缓存配置
```toml
[core]
cache_dir = "/tmp/cache"
max_iterations = 1000
```

## 安全建议

1. **API 密钥管理**: 使用环境变量或密钥管理服务
2. **网络隔离**: 在隔离环境中运行
3. **权限控制**: 使用非 root 用户运行容器
4. **定期更新**: 保持系统和依赖更新

## 获取帮助

- **文档**: https://docs.all-hands.dev/
- **GitHub Issues**: https://github.com/All-Hands-AI/OpenHands/issues
- **社区讨论**: https://github.com/All-Hands-AI/OpenHands/discussions
