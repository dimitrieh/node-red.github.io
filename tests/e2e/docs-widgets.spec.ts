import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Drift and behaviour checks for the docs-widget illustrations in
 * src/components/docs-widgets/.
 *
 * WHAT DRIFT MEANS HERE. <nr-typed-input> and <nr-auto-complete> are not the
 * editor's widgets, they are documentation illustrations of them, rebuilt without
 * jQuery. That is only honest for as long as they still describe the same
 * control. The thing that used to go wrong is precisely this: the vendored copy
 * of typedInput.js these pages ran had fallen several hundred lines behind the
 * editor, and nothing said so, because nothing compared them.
 *
 * So the illustrations keep the editor's own class names on their markup, and the
 * first test compares that markup against the class names the editor's source
 * actually produces, in both directions:
 *
 *   - every class the widgets render must either be rendered by the illustration
 *     or be listed in the fixture's `omitted` map with a reason. A new part in
 *     the widget therefore fails here rather than quietly making the docs stale.
 *   - every red-ui-* class the illustration renders must exist in the widget
 *     source. An illustration that invents editor-looking class names is worse
 *     than one that is plainly simpler, because it teaches markup that does not
 *     exist.
 *
 * WHY PLAYWRIGHT AND NOT VITEST. Both halves need a real DOM. The class names
 * only exist once the elements have built themselves, and several of them
 * (red-ui-typedInput-options, red-ui-popover-panel, red-ui-menu,
 * red-ui-typedInput-focus) only appear after an interaction: a menu opening, a
 * field being focused, a search returning. The Vitest suite here runs in the node
 * environment with no DOM library installed, so asserting on rendered structure
 * there would mean asserting on source text instead, which is a weaker claim than
 * the one this test needs to make. Playwright already runs in CI on every push
 * and drives a real browser.
 *
 * WHY A COMMITTED FIXTURE. The editor source is a different repository and is not
 * checked out in CI. When it IS on disk the spec re-extracts and asserts the
 * fixture still matches, which is the drift alarm proper; when it is not, the
 * fixture stands in as the expected set so the DOM assertions still run. Point
 * NODE_RED_EDITOR_SRC at an editor-client `src` directory to force the source
 * comparison, or keep a node-red/node-red checkout beside this repository.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');

const FIXTURE = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, 'tests/fixtures/editor-widget-class-names.json'), 'utf8'),
) as {
  extracted: string[];
  omitted: Record<string, string>;
};

/** Where an editor-client `src` directory might be. The sibling-checkout layout
 *  is the one the migration works in: repos/node-red/node-red beside
 *  repos/node-red/node-red.github.io. */
function findEditorSource(): string | null {
  const candidates = [
    process.env.NODE_RED_EDITOR_SRC,
    path.resolve(REPO_ROOT, '../node-red/packages/node_modules/@node-red/editor-client/src'),
    path.resolve(REPO_ROOT, '../../node-red/packages/node_modules/@node-red/editor-client/src'),
  ].filter((p): p is string => Boolean(p));
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'js/ui/common/typedInput.js'))) return candidate;
  }
  return null;
}

/** Pull class names out of a source file the way the widget assigns them: from
 *  `class="..."` / `{class: "..."}` literals and from addClass/toggleClass calls.
 *  Deliberately narrower than "every red-ui-* string in the file", which also
 *  catches CSS custom property names and jQuery event namespaces such as
 *  `mousedown.red-ui-typedInput-close-property-select`. */
function classNamesIn(source: string, keep: RegExp): string[] {
  const found = new Set<string>();
  const patterns = [
    /class\s*[:=]\s*["']([^"']+)["']/g,
    /(?:add|toggle|remove)Class\(\s*["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      for (const token of (match[1] ?? '').split(/\s+/)) {
        if (keep.test(token)) found.add(token);
      }
    }
  }
  return [...found];
}

