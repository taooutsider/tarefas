# Local Repository Inventory

## Last Updated
April 12, 2026

---

## Installed Packages
| Package | Version |
|---------|---------|
| `bittensor` | 10.2.0 |
| `bittensor-wallet` | 4.0.1 |
| `bittensor-cli` (btcli) | 9.20.1 |

---

## Bittensor Repos on Server

### Core Opentensor (`/home/user/bittensor-repos/opentensor-core/`)
| Repo | Purpose |
|------|---------|
| `bittensor` | Core Python SDK (v10) |
| `subtensor` | Substrate blockchain node |
| `btcli` | CLI tool (v9.20.1) |
| `bittensor-wallet` | Wallet management |
| `subnet-template` | Official starter template |
| `subnets-infos` | Authoritative subnet registry JSON |
| `awesome-bittensor` | Curated resource list |

### Subnet Repos (`/home/user/bittensor-repos/subnets/`)
- **71 repos cloned** (out of 84 with known public URLs)
- **45 subnets** have no confirmed public repo (private or unannounced)
- **13 failed** due to GitHub rate limiting — re-run `clone_all.py` to retry
- Full registry: `SUBNET_REGISTRY.json`

#### Notable subnets cloned
| SN | Name | Focus |
|----|------|-------|
| SN1 | Apex | LLM inference (macrocosm-os) |
| SN3 | Templar | Distributed LLM training (tplr-ai) |
| SN4 | Targon | Multi-modal verification |
| SN8 | Taoshi PTN | Proprietary trading signals |
| SN9 | Pretrain | Full LLM pretraining |
| SN12 | ComputeHorde | Decentralized GPU compute |
| SN13 | Data Universe | Data scraping & storage |
| SN22 | Desearch | AI-powered search |
| SN24 | Omega Labs | Multimodal AGI dataset |
| SN25 | Protein Folding | Scientific AI |
| SN27 | NI Compute | Neural Internet GPU |
| SN37 | Finetuning | Distributed fine-tuning |
| SN56 | Gradients (G.O.D) | Model training |
| SN64 | Chutes | Containerized model serving |

### Clone Commands
```bash
# Clone/update all subnets
cd /home/user/bittensor-repos/subnets
python3 clone_all.py           # first run
python3 clone_all.py --update  # update all existing

# Browse the registry
cat SUBNET_REGISTRY.json | python3 -m json.tool | grep -A3 '"netuid": 8'
```

---

## Project Files (`/home/user/tarefas/outsider-telegram/`)
| Module | Purpose |
|--------|---------|
| `btcli-env/setup.py` | One-command BTCLI environment setup |
| `btcli-env/wallet.py` | Safe wallet operations (no keys exposed) |
| `btcli-env/query.py` | Read-only chain queries (price, subnets, stake) |
| `models/router.py` | Multi-model AI router (12 models, 3 tiers) |
| `data/bittensor.py` | On-chain data collection |
| `data/news.py` | RSS news aggregator |
| `agents/daily_brief.py` | Daily brief generator |
| `agents/alerts.py` | On-chain alert monitor |
| `agents/content.py` | Trade setup formatter, deep dives |
| `telegram/publisher.py` | Posts to Intel + Community |
| `scheduler/jobs.py` | All scheduled jobs |
| `payments/tao_payment.py` | TAO payment verification + access control |
| `cli.py` | Founder command interface |

---

## Security Notes
- Wallets stored in `~/.bittensor/wallets/` — NEVER inside git repo
- `.env` file is gitignored — never committed
- No private keys anywhere in the codebase
- All chain queries are read-only by default
