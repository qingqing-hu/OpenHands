"""JSON utilities for safe handling of large content and debugging."""

import json
import re
from typing import Any


def safe_json_loads(json_str: str, context: str = '') -> dict[str, Any]:
    """Safely parse JSON with enhanced error reporting.
    
    Args:
        json_str: The JSON string to parse
        context: Additional context for error reporting
    
    Returns:
        Parsed JSON object
        
    Raises:
        ValueError: If JSON parsing fails with detailed error information
    """
    try:
        return json.loads(json_str)
    except json.JSONDecodeError as e:
        error_details = _analyze_json_error(json_str, e)
        error_msg = f"JSON parsing failed{f' ({context})' if context else ''}:\n{error_details}"
        raise ValueError(error_msg) from e


def safe_json_dumps(obj: Any, max_length: int = 100000) -> str:
    """Safely serialize object to JSON with content length protection.
    
    Args:
        obj: Object to serialize
        max_length: Maximum allowed JSON string length
        
    Returns:
        JSON string
        
    Raises:
        ValueError: If serialized JSON would be too long
    """
    # Check for large string content and truncate if necessary
    if isinstance(obj, dict):
        obj = _truncate_large_values(obj, max_length // 10)
    
    json_str = json.dumps(obj, ensure_ascii=False, separators=(',', ':'))
    
    if len(json_str) > max_length:
        raise ValueError(
            f"JSON output too large: {len(json_str)} characters (limit: {max_length}). "
            "Consider breaking large content into smaller chunks."
        )
    
    return json_str


def validate_tool_arguments(args_str: str, tool_name: str) -> dict[str, Any]:
    """Validate and parse tool call arguments with enhanced debugging.
    
    Args:
        args_str: JSON string containing tool arguments
        tool_name: Name of the tool being called
        
    Returns:
        Parsed arguments dictionary
        
    Raises:
        ValueError: If arguments are invalid with detailed error information
    """
    if not args_str.strip():
        raise ValueError(f"Empty arguments for tool '{tool_name}'")
    
    # Pre-check for obvious issues
    issues = []
    if len(args_str) > 500000:  # 500KB
        issues.append(f"Arguments very large: {len(args_str):,} characters")
    
    if args_str.count('\n') > 1000:
        issues.append(f"Many newlines: {args_str.count(chr(10))} found")
    
    # Try parsing to check for syntax issues instead of using regex
    try:
        json.loads(args_str)
    except json.JSONDecodeError as e:
        # Only flag as pre-validation issue if it's an obvious structural problem
        if "Expecting ',' delimiter" in str(e) or "Unterminated string" in str(e):
            issues.append(f"JSON syntax error: {e.msg}")
    
    if issues:
        raise ValueError(
            f"Tool '{tool_name}' arguments pre-validation failed:\n" + 
            "\n".join(f"  - {issue}" for issue in issues) +
            f"\nArguments preview: {args_str[:200]}..."
        )
    
    return safe_json_loads(args_str, f"tool '{tool_name}' arguments")


def _analyze_json_error(json_str: str, error: json.JSONDecodeError) -> str:
    """Analyze JSON error and provide detailed debugging information."""
    lines = json_str.split('\n')
    error_line = getattr(error, 'lineno', 1)
    error_col = getattr(error, 'colno', 1)
    error_pos = getattr(error, 'pos', 0)
    
    details = [
        f"Error: {error.msg}",
        f"Position: line {error_line}, column {error_col} (char {error_pos})",
        f"Total length: {len(json_str):,} characters"
    ]
    
    # Show context around error
    if 1 <= error_line <= len(lines):
        start_line = max(1, error_line - 2)
        end_line = min(len(lines), error_line + 2)
        
        details.append("Context:")
        for i in range(start_line, end_line + 1):
            line = lines[i - 1]
            marker = " >>> " if i == error_line else "     "
            # Truncate very long lines
            if len(line) > 100:
                line = line[:50] + " ... " + line[-50:]
            details.append(f"{marker}Line {i:3d}: {line}")
    
    # Analyze common issues
    issues = []
    if json_str.count('"') % 2 != 0:
        issues.append("Unmatched quotes")
    if json_str.count('{') != json_str.count('}'):
        issues.append(f"Unmatched braces: {json_str.count('{')} vs {json_str.count('}')}")
    if json_str.count('[') != json_str.count(']'):
        issues.append(f"Unmatched brackets: {json_str.count('[')} vs {json_str.count(']')}")
    if '\\n' in json_str and json_str.count('\\n') > 100:
        issues.append(f"Many escaped newlines: {json_str.count(chr(92) + 'n')}")
    
    if issues:
        details.append("Potential issues: " + ", ".join(issues))
    
    details.append("Suggestion: For large content, consider chunking or using file references")
    
    return "\n".join(details)


def _truncate_large_values(obj: dict[str, Any], max_value_length: int) -> dict[str, Any]:
    """Recursively truncate large string values in a dictionary."""
    result = {}
    for key, value in obj.items():
        if isinstance(value, str) and len(value) > max_value_length:
            truncated = value[:max_value_length//2] + f"\n\n... [TRUNCATED {len(value) - max_value_length} chars] ...\n\n" + value[-max_value_length//2:]
            result[key] = truncated
        elif isinstance(value, dict):
            result[key] = _truncate_large_values(value, max_value_length)
        elif isinstance(value, list):
            result[key] = [
                _truncate_large_values(item, max_value_length) if isinstance(item, dict)
                else (item[:max_value_length] + "..." if isinstance(item, str) and len(item) > max_value_length else item)
                for item in value
            ]
        else:
            result[key] = value
    return result