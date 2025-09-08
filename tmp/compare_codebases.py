#!/usr/bin/env python3
"""
全量代码比较脚本
比较你的代码和同事的代码，找出：
1. 只有你有的文件（你新增的）
2. 只有同事有的文件（同事新增的）
3. 都有但内容不同的文件（真正的冲突）
4. 完全相同的文件
"""

import os
import hashlib
from pathlib import Path
import difflib

def get_file_hash(file_path):
    """计算文件的MD5哈希值"""
    try:
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except Exception:
        return None

def should_ignore_path(relative_path):
    """检查路径是否应该被忽略"""
    ignore_patterns = [
        'frontend/build/',
        'frontend/tests/', 
        'frontend/.react-router/',
        'frontend/__tests__/',
        'tmp/'
    ]
    
    # 检查是否匹配忽略的路径模式
    for pattern in ignore_patterns:
        if relative_path.startswith(pattern):
            return True
    
    return False

def get_all_files(directory, ignore_patterns=None):
    """递归获取目录下所有文件的相对路径"""
    if ignore_patterns is None:
        ignore_patterns = {'.git', '.DS_Store', '__pycache__', 'node_modules', '.pytest_cache'}
    
    files = {}
    for root, dirs, filenames in os.walk(directory):
        # 过滤掉忽略的目录
        dirs[:] = [d for d in dirs if d not in ignore_patterns]
        
        for filename in filenames:
            if filename in ignore_patterns:
                continue
                
            full_path = os.path.join(root, filename)
            relative_path = os.path.relpath(full_path, directory)
            # 统一路径分隔符
            relative_path = relative_path.replace('\\', '/')
            
            # 检查是否应该忽略这个文件路径
            if should_ignore_path(relative_path):
                continue
                
            files[relative_path] = full_path
    
    return files

def compare_codebases(your_dir, colleague_dir):
    """比较两个代码库"""
    print("🔍 开始扫描文件...")
    
    your_files = get_all_files(your_dir)
    colleague_files = get_all_files(colleague_dir)
    
    print(f"📁 你的代码库文件数：{len(your_files)}")
    print(f"📁 同事的代码库文件数：{len(colleague_files)}")
    print()
    
    # 分析文件差异
    your_only = set(your_files.keys()) - set(colleague_files.keys())
    colleague_only = set(colleague_files.keys()) - set(your_files.keys())
    common_files = set(your_files.keys()) & set(colleague_files.keys())
    
    # 检查共同文件的内容差异
    identical_files = []
    different_files = []
    
    print("🔄 比较共同文件内容...")
    for relative_path in common_files:
        your_hash = get_file_hash(your_files[relative_path])
        colleague_hash = get_file_hash(colleague_files[relative_path])
        
        if your_hash == colleague_hash:
            identical_files.append(relative_path)
        else:
            different_files.append(relative_path)
    
    # 输出结果
    print("=" * 80)
    print("📊 代码比较结果")
    print("=" * 80)
    
    print(f"\n✅ 完全相同的文件：{len(identical_files)} 个")
    
    print(f"\n🆕 只有你有的文件：{len(your_only)} 个")
    if your_only:
        sorted_your_only = sorted(your_only)
        for i, file in enumerate(sorted_your_only[:10]):  # 只显示前10个
            print(f"   {i+1}. {file}")
        if len(sorted_your_only) > 10:
            print(f"   ... 还有 {len(sorted_your_only) - 10} 个文件")
    
    print(f"\n🎯 只有同事有的文件：{len(colleague_only)} 个")
    if colleague_only:
        sorted_colleague_only = sorted(colleague_only)
        for i, file in enumerate(sorted_colleague_only[:10]):  # 只显示前10个
            print(f"   {i+1}. {file}")
        if len(sorted_colleague_only) > 10:
            print(f"   ... 还有 {len(sorted_colleague_only) - 10} 个文件")
    
    print(f"\n⚡ 真正冲突的文件（内容不同）：{len(different_files)} 个")
    if different_files:
        sorted_different = sorted(different_files)
        for i, file in enumerate(sorted_different):
            print(f"   {i+1}. {file}")
    
    print("\n" + "=" * 80)
    print("📈 统计摘要")
    print("=" * 80)
    print(f"总共扫描文件：{len(your_files | colleague_files)}")
    print(f"相同文件：{len(identical_files)}")
    print(f"你独有：{len(your_only)}")
    print(f"同事独有：{len(colleague_only)}")
    print(f"内容冲突：{len(different_files)}")
    
    # 保存详细结果到文件
    save_detailed_results(your_only, colleague_only, different_files, identical_files)
    
    return {
        'your_only': your_only,
        'colleague_only': colleague_only,
        'different_files': different_files,
        'identical_files': identical_files
    }

def save_detailed_results(your_only, colleague_only, different_files, identical_files):
    """保存详细结果到文件"""
    with open('/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/代码比较详细结果.txt', 'w', encoding='utf-8') as f:
        f.write("代码比较详细结果\n")
        f.write("=" * 50 + "\n\n")
        
        f.write(f"📊 统计摘要\n")
        f.write(f"只有你有的文件：{len(your_only)} 个\n")
        f.write(f"只有同事有的文件：{len(colleague_only)} 个\n")
        f.write(f"内容冲突的文件：{len(different_files)} 个\n")
        f.write(f"完全相同的文件：{len(identical_files)} 个\n\n")
        
        f.write("🆕 只有你有的文件：\n")
        f.write("-" * 30 + "\n")
        for file in sorted(your_only):
            f.write(f"{file}\n")
        
        f.write("\n🎯 只有同事有的文件：\n")
        f.write("-" * 30 + "\n")
        for file in sorted(colleague_only):
            f.write(f"{file}\n")
        
        f.write("\n⚡ 真正冲突的文件（内容不同）：\n")
        f.write("-" * 30 + "\n")
        for file in sorted(different_files):
            f.write(f"{file}\n")
        
        # 不保存相同文件列表，因为可能很长
        f.write(f"\n✅ 完全相同的文件：{len(identical_files)} 个 (列表已省略)\n")

if __name__ == "__main__":
    # 设置路径
    your_codebase = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    colleague_codebase = "/tmp/colleague-analysis/colleague-code"
    
    print("🚀 开始全量代码比较...")
    print(f"你的代码路径：{your_codebase}")
    print(f"同事的代码路径：{colleague_codebase}")
    print()
    
    results = compare_codebases(your_codebase, colleague_codebase)
    
    print(f"\n💾 详细结果已保存到：tmp/代码比较详细结果.txt")