import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const manifestPath = path.join(root, 'docs/basic-seo-article-map.json');
const postsDir = path.join(root, 'src/content/blog');
const imageDir = path.join(root, 'public/blog/basic-seo');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

const palettes = [
  { accent: '#E6FF5C', soft: '#2F3B16', label: 'Protocol' },
  { accent: '#7DD3FC', soft: '#122D3A', label: 'Subnets' },
  { accent: '#C4B5FD', soft: '#2D2446', label: 'Markets' },
  { accent: '#86EFAC', soft: '#17361F', label: 'Research' },
  { accent: '#F9A8D4', soft: '#3C1E32', label: 'Risk' },
  { accent: '#FDE68A', soft: '#3B3014', label: 'Tools' },
];

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function frontmatterValue(markdown, key) {
  return markdown.match(new RegExp(`^${key}:\\\\s*["']?([^"\\\\n']+)["']?`, 'm'))?.[1] || '';
}

function wrapText(value, width) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > width && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function articleTheme(slug, title) {
  const value = `${slug} ${title}`.toLowerCase();
  if (value.includes('subnet')) return palettes[1];
  if (value.includes('dtao') || value.includes('alpha') || value.includes('emission') || value.includes('root') || value.includes('market') || value.includes('price') || value.includes('apy') || value.includes('staking')) return palettes[2];
  if (value.includes('tool') || value.includes('taoswap') || value.includes('taostats') || value.includes('track') || value.includes('news')) return palettes[5];
  if (value.includes('risk') || value.includes('safe') || value.includes('scam') || value.includes('investment')) return palettes[4];
  if (value.includes('research') || value.includes('how to')) return palettes[3];
  return palettes[0];
}

function svgForArticle(article, index, markdown) {
  const title = frontmatterValue(markdown, 'title') || article.title;
  const description = frontmatterValue(markdown, 'description') || article.intent;
  const theme = articleTheme(article.slug, title);
  const titleLines = wrapText(title, 28).slice(0, 3);
  const descriptionLines = wrapText(description, 68).slice(0, 2);
  const issue = String(index + 1).padStart(2, '0');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#050505"/>
  <rect x="56" y="48" width="1088" height="534" rx="34" fill="#0A0A0A" stroke="#242424"/>
  <rect x="84" y="76" width="1032" height="478" rx="24" fill="#080808" stroke="#171717"/>
  <g opacity="0.54">
    ${Array.from({ length: 9 }, (_, i) => `<path d="M110 ${142 + i * 44}H1090" stroke="#191919"/>`).join('\n    ')}
    ${Array.from({ length: 8 }, (_, i) => `<path d="M${180 + i * 118} 110V520" stroke="#151515"/>`).join('\n    ')}
  </g>
  <circle cx="986" cy="172" r="112" fill="${theme.soft}" opacity="0.82"/>
  <circle cx="986" cy="172" r="74" fill="#0B0B0B" stroke="${theme.accent}" stroke-width="10"/>
  <path d="M986 98V246" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
  <path d="M912 172H1060" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
  <circle cx="986" cy="172" r="20" fill="${theme.accent}"/>
  <text x="112" y="126" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="35" font-weight="900">outsider</text>
  <text x="112" y="174" fill="${theme.accent}" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="900" letter-spacing="3">BITTENSOR BASIC GUIDE ${issue}</text>
  ${titleLines.map((line, i) => `<text x="112" y="${270 + i * 68}" fill="#FFFFFF" font-family="Inter, Arial, sans-serif" font-size="58" font-weight="900">${esc(line)}</text>`).join('\n  ')}
  ${descriptionLines.map((line, i) => `<text x="114" y="${482 + i * 32}" fill="#B8B8B8" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="650">${esc(line)}</text>`).join('\n  ')}
  <rect x="874" y="462" width="214" height="54" rx="13" fill="#FFFFFF"/>
  <text x="904" y="497" fill="#000000" font-family="Inter, Arial, sans-serif" font-size="21" font-weight="900">TAO OUTSIDER</text>
  <text x="876" y="544" fill="#777777" font-family="Inter, Arial, sans-serif" font-size="19" font-weight="800">${esc(theme.label.toUpperCase())}</text>
</svg>`;
}

function updateFrontmatter(markdown, slug) {
  const imagePath = `/blog/basic-seo/${slug}-og.jpg`;
  return markdown
    .replace(/^image:\s*["']?[^"'\n]+["']?\s*$/m, `image: "${imagePath}"`)
    .replace(/^imageAlt:\s*["']?[^"'\n]+["']?\s*$/m, 'imageAlt: "Tao Outsider Bittensor basic guide"')
    .replace(/^ogImage:\s*["']?[^"'\n]+["']?\s*$/m, `ogImage: "${imagePath}"`);
}

mkdirSync(imageDir, { recursive: true });

for (const [index, article] of manifest.entries()) {
  const markdownPath = path.join(postsDir, `${article.slug}.md`);
  const markdown = readFileSync(markdownPath, 'utf8');
  const svg = svgForArticle(article, index, markdown);
  const jpgPath = path.join(imageDir, `${article.slug}-og.jpg`);

  await sharp(Buffer.from(svg)).jpeg({ quality: 91, mozjpeg: true }).toFile(jpgPath);
  writeFileSync(markdownPath, updateFrontmatter(markdown, article.slug), 'utf8');
}

console.log(`Generated ${manifest.length} basic SEO images.`);
