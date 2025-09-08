#!/usr/bin/env python3
"""
智能三路合并脚本
使用git merge-file进行智能合并，以源码为base
"""

import os
import shutil
import subprocess
from pathlib import Path
from datetime import datetime

def read_file_list(file_list_path):
    """读取文件列表"""
    files = []
    try:
        with open(file_list_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    files.append(line)
    except Exception as e:
        print(f"❌ 读取文件列表失败: {e}")
        return []
    return files

def backup_file(file_path, backup_dir):
    """备份文件"""
    try:
        if not os.path.exists(file_path):
            return False
        
        os.makedirs(backup_dir, exist_ok=True)
        rel_path = os.path.relpath(file_path, "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3")
        backup_path = os.path.join(backup_dir, rel_path)
        
        backup_file_dir = os.path.dirname(backup_path)
        if backup_file_dir:
            os.makedirs(backup_file_dir, exist_ok=True)
        
        shutil.copy2(file_path, backup_path)
        return True
    except Exception as e:
        print(f"❌ 备份文件失败 {file_path}: {e}")
        return False

def three_way_merge_file(base_file, your_file, colleague_file, output_file):
    """
    使用git merge-file进行三路合并
    返回: (success, has_conflicts, merge_status)
    """
    try:
        # 使用git merge-file命令
        # -p: 输出到stdout
        # --diff3: 显示三路冲突标记
        cmd = [
            'git', 'merge-file', 
            '--diff3',
            '-p',
            your_file,     # 当前版本
            base_file,     # 基础版本（源码）
            colleague_file # 其他版本（同事）
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
        
        # 写入合并结果
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result.stdout)
        
        # 返回状态
        # 0: 完全成功，无冲突
        # 1: 有冲突，但合并完成
        # >1: 合并失败
        if result.returncode == 0:
            return True, False, "无冲突自动合并"
        elif result.returncode == 1:
            return True, True, "有冲突需要手动处理"
        else:
            return False, False, f"合并失败: {result.stderr}"
            
    except Exception as e:
        return False, False, f"执行失败: {e}"

def analyze_conflicts(file_path):
    """分析文件中的冲突"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 统计冲突标记
        conflict_start_count = content.count('<<<<<<< ')
        conflict_middle_count = content.count('||||||| ')
        conflict_end_count = content.count('>>>>>>> ')
        
        return {
            'has_conflicts': conflict_start_count > 0,
            'conflict_blocks': conflict_start_count,
            'lines_total': len(content.split('\n')),
        }
    except Exception:
        return {'has_conflicts': False, 'conflict_blocks': 0, 'lines_total': 0}

def smart_three_way_merge():
    """执行智能三路合并"""
    # 路径配置
    current_project = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    colleague_project = "/tmp/colleague-analysis/colleague-code"
    source_project = "/tmp/source-analysis/OpenHands-main"
    file_list_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/both_different_files.txt"
    
    # 创建备份和工作目录
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"{current_project}/tmp/backup_before_merge_{timestamp}"
    work_dir = f"{current_project}/tmp/merge_work_{timestamp}"
    
    print("🔀 开始智能三路合并...")
    print(f"📁 你的代码: {current_project}")
    print(f"📁 同事代码: {colleague_project}")
    print(f"📁 源码base: {source_project}")
    print(f"💾 备份目录: {backup_dir}")
    print(f"🛠️  工作目录: {work_dir}")
    print()
    
    # 检查路径
    for path in [colleague_project, source_project]:
        if not os.path.exists(path):
            print(f"❌ 路径不存在: {path}")
            return False
    
    # 读取文件列表
    files_to_merge = read_file_list(file_list_path)
    if not files_to_merge:
        print("❌ 没有找到要合并的文件")
        return False
    
    print(f"📋 找到 {len(files_to_merge)} 个文件需要合并")
    print()
    
    # 统计信息
    stats = {
        'total': 0,
        'auto_merged': 0,
        'has_conflicts': 0,
        'failed': 0,
        'skipped': 0
    }
    
    # 处理结果
    results = {
        'auto_merged': [],
        'conflicts': [],
        'failed': [],
        'critical_conflicts': []  # 包含重要修改的冲突文件
    }
    
    # 关键文件列表（包含重要修改）
    critical_files = [
        'openhands/core/message.py',
        'openhands/memory/conversation_memory.py',
        'openhands/runtime/action_execution_server.py'
    ]
    
    os.makedirs(work_dir, exist_ok=True)
    
    # 处理每个文件
    for relative_path in files_to_merge:
        your_file = os.path.join(current_project, relative_path)
        colleague_file = os.path.join(colleague_project, relative_path)
        base_file = os.path.join(source_project, relative_path)
        
        print(f"🔄 处理文件: {relative_path}")
        stats['total'] += 1
        
        # 检查文件存在性
        missing_files = []
        if not os.path.exists(your_file):
            missing_files.append("你的文件")
        if not os.path.exists(colleague_file):
            missing_files.append("同事的文件")
        if not os.path.exists(base_file):
            missing_files.append("源码文件")
        
        if missing_files:
            print(f"⚠️  缺少文件: {', '.join(missing_files)}")
            stats['skipped'] += 1
            results['failed'].append({
                'file': relative_path,
                'reason': f"缺少: {', '.join(missing_files)}"
            })
            continue
        
        # 备份你的原文件
        if not backup_file(your_file, backup_dir):
            print(f"❌ 备份失败: {relative_path}")
            stats['failed'] += 1
            continue
        
        # 执行三路合并
        merged_file = os.path.join(work_dir, relative_path)
        os.makedirs(os.path.dirname(merged_file), exist_ok=True)
        
        success, has_conflicts, status = three_way_merge_file(
            base_file, your_file, colleague_file, merged_file
        )
        
        if not success:
            print(f"❌ 合并失败: {status}")
            stats['failed'] += 1
            results['failed'].append({
                'file': relative_path,
                'reason': status
            })
            continue
        
        if has_conflicts:
            # 分析冲突详情
            conflict_info = analyze_conflicts(merged_file)
            print(f"⚠️  发现冲突: {conflict_info['conflict_blocks']} 个冲突块")
            
            stats['has_conflicts'] += 1
            conflict_data = {
                'file': relative_path,
                'conflict_blocks': conflict_info['conflict_blocks'],
                'total_lines': conflict_info['lines_total'],
                'is_critical': relative_path in critical_files
            }
            results['conflicts'].append(conflict_data)
            
            if relative_path in critical_files:
                results['critical_conflicts'].append(conflict_data)
                print(f"🔴 关键文件冲突!")
        else:
            print(f"✅ 自动合并成功")
            stats['auto_merged'] += 1
            results['auto_merged'].append(relative_path)
            
            # 自动合并成功的文件直接替换
            shutil.copy2(merged_file, your_file)
        
        print()
    
    # 生成合并报告
    generate_merge_report(stats, results, backup_dir, work_dir)
    
    print("=" * 60)
    print("📊 智能合并结果统计")
    print("=" * 60)
    print(f"✅ 自动合并成功: {stats['auto_merged']} 个文件")
    print(f"⚠️  需要手动处理: {stats['has_conflicts']} 个文件")
    print(f"❌ 合并失败: {stats['failed']} 个文件")
    print(f"⏩ 跳过处理: {stats['skipped']} 个文件")
    print(f"📁 总计处理: {stats['total']} 个文件")
    
    if len(results['critical_conflicts']) > 0:
        print()
        print("🔴 关键文件冲突需要优先处理:")
        for conflict in results['critical_conflicts']:
            print(f"   - {conflict['file']} ({conflict['conflict_blocks']} 个冲突)")
    
    print()
    print(f"💾 原文件备份: {backup_dir}")
    print(f"🛠️  合并结果: {work_dir}")
    
    return True

def generate_merge_report(stats, results, backup_dir, work_dir):
    """生成详细的合并报告"""
    timestamp = datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')
    
    report_content = f"""# 智能三路合并报告

**合并时间**: {timestamp}
**合并策略**: 以官方源码为base的三路智能合并
**处理文件数**: {stats['total']}

## 📊 合并结果统计

| 状态 | 数量 | 百分比 | 说明 |
|------|------|--------|------|
| ✅ 自动合并成功 | {stats['auto_merged']} | {stats['auto_merged']/stats['total']*100:.1f}% | 无冲突，已自动应用 |
| ⚠️ 需要手动处理 | {stats['has_conflicts']} | {stats['has_conflicts']/stats['total']*100:.1f}% | 有冲突，需要手动选择 |
| ❌ 合并失败 | {stats['failed']} | {stats['failed']/stats['total']*100:.1f}% | 无法处理的文件 |
| ⏩ 跳过处理 | {stats['skipped']} | {stats['skipped']/stats['total']*100:.1f}% | 文件缺失等原因 |

## ✅ 自动合并成功的文件 ({len(results['auto_merged'])}个)

这些文件已经自动合并完成，你的修改和同事的修改都被保留：

"""
    
    for i, file in enumerate(results['auto_merged'], 1):
        report_content += f"{i}. `{file}`\n"
    
    report_content += f"""
## ⚠️ 需要手动处理的冲突文件 ({len(results['conflicts'])}个)

这些文件有冲突，需要手动选择保留哪个版本的修改：

"""
    
    for i, conflict in enumerate(results['conflicts'], 1):
        critical_mark = " 🔴**关键文件**" if conflict['is_critical'] else ""
        report_content += f"{i}. `{conflict['file']}` - {conflict['conflict_blocks']}个冲突块{critical_mark}\n"
    
    if len(results['critical_conflicts']) > 0:
        report_content += f"""
### 🔴 关键冲突文件优先处理

以下文件包含重要修改（如Moonshot修复），需要优先仔细处理：

"""
        for conflict in results['critical_conflicts']:
            report_content += f"- `{conflict['file']}` - {conflict['conflict_blocks']}个冲突块\n"
    
    report_content += f"""
## 🛠️ 冲突处理指南

### 冲突标记说明
```
<<<<<<< your_version
你的修改内容
||||||| base_version  
原始源码内容
=======
同事的修改内容
>>>>>>> colleague_version
```

### 处理步骤
1. **打开冲突文件**: 在 `{work_dir}` 目录中找到冲突文件
2. **分析冲突**: 理解你和同事各自的修改意图
3. **选择策略**: 
   - 保留你的修改
   - 保留同事的修改  
   - 合并双方修改
   - 创建新的解决方案
4. **删除冲突标记**: 保留最终选择的内容
5. **复制回项目**: 将处理好的文件复制回项目目录

### 关键文件处理建议
- **openhands/core/message.py**: 优先保留你的Moonshot修复
- **openhands/memory/conversation_memory.py**: 优先保留你的Moonshot修复
- **openhands/runtime/action_execution_server.py**: 优先保留你的Moonshot修复

## 📁 文件位置

- **原文件备份**: `{backup_dir}`
- **合并结果**: `{work_dir}`
- **项目目录**: 自动合并的文件已更新

## 🚀 后续步骤

1. 处理冲突文件（优先处理关键文件）
2. 将处理好的文件复制回项目
3. 运行测试确保功能正常
4. 提交合并后的代码

---
*此报告由智能三路合并工具自动生成*
"""
    
    # 保存报告
    report_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/智能合并报告.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"📄 详细合并报告已保存到: tmp/智能合并报告.md")

if __name__ == "__main__":
    print("🔀 智能三路合并工具")
    print("📋 将自动合并无冲突的文件，标记有冲突的文件供手动处理")
    print()
    
    success = smart_three_way_merge()
    
    if success:
        print("\n🎯 接下来的建议:")
        print("1. 优先处理关键文件的冲突（包含Moonshot修复）")
        print("2. 逐个处理其他冲突文件") 
        print("3. 运行测试验证合并结果")
        print("4. 提交最终的合并代码")
    else:
        print("\n❌ 合并过程出现问题，请检查错误信息")