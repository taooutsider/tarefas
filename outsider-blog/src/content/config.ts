import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['analysis', 'subnet', 'trade', 'guide']),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Tao Outsider'),
    reviewedBy: z.string().optional(),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    ogImage: z.string().optional(),
  }),
});

export const collections = { blog };
