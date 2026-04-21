# Tao Outsider — Full Global Strategy

> Version 2.0 | April 2026  
> **Mission**: Become the world's #1 data-driven content hub for the Bittensor ecosystem,
> using content as the top-of-funnel for a premium paid community.

---

## 1. ECOSYSTEM OVERVIEW

```
DATA SOURCES (on-chain + market)
         │
         ▼
   AI AGENTS  ←────────────────────────────────┐
         │                                      │
         ├──► TWITTER/X  (6-7 posts/day)        │
         │         │                            │
         ├──► BLOG  (3-5 posts/week, SEO)       │
         │         │                            │
         ├──► WEBSITE  (institutional)          │
         │         │                            │
         └──► PUBLIC TELEGRAM  (free preview)   │
                   │                            │
                   ▼                            │
         PAID TELEGRAM GROUP ─── data/analysis──┘
         (core product / revenue)
```

**Everything funnels into the paid group.**
Free content is a sample. The promise:
*"What you see for free is 10% of what's inside."*

---

## 2. CORE PRODUCT — PAID TELEGRAM GROUP

### 2.1 Positioning

> "The only global community delivering real-time on-chain intelligence
> and strategic analysis of the Bittensor ecosystem — curated for investors
> who move before the crowd."

### 2.2 Channel Structure Inside the Group

| Channel | Content | Frequency |
|---------|---------|-----------|
| `#daily-brief` | Day summary: emissions, stake movements, subnet highlights | Daily |
| `#weekly-deep-dives` | One subnet analyzed in depth per week | Weekly |
| `#onchain-alerts` | Bot-triggered alerts (stake >10k TAO, new subnet reg., etc.) | Real-time |
| `#dtao-tracker` | Subnet alpha token performance dashboard | Daily |
| `#ask-anything` | Questions answered by founder + AI | Daily |
| `#model-portfolio` | Allocation model with full rationale | Weekly |
| `#live-calls` | Voice/video live sessions | Bi-weekly |
| `#filtered-news` | Only what matters — no noise | Daily |
| `#education-hub` | Structured learning path from zero to advanced | Permanent |

### 2.3 Pricing (USD)

| Plan | Price | Savings |
|------|-------|---------|
| Monthly | $39/month | — |
| Quarterly | $99/quarter | ~15% off |
| Annual | $349/year | ~25% off |

> TAO pricing equivalent updates weekly based on spot price.
> At ~$325/TAO: Monthly ≈ 0.12 TAO · Quarterly ≈ 0.30 TAO · Annual ≈ 1.07 TAO

### 2.4 Payment Infrastructure

#### USD Payments (Credit/Debit Card, Bank)
- **Stripe Billing** — subscriptions, webhooks, dunning management
- Supports 135+ currencies with automatic settlement in USD
- Stripe-hosted checkout page (no PCI compliance work needed)

#### Stablecoin Payments (USDT / USDC)
- **Stripe Crypto** (via Crypto.com integration, live 2026) — accepts USDT/USDC and settles in USD
- Alternatively: **NOWPayments** — 350+ coins, hosted invoice page, auto-conversion to USD

#### TAO Payments (Native Bittensor Token)
Since no mainstream processor natively supports TAO on the Bittensor Substrate chain,
we build a lightweight custom payment service:

```
User requests TAO payment
         │
         ▼
Bot generates unique SS58 deposit address per user
         │
         ▼
User sends TAO to that address
         │
         ▼
AsyncSubtensor polls / listens for transfer event
         │
         ▼
On confirmation → Stripe webhook equivalent fires
         │
         ▼
Bot sends one-time Telegram invite link (member_limit=1)
         │
         ▼
Subscription tracked in DB (user_id, expires_at, plan)
         │
         ▼
On expiry → bot removes user + sends renewal message
```

**Core libraries:**
```python
pip install bittensor bittensor-wallet python-telegram-bot
```

**Address generation per user:**
```python
import bittensor_wallet as btw

def get_deposit_address(user_id: int) -> str:
    wallet = btw.Wallet(name=f"deposit_{user_id}", hotkey="main")
    wallet.create_if_non_existent(coldkey_use_password=False, hotkey_use_password=False)
    return wallet.coldkeypub.ss58_address
```

**Balance verification:**
```python
import asyncio
import bittensor as bt

async def payment_confirmed(address: str, expected_tao: float) -> bool:
    async with bt.AsyncSubtensor(network="finney") as sub:
        balance = await sub.get_balance(address)
        return balance.tao >= expected_tao
```

**Telegram access grant (aiogram / python-telegram-bot):**
```python
async def grant_access(bot, chat_id: int, user_id: int):
    link = await bot.create_chat_invite_link(
        chat_id=chat_id,
        member_limit=1,
        expire_date=None
    )
    await bot.send_message(user_id, f"Payment confirmed! Join here: {link.invite_link}")
```

