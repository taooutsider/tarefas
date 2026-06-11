# Public Summary

Project: Agent System
Scope: Telegram/Codex autonomous agent system, Agents SDK orchestration, approvals, and local Codex mesh.

## Current State
- Agent System is the canonical owner of the Codex Mesh, Agency OS, and Agency Command web interface in this worktree.
- The Mesh now has an autonomous-agent protocol, public memory per project, backend inbox/outbox, dispatch envelopes, and direct thread bootstrap evidence.
- 7 live peer chats acknowledged their autonomous mesh identity on 2026-06-05; `tiger-bot-dtao` is paused until thread repair and `infinite-todo-app` needs a linked thread id.
- First live round trip is validated: Blog Outsider -> Agent System -> Tiger 2.0 -> Blog Outsider, with backend replies recorded and no open dispatch envelopes afterward.

## Decisions
- Use backend files as the audit layer and live Codex thread messages as the awareness layer.
- Future bridge prompts must carry recipient identity, scope, workspace, memory path, and protocol path.

## Interfaces
- Mesh root: `/Users/victorlamenha/.codex/worktrees/1c52/New project/codex-mesh`
- Protocol: `/Users/victorlamenha/.codex/worktrees/1c52/New project/codex-mesh/AGENT_PROTOCOL.md`
- Bootstrap evidence: `/Users/victorlamenha/.codex/worktrees/1c52/New project/codex-mesh/bootstrap-2026-06-05.md`
- CLI: run `npm run mesh -- <command>` from `/Users/victorlamenha/.codex/worktrees/1c52/New project/agent-system`

## How To Ask For Help
Send a mesh message to agent-system with a clear subject, context, and expected output.
