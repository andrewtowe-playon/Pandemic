# Pandemic — Board Game Reference

## Project Context — Hackathon

- **Format:** 4-hour hackathon. Goal is a playable web-based Pandemic (plain HTML/JS/CSS,
  no TypeScript/build step). It is also an exercise in **AI-assisted development and team
  coordination**: all five teammates work with Claude in parallel on the same repo.
- **Team (5):** Ryan Beal (owner of this working copy), Andrew Towe (set up the repo + first
  commit; the **only** team member who knows the game well — treat him as the rules
  authority), Abigail Andrews, Tae, and Mike Weiss.
- **Working style:** work is delegated across the team. Most of the team is **new to
  Pandemic**, so when writing or reviewing code, it must **align with the official rules** —
  see `Rules.md` (the authoritative rules reference; correct where this file and it disagree).
  When a rule is ambiguous, flag it rather than guessing, and prefer Andrew's call.

## How We Build — Architecture & Coordination (READ FIRST)

This section is shared context for **every teammate's Claude**. Follow it so five people
(and five Claude sessions) can build in parallel without collisions. Detailed process is in
`DELEGATION.md`; the concrete data contract is in `js/state.js`; the rules are in `Rules.md`.

### If you are Claude working in this repo

- You are **one of five Claude instances** on this repo, one per teammate.
- **Stay in your owner's file.** Do the `TODO(<owner>)` items in the file assigned to your
  teammate (see ownership map). Do **not** edit another person's file, and never edit
  `js/state.js` or `js/rules.js` unless you are Andrew.
- **Conform to the contract** documented at the top of `js/state.js` (the `GameState` shape,
  card shapes, deck order). Read it before writing code.
- **Game logic must match `Rules.md`.** When a rule is ambiguous, follow `Rules.md` and flag
  it for Andrew — do not invent a rule.
- Keep changes small and commit often on your own branch.

### The one architectural rule — one-way data flow

```
user input  ->  Rules.* (or setup) mutates GameState  ->  Render.render()
```

- `GameState` (in `js/state.js`) is the single shared state object. Everyone **reads** it.
- Only `Rules.*` and setup code **mutate** it. After any change, call `Render.render()`
  (it redraws everything from state — no manual DOM patching).

### Ownership map — edit only your file

| File | Owner | Responsibility |
|------|-------|----------------|
| `js/state.js` | **Andrew** | Shared contract: constants + `GameState` + pure helpers. **Frozen at 0:30** — additive changes only after (no renames/removals). |
| `js/rules.js` | **Andrew** | Rules engine: actions, draw/epidemic/infect, outbreak chains, eradication, win/lose. |
| `js/game.js` | **Ryan** | Setup + turn cycle (ACTIONS → DRAW → INFECT → next player). Glue only. |
| `js/render.js` | **Abigail** | Board rendering: cubes, stations, pawns, markers, highlights. |
| `js/cards.js` | **Tae** | Both decks: build, shuffle, deal, seed infections, intensify. |
| `js/controls.js` | **Mike** | Sidebar UI, action buttons, hand, turn buttons, toasts, win/lose modal. |

`index.html` (DOM containers + script order) and `setup.html` are shared — coordinate edits.

### The contract everyone relies on

- **Card shapes / deck order:** documented at the top of `js/state.js` (index 0 = top of
  deck; `.pop()` = bottom). Do not diverge.
- **Action functions in `rules.js`** return `{ ok:true }` or `{ ok:false, reason:'...' }`;
  they validate first, mutate second, and decrement `actionsRemaining` on success.
- **Global helpers:** `getInfectionRate()`, `getCurrentPlayer()`, `getAdjacent(city)`,
  `isAdjacent(a,b)`, `getStations()`, `cubesOnBoard(color)`, `initBoard()`, `logEvent(msg)`.
- Everything is attached to `window`, so plain `<script>` files see each other (no imports).

### Build priority (protect "playable")

1. **MVP loop:** setup → drive + treat + build + draw 2 + infect + win/lose.
2. Then: other movement actions, share knowledge, discover cure, epidemics + outbreaks.
3. Stretch (cut first if short): the 7 roles, then the 5 events (Contingency Planner /
   Dispatcher last).

### Running it (Python is NOT installed on these machines)

Serve the folder with Node, then open the printed URL:

