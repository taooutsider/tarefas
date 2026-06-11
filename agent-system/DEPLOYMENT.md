# Deployment Guide — Agency Agent System

## Overview

Your containerized agency agent system is ready for production deployment. This guide covers local Docker Compose, Railway, and Fly.io.

## Local Docker Compose (Development)

### Setup

```bash
# 1. Clone and configure
git clone <your-repo>
cd agent-system
cp .env.example .env

# 2. Edit .env with your secrets
nano .env  # or your editor

# 3. Build and start
docker compose build
docker compose up -d

# 4. Check health
docker compose ps
curl http://localhost:3000/api/health
curl http://localhost:4173  # (with WEB_ACCESS_TOKEN)
```

### Access

- **Web UI**: http://localhost:4173 (set `WEB_ACCESS_TOKEN=dev` in .env for testing)
- **API**: http://localhost:3000
- **Database**: `psql -h localhost -U agency_user -d agency`

### Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f telegram
```

### Stop and Clean

```bash
# Stop containers
docker compose down

# Remove volumes (DATABASE WILL BE DELETED)
docker compose down -v
```

---

## Production: Railway.io

Railway is the easiest path for your use case — it handles secrets, auto-scaling, and persistent volumes.

### Prerequisites

1. GitHub account with your repo (private or public)
2. Railway account (https://railway.app)
3. OpenAI API key, Telegram token, web access token

### Deploy

1. **Connect GitHub**
   - Go to https://railway.app
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your agent-system repo

2. **Railway detects Dockerfile automatically**
   - It will use your Dockerfile and docker-compose.yml as reference

3. **Set Environment Variables**
   - In Railway dashboard, go to Variables
   - Add all from your `.env`:

   ```bash
   NODE_ENV=production
   LOG_LEVEL=info
   OPENAI_API_KEY=sk-...
   TELEGRAM_BOT_TOKEN=...
   WEB_ACCESS_TOKEN=<long-random-token>
   DATABASE_PASSWORD=<strong-password>
   # All model routing vars...
   ```

4. **Create PostgreSQL Service**
   - Click "Add Service" → "PostgreSQL"
   - Railway auto-generates DATABASE_URL
   - Link it to your app

5. **Configure Persistent Volume**
   - In your app settings, add volume:
     - Mount path: `/data`
     - Disk size: 10GB (adjust as needed)
   - This persists Mesh coordination and logs

6. **Deploy**
   - Push to GitHub (or use Railway's UI to redeploy)
   - Railway auto-builds and deploys
   - Check logs: **Deployments** tab

7. **Access**
   - Railway gives you a public URL
   - Web UI: `https://<your-railway-domain>`
   - API health: `https://<your-railway-domain>/api/health`

### Railway Scaling

```bash
# In Railway Dashboard:
# - Go to your app
# - Settings → Build & Deploy
# - Set "Deploy on Push" = ON
# - Redeploy URL auto-updates on git push
```

---

## Production: Fly.io

Fly.io is ideal if you need multi-region deployment or more control.

### Prerequisites

