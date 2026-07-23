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
    Rules.onEnterCity(player);
    return { ok: true };
  },

  /** Direct Flight: discard the card of the DESTINATION to fly there. */
  directFlight(player, toCity) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    if (toCity === player.location) return { ok: false, reason: 'Already in that city' };
    const idx = this.cityCardIndex(player, toCity);
    if (idx === -1) return { ok: false, reason: `No city card for ${toCity} in hand` };
    const card = player.hand.splice(idx, 1)[0];
    GameState.playerDiscard.push(card);
    player.location = toCity;
    GameState.actionsRemaining--;
    logEvent(`${player.name} flew directly to ${toCity}`);
    Rules.onEnterCity(player);
    return { ok: true };
  },

  /** Charter Flight: discard the card of the CURRENT city to fly anywhere. */
  charterFlight(player, toCity) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    if (toCity === player.location) return { ok: false, reason: 'Already in that city' };
    const idx = this.cityCardIndex(player, player.location);
    if (idx === -1) return { ok: false, reason: `No city card for ${player.location} in hand` };
    const card = player.hand.splice(idx, 1)[0];
    GameState.playerDiscard.push(card);
    player.location = toCity;
    GameState.actionsRemaining--;
    logEvent(`${player.name} chartered a flight to ${toCity}`);
    Rules.onEnterCity(player);
    return { ok: true };
  },

  /** Shuttle Flight: between two cities that BOTH have research stations. */
  shuttleFlight(player, toCity) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    if (toCity === player.location) return { ok: false, reason: 'Already in that city' };
    if (!GameState.cities[player.location] || !GameState.cities[player.location].station)
      return { ok: false, reason: 'No research station in current city' };
    if (!GameState.cities[toCity] || !GameState.cities[toCity].station)
      return { ok: false, reason: `No research station in ${toCity}` };
    player.location = toCity;
    GameState.actionsRemaining--;
    logEvent(`${player.name} shuttled to ${toCity}`);
    Rules.onEnterCity(player);
    return { ok: true };
  },

  /* ======================================================================
   * OTHER ACTIONS  (Rules.md > Turn Structure > Other)
   * ==================================================================== */

  /** Build a research station at the player's city (discard matching card;
   *  Operations Expert builds free). Max 6 — if 6 exist, must remove one. */
  buildStation(player, removeFromCity /* required when at max */) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    const city = player.location;
    if (GameState.cities[city].station) return { ok: false, reason: 'Research station already here' };

    const isOpsExpert = player.role === 'Operations Expert';
    let cardIdx = -1;
    if (!isOpsExpert) {
      cardIdx = this.cityCardIndex(player, city);
      if (cardIdx === -1) return { ok: false, reason: `No city card for ${city} in hand` };
    }

    const stations = getStations();
    if (stations.length >= MAX_STATIONS) {
      if (!removeFromCity) return { ok: false, reason: `Max ${MAX_STATIONS} stations on board — specify which to remove` };
      if (!GameState.cities[removeFromCity] || !GameState.cities[removeFromCity].station)
        return { ok: false, reason: `No research station in ${removeFromCity}` };
      GameState.cities[removeFromCity].station = false;
      logEvent(`Research station removed from ${removeFromCity}`);
    }

    if (!isOpsExpert) {
      const card = player.hand.splice(cardIdx, 1)[0];
      GameState.playerDiscard.push(card);
    }

    GameState.cities[city].station = true;
    GameState.actionsRemaining--;
    logEvent(`${player.name} built a research station in ${city}`);
    return { ok: true };
  },

  /** Treat Disease: remove 1 cube of `color` from the player's city.
   *  If that disease is CURED: remove ALL cubes of that color from the city.
   *  Medic: always removes ALL cubes of the color. Then checkEradication. */
  treatDisease(player, color) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    const city = player.location;
    const cubes = GameState.cities[city].cubes[color];
    if (cubes === 0) return { ok: false, reason: `No ${color} cubes in ${city}` };

    const cured  = GameState.cures[color] !== CURE.UNCURED;
    const isMedic = player.role === 'Medic';
    const toRemove = (isMedic || cured) ? cubes : 1;

    GameState.cities[city].cubes[color] -= toRemove;
    GameState.cubesRemaining[color] += toRemove;
    GameState.actionsRemaining--;
    logEvent(`${player.name} treated ${toRemove} ${color} cube(s) in ${city}`);
    Rules.checkEradication(color);
    return { ok: true };
  },

  /** Share Knowledge: give/take the card matching the shared city.
   *  Researcher (giver) may give ANY city card. Both players same city. */
  shareKnowledge(fromPlayer, toPlayer, card) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    if (fromPlayer.location !== toPlayer.location)
      return { ok: false, reason: 'Both players must be in the same city' };

    const idx = fromPlayer.hand.indexOf(card);
    if (idx === -1) return { ok: false, reason: 'Card not in that player\'s hand' };

    const isResearcher = fromPlayer.role === 'Researcher';
    if (!isResearcher) {
      if (card.type !== 'city' || card.city !== fromPlayer.location)
        return { ok: false, reason: `Can only share the card matching the current city (${fromPlayer.location})` };
    }

    fromPlayer.hand.splice(idx, 1);
    toPlayer.hand.push(card);
    GameState.actionsRemaining--;
    logEvent(`${fromPlayer.name} gave ${card.city || card.name} to ${toPlayer.name}`);
    return { ok: true };
  },

  /** Discover a Cure: at a station, discard 5 same-color city cards
   *  (Scientist: 4). Flip cure marker; may trigger eradication if 0 cubes out. */
  discoverCure(player, color, cardsToSpend /* array of 5 (or 4) city cards */) {
    if (GameState.actionsRemaining <= 0) return { ok: false, reason: 'No actions left' };
    if (!GameState.cities[player.location] || !GameState.cities[player.location].station)
      return { ok: false, reason: 'Must be at a research station to discover a cure' };
    if (GameState.cures[color] !== CURE.UNCURED)
      return { ok: false, reason: `${color} disease is already cured` };

    const required = player.role === 'Scientist' ? 4 : 5;
    if (!Array.isArray(cardsToSpend) || cardsToSpend.length !== required)
      return { ok: false, reason: `Must discard exactly ${required} ${color} city cards` };

    for (const card of cardsToSpend) {
      if (card.type !== 'city' || card.color !== color)
        return { ok: false, reason: `All cards must be ${color} city cards` };
      if (!player.hand.includes(card))
        return { ok: false, reason: `Card for ${card.city} is not in your hand` };
    }

    // Discard all
    cardsToSpend.forEach(card => {
      const idx = player.hand.indexOf(card);
      player.hand.splice(idx, 1);
      GameState.playerDiscard.push(card);
    });

    GameState.cures[color] = CURE.CURED;
    GameState.actionsRemaining--;
    logEvent(`${player.name} discovered a cure for ${color}!`);
    Rules.checkEradication(color);
    Rules.checkWin();
    return { ok: true };
  },

  /** Hook run whenever a player enters a city (Medic auto-removes cured cubes). */
  onEnterCity(player) {
    if (player.role !== 'Medic') return;
    const city = player.location;
    COLORS.forEach(color => {
      if (GameState.cures[color] === CURE.UNCURED) return;
      const cubes = GameState.cities[city].cubes[color];
      if (cubes > 0) {
        GameState.cities[city].cubes[color] = 0;
        GameState.cubesRemaining[color] += cubes;
        logEvent(`Medic auto-cleared ${cubes} ${color} cube(s) in ${city}`);
        Rules.checkEradication(color);
      }
    });
  },

  /* ======================================================================
   * DRAW PHASE  (Rules.md > Phase 2)  — called by Game after actions.
   * Returns { ok, drewEpidemic, lost }
   * ==================================================================== */
  drawPlayerCards(player) {
    let drewEpidemic = false;
    for (let i = 0; i < 2; i++) {
      const card = Cards.drawPlayerCard();
      if (card === null) {
        GameState.phase = PHASE.LOST;
        logEvent('Player deck empty — game lost!');
        return { ok: false, lost: true, drewEpidemic };
      }
      if (card.type === 'epidemic') {
        drewEpidemic = true;
        Rules.resolveEpidemic();
        // Epidemic cards do not enter the hand
      } else {
        player.hand.push(card);
      }
      if (GameState.phase === PHASE.LOST) return { ok: false, lost: true, drewEpidemic };
    }
    return { ok: true, drewEpidemic, lost: false };
  },

  /* ======================================================================
   * EPIDEMIC  (Rules.md > Epidemic Cards) — order: Increase, Infect, Intensify
   * ==================================================================== */
  resolveEpidemic() {
    // 1. Increase
    GameState.infectionRateIndex = Math.min(
      GameState.infectionRateIndex + 1,
      INFECTION_RATE_TRACK.length - 1
    );

    // 2. Infect — draw the BOTTOM card, place 3 cubes
    const card = Cards.drawInfectionBottom();
    if (card) {
      Rules.infectCity(card.city, card.color, 3);
      GameState.infectionDiscard.push(card);
    }

    // 3. Intensify — shuffle discard, put on top of deck
    Cards.intensify();

    logEvent(`EPIDEMIC! Infection rate now ${getInfectionRate()}.`);
  },

  /* ======================================================================
   * INFECT PHASE  (Rules.md > Phase 3) — called by Game.
   * ==================================================================== */

  /** Draw `getInfectionRate()` infection cards, infect each city by 1 cube.
   *  Skips entirely if GameState.oneQuietNight (then clears the flag). */
  runInfectPhase() {
    if (GameState.oneQuietNight) {
      GameState.oneQuietNight = false;
      logEvent('One Quiet Night: infection phase skipped.');
      return;
    }
    const rate = getInfectionRate();
    for (let i = 0; i < rate; i++) {
      if (GameState.phase === PHASE.LOST) break;
      const card = Cards.drawInfectionTop();
      if (card) {
        Rules.infectCity(card.city, card.color, 1);
        GameState.infectionDiscard.push(card);
      }
    }
  },

  /* ======================================================================
   * INFECT A CITY + OUTBREAK CHAIN  (Rules.md > Outbreaks)  ⚠ HARDEST
   * ==================================================================== */

  /**
   * Add `amount` cubes of `color` to `city`, capping at MAX_CUBES_PER_CITY (3)
   * and triggering outbreak chains as needed.
   *
   * Rules:
   *  - Eradicated color -> no cubes placed.
   *  - Quarantine Specialist blocks cubes + outbreaks in their city AND neighbors.
   *  - city.cubes[color] caps at 3. Trying to add a 4th -> OUTBREAK:
   *      * do NOT add the 4th cube
   *      * outbreaks++ (if >= MAX_OUTBREAKS -> LOSS)
   *      * spread 1 cube to each adjacent city
   *      * chains: neighbor that would also outbreak does so too
   *      * each city outbreaks AT MOST ONCE per chain (alreadyOutbroken Set)
   *  - cubesRemaining[color] < needed -> LOSS.
   *
   * `alreadyOutbroken` is a Set of city names; created on the first call,
   * threaded through all recursive spread calls.
   */
  infectCity(city, color, amount, alreadyOutbroken) {
    if (GameState.phase === PHASE.LOST) return;

    // Eradicated: skip entirely
    if (GameState.cures[color] === CURE.ERADICATED) return;

    // Quarantine Specialist: blocks cubes & outbreaks in their city AND neighbors
    const qs = GameState.players.find(p => p.role === 'Quarantine Specialist');
    if (qs && (qs.location === city || isAdjacent(qs.location, city))) return;

    // First call creates the chain-tracking Set
    if (!alreadyOutbroken) alreadyOutbroken = new Set();

    const cityState = GameState.cities[city];
    const current  = cityState.cubes[color];
    const space    = MAX_CUBES_PER_CITY - current; // how many more fit

    if (amount <= space) {
      // Normal placement — all cubes fit
      if (GameState.cubesRemaining[color] < amount) {
        GameState.phase = PHASE.LOST;
        logEvent(`No ${color} cubes remaining — game lost!`);
        return;
      }
      cityState.cubes[color] += amount;
      GameState.cubesRemaining[color] -= amount;
    } else {
      // Fill the city to 3, then OUTBREAK
      const toPlace = space;
      if (toPlace > 0) {
        if (GameState.cubesRemaining[color] < toPlace) {
          GameState.phase = PHASE.LOST;
          logEvent(`No ${color} cubes remaining — game lost!`);
          return;
        }
        cityState.cubes[color] = MAX_CUBES_PER_CITY;
        GameState.cubesRemaining[color] -= toPlace;
      }

      // Outbreak — only if this city hasn't already outbroken this chain
      if (!alreadyOutbroken.has(city)) {
        alreadyOutbroken.add(city);
        GameState.outbreaks++;
        logEvent(`OUTBREAK in ${city} (${color})! Total outbreaks: ${GameState.outbreaks}`);

        if (GameState.outbreaks >= MAX_OUTBREAKS) {
          GameState.phase = PHASE.LOST;
          logEvent(`${MAX_OUTBREAKS} outbreaks — game lost!`);
          return;
        }

        // Spread 1 cube to each adjacent city
        const neighbors = getAdjacent(city);
        for (const neighbor of neighbors) {
          if (GameState.phase === PHASE.LOST) break;
          Rules.infectCity(neighbor, color, 1, alreadyOutbroken);
        }
      }
      // If already outbroken in this chain: silently ignore the extra placement
    }
  },

  /* ======================================================================
   * ERADICATION + END-GAME CHECKS
   * ==================================================================== */

  /** If `color` is CURED and 0 cubes of it are on the board -> ERADICATED. */
  checkEradication(color) {
    if (GameState.cures[color] === CURE.CURED && cubesOnBoard(color) === 0) {
      GameState.cures[color] = CURE.ERADICATED;
      logEvent(`${color} disease eradicated!`);
    }
  },

  /** Win = all 4 diseases cured (or eradicated). Sets PHASE.WON if so. */
  checkWin() {
    const done = COLORS.every(c => GameState.cures[c] !== CURE.UNCURED);
    if (done) { GameState.phase = PHASE.WON; logEvent('All diseases cured — YOU WIN!'); }
    return done;
  },

  /* ======================================================================
   * EVENT CARDS  (Rules.md > Event Cards) — free, playable anytime.
   * No action cost. Can be played by ANY player on ANY turn.
   * ==================================================================== */
  playEvent(player, eventName, params) {
    // Find and consume the event card
    const handIdx = player.hand.findIndex(c => c.type === 'event' && c.name === eventName);
    if (handIdx !== -1) {
      const card = player.hand.splice(handIdx, 1)[0];
      GameState.playerDiscard.push(card);
    } else if (player.role === 'Contingency Planner' && player.storedEvent?.name === eventName) {
      // Contingency Planner's stored card leaves the game (not to discard)
      player.storedEvent = null;
    } else {
      return { ok: false, reason: `${eventName} not in hand` };
    }

    switch (eventName) {
      case 'Airlift': {
        // params: { playerId, toCity }
        const target = GameState.players.find(p => p.id === params.playerId);
        if (!target) return { ok: false, reason: 'Player not found' };
        target.location = params.toCity;
        Rules.onEnterCity(target);
        logEvent(`Airlift: ${target.name} moved to ${params.toCity}`);
        break;
      }
      case 'Government Grant': {
        // params: { city }
        if (!GameState.cities[params.city]) return { ok: false, reason: `Unknown city: ${params.city}` };
        if (GameState.cities[params.city].station) return { ok: false, reason: 'Research station already there' };
        if (getStations().length >= MAX_STATIONS) return { ok: false, reason: `Max ${MAX_STATIONS} stations on board` };
        GameState.cities[params.city].station = true;
        logEvent(`Government Grant: research station built in ${params.city}`);
        break;
      }
      case 'One Quiet Night': {
        GameState.oneQuietNight = true;
        logEvent('One Quiet Night: next infect phase will be skipped.');
        break;
      }
      case 'Resilient Population': {
        // params: { city } — remove that city's card from the infection discard
        const discardIdx = GameState.infectionDiscard.findIndex(c => c.city === params.city);
        if (discardIdx === -1) return { ok: false, reason: `${params.city} not in infection discard` };
        GameState.infectionDiscard.splice(discardIdx, 1);
        logEvent(`Resilient Population: ${params.city} removed from infection discard.`);
        break;
      }
      case 'Forecast': {
        // params: { newOrder } — array of up to 6 infection cards in desired order
        if (!Array.isArray(params.newOrder))
          return { ok: false, reason: 'Forecast requires a newOrder array' };
        const count = Math.min(params.newOrder.length, 6, GameState.infectionDeck.length);
        // Replace the top `count` cards with the caller-supplied order
        GameState.infectionDeck.splice(0, count, ...params.newOrder.slice(0, count));
        logEvent('Forecast: top infection cards reordered.');
        break;
      }
      default:
        return { ok: false, reason: `Unknown event card: ${eventName}` };
    }
    return { ok: true };
  },
};

window.Rules = Rules;
