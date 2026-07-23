# Pandemic — Official Rules Reference

> **Source of truth for game logic.** This document is the authoritative rules reference
> for the game engine. All code must conform to what is written here. It reflects the
> **2013 second edition** of *Pandemic* (7 roles, 5 Event cards), which matches the board
> art and city graph used in `index.html`.
>
> Sourced from the official Z-Man Games rulebook and corroborated against published
> summaries (see **Sources** at the bottom). Where the original `CLAUDE.md` disagreed with
> the official rules, this document is correct — the notable case is the **Infection Rate
> track** (see that section).

---

## Objective (co-op — win/lose as a team)

**Win:** Discover cures for **all 4 diseases** (Blue, Yellow, Black, Red). The moment the
4th cure is discovered, the players win — the rest of the turn is not played out.

**Lose** — the game ends immediately in a loss if **any** of these occur:
1. The **8th outbreak** occurs (the Outbreak marker reaches the last space).
2. You need to place a disease cube of a color but **none of that color remain** in the supply.
3. You need to draw a **Player card** but the Player deck is **empty**.

---

## Components (exact counts)

- 1 Board (world map, **48 cities**)
- **96 disease cubes** — 24 each of Blue, Yellow, Black, Red
- **6 research stations**
- **59 Player cards** = 48 City cards + 6 Epidemic cards + 5 Event cards
- **48 Infection cards** (one per city)
- 7 Role cards + 5 pawns
- Markers: 1 Infection Rate marker, 1 Outbreak marker, 4 cure markers

---

## Setup

1. Place the board. Put the **Outbreak marker on 0** and the **Infection Rate marker on the
   leftmost space (rate 2)**.
