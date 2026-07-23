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

## Outstanding Work — snapshot (updated 2026-07-23 after browser playtest)

The rules **engine is complete** — every mechanic in the build-priority list below
(MVP → stretch, all 7 roles, all 5 events) is implemented and tested in `rules.js` /
`cards.js`. A full browser playtest ran a game start→loss with **zero console errors**:
board/pawns/cubes/markers render, drive/actions/draw/epidemic/outbreak-chain/loss and the
end-game modal all work. What's left is **UI plumbing** in `controls.js`:

| Status | Item | File / Owner | Tracked |
|---|---|---|---|
| ✅ Done | Pawns drawn on the board (`renderPawns`) | `render.js` / Abigail | — |
| ✅ Done | Event cards playable — click chip to play | `controls.js` / Andrew | `571360a` |
| ✅ Done | Contingency Planner UI — Retrieve Event button + stored card chip | `controls.js` / Andrew | `1d2ac91` |
| ✅ Done | Turn-end summary popup (player cards + infection cards drawn) | `game.js`+`controls.js` / Andrew | `56ea50b` |
| ✅ Done | All-players panel populates on load | `playerPanel.js` / Andrew | `e89b831` |
| 🔴 Open (P0) | 7-card hand limit not enforced — no discard prompt | `controls.js` / **Tae** (was Mike) | `tasks/open/hand-limit-discard-ui.md` |
| 🟡 Nice-to-have | Role-action buttons (Ops Expert / Dispatcher) | `controls.js` / Mike | not filed — `rules.js` has the logic; wiring only |

The remaining P0 is the gap between "technically complete" and "feels like real Pandemic."
Keep this table updated as cards close.

> **Handoff (2026-07-23):** Mike left for the airport. Andrew picked up event-card UI,
> CP wiring, and the turn-summary popup. Only one P0 remains — the hand-limit discard
> prompt — now picked up by **Tae** (Tae's own `cards.js` is complete). Ownership map
> above still lists Mike as the original `controls.js` owner for history.

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

- ~~**`Board.webp` is not in the repo** — the board shows a gradient fallback until someone
  adds/commits the image. City dots/positions work regardless.~~
  **✅ RESOLVED (2026-07-23)** — `Board.webp` is committed (later upgraded to a sharper
  image); calibrated coordinates in `state.js` are tuned to it.
- All `TODO(owner)` markers in the JS files are the actual work items.
  **Update (2026-07-23):** only one remains — `renderPawns()` in `render.js`. See the
  "Outstanding Work" snapshot near the top for the full current list.
