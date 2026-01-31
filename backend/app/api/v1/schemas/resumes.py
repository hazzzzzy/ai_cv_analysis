from __future__ import annotations

from pydantic import BaseModel


class UploadResumeResponse(BaseModel):
    resume_id: int
    extracted_preview: str