1. Fly.io account (https://fly.io)
2. `flyctl` CLI installed: `curl -L https://fly.io/install.sh | sh`

### Deploy

1. **Initialize Fly app**

   ```bash
   flyctl launch
   ```

   When prompted:
   - App name: `agency-agent-system`
   - Region: closest to your clients
   - Postgres: YES (create managed database)
   - Redis: NO (unless you add job queue later)

2. **Configure Secrets**

   ```bash
   flyctl secrets set \
     OPENAI_API_KEY=sk-... \
     TELEGRAM_BOT_TOKEN=... \
     WEB_ACCESS_TOKEN=<long-random-token> \
     NODE_ENV=production \
     LOG_LEVEL=info
   ```

3. **Deploy**

   ```bash
   flyctl deploy
   ```

4. **Monitor**

   ```bash
   flyctl logs
   flyctl status
   ```

5. **Access**

   ```bash
   flyctl open
   # Opens: https://<your-fly-domain>
   ```

---

## Environment Variables (Production Checklist)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `OPENAI_API_KEY` | ✅ | `sk-...` | OpenAI key for agents |
| `TELEGRAM_BOT_TOKEN` | ❌ | `123456:ABC-...` | Leave empty if not using Telegram |
| `WEB_ACCESS_TOKEN` | ✅ | `long-random-string-min-32-chars` | Change from dev-token |
| `NODE_ENV` | ✅ | `production` | — |
| `LOG_LEVEL` | ❌ | `info` | Defaults to info |
| `DATABASE_PASSWORD` | ✅ | `strong-password-min-16-chars` | PostgreSQL password |
| `TELEGRAM_ALLOWED_USER_IDS` | ❌ | `123456789,987654321` | Comma-separated Telegram user IDs |
| `OPENAI_*_MODEL` | ❌ | `gpt-5.5`, `gpt-5.4-mini` | Override defaults per specialist |

---

## Database Persistence

### Local (Docker Compose)

```yaml
volumes:
  pgdata:
    driver: local
```

Your data is in `pgdata/` directory. Backup it:

```bash
docker compose exec database pg_dump -U agency_user -d agency > backup.sql
```

### Railway / Fly.io

Both platforms provide managed PostgreSQL with auto-backups. In Railway:

- Data is backed up daily
- 7-day retention by default
- Access backup in Dashboard → Database → Backups

In Fly.io:

- Data is replicated across regions
- Use `flyctl postgres proxy` to backup locally:

  ```bash
  flyctl postgres proxy
  pg_dump -h localhost -U postgres -d agency > backup.sql
  ```

---

## Monitoring & Observability

### Health Checks

All services expose `/api/health`:

```bash
curl https://<your-domain>/api/health
# {"ok": true, "timestamp": "2025-01-20T12:00:00Z"}
```

Railway/Fly.io auto-detect and restart unhealthy services.

### Logs

**Railway:**
```
Dashboard → Deployments → View Logs
```

**Fly.io:**
```bash
flyctl logs
flyctl logs -f  # follow
```

### Metrics

**Railway:** Built-in CPU/memory graphs in Dashboard

**Fly.io:** 
```bash
flyctl metrics
```

---

## Scaling

### Horizontal Scaling (Multiple Replicas)

**Railway:**
- Dashboard → Settings → Auto-Deploy
- Adjust replica count (costs per replica)

**Fly.io:**
```bash
flyctl scale count=3  # 3 replicas
```

### Why Scale?

Your system has 3 independent services:
- `api` — CPU-bound (OpenAI calls, agent logic)
- `web` — I/O-bound (static serving, API proxying)
- `telegram` — I/O-bound (polling, Telegram API)

Scale `api` if agents are slow. Scale `web` if UI is sluggish.

---

## Troubleshooting

### Application won't start

**Railway/Fly.io logs:**
```bash
# Railway
Dashboard → Deployments → Recent → Logs

# Fly.io
flyctl logs
```

**Common issues:**
- Missing `OPENAI_API_KEY` — agent can't start
- `DATABASE_URL` wrong — database connection fails
- Port conflict — change `PORT` in .env

### Database connection timeout

```bash
# Railway: ensure Postgres service is deployed
# Fly.io:
flyctl postgres status
flyctl postgres attach

# Then deploy again
```

### Web UI not loading

```bash
# Check web service health
curl https://<domain>/api/health

# Verify WEB_ACCESS_TOKEN is set (not empty in production)
```

### Telegram bot not responding

- Verify `TELEGRAM_BOT_TOKEN` is set
- Check logs for polling errors
- Confirm allowed user IDs in `TELEGRAM_ALLOWED_USER_IDS`

---

## Cost Estimate (Monthly)

| Service | Railway | Fly.io |
|---------|---------|--------|
| API (1 replica, 512MB) | $7 | $5 |
| Web (1 replica, 256MB) | $7 | $3 |
| Telegram (1 replica, 256MB) | $7 | $3 |
| PostgreSQL (1GB storage) | $15 | $15 |
| **Total** | **~$36** | **~$26** |

*Prices as of early 2025. Includes bandwidth.*

---

## Next Steps

1. ✅ Deploy to Railway/Fly.io
2. 🔄 Add first real clients (CLI + web validation)
3. → Smoke test Telegram bot with real approvals
4. → Connect Google Drive for reports/client assets
5. → Add automation scheduler (weekly command-center)
6. → Monitor costs and scale as needed

---

## Support

- **Docker issues**: `docker compose logs --help`
- **Railway issues**: https://docs.railway.app
- **Fly.io issues**: https://fly.io/docs
- **Your code issues**: Check logs first, then AGENTS.md operating rules
