# Docker Compose Setup

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your secrets:
# - OPENAI_API_KEY
# - TELEGRAM_BOT_TOKEN
# - WEB_ACCESS_TOKEN (change from dev-token)
```

### 2. Build and start

```bash
# Build images
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

### 3. Access

- **Web UI**: http://localhost:4173 (access token required)
- **API**: http://localhost:3000/api/health
- **Telegram**: Use your bot token with the agent
- **PostgreSQL**: localhost:5432 (user: agency_user)

## Architecture

```
┌─────────────────┐
│   PostgreSQL    │
│   (pgdata vol)  │
└────────┬────────┘
         │
    ┌────┴──────┬──────────┬──────────┐
    ▼           ▼          ▼          ▼
┌──────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
│   API    │ │ Web  │ │Telegram│ │ (future) │
│ :3000   │ │:4173 │ │polling │ │ Worker   │
└──────────┘ └──────┘ └────────┘ └──────────┘
```

## Services

### api (port 3000)
- Central orchestrator
- AgentRuntime + specialist agents
- OpenAI Agents SDK
- Serves `/api/jobs`, `/api/snapshot`, `/api/health`

### web (port 4173)
- React UI (Agency Command)
- Static file server
- Calls api:3000 internally
- Requires `WEB_ACCESS_TOKEN`

### telegram
- Telegram bot polling service
- Calls api:3000 internally
- No exposed port (uses polling)

### database
- PostgreSQL 16
- Volume: `pgdata`
- Auto-initialized with schema

## Environment Variables

See `.env.example` for all options. Key ones:

```bash
# Required
OPENAI_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=...
WEB_ACCESS_TOKEN=long-secret-token

# Optional (defaults provided)
NODE_ENV=production
LOG_LEVEL=info
DATABASE_PASSWORD=agency_dev_password
```

## Development

For local development without Docker:

```bash
npm install
npm run build
WEB_ACCESS_TOKEN=dev npm run web:start
# In another terminal:
npm run api:server
# In another terminal:
npm run bot:server
```

## Scaling

To scale the web service:

```bash
docker compose up -d --scale web=3
```

This runs 3 instances behind a load balancer (add nginx in docker-compose if needed).

## Health Checks

Each service includes health check endpoints:

```bash
# API health
curl http://localhost:3000/api/health

# Web health
curl http://localhost:4173/api/health

# Database health
pg_isready -h localhost -U agency_user -d agency
```

## Persistence

- **PostgreSQL data**: `pgdata/` volume (auto-managed)
- **Local files**: `./data/` mounted in all services
- **Mesh coordination**: `./data/codex-mesh/`

## Troubleshooting

### Services stuck in restart loop
```bash
docker compose logs --tail=50
docker compose restart
```

### Database connection fails
```bash
docker compose exec database psql -U agency_user -d agency
```

### Clear everything and restart
```bash
docker compose down -v  # -v removes volumes
docker compose up --build
```

## Next Steps

1. ✅ Containerization complete
2. 🔄 Migrate SQLite → PostgreSQL (config.ts update needed)
3. → Add Redis for job queue (optional, for scale)
4. → Deploy to Railway/Fly.io with persistent volume
