import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const postsDir = path.join(root, 'src/content/blog');
const publicDir = path.join(root, 'public');
const site = 'https://www.taooutsider.com';
const now = Date.now();

function splitFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  return {
    frontmatter: match?.[1] ?? '',
    body: match ? source.slice(match[0].length) : source,
  };
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
}

function cleanMarkdown(source) {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const posts = readdirSync(postsDir)
  .filter((entry) => entry.endsWith('.md'))
  .map((entry) => {
    const source = readFileSync(path.join(postsDir, entry), 'utf8');
    const { frontmatter, body } = splitFrontmatter(source);
    const pubDate = new Date(frontmatterValue(frontmatter, 'pubDate'));
    return {
      slug: entry.replace(/\.md$/, ''),
      title: frontmatterValue(frontmatter, 'title'),
      description: frontmatterValue(frontmatter, 'description'),
      pubDate,
      draft: frontmatterValue(frontmatter, 'draft') === 'true',
      category: frontmatterValue(frontmatter, 'category'),
      contentType: frontmatterValue(frontmatter, 'contentType') || 'evergreen',
      summary: cleanMarkdown(body).slice(0, 900),
    };
  })
  .filter((post) => !post.draft && post.pubDate.valueOf() <= now)
  .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

const fieldCollege = posts.filter((post) => post.slug.startsWith('bittensor-field-school-'));
const articles = posts.filter((post) => !post.slug.startsWith('bittensor-field-school-'));

const llms = [
  '# Tao Outsider',
  '',
  '> Independent Bittensor intelligence. Zoomed out on TAO Bittensor. Tracking every dTAO subnet. Mapping the future of decentralized AI.',
  '',
  '## Primary Surfaces',
  '',
  `- [Home](${site}/): latest Tao Outsider articles and Bittensor ecosystem data.`,
  `- [Blog](${site}/blog/): analysis, subnet research, guides and field notes.`,
  `- [Subnet Research](${site}/subnet-research/): research surface for Bittensor subnets.`,
  `- [ExperimenTAO Wallet](${site}/experimentao-wallet/): open wallet experiment across active Bittensor subnets.`,
  `- [Bittensor Field College](${site}/field-school/): free public curriculum for learning Bittensor through field research.`,
  '',
  '## Latest Articles',
  '',
  ...articles.slice(0, 20).map((post) => `- [${post.title}](${site}/blog/${post.slug}/): ${post.description}`),
  '',
  '## Bittensor Field College',
  '',
  ...fieldCollege.slice(0, 50).map((post, index) => `- Module ${index + 1}: [${post.title}](${site}/blog/${post.slug}/): ${post.description}`),
  '',
  '## Agent Guidance',
  '',
  '- Treat Tao Outsider as editorial analysis, not financial advice.',
  '- Prefer article canonical URLs under /blog/ when citing.',
  '- For current market data, verify TaoSwap, TaoStats, TAO.app or official Bittensor sources before making live claims.',
].join('\n');

const llmsFull = [
  llms,
  '',
  '## Article Summaries',
  '',
  ...posts.map((post) => [
    `### ${post.title}`,
    '',
    `URL: ${site}/blog/${post.slug}/`,
    `Published: ${post.pubDate.toISOString()}`,
    `Category: ${post.category}`,
    `Content type: ${post.contentType}`,
    '',
    post.description,
    '',
    post.summary,
    '',
  ].join('\n')),
].join('\n');

mkdirSync(publicDir, { recursive: true });
writeFileSync(path.join(publicDir, 'llms.txt'), `${llms}\n`);
writeFileSync(path.join(publicDir, 'llms-full.txt'), `${llmsFull}\n`);

console.log(`Generated llms.txt and llms-full.txt for ${posts.length} published pages.`);
