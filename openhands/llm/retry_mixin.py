from typing import Any, Callable

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
    wait_fixed,
)

from openhands.core.exceptions import LLMNoResponseError
from openhands.core.logger import openhands_logger as logger
from openhands.llm.retry_strategies import retry_strategy_manager
from openhands.utils.tenacity_stop import stop_if_should_exit


class RetryMixin:
    """Mixin class for retry logic."""

    def retry_decorator(self, **kwargs: Any) -> Callable:
        """
        Create a LLM retry decorator with customizable parameters. This is used for 429 errors, and a few other exceptions in LLM classes.

        Args:
            **kwargs: Keyword arguments to override default retry behavior.
                      Keys: num_retries, retry_exceptions, retry_min_wait, retry_max_wait, retry_multiplier

        Returns:
            A retry decorator with the parameters customizable in configuration.
        """
        num_retries = kwargs.get('num_retries')
        retry_exceptions: tuple = kwargs.get('retry_exceptions', ())
        retry_min_wait = kwargs.get('retry_min_wait')
        retry_max_wait = kwargs.get('retry_max_wait')
        retry_multiplier = kwargs.get('retry_multiplier')
        retry_listener = kwargs.get('retry_listener')

        def before_sleep(retry_state: Any) -> None:
            self.log_retry_attempt(retry_state)
            if retry_listener:
                retry_listener(retry_state.attempt_number, num_retries)

            exception = retry_state.outcome.exception()
            
            # 智能重试策略处理
            self._apply_intelligent_retry_strategy(retry_state, exception)
            
            # Check if the exception is LLMNoResponseError
            if isinstance(exception, LLMNoResponseError):
                if hasattr(retry_state, 'kwargs'):
                    # Only change temperature if it's zero or not set
                    current_temp = retry_state.kwargs.get('temperature', 0)
                    if current_temp == 0:
                        retry_state.kwargs['temperature'] = 1.0
                        logger.warning(
                            'LLMNoResponseError detected with temperature=0, setting temperature to 1.0 for next attempt.'
                        )
                    else:
                        logger.warning(
                            f'LLMNoResponseError detected with temperature={current_temp}, keeping original temperature'
                        )

        retry_decorator: Callable = retry(
            before_sleep=before_sleep,
            stop=stop_after_attempt(num_retries) | stop_if_should_exit(),
            reraise=True,
            retry=(
                retry_if_exception_type(retry_exceptions)
            ),  # retry only for these types
            wait=wait_exponential(
                multiplier=retry_multiplier,
                min=retry_min_wait,
                max=retry_max_wait,
            ),
        )
        return retry_decorator

    def log_retry_attempt(self, retry_state: Any) -> None:
        """Log retry attempts."""
        exception = retry_state.outcome.exception()

        # Add retry attempt and max retries to the exception for later use
        if hasattr(retry_state, 'retry_object') and hasattr(
            retry_state.retry_object, 'stop'
        ):
            # Get the max retries from the stop_after_attempt
            stop_condition = retry_state.retry_object.stop

            # Handle both single stop conditions and stop_any (combined conditions)
            stop_funcs = []
            if hasattr(stop_condition, 'stops'):
                # This is a stop_any object with multiple stop conditions
                stop_funcs = stop_condition.stops
            else:
                # This is a single stop condition
                stop_funcs = [stop_condition]

            for stop_func in stop_funcs:
                if hasattr(stop_func, 'max_attempts'):
                    # Add retry information to the exception
                    exception.retry_attempt = retry_state.attempt_number
                    exception.max_retries = stop_func.max_attempts
                    break

        # 使用智能重试策略记录详细信息
        try:
            retry_params = retry_strategy_manager.get_retry_params(
                exception, retry_state.attempt_number
            )
            strategy_info = retry_params.get('strategy_info', {})
            
            logger.error(
                f'{exception}. Attempt #{retry_state.attempt_number} | '
                f'Action: {strategy_info.get("recommended_action", "standard_retry")} | '
                f'You can customize retry values in the configuration.',
            )
        except Exception as e:
            # 如果智能策略失败，使用默认日志
            logger.error(
                f'{exception}. Attempt #{retry_state.attempt_number} | You can customize retry values in the configuration.',
            )
            logger.debug(f"获取重试策略信息时发生错误: {e}")

    def _apply_intelligent_retry_strategy(self, retry_state: Any, exception: Exception) -> None:
        """应用智能重试策略。
        
        Args:
            retry_state: Tenacity重试状态
            exception: 发生的异常
        """
        try:
            # 获取重试策略建议
            retry_params = retry_strategy_manager.get_retry_params(
                exception, retry_state.attempt_number
            )
            strategy_info = retry_params.get('strategy_info', {})
            
            # Token相关错误的特殊处理
            if strategy_info.get('should_compress', False):
                self._trigger_context_compression(retry_state, strategy_info)
                
                # 对于token相关错误，使用较短的等待时间
                wait_time = retry_params.get('wait_time', 2)
                if hasattr(retry_state.retry_object, 'wait'):
                    # 动态修改等待时间为固定短时间
                    retry_state.retry_object.wait = wait_fixed(wait_time)
                    logger.info(
                        f"Token限制错误检测到，使用压缩策略并减少等待时间到 {wait_time}s"
                    )
            
            # 网络错误的指数退避策略
            elif strategy_info.get('should_use_exponential_backoff', False):
                wait_time = retry_params.get('wait_time', 5)
                logger.info(
                    f"网络错误检测到，使用指数退避策略，等待时间: {wait_time}s"
                )
                
        except Exception as e:
            # 如果智能策略失败，记录错误但不影响原有重试逻辑
            logger.warning(f"应用智能重试策略时发生错误: {e}，使用默认重试策略")
    
    def _trigger_context_compression(self, retry_state: Any, strategy_info: dict) -> None:
        """Token超限重试时触发上下文压缩。
        
        Args:
            retry_state: Tenacity重试状态
            strategy_info: 策略信息字典
        """
        if not hasattr(retry_state, 'kwargs') or 'messages' not in retry_state.kwargs:
            logger.warning("无法进行上下文压缩：重试状态中未找到消息")
            return
            
        original_messages = retry_state.kwargs['messages']
        if not original_messages:
            logger.warning("无法进行上下文压缩：消息列表为空")
            return
        
        try:
            # 简单的紧急压缩策略：保留最新的消息和系统消息
            compressed_messages = self._emergency_compress_messages(
                original_messages, strategy_info
            )
            
            if len(compressed_messages) < len(original_messages):
                retry_state.kwargs['messages'] = compressed_messages
                logger.info(
                    f"应用紧急上下文压缩：{len(original_messages)} -> {len(compressed_messages)} 条消息"
                )
                
                # 记录token信息
                token_info = strategy_info.get('additional_info', {})
                if token_info:
                    logger.info(f"Token信息: {token_info}")
            else:
                logger.warning("上下文压缩未能减少消息数量")
                
        except Exception as e:
            logger.error(f"上下文压缩失败: {e}，继续使用原始消息")
    
    def _emergency_compress_messages(self, messages: list, strategy_info: dict) -> list:
        """紧急压缩消息列表。
        
        Args:
            messages: 原始消息列表
            strategy_info: 策略信息
            
        Returns:
            list: 压缩后的消息列表
        """
        if len(messages) <= 3:
            return messages
        
        # 保留策略：保留第一条（通常是系统消息）和最后几条重要消息
        compressed = []
        
        # 保留第一条消息（系统消息）
        if messages and messages[0].get('role') == 'system':
            compressed.append(messages[0])
            remaining_messages = messages[1:]
        else:
            remaining_messages = messages
        
        # 保留最后的关键消息（用户消息和助手响应）
        if len(remaining_messages) > 6:
            # 只保留最后6条消息
            compressed.extend(remaining_messages[-6:])
        else:
            compressed.extend(remaining_messages)
        
        return compressed
