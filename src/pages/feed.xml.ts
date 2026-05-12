import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { parseBlogPosts, sortBlogPosts, blogPostUrl } from '../utils/blog';
import type { APIContext } from 'astro';

// Legacy RSS endpoint preserved from the Jekyll site so existing
// subscribers at https://nodered.org/feed.xml keep receiving updates.
// /blog/rss/ is the new canonical path and uses the same data.
export async function GET(context: APIContext) {
  const posts = await getCollection('blog');
  const sortedPosts = sortBlogPosts(parseBlogPosts(posts));

  return rss({
    title: 'Node-RED Blog',
    description: 'Low-code programming for event-driven applications',
    site: context.site || 'https://nodered.org',
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.date,
      description: post.data.description || '',
      link: blogPostUrl(post),
    })),
  });
}
