import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { isPublishedPost, sortNewestPosts } from '../lib/posts';

export async function GET(context: { site: URL }) {
  const sorted = sortNewestPosts((await getCollection('blog')).filter(isPublishedPost));

  return rss({
    title: 'Tao Outsider',
    description: 'Zoomed out on TAO Bittensor. Tracking every dTAO subnet. Mapping the future of decentralized AI.',
    site: context.site,
    items: sorted.map((post) => ({
      title: post.data.title,
      pubDate: post.data.pubDate,
      description: post.data.description,
      link: `/blog/${post.id}/`,
      categories: [post.data.category, ...post.data.tags],
    })),
    customData: '<language>en-us</language>',
  });
}
