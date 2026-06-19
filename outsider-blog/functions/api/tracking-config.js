export async function onRequestGet({ env }) {
  return Response.json({
    gaMeasurementId: env.PUBLIC_GA_MEASUREMENT_ID || '',
    cloudflareWebAnalyticsToken: env.PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN || '',
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
