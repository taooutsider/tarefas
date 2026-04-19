"""
Blog Content Agent — Tao Outsider
Generates SEO-optimized Bittensor articles and publishes them by
committing markdown files to the git repo. Cloudflare Pages
auto-deploys on every push.

Post types:
  weekly_brief      — Weekly ecosystem overview (every Monday)
  market_analysis   — TAO price + on-chain analysis (2x/week)
  subnet_deep_dive  — Full subnet profile (1x/week)
  trade_setup       — Trade setup post (on demand)
  guide             — Educational guide (1x/month)
"""

import asyncio
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from slugify import slugify   # pip install python-slugify

from models.router import generate
from data.bittensor import get_snapshot
from data.news import get_recent_news


BLOG_CONTENT_DIR = Path(__file__).parent.parent.parent / "outsider-blog" / "src" / "content" / "blog"
BLOG_CONTENT_DIR.mkdir(parents=True, exist_ok=True)

SITE_NAME = "Tao Outsider"
AUTHOR = "Tao Outsider"

CATEGORIES = {
    "weekly_brief":    "weekly",
    "market_analysis": "analysis",
    "subnet_deep_dive":"subnet",
    "trade_setup":     "trade",
    "guide":           "guide",
}


# ─── FRONTMATTER ─────────────────────────────────────────────────────────────

def _frontmatter(title: str, description: str, category: str,
                 tags: list[str], featured: bool = False) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tags_yaml = ", ".join(f'"{t}"' for t in tags)
    return f"""---
title: "{title}"
description: "{description}"
pubDate: {now}
category: {category}
featured: {str(featured).lower()}
author: "{AUTHOR}"
tags: [{tags_yaml}]
---

"""


# ─── POST GENERATORS ─────────────────────────────────────────────────────────

async def generate_market_analysis() -> dict:
    """TAO price + on-chain market analysis post."""
    snap = await get_snapshot()
    news = await get_recent_news()
    news_text = "\n".join(f"- {n['title']}" for n in news[:8])

    price = snap.get("price", {})
    top_sns = snap.get("top_subnets", [])
    movers = snap.get("dtao_movers", [])

    top_sn_text = "\n".join(
        f"- SN{s['netuid']} {s['name']}: emission {s['emission']:.4f}" for s in top_sns[:5]
    )
    movers_text = "\n".join(
        f"- SN{m['netuid']} {m['name']}: {m['change_24h']:+.1f}% 24h" for m in movers[:5]
    )

    prompt = f"""Write a professional, SEO-optimized Bittensor market analysis article.

CURRENT DATA:
- TAO price: ${price.get('usd', 0):,.2f} ({price.get('usd_24h_change', 0):+.2f}% 24h)
- Market cap: ${price.get('usd_market_cap', 0)/1e9:.2f}B
- Volume 24h: ${price.get('usd_24h_vol', 0)/1e6:.1f}M
- Top subnets by emission:
{top_sn_text}
- Top dTAO alpha movers (24h):
{movers_text}
- Recent news:
{news_text}

REQUIREMENTS:
- Length: 900–1200 words
- Structure: intro, price analysis section, on-chain metrics section (emissions/alpha tokens), market outlook
- SEO-friendly h2/h3 headings that include keywords: "bittensor", "TAO price", "dTAO"
- Analytical tone — not hype, not doom. Factual with interpretation.
- End with a brief paragraph mentioning Outsider Intel for daily updates
- Output ONLY the markdown article body (no frontmatter)

Generate the title on the FIRST line as: # Title Here
Then a blank line, then description (1 sentence), then blank line, then article body."""

    content = await generate(prompt, tier="smart", max_tokens=2500)

    lines = content.strip().split("\n")
    title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else f"TAO Market Analysis — {datetime.now(timezone.utc).strftime('%B %d, %Y')}"
    description = lines[2].strip() if len(lines) > 2 and not lines[2].startswith("#") else f"Bittensor market analysis: TAO at ${price.get('usd', 0):,.2f}, on-chain emissions update and dTAO alpha token moves."
    body = "\n".join(lines[4:] if len(lines) > 4 else lines[1:])

    description = description[:155]  # SEO max

    return {
        "title": title,
        "description": description,
        "body": body,
        "category": "analysis",
        "tags": ["TAO price", "bittensor", "dTAO", "market analysis", "crypto"],
        "featured": False,
    }


