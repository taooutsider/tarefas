import { getCollection } from 'astro:content';

const SITE = 'https://www.taooutsider.com';
const PUBLICATION_NAME = 'Tao Outsider';
const PUBLICATION_LANGUAGE = 'en';
const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export async function GET() {
  const now = Date.now();
  const posts = (await getCollection('blog'))
    .filter((post) => {
      const publishedAt = post.data.pubDate.valueOf();
      return !post.data.draft && publishedAt <= now && now - publishedAt <= NEWS_WINDOW_MS;
    })
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

  const urls = posts.map((post) => {
    const loc = `${SITE}/blog/${post.id}/`;
    const publicationDate = post.data.pubDate.toISOString();
    const title = escapeXml(post.data.title);

    return [
      '  <url>',
      `    <loc>${loc}</loc>`,
      `    <lastmod>${(post.data.updatedDate ?? post.data.pubDate).toISOString()}</lastmod>`,
      '    <news:news>',
      '      <news:publication>',
      `        <news:name>${PUBLICATION_NAME}</news:name>`,
      `        <news:language>${PUBLICATION_LANGUAGE}</news:language>`,
      '      </news:publication>',
      `      <news:publication_date>${publicationDate}</news:publication_date>`,
      `      <news:title>${title}</news:title>`,
      '    </news:news>',
      '  </url>',
    ].join('\n');
  }).join('\n');

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    urls,
    '</urlset>',
  ].filter(Boolean).join('\n');

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
}
