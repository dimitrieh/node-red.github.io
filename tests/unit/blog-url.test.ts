import { describe, it, expect } from 'vitest';

function parseBlogFilename(filename: string) {
  const match = filename.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)$/);
  if (match) {
    const [, year, month, day, slug] = match;
    return { year, month, day, slug, date: new Date(`${year}-${month}-${day}`) };
  }
  return null;
}

describe('Blog URL Generation', () => {
  it('should parse standard blog filename', () => {
    const result = parseBlogFilename('2024-06-20-version-4-0-released');
    expect(result).toEqual({
      year: '2024',
      month: '06',
      day: '20',
      slug: 'version-4-0-released',
      date: new Date('2024-06-20'),
    });
  });

  it('should generate correct URL path', () => {
    const result = parseBlogFilename('2024-06-20-version-4-0-released');
    expect(result).not.toBeNull();
    if (result) {
      const url = `/blog/${result.year}/${result.month}/${result.day}/${result.slug}/`;
      expect(url).toBe('/blog/2024/06/20/version-4-0-released/');
    }
  });

  it('should handle older blog posts', () => {
    const result = parseBlogFilename('2013-10-16-version-0-2-0-released');
    expect(result).toEqual({
      year: '2013',
      month: '10',
      day: '16',
      slug: 'version-0-2-0-released',
      date: new Date('2013-10-16'),
    });
  });

  it('should return null for invalid filename', () => {
    const result = parseBlogFilename('invalid-filename');
    expect(result).toBeNull();
  });
});
