"""
On-chain alert agent.
Monitors for significant market movements and posts real-time alerts.
"""

import asyncio
from data.bittensor import get_tao_price, get_subnet_emissions
from models.router import generate


# Thresholds that trigger alerts
PRICE_CHANGE_THRESHOLD = 5.0     # % move in TAO price to alert
SUBNET_CHANGE_THRESHOLD = 15.0   # % move in subnet alpha token to alert

# In-memory state (resets on restart — fine for MVP)
_last_tao_price: float = 0.0
_last_subnet_prices: dict[int, float] = {}


async def check_tao_price_alert() -> str | None:
    global _last_tao_price
    data = await get_tao_price()
    current = data["price_usd"]

    if _last_tao_price == 0:
        _last_tao_price = current
        return None

    change_pct = ((current - _last_tao_price) / _last_tao_price) * 100

    if abs(change_pct) >= PRICE_CHANGE_THRESHOLD:
        _last_tao_price = current
        direction = "surging 🚀" if change_pct > 0 else "dropping 🔻"
        alert = await generate(
            f"TAO is {direction} {change_pct:+.1f}% (now ${current:,.2f}). "
            f"Write a 2-sentence Telegram alert for Bittensor investors. "
            f"Be sharp and data-focused. Use Telegram bold (*text*).",
            tier="fast",
        )
        return f"⚡ *PRICE ALERT*\n\n{alert}"

    return None


async def check_subnet_alerts() -> list[str]:
    global _last_subnet_prices
    subnets = await get_subnet_emissions()
    alerts = []

    for subnet in subnets:
        netuid = subnet["netuid"]
        current_price = subnet["price_usd"]

        if current_price == 0:
            continue

        if netuid not in _last_subnet_prices:
            _last_subnet_prices[netuid] = current_price
            continue

        last = _last_subnet_prices[netuid]
        change_pct = ((current_price - last) / last) * 100

        if abs(change_pct) >= SUBNET_CHANGE_THRESHOLD:
            _last_subnet_prices[netuid] = current_price
            direction = "📈" if change_pct > 0 else "📉"
            alerts.append(
                f"{direction} *SN{netuid} {subnet['name']}* alpha token: "
                f"*{change_pct:+.1f}%* → ${current_price:.4f}"
            )

    if not alerts:
        return []

    header = "🔔 *dTAO ALPHA ALERT*\n\n"
    return [header + "\n".join(alerts)]


async def run_alert_cycle() -> list[str]:
    """Run one full alert check cycle. Returns list of alert messages to send."""
    messages = []

    price_alert, subnet_alerts = await asyncio.gather(
        check_tao_price_alert(),
        check_subnet_alerts(),
    )

    if price_alert:
        messages.append(price_alert)
    messages.extend(subnet_alerts)

    return messages
