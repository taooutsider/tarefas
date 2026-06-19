import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const postsDir = path.join(root, 'src/content/blog');
const manifestPath = path.join(root, 'docs/basic-seo-article-map.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const startDate = '2026-06-19';
const localHours = [9, 12, 15, 18, 21];
const [startYear, startMonth, startDay] = startDate.split('-').map(Number);

function scheduledIso(index) {
  const dayOffset = Math.floor(index / localHours.length);
  const slot = index % localHours.length;
  const utcDate = new Date(Date.UTC(startYear, startMonth - 1, startDay + dayOffset, localHours[slot] + 3, 0, 0));
  return utcDate.toISOString().replace('.000Z', 'Z');
}

function schedulePost(article, index) {
  const filePath = path.join(postsDir, `${article.slug}.md`);
  let markdown = readFileSync(filePath, 'utf8');
  const date = scheduledIso(index);

  markdown = markdown
    .replace(/^pubDate:\s*.+$/m, `pubDate: ${date}`)
    .replace(/^draft:\s*true\s*$/m, 'draft: false');

  writeFileSync(filePath, markdown, 'utf8');

  return {
    ...article,
    pubDate: date,
    localTime: dateToRecife(date),
    draft: false,
  };
}

function dateToRecife(iso) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso)).replace(',', '');
}

const scheduled = manifest.map(schedulePost);

writeFileSync(
  manifestPath,
  `${JSON.stringify(scheduled, null, 2)}\n`,
  'utf8',
);

console.log(`Scheduled ${scheduled.length} basic SEO posts at 5 per day.`);
console.log(`First: ${scheduled[0].slug} ${scheduled[0].pubDate}`);
console.log(`Last: ${scheduled.at(-1).slug} ${scheduled.at(-1).pubDate}`);
