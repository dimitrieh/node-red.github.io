import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

// Blog collection
const blogCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// About collection
const aboutCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/about' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    layout: z.string().optional(),
  }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  blog: blogCollection,
  about: aboutCollection,
};