```
npx serve .          # or any static server; then open http://localhost:3000
```

City coordinates in `state.js` are **manually calibrated to `Board.webp`** — do not replace
them with un-calibrated values. `setup.html` writes player/role/difficulty choices to
`localStorage` (`pandemicSettings`); `game.js` `boot()` reads them to start a game.

### Recent structural decisions (so you're not surprised)

- The original single-file `index.html` visualizer was **refactored into the `js/` module
  split** above — that is the intended structure now; do not revert to one big file.
- The team's board image (`Board.webp`), calibrated coordinates, and `setup.html` were
  merged in and preserved. Their earlier inline player-badge / turn UI now belongs in
  `render.js` / `controls.js`.

## Overview

Pandemic is a cooperative board game for 2–4 players. Players work together as a team of specialists to treat disease outbreaks and discover cures before humanity is overwhelmed. The game is won or lost collectively.

---

## Objective

**Win:** Discover cures for all 4 diseases.
**Lose:** Any of the following occur:
- The outbreak marker reaches the 8th space on the Outbreaks track.
- You need to place a disease cube but none remain in the supply (any color).
- You need to draw a Player card but the Player deck is empty.

---

## Components

- 1 Board (world map with 48 cities)
- 96 Disease Cubes (24 each: Blue, Yellow, Black, Red)
- 6 Research Stations (wooden houses)
- 59 Player Cards (48 City cards, 6 Epidemic cards, 5 Event cards)
- 48 Infection cards
- 4 Reference cards
- 7 Role cards
- 4 Cure markers (vials)
- 1 Infection Rate marker
- 1 Outbreak marker
- 2 Pawns (extra, for 2-player)

---

## Setup

1. Place the board. Set the Infection Rate marker on the "2" space and the Outbreak marker on "0".
2. Place 1 Research Station in **Atlanta**.
3. Shuffle the Infection deck. Flip 3 cards — place 3 cubes on each city. Flip 3 more — place 2 cubes. Flip 3 more — place 1 cube. (9 cities seeded total.) Place these 9 cards in the Infection discard pile.
4. Shuffle the Player deck. Deal each player the correct number of cards based on player count:
   - 2 players: 4 cards each
   - 3 players: 3 cards each
   - 4 players: 2 cards each
5. Add Epidemic cards to the Player deck based on difficulty:
   - Introductory: 4 Epidemic cards
   - Standard: 5 Epidemic cards
   - Heroic: 6 Epidemic cards
   Divide remaining deck into equal piles, shuffle one Epidemic into each pile, then stack piles.
6. Each player chooses (or is dealt) a Role card and places their pawn in Atlanta.
7. The player who has most recently been sick goes first.

---

## Turn Structure

Each player's turn has 3 phases:

### Phase 1: Take 4 Actions

Choose any combination of the following actions (may repeat):

#### Movement Actions
| Action | Description |
|--------|-------------|
| **Drive / Ferry** | Move to a city connected by a line on the board. |
| **Direct Flight** | Discard a City card to fly to that city. |
| **Charter Flight** | Discard the City card matching your *current* city to fly to any city. |
| **Shuttle Flight** | Move from one Research Station to any other Research Station. |

#### Other Actions
| Action | Description |
|--------|-------------|
| **Build a Research Station** | Discard the City card matching your current city to place a Research Station there. (Max 6 on board; remove one if needed.) |
| **Treat Disease** | Remove 1 disease cube from your current city. If cured, remove ALL cubes of that color for 1 action. |
| **Share Knowledge** | Give or take a City card from another player in the same city. The card must match the city you are both in (unless playing the Researcher). |
| **Discover a Cure** | At a Research Station, discard 5 City cards of the same color to cure that disease. |

**Special Action — Special Event Cards:** Event cards can be played at any time (not as an action) by any player.

### Phase 2: Draw 2 Player Cards

Draw the top 2 cards from the Player deck. If you draw an **Epidemic card**, resolve it immediately (see Epidemic below), then continue drawing.

If the Player deck runs out, the players lose immediately.

### Phase 3: Infect Cities

Draw Infection cards equal to the current **Infection Rate** and place 1 cube of the matching color on each city drawn.

- If a city already has 3 cubes of a color and would receive a 4th, an **Outbreak** occurs instead.

---

## Epidemic Cards

