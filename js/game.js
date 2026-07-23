/* =============================================================================
 * game.js  —  TURN ORCHESTRATION & SETUP  (owner: Ryan)
 * -----------------------------------------------------------------------------
 * Boots the app, runs setup, and drives the turn cycle:
 *     ACTIONS (4)  ->  DRAW (2 player cards)  ->  INFECT  ->  next player
 * Glue only: setup calls into Cards; turn phases call into Rules; every step
 * ends by calling Render.render(). No rule logic lives here.
 * ===========================================================================*/

const Game = {

  /** Entry point — called on DOMContentLoaded (see bottom of file).
   *  Reads the setup screen's settings from localStorage (written by setup.html).
   *  If none exist, redirect to the setup screen. */
  boot() {
    Render.init();
    Controls.init();

    let settings = null;
    try { settings = JSON.parse(localStorage.getItem('pandemicSettings')); }
    catch (e) { settings = null; }

    const ok = settings && Array.isArray(settings.players) && settings.players.length > 0;
    if (!ok) { window.location.replace('setup.html'); return; }

    // setup.html stores difficulty capitalized ("Introductory"); our constants
    // are lowercase. numPlayers falls back to the players array length.
    this.newGame({
      numPlayers: settings.numPlayers || settings.players.length,
      difficulty: String(settings.difficulty || 'standard').toLowerCase(),
      roles: settings.players.map(p => p.role),
      names: settings.players.map(p => p.name),
    });
  },

  /**
   * Full setup (Rules.md > Setup). Order matters.
   *  1. initBoard() (zero cubes, Atlanta station).
   *  2. Create players (role + pawn), all in Atlanta.
   *  3. infectionDeck = Cards.buildInfectionDeck(); Cards.seedInitialInfections().
   *  4. base cards = Cards.buildBasePlayerCards();
   *     Cards.buildPlayerDeckWithEpidemics(numPlayers, difficulty) deals hands +
   *     builds the epidemic-laden deck.
   *  5. phase = ACTIONS; actionsRemaining = 4; currentPlayerIndex = 0.
   */
  newGame({ numPlayers, difficulty, roles, names }) {
    // TODO(Ryan): implement the setup sequence above, then Render.render().
    GameState.difficulty = difficulty;
    initBoard();
    // ...
    GameState.phase = PHASE.ACTIONS;
    GameState.actionsRemaining = 4;
    GameState.currentPlayerIndex = 0;
    logEvent('New game started.');
    Render.render();
  },

  /** Called by Controls after each action: if 0 actions left, offer to advance. */
  checkActionsExhausted() {
    if (GameState.phase === PHASE.ACTIONS && GameState.actionsRemaining <= 0) {
      // TODO(Ryan): auto-advance or enable the "Draw cards" button.
    }
    if (GameState.phase === PHASE.WON || GameState.phase === PHASE.LOST) {
      Controls.showEndGame();
    }
  },

  /** Player chooses to end their actions -> run draw phase. */
  endActionsPhase() {
    // TODO(Ryan): set phase=DRAW; Rules.drawPlayerCards(getCurrentPlayer());
    // if that caused a loss, Controls.showEndGame() and stop.
    // Then handle hand-limit discards before infecting.
    this.runInfectPhase();
  },

  /** Infect, then hand off to the next player. */
  runInfectPhase() {
    // TODO(Ryan): set phase=INFECT; Rules.runInfectPhase();
    // if loss -> Controls.showEndGame() and stop.
    this.nextTurn();
  },

  /** Advance to the next player and reset to the actions phase. */
  nextTurn() {
    if (GameState.phase === PHASE.WON || GameState.phase === PHASE.LOST) {
      Controls.showEndGame();
      return;
    }
    GameState.currentPlayerIndex = (GameState.currentPlayerIndex + 1) % GameState.players.length;
    GameState.actionsRemaining = 4;
    GameState.phase = PHASE.ACTIONS;
    logEvent(`${getCurrentPlayer().name}'s turn.`);
    Render.render();
  },
};

window.Game = Game;
document.addEventListener('DOMContentLoaded', () => Game.boot());
