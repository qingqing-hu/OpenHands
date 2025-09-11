#!/usr/bin/env python3
"""
简单比较pyproject.toml和requirements.txt的差异
不依赖第三方库
"""

import re
from pathlib import Path

def parse_requirements_txt(requirements_file):
    """解析requirements.txt文件"""
    if not requirements_file.exists():
        return set()
    
    packages = set()
    with open(requirements_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                # 提取包名，忽略版本约束
                package_name = re.split(r'[=<>!;]', line)[0].strip()
                if package_name:
                    packages.add(package_name.lower())
    return packages

def parse_pyproject_dependencies(pyproject_file):
    """从pyproject.toml中提取依赖包名"""
    if not pyproject_file.exists():
        return set()
    
    packages = set()
    in_dependencies = False
    
    with open(pyproject_file, 'r') as f:
        for line in f:
            line = line.strip()
            
            # 检测是否进入dependencies段
            if line == '[tool.poetry.dependencies]':
                in_dependencies = True
                continue
            
            # 如果遇到新的段落，退出dependencies段
            if line.startswith('[') and line != '[tool.poetry.dependencies]':
                in_dependencies = False
                continue
            
            # 在dependencies段中提取包名
            if in_dependencies and '=' in line:
                # 提取等号前的包名
                package_line = line.split('=')[0].strip()
                
                # 跳过python版本声明和注释
                if package_line and package_line != 'python' and not package_line.startswith('#'):
                    # 去掉引号
                    package_name = package_line.strip('"').strip("'")
                    packages.add(package_name.lower())
    
    return packages

def main():
    current_dir = Path.cwd()
    pyproject_file = current_dir / "pyproject.toml"
    requirements_file = current_dir / "requirements.txt"
    
    print("🔍 分析项目依赖差异...")
    print(f"pyproject.toml路径: {pyproject_file}")
    print(f"requirements.txt路径: {requirements_file}")
    print()
    
    # 解析文件
    pyproject_packages = parse_pyproject_dependencies(pyproject_file)
    requirements_packages = parse_requirements_txt(requirements_file)
    
    print(f"📊 统计信息:")
    print(f"  pyproject.toml中的主要依赖数: {len(pyproject_packages)}")
    print(f"  requirements.txt中的依赖数: {len(requirements_packages)}")
    print()
    
    # 找出差异
    missing_in_requirements = pyproject_packages - requirements_packages
    extra_in_requirements = requirements_packages - pyproject_packages
    common_packages = pyproject_packages & requirements_packages
    
    print(f"📋 差异分析:")
    print(f"  共同依赖: {len(common_packages)} 个")
    print(f"  pyproject.toml中新增的依赖: {len(missing_in_requirements)} 个")
    print(f"  requirements.txt中多余的依赖: {len(extra_in_requirements)} 个")
    print()
    
    if missing_in_requirements:
        print(f"🆕 pyproject.toml中新增的依赖 ({len(missing_in_requirements)} 个):")
        for package in sorted(missing_in_requirements):
            print(f"  + {package}")
        print()
    
    if extra_in_requirements:
        print(f"❓ requirements.txt中可能多余的依赖 ({len(extra_in_requirements)} 个):")
        for package in sorted(extra_in_requirements):
            print(f"  - {package}")
        print()
    
    # 建议
    if missing_in_requirements or extra_in_requirements:
        print("💡 建议:")
        print("  ⚠️  检测到依赖差异，建议更新requirements.txt文件")
        print("  📝 新的依赖可能来自同事的代码合并或版本升级")
        print("  🚀 为确保内网部署成功，建议生成新的requirements.txt")
        
        return True  # 需要更新
    else:
        print("✅ requirements.txt与pyproject.toml基本一致，无需更新")
        return False  # 无需更新

if __name__ == "__main__":
    needs_update = main()
    exit(0 if not needs_update else 1)