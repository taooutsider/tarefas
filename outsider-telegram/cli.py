"""
CLI — founder command interface.
Run locally to trigger content manually without touching code.

TELEGRAM:
  python cli.py brief            → generate + post daily brief now
  python cli.py news             → generate + post news digest now
  python cli.py trade "text"     → format trade setup and post to Intel
  python cli.py dive 8           → generate subnet deep dive for SN8
  python cli.py test             → send test message to both groups
  python cli.py preview brief    → generate brief but DON'T post (print only)

BLOG (publishes to taooutsider.com automatically):
  python cli.py blog market      → market analysis post → publish
  python cli.py blog weekly      → weekly brief post → publish
  python cli.py blog dive 8 "Taoshi PTN"  → subnet deep dive → publish
  python cli.py blog trade "text"         → trade setup post → publish
  python cli.py blog guide "topic"        → educational guide → publish
  python cli.py blog preview market       → generate only (don't publish)
"""

import asyncio
import sys
from dotenv import load_dotenv

load_dotenv()


async def cmd_brief(post: bool = True):
    from agents.daily_brief import build_daily_brief
    from telegram.publisher import post_to_intel
    print("Generating daily brief...")
    brief = await build_daily_brief()
    if post:
        await post_to_intel(brief)
        print("Posted to Outsider Intel.")
    else:
        print("\n" + "─" * 60)
        print(brief)
        print("─" * 60)
        print("\n[PREVIEW ONLY — not posted]")


async def cmd_news(post: bool = True):
    from agents.content import generate_news_digest
    from telegram.publisher import post_to_intel
    print("Generating news digest...")
    digest = await generate_news_digest()
    if not digest:
        print("No relevant news found.")
        return
    if post:
        await post_to_intel(digest)
        print("Posted to Outsider Intel.")
    else:
        print("\n" + digest)
        print("\n[PREVIEW ONLY — not posted]")


async def cmd_trade(raw_idea: str):
    from agents.content import format_trade_setup
    from telegram.publisher import post_to_intel
    print("Formatting trade setup...")
    post = await format_trade_setup(raw_idea)
    print("\n" + "─" * 60)
    print(post)
    print("─" * 60)
    confirm = input("\nPost to Outsider Intel? (y/n): ").strip().lower()
    if confirm == "y":
        await post_to_intel(post)
        print("Posted.")
    else:
        print("Cancelled.")


async def cmd_dive(netuid: int):
    from agents.content import generate_subnet_deep_dive
    from telegram.publisher import post_to_intel
    name = input(f"Subnet name for SN{netuid} (e.g. Taoshi): ").strip()
    print(f"Generating deep dive for SN{netuid} {name}...")
    post = await generate_subnet_deep_dive(netuid, name)
    print("\n" + "─" * 60)
    print(post)
    print("─" * 60)
    confirm = input("\nPost to Outsider Intel? (y/n): ").strip().lower()
    if confirm == "y":
        await post_to_intel(post)
        print("Posted.")
    else:
        print("Cancelled.")


async def cmd_test():
    from telegram.publisher import post_to_intel, post_to_community
    msg = "✅ *Outsider Bot* — test message. Systems operational."
    await post_to_intel(msg)
    await post_to_community(msg)
    print("Test messages sent to Intel + Community.")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return

    cmd = args[0].lower()

    if cmd == "brief":
        asyncio.run(cmd_brief(post=True))
    elif cmd == "news":
        asyncio.run(cmd_news(post=True))
    elif cmd == "trade":
        if len(args) < 2:
            print('Usage: python cli.py trade "your trade idea here"')
            return
        asyncio.run(cmd_trade(args[1]))
    elif cmd == "dive":
        if len(args) < 2:
            print("Usage: python cli.py dive <netuid>  (e.g. python cli.py dive 8)")
            return
        asyncio.run(cmd_dive(int(args[1])))
    elif cmd == "test":
        asyncio.run(cmd_test())
    elif cmd == "preview":
        sub = args[1].lower() if len(args) > 1 else ""
        if sub == "brief":
            asyncio.run(cmd_brief(post=False))
        elif sub == "news":
            asyncio.run(cmd_news(post=False))
        else:
            print("Usage: python cli.py preview brief|news")

    elif cmd == "blog":
        asyncio.run(cmd_blog(args[1:]))

    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)


async def cmd_blog(args: list[str]):
    from agents.blog import (
        run_market_analysis, run_weekly_brief,
        run_subnet_deep_dive, run_trade_setup, run_guide,
    )
    if not args:
        print("Usage: python cli.py blog <market|weekly|dive|trade|guide|preview>")
        return

    sub = args[0].lower()
    dry = False

    if sub == "preview":
        dry = True
        sub = args[1].lower() if len(args) > 1 else ""
        args = args[1:]

    if sub == "market":
        path = await run_market_analysis(dry_run=dry)
        print(f"Done: {path}")
    elif sub == "weekly":
        path = await run_weekly_brief(dry_run=dry)
        print(f"Done: {path}")
    elif sub == "dive":
        netuid = int(args[1]) if len(args) > 1 else int(input("netuid: "))
        name   = args[2]       if len(args) > 2 else input("Subnet name: ").strip()
        path = await run_subnet_deep_dive(netuid, name, dry_run=dry)
        print(f"Done: {path}")
    elif sub == "trade":
        idea = args[1] if len(args) > 1 else input("Trade idea: ").strip()
        path = await run_trade_setup(idea, dry_run=dry)
        print(f"Done: {path}")
    elif sub == "guide":
        topic = args[1] if len(args) > 1 else input("Guide topic: ").strip()
        path = await run_guide(topic, dry_run=dry)
        print(f"Done: {path}")
    else:
        print(f"Unknown blog subcommand: {sub}")
        print("Options: market, weekly, dive, trade, guide, preview")


if __name__ == "__main__":
    main()
