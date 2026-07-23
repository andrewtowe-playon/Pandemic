---
title: Flight targets don't highlight or show the pointer cursor
file: js/render.js
owner: unassigned
assignee:
priority: P1
filed_by: Mike
filed: 2026-07-23
---

# Flight targets don't highlight or show the pointer cursor

Repro:  pick Direct Flight (or Charter / Shuttle), then look at the legal destination cities.
Actual: no highlight and a default cursor — the cities look unclickable, even though clicking
        them does resolve the flight.
Expect: highlight + pointer cursor on every legal target for the current Controls.pendingAction.
Note:   renderCityHighlights() only marks isAdjacent() (i.e. drive/ferry targets) and never
        reads Controls.pendingAction, so the highlight set doesn't change when a flight action
        is selected. Legal targets differ per action: Direct Flight = any city you hold a card
        for; Charter Flight = anywhere; Shuttle Flight = other research stations. Touches
        js/render.js (Abigail) once assigned — filed unassigned for now.