**Price conversion** (always show TAO equivalent in real-time):
```python
import requests

def tao_price_usd() -> float:
    r = requests.get(
        "https://api.coingecko.com/api/v3/simple/price",
        params={"ids": "bittensor", "vs_currencies": "usd"},
        timeout=5
    )
    return r.json()["bittensor"]["usd"]

def usd_to_tao(usd: float) -> float:
    return round(usd / tao_price_usd(), 4)
```

**Payment router (unified flow):**

| Method | Tool | Settlement |
|--------|------|-----------|
| Credit/Debit Card | Stripe Billing | USD |
| USDT / USDC | Stripe Crypto or NOWPayments | USD |
| TAO | Custom bot + AsyncSubtensor | TAO → hold or swap |

---

## 3. CONTENT STRATEGY — TWITTER/X

### 3.1 Goal

Be the loudest, smartest English-language voice on Bittensor.
Every post is a mini proof-of-intelligence that ends with a pull toward the paid group.

### 3.2 Daily Post Mix (6-7 posts)

| Type | Count/day | Format | Example |
|------|-----------|--------|---------|
| On-chain data drop | 1 | Text + chart | "Subnet 8 (Taoshi) captured X% of emissions today. Here's why it matters..." |
| Educational thread | 1 | 5-8 tweet thread | "What is dTAO and why it changes everything in Bittensor [thread]" |
| Opinion / take | 1 | Short text | Hot take on ecosystem move |
| News filter | 1 | Short text | Breaking ecosystem news, filtered + commented |
| Strategic repost | 1 | Quote + commentary | Turn a dev update into investor insight |
| Culture / meme | 1 | Image/short video | Engagement and personality |
| Direct CTA | 1 | Text | Explicit invite to paid group |

### 3.3 Automation Pipeline

```
06:00 — Python bot pulls metagraph (top 10 subnets)
06:15 — Pulls TAO price + volume + dTAO alpha token data
06:30 — Claude API generates: morning tweet + daily brief for group
07:00 — Tweet #1 published (data drop)
08:00 — Daily brief auto-posted inside paid group
10:00 — Tweet #2 (educational thread)
12:00 — Tweet #3 (news filter)
15:00 — Tweet #4 (opinion/take)
17:00 — Bot scans for on-chain anomalies
18:00 — Tweet #5 (afternoon)
20:00 — Alert in group if significant on-chain event
21:00 — Tweet #6 (meme/culture)
22:00 — Tweet #7 (CTA for paid group)
```

**Tools:**
- Content generation: Claude API (`claude-opus-4-6`)
- Scheduling: Typefully (best for threads) or Buffer
- Publishing: Twitter API v2

---

## 4. SEO BLOG

### 4.1 Goal

Own Google for English Bittensor searches. The blog is the biggest long-term asset —
evergreen content that generates inbound leads 24/7 without ad spend.

### 4.2 Platform

- **Recommended**: Ghost (blog + newsletter + membership native) — clean API for automation
- **Alternative**: Next.js + MDX (full control, SSG for speed)
- **Domain**: `taooutsider.com`

### 4.3 Content Categories & Target Keywords

| Category | Post Examples | Intent |
|----------|-------------|--------|
| **What is** | "What is Bittensor?", "What is TAO token?" | Informational / top funnel |
| **How it works** | "How Bittensor mining works", "What are subnets?" | Educational |
| **Investment** | "Is TAO a good investment?", "How to buy TAO" | Transactional |
| **dTAO** | "What is Dynamic TAO?", "How subnet alpha tokens work" | Trending |
| **Subnets** | "Subnet 8 Taoshi: complete guide", "Best subnets for staking" | Comparative |
| **Staking** | "How to stake TAO", "Best Bittensor validators 2026" | Transactional |
| **Analysis** | "Bittensor ecosystem monthly analysis" | Authority |
| **News** | "Bittensor news [month year]" | Freshness |

### 4.4 Content Production with AI Agents

```
1. Keyword research (Ahrefs / Semrush / Google Search Console)
2. Automated brief: on-chain context + ecosystem snapshot
3. Draft generation: Claude API (Opus — best for long-form)
4. Human review: 15-20 min per post
5. Auto-publish via Ghost API
6. Auto-distribute: RSS → Twitter thread → Telegram group snippet
```

**Volume:** 3-5 posts/week for first 3 months → 2-3/week for maintenance

**SEO tech:**
- Schema markup (Article, FAQ, HowTo, BreadcrumbList)
- Core Web Vitals optimized
- Google Search Console + Bing Webmaster connected
- Internal linking map maintained by agent

