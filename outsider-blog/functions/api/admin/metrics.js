function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function authorized(request, env) {
  const configured = env.ADMIN_DASHBOARD_TOKEN;
  if (!configured) return false;
  const header = request.headers.get('Authorization') || '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  return token && token === configured;
}

async function ensureSchema(env) {
  await env.FEEDBACK_DB
    .prepare(`
      CREATE TABLE IF NOT EXISTS site_page_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_name TEXT NOT NULL,
        path TEXT NOT NULL,
        page_title TEXT,
        page_type TEXT,
        source TEXT,
        referrer_host TEXT,
        device TEXT,
        country TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
    .run();
}

async function all(env, sql, ...bindings) {
  const result = await env.FEEDBACK_DB.prepare(sql).bind(...bindings).all();
  return result.results || [];
}

export async function onRequestGet({ env, request }) {
  if (!authorized(request, env)) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env.FEEDBACK_DB) {
    return json({ error: 'Missing FEEDBACK_DB binding.' }, 500);
  }

  await ensureSchema(env);

  const [
    totals,
    daily,
    pages,
    sources,
    devices,
    countries,
    feedback,
  ] = await Promise.all([
    all(env, `
      SELECT
        COUNT(*) AS pageviews,
        COUNT(DISTINCT path) AS pages,
        MIN(created_at) AS first_event,
        MAX(created_at) AS last_event
      FROM site_page_events
      WHERE event_name = 'page_view'
    `),
    all(env, `
      SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS pageviews
      FROM site_page_events
      WHERE event_name = 'page_view'
      GROUP BY day
      ORDER BY day DESC
      LIMIT 30
    `),
    all(env, `
      SELECT path, COALESCE(MAX(page_title), path) AS title, COALESCE(MAX(page_type), 'page') AS page_type, COUNT(*) AS pageviews
      FROM site_page_events
      WHERE event_name = 'page_view'
      GROUP BY path
      ORDER BY pageviews DESC
      LIMIT 25
    `),
    all(env, `
      SELECT COALESCE(source, 'unknown') AS source, COUNT(*) AS pageviews
      FROM site_page_events
      WHERE event_name = 'page_view'
      GROUP BY source
      ORDER BY pageviews DESC
      LIMIT 20
    `),
    all(env, `
      SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS pageviews
      FROM site_page_events
      WHERE event_name = 'page_view'
      GROUP BY device
      ORDER BY pageviews DESC
    `),
    all(env, `
      SELECT COALESCE(country, 'unknown') AS country, COUNT(*) AS pageviews
      FROM site_page_events
      WHERE event_name = 'page_view'
      GROUP BY country
      ORDER BY pageviews DESC
      LIMIT 20
    `),
    all(env, `
      SELECT post_slug, reaction, COUNT(*) AS total
      FROM post_feedback_votes
      GROUP BY post_slug, reaction
      ORDER BY post_slug ASC, total DESC
    `).catch(() => []),
  ]);

  return json({
    generatedAt: new Date().toISOString(),
    totals: totals[0] || { pageviews: 0, pages: 0 },
    daily,
    pages,
    sources,
    devices,
    countries,
    feedback,
    externalIntegrations: {
      cloudflareGraphql: Boolean(env.CLOUDFLARE_ANALYTICS_TOKEN),
      ga4: Boolean(env.GA4_PROPERTY_ID),
    },
  });
}
