from __future__ import annotations

import hashlib
from typing import Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import Resume
from app.utils.resume_parser import parse_resume_content, save_resume_file


class ResumeService:
    @staticmethod
    async def create_resume(
        session: AsyncSession,
        filename: str,
        mime_type: str,
        content: bytes,
    ) -> Tuple[Resume, str]:
        sha256 = hashlib.sha256(content).hexdigest()
        text, meta = parse_resume_content(filename, content)
        if settings.resume_storage_mode == 'local_file':
            file_path = save_resume_file(filename, content)
            meta = meta or {}
            meta.update({'file_path': file_path})

        resume = Resume(
            filename=filename,
            mime_type=mime_type,
            size_bytes=len(content),
            sha256=sha256,
            extracted_text=text,
            extracted_meta=meta,
        )
        session.add(resume)
        await session.commit()
        await session.refresh(resume)

        preview = (text or '')[:500]
        return resume, preview
