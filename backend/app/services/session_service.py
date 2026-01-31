from __future__ import annotations

from typing import List, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas.common import Question
from app.db.models import Analysis, Message, Resume, Session
from app.llm.orchestrator import InterviewGraph


class SessionFailedError(RuntimeError):
    pass

_graph = InterviewGraph()


class SessionService:
    @staticmethod
    async def _next_message_seq(session: AsyncSession, session_id: int) -> int:
        result = await session.execute(
            select(func.coalesce(func.max(Message.seq), 0)).where(Message.session_id == session_id)
        )
        return int(result.scalar_one()) + 1

    @staticmethod
    async def _mark_failed(
        session: AsyncSession,
        db_session: Session,
        reason: str,
    ) -> None:
        db_session.status = 'failed'
        if db_session.llm_plan is None:
            db_session.llm_plan = {}
        db_session.llm_plan['error'] = reason
        seq = await SessionService._next_message_seq(session, db_session.id)
        message = Message(
            session_id=db_session.id,
            seq=seq,
            role='assistant',
            kind='final',
            content=f'生成失败：{reason}',
            content_json={'error': reason},
        )
        session.add(message)
        analysis_exists = await session.execute(
            select(Analysis.id).where(Analysis.session_id == db_session.id)
        )
        if analysis_exists.scalar_one_or_none() is None:
            analysis = Analysis(
                session_id=db_session.id,
                result_json={
                    'pain_points': [],
                    'optimization_suggestions': [],
                    'improvement_directions': [],
                },
                raw_model_output=reason,
            )
            session.add(analysis)
        await session.commit()

    @staticmethod
    async def create_session(
        session: AsyncSession,
        resume_id: int,
        question_count: int,
        job_title: str,
        job_description: str,
    ) -> Tuple[Session, dict]:
        resume = await session.get(Resume, resume_id)
        if resume is None:
            raise ValueError('简历不存在')

        new_session = Session(
            resume_id=resume_id,
            question_count=question_count,
            job_title=job_title,
            job_description=job_description,
            status='in_progress',
            current_index=0,
            llm_plan={},
        )
        session.add(new_session)
        await session.commit()
        await session.refresh(new_session)

        try:
            questions, raw_output = _graph.generate_questions(
                resume_text=resume.extracted_text or '',
                question_count=question_count,
                job_title=job_title,
                job_description=job_description,
            )
            if len(questions) != question_count:
                raise RuntimeError('生成问题数量不符合要求')
            ids = [q.id for q in questions]
            if len(set(ids)) != len(ids):
                raise RuntimeError('生成问题 ID 不唯一')
        except Exception as exc:
            await SessionService._mark_failed(session, new_session, f'生成问题失败: {exc}')
            raise RuntimeError('生成问题失败') from exc

        question_dicts = [q.model_dump() for q in questions]
        new_session.llm_plan = {'questions': question_dicts, 'raw_output': raw_output}
        await session.commit()

        current_question = question_dicts[0]
        message = Message(
            session_id=new_session.id,
            seq=1,
            role='assistant',
            kind='question',
            content=current_question['question'],
            content_json=current_question,
        )
        session.add(message)
        await session.commit()

        return new_session, current_question

    @staticmethod
    async def submit_answer(
        session: AsyncSession,
        session_id: int,
        question_id: str,
        answer: str,
    ) -> Tuple[str, int, dict | None, dict | None]:
        db_session = await session.get(Session, session_id)
        if db_session is None:
            raise ValueError('会话不存在')

        if db_session.status == 'completed':
            analysis_result = await session.execute(
                select(Analysis).where(Analysis.session_id == session_id).order_by(Analysis.id.desc())
            )
            analysis = analysis_result.scalars().first()
            final_result = analysis.result_json if analysis else {
                'pain_points': [],
                'optimization_suggestions': [],
                'improvement_directions': [],
            }
            return 'completed', db_session.current_index, None, final_result
        if db_session.status == 'failed':
            raise SessionFailedError('会话已失败')

        questions = (db_session.llm_plan or {}).get('questions', [])
        question = next((q for q in questions if q.get('id') == question_id), None)
        if question is None:
            raise ValueError('问题不存在')

        existing = await session.execute(
            select(Message.id).where(
                Message.session_id == session_id,
                Message.role == 'user',
                Message.kind == 'answer',
                Message.content_json['question_id'].as_string() == question_id,
            )
        )
        answer_added = False
        if existing.scalar_one_or_none() is None:
            seq = await SessionService._next_message_seq(session, session_id)
            message = Message(
                session_id=session_id,
                seq=seq,
                role='user',
                kind='answer',
                content=answer,
                content_json={'question_id': question_id},
            )
            session.add(message)
            db_session.current_index += 1
            answer_added = True

        if db_session.current_index < db_session.question_count:
            next_question = questions[db_session.current_index]
            existing_question = await session.execute(
                select(Message.id).where(
                    Message.session_id == session_id,
                    Message.role == 'assistant',
                    Message.kind == 'question',
                    Message.content_json['id'].as_string() == next_question['id'],
                )
            )
            question_added = False
            if existing_question.scalar_one_or_none() is None:
                seq = await SessionService._next_message_seq(session, session_id)
                next_message = Message(
                    session_id=session_id,
                    seq=seq,
                    role='assistant',
                    kind='question',
                    content=next_question['question'],
                    content_json=next_question,
                )
                session.add(next_message)
                question_added = True
            if answer_added or question_added:
                await session.commit()
            return 'in_progress', db_session.current_index, next_question, None

        db_session.status = 'completed'
        answer_result = await session.execute(
            select(Message).where(
                Message.session_id == session_id,
                Message.role == 'user',
                Message.kind == 'answer',
            ).order_by(Message.seq.asc())
        )
        answers = [
            {
                'question_id': item.content_json.get('question_id'),
                'answer': item.content,
            }
            for item in answer_result.scalars().all()
        ]
        question_models = [
            {
                'id': q.get('id'),
                'domain': q.get('domain'),
                'question': q.get('question'),
                'why_it_matters': q.get('why_it_matters'),
                'good_answer_signals': q.get('good_answer_signals', []),
                'red_flags': q.get('red_flags', []),
            }
            for q in questions
        ]
        try:
            resume = await session.get(Resume, db_session.resume_id)
            final_result, raw_output = _graph.finalize_analysis(
                resume_text=(resume.extracted_text if resume else ''),
                questions=[Question(**item) for item in question_models],
                answers=answers,
                job_title=db_session.job_title or '',
                job_description=db_session.job_description or '',
            )
        except Exception as exc:
            await SessionService._mark_failed(session, db_session, f'生成最终分析失败: {exc}')
            raise RuntimeError('生成最终分析失败') from exc
        analysis = Analysis(
            session_id=session_id,
            result_json=final_result.model_dump(),
            raw_model_output=raw_output,
        )
        session.add(analysis)
        final_exists = await session.execute(
            select(Message.id).where(
                Message.session_id == session_id,
                Message.role == 'assistant',
                Message.kind == 'final',
            )
        )
        if final_exists.scalar_one_or_none() is None:
            seq = await SessionService._next_message_seq(session, session_id)
            final_message = Message(
                session_id=session_id,
                seq=seq,
                role='assistant',
                kind='final',
                content='最终分析已生成。',
                content_json=final_result.model_dump(),
            )
            session.add(final_message)
        await session.commit()
        return 'completed', db_session.current_index, None, final_result.model_dump()

    @staticmethod
    async def get_session_detail(session: AsyncSession, session_id: int) -> Tuple[Session, List[Message]]:
        db_session = await session.get(Session, session_id)
        if db_session is None:
            raise ValueError('会话不存在')

        result = await session.execute(
            select(Message).where(Message.session_id == session_id).order_by(Message.seq.asc())
        )
        messages = list(result.scalars().all())
        return db_session, messages

    @staticmethod
    async def list_sessions(session: AsyncSession, limit: int, offset: int) -> Tuple[List[Session], int]:
        total_result = await session.execute(select(func.count(Session.id)))
        total = int(total_result.scalar_one())

        result = await session.execute(
            select(Session).order_by(Session.created_at.desc()).limit(limit).offset(offset)
        )
        sessions = list(result.scalars().all())
        return sessions, total

    @staticmethod
    async def run_full_interview(
        resume_text: str,
        question_count: int,
        answers_input: List[str],
        job_title: str,
        job_description: str,
    ) -> dict:
        final_result = _graph.run_full_interview(
            resume_text=resume_text,
            question_count=question_count,
            answers_input=answers_input,
            job_title=job_title,
            job_description=job_description,
        )
        return final_result.model_dump()
