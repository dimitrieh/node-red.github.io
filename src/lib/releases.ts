import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Build-time loader for Node-RED's published GitHub releases.
 *
 * The `/releases` page and the nav version badge both render from a
 * snapshot fetched here at build time. A client-side script
 * (see VersionBadge / releases page) re-checks the API on load and
 * patches the version/zip if the static snapshot has gone stale — the
 * site only rebuilds on its own repo changes, not when Node-RED ships
 * a new release upstream.
 */

const REPO = 'node-red/node-red';
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=100`;

export interface Release {
  /** Raw git tag, e.g. "4.1.10". */
  tag: string;
  /** Display title from GitHub, falling back to the tag. */
  name: string;
  /** ISO 8601 publish timestamp. */
  date: string;
  prerelease: boolean;
  /** GitHub release page. */
  htmlUrl: string;
  /** Source archive (zip) for this tag. */
  zipUrl: string;
  /** Release notes rendered to sanitized HTML. */
  notesHtml: string;
}

export interface ReleaseData {
  releases: Release[];
  /** Newest non-prerelease, or null if none. */
  latestStable: Release | null;
  /** True when the GitHub fetch failed and we fell back to a baseline. */
  stale: boolean;
}

/** GitHub's auto-generated source zip for a tag. */
export function sourceZipUrl(tag: string): string {
  return `https://github.com/${REPO}/archive/refs/tags/${tag}.zip`;
}

/**
 * Baseline used only if the build-time fetch fails (offline CI, rate
 * limit, GitHub outage). Keeps the build green and the page useful; the
 * client refresh corrects it in the browser. Update opportunistically.
 */
const FALLBACK_TAG = '4.1.10';
const FALLBACK_RELEASE: Release = {
  tag: FALLBACK_TAG,
  name: `${FALLBACK_TAG}: Maintenance Release`,
  date: '2026-05-08T12:40:05Z',
  prerelease: false,
  htmlUrl: `https://github.com/${REPO}/releases/tag/${FALLBACK_TAG}`,
  zipUrl: sourceZipUrl(FALLBACK_TAG),
  notesHtml: '<p>Release notes are temporarily unavailable. See the release on GitHub.</p>',
};
const FALLBACK: ReleaseData = {
  releases: [FALLBACK_RELEASE],
  latestStable: FALLBACK_RELEASE,
  stale: true,
};

const ALLOWED_TAGS = [
  'p',
  'a',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'blockquote',
  'h3',
  'h4',
  'h5',
  'h6',
  'br',
  'hr',
  'img',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
];

function renderNotes(body: string): string {
  if (!body?.trim()) {
    return '<p class="release-notes-empty">No release notes provided.</p>';
  }
  // GitHub's top-level "## What's Changed" headings would collide with
  // the page's own heading scale; demote h1/h2 to h3 before parsing.
  const demoted = body.replace(/^#{1,2}\s+/gm, '### ');
  const raw = marked.parse(demoted, { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt'],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
      }),
    },
  });
}

interface GitHubRelease {
  tag_name: string;
  name: string | null;
  published_at: string;
  prerelease: boolean;
  draft: boolean;
  html_url: string;
  body: string | null;
}

let cached: Promise<ReleaseData> | null = null;

/** Memoized so the badge and the page share one fetch per build. */
export function getReleaseData(): Promise<ReleaseData> {
  cached ??= loadReleaseData();
  return cached;
}

async function loadReleaseData(): Promise<ReleaseData> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'node-red-website-build',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(RELEASES_API, { headers });
    if (!res.ok) {
      console.warn(`[releases] GitHub API returned ${res.status}; using fallback snapshot.`);
      return FALLBACK;
    }
    const data = (await res.json()) as GitHubRelease[];
    const releases: Release[] = data
      .filter((r) => !r.draft)
      .map((r) => ({
        tag: r.tag_name,
        name: r.name?.trim() || r.tag_name,
        date: r.published_at,
        prerelease: r.prerelease,
        htmlUrl: r.html_url,
        zipUrl: sourceZipUrl(r.tag_name),
        notesHtml: renderNotes(r.body ?? ''),
      }));

    if (releases.length === 0) {
      console.warn('[releases] GitHub API returned no releases; using fallback snapshot.');
      return FALLBACK;
    }

    return {
      releases,
      latestStable: releases.find((r) => !r.prerelease) ?? null,
      stale: false,
    };
  } catch (err) {
    console.warn(`[releases] fetch failed (${(err as Error).message}); using fallback snapshot.`);
    return FALLBACK;
  }
}
