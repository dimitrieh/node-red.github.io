import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog');

  // Parse dates from filenames and sort
  // With glob loader, post.id is the filename without extension
  const sortedPosts = posts
    .map((post) => {
      const match = post.id.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
      if (match) {
        const [, year, month, day, slug] = match;
        return {
          ...post,
          date: new Date(`${year}-${month}-${day}`),
          year,
          month,
          day,
          slug,
        };
      }
      return { ...post, date: new Date(), year: '2024', month: '01', day: '01', slug: post.id };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  return rss({
    title: 'Node-RED Blog',
    description: 'Low-code programming for event-driven applications',
    site: context.site || 'https://nodered.org',
    items: sortedPosts.map((post) => ({
      title: post.data.title,
      pubDate: post.date,
      description: post.data.description || '',
      link: `/blog/${post.year}/${post.month}/${post.day}/${post.slug}/`,
    })),
  });
}
