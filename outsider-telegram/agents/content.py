"""
General content generation helpers.
Used for news digests, trade setup formatting, subnet deep dives.
"""

from models.router import generate
from data.news import fetch_recent_news


OUTSIDER_VOICE = """You are Tao Outsider — the sharpest Bittensor analyst globally.
Your audience: crypto investors who want signal, not noise.
Tone: Direct, data-driven, no hype. Telegram markdown: *bold*, _italic_.
Max length: 300 words unless told otherwise."""


async def generate_news_digest() -> str:
    """Mid-day news digest for the Intel channel."""
    news = await fetch_recent_news(hours=12)
    if not news:
        return ""

    headlines = "\n".join(f"- {item['title']}" for item in news[:6])
    prompt = f"""Filter and summarize these Bittensor-relevant news items into a
concise Telegram post. Only include genuinely important items.
Add 1-line commentary on the most significant one.

Headlines:
{headlines}

Format:
📰 *NEWS DIGEST*

• [headline] — [1-line commentary if significant]
• [headline]
...

End with one forward-looking insight."""

    result = await generate(prompt, tier="fast", system=OUTSIDER_VOICE)
    return result


async def format_trade_setup(raw_idea: str) -> str:
    """
    Takes a raw trade idea from the founder and formats it
    as a clean, structured trade setup for the Intel channel.
    Usage: founder sends a voice note / message → this formats it.
    """
    prompt = f"""Format this raw trade idea into a clean, structured Telegram post
for Bittensor investors. Include: context, thesis, key levels if mentioned,
risk note. Keep it sharp. Never give financial advice — frame as "opportunity" or "setup".

Raw idea:
{raw_idea}

Format with Telegram bold for key numbers/terms."""

    result = await generate(prompt, tier="smart", system=OUTSIDER_VOICE)
    return f"🎯 *OPPORTUNITY ALERT*\n\n{result}"


async def generate_subnet_deep_dive(netuid: int, subnet_name: str) -> str:
    """Weekly subnet deep dive. Returns full analysis post."""
    from data.bittensor import get_subnet_emissions
    subnets = await get_subnet_emissions()
    subnet_data = next((s for s in subnets if s["netuid"] == netuid), {})

    context = f"""
Subnet: SN{netuid} — {subnet_name}
Current emission share: {subnet_data.get('emission', 'unknown')}
Alpha token price: ${subnet_data.get('price_usd', 'N/A')}
24h price change: {subnet_data.get('change_24h', 'N/A')}%
"""

    prompt = f"""Write a comprehensive weekly deep dive on Bittensor Subnet {netuid} ({subnet_name}).
Cover: what it does, its role in the ecosystem, emission dynamics,
investment considerations for dTAO alpha token, key risks, outlook.
Use Telegram markdown. Target length: 400-500 words.

Available data:
{context}

Fill in any gaps with your knowledge of this subnet."""

    result = await generate(prompt, tier="smart", system=OUTSIDER_VOICE)
    return f"🔬 *WEEKLY DEEP DIVE: SN{netuid} {subnet_name.upper()}*\n\n{result}"
