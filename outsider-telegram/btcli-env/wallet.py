#!/usr/bin/env python3
"""
BTCLI Wallet Manager
Outsider Telegram — Safe wallet operations

Commands:
  python wallet.py create <name>   — create new wallet (coldkey + hotkey)
  python wallet.py list            — list all wallets
  python wallet.py balance <name>  — show wallet balance (read-only)
  python wallet.py address <name>  — show SS58 address (read-only, safe to share)

SECURITY: Private keys never leave ~/.bittensor/wallets/
"""

import sys
import subprocess
from pathlib import Path

WALLET_BASE = Path.home() / ".bittensor" / "wallets"


def cmd_create(name: str):
    """Create a new wallet. Prompts for password interactively."""
    print(f"\nCreating wallet: {name}")
    print("You will be prompted to set a password for the coldkey.")
    print("IMPORTANT: Write down your mnemonic phrase and store it OFFLINE.\n")
    subprocess.run([
        "btcli", "wallet", "create",
        "--wallet-name", name,
        "--wallet-path", str(WALLET_BASE),
    ])


def cmd_list():
    """List all wallets."""
    if not WALLET_BASE.exists():
        print("No wallets directory found. Run: python setup.py first.")
        return
    wallets = [d.name for d in WALLET_BASE.iterdir() if d.is_dir()]
    if not wallets:
        print("No wallets found. Create one with: python wallet.py create <name>")
        return
    print(f"\nWallets in {WALLET_BASE}:")
    for w in sorted(wallets):
        wallet_path = WALLET_BASE / w
        coldkey_pub = wallet_path / "coldkeypub.txt"
        address = "unknown"
        if coldkey_pub.exists():
            import json
            try:
                data = json.loads(coldkey_pub.read_text())
                address = data.get("ss58Address", "unknown")
            except Exception:
                pass
        print(f"  • {w:20} {address}")


def cmd_balance(name: str):
    """Show balance for a wallet (read-only, safe)."""
    subprocess.run([
        "btcli", "wallet", "balance",
        "--wallet-name", name,
        "--wallet-path", str(WALLET_BASE),
        "--network", "finney",
    ])


def cmd_address(name: str):
    """Show the SS58 address (public, safe to share)."""
    coldkey_pub = WALLET_BASE / name / "coldkeypub.txt"
    if not coldkey_pub.exists():
        print(f"Wallet '{name}' not found or coldkeypub missing.")
        return
    import json
    try:
        data = json.loads(coldkey_pub.read_text())
        address = data.get("ss58Address", "not found")
        print(f"\nWallet: {name}")
        print(f"Address (SS58): {address}")
        print("\nThis address is SAFE to share publicly.")
        print("It is your TAO deposit/receive address.")
    except Exception as e:
        print(f"Error reading wallet: {e}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return

    cmd = args[0]
    if cmd == "create" and len(args) > 1:
        cmd_create(args[1])
    elif cmd == "list":
        cmd_list()
    elif cmd == "balance" and len(args) > 1:
        cmd_balance(args[1])
    elif cmd == "address" and len(args) > 1:
        cmd_address(args[1])
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
