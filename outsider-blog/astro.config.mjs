import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { optimizedImageRemark } from './src/lib/remark-optimized-images.mjs';

export default defineConfig({
  site: 'https://www.taooutsider.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      filter: (page) => {
        const pathname = new URL(page).pathname;
        return !pathname.startsWith('/blog/tag/') && !pathname.startsWith('/field-school/review/');
      },
    }),
  ],
  markdown: {
    remarkPlugins: [optimizedImageRemark],
    shikiConfig: {
      theme: 'github-dark',
      wrap: true,
    },
  },
});