---

## 5. INSTITUTIONAL WEBSITE

### 5.1 Pages

| Page | Content |
|------|---------|
| `/` (Home) | Value prop + CTA to paid group |
| `/about` | Founder story, mission, credentials |
| `/community` | Paid group sales page (pricing, testimonials, FAQ) |
| `/blog` | Blog hub (link or embedded) |
| `/services` | Custom reports, consulting (future) |
| `/contact` | Form + social links |

### 5.2 Tech Stack

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS
- **Deploy**: Vercel (free tier → Pro as traffic grows)
- **CMS**: Sanity.io or Contentful (founder edits without code)
- **Analytics**: Plausible Analytics (privacy-first, GDPR-ready)
- **Email capture**: Resend + custom form → nurture sequence

---

## 6. AI AGENT ARCHITECTURE

### 6.1 Overview

```
┌──────────────────────────────────────────────┐
│              CENTRAL ORCHESTRATOR            │
│         n8n (self-hosted) or Airflow         │
└──────────┬───────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                     │
    ▼                                     ▼
DATA AGENT                         CONTENT AGENT
(collects & processes)             (generates & distributes)
    │                                     │
    ├─ Bittensor SDK                      ├─ Claude API (Anthropic)
    ├─ Taostats API                       ├─ Typefully / Buffer API
    ├─ CoinGecko API                      ├─ Ghost API
    ├─ Twitter API (monitoring)           ├─ Telegram Bot API
    ├─ GitHub Opentensor (RSS)            └─ Resend (email)
    └─ Bittensor Discord (webhooks)
```

### 6.2 Full Technology Stack

| Layer | Tool | Cost/month |
|-------|------|-----------|
| Orchestration | n8n (self-hosted on VPS) | ~$10 |
| Text generation | Claude API (claude-opus-4-6) | ~$40-60 |
| Image generation | Ideogram API or DALL-E 3 | ~$20 |
| Twitter scheduling | Typefully Pro | $18 |
| On-chain data | Bittensor SDK + RPC | $0 |
| Market data | CoinGecko Free Tier | $0 |
| Blog hosting | Ghost Pro or Vercel | $9-25 |
| Agent hosting | Railway or Render | $10 |
| Payments (card) | Stripe | 2.9% + $0.30/txn |
| Payments (crypto) | NOWPayments | 0.5% |
| Monitoring | UptimeRobot | $0 |
| DB (subscriptions) | Supabase Free | $0 |
| **Total fixed** | | **~$107-143/mo** |

---

## 7. DATA SOURCES

### 7.1 On-Chain (Free)

| Source | What it provides | Access |
|--------|----------------|--------|
| Bittensor Python SDK | Metagraph, emissions, stake, weights | `pip install bittensor` |
| Subtensor RPC | Raw blockchain data | `wss://entrypoint-finney.opentensor.ai:443` |
| Taostats | Aggregated subnet dashboard, historical data | Web API (inspect endpoints) |
| Subscan | Transactions, blocks, history | `bittensor.subscan.io/api` |

### 7.2 Market Data

| Source | What it provides | API |
|--------|----------------|-----|
| CoinGecko | TAO price, volume, market cap | Free tier |
| Binance API | Real-time TAO price | Free |
| CoinMarketCap | Alternative market data | Free tier |

### 7.3 News & Community Monitoring

| Source | What it provides | How to monitor |
|--------|----------------|----------------|
| Twitter/X | Ecosystem moves, influencer activity | Twitter API v2 |
| Bittensor Discord | Official announcements | Webhook + bot |
| GitHub opentensor | Technical updates, PRs | GitHub API / RSS |
| Bittensor Docs | Documentation updates | RSS crawler |

---

## 8. EXECUTION ROADMAP

### Phase 0 — Foundation (Weeks 1-2)

- [ ] Register `taooutsider.com`
- [ ] Create accounts: Twitter/X, YouTube, Telegram
- [ ] Set up VPS (Railway or Render) for agents
- [ ] Create Anthropic API account
- [ ] Set up n8n instance
- [ ] Install and test Bittensor SDK locally
- [ ] Create private GitHub repo for all agent code
- [ ] Set up Stripe account (USD payments)
- [ ] Set up Supabase database (subscription tracking)

### Phase 1 — MVP Content (Weeks 3-6)

- [ ] Launch single landing page website (CTA to join waitlist)
- [ ] Set up Ghost blog
- [ ] Write 10 pillar SEO posts (manual + AI assisted)
- [ ] Activate Twitter automation pipeline (3 posts/day to start)
- [ ] Create free public Telegram channel (free preview)
- [ ] First 20 tweets manually (warm up account)

