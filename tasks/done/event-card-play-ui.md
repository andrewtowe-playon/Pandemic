---
title: Event cards can't be played (no UI affordance)
file: js/controls.js
owner: Andrew
assignee: Andrew
priority: P0
filed_by: Ryan
filed: 2026-07-23
---

# Event cards can't be played (no UI affordance)

Repro:  hold any of the 5 Event cards and try to play one.
Actual: (was) no button/affordance; events sat dead in hand.
Expect: a way to play an Event at any time.

DONE (2026-07-23, commit 571360a): Andrew added click-to-play event UI with a per-event
modal flow in controls.js. Verify by playing an event in a game.
