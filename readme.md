# AgentForge

<p align="center">
  <strong>AI agents you can operate, evaluate, and trust.</strong><br />
  <em>Çalıştırabileceğiniz, değerlendirebileceğiniz ve güvenebileceğiniz yapay zekâ ajanları.</em>
</p>

<p align="center">
  <a href="#türkçe">Türkçe</a> · <a href="#english">English</a>
</p>

<p align="center">
  <img alt="Python 3.11+" src="https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white" />
  <img alt="FastAPI" src="https://img.shields.io/badge/API-FastAPI-009688?logo=fastapi&logoColor=white" />
  <img alt="Next.js 16" src="https://img.shields.io/badge/UI-Next.js%2016-111111?logo=nextdotjs&logoColor=white" />
  <img alt="Docker ready" src="https://img.shields.io/badge/Runtime-Docker-2496ED?logo=docker&logoColor=white" />
  <img alt="MCP" src="https://img.shields.io/badge/Protocol-MCP-6B4EFF" />
</p>

---

<a id="türkçe"></a>

## Türkçe

**AgentForge**, yapay zekâ ajanlarını üretimde güvenle çalıştırmak, ölçmek ve iyileştirmek için tasarlanmış bir ajan altyapısı ve değerlendirme platformudur. Bir oyun stüdyosunun analitik, LiveOps ve kod inceleme iş akışlarını; sürüm kontrollü yetenekler, MCP araçları ve insan onayı ile bir araya getirir.

### Neden AgentForge?

Demo ortamında çalışan bir ajanı, kurum genelinde güvenilir biçimde işletmek farklı bir problemdir. AgentForge bu boşluğu aşağıdaki katmanlarla kapatır:

| Katman | Sağladığı değer |
| --- | --- |
| **Orkestrasyon** | Planner → Worker → Reviewer → Evaluator iş akışı |
| **Yetenekler** | Git ile sürümlenen, yeniden kullanılabilir `SKILL.md` tanımları |
| **Güvenlik** | İzin kapsamları, risk seviyeleri ve insan onay akışları |
| **Çalışma zamanı** | Yerel veya Docker tabanlı izole yürütme |
| **Gözlemlenebilirlik** | İzler, araç çağrıları, maliyet/token verileri ve hata kümeleri |
| **Kalite** | Otomatik değerlendirmeler ve regresyon engelleri |

### Mimari

```text
┌──────────────────────────┐
│ Dashboard                │  Next.js · Runs · Evals · Skills · Traces
└────────────┬─────────────┘
             │ REST / JSON
┌────────────▼─────────────┐
│ API                      │  FastAPI · SQLAlchemy · SQLite / PostgreSQL
└────────────┬─────────────┘
             │
┌────────────▼─────────────┐
│ Agent Orchestrator       │  Planner → Worker → Reviewer → Evaluator
└───────┬─────────┬────────┘
        │         │
┌───────▼───┐ ┌───▼────────┐ ┌────────────────┐
│ Skills    │ │ MCP Servers │ │ Tool Gateway   │
│ SKILL.md  │ │ Analytics   │ │ Permissions    │
└───────────┘ │ LiveOps/Git │ │ Risk controls  │
              └────┬────────┘ └───────┬────────┘
                   └─────────┬────────┘
                             │
                   ┌─────────▼─────────┐
                   │ Execution Runtime │  Docker sandbox / local
                   └─────────┬─────────┘
                             │
                   ┌─────────▼─────────┐
                   │ Observability     │  traces · cost · failures
                   └───────────────────┘
```

### Öne çıkanlar

- **Çok ajanlı denetim:** Planner planı kurar, Worker araçları çağırır, Reviewer kanıtları zorlar, Evaluator sonucu puanlar.
- **MCP entegrasyonları:** Oyun analitiği, LiveOps ve yalnızca-okunur Git araçları aynı güvenlik geçidinden çalışır.
- **Üretim korumaları:** Araçlar `LOW`–`CRITICAL` risk sınıflarına ayrılır. Üretime yayın gibi kritik işlemler otonom ajanlara verilmez.
- **Savunma katmanları:** Komut doğrulama, izin kontrolleri, binary allowlist ve ağsız/izole Docker çalışma zamanı birlikte uygulanır.
- **Ölçülebilir iyileştirme:** Değerlendirmeler, başarısızlık kümeleri ve yetenek güncellemesi önerileri sürekli kalite döngüsü oluşturur.

### Hazır demo akışları

| Senaryo | Sistem davranışı |
| --- | --- |
| **Retention araştırması** | D1 düşüşünü segment, sürüm ve LiveOps değişiklikleriyle inceler; kanıt ile çıkarımı ayırır. |
| **Güvensiz istek** | Doğrudan üretim değişikliğini reddeder, güvenli taslak ve onay talebi oluşturur. |
| **Skill regresyonu** | Aday skill sürümünü aktif sürümle test eder; kalite gerilerse terfiyi engeller. |
| **Trace → Skill döngüsü** | Tekrarlayan hata örüntülerinden `SKILL.md` için iyileştirme önerisi üretir. |

### Hızlı başlangıç

**Gereksinimler:** Python 3.11+, Node.js 20+, npm. Docker, sandbox ve Compose akışları için isteğe bağlıdır.

