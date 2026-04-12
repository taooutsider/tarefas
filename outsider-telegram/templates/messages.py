"""
Message templates for all automated content types.
Edit these to change the voice/format without touching logic.
"""

from datetime import datetime, timezone


def daily_brief_header(date: str) -> str:
    return f"🧠 *OUTSIDER INTEL — Daily Brief*\n📅 {date} · UTC"


def price_block(price: float, change: float, mcap: float) -> str:
    emoji = "🟢" if change >= 0 else "🔴"
    sign = "+" if change >= 0 else ""
    return (
        f"💰 *MARKET*\n"
        f"*TAO* ${price:,.2f} {emoji} {sign}{change:.2f}% "
        f"| MCap ${mcap / 1e9:.2f}B"
    )


def subnet_emissions_block(subnets: list[dict]) -> str:
    lines = "\n".join(
        f"• *SN{s['netuid']}* {s['name']}: {s['emission']:.2%}"
        for s in subnets[:5]
    )
    return f"⚡ *TOP SUBNET EMISSIONS*\n{lines}"


def dtao_movers_block(movers: list[dict]) -> str:
    if not movers:
        return "📊 *dTAO ALPHA MOVERS*\n• No price data available"
    lines = "\n".join(
        f"• *SN{m['netuid']}* {m['name']}: "
        f"{'+'if m['change_24h']>=0 else''}{m['change_24h']:.1f}% "
        f"(${m['price_usd']:.4f})"
        for m in movers[:4]
    )
    return f"📊 *dTAO ALPHA MOVERS*\n{lines}"


def news_block(news_items: list[dict]) -> str:
    if not news_items:
        return "📰 *FILTERED NEWS*\n• No relevant news in last 24h"
    lines = "\n".join(
        f"• [{item['title'][:72]}]({item['link']})"
        for item in news_items[:4]
    )
    return f"📰 *FILTERED NEWS*\n{lines}"


DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━"


def full_daily_brief(
    price: float,
    change: float,
    mcap: float,
    subnets: list[dict],
    movers: list[dict],
    insights: str,
    news_items: list[dict],
    community_handle: str = "@OutsiderCommunity",
) -> str:
    date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    parts = [
        daily_brief_header(date),
        DIVIDER,
        price_block(price, change, mcap),
        DIVIDER,
        subnet_emissions_block(subnets),
        DIVIDER,
        dtao_movers_block(movers),
        DIVIDER,
        f"🔍 *KEY SIGNALS*\n{insights}",
        DIVIDER,
        news_block(news_items),
        DIVIDER,
        f"💬 Discussion → {community_handle}",
    ]
    return "\n\n".join(parts)


def price_alert(current: float, change_pct: float, ai_commentary: str) -> str:
    direction = "surging 🚀" if change_pct > 0 else "dropping 🔻"
    return (
        f"⚡ *PRICE ALERT*\n\n"
        f"TAO is *{direction}* {change_pct:+.1f}% → *${current:,.2f}*\n\n"
        f"{ai_commentary}"
    )


def subnet_alert(netuid: int, name: str, change_pct: float, price: float) -> str:
    emoji = "📈" if change_pct > 0 else "📉"
    return (
        f"{emoji} *dTAO ALERT — SN{netuid} {name}*\n\n"
        f"Alpha token: *{change_pct:+.1f}%* → ${price:.4f}\n"
        f"_Monitor position sizing accordingly._"
    )


def trade_setup_template(formatted_content: str) -> str:
    return f"🎯 *OPPORTUNITY ALERT*\n\n{formatted_content}"


def deep_dive_template(netuid: int, name: str, content: str) -> str:
    return f"🔬 *WEEKLY DEEP DIVE*\n*SN{netuid} — {name.upper()}*\n\n{content}"


def payment_instructions(
    plan: str,
    usd: float,
    amount_tao: float,
    address: str,
    expires_in: str,
) -> str:
    return (
        f"💳 *Payment Instructions — {plan.capitalize()} Plan*\n\n"
        f"Amount: *{amount_tao} TAO* (~${usd})\n"
        f"Send to:\n`{address}`\n\n"
        f"⏳ Address valid for: {expires_in}\n"
        f"✅ Access granted automatically after confirmation.\n\n"
        f"_Price locked at current TAO rate. "
        f"Send exact amount or more._"
    )


def welcome_message(plan: str, expires_date: str) -> str:
    return (
        f"🎉 *Welcome to Outsider Intel!*\n\n"
        f"Your *{plan.capitalize()} plan* is active until {expires_date}.\n\n"
        f"You now have access to:\n"
        f"• Daily intelligence briefs\n"
        f"• Real-time on-chain alerts\n"
        f"• dTAO alpha token tracking\n"
        f"• Filtered news and trade setups\n"
        f"• Community discussion\n\n"
        f"_The edge is now yours._"
    )
