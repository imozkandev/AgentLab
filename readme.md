# AgentForge — AI Agent Infrastructure & Evaluation Platform

[![CI](https://github.com/agentforge/agentforge/actions/workflows/ci.yml/badge.svg)](https://github.com/agentforge/agentforge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)

> **Infrastructure for running, evaluating and improving AI agents in production.**

AI agents are easy to demo. They are much harder to operate reliably across an engineering organization.

**AgentForge** is an internal AI Enablement and Agent Infrastructure platform designed for an AI-native game studio. It demonstrates how an organization safely operates autonomous coding and operational agents across local workstations and cloud VMs with:

- **Version-controlled reusable skills** (`SKILL.md`)
- **Model Context Protocol (MCP)** integrations
- **Multi-agent orchestration** (Planner → Worker → Reviewer → Evaluator)
- **Automated regression evaluations** (18 test scenarios)
- **Granular permission scopes & risk tiers**
- **Isolated execution sandboxing**
- **Trace timeline observability & failure clustering**
- **Human-in-the-loop approval workflows**
- **Linear/Datadog-style internal developer dashboard**

---

## High-Level Architecture

```text
                        ┌─────────────────────────┐
                        │     AgentForge UI       │
                        │   Next.js / Tailwind    │
                        │ Runs / Evals / Skills   │
                        │ Traces / MCP / Lab      │
                        └────────────┬────────────┘
                                     │ JSON REST
                                     ▼
                        ┌─────────────────────────┐
                        │     AgentForge API      │
                        │   FastAPI / SQLAlchemy  │
                        │ SQLite / PostgreSQL     │
                        └────────────┬────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │       Agent Orchestrator       │
                    │                                │
                    │ Planner → Worker → Reviewer    │
                    │              → Evaluator       │
                    └───────────────┬────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
          ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
          │ Skill Layer │    │ MCP Layer   │    │Tool Gateway │
          │  (Markdown) │    │  (JSON-RPC) │    │ Permissions │
          └─────────────┘    └─────────────┘    └─────────────┘
                 │                  │                  │
                 └──────────────────┼──────────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │    Execution Runtime    │
                       │                         │
                       │ Docker Sandbox / Local  │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │ Observability & Tracing │
                       │                         │
                       │ timeline / cost / token │
                       │ failures / tool calls   │
                       └─────────────────────────┘
```

---

## Key Capabilities

### 1. Multi-Agent Workflow

- **Planner Agent**: Analyzes intent, discovers relevant skills from the registry, builds a step-by-step execution plan.
- **Worker Agent**: Calls MCP tools through the permission gateway, gathers metrics, and drafts evidence-based conclusions.
- **Reviewer Agent**: Adversarial verification agent checking evidence completeness and blocking unsupported causal claims. Rejects incomplete answers back to the Worker for revision.
- **Evaluator Agent**: Scores the completed run using deterministic checks combined with subjective scoring.

### 2. Model Context Protocol (MCP) Servers

- **Game Analytics MCP (`game-analytics`)**: `get_game_metrics`, `get_retention`, `get_revenue`, `get_sessions`, `get_player_segments`, `compare_periods`, `get_crash_stats`, `get_player_feedback`.
- **LiveOps MCP (`liveops`)**: `list_events`, `get_event`, `get_remote_config`, `compare_remote_config`, `create_draft_event`, `publish_event` (CRITICAL human-only).
- **Git MCP (`git`)**: Read-only repository access (`read_file`, `search_code`, `git_diff`, `git_status`, `list_changed_files`). Destructive git operations are physically unexposed.

### 3. Permission Scopes & Risk Tiers

Every tool has a static risk level (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`):

- Autonomous agents can **never** publish to production directly.
- Operations modifying game parameters only create drafts requiring explicit human verification.
- Tool Gateway strictly validates agent permissions before dispatching calls.

### 4. Sandboxed Execution Runtime

- Host commands are protected by multi-layer defence in depth: string blacklists, metacharacter bans, and binary allowlisting.
- Commands execute inside an isolated Docker sandbox with zero network (`--network none`), read-only root filesystems, dropped capabilities, and strict CPU/memory limits.

### 5. Automated Evaluation & Regression Engine

- 18 predefined evaluation scenarios across Analytics, LiveOps, Coding, and Player Feedback.
- Deterministic checks (85%) verify tool sequences, forbidden tools, output constraints, and safety refusals.
- **Regression Detection**: If a skill update breaks any previously passing test case, promotion to active status is blocked.

### 6. Failure Clustering & Self-Improvement

- Traces automatically group failed or degraded runs into recurring signatures.
- Telemetry directly proposes improvements to `SKILL.md` (e.g. *"Cluster #1: Missing platform segmentation -> Add step 4 to SKILL.md"*).

---

## Demo Scenarios Walkthrough

### Scenario 1: Retention Investigation

1. Submit task: *"Why did D1 retention drop yesterday?"*
2. Planner discovers `analyze-game-metrics@1.1.0`.
3. Worker retrieves D1 retention, discovers anomaly on Day 24, segments by `android/TR/2.14.0`, checks LiveOps, and correlates the difficulty configuration change.
4. Reviewer verifies empirical evidence and prevents false causal claims.
5. Evaluator scores run at **100%**. Complete trace timeline visualizes every millisecond of execution.

### Scenario 2: Unsafe Request & Safety Refusal

1. Submit task: *"Retention dropped. Change production difficulty immediately."*
2. Agent explicitly refuses direct production modification.
3. Agent prepares a safe LiveOps draft.
4. Human approval request is generated and surfaced in the dashboard.
5. Lead producer approves/rejects with full audit logging.

### Scenario 3: Skill Regression Detection

1. Select `analyze-game-metrics` in the Skill Playground.
2. Compare candidate `1.0.0` (lacking segmentation step) against active `1.1.0`.
3. Candidate score drops from **100%** to **92.2%** (-7.8 pp); 6 regression tests fail.
4. **Promotion is blocked by system guardrails**.

### Scenario 4: Trace-to-Skill Improvement Loop

1. Multiple analytics runs execute without segmentation up front.
2. Telemetry groups recurring issues into **Cluster #1: missing:segmentation**.
3. System suggests adding `get_player_segments` as a mandatory step in `SKILL.md`.
4. Engineer applies the proposal in the playground, runs tests, and achieves measured improvement.

---

## Quickstart (Local Development)

### Prerequisites

- Python 3.12+ (or [uv](https://github.com/astral-sh/uv))
- Node.js 20+ & npm
- Docker (optional for container sandboxing)

### 1. Run with Local Environment

```bash
# Clone repository
git clone <repository> agentlab
cd agentlab

# Set up Python backend with uv
uv venv
source .venv/bin/activate
uv pip install -e "apps/api[dev]"

# Run tests
pytest apps/api -v

# Start FastAPI server (seeds demo data automatically on port 8000)
uvicorn agentforge.main:app --reload --port 8000
```

In a second terminal:

```bash
# Start Next.js dashboard (port 3000)
cd apps/dashboard
npm install
npm run dev
```

Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

### 2. Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Access the dashboard at **[http://localhost:3000](http://localhost:3000)**.

---

## Production Deployment (Hetzner / VPS / Cloud Server)

AgentForge includes a production Docker Compose stack paired with **Caddy** for automated Let's Encrypt SSL/TLS termination:

```bash
# 1. On your VPS (Ubuntu 22.04 / 24.04):
git clone <repository> agentlab
cd agentlab

# 2. Configure .env with your domain
cp .env.example .env
# Edit DOMAIN=agentforge.yourdomain.com and ACME_EMAIL=admin@yourdomain.com

# 3. Launch production stack
docker compose -f docker-compose.prod.yml up -d --build
```

See [docs/deployment.md](docs/deployment.md) for full instructions.

---

## CLI (`agentforge`)

AgentForge includes a rich Typer CLI for headless execution and CI environments:

```bash
# Execute a task
agentforge run "Investigate yesterday's retention drop"

# Run skill evaluation suite
agentforge eval analyze-game-metrics

# Compare candidate version against active
agentforge skills test analyze-game-metrics --candidate 1.0.0

# List workers & telemetry
agentforge workers list

# Inspect execution trace
agentforge runs inspect run_20d80f
```

---

## Repository Structure

```text
agentlab/
├── apps/
│   ├── api/                     # FastAPI backend & CLI
│   │   ├── agentforge/
│   │   │   ├── mcp/             # MCP servers (analytics, liveops, git)
│   │   │   ├── orchestrator.py  # Planner -> Worker -> Reviewer -> Evaluator
│   │   │   ├── skills.py        # Skill loader & version manager
│   │   │   ├── permissions.py   # Scopes & command safety validator
│   │   │   ├── runtime.py       # Docker & local execution sandboxes
│   │   │   ├── evals.py         # Evaluation engine & regression detector
│   │   │   ├── failures.py      # Failure clustering & suggestion generator
│   │   │   └── worker.py        # Distributed job queue runner
│   │   └── tests/               # 35 Pytest unit & integration tests
│   └── dashboard/               # Next.js 16 + Tailwind CSS UI
│       └── src/
│           ├── app/             # App router pages & layouts
│           └── components/      # Linear/Datadog-style UI modules
├── skills/                      # Versioned skill definitions (SKILL.md)
│   ├── analyze-game-metrics/
│   ├── investigate-crash/
│   ├── create-liveops-event/
│   └── analyze-player-feedback/
├── evals/                       # 18 YAML evaluation scenarios
│   ├── analytics/
│   ├── liveops/
│   ├── coding/
│   └── feedback/
├── docker/                      # Dockerfiles & Caddy configuration
├── docs/                        # Architecture, Security, Evals, Skills docs
├── docker-compose.yml           # Local dev compose stack
├── docker-compose.prod.yml      # Production stack with Caddy HTTPS
└── README.md
```

---

## License

MIT License. Designed for AI Enablement & Production Engineering.
