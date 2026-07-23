/* =============================================================================
 * test/autoplay.js  —  invariant-checked fuzz autoplay
 * -----------------------------------------------------------------------------
 * A simple bot plays full games. After every turn it checks game invariants
 * that must ALWAYS hold regardless of the rules' details. This catches
 * continuity regressions (crashes, impossible states, non-terminating games)
 * that scenario tests miss — especially around epidemics and outbreak chains.
 * ===========================================================================*/
const { loadGame } = require('./harness');

const TURN_CAP = 500;   // a real game ends well before this; exceeding = a bug

/** Invariants that must hold at every turn boundary. Returns a list of violations. */
function invariants(g) {
  const { GameState, COLORS, cubesOnBoard, INFECTION_RATE_TRACK, MAX_OUTBREAKS } = g;
  const v = [];
  COLORS.forEach(c => {
    if (GameState.cubesRemaining[c] + cubesOnBoard(c) !== 24) v.push(`cube conservation broken for ${c}`);
    if (GameState.cubesRemaining[c] < 0) v.push(`negative cube supply for ${c}`);
  });
  for (const [name, ci] of Object.entries(GameState.cities)) {
    COLORS.forEach(c => {
      if (ci.cubes[c] > 3) v.push(`${name} has ${ci.cubes[c]} ${c} cubes (>3)`);
      if (ci.cubes[c] < 0) v.push(`${name} has negative ${c} cubes`);
    });
  }
  if (GameState.outbreaks < 0 || GameState.outbreaks > MAX_OUTBREAKS) v.push(`outbreaks out of range: ${GameState.outbreaks}`);
  if (GameState.infectionRateIndex < 0 || GameState.infectionRateIndex >= INFECTION_RATE_TRACK.length) v.push(`infection rate index out of range: ${GameState.infectionRateIndex}`);
  if (GameState.infectionDeck.length + GameState.infectionDiscard.length !== 48) v.push(`infection cards != 48 (${GameState.infectionDeck.length}+${GameState.infectionDiscard.length})`);
  return v;
}

/** Greedy-ish bot: treat cubes in the current city, else drive somewhere. */
function takeActions(g) {
  const { Rules, GameState, getCurrentPlayer, getAdjacent, COLORS } = g;
  let guard = 0;
  while (GameState.actionsRemaining > 0 && guard++ < 25) {
    const p = getCurrentPlayer();
    const city = GameState.cities[p.location];
    const color = COLORS.find(c => city.cubes[c] > 0);
    let r;
    if (color) {
      r = Rules.treatDisease(p, color);
    } else {
      const adj = getAdjacent(p.location);
      r = Rules.drive(p, adj[Math.floor(Math.random() * adj.length)]);
    }
    if (!r || !r.ok) break;   // no useful action → stop and end the turn
  }
}

function runAutoplay(games = 25) {
  const results = [];
  const check = (label, cond) => results.push({ label, ok: !!cond });

  // Is the deck actually dealt? (cards.js buildPlayerDeckWithEpidemics may be WIP.)
  const probe = loadGame();
  probe.Game.newGame({ numPlayers: 4, difficulty: 'standard', roles: ['Medic', 'Scientist', 'Researcher', 'Dispatcher'], names: ['A', 'B', 'C', 'D'] });
  const dealt = probe.GameState.playerDeck.length > 0;

  if (!dealt) {
    check('setup invariants hold (deck not yet dealt by cards.js)', invariants(probe).length === 0);
    // Confirm the empty-deck path terminates cleanly rather than crashing.
    let crashed = false;
    try { probe.Game.endActionsPhase(); } catch (e) { crashed = true; }
    check('empty-deck turn does not crash', !crashed);
    check('empty-deck turn reaches LOST', probe.GameState.phase === 'lost');
    return { results, note: 'cards.js deck-dealing is stubbed — deep autoplay skipped. Re-run once buildPlayerDeckWithEpidemics lands.' };
  }

  // Full fuzz: play many games to completion.
  let allTerminated = true, noCrash = true, allInvariantsHeld = true, firstViolation = null;
  for (let n = 0; n < games; n++) {
    const g = loadGame();
    const roles = ['Medic', 'Scientist', 'Researcher', 'Dispatcher'];
    try {
      g.Game.newGame({ numPlayers: 4, difficulty: 'standard', roles, names: ['A', 'B', 'C', 'D'] });
      let turns = 0;
      while (g.GameState.phase !== 'won' && g.GameState.phase !== 'lost' && turns < TURN_CAP) {
        takeActions(g);
        g.Game.endActionsPhase();
        const v = invariants(g);
        if (v.length) { allInvariantsHeld = false; firstViolation = firstViolation || `game ${n} turn ${turns}: ${v[0]}`; break; }
        turns++;
      }
      if (turns >= TURN_CAP) allTerminated = false;
    } catch (e) {
      noCrash = false;
      firstViolation = firstViolation || `game ${n} threw: ${e.message}`;
    }
  }

  check(`autoplay: ${games} games ran without crashing`, noCrash);
  check('autoplay: invariants held every turn', allInvariantsHeld);
  check('autoplay: every game terminated (win/lose)', allTerminated);
  return { results, note: firstViolation ? ('First problem: ' + firstViolation) : null };
}

module.exports = { runAutoplay };
