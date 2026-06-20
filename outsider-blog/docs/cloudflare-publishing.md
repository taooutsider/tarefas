# Tao Outsider Cloudflare publishing

This file documents the operational path for scheduled publishing.

## What is already handled by code

Future posts can be prepared with `draft: false` and a future `pubDate`.
Astro only includes posts whose `pubDate` is already in the past at build time.
That means Cloudflare needs a fresh build after each scheduled time.

The worker in `workers/publish-scheduler.js` triggers a Cloudflare Pages deployment on a cron.
It supports two modes:

1. `PAGES_DEPLOY_HOOK_URL`
2. `CLOUDFLARE_ACCOUNT_ID` plus `CLOUDFLARE_API_TOKEN`

The account id is already set in `wrangler.publish-scheduler.toml`.

## Required secrets

Set one of these:

```bash
npx wrangler secret put PAGES_DEPLOY_HOOK_URL --config wrangler.publish-scheduler.toml
```

Or:

```bash
npx wrangler secret put CLOUDFLARE_API_TOKEN --config wrangler.publish-scheduler.toml
```

For manual triggering, also set:

```bash
npx wrangler secret put PUBLISH_SCHEDULER_TOKEN --config wrangler.publish-scheduler.toml
```

## Deploy the scheduler

Only deploy the scheduler after one of the build trigger secrets exists.

```bash
npx wrangler deploy --config wrangler.publish-scheduler.toml
```

## Manual trigger

```bash
curl -X POST https://taooutsider-publish-scheduler.<workers-subdomain>.workers.dev \
  -H "Authorization: Bearer $PUBLISH_SCHEDULER_TOKEN"
```

## Current publication cadence

The basic SEO editorial cadence is two posts per day:

1. 09:00 America Recife
2. 21:00 America Recife

In UTC, that is 12:00 and 00:00.
The scheduler deploys at minute 35 after each slot so Astro can include posts whose `pubDate` has already passed.
