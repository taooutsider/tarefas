"""
Bittensor on-chain and market data.
Sources: CoinGecko (price) + Taostats API (subnets) + direct RPC fallback.
"""

import httpx
from config import settings


COINGECKO_URL = "https://api.coingecko.com/api/v3"
TAOSTATS_URL = "https://api.taostats.io/api"


async def get_tao_price() -> dict:
    """Returns TAO price, 24h change, market cap, volume."""
    params = {
        "ids": "bittensor",
        "vs_currencies": "usd",
        "include_24hr_change": "true",
        "include_market_cap": "true",
        "include_24hr_vol": "true",
    }
    headers = {}
    if settings.coingecko_api_key:
        headers["x-cg-pro-api-key"] = settings.coingecko_api_key

    async with httpx.AsyncClient(timeout=15) as client:
        r = await client.get(f"{COINGECKO_URL}/simple/price", params=params, headers=headers)
        r.raise_for_status()
        data = r.json().get("bittensor", {})

    return {
        "price_usd": data.get("usd", 0),
        "change_24h": round(data.get("usd_24h_change", 0), 2),
        "market_cap": data.get("usd_market_cap", 0),
        "volume_24h": data.get("usd_24h_vol", 0),
    }


async def get_subnet_emissions() -> list[dict]:
    """Returns top subnets by emission share."""
    headers = {}
    if settings.taostats_api_key:
        headers["Authorization"] = f"Bearer {settings.taostats_api_key}"

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(f"{TAOSTATS_URL}/subnets", headers=headers)
            r.raise_for_status()
            subnets = r.json()

        # Normalize: keep netuid, name, emission
        result = []
        for s in subnets:
            result.append({
                "netuid": s.get("netuid") or s.get("net_uid"),
                "name": s.get("subnet_name") or s.get("name") or f"SN{s.get('netuid')}",
                "emission": round(float(s.get("emission", 0) or 0), 4),
                "price_usd": float(s.get("price_usd") or s.get("alpha_price_usd") or 0),
                "change_24h": float(s.get("price_change_24h") or 0),
            })

        # Sort by emission descending, return top 10
        result.sort(key=lambda x: x["emission"], reverse=True)
        return result[:10]

    except Exception:
        # Graceful fallback: return empty list (brief still publishes with price only)
        return []


async def get_dtao_movers() -> list[dict]:
    """Returns top dTAO alpha token movers (biggest % change in 24h)."""
    subnets = await get_subnet_emissions()
    if not subnets:
        return []

    # Filter subnets with price data and sort by absolute 24h change
    with_price = [s for s in subnets if s["price_usd"] > 0]
    with_price.sort(key=lambda x: abs(x["change_24h"]), reverse=True)
    return with_price[:5]


async def get_snapshot() -> dict:
    """Full snapshot for the daily brief."""
    import asyncio
    tao, emissions = await asyncio.gather(
        get_tao_price(),
        get_subnet_emissions(),
    )
    movers = sorted(
        [s for s in emissions if s["price_usd"] > 0],
        key=lambda x: abs(x["change_24h"]),
        reverse=True,
    )[:5]

    return {
        "tao": tao,
        "top_subnets": emissions[:5],
        "dtao_movers": movers,
    }
