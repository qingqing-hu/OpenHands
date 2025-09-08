#!/usr/bin/env python3
"""
代码合并策略分类脚本
根据文件比较结果，按照合并策略对文件进行分类
"""

import re
import os

def read_detailed_results():
    """读取代码比较详细结果.txt"""
    report_file = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/代码比较详细结果.txt"
    
    your_only_files = []
    colleague_only_files = []
    conflict_files = []
    
    try:
        with open(report_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 读取你独有的文件
        your_section = re.search(r'🆕 只有你有的文件：\n-{30}\n(.*?)(?=\n\n🎯)', content, re.DOTALL)
        if your_section:
            your_lines = your_section.group(1).strip().split('\n')
            for line in your_lines:
                if line.strip():
                    your_only_files.append(line.strip())
        
        # 读取同事独有的文件
        colleague_section = re.search(r'🎯 只有同事有的文件：\n-{30}\n(.*?)(?=\n\n⚡)', content, re.DOTALL)
        if colleague_section:
            colleague_lines = colleague_section.group(1).strip().split('\n')
            for line in colleague_lines:
                if line.strip():
                    colleague_only_files.append(line.strip())
        
        # 读取冲突文件
        conflict_section = re.search(r'⚡ 真正冲突的文件（内容不同）：\n-{30}\n(.*?)(?=\n\n✅|$)', content, re.DOTALL)
        if conflict_section:
            conflict_lines = conflict_section.group(1).strip().split('\n')
            for line in conflict_lines:
                if line.strip():
                    conflict_files.append(line.strip())
    
    except Exception as e:
        print(f"读取详细结果文件出错: {e}")
    
    return your_only_files, colleague_only_files, conflict_files

def read_source_comparison():
    """读取冲突文件与源码对比报告.md"""
    report_file = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/冲突文件与源码对比报告.md"
    
    your_matches_source = []
    colleague_matches_source = []
    both_different = []
    
    try:
        with open(report_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 找到表格部分并解析
        table_section = re.search(r'\| 文件名.*?\n\|.*?\n(.*?)(?=\n## |$)', content, re.DOTALL)
        if table_section:
            table_lines = table_section.group(1).strip().split('\n')
            for line in table_lines:
                if line.startswith('|') and '|' in line:
                    # 解析表格行：| 文件名 | 我的代码 | 同事代码 | 源码存在 |
                    parts = [p.strip() for p in line.split('|') if p.strip()]
                    if len(parts) >= 4:
                        filename = parts[0]
                        your_match = parts[1] == '是'
                        colleague_match = parts[2] == '是'
                        
                        if your_match and not colleague_match:
                            your_matches_source.append(filename)
                        elif not your_match and colleague_match:
                            colleague_matches_source.append(filename)
                        elif not your_match and not colleague_match:
                            both_different.append(filename)
    
    except Exception as e:
        print(f"读取源码对比报告出错: {e}")
    
    return your_matches_source, colleague_matches_source, both_different

def classify_files():
    """对文件进行分类"""
    print("📊 正在分析文件分类...")
    
    # 读取基础分类
    your_only, colleague_only, conflicts = read_detailed_results()
    
    # 读取源码对比结果
    your_matches, colleague_matches, both_different = read_source_comparison()
    
    # 计算冲突文件的详细分类
    your_matches_colleague_not = []
    colleague_matches_your_not = []
    
    for file in conflicts:
        if file in your_matches and file not in colleague_matches:
            your_matches_colleague_not.append(file)
        elif file in colleague_matches and file not in your_matches:
            colleague_matches_your_not.append(file)
    
    print(f"✓ 你独有文件: {len(your_only)} 个")
    print(f"✓ 同事独有文件: {len(colleague_only)} 个")
    print(f"✓ 冲突文件总计: {len(conflicts)} 个")
    print(f"  - 你的与源码一致，同事的不一致: {len(your_matches_colleague_not)} 个")
    print(f"  - 你的不一致，同事的与源码一致: {len(colleague_matches_your_not)} 个")
    print(f"  - 双方都与源码不一致: {len(both_different)} 个")
    print()
    
    return {
        'your_only': your_only,
        'colleague_only': colleague_only,
        'your_matches_colleague_not': your_matches_colleague_not,
        'colleague_matches_your_not': colleague_matches_your_not,
        'both_different': both_different
    }

def generate_merge_strategy_report(classification):
    """生成合并策略报告"""
    report_file = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/代码合并策略分类清单.md"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("# 🔀 代码合并策略分类清单\n\n")
        f.write("**生成时间**：2025年9月8日\n")
        f.write("**说明**：根据文件差异情况制定的详细合并策略\n\n")
        
        # 统计摘要
        f.write("## 📊 文件分类统计\n\n")
        f.write(f"| 分类 | 文件数 | 处理策略 |\n")
        f.write(f"|------|--------|----------|\n")
        f.write(f"| 你新增的文件 | {len(classification['your_only'])} | 直接保留 |\n")
        f.write(f"| 同事新增的文件 | {len(classification['colleague_only'])} | 评估后添加 |\n")
        f.write(f"| 你的与源码一致，同事的不一致 | {len(classification['your_matches_colleague_not'])} | 保留同事版本 |\n")
        f.write(f"| 你的不一致，同事的与源码一致 | {len(classification['colleague_matches_your_not'])} | 保留你的版本 |\n")
        f.write(f"| 双方都与源码不一致 | {len(classification['both_different'])} | 手动合并 |\n")
        f.write(f"| **总计** | **{sum(len(v) for v in classification.values())}** | - |\n\n")
        
        # 详细分类
        f.write("## 📋 详细文件清单\n\n")
        
        # 1. 你新增的文件
        if classification['your_only']:
            f.write(f"### 1. 你新增的文件（{len(classification['your_only'])}个）\n")
            f.write("**处理策略**：直接保留，无冲突风险\n\n")
            for i, file in enumerate(classification['your_only'], 1):
                f.write(f"{i}. `{file}`\n")
            f.write("\n")
        
        # 2. 同事新增的文件
        if classification['colleague_only']:
            f.write(f"### 2. 同事新增的文件（{len(classification['colleague_only'])}个）\n")
            f.write("**处理策略**：评估功能价值后决定是否添加\n\n")
            
            # 按类型分组
            insight_ai_files = [f for f in classification['colleague_only'] if 'insight-ai' in f.lower()]
            doc_files = [f for f in classification['colleague_only'] if f.endswith('.md')]
            other_files = [f for f in classification['colleague_only'] if f not in insight_ai_files and f not in doc_files]
            
            if insight_ai_files:
                f.write("#### InsightAI功能文件：\n")
                for i, file in enumerate(insight_ai_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
            
            if doc_files:
                f.write("#### 新增文档：\n")
                for i, file in enumerate(doc_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
            
            if other_files:
                f.write("#### 其他新增文件：\n")
                for i, file in enumerate(other_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
        
        # 3. 你的与源码一致，同事的不一致
        if classification['your_matches_colleague_not']:
            f.write(f"### 3. 你的代码与源码一致，同事代码与源码不一致（{len(classification['your_matches_colleague_not'])}个）\n")
            f.write("**处理策略**：保留同事的版本（包含功能增强）\n")
            f.write("**优先级**：🟢 低风险，同事在源码基础上做了改进\n\n")
            for i, file in enumerate(classification['your_matches_colleague_not'], 1):
                f.write(f"{i}. `{file}`\n")
            f.write("\n")
        
        # 4. 你的不一致，同事的与源码一致
        if classification['colleague_matches_your_not']:
            f.write(f"### 4. 你的代码与源码不一致，同事代码与源码一致（{len(classification['colleague_matches_your_not'])}个）\n")
            f.write("**处理策略**：保留你的版本（包含重要修复，如Moonshot修复）\n")
            f.write("**优先级**：🔴 高风险，需要确保你的修改被保留\n\n")
            
            # 特别标注重要文件
            moonshot_files = [
                'openhands/core/message.py',
                'openhands/memory/conversation_memory.py',
                'openhands/runtime/action_execution_server.py'
            ]
            
            for i, file in enumerate(classification['colleague_matches_your_not'], 1):
                marker = " ⭐ **Moonshot修复**" if file in moonshot_files else ""
                f.write(f"{i}. `{file}`{marker}\n")
            f.write("\n")
        
        # 5. 双方都与源码不一致
        if classification['both_different']:
            f.write(f"### 5. 双方代码都与源码不一致（{len(classification['both_different'])}个）\n")
            f.write("**处理策略**：需要手动合并，逐个分析功能差异\n")
            f.write("**优先级**：🟡 中等风险，需要仔细合并功能\n\n")
            
            # 按类型分组
            python_files = [f for f in classification['both_different'] if f.endswith('.py')]
            frontend_files = [f for f in classification['both_different'] if f.startswith('frontend/')]
            config_files = [f for f in classification['both_different'] if any(f.endswith(ext) for ext in ['.yml', '.yaml', '.toml', '.json', '.md'])]
            other_files = [f for f in classification['both_different'] if f not in python_files and f not in frontend_files and f not in config_files]
            
            if python_files:
                f.write("#### Python后端文件：\n")
                for i, file in enumerate(python_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
            
            if frontend_files:
                f.write("#### 前端文件：\n")
                for i, file in enumerate(frontend_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
            
            if config_files:
                f.write("#### 配置和文档文件：\n")
                for i, file in enumerate(config_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
            
            if other_files:
                f.write("#### 其他文件：\n")
                for i, file in enumerate(other_files, 1):
                    f.write(f"{i}. `{file}`\n")
                f.write("\n")
        
        # 合并建议
        f.write("## 🛠️ 推荐合并流程\n\n")
        f.write("### 第一阶段：低风险文件（自动处理）\n")
        f.write("1. **保留你的新增文件**：直接保留所有你独有的文件\n")
        f.write("2. **添加同事的新增功能**：评估InsightAI等新功能的价值\n")
        f.write("3. **更新到同事的改进版本**：对于你与源码一致的文件，采用同事的增强版本\n\n")
        
        f.write("### 第二阶段：高风险文件（手动处理）\n")
        f.write("1. **优先保留关键修复**：确保Moonshot修复等重要更改不丢失\n")
        f.write("2. **逐个合并功能冲突**：手动处理双方都有改动的文件\n")
        f.write("3. **全面测试验证**：合并完成后进行完整功能测试\n\n")
        
        f.write("### 第三阶段：验证和清理\n")
        f.write("1. **运行所有测试**：确保功能正常\n")
        f.write("2. **检查关键功能**：特别是Moonshot API和InsightAI功能\n")
        f.write("3. **清理冗余配置**：统一环境配置和构建脚本\n")
    
    print(f"📄 合并策略清单已保存到: tmp/代码合并策略分类清单.md")

def print_summary(classification):
    """打印摘要信息"""
    print("="*80)
    print("📋 代码合并策略分类摘要")
    print("="*80)
    print()
    
    total_files = sum(len(v) for v in classification.values())
    
    print(f"📁 总文件数: {total_files}")
    print(f"🆕 你新增的文件: {len(classification['your_only'])} 个 (直接保留)")
    print(f"🎯 同事新增的文件: {len(classification['colleague_only'])} 个 (评估后添加)")
    print(f"✅ 你的一致，同事的不一致: {len(classification['your_matches_colleague_not'])} 个 (用同事版本)")
    print(f"⭐ 你的不一致，同事的一致: {len(classification['colleague_matches_your_not'])} 个 (用你的版本)")
    print(f"⚠️  双方都不一致: {len(classification['both_different'])} 个 (手动合并)")
    print()
    
    # 风险评估
    high_risk = len(classification['colleague_matches_your_not'])
    medium_risk = len(classification['both_different'])
    low_risk = len(classification['your_only']) + len(classification['colleague_only']) + len(classification['your_matches_colleague_not'])
    
    print("🎯 风险评估:")
    print(f"   🔴 高风险文件: {high_risk} 个 (包含重要修复，必须保留)")
    print(f"   🟡 中风险文件: {medium_risk} 个 (需要手动合并)")
    print(f"   🟢 低风险文件: {low_risk} 个 (可自动处理)")

if __name__ == "__main__":
    print("🚀 开始分析代码合并策略...")
    print()
    
    classification = classify_files()
    
    if classification:
        generate_merge_strategy_report(classification)
        print_summary(classification)
    else:
        print("❌ 分类失败，请检查输入文件")