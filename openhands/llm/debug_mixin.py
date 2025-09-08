import os
from logging import DEBUG
from typing import Any

from litellm import ChatCompletionMessageToolCall
from litellm.types.utils import ModelResponse

from openhands.core.logger import llm_prompt_logger, llm_response_logger
from openhands.core.logger import openhands_logger as logger

# Default control for request logging - can be overridden by config
DEFAULT_ENABLE_LLM_REQUEST_LOGGING = os.getenv('ENABLE_LLM_REQUEST_LOGGING', 'True').lower() in ['true', '1', 'yes']

# Default control for full content logging - can be overridden by config  
DEFAULT_ENABLE_FULL_CONTENT_LOGGING = os.getenv('ENABLE_FULL_CONTENT_LOGGING', 'True').lower() in ['true', '1', 'yes']

MESSAGE_SEPARATOR = '\n\n----------\n\n'


class DebugMixin:
    def log_prompt(self, messages: list[dict[str, Any]] | dict[str, Any]) -> None:
        if not logger.isEnabledFor(DEBUG):
            # Don't use memory building message string if not logging.
            return
        if not messages:
            logger.debug('No completion messages!')
            return

        messages = messages if isinstance(messages, list) else [messages]
        debug_message = MESSAGE_SEPARATOR.join(
            self._format_message_content(msg)
            for msg in messages
            if msg['content'] is not None
        )

        if debug_message:
            llm_prompt_logger.debug(debug_message)
        else:
            logger.debug('No completion messages!')

    def log_response(self, resp: ModelResponse) -> None:
        if not logger.isEnabledFor(DEBUG):
            # Don't use memory building message string if not logging.
            return
        message_back: str = resp['choices'][0]['message']['content'] or ''
        tool_calls: list[ChatCompletionMessageToolCall] = resp['choices'][0][
            'message'
        ].get('tool_calls', [])
        if tool_calls:
            for tool_call in tool_calls:
                fn_name = tool_call.function.name
                fn_args = tool_call.function.arguments
                message_back += f'\nFunction call: {fn_name}({fn_args})'

        if message_back:
            llm_response_logger.debug(message_back)

    def log_response_details(self, resp: ModelResponse) -> None:
        """Log detailed response information for debugging, works at INFO level."""
        # Check if logging is enabled from config or environment variable
        enable_logging = getattr(self, 'config', None) and getattr(self.config, 'enable_llm_request_logging', None)
        if enable_logging is None:
            enable_logging = DEFAULT_ENABLE_LLM_REQUEST_LOGGING
        
        if not enable_logging:
            return
            
        if not resp or not resp.get('choices'):
            logger.info('LLM Response: No response received')
            return
            
        choice = resp['choices'][0]
        message = choice.get('message', {})
        content = message.get('content', '') or ''
        tool_calls = message.get('tool_calls', [])
        
        # Log response summary
        response_info = []
        
        if content:
            content_preview = (content[:300] + '...' if len(content) > 300 else content)
            response_info.append(f'Content: {len(content)} chars')
        
        if tool_calls:
            tool_names = [tc.function.name for tc in tool_calls]
            response_info.append(f'Tools: {", ".join(tool_names)}')
        
        summary = ' | '.join(response_info) if response_info else 'Empty response'
        logger.info(f'LLM Response Preview: {summary}')
        
        # Log content preview if exists
        if content:
            content_preview = (content[:300] + '...' if len(content) > 300 else content)
            logger.info(f'LLM Response Content: {content_preview}')
        
        # Log tool calls details if any
        if tool_calls:
            for i, tool_call in enumerate(tool_calls):
                fn_name = tool_call.function.name
                fn_args = tool_call.function.arguments
                args_preview = (fn_args[:200] + '...' if len(fn_args) > 200 else fn_args)
                logger.info(f'LLM Tool Call {i+1}: {fn_name}({args_preview})')

    def log_request_details(self, messages: list[dict[str, Any]], model: str) -> None:
        """Log detailed request information for debugging, works at INFO level."""
        # Check if logging is enabled from config or environment variable
        enable_logging = getattr(self, 'config', None) and getattr(self.config, 'enable_llm_request_logging', None)
        if enable_logging is None:
            enable_logging = DEFAULT_ENABLE_LLM_REQUEST_LOGGING
        
        if not enable_logging:
            return
            
        if not messages:
            logger.info('LLM Request: No messages to send')
            return
        
        # Count messages by role
        message_counts = {}
        total_chars = 0
        
        for msg in messages:
            role = msg.get('role', 'unknown')
            message_counts[role] = message_counts.get(role, 0) + 1
            
            content = msg.get('content', '')
            if isinstance(content, str):
                total_chars += len(content)
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and 'text' in item:
                        total_chars += len(str(item['text']))
        
        # Log summary
        role_summary = ', '.join(f'{role}: {count}' for role, count in message_counts.items())
        logger.info(
            f'LLM Request Content - Model: {model} | '
            f'Messages: {len(messages)} ({role_summary}) | '
            f'Total Characters: {total_chars:,}'
        )
        
        # Check if full content logging is enabled
        enable_full_logging = getattr(self, 'config', None) and getattr(self.config, 'enable_full_content_logging', None)
        if enable_full_logging is None:
            enable_full_logging = DEFAULT_ENABLE_FULL_CONTENT_LOGGING
        
        # Log each message - truncated for readability, full content if enabled
        for i, msg in enumerate(messages):
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            
            if isinstance(content, list):
                if enable_full_logging:
                    content_display = self._format_multipart_content_full(content)
                else:
                    content_display = self._format_multipart_content_preview(content)
            else:
                content_str = str(content) if content else ''
                if enable_full_logging:
                    content_display = content_str
                else:
                    content_display = (content_str[:200] + '...' if len(content_str) > 200 else content_str)
            
            logger.info(f'LLM Message {i+1} [{role.upper()}]: {content_display}')
        
        # Additionally log full content if enabled
        if enable_full_logging:
            self.log_full_request_content(messages, model)

    def _format_multipart_content_preview(self, content_list: list) -> str:
        """Format multipart content for preview."""
        parts = []
        for item in content_list:
            if isinstance(item, dict):
                if 'text' in item:
                    text = str(item['text'])
                    parts.append(text[:100] + '...' if len(text) > 100 else text)
                elif 'image_url' in item:
                    parts.append('[IMAGE]')
                else:
                    parts.append('[CONTENT]')
            else:
                text = str(item)
                parts.append(text[:100] + '...' if len(text) > 100 else text)
        return ' | '.join(parts)

    def _format_multipart_content_full(self, content_list: list) -> str:
        """Format multipart content showing full text."""
        parts = []
        for item in content_list:
            if isinstance(item, dict):
                if 'text' in item:
                    parts.append(str(item['text']))
                elif 'image_url' in item:
                    parts.append('[IMAGE]')
                else:
                    parts.append('[CONTENT]')
            else:
                parts.append(str(item))
        return '\n'.join(parts)

    def log_full_request_content(self, messages: list[dict[str, Any]], model: str) -> None:
        """Log complete LLM request content without any truncation."""
        # Check if full content logging is enabled from config or environment variable
        enable_full_logging = getattr(self, 'config', None) and getattr(self.config, 'enable_full_content_logging', None)
        if enable_full_logging is None:
            enable_full_logging = DEFAULT_ENABLE_FULL_CONTENT_LOGGING
        
        if not enable_full_logging:
            return
            
        logger.info("=" * 80)
        logger.info(f"FULL LLM REQUEST CONTENT - Model: {model}")
        logger.info("=" * 80)
        
        for i, msg in enumerate(messages, 1):
            role = msg.get('role', 'unknown').upper()
            content = msg.get('content', '')
            
            logger.info(f"\n[MESSAGE {i} - {role}]")
            logger.info("-" * 40)
            
            if isinstance(content, list):
                # 处理多部分内容（如包含图像的消息）
                for j, item in enumerate(content):
                    if isinstance(item, dict):
                        if 'text' in item:
                            logger.info(f"[TEXT PART {j+1}]")
                            logger.info(str(item['text']))
                        elif 'image_url' in item:
                            logger.info(f"[IMAGE PART {j+1}]")
                            logger.info(f"Image URL: {item.get('image_url', {}).get('url', 'N/A')}")
                        else:
                            logger.info(f"[CONTENT PART {j+1}]")
                            logger.info(str(item))
                    else:
                        logger.info(f"[PART {j+1}]")
                        logger.info(str(item))
                    
                    if j < len(content) - 1:  # 不是最后一个部分
                        logger.info("")
            else:
                # 处理简单文本内容
                content_str = str(content) if content else ''
                if content_str:
                    logger.info(content_str)
                else:
                    logger.info("[EMPTY CONTENT]")
            
            logger.info("-" * 40)
        
        logger.info("=" * 80)
        logger.info("END OF FULL LLM REQUEST CONTENT")
        logger.info("=" * 80)

    def _format_message_content(self, message: dict[str, Any]) -> str:
        content = message['content']
        if isinstance(content, list):
            return '\n'.join(
                self._format_content_element(element) for element in content
            )
        return str(content)

    def _format_content_element(self, element: dict[str, Any] | Any) -> str:
        if isinstance(element, dict):
            if 'text' in element:
                return str(element['text'])
            if (
                self.vision_is_active()
                and 'image_url' in element
                and 'url' in element['image_url']
            ):
                return str(element['image_url']['url'])
        return str(element)

    # This method should be implemented in the class that uses DebugMixin
    def vision_is_active(self) -> bool:
        raise NotImplementedError