/** The two container classes the autoComplete list inherits from RED.popover.
 *  Read from the literals popover.js builds rather than from a hardcoded list, so
 *  a change to either line shows up as drift too. */
function popoverContainerClasses(popoverSource: string): string[] {
  const panel = popoverSource.match(/<div class="([^"]*red-ui-popover-panel[^"]*)"/);
  const list = popoverSource.match(/<ul class="(red-ui-menu[^"]*)"/);
  const classes: string[] = [];
  if (panel?.[1]) classes.push(...panel[1].split(/\s+/));
  if (list?.[1]) classes.push(...list[1].split(/\s+/));
  return classes;
}

function extractFromSource(src: string): string[] {
  const read = (relative: string) => fs.readFileSync(path.join(src, relative), 'utf8');
  const typedInput = classNamesIn(read('js/ui/common/typedInput.js'), /^red-ui-typedInput/);
  // The type menu carries red-ui-editor-dialog alongside its own class; that pair
  // is part of the markup a reader would see in the editor.
  const typedInputMenu = classNamesIn(
    read('js/ui/common/typedInput.js'),
    /^red-ui-(editor-dialog)$/,
  );
  const autoComplete = classNamesIn(read('js/ui/common/autoComplete.js'), /^red-ui-autoComplete/);
  // autoComplete.scss names two completion classes the JS builds only for
  // typedInput's own completion sources, so the stylesheet is read as well.
  const autoCompleteScss = [
    ...read('sass/ui/common/autoComplete.scss').matchAll(/\.(red-ui-autoComplete[A-Za-z-]*)/g),
  ].map((m) => m[1] ?? '');
  const popover = popoverContainerClasses(read('js/ui/common/popover.js'));
  return [
    ...new Set([
      ...typedInput,
      ...typedInputMenu,
      ...autoComplete,
      ...autoCompleteScss,
      ...popover,
    ]),
  ].sort();
}

