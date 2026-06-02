import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/scan-article-copy.mjs <markdown-file>');
  process.exit(1);
}

const source = readFileSync(file, 'utf8')
  .replace(/<section class="knowledge-check"[\s\S]*?<\/section>/g, '')
  .replace(/<nav class="course-nav"[\s\S]*?<\/nav>/g, '')
  .replace(/<\/?(section|div)[^>]*>/g, '');

const dir = mkdtempSync(path.join(tmpdir(), 'taooutsider-scan-'));
const tempFile = path.join(dir, 'article.md');
writeFileSync(tempFile, source);

try {
  execFileSync(
    'python3',
    ['/Users/victorlamenha/.codex/skills/outsider-blog-seo-human-writing/scripts/outsider_article_scan.py', tempFile],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
