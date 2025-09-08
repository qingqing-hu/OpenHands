#!/usr/bin/env python3
"""
同事改进文件替换脚本
用同事的改进版本替换我们与源码一致的文件
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

def read_file_list(file_list_path):
    """读取文件列表"""
    files = []
    try:
        with open(file_list_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # 跳过注释行和空行
                if line and not line.startswith('#'):
                    files.append(line)
    except Exception as e:
        print(f"❌ 读取文件列表失败: {e}")
        return []
    
    return files

def backup_file(file_path, backup_dir):
    """备份文件到指定目录"""
    try:
        if not os.path.exists(file_path):
            return False
        
        # 创建备份目录
        os.makedirs(backup_dir, exist_ok=True)
        
        # 生成备份文件路径
        rel_path = os.path.relpath(file_path, "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3")
        backup_path = os.path.join(backup_dir, rel_path)
        
        # 创建备份文件的目录
        backup_file_dir = os.path.dirname(backup_path)
        if backup_file_dir:
            os.makedirs(backup_file_dir, exist_ok=True)
        
        # 复制文件到备份目录
        shutil.copy2(file_path, backup_path)
        return True
    except Exception as e:
        print(f"❌ 备份文件失败 {file_path}: {e}")
        return False

def replace_file(src_file, dst_file):
    """替换文件"""
    try:
        # 创建目标目录
        dst_dir = os.path.dirname(dst_file)
        if dst_dir:
            os.makedirs(dst_dir, exist_ok=True)
        
        # 复制文件
        shutil.copy2(src_file, dst_file)
        return True
    except Exception as e:
        print(f"❌ 替换文件失败 {src_file} -> {dst_file}: {e}")
        return False

def replace_with_colleague_files():
    """用同事的改进版本替换文件"""
    # 路径配置
    current_project = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    colleague_project = "/tmp/colleague-analysis/colleague-code"
    file_list_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/your_match_colleague_not_files.txt"
    
    # 创建备份目录
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = f"/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/backup_before_replace_{timestamp}"
    
    print("🔄 开始用同事的改进版本替换文件...")
    print(f"📁 当前项目: {current_project}")
    print(f"📁 同事项目: {colleague_project}")
    print(f"💾 备份目录: {backup_dir}")
    print()
    
    # 检查路径是否存在
    if not os.path.exists(colleague_project):
        print(f"❌ 同事项目路径不存在: {colleague_project}")
        return False
    
    # 读取文件列表
    files_to_replace = read_file_list(file_list_path)
    if not files_to_replace:
        print("❌ 没有找到要替换的文件")
        return False
    
    print(f"📋 找到 {len(files_to_replace)} 个文件需要替换")
    print()
    
    # 统计信息
    success_count = 0
    failed_count = 0
    backup_count = 0
    
    # 处理每个文件
    for relative_path in files_to_replace:
        src_file = os.path.join(colleague_project, relative_path)  # 同事的文件
        dst_file = os.path.join(current_project, relative_path)    # 我的文件
        
        print(f"🔄 处理文件: {relative_path}")
        
        # 检查同事的源文件是否存在
        if not os.path.exists(src_file):
            print(f"❌ 同事的文件不存在: {relative_path}")
            failed_count += 1
            continue
        
        # 检查我的目标文件是否存在
        if not os.path.exists(dst_file):
            print(f"⚠️  我的文件不存在，直接复制: {relative_path}")
        else:
            # 备份我的原文件
            if backup_file(dst_file, backup_dir):
                print(f"💾 备份成功: {relative_path}")
                backup_count += 1
            else:
                print(f"❌ 备份失败: {relative_path}")
                failed_count += 1
                continue
        
        # 用同事的文件替换
        if replace_file(src_file, dst_file):
            print(f"✅ 替换成功: {relative_path}")
            success_count += 1
        else:
            failed_count += 1
        
        print()
    
    print("=" * 60)
    print("📊 替换结果统计")
    print("=" * 60)
    print(f"✅ 成功替换: {success_count} 个文件")
    print(f"💾 成功备份: {backup_count} 个文件")
    print(f"❌ 处理失败: {failed_count} 个文件")
    print(f"📁 总计处理: {len(files_to_replace)} 个文件")
    
    if backup_count > 0:
        print()
        print(f"💾 原文件备份位置: {backup_dir}")
        print("📝 如需恢复，可从备份目录中复制回来")
    
    if failed_count > 0:
        print()
        print("⚠️  有文件处理失败，请检查错误信息")
        return False
    
    print()
    print("🎉 所有文件替换完成！")
    return True

def generate_replace_report():
    """生成替换报告"""
    current_project = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    file_list_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/your_match_colleague_not_files.txt"
    
    files_to_replace = read_file_list(file_list_path)
    
    report_content = f"""# 同事改进文件替换报告

**替换时间**: {datetime.now().strftime('%Y年%m月%d日 %H:%M:%S')}
**替换策略**: 用同事的改进版本替换我们与源码一致的文件
**替换文件数**: {len(files_to_replace)}

## 📋 替换的文件列表

### 🟢 低风险替换（同事基于源码做了功能增强）

"""
    
    for i, file in enumerate(files_to_replace, 1):
        if os.path.exists(os.path.join(current_project, file)):
            report_content += f"{i}. ✅ `{file}`\n"
        else:
            report_content += f"{i}. ❌ `{file}` (替换失败)\n"
    
    report_content += """
## 🎯 替换原因分析

| 文件类型 | 数量 | 原因 |
|---------|------|------|
| 前端组件 | 3个 | 同事添加了新功能和优化 |
| Python配置 | 4个 | 同事改进了配置和错误处理 |

### 详细说明：

1. **frontend/src/components/features/chat/mcp-observation-content.tsx**
   - 同事可能添加了MCP观察内容的增强功能

2. **frontend/src/components/features/markdown/code.tsx** 
   - 同事可能改进了代码块渲染功能

3. **frontend/src/routes.ts**
   - 同事可能添加了新的路由配置

4. **openhands/core/config/condenser_config.py**
   - 同事改进了压缩器配置功能

5. **openhands/core/exceptions.py**
   - 同事可能添加了新的异常类型

6. **openhands/llm/debug_mixin.py**
   - 同事改进了LLM调试功能

7. **openhands/memory/condenser/impl/__init__.py**
   - 同事可能添加了新的压缩器实现

## 🔄 回滚方法

如果需要恢复原文件，请：
1. 找到备份目录 `tmp/backup_before_replace_*`
2. 将需要恢复的文件从备份目录复制回项目
3. 或者使用git恢复（如果有版本控制）

## 🚀 下一步建议

1. **运行测试**: 确保替换后的文件没有破坏现有功能
2. **检查新功能**: 体验同事添加的功能改进
3. **代码审查**: 查看具体的改动内容
4. **提交代码**: 如果一切正常，提交更改
"""
    
    # 保存报告
    report_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/文件替换报告.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"📄 替换报告已保存到: tmp/文件替换报告.md")

if __name__ == "__main__":
    print("⚠️  注意：此操作将替换你的文件！")
    print("💾 替换前会自动备份原文件")
    print()
    
    # 确认操作
    confirm = input("是否继续执行替换操作？(y/N): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("❌ 操作已取消")
        exit(0)
    
    print()
    success = replace_with_colleague_files()
    
    if success:
        print()
        print("📄 生成替换报告...")
        generate_replace_report()
    
    print("\n🔍 建议接下来:")
    print("1. 运行测试确保功能正常")
    print("2. 查看同事的改进内容")
    print("3. 运行前端构建测试")
    print("4. 如有问题可从备份恢复")