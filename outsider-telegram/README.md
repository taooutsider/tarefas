# Outsider Telegram Bot

Automated intelligence system for **Outsider Intel** and **Outsider Community** Telegram groups.

## What it does

- **06:00 UTC daily** — Posts the Daily Brief to Outsider Intel (TAO price, top subnet emissions, dTAO movers, AI-generated insights, filtered news)
- **10:00 / 14:00 / 18:00 UTC** — Posts a news digest with filtered Bittensor headlines
- **Every 15 min** — Monitors for price/subnet alerts and posts them in real-time

## Setup (5 steps, no coding)

### Step 1 — Create the Telegram Bot

1. Open Telegram, search for `@BotFather`
2. Send `/newbot` → follow instructions → copy the **bot token**
3. Add the bot as admin to both **Outsider Intel** and **Outsider Community**

### Step 2 — Get Telegram Group/Channel IDs

1. Forward any message from your channel/group to `@userinfobot`
2. It will reply with the chat ID (looks like `-1001234567890`)
3. Note the ID for Intel and separately for Community

### Step 3 — Get API Keys

| Key | Where to get it |
|-----|----------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `GROQ_API_KEY` | console.groq.com (free) |
| `GEMINI_API_KEY` | aistudio.google.com → Get API Key (free) |
| `DEEPSEEK_API_KEY` | platform.deepseek.com (very cheap) |
| `CEREBRAS_API_KEY` | cloud.cerebras.ai (free) |

You only need **at least one AI key** to run. Claude (Anthropic) is required for best quality.

### Step 4 — Deploy to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `taooutsider/tarefas` repo
3. Set **Root Directory** to `outsider-telegram`
4. Go to **Variables** tab and add all keys from `.env.example`

### Step 5 — Configure Variables in Railway

Copy all keys from `.env.example` and fill in your values in Railway's Variables panel.
The bot starts automatically on deploy.

## Manual triggers (coming soon)

To manually trigger a trade setup or opportunity alert, you'll be able to message the bot directly.

## File structure

```
outsider-telegram/
├── main.py               # entry point
├── config.py             # reads env vars
├── models/router.py      # multi-model AI (Claude, DeepSeek, Groq, Gemini, Cerebras)
├── data/bittensor.py     # on-chain data (Taostats + CoinGecko)
├── data/news.py          # RSS news aggregator
├── agents/daily_brief.py # flagship daily content
├── agents/alerts.py      # real-time on-chain alerts
├── agents/content.py     # news digests + trade setup formatter
├── telegram/publisher.py # posts to Intel + Community
└── scheduler/jobs.py     # all scheduled jobs
```

## AI Model Routing

| Task | Model | Cost |
|------|-------|------|
| Alerts, news formatting | Cerebras `llama-3.3-70b` | Free |
| Daily brief insights | Gemini 2.5 Flash / DeepSeek V3 | Free / ~$0 |
| Deep dives, trade setups | Claude Opus 4.6 | ~$0.05/post |

Total estimated AI cost: **< $50/month** at full automation.
