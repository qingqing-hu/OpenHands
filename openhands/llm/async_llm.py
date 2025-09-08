import asyncio
import time
from functools import partial
from typing import Any, Callable

import httpx
from litellm import acompletion as litellm_acompletion

from openhands.core.exceptions import UserCancelledError
from openhands.core.logger import openhands_logger as logger
from openhands.llm.llm import (
    LLM,
    LLM_RETRY_EXCEPTIONS,
    REASONING_EFFORT_SUPPORTED_MODELS,
)
from openhands.utils.shutdown_listener import should_continue


class AsyncLLM(LLM):
    """Asynchronous LLM class."""

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)

        self._async_completion = partial(
            self._call_acompletion,
            model=self.config.model,
            api_key=self.config.api_key.get_secret_value()
            if self.config.api_key
            else None,
            base_url=self.config.base_url,
            api_version=self.config.api_version,
            custom_llm_provider=self.config.custom_llm_provider,
            max_tokens=self.config.max_output_tokens,
            timeout=self.config.timeout,
            temperature=self.config.temperature,
            top_p=self.config.top_p,
            drop_params=self.config.drop_params,
            seed=self.config.seed,
        )

        async_completion_unwrapped = self._async_completion

        # Setup custom proxy for async calls if needed
        if self._is_custom_proxy():
            logger.debug('AsyncLLM: using custom proxy mode for internal network')
            self._setup_async_custom_proxy()

        @self.retry_decorator(
            num_retries=self.config.num_retries,
            retry_exceptions=LLM_RETRY_EXCEPTIONS,
            retry_min_wait=self.config.retry_min_wait,
            retry_max_wait=self.config.retry_max_wait,
            retry_multiplier=self.config.retry_multiplier,
        )
        async def async_completion_wrapper(*args: Any, **kwargs: Any) -> Any:
            """Wrapper for the litellm acompletion function that adds logging and cost tracking."""
            messages: list[dict[str, Any]] | dict[str, Any] = []

            # some callers might send the model and messages directly
            # litellm allows positional args, like completion(model, messages, **kwargs)
            # see llm.py for more details
            if len(args) > 1:
                messages = args[1] if len(args) > 1 else args[0]
                kwargs['messages'] = messages

                # remove the first args, they're sent in kwargs
                args = args[2:]
            elif 'messages' in kwargs:
                messages = kwargs['messages']

            # Set reasoning effort for models that support it
            if self.config.model.lower() in REASONING_EFFORT_SUPPORTED_MODELS:
                kwargs['reasoning_effort'] = self.config.reasoning_effort

            # ensure we work with a list of messages
            messages = messages if isinstance(messages, list) else [messages]

            # if we have no messages, something went very wrong
            if not messages:
                raise ValueError(
                    'The messages list is empty. At least one message is required.'
                )

            self.log_prompt(messages)

            async def check_stopped() -> None:
                while should_continue():
                    if (
                        hasattr(self.config, 'on_cancel_requested_fn')
                        and self.config.on_cancel_requested_fn is not None
                        and await self.config.on_cancel_requested_fn()
                    ):
                        return
                    await asyncio.sleep(0.1)

            stop_check_task = asyncio.create_task(check_stopped())

            try:
                # Directly call and await litellm_acompletion
                resp = await async_completion_unwrapped(*args, **kwargs)

                message_back = resp['choices'][0]['message']['content']
                self.log_response(message_back)

                # log costs and tokens used
                self._post_completion(resp)

                # We do not support streaming in this method, thus return resp
                return resp

            except UserCancelledError:
                logger.debug('LLM request cancelled by user.')
                raise
            except Exception as e:
                logger.error(f'Completion Error occurred:\n{e}')
                raise

            finally:
                await asyncio.sleep(0.1)
                stop_check_task.cancel()
                try:
                    await stop_check_task
                except asyncio.CancelledError:
                    pass

        self._async_completion = async_completion_wrapper

    async def _call_acompletion(self, *args: Any, **kwargs: Any) -> Any:
        """Wrapper for the litellm acompletion function."""
        # Used in testing?
        return await litellm_acompletion(*args, **kwargs)

    @property
    def async_completion(self) -> Callable:
        """Decorator for the async litellm acompletion function."""
        return self._async_completion

    def _setup_async_custom_proxy(self) -> None:
        """Setup custom proxy handling for async requests."""
        # Store original completion function
        original_async_completion = self._async_completion
        
        async def async_custom_proxy_wrapper(*args: Any, **kwargs: Any) -> Any:
            """Custom async wrapper for proxy requests with token auth and response unwrapping."""
            
            # Use httpx to make custom async request
            return await self._make_async_custom_proxy_request(*args, **kwargs)
        
        # Replace the async completion function
        self._async_completion = async_custom_proxy_wrapper

    async def _make_async_custom_proxy_request(self, *args: Any, **kwargs: Any) -> Any:
        """Make an async custom proxy request with token authentication."""
        
        # Extract messages from args or kwargs
        messages = None
        if len(args) > 1:
            messages = args[1]
        elif 'messages' in kwargs:
            messages = kwargs['messages']
        
        if not messages:
            raise ValueError('No messages provided for custom proxy request')
        
        # Prepare request data
        request_data = {
            'model': self.config.model,
            'messages': messages
        }
        
        # Add optional parameters
        if 'temperature' in kwargs:
            request_data['temperature'] = kwargs['temperature']
        if 'max_tokens' in kwargs or 'max_completion_tokens' in kwargs:
            request_data['max_tokens'] = kwargs.get('max_tokens') or kwargs.get('max_completion_tokens')
        if 'tools' in kwargs:
            request_data['tools'] = kwargs['tools']
        if 'tool_choice' in kwargs:
            request_data['tool_choice'] = kwargs['tool_choice']
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json'
        }
        
        # Use token for authentication
        if self.config.api_key:
            headers['token'] = self.config.api_key.get_secret_value()
        
        # Add trace ID
        headers['X-Trace-Id'] = str(int(time.time() * 1000000))
        
        # Add any custom proxy headers
        if self.config.proxy_headers:
            headers.update(self.config.proxy_headers)
        
        # Make the async request
        try:
            async with httpx.AsyncClient(timeout=self.config.timeout or 120) as client:
                response = await client.post(
                    self.config.base_url,
                    json=request_data,
                    headers=headers
                )
                response.raise_for_status()
                
            response_data = response.json()
            
            # Handle response wrapper field (e.g., extract from "data" field)
            if self.config.response_wrapper_field:
                if self.config.response_wrapper_field in response_data:
                    actual_response = response_data[self.config.response_wrapper_field]
                else:
                    logger.warning(f'Response wrapper field "{self.config.response_wrapper_field}" not found in response')
                    actual_response = response_data
            else:
                # Auto-detect "data" wrapper for backward compatibility
                if 'data' in response_data and 'choices' in response_data['data']:
                    actual_response = response_data['data']
                else:
                    actual_response = response_data
            
            # Convert to ModelResponse format
            return self._convert_proxy_response_to_model_response(actual_response)
            
        except httpx.RequestError as e:
            logger.error(f'Async custom proxy request failed: {e}')
            raise
        except Exception as e:
            logger.error(f'Async custom proxy processing failed: {e}')
            raise
