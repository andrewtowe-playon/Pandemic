/* =============================================================================
 * state.js  —  THE SHARED CONTRACT  (owner: Andrew)
 * -----------------------------------------------------------------------------
 * This file defines the game's constants and the single mutable `GameState`
 * object that every other module reads from. It is the one file everyone
 * depends on.
 *
 * RULE (agreed at kickoff): FREEZE this file's SHAPE by 0:30.
 *   - After 0:30, additive changes only (new fields OK; no renames/removals).
 *   - Nobody edits this file except Andrew.
 *
 * DATA FLOW for the whole app:
 *     user input  ->  Rules.* mutates GameState  ->  Render.render()
 * Everyone reads GameState; only Rules.* (and setup in Game/Cards) mutates it.
 *
 * All rules must match Rules.md. Where CLAUDE.md and Rules.md disagree, Rules.md
 * wins (e.g. the infection-rate track is [2,2,2,3,3,4,4]).
 * ===========================================================================*/

/* ---- Colors ------------------------------------------------------------- */
const COLORS = ['blue', 'yellow', 'black', 'red'];

const COLOR_HEX = {
  blue:   '#3399ff',
  yellow: '#ffcc00',
  black:  '#bbbbbb',
  red:    '#ff5555',
};

/* ---- Cities (x/y are % of the board image) ------------------------------ */
/* Lifted verbatim from the original index.html. Each city belongs to one color. */
const CITIES = {
  // Blue — North America
  "San Francisco":    { x:  7.5, y: 37.5, color: "blue" },
  "Chicago":          { x: 14.0, y: 30.0, color: "blue" },
  "Atlanta":          { x: 16.0, y: 41.0, color: "blue" },
  "Montreal":         { x: 19.5, y: 26.5, color: "blue" },
  "Washington":       { x: 21.0, y: 35.5, color: "blue" },
  "New York":         { x: 23.5, y: 28.0, color: "blue" },
  // Blue — Europe
  "London":           { x: 37.0, y: 20.0, color: "blue" },
  "Essen":            { x: 43.0, y: 17.0, color: "blue" },
  "St. Petersburg":   { x: 52.0, y: 15.0, color: "blue" },
  "Madrid":           { x: 35.0, y: 33.0, color: "blue" },
  "Paris":            { x: 41.5, y: 24.0, color: "blue" },
  "Milan":            { x: 46.0, y: 23.0, color: "blue" },

  // Yellow — Americas
  "Los Angeles":      { x:  7.5, y: 45.5, color: "yellow" },
  "Mexico City":      { x: 11.0, y: 50.0, color: "yellow" },
  "Miami":            { x: 18.0, y: 46.5, color: "yellow" },
  "Bogota":           { x: 18.0, y: 57.0, color: "yellow" },
  "Lima":             { x: 14.0, y: 67.0, color: "yellow" },
  "Santiago":         { x: 14.0, y: 77.0, color: "yellow" },
  "Buenos Aires":     { x: 20.0, y: 74.0, color: "yellow" },
  "Sao Paulo":        { x: 25.0, y: 69.0, color: "yellow" },
  // Yellow — Africa
  "Lagos":            { x: 38.5, y: 57.0, color: "yellow" },
  "Kinshasa":         { x: 43.0, y: 63.5, color: "yellow" },
  "Khartoum":         { x: 47.5, y: 53.0, color: "yellow" },
  "Johannesburg":     { x: 45.0, y: 72.0, color: "yellow" },

  // Black — Middle East / South Asia
  "Algiers":          { x: 40.5, y: 35.5, color: "black" },
  "Cairo":            { x: 47.0, y: 38.0, color: "black" },
  "Istanbul":         { x: 48.5, y: 27.0, color: "black" },
  "Moscow":           { x: 52.5, y: 21.0, color: "black" },
  "Baghdad":          { x: 53.5, y: 35.0, color: "black" },
  "Tehran":           { x: 56.5, y: 28.0, color: "black" },
  "Riyadh":           { x: 53.5, y: 44.0, color: "black" },
  "Karachi":          { x: 58.0, y: 40.0, color: "black" },
  "Delhi":            { x: 63.0, y: 36.5, color: "black" },
  "Mumbai":           { x: 60.0, y: 48.0, color: "black" },
  "Chennai":          { x: 64.0, y: 54.0, color: "black" },
  "Kolkata":          { x: 68.5, y: 43.0, color: "black" },

  // Red — East / Southeast Asia / Oceania
  "Beijing":          { x: 72.0, y: 24.0, color: "red" },
  "Seoul":            { x: 77.5, y: 23.0, color: "red" },
  "Tokyo":            { x: 81.5, y: 28.0, color: "red" },
  "Shanghai":         { x: 74.0, y: 33.0, color: "red" },
  "Taipei":           { x: 78.5, y: 38.0, color: "red" },
  "Osaka":            { x: 82.5, y: 34.0, color: "red" },
  "Hong Kong":        { x: 74.0, y: 44.0, color: "red" },
  "Bangkok":          { x: 70.5, y: 51.0, color: "red" },
  "Ho Chi Minh City": { x: 75.5, y: 54.0, color: "red" },
  "Manila":           { x: 80.5, y: 51.0, color: "red" },
  "Jakarta":          { x: 73.5, y: 61.0, color: "red" },
  "Sydney":           { x: 83.5, y: 68.0, color: "red" },
};

