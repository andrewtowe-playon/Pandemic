/* =============================================================================
 * test/paths.test.js  —  coverage for paths the other suites miss
 * -----------------------------------------------------------------------------
 * Added in the 2026-07-23 audit. Fills three gaps found there:
 *   1. the WIN path was never exercised anywhere (the fuzz bot only ever loses);
 *   2. several movement/build paths had no direct assertions;
 *   3. the turn-summary + hand-limit MODALS were stubbed in the harness, so
 *      their real render code never ran in any test.
 * Everything here is logic-level (DOM is shimmed).
 * ===========================================================================*/
const { loadGame } = require('./harness');

/** Fresh game; returns the sandbox. */
function fresh(roles = ['Medic', 'Scientist'], names = ['A', 'B'], seed = 7) {
  const g = loadGame({ seed });
  g.Game.newGame({ numPlayers: roles.length, difficulty: 'introductory', roles, names });
  return g;
}
const cityCard = (city, color) => ({ type: 'city', city, color });

function runPathsTests() {
  const results = [];
  const check = (label, cond) => results.push({ label, ok: !!cond });

  /* ===================================================================
   * WIN PATH — cure all four diseases → PHASE.WON, victory modal renders
   * =================================================================== */
  {
    const g = fresh(['Scientist', 'Scientist']); // Scientist cures with 4
    const { GameState, Rules, PHASE, COLORS, getCurrentPlayer } = g;
    const p = getCurrentPlayer();
    // Stand on Atlanta's research station; hand-limit is irrelevant to a direct
    // Rules.discoverCure call, so load 4 distinct cards per color.
    p.location = 'Atlanta';
    const perColor = {};
    COLORS.forEach((c, ci) => {
      perColor[c] = [0, 1, 2, 3].map(n => cityCard(`${c}-${n}`, c));
    });
    p.hand = COLORS.flatMap(c => perColor[c]);

    let curedCount = 0;
    COLORS.forEach(c => {
      GameState.actionsRemaining = 4;            // as if a fresh turn each cure
      const r = Rules.discoverCure(p, c, perColor[c]);
      if (r.ok) curedCount++;
    });
    check('win: all 4 cures succeeded', curedCount === 4);
    check('win: every disease cured/eradicated', COLORS.every(c => GameState.cures[c] !== 'uncured'));
    check('win: phase is WON', GameState.phase === PHASE.WON);

    // The victory modal path must render without throwing (uses THEME.endgame).
    let threw = false;
    try { g.Controls.showEndGame(); } catch (e) { threw = true; }
    check('win: victory modal renders without throwing', !threw);
  }

  /* ===================================================================
   * MOVEMENT PATHS — direct / charter / shuttle flight (success + illegal)
   * =================================================================== */
  {
    const g = fresh();
    const { GameState, Rules, getCurrentPlayer } = g;
    const p = getCurrentPlayer(); // Medic @ Atlanta

    // Direct Flight: discard destination card to fly there (non-adjacent).
    GameState.actionsRemaining = 4;
    const tokyo = cityCard('Tokyo', 'red');
    p.hand = [tokyo];
    const rd = Rules.directFlight(p, 'Tokyo');
    check('directFlight: flew to Tokyo', rd.ok && p.location === 'Tokyo');
    check('directFlight: card discarded', GameState.playerDiscard.includes(tokyo) && !p.hand.includes(tokyo));
    const rdBad = Rules.directFlight(p, 'Paris'); // no Paris card
    check('directFlight: rejected without the destination card', rdBad.ok === false);

    // Charter Flight: discard the CURRENT-city card to fly anywhere.
    GameState.actionsRemaining = 4;
    const cur = cityCard(p.location, 'red');
    p.hand = [cur];
    const rc = Rules.charterFlight(p, 'Santiago');
    check('charterFlight: flew anywhere using current-city card', rc.ok && p.location === 'Santiago');

    // Shuttle Flight: between two research stations.
    GameState.actionsRemaining = 4;
    GameState.cities['Santiago'].station = true;
    GameState.cities['Atlanta'].station = true; // (already true, explicit)
    const rs = Rules.shuttleFlight(p, 'Atlanta');
    check('shuttleFlight: hopped between stations', rs.ok && p.location === 'Atlanta');
    GameState.actionsRemaining = 4;
    const rsBad = Rules.shuttleFlight(p, 'Lima'); // Lima has no station
    check('shuttleFlight: rejected without a station at the destination', rsBad.ok === false);
  }

  /* ===================================================================
   * BUILD STATION — matching card required (non–Ops Expert)
   * =================================================================== */
  {
    const g = fresh();
    const { GameState, Rules, getCurrentPlayer } = g;
    const p = getCurrentPlayer();
    p.location = 'Paris';
    GameState.actionsRemaining = 4;
    const rNoCard = Rules.buildStation(p);
    check('buildStation: rejected without the city card', rNoCard.ok === false);
    const paris = cityCard('Paris', 'blue');
    p.hand = [paris];
    const rOk = Rules.buildStation(p);
    check('buildStation: built with matching card', rOk.ok && GameState.cities['Paris'].station === true);
    check('buildStation: card discarded', GameState.playerDiscard.includes(paris));
  }

  /* ===================================================================
   * EVENT CARDS — the two params-light ones end-to-end via Rules.playEvent
   * (Forecast/Resilient/Airlift param validation lives in rules-audit.test.js)
   * =================================================================== */
  {
    const g = fresh();
    const { GameState, Rules, getCurrentPlayer } = g;
    const p = getCurrentPlayer();

    const oqn = { type: 'event', name: 'One Quiet Night' };
    p.hand = [oqn];
    const r1 = Rules.playEvent(p, 'One Quiet Night', {});
    check('event: One Quiet Night sets the skip flag', r1.ok && GameState.oneQuietNight === true);
    check('event: One Quiet Night card discarded', GameState.playerDiscard.includes(oqn));

    const grant = { type: 'event', name: 'Government Grant' };
    p.hand = [grant];
    const before = g.getStations().length;
    const r2 = Rules.playEvent(p, 'Government Grant', { city: 'Lima' });
    check('event: Government Grant builds a free station', r2.ok && GameState.cities['Lima'].station === true);
    check('event: station count increased by 1', g.getStations().length === before + 1);
  }

  /* ===================================================================
   * PLAYER-CARD CONSERVATION — incl. the epidemic-discard fix
   * (drawing an Epidemic must not make a card vanish)
   * =================================================================== */
  {
    const g = fresh(['Medic', 'Scientist'], ['A', 'B']);
    const { GameState, Rules, getCurrentPlayer } = g;
    const countAll = () =>
      GameState.playerDeck.length +
      GameState.playerDiscard.length +
      GameState.players.reduce((n, pl) => n + pl.hand.length + (pl.storedEvent ? 1 : 0), 0);
    const total = countAll();
    // Force an epidemic on the next draw.
    GameState.playerDeck.unshift({ type: 'epidemic' });
    GameState.playerDeck.unshift(cityCard('Miami', 'yellow'));
    const before = countAll();               // +2 (we injected two cards)
    const r = Rules.drawPlayerCards(getCurrentPlayer());
    check('conservation: epidemic drew + resolved', r.drewEpidemic === true);
    check('conservation: no player card vanished after an epidemic',
      countAll() === before);                // epidemic went to discard, not nowhere
    check('conservation: baseline sane (>= 53 + epidemics)', total >= 53);
  }

  /* ===================================================================
   * REAL MODAL RENDER — the turn-summary + hand-limit modals were stubbed
   * in the harness; call the REAL implementations against the DOM shim to
   * prove their render code doesn't throw (catches THEME/DOM regressions).
   * =================================================================== */
  {
    const g = fresh();
    const { GameState, getCurrentPlayer } = g;
    const p = getCurrentPlayer();
    let threwSummary = false, threwDiscard = false;
    try {
      g.Controls._realShowTurnSummary(
        [cityCard('Paris', 'blue'), { type: 'event', name: 'Airlift' }],
        true,
        [cityCard('Cairo', 'black')],
        () => {}
      );
    } catch (e) { threwSummary = true; }
    check('modal: real showTurnSummary renders without throwing', !threwSummary);

    try {
      p.hand = Array.from({ length: 9 }, (_, i) => cityCard(`c${i}`, 'blue'));
      g.Controls._realPromptDiscard(p, () => {});
    } catch (e) { threwDiscard = true; }
    check('modal: real promptDiscard renders without throwing', !threwDiscard);
  }

  return results;
}

module.exports = { runPathsTests };
