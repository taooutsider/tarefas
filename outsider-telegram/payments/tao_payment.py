"""
TAO payment service.

Flow:
  1. User requests to join → bot generates unique deposit address
  2. User sends TAO to that address
  3. Service polls chain → detects payment → grants Telegram access
  4. Subscription expiry tracked in DB → auto-removes on expiry

Storage: SQLite (zero setup, upgradeable to Postgres later)
"""

import asyncio
import sqlite3
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path("data/subscriptions.db")

# Plans: name → (price_usd, days)
PLANS = {
    "monthly":   {"usd": 39,  "days": 30},
    "quarterly": {"usd": 99,  "days": 90},
    "annual":    {"usd": 349, "days": 365},
}


# ─── DATABASE ──────────────────────────────────────────────────────────────

def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS subscriptions (
            user_id        INTEGER PRIMARY KEY,
            telegram_user  TEXT,
            plan           TEXT,
            deposit_address TEXT UNIQUE,
            amount_tao     REAL,
            paid_at        TEXT,
            expires_at     TEXT,
            active         INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS pending_payments (
            user_id        INTEGER PRIMARY KEY,
            telegram_user  TEXT,
            plan           TEXT,
            deposit_address TEXT UNIQUE,
            amount_tao     REAL,
            created_at     TEXT,
            expires_at     TEXT
        )
    """)
    conn.commit()
    conn.close()


def get_conn() -> sqlite3.Connection:
    return sqlite3.connect(DB_PATH)


# ─── ADDRESS GENERATION ────────────────────────────────────────────────────

def generate_deposit_address(user_id: int) -> str:
    """
    Generates a unique SS58 deposit address for a user.
    Requires bittensor-wallet installed.
    """
    try:
        import bittensor_wallet as btw
        wallet = btw.Wallet(name=f"outsider_deposit_{user_id}", hotkey="main")
        wallet.create_if_non_existent(
            coldkey_use_password=False,
            hotkey_use_password=False,
        )
        return wallet.coldkeypub.ss58_address
    except ImportError:
        # Fallback: return a placeholder (install bittensor-wallet to enable TAO payments)
        logger.warning("bittensor-wallet not installed. TAO payments disabled.")
        return f"INSTALL_BITTENSOR_WALLET_FOR_USER_{user_id}"


# ─── PAYMENT AMOUNT ────────────────────────────────────────────────────────

async def get_tao_amount_for_plan(plan: str) -> float:
    """Converts plan USD price to TAO at current spot price."""
    from data.bittensor import get_tao_price
    price_data = await get_tao_price()
    tao_price = price_data["price_usd"]
    usd = PLANS[plan]["usd"]
    tao_amount = round(usd / tao_price, 4)
    return tao_amount


# ─── PAYMENT CREATION ──────────────────────────────────────────────────────

async def create_pending_payment(user_id: int, telegram_user: str, plan: str) -> dict:
    """Creates a pending payment record and returns payment details."""
    address = generate_deposit_address(user_id)
    amount_tao = await get_tao_amount_for_plan(plan)
    created_at = datetime.now(timezone.utc).isoformat()
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()

    conn = get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO pending_payments
        (user_id, telegram_user, plan, deposit_address, amount_tao, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (user_id, telegram_user, plan, address, amount_tao, created_at, expires_at))
    conn.commit()
    conn.close()

    return {
        "address": address,
        "amount_tao": amount_tao,
        "plan": plan,
        "usd": PLANS[plan]["usd"],
        "expires_in": "24 hours",
    }


# ─── PAYMENT VERIFICATION ──────────────────────────────────────────────────

async def check_payment(address: str, expected_tao: float) -> bool:
    """
    Checks if address has received >= expected_tao.
    Uses AsyncSubtensor (requires bittensor installed).
    """
    try:
        import bittensor as bt
        async with bt.AsyncSubtensor(network="finney") as sub:
            balance = await sub.get_balance(address)
            return float(balance.tao) >= expected_tao
    except ImportError:
        logger.warning("bittensor not installed. Cannot verify TAO payments.")
        return False
    except Exception as e:
        logger.error(f"Payment check error for {address}: {e}")
        return False


async def confirm_payment(user_id: int) -> bool:
    """
    Confirms payment for a pending user.
    On success: moves to subscriptions table, grants Telegram access.
    """
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM pending_payments WHERE user_id = ?", (user_id,)
    ).fetchone()
    conn.close()

    if not row:
        return False

    _, telegram_user, plan, address, amount_tao, _, _ = row
    paid = await check_payment(address, amount_tao)

    if not paid:
        return False

    # Record subscription
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=PLANS[plan]["days"])
    conn = get_conn()
    conn.execute("""
        INSERT OR REPLACE INTO subscriptions
        (user_id, telegram_user, plan, deposit_address, amount_tao, paid_at, expires_at, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    """, (user_id, telegram_user, plan, address, amount_tao,
          now.isoformat(), expires.isoformat()))
    conn.execute("DELETE FROM pending_payments WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

    logger.info(f"Payment confirmed for user {user_id} ({plan} plan, expires {expires.date()})")
    return True


# ─── SUBSCRIPTION MANAGEMENT ───────────────────────────────────────────────

def get_expired_users() -> list[int]:
    """Returns user_ids with expired subscriptions."""
    now = datetime.now(timezone.utc).isoformat()
    conn = get_conn()
    rows = conn.execute(
        "SELECT user_id FROM subscriptions WHERE active = 1 AND expires_at < ?", (now,)
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]


def deactivate_user(user_id: int):
    conn = get_conn()
    conn.execute("UPDATE subscriptions SET active = 0 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


def is_active(user_id: int) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    conn = get_conn()
    row = conn.execute(
        "SELECT 1 FROM subscriptions WHERE user_id = ? AND active = 1 AND expires_at > ?",
        (user_id, now)
    ).fetchone()
    conn.close()
    return row is not None


# ─── POLLING LOOP ──────────────────────────────────────────────────────────

async def payment_polling_loop(grant_access_callback, revoke_access_callback):
    """
    Background loop:
    - Checks all pending payments every 5 min
    - Revokes access for expired subscriptions every hour
    """
    init_db()
    check_interval = 300   # 5 min
    revoke_interval = 3600  # 1 hour
    last_revoke = 0

    while True:
        # Check pending payments
        conn = get_conn()
        pending = conn.execute("SELECT user_id FROM pending_payments").fetchall()
        conn.close()

        for (user_id,) in pending:
            try:
                confirmed = await confirm_payment(user_id)
                if confirmed:
                    await grant_access_callback(user_id)
            except Exception as e:
                logger.error(f"Error checking payment for {user_id}: {e}")

        # Revoke expired subscriptions
        now_ts = asyncio.get_event_loop().time()
        if now_ts - last_revoke > revoke_interval:
            expired = get_expired_users()
            for user_id in expired:
                try:
                    await revoke_access_callback(user_id)
                    deactivate_user(user_id)
                    logger.info(f"Revoked access for expired user {user_id}")
                except Exception as e:
                    logger.error(f"Error revoking {user_id}: {e}")
            last_revoke = now_ts

        await asyncio.sleep(check_interval)
