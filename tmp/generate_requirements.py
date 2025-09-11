#!/usr/bin/env python3
"""
基于pyproject.toml生成requirements.txt文件
"""

import re
from pathlib import Path

def extract_dependencies_from_pyproject(pyproject_file):
    """从pyproject.toml提取依赖信息"""
    dependencies = []
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
            
            # 在dependencies段中提取包信息
            if in_dependencies and '=' in line and not line.startswith('#'):
                # 分离包名和版本约束
                parts = line.split('=', 1)
                if len(parts) == 2:
                    package_name = parts[0].strip()
                    version_spec = parts[1].strip()
                    
                    # 跳过python版本声明
                    if package_name == 'python':
                        continue
                    
                    # 处理版本约束
                    version_spec = version_spec.strip('"').strip("'")
                    
                    # 处理复杂的依赖格式
                    if version_spec.startswith('{'):
                        # 处理如: anthropic = { extras = [ "vertex" ], version = "*" }
                        if 'version' in version_spec:
                            # 提取version字段
                            version_match = re.search(r'version\s*=\s*["\']([^"\']+)["\']', version_spec)
                            if version_match:
                                version = version_match.group(1)
                                if version != '*':
                                    dependencies.append(f"{package_name}{convert_version_constraint(version)}")
                                else:
                                    dependencies.append(package_name)
                            else:
                                dependencies.append(package_name)
                        
                        # 处理extras
                        if 'extras' in version_spec:
                            extras_match = re.search(r'extras\s*=\s*\[\s*["\']([^"\']+)["\']\s*\]', version_spec)
                            if extras_match:
                                extra = extras_match.group(1)
                                dependencies.append(f"{package_name}[{extra}]")
                            else:
                                dependencies.append(package_name)
                    else:
                        # 简单格式
                        if version_spec == '*':
                            dependencies.append(package_name)
                        else:
                            dependencies.append(f"{package_name}{convert_version_constraint(version_spec)}")
    
    return dependencies

def convert_version_constraint(version_spec):
    """转换poetry版本约束为pip格式"""
    # 移除可能的注释
    version_spec = version_spec.split('#')[0].strip()
    
    # Poetry使用^表示兼容版本，pip使用>=
    if version_spec.startswith('^'):
        return version_spec.replace('^', '>=')
    
    # Poetry使用~表示近似版本，pip也可以使用>=
    if version_spec.startswith('~'):
        return version_spec.replace('~', '>=')
    
    # 其他约束符号保持不变
    return version_spec

def main():
    current_dir = Path.cwd()
    pyproject_file = current_dir / "pyproject.toml"
    new_requirements_file = current_dir / "requirements_new.txt"
    
    print("🔧 基于pyproject.toml生成新的requirements.txt...")
    
    if not pyproject_file.exists():
        print(f"❌ 错误: {pyproject_file} 不存在")
        return
    
    dependencies = extract_dependencies_from_pyproject(pyproject_file)
    
    # 生成requirements.txt内容
    content = "# OpenHands 依赖列表 - 基于pyproject.toml自动生成\n"
    content += f"# 生成时间: {Path(__file__).stat().st_mtime}\n\n"
    
    # 排序并添加依赖
    for dep in sorted(dependencies):
        content += f"{dep}\n"
    
    # 写入文件
    with open(new_requirements_file, 'w') as f:
        f.write(content)
    
    print(f"✅ 新的requirements文件已生成: {new_requirements_file}")
    print(f"📊 包含 {len(dependencies)} 个依赖包")
    print()
    print("🔍 生成的依赖列表预览:")
    print("-" * 50)
    for i, dep in enumerate(sorted(dependencies)[:20]):  # 只显示前20个
        print(f"  {dep}")
    
    if len(dependencies) > 20:
        print(f"  ... 还有 {len(dependencies) - 20} 个依赖")
    
    print("-" * 50)
    print()
    print("💡 建议操作:")
    print("  1. 检查生成的requirements_new.txt内容")
    print("  2. 如果满意，可以替换现有的requirements.txt:")
    print("     mv requirements_new.txt requirements.txt")

if __name__ == "__main__":
    main()