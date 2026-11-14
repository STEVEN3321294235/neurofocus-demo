// Logic tests for the experiment mode. No browser needed.
//   node scripts/test_lab.mjs
import assert from 'node:assert/strict';
import {
    buildStroopBank, STROOP_INKS, STROOP_SEED, PRACTICE_SEED, STROOP_BANK_SIZE, STROOP_BLOCK_SIZE
} from '../pages/lab/stroopBank.js';
import {
    LAB_RULES, bandIndex, isGoodSecond, summarizeTrials, summarizeSeconds,
    compareConditions, summarizeQuick, buildOrderBlock, conditionsForOrder
} from '../pages/lab/labAnalysis.js';

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log(`ok  ${name}`);
}

// ---------- question bank ----------
test('bank: 120 questions, numbered from 1', () => {
    const bank = buildStroopBank();
    assert.equal(bank.length, STROOP_BANK_SIZE);
    bank.forEach((q, i) => assert.equal(q.no, i + 1));
});

test('bank: same seed gives the identical bank every time', () => {
    assert.deepEqual(buildStroopBank(STROOP_SEED), buildStroopBank(STROOP_SEED));
});

test('bank: practice set differs from the scored set', () => {
    const a = buildStroopBank(STROOP_SEED, 24).map((q) => `${q.word}${q.ink}`).join('');
    const b = buildStroopBank(PRACTICE_SEED, 24).map((q) => `${q.word}${q.ink}`).join('');
    assert.notEqual(a, b);
});

test('bank: half match, half mismatch, 4 inks used equally', () => {
    const bank = buildStroopBank();
    assert.equal(bank.filter((q) => q.congruent).length, 60);
    assert.equal(bank.filter((q) => !q.congruent).length, 60);
    for (let ink = 0; ink < STROOP_INKS.length; ink += 1) {
        assert.equal(bank.filter((q) => q.ink === ink).length, 30);
        assert.equal(bank.filter((q) => q.ink === ink && q.congruent).length, 15);
    }
    bank.forEach((q) => assert.equal(q.congruent, q.word === q.ink));
});

test('bank: every block of 24 is balanced on its own', () => {
    const bank = buildStroopBank();
    for (let start = 0; start < bank.length; start += STROOP_BLOCK_SIZE) {
        const block = bank.slice(start, start + STROOP_BLOCK_SIZE);
        assert.equal(block.filter((q) => q.congruent).length, 12);
        for (let ink = 0; ink < 4; ink += 1) assert.equal(block.filter((q) => q.ink === ink).length, 6);
    }
});

test('bank: no immediate repeat, no ink three times in a row', () => {
    const bank = buildStroopBank();
    for (let i = 1; i < bank.length; i += 1) {
        assert.ok(!(bank[i].word === bank[i - 1].word && bank[i].ink === bank[i - 1].ink), `repeat at ${i}`);
        if (i >= 2) assert.ok(!(bank[i].ink === bank[i - 1].ink && bank[i].ink === bank[i - 2].ink), `run at ${i}`);
    }
});

// ---------- per-second signal ----------
test('band index = (lowBeta + highBeta) / (theta + lowAlpha + highAlpha)', () => {
    const bands = { delta: 9, theta: 100, lowAlpha: 50, highAlpha: 50, lowBeta: 60, highBeta: 40, lowGamma: 1, midGamma: 1 };
    assert.equal(bandIndex(bands), 0.5);
    assert.equal(bandIndex(null), null);
    assert.equal(bandIndex({ ...bands, theta: 0, lowAlpha: 0, highAlpha: 0 }), null);
});

test('good second: headset needs signal >= 70, a real score and a fresh packet', () => {
    const base = { source: 'eeg', fresh: true, signal: 80, score: 55 };
    assert.equal(isGoodSecond(base), true);
    assert.equal(isGoodSecond({ ...base, signal: 69 }), false);
    assert.equal(isGoodSecond({ ...base, signal: 70 }), true);
    assert.equal(isGoodSecond({ ...base, score: 0 }), false);
    assert.equal(isGoodSecond({ ...base, fresh: false }), false);
    assert.equal(isGoodSecond({ source: 'camera', hasFace: false }), false);
    assert.equal(isGoodSecond({ source: 'camera', hasFace: true }), true);
    assert.equal(isGoodSecond({ source: 'demo' }), true);
});

const row = (good, score, index = null) => ({ good, score, index });

test('seconds: only good seconds are averaged', () => {
    const rows = [...Array(70).fill(row(true, 60, 0.5)), ...Array(20).fill(row(false, 0, 9))];
    const s = summarizeSeconds(rows);
    assert.equal(s.goodSeconds, 70);
    assert.equal(s.valid, true);
    assert.equal(s.focusMean, 60);
    assert.equal(s.indexMean, 0.5);
});

test('seconds: 59 good seconds of 90 is not enough, 60 is', () => {
    const make = (n) => [...Array(n).fill(row(true, 50)), ...Array(90 - n).fill(row(false, 0))];
    assert.equal(summarizeSeconds(make(59)).valid, false);
    assert.equal(summarizeSeconds(make(60)).valid, true);
    assert.equal(summarizeSeconds(make(60)).neededSeconds, LAB_RULES.minGoodSec);
});

// ---------- answers ----------
const trial = (correct, rtMs, congruent = true, timeout = false) => ({ correct, rtMs, congruent, timeout });

