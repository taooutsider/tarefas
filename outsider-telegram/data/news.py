"""
News aggregator.
Pulls from RSS feeds covering Bittensor / dTAO / AI crypto.
"""

import httpx
from xml.etree import ElementTree
from datetime import datetime, timezone, timedelta


RSS_FEEDS = [
    # Bittensor / TAO focused
    "https://taostats.io/feed",
    "https://blog.bittensor.com/rss",
    # General AI crypto (filter for TAO mentions)
    "https://decrypt.co/feed",
    "https://cointelegraph.com/rss/tag/artificial-intelligence",
    "https://coindesk.com/arc/outboundfeeds/rss/",
]

KEYWORDS = [
    "bittensor", "tao", "dtao", "subnet", "opentensor",
    "validator", "miner", "taoshi", "neural internet",
]


def _parse_feed(xml_text: str, source_url: str) -> list[dict]:
    items = []
    try:
        root = ElementTree.fromstring(xml_text)
        channel = root.find("channel")
        if channel is None:
            return items
        for item in channel.findall("item"):
            title = (item.findtext("title") or "").strip()
            link = (item.findtext("link") or "").strip()
            pub_date = item.findtext("pubDate") or ""
            description = (item.findtext("description") or "").strip()
            items.append({
                "title": title,
                "link": link,
                "pub_date": pub_date,
                "description": description[:300],
                "source": source_url,
            })
    except Exception:
        pass
    return items


def _is_relevant(item: dict) -> bool:
    text = (item["title"] + " " + item["description"]).lower()
    return any(kw in text for kw in KEYWORDS)


def _is_recent(item: dict, hours: int = 24) -> bool:
    """Best-effort recency check."""
    try:
        from email.utils import parsedate_to_datetime
        pub = parsedate_to_datetime(item["pub_date"])
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return pub >= cutoff
    except Exception:
        return True  # include if we can't parse the date


async def fetch_recent_news(hours: int = 24) -> list[dict]:
    """Returns relevant news items from the last N hours."""
    all_items: list[dict] = []

    async with httpx.AsyncClient(timeout=15) as client:
        for url in RSS_FEEDS:
            try:
                r = await client.get(url, follow_redirects=True)
                if r.status_code == 200:
                    all_items.extend(_parse_feed(r.text, url))
            except Exception:
                continue

    relevant = [i for i in all_items if _is_relevant(i) and _is_recent(i, hours)]

    # Deduplicate by title
    seen: set[str] = set()
    unique = []
    for item in relevant:
        key = item["title"].lower()[:60]
        if key not in seen:
            seen.add(key)
            unique.append(item)

    return unique[:15]
