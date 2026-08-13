/* <nr-typed-input> — a dependency-free illustration of the Node-RED editor's
 * TypedInput widget, for the pages that document it.
 *
 * IT IS AN ILLUSTRATION, NOT THE WIDGET. The widget is a jQuery UI plugin that
 * lives in the editor:
 *   packages/node_modules/@node-red/editor-client/src/js/ui/common/typedInput.js
 *   packages/node_modules/@node-red/editor-client/src/sass/ui/common/typedInput.scss
 * in the node-red/node-red repository, read here at editor-client 5.0.0. That
 * file is over sixteen hundred lines; this is the part a reader of the docs can
 * see and click, rebuilt against the same class names so the two can be diffed.
 *
 * WHY IT EXISTS. These docs pages used to run the editor's real widget, which
 * meant serving jQuery, jQuery UI and four vendored editor files, most of a
 * megabyte of third-party code, to teach a control whose entire stylesheet is a
 * couple of hundred lines. It also meant shipping a copy of typedInput.js that
 * had drifted several hundred lines behind the editor, so the demo documented a
 * widget that no longer existed. Porting from the current source and keeping the
 * class names makes that drift testable instead of invisible: see
 * tests/e2e/docs-widgets.spec.ts.
 *
 * WHAT IT DELIBERATELY LEAVES OUT. Everything the real widget does that a
 * documentation demo cannot honestly show, because it needs the editor runtime
 * (RED.settings, RED.utils, RED.editor, RED.popover, the node type registry) or
 * a flow to be editing:
 *   - validation and the `input-error` state, including the `validate` option and
 *     the error tooltip. Those call RED.utils.validateTypedProperty and
 *     RED.popover.tooltip.
 *   - the expand editors: JSON, buffer, jsonata and the multi-line expression
 *     editors all open RED.editor dialogs. The JSON type still renders its
 *     expand button, marked inert, because the button is part of the control's
 *     shape and hiding it would teach the wrong shape.
 *   - autoComplete on the msg / flow / global / env types. Their completion
 *     sources are the editor's message-property table and live flow context.
 *     The autoComplete widget itself is illustrated by <nr-auto-complete>.
 *   - `valueLabel` and the custom value renderers built on it, which is what
 *     turns the cred type into asterisks, the conf-types type into a two-line
 *     label, and puts the context-store name inside a flow/global field.
 *   - context store selection on flow/global. The editor offers a store picker
 *     only when RED.settings.context lists more than one store, so on a page
 *     with no editor runtime the real widget renders these exactly as this does:
 *     a `flow.` prefix and a plain field.
 *   - the types the docs pages do not demonstrate: bin, re, jsonata, date, env,
 *     node, cred, conf-types.
 *   - `typeField`, which mirrors the selected type into a second <input> so a
 *     node can persist it. There is no node and no form here to persist into.
 *   - width from the underlying input's own width or style attribute. Size this
 *     from CSS instead.
 *
 * CONFIGURATION. Shaped like the real widget's options object, so the config in
 * a docs page reads the same as the code sample printed above it. Either a JSON
 * child, which is the readable form for anything with an options array:
 *
 *   <nr-typed-input>
 *     <script type="application/json">
 *       { "type": "fruit", "types": [{ "value": "fruit", "options": [...] }] }
 *     </script>
 *   </nr-typed-input>
 *
 * or a `config` attribute, which is the readable form for a one-liner:
 *
 *   <nr-typed-input config='{"type":"msg","types":["msg"]}' value="payload">
 *   </nr-typed-input>
 *
 * `type`, `types`, `value`, `label`, `icon`, `options`, `multiple` and `hasValue`
 * all mean what they mean in the widget's own TypeDefinition. `icon` is the one
 * narrowing: the editor takes an image URL or a FontAwesome class, and this
 * takes one of the built-in icon keys (az, 09, bool, json) because the editor's
 * icon files are not published with this site and this site loads no icon font.
 *
 * The element exposes `type` and `value` as properties, mirroring the widget's
 * type() and value() methods, and emits a `change` event carrying { type, value }
 * the way the widget's change event carries (event, type, value).
 */

