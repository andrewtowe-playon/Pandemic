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
    this._buildActionButtons();
    this._buildTurnButtons();
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
    this._act(result);
  },

  /* ======================================================================
   * ACTION BAR  (built once in init; state refreshed each render)
   * ==================================================================== */

  /** Movement actions: set pendingAction; the next city click resolves them. */
  _buildActionButtons() {
    const container = document.getElementById('action-buttons');
    if (!container) return;
    container.innerHTML = '';
    this._moveButtons = {};

    const MOVES = [
      ['drive',         'Drive/Ferry'],
      ['directFlight',  'Direct Flight'],
      ['charterFlight', 'Charter Flight'],
      ['shuttleFlight', 'Shuttle Flight'],
    ];
    MOVES.forEach(([key, label]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = 'Then click a destination city';
      b.addEventListener('click', () => this._setPending(key, label));
      container.appendChild(b);
      this._moveButtons[key] = b;
    });

    // Immediate actions: act on the current city right now.
    const IMMEDIATE = [
      ['Treat',         () => this._doTreat()],
      ['Build Station', () => this._doBuild()],
      ['Discover Cure', () => this._doCure()],
      ['Share',         () => this._doShare()],
    ];
    IMMEDIATE.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.addEventListener('click', fn);
      container.appendChild(b);
    });

    // Contextual sub-choice row (e.g. "treat which color?").
    const choice = document.createElement('div');
    choice.id = 'action-choice';
    choice.style.display = 'none';
    container.appendChild(choice);
    this._choiceEl = choice;
  },

  /** Turn buttons: end the actions phase (draw 2, then infect — handled by Game). */
  _buildTurnButtons() {
    const container = document.getElementById('turn-buttons');
    if (!container) return;
    container.innerHTML = '';
    const end = document.createElement('button');
    end.id = 'end-turn-btn';
    end.textContent = 'End Turn ▶';
    end.title = 'End your actions: draw 2 cards, then infect cities';
    end.addEventListener('click', () => this._endTurn());
    container.appendChild(end);
  },

  /** Select a movement action; the following city click carries it out. */
  _setPending(key, label) {
    this.pendingAction = key;
    this._clearChoice();
    this.toast(`${label}: click a destination city`);
    Render.render(); // refresh the active-button highlight
  },

  _endTurn() {
    if (GameState.phase !== PHASE.ACTIONS) return;
    if (window.Game && Game.endActionsPhase) Game.endActionsPhase();
    else { this.toast('Turn cycle not wired yet'); Render.render(); }
  },

  /* ---- immediate action handlers --------------------------------------- */

  _doTreat() {
    const player = getCurrentPlayer();
    if (!this._ensureActionable()) return;
    const city = GameState.cities[player.location];
    const present = COLORS.filter(c => city.cubes[c] > 0);
    if (present.length === 0) return this.toast('No cubes to treat here');
    if (present.length === 1) return this._act(Rules.treatDisease(player, present[0]));
    this._showChoice('Treat which color?', present.map(c => ({
      label: c, color: COLOR_HEX[c],
      onClick: () => this._act(Rules.treatDisease(player, c)),
    })));
  },

  _doBuild() {
    const player = getCurrentPlayer();
    if (!this._ensureActionable()) return;
    this._act(Rules.buildStation(player));
  },

  _doCure() {
    const player = getCurrentPlayer();
    if (!this._ensureActionable()) return;
    const needed = player.role === 'Scientist' ? 4 : 5;

    const byColor = { blue: [], yellow: [], black: [], red: [] };
    player.hand.forEach(c => { if (c.type === 'city') byColor[c.color].push(c); });
    const curable = COLORS.filter(c =>
      byColor[c].length >= needed && GameState.cures[c] === CURE.UNCURED);

    if (curable.length === 0)
      return this.toast(`Need ${needed} same-color city cards at a station`);

    const cure = (c) =>
      this._act(Rules.discoverCure(player, c, byColor[c].slice(0, needed)));
    if (curable.length === 1) return cure(curable[0]);
    this._showChoice('Cure which color?', curable.map(c => ({
      label: c, color: COLOR_HEX[c], onClick: () => cure(c),
    })));
  },

  /** Share Knowledge: give/take a city card with a co-located player.
   *  Card must match the shared city, UNLESS the giver is the Researcher
   *  (who may give any city card). Lists every legal transfer as a choice. */
  _doShare() {
    const player = getCurrentPlayer();
    if (!this._ensureActionable()) return;
    const city = player.location;
    const others = GameState.players.filter(p => p !== player && p.location === city);
    if (others.length === 0) return this.toast('No other player in this city');

    const options = [];
    // GIVE: current player -> another (Researcher may give any city card).
    others.forEach(other => {
      player.hand.forEach(card => {
        if (card.type !== 'city') return;
        if (player.role === 'Researcher' || card.city === city) {
          options.push({
            label: `Give ${card.city} → ${other.name}`,
            onClick: () => this._act(Rules.shareKnowledge(player, other, card)),
          });
        }
      });
    });
    // TAKE: another -> current player (legal if THAT player is the Researcher).
    others.forEach(other => {
      other.hand.forEach(card => {
        if (card.type !== 'city') return;
        if (other.role === 'Researcher' || card.city === city) {
          options.push({
            label: `Take ${card.city} ← ${other.name}`,
            onClick: () => this._act(Rules.shareKnowledge(other, player, card)),
          });
        }
      });
    });

    if (options.length === 0) return this.toast(`No shareable card for ${city}`);
    this._showChoice('Share knowledge:', options);
  },

  /* ---- shared helpers for the action bar ------------------------------- */

  /** Guard for immediate actions: must be the actions phase with actions left. */
  _ensureActionable() {
    const player = getCurrentPlayer();
    if (!player || GameState.phase !== PHASE.ACTIONS) {
      this.toast('Not in the actions phase'); return false;
    }
    if (GameState.actionsRemaining <= 0) {
      this.toast('No actions left — end your turn'); return false;
    }
    return true;
  },

  /** Common tail after any action: toast on failure, clear choice, redraw. */
  _act(result) {
    if (result && !result.ok) this.toast(result.reason);
    this._clearChoice();
    Render.render();
    if (window.Game && Game.checkActionsExhausted) Game.checkActionsExhausted();
  },

  /** Show an inline picker below the action buttons (color choices, etc.). */
  _showChoice(promptText, options) {
    const el = this._choiceEl;
    if (!el) return;
    el.innerHTML = '';
    const label = document.createElement('div');
    label.textContent = promptText;
    label.style.cssText = 'font-size:0.72rem;color:#aab;margin:4px 0 2px;width:100%;';
    el.appendChild(label);
    options.forEach(opt => {
      const b = document.createElement('button');
      b.textContent = opt.label;
      if (opt.color) { b.style.background = opt.color; b.style.color = '#000'; }
      b.addEventListener('click', opt.onClick);
      el.appendChild(b);
    });
    const cancel = document.createElement('button');
    cancel.textContent = '✕';
    cancel.title = 'Cancel';
    cancel.addEventListener('click', () => this._clearChoice());
    el.appendChild(cancel);
    el.style.display = 'block';
  },

  _clearChoice() {
    if (this._choiceEl) { this._choiceEl.innerHTML = ''; this._choiceEl.style.display = 'none'; }
  },

  /** Sync action-bar highlight + enabled state to GameState (called each render). */
  _refreshActionButtons() {
    const inActions = GameState.phase === PHASE.ACTIONS;
    const canAct = inActions && GameState.actionsRemaining > 0;

    if (this._moveButtons) {
      Object.keys(this._moveButtons).forEach(key => {
        this._moveButtons[key].classList.toggle('active', key === this.pendingAction);
      });
    }

    const container = document.getElementById('action-buttons');
    if (container) {
      container.querySelectorAll('button').forEach(b => {
        if (b.closest('#action-choice')) return; // leave the picker interactive
        b.disabled = !canAct;
        b.style.opacity = canAct ? '1' : '0.5';
      });
    }

    const end = document.getElementById('end-turn-btn');
    if (end) { end.disabled = !inActions; end.style.opacity = inActions ? '1' : '0.5'; }
  },

  /** Redraw sidebar panels (current player, hand, actions left, log). */
  renderPanels() {
    this._renderStatusBar();
    this._renderPlayerInfo();
    this._renderHand();
    this._renderCureStatus();
    this._renderLog();
    this._refreshActionButtons();
  },

  /* ---- panel renderers (read-only; all driven off GameState) ------------ */

  /** Header status bar: whose turn, actions left, infection rate, outbreaks. */
  _renderStatusBar() {
    const player = getCurrentPlayer();
    this._setText('s-player', player ? player.name : '—');
    this._setText('s-actions',
      GameState.phase === PHASE.ACTIONS ? GameState.actionsRemaining : '—');
    this._setText('s-rate', getInfectionRate());
    this._setText('s-outbreaks', `${GameState.outbreaks} / ${MAX_OUTBREAKS}`);
  },

  /** Current player: name, role (colored) + blurb, and current city. */
  _renderPlayerInfo() {
    const box = document.getElementById('player-info');
    if (!box) return;
    const player = getCurrentPlayer();
    if (!player) { box.textContent = '—'; return; }

    const role = ROLES[player.role] || { color: '#cce', blurb: '' };
    box.innerHTML = '';

    const name = document.createElement('div');
    name.style.fontSize = '0.95rem';
    name.innerHTML = `<strong style="color:${role.color}">${player.name}</strong>` +
                     ` <span style="color:#889">@ ${player.location}</span>`;

    const roleLine = document.createElement('div');
    roleLine.style.color = role.color;
    roleLine.style.margin = '2px 0';
    roleLine.textContent = player.role;

    const blurb = document.createElement('div');
    blurb.style.color = '#889';
    blurb.style.fontSize = '0.72rem';
    blurb.textContent = role.blurb;

    box.append(name, roleLine, blurb);
  },

  /** The current player's hand as color-coded chips. */
  _renderHand() {
    const box = document.getElementById('hand');
    if (!box) return;
    const player = getCurrentPlayer();
    box.innerHTML = '';
    if (!player || player.hand.length === 0) {
      box.innerHTML = '<span style="color:#667">(empty)</span>';
      return;
    }

    player.hand.forEach(card => {
      const chip = document.createElement('span');
      chip.style.cssText =
        'display:inline-block;margin:2px;padding:3px 7px;border-radius:4px;' +
        'font-size:0.72rem;border:1px solid rgba(255,255,255,0.2);';
      if (card.type === 'city') {
        chip.style.background = COLOR_HEX[card.color];
        chip.style.color = '#000';
        chip.textContent = card.city;
      } else if (card.type === 'event') {
        chip.style.background = '#2a2050';
        chip.style.color = '#e8d9ff';
        chip.style.cursor = 'pointer';
        chip.title = 'Click to play this event card';
        chip.textContent = `★ ${card.name}`;
        chip.addEventListener('click', () => this._startEventPlay(player, card));
      } else {
        chip.style.background = '#333';
        chip.textContent = card.type;
      }
      box.appendChild(chip);
    });

    // hand-limit hint
    if (player.hand.length > HAND_LIMIT) {
      const warn = document.createElement('div');
      warn.style.cssText = 'color:#f88;font-size:0.72rem;margin-top:4px;';
      warn.textContent = `Over hand limit (${player.hand.length}/${HAND_LIMIT})`;
      box.appendChild(warn);
    }
  },

  /** Per-color cure marker + cubes left in supply. */
  _renderCureStatus() {
    const box = document.getElementById('cure-status');
    if (!box) return;
    box.innerHTML = '';
    const badge = {
      [CURE.UNCURED]:    { txt: 'uncured',    color: '#889' },
      [CURE.CURED]:      { txt: '✔ cured',    color: '#7f7' },
      [CURE.ERADICATED]: { txt: '✔✔ eradicated', color: '#7ff' },
    };
    COLORS.forEach(color => {
      const state = GameState.cures[color];
      const b = badge[state] || badge[CURE.UNCURED];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0;';
      row.innerHTML =
        `<span style="width:10px;height:10px;border-radius:2px;` +
        `background:${COLOR_HEX[color]};display:inline-block;"></span>` +
        `<span style="color:${b.color};min-width:80px;">${b.txt}</span>` +
        `<span style="color:#667;font-size:0.7rem;">` +
        `${GameState.cubesRemaining[color]} cubes left</span>`;
      box.appendChild(row);
    });
  },

  /** Last several log lines, newest at the bottom. */
  _renderLog() {
    const box = document.getElementById('log');
    if (!box) return;
    const lines = GameState.log.slice(-12);
    box.innerHTML = lines
      .map(msg => `<div>${this._escape(msg)}</div>`)
      .join('');
    box.scrollTop = box.scrollHeight;
  },

  /* ---- tiny DOM helpers ------------------------------------------------- */
  _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  },
  _escape(s) {
    return String(s).replace(/[&<>]/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
  },

  /** Win/lose modal. Call when GameState.phase becomes WON or LOST. */
  showEndGame() {
    const modal = document.getElementById('modal');
    const box = document.getElementById('modal-box');
    if (!modal || !box) return;

    const won = GameState.phase === PHASE.WON;
    const lost = GameState.phase === PHASE.LOST;
    if (!won && !lost) { modal.classList.remove('show'); return; }

    box.innerHTML = '';

    const title = document.createElement('h1');
    title.textContent = won ? 'VICTORY' : 'DEFEAT';
    title.style.cssText =
      `letter-spacing:5px;margin-bottom:12px;color:${won ? '#7f7' : '#f66'};` +
      `text-shadow:0 0 16px ${won ? '#4f4' : '#f44'};`;

    const msg = document.createElement('p');
    msg.style.cssText = 'color:#cce;margin-bottom:6px;font-size:0.95rem;';
    msg.textContent = won
      ? 'All four diseases cured — humanity is saved!'
      : this._lossReason();

    const sub = document.createElement('p');
    sub.style.cssText = 'color:#889;font-size:0.78rem;margin-bottom:20px;';
    sub.textContent = won ? 'Great teamwork.' : 'Better luck next outbreak.';

    const btn = document.createElement('button');
    btn.textContent = 'New Game';
    btn.style.cssText =
      'padding:8px 22px;font-size:0.9rem;cursor:pointer;background:#2a56b0;' +
      'color:#fff;border:1px solid #6af;border-radius:5px;';
    btn.addEventListener('click', () => { window.location.href = 'setup.html'; });

    box.append(title, msg, sub, btn);
    modal.classList.add('show');
  },

  /** Best-effort human reason for a loss (state carries no explicit cause). */
  _lossReason() {
    if (GameState.outbreaks >= MAX_OUTBREAKS)
      return `${MAX_OUTBREAKS} outbreaks devastated the world.`;
    const out = COLORS.find(c => GameState.cubesRemaining[c] <= 0);
    if (out) return `Ran out of ${out} disease cubes.`;
    if (GameState.playerDeck.length === 0)
      return 'The player deck ran out of cards.';
    return 'The world was overwhelmed.';
  },

  /* ---- event card UI --------------------------------------------------- */

  /** Entry point when the player clicks an event card chip.
   *  Event cards cost no action and can be played anytime (not over yet). */
  _startEventPlay(player, card) {
    if (GameState.phase === PHASE.WON || GameState.phase === PHASE.LOST) return;

    switch (card.name) {

      case 'One Quiet Night':
        this._showChoice(`Play "One Quiet Night"?`, [{
          label: 'Confirm — skip next infect phase',
          onClick: () => this._actEvent(Rules.playEvent(player, card.name, {})),
        }]);
        break;

      case 'Government Grant': {
        const cities = Object.keys(CITIES).filter(c => !GameState.cities[c].station);
        if (!cities.length) return this.toast('All cities already have research stations');
        this._showChoice('Government Grant: choose city for new research station',
          cities.map(c => ({
            label: c,
            onClick: () => this._actEvent(Rules.playEvent(player, card.name, { city: c })),
          }))
        );
        break;
      }

      case 'Airlift': {
        // Step 1: pick a player to move.
        this._showChoice('Airlift: choose a player to move',
          GameState.players.map(p => ({
            label: `${p.name} (${p.role}) @ ${p.location}`,
            onClick: () => {
              // Step 2: pick destination city.
              const dests = Object.keys(CITIES).filter(c => c !== p.location);
              this._showChoice(`Airlift ${p.name}: choose destination`,
                dests.map(c => ({
                  label: c,
                  onClick: () => this._actEvent(
                    Rules.playEvent(player, card.name, { playerId: p.id, toCity: c })
                  ),
                }))
              );
            },
          }))
        );
        break;
      }

      case 'Resilient Population': {
        const discardCities = [...new Set(GameState.infectionDiscard.map(c => c.city))];
        if (!discardCities.length) return this.toast('Infection discard pile is empty');
        this._showChoice('Resilient Population: permanently remove which city from infection discard?',
          discardCities.map(c => ({
            label: c,
            onClick: () => this._actEvent(Rules.playEvent(player, card.name, { city: c })),
          }))
        );
        break;
      }

      case 'Forecast': {
        const count = Math.min(6, GameState.infectionDeck.length);
        if (!count) return this.toast('Infection deck is empty');
        // Let user click infection cards in desired new order (top first).
        const chosen = [];
        const remaining = GameState.infectionDeck.slice(0, count);
        const pickNext = () => {
          if (!remaining.length) {
            this._actEvent(Rules.playEvent(player, card.name, { newOrder: chosen }));
            return;
          }
          this._showChoice(
            `Forecast: pick card #${chosen.length + 1} of ${count} (will be next drawn)`,
            remaining.map((c, i) => ({
              label: `${c.city} (${c.color})`,
              onClick: () => { chosen.push(c); remaining.splice(i, 1); pickNext(); },
            }))
          );
        };
        pickNext();
        break;
      }

      default:
        this.toast(`No UI for event: ${card.name}`);
    }
  },

  /** After a playEvent call: toast on failure or re-render on success. */
  _actEvent(result) {
    if (result && !result.ok) { this.toast(result.reason); return; }
    this._clearChoice();
    Render.render();
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
