/* <nr-auto-complete> — a dependency-free illustration of the Node-RED editor's
 * autoComplete widget, for the page that documents it.
 *
 * IT IS AN ILLUSTRATION, NOT THE WIDGET. The widget is a jQuery UI plugin in the
 * editor:
 *   packages/node_modules/@node-red/editor-client/src/js/ui/common/autoComplete.js
 *   packages/node_modules/@node-red/editor-client/src/sass/ui/common/autoComplete.scss
 * in the node-red/node-red repository, read here at editor-client 5.0.0. That
 * widget is short enough to follow end to end, so this stays close to it: the
 * search contract, the minLength rule, the supersede-in-flight-requests rule and
 * the Enter/Tab-takes-the-first-completion behaviour are all ports, not
 * inventions. What it renders is not its own: it asks RED.popover.menu for a
 * panel, which is why the list below carries red-ui-popover-panel and
 * red-ui-menu class names.
 *
 * WHAT IT DELIBERATELY LEAVES OUT.
 *   - `completionPluginType` and `node`, which look up editor plugins through
 *     RED.plugins.getPluginsByType to provide context-aware completions.
 *   - the editor's own completion sources, and with them the
 *     red-ui-autoComplete-completion and red-ui-autoComplete-env-label classes.
 *     Those style the msg-property and environment-variable completions the
 *     widget builds for typedInput, which need the editor's message table and a
 *     flow to read context from.
 *   - `destroy`. The widget can be detached from an <input> it was bolted onto;
 *     here the element IS the control, so removing it from the page is the whole
 *     of teardown.
 *
 * DELIBERATELY DIFFERENT, AND BETTER. The widget moves DOM focus into a list of
 * <a href="#"> rows. This is a combobox: the input keeps focus and keeps its
 * caret, the list is a listbox, and the active row is tracked with
 * aria-activedescendant. Arrow keys, Enter, Escape and Tab all behave as they do
 * in the widget; screen readers and the caret behave considerably better.
 *
 * CONFIGURATION. The widget's one real option is `search`, a function, which
 * cannot be written in an HTML attribute. So a page can either set the property,
 * which is the widget's actual API:
 *
 *   document.querySelector('nr-auto-complete').search = (value) => [...]
 *
 * or declare the demo's own sugar, which builds a search function over a fixed
 * list. `source`, `highlight` and `delay` are this illustration's knobs and are
 * not part of the widget's API; `minLength` is:
 *
 *   <nr-auto-complete>
 *     <script type="application/json">
 *       { "source": ["Aardvark", "Alligator"], "highlight": true, "delay": 1000 }
 *     </script>
 *   </nr-auto-complete>
 *
 *   source     array of strings to complete against.
 *   highlight  true renders each row with the matched substring emphasised, which
 *              is what the docs page's custom-label example does by hand.
 *   delay      milliseconds to wait before answering, for illustrating the
 *              asynchronous form of `search`. Zero answers synchronously.
 *   minLength  the widget's own option: how many characters before the list
 *              opens. Zero means the list opens on ArrowDown with an empty field.
 */

/* Browser globals declared per file, for the same reason as in nr-typed-input.js:
 * the flat ESLint config gives plain .js files no environment, and ESLint 10
 * removed eslint-env. */
/* global document, window, console, customElements, HTMLElement, CustomEvent, Node */

/* The stylesheet travels with the behaviour: one import gives a page both. */
import './nr-auto-complete.css';

/* Both of these are ports of the identically-named helpers in the widget, which
 * carries them with a "TODO: this is copied from typedInput - should be a shared
 * utility" comment above each. */
function getMatch(value, searchValue) {
  const idx = value.toLowerCase().indexOf(searchValue.toLowerCase());
  const len = idx > -1 ? searchValue.length : 0;
  return {
    index: idx,
    found: idx > -1,
    pre: value.substring(0, idx),
    match: value.substring(idx, idx + len),
    post: value.substring(idx + len),
    exact: idx === 0 && value.length === searchValue.length,
  };
}

/** The widget's generateSpans(), built with createElement and textContent
 *  instead of a jQuery HTML string. Returns nodes, never markup: a completion
 *  list is a good place to be strict, since its contents come from whatever the
 *  page's search function returns. */
function matchSpans(match) {
  const nodes = [];
  if (match.pre) {
    const pre = document.createElement('span');
    pre.textContent = match.pre;
    nodes.push(pre);
  }
  if (match.match) {
    const hit = document.createElement('span');
    hit.className = 'nr-ac-match';
    hit.textContent = match.match;
    nodes.push(hit);
  }
  if (match.post) {
    const post = document.createElement('span');
    post.textContent = match.post;
    nodes.push(post);
  }
  return nodes;
}

let instanceCount = 0;

