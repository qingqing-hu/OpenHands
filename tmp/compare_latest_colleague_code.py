#!/usr/bin/env python3
"""
最新同事代码比较工具 - 比较您和同事最新代码的差异
筛选出冲突文件中同事提交时间晚于2025-09-10 00:00:00的代码
"""

import os
import hashlib
import json
import subprocess
from pathlib import Path
from datetime import datetime
import difflib

class LatestCodeComparator:
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
        
        # 设置截止时间为2025-09-11 00:00:00
        self.cutoff_date = datetime(2025, 9, 11, 0, 0, 0)
        
        self.results = {
            'conflicts': [],      # 冲突文件（都有但内容不同）
            'recent_conflicts': [], # 同事提交时间晚于截止日期的冲突文件
            'summary': {}
        }

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

    def get_file_hash(self, file_path):
        """计算文件的MD5哈希值"""
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                return hashlib.md5(content).hexdigest()
        except Exception as e:
            print(f"读取文件失败: {file_path}, 错误: {e}")
            return None

    def get_git_last_commit_time(self, file_path, repo_path):
        """获取文件的最后一次git提交时间"""
        try:
            relative_path = file_path.relative_to(repo_path)
            # 使用git log获取文件的最后提交时间
            cmd = ['git', '-C', str(repo_path), 'log', '-1', '--format=%ct', '--', str(relative_path)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0 and result.stdout.strip():
                timestamp = int(result.stdout.strip())
                return datetime.fromtimestamp(timestamp)
            else:
                # 如果git命令失败，回退到文件修改时间
                return datetime.fromtimestamp(file_path.stat().st_mtime)
        except Exception as e:
            print(f"获取git提交时间失败: {file_path}, 错误: {e}")
            # 回退到文件修改时间
            try:
                return datetime.fromtimestamp(file_path.stat().st_mtime)
            except:
                return datetime.now()

    def get_all_files(self, root_path):
        """递归获取目录下所有文件的相对路径和哈希值"""
        files = {}
        is_git_repo = (root_path / '.git').exists()
        
        for file_path in root_path.rglob('*'):
            if file_path.is_file():
                relative_path = file_path.relative_to(root_path)
                # 检查是否应该忽略
                if self.should_ignore(relative_path):
                    continue
                    
                file_hash = self.get_file_hash(file_path)
                if file_hash:
                    # 如果是git仓库，使用git提交时间；否则使用文件修改时间
                    if is_git_repo:
                        modified_time = self.get_git_last_commit_time(file_path, root_path)
                    else:
                        modified_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                    
                    files[str(relative_path)] = {
                        'hash': file_hash,
                        'full_path': str(file_path),
                        'size': file_path.stat().st_size,
                        'modified': modified_time,
                        'is_git_time': is_git_repo
                    }
        return files

    def generate_diff(self, your_file, colleague_file):
        """生成两个文件的差异"""
        try:
            with open(your_file, 'r', encoding='utf-8') as f1:
                your_lines = f1.readlines()
        except UnicodeDecodeError:
            with open(your_file, 'r', encoding='latin-1') as f1:
                your_lines = f1.readlines()
        
        try:
            with open(colleague_file, 'r', encoding='utf-8') as f2:
                colleague_lines = f2.readlines()
        except UnicodeDecodeError:
            with open(colleague_file, 'r', encoding='latin-1') as f2:
                colleague_lines = f2.readlines()
        
        diff = list(difflib.unified_diff(
            your_lines, colleague_lines,
            fromfile=f'您的版本/{os.path.basename(your_file)}',
            tofile=f'同事版本/{os.path.basename(colleague_file)}',
            lineterm=''
        ))
        
        return ''.join(diff) if diff else "文件内容相同"

    def compare_codes(self):
        """比较代码差异"""
        print("正在扫描您的代码...")
        your_files = self.get_all_files(self.your_code_path)
        
        print("正在扫描同事最新代码...")
        colleague_files = self.get_all_files(self.colleague_code_path)
        
        print("正在分析差异...")
        
        all_files = set(your_files.keys()) | set(colleague_files.keys())
        
        for relative_path in all_files:
            if relative_path in your_files and relative_path in colleague_files:
                # 两边都有的文件
                your_hash = your_files[relative_path]['hash']
                colleague_hash = colleague_files[relative_path]['hash']
                
                if your_hash != colleague_hash:
                    # 内容不同 - 冲突
                    colleague_modified = colleague_files[relative_path]['modified']
                    
                    diff_content = self.generate_diff(
                        your_files[relative_path]['full_path'],
                        colleague_files[relative_path]['full_path']
                    )
                    
                    conflict_info = {
                        'path': relative_path,
                        'your_file': your_files[relative_path],
                        'colleague_file': colleague_files[relative_path],
                        'colleague_modified': colleague_modified,
                        'diff': diff_content
                    }
                    
                    self.results['conflicts'].append(conflict_info)
                    
                    # 检查同事的提交时间是否晚于截止日期
                    if colleague_modified > self.cutoff_date:
                        self.results['recent_conflicts'].append(conflict_info)

        # 生成统计信息
        self.results['summary'] = {
            'total_your_files': len(your_files),
            'total_colleague_files': len(colleague_files),
            'total_conflicts': len(self.results['conflicts']),
            'recent_conflicts_count': len(self.results['recent_conflicts']),
            'cutoff_date': self.cutoff_date.isoformat(),
            'comparison_time': datetime.now().isoformat()
        }

    def save_results(self):
        """保存比较结果到文件"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 保存详细JSON结果
        json_file = self.output_dir / f'latest_conflicts_{timestamp}.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            # 转换datetime对象为字符串用于JSON序列化
            serializable_results = self.prepare_for_json(self.results)
            json.dump(serializable_results, f, ensure_ascii=False, indent=2)
        
        # 生成Markdown报告
        md_file = self.output_dir / f'latest_conflicts_report_{timestamp}.md'
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(self.generate_markdown_report())
        
        # 生成最新冲突文件列表
        recent_list_file = self.output_dir / f'recent_conflicts_list_{timestamp}.txt'
        with open(recent_list_file, 'w', encoding='utf-8') as f:
            f.write(f"# 同事在{self.cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}之后提交的冲突文件\n")
            f.write(f"# 共{len(self.results['recent_conflicts'])}个文件\n")
            f.write("# 格式: 文件路径 | 同事提交时间\n\n")
            
            for conflict in sorted(self.results['recent_conflicts'], 
                                 key=lambda x: x['colleague_modified'], reverse=True):
                f.write(f"{conflict['path']} | {conflict['colleague_modified'].strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        return {
            'json_file': str(json_file),
            'md_file': str(md_file),
            'recent_list_file': str(recent_list_file),
            'summary': self.results['summary']
        }

    def prepare_for_json(self, obj):
        """准备对象用于JSON序列化，转换datetime对象"""
        if isinstance(obj, dict):
            return {k: self.prepare_for_json(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.prepare_for_json(item) for item in obj]
        elif isinstance(obj, datetime):
            return obj.isoformat()
        else:
            return obj

    def generate_markdown_report(self):
        """生成Markdown格式的报告"""
        report = f"""# 最新同事代码冲突分析报告

**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**截止时间**: {self.cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}

## 📊 总体统计

- 您的代码文件总数: {self.results['summary']['total_your_files']}
- 同事代码文件总数: {self.results['summary']['total_colleague_files']}
- 总冲突文件数: {self.results['summary']['total_conflicts']}
- **最新冲突文件数**: {self.results['summary']['recent_conflicts_count']} (同事在{self.cutoff_date.strftime('%Y-%m-%d')}之后提交)

## 🔴 最新冲突文件列表 ({self.results['summary']['recent_conflicts_count']} 个)
> 这些是同事在{self.cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}之后提交的冲突文件，需要优先处理

"""
        
        if not self.results['recent_conflicts']:
            report += "🎉 **没有发现最新的冲突文件！** 同事在指定时间之后没有修改与您冲突的文件。\n\n"
        else:
            for i, conflict in enumerate(sorted(self.results['recent_conflicts'], 
                                              key=lambda x: x['colleague_modified'], reverse=True), 1):
                report += f"### {i}. `{conflict['path']}`\n"
                report += f"- **您的文件大小**: {conflict['your_file']['size']} bytes\n"
                report += f"- **同事文件大小**: {conflict['colleague_file']['size']} bytes\n"
                report += f"- **您的修改时间**: {conflict['your_file']['modified'].strftime('%Y-%m-%d %H:%M:%S') if isinstance(conflict['your_file']['modified'], datetime) else conflict['your_file']['modified']}\n"
                report += f"- **同事提交时间**: {conflict['colleague_modified'].strftime('%Y-%m-%d %H:%M:%S')}\n"
                report += f"- **时间差**: {(conflict['colleague_modified'] - self.cutoff_date).days} 天后提交\n\n"

        # 如果有其他冲突文件，也显示统计
        other_conflicts = len(self.results['conflicts']) - len(self.results['recent_conflicts'])
        if other_conflicts > 0:
            report += f"## 📋 其他冲突文件 ({other_conflicts} 个)\n"
            report += f"> 这些冲突文件的同事提交时间早于{self.cutoff_date.strftime('%Y-%m-%d %H:%M:%S')}\n\n"

        return report

def main():
    # 配置路径
    current_project = Path.cwd()  # 当前项目路径
    colleague_code = Path("/tmp/colleague-analysis-4/OpenHands")  # 同事最新代码路径
    output_dir = current_project / "tmp"  # 输出目录
    
    print(f"当前项目路径: {current_project}")
    print(f"同事最新代码路径: {colleague_code}")
    print(f"输出目录: {output_dir}")
    print("截止时间: 2025-09-11 00:00:00")
    print("注意: 已忽略tmp目录的比较")
    
    # 检查路径是否存在
    if not colleague_code.exists():
        print(f"错误: 同事代码路径不存在: {colleague_code}")
        print("请确保同事的最新代码已下载到指定目录")
        return
    
    # 创建比较器并执行比较
    comparator = LatestCodeComparator(current_project, colleague_code, output_dir)
    
    print("开始比较最新代码...")
    comparator.compare_codes()
    
    print("保存结果...")
    result_files = comparator.save_results()
    
    print("\n" + "="*60)
    print("最新代码比较完成!")
    print("="*60)
    print(f"详细结果已保存到: {result_files['json_file']}")
    print(f"Markdown报告: {result_files['md_file']}")
    print(f"最新冲突列表: {result_files['recent_list_file']}")
    
    summary = result_files['summary']
    print(f"\n📊 统计结果:")
    print(f"  - 总冲突文件: {summary['total_conflicts']} 个")
    print(f"  - 🔥 最新冲突文件: {summary['recent_conflicts_count']} 个 (同事在2025-09-11后提交)")
    print(f"  - 您的代码总文件数: {summary['total_your_files']}")
    print(f"  - 同事代码总文件数: {summary['total_colleague_files']}")
    
    if summary['recent_conflicts_count'] > 0:
        print(f"\n🚨 需要优先处理 {summary['recent_conflicts_count']} 个最新冲突文件！")
    else:
        print(f"\n🎉 太好了！没有发现同事在2025-09-11之后提交的冲突文件。")

if __name__ == "__main__":
    main()