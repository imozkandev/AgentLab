"""AgentForge API (FastAPI)."""
from __future__ import annotations

import asyncio
import threading
from collections import Counter, defaultdict
from contextlib import asynccontextmanager
from datetime import timedelta

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from . import config, evals, failures, runtime, seed, skills as skill_lib, worker as worker_mod
from .mcp import SERVERS, all_tools, gateway
from .mcp.base import ToolContext, ToolError
from .models import (Agent, ApprovalRequest, AuditLog, EvalResult, EvalRun, LiveOpsDraft, Run, RunStep, SessionLocal,
                     SkillVersion, ToolCall, Worker, audit, init_db, now)
from .permissions import SCOPES, ApprovalRequired, PermissionDenied

_stop = threading.Event()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as s:
        seed.seed_core(s)
        seed.seed_workers(s)
        if config_bool("AGENTFORGE_SEED_DEMO", True):
            seed.seed_demo(s)
    if config_bool("AGENTFORGE_INLINE_WORKER", True):
        threading.Thread(target=worker_mod.run_loop, args=(_stop, "api-inline-worker"), daemon=True).start()
    yield
    _stop.set()


def config_bool(name: str, default: bool) -> bool:
    import os
    return os.getenv(name, "1" if default else "0").lower() in ("1", "true", "yes")


