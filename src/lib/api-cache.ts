/**
 * Browser-side TTL cache for the third-party API reads this site makes
 * from the visitor's own browser.
 *
 * Why it exists: the homepage stats, the contributor wall, the issues
 * feed and the site-wide version badge all read api.github.com from the
 * client, unauthenticated. GitHub's unauthenticated budget is counted per
 * originating IP, not per page: 60 requests/hour on the core endpoints
 * and only 10 requests/hour on /search/*. Uncached, every page view spent
 * a fresh slice of that budget, and the version badge lives in the shared
 * header so it spent one more on every page of the site. A visitor behind
 * a shared public IP (corporate NAT, VPN, campus, mobile CGNAT) shares
 * one budget with everyone else behind it, so the search allowance in
 * particular ran out quickly and the search-backed stats degraded to
 * their placeholders.
 *
 * The data still comes live from the API in the browser, so it needs no
 * scheduled rebuild. It is just billed once per TTL per visitor instead
 * of once per page view.
 *
 * What callers should store: the derived values they actually render (a
 * summed total, a narrowed row list), never the raw API response.
 * localStorage is a single origin-wide budget of a few megabytes shared
 * with everything else on nodered.org, and the raw payloads behind these
 * stats run to hundreds of kilobytes.
 *
 * Trust posture: anything read back out of localStorage is still
 * attacker-influenced. It arrived from a third party, and any script on
 * this origin can write to the same store. Every caller therefore passes
 * a type guard that is checked before the value is handed back, and keeps
 * rendering it through the same createElement / textContent /
 * encodeURIComponent path the live response goes through. Nothing here
 * builds HTML.
 */

/** One hour in milliseconds. The default TTL for these reads. */
export const HOUR_MS = 60 * 60 * 1000;

/** Shared prefix so a prune pass can find our entries and nothing else. */
const PREFIX = 'nr-api:';

/**
 * Bump this whenever the SHAPE of anything stored under this module
 * changes. The marker is part of the key, so an entry written by an older
 * deploy can never be read back as valid by newer code: it misses, and
 * the prune pass below removes it. That is cheaper and safer than trying
 * to migrate a cache whose only value is being an hour old.
 */
const SCHEMA = 'v1';

const SCHEMA_PREFIX = `${PREFIX}${SCHEMA}:`;

/** Stored wrapper: `e` = expiry epoch ms, `d` = the caller's payload. */
interface Envelope<T> {
  e: number;
  d: T;
}

type Guard<T> = (value: unknown) => value is T;

/** Narrow to a plain keyed object. Exported because every caller's guard
 *  needs this first step before it can look at fields. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/* Every localStorage touch is wrapped. The property access itself throws
 * (not just the write) in contexts where storage is blocked, e.g. an
 * embedded frame with cookies disabled, and writes throw on quota. A
 * throw here is the intended fallback path to a live fetch, not a
 * swallowed error, so each site below either falls through to the network
 * or says so on the console. */

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Storage unreachable. Treated as a miss; the caller fetches live and
    // the write attempt below reports it once on the console.
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch (err) {
    // Safari private browsing and an exhausted quota both land here. The
    // fresh value is already in hand, so the only consequence is that the
    // next page view pays for the request again.
    console.warn(`[api-cache] could not store ${key}; will re-fetch next page view:`, err);
  }
}

function drop(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do: an unreadable store cannot serve a stale hit either.
  }
}

let havePruned = false;

/**
 * Remove entries left behind by a deploy that used a different schema
 * marker. Without this, a shape change would leak its old entries into
 * the origin's storage budget forever, since nothing would ever read
 * their keys again. Runs once per page.
 */
function pruneForeignSchemas(): void {
  if (havePruned) return;
  havePruned = true;
  try {
    const store = window.localStorage;
    const doomed: string[] = [];
    // Collect first, then remove: removing during the walk reindexes.
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i);
      if (key === null || !key.startsWith(PREFIX)) continue;
      if (!key.startsWith(SCHEMA_PREFIX)) doomed.push(key);
    }
    for (const key of doomed) store.removeItem(key);
  } catch {
    // Storage unreachable, so there is nothing of ours in it to prune.
  }
}

function isEnvelope(value: unknown): value is Envelope<unknown> {
  if (!isRecord(value)) return false;
  return typeof value['e'] === 'number' && Number.isFinite(value['e']) && 'd' in value;
}

type Hit<T> = { ok: true; value: T } | { ok: false };

const MISS: Hit<never> = { ok: false };

function readEntry<T>(key: string, ttlMs: number, isValid: Guard<T>): Hit<T> {
  const raw = readRaw(key);
  if (raw === null) return MISS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // A truncated or hand-edited entry. Drop it and go to the network.
    console.warn(`[api-cache] discarding unparseable entry ${key}:`, err);
    drop(key);
    return MISS;
  }

  if (!isEnvelope(parsed)) {
    drop(key);
    return MISS;
  }

  const now = Date.now();
  // Past its expiry, or written by a clock that has since moved
  // backwards. An expiry further out than one whole TTL cannot have been
  // written by this code against this clock, and trusting it would pin a
  // stale value in place indefinitely.
  if (parsed.e <= now || parsed.e - now > ttlMs) {
    drop(key);
    return MISS;
  }

  // Shape check before the value escapes: see the trust note at the top.
  if (!isValid(parsed.d)) {
    drop(key);
    return MISS;
  }

  return { ok: true, value: parsed.d };
}

/**
 * Return a cached value if one is present, valid and inside its TTL,
 * otherwise run `fetchFresh` and cache what it returns.
 *
 * `name` becomes part of the key. `isValid` is checked on the way out of
 * storage, so a payload whose shape does not match is treated as a miss.
 * A rejection from `fetchFresh` propagates: callers already have a
 * server-rendered fallback to keep, and swallowing it here would hide a
 * real outage.
 */
export async function cached<T>(
  name: string,
  ttlMs: number,
  fetchFresh: () => Promise<T>,
  isValid: Guard<T>,
): Promise<T> {
  pruneForeignSchemas();
  const key = `${SCHEMA_PREFIX}${name}`;

  const hit = readEntry(key, ttlMs, isValid);
  if (hit.ok) return hit.value;

  const fresh = await fetchFresh();
  const envelope: Envelope<T> = { e: Date.now() + ttlMs, d: fresh };
  writeRaw(key, JSON.stringify(envelope));
  return fresh;
}