/* The repo's flat ESLint config declares no environment globals for plain .js
 * files, so browser globals have to be declared per file. Spelled out rather
 * than switched on wholesale, which also documents the platform surface this
 * component needs: DOM, custom elements, one event constructor.
 * eslint-env is not an option here, ESLint 10 removed it. */
/* global document, window, console, customElements, HTMLElement, CustomEvent */

/* The stylesheet travels with the behaviour: one import gives a page both, and
 * there is no way to end up with a registered element and no styles for it. */
import './nr-typed-input.css';

/* The built-in types, transcribed from `allOptions` in the editor's
 * typedInput.js and its en-US messages (typedInput.type.*). Only the ones the
 * three docs pages demonstrate are here; adding another means checking its entry
 * upstream, not inventing one.
 *
 * Two of these encode behaviour that is easy to misread as a bug:
 *   - `bool` has options, no hasValue. In the widget that combination replaces
 *     the text field with a picker, which is why choosing boolean turns the demo
 *     into a two-item select rather than leaving an empty box.
 *   - `flow` and `global` have hasValue AND an empty options array, which is the
 *     state the widget itself is in when RED.settings lists a single context
 *     store. The picker is hidden and the field stays. */
const BUILT_IN_TYPES = {
  msg: { value: 'msg', label: 'msg.' },
  flow: { value: 'flow', label: 'flow.', hasValue: true, options: [] },
  global: { value: 'global', label: 'global.', hasValue: true, options: [] },
  str: { value: 'str', label: 'string', icon: 'az' },
  num: { value: 'num', label: 'number', icon: '09' },
  bool: { value: 'bool', label: 'boolean', icon: 'bool', options: ['true', 'false'] },
  json: { value: 'json', label: 'JSON', icon: 'json', expand: true },
};

const ICON_KEYS = ['az', '09', 'bool', 'json'];

/** Normalise an options entry. The widget accepts bare strings as well as
 *  objects, which is how the bool type declares ["true","false"]. */
function normaliseOption(option) {
  return typeof option === 'string' ? { value: option, label: option } : option;
}

/** Resolve one `types` entry: a string names a built-in, an object is a
 *  TypeDefinition supplied by the page. */
function resolveType(entry) {
  if (typeof entry === 'string') {
    const builtIn = BUILT_IN_TYPES[entry];
    if (!builtIn) {
      throw new Error(
        `nr-typed-input: no built-in type "${entry}". This illustration carries ` +
          `${Object.keys(BUILT_IN_TYPES).join(', ')}; anything else has to be ` +
          `declared inline as a TypeDefinition object.`,
      );
    }
    return builtIn;
  }
  if (!entry || typeof entry.value !== 'string') {
    throw new Error('nr-typed-input: each entry in `types` needs a string `value`.');
  }
  if (entry.icon && !ICON_KEYS.includes(entry.icon)) {
    throw new Error(
      `nr-typed-input: unknown icon "${entry.icon}". Available: ${ICON_KEYS.join(', ')}.`,
    );
  }
  return entry;
}

