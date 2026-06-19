# Bittensor Field College

This folder controls the Tao Outsider Bittensor Field College editorial rollout.

Files:

- `curriculum.md`: complete curriculum, source desk, cadence and module map.
- `module-manifest.json`: canonical public state for the 50 modules.
- `review-queue.csv`: one row per article for review tracking.

All 50 modules are public.

Before changing or deploying the Field College, run:

```bash
npm run check:field-college
```

Before a Cloudflare deploy that touches Field College, run:

```bash
npm run predeploy:field-college
```

The guard blocks the failures that previously caused drift: wrong module count, deprecated Bitcoin module returning, visible internal review notes, draft modules, duplicated quizzes, broken quiz structure and missing redirects.
