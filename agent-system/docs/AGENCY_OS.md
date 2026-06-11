# Agency OS Strategy

This system is a Codex-operated agency command center. It starts local-first and connects external tools only after the operating model is stable.

## Architecture

```txt
Codex / Telegram / CLI
  -> Orchestrator
  -> Specialist agents
  -> Local tools and SQLite
  -> Human approval boundary
  -> External connectors later
```

## Specialist Agents

- `account_manager`: client relationship, approvals, onboarding, retention risk.
- `finance_manager`: receivables, payables, billing prep, cash-risk review.
- `campaign_strategist`: paid media strategy, funnel diagnosis, optimization hypotheses.
- `creative_producer`: briefs, variants, ad copy, visual directions, campaign assets.
- `content_strategist`: X, Instagram, LinkedIn, content calendars, hooks, distribution.
- `editorial_reviewer`: humanized revision, anti-AI-cliche editing, storytelling, tone.
- `layout_designer`: Canva/Figma-ready specs, ad composition, visual hierarchy, responsive layout.
- `data_analyst`: metrics, dashboards, data quality, attribution, insights.
- `automation_engineer`: scripts, chatbot flows, internal automations, integrations.
- `reporting_lead`: client reports, executive summaries, weekly/monthly narratives.
- `landing_page_builder`: page strategy, copy, wireframes, tracking requirements.
- `builder`: code, tests, implementation.
- `researcher`: source-backed research and synthesis.
- `operator`: workflow, status, deployment planning, coordination.

## Model Routing

Model choice is automatic through specialist routing. The orchestrator should delegate to the narrowest specialist instead of doing every task itself.

- `gpt-5.5`: orchestration, research, safety, finance, campaign strategy, data analysis, editorial review, reporting.
- `gpt-5.4-mini`: frequent relationship, operation, creative drafting, and content planning tasks.
- `gpt-5.3-codex`: code, automations, landing pages, layout specs that become implementation, tests, and repository work.

The active policy is versioned in `src/modelPolicy.ts` and exposed with:

```bash
npm run agency -- models
```

Override any role in `.env` with its role-specific variable, for example `OPENAI_EDITORIAL_REVIEWER_MODEL` or `OPENAI_AUTOMATION_ENGINEER_MODEL`. If `OPENAI_MODEL` is set, it becomes the fallback for roles without a specific override.

## Editorial And Creative Skills

The system may reuse general craft patterns from workspace writing, review, content, layout, and storytelling assets, but only as neutral marketing craft. It must not import unrelated niche references, old project voice, or domain-specific context into agency work unless a client brief explicitly asks for it.

- Content strategy: platform-native ideas for X, Instagram, LinkedIn, short video, email, and WhatsApp.
- Editorial review: remove generic AI phrasing, preserve facts, sharpen rhythm, specificity, proof, and CTA.
- Storytelling: use context, tension, turning point, proof, implication, CTA when it makes the offer clearer.
- Layout direction: produce Canva/Figma/code-ready hierarchy, spacing, safe zones, responsive notes, and QA checks.

## Local Data Model

- `agency_clients`: CRM base for about 20 clients.
- `agency_work_items`: demands, tasks, deliverables, approvals, blocked work.
- `agency_financial_items`: payable and receivable tracking.
- `agency_campaigns`: campaign plans, objectives, channels, KPIs.
- `agency_creative_assets`: production briefs and asset status.
- `agency_reports`: reporting periods, metrics, summaries, next steps.

## Command Center Rhythm

Daily:

1. Snapshot open work, urgent due dates, blocked approvals.
2. Review live campaigns and client escalations.
3. Identify finance risk: overdue receivables and upcoming payables.
4. Create or update work items for anything actionable.

Weekly:

1. Classify every active client: protect, grow, fix, pause.
2. Build execution queue by revenue impact, deadline risk, client trust, and team capacity.
3. Prepare client update list and report list.
4. Review automations and connector gaps.

Monthly:

1. Close reports.
2. Review retainers, profitability, and scope creep.
3. Identify upsell/cross-sell opportunities.
4. Archive completed/cancelled work.

## Local Operating Views

The local OS has three separate views:

- `admin:snapshot`: agency management, finance, overdue receivables, payables, internal work, finance work, and clients at financial risk.
- `delivery:snapshot`: client execution, campaigns, creative assets, reports, deliverables, and approval-blocked work.
- `command:center`: a combined executive queue for weekly prioritization.

Run them with:

```bash
npm run agency -- admin:snapshot
npm run agency -- delivery:snapshot
npm run agency -- command:center
```

Admin OS and Client Delivery OS stay separate in the data model. Command Center is the only place where they are intentionally mixed, and only for prioritization.

## Connector Roadmap

Phase 1, local:

- SQLite operational state.
- Codex CLI.
- Telegram control and approvals.

Phase 2, agency tools:

- Google Drive/Docs/Sheets for client folders, reports, spreadsheets.
- Gmail for client communication triage and drafts.
- GitHub for landing pages and automation code.
- Browser/Playwright for QA and screenshots.
- Canva/Figma for creative briefs and editable layouts.

Phase 3, marketing platforms:

- Meta Ads, Google Ads, TikTok Ads, LinkedIn Ads.
- GA4, Search Console, CRM, call tracking.
- Payment/accounting tools.

Phase 4, autonomy:

- Scheduled weekly command center.
- Monitoring alerts.
- Draft-first automations.
- Approval-gated external actions.

## Non-Negotiables

- Do not fabricate metrics, testimonials, client approvals, budgets, or outcomes.
- Do not mutate production marketing accounts without explicit approval.
- Do not send client-facing messages automatically until connector, approval, and logging are proven.
- Prefer a clear missing-data statement over a confident guess.
