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

// ponytail: eyeballed from Board.webp — TUNE with the dev console (de-rate/de-outbreaks).
// Infection Rate: 7 evenly-spaced spaces on a horizontal track.
const INFECTION_TRACK = { y: 26.8, x0: 70.5, dx: 4.2 }; // space i -> x = x0 + i*dx (SVG board)
// Outbreaks: SVG board draws a straight vertical track on the left edge.
const OUTBREAK_TRACK = [ // index 0..8, {x,y} in board % (SVG board)
  {x:5.2,y:42.4},{x:5.2,y:47.7},{x:5.2,y:53.1},{x:5.2,y:58.5},{x:5.2,y:63.8},
  {x:5.2,y:69.2},{x:5.2,y:74.6},{x:5.2,y:79.9},{x:5.2,y:85.3},
];
// Cure markers: 4 vial slots at bottom-center of the SVG board.
const CURE_MARKERS = [ // slot per color (uncured start), {color,x,y} board %
  {color:'blue',   x:41.0, y:92.5},
  {color:'yellow', x:46.8, y:92.5},
  {color:'black',  x:52.6, y:92.5},
  {color:'red',    x:58.4, y:92.5},
];
const CURE_RAISED_DY = 6.4; // board % a cured/eradicated marker rises above its slot.
// Card-count badges: one per pile, centered on its deck slot on the SVG board.
const PILES = [
  { key: 'infectionDeck',    x: 75.3, y: 12.6, label: 'Infection draw pile' },
  { key: 'infectionDiscard', x: 88.8, y: 12.6, label: 'Infection discard pile' },
  { key: 'playerDeck',       x: 75.3, y: 87.6, label: 'Player draw pile' },
  { key: 'playerDiscard',    x: 88.8, y: 87.6, label: 'Player discard pile' },
];

const Render = {
  svg: null,
  citiesLayer: null,
  pawnLayer: null,
  markerLayer: null,

  init() {
    this.svg = document.getElementById('svg-overlay');
    this.citiesLayer = document.getElementById('cities-layer');
    this.pawnLayer = document.getElementById('pawn-layer');
    this.markerLayer = document.createElement('div');
    this.markerLayer.style.cssText =
      'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:12;';
    this.citiesLayer.parentNode.appendChild(this.markerLayer);
    this.renderConnections();
    this.renderCityNodes();
  },

  /** Master redraw. Call after every state change. */
  render() {
    this.renderCubes();
    this.renderStations();
    this.renderTrackMarkers();
    this.renderCureMarkers();
    this.renderPileCounts();
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

  /** Place the infection-rate + outbreak markers on their printed tracks. */
  renderTrackMarkers() {
    const mk = (x, y, label) => {
      const m = document.createElement('div');
      m.title = label;
      m.style.cssText =
        'position:absolute; width:26px; height:26px; border-radius:50%;' +
        `left:${x}%; top:${y}%; transform:translate(-50%,-50%);` +
        'background:rgba(255,255,255,0.12); border:2.5px solid #ffd21e;' +
        'box-shadow:0 0 10px #ffd21e; pointer-events:none;';
      return m;
    };
    this.markerLayer.innerHTML = '';
    const ri = Math.min(GameState.infectionRateIndex, 6);
    this.markerLayer.appendChild(mk(
      INFECTION_TRACK.x0 + ri * INFECTION_TRACK.dx, INFECTION_TRACK.y,
      `Infection rate: ${getInfectionRate()}`));
    const ob = OUTBREAK_TRACK[Math.min(GameState.outbreaks, 8)];
    this.markerLayer.appendChild(mk(ob.x, ob.y,
      `Outbreaks: ${GameState.outbreaks}/${MAX_OUTBREAKS}`));
  },

  /** Cure marker per color: on its slot when uncured, raised when cured, raised with
   *  an ✕ when eradicated. Always visible. */
  renderCureMarkers() {
    CURE_MARKERS.forEach(({ color, x, y }) => {
      const status = GameState.cures[color] || CURE.UNCURED;
      const cured = status === CURE.CURED;
      const eradicated = status === CURE.ERADICATED;
      const my = (cured || eradicated) ? y - CURE_RAISED_DY : y; // cured/eradicated rise above the slot
      const m = document.createElement('div');
      m.title = `${color}: ${status}`;
      m.textContent = eradicated ? '✕' : '';
      m.style.cssText =
        'position:absolute; width:16px; height:16px; border-radius:50%;' +
        `left:${x}%; top:${my}%; transform:translate(-50%,-50%);` +
        `background:${COLOR_HEX[color]}; border:2px solid ${eradicated ? 'gold' : '#fff'};` +
        'color:#000; font-size:12px; font-weight:bold; line-height:14px; text-align:center;' +
        'box-shadow:0 0 4px #000; pointer-events:none;';
      this.markerLayer.appendChild(m);
    });
  },


  /** Small card-count badge on each deck/discard pile (draw + discard, both
   *  infection and player). Appended to markerLayer AFTER renderTrackMarkers
   *  (which clears it). */
  renderPileCounts() {
    const CARD = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" ' +
      'style="opacity:0.9;flex:none"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v14h14V5H5z"/></svg>';
    PILES.forEach(p => {
      const count = (GameState[p.key] || []).length;
      const el = document.createElement('div');
      el.title = `${p.label}: ${count} card${count === 1 ? '' : 's'}`;
      el.style.cssText =
        `position:absolute; left:${p.x}%; top:${p.y}%; transform:translate(-50%,-50%);` +
        'display:flex; align-items:center; gap:3px; padding:1px 5px 1px 4px;' +
        'background:rgba(4,6,20,0.78); border:1px solid rgba(255,255,255,0.4); border-radius:9px;' +
        'color:#fff; font:bold 11px/1 Consolas,monospace; pointer-events:none;' +
        'box-shadow:0 0 5px #000; white-space:nowrap;';
      el.innerHTML = `${CARD}<span>${count}</span>`;
      this.markerLayer.appendChild(el);
    });
  },

  /** Draw one pawn per player at their location (offset when co-located). */
  renderPawns() {
    this.pawnLayer.innerHTML = '';
    const cur = getCurrentPlayer();

    // group player indices by city so co-located pawns can be fanned out
    const byCity = {};
    GameState.players.forEach((p, i) => (byCity[p.location] ||= []).push(i));

    GameState.players.forEach((p, i) => {
      const city = CITIES[p.location];
      if (!city) return;
      const group = byCity[p.location];
      const slot = group.indexOf(i);
      // west zone: sit left of the dot (clear of cubes/station/label), fan vertically
      const dx = -14;
      const dy = (slot - (group.length - 1) / 2) * 14;
      const shift = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

      const pawn = document.createElement('div');
      pawn.title = `${p.name} — ${p.role}`;
      pawn.style.cssText =
        'position:absolute; width:14px; height:14px; border-radius:50%;' +
        `left:${city.x}%; top:${city.y}%;` +
        `transform:${shift};` +
        `background:${(ROLES[p.role] && ROLES[p.role].color) || '#fff'};` +
        'border:2px solid rgba(0,0,0,0.6); pointer-events:none;';
      if (p === cur) {
        pawn.style.borderColor = 'gold';
        pawn.style.boxShadow = '0 0 10px gold, 0 0 4px #ffa';
        pawn.style.transform = `${shift} scale(1.2)`;
      }
      this.pawnLayer.appendChild(pawn);
    });
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
