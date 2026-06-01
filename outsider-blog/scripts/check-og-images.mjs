import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const postsDir = path.join(root, 'src/content/blog');
const publicDir = path.join(root, 'public');
const requiredWidth = 1200;
const requiredHeight = 630;
const failures = [];

function readFrontmatter(file) {
  const source = readFileSync(file, 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  return match?.[1] ?? '';
}

function frontmatterValue(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*["']?([^"'\n]+)["']?\\s*$`, 'm'));
  return match?.[1]?.trim();
}

function imageSize(file) {
  const output = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file], {
    encoding: 'utf8',
  });
  return {
    width: Number(output.match(/pixelWidth:\s*(\d+)/)?.[1]),
    height: Number(output.match(/pixelHeight:\s*(\d+)/)?.[1]),
  };
}

for (const entry of readdirSync(postsDir)) {
  if (!entry.endsWith('.md')) continue;

  const file = path.join(postsDir, entry);
  const frontmatter = readFrontmatter(file);
  const ogImage = frontmatterValue(frontmatter, 'ogImage');

  if (!ogImage) {
    failures.push(`${entry}: missing ogImage`);
    continue;
  }

  if (!/^\/.+\.(jpe?g|png)$/i.test(ogImage)) {
    failures.push(`${entry}: ogImage must be a JPG or PNG path from public, got ${ogImage}`);
    continue;
  }

  const imagePath = path.join(publicDir, ogImage.replace(/^\//, ''));
  if (!existsSync(imagePath)) {
    failures.push(`${entry}: ogImage file does not exist at ${ogImage}`);
    continue;
  }

  const { width, height } = imageSize(imagePath);
  if (width !== requiredWidth || height !== requiredHeight) {
    failures.push(`${entry}: ogImage must be ${requiredWidth}x${requiredHeight}, got ${width}x${height}`);
  }
}

if (failures.length) {
  console.error('OG image validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`All blog posts have ${requiredWidth}x${requiredHeight} JPG or PNG OG images.`);
