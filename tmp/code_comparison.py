#!/usr/bin/env python3
"""
代码比较工具 - 比较您和同事的代码差异
生成详细的差异分析报告，包括：
1. 您独有的代码文件
2. 同事独有的代码文件  
3. 冲突的代码文件（双方都有修改）
4. 相同的代码文件
"""

import os
import hashlib
import json
import subprocess
from pathlib import Path
from datetime import datetime
import difflib

class CodeComparator:
    def __init__(self, your_code_path, colleague_code_path, output_dir):
        self.your_code_path = Path(your_code_path)
        self.colleague_code_path = Path(colleague_code_path)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # 忽略的文件和目录 - 特别忽略tmp目录
        self.ignore_patterns = {
            '.git', '.gitignore', '__pycache__', '*.pyc', '*.pyo', 
            'node_modules', '.vscode', '.idea', '*.log', 'tmp',
            '.DS_Store', 'poetry.lock', 'package-lock.json',
            '*.egg-info', 'dist', 'build', '.pytest_cache',
            'venv', '.venv', 'env', '.env'
        }
        
        self.results = {
            'your_only': [],      # 只有您有的文件
            'colleague_only': [], # 只有同事有的文件
            'conflicts': [],      # 冲突文件（都有但内容不同）
            'identical': [],      # 相同文件
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
                return datetime.fromtimestamp(timestamp).isoformat()
            else:
                # 如果git命令失败，回退到文件修改时间
                return datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
        except Exception as e:
            print(f"获取git提交时间失败: {file_path}, 错误: {e}")
            # 回退到文件修改时间
            try:
                return datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
            except:
                return "未知时间"

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
                        modified_time = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
                    
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
        
        print("正在扫描同事的代码...")
        colleague_files = self.get_all_files(self.colleague_code_path)
        
        print("正在分析差异...")
        
        all_files = set(your_files.keys()) | set(colleague_files.keys())
        
        for relative_path in all_files:
            if relative_path in your_files and relative_path in colleague_files:
                # 两边都有的文件
                your_hash = your_files[relative_path]['hash']
                colleague_hash = colleague_files[relative_path]['hash']
                
                if your_hash == colleague_hash:
                    # 内容相同
                    self.results['identical'].append({
                        'path': relative_path,
                        'your_file': your_files[relative_path],
                        'colleague_file': colleague_files[relative_path]
                    })
                else:
                    # 内容不同 - 冲突
                    diff_content = self.generate_diff(
                        your_files[relative_path]['full_path'],
                        colleague_files[relative_path]['full_path']
                    )
                    self.results['conflicts'].append({
                        'path': relative_path,
                        'your_file': your_files[relative_path],
                        'colleague_file': colleague_files[relative_path],
                        'diff': diff_content
                    })
                    
            elif relative_path in your_files:
                # 只有您有的文件
                self.results['your_only'].append({
                    'path': relative_path,
                    'file_info': your_files[relative_path]
                })
                
            elif relative_path in colleague_files:
                # 只有同事有的文件
                self.results['colleague_only'].append({
                    'path': relative_path,
                    'file_info': colleague_files[relative_path]
                })

        # 生成统计信息
        self.results['summary'] = {
            'total_your_files': len(your_files),
            'total_colleague_files': len(colleague_files),
            'your_only_count': len(self.results['your_only']),
            'colleague_only_count': len(self.results['colleague_only']),
            'conflicts_count': len(self.results['conflicts']),
            'identical_count': len(self.results['identical']),
            'comparison_time': datetime.now().isoformat()
        }

    def save_results(self):
        """保存比较结果到文件"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 保存详细JSON结果
        json_file = self.output_dir / f'code_comparison_detail_{timestamp}.json'
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2)
        
        # 生成Markdown报告
        md_file = self.output_dir / f'code_comparison_report_{timestamp}.md'
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(self.generate_markdown_report())
        
        # 生成简单的文件列表
        self.save_file_lists(timestamp)
        
        return {
            'json_file': str(json_file),
            'markdown_file': str(md_file),
            'summary': self.results['summary']
        }

    def generate_markdown_report(self):
        """生成Markdown格式的报告"""
        report = f"""# 代码比较报告

**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## 📊 总体统计

- 您的代码文件总数: {self.results['summary']['total_your_files']}
- 同事代码文件总数: {self.results['summary']['total_colleague_files']}
- 只有您有的文件: {self.results['summary']['your_only_count']}
- 只有同事有的文件: {self.results['summary']['colleague_only_count']}
- 冲突文件: {self.results['summary']['conflicts_count']}
- 相同文件: {self.results['summary']['identical_count']}

## 🔴 冲突文件 ({self.results['summary']['conflicts_count']} 个)
> 这些文件您和同事都进行了修改，需要手动合并

"""
        
        for conflict in self.results['conflicts']:
            report += f"### {conflict['path']}\n"
            report += f"- 您的文件大小: {conflict['your_file']['size']} bytes\n"
            report += f"- 同事文件大小: {conflict['colleague_file']['size']} bytes\n"
            
            your_time_label = "修改时间" if not conflict['your_file'].get('is_git_time') else "Git提交时间"
            colleague_time_label = "修改时间" if not conflict['colleague_file'].get('is_git_time') else "Git提交时间"
            
            report += f"- 您的{your_time_label}: {conflict['your_file']['modified']}\n"
            report += f"- 同事{colleague_time_label}: {conflict['colleague_file']['modified']}\n\n"

        report += f"""
## 🟡 您独有的文件 ({self.results['summary']['your_only_count']} 个)
> 这些是您添加的新文件或同事删除的文件

"""
        
        for item in self.results['your_only']:
            report += f"- `{item['path']}` ({item['file_info']['size']} bytes)\n"

        report += f"""
## 🔵 同事独有的文件 ({self.results['summary']['colleague_only_count']} 个)
> 这些是同事添加的新文件或您删除的文件

"""
        
        for item in self.results['colleague_only']:
            report += f"- `{item['path']}` ({item['file_info']['size']} bytes)\n"

        report += f"""
## ✅ 相同文件 ({self.results['summary']['identical_count']} 个)
> 这些文件内容完全相同，无需处理

"""
        
        # 只显示前20个相同文件，避免报告太长
        for i, item in enumerate(self.results['identical'][:20]):
            report += f"- `{item['path']}`\n"
        
        if len(self.results['identical']) > 20:
            report += f"- ... 还有 {len(self.results['identical']) - 20} 个相同文件\n"

        return report

    def save_file_lists(self, timestamp):
        """保存各类文件的简单列表"""
        # 冲突文件列表
        conflicts_file = self.output_dir / f'conflicts_{timestamp}.txt'
        with open(conflicts_file, 'w', encoding='utf-8') as f:
            f.write("# 冲突文件列表 - 需要手动合并\n")
            for conflict in self.results['conflicts']:
                f.write(f"{conflict['path']}\n")
        
        # 您独有的文件
        your_only_file = self.output_dir / f'your_only_{timestamp}.txt'
        with open(your_only_file, 'w', encoding='utf-8') as f:
            f.write("# 您独有的文件列表\n")
            for item in self.results['your_only']:
                f.write(f"{item['path']}\n")
        
        # 同事独有的文件
        colleague_only_file = self.output_dir / f'colleague_only_{timestamp}.txt'
        with open(colleague_only_file, 'w', encoding='utf-8') as f:
            f.write("# 同事独有的文件列表\n")
            for item in self.results['colleague_only']:
                f.write(f"{item['path']}\n")

def main():
    # 配置路径
    current_project = Path.cwd()  # 当前项目路径
    colleague_code = Path("/tmp/colleague-analysis-2/OpenHands")  # 同事代码路径
    output_dir = current_project / "tmp"  # 输出目录
    
    print(f"当前项目路径: {current_project}")
    print(f"同事代码路径: {colleague_code}")
    print(f"输出目录: {output_dir}")
    print("注意: 已忽略tmp目录的比较")
    
    # 检查路径是否存在
    if not colleague_code.exists():
        print(f"错误: 同事代码路径不存在: {colleague_code}")
        print("请确保同事的代码已下载到指定目录")
        return
    
    # 创建比较器并执行比较
    comparator = CodeComparator(current_project, colleague_code, output_dir)
    
    print("开始比较代码...")
    comparator.compare_codes()
    
    print("保存结果...")
    result_files = comparator.save_results()
    
    print("\n" + "="*60)
    print("代码比较完成!")
    print("="*60)
    print(f"详细结果已保存到: {result_files['json_file']}")
    print(f"Markdown报告: {result_files['markdown_file']}")
    
    summary = result_files['summary']
    print(f"\n📊 统计结果:")
    print(f"  - 冲突文件: {summary['conflicts_count']} 个 (需要手动合并)")
    print(f"  - 您独有的文件: {summary['your_only_count']} 个")
    print(f"  - 同事独有的文件: {summary['colleague_only_count']} 个")
    print(f"  - 相同文件: {summary['identical_count']} 个")
    print(f"  - 您的代码总文件数: {summary['total_your_files']}")
    print(f"  - 同事代码总文件数: {summary['total_colleague_files']}")

if __name__ == "__main__":
    main()