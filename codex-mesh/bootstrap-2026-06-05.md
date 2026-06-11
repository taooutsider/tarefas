# Mesh Bootstrap - 2026-06-05

Purpose: make Codex project chats recognize themselves as autonomous project agents, not only as isolated conversations.

## Protocol

- Protocol file: `/Users/victorlamenha/.codex/worktrees/1c52/New project/codex-mesh/AGENT_PROTOCOL.md`
- Backend audit root: `/Users/victorlamenha/.codex/worktrees/1c52/New project/codex-mesh`
- Future bridge-delivered messages now include recipient identity, scope, workspace, public memory path, and protocol path.

## Direct Thread Bootstrap Results

| Project | Thread | Status | Evidence |
|---|---|---|---|
| `taoswap-engine` | `019dd744-fc2d-7383-8895-077ccd2f2d76` | ACK | Recognized as TaoSwap Engine autonomous mesh agent. |
| `agente-vlmkt` | `019e9326-6aa8-7d73-9ce5-19248c724ccf` | ACK | Recognized as Agente VLMKT in Codex Mesh. |
| `tiger-2-0` | `019e60d0-c588-7502-8db2-76b01cfeb7f2` | ACK | Recognized as Tiger 2.0 focused on Tiger Research. |
| `blog-outsider` | `019db1a4-b01b-7042-9540-ef4c7fa4103e` | ACK | Recognized as Blog Outsider for Astro/Cloudflare work. |
| `pesquisa-voos` | `019df8ad-c456-7453-b105-1122897b5888` | ACK | Recognized as flight research and comparison agent. |
| `tiger-movie` | `019df4f6-a05a-7a71-aab4-78c34f0a021e` | ACK | Recognized as creative video/covers/captions agent. |
| `tiger-miner` | `019c5e15-3e59-71a0-9c93-1831dfa58091` | ACK | Recognized as SN94 BitSota mining viability agent. |
| `tiger-bot-dtao` | `019ca920-5779-7701-a2d3-dd5e0da8090d` | Paused / needs repair | Thread reports `systemError`; bootstrap and rescue bootstrap both returned no visible ACK items. |
| `infinite-todo-app` | unset | Pending | Project has no linked Codex thread id, so backend memory exists but no live chat can be bootstrapped yet. |

## Operational Decision

The Mesh is now treated as two layers:

1. Backend audit layer: registry, public summaries, inbox, outbox, dispatch envelopes, replies.
2. Live Codex layer: thread messages delivered by bridge or direct bootstrap so each chat knows its identity and can respond as an agent.

No project should be considered fully live until it has both a registry entry and a confirmed thread ACK. `tiger-bot-dtao` is paused in `registry.json` until its Codex thread is repaired or replaced.

## First Live Round Trip

Validated on 2026-06-05:

1. `blog-outsider` asked `agent-system` to audit the bridge/protocol path for a pending Tiger review request.
2. `agent-system` confirmed the protocol, delivered `msg_6ac7d7d9ccac43e3` into the live `tiger-2-0` Codex thread, and marked the dispatch sent only after thread delivery.
3. `tiger-2-0` recognized its mesh identity and returned a Field College audit.
4. `agent-system` recorded the Tiger reply into the backend as `msg_ac299d68e52a4c88`.
5. `agent-system` delivered the reply back into the live `blog-outsider` Codex thread.
6. `blog-outsider` acknowledged the feedback and started implementing the highest-impact Field College improvements in its own scope.

After the round trip, `npm run mesh -- bridge-list --root ../codex-mesh --status open` reported no open dispatch envelopes.
