/* =============================================================================
 * cards.js  —  DECKS, DEALING, SHUFFLING  (owner: Tae)
 * -----------------------------------------------------------------------------
 * Builds and manages both decks. See Rules.md > Setup and > Epidemic Cards.
 * Reads/writes GameState.{playerDeck,playerDiscard,infectionDeck,infectionDiscard}.
 *
 * Card shapes & deck order convention are documented in state.js.
 * Everything here is called by Game (setup) and Rules (draw/epidemic).
 *
 * NOTE: implement functions marked TODO. Signatures are the contract — other
 * modules already call these, so keep the names/args stable.
 * ===========================================================================*/

const Cards = {

  /** Fisher–Yates in place. Returns the same array. */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /** One infection card per city: { city, color }. */
  buildInfectionDeck() {
    const deck = Object.keys(CITIES).map(city => ({ city, color: CITIES[city].color }));
    return this.shuffle(deck);
  },

  /** 48 city cards + 5 event cards (NO epidemics yet — added after dealing). */
  buildBasePlayerCards() {
    const cityCards = Object.keys(CITIES).map(city => ({ type: 'city', city, color: CITIES[city].color }));
    const eventCards = Object.keys(EVENTS).map(name => ({ type: 'event', name }));
    return this.shuffle([...cityCards, ...eventCards]);
  },

  /**
   * Setup step 4 — Seed the board (Rules.md > Setup #4).
   * Flip 3 cards -> 3 cubes each, 3 -> 2 cubes, 3 -> 1 cube. Move those 9 to
   * infection discard. Assumes GameState.infectionDeck is already built/shuffled
   * and the board is initialized (initBoard()).
   * Places cubes directly (no outbreak checks — setup can't outbreak).
   */
  seedInitialInfections() {
    // TODO(Tae): for counts [3,2,1], draw 3 cards each from top, add `count`
    // cubes of the card's color to its city, decrement cubesRemaining, and push
    // the card to infectionDiscard.
  },

  /**
   * Setup step 5 — Deal starting hands, then build the player deck with the
   * epidemics spread evenly (Rules.md > Setup #5).
   *  1. Deal STARTING_HAND_BY_PLAYERS[n] cards to each player from base cards.
   *  2. Split the rest into E roughly-equal piles (E = epidemics for difficulty).
   *  3. Shuffle exactly ONE epidemic ({type:'epidemic'}) into each pile.
   *  4. Concatenate piles into GameState.playerDeck (index 0 = top).
   */
  buildPlayerDeckWithEpidemics(numPlayers, difficulty) {
    // TODO(Tae): implement per the steps above. Deal into GameState.players[].hand.
    // Use EPIDEMICS_BY_DIFFICULTY[difficulty] and STARTING_HAND_BY_PLAYERS[numPlayers].
  },

  /** Draw the top player card (index 0). Returns the card or null if empty. */
  drawPlayerCard() {
    return GameState.playerDeck.length ? GameState.playerDeck.shift() : null;
  },

  /** Draw the top infection card (index 0). Returns the card or null if empty. */
  drawInfectionTop() {
    return GameState.infectionDeck.length ? GameState.infectionDeck.shift() : null;
  },

  /** Draw the BOTTOM infection card (used by Epidemic > Infect). */
  drawInfectionBottom() {
    return GameState.infectionDeck.length ? GameState.infectionDeck.pop() : null;
  },

  /** Epidemic > Intensify: shuffle the infection discard, place on TOP of deck. */
  intensify() {
    // TODO(Tae): shuffle GameState.infectionDiscard, unshift each onto
    // GameState.infectionDeck (so they become the new top), then clear discard.
  },

  /** Is the current player over the hand limit? (7 cards) */
  isOverHandLimit(player) {
    return player.hand.length > HAND_LIMIT;
  },
};

window.Cards = Cards;
