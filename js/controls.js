/* =============================================================================
 * controls.js  —  UI CONTROLS & PANELS  (owner: Mike)
 * -----------------------------------------------------------------------------
 * The bridge between the player and the rules. Renders the sidebar (current
 * player, hand, action buttons, log) and turns clicks into Rules.* calls, then
 * calls Render.render(). Also shows toasts and the win/lose modal.
 *
 * PATTERN: controls decide WHICH action the click means and gather params, then
 * call the matching Rules.* function. Rules validates + mutates. If it returns
 * { ok:false }, show a toast and change nothing.
 * ===========================================================================*/

const Controls = {
  /** What the next city-click should do: 'drive' | 'directFlight' | ... | null. */
  pendingAction: 'drive',

  init() {
    // TODO(Mike): wire up action buttons in the sidebar to set this.pendingAction
    // or directly call Rules.* (e.g. Treat / Cure / Build act on current city).
    // Wire the "End Turn" button to Game.endActionsPhase().
  },

  /** Called by Render when a city node is clicked. */
  onCityClick(cityName) {
    const player = getCurrentPlayer();
    if (!player || GameState.phase !== PHASE.ACTIONS) return;

    let result;
    switch (this.pendingAction) {
      case 'drive':         result = Rules.drive(player, cityName); break;
      case 'directFlight':  result = Rules.directFlight(player, cityName); break;
      case 'charterFlight': result = Rules.charterFlight(player, cityName); break;
      case 'shuttleFlight': result = Rules.shuttleFlight(player, cityName); break;
      default:              result = { ok: false, reason: 'Pick an action first' };
    }

    if (!result.ok) this.toast(result.reason);
    Render.render();
    if (window.Game && Game.checkActionsExhausted) Game.checkActionsExhausted();
  },

  /** Redraw sidebar panels (current player, hand, actions left, log). */
  renderPanels() {
    // TODO(Mike): render into #sidebar — current player + role, actionsRemaining,
    // the player's hand (buttons for cards), infection rate, outbreaks, cure
    // statuses, and the last few GameState.log lines.
  },

  /** Win/lose modal. Call when GameState.phase becomes WON or LOST. */
  showEndGame() {
    // TODO(Mike): overlay showing win/lose + a "New Game" button (Game.newGame()).
  },

  /* ---- toast (ported from original index.html) ------------------------- */
  _toastTimer: null,
  toast(msg) {
    const el = document.getElementById('toast');
    if (!el || !msg) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
  },
};

window.Controls = Controls;
