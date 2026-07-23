# PANDEMIC — a 4-hour, 5-person, AI-coordinated build

> **The one-line pitch:** Five devs — four of whom had never played Pandemic, none of whom
> had done game dev, none of whom had done a hackathon — shipped a fully playable,
> rules-faithful, CI-tested web version of Pandemic in under 3 hours of build time.
> The multiplier was AI: not as autocomplete, but as a **sixth teammate handling
> coordination, rules expertise, testing, and review**.

*(5-minute talk: ~1 min story, ~1 min how we organized, ~1 min AI usage, ~2 min live demo.
Demo checklist at the bottom.)*

---

## The problem we actually had

Building Pandemic wasn't the hard part. Our real constraints:

- **Knowledge gap** — only Andrew knew the game. Pandemic's rules are precise and easy to
  get subtly wrong (outbreak chain reactions, epidemic resolution order, role passives).
- **Parallelism** — 5 people committing to one repo for 4 hours. Merge conflicts could have
  eaten the afternoon.
- **No safety net** — no QA, no time for manual regression passes, and 4/5 of us couldn't
  even *recognize* a rules bug if we saw one.

Everything below is how we attacked those three problems.

---

## 1 · How we structured the project

**One architectural rule, stated once and never broken:**

```
user input  →  Rules.* mutates GameState  →  Render.render() redraws everything
```

- **Plain HTML/JS/CSS. No framework, no build step.** Open `index.html` and play. For a
  4-hour window, every minute not spent on tooling was a minute spent on the game.
- **One module per person** — `state.js` (shared contract) · `rules.js` (rules engine) ·
  `game.js` (turn orchestration) · `cards.js` (decks) · `render.js` (board) ·
  `controls.js` (UI). Everything hangs off `window`; no imports, no bundler.
- **The contract froze at 0:30.** The `GameState` shape, card shapes, and deck-order
  conventions were agreed and locked in the first 30 minutes. After that: additive changes
  only. This is the single decision that made 5-way parallel work possible.
- **Redraw-everything rendering.** No DOM diffing, no state sync bugs. The board is small;
  correctness beat cleverness.

## 2 · How we structured the group

| Module | Owner | Note |
|---|---|---|
| `state.js` + `rules.js` | **Andrew** | Rules authority owned the rules-critical core |
| `game.js` | **Ryan** | Turn cycle: ACTIONS → DRAW → INFECT → next player |
| `render.js` | **Abigail** | Board: pawns, cubes, stations, markers |
| `cards.js` | **Tae** | Decks: seeding, epidemic distribution, intensify |
| `controls.js` | **Mike** | Sidebar, action bar, modals |

- **You only edit your own file.** Cross-file needs became **task cards** in a `tasks/`
  queue (`open/ → working/ → done/`, moved with `git mv`) instead of hallway requests.
- **Docs were infrastructure, not afterthought:** `Rules.md` (authoritative rules),
  `DELEGATION.md` (ownership + live "Outstanding Work" table), `CLAUDE.md` (shared AI
  context — see below).
- **It survived contact with reality — twice.**
  - *Hour 1:* two parallel starts collided — the team's single-file board visualizer +
    setup screen vs. the modular scaffold. Instead of one clobbering the other, they were
    reconciled: modular architecture kept, the team's board image, hand-calibrated city
    coordinates, and setup screen folded in. Nothing was lost.
  - *Hour 3:* Mike had to leave for the airport mid-build. His remaining work was
    re-routed via task cards in minutes — Andrew took the event-card UI, Tae took the
    hand-limit prompt. No lost context, because context lived in files, not in heads.

## 3 · How we used AI (the interesting part)

All five of us ran Claude sessions in parallel against the same repo. The key insight:
**we treated the AI's context as a first-class team artifact.**

