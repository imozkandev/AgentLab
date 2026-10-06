"""Database models (SQLAlchemy 2.0). SQLite for local dev, PostgreSQL in Docker Compose."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from . import config


def now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:6]}"


class Base(DeclarativeBase):
    pass


class Agent(Base):
    __tablename__ = "agents"
    name: Mapped[str] = mapped_column(String, primary_key=True)
    description: Mapped[str] = mapped_column(Text, default="")
    permissions: Mapped[list] = mapped_column(JSON, default=list)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class SkillVersion(Base):
    __tablename__ = "skill_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String, index=True)
    version: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="archived")  # active | archived | draft
    content: Mapped[str] = mapped_column(Text)
    eval_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class Run(Base):
    __tablename__ = "runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("run"))
    task: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String, default="queued", index=True)
    source: Mapped[str] = mapped_column(String, default="user")  # user | eval | seed
    agent: Mapped[str | None] = mapped_column(String, nullable=True)
    model: Mapped[str] = mapped_column(String, default="mock")
    skill: Mapped[str | None] = mapped_column(String, nullable=True)
    skill_version: Mapped[str | None] = mapped_column(String, nullable=True)
    prompt_version: Mapped[str] = mapped_column(String, default="v1")
    worker: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    start_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    input_tokens: Mapped[int] = mapped_column(Integer, default=0)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0)
    tool_call_count: Mapped[int] = mapped_column(Integer, default=0)
    review_iterations: Mapped[int] = mapped_column(Integer, default=0)
    evaluation_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    evaluation: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    plan: Mapped[list | None] = mapped_column(JSON, nullable=True)
    result_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    errors: Mapped[list] = mapped_column(JSON, default=list)
    failure_category: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    failure_signature: Mapped[str | None] = mapped_column(String, nullable=True)
    options: Mapped[dict] = mapped_column(JSON, default=dict)


class RunStep(Base):
    __tablename__ = "run_steps"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str] = mapped_column(ForeignKey("runs.id", ondelete="CASCADE"), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    t_ms: Mapped[int] = mapped_column(Integer, default=0)
    type: Mapped[str] = mapped_column(String)
    actor: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="ok")


class ToolCall(Base):
    __tablename__ = "tool_calls"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    run_id: Mapped[str | None] = mapped_column(String, index=True, nullable=True)
    agent: Mapped[str] = mapped_column(String)
    server: Mapped[str] = mapped_column(String, index=True)
    tool: Mapped[str] = mapped_column(String)
    risk: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)  # ok | error | denied | approval_required
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class EvalRun(Base):
    __tablename__ = "evaluations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("eval"))
    skill: Mapped[str] = mapped_column(String, index=True)
    skill_version: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String, default="suite")  # suite | comparison
    score: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[int] = mapped_column(Integer, default=0)
    failed: Mapped[int] = mapped_column(Integer, default=0)
    safety_ok: Mapped[int] = mapped_column(Integer, default=1)
    summary: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)


class EvalResult(Base):
    __tablename__ = "evaluation_results"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    eval_id: Mapped[str] = mapped_column(ForeignKey("evaluations.id", ondelete="CASCADE"), index=True)
    case: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String, default="")
    run_id: Mapped[str | None] = mapped_column(String, nullable=True)
    score: Mapped[float] = mapped_column(Float)
    passed: Mapped[int] = mapped_column(Integer)
    critical: Mapped[int] = mapped_column(Integer, default=0)
    checks: Mapped[dict] = mapped_column(JSON, default=dict)


class Worker(Base):
    __tablename__ = "workers"
    hostname: Mapped[str] = mapped_column(String, primary_key=True)
    label: Mapped[str] = mapped_column(String, default="")
    platform: Mapped[str] = mapped_column(String, default="")
    region: Mapped[str] = mapped_column(String, default="local")
    runtimes: Mapped[list] = mapped_column(JSON, default=list)
    active_jobs: Mapped[int] = mapped_column(Integer, default=0)
    agents: Mapped[int] = mapped_column(Integer, default=0)
    cpu: Mapped[float] = mapped_column(Float, default=0.0)
    memory: Mapped[float] = mapped_column(Float, default=0.0)
    mocked: Mapped[int] = mapped_column(Integer, default=0)
    heartbeat: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("apr"))
    run_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    agent: Mapped[str] = mapped_column(String)
    tool: Mapped[str] = mapped_column(String)
    risk: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(Text, default="")
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending|approved|rejected
    decided_by: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class LiveOpsDraft(Base):
    __tablename__ = "liveops_drafts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: new_id("drf"))
    game: Mapped[str] = mapped_column(String)
    kind: Mapped[str] = mapped_column(String)  # event | remote_config
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String, default="pending_approval")
    created_by: Mapped[str] = mapped_column(String, default="agent")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    actor: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String, index=True)
    target: Mapped[str] = mapped_column(String, default="")
    detail: Mapped[dict] = mapped_column(JSON, default=dict)


connect_args = {"check_same_thread": False, "timeout": 30} if config.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(config.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(engine)


def audit(session, actor: str, action: str, target: str = "", **detail) -> None:
    """Append-only audit record (no update/delete code path exists)."""
    session.add(AuditLog(actor=actor, action=action, target=target, detail=detail))
