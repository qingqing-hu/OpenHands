"""语义压缩器模块，实现基于语义重要性的智能对话压缩。

根据TOKEN_OPTIMIZATION_PLAN.md的设计实现：
- 语义压缩策略：保留关键信息，压缩冗余和重复内容
- 分层压缩：根据消息重要性和时效性分层处理  
- 上下文相关性评估：基于当前任务相关性决定保留程度
"""

from __future__ import annotations

from openhands.core.config.condenser_config import SemanticCondenserConfig
from openhands.core.message import Message, TextContent
from openhands.events.action.agent import CondensationAction
from openhands.events.observation.agent import AgentCondensationObservation
from openhands.events.serialization.event import truncate_content
from openhands.llm import LLM
from openhands.memory.condenser.condenser import (
    Condensation,
    RollingCondenser,
    View,
)
from openhands.memory.condenser.impl.message_importance_scorer import MessageImportanceScorer


class SemanticCondenser(RollingCondenser):
    """语义压缩器，基于语义重要性和上下文相关性进行智能压缩。
    
    核心特性：
    1. 语义压缩策略：保留关键信息，压缩冗余和重复内容
    2. 分层压缩：根据消息重要性和时效性分层处理
    3. 上下文相关性评估：基于当前任务相关性决定保留程度
    4. 智能合并：合并相似操作的结果和冗余输出
    """

    def __init__(
        self,
        llm: LLM,
        max_size: int = 100,
        keep_first: int = 1,
        max_compression_ratio: float = 0.3,
        max_event_length: int = 8000,
        enable_semantic_analysis: bool = True,
    ):
        """初始化语义压缩器。
        
        Args:
            llm: LLM实例，用于语义分析和内容压缩
            max_size: 最大事件数量，超过后触发压缩
            keep_first: 保留前N个事件（通常是系统消息）
            max_compression_ratio: 最大压缩比例（0-1），控制压缩强度
            max_event_length: 单个事件最大长度
            enable_semantic_analysis: 是否启用语义分析
        """
        if keep_first >= max_size // 2:
            raise ValueError(
                f'keep_first ({keep_first}) must be less than half of max_size ({max_size})'
            )
        if not 0 < max_compression_ratio <= 1:
            raise ValueError(
                f'max_compression_ratio ({max_compression_ratio}) must be between 0 and 1'
            )

        self.max_size = max_size
        self.keep_first = keep_first
        self.max_compression_ratio = max_compression_ratio
        self.max_event_length = max_event_length
        self.enable_semantic_analysis = enable_semantic_analysis
        self.llm = llm
        
        # 初始化消息重要性评分器
        self.importance_scorer = MessageImportanceScorer(llm) if enable_semantic_analysis else None
        
        super().__init__()

    def _truncate(self, content: str) -> str:
        """截断内容以适应指定的最大事件长度。"""
        return truncate_content(content, max_chars=self.max_event_length)

    def should_condense(self, view: View) -> bool:
        """判断是否需要进行压缩。"""
        return len(view) > self.max_size

    def get_condensation(self, view: View) -> Condensation:
        """执行语义压缩，返回压缩结果。"""
        # 1. 识别关键消息类型和保留策略
        head = view[: self.keep_first]
        target_size = max(int(self.max_size * self.max_compression_ratio), self.keep_first + 2)
        
        # 2. 获取现有总结事件
        summary_event = self._get_or_create_summary_event(view)
        
        # 3. 识别需要遗忘的事件
        forgotten_events = self._identify_events_to_forget(view, target_size)
        
        if not forgotten_events:
            # 如果没有事件需要遗忘，直接返回当前视图
            return Condensation(
                action=CondensationAction(
                    forgotten_events_start_id=view[-1].id,
                    forgotten_events_end_id=view[-1].id,
                    summary="No events to compress",
                    summary_offset=self.keep_first,
                )
            )
        
        # 4. 执行语义压缩
        compressed_summary = self._compress_conversation_segment(forgotten_events, summary_event)
        
        return Condensation(
            action=CondensationAction(
                forgotten_events_start_id=min(event.id for event in forgotten_events),
                forgotten_events_end_id=max(event.id for event in forgotten_events),
                summary=compressed_summary,
                summary_offset=self.keep_first,
            )
        )

    def _get_or_create_summary_event(self, view: View) -> AgentCondensationObservation:
        """获取现有的总结事件或创建新的空总结。"""
        if (self.keep_first < len(view) and 
            isinstance(view[self.keep_first], AgentCondensationObservation)):
            return view[self.keep_first]
        return AgentCondensationObservation('初始状态：对话开始')

    def _identify_events_to_forget(self, view: View, target_size: int) -> list:
        """识别需要遗忘的事件，基于重要性评分和时效性。"""
        # 计算需要保留的尾部事件数量
        events_from_tail = target_size - self.keep_first - 1  # -1 for summary event
        
        if events_from_tail >= len(view) - self.keep_first:
            return []  # 不需要遗忘任何事件
        
        # 获取中间需要处理的事件（排除头部保留的和尾部保留的）
        middle_events = view[self.keep_first:-events_from_tail] if events_from_tail > 0 else view[self.keep_first:]
        
        forgotten_events = []
        for event in middle_events:
            if not isinstance(event, AgentCondensationObservation):
                forgotten_events.append(event)
        
        # 如果启用语义分析，按重要性排序并选择性遗忘
        if self.importance_scorer and forgotten_events:
            forgotten_events = self._filter_by_importance(forgotten_events)
        
        return forgotten_events

    def _filter_by_importance(self, events: list) -> list:
        """根据重要性评分过滤事件。"""
        try:
            # 评估每个事件的重要性
            scored_events = []
            for event in events:
                score = self.importance_scorer.score_event(event)
                scored_events.append((event, score))
            
            # 按重要性排序（低分优先遗忘）
            scored_events.sort(key=lambda x: x[1])
            
            # 选择重要性最低的事件进行遗忘（保留高分事件）
            num_to_forget = max(1, len(events) // 2)  # 至少遗忘一半
            return [event for event, score in scored_events[:num_to_forget]]
            
        except Exception as e:
            # 如果重要性评分失败，使用默认策略
            self.add_metadata('importance_scoring_error', str(e))
            return events[:len(events) // 2]

    def _compress_conversation_segment(self, forgotten_events: list, summary_event: AgentCondensationObservation) -> str:
        """压缩对话片段，保留语义关键信息。"""
        # 构建语义压缩提示
        prompt = self._build_semantic_compression_prompt(summary_event, forgotten_events)
        
        messages = [Message(role='user', content=[TextContent(text=prompt)])]
        
        try:
            response = self.llm.completion(
                messages=self.llm.format_messages_for_llm(messages),
                extra_body={'metadata': self._llm_metadata},
            )
            compressed_summary = response.choices[0].message.content or "压缩失败"
            
            # 记录压缩元数据
            self.add_metadata('compression_response', response.model_dump())
            self.add_metadata('compression_metrics', self.llm.metrics.get())
            self.add_metadata('events_compressed', len(forgotten_events))
            self.add_metadata('compression_ratio', 
                           len(compressed_summary) / sum(len(str(event)) for event in forgotten_events))
            
            return compressed_summary
            
        except Exception as e:
            # 压缩失败时的后备策略
            self.add_metadata('compression_error', str(e))
            return self._fallback_compression(forgotten_events, summary_event)

    def _build_semantic_compression_prompt(self, summary_event: AgentCondensationObservation, forgotten_events: list) -> str:
        """构建语义压缩提示。"""
        prompt = """你是一个智能对话压缩专家。请对以下对话片段进行语义压缩，遵循以下原则：

语义压缩策略：
1. 保留关键信息：错误状态、成功结果、用户指令、重要决策
2. 压缩冗余内容：重复操作、相似输出、详细日志
3. 合并相似操作：同类型的文件操作、相似的查询结果
4. 保留最终状态：任务完成情况、当前变量值、重要中间步骤

分层压缩格式：
任务上下文: (用户需求和目标的简洁描述)
关键进展: (重要的操作和成果)
技术状态: (代码状态、配置变化、系统状态)
待处理项: (未完成的任务和问题)
重要发现: (错误信息、调试结果、关键观察)

示例：
任务上下文: 修复FITS文件浮点数表示问题
关键进展: 已修改card.py中的mod_float()函数，测试通过
技术状态: str(val)替换f"{val:.16G}"，所有单元测试通过
待处理项: 创建PR，更新文档
重要发现: 原始格式导致精度丢失，新方法保持完整精度

请基于以下内容进行压缩：
"""

        # 添加之前的总结
        if summary_event.message:
            previous_summary = self._truncate(summary_event.message)
            prompt += f'\n<前期总结>\n{previous_summary}\n</前期总结>\n\n'

        # 添加需要压缩的事件
        prompt += '<待压缩事件>\n'
        for event in forgotten_events:
            event_content = self._truncate(str(event))
            prompt += f'[事件 {event.id}] {event_content}\n\n'
        prompt += '</待压缩事件>\n\n'

        prompt += '请生成简洁而完整的语义压缩总结，重点关注任务进展和技术状态：'
        
        return prompt

    def _fallback_compression(self, forgotten_events: list, summary_event: AgentCondensationObservation) -> str:
        """压缩失败时的后备策略。"""
        # 简单的基于规则的压缩
        event_types = {}
        key_results = []
        errors = []
        
        for event in forgotten_events:
            event_str = str(event)
            
            # 统计事件类型
            event_type = type(event).__name__
            event_types[event_type] = event_types.get(event_type, 0) + 1
            
            # 提取关键结果和错误
            if 'error' in event_str.lower() or 'failed' in event_str.lower():
                errors.append(f"错误: {event_str[:100]}...")
            elif 'success' in event_str.lower() or 'completed' in event_str.lower():
                key_results.append(f"成功: {event_str[:100]}...")
        
        # 构建后备总结
        fallback_summary = "语义压缩(后备模式):\n"
        fallback_summary += f"处理了 {len(forgotten_events)} 个事件\n"
        
        if event_types:
            fallback_summary += f"事件类型: {', '.join(f'{k}({v})' for k, v in event_types.items())}\n"
        
        if key_results:
            fallback_summary += "关键成果:\n" + '\n'.join(key_results[:3]) + "\n"
        
        if errors:
            fallback_summary += "遇到错误:\n" + '\n'.join(errors[:3]) + "\n"
        
        # 保留之前的总结
        if summary_event.message:
            fallback_summary += f"\n之前状态: {summary_event.message[:200]}..."
        
        return fallback_summary[:1000]  # 限制长度

    @classmethod
    def from_config(cls, config: SemanticCondenserConfig) -> 'SemanticCondenser':
        """从配置创建语义压缩器实例。"""
        # 语义压缩器不使用提示缓存
        llm_config = config.llm_config.model_copy()
        llm_config.caching_prompt = False

        return SemanticCondenser(
            llm=LLM(config=llm_config),
            max_size=config.max_size,
            keep_first=config.keep_first,
            max_event_length=config.max_event_length,
            max_compression_ratio=config.max_compression_ratio,
            enable_semantic_analysis=config.enable_semantic_analysis,
        )


# 注册配置
SemanticCondenser.register_config(SemanticCondenserConfig)