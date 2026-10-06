# AgentForge System Architecture

AgentForge is a production-grade AI enablement and agent infrastructure platform designed for an AI-native game studio.

## Architectural Layers

```text
                        ┌─────────────────────────┐
                        │     AgentForge UI       │
                        │ Next.js / Tailwind CSS  │
                        │ Traces / Evals / Skills │
                        └────────────┬────────────┘
                                     │ JSON REST
                                     ▼
                        ┌─────────────────────────┐
                        │     AgentForge API      │
                        │ FastAPI / Pydantic v2   │
                        │ SQLite / PostgreSQL     │
                        └────────────┬────────────┘
                                     │
                                     ▼
                     ┌────────────────────────────────┐
                     │       Agent Orchestrator       │
                     │ Planner → Worker → Reviewer    │
                     │              → Evaluator       │
                     └───────────────┬────────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  │                  │                  │
                  ▼                  ▼                  ▼
           ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
           │ Skill Layer │    │ MCP Layer   │    │ Tool Gateway│
           │ (Markdown)  │    │ (JSON-RPC)  │    │ Permissions │
           └─────────────┘    └─────────────┘    └─────────────┘
                                                        │
                                                        ▼
                                           ┌─────────────────────────┐
                                           │    Execution Sandbox    │
                                           │   Docker / Isolated     │
                                           └─────────────────────────┘
```

## Core Components

### 1. Multi-Agent Orchestration
- **Planner Agent**: Decomposes user tasks, matches intent against registered skills, constructs a concrete execution plan.
- **Worker Agent**: Carries out the plan by invoking tools through the secure gateway and drafts evidence-based artifacts.
- **Reviewer Agent**: Adversarial verification agent checking evidence sufficiency, unverified causal claims, and security boundaries. Rejects incomplete answers back to the Worker for revision.
- **Evaluator Agent**: Evaluates the completed run using deterministic checks and scoring heuristics.

### 2. Model Routing
Model selection is decoupled from code. Roles map to abstract model categories:
- `planner` -> Strong reasoning model (`strong-reasoning`)
- `worker` -> Balanced execution model (`balanced`)
- `reviewer` -> Independent adversarial reviewer (`independent-reviewer`)
- `evaluator` -> Deterministic verification + LLM judge (`deterministic+judge`)

### 3. Provider Independence
Provider adapters implement `AgentProvider`:
- `MockProvider`: Deterministic, offline, zero-token cost for CI and repeatable demos.
- `OpenAIProvider`: Direct API integration for GPT models.
- `AnthropicProvider`: Direct API integration for Claude models.
- `GeminiProvider`: Direct API integration for Gemini models.
