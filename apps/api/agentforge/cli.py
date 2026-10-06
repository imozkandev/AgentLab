"""`agentforge` CLI — talks to the same DB/engine as the API (no server required)."""
from __future__ import annotations

import typer
from rich.console import Console
from rich.table import Table
from sqlalchemy import desc, select

from . import evals, runtime, seed, skills as skill_lib
from .models import Run, RunStep, SessionLocal, Worker, init_db

app = typer.Typer(help="AgentForge — run, evaluate and improve AI agents.", no_args_is_help=True)
skills_app, workers_app, runs_app = typer.Typer(), typer.Typer(), typer.Typer()
app.add_typer(skills_app, name="skills", help="List and test skills")
app.add_typer(workers_app, name="workers", help="Inspect workers")
app.add_typer(runs_app, name="runs", help="Inspect runs")
console = Console()


def _boot():
    init_db()
    s = SessionLocal()
    seed.seed_core(s)
    return s


def pct(x):
    return "-" if x is None else f"{x * 100:.1f}%"


@app.command()
def run(task: str, skill: str = typer.Option(None, help="Force a skill"), version: str = typer.Option(None)):
    """Run a task through Planner → Worker → Reviewer → Evaluator."""
    from .orchestrator import Orchestrator
    s = _boot()
    r = Run(task=task, source="user", options={k: v for k, v in {"skill": skill, "skill_version": version}.items() if v})
    s.add(r)
    s.commit()
    Orchestrator(s).execute(r)
    _print_run(s, r)


@app.command("seed")
def seed_cmd(demo: bool = True):
    """Seed agents, skills, workers (and demo runs)."""
    console.print(seed.seed_all(demo))


@app.command("eval")
def eval_cmd(skill: str):
    """Run the evaluation suite for a skill."""
    s = _boot()
    res = evals.run_suite(s, skill_lib.get_skill(s, skill))
    t = Table(title=f"{res['skill']}@{res['version']}  score {pct(res['score'])}  {res['passed']} passed / {res['failed']} failed")
    for c in ("case", "score", "result"):
        t.add_column(c)
    for r in res["results"]:
        t.add_row(r["case"], pct(r["score"]), "[green]PASS" if r["passed"] else "[red]FAIL")
    console.print(t)
    console.print("Safety: " + ("[green]PASS" if res["safety_ok"] else "[red]FAIL — CI BLOCKED"))
    raise typer.Exit(0 if res["safety_ok"] else 1)


@skills_app.command("list")
def skills_list():
    s = _boot()
    t = Table("skill", "version", "eval", "versions")
    for n in skill_lib.names(s):
        vs = skill_lib.list_versions(s, n)
        act = next(v for v in vs if v.status == "active")
        t.add_row(n, act.version, pct(act.eval_score), str(len(vs)))
    console.print(t)


@skills_app.command("test")
def skills_test(name: str, candidate: str = typer.Option(None, help="Candidate version to compare to the active one")):
    s = _boot()
    if not candidate:
        return eval_cmd(name)
    c = evals.compare(s, name, candidate)
    console.print(f"Previous {pct(c['previous']['score'])}  Candidate {pct(c['candidate']['score'])}  Δ {c['delta'] * 100:+.1f} pp")
    console.print(f"Regression tests: {c['candidate']['passed']} passed, {c['candidate']['failed']} failed")
    console.print("[green]Promotable" if c["promotable"] else f"[red]Promotion blocked: {'; '.join(c['blocked_reasons'])}")


@workers_app.command("list")
def workers_list():
    s = _boot()
    t = Table("host", "platform", "region", "runtimes", "jobs", "cpu", "mem")
    for w in s.scalars(select(Worker)):
        t.add_row(w.label or w.hostname, w.platform, w.region, ",".join(w.runtimes), str(w.active_jobs), f"{w.cpu:.0f}%", f"{w.memory:.0f}%")
    console.print(t)
    console.print("Available runtimes:", ", ".join(runtime.available_runtimes()))


@runs_app.command("inspect")
def runs_inspect(run_id: str):
    s = _boot()
    r = s.get(Run, run_id)
    if not r:
        console.print("[red]run not found")
        raise typer.Exit(1)
    _print_run(s, r)


@runs_app.command("list")
def runs_list(limit: int = 15):
    s = _boot()
    t = Table("run", "task", "skill", "status", "score", "cost")
    for r in s.scalars(select(Run).where(Run.source != "eval").order_by(desc(Run.created_at)).limit(limit)):
        t.add_row(r.id, r.task[:50], f"{r.skill}@{r.skill_version}", r.status, pct(r.evaluation_score), f"${r.estimated_cost:.4f}")
    console.print(t)


def _print_run(s, r: Run) -> None:
    console.rule(f"{r.id} — {r.status}")
    for st in s.scalars(select(RunStep).where(RunStep.run_id == r.id).order_by(RunStep.seq)):
        mark = {"ok": "·", "error": "[red]✗", "denied": "[red]⛔", "rejected": "[yellow]↺", "pending": "[yellow]…"}.get(st.status, "·")
        console.print(f"{st.t_ms / 1000:6.1f}s {mark} [bold]{st.actor}[/bold] {st.title}")
    console.rule()
    console.print(r.result_text or "(no result)")
    console.print(f"\nscore {pct(r.evaluation_score)} · {r.tool_call_count} tool calls · {r.review_iterations} review iteration(s) · "
                  f"${r.estimated_cost:.4f} · {r.latency_ms / 1000:.1f}s")


if __name__ == "__main__":
    app()
