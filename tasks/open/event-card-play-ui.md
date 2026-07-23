---
title: Event cards can't be played (no UI affordance)
file: js/controls.js
owner: Mike
assignee:
priority: P0
filed_by: Ryan
filed: 2026-07-23
---

# Event cards can't be played (no UI affordance)

Repro:  hold any of the 5 Event cards (Airlift, Government Grant, One Quiet Night,
        Resilient Population, Forecast) and try to play one.
Actual: there is no button/affordance; events sit dead in hand. The sidebar renders city
        cards but nothing calls Rules.playEvent.
Expect: a way to play an Event at any time (events are free and playable on any turn) — e.g.
        an event card in the hand panel is clickable, opening the params it needs.
Note:   Engine is fully done — `Rules.playEvent(player, eventName, params)` is implemented,
        validated, and tested. Wiring only, in controls.js. Each event needs different params:
          - Airlift:            { playerId, toCity }        (pick a pawn + destination)
          - Government Grant:   { city }                    (pick a city, must have <6 stations)
          - One Quiet Night:    {}                          (no params)
          - Resilient Population:{ city }                   (pick a card in infection discard)
          - Forecast:           { newOrder }                (reorder top up-to-6 infection cards;
                                                             must be a permutation of the top cards)
        Start with the zero/one-param ones (One Quiet Night, Government Grant, Airlift) for
        quick wins; Forecast/Resilient Population need a small picker. Discovered in the
        2026-07-23 browser playtest.
