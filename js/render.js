/* =============================================================================
 * render.js  —  BOARD RENDERING  (owner: Abigail)
 * -----------------------------------------------------------------------------
 * Pure view layer. Reads GameState + constants; draws the board. NEVER mutates
 * game state. The single entry point is Render.render(), called after any state
 * change. Redraw-everything is fine (board is small; this keeps coupling low).
 *
 * Ported from the original index.html so the map/cities/connections already
 * work. TODO markers show what still needs GameState wired in
 * (cubes, stations, multi-pawn, markers).
 *
 * Click handling: city clicks call Controls.onCityClick(name) (see controls.js),
 * so the view stays free of game logic.
 * ===========================================================================*/

const Render = {
  svg: null,
  citiesLayer: null,
  pawnLayer: null,

  init() {
    this.svg = document.getElementById('svg-overlay');
    this.citiesLayer = document.getElementById('cities-layer');
    this.pawnLayer = document.getElementById('pawn-layer');
    this.renderConnections();
    this.renderCityNodes();
  },

  /** Master redraw. Call after every state change. */
  render() {
    this.renderCubes();
    this.renderStations();
    this.renderPawns();
    this.renderCityHighlights();
    if (window.Controls && Controls.renderPanels) Controls.renderPanels();
  },

  /* ---- static: connection lines (drawn once) --------------------------- */
  renderConnections() {
    this.svg.innerHTML = '';
    DRAWN_CONNECTIONS.forEach(([a, b]) => {
      const ca = CITIES[a], cb = CITIES[b];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', ca.x); line.setAttribute('y1', ca.y);
      line.setAttribute('x2', cb.x); line.setAttribute('y2', cb.y);
      line.setAttribute('class', 'conn-normal');
      this.svg.appendChild(line);
    });
  },

  /* ---- city nodes (dots + labels, drawn once) -------------------------- */
  renderCityNodes() {
    this.citiesLayer.innerHTML = '';
    Object.entries(CITIES).forEach(([name, data]) => {
      const node = document.createElement('div');
      node.className = 'city-node';
      node.dataset.city = name;
      node.style.left = data.x + '%';
      node.style.top  = data.y + '%';

      const dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.background = COLOR_HEX[data.color];

      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = name;

      // cube holder — renderCubes() fills this each redraw
      const cubes = document.createElement('div');
      cubes.className = 'cube-holder';

      // station holder — renderStations() fills this each redraw. Sits to the
      // right of the dot, clear of cubes (above) and label (below).
      const station = document.createElement('div');
      station.className = 'station-holder';
      station.style.cssText =
        'position:absolute; left:calc(100% + 1px); top:50%; transform:translateY(-50%);' +
        'font-size:18px; font-weight:bold; color:#fff; text-shadow:0 0 4px #000,0 0 3px #000,0 0 2px #000; line-height:1;' +
        'pointer-events:none;';

      node.append(dot, cubes, station, label);
      node.addEventListener('click', () => {
        if (window.Controls && Controls.onCityClick) Controls.onCityClick(name);
      });
      this.citiesLayer.appendChild(node);
    });
  },

  /* ---- dynamic layers (redrawn each render) ---------------------------- */

  /** Draw disease cubes on each city from GameState.cities[name].cubes. */
  renderCubes() {
    Object.entries(GameState.cities).forEach(([name, cityState]) => {
      const holder = this.citiesLayer.querySelector(`.city-node[data-city="${CSS.escape(name)}"] .cube-holder`);
      if (!holder) return;
      holder.innerHTML = '';
      COLORS.forEach(color => {
        for (let i = 0; i < cityState.cubes[color]; i++) {
          const cube = document.createElement('span');
          cube.className = 'cube';
          cube.style.background = COLOR_HEX[color];
          holder.appendChild(cube);
        }
      });
    });
  },

  /** Draw a station marker on cities where station===true. */
  renderStations() {
    Object.entries(GameState.cities).forEach(([name, cityState]) => {
      const holder = this.citiesLayer.querySelector(
        `.city-node[data-city="${CSS.escape(name)}"] .station-holder`);
      if (!holder) return;
      holder.textContent = cityState.station ? '⌂' : ''; // ⌂ house glyph
    });
  },

  /** Draw one pawn per player at their location (offset when co-located). */
  renderPawns() {
    // TODO(Abigail): render GameState.players[]. Color by ROLES[role].color.
    // Highlight the current player (getCurrentPlayer()). Replace the old single
    // #token. Offset multiple pawns in the same city so they don't overlap.
  },

  /** Highlight current city + legal targets for the active pending action. */
  renderCityHighlights() {
    const cur = getCurrentPlayer();
    const from = cur ? cur.location : null;
    const action = (window.Controls && Controls.pendingAction) || 'drive';

    // Compute the set of legal destination cities for the current action.
    const validTargets = new Set();
    if (from && cur) {
      switch (action) {
        case 'drive':
          // Adjacent cities (drive/ferry).
          getAdjacent(from).forEach(c => validTargets.add(c));
          break;
        case 'directFlight':
          // Any city the player holds a city card for (except current city).
          cur.hand.forEach(card => {
            if (card.type === 'city' && card.city !== from) validTargets.add(card.city);
          });
          break;
        case 'charterFlight':
          // Anywhere — but only if the player holds the current city's card.
          if (cur.hand.some(c => c.type === 'city' && c.city === from)) {
            Object.keys(CITIES).forEach(c => { if (c !== from) validTargets.add(c); });
          }
          break;
        case 'shuttleFlight':
          // Other cities that have research stations.
          getStations().forEach(c => { if (c !== from) validTargets.add(c); });
          break;
        default:
          getAdjacent(from).forEach(c => validTargets.add(c));
      }
    }

    const isFlight = ['directFlight', 'charterFlight', 'shuttleFlight'].includes(action);

    // Apply classes to city nodes.
    this.citiesLayer.querySelectorAll('.city-node').forEach(node => {
      const name = node.dataset.city;
      node.classList.remove('current', 'valid-move', 'flight-target');
      if (name === from) {
        node.classList.add('current');
      } else if (validTargets.has(name)) {
        node.classList.add(isFlight ? 'flight-target' : 'valid-move');
      }
    });

    // Highlight connection lines that touch the current city (drive only).
    this.svg.querySelectorAll('line').forEach(line => {
      line.setAttribute('class', 'conn-normal');
    });
  },
};

window.Render = Render;
