import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const postsDir = path.join(root, 'src/content/blog');
const publicDir = path.join(root, 'public');
const generatedDir = path.join(root, 'src/data/generated');
const outputRoot = path.join(publicDir, 'optimized');
const manifestPath = path.join(generatedDir, 'optimized-images.json');

const rasterPattern = /\.(jpe?g|png)$/i;
const frontmatterImagePattern = /^(image|ogImage):\s*["']?([^"'\n]+)["']?\s*$/gm;
const markdownImagePattern = /!\[[^\]]*]\((\/[^)\s]+(?:\s+"[^"]*")?)\)/g;

const variants = {
  card: { width: 640, height: 336, fit: 'cover', formats: ['avif', 'webp'] },
  hero: { width: 1200, height: 630, fit: 'cover', formats: ['avif', 'webp'] },
  content: { width: 1200, height: null, fit: 'inside', formats: ['webp'] },
};

const requested = new Set();

function localPublicPath(url) {
  if (!url.startsWith('/') || !rasterPattern.test(url)) return null;
  const cleanUrl = url.split(/[?#]/)[0];
  const filePath = path.join(publicDir, cleanUrl.replace(/^\//, ''));
  if (!filePath.startsWith(publicDir)) return null;
  return { url: cleanUrl, filePath };
}

function outputStem(url) {
  return url
    .replace(/^\//, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function collectFromMarkdown(filePath) {
  const source = readFileSync(filePath, 'utf8');

  for (const match of source.matchAll(frontmatterImagePattern)) {
    const entry = localPublicPath(match[2].trim());
    if (entry) requested.add(entry.url);
  }

  for (const match of source.matchAll(markdownImagePattern)) {
    const url = match[1].split(/\s+/)[0].trim();
    const entry = localPublicPath(url);
    if (entry) requested.add(entry.url);
  }
}

function collectMarkdownFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMarkdownFiles(fullPath);
    if (entry.isFile() && entry.name.endsWith('.md')) collectFromMarkdown(fullPath);
  }
}

async function buildVariant(inputPath, url, variantName, settings, metadata) {
  const stem = outputStem(url);
  const outputDir = path.join(outputRoot, variantName);
  mkdirSync(outputDir, { recursive: true });

  const result = {
    width: settings.width,
    height: settings.height ?? Math.round(metadata.height * Math.min(1, settings.width / metadata.width)),
  };

  for (const format of settings.formats) {
    const outputPath = path.join(outputDir, `${stem}.${format}`);
    const publicPath = `/optimized/${variantName}/${stem}.${format}`;
    let image = sharp(inputPath).rotate();

    if (settings.fit === 'cover') {
      image = image.resize(settings.width, settings.height, {
        fit: 'cover',
        position: 'attention',
        withoutEnlargement: false,
      });
    } else {
      image = image.resize({
        width: settings.width,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    if (format === 'avif') {
      image = image.avif({ quality: 48, effort: 5 });
    } else {
      image = image.webp({ quality: 72, effort: 5 });
    }

    await image.toFile(outputPath);
    result[format] = publicPath;
  }

  return result;
}

collectMarkdownFiles(postsDir);
mkdirSync(generatedDir, { recursive: true });

const manifest = {};

for (const url of [...requested].sort()) {
  const source = localPublicPath(url);
  if (!source) continue;

  let metadata;
  try {
    metadata = await sharp(source.filePath).metadata();
  } catch {
    continue;
  }

  if (!metadata.width || !metadata.height) continue;

  manifest[url] = {
    original: url,
    originalWidth: metadata.width,
    originalHeight: metadata.height,
  };

  for (const [variantName, settings] of Object.entries(variants)) {
    manifest[url][variantName] = await buildVariant(source.filePath, url, variantName, settings, metadata);
  }
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Generated optimized derivatives for ${Object.keys(manifest).length} raster images.`);
