#!/bin/bash
# 使用Docker容器创建离线APT源，避免安装dpkg-scanpackages

set -e

if [ -z "$1" ]; then
    echo "用法: $0 <deb包目录>"
    echo "示例: $0 openhands-deps-download"
    exit 1
fi

DEB_DIR="$1"

cd "$DEB_DIR"

# 检查是否有deb包
if [ ! -f *.deb ]; then
    echo "错误: 目录 $DEB_DIR 中没有deb包"
    exit 1
fi

# 使用临时容器创建APT源
docker run --rm -v $(pwd):/workspace debian:bookworm-slim bash -c "
set -e

# 安装dpkg-dev
apt-get update && apt-get install -y dpkg-dev

# 创建APT源结构
cd /workspace
mkdir -p offline-repo/dists/stable/main/binary-amd64
mkdir -p offline-repo/dists/stable/main/binary-all
mkdir -p offline-repo/pool/main

# 复制deb包
cp *.deb offline-repo/pool/main/

# 创建Packages文件（amd64架构）
cd offline-repo
dpkg-scanpackages pool/main /dev/null > dists/stable/main/binary-amd64/Packages
gzip -9c dists/stable/main/binary-amd64/Packages > dists/stable/main/binary-amd64/Packages.gz

# 创建空的Packages文件（all架构）
touch dists/stable/main/binary-all/Packages
gzip -9c dists/stable/main/binary-all/Packages > dists/stable/main/binary-all/Packages.gz

# 创建Release文件，支持多架构
cat > dists/stable/Release << EOF
Archive: stable
Version: 12.5
Component: main
Origin: Local
Label: Local
Architectures: amd64 all
EOF

echo "离线APT源创建完成"
"