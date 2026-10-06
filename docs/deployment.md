# Production Deployment Guide (Hetzner / VPS / Cloud VM)

This guide walks through deploying AgentForge to a live cloud server using Docker Compose and Caddy for automated HTTPS certificate issuance.

## Prerequisites

- A single VPS instance (e.g. Hetzner CX22/CX32, DigitalOcean Droplet, Ubuntu 22.04/24.04).
- A domain name pointing to the VPS IP via DNS `A` records (e.g., `agentforge.yourdomain.com`).
- Ports `80` and `443` open in the firewall.

## Step 1: Server Setup

SSH into your server and install Docker and Docker Compose:

```bash
# Update packages
sudo apt-get update && sudo apt-get install -y git curl

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

## Step 2: Clone Repository

```bash
git clone <your-repository-url> agentlab
cd agentlab
```

## Step 3: Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your domain and database credentials:

```bash
# Set your domain and email for automated Let's Encrypt SSL
DOMAIN=agentforge.yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Secure database password
POSTGRES_USER=agentforge
POSTGRES_PASSWORD=generate_strong_secret_password_here
POSTGRES_DB=agentforge

# AI Provider (mock for offline, or openai / anthropic / gemini)
AGENTFORGE_PROVIDER=mock
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=...
```

## Step 4: Launch Production Stack

Run the production Docker Compose stack with Caddy reverse proxy:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify container status:

```bash
docker compose -f docker-compose.prod.yml ps
```

Containers launched:
- `caddy`: Automatic SSL on ports 80/443, routing `/api/*` to FastAPI and `/*` to Next.js.
- `dashboard`: Production Next.js UI on port 3000.
- `api`: FastAPI service on port 8000.
- `worker`: Background execution worker processing queued jobs.
- `postgres`: PostgreSQL 16 database.
- `redis`: Redis message broker.

## Step 5: Access the Dashboard

Open your browser to:

```text
https://agentforge.yourdomain.com
```

The system will automatically initialize the database schema and seed realistic 30-day game data and baseline evaluation scores.
