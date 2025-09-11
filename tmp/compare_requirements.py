#!/usr/bin/env python3
"""
比较pyproject.toml和requirements.txt的差异
判断是否需要更新requirements.txt
"""

import toml
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

def parse_pyproject_toml(pyproject_file):
    """解析pyproject.toml文件中的主要依赖"""
    if not pyproject_file.exists():
        return set()
    
    with open(pyproject_file, 'r') as f:
        data = toml.load(f)
    
    packages = set()
    
    # 获取主要依赖
    dependencies = data.get('tool', {}).get('poetry', {}).get('dependencies', {})
    
    for package_name, version_spec in dependencies.items():
        if package_name == 'python':  # 跳过python版本声明
            continue
        
        # 处理复杂的依赖格式 (如 anthropic = { extras = [ "vertex" ], version = "*" })
        if isinstance(version_spec, dict):
            packages.add(package_name.lower())
        else:
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
    pyproject_packages = parse_pyproject_toml(pyproject_file)
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
        print("  📝 可以考虑以下操作:")
        print("     1. 使用 'poetry export' 命令生成新的requirements.txt")
        print("     2. 或者手动更新requirements.txt以包含新的依赖")
        print("     3. 确认多余的依赖是否仍需要")
        
        # 生成建议的requirements.txt内容
        print("\n📄 建议的requirements.txt内容:")
        print("=" * 50)
        
        # 读取pyproject.toml获取具体版本约束
        with open(pyproject_file, 'r') as f:
            data = toml.load(f)
        
        dependencies = data.get('tool', {}).get('poetry', {}).get('dependencies', {})
        
        for package_name, version_spec in sorted(dependencies.items()):
            if package_name == 'python':
                continue
                
            if isinstance(version_spec, dict):
                # 处理复杂格式
                if 'version' in version_spec:
                    version = version_spec['version']
                    if version == '*':
                        print(f"{package_name}")
                    else:
                        # 转换poetry版本约束为pip格式
                        pip_version = version.replace('^', '>=').replace('~', '>=')
                        print(f"{package_name}{pip_version}")
                else:
                    print(f"{package_name}")
            else:
                # 简单格式
                if version_spec == '*':
                    print(f"{package_name}")
                else:
                    # 转换poetry版本约束为pip格式
                    pip_version = version_spec.replace('^', '>=').replace('~', '>=')
                    print(f"{package_name}{pip_version}")
        print("=" * 50)
        
    else:
        print("✅ requirements.txt与pyproject.toml基本一致，无需更新")

if __name__ == "__main__":
    main()