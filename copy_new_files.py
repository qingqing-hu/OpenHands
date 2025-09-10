#!/usr/bin/env python3
"""
复制源码版本中新增的文件到用户版本
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

def test_copy_files(user_dir: str, source_dir: str, new_files: List[str], max_test_files: int = 10) -> bool:
    """测试复制前几个文件，验证脚本正确性"""
    print(f"\n🧪 测试模式：复制前 {min(len(new_files), max_test_files)} 个文件进行验证")
    print("="*60)
    
    test_files = new_files[:max_test_files]
    success_count = 0
    
    for file_path in test_files:
        try:
            source_file = Path(source_dir) / file_path
            target_file = Path(user_dir) / file_path
            
            print(f"测试复制: {file_path}")
            
            # 检查源文件是否存在
            if not source_file.exists():
                print(f"  ❌ 源文件不存在: {source_file}")
                continue
            
            # 创建目标目录
            target_file.parent.mkdir(parents=True, exist_ok=True)
            
            # 复制文件
            shutil.copy2(source_file, target_file)
            
            # 验证复制成功
            if target_file.exists():
                source_size = source_file.stat().st_size
                target_size = target_file.stat().st_size
                if source_size == target_size:
                    print(f"  ✅ 复制成功 ({target_size} bytes)")
                    success_count += 1
                else:
                    print(f"  ❌ 文件大小不匹配: 源({source_size}) vs 目标({target_size})")
            else:
                print(f"  ❌ 目标文件未创建")
                
        except Exception as e:
            print(f"  ❌ 复制失败: {e}")
    
    print(f"\n测试结果: {success_count}/{len(test_files)} 文件复制成功")
    
    if success_count == len(test_files):
        print("✅ 测试通过！脚本工作正常")
        return True
    else:
        print("❌ 测试失败！请检查脚本或路径")
        return False

def copy_all_files(user_dir: str, source_dir: str, new_files: List[str], dry_run: bool = False) -> dict:
    """复制所有新增文件"""
    print(f"\n📁 {'模拟' if dry_run else '实际'}复制 {len(new_files)} 个新增文件")
    print("="*60)
    
    results = {
        'success': [],
        'failed': [],
        'skipped': []
    }
    
    for i, file_path in enumerate(new_files, 1):
        try:
            source_file = Path(source_dir) / file_path
            target_file = Path(user_dir) / file_path
            
            # 显示进度
            if i % 50 == 0 or i <= 10 or i == len(new_files):
                print(f"进度 [{i:4d}/{len(new_files)}]: {file_path}")
            
            # 检查源文件是否存在
            if not source_file.exists():
                print(f"  ⚠️  源文件不存在，跳过: {file_path}")
                results['skipped'].append(file_path)
                continue
            
            # 检查目标文件是否已存在
            if target_file.exists():
                print(f"  ⚠️  目标文件已存在，跳过: {file_path}")
                results['skipped'].append(file_path)
                continue
            
            if not dry_run:
                # 创建目标目录
                target_file.parent.mkdir(parents=True, exist_ok=True)
                
                # 复制文件
                shutil.copy2(source_file, target_file)
                
                # 验证复制成功
                if target_file.exists():
                    results['success'].append(file_path)
                else:
                    results['failed'].append(file_path)
            else:
                # 模拟模式，只检查目录创建
                print(f"  📋 模拟: 将创建目录 {target_file.parent} 并复制文件")
                results['success'].append(file_path)
                
        except Exception as e:
            print(f"  ❌ 处理失败 {file_path}: {e}")
            results['failed'].append(file_path)
    
    return results

def print_summary(results: dict, dry_run: bool = False):
    """打印结果摘要"""
    total = len(results['success']) + len(results['failed']) + len(results['skipped'])
    
    print(f"\n📊 {'模拟' if dry_run else '实际'}复制结果摘要:")
    print("="*60)
    print(f"总文件数: {total}")
    print(f"✅ 成功: {len(results['success'])}")
    print(f"❌ 失败: {len(results['failed'])}")
    print(f"⚠️  跳过: {len(results['skipped'])}")
    
    if results['failed']:
        print(f"\n❌ 失败文件列表:")
        for file_path in results['failed']:
            print(f"  - {file_path}")
    
    if results['skipped']:
        print(f"\n⚠️  跳过文件列表 (前10个):")
        for file_path in results['skipped'][:10]:
            print(f"  - {file_path}")
        if len(results['skipped']) > 10:
            print(f"  ... 以及其他 {len(results['skipped']) - 10} 个文件")

def main():
    user_dir = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    source_dir = "/tmp/source-analysis/OpenHands-main"
    
    if not os.path.exists(user_dir):
        print(f"❌ 错误: 用户目录不存在: {user_dir}")
        sys.exit(1)
    
    if not os.path.exists(source_dir):
        print(f"❌ 错误: 源码目录不存在: {source_dir}")
        sys.exit(1)
    
    print("🔄 步骤 1: 查找新增文件")
    print("="*60)
    new_files = find_new_files(user_dir, source_dir)
    
    if not new_files:
        print("✅ 没有发现新增文件，无需复制")
        return
    
    print(f"\n发现 {len(new_files)} 个新增文件")
    
    # 让用户选择操作模式
    print("\n请选择操作模式:")
    print("1. 测试模式 - 只复制前10个文件进行验证")
    print("2. 模拟模式 - 完整模拟复制过程但不实际复制")
    print("3. 实际复制 - 复制所有新增文件")
    print("4. 退出")
    
    while True:
        choice = input("\n请输入选择 (1-4): ").strip()
        
        if choice == '1':
            print("\n🔄 步骤 2: 测试模式")
            success = test_copy_files(user_dir, source_dir, new_files, 10)
            if success:
                print("\n✅ 测试成功！现在可以运行实际复制")
            else:
                print("\n❌ 测试失败！请检查问题")
            break
            
        elif choice == '2':
            print("\n🔄 步骤 2: 模拟模式")
            results = copy_all_files(user_dir, source_dir, new_files, dry_run=True)
            print_summary(results, dry_run=True)
            break
            
        elif choice == '3':
            print("\n⚠️  即将复制 {} 个文件到您的项目中".format(len(new_files)))
            confirm = input("确定要继续吗? (y/N): ").strip().lower()
            
            if confirm in ['y', 'yes']:
                print("\n🔄 步骤 2: 实际复制文件")
                results = copy_all_files(user_dir, source_dir, new_files, dry_run=False)
                print_summary(results, dry_run=False)
                
                # 生成复制报告
                report_file = Path(user_dir) / "copy_files_report.md"
                with open(report_file, 'w', encoding='utf-8') as f:
                    f.write("# 文件复制报告\n\n")
                    f.write(f"复制时间: {os.popen('date').read().strip()}\n")
                    f.write(f"总文件数: {len(new_files)}\n")
                    f.write(f"成功复制: {len(results['success'])}\n")
                    f.write(f"复制失败: {len(results['failed'])}\n")
                    f.write(f"跳过文件: {len(results['skipped'])}\n\n")
                    
                    if results['success']:
                        f.write("## 成功复制的文件\n\n")
                        for file_path in results['success']:
                            f.write(f"- `{file_path}`\n")
                    
                    if results['failed']:
                        f.write("\n## 复制失败的文件\n\n")
                        for file_path in results['failed']:
                            f.write(f"- `{file_path}`\n")
                
                print(f"\n📄 详细报告已保存到: {report_file}")
            else:
                print("❌ 取消复制操作")
            break
            
        elif choice == '4':
            print("👋 退出程序")
            sys.exit(0)
            
        else:
            print("❌ 无效选择，请输入 1-4")

if __name__ == "__main__":
    main()