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
const INFECTION_TRACK = { y: 23.1, x0: 64.2, dx: 3.4 }; // space i -> x = x0 + i*dx
// Outbreaks: 9 spaces on a zigzag; explicit points are simplest given the zigzag.
const OUTBREAK_TRACK = [ // index 0..8, {x,y} in board %
  {x:7.9,y:56.3},{x:11.3,y:60.5},{x:7.8,y:64.5},{x:11.3,y:68.5},{x:7.8,y:72.4},
  {x:11.3,y:76.4},{x:7.8,y:80.4},{x:11.3,y:84.3},{x:7.7,y:88.3},
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
        'position:absolute; width:15px; height:15px; border-radius:50%;' +
        `left:${x}%; top:${y}%; transform:translate(-50%,-50%);` +
        'background:#eee; border:2px solid #c0392b;' +
        'box-shadow:0 0 6px #000, 0 0 3px #fff; pointer-events:none;';
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

  /** Highlight current city + legal drive targets (uses Controls for context). */
  renderCityHighlights() {
    const cur = getCurrentPlayer();
    const from = cur ? cur.location : 'Atlanta';
    this.citiesLayer.querySelectorAll('.city-node').forEach(node => {
      const name = node.dataset.city;
      node.classList.remove('current', 'valid-move');
      if (name === from) node.classList.add('current');
      else if (isAdjacent(from, name)) node.classList.add('valid-move');
    });
    // highlight active connection lines
    this.svg.querySelectorAll('line').forEach(line => {
      line.setAttribute('class', 'conn-normal');
    });
  },
};

window.Render = Render;
