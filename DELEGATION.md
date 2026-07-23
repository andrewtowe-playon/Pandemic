# Pandemic Hackathon — Delegation & Architecture

4-hour build of a playable, hotseat (pass-the-device) web Pandemic. Plain HTML/JS/CSS,
no build step. **All game logic must match [`Rules.md`](Rules.md).** When a rule is
ambiguous, ask Andrew (rules authority) rather than guessing.

## Handoffs — the `tasks/` queue

Cross-teammate work (bugs found in someone else's file, follow-ups, "someone please…")
goes in [`tasks/`](tasks/) as one card per file. State is the directory
(`open/` → `working/` → `done/`); move a card with `git mv`. Cards can be filed
**unassigned** and routed later — see [`tasks/README.md`](tasks/README.md) for the format
and assignment flow. Board at a glance: `ls tasks/open tasks/working tasks/done`.

## The one architectural rule

**One-way data flow:**

```
user input  ->  Rules.* (or setup) mutates GameState  ->  Render.render()
```

- `GameState` (in `js/state.js`) is the single shared object. Everyone **reads** it.
- Only `Rules.*` and setup code **mutate** it.
- After any change, call `Render.render()` — it redraws everything from state.
- No fancy DOM diffing. Redraw-all is fast enough and keeps us out of each other's way.

## File ownership — you only edit your own file

| File | Owner | What it does |
|---|---|---|
| `js/state.js` | **Andrew** | Constants + the `GameState` contract + pure helpers. **Frozen at 0:30** — additive changes only after. | - Done
| `js/rules.js` | **Andrew** | The rules engine: all actions, draw/epidemic/infect, outbreak chains, eradication, win/lose. | - Done
| `js/game.js` | **Ryan** | Setup + turn cycle orchestration (ACTIONS → DRAW → INFECT → next player). Glue only. |
| `js/render.js` | **Abigail** | Board rendering: cubes, stations, pawns, markers, highlights. |
| `js/cards.js` | **Tae** | Both decks: build, shuffle, deal, seed infections, epidemic intensify. |
| `js/controls.js` | **Mike** | Sidebar UI, action buttons, hand, turn buttons, toasts, win/lose modal. | - Done

`index.html` holds the DOM containers + loads scripts in dependency order. Coordinate any
edit to it (it's the only shared-ish file besides `state.js`).

## The contract (what everyone can rely on)

- **`GameState`** shape is documented at the top of `js/state.js`.
- **Card shapes** and **deck order** (index 0 = top; `.pop()` = bottom) are documented in
  `js/state.js` — do not diverge.
- **Action functions** in `rules.js` return `{ ok:true }` or `{ ok:false, reason:'...' }`.
  They validate first, mutate second, and decrement `actionsRemaining` on success.
- **Helpers** available globally: `getInfectionRate()`, `getCurrentPlayer()`,
  `getAdjacent(city)`, `isAdjacent(a,b)`, `getStations()`, `cubesOnBoard(color)`,
  `initBoard()`, `logEvent(msg)`.

Everything is attached to `window`, so plain `<script>` files see each other with no imports.

## Timeline

| Time | Phase |
|---|---|
| 0:00–0:30 | Together: confirm/freeze `state.js`. Everyone reads their file's TODOs. |
| 0:30–2:30 | Parallel build against the stubs. Small, frequent commits; one branch per person. |
| 2:30–3:15 | Integration + first hotseat playtest. |
| 3:15–4:00 | Rules verification with Andrew (outbreak chains + epidemic order) + polish. |

## Build priority (protect "playable")

1. **MVP loop:** setup → drive + treat + build + draw 2 + infect + win/lose. Playable on its own.
2. **Then:** direct/charter/shuttle flights, share knowledge, discover cure, epidemics + outbreaks.
3. **Stretch (cut first if short on time):** the 7 roles, then the 5 event cards. Contingency
   Planner / Dispatcher are the fiddliest — do them last.

## Running it

Serve the folder with a static server, then open the printed URL. **Python is not installed
on these machines** — use Node:

```
npx serve .          # then open the URL it prints (e.g. http://localhost:3000)
```

The entry point is `setup.html` (choose players/roles/difficulty); it saves to `localStorage`
and hands off to `index.html`. For quick testing you can also call from the browser console:

```js
Game.newGame({ numPlayers: 2, difficulty: 'introductory',
               roles: ['Medic','Scientist'], names: ['P1','P2'] });
```

## Known gaps to close

- **`Board.webp` is not in the repo** — the board shows a gradient fallback until someone
  adds/commits the image. City dots/positions work regardless.
- All `TODO(owner)` markers in the JS files are the actual work items.
