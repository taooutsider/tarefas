"""
Daily Brief agent.
Runs at 06:00 UTC. Generates the flagship daily content for Outsider Intel.
"""

from datetime import datetime, timezone
from data.bittensor import get_snapshot
from data.news import fetch_recent_news
from models.router import generate


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

    # Format price line
    change_emoji = "🟢" if tao["change_24h"] >= 0 else "🔴"
    price_line = (
        f"*TAO* ${tao['price_usd']:,.2f} "
        f"{change_emoji} {tao['change_24h']:+.2f}% | "
        f"MCap ${tao['market_cap'] / 1e9:.2f}B"
    )

    # Format top subnets
    subnet_lines = ""
    for s in top_subnets[:5]:
        subnet_lines += f"• *SN{s['netuid']}* {s['name']}: {s['emission']:.2%} emission\n"

    # Format dTAO movers
    mover_lines = ""
    for m in movers[:4]:
        sign = "+" if m["change_24h"] >= 0 else ""
        mover_lines += f"• *SN{m['netuid']}* {m['name']}: {sign}{m['change_24h']:.1f}%\n"

    # Format news headlines
    news_lines = ""
    for item in news[:4]:
        news_lines += f"• [{item['title'][:70]}]({item['link']})\n"

    today = datetime.now(timezone.utc).strftime("%B %d, %Y")

    # Build context for Claude to generate insights
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

    brief = f"""🧠 *OUTSIDER INTEL — Daily Brief*
📅 {today} · UTC

━━━━━━━━━━━━━━━━━━━━━━
💰 *MARKET*
{price_line}

━━━━━━━━━━━━━━━━━━━━━━
⚡ *TOP SUBNET EMISSIONS*
{subnet_lines.strip()}

━━━━━━━━━━━━━━━━━━━━━━
📊 *dTAO ALPHA MOVERS*
{mover_lines.strip() if mover_lines else "• No price data available"}

━━━━━━━━━━━━━━━━━━━━━━
🔍 *KEY SIGNALS*
{insights}

━━━━━━━━━━━━━━━━━━━━━━
📰 *FILTERED NEWS*
{news_lines.strip() if news_lines else "• No relevant news in last 24h"}

━━━━━━━━━━━━━━━━━━━━━━
💬 Discussion → @OutsiderCommunity"""

    return brief
