from __future__ import annotations

from typing import List, Optional, Union

from pydantic import BaseModel, Field

from app.api.v1.schemas.common import AnalysisResult, Question


class CreateSessionRequest(BaseModel):
    resume_id: int
    question_count: int = Field(ge=3, le=10)


class CreateSessionResponse(BaseModel):
    session_id: int
    status: str
    current_question: Question


class SubmitAnswerRequest(BaseModel):
    question_id: str
    answer: str


class SubmitAnswerResponseInProgress(BaseModel):
    status: str
    current_index: int
    next_question: Question


class SubmitAnswerResponseCompleted(BaseModel):
    status: str
    final_analysis: AnalysisResult


SubmitAnswerResponse = Union[SubmitAnswerResponseInProgress, SubmitAnswerResponseCompleted]


class SessionItem(BaseModel):
    id: int
    resume_id: int
    question_count: int
    status: str
    current_index: int


class MessageItem(BaseModel):
    id: int
    session_id: int
    seq: int
    role: str
    kind: str
    content: str
    content_json: Optional[dict] = None


class SessionDetailResponse(BaseModel):
    session: SessionItem
    messages: List[MessageItem]


class SessionListResponse(BaseModel):
    items: List[SessionItem]
    total: int
