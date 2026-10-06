"""Failure analysis: categorise failed/degraded runs, cluster recurring patterns, suggest skill improvements."""
from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Run

CATEGORIES = ["tool_error", "timeout", "permission_denied", "hallucination", "missing_context",
              "bad_tool_selection", "invalid_output", "review_failure", "evaluation_failure"]


def classify(run: Run, st) -> tuple[str | None, str | None]:
    """Return (category, signature) for a run that went wrong, else (None, None)."""
    ev = run.evaluation or {}
    if run.status == "failed" and not run.skill:
        return "bad_tool_selection", "no-skill-matched"
    if st.denied:
        return "permission_denied", "denied:" + ",".join(sorted(set(st.denied)))
    unresolved = [e for e in st.errors if e.get("type") == "tool_error"]
    if unresolved and run.status == "failed":
        return "tool_error", "error:" + unresolved[0].get("tool", "?")
    if any(e["type"] == "review_failure" for e in run.errors):
        return "review_failure", "review:" + "+".join(sorted(ev.get("missing_first_pass", [])))
    if ev.get("hallucination_rate", 0) > 0:
        return "hallucination", "causation-without-evidence"
    if ev.get("missing_first_pass"):  # reviewer had to reject; the skill didn't gather everything up front
        return "missing_context", "missing:" + "+".join(sorted(ev["missing_first_pass"]))
    if (run.evaluation_score or 1) < 0.7:
        return "evaluation_failure", "low-score"
    return None, None


def suggestion(category: str, signature: str) -> str:
    from .orchestrator import EVIDENCE_TOOLS
    if signature.startswith(("missing:", "review:")):
        keys = [k for k in signature.split(":", 1)[1].split("+") if k]
        if keys:
            parts = []
            for k in keys:
                tools = EVIDENCE_TOOLS.get(k, [])
                label = {"segmentation": "platform/country/version segmentation"}.get(k, k.replace("_", " "))
                parts.append(f"add {label} as a mandatory Required Workflow step" + (f" (`{{tool: {tools[0]}}}`)" if tools else ""))
            return "; ".join(parts).capitalize() + "."
    return {
        "permission_denied": "Review the agent's permission scopes, or remove the tool from the skill workflow.",
        "tool_error": "Validate tool arguments in the skill and add an explicit fallback step.",
        "bad_tool_selection": "Add trigger keywords to the relevant SKILL.md so the Planner can select it.",
        "hallucination": "Add a rule: label hypotheses as correlated and never claim causation without evidence.",
        "evaluation_failure": "Inspect the trace; add an eval case reproducing this run, then improve the skill.",
    }.get(category, "Inspect traces in this cluster and add an eval case that reproduces the failure.")


def cluster(s: Session) -> dict:
    runs = s.scalars(select(Run).where(Run.failure_category.is_not(None), Run.source.in_(["user", "seed"]))).all()
    total = s.scalar(select(__import__("sqlalchemy").func.count()).select_from(Run).where(Run.source.in_(["user", "seed"]))) or 1
    by_cat: dict[str, int] = defaultdict(int)
    groups: dict[tuple, list[Run]] = defaultdict(list)
    for r in runs:
        by_cat[r.failure_category] += 1
        groups[(r.skill or "-", r.failure_category, r.failure_signature or "")].append(r)
    clusters = []
    for i, ((skill, cat, sig), rs) in enumerate(sorted(groups.items(), key=lambda kv: -len(kv[1])), 1):
        scores = [r.evaluation_score for r in rs if r.evaluation_score is not None]
        clusters.append({"id": i, "skill": skill, "category": cat, "signature": sig, "occurrences": len(rs),
                         "versions": sorted({r.skill_version for r in rs if r.skill_version}),
                         "avg_score": round(sum(scores) / len(scores), 3) if scores else None,
                         "run_ids": [r.id for r in rs][:20], "suggestion": suggestion(cat, sig)})
    n = sum(by_cat.values()) or 1
    return {"total_runs": total, "failed_runs": sum(by_cat.values()),
            "categories": [{"category": c, "count": by_cat[c], "share": round(by_cat[c] / n, 3)}
                           for c in sorted(by_cat, key=lambda c: -by_cat[c])],
            "clusters": clusters}
