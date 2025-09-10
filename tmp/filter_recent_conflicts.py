#!/usr/bin/env python3
"""
筛选冲突文件 - 找出同事提交时间在指定日期之后的冲突文件
"""

import json
import os
from datetime import datetime
from pathlib import Path

def filter_conflicts_by_date(json_file, cutoff_date_str="2025-09-08 00:00:00"):
    """筛选同事提交时间在指定日期之后的冲突文件"""
    
    # 解析截止日期
    cutoff_date = datetime.fromisoformat(cutoff_date_str)
    print(f"筛选条件: 同事提交时间在 {cutoff_date_str} 之后的冲突文件")
    
    # 读取比较结果
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 筛选符合条件的冲突文件
    recent_conflicts = []
    
    for conflict in data.get('conflicts', []):
        colleague_modified = conflict['colleague_file']['modified']
        
        try:
            # 解析同事的修改时间
            colleague_time = datetime.fromisoformat(colleague_modified)
            
            # 检查是否在截止日期之后
            if colleague_time > cutoff_date:
                recent_conflicts.append({
                    'path': conflict['path'],
                    'your_modified': conflict['your_file']['modified'],
                    'colleague_modified': colleague_modified,
                    'colleague_size': conflict['colleague_file']['size'],
                    'your_size': conflict['your_file']['size'],
                    'colleague_full_path': conflict['colleague_file']['full_path'],
                    'your_full_path': conflict['your_file']['full_path']
                })
        except Exception as e:
            print(f"解析时间失败: {conflict['path']}, 时间: {colleague_modified}, 错误: {e}")
    
    return recent_conflicts

def save_filtered_results(filtered_conflicts, output_dir):
    """保存筛选结果"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path(output_dir)
    
    # 保存详细JSON
    json_file = output_dir / f'recent_conflicts_{timestamp}.json'
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(filtered_conflicts, f, ensure_ascii=False, indent=2)
    
    # 生成简单文件列表
    txt_file = output_dir / f'recent_conflicts_list_{timestamp}.txt'
    with open(txt_file, 'w', encoding='utf-8') as f:
        f.write(f"# 同事在2025-09-08之后提交的冲突文件 (共{len(filtered_conflicts)}个)\n")
        f.write("# 格式: 文件路径 | 您的修改时间 | 同事提交时间\n\n")
        
        for conflict in sorted(filtered_conflicts, key=lambda x: x['colleague_modified'], reverse=True):
            f.write(f"{conflict['path']} | {conflict['your_modified']} | {conflict['colleague_modified']}\n")
    
    # 生成Markdown报告
    md_file = output_dir / f'recent_conflicts_report_{timestamp}.md'
    with open(md_file, 'w', encoding='utf-8') as f:
        f.write(generate_markdown_report(filtered_conflicts))
    
    return {
        'json_file': str(json_file),
        'txt_file': str(txt_file),
        'md_file': str(md_file),
        'count': len(filtered_conflicts)
    }

def generate_markdown_report(filtered_conflicts):
    """生成Markdown报告"""
    report = f"""# 近期冲突文件报告

**筛选条件**: 同事提交时间在 2025-09-08 00:00:00 之后
**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**找到冲突文件**: {len(filtered_conflicts)} 个

## 📋 文件列表
> 按同事提交时间倒序排列

"""
    
    for i, conflict in enumerate(sorted(filtered_conflicts, key=lambda x: x['colleague_modified'], reverse=True), 1):
        report += f"### {i}. `{conflict['path']}`\n"
        report += f"- **您的修改时间**: {conflict['your_modified']}\n"
        report += f"- **同事提交时间**: {conflict['colleague_modified']}\n"
        report += f"- **文件大小对比**: 您({conflict['your_size']} bytes) vs 同事({conflict['colleague_size']} bytes)\n"
        report += f"- **您的文件路径**: `{conflict['your_full_path']}`\n"
        report += f"- **同事文件路径**: `{conflict['colleague_full_path']}`\n\n"
    
    # 按目录统计
    dir_stats = {}
    for conflict in filtered_conflicts:
        dir_name = str(Path(conflict['path']).parent)
        if dir_name == '.':
            dir_name = '根目录'
        dir_stats[dir_name] = dir_stats.get(dir_name, 0) + 1
    
    report += "## 📊 目录分布统计\n\n"
    for dir_name, count in sorted(dir_stats.items(), key=lambda x: x[1], reverse=True):
        report += f"- **{dir_name}**: {count} 个文件\n"
    
    return report

def main():
    # 配置参数
    current_dir = Path.cwd()
    tmp_dir = current_dir / "tmp"
    
    # 找到最新的比较结果文件
    json_files = list(tmp_dir.glob("code_comparison_detail_*.json"))
    if not json_files:
        print("错误: 未找到代码比较结果文件")
        print("请先运行 code_comparison.py 生成比较结果")
        return
    
    # 使用最新的文件
    latest_json = max(json_files, key=os.path.getctime)
    print(f"使用比较结果文件: {latest_json}")
    
    # 筛选冲突文件
    print("正在筛选冲突文件...")
    filtered_conflicts = filter_conflicts_by_date(latest_json)
    
    if not filtered_conflicts:
        print("未找到符合条件的冲突文件")
        return
    
    # 保存结果
    print("保存筛选结果...")
    result_files = save_filtered_results(filtered_conflicts, tmp_dir)
    
    print("\n" + "="*60)
    print("筛选完成!")
    print("="*60)
    print(f"找到 {result_files['count']} 个符合条件的冲突文件")
    print(f"详细结果: {result_files['json_file']}")
    print(f"文件列表: {result_files['txt_file']}")
    print(f"报告文件: {result_files['md_file']}")
    
    print(f"\n🔥 优先处理的文件 (按同事提交时间排序):")
    for i, conflict in enumerate(sorted(filtered_conflicts, key=lambda x: x['colleague_modified'], reverse=True)[:10], 1):
        print(f"  {i}. {conflict['path']} (同事: {conflict['colleague_modified'][:10]})")
    
    if len(filtered_conflicts) > 10:
        print(f"  ... 还有 {len(filtered_conflicts) - 10} 个文件")

if __name__ == "__main__":
    main()