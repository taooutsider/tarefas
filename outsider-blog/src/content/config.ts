import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['analysis', 'subnet', 'trade', 'guide', 'weekly', 'news']),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Tao Outsider'),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

export const collections = { blog };
