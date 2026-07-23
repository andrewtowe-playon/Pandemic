/* =============================================================================
 * test/playthrough.test.js  —  codified end-to-end playthrough
 * -----------------------------------------------------------------------------
 * Mirrors the manual browser playtest (2026-07-23) as an automated scenario, so
 * everyone can run it via `npm test`. Drives the game through the SAME code
 * paths the UI uses — Controls.onCityClick (a city click) and
 * Game.endActionsPhase (the End Turn button) — on a fixed seed for
 * reproducibility, and asserts the whole loop plus the end-game hook.
 *
 * What this adds over the other suites:
 *  - exercises the real UI entry points (Controls.*), not just Rules.*
 *  - asserts the end-game modal path (Controls.showEndGame) actually fires
 *  - confirms an epidemic + outbreak occur and the game terminates cleanly
 * Note: this is a LOGIC-level playthrough (DOM is shimmed). Real-pixel / console
 * coverage would need Playwright — see the e2e note in the test plan.
 * ===========================================================================*/
const { loadGame } = require('./harness');

/** Invariants that must hold at the end of any game (subset of autoplay's). */
function invariantViolations(g) {
  const { GameState, COLORS, cubesOnBoard, MAX_OUTBREAKS } = g;
  const v = [];
  COLORS.forEach(c => {
    if (GameState.cubesRemaining[c] + cubesOnBoard(c) !== 24) v.push(`cube conservation ${c}`);
  });
  if (GameState.outbreaks < 0 || GameState.outbreaks > MAX_OUTBREAKS) v.push('outbreaks out of range');
  if (GameState.infectionDeck.length + GameState.infectionDiscard.length !== 48) v.push('infection cards != 48');
  return v;
}

function runPlaythroughTests() {
  const results = [];
  const check = (label, cond) => results.push({ label, ok: !!cond });

  const g = loadGame({ seed: 42 }); // fixed seed → reproducible playthrough
  const { Game, GameState, Controls, getCurrentPlayer, getAdjacent, PHASE } = g;

  // Spy on the end-game hook the UI relies on.
  let endGameCalls = 0;
  const origShowEndGame = Controls.showEndGame.bind(Controls);
  Controls.showEndGame = () => { endGameCalls++; try { return origShowEndGame(); } catch (e) { /* DOM shim */ } };

  let threw = null;
  try {
    // --- Setup (mirrors the playtest's opening state) --------------------
    Game.newGame({ numPlayers: 2, difficulty: 'introductory', roles: ['Medic', 'Scientist'], names: ['Ryan', 'Abby'] });
    check('playthrough: opens in ACTIONS with 4 actions', GameState.phase === PHASE.ACTIONS && GameState.actionsRemaining === 4);
    check('playthrough: both players start in Atlanta', GameState.players.every(p => p.location === 'Atlanta'));
    check('playthrough: 18 cubes seeded (3+2+1)', g.COLORS.reduce((n, c) => n + g.cubesOnBoard(c), 0) === 18);

    // --- A city click drives the pawn (real UI entry point) --------------
    const from = getCurrentPlayer().location;
    const dest = getAdjacent(from)[0];
    Controls.pendingAction = 'drive';
    Controls.onCityClick(dest);
    check('playthrough: click-to-drive moved the pawn + spent an action',
      getCurrentPlayer().location === dest && GameState.actionsRemaining === 3);

    // --- Run the turn loop via the End Turn path until the game ends ------
    let turns = 0;
    while (GameState.phase === PHASE.ACTIONS && turns < 200) {
      Game.endActionsPhase();  // exactly what the End Turn button calls
      turns++;
    }
    check('playthrough: game reached a terminal state', GameState.phase === PHASE.WON || GameState.phase === PHASE.LOST);
    check('playthrough: an epidemic occurred', GameState.log.some(l => l.includes('EPIDEMIC')));
    check('playthrough: at least one outbreak occurred', GameState.outbreaks > 0);
    check('playthrough: end-game hook (showEndGame) fired', endGameCalls >= 1);
    check('playthrough: invariants hold at end', invariantViolations(g).length === 0);
  } catch (e) {
    threw = e.message + ' @ ' + (e.stack || '').split('\n')[1];
  }
  check('playthrough: no exception thrown across the whole game', threw === null);

  return { results, note: threw };
}

module.exports = { runPlaythroughTests };