When an Epidemic card is drawn, do the following **in order**:

1. **Increase:** Advance the Infection Rate marker one space.
2. **Infect:** Draw the bottom card of the Infection deck. Place 3 cubes of that color on that city. (Even if it already has cubes — this can trigger an Outbreak.)
3. **Intensify:** Shuffle the Infection discard pile and place it on top of the Infection deck.

Then discard the Epidemic card.

---

## Outbreaks

When a cube would be placed in a city that already has 3 cubes of that color:
- Do NOT add a 4th cube.
- Advance the Outbreak marker 1 space.
- Place 1 cube of that color on each city connected to the outbreak city that does not already have 3 of that color.
- If a connected city also has 3 cubes, it also Outbreaks (chain reaction). Each city can only Outbreak once per chain.

---

## Infection Rate Track

The track has 7 spaces with values `2, 2, 2, 3, 3, 4, 4` (left to right). The marker starts
on the leftmost `2` and advances one space per Epidemic drawn.

| Epidemics Drawn | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|-----------------|---|---|---|---|---|---|---|
| Infection Rate  | 2 | 2 | 2 | 3 | 3 | 4 | 4 |

---

## Cures and Eradication

- **Cured:** Discard 5 city cards of the same color at a Research Station. Flip the cure marker. Treating a cured disease removes ALL cubes in the city for 1 action (instead of 1 cube).
- **Eradicated:** If a disease is cured AND all its cubes have been removed from the board, flip its marker to the eradicated side. No more cubes of that color are placed (skip Infection cards of that color). Eradication is not required to win.

---

## Roles

Each role has a special ability. Players should coordinate based on roles.

| Role | Special Ability |
|------|----------------|
| **Medic** | Remove ALL cubes of one color with 1 Treat action. Also automatically removes cubes of cured diseases when entering a city (no action needed). |
| **Scientist** | Needs only **4** cards (instead of 5) of one color to Discover a Cure. |
| **Researcher** | Can give any City card (not just the current city card) to another player in the same city. |
| **Operations Expert** | Can Build a Research Station without discarding a City card. Once per turn, can move from a Research Station to any city by discarding any City card. |
| **Dispatcher** | May move another player's pawn as if it were their own (with that player's permission). May also move any pawn to a city containing another pawn for 1 action. |
| **Quarantine Specialist** | Prevents cube placement AND outbreaks in their current city and all adjacent cities. |
| **Contingency Planner** | May take any Event card from the Player discard pile and store it on their role card. This stored card may be played later and is removed from the game when used (does not go to discard). Can hold only 1 card at a time. |

---

## Event Cards

Event cards can be played at **any time** (even during another player's turn or between card draws). They do not cost an action.

| Event Card | Effect |
|------------|--------|
| **Airlift** | Move any 1 pawn to any city. |
| **Government Grant** | Add 1 Research Station to any city (no card discard required). |
| **One Quiet Night** | Skip the next Infect Cities phase. |
| **Resilient Population** | Remove any 1 card in the Infection discard pile from the game. |
| **Forecast** | Draw, look at, and rearrange the top 6 Infection cards in any order; return them to the top of the deck. |

---

## Hand Limit

Players may hold a maximum of **7 cards** at any time. If after drawing you exceed 7, immediately discard down to 7 (or play Event cards to reduce hand size).

---

## Research Stations

- Maximum **6** Research Stations in the game.
- If all 6 are on the board and you need to build another, remove an existing one and place it in the new city.
- Required for: Shuttle Flight, Discover a Cure.

---

## Strategy Tips

- Prioritize the Medic for removing cubes efficiently.
- Use the Researcher to pass cards to the Scientist.
- Build Research Stations in high-connectivity hubs.
- Save Event cards for emergencies (especially One Quiet Night and Resilient Population).
- Watch the Infection discard pile — after each Epidemic, those cities will be hit again soon.
- Coordinate hand management; it is often better for one player to collect 5 cards of one color rather than spreading them.
- Treat to prevent outbreaks, not just to cure — chain outbreaks are the fastest way to lose.

---

## Quick Reference

| Condition | Result |
|-----------|--------|
| 4th cube in a city | Outbreak |
| 8th Outbreak | Players lose |
| Any cube color runs out | Players lose |
| Player deck runs out | Players lose |
| All 4 diseases cured | Players win |