2. Place **1 research station in Atlanta**. All pawns start in **Atlanta**.
3. Give each player a random **Role card** (and matching pawn color).
4. **Seed infection** — shuffle the Infection deck, then:
   - Flip **3** cards → place **3 cubes** on each (of the city's color).
   - Flip **3** cards → place **2 cubes** on each.
   - Flip **3** cards → place **1 cube** on each.
   - (9 cities seeded; place those 9 cards in the Infection **discard** pile.)
5. **Build the Player deck:**
   - Deal starting hands by player count: **2 players → 4 cards each; 3 players → 3 each;
     4 players → 2 each.**
   - Take the remaining City + Event cards, divide into **N roughly-equal face-down piles**
     where N = number of Epidemic cards for the chosen difficulty:
     **Introductory = 4, Standard = 5, Heroic = 6.**
   - Shuffle **exactly one Epidemic card into each pile**, then stack the piles into one
     Player deck. (This guarantees the epidemics are spread out — one per segment.)
6. The player who was most recently sick goes first.

---

## Turn Structure

A turn has 3 phases, always in this order:

### Phase 1 — Take up to 4 Actions

Any combination, repeats allowed. You may take fewer than 4.

**Movement actions**

| Action | Cost | Effect |
|---|---|---|
| **Drive / Ferry** | 1 action | Move to a city connected by a line (adjacent in the graph). |
| **Direct Flight** | 1 action | **Discard the City card of the destination** to move there. |
| **Charter Flight** | 1 action | **Discard the City card matching your _current_ city** to move to **any** city. |
| **Shuttle Flight** | 1 action | Move between two cities that **both have research stations**. |

**Other actions**

| Action | Cost | Effect |
|---|---|---|
| **Build Research Station** | 1 action | **Discard the City card matching your current city** to place a station there. Max 6 on board — if all 6 are placed, move an existing one. |
| **Treat Disease** | 1 action | Remove **1 cube** of a color from your current city. If that disease is **cured**, remove **all cubes of that color** from the city for the single action. |
| **Share Knowledge** | 1 action | Give **or** take the City card **matching the city you are both in**, between two players in the same city. (Researcher may give **any** card — see Roles.) |
| **Discover a Cure** | 1 action | At a research station, **discard 5 City cards of one color** to cure that disease (Scientist needs only **4**). Flip that disease's cure marker. |

### Phase 2 — Draw 2 Player cards

Draw the top **2** cards from the Player deck, one at a time, into your hand.
- If the deck is empty when you must draw → **immediate loss**.
- Any **Epidemic card** drawn is resolved immediately (see below), then discarded.
- After drawing, enforce the **7-card hand limit** (see Hand Limit).

### Phase 3 — Infect Cities

**Skipped entirely if "One Quiet Night" was played this turn.**

Flip Infection cards from the top equal to the **current Infection Rate**. For each, place
**1 cube** of the card's color on that city (or trigger an Outbreak — see below), then
discard the card. **Eradicated** diseases place no cubes (skip that placement).

---

## Epidemic Cards (resolve immediately, in this exact order)

1. **Increase** — advance the Infection Rate marker **one space to the right**.
2. **Infect** — draw the **BOTTOM** card of the Infection deck. Place **3 cubes** of its
   color on that city (if it already has cubes, this can push it to an Outbreak; a city can
   never exceed 3 cubes of a color — the excess triggers an outbreak). Discard that card.
3. **Intensify** — **shuffle the Infection discard pile** and place it **on top** of the
   Infection draw pile.

Then discard the Epidemic card and continue the draw phase.

---

## Infection Rate Track  ⚠️ (corrected from CLAUDE.md)

The track has **7 spaces** with these values, left to right:

```
2  2  2  3  3  4  4
```

The marker starts on the leftmost `2` and advances one space per Epidemic. So the current
Infection Rate by number of epidemics drawn:

| Epidemics drawn | 0 | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|
| **Infection Rate** | 2 | 2 | 2 | 3 | 3 | 4 | 4 |

> The original `CLAUDE.md` listed `0–1→2, 2–3→3, 4–5→4`, which is **incorrect**. Use the
> table above.

---

## Outbreaks & Chain Reactions

A city holds **at most 3 cubes of a given color**. When a cube would be added to a city that
already has 3 of that color:

1. **Do not** add a 4th cube.
2. Advance the **Outbreak marker 1 space** (8th outbreak = loss).
3. Place **1 cube of the outbreaking color** on **every city connected** to the outbreak city.
4. If placing a cube would push a connected city to a 4th cube of that color, **it also
   outbreaks** (chain reaction).
5. **Each city outbreaks at most once per chain reaction** (prevents infinite loops). Track
   which cities have already outbroken during the current resolution.

Each individual outbreak advances the marker separately, so a single chain can cause
multiple outbreaks.

---

## Cures & Eradication

- **Cure:** discard 5 same-color City cards (4 for Scientist) at a research station → flip
  that color's cure marker. Curing does **not** remove cubes from the board.
- **Eradication:** if a disease is **cured** and there are **0 cubes of its color on the
  board**, it becomes **eradicated** — flip the marker to eradicated. No more cubes of that
  color are ever placed (Infection cards of that color are drawn and discarded with no
  effect). Eradication is **not required** to win. A disease can become eradicated either at
  the moment of curing (if no cubes are out) or later when the last cube is treated off.

---

## Roles (7 total; each game uses one per player)

| Role | Special Ability |
|---|---|
| **Medic** | Treat Disease removes **all** cubes of one color at once (not just 1). Additionally, cubes of any **cured** disease are removed **automatically** (no action) from the Medic's city whenever they enter it or are already there. |
| **Scientist** | Needs only **4** same-color cards (instead of 5) to Discover a Cure. |
| **Researcher** | When sharing knowledge, may **give any** City card from their hand (not just the matching one) to a player in the same city. Still must be in the same city; taking still uses an action by the taker. |
| **Operations Expert** | May Build a Research Station **without discarding** a card. **Once per turn**, may move from a research station to any city by **discarding any City card**. |
| **Dispatcher** | May move **another player's pawn** as if it were their own (using movement actions), with permission. May also move any pawn to a city containing another pawn (1 action). |
| **Quarantine Specialist** | Prevents **all cube placement and outbreaks** in their current city **and all cities connected to it**. |
| **Contingency Planner** | As an action, take **any Event card from the Player discard pile** and store it on the role card (holds **1** at a time). When the stored Event is played, it is **removed from the game** (not discarded). |

---

## Event Cards (5; play anytime, cost no action)

Playable by any player at any time — even during another player's turn or between card
draws — but **not** in the middle of resolving a single step where it would be illegal.

| Event | Effect |
|---|---|
| **Airlift** | Move any 1 pawn to any city. |
| **Government Grant** | Add 1 research station to any city (no discard). |
| **One Quiet Night** | Skip the next Infect Cities phase entirely. |
| **Resilient Population** | Remove 1 card from the Infection **discard** pile from the game. |
| **Forecast** | Look at the top 6 Infection cards, rearrange them in any order, put them back on top. |

---

## Hand Limit

Max **7 cards** in hand (City + Event cards; Role/reference cards don't count). If over 7
after drawing, immediately discard (or play Events) down to 7. Enforced at end of the draw
phase, but Events may be played anytime to shed cards.

---

## Research Stations

- Max **6** on the board. Building a 7th requires removing an existing one.
- Required for: **Shuttle Flight** and **Discover a Cure**.
- Atlanta starts with one.

---

## Quick Loss/Win Reference

| Condition | Result |
|---|---|
| All 4 diseases cured | **Win (immediately)** |
| 8th outbreak | Lose |
| A color's cube supply exhausted when a cube is needed | Lose |
| Player deck empty when a draw is required | Lose |

---

## Sources

- Official Z-Man Games *Pandemic* rulebook (2013 ed.), `zm7101_pandemic_rules.pdf`
  (hosted at images-cdn.zmangames.com — note: the CDN's TLS certificate is currently expired).
- [UltraBoardGames — Pandemic Game Rules](https://www.ultraboardgames.com/pandemic/game-rules.php)
- [Pandemic Rules (with permission from Z-Man Games) — BoardGameGeek](https://boardgamegeek.com/filepage/27536/pandemic-rules-with-permission-from-z-man-games)
- Infection Rate track (`2,2,2,3,3,4,4`) and difficulty epidemic counts corroborated via
  published rule summaries.
