# CodeAct Agent LLM 请求调试日志指南

## 🎯 功能概述

为了更好地定位CodeAct Agent的问题，现在每次LLM请求都会打印详细的请求和响应内容，包括：
- 消息结构和数量统计
- 各角色消息的内容预览
- 响应内容和工具调用详情
- Token使用和性能指标

## 📋 日志输出示例

### 完整的LLM交互日志链路

```
21:10:45.123 - openhands:INFO: LLM Request Start - Time: 21:10:45.123 | Model: moonshot/kimi-k2-0711-preview | Estimated Input Tokens: 8,456

21:10:45.124 - openhands:INFO: LLM Request Content - Model: moonshot/kimi-k2-0711-preview | Messages: 5 (system: 1, user: 2, assistant: 1, tool: 1) | Total Characters: 12,345

21:10:45.125 - openhands:INFO: LLM Message 1 [SYSTEM]: You are OpenHands agent, a helpful AI assistant that can interact with a computer to solve tasks...

21:10:45.126 - openhands:INFO: LLM Message 2 [USER]: Help me create a Python script to analyze data

21:10:45.127 - openhands:INFO: LLM Message 3 [ASSISTANT]: I'll help you create a Python data analysis script. Let me start by creating a basic structure...

21:10:45.128 - openhands:INFO: LLM Message 4 [TOOL]: File created successfully at /workspace/analyze_data.py

21:10:45.129 - openhands:INFO: LLM Message 5 [USER]: Now add pandas import and basic data loading function

21:10:48.567 - openhands:INFO: LLM Request Complete - Time: 21:10:48.567 | Duration: 3.444s | Model: moonshot/kimi-k2-0711-preview | Response ID: chatcmpl-abc123

21:10:48.568 - openhands:INFO: LLM Response Preview: Content: 245 chars | Tools: str_replace_editor

21:10:48.569 - openhands:INFO: LLM Response Content: I'll add the pandas import and create a basic data loading function for you.

21:10:48.570 - openhands:INFO: LLM Tool Call 1: str_replace_editor({"command": "str_replace", "path": "/workspace/analyze_data.py", "old_str": "# Basic Python script", "new_str": "import pandas as pd\nimport numpy as np\n\ndef load_data(file_path):\n    \"\"\"Load data from CSV file\"\"\"\n    return pd.read_csv(file_path)"})

21:10:48.571 - openhands:INFO: LLM Response Details - Model: moonshot/kimi-k2-0711-preview | Input Tokens: 8,460 | Output Tokens: 156 | Total Tokens: 8,616 | Duration: 3.444s | Speed: 2,501.2 tokens/s | Usage: 34.5% | Cost: 0.012340 USD | Accumulated Cost: 0.045670 USD | Response ID: chatcmpl-abc123
```

## 🔧 启用调试日志

### 方法1：通过配置文件

在 `config.toml` 中设置：
```toml
[core]
# 启用INFO级别日志
log_level = "INFO"
# 记录所有事件  
log_all_events = true
# 启用详细日志
debug = true
```

### 方法2：通过环境变量

```bash
export LOG_LEVEL=INFO
export DEBUG=true
export LOG_ALL_EVENTS=true
# 启用后运行OpenHands
```

### 方法3：如需完整DEBUG信息

```toml
[core]
log_level = "DEBUG"
debug = true
```

**注意**：DEBUG级别会输出完整的消息内容，可能包含大量信息。

## 📊 日志信息解析

### 请求内容日志
```
LLM Request Content - Model: {model} | Messages: {count} ({role_summary}) | Total Characters: {chars}
```
- **Model**: 使用的LLM模型
- **Messages**: 发送的消息总数和各角色统计
- **Total Characters**: 所有消息的字符总数

### 单条消息日志
```
LLM Message {index} [{ROLE}]: {content_preview}
```
- **Index**: 消息序号（从1开始）
- **Role**: 消息角色（SYSTEM/USER/ASSISTANT/TOOL）
- **Content Preview**: 消息内容预览（截断到200字符）

### 响应预览日志
```
LLM Response Preview: {summary}
```
显示响应的基本信息：
- **Content**: 文本内容字符数
- **Tools**: 调用的工具列表

### 工具调用日志
```
LLM Tool Call {index}: {function_name}({args_preview})
```
- **Index**: 工具调用序号
- **Function Name**: 调用的工具函数名
- **Args Preview**: 参数预览（截断到200字符）

## 🎯 问题定位用途

### 1. **请求内容分析**
- 检查发送给LLM的消息结构是否正确
- 验证系统提示和用户输入是否完整
- 分析上下文长度和Token使用

### 2. **响应分析**
- 查看LLM的实际响应内容
- 检查工具调用的参数是否正确
- 分析响应是否符合预期格式

### 3. **性能问题诊断**
- 通过Duration字段识别慢请求
- 分析Token数量与处理时间的关系
- 监控成本和使用率

### 4. **错误排查**
- 超时错误：检查请求大小和复杂度
- 格式错误：验证消息结构和工具调用
- Token限制：分析使用率和限制配置

## ⚠️ 注意事项

### 隐私安全
- 日志可能包含敏感信息（API密钥、用户数据等）
- 生产环境请谨慎使用详细日志
- 建议只在开发和调试时启用

### 性能影响
- 详细日志会增加I/O开销
- 大量消息的格式化可能影响性能
- 建议在调试完成后关闭详细日志

### 日志大小
- 长对话会产生大量日志
- 建议配置日志轮转和清理策略
- 监控磁盘空间使用

## 🚀 高级用法

### 过滤特定类型的日志
```bash
# 只查看请求开始日志
grep "LLM Request Start" openhands.log

# 只查看工具调用
grep "LLM Tool Call" openhands.log

# 查看超时相关的请求
grep -B5 -A5 "504 Gateway Time-out" openhands.log
```

### 分析Token使用模式
```bash
# 提取Token统计信息
grep "LLM Response Details" openhands.log | awk -F'|' '{print $3, $4, $5}'

# 查找高Token使用的请求
grep "Usage: [89][0-9]" openhands.log
```

### 监控请求耗时
```bash
# 查找慢请求（>5秒）
grep "Duration: [5-9]\." openhands.log
grep "Duration: [0-9][0-9]\." openhands.log
```

## 🔧 故障排除

如果日志没有按预期显示：

1. **检查日志级别**：确保设置为INFO或DEBUG
2. **验证配置**：确认配置文件正确加载
3. **重启服务**：配置修改后需要重启OpenHands
4. **检查环境变量**：环境变量优先级高于配置文件

这个增强的日志功能将大大改善CodeAct Agent的可调试性，帮助快速定位和解决各种问题。