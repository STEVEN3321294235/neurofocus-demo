// TEST ONLY: paste into the browser console on the site (or page.evaluate) to
// create one made-up demo-mode result, for checking the results page layout.
// It is tagged source "demo", so the page marks it as a rehearsal.
// Builds one plausible demo-mode test record in the page (for screenshots).
async () => {
  const A = await import('/pages/lab/labAnalysis.js?v=2026-07-28-2');
  const St = await import('/pages/lab/labStore.js?v=2026-07-28-2');
  const B = await import('/pages/lab/stroopBank.js?v=2026-07-28-2');
  const bank = B.buildStroopBank();
  let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const seconds = []; const trials = []; let sec = 0;
  const phase = (p, cond, n, base) => { for (let i = 1; i <= n; i++) { sec++; const s = Math.round(base + 12 * Math.sin(sec / 6) + (rnd() - 0.5) * 10); seconds.push({ sec, phase: p, cond, phaseSec: i, score: s, focus: s, signal: null, good: !(p === 'test' && cond === 'on' && i > 40 && i < 46), bands: null, index: null }); } };
  phase('practice', '', 20, 60); phase('rest', '', 30, 55); phase('test', 'off', 90, 68); phase('switch', '', 30, 58); phase('test', 'on', 90, 57);
  const mk = (cond, n, acc, rtBase) => { for (let i = 0; i < n; i++) { const q = bank[i]; const ok = rnd() < acc; const rt = Math.round(rtBase + (q.congruent ? 0 : 90) + (rnd() - 0.5) * 260); trials.push({ phase: 'test', cond, seq: i + 1, no: q.no, lap: 0, word: B.STROOP_INKS[q.word].id, ink: B.STROOP_INKS[q.ink].id, congruent: q.congruent, response: '', correct: ok, rtMs: rt, timeout: false, atSec: i }); } };
  mk('off', 92, 0.95, 640); mk('on', 84, 0.88, 700);
  const cond = (c, pos, rating) => ({ position: pos, task: A.summarizeTrials(trials.filter(t => t.cond === c)), signal: A.summarizeSeconds(seconds.filter(s => s.phase === 'test' && s.cond === c), 90), rating });
  const conditions = { on: cond('on', 2, 5), off: cond('off', 1, 8) };
  const user = localStorage.getItem('current_user');
  St.saveSession({ id: 'lab_seed_' + Date.now(), version: 1, user, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(), source: 'demo', order: 'off-first', seed: B.STROOP_SEED, limitMs: 2000, lang: 'hk', fast: false, segmentSec: 90, conditions, rest: A.summarizeSeconds(seconds.filter(s => s.phase === 'rest'), 30), comparison: A.compareConditions(conditions.on, conditions.off), seconds, trials });
  return true;
}
