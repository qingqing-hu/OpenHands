"""智能重试策略模块，针对不同类型的错误采用不同的重试策略。"""

import re
from typing import Any

from openhands.core.logger import openhands_logger as logger


class TokenLimitRetryStrategy:
    """Token限制相关错误的重试策略。"""
    
    @staticmethod
    def should_compress_on_retry(exception: Exception) -> bool:
        """判断是否应该在重试时进行压缩。
        
        Args:
            exception: 发生的异常
            
        Returns:
            bool: 是否应该压缩上下文后重试
        """
        error_indicators = [
            'token quota', 'token limit', 'context length', 
            'maximum context', 'too many tokens', 'context_length_exceeded',
            'tokens exceed', 'input too long', 'context window'
        ]
        error_str = str(exception).lower()
        return any(indicator in error_str for indicator in error_indicators)
    
    @staticmethod
    def should_reduce_timeout(exception: Exception) -> bool:
        """判断是否应该缩短重试等待时间。
        
        Args:
            exception: 发生的异常
            
        Returns:
            bool: 是否应该使用更短的等待时间
        """
        # Token相关错误通常是立即可以处理的，不需要长时间等待
        return TokenLimitRetryStrategy.should_compress_on_retry(exception)
    
    @staticmethod
    def extract_token_info(exception: Exception) -> dict[str, Any]:
        """从异常信息中提取token相关信息。
        
        Args:
            exception: 发生的异常
            
        Returns:
            dict: 包含token信息的字典
        """
        error_str = str(exception)
        info = {}
        
        # 提取当前token数量
        token_match = re.search(r'(\d+)\s*tokens?', error_str, re.IGNORECASE)
        if token_match:
            info['current_tokens'] = int(token_match.group(1))
        
        # 提取token限制
        limit_match = re.search(r'limit[:\s]*(\d+)', error_str, re.IGNORECASE)
        if limit_match:
            info['token_limit'] = int(limit_match.group(1))
        
        # 提取quota信息
        quota_match = re.search(r'quota[:\s]*(\d+)', error_str, re.IGNORECASE)
        if quota_match:
            info['token_quota'] = int(quota_match.group(1))
        
        return info


class NetworkRetryStrategy:
    """网络相关错误的重试策略。"""
    
    @staticmethod
    def should_use_exponential_backoff(exception: Exception) -> bool:
        """判断是否应该使用指数退避策略。
        
        Args:
            exception: 发生的异常
            
        Returns:
            bool: 是否应该使用指数退避
        """
        network_indicators = [
            'connection error', 'timeout', 'network error', 
            '503 service unavailable', '502 bad gateway', 
            '504 gateway timeout', 'connection refused'
        ]
        error_str = str(exception).lower()
        return any(indicator in error_str for indicator in error_indicators)
    
    @staticmethod
    def get_recommended_wait_time(attempt_number: int, base_wait: int = 5) -> int:
        """获取推荐的等待时间。
        
        Args:
            attempt_number: 重试次数
            base_wait: 基础等待时间
            
        Returns:
            int: 推荐的等待时间（秒）
        """
        # 指数退避，但有上限
        wait_time = min(base_wait * (2 ** (attempt_number - 1)), 60)
        return wait_time


class RetryStrategyManager:
    """重试策略管理器，统一管理各种重试策略。"""
    
    def __init__(self):
        self.token_strategy = TokenLimitRetryStrategy()
        self.network_strategy = NetworkRetryStrategy()
    
    def analyze_exception(self, exception: Exception) -> dict[str, Any]:
        """分析异常并返回推荐的重试策略。
        
        Args:
            exception: 发生的异常
            
        Returns:
            dict: 包含重试策略建议的字典
        """
        strategy = {
            'exception_type': type(exception).__name__,
            'should_compress': False,
            'should_reduce_wait': False,
            'should_use_exponential_backoff': True,
            'recommended_action': 'standard_retry',
            'additional_info': {}
        }
        
        # 检查是否为token相关错误
        if self.token_strategy.should_compress_on_retry(exception):
            strategy.update({
                'should_compress': True,
                'should_reduce_wait': True,
                'recommended_action': 'compress_and_retry',
                'additional_info': self.token_strategy.extract_token_info(exception)
            })
            logger.info(f"Token-related error detected: {strategy['additional_info']}")
        
        # 检查是否为网络相关错误
        elif self.network_strategy.should_use_exponential_backoff(exception):
            strategy.update({
                'should_use_exponential_backoff': True,
                'recommended_action': 'network_retry'
            })
            logger.info("Network-related error detected, using exponential backoff")
        
        return strategy
    
    def get_retry_params(self, exception: Exception, attempt_number: int) -> dict[str, Any]:
        """根据异常类型和重试次数获取重试参数。
        
        Args:
            exception: 发生的异常
            attempt_number: 当前重试次数
            
        Returns:
            dict: 重试参数
        """
        strategy = self.analyze_exception(exception)
        params = {}
        
        if strategy['should_reduce_wait']:
            # Token相关错误使用较短的等待时间
            params['wait_time'] = min(2 * attempt_number, 10)
        elif strategy['should_use_exponential_backoff']:
            # 网络错误使用指数退避
            params['wait_time'] = self.network_strategy.get_recommended_wait_time(attempt_number)
        else:
            # 默认等待时间
            params['wait_time'] = 5 * attempt_number
        
        params['strategy_info'] = strategy
        return params


# 全局重试策略管理器实例
retry_strategy_manager = RetryStrategyManager()