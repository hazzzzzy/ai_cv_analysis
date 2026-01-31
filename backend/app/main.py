from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import ErrorResponse
from app.core.middleware import request_id_middleware

logging.basicConfig(level=settings.app_log_level)

app = FastAPI(title=settings.app_name)

app.middleware('http')(request_id_middleware)
app.include_router(api_router)

origins = [item.strip() for item in settings.app_cors_origins.split(',') if item.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
    )


@app.get('/health')
async def health_check():
    return {'status': 'ok'}


def _get_request_id(request: Request) -> str:
    return getattr(request.state, 'request_id', '') or 'unknown'


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    payload = ErrorResponse(
        code='http_error',
        message=str(exc.detail),
        request_id=_get_request_id(request),
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    payload = ErrorResponse(
        code='validation_error',
        message='请求参数校验失败',
        request_id=_get_request_id(request),
        detail=exc.errors(),
    )
    return JSONResponse(status_code=422, content=payload.model_dump())


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    payload = ErrorResponse(
        code='internal_error',
        message='服务器内部错误',
        request_id=_get_request_id(request),
    )
    return JSONResponse(status_code=500, content=payload.model_dump())
