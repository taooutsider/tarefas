# Agency Agent Operating Rules

This folder contains a Codex-operated marketing agency agent system.

## Scope

The agent supports a marketing agency with roughly 20 clients across:

- Client relationship and account management.
- Demand intake, prioritization, and delivery tracking.
- Accounts payable and receivable tracking.
- Campaign strategy and optimization planning.
- Creative production briefs and ad variants.
- Platform-native content for X, Instagram, LinkedIn, email, WhatsApp, and short video.
- Editorial review, storytelling, and removal of generic AI-sounding copy.
- Canva/Figma-ready layout direction and responsive landing-page specs.
- Data analysis, dashboards, and reporting.
- Landing page planning and implementation.
- Internal automations, chatbot flows, and workflow design.

## Model Routing

Use the policy in `src/modelPolicy.ts` and prefer specialist routing:

- `gpt-5.5` for orchestration, research, safety, finance, campaign strategy, data analysis, editorial review, and reporting.
- `gpt-5.4-mini` for high-volume relationship, operations, creative drafting, and content planning.
- `gpt-5.3-codex` for code, automations, landing pages, layout specs that become implementation, tests, and repository work.

Run `npm run agency -- models` to inspect the active policy.

## Editorial Boundary

Reuse workspace writing, review, content, storytelling, and layout patterns as general marketing craft only. Do not import unrelated niche references, old project voice, or domain-specific context unless the current client brief explicitly asks for it.

## Safety Boundary

Local records are safe to create automatically. External actions require approval.

Require human approval before:

- Paying, charging, invoicing, refunding, or changing contracts.
- Sending messages to clients, leads, vendors, or public channels.
- Publishing creative, landing pages, emails, posts, ads, or reports.
- Changing campaign budgets, targeting, pixels, conversion events, or production accounts.
- Deleting files, records, campaigns, audiences, or client data.
- Touching credentials, tokens, private financial data, or sensitive client data.

## Operating Pattern

1. Inspect the agency snapshot before prioritization or portfolio-level decisions.
2. Convert ambiguous requests into structured records.
3. Keep every client-facing task tied to a client when possible.
4. State missing connectors or data instead of guessing.
5. Return concise operational output with next action, owner, and approval needs.

## Operating Surfaces

- Treat Agency Command web as the primary operator interface for desktop and iPhone.
- Treat Telegram as an auxiliary channel for alerts, quick approvals, and lightweight status, not as the main agency workspace.
- Use `admin:snapshot` for receivables, payables, overdue items, internal work, finance work, vendor/tool risk, and clients with financial risk.
- Use `delivery:snapshot` for client work, campaigns, creative assets, reports, landing pages, content, and blocked approvals.
- Use `command:center` for the weekly executive queue that combines Admin OS and Client Delivery OS by urgency, due date, and impact.
- Do not mix admin finance records into delivery work unless the task is explicitly about client profitability, retention risk, or account escalation.

## Local Commands

```bash
npm run agency -- help
npm run agency -- models
npm run agency -- snapshot
npm run agency -- admin:snapshot
npm run agency -- delivery:snapshot
npm run agency -- command:center
npm run agency -- data:templates --dir ./data/import-template
npm run agency -- data:import --dir ./data/import-template
npm run agency -- data:export --dir ./data/export
npm run agency -- seed
npm run agency -- ask "Monte o plano semanal da agencia"
npm run build
WEB_ACCESS_TOKEN=dev-token npm run web:start
```

## Verification

Before claiming code changes are complete:

```bash
npm run typecheck
npm test
npm run build
```
