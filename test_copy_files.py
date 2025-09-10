#!/usr/bin/env python3
"""
测试复制新增文件脚本（非交互式版本）
"""

import os
import shutil
import sys
from pathlib import Path
from typing import List, Set

def get_all_files(directory: str, exclude_dirs: Set[str] = None) -> Set[str]:
    """获取目录中所有文件的相对路径集合"""
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
    """找出源码版本中新增的文件"""
    print(f"扫描用户版本目录: {user_dir}")
    user_files = get_all_files(user_dir)
    print(f"用户版本文件数量: {len(user_files)}")
    
    print(f"扫描源码版本目录: {source_dir}")
    source_files = get_all_files(source_dir)
    print(f"源码版本文件数量: {len(source_files)}")
    
    # 找出源码版本中有，但用户版本中没有的文件
    new_files = source_files - user_files
    
    return sorted(list(new_files))

def test_copy_files(user_dir: str, source_dir: str, new_files: List[str], max_test_files: int = 5) -> dict:
    """测试复制前几个文件，验证脚本正确性"""
    print(f"\n🧪 测试模式：复制前 {min(len(new_files), max_test_files)} 个文件进行验证")
    print("="*60)
    
    test_files = new_files[:max_test_files]
    results = {
        'success': [],
        'failed': [],
        'details': []
    }
    
    for file_path in test_files:
        try:
            source_file = Path(source_dir) / file_path
            target_file = Path(user_dir) / file_path
            
            print(f"测试复制: {file_path}")
            
            # 检查源文件是否存在
            if not source_file.exists():
                error_msg = f"源文件不存在: {source_file}"
                print(f"  ❌ {error_msg}")
                results['failed'].append(file_path)
                results['details'].append(f"{file_path}: {error_msg}")
                continue
            
            # 获取源文件信息
            source_size = source_file.stat().st_size
            print(f"  📄 源文件大小: {source_size} bytes")
            
            # 检查目标文件是否已存在
            if target_file.exists():
                target_size = target_file.stat().st_size
                print(f"  ⚠️  目标文件已存在 (大小: {target_size} bytes)")
                if source_size == target_size:
                    print(f"  ✅ 文件已存在且大小匹配，视为成功")
                    results['success'].append(file_path)
                else:
                    print(f"  ❌ 文件已存在但大小不匹配")
                    results['failed'].append(file_path)
                continue
            
            # 创建目标目录
            target_file.parent.mkdir(parents=True, exist_ok=True)
            print(f"  📁 创建目录: {target_file.parent}")
            
            # 复制文件
            shutil.copy2(source_file, target_file)
            
            # 验证复制成功
            if target_file.exists():
                target_size = target_file.stat().st_size
                if source_size == target_size:
                    print(f"  ✅ 复制成功 ({target_size} bytes)")
                    results['success'].append(file_path)
                    results['details'].append(f"{file_path}: 复制成功 ({target_size} bytes)")
                else:
                    error_msg = f"文件大小不匹配: 源({source_size}) vs 目标({target_size})"
                    print(f"  ❌ {error_msg}")
                    results['failed'].append(file_path)
                    results['details'].append(f"{file_path}: {error_msg}")
            else:
                error_msg = "目标文件未创建"
                print(f"  ❌ {error_msg}")
                results['failed'].append(file_path)
                results['details'].append(f"{file_path}: {error_msg}")
                
        except Exception as e:
            error_msg = f"复制失败: {e}"
            print(f"  ❌ {error_msg}")
            results['failed'].append(file_path)
            results['details'].append(f"{file_path}: {error_msg}")
    
    return results

def main():
    user_dir = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    source_dir = "/tmp/source-analysis/OpenHands-main"
    
    print("🔄 文件复制脚本测试")
    print("="*60)
    
    if not os.path.exists(user_dir):
        print(f"❌ 错误: 用户目录不存在: {user_dir}")
        sys.exit(1)
    
    if not os.path.exists(source_dir):
        print(f"❌ 错误: 源码目录不存在: {source_dir}")
        sys.exit(1)
    
    print("🔍 步骤 1: 查找新增文件")
    new_files = find_new_files(user_dir, source_dir)
    
    if not new_files:
        print("✅ 没有发现新增文件，无需复制")
        return
    
    print(f"\n发现 {len(new_files)} 个新增文件")
    
    print("\n📋 前10个新增文件:")
    for i, file_path in enumerate(new_files[:10]):
        print(f"  {i+1:2d}. {file_path}")
    if len(new_files) > 10:
        print(f"  ... 以及其他 {len(new_files) - 10} 个文件")
    
    print("\n🧪 步骤 2: 测试复制功能")
    test_results = test_copy_files(user_dir, source_dir, new_files, 5)
    
    print(f"\n📊 测试结果摘要:")
    print("="*60)
    print(f"测试文件数: 5")
    print(f"✅ 成功: {len(test_results['success'])}")
    print(f"❌ 失败: {len(test_results['failed'])}")
    
    if test_results['details']:
        print(f"\n📝 详细结果:")
        for detail in test_results['details']:
            print(f"  - {detail}")
    
    if len(test_results['success']) == 5:
        print(f"\n✅ 测试完全成功！脚本可以正常工作")
        print(f"💡 您现在可以运行完整的复制脚本来复制所有 {len(new_files)} 个文件")
        
        # 清理测试文件
        cleanup_count = 0
        for file_path in test_results['success']:
            try:
                target_file = Path(user_dir) / file_path
                if target_file.exists():
                    target_file.unlink()  # 删除文件
                    cleanup_count += 1
            except Exception as e:
                print(f"  ⚠️  清理测试文件失败 {file_path}: {e}")
        
        if cleanup_count > 0:
            print(f"🧹 已清理 {cleanup_count} 个测试文件")
        
    elif len(test_results['failed']) == 0:
        print(f"\n⚠️  部分测试成功，脚本基本可用")
    else:
        print(f"\n❌ 测试存在问题，请检查错误信息")
    
    print(f"\n📄 如需复制所有文件，请运行: python copy_new_files.py")

if __name__ == "__main__":
    main()