```bash
git clone <repository-url> agentlab
cd agentlab

# Python API ve CLI
python -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic pyyaml httpx "psycopg[binary]" typer rich psutil pytest
export PYTHONPATH="$PWD/apps/api"
pytest apps/api/tests -v

# API: http://localhost:8000
uvicorn --app-dir apps/api agentforge.main:app --reload --port 8000
```

Başka bir terminalde:

```bash
cd agentlab/apps/dashboard
npm install
npm run dev
```

Arayüz: **http://localhost:3000**

### Docker Compose ile çalıştırma

```bash
cp .env.example .env
docker compose up --build
```

Dashboard `http://localhost:3000`, API ise `http://localhost:8000` adresinde açılır.

### CLI örnekleri

```bash
python -m agentforge.cli run "Dünkü retention düşüşünü araştır"
python -m agentforge.cli eval analyze-game-metrics
python -m agentforge.cli skills test analyze-game-metrics --candidate 1.0.0
python -m agentforge.cli workers list
python -m agentforge.cli runs inspect <run-id>
```

### Dokümantasyon

- [Mimari](docs/architecture.md)
- [Güvenlik ve sandbox](docs/security.md)
- [Değerlendirmeler](docs/evaluations.md)
- [Skill sistemi](docs/skills.md)
- [Production deployment](docs/deployment.md)

---

<a id="english"></a>

## English

**AgentForge** is an agent-infrastructure and evaluation platform for operating, measuring, and improving AI agents safely in production. It brings an AI-native game studio's analytics, LiveOps, and code-review workflows together through versioned skills, MCP tools, and human approval.

### Why AgentForge?

An agent that works in a demo still needs a dependable operating model before it can serve an organization. AgentForge provides that model:

| Layer | What it provides |
| --- | --- |
| **Orchestration** | A Planner → Worker → Reviewer → Evaluator workflow |
| **Skills** | Reusable, Git-versioned `SKILL.md` definitions |
| **Security** | Permission scopes, risk tiers, and human approval workflows |
| **Runtime** | Local or Docker-based isolated execution |
| **Observability** | Traces, tool calls, token/cost data, and failure clusters |
| **Quality** | Automated evaluations and regression gates |

### Architecture

The architecture diagram above is intentionally language-neutral: the dashboard calls a FastAPI service, which orchestrates specialized agents and exposes skills, MCP servers, and tools through a permission gateway. Runs are executed in a controlled runtime and recorded for auditability and improvement.

### Highlights

- **Multi-agent oversight:** the Planner builds a plan, the Worker uses tools, the Reviewer challenges the evidence, and the Evaluator scores the result.
- **MCP integrations:** game analytics, LiveOps, and read-only Git tools share one guarded access path.
- **Production safeguards:** every tool has a `LOW`–`CRITICAL` risk tier. Critical operations such as production publishing are never delegated to autonomous agents.
- **Defence in depth:** command validation, scoped permissions, binary allowlists, and isolated Docker execution are applied together.
- **Measured improvement:** evaluations, failure clusters, and skill-change proposals create a continuous quality loop.

### Included demo flows

| Scenario | What happens |
| --- | --- |
| **Retention investigation** | Investigates a D1 drop by segment, version, and LiveOps changes while separating evidence from inference. |
| **Unsafe request** | Refuses a direct production change and prepares a safe draft plus an approval request. |
| **Skill regression** | Tests a candidate skill against the active version and blocks promotion when quality regresses. |
| **Trace → Skill loop** | Turns recurring failure patterns into concrete `SKILL.md` improvement proposals. |

### Quick start

**Requirements:** Python 3.11+, Node.js 20+, and npm. Docker is optional for the sandbox and Compose workflows.

```bash
git clone <repository-url> agentlab
cd agentlab

# Python API and CLI
python -m venv .venv
source .venv/bin/activate
pip install fastapi "uvicorn[standard]" sqlalchemy pydantic pyyaml httpx "psycopg[binary]" typer rich psutil pytest
export PYTHONPATH="$PWD/apps/api"
pytest apps/api/tests -v

# API: http://localhost:8000
uvicorn --app-dir apps/api agentforge.main:app --reload --port 8000
```

In a second terminal:

```bash
cd agentlab/apps/dashboard
npm install
npm run dev
```

Open the dashboard at **http://localhost:3000**.

### Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

The dashboard is available at `http://localhost:3000` and the API at `http://localhost:8000`.

### CLI examples

```bash
python -m agentforge.cli run "Investigate yesterday's retention drop"
python -m agentforge.cli eval analyze-game-metrics
python -m agentforge.cli skills test analyze-game-metrics --candidate 1.0.0
python -m agentforge.cli workers list
python -m agentforge.cli runs inspect <run-id>
```

### Documentation

- [Architecture](docs/architecture.md)
- [Security & sandboxing](docs/security.md)
- [Evaluations](docs/evaluations.md)
- [Skills](docs/skills.md)
- [Production deployment](docs/deployment.md)

---

## Repository map / Depo haritası

```text
agentlab/
├── apps/
│   ├── api/              # FastAPI service, orchestration, MCP tools, CLI
│   └── dashboard/        # Next.js dashboard
├── skills/               # Versioned SKILL.md definitions
├── evals/                # Evaluation scenarios
├── docs/                 # Architecture, security, deployment documentation
├── docker/               # Dockerfiles and Caddy configuration
├── docker-compose.yml    # Local Compose stack
└── docker-compose.prod.yml
```

## License / Lisans

MIT License.
