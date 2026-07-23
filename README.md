# Pandemic — web edition (a.k.a. *PlayOn: Outage Season*)

A fully playable, rules-faithful, hotseat (pass-the-device) web version of the co-op board
game **Pandemic** — built by five people in a 4-hour hackathon, four of whom had never
played the game. Plain HTML/JS/CSS, **no build step**, and a display-only reskin that turns
diseases into production incidents.

> Cooperative: 2–4 players share the win or loss. Discover cures for all 4 diseases before
> either 8 outbreaks, a cube shortage, or an empty player deck ends the run.

## Play it

No install, no build. Serve the folder with any static server and open the printed URL:

```bash
npx serve .          # then open the URL it prints (e.g. http://localhost:3000)
# or any static server; Python is not installed on the build machines
```

Start at **`setup.html`** (choose players, difficulty, and get dealt roles); it hands off
to the board. To jump straight in from the browser console:

```js
Game.newGame({ numPlayers: 2, difficulty: 'introductory',
               roles: ['Medic', 'Scientist'], names: ['P1', 'P2'] });
```

## What's implemented

- All **8 actions** — drive/ferry, direct/charter/shuttle flight, build station, treat,
  share knowledge, discover cure
- **Epidemics** (correct increase → infect-bottom → intensify order) and **chained
  outbreaks** (once-per-city per chain)
- **Cures & eradication**, hand-limit enforcement, all win/loss conditions
- All **7 roles** with their real abilities, and all **5 event cards**
- Full board UI: pawns, cubes, research stations, infection-rate & outbreak markers,
  per-pile card counts; sidebar with actions, hand, per-player panel, turn summaries; a
  win/lose modal; and a dev console (⚙ DEV) for testing
- **"PlayOn: Outage Season"** reskin — a pure display layer (`js/theme.js`); the rules
  engine is untouched

## How it's built

Plain global scripts on `window`, loaded in dependency order by `index.html`. One-way data
flow keeps it simple:

```
user input  →  Rules.* (or setup) mutates GameState  →  Render.render() redraws everything
```

| File | Responsibility |
|---|---|
| `js/state.js` | Shared `GameState` + constants (cities, adjacency, cards) + pure helpers |
| `js/rules.js` | The rules engine — every action, epidemic, outbreak, cure, win/loss |
| `js/cards.js` | Both decks: build, shuffle, deal, seed infections, intensify |
| `js/game.js` | Turn cycle: ACTIONS → DRAW → INFECT → next player |
| `js/render.js` | Board rendering (reads state, never mutates) |
| `js/controls.js` | Sidebar UI, action bar, modals, event/role interactions |
| `js/theme.js` | Display-only reskin (labels/flavor); no game logic |
| `js/playerPanel.js` · `js/devConsole.js` | All-players overview · testing console |

Authoritative rules live in [`Rules.md`](Rules.md); architecture, ownership, and the
project story are in [`DELEGATION.md`](DELEGATION.md), [`CLAUDE.md`](CLAUDE.md), and
[`PRESENTATION.md`](PRESENTATION.md).

## Tests

Dependency-free Node harness — no browser, no packages. **Run before every commit:**

```bash
npm test            # or: node test/run.js
```

86 checks across four layers, gated by GitHub Actions on every push and PR:

- **engine** — scenario assertions for the core mechanics
- **rules-audit** — one regression test per bug found in the rules audit
- **playthrough / paths** — a full game driven through the real UI entry points; the **win
  path**, every movement/build path, events, card conservation, and modal render paths
- **autoplay** — a bot plays 25 full games checking invariants every turn (cube
  conservation, ≤3 cubes/city, outbreaks ∈ [0,8], infection deck = 48, termination)

## Credits

Andrew Towe · Ryan Beal · Abigail Andrews · Tae Kim · Mike Weiss — with heavy use of Claude
as a coordinating teammate (rules research, tests, review). Pandemic is a Z-Man Games
property; this is a non-commercial hackathon project.
