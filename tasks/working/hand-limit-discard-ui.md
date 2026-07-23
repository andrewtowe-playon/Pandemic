---
title: 7-card hand limit is not enforced in the UI (no discard prompt)
file: js/controls.js
owner: Mike
assignee: Tae (covering for Mike)
priority: P0
filed_by: Ryan
filed: 2026-07-23
---

# 7-card hand limit is not enforced in the UI (no discard prompt)

Repro:  play a game and let a player accumulate cards (draw over several turns / take a
        Share). Confirmed live in a browser playtest — a player reached 10 cards.
Actual: the header shows "(10/7)" but nothing stops play; the player keeps all cards. The
        engine logs "…is over the 7-card hand limit — discard to continue" but nothing acts
        on it, so the 7-card rule (Rules.md > Hand Limit) is never enforced.
Expect: when a player's hand exceeds 7 (after a draw, or after receiving a Share), prompt
        them to discard down to 7 (or play an Event) before play continues.
Note:   The hook already exists — game.js (endActionsPhase) calls
        `Controls.promptDiscard(player)` IF it's defined, then stops and waits; it expects
        Controls to re-drive the flow once the hand is legal (see game.js: "Controls calls
        Game.runInfectPhase() once the hand is legal"). So the work is entirely in
        controls.js:
          1. Implement `promptDiscard(player)` — a modal/picker of the player's hand;
             clicking a card discards it (push to GameState.playerDiscard) until length <= 7.
          2. When legal, call `Game.runInfectPhase()` to resume the turn.
        Also enforce after Share Knowledge pushes the receiver over 7 (rules.js already logs
        a warning there). Discovered in the 2026-07-23 browser playtest.

## Progress (Tae, covering for Mike) — 2026-07-23

Implemented; `npm test` green. Left in `working/` pending a real browser playtest of the
modal (engine tests cover the state path, not the DOM).

- `Controls.promptDiscard(player)` (controls.js) — modal picker of the player's hand; each
  click discards one card and re-prompts until `<= 7`. Phase-aware resume: at the draw→infect
  boundary it calls `Game.runInfectPhase()`; a mid-turn Share overflow just re-renders.
- `Controls._act()` now detects any player over the limit after an action and prompts them,
  covering the Share Knowledge case.
- New engine helper `Rules.discardCard(player, card)` (rules.js — additive; **flag for
  Andrew**) since only Rules may mutate state; used by the discard UI.
- Reusable `Controls._modalList()` / `_closeModal()` helpers (reuse the #modal overlay).
- Tests: `discardCard` regression block in `test/rules-audit.test.js`; taught
  `test/autoplay.js` to resolve the new draw-phase discard pause (games were otherwise
  stalling headlessly now that `promptDiscard` exists).

NOT done: browser playtest of the modal; whoever verifies can move this to `done/`.