class NrAutoComplete extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    try {
      this._build();
    } catch (err) {
      console.error(err);
      this.hidden = true;
    }
  }

  disconnectedCallback() {
    this._teardownDocumentListeners();
  }

  /** The widget's `search` option, as a property. Takes (value) and returns
   *  completions, or takes (value, done) and calls done with them. Setting this
   *  replaces whatever the declarative `source` config built. */
  get search() {
    return this._search;
  }

  set search(fn) {
    this._search = fn;
  }

  get value() {
    return this._input ? this._input.value : '';
  }

  set value(v) {
    if (this._input) this._input.value = String(v ?? '');
  }

  _readConfig() {
    const attr = this.getAttribute('config');
    const block = this.querySelector('script[type="application/json"]');
    const raw = attr ?? (block ? block.textContent : null);
    if (!raw || !raw.trim()) return {};
    return JSON.parse(raw);
  }

  _build() {
    const config = this._readConfig();
    this.querySelectorAll('script[type="application/json"]').forEach((el) => el.remove());

    // parseInteger(input, def, min, max) in the widget, with the same default
    // of 1 and the same floor of 0.
    const parsed = Number.parseInt(config.minLength, 10);
    this._minLength = Number.isNaN(parsed) || parsed < 0 ? 1 : parsed;
    this._delay = Number.parseInt(config.delay, 10) || 0;
    this._highlight = config.highlight !== false;
    this._source = Array.isArray(config.source) ? config.source : [];
    this._id = `nr-ac-${++instanceCount}`;
    this._activeIndex = -1;
    this._options = [];
    this._open = false;
    this._requestSeq = 0;

    if (!this._search) this._search = this._buildSearchFromSource();

    this._input = document.createElement('input');
    this._input.type = 'text';
    // red-ui-autoComplete is the class the widget adds to the <input> it is
    // attached to, and it is load-bearing there: typedInput reads it back to
    // decide whether completion is already wired up.
    this._input.className = 'red-ui-autoComplete';
    this._input.setAttribute('role', 'combobox');
    this._input.setAttribute('aria-expanded', 'false');
    this._input.setAttribute('aria-autocomplete', 'list');
    this._input.setAttribute('autocomplete', 'off');
    this._input.setAttribute('aria-controls', `${this._id}-list`);
    // Moved rather than copied, so the name lands on the combobox and not also
    // on a roleless host wrapper. Same reasoning as in nr-typed-input.js.
    if (this.hasAttribute('aria-label')) {
      this._input.setAttribute('aria-label', this.getAttribute('aria-label'));
      this.removeAttribute('aria-label');
    }
    if (this.hasAttribute('placeholder')) {
      this._input.placeholder = this.getAttribute('placeholder');
    }
    if (this.hasAttribute('value')) this._input.value = this.getAttribute('value');

    this._panel = document.createElement('div');
    this._panel.className =
      'red-ui-editor-dialog red-ui-popover-panel red-ui-autoComplete-container';
    this._panel.hidden = true;
    this._list = document.createElement('ul');
    this._list.className = 'red-ui-menu';
    this._list.id = `${this._id}-list`;
    this._list.setAttribute('role', 'listbox');
    this._panel.appendChild(this._list);

    this.append(this._input, this._panel);
    this._wireEvents();
  }

  /** The declarative form: a search function over `source`, matching what the
   *  docs page's own example does. Its shape is deliberately the same as the
   *  example printed above the demo, sorted by match position. */
  _buildSearchFromSource() {
    return (value) => {
      const matches = [];
      for (const candidate of this._source) {
        const match = getMatch(candidate, value);
        if (match.found)
          matches.push({ value: candidate, label: candidate, match, i: match.index });
      }
      matches.sort((a, b) => a.i - b.i);
      return matches;
    };
  }

  _wireEvents() {
    // Keydown handles the keys that must not reach _update: the widget returns
    // early on Enter, Tab and Escape for exactly the same reason.
    this._input.addEventListener('keydown', (evt) => {
      switch (evt.key) {
        case 'ArrowDown':
          evt.preventDefault();
          if (this._open) this._moveActive(1);
          else this._update(this._input.value, { fromArrow: true });
          break;
        case 'ArrowUp':
          evt.preventDefault();
          if (this._open) this._moveActive(-1);
          break;
        case 'Enter':
        case 'Tab':
          // The widget takes options[0] on Enter or Tab whenever the menu is
          // showing, whether or not the reader has walked the list, so an
          // untouched list still completes to its best match.
          if (this._open && this._options.length) {
            const index = this._activeIndex >= 0 ? this._activeIndex : 0;
            evt.preventDefault();
            this._commit(this._options[index]);
          }
          break;
        case 'Escape':
          if (this._open) {
            evt.preventDefault();
            this._hide();
          }
          break;
        default:
          break;
      }
    });

    this._input.addEventListener('input', () => this._update(this._input.value));
    this._input.addEventListener('blur', () => {
      // Deferred, because a click on a row blurs the field before the row's
      // own click handler runs.
      window.setTimeout(() => {
        if (!this.contains(document.activeElement)) this._hide();
      }, 0);
    });
  }

  _teardownDocumentListeners() {
    if (this._onDocumentMouseDown) {
      document.removeEventListener('mousedown', this._onDocumentMouseDown, true);
      this._onDocumentMouseDown = null;
    }
  }

  /** The widget's _updateCompletions: below minLength the list closes, a
   *  two-argument search function is called with a done callback and its answer
   *  is dropped if a later request has already been issued. */
  _update(value, { fromArrow = false } = {}) {
    if (value.trim().length < this._minLength && !(fromArrow && this._minLength === 0)) {
      this._hide();
      return;
    }
    const show = (completions, requestId) => {
      if (requestId !== undefined && requestId !== this._pendingRequest) return;
      if (!completions || completions.length === 0) {
        this._hide();
        return;
      }
      this._render(
        completions.map((c) => (typeof c === 'string' ? { value: c, label: c } : c)),
        value,
      );
    };
    // A search function that declares a `done` parameter must be given one:
    // that is the widget's rule, and it is checked the same way, on arity.
    if (this._search.length >= 2) {
      const requestId = ++this._requestSeq;
      this._pendingRequest = requestId;
      this._search(value, (completions) => show(completions, requestId));
      return;
    }
    if (this._delay > 0) {
      const requestId = ++this._requestSeq;
      this._pendingRequest = requestId;
      window.setTimeout(() => show(this._search(value), requestId), this._delay);
      return;
    }
    show(this._search(value));
  }

  _render(options, searchValue) {
    this._options = options;
    this._activeIndex = -1;
    this._list.replaceChildren();

    options.forEach((option, index) => {
      const li = document.createElement('li');
      const row = document.createElement('span');
      row.className = 'nr-ac-option';
      row.id = `${this._id}-opt-${index}`;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', 'false');

      // `label` may be a string or a DOM element: that is the widget's contract,
      // and the docs page's third example exercises the element form.
      if (option.label instanceof Node) {
        row.appendChild(option.label);
      } else if (this._highlight) {
        const match = option.match || getMatch(String(option.label ?? option.value), searchValue);
        row.append(...matchSpans(match));
      } else {
        row.textContent = String(option.label ?? option.value);
      }

      row.addEventListener('mousedown', (evt) => {
        // mousedown rather than click: the field's blur would otherwise close
        // the panel out from under the pointer.
        evt.preventDefault();
        this._commit(option);
      });
      row.addEventListener('mousemove', () => this._setActive(index));

      li.appendChild(row);
      this._list.appendChild(li);
    });

    this._show();
  }

  _show() {
    this._panel.hidden = false;
    this._panel.classList.remove('nr-ac-panel-above');
    this._input.setAttribute('aria-expanded', 'true');
    this._open = true;

    const rect = this._panel.getBoundingClientRect();
    if (rect.bottom > window.innerHeight && this.getBoundingClientRect().top > rect.height) {
      this._panel.classList.add('nr-ac-panel-above');
    }

    if (!this._onDocumentMouseDown) {
      this._onDocumentMouseDown = (evt) => {
        if (!this.contains(evt.target)) this._hide();
      };
      document.addEventListener('mousedown', this._onDocumentMouseDown, true);
    }
  }

  _hide() {
    if (!this._open && this._panel?.hidden) return;
    this._panel.hidden = true;
    this._input.setAttribute('aria-expanded', 'false');
    this._input.removeAttribute('aria-activedescendant');
    this._open = false;
    this._activeIndex = -1;
    this._teardownDocumentListeners();
  }

  _rows() {
    return [...this._list.querySelectorAll('.nr-ac-option')];
  }

  _moveActive(step) {
    const rows = this._rows();
    if (!rows.length) return;
    // With nothing active yet, Down lands on the first row and Up on the last,
    // and from either end the walk wraps, which is what the widget's own
    // keydown handler does with its list of anchors.
    let next;
    if (this._activeIndex < 0) next = step > 0 ? 0 : rows.length - 1;
    else next = (this._activeIndex + step + rows.length) % rows.length;
    this._setActive(next);
  }

  _setActive(index) {
    const rows = this._rows();
    rows.forEach((row, i) => row.setAttribute('aria-selected', String(i === index)));
    this._activeIndex = index;
    const active = rows[index];
    if (active) {
      this._input.setAttribute('aria-activedescendant', active.id);
      // Keep the active row in view without moving focus, which is the one thing
      // a focus-follows-selection list gets for free and this pattern does not.
      if (typeof active.scrollIntoView === 'function') {
        active.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  _commit(option) {
    this._input.value = option.value;
    this._hide();
    this._input.focus();
    // The widget triggers a change on the input it wraps; mirror that on the
    // element so a page can observe a completion being taken.
    this.dispatchEvent(
      new CustomEvent('change', { bubbles: true, detail: { value: option.value } }),
    );
  }
}

if (!customElements.get('nr-auto-complete')) {
  customElements.define('nr-auto-complete', NrAutoComplete);
}

export { NrAutoComplete, getMatch };
