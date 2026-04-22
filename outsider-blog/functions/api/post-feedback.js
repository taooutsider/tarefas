const ALLOWED_REACTIONS = new Set(['learned', 'better', 'loved']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizePostSlug(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/[^a-z0-9/_-]/g, '').slice(0, 140);
}

function sanitizeClientId(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 80);
}

async function ensureSchema(env) {
  await env.FEEDBACK_DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS post_feedback_votes (
        post_slug TEXT NOT NULL,
        client_id TEXT NOT NULL,
        reaction TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (post_slug, client_id)
      )
    `)
    .run();

  await env.FEEDBACK_DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS idx_post_feedback_reaction
      ON post_feedback_votes (post_slug, reaction)
    `)
    .run();
}

async function readCounts(env, postSlug) {
  const rows = await env.FEEDBACK_DB
    .prepare(`
      SELECT reaction, COUNT(*) AS total
      FROM post_feedback_votes
      WHERE post_slug = ?
      GROUP BY reaction
    `)
    .bind(postSlug)
    .all();

  const counts = { learned: 0, better: 0, loved: 0 };
  for (const row of rows.results || []) {
    if (row.reaction in counts) {
      counts[row.reaction] = Number(row.total) || 0;
    }
  }
  return counts;
}

export async function onRequestGet({ env, request }) {
  if (!env.FEEDBACK_DB) {
    return json({ error: 'Missing FEEDBACK_DB binding.' }, 500);
  }

  const url = new URL(request.url);
  const postSlug = sanitizePostSlug(url.searchParams.get('post') || '');
  if (!postSlug) {
    return json({ error: 'Invalid post.' }, 400);
  }

  await ensureSchema(env);
  const counts = await readCounts(env, postSlug);
  return json({ postSlug, counts });
}

export async function onRequestPost({ env, request }) {
  if (!env.FEEDBACK_DB) {
    return json({ error: 'Missing FEEDBACK_DB binding.' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON payload.' }, 400);
  }

  const postSlug = sanitizePostSlug(payload?.postSlug);
  const clientId = sanitizeClientId(payload?.clientId);
  const reaction = typeof payload?.reaction === 'string'
    ? payload.reaction.trim().toLowerCase()
    : '';

  if (!postSlug || !clientId || !ALLOWED_REACTIONS.has(reaction)) {
    return json({ error: 'Invalid feedback payload.' }, 400);
  }

  await ensureSchema(env);
  await env.FEEDBACK_DB
    .prepare(`
      INSERT INTO post_feedback_votes (post_slug, client_id, reaction)
      VALUES (?, ?, ?)
      ON CONFLICT(post_slug, client_id)
      DO UPDATE SET
        reaction = excluded.reaction,
        updated_at = CURRENT_TIMESTAMP
    `)
    .bind(postSlug, clientId, reaction)
    .run();

  const counts = await readCounts(env, postSlug);
  return json({ ok: true, postSlug, reaction, counts });
}
