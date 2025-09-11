#!/usr/bin/env python3
"""
查找同事版本独有文件的脚本
找出同事代码中有，但您的代码中没有的文件
"""

import os
from pathlib import Path
from datetime import datetime

class ColleagueOnlyFilesFinder:
    def __init__(self, your_code_path, colleague_code_path, output_dir):
        self.your_code_path = Path(your_code_path)
        self.colleague_code_path = Path(colleague_code_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 忽略的文件和目录
        self.ignore_patterns = {
            '.git', '.gitignore', '__pycache__', '*.pyc', '*.pyo', 
            'node_modules', '.vscode', '.idea', '*.log', 'tmp',
            '.DS_Store', 'poetry.lock', 'package-lock.json',
            '*.egg-info', 'dist', 'build', '.pytest_cache',
            'venv', '.venv', 'env', '.env'
        }
        
        self.colleague_only_files = []

    def should_ignore(self, path):
        """检查是否应该忽略该路径"""
        path_parts = Path(path).parts
        path_str = str(path).lower()
        
        # 检查路径的任何部分是否包含tmp
        if 'tmp' in path_parts:
            return True
            
        # 检查其他忽略模式
        for pattern in self.ignore_patterns:
            if pattern in path_str:
                return True
        return False

    def get_all_files(self, root_path):
        """递归获取目录下所有文件的相对路径"""
        files = set()
        
        for file_path in root_path.rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(root_path)
                # 检查是否应该忽略
                if self.should_ignore(relative_path):
                    continue
                    
                files.add(str(relative_path))
        return files

    def find_colleague_only_files(self):
        """查找同事独有的文件"""
        print("正在扫描您的代码...")
        your_files = self.get_all_files(self.your_code_path)
        
        print("正在扫描同事的代码...")
        colleague_files = self.get_all_files(self.colleague_code_path)
        
        print("正在查找同事独有的文件...")
        
        # 找出同事有但您没有的文件
        colleague_only = colleague_files - your_files
        
        for file_path in sorted(colleague_only):
            full_colleague_path = self.colleague_code_path / file_path
            file_size = full_colleague_path.stat().st_size
            modified_time = datetime.fromtimestamp(full_colleague_path.stat().st_mtime)
            
            self.colleague_only_files.append({
                'path': file_path,
                'full_colleague_path': str(full_colleague_path),
                'size': file_size,
                'modified': modified_time
            })

    def save_results(self):
        """保存结果到文件"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 生成报告文件
        report_file = self.output_dir / f'colleague_only_files_{timestamp}.md'
        list_file = self.output_dir / f'colleague_only_files_list_{timestamp}.txt'
        
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(f"# 同事独有文件报告\n\n")
            f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"## 📊 统计信息\n\n")
            f.write(f"- 同事独有文件数: {len(self.colleague_only_files)}\n\n")
            
            if not self.colleague_only_files:
                f.write("🎉 **没有发现同事独有的文件！**\n\n")
            else:
                f.write(f"## 📁 同事独有文件列表 ({len(self.colleague_only_files)} 个)\n\n")
                
                for i, file_info in enumerate(self.colleague_only_files, 1):
                    f.write(f"### {i}. `{file_info['path']}`\n")
                    f.write(f"- **文件大小**: {file_info['size']} bytes\n")
                    f.write(f"- **修改时间**: {file_info['modified'].strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"- **完整路径**: `{file_info['full_colleague_path']}`\n\n")
        
        # 生成文件列表
        with open(list_file, 'w', encoding='utf-8') as f:
            f.write(f"# 同事独有文件列表\n")
            f.write(f"# 共{len(self.colleague_only_files)}个文件\n")
            f.write(f"# 格式: 文件路径 | 同事路径\n\n")
            
            for file_info in self.colleague_only_files:
                f.write(f"{file_info['path']} | {file_info['full_colleague_path']}\n")
        
        return {
            'report_file': str(report_file),
            'list_file': str(list_file),
            'count': len(self.colleague_only_files)
        }

def main():
    # 配置路径
    current_project = Path.cwd()  # 当前项目路径
    colleague_code = Path("/tmp/colleague-analysis-3/OpenHands")  # 同事最新代码路径
    output_dir = current_project / "tmp"  # 输出目录
    
    print(f"当前项目路径: {current_project}")
    print(f"同事最新代码路径: {colleague_code}")
    print(f"输出目录: {output_dir}")
    print("注意: 已忽略tmp目录的比较")
    
    # 检查路径是否存在
    if not colleague_code.exists():
        print(f"错误: 同事代码路径不存在: {colleague_code}")
        print("请确保同事的最新代码已下载到指定目录")
        return
    
    # 创建查找器并执行查找
    finder = ColleagueOnlyFilesFinder(current_project, colleague_code, output_dir)
    
    print("开始查找同事独有文件...")
    finder.find_colleague_only_files()
    
    print("保存结果...")
    result_files = finder.save_results()
    
    print("\n" + "="*60)
    print("同事独有文件查找完成!")
    print("="*60)
    print(f"报告文件: {result_files['report_file']}")
    print(f"文件列表: {result_files['list_file']}")
    
    print(f"\n📊 统计结果:")
    print(f"  - 同事独有文件数: {result_files['count']} 个")
    
    if result_files['count'] > 0:
        print(f"\n📁 发现 {result_files['count']} 个同事独有的文件！")
        print("这些文件在您的项目中不存在，可能需要合并。")
    else:
        print("\n🎉 太好了！没有发现同事独有的文件。")

if __name__ == "__main__":
    main()