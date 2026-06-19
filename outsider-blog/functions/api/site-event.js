const MAX_PATH_LENGTH = 180;
const MAX_TEXT_LENGTH = 220;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeText(value, max = MAX_TEXT_LENGTH) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function sanitizePath(value) {
  const raw = sanitizeText(value, MAX_PATH_LENGTH);
  if (!raw.startsWith('/')) return '/';
  return raw.replace(/[^a-zA-Z0-9/_?.=&%-]/g, '').slice(0, MAX_PATH_LENGTH);
}

function sourceFromReferrer(referrer) {
  if (!referrer) return 'direct';
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'unknown';
  }
  if (!host) return 'direct';
  if (host.includes('x.com') || host.includes('twitter.com') || host.includes('t.co')) return 'x';
  if (host.includes('google.')) return 'google';
  if (host.includes('bing.')) return 'bing';
  if (host.includes('chatgpt.') || host.includes('openai.')) return 'ai_assistant';
  if (host.includes('taooutsider.com')) return 'internal';
  return host;
}

function deviceFromUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/mobile|iphone|android/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
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

  await env.FEEDBACK_DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS idx_site_page_events_created_path
      ON site_page_events (created_at, path)
    `)
    .run();

  await env.FEEDBACK_DB
    .prepare(`
      CREATE INDEX IF NOT EXISTS idx_site_page_events_source
      ON site_page_events (source, created_at)
    `)
    .run();
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

  const eventName = sanitizeText(payload?.eventName || 'page_view', 60).toLowerCase();
  const path = sanitizePath(payload?.path || '/');
  const pageTitle = sanitizeText(payload?.pageTitle || '');
  const pageType = sanitizeText(payload?.pageType || 'page', 60).toLowerCase();
  const referrer = sanitizeText(payload?.referrer || '', 500);
  const referrerHost = referrer ? (() => {
    try {
      return new URL(referrer).hostname.replace(/^www\./, '').slice(0, 120);
    } catch {
      return '';
    }
  })() : '';
  const userAgent = request.headers.get('user-agent') || '';
  const country = request.headers.get('cf-ipcountry') || '';

  await ensureSchema(env);
  await env.FEEDBACK_DB
    .prepare(`
      INSERT INTO site_page_events (
        event_name, path, page_title, page_type, source, referrer_host, device, country
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      eventName || 'page_view',
      path,
      pageTitle,
      pageType,
      sourceFromReferrer(referrer),
      referrerHost,
      deviceFromUserAgent(userAgent),
      sanitizeText(country, 8),
    )
    .run();

  return json({ ok: true });
}
