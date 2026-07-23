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
const LOAD_ORDER = ['state', 'theme', 'cards', 'rules', 'render', 'controls', 'game'];

const DEFAULT_SEED = 0x9e3779b9; // fixed seed → deterministic scenario tests

/* Small deterministic PRNG (mulberry32) so games are reproducible: a CI
 * failure reproduces locally, and autoplay explores fixed-but-varied games. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
    // Minimal parent so code like `el.parentNode.appendChild(...)` works.
    parentNode: { appendChild(c) { return c; }, removeChild(c) { return c; }, insertBefore(c) { return c; } },
    insertBefore(c) { return c; }, removeChild(c) { return c; },
  };
  Object.defineProperty(el, 'innerHTML', { get() { return ''; }, set() { el.children = []; } });
  Object.defineProperty(el, 'textContent', { get() { return el._text; }, set(v) { el._text = v; } });
  return el;
}

/** Load a fresh game context. Returns the sandbox (globals live on it).
 *  @param {object} [opts]
 *  @param {number} [opts.seed] RNG seed — same seed gives an identical game.
 *         Defaults to a fixed value so scenario tests are deterministic;
 *         autoplay passes a per-game seed for varied-but-reproducible games. */
function loadGame(opts) {
  opts = opts || {};
  const seed = opts.seed == null ? DEFAULT_SEED : opts.seed;
  const sandbox = {};
  sandbox.window = sandbox;                 // `window.X = X` → global property X
  sandbox.console = console;
  // Math clone with a seeded random(); Math.floor/imul/etc. inherited.
  sandbox.Math = Object.assign(Object.create(Math), { random: mulberry32(seed) });
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