/* ---- Connections -------------------------------------------------------- */
const DRAWN_CONNECTIONS = [
  ["San Francisco","Chicago"], ["San Francisco","Los Angeles"],
  ["Chicago","Atlanta"], ["Chicago","Montreal"], ["Chicago","Mexico City"], ["Chicago","Los Angeles"],
  ["Atlanta","Miami"], ["Atlanta","Washington"],
  ["Montreal","Washington"], ["Montreal","New York"],
  ["Washington","New York"], ["Washington","Miami"],
  ["New York","London"], ["New York","Madrid"],
  ["London","Essen"], ["London","Madrid"], ["London","Paris"],
  ["Madrid","Paris"], ["Madrid","Algiers"], ["Madrid","Sao Paulo"],
  ["Paris","Essen"], ["Paris","Milan"], ["Paris","Algiers"],
  ["Essen","Milan"], ["Essen","St. Petersburg"],
  ["Milan","Istanbul"],
  ["St. Petersburg","Istanbul"], ["St. Petersburg","Moscow"],
  ["Los Angeles","Mexico City"],
  ["Mexico City","Miami"], ["Mexico City","Bogota"], ["Mexico City","Lima"],
  ["Miami","Bogota"],
  ["Bogota","Lima"], ["Bogota","Buenos Aires"], ["Bogota","Sao Paulo"],
  ["Lima","Santiago"],
  ["Buenos Aires","Sao Paulo"],
  ["Sao Paulo","Lagos"],
  ["Lagos","Kinshasa"], ["Lagos","Khartoum"],
  ["Kinshasa","Khartoum"], ["Kinshasa","Johannesburg"],
  ["Khartoum","Johannesburg"], ["Khartoum","Cairo"],
  ["Algiers","Cairo"], ["Algiers","Istanbul"],
  ["Cairo","Istanbul"], ["Cairo","Baghdad"], ["Cairo","Riyadh"],
  ["Istanbul","Baghdad"], ["Istanbul","Moscow"],
  ["Moscow","Tehran"],
  ["Baghdad","Tehran"], ["Baghdad","Riyadh"], ["Baghdad","Karachi"],
  ["Riyadh","Karachi"],
  ["Tehran","Karachi"], ["Tehran","Delhi"],
  ["Karachi","Delhi"], ["Karachi","Mumbai"],
  ["Delhi","Mumbai"], ["Delhi","Chennai"], ["Delhi","Kolkata"],
  ["Mumbai","Chennai"],
  ["Chennai","Kolkata"], ["Chennai","Bangkok"], ["Chennai","Jakarta"],
  ["Kolkata","Bangkok"], ["Kolkata","Hong Kong"],
  ["Beijing","Seoul"], ["Beijing","Shanghai"],
  ["Seoul","Shanghai"], ["Seoul","Tokyo"],
  ["Tokyo","Shanghai"], ["Tokyo","Osaka"],
  ["Shanghai","Hong Kong"], ["Shanghai","Taipei"],
  ["Taipei","Hong Kong"], ["Taipei","Osaka"], ["Taipei","Manila"],
  ["Hong Kong","Bangkok"], ["Hong Kong","Ho Chi Minh City"], ["Hong Kong","Manila"],
  ["Bangkok","Ho Chi Minh City"], ["Bangkok","Jakarta"],
  ["Ho Chi Minh City","Jakarta"], ["Ho Chi Minh City","Manila"],
  ["Manila","Sydney"],
  ["Jakarta","Sydney"],
];

