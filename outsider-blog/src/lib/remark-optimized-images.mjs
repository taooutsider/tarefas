import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const manifestPath = path.join(process.cwd(), 'src/data/generated/optimized-images.json');
const rasterPattern = /\.(jpe?g|png)$/i;

function readManifest() {
  if (!existsSync(manifestPath)) return {};
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return {};
  }
}

function visit(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  if (!Array.isArray(node.children)) return;
  for (const child of node.children) visit(child, callback);
}

export function optimizedImageRemark() {
  const manifest = readManifest();

  return (tree) => {
    visit(tree, (node) => {
      if (node.type !== 'image' || typeof node.url !== 'string') return;
      if (!node.url.startsWith('/') || !rasterPattern.test(node.url)) return;

      const entry = manifest[node.url]?.content;
      if (!entry?.webp) return;

      node.url = entry.webp;
      node.data ??= {};
      node.data.hProperties ??= {};
      node.data.hProperties.loading = 'lazy';
      node.data.hProperties.decoding = 'async';
      node.data.hProperties.width = entry.width;
      node.data.hProperties.height = entry.height;
    });
  };
}