test.describe('docs widget illustrations', () => {
  test('class names still match the editor source', async ({ page }) => {
    const editorSource = findEditorSource();
    const expected = [...FIXTURE.extracted].sort();

    if (editorSource) {
      const extracted = extractFromSource(editorSource);
      expect(
        extracted,
        'The editor widgets’ class names have changed. Decide for each new name whether ' +
          'src/components/docs-widgets/ should render it or whether it belongs in the fixture’s ' +
          '`omitted` map with a reason, then update ' +
          'tests/fixtures/editor-widget-class-names.json (including its `source` block).',
      ).toEqual(expected);
    } else {
      // Not a silent pass: the DOM assertions below still run against the
      // committed snapshot, and this says out loud which half was skipped.
      test.info().annotations.push({
        type: 'note',
        description:
          'No Node-RED editor-client checkout found, so the class names were compared against ' +
          'the committed fixture rather than re-extracted from source. Set NODE_RED_EDITOR_SRC ' +
          'to run the source comparison.',
      });
    }

    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => Boolean(customElements.get('nr-typed-input')));

    const rendered = await page.evaluate(async () => {
      // Force every state that carries a class of its own: open both menus on
      // every typedInput, focus one so the container gets its focus class, and
      // run a search on every autoComplete so its panel exists.
      for (const el of document.querySelectorAll('nr-typed-input')) {
        for (const menu of el.querySelectorAll('[data-nr-ti-menu]')) {
          (menu as HTMLElement).hidden = false;
        }
      }
      const firstInput = document.querySelector<HTMLInputElement>(
        'nr-typed-input input.red-ui-typedInput-input',
      );
      firstInput?.focus();
      for (const el of document.querySelectorAll('nr-auto-complete')) {
        const input = el.querySelector('input');
        if (!input) continue;
        input.value = 'ca';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const found = new Set<string>();
      const scope = document.querySelectorAll(
        'nr-typed-input, nr-typed-input *, nr-auto-complete, nr-auto-complete *',
      );
      for (const node of scope) {
        for (const cls of node.classList) {
          if (cls.startsWith('red-ui-')) found.add(cls);
        }
      }
      return [...found].sort();
    });

    // Direction 1: nothing the widgets render is missing without a reason.
    const unaccounted = expected.filter(
      (cls) => !rendered.includes(cls) && !(cls in FIXTURE.omitted),
    );
    expect(
      unaccounted,
      'These class names exist in the editor widgets but are neither rendered by the ' +
        'illustrations nor explained in the fixture’s `omitted` map.',
    ).toEqual([]);

    // Direction 2: nothing the illustrations render is invented.
    const invented = rendered.filter((cls) => !expected.includes(cls));
    expect(
      invented,
      'These red-ui-* class names are rendered by the illustrations but do not exist in the ' +
        'editor widgets. An illustration must not teach markup the editor does not have; use an ' +
        'nr- prefixed class for anything of our own.',
    ).toEqual([]);

    // And an omission must carry a reason, so the map cannot be used to silence
    // direction 1 by simply listing a name in it.
    for (const [cls, reason] of Object.entries(FIXTURE.omitted)) {
      expect(reason.trim().length, `\`omitted\` entry ${cls} has no reason`).toBeGreaterThan(20);
    }
  });

  test('typedInput type menu picks a type and updates the control', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ti-str nr-typed-input');

    await widget.locator('.red-ui-typedInput-type-select').click();
    const menu = widget.locator('[data-nr-ti-menu="type"]');
    await expect(menu).toBeVisible();
    await expect(menu.locator('.nr-ti-menu-item')).toHaveCount(3);
    // Opening focuses the current type, which is what the widget does.
    await expect(menu.locator('.nr-ti-menu-item[value="str"]')).toBeFocused();

    // Arrow to boolean and take it with Enter.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(menu).toBeHidden();

    // boolean has options and no hasValue, so the field is replaced by a picker.
    await expect(widget.locator('.red-ui-typedInput-input-wrap')).toBeHidden();
    await expect(widget.locator('.red-ui-typedInput-option-label')).toHaveText('true');
    expect(await widget.evaluate((el: HTMLElement & { type: string }) => el.type)).toBe('bool');
    expect(await widget.evaluate((el: HTMLElement & { value: string }) => el.value)).toBe('true');
  });

  test('typedInput renders msg as a prefix label with a plain field', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ti-msg nr-typed-input');
    await expect(widget.locator('.red-ui-typedInput-type-label')).toHaveText('msg.');
    await expect(widget.locator('input.red-ui-typedInput-input')).toBeVisible();
    // A single type has nothing to choose, so the button is inert and its caret
    // is gone: the widget disables it the same way.
    await expect(widget.locator('.red-ui-typedInput-type-select')).toHaveClass(/disabled/);
    // Scoped to the type button: the option trigger carries a caret of its own.
    await expect(widget.locator('.red-ui-typedInput-type-select .nr-ti-caret')).toBeHidden();

    await widget.locator('input.red-ui-typedInput-input').fill('payload');
    expect(await widget.evaluate((el: HTMLElement & { value: string }) => el.value)).toBe(
      'payload',
    );
  });

  test('typedInput custom options become the value control', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ti-fruit nr-typed-input');
    // A single type with neither icon nor label leaves nothing to show on the
    // type button, so the widget hides it and the picker is the whole control.
    await expect(widget.locator('.red-ui-typedInput-type-select')).toBeHidden();
    await expect(widget.locator('.red-ui-typedInput-input-wrap')).toBeHidden();
    await expect(widget.locator('.red-ui-typedInput-option-label')).toHaveText('Apple');

    await widget.locator('.red-ui-typedInput-option-trigger').click();
    await widget.locator('.nr-ti-menu-item[value="cherry"]').click();
    await expect(widget.locator('.red-ui-typedInput-option-label')).toHaveText('Cherry');
    expect(await widget.evaluate((el: HTMLElement & { value: string }) => el.value)).toBe('cherry');
  });

  test('typedInput multiple selection yields a comma-separated value', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ti-fruit-multi nr-typed-input');
    await expect(widget.locator('.red-ui-typedInput-option-label')).toHaveText('0 selected');

    await widget.locator('.red-ui-typedInput-option-trigger').click();
    await widget.locator('input[type="checkbox"][value="apple"]').check();
    await widget.locator('input[type="checkbox"][value="cherry"]').check();
    // The widget applies a multiple selection when the menu closes, not per tick.
    await page.keyboard.press('Escape');

    await expect(widget.locator('.red-ui-typedInput-option-label')).toHaveText('2 selected');
    expect(await widget.evaluate((el: HTMLElement & { value: string }) => el.value)).toBe(
      'apple,cherry',
    );
  });

  test('typedInput menu closes on Escape and on an outside click', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ti-str nr-typed-input');
    const menu = widget.locator('[data-nr-ti-menu="type"]');
    const trigger = widget.locator('.red-ui-typedInput-type-select');

    await trigger.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    // Focus comes back into the control rather than being dropped on the page.
    await expect(widget.locator('input.red-ui-typedInput-input')).toBeFocused();

    await trigger.click();
    await expect(menu).toBeVisible();
    await page.locator('.lab-head h1').click();
    await expect(menu).toBeHidden();
  });

  test('autoComplete filters, highlights the match and completes', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ac-custom nr-auto-complete');
    const input = widget.locator('input.red-ui-autoComplete');

    await input.click();
    await input.pressSequentially('cat');
    const panel = widget.locator('.red-ui-popover-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/red-ui-autoComplete-container/);

    const rows = widget.locator('.nr-ac-option');
    await expect(rows.first()).toHaveText('Cat');
    // The matched substring is emphasised, which is what the page's custom-label
    // example does by hand.
    await expect(rows.first().locator('.nr-ac-match')).toHaveText('Cat');

    // Arrow keys move the active option without taking focus off the field.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(input).toBeFocused();
    const activeId = await input.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    await expect(widget.locator(`#${activeId}`)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    await expect(panel).toBeHidden();
    await expect(input).toHaveValue('Caterpillar');
  });

  test('autoComplete closes on Escape and stays closed below minLength', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const widget = page.locator('#ac-plain nr-auto-complete');
    const input = widget.locator('input.red-ui-autoComplete');
    const panel = widget.locator('.red-ui-popover-panel');

    await input.click();
    await input.pressSequentially('zeb');
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();

    // minLength defaults to 1, so an empty field shows nothing.
    await input.fill('');
    await input.pressSequentially(' ');
    await expect(panel).toBeHidden();
  });

  test('the demos follow the theme rather than painting themselves white', async ({ page }) => {
    await page.goto('/widget-lab/', { waitUntil: 'domcontentloaded' });
    const readBackgrounds = () =>
      page.evaluate(() => {
        const container = document.querySelector('nr-typed-input .red-ui-typedInput-container');
        const frame = document.querySelector('.nr-widget-demo');
        return {
          container: getComputedStyle(container as Element).backgroundColor,
          frame: getComputedStyle(frame as Element).backgroundColor,
        };
      });

    const setTheme = async (theme: 'light' | 'dark') => {
      await page.evaluate((t) => {
        try {
          localStorage.setItem('starlight-theme', t);
        } catch {
          /* private mode */
        }
        document.documentElement.setAttribute('data-theme', t);
      }, theme);
      await page.waitForTimeout(120);
    };

    await setTheme('light');
    const light = await readBackgrounds();
    await setTheme('dark');
    const dark = await readBackgrounds();

    expect(dark.container, 'the control kept its light background in dark mode').not.toBe(
      light.container,
    );
    expect(dark.frame, 'the demo frame kept its light background in dark mode').not.toBe(
      light.frame,
    );
  });
});
