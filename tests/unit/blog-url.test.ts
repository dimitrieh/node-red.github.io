import { describe, it, expect } from 'vitest';
import { parseBlogDate, blogPostUrl } from '../../src/utils/blog';

describe('Blog URL Generation', () => {
  it('should parse standard blog filename', () => {
    const result = parseBlogDate('2024-06-20-version-4-0-released');
    expect(result).toEqual({
      year: '2024',
      month: '06',
      day: '20',
      slug: 'version-4-0-released',
      date: new Date('2024-06-20'),
    });
  });

  it('should generate correct URL path', () => {
    const result = parseBlogDate('2024-06-20-version-4-0-released');
    const url = blogPostUrl({ ...({} as any), ...result } as any);
    expect(url).toBe('/blog/2024/06/20/version-4-0-released/');
  });

  it('should handle older blog posts', () => {
    const result = parseBlogDate('2013-10-16-version-0-2-0-released');
    expect(result).toEqual({
      year: '2013',
      month: '10',
      day: '16',
      slug: 'version-0-2-0-released',
      date: new Date('2013-10-16'),
    });
  });

  it('should return fallback for invalid filename', () => {
    const result = parseBlogDate('invalid-filename');
    expect(result.slug).toBe('invalid-filename');
    expect(result.year).toBe('2024');
  });
});
