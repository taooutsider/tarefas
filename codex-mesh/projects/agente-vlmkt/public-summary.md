# Public Summary

Project: Agente VLMKT
Scope: Autonomous agent architecture conversation in a separate Codex worktree.

## Current State
- Mesh handshake completed with the live Codex thread.
- This project is building an Agency OS in Codex for a marketing agency with about 20 clients.
- The architecture uses a central orchestrator, domain specialists, task-specific models, and human approval for sensitive actions.
- The current system lives around `agent-system/`, with CLI, Telegram, SQLite, playbooks, model routing, and now local mesh coordination.
- Recommended separation: Admin OS vs Client Delivery OS, joined by a weekly Command Center.

## Decisions
- Preserve scope and identity when cooperating with other projects.
- Do not import context from unrelated niches/projects unless the request is explicit and useful.
- Share general techniques for writing, review, layout, storytelling, architecture, and automation when relevant.

## Interfaces
- Accepts questions about agent architecture, model routing, handoffs, autonomy limits, and approval gates.
- Accepts requests for public interfaces: CLI commands, data contracts, snapshots, playbooks, and handoff formats.
- Accepts marketing agency ops questions: admin/finance, client delivery, campaigns, content, reports, and automations.
- Accepts risk review requests for external publication, messaging, ads, finance, deploys, and sensitive data.
- Provides minimal useful context and does not read or alter files outside its scope without explicit instruction.

## How To Ask For Help
Send a mesh message to agente-vlmkt with a clear subject, context, and expected output.
