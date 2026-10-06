"""Runtime configuration. Everything is overridable through environment variables."""
from __future__ import annotations

import os
from pathlib import Path


def _find_root() -> Path:
    if os.getenv("AGENTFORGE_ROOT"):
        return Path(os.environ["AGENTFORGE_ROOT"]).resolve()
    return Path(__file__).resolve().parents[3]


ROOT = _find_root()
SKILLS_DIR = Path(os.getenv("AGENTFORGE_SKILLS_DIR", ROOT / "skills"))
EVALS_DIR = Path(os.getenv("AGENTFORGE_EVALS_DIR", ROOT / "evals"))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{ROOT / 'agentforge.db'}")
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

PROVIDER = os.getenv("AGENTFORGE_PROVIDER", "mock")  # mock | openai | anthropic | gemini
MAX_REVIEW_ITERATIONS = int(os.getenv("AGENTFORGE_MAX_REVIEW_ITERATIONS", "2"))
MAX_TOOL_CALLS = int(os.getenv("AGENTFORGE_MAX_TOOL_CALLS", "25"))
RUNTIME = os.getenv("AGENTFORGE_RUNTIME", "docker")  # docker | local
CORS_ORIGINS = os.getenv("AGENTFORGE_CORS_ORIGINS", "*").split(",")

# Model routing is configuration, not code: role -> (provider, model)
MODEL_ROUTING = {
    "planner": os.getenv("AGENTFORGE_MODEL_PLANNER", "strong-reasoning"),
    "worker": os.getenv("AGENTFORGE_MODEL_WORKER", "balanced"),
    "reviewer": os.getenv("AGENTFORGE_MODEL_REVIEWER", "independent-reviewer"),
    "evaluator": os.getenv("AGENTFORGE_MODEL_EVALUATOR", "deterministic+judge"),
}

# USD per 1M tokens (illustrative) used for cost estimation.
PRICING = {
    "strong-reasoning": (3.0, 15.0),
    "balanced": (0.8, 4.0),
    "independent-reviewer": (0.8, 4.0),
    "deterministic+judge": (0.15, 0.6),
}
