/* =============================================================================
 * test/engine.test.js  —  scenario assertions for game mechanics
 * -----------------------------------------------------------------------------
 * Drives the real modules through specific situations and asserts exact rules
 * outcomes. This is the "did someone break a mechanic?" net.
 * ===========================================================================*/
const { loadGame } = require('./harness');

function runEngineTests() {
  const results = [];
  const check = (label, cond) => results.push({ label, ok: !!cond });

  const g = loadGame();
  const { Game, GameState, Rules, getCurrentPlayer, getAdjacent, PHASE, COLORS, cubesOnBoard } = g;

  // ---- Setup ------------------------------------------------------------
  Game.newGame({ numPlayers: 2, difficulty: 'introductory', roles: ['Medic', 'Scientist'], names: ['Ryan', 'Abby'] });
  check('setup: 2 players', GameState.players.length === 2);
  check('setup: all start in Atlanta', GameState.players.every(p => p.location === 'Atlanta'));
  check('setup: roles assigned', GameState.players[0].role === 'Medic' && GameState.players[1].role === 'Scientist');
  check('setup: phase = ACTIONS', GameState.phase === PHASE.ACTIONS);
  check('setup: 4 actions available', GameState.actionsRemaining === 4);
  check('setup: infection deck totals 48', GameState.infectionDeck.length + GameState.infectionDiscard.length === 48);
  check('setup: cures all uncured', COLORS.every(c => GameState.cures[c] === 'uncured'));
  check('setup: cube conservation (supply+board=24)', COLORS.every(c => GameState.cubesRemaining[c] + cubesOnBoard(c) === 24));
  check('setup: Atlanta has a research station', GameState.cities['Atlanta'].station === true);

  // ---- Movement: legal + illegal ---------------------------------------
  const p0 = getCurrentPlayer();
  const dest = getAdjacent('Atlanta')[0];
  const r1 = Rules.drive(p0, dest);
  check('drive: legal move ok', r1.ok === true && p0.location === dest);
  check('drive: action spent', GameState.actionsRemaining === 3);
  const r2 = Rules.drive(p0, 'Tokyo');   // not adjacent to a NA city
  check('drive: illegal move rejected', r2.ok === false);
  check('drive: illegal move costs no action', GameState.actionsRemaining === 3);

  // ---- Full turn cycle (inject a fake dealt deck; cards.js may be WIP) --
  GameState.playerDeck = Array.from({ length: 20 }, () => ({ type: 'city', city: 'Paris', color: 'blue' }));
  const idx = GameState.currentPlayerIndex;
  const handBefore = GameState.players[idx].hand.length;
  Game.endActionsPhase();  // draw 2 → infect → next player
  check('cycle: current player drew 2', GameState.players[idx].hand.length === handBefore + 2);
  check('cycle: advanced to next player', GameState.currentPlayerIndex === (idx + 1) % 2);
  check('cycle: actions reset to 4', GameState.actionsRemaining === 4);
  check('cycle: back in ACTIONS phase', GameState.phase === PHASE.ACTIONS);
  check('cycle: infection deck still totals 48', GameState.infectionDeck.length + GameState.infectionDiscard.length === 48);
  check('cycle: cube conservation holds', COLORS.every(c => GameState.cubesRemaining[c] + cubesOnBoard(c) === 24));

  // ---- Loss path: empty player deck ------------------------------------
  GameState.playerDeck = [];
  Game.endActionsPhase();
  check('loss: empty deck ends game', GameState.phase === PHASE.LOST);

  return results;
}

module.exports = { runEngineTests };
