# Connector Readiness

The agent starts local-first. External tools should be connected only after Admin OS, Client Delivery OS, and Command Center behave correctly with local records.

## Current Priority

1. Google Drive and Sheets: source files, client folders, reports, finance sheets, CSV import/export.
2. Gmail: inbox triage and draft creation. Sending requires explicit approval.
3. Canva: editable creative assets and resized social formats.
4. Figma: layouts, UI specs, landing page wireframes, and design-system handoff.
5. Browser/Playwright: landing page QA, screenshots, and public workflow checks.
6. Meta Ads and Instagram: read-only performance first, then approval-gated changes.
7. Supabase/Postgres: upgrade path when SQLite is no longer enough.
8. Vercel/Cloudflare: deploy path for dashboards, landing pages, and scheduled workers.

## Approval Boundary

Allowed without approval:

- Read connected files when requested.
- Create local records.
- Generate drafts, templates, reports, briefs, and internal recommendations.

Requires approval:

- Sending email.
- Publishing posts, designs, reports, landing pages, or ads.
- Changing budgets, audiences, campaigns, pixels, conversion events, or forms.
- Applying database migrations to production.
- Creating paid resources or changing billing-sensitive settings.

## First External Data Flow

Use Google Sheets as the first external source:

1. Export local templates with `npm run agency -- data:templates`.
2. Upload or convert the CSVs to Google Sheets.
3. Fill clients, finance, delivery, campaigns, assets, and reports.
4. Export back to CSV or let Codex read Sheets through the Google Drive connector.
5. Import into SQLite with `npm run agency -- data:import`.
