"""
Daily Brief agent.
Runs at 06:00 UTC. Generates the flagship daily content for Outsider Intel.
"""

from datetime import datetime, timezone
from data.bittensor import get_snapshot
from data.news import fetch_recent_news
from models.router import generate
from templates.messages import full_daily_brief


SYSTEM_PROMPT = """You are the AI brain of Tao Outsider — the world's premier
Bittensor intelligence community. Your job is to write sharp, data-driven
daily briefs for investors in the Bittensor/dTAO ecosystem.

Tone: Direct. Intelligent. No hype. No fluff. Sound like the smartest person
in the room who also happens to be readable. Think Bloomberg Terminal meets
crypto native.

Format: Always use Telegram-compatible markdown (bold = *text*, no # headers).
Keep total length under 600 words."""


async def build_daily_brief() -> str:
    snapshot = await get_snapshot()
    news = await fetch_recent_news(hours=24)

    tao = snapshot["tao"]
    top_subnets = snapshot["top_subnets"]
    movers = snapshot["dtao_movers"]
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")

    context = f"""
DATA FOR TODAY ({today}):

TAO Price: ${tao['price_usd']:,.2f} ({tao['change_24h']:+.2f}% 24h)
Volume 24h: ${tao['volume_24h']:,.0f}

Top Subnets by Emission:
{chr(10).join(f"SN{s['netuid']} {s['name']}: {s['emission']:.2%}" for s in top_subnets[:5])}

dTAO Alpha Token Movers:
{chr(10).join(f"SN{m['netuid']} {m['name']}: {m['change_24h']:+.1f}% (${m['price_usd']:.4f})" for m in movers[:4])}

Recent news headlines:
{chr(10).join(item['title'] for item in news[:6])}
"""

    insights_prompt = f"""Based on this Bittensor ecosystem data, write 3-4 sharp strategic insights
for investors. Focus on: what the data is telling us, what to watch, any notable patterns.
Each insight is 1-2 sentences. Use Telegram bold (*text*) for key terms.

{context}

Write only the insights section — no intro, no conclusion. Start directly with bullet points (•)."""

    insights = await generate(insights_prompt, tier="medium", system=SYSTEM_PROMPT)

    return full_daily_brief(
        price=tao["price_usd"],
        change=tao["change_24h"],
        mcap=tao["market_cap"],
        subnets=top_subnets,
        movers=movers,
        insights=insights,
        news_items=news,
    )
