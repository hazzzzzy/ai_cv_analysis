from __future__ import annotations

import uuid
from typing import Callable

from fastapi import Request, Response

from app.core.config import settings


async def request_id_middleware(request: Request, call_next: Callable) -> Response:
    request_id = request.headers.get(settings.request_id_header)
    if not request_id:
        request_id = uuid.uuid4().hex
    request.state.request_id = request_id

    response = await call_next(request)
    response.headers[settings.request_id_header] = request_id
    return response
