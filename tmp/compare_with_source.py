#!/usr/bin/env python3
"""
比较冲突文件与官方源码的一致性分析脚本
"""

import os
import hashlib
import re
from pathlib import Path

def get_file_hash(file_path):
    """计算文件的MD5哈希值"""
    try:
        with open(file_path, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except Exception:
        return None

def read_conflict_files_from_report():
    """从代码比较详细结果.txt中读取冲突文件列表"""
    report_file = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/代码比较详细结果.txt"
    conflict_files = []
    
    try:
        with open(report_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 找到冲突文件部分
        conflict_section = re.search(r'⚡ 真正冲突的文件（内容不同）：\n-{30}\n(.*?)(?=\n\n|\n✅|$)', content, re.DOTALL)
        
        if conflict_section:
            conflict_lines = conflict_section.group(1).strip().split('\n')
            for line in conflict_lines:
                if line.strip():
                    conflict_files.append(line.strip())
        
    except Exception as e:
        print(f"读取报告文件出错: {e}")
    
    return conflict_files

def compare_with_source():
    """比较冲突文件与官方源码的一致性"""
    # 路径配置
    your_codebase = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    colleague_codebase = "/tmp/colleague-analysis/colleague-code"
    official_source = "/tmp/source-analysis/OpenHands-main"
    
    # 读取冲突文件列表
    conflict_files = read_conflict_files_from_report()
    
    if not conflict_files:
        print("❌ 未找到冲突文件列表")
        return
    
    print(f"📋 找到 {len(conflict_files)} 个冲突文件")
    print()
    
    # 创建结果列表
    results = []
    
    print("🔍 开始比较文件...")
    for file_path in conflict_files:
        # 构建完整路径
        your_file = os.path.join(your_codebase, file_path)
        colleague_file = os.path.join(colleague_codebase, file_path)
        source_file = os.path.join(official_source, file_path)
        
        # 计算哈希值
        your_hash = get_file_hash(your_file)
        colleague_hash = get_file_hash(colleague_file)
        source_hash = get_file_hash(source_file)
        
        # 比较一致性
        your_matches_source = "是" if your_hash and source_hash and your_hash == source_hash else "否"
        colleague_matches_source = "是" if colleague_hash and source_hash and colleague_hash == source_hash else "否"
        
        # 添加到结果
        results.append({
            'file': file_path,
            'your_matches': your_matches_source,
            'colleague_matches': colleague_matches_source,
            'source_exists': "是" if source_hash else "否"
        })
        
        # 显示进度
        print(f"✓ {file_path}")
    
    # 生成表格报告
    generate_report(results)
    
    return results

def generate_report(results):
    """生成表格报告"""
    report_file = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/冲突文件与源码对比报告.md"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# 冲突文件与官方源码对比报告\n\n")
        f.write("**生成时间**：2025年9月8日\n")
        f.write("**对比说明**：比较156个冲突文件与官方OpenHands源码的一致性\n\n")
        
        # 统计信息
        your_matches_count = sum(1 for r in results if r['your_matches'] == '是')
        colleague_matches_count = sum(1 for r in results if r['colleague_matches'] == '是')
        both_different_count = sum(1 for r in results if r['your_matches'] == '否' and r['colleague_matches'] == '否')
        source_missing_count = sum(1 for r in results if r['source_exists'] == '否')
        
        f.write("## 📊 统计摘要\n\n")
        f.write(f"- 总冲突文件数：{len(results)}\n")
        f.write(f"- 你的代码与源码一致：{your_matches_count} 个\n")
        f.write(f"- 同事代码与源码一致：{colleague_matches_count} 个\n")
        f.write(f"- 双方都与源码不同：{both_different_count} 个\n")
        f.write(f"- 源码中不存在的文件：{source_missing_count} 个\n\n")
        
        # 详细表格
        f.write("## 📋 详细对比表格\n\n")
        f.write("| 文件名 | 我的代码是否与源码一致 | 同事代码是否与源码一致 | 源码是否存在 |\n")
        f.write("|--------|----------------------|----------------------|-------------|\n")
        
        for result in results:
            f.write(f"| {result['file']} | {result['your_matches']} | {result['colleague_matches']} | {result['source_exists']} |\n")
        
        # 分类分析
        f.write("\n## 🔍 分类分析\n\n")
        
        # 你的代码与源码一致的文件
        your_matches = [r for r in results if r['your_matches'] == '是']
        if your_matches:
            f.write(f"### ✅ 你的代码与源码一致（{len(your_matches)}个）\n\n")
            for r in your_matches:
                f.write(f"- {r['file']}\n")
            f.write("\n")
        
        # 同事代码与源码一致的文件
        colleague_matches = [r for r in results if r['colleague_matches'] == '是']
        if colleague_matches:
            f.write(f"### 🎯 同事代码与源码一致（{len(colleague_matches)}个）\n\n")
            for r in colleague_matches:
                f.write(f"- {r['file']}\n")
            f.write("\n")
        
        # 双方都与源码不同的文件
        both_different = [r for r in results if r['your_matches'] == '否' and r['colleague_matches'] == '否']
        if both_different:
            f.write(f"### ⚠️ 双方都与源码不同（{len(both_different)}个）\n\n")
            for r in both_different:
                f.write(f"- {r['file']}\n")
            f.write("\n")
        
        # 源码中不存在的文件
        source_missing = [r for r in results if r['source_exists'] == '否']
        if source_missing:
            f.write(f"### ❓ 源码中不存在的文件（{len(source_missing)}个）\n\n")
            for r in source_missing:
                f.write(f"- {r['file']}\n")
            f.write("\n")
    
    print(f"\n📄 详细报告已保存到: tmp/冲突文件与源码对比报告.md")

def print_summary_table(results):
    """打印简化的表格到控制台"""
    print("\n" + "="*80)
    print("📋 冲突文件与官方源码对比表格")
    print("="*80)
    print()
    
    # 打印表头
    print(f"{'文件名':<60} {'我的代码':<10} {'同事代码':<10}")
    print("-" * 80)
    
    # 打印数据行
    for result in results[:20]:  # 只显示前20个
        file_name = result['file']
        if len(file_name) > 58:
            file_name = file_name[:55] + "..."
        
        print(f"{file_name:<60} {'是' if result['your_matches'] == '是' else '否':<10} {'是' if result['colleague_matches'] == '是' else '否':<10}")
    
    if len(results) > 20:
        print(f"... 还有 {len(results) - 20} 个文件")
    
    print()

if __name__ == "__main__":
    print("🚀 开始比较冲突文件与官方源码的一致性...")
    print()
    
    results = compare_with_source()
    
    if results:
        print_summary_table(results)
        
        # 打印统计摘要
        your_matches = sum(1 for r in results if r['your_matches'] == '是')
        colleague_matches = sum(1 for r in results if r['colleague_matches'] == '是')
        both_different = sum(1 for r in results if r['your_matches'] == '否' and r['colleague_matches'] == '否')
        
        print("📊 统计摘要:")
        print(f"   你的代码与源码一致: {your_matches} 个")
        print(f"   同事代码与源码一致: {colleague_matches} 个")
        print(f"   双方都与源码不同: {both_different} 个")