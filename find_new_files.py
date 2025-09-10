#!/usr/bin/env python3
"""
找出源码版本中新增的文件（用户版本中不存在的文件）
"""

import os
import sys
from pathlib import Path
from typing import Set, List

def get_all_files(directory: str, exclude_dirs: Set[str] = None) -> Set[str]:
    """
    获取目录中所有文件的相对路径集合
    
    Args:
        directory: 目录路径
        exclude_dirs: 需要排除的目录名集合
    
    Returns:
        文件相对路径的集合
    """
    if exclude_dirs is None:
        exclude_dirs = {
            '.git', '__pycache__', '.pytest_cache', 'node_modules', 
            '.vscode', '.idea', '.DS_Store', 'dist', 'build',
            '.mypy_cache', '.tox', 'venv', 'env'
        }
    
    files = set()
    base_path = Path(directory)
    
    for root, dirs, filenames in os.walk(directory):
        # 过滤掉排除的目录
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        
        root_path = Path(root)
        for filename in filenames:
            file_path = root_path / filename
            # 计算相对路径
            relative_path = file_path.relative_to(base_path)
            files.add(str(relative_path))
    
    return files

def find_new_files(user_dir: str, source_dir: str) -> List[str]:
    """
    找出源码版本中新增的文件
    
    Args:
        user_dir: 用户版本目录
        source_dir: 源码版本目录
    
    Returns:
        新增文件列表，按路径排序
    """
    print(f"扫描用户版本目录: {user_dir}")
    user_files = get_all_files(user_dir)
    print(f"用户版本文件数量: {len(user_files)}")
    
    print(f"扫描源码版本目录: {source_dir}")
    source_files = get_all_files(source_dir)
    print(f"源码版本文件数量: {len(source_files)}")
    
    # 找出源码版本中有，但用户版本中没有的文件
    new_files = source_files - user_files
    
    return sorted(list(new_files))

def categorize_files(files: List[str]) -> dict:
    """
    将文件按类型分类
    """
    categories = {
        'Python后端': [],
        '前端': [],
        '配置文件': [],
        '文档': [],
        '测试': [],
        '其他': []
    }
    
    for file in files:
        file_lower = file.lower()
        if file.endswith('.py'):
            categories['Python后端'].append(file)
        elif any(file.startswith(prefix) for prefix in ['frontend/', 'web/']):
            categories['前端'].append(file)
        elif file.endswith(('.md', '.rst', '.txt')) or 'doc' in file_lower:
            categories['文档'].append(file)
        elif 'test' in file_lower or file.startswith('tests/'):
            categories['测试'].append(file)
        elif any(file.endswith(ext) for ext in ['.yml', '.yaml', '.json', '.toml', '.cfg', '.ini', '.conf']):
            categories['配置文件'].append(file)
        else:
            categories['其他'].append(file)
    
    return categories

def main():
    user_dir = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    source_dir = "/tmp/source-analysis/OpenHands-main"
    
    if not os.path.exists(user_dir):
        print(f"错误: 用户目录不存在: {user_dir}")
        sys.exit(1)
    
    if not os.path.exists(source_dir):
        print(f"错误: 源码目录不存在: {source_dir}")
        sys.exit(1)
    
    print("="*60)
    print("查找源码版本中新增的文件")
    print("="*60)
    
    new_files = find_new_files(user_dir, source_dir)
    
    if not new_files:
        print("✅ 没有发现新增文件")
        return
    
    print(f"\n🔍 发现 {len(new_files)} 个新增文件:")
    print("="*60)
    
    # 按类型分类显示
    categories = categorize_files(new_files)
    
    for category, files in categories.items():
        if files:
            print(f"\n📁 {category} ({len(files)}个):")
            print("-" * 40)
            for file in files:
                print(f"  + {file}")
    
    # 生成报告文件
    report_file = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/new_files_report.md"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# 源码版本新增文件报告\n\n")
        f.write(f"扫描时间: {os.popen('date').read().strip()}\n")
        f.write(f"总计新增文件: {len(new_files)}个\n\n")
        
        for category, files in categories.items():
            if files:
                f.write(f"## {category} ({len(files)}个)\n\n")
                for file in files:
                    f.write(f"- `{file}`\n")
                f.write("\n")
        
        f.write("## 完整文件列表\n\n")
        for file in new_files:
            f.write(f"- `{file}`\n")
    
    print(f"\n📄 详细报告已保存到: {report_file}")

if __name__ == "__main__":
    main()