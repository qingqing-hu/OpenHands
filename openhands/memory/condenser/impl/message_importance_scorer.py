"""消息重要性评分器模块，实现基于多因素的消息重要性评估。

根据TOKEN_OPTIMIZATION_PLAN.md设计实现：
- 基于错误状态、用户指令、任务相关性等因素评分
- 时间衰减：越新的消息权重越高
- 上下文相关性：与当前任务相关的消息优先级更高
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from openhands.core.message import Message, TextContent
from openhands.events.action.action import Action
from openhands.events.observation.observation import Observation
from openhands.llm import LLM


class MessageImportanceScorer:
    """消息重要性评分器，基于多因素评估消息的重要性。
    
    评分因素：
    1. 错误状态(+0.3)：包含错误信息的消息
    2. 用户指令(+0.4)：用户直接发出的指令和需求
    3. 任务相关性(+0.3)：与当前任务相关的内容
    4. 时间衰减：越新的消息权重越高
    5. 事件类型：不同类型事件的基础权重
    """

    def __init__(self, llm: LLM = None):
        """初始化重要性评分器。
        
        Args:
            llm: 可选的LLM实例，用于复杂的语义分析
        """
        self.llm = llm
        
        # 错误关键词
        self.error_keywords = [
            'error', 'failed', 'exception', 'traceback', 'stderr',
            '错误', '失败', '异常', '报错', 'timeout', 'denied'
        ]
        
        # 成功关键词
        self.success_keywords = [
            'success', 'completed', 'finished', 'done', 'passed',
            '成功', '完成', '通过', 'ok', 'created', 'updated'
        ]
        
        # 用户指令关键词
        self.user_instruction_keywords = [
            'please', 'can you', 'help me', 'i need', 'create', 'fix', 'update',
            '请', '帮我', '需要', '创建', '修复', '更新', '添加', '删除'
        ]
        
        # 重要操作关键词
        self.important_operation_keywords = [
            'commit', 'push', 'merge', 'deploy', 'install', 'build', 'test',
            'git', 'npm', 'pip', 'docker', '提交', '部署', '安装', '构建', '测试'
        ]

    def score_event(self, event: Any) -> float:
        """评估单个事件的重要性分数。
        
        Args:
            event: 要评分的事件
            
        Returns:
            float: 重要性分数 (0.0-1.0)，分数越高越重要
        """
        try:
            base_score = self._get_base_score_by_type(event)
            content_score = self._analyze_content_importance(event)
            temporal_score = self._calculate_temporal_weight(event)
            
            # 综合评分：基础分数 + 内容分数 + 时间权重
            final_score = min(1.0, base_score + content_score + temporal_score)
            
            return final_score
            
        except Exception as e:
            # 评分失败时返回中等重要性
            return 0.5

    def _get_base_score_by_type(self, event: Any) -> float:
        """根据事件类型获取基础分数。"""
        event_type = type(event).__name__
        
        # 用户相关事件 - 高重要性
        if 'User' in event_type or 'Message' in event_type:
            return 0.4
        
        # 错误和异常事件 - 高重要性
        if 'Error' in event_type or 'Exception' in event_type:
            return 0.3
        
        # 代理动作 - 中等重要性
        if isinstance(event, Action):
            action_type = event_type.lower()
            if any(keyword in action_type for keyword in ['cmd', 'run', 'execute']):
                return 0.25
            elif any(keyword in action_type for keyword in ['edit', 'create', 'write']):
                return 0.3
            elif any(keyword in action_type for keyword in ['browse', 'search']):
                return 0.15
            else:
                return 0.2
        
        # 观察结果 - 较低重要性
        if isinstance(event, Observation):
            return 0.1
        
        # 其他事件 - 默认重要性
        return 0.15

    def _analyze_content_importance(self, event: Any) -> float:
        """分析事件内容的重要性。"""
        content = self._extract_content(event)
        if not content:
            return 0.0
        
        content_lower = content.lower()
        importance_score = 0.0
        
        # 错误状态检测 (+0.3)
        if any(keyword in content_lower for keyword in self.error_keywords):
            importance_score += 0.3
        
        # 成功状态检测 (+0.2)
        if any(keyword in content_lower for keyword in self.success_keywords):
            importance_score += 0.2
        
        # 用户指令检测 (+0.4)
        if any(keyword in content_lower for keyword in self.user_instruction_keywords):
            importance_score += 0.4
        
        # 重要操作检测 (+0.25)
        if any(keyword in content_lower for keyword in self.important_operation_keywords):
            importance_score += 0.25
        
        # 数字和文件路径检测 (+0.1)
        if re.search(r'\d+', content) or re.search(r'[./\\][\w/\\.-]+\.\w+', content):
            importance_score += 0.1
        
        # 长度权重：过短或过长的消息重要性降低
        length_factor = self._calculate_length_factor(content)
        importance_score *= length_factor
        
        return min(0.5, importance_score)  # 内容分数最高0.5

    def _extract_content(self, event: Any) -> str:
        """从事件中提取文本内容。"""
        # 尝试多种方式提取内容
        if hasattr(event, 'content'):
            content = event.content
            if isinstance(content, str):
                return content
            elif hasattr(content, 'text'):
                return content.text
        
        if hasattr(event, 'message'):
            return str(event.message)
        
        if hasattr(event, 'thought'):
            return str(event.thought)
        
        if hasattr(event, 'command'):
            return str(event.command)
        
        # 最后尝试转换为字符串
        return str(event)

    def _calculate_temporal_weight(self, event: Any) -> float:
        """计算时间衰减权重。"""
        try:
            # 尝试获取事件时间戳
            timestamp = None
            if hasattr(event, 'timestamp'):
                timestamp = event.timestamp
            elif hasattr(event, 'created_at'):
                timestamp = event.created_at
            
            if timestamp is None:
                return 0.0  # 无时间信息，不加权
            
            # 计算时间差
            if isinstance(timestamp, str):
                # 尝试解析字符串时间戳
                try:
                    timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                except:
                    return 0.0
            
            if not isinstance(timestamp, datetime):
                return 0.0
            
            now = datetime.now(timezone.utc)
            if timestamp.tzinfo is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            
            time_diff = (now - timestamp).total_seconds()
            
            # 时间衰减：1小时内=0.1，1天内=0.05，其他=0.0
            if time_diff < 3600:  # 1小时内
                return 0.1
            elif time_diff < 86400:  # 1天内
                return 0.05
            else:
                return 0.0
                
        except Exception:
            return 0.0

    def _calculate_length_factor(self, content: str) -> float:
        """计算基于长度的重要性因子。"""
        length = len(content)
        
        if length < 10:  # 太短
            return 0.5
        elif length < 50:  # 短消息
            return 0.8
        elif length < 500:  # 正常长度
            return 1.0
        elif length < 2000:  # 较长
            return 0.9
        else:  # 太长，可能是日志
            return 0.6

    def score_task_relevance(self, event: Any, current_task: str) -> float:
        """评估消息与当前任务的相关性。
        
        Args:
            event: 要评分的事件
            current_task: 当前任务描述
            
        Returns:
            float: 任务相关性分数 (0.0-0.3)
        """
        if not current_task:
            return 0.0
        
        content = self._extract_content(event)
        if not content:
            return 0.0
        
        # 简单的关键词匹配
        task_keywords = self._extract_keywords(current_task.lower())
        content_lower = content.lower()
        
        matches = sum(1 for keyword in task_keywords if keyword in content_lower)
        if matches > 0:
            return min(0.3, matches * 0.1)
        
        return 0.0

    def _extract_keywords(self, text: str) -> list[str]:
        """从文本中提取关键词。"""
        # 简单的关键词提取：长度>=3的单词
        words = re.findall(r'\b\w{3,}\b', text)
        # 去除常见停用词
        stopwords = {'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'was', 'one', 'our', 'out', 'use'}
        return [word for word in words if word not in stopwords]

    def get_importance_explanation(self, event: Any, score: float) -> str:
        """获取重要性评分的解释。"""
        explanations = []
        
        base_score = self._get_base_score_by_type(event)
        if base_score > 0.2:
            explanations.append(f"事件类型重要 ({base_score:.2f})")
        
        content = self._extract_content(event)
        if content:
            content_lower = content.lower()
            
            if any(keyword in content_lower for keyword in self.error_keywords):
                explanations.append("包含错误信息")
            
            if any(keyword in content_lower for keyword in self.user_instruction_keywords):
                explanations.append("用户指令")
            
            if any(keyword in content_lower for keyword in self.important_operation_keywords):
                explanations.append("重要操作")
        
        temporal_weight = self._calculate_temporal_weight(event)
        if temporal_weight > 0:
            explanations.append(f"时间权重 (+{temporal_weight:.2f})")
        
        return f"总分: {score:.2f} ({', '.join(explanations) if explanations else '基础评分'})"