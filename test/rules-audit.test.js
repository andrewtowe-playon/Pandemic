/* =============================================================================
 * test/rules-audit.test.js  —  regression tests from the rules audit
 * -----------------------------------------------------------------------------
 * One test per finding from the 2026-07-23 rules audit, so none of these can
 * silently regress. Each block rigs GameState directly, then asserts the rule.
 * ===========================================================================*/
const { loadGame } = require('./harness');

/** Fresh 2-player game with known roles; returns the sandbox. */
function fresh(roles = ['Medic', 'Scientist'], names = ['P1', 'P2']) {
  const g = loadGame();
  g.Game.newGame({ numPlayers: roles.length, difficulty: 'introductory', roles, names });
  return g;
}

function runRulesAuditTests() {
  const results = [];
  const check = (label, cond) => results.push({ label, ok: !!cond });

  // ---- B1: invalid event play must NOT consume the card -------------------
  {
    const g = fresh();
    const p = g.getCurrentPlayer();
    const grant = { type: 'event', name: 'Government Grant' };
    p.hand = [grant]; // isolate: exactly one Government Grant (a dealt hand may contain one)
    const r = g.Rules.playEvent(p, 'Government Grant', { city: 'Atlanta' }); // Atlanta already has a station
    check('B1: invalid Government Grant rejected', r.ok === false);
    check('B1: event card NOT consumed on invalid play', p.hand.includes(grant));
    const r2 = g.Rules.playEvent(p, 'Government Grant', { city: 'Miami' });
    check('B1: valid Government Grant still works', r2.ok === true && g.GameState.cities['Miami'].station === true);
    check('B1: card consumed on valid play', !p.hand.includes(grant));
  }

  // ---- B2: Forecast must be a permutation of the actual top cards ---------
  {
    const g = fresh();
    const p = g.getCurrentPlayer();
    p.hand = [{ type: 'event', name: 'Forecast' }]; // isolate (dealt hand may also contain Forecast)
    const before = g.GameState.infectionDeck.map(c => c.city);
    const fake = Array.from({ length: 6 }, () => ({ city: 'Atlanta', color: 'blue' }));
    const r = g.Rules.playEvent(p, 'Forecast', { newOrder: fake });
    check('B2: Forecast rejects non-permutation', r.ok === false);
    check('B2: deck unchanged after rejected Forecast', g.GameState.infectionDeck.map(c => c.city).join() === before.join());
    const top6 = g.GameState.infectionDeck.slice(0, 6);
    const r2 = g.Rules.playEvent(p, 'Forecast', { newOrder: [...top6].reverse() });
    check('B2: Forecast accepts a true permutation', r2.ok === true);
    check('B2: reorder applied', g.GameState.infectionDeck[0].city === before[5]);
    check('B2: infection cards still total 48', g.GameState.infectionDeck.length + g.GameState.infectionDiscard.length === 48);
  }

  // ---- B3: discoverCure rejects duplicate card references ------------------
  {
    const g = fresh(['Scientist', 'Medic']);
    const p = g.getCurrentPlayer(); // Scientist (needs 4)
    const cards = ['Chicago', 'Montreal', 'New York'].map(city => ({ type: 'city', city, color: 'blue' }));
    p.hand = [...cards, { type: 'city', city: 'Paris', color: 'blue' }];
    const handBefore = p.hand.length;
    const dup = [cards[0], cards[0], cards[1], cards[2]]; // same object twice
    const r = g.Rules.discoverCure(p, 'blue', dup);
    check('B3: duplicate cards rejected', r.ok === false);
    check('B3: hand untouched after rejection', p.hand.length === handBefore);
    check('B3: blue not cured', g.GameState.cures.blue === 'uncured');
  }

  // ---- B4: Share Knowledge is city-cards-only (even for Researcher) -------
  {
    const g = fresh(['Researcher', 'Medic']);
    const [res, medic] = g.GameState.players;
    const ev = { type: 'event', name: 'Airlift' };
    const nonMatching = { type: 'city', city: 'Tokyo', color: 'red' };
    res.hand = [ev, nonMatching];
    const r = g.Rules.shareKnowledge(res, medic, ev);
    check('B4: Researcher cannot give an event card', r.ok === false);
    const r2 = g.Rules.shareKnowledge(res, medic, nonMatching);
    check('B4: Researcher CAN give any city card', r2.ok === true && medic.hand.includes(nonMatching));
  }

  // ---- G5: Medic passive vs cured diseases ---------------------------------
  {
    const g = fresh(['Medic', 'Scientist']);
    const medic = g.GameState.players[0];
    g.GameState.cures.blue = 'cured';
    medic.location = 'Chicago';
    const before = g.GameState.cities['Chicago'].cubes.blue;
    g.Rules.infectCity('Chicago', 'blue', 1);
    check('G5: Medic blocks cured-disease cube placement in his city',
      g.GameState.cities['Chicago'].cubes.blue === before);
    // Uncured colors still land normally
    g.Rules.infectCity('Chicago', 'red', 1);
    check('G5: Medic does not block uncured colors', g.GameState.cities['Chicago'].cubes.red > 0);
  }
  {
    // Cure discovered while the Medic stands in a cubed city -> auto-clear
    const g = fresh(['Medic', 'Scientist']);
    const medic = g.GameState.players[0];
    medic.location = 'Paris';
    g.GameState.cities['Paris'].cubes.blue = 2;
    g.GameState.cubesRemaining.blue -= 2;
    g.GameState.cities['Paris'].station = true;
    medic.hand = ['Chicago', 'Montreal', 'New York', 'London', 'Madrid']
      .map(city => ({ type: 'city', city, color: 'blue' }));
    const r = g.Rules.discoverCure(medic, 'blue', medic.hand.slice(0, 5));
    check('G5: cure discovered', r.ok === true);
    check('G5: Medic auto-clears his city the moment the cure lands',
      g.GameState.cities['Paris'].cubes.blue === 0);
  }

  // ---- G6: share past hand limit warns (UI enforces the discard) ----------
  {
    const g = fresh(['Researcher', 'Medic']);
    const [res, medic] = g.GameState.players;
    medic.hand = Array.from({ length: 7 }, (_, i) => ({ type: 'city', city: 'Tokyo', color: 'red', i }));
    const give = { type: 'city', city: 'Lima', color: 'yellow' };
    res.hand = [give];
    const r = g.Rules.shareKnowledge(res, medic, give);
    check('G6: share to a full hand still succeeds', r.ok === true);
    check('G6: over-limit warning logged', g.GameState.log.some(l => l.includes('hand limit')));
  }

  // ---- Role: Operations Expert once-per-turn special move ------------------
  {
    const g = fresh(['Operations Expert', 'Medic']);
    const ops = g.GameState.players[0];
    const c1 = { type: 'city', city: 'Lima', color: 'yellow' };
    const c2 = { type: 'city', city: 'Tokyo', color: 'red' };
    ops.hand = [c1, c2];
    const r = g.Rules.opsExpertMove(ops, 'Sydney', c1); // from Atlanta (station)
    check('OpsExpert: station->anywhere with any city card', r.ok === true && ops.location === 'Sydney');
    check('OpsExpert: card discarded', g.GameState.playerDiscard.includes(c1));
    g.GameState.cities['Sydney'].station = true;
    const r2 = g.Rules.opsExpertMove(ops, 'Lima', c2);
    check('OpsExpert: second use same turn rejected', r2.ok === false);
    // hand off turn twice -> back to ops, flag reset
    g.GameState.actionsRemaining = 4;
    g.Game.nextTurn(); g.Game.nextTurn();
    const r3 = g.Rules.opsExpertMove(ops, 'Lima', c2);
    check('OpsExpert: usable again next turn', r3.ok === true);
  }

  // ---- Role: Dispatcher move-any-pawn-to-a-pawn ----------------------------
  {
    const g = fresh(['Dispatcher', 'Medic']);
    const [disp, medic] = g.GameState.players;
    medic.location = 'Tokyo';
    const r = g.Rules.dispatcherMoveToPawn(disp, disp.id, medic.id);
    check('Dispatcher: moved own pawn to Medic\'s city', r.ok === true && disp.location === 'Tokyo');
    const r2 = g.Rules.dispatcherMoveToPawn(medic, disp.id, medic.id);
    check('Dispatcher: non-dispatcher rejected', r2.ok === false);
  }

  // ---- Role: Contingency Planner retrieve + stored card leaves the game ---
  {
    const g = fresh(['Contingency Planner', 'Medic']);
    const cp = g.GameState.players[0];
    const oqn = { type: 'event', name: 'One Quiet Night' };
    g.GameState.playerDiscard.push(oqn);
    const r = g.Rules.contingencyRetrieve(cp, 'One Quiet Night');
    check('CP: retrieved event from discard', r.ok === true && cp.storedEvent === oqn);
    check('CP: card removed from discard', !g.GameState.playerDiscard.includes(oqn));
    const r2 = g.Rules.playEvent(cp, 'One Quiet Night', {});
    check('CP: stored event plays', r2.ok === true && g.GameState.oneQuietNight === true);
    check('CP: stored card left the game (not re-discarded)',
      cp.storedEvent === null && !g.GameState.playerDiscard.includes(oqn));
  }

  return results;
}

module.exports = { runRulesAuditTests };
