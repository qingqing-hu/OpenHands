#!/usr/bin/env python3
"""
同事新增文件合并脚本
从同事的代码库中复制新增的文件到当前项目
"""

import os
import shutil
from pathlib import Path

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

def copy_file_with_dirs(src_file, dst_file):
    """复制文件，如果目录不存在则创建"""
    try:
        # 创建目标目录
        dst_dir = os.path.dirname(dst_file)
        if dst_dir:
            os.makedirs(dst_dir, exist_ok=True)
        
        # 复制文件
        shutil.copy2(src_file, dst_file)
        return True
    except Exception as e:
        print(f"❌ 复制文件失败 {src_file} -> {dst_file}: {e}")
        return False

def merge_colleague_files():
    """合并同事的新增文件"""
    # 路径配置
    current_project = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    colleague_project = "/tmp/colleague-analysis/colleague-code"
    file_list_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/colleague_new_files.txt"
    
    print("🚀 开始合并同事的新增文件...")
    print(f"📁 当前项目: {current_project}")
    print(f"📁 同事项目: {colleague_project}")
    print()
    
    # 检查路径是否存在
    if not os.path.exists(colleague_project):
        print(f"❌ 同事项目路径不存在: {colleague_project}")
        return False
    
    # 读取文件列表
    files_to_copy = read_file_list(file_list_path)
    if not files_to_copy:
        print("❌ 没有找到要复制的文件")
        return False
    
    print(f"📋 找到 {len(files_to_copy)} 个文件需要复制")
    print()
    
    # 统计信息
    success_count = 0
    failed_count = 0
    skipped_count = 0
    
    # 复制文件
    for relative_path in files_to_copy:
        src_file = os.path.join(colleague_project, relative_path)
        dst_file = os.path.join(current_project, relative_path)
        
        # 检查源文件是否存在
        if not os.path.exists(src_file):
            print(f"⚠️  源文件不存在: {relative_path}")
            failed_count += 1
            continue
        
        # 检查目标文件是否已存在
        if os.path.exists(dst_file):
            print(f"⏩ 文件已存在，跳过: {relative_path}")
            skipped_count += 1
            continue
        
        # 复制文件
        if copy_file_with_dirs(src_file, dst_file):
            print(f"✅ 复制成功: {relative_path}")
            success_count += 1
        else:
            failed_count += 1
    
    print()
    print("=" * 60)
    print("📊 合并结果统计")
    print("=" * 60)
    print(f"✅ 成功复制: {success_count} 个文件")
    print(f"⏩ 跳过存在: {skipped_count} 个文件")
    print(f"❌ 复制失败: {failed_count} 个文件")
    print(f"📁 总计处理: {len(files_to_copy)} 个文件")
    
    if failed_count > 0:
        print()
        print("⚠️  有文件复制失败，请检查错误信息")
        return False
    
    print()
    print("🎉 所有文件合并完成！")
    return True

def generate_merge_report():
    """生成合并报告"""
    current_project = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3"
    file_list_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/colleague_new_files.txt"
    
    files_to_copy = read_file_list(file_list_path)
    
    report_content = """# 同事新增文件合并报告

**合并时间**: 2025年9月8日
**文件来源**: 同事的 custom-changes-frontend 分支
**合并文件数**: """ + str(len(files_to_copy)) + """

## 📋 已合并的文件分类

### 🚀 InsightAI功能模块 (40个文件)
"""
    
    insight_ai_files = [f for f in files_to_copy if 'insight-ai' in f]
    for i, file in enumerate(insight_ai_files, 1):
        if os.path.exists(os.path.join(current_project, file)):
            report_content += f"{i}. ✅ `{file}`\n"
        else:
            report_content += f"{i}. ❌ `{file}` (复制失败)\n"
    
    report_content += """
### 📚 新增文档 (12个文件)
"""
    
    doc_files = [f for f in files_to_copy if f.endswith('.md')]
    for i, file in enumerate(doc_files, 1):
        if os.path.exists(os.path.join(current_project, file)):
            report_content += f"{i}. ✅ `{file}`\n"
        else:
            report_content += f"{i}. ❌ `{file}` (复制失败)\n"
    
    report_content += """
### 🛠️ 其他功能文件 (23个文件)
"""
    
    other_files = [f for f in files_to_copy if 'insight-ai' not in f and not f.endswith('.md')]
    for i, file in enumerate(other_files, 1):
        if os.path.exists(os.path.join(current_project, file)):
            report_content += f"{i}. ✅ `{file}`\n"
        else:
            report_content += f"{i}. ❌ `{file}` (复制失败)\n"
    
    report_content += """
## 🎯 下一步建议

1. **测试InsightAI功能**: 检查新增的InsightAI功能是否正常工作
2. **更新路由配置**: 可能需要更新前端路由以支持InsightAI页面
3. **检查依赖**: 确认新文件的依赖是否满足
4. **运行测试**: 执行完整的功能测试

## 📝 注意事项

- 所有文件都是新增的，不会覆盖现有文件
- 如果有文件复制失败，请检查路径和权限
- 建议在测试环境中先验证新功能
"""
    
    # 保存报告
    report_path = "/Users/yddyf/Documents/code/openhands8/OpenHands-main-3/tmp/同事文件合并报告.md"
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"📄 合并报告已保存到: tmp/同事文件合并报告.md")

if __name__ == "__main__":
    success = merge_colleague_files()
    
    if success:
        print()
        print("📄 生成合并报告...")
        generate_merge_report()
    
    print("\n🔍 建议接下来:")
    print("1. 检查新增文件是否正确复制")
    print("2. 运行前端构建测试 (npm run build)")
    print("3. 测试InsightAI等新功能")
    print("4. 提交合并后的代码")