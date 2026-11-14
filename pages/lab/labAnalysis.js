// Pure maths for the experiment mode: turn raw logs into the numbers and the
// one-line answer shown on the results page.
//
// No DOM, no storage, no app imports: every rule here can be checked in Node
// (scripts/test_lab.mjs). The wording lives in app/i18n.js; this file only
// returns codes and numbers.
//
// Vocabulary used throughout:
//   'on'  = phone on the desk          'off' = phone out of the room
//   direction  +1 = better with the phone away, -1 = worse, 0 = no clear gap

export const LAB_RULES = {
    segmentSec: 90,          // one scored condition
    practiceSec: 20,
    restSec: 30,
    switchSec: 30,
    quickSegmentSec: 20,
    goodSignal: 70,          // contact quality that counts as "good"
    minGoodSec: 60,          // of 90: fewer than this and brainwaves are not counted
    accuracyGapPP: 5,        // percentage points
    speedGapPct: 8,          // percent of the on-desk reaction time
    focusGap: 5,             // focus-score points
    ratingGap: 1,            // self-rating points
    quickDropGap: 10         // focus-score points
};

export const BAND_NAMES = ['delta', 'theta', 'lowAlpha', 'highAlpha', 'lowBeta', 'highBeta', 'lowGamma', 'midGamma'];

function mean(values) {
    const list = values.filter((v) => Number.isFinite(v));
    if (!list.length) return null;
    return list.reduce((sum, v) => sum + v, 0) / list.length;
}

