"""
CLI — founder command interface.
Run locally to trigger content manually without touching code.

Usage:
  python cli.py brief          → generate + post daily brief now
  python cli.py news           → generate + post news digest now
  python cli.py trade "text"   → format trade setup and post to Intel
  python cli.py dive 8         → generate subnet deep dive for SN8
  python cli.py test           → send test message to both groups
  python cli.py preview brief  → generate brief but DON'T post (print only)
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
    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)


if __name__ == "__main__":
    main()
