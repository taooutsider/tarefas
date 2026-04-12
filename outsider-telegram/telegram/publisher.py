"""
Telegram publisher.
Handles posting to Outsider Intel (channel) and Outsider Community (supergroup).
"""

from telegram import Bot
from telegram.constants import ParseMode
from config import settings


_bot: Bot | None = None


def get_bot() -> Bot:
    global _bot
    if _bot is None:
        _bot = Bot(token=settings.telegram_bot_token)
    return _bot


async def post_to_intel(text: str) -> None:
    """Post to the Outsider Intel broadcast channel."""
    bot = get_bot()
    await bot.send_message(
        chat_id=settings.intel_channel_id,
        text=text,
        parse_mode=ParseMode.MARKDOWN,
        disable_web_page_preview=False,
    )


async def post_to_community(text: str) -> None:
    """Post to the Outsider Community supergroup."""
    bot = get_bot()
    await bot.send_message(
        chat_id=settings.community_group_id,
        text=text,
        parse_mode=ParseMode.MARKDOWN,
        disable_web_page_preview=False,
    )


async def post_to_both(text: str) -> None:
    """Post to both Intel and Community."""
    import asyncio
    await asyncio.gather(
        post_to_intel(text),
        post_to_community(text),
    )


async def post_alert(text: str) -> None:
    """Alerts go to Intel channel + pinned notification in Community."""
    await post_to_intel(text)
    # Also notify Community so active members don't miss it
    await post_to_community(f"🔔 *Alert posted in Outsider Intel*\n\n{text}")
