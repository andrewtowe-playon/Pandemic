---
title: 7-card hand limit is not enforced in the UI (no discard prompt)
file: js/controls.js
owner: Tae
assignee:
priority: P0
filed_by: Ryan
filed: 2026-07-23
reassigned: 2026-07-23 — Mike → Tae (Mike left for the airport)
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

DONE (2026-07-23): Tae implemented `promptDiscard` in controls.js (modal hand picker that
re-prompts until ≤7, then resumes the turn). Also handles the post-Share overflow. Moved to
done/ during the audit cleanup; covered by test/paths.test.js (real-modal render path).