function median(values) {
    const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
    if (!list.length) return null;
    const mid = Math.floor(list.length / 2);
    return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function round(value, digits = 1) {
    if (!Number.isFinite(value)) return null;
    const f = 10 ** digits;
    return Math.round(value * f) / f;
}

// Our own index: fast activity over slow activity, from the raw bands.
//   (lowBeta + highBeta) / (theta + lowAlpha + highAlpha)
export function bandIndex(bands) {
    if (!bands) return null;
    const beta = Number(bands.lowBeta) + Number(bands.highBeta);
    const slow = Number(bands.theta) + Number(bands.lowAlpha) + Number(bands.highAlpha);
    if (!Number.isFinite(beta) || !Number.isFinite(slow) || slow <= 0) return null;
    return beta / slow;
}

// Is this one-second reading good enough to count?
//   headset: fresh packet, contact >= 70 and a real (non-zero) focus score
//   camera:  a face is in view            demo: always
export function isGoodSecond(sample) {
    if (!sample) return false;
    if (sample.source === 'eeg') {
        return Boolean(sample.fresh) && Number(sample.signal) >= LAB_RULES.goodSignal && Number(sample.score) > 0;
    }
    if (sample.source === 'camera') return sample.hasFace !== false;
    return true;
}

// Answers for one condition -> accuracy and speed.
// Reaction time uses correct answers only (a fast wrong guess is not "quick
// thinking"); a timed-out question counts as wrong and has no reaction time.
export function summarizeTrials(trials = []) {
    const answered = trials.length;
    const correct = trials.filter((t) => t.correct).length;
    const timeouts = trials.filter((t) => t.timeout).length;
    const rt = (list) => mean(list.filter((t) => t.correct && !t.timeout).map((t) => t.rtMs));
    const part = (flag) => {
        const list = trials.filter((t) => t.congruent === flag);
        return {
            answered: list.length,
            correct: list.filter((t) => t.correct).length,
            accuracyPct: list.length ? round((list.filter((t) => t.correct).length / list.length) * 100, 1) : null,
            meanRtMs: round(rt(list), 0)
        };
    };
    const match = part(true);
    const mismatch = part(false);
    return {
        answered,
        correct,
        timeouts,
        accuracyPct: answered ? round((correct / answered) * 100, 1) : null,
        meanRtMs: round(rt(trials), 0),
        match,
        mismatch,
        // Classic interference cost: how much slower the mismatching words are.
        interferenceMs: match.meanRtMs !== null && mismatch.meanRtMs !== null
            ? mismatch.meanRtMs - match.meanRtMs
            : null
    };
}

// One-second rows for one condition -> focus score and band index.
// Only good seconds are averaged. Fewer than minGoodSec good seconds and the
// brainwave result is marked not valid (the task and self-rating still stand).
export function summarizeSeconds(rows = [], segmentSec = LAB_RULES.segmentSec) {
    const good = rows.filter((r) => r.good);
    const indexValues = good.map((r) => r.index);
    const needed = Math.round((LAB_RULES.minGoodSec / LAB_RULES.segmentSec) * segmentSec);
    return {
        seconds: rows.length,
        goodSeconds: good.length,
        neededSeconds: needed,
        valid: good.length >= needed,
        focusMean: round(mean(good.map((r) => r.score)), 1),
        indexMean: round(mean(indexValues), 3),
        indexMedian: round(median(indexValues), 3),
        hasBands: indexValues.some((v) => Number.isFinite(v))
    };
}

function sign(value, gap) {
    if (!Number.isFinite(value)) return 0;
    if (value >= gap) return 1;
    if (value <= -gap) return -1;
    return 0;
}

// Compare the two conditions. `on` / `off` are { task, signal, rating }.
export function compareConditions(on, off) {
    // --- 1. Task performance -------------------------------------------------
    const accGap = (on.task.accuracyPct !== null && off.task.accuracyPct !== null)
        ? round(off.task.accuracyPct - on.task.accuracyPct, 1)
        : null;
    const rtGapMs = (on.task.meanRtMs !== null && off.task.meanRtMs !== null)
        ? on.task.meanRtMs - off.task.meanRtMs          // + = faster with phone away
        : null;
    const rtGapPct = (rtGapMs !== null && on.task.meanRtMs > 0)
        ? round((rtGapMs / on.task.meanRtMs) * 100, 1)
        : null;
    const accDir = sign(accGap, LAB_RULES.accuracyGapPP);
    const rtDir = sign(rtGapPct, LAB_RULES.speedGapPct);
    const clearGap = accDir !== 0 || rtDir !== 0;
    // More right but slower (or the reverse) is a trade-off, not a win.
    const tradeOff = accDir !== 0 && rtDir !== 0 && accDir !== rtDir;
    const taskDir = tradeOff ? 0 : (accDir || rtDir);

    // --- 2. Brainwaves -------------------------------------------------------
    const signalValid = Boolean(on.signal.valid && off.signal.valid
        && on.signal.focusMean !== null && off.signal.focusMean !== null);
    const focusGap = signalValid ? round(off.signal.focusMean - on.signal.focusMean, 1) : null;
    const indexGap = (signalValid && on.signal.indexMean !== null && off.signal.indexMean !== null)
        ? round(off.signal.indexMean - on.signal.indexMean, 3)
        : null;
    const signalDir = signalValid ? sign(focusGap, LAB_RULES.focusGap) : null;

    // --- 3. Self-rating ------------------------------------------------------
    const ratingGap = (Number.isFinite(on.rating) && Number.isFinite(off.rating))
        ? off.rating - on.rating
        : null;
    const ratingDir = ratingGap === null ? null : sign(ratingGap, LAB_RULES.ratingGap);

    // --- Do the three agree? -------------------------------------------------
    const dirs = [taskDir, signalDir, ratingDir].filter((d) => d !== null);
    const agree = dirs.length >= 2 && dirs.every((d) => d === dirs[0]);

    return {
        task: {
            accGapPP: accGap,
            correctGap: off.task.correct - on.task.correct,
            rtGapMs,
            rtGapPct,
            accDir,
            rtDir,
            clearGap,
            tradeOff,
            dir: taskDir
        },
        signal: { valid: signalValid, focusGap, indexGap, dir: signalDir },
        rating: { gap: ratingGap, dir: ratingDir },
        compared: dirs.length,          // 3, or 2 when brainwaves are not counted
        agree,
        // 'clear' -> the "you got X more right, Y s faster" sentence
        // 'same'  -> the "about the same" sentence
        verdict: clearGap ? 'clear' : 'same'
    };
}

// Quick try-out: did the focus line drop while looking at the phone?
export function summarizeQuick(firstRows = [], secondRows = []) {
    const first = mean(firstRows.filter((r) => r.good).map((r) => r.score));
    const second = mean(secondRows.filter((r) => r.good).map((r) => r.score));
    const usable = first !== null && second !== null;
    const drop = usable ? round(first - second, 1) : null;
    return {
        firstMean: round(first, 1),
        secondMean: round(second, 1),
        drop,
        usable,
        verdict: usable && drop >= LAB_RULES.quickDropGap ? 'dropped' : 'same'
    };
}

// Order of the two conditions, balanced in blocks of four: every four tests
// on one machine contain two of each order, in a shuffled sequence. With only
// four participants a plain coin toss gives an uneven split 5 times in 8.
export function buildOrderBlock(randomInt) {
    const block = ['on-first', 'on-first', 'off-first', 'off-first'];
    for (let i = block.length - 1; i > 0; i -= 1) {
        const j = randomInt(i + 1);
        [block[i], block[j]] = [block[j], block[i]];
    }
    return block;
}

export function conditionsForOrder(order) {
    return order === 'off-first' ? ['off', 'on'] : ['on', 'off'];
}
