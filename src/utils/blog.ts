export interface ParsedBlogPost {
  id: string;
  data: {
    title: string;
    author: string;
    description?: string;
    image?: string;
    draft?: boolean;
  };
  date: Date;
  year: string;
  month: string;
  day: string;
  slug: string;
}

export function parseBlogDate(id: string) {
  const match = id.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (match) {
    const [, year, month, day, slug] = match;
    return { date: new Date(`${year}-${month}-${day}`), year, month, day, slug };
  }
  return { date: new Date(), year: '2024', month: '01', day: '01', slug: id };
}

export function parseBlogPosts(posts: any[]): ParsedBlogPost[] {
  return posts.map((post) => {
    const parsed = parseBlogDate(post.id);
    return { ...post, ...parsed };
  });
}

export function sortBlogPosts(posts: ParsedBlogPost[]): ParsedBlogPost[] {
  return [...posts].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function formatBlogDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function blogPostUrl(post: ParsedBlogPost): string {
  return `/blog/${post.year}/${post.month}/${post.day}/${post.slug}/`;
}