/* Trans-Pacific routes: NOT drawn on the map, but ARE adjacencies. */
const TRANSPACIFIC = [
  ["San Francisco","Tokyo"],
  ["San Francisco","Manila"],
  ["Los Angeles","Sydney"],
];

/* Adjacency: city -> Set(neighbor names). Includes trans-Pacific. */
const ADJACENCY = {};
Object.keys(CITIES).forEach(c => { ADJACENCY[c] = new Set(); });
[...DRAWN_CONNECTIONS, ...TRANSPACIFIC].forEach(([a, b]) => {
  ADJACENCY[a].add(b);
  ADJACENCY[b].add(a);
});

/* ---- Roles (metadata; ability logic lives in rules.js) ------------------ */
/* 2013 edition: 7 roles, one per player. See Rules.md > Roles. */
const ROLES = {
  "Medic":               { color: "#ff7043", blurb: "Treat removes ALL cubes of a color; auto-clears cured cubes on entry." },
  "Scientist":           { color: "#26c6da", blurb: "Needs only 4 same-color cards to cure." },
  "Researcher":          { color: "#8d6e63", blurb: "May give ANY city card when sharing." },
  "Operations Expert":   { color: "#66bb6a", blurb: "Build stations free; 1/turn move from a station to anywhere by discarding any card." },
  "Dispatcher":          { color: "#ec407a", blurb: "Move other pawns; move a pawn to any pawn." },
  "Quarantine Specialist":{ color: "#9ccc65", blurb: "Blocks cubes & outbreaks in their city and neighbors." },
  "Contingency Planner": { color: "#ab47bc", blurb: "Retrieve & store one Event from discard; it leaves the game when used." },
};

/* ---- Event cards (metadata; effect logic lives in rules.js) ------------- */
const EVENTS = {
  "Airlift":              "Move any 1 pawn to any city.",
  "Government Grant":     "Add 1 research station to any city (no discard).",
  "One Quiet Night":      "Skip the next Infect Cities phase.",
  "Resilient Population":  "Remove 1 card from the Infection discard pile from the game.",
  "Forecast":             "Rearrange the top 6 Infection cards.",
};

/* ---- Rules constants ---------------------------------------------------- */
const INFECTION_RATE_TRACK = [2, 2, 2, 3, 3, 4, 4]; // marker index 0..6
const MAX_OUTBREAKS        = 8;   // 8th outbreak = loss
const CUBES_PER_COLOR      = 24;
const MAX_STATIONS         = 6;
const HAND_LIMIT           = 7;
const MAX_CUBES_PER_CITY   = 3;   // 4th cube of a color => outbreak

const EPIDEMICS_BY_DIFFICULTY = { introductory: 4, standard: 5, heroic: 6 };
const STARTING_HAND_BY_PLAYERS = { 2: 4, 3: 3, 4: 2 };

const CURE = { UNCURED: 'uncured', CURED: 'cured', ERADICATED: 'eradicated' };

/* Turn phases the UI switches on. */
const PHASE = {
  SETUP:   'setup',
  ACTIONS: 'actions', // current player has actionsRemaining
  DRAW:    'draw',    // drawing 2 player cards
  INFECT:  'infect',  // infecting cities
  WON:     'won',
  LOST:    'lost',
};

/* =============================================================================
 * CARD SHAPES  (agreed representation — do not diverge)
 *   City card:    { type:'city',     city:'Atlanta', color:'blue' }
 *   Epidemic:     { type:'epidemic' }
 *   Event card:   { type:'event',    name:'Airlift' }
 *   Infection card (separate deck): { city:'Atlanta', color:'blue' }
 *
 * DECK ORDER CONVENTION (both decks):
 *   index 0        = TOP of deck (next to draw)   -> draw with .shift()
 *   last index     = BOTTOM of deck               -> epidemic draws with .pop()
 *   put on top     -> .unshift(card)
 * ===========================================================================*/

/* =============================================================================
 * THE MUTABLE GAME STATE
 * A single object. Modules read it directly; only Rules.* / setup mutate it.
 * ===========================================================================*/
