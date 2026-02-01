from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.sessions import (
    CreateSessionRequest,
    CreateSessionResponse,
    SessionDetailResponse,
    SessionItem,
    SessionListResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    SubmitAnswerResponseCompleted,
    SubmitAnswerResponseInProgress,
)
from app.db.models import Resume
from app.db.session import get_async_session
from app.services.session_service import SessionFailedError, SessionService

router = APIRouter()


@router.post('', response_model=CreateSessionResponse)
async def create_session(
    payload: CreateSessionRequest,
    session: AsyncSession = Depends(get_async_session),
) -> CreateSessionResponse:
    try:
        db_session, question = await SessionService.create_session(
            session=session,
            resume_id=payload.resume_id,
            question_count=payload.question_count,
            job_title=payload.job_title,
            job_description=payload.job_description,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return CreateSessionResponse(
        session_id=db_session.id,
        status=db_session.status,
        current_question=question,
    )


@router.post('/{session_id}/answers', response_model=SubmitAnswerResponse)
async def submit_answer(
    session_id: int,
    payload: SubmitAnswerRequest,
    session: AsyncSession = Depends(get_async_session),
) -> SubmitAnswerResponse:
    try:
        status, current_index, next_question, final_analysis = await SessionService.submit_answer(
            session=session,
            session_id=session_id,
            question_id=payload.question_id,
            answer=payload.answer,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SessionFailedError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if status == 'completed':
        return SubmitAnswerResponseCompleted(status=status, final_analysis=final_analysis)

    return SubmitAnswerResponseInProgress(
        status=status,
        current_index=current_index,
        next_question=next_question,
    )


@router.get('/{session_id}', response_model=SessionDetailResponse)
async def get_session(
    session_id: int,
    session: AsyncSession = Depends(get_async_session),
) -> SessionDetailResponse:
    try:
        db_session, messages = await SessionService.get_session_detail(session, session_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    resume = await session.get(Resume, db_session.resume_id)

    return SessionDetailResponse(
        session=SessionItem(
            id=db_session.id,
            resume_id=db_session.resume_id,
            resume_filename=resume.filename if resume else None,
            question_count=db_session.question_count,
            job_title=db_session.job_title,
            job_description=db_session.job_description,
            status=db_session.status,
            current_index=db_session.current_index,
            created_at=db_session.created_at,
        ),
        messages=[
            {
                'id': message.id,
                'session_id': message.session_id,
                'seq': message.seq,
                'role': message.role,
                'kind': message.kind,
                'content': message.content,
                'content_json': message.content_json,
            }
            for message in messages
        ],
    )


@router.get('', response_model=SessionListResponse)
async def list_sessions(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_async_session),
) -> SessionListResponse:
    sessions, total = await SessionService.list_sessions(session, limit, offset)

    return SessionListResponse(
        items=[
            SessionItem(
                id=db_session.id,
                resume_id=db_session.resume_id,
                resume_filename=resume_filename,
                question_count=db_session.question_count,
                job_title=db_session.job_title,
                job_description=db_session.job_description,
                status=db_session.status,
                current_index=db_session.current_index,
                created_at=db_session.created_at,
            )
            for db_session, resume_filename in sessions
        ],
        total=total,
    )
