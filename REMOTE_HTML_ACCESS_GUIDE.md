# OpenHands 远程访问沙箱容器HTML文件操作指南

## 概述

本文档详细说明如何在OpenHands项目中远程访问沙箱容器内的HTML文件，适用于需要查看代理生成的HTML报告、分析文件或其他网页内容的场景。

## 环境要求

- **Docker**: 20.10+ (已安装并运行)
- **Python**: 3.11+ 
- **Node.js**: 22.x+
- **网络访问**: 确保防火墙允许相关端口访问

## 方法一：使用内置文件服务器（推荐）

### 1. 启动OpenHands服务

```bash
# 方式1：使用Docker运行（推荐）
make docker-run

# 方式2：本地开发模式
make run

# 方式3：手动启动
poetry run uvicorn openhands.server.listen:app --host 0.0.0.0 --port 3000
```

### 2. 访问文件服务器

OpenHands内置了文件查看服务器，启动后可通过以下方式访问：

```
# 主要访问地址
http://localhost:3000/api/files/view/{file_path}

# 示例：访问workspace目录下的HTML文件
http://localhost:3000/api/files/view/workspace/analysis_report.html
http://localhost:3000/api/files/view/workspace/data_visualization.html
```

### 3. 获取文件列表

```bash
# 通过API获取可访问的文件列表
curl http://localhost:3000/api/files/list?path=workspace

# 或通过Web界面查看
http://localhost:3000
```

## 方法二：端口映射访问

### 1. 修改Docker配置

编辑 `docker-compose.yml` 文件，添加额外的端口映射：

```yaml
services:
  openhands:
    ports:
      - "3000:3000"
      - "8080:8080"  # 添加HTML文件访问端口
      - "8000-8010:8000-8010"  # 端口范围映射
```

### 2. 启动带端口映射的容器

```bash
# 使用修改后的配置启动
docker-compose up

# 或者使用命令行直接指定端口
docker run -p 3000:3000 -p 8080:8080 -p 8000-8010:8000-8010 openhands:latest
```

### 3. 在沙箱中启动HTTP服务器

通过OpenHands界面或API，在沙箱容器内执行：

```bash
# Python简单HTTP服务器
cd /path/to/html/files
python -m http.server 8080 --bind 0.0.0.0

# 或使用Node.js serve包
npx serve -l 8080 /path/to/html/files

# 或使用nginx（如果已安装）
nginx -c /path/to/nginx.conf
```

然后通过 `http://localhost:8080` 访问HTML文件。

## 方法三：卷挂载方式

### 1. 配置卷映射

在 `docker-compose.yml` 中添加或修改卷映射：

```yaml
services:
  openhands:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ~/.openhands:/.openhands
      - ${WORKSPACE_BASE:-$PWD/workspace}:/opt/workspace_base
      - ./html_output:/opt/html_output  # 新增HTML输出目录映射
```

### 2. 指定HTML输出目录

在代理任务中，指定HTML文件输出到映射的目录：

```python
# 在代理代码中指定输出路径
html_output_dir = "/opt/html_output"
report_path = f"{html_output_dir}/analysis_report.html"
```

### 3. 本地访问

HTML文件将直接保存到本地 `./html_output` 目录，可以：

```bash
# 直接用浏览器打开
open ./html_output/analysis_report.html

# 或启动本地服务器
cd html_output
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 方法四：云环境部署

### 1. 使用云端服务器

如果在云服务器上部署OpenHands：

```bash
# 绑定到所有接口
make run BACKEND_HOST="0.0.0.0" BACKEND_PORT="3000" FRONTEND_HOST="0.0.0.0"

# 或者
make openhands-cloud-run
```

### 2. 配置域名和SSL

```nginx
# nginx配置示例
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /html/ {
        alias /path/to/html/files/;
        try_files $uri $uri/ =404;
    }
}
```

### 3. 安全配置

```bash
# 配置防火墙
ufw allow 3000/tcp
ufw allow 8080/tcp

# 设置访问控制
# 在config.toml中配置
[security]
enable_security_analyzer = true
confirmation_mode = true
```

## 实用命令和脚本

### 1. 快速启动脚本

创建 `start_with_html_access.sh`：

```bash
#!/bin/bash
echo "启动OpenHands并配置HTML文件访问..."

# 确保目录存在
mkdir -p workspace/html_output
mkdir -p logs

