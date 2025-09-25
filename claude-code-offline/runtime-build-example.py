#!/usr/bin/env python3
"""
示例：如何在runtime构建中集成Claude Code + MCP服务
"""

import os
import docker
from pathlib import Path
from openhands.runtime.builder import DockerRuntimeBuilder
from openhands.runtime.utils.runtime_build import build_runtime_image

def build_claude_mcp_runtime():
    """构建集成了Claude Code和MCP服务的runtime镜像"""
    
    # 1. 准备extra_deps，这将在Dockerfile中执行
    extra_deps = """
# Install Claude Code with MCP Services
COPY ./claude-mcp-integration /claude-mcp-integration
RUN /claude-mcp-integration/install-claude-with-mcp.sh && rm -rf /claude-mcp-integration

# Install additional MCP dependencies
RUN apt-get update && apt-get install -y \\
    jq curl \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Ensure Node.js and npm are available for MCP services
# (already available in the base runtime image)
"""

    # 2. 设置基础镜像和构建参数
    base_image = "all-hands-ai/runtime:0.55-nikolaik"
    
    # 3. 初始化Docker构建器
    docker_client = docker.from_env()
    runtime_builder = DockerRuntimeBuilder(docker_client)
    
    # 4. 构建镜像
    print("Building Claude Code + MCP integrated runtime image...")
    
    runtime_image = build_runtime_image(
        base_image=base_image,
        runtime_builder=runtime_builder,
        extra_deps=extra_deps,
        platform=None,  # 自动检测
        force_rebuild=False,  # 使用缓存
        enable_browser=True,
    )
    
    print(f"✅ Runtime image built successfully: {runtime_image}")
    return runtime_image

def build_claude_mcp_runtime_in_folder():
    """在指定文件夹中准备构建内容（不实际构建）"""
    
    build_folder = Path("./runtime-build")
    build_folder.mkdir(exist_ok=True)
    
    extra_deps = """
# Install Claude Code with MCP Services
COPY ./claude-mcp-integration /claude-mcp-integration
RUN /claude-mcp-integration/install-claude-with-mcp.sh && rm -rf /claude-mcp-integration

# Install additional MCP dependencies
RUN apt-get update && apt-get install -y \\
    jq curl \\
    && apt-get clean && rm -rf /var/lib/apt/lists/*
"""

    base_image = "all-hands-ai/runtime:0.55-nikolaik"
    
    # 创建一个临时的DockerRuntimeBuilder用于dry run
    docker_client = docker.from_env()
    runtime_builder = DockerRuntimeBuilder(docker_client)
    
    print(f"Preparing build folder at: {build_folder.absolute()}")
    
    # 使用dry_run模式，只准备构建文件夹，不实际构建
    runtime_image = build_runtime_image(
        base_image=base_image,
        runtime_builder=runtime_builder,
        extra_deps=extra_deps,
        build_folder=str(build_folder),
        dry_run=True,  # 只准备文件，不构建
        force_rebuild=False,
        enable_browser=True,
    )
    
    print(f"✅ Build folder prepared: {build_folder}")
    print(f"   Expected image name: {runtime_image}")
    print(f"   Files in build folder: {list(build_folder.iterdir())}")
    
    return str(build_folder)

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "dry-run":
        # 只准备构建文件夹
        build_claude_mcp_runtime_in_folder()
    else:
        # 实际构建镜像
        build_claude_mcp_runtime()
