from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.resumes import UploadResumeResponse
from app.core.config import settings
from app.db.session import get_async_session
from app.services.resume_service import ResumeService

router = APIRouter()

ALLOWED_MIME_TYPES = {
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

@router.post('', response_model=UploadResumeResponse)
async def upload_resume(
    file: UploadFile,
    session: AsyncSession = Depends(get_async_session),
) -> UploadResumeResponse:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail='仅支持 PDF 或 DOCX')

    content = await file.read()
    max_bytes = settings.resume_max_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail='文件大小超出限制')
    resume, preview = await ResumeService.create_resume(
        session=session,
        filename=file.filename or 'unknown',
        mime_type=file.content_type or 'application/octet-stream',
        content=content,
    )
    return UploadResumeResponse(resume_id=resume.id, extracted_preview=preview)