test('answers: accuracy over all, speed over correct answers only', () => {
    const s = summarizeTrials([
        trial(true, 600), trial(true, 800), trial(false, 300), trial(false, 2000, false, true)
    ]);
    assert.equal(s.answered, 4);
    assert.equal(s.correct, 2);
    assert.equal(s.timeouts, 1);
    assert.equal(s.accuracyPct, 50);
    assert.equal(s.meanRtMs, 700);
});

test('answers: interference = mismatch speed minus match speed', () => {
    const s = summarizeTrials([trial(true, 600, true), trial(true, 760, false)]);
    assert.equal(s.interferenceMs, 160);
});

// ---------- comparison ----------
function cond({ acc = 90, correct = 54, answered = 60, rt = 800, focus = 55, valid = true, index = 0.5, rating = 6 } = {}) {
    return {
        task: { accuracyPct: acc, correct, answered, meanRtMs: rt },
        signal: { valid, focusMean: focus, indexMean: index },
        rating
    };
}

test('compare: under both thresholds -> "about the same"', () => {
    const c = compareConditions(cond(), cond({ acc: 94, rt: 760 }));   // +4pp, 5% faster
    assert.equal(c.verdict, 'same');
    assert.equal(c.task.dir, 0);
});

test('compare: accuracy gap of exactly 5 points is a clear gap', () => {
    const c = compareConditions(cond({ acc: 90 }), cond({ acc: 95 }));
    assert.equal(c.verdict, 'clear');
    assert.equal(c.task.dir, 1);
});

test('compare: 8% faster alone is a clear gap', () => {
    const c = compareConditions(cond({ rt: 1000 }), cond({ rt: 920 }));
    assert.equal(c.task.rtGapPct, 8);
    assert.equal(c.verdict, 'clear');
    assert.equal(c.task.dir, 1);
});

test('compare: worse with the phone away is reported as worse', () => {
    const c = compareConditions(cond({ acc: 95, rt: 800 }), cond({ acc: 85, rt: 900 }));
    assert.equal(c.verdict, 'clear');
    assert.equal(c.task.dir, -1);
});

test('compare: more right but slower is a trade-off, direction 0', () => {
    const c = compareConditions(cond({ acc: 85, rt: 800 }), cond({ acc: 95, rt: 900 }));
    assert.equal(c.verdict, 'clear');
    assert.equal(c.task.tradeOff, true);
    assert.equal(c.task.dir, 0);
});

test('compare: all three agree', () => {
    const c = compareConditions(cond({ acc: 85, focus: 50, rating: 5 }), cond({ acc: 95, focus: 60, rating: 7 }));
    assert.deepEqual([c.task.dir, c.signal.dir, c.rating.dir], [1, 1, 1]);
    assert.equal(c.agree, true);
    assert.equal(c.compared, 3);
});

test('compare: three "no difference" results also agree', () => {
    const c = compareConditions(cond(), cond());
    assert.equal(c.agree, true);
});

test('compare: disagreement is reported', () => {
    const c = compareConditions(cond({ acc: 85, focus: 60, rating: 5 }), cond({ acc: 95, focus: 50, rating: 7 }));
    assert.equal(c.signal.dir, -1);
    assert.equal(c.agree, false);
});

test('compare: weak signal -> brainwaves not counted, other two still compared', () => {
    const c = compareConditions(cond({ acc: 85, rating: 5, valid: false }), cond({ acc: 95, rating: 7 }));
    assert.equal(c.signal.valid, false);
    assert.equal(c.signal.dir, null);
    assert.equal(c.compared, 2);
    assert.equal(c.agree, true);
});

test('compare: "more right" is counted over the same number of questions', () => {
    // Away: slower, so fewer answers and fewer correct in total (58 < 60),
    // but clearly more accurate (93.5% vs 85.7%). The sentence must say MORE.
    const c = compareConditions(
        cond({ acc: 85.7, correct: 60, answered: 70, rt: 800 }),
        cond({ acc: 93.5, correct: 58, answered: 62, rt: 900 })
    );
    assert.equal(c.task.correctGap, -2);
    assert.equal(c.task.sameBase, 62);
    assert.equal(c.task.rightGap, 5);          // 7.8 points of 62 questions
    assert.equal(Math.sign(c.task.rightGap), Math.sign(c.task.accGapPP));
});

// ---------- quick try-out ----------
test('quick: a 10-point drop counts, a 9-point drop does not', () => {
    const seg = (score) => Array(20).fill(row(true, score));
    assert.equal(summarizeQuick(seg(70), seg(60)).verdict, 'dropped');
    assert.equal(summarizeQuick(seg(70), seg(61)).verdict, 'same');
    assert.equal(summarizeQuick(seg(60), seg(70)).verdict, 'same');
});

// ---------- order ----------
test('order: every block of four has two of each', () => {
    for (let run = 0; run < 200; run += 1) {
        const block = buildOrderBlock((n) => Math.floor(Math.random() * n));
        assert.equal(block.length, 4);
        assert.equal(block.filter((o) => o === 'on-first').length, 2);
    }
    assert.deepEqual(conditionsForOrder('on-first'), ['on', 'off']);
    assert.deepEqual(conditionsForOrder('off-first'), ['off', 'on']);
});

console.log(`\n${passed} tests passed`);
