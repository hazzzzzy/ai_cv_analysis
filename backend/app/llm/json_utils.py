from __future__ import annotations

import json
from typing import Any


class JsonParseError(ValueError):
    pass


def parse_json_strict(text: str) -> Any:
    cleaned = text.strip()
    if not cleaned:
        raise JsonParseError('空响应')

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start != -1 and end != -1 and end > start:
        snippet = cleaned[start : end + 1]
        try:
            return json.loads(snippet)
        except json.JSONDecodeError as exc:
            raise JsonParseError('JSON 解析失败') from exc

    start = cleaned.find('[')
    end = cleaned.rfind(']')
    if start != -1 and end != -1 and end > start:
        snippet = cleaned[start : end + 1]
        try:
            return json.loads(snippet)
        except json.JSONDecodeError as exc:
            raise JsonParseError('JSON 解析失败') from exc

    raise JsonParseError('JSON 解析失败')
