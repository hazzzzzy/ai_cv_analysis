from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import resumes, sessions

router = APIRouter()

router.include_router(resumes.router, prefix='/resumes', tags=['resumes'])
router.include_router(sessions.router, prefix='/sessions', tags=['sessions'])