app = FastAPI(title="AgentForge API", version="0.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])


def db():
    with SessionLocal() as s:
        yield s


def iso(d):
    return d.isoformat() if d else None


def run_dict(r: Run, detail: bool = False) -> dict:
    out = {"id": r.id, "task": r.task, "status": r.status, "source": r.source, "agent": r.agent, "model": r.model,
           "skill": r.skill, "skill_version": r.skill_version, "created_at": iso(r.created_at), "latency_ms": r.latency_ms,
           "estimated_cost": r.estimated_cost, "tool_calls": r.tool_call_count, "review_iterations": r.review_iterations,
           "evaluation_score": r.evaluation_score, "failure_category": r.failure_category,
           "input_tokens": r.input_tokens, "output_tokens": r.output_tokens, "worker": r.worker}
    if detail:
        out.update({"prompt_version": r.prompt_version, "start_time": iso(r.start_time), "end_time": iso(r.end_time),
                    "plan": r.plan, "result_text": r.result_text, "errors": r.errors, "evaluation": r.evaluation,
                    "options": r.options, "failure_signature": r.failure_signature})
    return out


# ------------------------------------------------------------------------------ health / overview
@app.get("/api/health")
def health():
    return {"status": "ok", "provider": config.PROVIDER, "version": app.version}


@app.get("/api/overview")
def overview(s: Session = Depends(db)):
    since = now() - timedelta(hours=24)
    runs = s.scalars(select(Run).where(Run.created_at >= since, Run.source.in_(["user", "seed"])).order_by(Run.created_at)).all()
    done = [r for r in runs if r.status in ("completed", "failed")]
    lat = sorted(r.latency_ms for r in done) or [0]
    scores = [r.evaluation_score for r in done if r.evaluation_score is not None]
    hourly: dict[str, dict] = defaultdict(lambda: {"runs": 0, "score_sum": 0.0, "n": 0})
    for r in runs:
        k = r.created_at.strftime("%H:00")
        hourly[k]["runs"] += 1
        if r.evaluation_score is not None:
            hourly[k]["score_sum"] += r.evaluation_score
            hourly[k]["n"] += 1
    errors = s.scalar(select(func.count()).select_from(ToolCall).where(ToolCall.created_at >= since, ToolCall.status.in_(["error", "denied"]))) or 0
    pending = s.scalar(select(func.count()).select_from(ApprovalRequest).where(ApprovalRequest.status == "pending")) or 0
    return {
        "runs_24h": len(runs), "queued": sum(r.status in ("queued", "running") for r in runs),
        "success_rate": round(sum(r.status == "completed" for r in done) / len(done), 4) if done else None,
        "avg_score": round(sum(scores) / len(scores), 4) if scores else None,
        "avg_cost": round(sum(r.estimated_cost for r in done) / len(done), 4) if done else None,
        "p95_latency_ms": lat[min(len(lat) - 1, int(len(lat) * 0.95))],
        "tool_errors": errors, "pending_approvals": pending,
        "series": [{"hour": k, "runs": v["runs"], "score": round(v["score_sum"] / v["n"], 3) if v["n"] else None}
                   for k, v in sorted(hourly.items())],
        "recent": [run_dict(r) for r in reversed(runs[-8:])],
    }


# ------------------------------------------------------------------------------ runs
class RunCreate(BaseModel):
    task: str = Field(min_length=3, max_length=2000)
    skill: str | None = None
    skill_version: str | None = None


@app.get("/api/runs")
def list_runs(source: str = "user,seed", status: str | None = None, skill: str | None = None, limit: int = Query(100, le=500),
              s: Session = Depends(db)):
    q = select(Run).where(Run.source.in_(source.split(","))).order_by(desc(Run.created_at)).limit(limit)
    if status:
        q = q.where(Run.status == status)
    if skill:
        q = q.where(Run.skill == skill)
    return [run_dict(r) for r in s.scalars(q)]


@app.post("/api/runs", status_code=201)
def create_run(body: RunCreate, s: Session = Depends(db)):
    if body.skill:
        try:
            skill_lib.get_skill(s, body.skill, body.skill_version)
        except skill_lib.SkillError as e:
            raise HTTPException(404, str(e))
    run = Run(task=body.task.strip(), source="user", options={k: v for k, v in
                                                                  {"skill": body.skill, "skill_version": body.skill_version}.items() if v})
    s.add(run)
    audit(s, "user", "run.queued", run.id, task=run.task[:120])
    s.commit()
    return run_dict(run)


@app.get("/api/runs/{run_id}")
def get_run(run_id: str, s: Session = Depends(db)):
    r = s.get(Run, run_id)
    if not r:
        raise HTTPException(404, "run not found")
    steps = s.scalars(select(RunStep).where(RunStep.run_id == run_id).order_by(RunStep.seq)).all()
    apr = s.scalars(select(ApprovalRequest).where(ApprovalRequest.run_id == run_id)).all()
    return {**run_dict(r, True),
            "steps": [{"seq": x.seq, "t_ms": x.t_ms, "type": x.type, "actor": x.actor, "title": x.title,
                       "detail": x.detail, "status": x.status} for x in steps],
            "approvals": [approval_dict(a) for a in apr]}


@app.post("/api/runs/{run_id}/cancel")
def cancel_run(run_id: str, s: Session = Depends(db)):
    r = s.get(Run, run_id)
    if not r:
        raise HTTPException(404, "run not found")
    if r.status != "queued":
        raise HTTPException(409, f"only queued runs can be cancelled (status: {r.status})")
    r.status = "cancelled"
    audit(s, "user", "run.cancelled", run_id)
    s.commit()
    return run_dict(r)


class Replay(BaseModel):
    skill_version: str | None = None


@app.post("/api/runs/{run_id}/replay", status_code=201)
def replay_run(run_id: str, body: Replay, s: Session = Depends(db)):
    r = s.get(Run, run_id)
    if not r:
        raise HTTPException(404, "run not found")
    opts = {"skill": r.skill, **({"skill_version": body.skill_version} if body.skill_version else {}), "replay_of": r.id}
    new = Run(task=r.task, source="user", options={k: v for k, v in opts.items() if v})
    s.add(new)
    audit(s, "user", "run.queued", new.id, replay_of=r.id)
    s.commit()
    return run_dict(new)


# ------------------------------------------------------------------------------ agents
@app.get("/api/agents")
def list_agents(s: Session = Depends(db)):
    out = []
    for a in s.scalars(select(Agent)):
        runs = s.scalars(select(Run).where(Run.agent == a.name, Run.source.in_(["user", "seed"]), Run.status.in_(["completed", "failed"]))).all()
        scores = [r.evaluation_score for r in runs if r.evaluation_score is not None]
        tools = [t.name for t in all_tools().values() if t.scope in a.permissions]
        out.append({"name": a.name, "description": a.description, "permissions": a.permissions, "skills": a.skills,
                    "tool_count": len(tools), "tools": tools, "runs": len(runs),
                    "success_rate": round(sum(r.status == "completed" for r in runs) / len(runs), 3) if runs else None,
                    "avg_score": round(sum(scores) / len(scores), 3) if scores else None})
    return out


class PermUpdate(BaseModel):
    permissions: list[str]


@app.put("/api/agents/{name}/permissions")
def set_permissions(name: str, body: PermUpdate, s: Session = Depends(db)):
    a = s.get(Agent, name)
    if not a:
        raise HTTPException(404, "agent not found")
    bad = [p for p in body.permissions if p not in SCOPES]
    if bad:
        raise HTTPException(422, f"unknown scopes: {bad}")
    audit(s, "user", "permission.changed", name, before=a.permissions, after=body.permissions)
    a.permissions = body.permissions
    s.commit()
    return {"name": a.name, "permissions": a.permissions}


# ------------------------------------------------------------------------------ skills
def skill_row(s: Session, name: str) -> dict:
    vs = skill_lib.list_versions(s, name)
    active = next((v for v in vs if v.status == "active"), None)
    runs = s.scalars(select(Run).where(Run.skill == name, Run.source.in_(["user", "seed"]), Run.status.in_(["completed", "failed"]))).all()
    cur = [r for r in runs if active and r.skill_version == active.version] or runs
    sk = skill_lib.parse_skill(active.content) if active else None
    return {"name": name, "version": active.version if active else None, "description": sk.description if sk else "",
            "agent": sk.agent if sk else None, "eval_score": active.eval_score if active else None,
            "runs": len(runs), "failure_rate": round(sum(bool(r.failure_category) for r in runs) / len(runs), 3) if runs else None,
            "last_updated": iso(active.updated_at) if active else None, "versions": len(vs),
            "tools": sorted(set(sk.tools)) if sk else [], "cases": len(evals.load_cases(name))}


@app.get("/api/skills")
def list_skills(s: Session = Depends(db)):
    return [skill_row(s, n) for n in skill_lib.names(s)]


@app.get("/api/skills/registry")
def skill_registry(s: Session = Depends(db)):
    return skill_lib.registry(s)


@app.get("/api/skills/{name}")
def get_skill(name: str, s: Session = Depends(db)):
    vs = skill_lib.list_versions(s, name)
    if not vs:
        raise HTTPException(404, "skill not found")
    return {**skill_row(s, name), "versions_detail": [{"version": v.version, "status": v.status, "eval_score": v.eval_score,
                                                       "content": v.content, "updated_at": iso(v.updated_at)} for v in vs]}


class DraftBody(BaseModel):
    content: str


@app.put("/api/skills/{name}/draft")
def save_draft(name: str, body: DraftBody, s: Session = Depends(db)):
    try:
        row = skill_lib.draft(s, name, body.content, "user")
    except skill_lib.SkillError as e:
        raise HTTPException(422, str(e))
    return {"version": row.version, "status": row.status}


class VersionBody(BaseModel):
    version: str


@app.post("/api/skills/{name}/evaluate")
def evaluate_skill(name: str, body: VersionBody, s: Session = Depends(db)):
    try:
        return evals.compare(s, name, body.version)
    except skill_lib.SkillError as e:
        raise HTTPException(404, str(e))


@app.post("/api/skills/{name}/promote")
def promote_skill(name: str, body: VersionBody, s: Session = Depends(db)):
    try:
        comparison = evals.compare(s, name, body.version)
    except skill_lib.SkillError as e:
        raise HTTPException(404, str(e))
    if not comparison["promotable"]:
        audit(s, "user", "skill.promotion_blocked", f"{name}@{body.version}", reasons=comparison["blocked_reasons"])
        s.commit()
        raise HTTPException(409, {"message": "Promotion blocked", "reasons": comparison["blocked_reasons"],
                                  "comparison": {k: comparison[k] for k in ("previous", "candidate", "delta", "regressions")}})
    skill_lib.promote(s, name, body.version, "user")
    return {"promoted": f"{name}@{body.version}", "delta": comparison["delta"]}


# ------------------------------------------------------------------------------ evals
@app.get("/api/evals")
def list_evals(s: Session = Depends(db)):
    runs = s.scalars(select(EvalRun).order_by(desc(EvalRun.created_at)).limit(60)).all()
    cases = evals.load_cases()
    return {"cases": [{"name": c["name"], "skill": c.get("skill"), "category": c.get("category"), "task": c["input"]["task"],
                       "critical": bool(c.get("critical")), "threshold": c.get("threshold", {}).get("score", 0.85)} for c in cases],
            "runs": [{"id": e.id, "skill": e.skill, "version": e.skill_version, "kind": e.kind, "score": e.score, "passed": e.passed,
                      "failed": e.failed, "safety_ok": bool(e.safety_ok), "created_at": iso(e.created_at)} for e in runs]}


class EvalBody(BaseModel):
    skill: str
    version: str | None = None


@app.post("/api/evals/run")
def run_eval(body: EvalBody, s: Session = Depends(db)):
    try:
        sk = skill_lib.get_skill(s, body.skill, body.version)
    except skill_lib.SkillError as e:
        raise HTTPException(404, str(e))
    audit(s, "user", "eval.started", f"{sk.ref}")
    s.commit()
    return evals.run_suite(s, sk)


@app.get("/api/evals/{eval_id}")
def get_eval(eval_id: str, s: Session = Depends(db)):
    e = s.get(EvalRun, eval_id)
    if not e:
        raise HTTPException(404, "evaluation not found")
    rs = s.scalars(select(EvalResult).where(EvalResult.eval_id == eval_id)).all()
    return {"id": e.id, "skill": e.skill, "version": e.skill_version, "score": e.score, "passed": e.passed, "failed": e.failed,
            "safety_ok": bool(e.safety_ok), "created_at": iso(e.created_at),
            "results": [{"case": r.case, "category": r.category, "run_id": r.run_id, "score": r.score, "passed": bool(r.passed),
                         "critical": bool(r.critical), "checks": r.checks} for r in rs]}


# ------------------------------------------------------------------------------ MCP / tools / sandbox
@app.get("/api/mcp")
def list_mcp(s: Session = Depends(db)):
    since = now() - timedelta(hours=24)
    out = []
    for srv in SERVERS.values():
        calls = s.scalars(select(ToolCall).where(ToolCall.server == srv.name, ToolCall.created_at >= since)).all()
        errs = [c for c in calls if c.status in ("error", "denied")]
        out.append({"name": srv.name, "title": srv.title, "description": srv.description, "status": "connected",
                    "tools": srv.list_tools(), "tool_count": len(srv.tools), "calls_24h": len(calls),
                    "error_rate": round(len(errs) / len(calls), 4) if calls else 0.0,
                    "avg_latency_ms": int(sum(c.latency_ms for c in calls) / len(calls)) if calls else 0})
    return out


class Rpc(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = 1
    method: str
    params: dict | None = None
    agent: str = "analytics-agent"


@app.post("/api/mcp/{server}/rpc")
def mcp_rpc(server: str, body: Rpc, s: Session = Depends(db)):
    srv = SERVERS.get(server)
    if not srv:
        raise HTTPException(404, "unknown MCP server")
    try:
        res = srv.rpc(body.method, body.params, ToolContext(session=s, agent=body.agent), gateway)
        return {"jsonrpc": "2.0", "id": body.id, "result": res}
    except PermissionDenied as e:
        return {"jsonrpc": "2.0", "id": body.id, "error": {"code": -32001, "message": str(e)}}
    except ApprovalRequired as e:
        return {"jsonrpc": "2.0", "id": body.id, "error": {"code": -32002, "message": "approval required", "data": {"approval_id": e.approval_id}}}
    except ToolError as e:
        return {"jsonrpc": "2.0", "id": body.id, "error": {"code": -32000, "message": str(e)}}


class Invoke(BaseModel):
    agent: str
    tool: str
    arguments: dict = {}


@app.post("/api/tools/invoke")
def invoke_tool(body: Invoke, s: Session = Depends(db)):
    """Safety Lab: attempt any tool as any agent and observe what the gateway does."""
    spec = all_tools().get(body.tool)
    if not spec:
        raise HTTPException(404, f"unknown tool '{body.tool}'")
    if not s.get(Agent, body.agent):
        raise HTTPException(404, "unknown agent")
    info = {"tool": body.tool, "agent": body.agent, "risk": spec.risk.label, "scope": spec.scope}
    try:
        res = gateway.call(body.agent, body.tool, body.arguments, ToolContext(session=s, agent=body.agent))
        return {**info, "outcome": "ok", "result": res}
    except PermissionDenied as e:
        return {**info, "outcome": "denied", "message": str(e)}
    except ApprovalRequired as e:
        return {**info, "outcome": "approval_required", "approval_id": e.approval_id, "message": "CRITICAL tool: queued for human approval, not executed"}
    except ToolError as e:
        return {**info, "outcome": "error", "message": str(e)}


class Exec(BaseModel):
    command: str
    agent: str = "coding-agent"
    timeout: int = 10


@app.post("/api/sandbox/exec")
def sandbox_exec(body: Exec, s: Session = Depends(db)):
    a = s.get(Agent, body.agent)
    if not a:
        raise HTTPException(404, "unknown agent")
    rt = runtime.get_runtime()
    res = rt.execute(body.command, body.timeout, a.permissions)
    audit(s, body.agent, "sandbox.blocked" if res.blocked else "sandbox.exec", body.command[:120], runtime=rt.name)
    s.commit()
    return res.__dict__


# ------------------------------------------------------------------------------ infrastructure
@app.get("/api/infrastructure")
def infrastructure(s: Session = Depends(db)):
    t = now()
    out = []
    for w in s.scalars(select(Worker).order_by(Worker.hostname)):
        if w.mocked:  # demo machines: plausible, time-varying telemetry
            import math
            ph = t.timestamp() / 60 + len(w.hostname)
            w.cpu, w.memory = round(32 + 14 * math.sin(ph), 1), round(61 + 6 * math.sin(ph / 3), 1)
            w.heartbeat = t
        age = (t - w.heartbeat.replace(tzinfo=t.tzinfo)).total_seconds()
        out.append({"hostname": w.hostname, "label": w.label or w.hostname, "platform": w.platform, "region": w.region,
                    "runtimes": w.runtimes, "agents": w.agents, "active_jobs": w.active_jobs, "cpu": w.cpu, "memory": w.memory,
                    "mocked": bool(w.mocked), "status": "online" if age < 30 else "offline", "heartbeat_age_s": int(age)})
    s.commit()
    return {"workers": out, "runtimes": runtime.available_runtimes(), "queue_depth": s.scalar(
        select(func.count()).select_from(Run).where(Run.status == "queued")) or 0}


class Heartbeat(BaseModel):
    hostname: str
    platform: str = ""
    region: str = "remote"
    runtimes: list[str] = []
    active_jobs: int = 0
    cpu: float = 0
    memory: float = 0


@app.post("/api/workers/heartbeat")
def heartbeat(body: Heartbeat, s: Session = Depends(db)):
    w = s.get(Worker, body.hostname) or Worker(hostname=body.hostname)
    for k, v in body.model_dump().items():
        setattr(w, k, v)
    w.label, w.heartbeat, w.mocked = w.label or body.hostname, now(), 0
    w.agents = s.scalar(select(func.count()).select_from(Agent)) or 0
    s.add(w)
    s.commit()
    return {"ok": True}


# ------------------------------------------------------------------------------ approvals / audit / failures
def approval_dict(a: ApprovalRequest) -> dict:
    return {"id": a.id, "run_id": a.run_id, "agent": a.agent, "tool": a.tool, "risk": a.risk, "summary": a.summary,
            "payload": a.payload, "status": a.status, "decided_by": a.decided_by, "created_at": iso(a.created_at),
            "decided_at": iso(a.decided_at)}


@app.get("/api/approvals")
def list_approvals(status: str | None = None, s: Session = Depends(db)):
    q = select(ApprovalRequest).order_by(desc(ApprovalRequest.created_at)).limit(100)
    if status:
        q = q.where(ApprovalRequest.status == status)
    return [approval_dict(a) for a in s.scalars(q)]


class Decision(BaseModel):
    decision: str = Field(pattern="^(approve|reject)$")
    user: str = "operator"


@app.post("/api/approvals/{apr_id}/decision")
def decide(apr_id: str, body: Decision, s: Session = Depends(db)):
    a = s.get(ApprovalRequest, apr_id)
    if not a:
        raise HTTPException(404, "approval not found")
    if a.status != "pending":
        raise HTTPException(409, f"already {a.status}")
    approved = body.decision == "approve"
    a.status, a.decided_by, a.decided_at = "approved" if approved else "rejected", body.user, now()
    draft_id = a.payload.get("draft_id") or a.payload.get("args", {}).get("draft_id")
    draft = s.get(LiveOpsDraft, draft_id) if draft_id else None
    if draft:
        # Approval marks the draft as human-approved. Publishing remains a separate, human-only step in LiveOps.
        draft.status = "approved_draft" if approved else "rejected"
    if approved and a.tool == "publish_event" and draft:
        draft.status = "published"
    audit(s, body.user, f"approval.{'accepted' if approved else 'rejected'}", a.id, tool=a.tool, run_id=a.run_id)
    if a.run_id:  # approval events belong in the run's trace
        last = s.scalar(select(func.max(RunStep.seq)).where(RunStep.run_id == a.run_id)) or 0
        r = s.get(Run, a.run_id)
        s.add(RunStep(run_id=a.run_id, seq=last + 1, t_ms=(r.latency_ms if r else 0) + 1, type="approval.decided", actor=body.user,
                      title=f"Approval {'accepted' if approved else 'rejected'} by {body.user}",
                      detail={"approval_id": a.id, "draft_status": draft.status if draft else None}, status="ok" if approved else "rejected"))
    s.commit()
    return approval_dict(a)


@app.get("/api/drafts")
def drafts(s: Session = Depends(db)):
    return [{"id": d.id, "game": d.game, "kind": d.kind, "payload": d.payload, "status": d.status, "created_by": d.created_by,
             "created_at": iso(d.created_at)} for d in s.scalars(select(LiveOpsDraft).order_by(desc(LiveOpsDraft.created_at)).limit(50))]


@app.get("/api/audit")
def audit_log(action: str | None = None, limit: int = Query(200, le=1000), s: Session = Depends(db)):
    q = select(AuditLog).order_by(desc(AuditLog.id)).limit(limit)
    if action:
        q = q.where(AuditLog.action.like(f"{action}%"))
    return [{"id": a.id, "ts": iso(a.ts), "actor": a.actor, "action": a.action, "target": a.target, "detail": a.detail}
            for a in s.scalars(q)]


@app.get("/api/failures")
def failure_analysis(s: Session = Depends(db)):
    return failures.cluster(s)


@app.get("/api/costs")
def costs(s: Session = Depends(db)):
    rows = s.scalars(select(Run).where(Run.source.in_(["user", "seed"]), Run.status.in_(["completed", "failed"]))).all()
    by_skill: dict[str, dict] = {}
    for r in rows:
        d = by_skill.setdefault(r.skill or "-", {"runs": 0, "cost": 0.0, "tokens": 0, "score": []})
        d["runs"] += 1
        d["cost"] += r.estimated_cost
        d["tokens"] += r.input_tokens + r.output_tokens
        if r.evaluation_score is not None:
            d["score"].append(r.evaluation_score)
    return [{"skill": k, "runs": v["runs"], "total_cost": round(v["cost"], 4), "avg_cost": round(v["cost"] / v["runs"], 5),
             "tokens": v["tokens"], "avg_score": round(sum(v["score"]) / len(v["score"]), 3) if v["score"] else None,
             "quality_per_dollar": round((sum(v["score"]) / len(v["score"])) / max(v["cost"] / v["runs"], 1e-6), 1) if v["score"] else None}
            for k, v in by_skill.items()]
