from __future__ import annotations

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.mysql import JSON as MySQLJSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Resume(Base, TimestampMixin):
    __tablename__ = 'resumes'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_meta: Mapped[dict | None] = mapped_column(MySQLJSON, nullable=True)

    sessions: Mapped[list['Session']] = relationship(
        back_populates='resume',
        cascade='all, delete-orphan',
    )


class Session(Base, TimestampMixin):
    __tablename__ = 'sessions'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    resume_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey('resumes.id', ondelete='CASCADE'),
        nullable=False,
    )
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    job_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default='in_progress')
    current_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    llm_plan: Mapped[dict | None] = mapped_column(MySQLJSON, nullable=True)

    resume: Mapped['Resume'] = relationship(back_populates='sessions')
    messages: Mapped[list['Message']] = relationship(
        back_populates='session',
        cascade='all, delete-orphan',
    )
    analyses: Mapped[list['Analysis']] = relationship(
        back_populates='session',
        cascade='all, delete-orphan',
    )


class Message(Base, TimestampMixin):
    __tablename__ = 'messages'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey('sessions.id', ondelete='CASCADE'),
        nullable=False,
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    content_json: Mapped[dict | None] = mapped_column(MySQLJSON, nullable=True)

    session: Mapped['Session'] = relationship(back_populates='messages')


class Analysis(Base):
    __tablename__ = 'analyses'

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey('sessions.id', ondelete='CASCADE'),
        nullable=False,
    )
    result_json: Mapped[dict] = mapped_column(MySQLJSON, nullable=False)
    raw_model_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )

    session: Mapped['Session'] = relationship(back_populates='analyses')
