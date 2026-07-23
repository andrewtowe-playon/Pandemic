/* =============================================================================
 * game.js  —  TURN ORCHESTRATION & SETUP  (owner: Ryan)
 * -----------------------------------------------------------------------------
 * Boots the app, runs setup, and drives the turn cycle:
 *     ACTIONS (4)  ->  DRAW (2 player cards)  ->  INFECT  ->  next player
 * Glue only: setup calls into Cards; turn phases call into Rules; every step
 * ends by calling Render.render(). No rule logic lives here.
 *
 * Contracts this relies on (verified against the current modules):
 *   Cards.buildInfectionDeck()                  -> shuffled [{city,color}]
 *   Cards.seedInitialInfections()               -> seeds board (3/2/1)   [Tae, WIP]
 *   Cards.buildPlayerDeckWithEpidemics(n, diff) -> deals hands + deck     [Tae, WIP]
 *   Rules.drawPlayerCards(player)               -> { ok, drewEpidemic, lost }
 *   Rules.runInfectPhase()                      -> void (may set PHASE.LOST)
 *   Rules.checkWin()                            -> sets PHASE.WON
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
   *  1. Reset per-game state + initBoard() (zero cubes, Atlanta station).
   *  2. Create players (role + pawn), all in Atlanta.
   *  3. infectionDeck = Cards.buildInfectionDeck(); Cards.seedInitialInfections().
   *  4. Cards.buildPlayerDeckWithEpidemics() deals hands + builds the epidemic deck.
   *  5. phase = ACTIONS; actionsRemaining = 4; currentPlayerIndex = 0.
   */
  newGame({ numPlayers, difficulty, roles, names }) {
    // 1. Reset per-game state so "New Game" is clean even without a page reload.
    GameState.difficulty = difficulty || 'standard';
    GameState.outbreaks = 0;
    GameState.infectionRateIndex = 0;
    GameState.oneQuietNight = false;
    GameState.playerDeck = [];
    GameState.playerDiscard = [];
    GameState.infectionDiscard = [];
    GameState.log = [];
    GameState.cures = {};
    GameState.cubesRemaining = {};
    COLORS.forEach(c => {
      GameState.cures[c] = CURE.UNCURED;
      GameState.cubesRemaining[c] = CUBES_PER_COLOR;
    });
    initBoard();

    // 2. Players — all start in Atlanta.
    const count = numPlayers || (roles ? roles.length : 2);
    GameState.players = [];
    for (let i = 0; i < count; i++) {
      GameState.players.push({
        id: i,
        name: (names && names[i]) || `Player ${i + 1}`,
        role: (roles && roles[i]) || '',
        location: 'Atlanta',
        hand: [],
        storedEvent: null,    // Contingency Planner only
        usedOpsMove: false,   // Operations Expert only; reset each turn
      });
    }
    GameState.currentPlayerIndex = 0;

    // 3. Infection deck + seed the board (3/2/1 cubes on 9 cities).
    GameState.infectionDeck = Cards.buildInfectionDeck();
    Cards.seedInitialInfections();

    // 4. Deal starting hands and build the player deck with epidemics.
    Cards.buildPlayerDeckWithEpidemics(count, GameState.difficulty);

    // 5. Begin the first turn.
    GameState.phase = PHASE.ACTIONS;
    GameState.actionsRemaining = 4;
    logEvent(`New game started — ${count} players, ${GameState.difficulty} difficulty.`);
    logEvent(`${getCurrentPlayer().name}'s turn.`);

    this._updateStatusBar();
    Render.render();
  },

  /** Called by Controls after each action. Enforces end-of-turn / end-of-game. */
  checkActionsExhausted() {
    this._updateStatusBar();

    if (GameState.phase === PHASE.WON || GameState.phase === PHASE.LOST) {
      Render.render();
      Controls.showEndGame();
      return;
    }
    // When actions run out, the player advances by pressing "Draw / End Turn"
    // (wired by Controls). We don't force it, so events can still be played.
    if (GameState.phase === PHASE.ACTIONS && GameState.actionsRemaining <= 0) {
      logEvent('No actions left — draw player cards to continue.');
      Render.render();
    }
  },

  /** Player ends their actions -> draw 2 player cards (Phase 2). */
  endActionsPhase() {
    if (GameState.phase !== PHASE.ACTIONS) return;

    GameState.phase = PHASE.DRAW;
    const result = Rules.drawPlayerCards(getCurrentPlayer());
    this._updateStatusBar();

    if (result.lost || GameState.phase === PHASE.LOST) {
      Render.render();
      Controls.showEndGame();
      return;
    }

    // Hand-limit (7): if over, the player must discard before infecting.
    // Discard UI is Mike's (Controls). If present, hand off and stop here —
    // Controls calls Game.runInfectPhase() once the hand is legal.
    const player = getCurrentPlayer();
    if (Cards.isOverHandLimit(player)) {
      logEvent(`${player.name} is over the 7-card hand limit — discard to continue.`);
      Render.render();
      if (Controls.promptDiscard) { Controls.promptDiscard(player); return; }
      // Fallback until the discard UI exists: proceed anyway so the loop runs.
    }

    this.runInfectPhase();
  },

  /** Infect cities (Phase 3), then hand off to the next player. */
  runInfectPhase() {
    GameState.phase = PHASE.INFECT;
    Rules.runInfectPhase();
    this._updateStatusBar();

    if (GameState.phase === PHASE.LOST) {
      Render.render();
      Controls.showEndGame();
      return;
    }
    this.nextTurn();
  },

  /** Advance to the next player and reset to the actions phase. */
  nextTurn() {
    if (GameState.phase === PHASE.WON || GameState.phase === PHASE.LOST) {
      Render.render();
      Controls.showEndGame();
      return;
    }
    GameState.currentPlayerIndex = (GameState.currentPlayerIndex + 1) % GameState.players.length;
    GameState.actionsRemaining = 4;
    GameState.phase = PHASE.ACTIONS;
    GameState.players.forEach(p => { p.usedOpsMove = false; }); // Ops Expert 1/turn reset
    logEvent(`${getCurrentPlayer().name}'s turn.`);
    this._updateStatusBar();
    Render.render();
  },

  /** Update the header status bar (orchestrator dashboard; not the board/sidebar). */
  _updateStatusBar() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const cur = getCurrentPlayer();
    set('s-player', cur ? `${cur.name}${cur.role ? ' (' + cur.role + ')' : ''}` : '—');
    set('s-actions', GameState.phase === PHASE.ACTIONS ? GameState.actionsRemaining : '—');
    set('s-rate', getInfectionRate());
    set('s-outbreaks', `${GameState.outbreaks}/${MAX_OUTBREAKS}`);
  },
};

window.Game = Game;
document.addEventListener('DOMContentLoaded', () => Game.boot());