const GameState = {
  phase: PHASE.SETUP,
  difficulty: 'standard',

  // players: [{ id, name, role, location, hand: [card] }]
  players: [],
  currentPlayerIndex: 0,
  actionsRemaining: 4,

  // board: cities[name] = { cubes:{blue,yellow,black,red}, station:bool }
  cities: {},

  // disease
  cures:          { blue: CURE.UNCURED, yellow: CURE.UNCURED, black: CURE.UNCURED, red: CURE.UNCURED },
  cubesRemaining: { blue: CUBES_PER_COLOR, yellow: CUBES_PER_COLOR, black: CUBES_PER_COLOR, red: CUBES_PER_COLOR },
  outbreaks: 0,
  infectionRateIndex: 0,

  // decks (see CARD SHAPES + DECK ORDER above)
  playerDeck: [],
  playerDiscard: [],
  infectionDeck: [],
  infectionDiscard: [],

  // flags / misc
  oneQuietNight: false,   // set by the "One Quiet Night" event; consumed by infect phase
  drawsRemaining: 0,      // player cards left to draw this turn (used during DRAW phase)
  log: [],                // human-readable event log (strings), newest last
};

/* =============================================================================
 * PURE HELPERS (read-only; safe for anyone to call)
 * ===========================================================================*/

/** Current infection rate (cards drawn during infect phase). */
function getInfectionRate() {
  return INFECTION_RATE_TRACK[GameState.infectionRateIndex];
}

/** The player object whose turn it is. */
function getCurrentPlayer() {
  return GameState.players[GameState.currentPlayerIndex];
}

/** Array of city names adjacent to `city` (drive/ferry targets). */
function getAdjacent(city) {
  return ADJACENCY[city] ? [...ADJACENCY[city]] : [];
}

/** Is `a` connected to `b`? */
function isAdjacent(a, b) {
  return !!(ADJACENCY[a] && ADJACENCY[a].has(b));
}

/** City names that currently have a research station. */
function getStations() {
  return Object.keys(GameState.cities).filter(c => GameState.cities[c].station);
}

/** Total cubes of `color` currently on the board. */
function cubesOnBoard(color) {
  return Object.values(GameState.cities).reduce((sum, c) => sum + c.cubes[color], 0);
}

/** Initialize/zero the board: every city 0 cubes, no station (except Atlanta). */
function initBoard() {
  GameState.cities = {};
  Object.keys(CITIES).forEach(name => {
    GameState.cities[name] = {
      cubes: { blue: 0, yellow: 0, black: 0, red: 0 },
      station: false,
    };
  });
  GameState.cities["Atlanta"].station = true;
}

/** Append a message to the game log (shown in the UI). */
function logEvent(msg) {
  GameState.log.push(msg);
}

/* Expose on window so plain <script> modules can reach these without imports. */
window.COLORS = COLORS;
window.COLOR_HEX = COLOR_HEX;
window.CITIES = CITIES;
window.DRAWN_CONNECTIONS = DRAWN_CONNECTIONS;
window.TRANSPACIFIC = TRANSPACIFIC;
window.ADJACENCY = ADJACENCY;
window.ROLES = ROLES;
window.EVENTS = EVENTS;
window.INFECTION_RATE_TRACK = INFECTION_RATE_TRACK;
window.MAX_OUTBREAKS = MAX_OUTBREAKS;
window.CUBES_PER_COLOR = CUBES_PER_COLOR;
window.MAX_STATIONS = MAX_STATIONS;
window.HAND_LIMIT = HAND_LIMIT;
window.MAX_CUBES_PER_CITY = MAX_CUBES_PER_CITY;
window.EPIDEMICS_BY_DIFFICULTY = EPIDEMICS_BY_DIFFICULTY;
window.STARTING_HAND_BY_PLAYERS = STARTING_HAND_BY_PLAYERS;
window.CURE = CURE;
window.PHASE = PHASE;
window.GameState = GameState;
window.getInfectionRate = getInfectionRate;
window.getCurrentPlayer = getCurrentPlayer;
window.getAdjacent = getAdjacent;
window.isAdjacent = isAdjacent;
window.getStations = getStations;
window.cubesOnBoard = cubesOnBoard;
window.initBoard = initBoard;
window.logEvent = logEvent;
