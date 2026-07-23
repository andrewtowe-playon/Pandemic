/* =============================================================================
 * test/harness.js  —  headless loader for the game modules
 * -----------------------------------------------------------------------------
 * Loads state/cards/rules/render/controls/game into an isolated V8 context with
 * a lightweight DOM shim, so tests can drive the REAL modules in Node (no
 * browser, no build step, no dependencies). Each loadGame() call is a fresh,
 * independent game world.
 * ===========================================================================*/
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const JS_DIR = path.join(__dirname, '..', 'js');
const LOAD_ORDER = ['state', 'cards', 'rules', 'render', 'controls', 'game'];

/* Minimal DOM element — every method is a harmless no-op so the real
 * render.js / controls.js run without throwing on valid state. */
function makeEl() {
  const el = {
    children: [], style: {}, dataset: {}, _text: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {}, getAttribute() { return null; },
    appendChild(c) { this.children.push(c); return c; },
    append(...cs) { this.children.push(...cs); },
    addEventListener() {}, removeEventListener() {}, remove() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    focus() {},
  };
  Object.defineProperty(el, 'innerHTML', { get() { return ''; }, set() { el.children = []; } });
  Object.defineProperty(el, 'textContent', { get() { return el._text; }, set(v) { el._text = v; } });
  return el;
}

/** Load a fresh game context. Returns the sandbox (globals live on it). */
function loadGame() {
  const sandbox = {};
  sandbox.window = sandbox;                 // `window.X = X` → global property X
  sandbox.console = console;
  sandbox.Math = Math;
  sandbox.Date = Date;
  sandbox.setTimeout = () => 0;
  sandbox.clearTimeout = () => {};
  sandbox.CSS = { escape: (s) => String(s) };
  sandbox.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  sandbox.document = {
    addEventListener() {},
    getElementById: () => makeEl(),
    createElement: () => makeEl(),
    createElementNS: () => makeEl(),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  vm.createContext(sandbox);
  for (const name of LOAD_ORDER) {
    const code = fs.readFileSync(path.join(JS_DIR, name + '.js'), 'utf8');
    vm.runInContext(code, sandbox, { filename: 'js/' + name + '.js' });
  }
  // Wire the view layer against the shim (normally done in Game.boot(), which
  // the tests skip because it reads localStorage / redirects to setup.html).
  if (sandbox.Render && sandbox.Render.init) sandbox.Render.init();
  if (sandbox.Controls && sandbox.Controls.init) sandbox.Controls.init();
  return sandbox;
}

module.exports = { loadGame };