### Phase 2 — Paid Group Launch (Weeks 7-10)

- [ ] Build and test TAO payment bot (Python + AsyncSubtensor)
- [ ] Integrate Stripe for card payments
- [ ] Configure paid group channel structure
- [ ] Set up automated analysis pipelines feeding the group
- [ ] 7-day launch campaign on Twitter (high-intensity content)
- [ ] **Target: 50 paying members in month 1**

### Phase 3 — Scale & Full Automation (Months 3-6)

- [ ] Full 6-7 posts/day automated Twitter pipeline
- [ ] Blog: 3-5 posts/week via agent + review
- [ ] Internal metrics dashboard (MRR, churn, engagement)
- [ ] First partnerships (Bittensor projects, validators, exchanges)
- [ ] YouTube: 1 video/week (AI-generated script + editing)
- [ ] **Target: 200-500 paying members**

### Phase 4 — Authority & Diversification (Months 6-12)

- [ ] Automated weekly on-chain newsletter
- [ ] Premium monthly reports (additional product, $99/report)
- [ ] Consulting for ecosystem projects
- [ ] Possible subnet index / model portfolio tracker (SaaS product)
- [ ] **Target: 1,000+ paying members → $39k+ MRR**

---

## 9. STRATEGIC PARTNERSHIPS

| Partner | Why | How to approach |
|---------|-----|----------------|
| **Taostats** | Largest data source, credibility | Data partnership / co-marketing |
| **Taoshi (SN8)** | Trading subnet, perfectly aligned audience | Interviews, joint content |
| **Neural Internet (SN27)** | GPU compute, large community | Educational content |
| **Top validators** | Technical authority, community trust | Interviews, guest posts |
| **Global crypto media** | Distribution (Decrypt, CoinDesk, etc.) | Guest articles |
| **Crypto Twitter KOLs** | Distribution to new audiences | Collab posts, spaces |
| **Exchanges listing TAO** | Affiliate programs (Binance, Bitget, etc.) | Affiliate partnerships |

---

## 10. METRICS & KPIs

### Content
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|
| Twitter followers | 2,000 | 10,000 | 50,000 |
| Monthly tweet impressions | 500k | 2M | 10M |
| Monthly organic blog visits | 2,000 | 15,000 | 80,000 |
| Google-indexed posts | 20 | 80 | 200 |

### Product
| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|
| Paying members | 50 | 250 | 1,000 |
| MRR (USD) | $1,950 | $9,750 | $39,000 |
| Monthly churn | < 8% | < 5% | < 4% |
| NPS | > 30 | > 50 | > 60 |

### Automation
| Metric | Target |
|--------|--------|
| % content AI-generated (with human review) | 75% |
| Daily human operation time | < 2 hours |
| Agent uptime | > 99% |

---

## 11. FULL TECH ARCHITECTURE

```
┌─────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE                        │
│  Railway/Render  — Python agents                        │
│  Vercel          — Website + blog (Next.js)             │
│  Supabase        — Subscription DB (PostgreSQL)         │
│  GitHub          — Agent code (private repo)            │
│  Cloudflare      — DNS + DDoS protection                │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                      DATA & AI                           │
│  Bittensor SDK   — Metagraph, emissions, stake          │
│  CoinGecko API   — Price, volume, market cap            │
│  Taostats API    — Aggregated subnet data               │
│  Claude API      — All content generation               │
│  Ideogram API    — Post images and graphics             │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                   DISTRIBUTION                           │
│  n8n             — Orchestrates all automated flows     │
│  Typefully       — Twitter scheduling & publishing      │
│  Ghost API       — Auto-publish blog posts              │
│  Telegram Bot    — Group access + daily drops           │
│  Resend          — Email marketing / newsletter         │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────┴──────────────────────────────┐
│                   MONETIZATION                           │
│  Stripe Billing  — Card subscriptions (USD)             │
│  Stripe Crypto   — USDT/USDC stablecoin payments        │
│  NOWPayments     — Crypto backup / TAO fallback         │
│  Custom TAO Bot  — Native TAO payment + verification    │
│  Telegram Bot    — Auto access grant/revoke             │
└─────────────────────────────────────────────────────────┘
```

---

## 12. IMMEDIATE NEXT STEPS (This Week)

1. **Today** — Define Twitter/X handle and create account
2. **Today** — Register `taooutsider.com` domain
3. **Tomorrow** — Create Anthropic API + Railway + Stripe accounts
4. **This week** — Write first 5 tweets manually (warm up account)
5. **This week** — Install Bittensor SDK locally, run first metagraph queries
6. **This week** — Create public Telegram channel (free preview)
7. **This week** — Scaffold Python payment bot (address generation + balance check)

---

*Living document — updated as the project evolves.*
