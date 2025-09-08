# OpenHands Token使用优化实现方案

## 1. 实现对话压缩

### 1.1 核心逻辑
- **语义压缩策略**：保留关键信息，压缩冗余和重复内容
- **分层压缩**：根据消息重要性和时效性分层处理
- **上下文相关性评估**：基于当前任务相关性决定保留程度

### 1.2 实现架构
```python
# 新增文件: openhands/memory/condenser/semantic_condenser.py
class SemanticCondenser:
    def __init__(self, llm_client: LLM, max_compression_ratio: float = 0.3):
        self.llm_client = llm_client
        self.max_compression_ratio = max_compression_ratio
    
    def compress_conversation_segment(self, messages: list[Message]) -> list[Message]:
        """压缩对话片段，保留语义关键信息"""
        # 1. 识别关键消息类型（错误、成功结果、用户指令）
        # 2. 对冗余输出进行摘要压缩
        # 3. 合并相似操作的结果
        # 4. 保留最终状态和关键中间步骤
    
    def extract_key_information(self, message: Message) -> dict:
        """提取消息的关键信息"""
        # 根据消息类型提取核心信息
```

### 1.3 集成点
- **位置**：`ConversationMemory.process_events()` 方法内
- **触发条件**：消息数量或token估算超过阈值时
- **压缩策略**：每次压缩最旧的20-30%的消息

---

## 2. 智能上下文管理

### 2.1 核心逻辑
- **上下文重要性评分**：基于任务相关性、时间衰减、错误状态等因素
- **动态窗口调整**：根据当前任务复杂度动态调整上下文窗口大小
- **关键信息标记**：标记必须保留的关键信息（错误状态、任务目标等）

### 2.2 实现架构
```python
# 修改文件: openhands/memory/conversation_memory.py
class ContextManager:
    def __init__(self, config: AgentConfig):
        self.importance_scorer = MessageImportanceScorer()
        self.context_window_manager = DynamicWindowManager()
    
    def optimize_context(self, messages: list[Message], current_task: str) -> list[Message]:
        """根据任务相关性优化上下文"""
        # 1. 计算每条消息的重要性评分
        # 2. 识别任务相关的关键信息
        # 3. 动态调整上下文窗口
        # 4. 保留高分消息，压缩低分消息

class MessageImportanceScorer:
    def score_message(self, message: Message, current_task: str) -> float:
        """评估消息重要性 (0-1分值)"""
        # 基于：错误状态(+0.3)、用户指令(+0.4)、任务相关性(+0.3)
```

### 2.3 集成点
- **位置**：`ConversationMemory.process_events()` 开始处
- **配置项**：新增 `context_optimization_enabled`、`max_context_messages` 配置

---

## 3. 分块处理策略

### 3.1 核心逻辑
- **大文件检测**：自动检测大文件操作（>10KB内容）
- **智能分块**：按语义边界分块（函数、类、配置段落等）
- **渐进式处理**：只加载当前需要的文件片段

### 3.2 实现架构
```python
# 新增文件: openhands/events/chunking/file_chunker.py
class FileContentChunker:
    def __init__(self, max_chunk_size: int = 5000):
        self.max_chunk_size = max_chunk_size
    
    def should_chunk_content(self, content: str) -> bool:
        """判断是否需要分块处理"""
        return len(content) > self.max_chunk_size
    
    def create_chunked_observations(self, obs: FileReadObservation) -> list[FileReadObservation]:
        """创建分块观察"""
        # 1. 按代码结构智能分块
        # 2. 保留上下文信息
        # 3. 添加分块元信息

# 修改文件: openhands/events/observation/files.py  
class FileReadObservation:
    def __init__(self, content: str, path: str, **kwargs):
        if FileContentChunker().should_chunk_content(content):
            # 标记为需要分块处理
            self.is_chunked = True
            self.chunk_info = ChunkInfo(total_size=len(content), path=path)
```

### 3.3 集成点
- **位置**：文件操作观察创建时(`FileReadObservation`, `CmdOutputObservation`)
- **触发条件**：内容长度超过配置阈值
- **用户体验**：透明处理，用户无感知

---

## 4. 配置Token限制

