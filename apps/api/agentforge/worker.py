"""Worker: claims queued runs, executes them through the orchestrator and reports heartbeats."""
from __future__ import annotations

import logging
import os
import platform
import socket
import threading
import time

import psutil
from sqlalchemy import select, update

from . import runtime
from .models import Agent, Run, SessionLocal, Worker, init_db, now

log = logging.getLogger("agentforge.worker")


def heartbeat(hostname: str, active: int) -> None:
    with SessionLocal() as s:
        w = s.get(Worker, hostname) or Worker(hostname=hostname)
        w.label = w.label or hostname
        w.platform = f"{platform.system().lower()}-{platform.machine()}"
        w.region = os.getenv("AGENTFORGE_REGION", "local")
        w.runtimes = runtime.available_runtimes()
        w.active_jobs = active
        w.cpu = psutil.cpu_percent(interval=None)
        w.memory = psutil.virtual_memory().percent
        w.agents = len(s.scalars(select(Agent.name)).all())
        w.mocked, w.heartbeat = 0, now()
        s.add(w)
        s.commit()


def claim(hostname: str) -> str | None:
    with SessionLocal() as s:
        rid = s.scalar(select(Run.id).where(Run.status == "queued").order_by(Run.created_at).limit(1))
        if not rid:
            return None
        res = s.execute(update(Run).where(Run.id == rid, Run.status == "queued").values(status="running", worker=hostname))
        s.commit()
        return rid if res.rowcount == 1 else None


def process(run_id: str) -> None:
    from .orchestrator import Orchestrator
    with SessionLocal() as s:
        run = s.get(Run, run_id)
        Orchestrator(s).execute(run)


def run_loop(stop: threading.Event, hostname: str | None = None) -> None:
    init_db()
    hostname = hostname or os.getenv("AGENTFORGE_WORKER_NAME", socket.gethostname())
    last_hb, active = 0.0, 0
    log.info("worker %s started", hostname)
    while not stop.is_set():
        try:
            if time.time() - last_hb > 5:
                heartbeat(hostname, active)
                last_hb = time.time()
            rid = claim(hostname)
            if rid:
                active = 1
                heartbeat(hostname, active)
                process(rid)
                active = 0
                heartbeat(hostname, active)
                continue
        except Exception:  # keep the worker alive
            log.exception("worker loop error")
        stop.wait(1.0)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_loop(threading.Event())