class NrTypedInput extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    try {
      this._build();
    } catch (err) {
      // A bad config is an authoring error in a docs page, so it should be loud
      // in the console and invisible on the page: a half-built control would be
      // a worse lie than no control.
      console.error(err);
      this.hidden = true;
    }
  }

  disconnectedCallback() {
    this._teardownDocumentListeners();
  }

  /* ── Public surface, mirroring the widget's type()/value() ─────────────── */

  get type() {
    return this._activeType ? this._activeType.value : '';
  }

  set type(value) {
    this._setType(value);
  }

  get value() {
    const type = this._activeType;
    if (!type) return '';
    if (type.options && this._activeOptions.length && type.hasValue !== true) {
      return this._optionValue;
    }
    return this._input.value;
  }

  set value(value) {
    this._setValue(String(value ?? ''));
  }

  /* ── Construction ─────────────────────────────────────────────────────── */

  _readConfig() {
    const attr = this.getAttribute('config');
    const block = this.querySelector('script[type="application/json"]');
    const raw = attr ?? (block ? block.textContent : null);
    if (!raw || !raw.trim()) {
      throw new Error(
        'nr-typed-input: no config. Give it a `config` attribute or a ' +
          '<script type="application/json"> child.',
      );
    }
    return JSON.parse(raw);
  }

  _build() {
    const config = this._readConfig();
    // The widget defaults `types` to every built-in when only `type` is given.
    const entries = config.types || (config.type ? [config.type] : Object.keys(BUILT_IN_TYPES));
    this._types = entries.map(resolveType);
    this._typeMap = new Map(this._types.map((t) => [t.value, t]));
    // Per-type value memory, so switching str -> num -> str does not lose what
    // was typed. The widget keeps the same map; "_" is its key for the value
    // shared by every free-text type.
    this._oldValues = {};
    this._optionValue = '';
    this._activeOptions = [];
    this._openMenuEl = null;

    // The JSON config child has done its job; leave nothing behind that a
    // screen reader would read out as page text.
    this.querySelectorAll('script[type="application/json"]').forEach((el) => el.remove());

    const container = document.createElement('div');
    container.className = 'red-ui-typedInput-container';
    this._container = container;

    // Order follows the widget: type select, field, option trigger, expand.
    this._typeSelect = document.createElement('button');
    this._typeSelect.type = 'button';
    this._typeSelect.className = 'red-ui-typedInput-type-select';
    this._typeSelect.setAttribute('aria-haspopup', 'true');
    this._typeSelect.setAttribute('aria-expanded', 'false');

    // The caret sits to the LEFT of the type icon, which looks like a mistake
    // until you read the widget: it appends the caret to the button and then
    // prepends the icon into a label span that follows it. Production renders
    // "caret then a/z". Kept, because looking the same is the point.
    this._caret = document.createElement('i');
    this._caret.className = 'red-ui-typedInput-icon nr-ti-caret';
    this._caret.setAttribute('aria-hidden', 'true');
    this._typeSelect.appendChild(this._caret);

    this._typeLabel = document.createElement('span');
    this._typeLabel.className = 'red-ui-typedInput-type-label';
    this._typeSelect.appendChild(this._typeLabel);
    container.appendChild(this._typeSelect);

    this._inputWrap = document.createElement('div');
    this._inputWrap.className = 'red-ui-typedInput-input-wrap';
    this._input = document.createElement('input');
    this._input.type = 'text';
    this._input.className = 'red-ui-typedInput-input';
    // An aria-label written on the host belongs to the field, so it moves there
    // rather than being copied: left in place it also names the host, and the
    // accessibility tree then carries the same name twice, once on a wrapper
    // that has no role and nothing to do.
    if (this.hasAttribute('aria-label')) {
      this._input.setAttribute('aria-label', this.getAttribute('aria-label'));
      this.removeAttribute('aria-label');
    }
    if (this.hasAttribute('placeholder')) {
      this._input.placeholder = this.getAttribute('placeholder');
    }
    this._inputWrap.appendChild(this._input);
    container.appendChild(this._inputWrap);

    this._optionTrigger = document.createElement('button');
    this._optionTrigger.type = 'button';
    this._optionTrigger.className = 'red-ui-typedInput-option-trigger';
    this._optionTrigger.setAttribute('aria-haspopup', 'true');
    this._optionTrigger.setAttribute('aria-expanded', 'false');
    this._optionLabel = document.createElement('span');
    this._optionLabel.className = 'red-ui-typedInput-option-label';
    this._optionTrigger.appendChild(this._optionLabel);
    const optionCaretWrap = document.createElement('span');
    optionCaretWrap.className = 'red-ui-typedInput-option-caret';
    const optionCaret = document.createElement('i');
    optionCaret.className = 'red-ui-typedInput-icon nr-ti-caret';
    optionCaret.setAttribute('aria-hidden', 'true');
    optionCaretWrap.appendChild(optionCaret);
    this._optionTrigger.appendChild(optionCaretWrap);
    container.appendChild(this._optionTrigger);

    this._expandButton = document.createElement('button');
    this._expandButton.type = 'button';
    this._expandButton.className = 'red-ui-typedInput-option-expand';
    this._expandButton.setAttribute('aria-disabled', 'true');
    this._expandButton.title =
      'In the editor this opens the JSON edit dialog. That dialog is part of the editor, not of this illustration.';
    const ellipsis = document.createElement('i');
    ellipsis.className = 'red-ui-typedInput-icon nr-ti-ellipsis';
    ellipsis.setAttribute('aria-hidden', 'true');
    this._expandButton.appendChild(ellipsis);
    container.appendChild(this._expandButton);

    this._typeMenu = this._createMenu('type');
    this._optionMenu = this._createMenu('option');

    this.appendChild(container);
    this.appendChild(this._typeMenu);
    this.appendChild(this._optionMenu);

    this._wireEvents();
    this._populateTypeMenu();

    const initialType = config.type || this._types[0].value;
    const initialValue = this.getAttribute('value') ?? config.value ?? '';
    this._setType(initialType, { silent: true });
    if (initialValue !== '') this._setValue(String(initialValue), { silent: true });
  }

  _createMenu(kind) {
    const menu = document.createElement('div');
    // red-ui-editor-dialog rides along with red-ui-typedInput-options in the
    // widget's own markup; kept so the pair can be matched against the source.
    menu.className = 'red-ui-typedInput-options red-ui-editor-dialog';
    menu.hidden = true;
    menu.dataset.nrTiMenu = kind;
    return menu;
  }

  /* ── Events ───────────────────────────────────────────────────────────── */

  _wireEvents() {
    this._typeSelect.addEventListener('click', (evt) => {
      evt.preventDefault();
      // With a single type there is nothing to choose, so the widget sends focus
      // into the field instead of opening a one-item menu. That makes the `msg.`
      // prefix a way into the field rather than dead furniture.
      if (this._types.length === 1) {
        if (!this._inputWrap.hidden) this._input.focus();
        return;
      }
      this._toggleMenu(this._typeMenu, this._typeSelect);
    });
    this._optionTrigger.addEventListener('click', (evt) => {
      evt.preventDefault();
      this._toggleMenu(this._optionMenu, this._optionTrigger);
    });
    this._expandButton.addEventListener('click', (evt) => evt.preventDefault());

    for (const trigger of [this._typeSelect, this._optionTrigger]) {
      trigger.addEventListener('keydown', (evt) => {
        if (trigger === this._typeSelect && this._types.length === 1) return;
        if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp' || evt.key === ' ') {
          evt.preventDefault();
          const menu = trigger === this._typeSelect ? this._typeMenu : this._optionMenu;
          this._openMenu(menu, trigger, evt.key === 'ArrowUp' ? 'last' : 'selected');
        }
      });
    }

    // The container carries the focus ring for every part of the control, which
    // is how the widget does it: one object lighting up, not three.
    this._container.addEventListener('focusin', () => {
      this._container.classList.add('red-ui-typedInput-focus');
    });
    this._container.addEventListener('focusout', () => {
      if (!this._openMenuEl) this._container.classList.remove('red-ui-typedInput-focus');
    });

    this._input.addEventListener('input', () => this._emitChange());
    this._input.addEventListener('change', () => this._emitChange());
  }

  _teardownDocumentListeners() {
    if (this._onDocumentMouseDown) {
      document.removeEventListener('mousedown', this._onDocumentMouseDown, true);
      this._onDocumentMouseDown = null;
    }
  }

  /* ── Menus ────────────────────────────────────────────────────────────── */

  _populateTypeMenu() {
    this._typeMenu.replaceChildren();
    this._typeMenu.setAttribute('role', 'menu');
    this._typeMenu.setAttribute('aria-label', 'Value type');
    for (const type of this._types) {
      const item = this._createMenuItem({
        value: type.value,
        label: type.label || type.value,
        icon: type.icon,
        role: 'menuitem',
      });
      item.addEventListener('click', (evt) => {
        evt.preventDefault();
        // Type first, close second. Closing decides where focus goes by looking
        // at which parts of the control are on screen, and choosing `bool`
        // swaps the text field for a picker: with the order reversed, focus
        // went to a field that was about to be hidden and ended up nowhere.
        this._setType(type.value);
        this._closeMenu();
      });
      this._typeMenu.appendChild(item);
    }
  }

  _populateOptionMenu() {
    const type = this._activeType;
    const multiple = Boolean(type.multiple);
    this._optionMenu.replaceChildren();
    // Single select is a menu of commands. Multiple select is a set of
    // checkboxes, and real <input type="checkbox"> elements in a group beat a
    // menu of fake ones: they announce their state, they toggle with Space, and
    // the widget itself puts real checkboxes in that menu too.
    this._optionMenu.setAttribute('role', multiple ? 'group' : 'menu');
    this._optionMenu.setAttribute('aria-label', multiple ? 'Select values' : 'Value');

    for (const raw of this._activeOptions) {
      const option = normaliseOption(raw);
      if (multiple) {
        const item = document.createElement('label');
        item.className = 'nr-ti-menu-item nr-ti-menu-item-no-icon';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.value = option.value;
        box.checked = this._optionValue.split(',').includes(option.value);
        const text = document.createElement('span');
        text.textContent = option.label ?? option.value;
        item.append(box, text);
        // The widget applies a multiple selection when the menu closes, not on
        // every tick, and reads the boxes at that moment. Same here.
        box.addEventListener('keydown', (evt) => {
          if (evt.key === 'Escape') {
            evt.preventDefault();
            this._closeMenu();
          }
        });
        this._optionMenu.appendChild(item);
      } else {
        const item = this._createMenuItem({
          value: option.value,
          label: option.label ?? option.value,
          icon: option.icon,
          role: 'menuitem',
        });
        // Same marking as the type menu: the current choice is announced and
        // painted, and it is where focus lands when the menu opens.
        item.setAttribute('aria-current', String(option.value === this._optionValue));
        item.addEventListener('click', (evt) => {
          evt.preventDefault();
          this._selectOption(option.value);
          this._closeMenu();
        });
        this._optionMenu.appendChild(item);
      }
    }
  }

  _createMenuItem({ value, label, icon, role }) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'nr-ti-menu-item';
    item.setAttribute('role', role);
    item.setAttribute('value', value);
    // Menu items are not tab stops; the trigger is. Arrow keys move between
    // them, which is the menu-button pattern.
    item.tabIndex = -1;
    if (icon) {
      const iconEl = document.createElement('i');
      iconEl.className = `red-ui-typedInput-icon nr-ti-type-icon nr-ti-icon-${icon}`;
      iconEl.setAttribute('aria-hidden', 'true');
      item.appendChild(iconEl);
    } else {
      item.classList.add('nr-ti-menu-item-no-icon');
    }
    const text = document.createElement('span');
    text.textContent = label;
    item.appendChild(text);
    item.addEventListener('keydown', (evt) => this._onMenuKeydown(evt));
    return item;
  }

  _menuItems(menu) {
    return [...menu.querySelectorAll('.nr-ti-menu-item')];
  }

  _focusableInItem(item) {
    return item.tagName === 'LABEL' ? item.querySelector('input') : item;
  }

  _onMenuKeydown(evt) {
    const menu = evt.currentTarget.closest('.red-ui-typedInput-options');
    const items = this._menuItems(menu);
    const index = items.indexOf(evt.currentTarget);
    const focusAt = (i) => {
      const target = this._focusableInItem(items[(i + items.length) % items.length]);
      if (target) target.focus();
    };
    switch (evt.key) {
      case 'ArrowDown':
        evt.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        evt.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        evt.preventDefault();
        focusAt(0);
        break;
      case 'End':
        evt.preventDefault();
        focusAt(items.length - 1);
        break;
      case 'Escape':
        evt.preventDefault();
        this._closeMenu();
        break;
      case 'Tab':
        // Not prevented: Tab out of an open menu should move on through the
        // page, it just should not leave the menu hanging open behind it.
        this._closeMenu({ restoreFocus: false });
        break;
      default:
        break;
    }
  }

  _toggleMenu(menu, trigger) {
    if (this._openMenuEl === menu) this._closeMenu();
    else this._openMenu(menu, trigger, 'selected');
  }

  _openMenu(menu, trigger, focusTarget) {
    if (this._openMenuEl) this._closeMenu({ restoreFocus: false });
    const items = this._menuItems(menu);
    if (!items.length) return;
    menu.hidden = false;
    menu.classList.remove('nr-ti-menu-above');
    trigger.setAttribute('aria-expanded', 'true');
    this._openMenuEl = menu;
    this._openTrigger = trigger;
    this._container.classList.add('red-ui-typedInput-focus');

    // Flip above the control when the menu would run off the bottom of the
    // viewport. Measured after unhiding, because a hidden element has no box.
    const rect = menu.getBoundingClientRect();
    if (
      rect.bottom > window.innerHeight &&
      this._container.getBoundingClientRect().top > rect.height
    ) {
      menu.classList.add('nr-ti-menu-above');
    }

    let target = items[0];
    if (focusTarget === 'last') target = items[items.length - 1];
    else if (focusTarget === 'selected') {
      const current = items.find((item) => item.getAttribute('aria-current') === 'true');
      if (current) target = current;
    }
    const focusable = this._focusableInItem(target);
    if (focusable) focusable.focus();

    this._onDocumentMouseDown = (evt) => {
      if (!this.contains(evt.target)) this._closeMenu({ restoreFocus: false });
    };
    document.addEventListener('mousedown', this._onDocumentMouseDown, true);
  }

  _closeMenu({ restoreFocus = true } = {}) {
    const menu = this._openMenuEl;
    if (!menu) return;
    const wasMultiple = menu === this._optionMenu && Boolean(this._activeType?.multiple);
    menu.hidden = true;
    this._openMenuEl = null;
    // Only on the triggers that advertise a popup: a single-type control drops
    // aria-haspopup, and it should not gain a stray aria-expanded here.
    if (this._typeSelect.hasAttribute('aria-haspopup')) {
      this._typeSelect.setAttribute('aria-expanded', 'false');
    }
    this._optionTrigger.setAttribute('aria-expanded', 'false');
    this._teardownDocumentListeners();

    if (wasMultiple) {
      const selected = [...menu.querySelectorAll('input[type="checkbox"]')]
        .filter((box) => box.checked)
        .map((box) => box.value);
      this._selectOption(selected.join(','));
    }

    if (restoreFocus) {
      // The widget hands focus back to whichever part of the control is
      // actually on screen: the field if there is one, else the option
      // trigger, else the type button.
      const target = !this._inputWrap.hidden
        ? this._input
        : !this._optionTrigger.hidden
          ? this._optionTrigger
          : this._typeSelect;
      target.focus();
    } else {
      this._container.classList.remove('red-ui-typedInput-focus');
    }
  }

  /* ── Type and value ───────────────────────────────────────────────────── */

  _setType(typeValue, { silent = false } = {}) {
    const type = this._typeMap.get(typeValue);
    if (!type || type === this._activeType) return;
    const previous = this._activeType;

    // Remember what the outgoing type was showing, then restore whatever this
    // type was last showing. Option types remember per type; every free-text
    // type shares one slot, so switching string -> number keeps the text.
    if (previous) {
      const key = previous.options && previous.hasValue !== true ? previous.value : '_';
      this._oldValues[key] = key === '_' ? this._input.value : this._optionValue;
    }

    this._activeType = type;
    this._activeOptions = (type.options || []).map(normaliseOption);
    const optionsDriveValue = this._activeOptions.length > 0 && type.hasValue !== true;

    // Type label and icon. The widget shows the icon alone when a type has one,
    // and the text label only when it does not: `str` is the a/z glyph with no
    // "string" beside it, `msg` is the text "msg." with no glyph.
    this._typeLabel.replaceChildren();
    if (type.icon) {
      const iconEl = document.createElement('i');
      iconEl.className = `red-ui-typedInput-icon nr-ti-type-icon nr-ti-icon-${type.icon}`;
      iconEl.setAttribute('aria-hidden', 'true');
      this._typeLabel.appendChild(iconEl);
    } else if (type.label) {
      this._typeLabel.textContent = type.label;
    }
    this._typeSelect.title = type.label || '';
    this._typeSelect.setAttribute(
      'aria-label',
      type.label ? `Value type: ${type.label}` : 'Value type',
    );

    const single = this._types.length === 1;
    this._caret.hidden = single;
    this._typeSelect.classList.toggle('disabled', single);
    // Out of the tab order and not advertising a popup, but NOT the `disabled`
    // attribute. The widget takes it out of the tab order the same way
    // (tabindex -1) and keeps it clickable; a disabled button would also stop
    // the `msg.` prefix carrying its label into the accessibility tree as
    // anything other than a dead control.
    this._typeSelect.tabIndex = single ? -1 : 0;
    if (single) {
      this._typeSelect.removeAttribute('aria-haspopup');
      this._typeSelect.removeAttribute('aria-expanded');
    } else {
      this._typeSelect.setAttribute('aria-haspopup', 'true');
      this._typeSelect.setAttribute('aria-expanded', String(this._openMenuEl === this._typeMenu));
    }
    // A single type with neither icon nor label has nothing to show, so the
    // widget hides the button outright. That is the state the docs' custom
    // options example is in, which is why it renders as one wide picker.
    const hideTypeSelect = single && !type.icon && !type.label;
    this._typeSelect.hidden = hideTypeSelect;
    this._container.dataset.nrTiOnlyOptions = String(hideTypeSelect);
    this._typeSelect.classList.toggle(
      'red-ui-typedInput-full-width',
      type.hasValue === false && !hideTypeSelect,
    );

    // Which of the field / option picker is showing.
    this._optionTrigger.hidden = this._activeOptions.length === 0;
    this._inputWrap.hidden = optionsDriveValue;
    this._optionTrigger.style.flexGrow = optionsDriveValue ? '1' : '0';
    this._expandButton.hidden = !type.expand;

    for (const item of this._menuItems(this._typeMenu)) {
      item.setAttribute('aria-current', String(item.getAttribute('value') === type.value));
    }

    // Restore or seed the value for the incoming type.
    if (optionsDriveValue) {
      const remembered = this._oldValues[type.value];
      const fallback = type.multiple ? '' : this._activeOptions[0].value;
      this._optionValue = remembered ?? fallback;
      this._populateOptionMenu();
      this._renderOptionLabel();
    } else {
      this._optionValue = '';
      this._input.value = this._oldValues['_'] ?? type.default ?? '';
      this._populateOptionMenu();
    }

    if (!silent) this._emitChange();
  }

  _setValue(value, { silent = false } = {}) {
    const type = this._activeType;
    if (!type) return;
    if (this._activeOptions.length && type.hasValue !== true) {
      this._selectOption(value, { silent });
      return;
    }
    this._input.value = value;
    if (!silent) this._emitChange();
  }

  _selectOption(value, { silent = false } = {}) {
    this._optionValue = value;
    this._renderOptionLabel();
    this._populateOptionMenu();
    if (!silent) this._emitChange();
  }

  _renderOptionLabel() {
    const type = this._activeType;
    const selected = this._optionValue ? this._optionValue.split(',') : [];
    if (type.multiple) {
      // "__count__ selected", the editor's typedInput.selected message.
      this._optionLabel.textContent = `${selected.length} selected`;
      this._optionTrigger.setAttribute(
        'aria-label',
        `Selected values: ${selected.length} selected`,
      );
      return;
    }
    const option = this._activeOptions.find((o) => o.value === this._optionValue);
    const label = option ? (option.label ?? option.value) : this._optionValue;
    this._optionLabel.textContent = label;
    this._optionTrigger.setAttribute('aria-label', `Value: ${label}`);
  }

  _emitChange() {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        detail: { type: this.type, value: this.value },
      }),
    );
  }
}

if (!customElements.get('nr-typed-input')) {
  customElements.define('nr-typed-input', NrTypedInput);
}

export { NrTypedInput, BUILT_IN_TYPES };