# 设置环境变量
export WORKSPACE_BASE="$(pwd)/workspace"
export HTML_OUTPUT_DIR="$(pwd)/workspace/html_output"

# 启动服务
make docker-run WORKSPACE_BASE="$WORKSPACE_BASE"

echo "服务已启动："
echo "- 主界面: http://localhost:3000"
echo "- 文件访问: http://localhost:3000/api/files/view/"
echo "- HTML输出目录: $HTML_OUTPUT_DIR"
```

### 2. HTML文件监控脚本

创建 `monitor_html_files.py`：

```python
import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class HTMLFileHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_file and event.src_path.endswith('.html'):
            print(f"新HTML文件已创建: {event.src_path}")
            print(f"访问链接: http://localhost:3000/api/files/view/{os.path.relpath(event.src_path)}")

if __name__ == "__main__":
    path = "./workspace"
    event_handler = HTMLFileHandler()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
```

### 3. 批量HTML文件服务器

创建 `serve_html_files.py`：

```python
from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json

class HTMLFileHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/html/list':
            self.send_json_response(self.get_html_files())
        else:
            super().do_GET()
    
    def get_html_files(self):
        html_files = []
        for root, dirs, files in os.walk('./workspace'):
            for file in files:
                if file.endswith('.html'):
                    rel_path = os.path.relpath(os.path.join(root, file))
                    html_files.append({
                        'path': rel_path,
                        'name': file,
                        'url': f'/{rel_path}'
                    })
        return html_files
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode())

if __name__ == "__main__":
    os.chdir('./workspace')
    httpd = HTTPServer(('0.0.0.0', 8080), HTMLFileHandler)
    print("HTML文件服务器已启动: http://localhost:8080")
    print("文件列表API: http://localhost:8080/api/html/list")
    httpd.serve_forever()
```

## 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 检查端口使用情况
lsof -i :3000
netstat -tulpn | grep :3000

# 杀死占用端口的进程
sudo kill -9 <PID>
```

#### 2. 无法访问HTML文件
```bash
# 检查文件权限
ls -la workspace/
chmod 644 workspace/*.html

# 检查Docker容器状态
docker ps
docker logs openhands-app-<timestamp>
```

#### 3. 防火墙问题
```bash
# macOS
sudo pfctl -f /etc/pf.conf

# Linux
sudo ufw status
sudo ufw allow 3000/tcp
```

#### 4. 内存或资源不足
```bash
# 增加Docker资源限制
# 在Docker Desktop设置中调整内存到至少4GB

# 或者在docker-compose.yml中设置
services:
  openhands:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
```

### 日志查看

```bash
# 查看OpenHands日志
tail -f logs/openhands.log

# 查看Docker容器日志
docker logs -f openhands-app-$(date +%Y%m%d)

# 查看特定服务日志
journalctl -f -u docker
```

## 安全注意事项

1. **网络访问控制**
   - 只在可信网络环境中开放端口
   - 使用防火墙限制访问来源
   - 考虑使用VPN或SSH隧道

2. **文件权限管理**
   - 定期检查HTML文件权限
   - 避免敏感信息暴露在HTML文件中
   - 使用临时目录存储敏感输出

3. **访问日志监控**
   - 启用访问日志记录
   - 监控异常访问行为
   - 定期审计文件访问记录

## 最佳实践

1. **目录结构规范**
   ```
   workspace/
   ├── html_reports/          # HTML报告目录
   ├── data_analysis/         # 数据分析HTML
   ├── visualizations/        # 可视化文件
   └── temp_html/            # 临时HTML文件
   ```

2. **文件命名规范**
   - 使用时间戳：`analysis_20250820_143022.html`
   - 包含任务ID：`task_12345_report.html`
   - 描述性名称：`user_behavior_analysis.html`

3. **自动化工作流**
   - 设置HTML文件生成后的自动通知
   - 配置定期清理临时HTML文件
   - 实现HTML文件的版本控制

## 总结

通过以上方法，你可以轻松地远程访问OpenHands沙箱容器中的HTML文件。建议根据具体使用场景选择最适合的方法：

- **开发测试**: 使用方法一（内置文件服务器）
- **生产环境**: 使用方法四（云端部署）
- **本地调试**: 使用方法三（卷挂载）
- **特殊端口需求**: 使用方法二（端口映射）

记住始终要考虑安全性，特别是在生产环境中使用时。