async def generate_weekly_brief() -> dict:
    """Full weekly Bittensor ecosystem brief."""
    snap = await get_snapshot()
    news = await get_recent_news()
    news_text = "\n".join(f"- {n['title']}: {n['summary'][:120]}" for n in news[:10])

    price = snap.get("price", {})
    top_sns = snap.get("top_subnets", [])
    movers = snap.get("dtao_movers", [])

    prompt = f"""Write a comprehensive weekly Bittensor intelligence brief article.

DATA:
- TAO: ${price.get('usd', 0):,.2f} ({price.get('usd_24h_change', 0):+.2f}% 7d)
- Top subnets: {', '.join(f"SN{s['netuid']} {s['name']}" for s in top_sns[:8])}
- Top alpha movers: {', '.join(f"SN{m['netuid']} {m['name']} {m['change_24h']:+.0f}%" for m in movers[:5])}
- News items:
{news_text}

REQUIREMENTS:
- Length: 1200–1600 words
- Week number and date in title
- Sections: Executive Summary, Price & Market, Subnet Emissions, dTAO Alpha Tokens, Ecosystem News, Week Ahead Outlook
- Bullet-point heavy for scanability
- Confident, insider analyst voice
- SEO keywords: "bittensor weekly", "TAO weekly update", "bittensor ecosystem", "subnet emissions"
- Output format: first line = # Title, second line blank, third line = meta description (1 sentence max 155 chars), then blank, then article

Generate ONLY the markdown (no frontmatter)."""

    content = await generate(prompt, tier="smart", max_tokens=3000)
    lines = content.strip().split("\n")
    now = datetime.now(timezone.utc)
    week = now.isocalendar()[1]
    year = now.year

    title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else f"Bittensor Weekly Brief — Week {week}, {year}"
    description = lines[2].strip() if len(lines) > 2 else f"Week {week} Bittensor intelligence brief: TAO at ${price.get('usd',0):,.0f}, top subnet emissions, dTAO alpha movers and ecosystem news."
    body = "\n".join(lines[4:] if len(lines) > 4 else lines[1:])
    description = description[:155]

    return {
        "title": title,
        "description": description,
        "body": body,
        "category": "weekly",
        "tags": ["bittensor weekly", "TAO", "bittensor", "subnet emissions", "dTAO"],
        "featured": False,
    }


async def generate_subnet_deep_dive(netuid: int, name: str) -> dict:
    """Full subnet deep dive — uses SMART tier for depth."""
    import bittensor as bt
    import json

    # Collect on-chain data
    meta_summary = ""
    try:
        async with bt.AsyncSubtensor(network="finney") as sub:
            meta = await sub.metagraph(netuid=netuid)
            import numpy as np
            total_stake = float(meta.S.sum())
            n_neurons = len(meta.uids)
            top_idx = np.argsort(meta.S.numpy())[::-1][:5]
            top_validators = [
                f"UID {meta.uids[i]}: {float(meta.S[i]):.1f} TAO"
                for i in top_idx
            ]
            meta_summary = f"""- Neurons: {n_neurons}
- Total stake: {total_stake:.0f} TAO
- Top validators: {', '.join(top_validators)}"""
    except Exception:
        meta_summary = f"- Netuid: {netuid} (on-chain data unavailable)"

    # Try to find repo info
    snap = await get_snapshot()
    subnet_emission = next(
        (s for s in snap.get("top_subnets", []) if s["netuid"] == netuid), {}
    )
    emission = subnet_emission.get("emission", 0)

    prompt = f"""Write a comprehensive Bittensor subnet deep dive article for SN{netuid} — {name}.

ON-CHAIN DATA:
{meta_summary}
- Current emission weight: {emission:.4f}

REQUIREMENTS:
- Length: 1800–2400 words (this is our flagship long-form content)
- Cover: What is this subnet, what problem does it solve, how do miners/validators work, emission mechanics, investment thesis, risks, how to participate
- Be analytical and factual. Don't hype. Show you understand the technical architecture.
- Include a "Quick Stats" section with a markdown table
- SEO keywords: "bittensor SN{netuid}", "{name.lower()} bittensor", "bittensor {name.lower()} subnet", "TAO subnet"
- End with a clear "Should you participate?" section
- Call to action for Outsider Intel at the end

Output format: first line = # Title, blank, description (max 155 chars), blank, then article body.
Output ONLY markdown (no frontmatter)."""

    content = await generate(prompt, tier="smart", max_tokens=4000)
    lines = content.strip().split("\n")

    title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else f"SN{netuid} {name}: Complete Bittensor Subnet Deep Dive"
    description = lines[2].strip() if len(lines) > 2 else f"Complete deep dive on Bittensor SN{netuid} {name} — architecture, emissions, how to participate as miner or validator, and the investment thesis."
    body = "\n".join(lines[4:] if len(lines) > 4 else lines[1:])
    description = description[:155]

    return {
        "title": title,
        "description": description,
        "body": body,
        "category": "subnet",
        "tags": [f"SN{netuid}", name.lower(), "bittensor subnet", "dTAO", "bittensor"],
        "featured": False,
    }