- **`CLAUDE.md` as shared AI memory.** Every teammate's Claude auto-loads it. It carries
  the architecture rule, the ownership map ("stay in your owner's file"), the code
  contract, and even *"you are one of five Claude instances on this repo."* Five AI
  sessions coordinated because they all read the same operating manual.
- **AI as the rules expert the team didn't have.** Claude sourced the official rulebook
  and wrote `Rules.md` — and in doing so **caught a real error in our own starting notes**
  (the infection-rate track is `2,2,2,3,3,4,4`, not what we'd written). Later, a full AI
  **rules audit** of the finished engine found 4 bugs, 2 missing official clauses, and 3
  unimplemented role abilities — each fixed with a regression test in the same PR.
- **AI built the safety net.** A dependency-free Node test harness: engine scenario tests,
  audit regression tests, a codified end-to-end playthrough, and a **25-game autoplay
  fuzzer** that checks invariants every turn (cube conservation, ≤3 cubes/city, deck
  integrity, game termination). Wired into **GitHub Actions on every push and PR**. It
  caught real regressions the same afternoon — including a flaky test the AI itself had
  written, which it then root-caused and fixed by seeding the RNG.
- **AI as playtester.** Claude drove a real browser through a full game — setup, moves,
  an epidemic, an outbreak chain, the defeat modal — with zero console errors, and
  turned the findings into prioritized task cards. It also reproduced a live bug report
  from a hotseat game ("her selection didn't highlight") and fixed the root cause
  (selection state leaking across turns).
- **Humans stayed the deciders.** Rules ambiguities went to Andrew. Scope calls, ownership
  handoffs, and merges were human decisions. The AI proposed; the team disposed.

## 4 · What we shipped (the numbers)

- **Under 3 hours** from first commit (10:18) to "all tracked items complete" (13:05)
- **~70 commits**, 5 reviewed PRs, zero lost work despite constant concurrent pushes
  (rebase → retest → repush became reflex)
- **~3,500 lines** of game + test code
- **64 passing tests** in CI, including a 25-game invariant-checked fuzz
- **The full game:** all 8 actions · epidemics with correct resolve order · chained
  outbreaks · cures & eradication · **all 7 roles** · **all 5 event cards** · hand-limit
  enforcement · win/loss detection · setup screen · turn summaries · full board UI with
  pawns, cubes, markers, and pile counts
- **And a kicker:** because rules and flavor are cleanly separated, Tae spec'd a full
  company re-theme — **"PlayOn: Outage Season"** (incidents instead of diseases, an
  On-Call SRE instead of a Medic, All-Hands Crises instead of epidemics, win text
  *"SHIPPED"*) — that's a pure text-swap away, zero mechanic changes.

## 5 · What we'd tell the next team

1. **Freeze the contract early.** The 30-minute `state.js` lock bought us 3 hours of
   conflict-free parallelism.
2. **Give the AI a shared brain.** One `CLAUDE.md` beats five people re-explaining the
   project to five chat sessions.
3. **Make the AI write the tests as it writes the code.** "Changes ship with tests" went
   into the shared context as a rule — CI green became the definition of done.
4. **Let the AI audit what the AI built.** The rules audit on our "finished" engine found
   6 real issues. Fresh-context review works on machines too.
5. **Files over conversations.** Rules, ownership, outstanding work, task cards — all in
   the repo. That's why losing a teammate mid-build cost us minutes, not an hour.

---

## Demo checklist (live, ~2 min)

1. `setup.html` — pick players, deal roles (each with real abilities)
2. Take actions — icon pills; click a highlighted city to move; treat Atlanta
3. End Turn — watch the draw, an epidemic if we're lucky, infections, turn summary
4. Point out: pile counts on the board, infection-rate & outbreak markers moving
5. Dev console (⚙ DEV) — force an epidemic → **chained outbreak** on the board
6. If time: play an event card; show the hand-limit discard prompt
7. Close on the GitHub Actions run list: 64 tests on every push, still green — and the
   "Outage Season" re-theme as where it goes next
