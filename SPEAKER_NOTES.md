# Speaker Notes — 5:00 total

> Full narrative + numbers: [PRESENTATION.md](PRESENTATION.md).
> **Prep before walking up:** game open on the setup screen · dev console (⚙ DEV) tested
> once · GitHub Actions tab in a background browser tab.

---

## 0:00 — Hook *(~30s)*

> Five devs. Four had never played Pandemic. Zero game-dev experience. Zero hackathons.
> Under three hours of build time later — this is a fully playable, rules-faithful
> Pandemic, with 64 tests running in CI on every push.

> The trick wasn't typing faster. It was treating AI as a **sixth teammate** — the one who
> knew the rules, wrote the tests, and kept five people from stepping on each other.

## 0:30 — How we organized *(~45s)*

> Three decisions, first 30 minutes:

- **One file per person.** Six modules, one owner each. You don't touch anyone else's file
  — cross-file asks become task cards in the repo.
- **One data-flow rule.** Input → rules engine mutates state → redraw everything. Plain
  JS, no framework, no build step.
- **Freeze the contract at minute 30.** State shape locked early = five people coding in
  parallel for three hours with **zero destructive merge conflicts**.

> Proof it worked: Mike had to leave for the airport mid-build. His work was re-routed by
> task card in minutes. Nothing lived only in someone's head.

## 1:15 — AI as the sixth teammate *(~45s)*

- **Shared AI memory.** All five of us ran Claude in parallel. One `CLAUDE.md` in the repo
  told every session the same thing: the architecture, the ownership map, "stay in your
  lane." Coordinated AI, not five chatbots.
- **It was our rules expert.** It sourced the official rulebook — and caught that our own
  starting notes had the infection-rate track *wrong*. Later it audited the finished
  engine and found six real issues. Every fix shipped with a regression test.
- **It built the safety net.** Test harness, a 25-game autoplay fuzzer, CI — and it
  playtested the game in a real browser and filed the bugs it found as task cards.
- **Humans decided everything.** Rules calls went to Andrew. AI proposed; we disposed.

## 2:00 — DEMO *(~2:15)*

1. **Setup screen** → deal roles — *"every role ability is real and tested."*
2. **Take a turn** — click a highlighted city to move, Treat Atlanta — *"legal moves only;
   the engine validates everything."*
3. **End Turn** → draw, infect, turn summary — *point at pile counts ticking down.*
4. **⚙ DEV → force epidemic** → chained outbreak cascades across the board — *"this chain
   reaction is the hardest rule in the game — it's fuzz-tested across 25 full games every
   push."*
5. *(If time)* play an event card / show the discard prompt at 8 cards.

## 4:15 — Close *(~45s)*

> Everything you just saw was built in one afternoon by people who didn't know this game —
> **64 green tests, on every push, right now.** *(flip to Actions tab, one beat)*

> And because rules and flavor are cleanly separated, Tae already spec'd the sequel:
> **"PlayOn: Outage Season"** — incidents instead of diseases, an On-Call SRE instead of a
> Medic, and the win screen says **"SHIPPED."** That's a text-swap away.

> The lesson we're taking with us: give AI shared context and a lane, the same as any
> teammate — and it stops being autocomplete and starts being a force multiplier.

---

*Fallbacks: if force-epidemic misbehaves, End Turn a few times — epidemics come fast at
introductory pacing anyway. If the demo machine dies: screenshots + the Actions tab.*
