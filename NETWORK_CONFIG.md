# 网络配置说明

## 内网部署和域名代理配置

本文档说明如何配置OpenHands以支持内网部署和phonestat.hexin.cn域名代理访问。

## 配置选项

### 1. 环境变量配置

#### 基础内网配置
```bash
# 设置Docker主机地址为内网IP
export DOCKER_HOST_ADDR=192.168.1.100

# 启用主机网络模式（可选）
export USE_HOST_NETWORK=true
```

#### phonestat.hexin.cn域名代理配置
```bash
# 方式1: 启用phonestat.hexin.cn代理
export USE_PHONESTAT_PROXY=true

# 方式2: 自定义代理主机
export PHONESTAT_PROXY_HOST=phonestat.hexin.cn

# 可选：设置前端基础路径
export FRONTEND_BASE_PATH=/openhands
```

### 2. 配置文件设置

在 `config.toml` 中配置：

```toml
[sandbox]
# 启用主机网络模式（推荐内网部署使用）
use_host_network = true

[server]
# 前端基础路径（如果使用子路径部署）
frontend_base_path = "/openhands"
```

## 部署场景

### 场景1: 纯内网部署
```bash
# 设置内网IP
export DOCKER_HOST_ADDR=192.168.1.100
export USE_HOST_NETWORK=true

# 启动OpenHands
python -m openhands.server.listen --bind-host 0.0.0.0
```

### 场景2: phonestat.hexin.cn域名代理
```bash
# 启用域名代理
export USE_PHONESTAT_PROXY=true
export FRONTEND_BASE_PATH=/openhands

# 启动OpenHands
python -m openhands.server.listen --bind-host 0.0.0.0
```

### 场景3: 混合部署（内网+域名代理）
```bash
# 内网访问配置
export DOCKER_HOST_ADDR=192.168.1.100
export USE_HOST_NETWORK=true

# 同时支持域名代理
export USE_PHONESTAT_PROXY=true
export FRONTEND_BASE_PATH=/openhands

# 启动OpenHands
python -m openhands.server.listen --bind-host 0.0.0.0
```

## 功能说明

### 文件查看器安全策略
- 允许localhost访问 (127.0.0.1, ::1)
- 允许内网IP范围访问 (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- 允许phonestat.hexin.cn域名代理访问 (通过X-Forwarded-Host检测)

### URL生成策略
1. **优先级**: DOCKER_HOST_ADDR > PHONESTAT_PROXY_HOST > USE_PHONESTAT_PROXY > 自动检测内网IP > localhost
2. **自动检测**: 自动检测本机内网IP地址
3. **域名代理**: 支持通过phonestat.hexin.cn域名访问

### 浏览器自动切换
- Agent创建HTML文件时自动生成正确的访问URL
- 支持内网IP和域名代理两种访问方式
- 前端浏览器选项卡自动切换并显示网页

## 故障排除

### 1. 检查文件查看器端口
```bash
cat /tmp/oh-server-url
```

### 2. 测试内网访问
```bash
curl http://你的内网IP:文件查看器端口/view?path=/workspace/index.html
```

### 3. 测试域名代理访问
```bash
curl -H "X-Forwarded-Host: phonestat.hexin.cn" http://你的内网IP:文件查看器端口/view?path=/workspace/index.html
```

### 4. 查看日志
查看启动日志中的以下信息：
- `Using DOCKER_HOST_ADDR: xxx for file viewer`
- `Using phonestat.hexin.cn proxy for file viewer`
- `Detected internal network IP: xxx for file viewer`
- `HTML file created, triggering auto-switch to: xxx`

## 安全注意事项

1. **内网访问**: 仅允许私有IP范围访问
2. **域名验证**: 仅允许phonestat.hexin.cn域名代理
3. **文件路径**: 仅允许绝对路径访问，禁止路径遍历攻击
4. **HTTPS**: 建议在生产环境中使用HTTPS

## 常见问题

**Q: 浏览器选项卡没有自动切换到Agent创建的网页？**
A: 检查以下配置：
1. 确认环境变量设置正确
2. 检查文件查看器端口是否启动
3. 验证生成的URL是否可访问
4. 查看浏览器控制台是否有网络错误

**Q: 内网其他机器无法访问网页？**
A: 确保：
1. 文件查看器绑定到0.0.0.0而不是127.0.0.1
2. 防火墙允许相应端口访问
3. 使用正确的内网IP地址

**Q: phonestat.hexin.cn代理不工作？**
A: 检查：
1. 代理服务器配置是否正确设置X-Forwarded-Host头
2. 环境变量USE_PHONESTAT_PROXY是否设置为true
3. 网络连接是否正常