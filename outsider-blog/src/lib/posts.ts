import type { CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blog'>;

const BUILD_TIME = Date.now();

export const isPublishedAt = (post: BlogPost, now = BUILD_TIME) =>
  !post.data.draft && post.data.pubDate.valueOf() <= now;

export const isPublishedPost = (post: BlogPost) => isPublishedAt(post);

export const sortNewestPosts = <T extends BlogPost>(posts: T[]) =>
  [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

export const sortOldestPosts = <T extends BlogPost>(posts: T[]) =>
  [...posts].sort((a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf());
