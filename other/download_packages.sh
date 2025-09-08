#!/bin/bash
# 在外网环境执行此脚本，下载所有依赖包

set -e

DOWNLOAD_DIR="openhands-deps-download"
mkdir -p $DOWNLOAD_DIR
cd $DOWNLOAD_DIR

# 创建一个临时容器来下载包
docker run --rm -v $(pwd):/output python:3.12.10-slim bash -c "
# 更新包列表
apt-get update

# 创建包下载目录
mkdir -p /tmp/packages

# 下载所有需要的包及其依赖到指定目录
apt-get install --download-only -o=dir::cache::archives=/tmp/packages -y \
    curl make git build-essential ssh sudo dpkg-dev ca-certificates gnupg

# 只复制deb包，排除锁文件和临时文件
find /tmp/packages -name '*.deb' -exec cp {} /output/ \;

# 创建包列表文件
echo '下载的包列表:' > /output/package-list.txt
find /tmp/packages -name '*.deb' -exec basename {} \; | sort > /output/package-list.txt
"