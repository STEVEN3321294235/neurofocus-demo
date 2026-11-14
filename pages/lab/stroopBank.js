// Colour-word (Stroop) question bank for the experiment mode.
//
// Why a fixed bank: both conditions of one test, and every participant, must
// face the same questions in the same order. Otherwise "I did better without
// my phone" could simply mean "I got the easier set". So the bank is generated
// from a fixed seed, never from Math.random() and never from the AI.
//
// Shape of the bank (120 questions = 5 blocks of 24):
//   - 4 ink colours, each used equally often
//   - half the questions match (word and ink agree), half do not
//   - every 24-question block is balanced on its own, so a slow participant who
//     only reaches question 50 still sees a fair mix
//   - no question repeats straight away, and no ink appears 3 times in a row,
//     so there is no rhythm to tap along to
//
// This file has no DOM or app imports on purpose: it runs unchanged in Node
// (scripts/test_lab.mjs) and in the browser.

export const STROOP_INKS = [
    { id: 'red', hex: '#ef4444', hk: '紅', en: 'RED', key: 'D', code: 'KeyD' },
    { id: 'blue', hex: '#3b82f6', hk: '藍', en: 'BLUE', key: 'F', code: 'KeyF' },
    { id: 'green', hex: '#22c55e', hk: '綠', en: 'GREEN', key: 'J', code: 'KeyJ' },
    { id: 'yellow', hex: '#eab308', hk: '黃', en: 'YELLOW', key: 'K', code: 'KeyK' }
];

export const STROOP_SEED = 20261202;      // the scored bank (TALE opening day)
export const PRACTICE_SEED = 20261119;    // a different set for the warm-up
export const STROOP_BANK_SIZE = 120;
export const STROOP_BLOCK_SIZE = 24;
// A question left unanswered this long counts as wrong. Two seconds is roughly
// twice a normal answer, so it only bites when attention has really gone.
export const STROOP_LIMIT_MS = 2000;
// Blank gap between questions: long enough to see that the word changed.
export const STROOP_GAP_MS = 150;

// mulberry32: tiny seeded generator, identical output in every JS engine.
export function createRng(seed) {
    let a = seed >>> 0;
    return function next() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(list, rng) {
    const out = list.slice();
    for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

// One balanced block: for every ink, 3 matching questions and one mismatch
// with each of the other three words.
function blockTemplate() {
    const items = [];
    for (let ink = 0; ink < STROOP_INKS.length; ink += 1) {
        for (let rep = 0; rep < 3; rep += 1) items.push({ word: ink, ink });
        for (let word = 0; word < STROOP_INKS.length; word += 1) {
            if (word !== ink) items.push({ word, ink });
        }
    }
    return items;
}

function orderIsFair(order, previous) {
    let last = previous || null;
    let beforeLast = null;
    for (const item of order) {
        if (last && last.word === item.word && last.ink === item.ink) return false;
        if (last && beforeLast && last.ink === item.ink && beforeLast.ink === item.ink) return false;
        beforeLast = last;
        last = item;
    }
    return true;
}

export function buildStroopBank(seed = STROOP_SEED, size = STROOP_BANK_SIZE) {
    const rng = createRng(seed);
    const bank = [];
    while (bank.length < size) {
        const previous = bank.length ? bank[bank.length - 1] : null;
        let order = shuffle(blockTemplate(), rng);
        // Re-draw from the same seeded stream until the order is fair. The
        // stream is deterministic, so the result is too.
        let guard = 0;
        while (!orderIsFair(order, previous) && guard < 5000) {
            order = shuffle(blockTemplate(), rng);
            guard += 1;
        }
        for (const item of order) {
            if (bank.length >= size) break;
            bank.push({
                no: bank.length + 1,
                word: item.word,
                ink: item.ink,
                congruent: item.word === item.ink
            });
        }
    }
    return bank;
}

export function inkLabel(index, lang) {
    const ink = STROOP_INKS[index];
    return lang === 'en' ? ink.en : ink.hk;
}
