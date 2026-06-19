import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const postsDir = path.join(root, 'src/content/blog');
const manifestPath = path.join(root, 'docs/bittensor-field-school/module-manifest.json');
const redirectsPath = path.join(root, 'public/_redirects');

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
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

function cleanText(value) {
  return value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function quizReport(source) {
  const quiz = source.match(/<section class="knowledge-check" data-quiz>([\s\S]*?)<\/section>/);
  if (!quiz) return { hasQuiz: false };

  const body = quiz[1];
  const fieldsets = [...body.matchAll(/<fieldset data-answer="([^"]+)">([\s\S]*?)<\/fieldset>/g)];
  const legends = [...body.matchAll(/<legend>([\s\S]*?)<\/legend>/g)].map((item) => cleanText(item[1]));
  const labels = [...body.matchAll(/<label>([\s\S]*?)<\/label>/g)].map((item) => cleanText(item[1]));
  const names = [...body.matchAll(/name="([^"]+)"/g)].map((item) => item[1]);

  return {
    hasQuiz: true,
    questionCount: fieldsets.length,
    legendCount: legends.length,
    hasSubmit: body.includes('data-quiz-submit'),
    hasResult: body.includes('data-quiz-result'),
    hasResultClass: /class="[^"]*\bquiz-result\b[^"]*"[^>]*data-quiz-result/.test(body),
    uniqueRadioNames: new Set(names).size,
    radioNameTotal: names.length,
    signature: JSON.stringify([...legends, ...labels]),
  };
}

if (!existsSync(manifestPath)) {
  fail(`Missing Field College manifest at ${manifestPath}`);
}

const manifest = existsSync(manifestPath) ? readJson(manifestPath) : { modules: [], deprecatedSlugs: [], requiredRedirects: [] };
const expectedSlugs = manifest.modules.map((module) => module.slug);
const expectedSet = new Set(expectedSlugs);
const actualSlugs = readdirSync(postsDir)
  .filter((entry) => entry.startsWith('bittensor-field-school-') && entry.endsWith('.md'))
  .map((entry) => entry.replace(/\.md$/, ''))
  .sort();

if (manifest.expectedModuleCount !== expectedSlugs.length) {
  fail(`Manifest expectedModuleCount is ${manifest.expectedModuleCount}, but modules list has ${expectedSlugs.length}`);
}

if (actualSlugs.length !== manifest.expectedModuleCount) {
  fail(`Expected ${manifest.expectedModuleCount} Field College modules, found ${actualSlugs.length}`);
}

for (const slug of expectedSlugs) {
  if (!actualSlugs.includes(slug)) fail(`Missing canonical module: ${slug}`);
}

for (const slug of actualSlugs) {
  if (!expectedSet.has(slug)) fail(`Unexpected Field College module outside manifest: ${slug}`);
}

for (const slug of manifest.deprecatedSlugs ?? []) {
  if (existsSync(path.join(postsDir, `${slug}.md`))) fail(`Deprecated module came back: ${slug}`);
}

const redirects = existsSync(redirectsPath) ? readFileSync(redirectsPath, 'utf8') : '';
for (const redirect of manifest.requiredRedirects ?? []) {
  const line = `${redirect.from} ${redirect.to} ${redirect.status}`;
  if (!redirects.includes(line)) fail(`Missing required redirect: ${line}`);
}

const signatures = new Map();
const internalMarkers = [
  'Review note for Tao Outsider',
  'Editorial status:',
  'draft v0.1',
  'Image status:',
  'Revision goal:',
  'published foundation module',
];

for (const module of manifest.modules) {
  const file = path.join(postsDir, `${module.slug}.md`);
  if (!existsSync(file)) continue;

  const source = readFileSync(file, 'utf8');
  const { frontmatter, body } = splitFrontmatter(source);
  const draft = frontmatterValue(frontmatter, 'draft');
  const title = frontmatterValue(frontmatter, 'title');

  if (draft !== 'false') fail(`${module.slug}: draft must be false, got ${draft || 'missing'}`);
  if (title && title !== module.title) warn(`${module.slug}: title changed from manifest title "${module.title}" to "${title}"`);

  for (const marker of internalMarkers) {
    if (source.includes(marker)) fail(`${module.slug}: internal marker is visible in source: ${marker}`);
  }

  if (/\bBittensor Field School\b|\bField School\b|\bfield school\b/.test(body)) {
    fail(`${module.slug}: old public name Field School appears in visible body copy`);
  }

  const quiz = quizReport(source);
  if (!quiz.hasQuiz) {
    fail(`${module.slug}: missing knowledge check quiz`);
    continue;
  }

  if (quiz.questionCount < 5) fail(`${module.slug}: quiz has ${quiz.questionCount} questions, minimum is 5`);
  if (quiz.legendCount < 5) fail(`${module.slug}: quiz has ${quiz.legendCount} legends, minimum is 5`);
  if (!quiz.hasSubmit) fail(`${module.slug}: quiz missing data-quiz-submit button`);
  if (!quiz.hasResult) fail(`${module.slug}: quiz missing data-quiz-result element`);
  if (!quiz.hasResultClass) fail(`${module.slug}: quiz result element missing quiz-result class`);
  if (quiz.uniqueRadioNames * 3 !== quiz.radioNameTotal) {
    fail(`${module.slug}: radio names are not unique per question`);
  }

  const existing = signatures.get(quiz.signature) ?? [];
  existing.push(module.slug);
  signatures.set(quiz.signature, existing);
}

for (const slugs of signatures.values()) {
  if (slugs.length > 1) fail(`Duplicated quiz signature across modules: ${slugs.join(', ')}`);
}

if (warnings.length) {
  console.warn('Field College guard warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (failures.length) {
  console.error('Field College guard failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Field College guard passed: ${actualSlugs.length} canonical public modules, quizzes valid, no deprecated modules.`);
