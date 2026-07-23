/* =============================================================================
 * rules.js  —  THE RULES ENGINE  (owner: Andrew — core + hardest)
 * -----------------------------------------------------------------------------
 * The single source of game-rule truth in code. Everything that CHANGES the
 * game according to the rules lives here. UI/controls call these; they mutate
 * GameState and return a result. After any mutation, the caller calls
 * Render.render().
 *
 * CONTRACT for action functions:
 *   - Each returns { ok:true } on success, or { ok:false, reason:'...' } if
 *     illegal (so controls.js can show a toast and NOT spend an action).
 *   - Each successful ACTION decrements GameState.actionsRemaining by 1
 *     (except free things: playing events, Operations Expert build, etc. —
 *      follow Rules.md).
 *   - Validate first, mutate second. Never mutate on an illegal action.
 *
 * Must match Rules.md exactly. The genuinely hard parts (flagged below):
 *   resolveEpidemic, infectCity + outbreak CHAIN, checkEradication, loss checks.
 * ===========================================================================*/

const Rules = {

  /* ---- small shared helpers -------------------------------------------- */

  /** Does `player` hold the city card for `city`? Returns index or -1. */
  cityCardIndex(player, city) {
    return player.hand.findIndex(c => c.type === 'city' && c.city === city);
  },

  /* ======================================================================
   * MOVEMENT ACTIONS  (Rules.md > Turn Structure > Movement)
   * Each costs 1 action.
   * ==================================================================== */

  /** Drive/Ferry: move to an ADJACENT city. */
  drive(player, toCity) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    if (!isAdjacent(player.location, toCity)) return { ok: false, reason: `${toCity} is not connected` };
    player.location = toCity;
    GameState.actionsRemaining--;
    logEvent(`${player.name} drove to ${toCity}`);
    Rules.onEnterCity(player); // Medic auto-clear, etc.
    return { ok: true };
  },

  /** Direct Flight: discard the card of the DESTINATION to fly there. */
  directFlight(player, toCity) {
    // TODO(Andrew): check actions>0; find city card for toCity; discard it;
    // move; decrement; onEnterCity.
    return { ok: false, reason: 'not implemented' };
  },

  /** Charter Flight: discard the card of the CURRENT city to fly anywhere. */
  charterFlight(player, toCity) {
    // TODO(Andrew): needs the card matching player.location.
    return { ok: false, reason: 'not implemented' };
  },

  /** Shuttle Flight: between two cities that BOTH have research stations. */
  shuttleFlight(player, toCity) {
    // TODO(Andrew): current + destination must both have stations.
    return { ok: false, reason: 'not implemented' };
  },

  /* ======================================================================
   * OTHER ACTIONS  (Rules.md > Turn Structure > Other)
   * ==================================================================== */

  /** Build a research station at the player's city (discard matching card;
   *  Operations Expert builds free). Max 6 — if 6 exist, must remove one. */
  buildStation(player, removeFromCity /* optional when at max */) {
    // TODO(Andrew): station rules + MAX_STATIONS handling.
    return { ok: false, reason: 'not implemented' };
  },

  /** Treat Disease: remove 1 cube of `color` from the player's city.
   *  If that disease is CURED: remove ALL cubes of that color from the city.
   *  Medic: always removes ALL cubes of the color. Then checkEradication. */
  treatDisease(player, color) {
    // TODO(Andrew): validate cube present; compute how many to remove per rules
    // above; update city.cubes + cubesRemaining; decrement action;
    // call Rules.checkEradication(color).
    return { ok: false, reason: 'not implemented' };
  },

  /** Share Knowledge: give/take the card matching the shared city.
   *  Researcher (giver) may give ANY city card. Both players same city. */
  shareKnowledge(fromPlayer, toPlayer, card) {
    // TODO(Andrew): same-city check; card legality (matching-city, or any if
    // giver is Researcher); move card; enforce hand limit on receiver later.
    return { ok: false, reason: 'not implemented' };
  },

  /** Discover a Cure: at a station, discard 5 same-color city cards
   *  (Scientist: 4). Flip cure marker; may trigger eradication if 0 cubes out. */
  discoverCure(player, color, cardsToSpend /* array of 5 (or 4) city cards */) {
    // TODO(Andrew): station check; count/color check (4 if Scientist else 5);
    // discard the cards; set GameState.cures[color]=CURE.CURED; decrement action;
    // checkEradication(color); then Rules.checkWin().
    return { ok: false, reason: 'not implemented' };
  },

  /** Hook run whenever a player enters a city (Medic auto-removes cured cubes). */
  onEnterCity(player) {
    // TODO(Andrew): if player.role === 'Medic', remove all cubes of every CURED
    // color from player.location (no action cost); checkEradication for each.
  },

  /* ======================================================================
   * DRAW PHASE  (Rules.md > Phase 2)  — called by Game after actions.
   * ==================================================================== */

  /** Draw the 2 player cards for the current player, resolving epidemics.
   *  Returns { ok, drewEpidemic, lost } — lost=true if deck ran out. */
  drawPlayerCards(player) {
    // TODO(Andrew): draw 2 via Cards.drawPlayerCard(); if null -> LOSS
    // (GameState.phase = PHASE.LOST). If a card is {type:'epidemic'} ->
    // Rules.resolveEpidemic() then discard it (epidemics don't enter hand).
    // Otherwise push to player.hand. Hand-limit enforcement handled by controls.
    return { ok: false, reason: 'not implemented' };
  },

  /* ======================================================================
   * EPIDEMIC  (Rules.md > Epidemic Cards) — order: Increase, Infect, Intensify
   * ==================================================================== */
  resolveEpidemic() {
    // TODO(Andrew):
    // 1. Increase: GameState.infectionRateIndex = min(index+1, track.length-1).
    // 2. Infect: card = Cards.drawInfectionBottom(); place 3 cubes of its color
    //    on card.city via Rules.infectCity(card.city, card.color, 3);
    //    push card to infectionDiscard.
    // 3. Intensify: Cards.intensify().
    logEvent('EPIDEMIC!');
  },

  /* ======================================================================
   * INFECT PHASE  (Rules.md > Phase 3) — called by Game.
   * ==================================================================== */

  /** Draw `getInfectionRate()` cards from the top and infect each (1 cube).
   *  Skips entirely if GameState.oneQuietNight (then clears the flag). */
  runInfectPhase() {
    // TODO(Andrew): honor oneQuietNight; else draw N=getInfectionRate() top
    // cards, infectCity(card.city, card.color, 1), push to infectionDiscard.
  },

  /* ======================================================================
   * INFECT A CITY + OUTBREAK CHAIN  (Rules.md > Outbreaks)  ⚠ HARDEST
   * ==================================================================== */

  /**
   * Add `amount` cubes of `color` to `city`, capping at 3 and triggering
   * outbreak chains. This is the trickiest function in the codebase.
   *
   * Rules (Rules.md > Outbreaks):
   *  - Eradicated color -> place nothing.
   *  - Quarantine Specialist: no cubes/outbreaks in their city or its neighbors.
   *  - A city holds max 3 cubes of a color. Adding beyond 3 => OUTBREAK:
   *      * do not add the 4th cube
   *      * outbreaks++ (if reaches MAX_OUTBREAKS => LOSS)
   *      * add 1 cube of `color` to EVERY adjacent city
   *      * chains: a neighbor pushed past 3 also outbreaks
   *      * each city outbreaks AT MOST ONCE per chain (track visited set)
   *  - If cubesRemaining[color] hits 0 when a cube is needed => LOSS.
   *
   * Suggested approach: a queue/worklist of cities to outbreak, plus a Set of
   * cities that have already outbroken this chain.
   */
  infectCity(city, color, amount, alreadyOutbroken /* Set, internal */) {
    // TODO(Andrew): implement the chain carefully. Update GameState.cities,
    // GameState.cubesRemaining, GameState.outbreaks. Set PHASE.LOST on cube-out
    // or 8th outbreak.
  },

  /* ======================================================================
   * ERADICATION + END-GAME CHECKS
   * ==================================================================== */

  /** If `color` is CURED and 0 cubes of it are on the board -> ERADICATED. */
  checkEradication(color) {
    // TODO(Andrew): if GameState.cures[color]===CURE.CURED && cubesOnBoard(color)===0
    // set GameState.cures[color] = CURE.ERADICATED.
  },

  /** Win = all 4 diseases cured (or eradicated). Sets PHASE.WON if so. */
  checkWin() {
    const done = COLORS.every(c => GameState.cures[c] !== CURE.UNCURED);
    if (done) { GameState.phase = PHASE.WON; logEvent('All diseases cured — YOU WIN!'); }
    return done;
  },

  /* ======================================================================
   * EVENT CARDS  (Rules.md > Event Cards) — free, playable anytime.
   * ==================================================================== */
  playEvent(player, eventName, params) {
    // TODO(Andrew): switch on eventName -> Airlift, Government Grant,
    // One Quiet Night (set GameState.oneQuietNight=true), Resilient Population,
    // Forecast. Remove the event card from player.hand to playerDiscard
    // (or from-game for Contingency Planner's stored card).
    return { ok: false, reason: 'not implemented' };
  },
};

window.Rules = Rules;
