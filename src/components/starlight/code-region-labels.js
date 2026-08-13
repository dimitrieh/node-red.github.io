/**
 * Gives Expressive Code's scrollable code blocks an accessible name.
 *
 * THE PROBLEM. Expressive Code ships a runtime module that measures every code
 * block and, for the ones whose content is wider than the box, promotes them to
 * a focusable scroll region:
 *
 *   scrollWidth > clientWidth && no tabindex yet
 *     -> setAttribute('tabindex', '0'), setAttribute('role', 'region')
 *
 * The tabindex is right: a region you can only reach by mouse-dragging is not
 * reachable at all by keyboard. The bare `role="region"` is not. It declares a
 * landmark with no accessible name, and a page with two or more of them fails
 * axe's landmark-unique, because landmarks are told apart by role plus name and
 * these are identical. In landmark navigation they arrive as a row of
 * indistinguishable "region" entries.
 *
 * WHY THIS IS NOT DONE AT BUILD TIME. The obvious fix is to write an aria-label
 * onto each `<pre>` while rendering. It backfires: a `<pre>` with no role maps to
 * ARIA's `generic`, and aria-label is *prohibited* on generic, so the labels
 * would be both ignored and reported as aria-prohibited-attr. Only the
 * overflowing blocks get a role, and whether a block overflows depends on the
 * viewport, so at build time we cannot know which ones may legitimately carry a
 * name. The name has to arrive with the role and leave with it. That is also why
 * the same block is unlabelled on a wide screen and labelled on a narrow one.
 *
 * The index is taken over ALL code blocks on the page rather than the
 * overflowing subset, so a block keeps the same number as the window is resized
 * and other blocks come in and out of overflow.
 */

/* Browser globals declared per file, the same way the docs-widget components do
 * it: the flat ESLint config gives plain .js files no environment, and ESLint 10
 * removed eslint-env. Listing them also states the whole platform surface this
 * needs, which is the DOM and one observer. */
/* global document, MutationObserver */

function applyLabels() {
  const blocks = document.querySelectorAll('.expressive-code pre');
  blocks.forEach((pre, index) => {
    const isRegion = pre.getAttribute('role') === 'region';

    if (isRegion) {
      if (pre.hasAttribute('aria-label')) return;
      const language = pre.getAttribute('data-language');
      const position = index + 1;
      pre.setAttribute(
        'aria-label',
        language ? `${language} code sample ${position}` : `Code sample ${position}`,
      );
      pre.dataset.nrLabelled = '';
      return;
    }

    // Expressive Code drops the role again once a block stops overflowing (the
    // window widened, say). Take the name with it, or we leave an aria-label on
    // a role-less <pre>, which is the prohibited-attribute case described above.
    if ('nrLabelled' in pre.dataset) {
      pre.removeAttribute('aria-label');
      delete pre.dataset.nrLabelled;
    }
  });
}

// Watching `role` specifically, so writing aria-label below cannot re-enter this
// observer. Expressive Code sets the role from a ResizeObserver inside an idle
// callback, so there is no ordering we could rely on instead: reacting to the
// attribute landing is what makes this independent of when that runs.
const observer = new MutationObserver(applyLabels);
observer.observe(document.body, {
  subtree: true,
  attributes: true,
  attributeFilter: ['role'],
});

applyLabels();
// Cross-document view transitions reuse this script's module instance but swap
// the document, so re-run on arrival the way Expressive Code's own module does.
document.addEventListener('astro:page-load', applyLabels);
