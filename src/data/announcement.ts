/**
 * The site-wide announcement.
 *
 * Two surfaces read this one entry: the bar above the navbar
 * (AnnouncementBanner.astro, on every page) and the conference card in the
 * homepage's Community section. They compose their own sentences from the same
 * fields, so the wording is edited in one place and cannot drift between them.
 *
 * `active: false` takes both down and needs no other change: the band renders
 * nothing and the card disappears. The space the fixed docs navbar needs is
 * reserved by `.page`, not by the band, so nothing collapses awkwardly either.
 *
 * Keep the strings short anyway. The band has to fit a phone, where it wraps to
 * two lines by design, and it is the first thing above the page heading on every
 * route.
 */
export interface Announcement {
  /** Whether the bar and the homepage card render at all. */
  active: boolean;
  /** Where both surfaces link. */
  href: string;
  /** The subject, e.g. 'Node-RED Con 2026'. */
  event: string;
  /** Where it stands right now, e.g. 'Registrations opening soon'. */
  status: string;
  /** Short human date. Not a machine date: nothing parses this. */
  date: string;
  /** What the reader is asked to do, e.g. 'Get notified'. */
  cta: string;
}

export const announcement: Announcement = {
  active: true,
  href: 'https://nrcon.nodered.org/',
  event: 'Node-RED Con 2026',
  status: 'Registrations opening soon',
  date: 'Nov 3',
  cta: 'Get notified',
};
