const PROJECT_NAME = 'taooutsider';

async function triggerPagesBuild(env, source) {
  if (env.PAGES_DEPLOY_HOOK_URL) {
    const response = await fetch(env.PAGES_DEPLOY_HOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    return {
      ok: response.ok,
      status: response.status,
      source,
      mode: 'deploy-hook',
      body: await response.text(),
    };
  }

  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN) {
    return {
      ok: false,
      status: 500,
      source,
      mode: 'not-configured',
      body: 'Missing PAGES_DEPLOY_HOOK_URL or CLOUDFLARE_ACCOUNT_ID plus CLOUDFLARE_API_TOKEN.',
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    ok: response.ok,
    status: response.status,
    source,
    mode: 'pages-api',
    body: await response.text(),
  };
}

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil((async () => {
      const result = await triggerPagesBuild(env, `cron:${controller.cron}`);
      if (!result.ok) throw new Error(`Scheduled publish failed: ${result.status} ${result.body}`);
      console.log(JSON.stringify(result));
    })());
  },

  async fetch(request, env) {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!env.PUBLISH_SCHEDULER_TOKEN || token !== env.PUBLISH_SCHEDULER_TOKEN) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await triggerPagesBuild(env, 'manual');
    return Response.json(result, { status: result.ok ? 200 : 500 });
  },
};
