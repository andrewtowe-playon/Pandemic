/* =============================================================================
 * devConsole.js  —  DEVELOPER CONSOLE  (owner: Andrew)
 * -----------------------------------------------------------------------------
 * Collapsible dev panel at the bottom of the sidebar.
 *
 * Tabs:
 *   State — formatted snapshot of GameState (decks summarised as counts)
 *   Decks — full card-by-card order of all 4 piles
 *   Edit  — form controls to mutate GameState for testing
 *
 * After any Edit mutation, calls Render.render() to sync the board.
 * ===========================================================================*/

const DevConsole = {
  open: false,
  activeTab: 'state',

  // ── Toggle ────────────────────────────────────────────────────────────────
  toggle() {
    this.open = !this.open;
    document.getElementById('dev-body').style.display = this.open ? 'block' : 'none';
    document.getElementById('dev-chevron').textContent = this.open ? '▾' : '▸';
    if (this.open) this.refresh();
  },

  // ── Tab switching ─────────────────────────────────────────────────────────
  showTab(tab) {
    this.activeTab = tab;
    ['state', 'decks', 'edit'].forEach(t => {
      const el = document.getElementById(`dev-tab-${t}`);
      const btn = document.getElementById(`dev-btn-${t}`);
      if (el)  el.style.display  = (t === tab) ? 'block' : 'none';
      if (btn) btn.classList.toggle('dev-tab-active', t === tab);
    });
    this.refresh();
  },

  // ── Refresh current tab ───────────────────────────────────────────────────
  refresh() {
    if (!this.open) return;
    if (this.activeTab === 'state') this._renderState();
    if (this.activeTab === 'decks') this._renderDecks();
    if (this.activeTab === 'edit')  this._renderEdit();
  },

  // ── STATE tab ─────────────────────────────────────────────────────────────
  _renderState() {
    const el = document.getElementById('dev-tab-state');
    if (!el) return;
    const gs = GameState;
    const snap = {
      phase:              gs.phase,
      difficulty:         gs.difficulty,
      currentPlayerIndex: gs.currentPlayerIndex,
      actionsRemaining:   gs.actionsRemaining,
      outbreaks:          gs.outbreaks,
      infectionRateIndex: gs.infectionRateIndex,
      infectionRate:      getInfectionRate(),
      oneQuietNight:      gs.oneQuietNight,
      cures:              { ...gs.cures },
      cubesRemaining:     { ...gs.cubesRemaining },
      playerDeck:         `[${gs.playerDeck.length} cards]`,
      playerDiscard:      `[${gs.playerDiscard.length} cards]`,
      infectionDeck:      `[${gs.infectionDeck.length} cards]`,
      infectionDiscard:   `[${gs.infectionDiscard.length} cards]`,
      players: gs.players.map(p => ({
        id: p.id, name: p.name, role: p.role, location: p.location,
        hand: p.hand.map(c => c.type === 'city' ? c.city : `[${c.name || c.type}]`),
        storedEvent: p.storedEvent ? p.storedEvent.name : null,
      })),
      cities: (() => {
        const out = {};
        Object.entries(gs.cities).forEach(([name, c]) => {
          const total = Object.values(c.cubes).reduce((a, b) => a + b, 0);
          if (total > 0 || c.station)
            out[name] = { cubes: { ...c.cubes }, station: c.station };
        });
        return out;
      })(),
    };
    el.innerHTML = `<pre class="dev-json">${this._syntaxHL(JSON.stringify(snap, null, 2))}</pre>`;
  },

  // ── DECKS tab ─────────────────────────────────────────────────────────────
  _renderDecks() {
    const el = document.getElementById('dev-tab-decks');
    if (!el) return;

    const renderDeck = (title, cards, bottomLabel) => {
      if (!cards.length) return `<div class="dev-deck-title">${title}</div><div class="dev-empty">empty</div>`;
      const rows = cards.map((c, i) => {
        const label = c.type === 'epidemic'
          ? '<span class="dev-epidemic">⚡ EPIDEMIC</span>'
          : c.type === 'event'
          ? `<span class="dev-event">★ ${c.name}</span>`
          : c.city || c.name || '?';
        const color = c.color || (c.type === 'epidemic' ? 'epidemic' : 'event');
        const pos = i === 0 ? '← top' : i === cards.length - 1 ? (bottomLabel || '← bottom') : '';
        return `<div class="dev-card dev-c-${color}">${i + 1}. ${label} <span class="dev-pos">${pos}</span></div>`;
      });
      return `<div class="dev-deck-title">${title} <span class="dev-count">(${cards.length})</span></div>
              <div class="dev-card-list">${rows.join('')}</div>`;
    };

    el.innerHTML = `
      <div class="dev-deck-section">${renderDeck('Player Deck', GameState.playerDeck, '← bottom (epidemic draws from here)')}</div>
      <div class="dev-deck-section">${renderDeck('Player Discard', GameState.playerDiscard)}</div>
      <div class="dev-deck-section">${renderDeck('Infection Deck', GameState.infectionDeck, '← bottom (epidemic draws from here)')}</div>
      <div class="dev-deck-section">${renderDeck('Infection Discard', GameState.infectionDiscard)}</div>
    `;
  },

  // ── EDIT tab ──────────────────────────────────────────────────────────────
  _renderEdit() {
    const el = document.getElementById('dev-tab-edit');
    if (!el) return;

    const cityOptions = Object.keys(CITIES).map(c => `<option value="${c}">${c}</option>`).join('');
    const playerOptions = GameState.players.map((p, i) =>
      `<option value="${i}">${p.name} (${p.role})</option>`).join('') || '<option>No players</option>';
    const colorOptions = COLORS.map(c => `<option value="${c}">${c}</option>`).join('');
    const cureOptions  = Object.values(CURE).map(v => `<option value="${v}">${v}</option>`).join('');
    const phaseOptions = Object.values(PHASE).map(v => `<option value="${v}">${v}</option>`).join('');
    const eventOptions = Object.keys(EVENTS).map(n => `<option value="${n}">${n}</option>`).join('');

    el.innerHTML = `
      <div class="dev-section-label">PLAYER</div>
      <div class="dev-row">
        <select id="de-player">${playerOptions}</select>
        <select id="de-dest">${cityOptions}</select>
        <button onclick="DevConsole.movePlayer()">Move</button>
      </div>
      <div class="dev-row">
        <label>Actions:</label>
        <input id="de-actions" type="number" min="0" max="4" value="${GameState.actionsRemaining}" style="width:48px">
        <button onclick="DevConsole.setActions()">Set</button>
      </div>
      <div class="dev-row">
        <label>Add card:</label>
        <select id="de-card-type">
          <option value="city">City</option>
          <option value="event">Event</option>
          <option value="epidemic">Epidemic</option>
        </select>
        <select id="de-card-city">${cityOptions}</select>
        <select id="de-card-event" style="display:none">${eventOptions}</select>
        <button onclick="DevConsole.addCard()">Add to hand</button>
      </div>

      <div class="dev-section-label">BOARD</div>
      <div class="dev-row">
        <select id="de-cube-city">${cityOptions}</select>
        <select id="de-cube-color">${colorOptions}</select>
        <input id="de-cube-count" type="number" min="0" max="3" value="0" style="width:40px">
        <button onclick="DevConsole.setCubes()">Set cubes</button>
      </div>
      <div class="dev-row">
        <button onclick="DevConsole.addStation()">Add station at city ↑</button>
        <button onclick="DevConsole.removeStation()">Remove station ↑</button>
      </div>

      <div class="dev-section-label">DISEASE</div>
      <div class="dev-row">
        <select id="de-cure-color">${colorOptions}</select>
        <select id="de-cure-status">${cureOptions}</select>
        <button onclick="DevConsole.setCure()">Set cure</button>
      </div>

      <div class="dev-section-label">TRACKERS</div>
      <div class="dev-row">
        <label>Outbreaks (0–7):</label>
        <input id="de-outbreaks" type="number" min="0" max="7" value="${GameState.outbreaks}" style="width:48px">
        <button onclick="DevConsole.setOutbreaks()">Set</button>
      </div>
      <div class="dev-row">
        <label>Infection rate idx (0–6):</label>
        <input id="de-rate" type="number" min="0" max="6" value="${GameState.infectionRateIndex}" style="width:48px">
        <button onclick="DevConsole.setInfectionRate()">Set</button>
      </div>
      <div class="dev-row">
        <label>Phase:</label>
        <select id="de-phase">${phaseOptions}</select>
        <button onclick="DevConsole.setPhase()">Set</button>
      </div>

      <div class="dev-section-label">ACTIONS</div>
      <div class="dev-row">
        <button onclick="DevConsole.forceEpidemic()">⚡ Force Epidemic</button>
        <button onclick="DevConsole.toggleOneQuietNight()">🌙 Toggle One Quiet Night</button>
      </div>
      <div class="dev-row">
        <button onclick="DevConsole.clearAllCubes()">Clear ALL cubes</button>
        <button onclick="DevConsole.cureAll()">Cure all diseases</button>
      </div>
    `;

    // Show/hide city vs event select based on card type
    document.getElementById('de-card-type').addEventListener('change', function () {
      document.getElementById('de-card-city').style.display  = this.value === 'city'  ? '' : 'none';
      document.getElementById('de-card-event').style.display = this.value === 'event' ? '' : 'none';
    });

    // Pre-select current player's city in dest dropdown
    const pIdx = parseInt(document.getElementById('de-player').value);
    if (GameState.players[pIdx]) {
      document.getElementById('de-dest').value = GameState.players[pIdx].location;
    }
  },

  // ── Edit actions ──────────────────────────────────────────────────────────

  movePlayer() {
    const pIdx = parseInt(document.getElementById('de-player').value);
    const dest = document.getElementById('de-dest').value;
    if (!GameState.players[pIdx]) return;
    GameState.players[pIdx].location = dest;
    logEvent(`[DEV] ${GameState.players[pIdx].name} teleported to ${dest}`);
    this._afterEdit();
  },

  setActions() {
    const n = parseInt(document.getElementById('de-actions').value);
    if (isNaN(n) || n < 0 || n > 4) return;
    GameState.actionsRemaining = n;
    logEvent(`[DEV] Actions remaining set to ${n}`);
    this._afterEdit();
  },

  addCard() {
    const pIdx = parseInt(document.getElementById('de-player').value);
    const type = document.getElementById('de-card-type').value;
    if (!GameState.players[pIdx]) return;
    let card;
    if (type === 'city') {
      const city = document.getElementById('de-card-city').value;
      card = { type: 'city', city, color: CITIES[city].color };
    } else if (type === 'event') {
      const name = document.getElementById('de-card-event').value;
      card = { type: 'event', name };
    } else {
      card = { type: 'epidemic' };
    }
    GameState.players[pIdx].hand.push(card);
    logEvent(`[DEV] Added ${card.city || card.name || 'epidemic'} to ${GameState.players[pIdx].name}'s hand`);
    this._afterEdit();
  },

  setCubes() {
    const city  = document.getElementById('de-cube-city').value;
    const color = document.getElementById('de-cube-color').value;
    const count = parseInt(document.getElementById('de-cube-count').value);
    if (!GameState.cities[city] || isNaN(count) || count < 0 || count > 3) return;
    const old = GameState.cities[city].cubes[color];
    const diff = count - old;
    GameState.cities[city].cubes[color] = count;
    GameState.cubesRemaining[color] = Math.max(0, GameState.cubesRemaining[color] - diff);
    logEvent(`[DEV] ${city} ${color} cubes set to ${count}`);
    this._afterEdit();
  },

  addStation() {
    const city = document.getElementById('de-cube-city').value;
    if (!GameState.cities[city]) return;
    GameState.cities[city].station = true;
    logEvent(`[DEV] Research station added to ${city}`);
    this._afterEdit();
  },

  removeStation() {
    const city = document.getElementById('de-cube-city').value;
    if (!GameState.cities[city]) return;
    GameState.cities[city].station = false;
    logEvent(`[DEV] Research station removed from ${city}`);
    this._afterEdit();
  },

  setCure() {
    const color  = document.getElementById('de-cure-color').value;
    const status = document.getElementById('de-cure-status').value;
    GameState.cures[color] = status;
    logEvent(`[DEV] ${color} cure set to ${status}`);
    this._afterEdit();
  },

  setOutbreaks() {
    const n = parseInt(document.getElementById('de-outbreaks').value);
    if (isNaN(n) || n < 0 || n > 7) return;
    GameState.outbreaks = n;
    logEvent(`[DEV] Outbreaks set to ${n}`);
    this._afterEdit();
  },

  setInfectionRate() {
    const n = parseInt(document.getElementById('de-rate').value);
    if (isNaN(n) || n < 0 || n > 6) return;
    GameState.infectionRateIndex = n;
    logEvent(`[DEV] Infection rate index set to ${n} (rate: ${getInfectionRate()})`);
    this._afterEdit();
  },

  setPhase() {
    const phase = document.getElementById('de-phase').value;
    GameState.phase = phase;
    logEvent(`[DEV] Phase set to ${phase}`);
    this._afterEdit();
  },

  forceEpidemic() {
    Rules.resolveEpidemic();
    logEvent('[DEV] Epidemic forced');
    this._afterEdit();
  },

  toggleOneQuietNight() {
    GameState.oneQuietNight = !GameState.oneQuietNight;
    logEvent(`[DEV] oneQuietNight = ${GameState.oneQuietNight}`);
    this._afterEdit();
  },

  clearAllCubes() {
    COLORS.forEach(color => {
      let removed = 0;
      Object.values(GameState.cities).forEach(c => { removed += c.cubes[color]; c.cubes[color] = 0; });
      GameState.cubesRemaining[color] = CUBES_PER_COLOR;
    });
    logEvent('[DEV] All disease cubes cleared');
    this._afterEdit();
  },

  cureAll() {
    COLORS.forEach(color => { GameState.cures[color] = CURE.CURED; });
    logEvent('[DEV] All diseases marked cured');
    this._afterEdit();
  },

  // ── Shared post-edit hook ─────────────────────────────────────────────────
  _afterEdit() {
    if (window.Render && Render.render) Render.render();
    this.refresh();
  },

  // ── JSON syntax highlighter ───────────────────────────────────────────────
  _syntaxHL(json) {
    return json
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, match => {
        let cls = 'dev-jn'; // number
        if (/^"/.test(match)) cls = /:$/.test(match) ? 'dev-jk' : 'dev-js';
        else if (/true|false/.test(match)) cls = 'dev-jb';
        else if (/null/.test(match)) cls = 'dev-jnull';
        return `<span class="${cls}">${match}</span>`;
      });
  },
};

window.DevConsole = DevConsole;
