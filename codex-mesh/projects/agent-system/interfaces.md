# Interfaces

## Mesh Bridge CLI

- `codex-mesh/AGENT_PROTOCOL.md`: canonical protocol for autonomous project identity and cross-thread communication.
- `codex-mesh/bootstrap-2026-06-05.md`: current bootstrap evidence showing which project chats acknowledged their mesh identity.
- `npm run mesh -- bridge-list --status open`: list pending or sent dispatch envelopes that still need action.
- `npm run mesh -- bridge-next`: print the next pending Codex thread prompt.
- `npm run mesh -- bridge-mark-sent --message-id <id> --sent-turn-id <turn>`: mark a pending envelope as delivered to a Codex thread.
- `npm run mesh -- record-reply --message-id <id> --source-turn-id <turn> --body <reply>`: write a thread reply back into sender inbox/recipient outbox and close the dispatch envelope.
- `src/mesh/bridge.ts`: testable runner core with adapter methods `sendMessage` and `readReply`.
- Bridge-delivered prompts include the recipient project identity, scope, workspace, public memory path, and protocol path before the message payload.

## Agency OS CLI

- `npm run agency -- seed`: create demo clients, work items, finance items, campaigns, creative assets, and reports.
- `npm run agency -- admin:snapshot`: print finance, internal work, and admin risk view.
- `npm run agency -- delivery:snapshot`: print client delivery, campaigns, creative, reports, and blocked approvals.
- `npm run agency -- command:center`: print the unified executive queue.
- `npm run agency -- data:templates --dir <dir>`: create CSV templates for external data onboarding.
- `npm run agency -- data:import --dir <dir>` and `npm run agency -- data:export --dir <dir>`: move Agency OS records through CSV packages.
- `npm run agency -- models`: print the active specialist model routing policy.

## Agency Command Web

- `npm run build`: build Node backend and React web frontend.
- `WEB_ACCESS_TOKEN=<token> npm run web:start`: serve the production web app and API on `WEB_PORT` (`4173` by default).
- `npm run web:server` plus `npm run web:dev`: run API and Vite dev UI locally.
- `/api/bootstrap`: command center, admin, delivery, clients, jobs, approvals, mesh, and runtime status.
- `/api/demo/seed`: create demo agency data when the database is empty.
- `/api/jobs`: create and, when `OPENAI_API_KEY` is configured, execute web-originated agent jobs.
- `/api/approvals/:id/approve` and `/api/approvals/:id/deny`: resume approval-gated jobs.