### 4.1 核心逻辑
- **多层token限制**：输入token限制、对话历史限制、单次请求限制
- **智能预警机制**：达到80%阈值时主动压缩
- **优雅降级**：超限时自动触发压缩而非直接失败

### 4.2 实现架构
```python
# 修改文件: openhands/core/config/llm_config.py
@dataclass
class LLMConfig:
    # 现有配置...
    conversation_token_limit: int = 300000  # 对话历史token限制
    single_request_token_limit: int = 250000  # 单次请求限制
    token_warning_threshold: float = 0.8  # 预警阈值
    auto_compress_on_limit: bool = True  # 超限自动压缩

# 修改文件: openhands/llm/llm.py
class LLM:
    def _check_token_limits(self, messages: list[dict]) -> tuple[bool, int]:
        """检查token限制，返回(是否超限, 当前token数)"""
        current_tokens = self.get_token_count(messages)
        
        # 检查各层限制
        if current_tokens > self.config.single_request_token_limit:
            return True, current_tokens
        
        return False, current_tokens
    
    def _handle_token_limit_exceeded(self, messages: list[dict]) -> list[dict]:
        """处理token超限情况"""
        if self.config.auto_compress_on_limit:
            # 触发压缩逻辑
            return self.conversation_condenser.compress_messages(messages)
        else:
            raise TokenLimitExceededError()
```

### 4.3 集成点
- **位置**：`LLM.completion()` 方法调用前
- **配置方式**：环境变量、配置文件
- **监控指标**：添加token使用率监控

---

## 5. 优化重试策略

### 5.1 核心逻辑
- **差异化重试**：根据错误类型采用不同策略
- **上下文精简重试**：重试时只发送核心上下文
- **智能退避**：token限制错误使用压缩策略而非等待

### 5.2 实现架构
```python
# 修改文件: openhands/llm/retry_mixin.py
class RetryMixin:
    def retry_decorator(self, **kwargs):
        def before_sleep(retry_state: Any) -> None:
            exception = retry_state.outcome.exception()
            
            # 针对RateLimitError的特殊处理
            if 'token quota' in str(exception) or 'token limit' in str(exception):
                # 触发上下文压缩而非简单等待
                self._trigger_context_compression(retry_state)
                # 缩短等待时间
                retry_state.next_action = retry(wait=wait_fixed(1))
            
            self.log_retry_attempt(retry_state)
    
    def _trigger_context_compression(self, retry_state) -> None:
        """Token超限重试时触发上下文压缩"""
        if hasattr(retry_state, 'kwargs') and 'messages' in retry_state.kwargs:
            compressed_messages = self.context_compressor.emergency_compress(
                retry_state.kwargs['messages']
            )
            retry_state.kwargs['messages'] = compressed_messages
            logger.info("Applied emergency context compression for token limit retry")

# 新增文件: openhands/llm/retry_strategies.py
class TokenLimitRetryStrategy:
    @staticmethod
    def should_compress_on_retry(exception: Exception) -> bool:
        """判断是否应该在重试时进行压缩"""
        error_indicators = [
            'token quota', 'token limit', 'context length', 
            'maximum context', 'too many tokens'
        ]
        return any(indicator in str(exception).lower() for indicator in error_indicators)
```

### 5.3 集成点
- **位置**：`RetryMixin.before_sleep()` 方法内
- **触发条件**：检测到token相关错误
- **回退机制**：压缩失败时使用传统重试策略

---

## 实现优先级和风险评估

### 优先级排序
1. **P0 (立即实施)**：配置Token限制 - 风险低，效果立竿见影
2. **P1 (短期实施)**：分块处理策略 - 影响面较小，收益明显
3. **P1 (短期实施)**：优化重试策略 - 直接解决当前问题
4. **P2 (中期实施)**：智能上下文管理 - 需要较多测试验证
5. **P3 (长期实施)**：对话压缩 - 复杂度高，需要LLM参与

### 风险评估
- **兼容性风险**：现有功能可能受影响，需要充分测试
- **性能风险**：压缩算法可能增加延迟
- **质量风险**：过度压缩可能影响AI推理质量
- **配置复杂性**：新增配置项需要合理默认值

### 成功指标
- Token使用率降低40-60%
- 重试次数减少70%以上
- 响应时间改善20-30%
- 任务完成率保持95%以上