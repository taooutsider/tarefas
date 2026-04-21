#!/usr/bin/env python3
"""
Chain Query Tool
Outsider Telegram — Read-only Bittensor chain queries

All queries are READ-ONLY. No keys required.

Commands:
  python query.py price              — TAO price + market data
  python query.py subnet <netuid>    — subnet info (emissions, neurons)
  python query.py subnets            — all subnets overview
  python query.py stake <ss58>       — stake info for an address
  python query.py block              — current block number
  python query.py dtao <netuid>      — dTAO alpha token data for subnet
"""

import asyncio
import sys
import json

import bittensor as bt


async def cmd_price():
    """TAO price from CoinGecko."""
    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={
                "ids": "bittensor",
                "vs_currencies": "usd",
                "include_24hr_change": "true",
                "include_market_cap": "true",
                "include_24hr_vol": "true",
            }
        )
        data = r.json().get("bittensor", {})

    price = data.get("usd", 0)
    change = data.get("usd_24h_change", 0)
    mcap = data.get("usd_market_cap", 0)
    vol = data.get("usd_24h_vol", 0)
    sign = "+" if change >= 0 else ""

    print(f"\n{'─'*40}")
    print(f"  TAO Price:   ${price:,.2f} ({sign}{change:.2f}%)")
    print(f"  Market Cap:  ${mcap/1e9:.2f}B")
    print(f"  Volume 24h:  ${vol/1e6:.1f}M")
    print(f"{'─'*40}")


async def cmd_block():
    async with bt.AsyncSubtensor(network="finney") as sub:
        block = await sub.substrate.get_block_number(None)
        print(f"\n  Current Finney block: {block:,}")


async def cmd_subnets():
    async with bt.AsyncSubtensor(network="finney") as sub:
        subnets = await sub.get_all_subnets_info()
        print(f"\n{'─'*60}")
        print(f"  {'SN':>4}  {'Name':<28}  {'Emission':>10}  {'Neurons':>7}")
        print(f"{'─'*60}")
        for s in sorted(subnets, key=lambda x: x.emission_value, reverse=True)[:30]:
            print(
                f"  {s.netuid:>4}  {str(s.subnet_name or '')[:28]:<28}  "
                f"{float(s.emission_value):.4f}  {s.max_n:>7}"
            )
        print(f"{'─'*60}")
        print(f"  Total subnets: {len(subnets)}")


async def cmd_subnet(netuid: int):
    async with bt.AsyncSubtensor(network="finney") as sub:
        meta = await sub.metagraph(netuid=netuid)
        info = await sub.get_subnet_info(netuid=netuid)

        print(f"\n{'─'*50}")
        print(f"  SN{netuid} — {info.subnet_name if info else 'Unknown'}")
        print(f"{'─'*50}")
        print(f"  Neurons:     {len(meta.uids)}")
        print(f"  Total stake: {float(meta.S.sum()):.2f} TAO")
        print(f"  Emission:    {float(meta.E.sum()):.6f}")

        # Top 5 by stake
        import numpy as np
        top_idx = np.argsort(meta.S.numpy())[::-1][:5]
        print(f"\n  Top 5 by stake:")
        for i in top_idx:
            print(f"    UID {meta.uids[i]:>4}  {float(meta.S[i]):.2f} TAO  {meta.hotkeys[i][:16]}...")
        print(f"{'─'*50}")


async def cmd_stake(ss58: str):
    async with bt.AsyncSubtensor(network="finney") as sub:
        balance = await sub.get_balance(ss58)
        stakes = await sub.get_stake_for_coldkey(ss58)
        print(f"\n  Address: {ss58}")
        print(f"  Free balance: {float(balance.tao):.4f} TAO")
        if stakes:
            total_stake = sum(float(s.stake.tao) for s in stakes)
            print(f"  Total staked: {total_stake:.4f} TAO")
            print(f"  Delegations:  {len(stakes)}")


async def cmd_dtao(netuid: int):
    """Query dTAO alpha token data for a subnet."""
    async with bt.AsyncSubtensor(network="finney") as sub:
        try:
            pool = await sub.get_subnet_hyperparameters(netuid=netuid)
            print(f"\n  SN{netuid} dTAO Alpha Token Data:")
            print(f"  {json.dumps(pool.__dict__ if hasattr(pool, '__dict__') else str(pool), indent=2, default=str)}")
        except Exception as e:
            print(f"  Error fetching dTAO data for SN{netuid}: {e}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return

    cmd = args[0]
    try:
        if cmd == "price":
            asyncio.run(cmd_price())
        elif cmd == "block":
            asyncio.run(cmd_block())
        elif cmd == "subnets":
            asyncio.run(cmd_subnets())
        elif cmd == "subnet" and len(args) > 1:
            asyncio.run(cmd_subnet(int(args[1])))
        elif cmd == "stake" and len(args) > 1:
            asyncio.run(cmd_stake(args[1]))
        elif cmd == "dtao" and len(args) > 1:
            asyncio.run(cmd_dtao(int(args[1])))
        else:
            print(__doc__)
    except KeyboardInterrupt:
        print("\nInterrupted.")
    except Exception as e:
        print(f"\nError: {e}")


if __name__ == "__main__":
    main()
