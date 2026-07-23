# tasks/ — the handoff queue

One task per file. **State is the directory; move a card with `git mv`.** One file per
task means filing/moving a task is a rename — so five people (and five Claude sessions)
can commit in parallel without colliding on a shared list.

```
tasks/
  open/       # filed, not started (assigned OR unassigned)
  working/    # actively being worked (claimed)
  done/       # completed / closed
  _TEMPLATE.md
```

Your board at a glance:  `ls tasks/open tasks/working tasks/done`

## Filename

`<slug>.md` — a short kebab-case description, e.g. `flight-targets-no-highlight.md`.
The owner is **not** in the filename (a task may be filed before anyone is assigned).
Owner, priority, and the code file it touches all live in the frontmatter.

## Card frontmatter

```
title:     one-line summary
file:      the code file it touches (e.g. js/render.js) — hints at the likely owner
owner:     unassigned | <teammate name>   # who will do it
assignee:  <teammate name>                # who is doing it now (set on move to working/)
priority:  P0 | P1 | P2                    # P0 blocks "playable" · P1 normal · P2 nice-to-have
filed_by:  <teammate>
filed:     YYYY-MM-DD
```

## Assignment — may happen after discovery

1. **File it** → `tasks/open/<slug>.md` with `owner: unassigned` (or already routed to a
   teammate if it's obvious).
2. **Assign it** (any time) → set `owner:` to a teammate. Default routing is by the
   ownership map: the `file:` it touches decides the owner (e.g. `js/render.js` → Abigail).
   Cross-cutting work (`index.html`, `setup.html`, `tests/`) can stay `unassigned` and be
   **claimed** by whoever picks it up.
3. **Start it** → `git mv` to `tasks/working/` and set `assignee:`.
4. **Finish it** → `git mv` to `tasks/done/`, note the outcome in the body.

## Finding work

```
grep -rl "owner: unassigned" tasks/open          # up for grabs
grep -rl "owner: Mike" tasks/open tasks/working  # my queue
```
