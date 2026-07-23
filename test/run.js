/* =============================================================================
 * test/run.js  —  test runner  (usage: `npm test` or `node test/run.js`)
 * -----------------------------------------------------------------------------
 * Runs the engine scenario tests + the autoplay fuzzer, prints a report, and
 * exits non-zero if anything failed. Run this before committing.
 * ===========================================================================*/
const { runEngineTests } = require('./engine.test');
const { runAutoplay } = require('./autoplay');

function report(title, results, note) {
  console.log(`\n── ${title} ──`);
  let failed = 0;
  for (const r of results) {
    console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.label}`);
    if (!r.ok) failed++;
  }
  if (note) console.log(`  note: ${note}`);
  return failed;
}

let totalFailed = 0;

try {
  totalFailed += report('Engine mechanics', runEngineTests());
  const auto = runAutoplay(25);
  totalFailed += report('Autoplay continuity', auto.results, auto.note);
} catch (e) {
  console.error('\nHARNESS ERROR:', e.stack || e.message);
  process.exit(1);
}

console.log('\n' + (totalFailed === 0 ? '✅ ALL TESTS PASSED' : `❌ ${totalFailed} TEST(S) FAILED`));
process.exit(totalFailed === 0 ? 0 : 1);
