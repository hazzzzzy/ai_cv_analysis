from __future__ import annotations

import logging
from langchain_openai import ChatOpenAI

from app.core.config import settings


def build_chat_model() -> ChatOpenAI:
    base_url = settings.deepseek_base_url or None
    if base_url and not base_url.rstrip('/').endswith('/v1'):
        base_url = base_url.rstrip('/') + '/v1'
    logging.info('LLM base_url=%s model=%s', base_url, settings.deepseek_model)
    return ChatOpenAI(
        model=settings.deepseek_model,
        api_key=settings.deepseek_api_key,
        base_url=base_url,
        temperature=0,
        max_tokens=1200,
        timeout=settings.llm_timeout_seconds,
        max_retries=0,
    )