async def generate_trade_setup(raw_idea: str) -> dict:
    """Format a raw trade idea as an SEO blog post."""
    prompt = f"""Format this raw trade idea as a professional Bittensor trade setup blog post.

RAW IDEA: {raw_idea}

REQUIREMENTS:
- Length: 600–900 words
- Structure: Setup overview, Technical analysis, On-chain confirmation, Entry / Target / Stop, Risk management note
- Professional but direct — like a prop trader writing for peers
- Disclaimer line at the end (not financial advice)
- SEO keywords: "TAO trade setup", "bittensor trading", "TAO technical analysis"

Output format: first line = # Title, blank, description (max 155 chars, include "trade setup" and "TAO" or the asset name), blank, then body.
Output ONLY markdown (no frontmatter)."""

    content = await generate(prompt, tier="medium", max_tokens=1800)
    lines = content.strip().split("\n")

    title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else "TAO Trade Setup"
    description = lines[2].strip() if len(lines) > 2 else f"Bittensor TAO trade setup: {raw_idea[:100]}"
    body = "\n".join(lines[4:] if len(lines) > 4 else lines[1:])
    description = description[:155]

    return {
        "title": title,
        "description": description,
        "body": body,
        "category": "trade",
        "tags": ["TAO", "bittensor", "trade setup", "technical analysis", "crypto trading"],
        "featured": False,
    }


async def generate_guide(topic: str) -> dict:
    """SEO-optimized educational guide."""
    prompt = f"""Write a comprehensive beginner-to-intermediate guide about: {topic}

Context: Bittensor / TAO ecosystem. Audience: crypto-native but new to Bittensor.

REQUIREMENTS:
- Length: 2000–2800 words
- Very structured: table of contents (as links), numbered steps where applicable, callout boxes using blockquotes
- Answer the reader's actual questions — avoid fluff
- SEO: use "{topic}" and related terms naturally. Include FAQ section at the end with 3–5 Q&A pairs.
- Target featured snippet: one section should have a clear 2-3 sentence definition of the core concept
- Internal link placeholder: mention "[related guide]" where appropriate

Output format: first line = # Title, blank, description (max 155 chars), blank, then article.
Output ONLY markdown (no frontmatter)."""

    content = await generate(prompt, tier="smart", max_tokens=4500)
    lines = content.strip().split("\n")

    title = lines[0].lstrip("#").strip() if lines[0].startswith("#") else f"Complete Guide to {topic}"
    description = lines[2].strip() if len(lines) > 2 else f"Complete guide to {topic} in the Bittensor ecosystem — step-by-step for new and experienced TAO participants."
    body = "\n".join(lines[4:] if len(lines) > 4 else lines[1:])
    description = description[:155]

    return {
        "title": title,
        "description": description,
        "body": body,
        "category": "guide",
        "tags": ["bittensor guide", "TAO", "bittensor", topic.lower()],
        "featured": False,
    }


# ─── PUBLISH ─────────────────────────────────────────────────────────────────

def publish_post(post: dict, dry_run: bool = False) -> str:
    """Write markdown file, commit and push — triggers Cloudflare Pages deploy."""
    title = post["title"]
    slug = slugify(title)[:70]
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{now}-{slug}.md"
    filepath = BLOG_CONTENT_DIR / filename

    frontmatter = _frontmatter(
        title=title,
        description=post["description"],
        category=post["category"],
        tags=post["tags"],
        featured=post.get("featured", False),
    )

    full_content = frontmatter + post["body"]
    filepath.write_text(full_content, encoding="utf-8")
    print(f"  Written: {filepath.name}")

    if dry_run:
        print("  [dry_run] Skipping git commit/push.")
        return str(filepath)

    repo_root = Path(__file__).parent.parent.parent
    rel_path = filepath.relative_to(repo_root)

    subprocess.run(["git", "add", str(rel_path)], cwd=repo_root, check=True)
    subprocess.run(
        ["git", "commit", "-m", f"content: {title[:72]}"],
        cwd=repo_root, check=True,
    )
    subprocess.run(
        ["git", "push", "-u", "origin", "HEAD"],
        cwd=repo_root, check=True,
    )
    print(f"  Published: https://taooutsider.com/blog/{slug}/")
    return str(filepath)


# ─── HIGH-LEVEL RUNNERS ──────────────────────────────────────────────────────

async def run_market_analysis(dry_run: bool = False) -> str:
    print("Generating market analysis post...")
    post = await generate_market_analysis()
    return publish_post(post, dry_run=dry_run)


async def run_weekly_brief(dry_run: bool = False) -> str:
    print("Generating weekly brief post...")
    post = await generate_weekly_brief()
    return publish_post(post, dry_run=dry_run)


async def run_subnet_deep_dive(netuid: int, name: str, dry_run: bool = False) -> str:
    print(f"Generating SN{netuid} {name} deep dive...")
    post = await generate_subnet_deep_dive(netuid, name)
    return publish_post(post, dry_run=dry_run)


async def run_trade_setup(raw_idea: str, dry_run: bool = False) -> str:
    print("Generating trade setup post...")
    post = await generate_trade_setup(raw_idea)
    return publish_post(post, dry_run=dry_run)


async def run_guide(topic: str, dry_run: bool = False) -> str:
    print(f"Generating guide: {topic}...")
    post = await generate_guide(topic)
    return publish_post(post, dry_run=dry_run)
