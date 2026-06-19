import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const postsDir = path.join(root, 'src/content/blog');
const publicDir = path.join(root, 'public');
const now = Date.now();
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

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

function frontmatterBoolean(frontmatter, key) {
  return frontmatterValue(frontmatter, key) === 'true';
}

function assertPublicAsset(postFile, field, value) {
  if (!value) {
    fail(`${postFile}: missing ${field}`);
    return;
  }
  if (!value.startsWith('/')) {
    fail(`${postFile}: ${field} must be an absolute public path, got ${value}`);
    return;
  }
  const file = path.join(publicDir, value.slice(1));
  if (!existsSync(file)) fail(`${postFile}: ${field} asset does not exist at ${value}`);
}

const files = readdirSync(postsDir).filter((entry) => entry.endsWith('.md')).sort();
let published = 0;
let scheduled = 0;
let newsEligible = 0;
let fieldCollege = 0;

for (const file of files) {
  const source = readFileSync(path.join(postsDir, file), 'utf8');
  const { frontmatter, body } = splitFrontmatter(source);
  const slug = file.replace(/\.md$/, '');
  const title = frontmatterValue(frontmatter, 'title');
  const description = frontmatterValue(frontmatter, 'description');
  const pubDateRaw = frontmatterValue(frontmatter, 'pubDate');
  const pubDate = new Date(pubDateRaw);
  const draft = frontmatterBoolean(frontmatter, 'draft');
  const category = frontmatterValue(frontmatter, 'category');
  const contentType = frontmatterValue(frontmatter, 'contentType') || 'evergreen';
  const isNewsEligible = frontmatterBoolean(frontmatter, 'newsEligible');
  const image = frontmatterValue(frontmatter, 'image');
  const imageAlt = frontmatterValue(frontmatter, 'imageAlt');
  const ogImage = frontmatterValue(frontmatter, 'ogImage');
  const isFieldCollege = slug.startsWith('bittensor-field-school-');

  if (!title) fail(`${file}: missing title`);
  if (!description) fail(`${file}: missing description`);
  if (!pubDateRaw || Number.isNaN(pubDate.valueOf())) fail(`${file}: invalid pubDate`);
  if (!['analysis', 'subnet', 'trade', 'guide'].includes(category)) fail(`${file}: invalid category ${category || 'missing'}`);
  if (!['news', 'analysis', 'evergreen', 'guide', 'course'].includes(contentType)) fail(`${file}: invalid contentType ${contentType || 'missing'}`);

  if (title && (title.length < 18 || title.length > 95)) warn(`${file}: title length is ${title.length}, target is 18 to 95`);
  if (description && (description.length < 70 || description.length > 170)) fail(`${file}: description length is ${description.length}, required range is 70 to 170`);

  assertPublicAsset(file, 'image', image);
  assertPublicAsset(file, 'ogImage', ogImage);
  if (!imageAlt || imageAlt.length < 18) fail(`${file}: imageAlt is missing or too thin`);

  if (isFieldCollege) {
    fieldCollege += 1;
    if (contentType && contentType !== 'course') warn(`${file}: Field College module should use contentType: course`);
    if (isNewsEligible) fail(`${file}: Field College module must not be newsEligible`);
  }

  if (isNewsEligible) {
    newsEligible += 1;
    if (contentType !== 'news') fail(`${file}: newsEligible posts must use contentType: news`);
  }

  if (!draft && pubDate.valueOf() <= now) published += 1;
  if (!draft && pubDate.valueOf() > now) scheduled += 1;

  if (body.includes('schema.org/NewsArticle')) {
    fail(`${file}: hardcoded NewsArticle schema found in body`);
  }
}

for (const llmsFile of ['llms.txt', 'llms-full.txt']) {
  if (!existsSync(path.join(publicDir, llmsFile))) fail(`Missing public/${llmsFile}. Run npm run generate:llms`);
}

if (warnings.length) {
  console.warn('SEO audit warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('SEO audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${published} published posts, ${scheduled} scheduled posts, ${newsEligible} news eligible posts, ${fieldCollege} Field College modules.`);
