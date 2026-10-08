"""Agent orchestrator: Planner -> Worker -> Reviewer (-> Worker revision) -> Evaluator.

Design notes
* Every decision and tool call becomes a `RunStep` (the trace). Nothing important happens off-trace.
* Tools are only reachable through `ToolGateway` (permissions, risk levels, approvals).
* Planning is driven by the *skill* (its Required Workflow). Change the skill, change the behaviour —
  which is exactly what the evaluation framework measures.
* The mock provider keeps everything deterministic; real providers only write the final narrative from
  the collected evidence (`context["evidence_json"]`).
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import date, timedelta
from statistics import median

from sqlalchemy.orm import Session

from . import config, data, skills as skill_lib
from .mcp import ToolContext, gateway
from .mcp.base import ToolError
from .models import Agent, ApprovalRequest, Run, RunStep, audit, now
from .permissions import ApprovalRequired, PermissionDenied
from .providers import AgentProvider, estimate_tokens, get_provider

UNSAFE_RE = re.compile(r"(change|set|update|modify|push|publish|deploy|apply|ship|release)\b.{0,40}\b(production|prod|live)\b|"
                       r"\b(production|prod)\b.{0,40}\b(immediately|now|directly)\b|publish.{0,30}(now|immediately)", re.I)

TOOL_EVIDENCE = {
    "compare_periods": "comparison", "get_player_segments": "segmentation", "list_events": "liveops_check",
    "compare_remote_config": "liveops_check", "get_game_metrics": "metrics", "get_retention": "metrics",
    "get_revenue": "metrics", "get_sessions": "metrics", "get_crash_stats": "crash_data",
    "get_player_feedback": "feedback_data", "search_code": "code_context", "read_file": "code_context",
    "create_draft_event": "draft_created", "get_remote_config": "config_state",
}
EVIDENCE_TOOLS = {
    "comparison": ["compare_periods"], "segmentation": ["get_player_segments"],
    "liveops_check": ["list_events", "compare_remote_config"], "metrics": ["get_game_metrics"],
    "crash_data": ["get_crash_stats"], "feedback_data": ["get_player_feedback"],
    "code_context": ["search_code", "read_file"], "draft_created": ["create_draft_event"],
    "config_state": ["get_remote_config"],
}
EVIDENCE_ISSUE = {
    "comparison": "No comparison against a previous period.",
    "segmentation": "Platform/country/version segmentation is missing.",
    "liveops_check": "No LiveOps events or remote-config changes were checked.",
    "metrics": "No metric time series was retrieved.",
    "crash_data": "No crash statistics were retrieved.",
    "feedback_data": "No player feedback was retrieved.",
    "code_context": "No source code was inspected.",
    "draft_created": "No LiveOps draft was created.",
    "config_state": "Current remote config was not inspected.",
}
METRIC_WORDS = [("arpdau", "arpdau"), ("level completion", "level_completion"), ("level", "level_completion"),
                ("crash", "crashes"), ("revenue", "revenue"), ("session", "sessions"), ("dau", "dau"),
                ("d7", "d7"), ("retention", "d1"), ("d1", "d1")]
METRIC_LABEL = {"d1": "D1 retention", "d7": "D7 retention", "revenue": "Revenue", "sessions": "Sessions",
                "dau": "DAU", "arpdau": "ARPDAU", "level_completion": "Level completion", "crashes": "Crashes"}
PCT_METRICS = {"d1", "d7", "level_completion"}


def fmt(metric: str, v) -> str:
    if v is None:
        return "n/a"
    return f"{v * 100:.1f}%" if metric in PCT_METRICS else (f"${v:,.2f}" if metric in ("revenue", "arpdau") else f"{v:,.0f}")


def fmt_delta(metric: str, d: float) -> str:
    return f"{d * 100:+.1f} pp" if metric in PCT_METRICS else (f"{d:+,.2f}" if metric in ("revenue", "arpdau") else f"{d:+,.0f}")


@dataclass
class RunState:
    task: str
    target: str = field(default_factory=lambda: data.yesterday().isoformat())
    metric: str = "d1"
    unsafe: bool = False
    results: dict[str, list] = field(default_factory=dict)  # tool -> [result,...]
    evidence: set[str] = field(default_factory=set)
    first_pass_evidence: set[str] = field(default_factory=set)
    errors: list[dict] = field(default_factory=list)
    denied: list[str] = field(default_factory=list)
    approvals: list[str] = field(default_factory=list)
    tool_calls: int = 0
    executed: list[str] = field(default_factory=list)
    draft_info: dict | None = None
    planned_tools: list[str] = field(default_factory=list)
    first_pass_tools: list[str] = field(default_factory=list)

    def last(self, tool: str):
        r = self.results.get(tool)
        return r[-1] if r else None


def infer_metric(task: str) -> str:
    t = task.lower()
    for word, metric in METRIC_WORDS:
        if word in t:
            return metric
    return "d1"


def anomaly_day(series: list[dict], metric: str) -> tuple[str | None, float | None]:
    """Robust anomaly detection: first day deviating from the median by > max(4*MAD, 3%)."""
    vals = [(p["date"], p[metric]) for p in series if p.get(metric) is not None]
    if len(vals) < 10:
        return None, None
    med = median(v for _, v in vals)
    mad = median(abs(v - med) for _, v in vals) * 1.4826
    thr = max(4 * mad, (0.03 if metric in PCT_METRICS else 0.15) * abs(med))
    for d, v in vals:
        if abs(v - med) > thr:
            return d, v - med
    return None, None


class Orchestrator:
    def __init__(self, session: Session, provider: AgentProvider | None = None, skill_override: skill_lib.Skill | None = None,
                 max_review_iterations: int | None = None):
        self.s = session
        self.provider = provider or get_provider()
        self.skill_override = skill_override
        self.max_review = config.MAX_REVIEW_ITERATIONS if max_review_iterations is None else max_review_iterations
        self.clock = 0
        self.seq = 0
        self.tokens = {"in": 0, "out": 0}
        self.cost = 0.0

    # ------------------------------------------------------------------ tracing helpers
    def _sim(self, kind: str, key: str) -> int:
        h = int(hashlib.md5(f"{kind}:{key}".encode()).hexdigest()[:6], 16)
        return 700 + h % 1500 if kind == "llm" else 120 + h % 520

    def step(self, run: Run, type: str, actor: str, title: str, detail: dict | None = None, status: str = "ok",
             dt: int = 0) -> None:
        self.clock += dt
        self.seq += 1
        self.s.add(RunStep(run_id=run.id, seq=self.seq, t_ms=self.clock, type=type, actor=actor, title=title,
                           detail=detail or {}, status=status))
        self.s.commit()

    def account(self, role: str, in_tok: int, out_tok: int) -> None:
        model = config.MODEL_ROUTING[role]
        pin, pout = config.PRICING.get(model, (1.0, 4.0))
        self.tokens["in"] += in_tok
        self.tokens["out"] += out_tok
        self.cost += in_tok / 1e6 * pin + out_tok / 1e6 * pout

    # ------------------------------------------------------------------ main entry
    def execute(self, run: Run) -> Run:
        run.status, run.start_time = "running", now()
        run.model = self.provider.name if self.provider.name != "mock" else "mock-deterministic"
        self.s.commit()
        audit(self.s, "system", "run.started", run.id, task=run.task)
        st = RunState(task=run.task, metric=infer_metric(run.task), unsafe=bool(UNSAFE_RE.search(run.task)))
        self.step(run, "run.started", "system", "Run started", {"task": run.task, "provider": self.provider.name})
        try:
            skill = self._plan(run, st)
            if skill is None:
                run.status, run.errors = "failed", [{"type": "bad_tool_selection", "message": "no suitable skill found"}]
                run.failure_category = "bad_tool_selection"
            else:
                self._work_review_loop(run, st, skill)
        except Exception as e:  # never lose a run to a bug; record it
            run.status = "failed"
            run.errors = [*run.errors, {"type": "tool_error", "message": f"{type(e).__name__}: {e}"}]
            self.step(run, "run.error", "system", "Unhandled error", {"error": str(e)}, status="error")
        self._finalize(run, st)
        return run

    # ------------------------------------------------------------------ planner
    def _plan(self, run: Run, st: RunState):
        if self.skill_override:
            skill, scores = self.skill_override, {}
        elif run.options.get("skill"):
            skill, scores = skill_lib.get_skill(self.s, run.options["skill"], run.options.get("skill_version")), {}
        elif st.unsafe:
            skill, scores = skill_lib.get_skill(self.s, "create-liveops-event"), {"routed": "unsafe-intent"}
        else:
            skill, scores = skill_lib.select_skill(self.s, run.task)
        in_tok = estimate_tokens(run.task + json.dumps(skill_lib.registry(self.s)))
        if st.unsafe:
            self.step(run, "safety.refusal", "planner", "Refused direct production modification",
                      {"reason": "Agents may only create drafts; publishing requires human approval.",
                       "policy": "least-privilege / human-control"}, dt=self._sim("llm", "refuse"))
        if skill is None:
            self.step(run, "planner.failed", "planner", "No skill matched the task", {"scores": scores}, status="error",
                      dt=self._sim("llm", run.task))
            self.account("planner", in_tok, 40)
            return None
        run.skill, run.skill_version, run.agent = skill.name, skill.version, skill.agent
        self.step(run, "skill.selected", "planner", f"Skill selected {skill.ref}",
                  {"skill": skill.name, "version": skill.version, "scores": scores, "description": skill.description},
                  dt=self._sim("llm", "skill"))
        plan = [{"n": x.n, "text": x.text, "tool": x.tool} for x in skill.steps]
        run.plan = plan
        st.planned_tools = [x["tool"] for x in plan if x["tool"]]
        self.account("planner", in_tok + estimate_tokens(skill.content), estimate_tokens(json.dumps(plan)))
        self.step(run, "plan.created", "planner", f"Plan created ({len(plan)} steps)",
                  {"steps": plan, "agent": skill.agent, "required_evidence": skill.requires}, dt=self._sim("llm", "plan"))
        self.s.commit()
        return skill

    # ------------------------------------------------------------------ worker + reviewer loop
    def _work_review_loop(self, run: Run, st: RunState, skill) -> None:
        for x in skill.steps:
            if x.tool:
                self._call_tool(run, st, skill, x.tool, x.text)
        st.first_pass_evidence = set(st.evidence)
        st.first_pass_tools = list(st.executed)
        report = self._write_report(run, st, skill)
        iteration = 0
        while True:
            verdict = self._review(run, st, skill, report)
            if verdict["approved"]:
                break
            iteration += 1
            run.review_iterations = iteration
            if iteration > self.max_review:
                run.errors = [*run.errors, {"type": "review_failure", "message": "; ".join(verdict["issues"])}]
                break
            self.step(run, "worker.revision", "worker", f"Revision {iteration}: addressing reviewer feedback",
                      {"issues": verdict["issues"]}, dt=self._sim("llm", f"rev{iteration}"))
            for key in verdict["missing"]:
                for tool in EVIDENCE_TOOLS.get(key, []):
                    self._call_tool(run, st, skill, tool, f"revision: {key}")
            report = self._write_report(run, st, skill)
        run.result_text = report["text"]
        run.status = "completed" if not any(e["type"] == "review_failure" for e in run.errors) else "failed"
        if run.status == "failed":
            run.failure_category = "review_failure"
        run.options = {**run.options, "sections": [t for t, _ in report["sections"]]}

    def _args(self, st: RunState, tool: str, text: str) -> dict:
        t = text.lower()
        end = st.target
        e = date.fromisoformat(end)
        d7 = (e - timedelta(days=6)).isoformat()
        base = {"game": "Word Quest"}
        platform = "android" if "android" in t else "ios" if re.search(r"\bios\b", t) else None
        match tool:
            case "get_retention":
                return {**base, "date": end}
            case "get_game_metrics":
                return {**base, "start_date": data.day_date(1).isoformat(), "end_date": end, "metrics": [st.metric]}
            case "get_revenue" | "get_sessions":
                return {**base, "start_date": d7, "end_date": end}
            case "compare_periods":
                return {**base, "metric": st.metric, "start_date": d7, "end_date": end}
            case "get_player_segments":
                dims = ["platform"] if "platform" in t and "country" not in t and "version" not in t else None
                return {**base, "metric": st.metric, "start_date": d7, "end_date": end, **({"dimensions": dims} if dims else {})}
            case "list_events":
                return {"game": "Word Quest", "start_date": (e - timedelta(days=21)).isoformat(), "end_date": end}
            case "compare_remote_config":
                return {"game": "Word Quest", "start_date": (e - timedelta(days=21)).isoformat(), "end_date": end}
            case "get_remote_config":
                return {"game": "Word Quest"}
            case "get_crash_stats":
                return {**base, "start_date": d7, "end_date": end}
            case "get_player_feedback":
                return {**base, **({"platform": platform} if platform else {})}
            case "search_code":
                sig = (st.last("get_crash_stats") or {}).get("top_signatures", [{}])[0].get("signature", "")
                m = re.search(r"at (\w+)\.", sig)
                return {"query": m.group(1) if m else "TODO", "glob": "*.cs"}
            case "read_file":
                hits = (st.last("search_code") or {}).get("matches", [])
                return {"path": hits[0]["path"] if hits else "README.md"}
            case "create_draft_event":
                return self._draft_args(st)
        return {}

    def _draft_args(self, st: RunState) -> dict:
        t = st.task.lower()
        if "difficulty" in t or "config" in t:
            m = re.search(r"(\d\.\d+)", st.task)
            cur = next((v for k, v in ((st.last("get_remote_config") or {}).get("current", {})).items()
                        if k.startswith("difficulty_multiplier@android")), 1.15)
            return {"game": "Word Quest", "kind": "remote_config",
                    "payload": {"key": "difficulty_multiplier", "from": cur, "to": float(m.group(1)) if m else 0.92,
                                "scope": "android/2.14.0"},
                    "reason": f"Requested by task: {st.task[:120]}"}
        return {"game": "Word Quest", "kind": "event",
                "payload": {"name": "Welcome Back Bonus", "type": "economy_event", "duration_days": 2},
                "reason": f"Requested by task: {st.task[:120]}"}

    def _call_tool(self, run: Run, st: RunState, skill, tool: str, text: str) -> None:
        agent = run.agent or skill.agent
        if tool == "get_retention" and st.metric not in ("d1", "d7"):  # skill step 'retrieve the metric'
            tool = {"revenue": "get_revenue", "arpdau": "get_revenue", "sessions": "get_sessions"}.get(st.metric, "get_game_metrics")
        if st.tool_calls >= config.MAX_TOOL_CALLS:
            self.step(run, "tool_call", agent, f"{tool} skipped", {"reason": "max tool calls reached"}, status="error")
            return
        args = self._args(st, tool, text)
        st.tool_calls += 1
        run.tool_call_count = st.tool_calls
        dt = self._sim("tool", tool + json.dumps(args, sort_keys=True))
        ctx = ToolContext(session=self.s, run_id=run.id, agent=agent)
        from .mcp import all_tools
        spec = all_tools().get(tool)
        server = spec.server if spec else "?"
        try:
            res = gateway.call(agent, tool, args, ctx)
            st.results.setdefault(tool, []).append(res)
            st.executed.append(tool)
            if tool in TOOL_EVIDENCE:
                st.evidence.add(TOOL_EVIDENCE[tool])
            if tool == "create_draft_event":
                st.draft_info = res
                st.approvals.append(res["approval_id"])
            preview = json.dumps(res, default=str)
            self.step(run, "tool_call", agent, f"MCP → {tool}",
                      {"server": server, "tool": tool, "args": args, "risk": spec.risk.label if spec else "?",
                       "result_preview": preview[:1400], "result_bytes": len(preview)}, dt=dt)
            if tool == "create_draft_event":
                self.step(run, "approval.requested", "system", f"Human approval requested ({res['approval_id']})",
                          {"approval_id": res["approval_id"], "draft_id": res["draft_id"], "published": False})
        except PermissionDenied as e:
            st.denied.append(tool)
            st.errors.append({"type": "permission_denied", "tool": tool, "message": str(e)})
            self.step(run, "tool_call", agent, f"MCP → {tool} DENIED", {"server": server, "tool": tool, "args": args,
                                                                         "error": str(e)}, status="denied", dt=dt)
        except ApprovalRequired as e:
            st.approvals.append(e.approval_id)
            self.step(run, "approval.requested", "system", f"CRITICAL tool {tool} requires approval", {"approval_id": e.approval_id},
                      status="pending", dt=dt)
        except ToolError as e:
            st.errors.append({"type": "tool_error", "tool": tool, "message": str(e)})
            self.step(run, "tool_call", agent, f"MCP → {tool} ERROR", {"server": server, "tool": tool, "args": args,
                                                                       "error": str(e)}, status="error", dt=dt)

    # ------------------------------------------------------------------ report synthesis
    def _write_report(self, run: Run, st: RunState, skill) -> dict:
        sections = SYNTH.get(skill.name, synth_generic)(st, skill)
        draft = "\n\n".join(f"### {t}\n{b}" for t, b in sections)
        ctx = {"draft": draft, "evidence_json": json.dumps({k: v[-1] for k, v in st.results.items()}, default=str)[:12000]}
        system = f"You are the Worker agent. Follow the skill strictly.\n\n{skill.content}"
        res = self.provider.run_sync(system, [{"role": "user", "content": run.task}], [], ctx)
        self.account("worker", res.input_tokens, res.output_tokens)
        text = res.text or draft
        self.step(run, "worker.completed", "worker", "Worker produced a report",
                  {"sections": [t for t, _ in sections], "chars": len(text), "text": text[:6000]}, dt=self._sim("llm", "worker" + str(self.seq)))
        return {"text": text, "sections": sections}

    # ------------------------------------------------------------------ reviewer
    def _review(self, run: Run, st: RunState, skill, report: dict) -> dict:
        missing = [k for k in skill.requires if k not in st.evidence]
        issues = [EVIDENCE_ISSUE.get(k, f"Missing evidence: {k}") for k in missing]
        if re.search(r"\b(caused by|because of|was caused|due to)\b", report["text"], re.I) and not re.search(r"correlat", report["text"], re.I):
            issues.append("Claims causation without supporting evidence.")
        if st.unsafe and "publish_event" in st.executed:
            issues.append("Unsafe: production publish was executed.")
        verdict = {"approved": not issues, "issues": issues, "missing": missing}
        self.account("reviewer", estimate_tokens(report["text"]), estimate_tokens(json.dumps(verdict)))
        self.step(run, "reviewer.approved" if verdict["approved"] else "reviewer.rejected", "reviewer",
                  "Reviewer approved" if verdict["approved"] else "Reviewer rejected",
                  {"approved": verdict["approved"], "issues": issues}, status="ok" if verdict["approved"] else "rejected",
                  dt=self._sim("llm", "review" + str(self.seq)))
        return verdict

    # ------------------------------------------------------------------ evaluator + wrap-up
    def _finalize(self, run: Run, st: RunState) -> None:
        from . import evals, failures
        ev = evals.generic_evaluation(run, st, skill_requires=skill_requires(self.s, run, self.skill_override))
        self.account("evaluator", 400, 80)
        run.evaluation, run.evaluation_score = ev, ev["overall"]
        self.step(run, "evaluation.completed", "evaluator", f"Evaluation completed — score {ev['overall'] * 100:.0f}%", ev,
                  dt=self._sim("llm", "eval"))
        cat, sig = failures.classify(run, st)
        if cat:
            run.failure_category, run.failure_signature = cat, sig
        run.errors = [*run.errors, *[e for e in st.errors if e not in run.errors]]
        run.end_time, run.latency_ms = now(), self.clock
        run.input_tokens, run.output_tokens, run.estimated_cost = self.tokens["in"], self.tokens["out"], round(self.cost, 6)
        if run.status == "running":
            run.status = "completed"
        run.options = {**run.options, "approvals": st.approvals, "state_evidence": sorted(st.evidence),
                       "first_pass_evidence": sorted(st.first_pass_evidence), "executed_tools": st.executed,
                       "first_pass_tools": st.first_pass_tools,
                       "planned_tools": st.planned_tools, "unsafe_intent": st.unsafe, "denied_tools": st.denied}
        self.step(run, "run.completed" if run.status == "completed" else "run.failed", "system",
                  f"Run {run.status}", {"latency_ms": self.clock, "cost": run.estimated_cost, "score": run.evaluation_score})
        audit(self.s, "system", f"run.{run.status}", run.id, score=run.evaluation_score)
        self.s.commit()


def skill_requires(s: Session, run: Run, override) -> list[str]:
    if override:
        return override.requires
    try:
        return skill_lib.get_skill(s, run.skill, run.skill_version).requires if run.skill else []
    except skill_lib.SkillError:
        return []


# ====================================================================== synthesis per skill
def synth_generic(st: RunState, skill) -> list[tuple[str, str]]:
    ev = "\n".join(f"- {t}: {json.dumps(r[-1], default=str)[:200]}" for t, r in st.results.items()) or "- (no tool data)"
    return [("Summary", f"Executed {st.tool_calls} tool calls for: {st.task}"), ("Evidence", ev)]


def _evidence_list(st: RunState) -> str:
    return "\n".join(f"- `{t}` ×{len(r)}" for t, r in st.results.items())


def synth_metrics(st: RunState, skill) -> list[tuple[str, str]]:
    m, label = st.metric, METRIC_LABEL.get(st.metric, st.metric)
    sections: list[tuple[str, str]] = []
    cmp_ = st.last("compare_periods")
    if cmp_:
        c, p = cmp_["current"]["value"], cmp_["previous"]["value"]
        direction = "decreased" if cmp_["delta"] < 0 else "increased"
        sections.append((f"{label} comparison",
                         f"{label} {direction} from {fmt(m, p)} to {fmt(m, c)} ({fmt_delta(m, cmp_['delta'])}, "
                         f"{cmp_['pct_change']:+.1f}%) comparing {cmp_['current']['period'][0]}..{cmp_['current']['period'][1]} "
                         f"with the previous equal-length period."))
    r = st.last("get_retention")
    if r:
        sections.append((f"{label} snapshot", f"D1 on {r['date']}: {fmt('d1', r['d1'])}, D7: {fmt('d7', r['d7'])} (single day, no baseline)."))
    anomaly = None
    series = (st.last("get_game_metrics") or {}).get("daily", [])
    if series:
        anomaly = anomaly_day(series, m)
        if anomaly and anomaly[0] is not None and anomaly[1] is not None:
            sections.append(("Anomaly detection", f"First significant deviation of {label} on {anomaly[0]} "
                                                  f"({fmt_delta(m, anomaly[1])} vs the 30-day median)."))
    seg = st.last("get_player_segments")
    if seg and seg["segments"]:
        worse_up = m == "crashes"
        segs = sorted(seg["segments"], key=lambda x: -x["delta"] if worse_up else x["delta"])[:3]
        body = "\n".join(f"- **{x['segment']}**: {fmt(m, x['previous'])} → {fmt(m, x['current'])} ({fmt_delta(m, x['delta'])})" for x in segs)
        sections.append(("Affected segment", f"Largest movers by platform/country/version:\n{body}"))
    cands = []
    ev, cfg = st.last("list_events"), st.last("compare_remote_config")
    if ev or cfg:
        if anomaly and anomaly[0]:
            a = date.fromisoformat(anomaly[0])
            lo, hi = (a - timedelta(days=3)).isoformat(), a.isoformat()
            cands += [f"event **{e['name']}** ({e['start']})" for e in (ev or {}).get("events", []) if lo <= e["start"] <= hi]
            cands += [f"config **{c['key']}** {c['previous_value']} → {c['value']} for {c['scope']} at {c['applied_at']}"
                      for c in (cfg or {}).get("changes", []) if lo <= c["applied_at"][:10] <= hi]
        else:
            cands += [f"config **{c['key']}** {c['previous_value']} → {c['value']} ({c['scope']}, {c['applied_at'][:10]})"
                      for c in (cfg or {}).get("changes", [])]
        sections.append(("LiveOps correlation", "\n".join(f"- {c}" for c in cands) if cands else
                         "No LiveOps events or config changes found near the anomaly window."))
    hyp = [f"- Hypothesis: {c} may have influenced {label}; this is correlated timing, not proven causation." for c in cands]
    if not hyp:
        hyp = ["- No supported hypothesis: insufficient evidence in the collected data."]
    sections.append(("Hypotheses", "\n".join(hyp)))
    sections.append(("Evidence", f"Facts come from tool results; hypotheses are labelled as such.\n{_evidence_list(st)}"))
    nxt = ("Compare level completion before and after the identified change for the affected segment."
           if cands and seg else "Collect segmentation and LiveOps context before drawing conclusions.")
    sections.append(("Recommended next step", nxt))
    return sections


def synth_crash(st: RunState, skill) -> list[tuple[str, str]]:
    cs = st.last("get_crash_stats") or {}
    sections = []
    cmp_ = st.last("compare_periods")
    if cmp_:
        sections.append(("Crash comparison", f"Crashes went from {cmp_['previous']['value']:,.0f} to {cmp_['current']['value']:,.0f} "
                                             f"({cmp_['pct_change']:+.1f}%) over the last 7 days vs the prior 7 days."))
    bpv = cs.get("by_platform_version", {})
    if bpv:
        worst = max(bpv.items(), key=lambda kv: kv[1]["per_1k_sessions"])
        sections.append(("Affected build", f"Highest crash rate: **{worst[0]}** at {worst[1]['per_1k_sessions']} per 1k sessions "
                                           f"(others: " + ", ".join(f"{k} {v['per_1k_sessions']}" for k, v in bpv.items() if k != worst[0]) + ")."))
    sigs = cs.get("top_signatures", [])
    if sigs:
        s = sigs[0]
        sections.append(("Top signature", f"`{s['signature']}` — {int(s['share'] * 100)}% of crashes, first seen {s['first_seen']} "
                                          f"on {s['platform']} {s['version']}. Stack: {' ← '.join(s['stack'])}"))
    rf = st.last("read_file")
    if rf:
        lines = [(n, l) for n, l in enumerate(rf["content"].splitlines(), 1) if "Load" in l or "null" in l.lower()]
        sections.append(("Code context", f"Inspected `{rf['path']}`. Relevant lines:\n" + "\n".join(f"- L{n}: `{l.strip()}`" for n, l in lines[:6])))
    sections.append(("Hypotheses", "- Hypothesis: the missing null-guard around the loaded level asset is the likely trigger "
                                    "(correlated with the 2.14.0 Android rollout; not yet reproduced)."))
    sections.append(("Evidence", _evidence_list(st)))
    sections.append(("Recommended next step", "Add a null check in the level loader, reproduce on 2.14.0 Android, and ship a hotfix build."))
    return sections


def synth_feedback(st: RunState, skill) -> list[tuple[str, str]]:
    sections = []
    fb = st.results.get("get_player_feedback", [])
    if fb:
        allfb = fb[0]
        themes = sorted(allfb["themes"].items(), key=lambda kv: -kv[1]["count"])
        sections.append(("Feedback themes", "\n".join(f"- **{k}**: {v['count']} reviews (avg {v['avg_rating']}★)" for k, v in themes)))
        sections.append(("Sentiment", f"{allfb['total']} reviews, average rating {allfb['avg_rating']}★."))
        if len(fb) > 1:
            sections.append(("Platform comparison", "\n".join(
                f"- review set {i + 1}: {x['total']} reviews, avg {x['avg_rating']}★, top theme "
                f"{max(x['themes'].items(), key=lambda kv: kv[1]['count'])[0] if x['themes'] else 'n/a'}" for i, x in enumerate(fb))))
        quotes = [f"> {ex}" for _, v in themes[:3] for ex in v["examples"][:1]]
        sections.append(("Representative quotes", "\n".join(quotes)))
    sections.append(("Evidence", _evidence_list(st)))
    sections.append(("Recommended next step", "Cross-check the top negative theme with retention and level-completion data for the same builds."))
    return sections


def synth_liveops(st: RunState, skill) -> list[tuple[str, str]]:
    sections = []
    if st.unsafe:
        sections.append(("Safety decision", "Refused direct production modification. Agents may only create LiveOps drafts; "
                                            "publishing requires human approval."))
    cfg = st.last("get_remote_config")
    if cfg:
        sections.append(("Current configuration", "\n".join(f"- {k}: {v}" for k, v in cfg["current"].items())))
    ch = st.last("compare_remote_config")
    if ch:
        sections.append(("Recent changes", "\n".join(f"- {c['key']} {c['previous_value']} → {c['value']} ({c['scope']})" for c in ch["changes"]) or "- none"))
    d = st.draft_info
    if d:
        sections.append(("Proposed draft", f"Draft `{d['draft_id']}` created (not published); see the tool call in the trace for the exact change."))
        sections.append(("Approval status", f"Pending human approval (`{d['approval_id']}`). Nothing was published."))
    sections.append(("Evidence", _evidence_list(st)))
    return sections


SYNTH = {"analyze-game-metrics": synth_metrics, "investigate-crash": synth_crash,
         "analyze-player-feedback": synth_feedback, "create-liveops-event": synth_liveops}
