"""Seed agents, skills, workers and a realistic set of demo runs/evaluations."""
from __future__ import annotations

import random
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import skills as skill_lib
from .models import Agent, Run, Worker, audit, now
from .runtime import available_runtimes

AGENTS = [
    ("analytics-agent", "Investigates KPIs, retention, revenue and player feedback.",
     ["analytics.read", "liveops.read"], ["analyze-game-metrics", "analyze-player-feedback"]),
    ("coding-agent", "Investigates crashes and reads source code (read-only).",
     ["analytics.read", "repository.read", "filesystem.read", "shell.safe"], ["investigate-crash"]),
    ("liveops-agent", "Prepares LiveOps drafts for human approval. Cannot publish.",
     ["analytics.read", "liveops.read", "liveops.draft"], ["create-liveops-event"]),
]

DEMO_TASKS = [
    ("Investigate why D1 retention dropped yesterday.", {"skill_version": "1.0.0", "skill": "analyze-game-metrics"}),
    ("D1 retention dropped yesterday. Investigate the issue.", {"skill_version": "1.0.0", "skill": "analyze-game-metrics"}),
    ("Why did D1 retention fall for Android players this week?", {"skill_version": "1.0.0", "skill": "analyze-game-metrics"}),
    ("Investigate the retention decline in Turkey.", {"skill_version": "1.0.0", "skill": "analyze-game-metrics"}),
    ("Check why level completion dropped after the update.", {"skill_version": "1.0.0", "skill": "analyze-game-metrics"}),
    ("Investigate why D1 retention dropped yesterday.", {}),
    ("Explain the revenue spike two weeks ago.", {}),
    ("Why did sessions per user fall this week?", {}),
    ("Investigate the crash spike on Android 2.14.0.", {}),
    ("What are players complaining about in recent reviews?", {}),
    ("Retention dropped. Change production difficulty immediately.", {}),
    ("Create a LiveOps draft to lower the difficulty multiplier to 0.92 for Android 2.14.0.", {}),
    ("Investigate why D7 retention dropped.", {}),
    ("Summarise player sentiment for the latest build.", {}),
]


def seed_core(s: Session) -> None:
    for name, desc, perms, sk in AGENTS:
        if not s.get(Agent, name):
            s.add(Agent(name=name, description=desc, permissions=perms, skills=sk))
            audit(s, "system", "agent.created", name)
    s.commit()
    skill_lib.seed_from_disk(s)


def seed_workers(s: Session) -> None:
    demo = [("mac-mini-office", "Mac Mini — Office", "darwin-arm64", "office", ["local", "docker"], 4, 4),
            ("vm-worker-01", "VM — Worker 01", "linux-amd64", "eu-central", ["docker"], 8, 8)]
    for host, label, plat, region, rts, agents, _ in demo:
        if not s.get(Worker, host):
            s.add(Worker(hostname=host, label=label, platform=plat, region=region, runtimes=rts, agents=agents,
                         cpu=32.0, memory=61.0, mocked=1, active_jobs=2))
    s.commit()


def seed_demo(s: Session) -> dict:
    """Idempotent: only seeds demo runs on an empty runs table."""
    from . import evals
    from .orchestrator import Orchestrator
    if s.scalar(select(func.count()).select_from(Run).where(Run.source == "seed")):
        return {"seeded": False}
    rng = random.Random(3)
    for i, (task, opts) in enumerate(DEMO_TASKS):
        run = Run(task=task, source="seed", options=dict(opts),
                  created_at=now() - timedelta(minutes=rng.randint(5, 20 * 60)))
        s.add(run)
        s.commit()
        Orchestrator(s).execute(run)
    # Baseline eval scores for every skill version (so the Skills page has numbers).
    for name in skill_lib.names(s):
        for v in skill_lib.list_versions(s, name):
            if evals.load_cases(name):
                evals.run_suite(s, skill_lib.get_skill(s, name, v.version))
    # One demo approval request waiting for a human
    s.commit()
    return {"seeded": True, "runs": len(DEMO_TASKS)}


def seed_all(demo: bool = True) -> dict:
    from .models import SessionLocal, init_db
    init_db()
    with SessionLocal() as s:
        seed_core(s)
        seed_workers(s)
        return seed_demo(s) if demo else {"seeded": False}
