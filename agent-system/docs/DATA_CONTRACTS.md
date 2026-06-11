# Agency OS Data Contracts

Use these CSV files to onboard real agency data without connecting external platforms first.

Generate blank templates:

```bash
npm run agency -- data:templates --dir ./data/import-template
```

Import a completed folder:

```bash
npm run agency -- data:import --dir ./data/import-template
```

Export the current local database:

```bash
npm run agency -- data:export --dir ./data/export
```

Generate the full data/API request manifest:

```bash
npm run agency -- onboarding:manifest --out ./data/onboarding-manifest.md
```

## Files

- `clients.csv`: client CRM base.
- `work_items.csv`: admin and client delivery tasks.
- `financial_items.csv`: receivables and payables.
- `campaigns.csv`: campaign plans and live campaign records.
- `creative_assets.csv`: production briefs and asset status.
- `reports.csv`: reporting periods, summaries, next steps, and metrics JSON.

## ID Rules

- Client IDs can be left blank in `clients.csv`; the local database generates IDs.
- Any row that references a client needs `clientId`.
- Recommended onboarding flow:
  1. Import or create clients.
  2. Export once to get generated client IDs.
  3. Fill dependent files with those IDs.
  4. Import work, finance, campaigns, assets, and reports.

## Safety

These CSV imports only create local records. They do not send emails, publish posts, change ad accounts, pay invoices, or deploy code.
