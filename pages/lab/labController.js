// Experiment mode: the screens a participant goes through on the game page.
//
// The 3D ocean keeps running behind this layer (the boat still follows the
// focus score). This file owns everything else about a test: the signal check,
// the colour-word questions, the timing of each stage, the one-second signal
// log, and handing the finished record to the results page.
//
// Two flows:
//   full  (testMode 'lab')   check -> practice 20 s -> quiet sitting 30 s
//                            -> test 1 (90 s) -> self-rating -> switch 30 s
//                            -> test 2 (90 s) -> self-rating -> results page
//   quick (testMode 'quick') check -> 20 s answering -> 20 s on the phone
//                            -> one result card. Nothing is saved.
//
// Timing uses the wall clock (performance.now), not the game's own play
// clock: a weak-signal pause in the runtime must not stretch one condition
// and shrink the other. Weak-signal seconds are simply left out of the
// brainwave average later (see labAnalysis.summarizeSeconds).

import { t } from '../../app/i18n.js?v=2026-07-28-2';
import {
    buildStroopBank, STROOP_INKS, STROOP_SEED, PRACTICE_SEED, STROOP_BLOCK_SIZE,
    STROOP_LIMIT_MS, STROOP_GAP_MS, inkLabel
} from './stroopBank.js?v=2026-07-28-2';
import {
    LAB_RULES, bandIndex, isGoodSecond, summarizeTrials, summarizeSeconds,
    compareConditions, summarizeQuick, conditionsForOrder
} from './labAnalysis.js?v=2026-07-28-2';
import { newSessionId, peekOrder, commitOrder, saveSession } from './labStore.js?v=2026-07-28-2';

const CHECK_GOOD_SECONDS = 5;

function fill(text, vars = {}) {
    return Object.keys(vars).reduce((out, key) => out.replace(`{${key}}`, vars[key]), text);
}

function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function clock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Rehearsal speed-up: every stage runs at one tenth of its length. It is only
// honoured when the input is NOT the brainwave headband, so a real test can
// never be shortened by accident. Turn on with ?labfast=1 (off: ?labfast=0).
function readFastFlag() {
    try {
        const flag = new URLSearchParams(window.location.search).get('labfast');
        if (flag === '1') localStorage.setItem('nf_lab_fast', '1');
        if (flag === '0') localStorage.removeItem('nf_lab_fast');
        return localStorage.getItem('nf_lab_fast') === '1';
    } catch (e) {
        return false;
    }
}

export function createLabController({ root, runtime, mode, user, lang, onFinish, onQuickAgain, onQuickFull, onHome }) {
    const isQuick = mode === 'quick';
    const langCode = lang === 'en' ? 'en' : 'hk';
    let dead = false;
    let started = false;
    const timeouts = new Set();
    const intervals = new Set();
    const disposers = [];

    // ---- timers that all die together on destroy() --------------------------
    const later = (fn, ms) => {
        const id = setTimeout(() => { timeouts.delete(id); if (!dead) fn(); }, ms);
        timeouts.add(id);
        return id;
    };
    const cancel = (id) => { clearTimeout(id); timeouts.delete(id); };
    const every = (fn, ms) => {
        const id = setInterval(() => { if (!dead) fn(); }, ms);
        intervals.add(id);
        return () => { clearInterval(id); intervals.delete(id); };
    };
    const wait = (ms) => new Promise((resolve) => later(resolve, ms));

    // ---- session facts ------------------------------------------------------
    let source = 'demo';
    let fast = false;
    let scale = 1;
    const sec = (n) => (scale === 1 ? n : Math.max(2, Math.round(n * scale)));
    const seconds = [];       // one row per second, every stage
    const trials = [];        // one row per answered question, every stage
    let globalSec = 0;
    let sampling = null;      // the stage currently being logged
    const startedAtIso = new Date().toISOString();

    // ---- layer skeleton -----------------------------------------------------
    root.innerHTML = `
        <div class="lab-tag" data-lab-tag hidden></div>
        <div class="lab-strip" data-lab-strip hidden>
            <span class="lab-strip-dot" data-lab-dot></span>
            <span class="lab-strip-label" data-lab-label></span>
            <span class="lab-strip-time lab-mono" data-lab-time>00:00</span>
            <span class="lab-strip-bar"><i data-lab-fill></i></span>
        </div>
        <div class="lab-line" data-lab-line hidden></div>
        <div class="lab-stage" data-lab-stage></div>
    `;
    const $ = (sel) => root.querySelector(sel);
    const stage = $('[data-lab-stage]');
    const strip = $('[data-lab-strip]');
    const tag = $('[data-lab-tag]');

    function setStage(html) {
        stage.innerHTML = html;
    }

    function showStrip({ label, cond = '', totalMs }) {
        strip.hidden = false;
        strip.dataset.cond = cond;
        $('[data-lab-label]').textContent = label;
        const startedAt = performance.now();
        const timeEl = $('[data-lab-time]');
        const fillEl = $('[data-lab-fill]');
        const paint = () => {
            const left = Math.max(0, totalMs - (performance.now() - startedAt));
            timeEl.textContent = clock(left);
            fillEl.style.transform = `scaleX(${Math.max(0, Math.min(1, left / totalMs))})`;
        };
        paint();
        const stop = every(paint, 200);
        return () => { stop(); strip.hidden = true; };
    }

    // ---- one-second signal log ----------------------------------------------
    function readRow() {
        const s = runtime.getLabSample();
        return {
            score: Number.isFinite(s.score) ? Math.round(s.score) : null,
            focus: Math.round(s.focus),
            signal: s.signal === null || s.signal === undefined ? null : Math.round(s.signal),
            good: isGoodSecond(s),
            bands: s.source === 'eeg' && s.bands ? { ...s.bands } : null,
            index: s.source === 'eeg' ? bandIndex(s.bands) : null
        };
    }

    function pushRow(row) {
        globalSec += 1;
        sampling.count += 1;
        seconds.push({ sec: globalSec, phase: sampling.phase, cond: sampling.cond, phaseSec: sampling.count, ...row });
    }

    // Called often; writes exactly one row for each whole second that has
    // passed. If the browser stalled and several seconds are due at once, the
    // earlier ones are logged as "not good" rather than invented.
    function tickSampling() {
        if (!sampling) return;
        const due = Math.min(sampling.limit, Math.floor((performance.now() - sampling.startedAt) / 1000));
        while (sampling.count < due) {
            const isLatest = sampling.count === due - 1;
            pushRow(isLatest ? readRow() : { score: null, focus: null, signal: null, good: false, bands: null, index: null });
        }
    }

    function startSampling(phase, cond, limitSec) {
        sampling = { phase, cond: cond || '', limit: limitSec, count: 0, startedAt: performance.now() };
    }

    function stopSampling() {
        if (!sampling) return;
        tickSampling();
        // The stage's own timer can fire a few ms early; top up to the full length.
        while (sampling.count < sampling.limit) pushRow(readRow());
        sampling = null;
    }

    intervals.add(setInterval(() => { if (!dead) tickSampling(); }, 100));

    // ---- stage: signal check ------------------------------------------------
    function checkMessage(s) {
        if (s.source === 'eeg') {
            if (s.signal === null || !s.fresh) return { text: t('lab_check_waiting'), tone: 'bad' };
            if (s.signal < 30) return { text: t('lab_check_none'), tone: 'bad' };
            if (s.signal < LAB_RULES.goodSignal) return { text: t('lab_check_weak'), tone: 'weak' };
            if (!(s.score > 0)) return { text: t('lab_check_settling'), tone: 'weak' };
            return { text: t('lab_check_good'), tone: 'good' };
        }
        if (s.source === 'camera') {
            return s.hasFace === false
                ? { text: t('lab_check_face_lost'), tone: 'bad' }
                : { text: t('lab_check_face_ok'), tone: 'good' };
        }
        return { text: t('lab_check_demo_ok'), tone: 'good' };
    }

    function stageCheck() {
        return new Promise((resolve) => {
            const need = fast ? 2 : CHECK_GOOD_SECONDS;
            const pips = Array.from({ length: need }, () => '<i></i>').join('');
            setStage(`
                <section class="lab-card" data-stage="check">
                    <p class="lab-eyebrow">${esc(isQuick ? t('lab_quick_title') : t('setup_lab_title'))}</p>
                    <h2>${esc(t('lab_check_title'))}</h2>
                    <p class="lab-lead">${esc(t(`lab_check_lead_${source}`))}</p>
                    <div class="lab-meter" ${source === 'eeg' ? '' : 'hidden'}>
                        <span class="lab-meter-name">${esc(t('lab_check_signal'))}</span>
                        <span class="lab-meter-track"><i data-check-fill></i></span>
                        <span class="lab-meter-value lab-mono" data-check-value>--</span>
                    </div>
                    <div class="lab-pips" aria-label="${esc(t('lab_check_progress'))}">
                        <span class="lab-pips-name">${esc(t('lab_check_progress'))}</span>
                        <span class="lab-pips-row" data-check-pips>${pips}</span>
                    </div>
                    <p class="lab-status" data-check-status aria-live="polite"></p>
                    <div class="lab-actions">
                        <button type="button" class="lab-btn lab-btn-primary" data-check-go disabled>${esc(t('lab_continue'))}</button>
                    </div>
                </section>
            `);
            const fillEl = stage.querySelector('[data-check-fill]');
            const valueEl = stage.querySelector('[data-check-value]');
            const pipEls = Array.from(stage.querySelectorAll('[data-check-pips] i'));
            const statusEl = stage.querySelector('[data-check-status]');
            const goBtn = stage.querySelector('[data-check-go]');
            let streak = 0;
            let passed = false;

            const paint = () => {
                const s = runtime.getLabSample();
                const good = isGoodSecond(s);
                streak = good ? streak + 1 : 0;
                if (streak >= need) passed = true;
                if (source === 'eeg') {
                    const pct = s.signal === null ? 0 : Math.max(0, Math.min(100, s.signal));
                    fillEl.style.transform = `scaleX(${pct / 100})`;
                    valueEl.textContent = s.signal === null ? '--' : `${Math.round(pct)}%`;
                }
                const lit = passed ? need : streak;
                pipEls.forEach((el, i) => el.classList.toggle('is-on', i < lit));
                const msg = passed ? { text: t('lab_check_ready'), tone: 'good' } : checkMessage(s);
                statusEl.textContent = msg.text;
                statusEl.dataset.tone = msg.tone;
                goBtn.disabled = !passed;
            };
            paint();
            const stop = every(paint, 1000);
            goBtn.addEventListener('click', () => {
                if (!passed) return;
                stop();
                resolve();
            });
        });
    }

    // ---- stage: plain cards -------------------------------------------------
    function keycaps() {
        return STROOP_INKS.map((ink, i) => `
            <span class="lab-keycap">
                <kbd>${ink.key}</kbd>
                <span>${esc(inkLabel(i, langCode))}</span>
            </span>`).join('');
    }

    function ruleBlock() {
        return `
            <p class="lab-rule">${esc(t('lab_rule'))}</p>
            <div class="lab-example">
                <span class="lab-example-word" style="color:${STROOP_INKS[1].hex}">${esc(inkLabel(0, langCode))}</span>
                <span class="lab-example-text">${esc(t('lab_rule_example'))}</span>
            </div>
            <p class="lab-lead">${esc(t('lab_keys_lead'))}</p>
            <div class="lab-keycaps">${keycaps()}</div>
            <p class="lab-fine">${esc(t('lab_limit_note'))}</p>
        `;
    }

    function stageCard({ name, eyebrow = '', title, body = '', button, cond = '' }) {
        return new Promise((resolve) => {
            setStage(`
                <section class="lab-card" data-stage="${name}" ${cond ? `data-cond="${cond}"` : ''}>
                    ${eyebrow ? `<p class="lab-eyebrow">${esc(eyebrow)}</p>` : ''}
                    <h2>${esc(title)}</h2>
                    ${body}
                    <div class="lab-actions">
                        <button type="button" class="lab-btn lab-btn-primary" data-card-go>${esc(button)}</button>
                    </div>
                </section>
            `);
            stage.querySelector('[data-card-go]').addEventListener('click', () => resolve());
        });
    }

    // A short "Get ready" beat so the first word never appears under the click.
    async function getReady() {
        setStage(`<div class="lab-ready" data-stage="ready">${esc(t('lab_get_ready'))}</div>`);
        await wait(fast ? 300 : 1200);
    }

    // ---- stage: timed wait (quiet sitting / switch) ---------------------------
    function stageRest() {
        return new Promise((resolve) => {
            const total = sec(LAB_RULES.restSec);
            setStage(`
                <section class="lab-card lab-card-quiet" data-stage="rest">
                    <h2>${esc(t('lab_rest_title'))}</h2>
                    <p class="lab-lead">${esc(t('lab_rest_lead'))}</p>
                </section>
            `);
            const hideStrip = showStrip({ label: t('lab_rest_label'), totalMs: total * 1000 });
            startSampling('rest', '', total);
            later(() => { stopSampling(); hideStrip(); resolve(); }, total * 1000);
        });
    }

    function placeText(cond) {
        return cond === 'on' ? t('lab_place_on') : t('lab_place_off');
    }

    function condName(cond) {
        return cond === 'on' ? t('lab_cond_on') : t('lab_cond_off');
    }

    function stageSwitch(cond) {
        return new Promise((resolve) => {
            const total = sec(LAB_RULES.switchSec);
            setStage(`
                <section class="lab-card" data-stage="switch" data-cond="${cond}">
                    <p class="lab-eyebrow">${esc(t('lab_round_2'))}</p>
                    <h2>${esc(t('lab_switch_title'))}</h2>
                    <p class="lab-cond-name"><span class="lab-cond-dot"></span>${esc(condName(cond))}</p>
                    <p class="lab-place">${esc(placeText(cond))}</p>
                    <p class="lab-status" data-switch-status></p>
                    <div class="lab-actions">
                        <button type="button" class="lab-btn lab-btn-primary" data-switch-go disabled>${esc(t('lab_continue'))}</button>
                    </div>
                </section>
            `);
            const statusEl = stage.querySelector('[data-switch-status]');
            const goBtn = stage.querySelector('[data-switch-go]');
            const startedAt = performance.now();
            startSampling('switch', '', total);
            const paint = () => {
                const left = Math.ceil((total * 1000 - (performance.now() - startedAt)) / 1000);
                if (left > 0) {
                    statusEl.textContent = fill(t('lab_switch_wait'), { s: left });
                } else {
                    statusEl.textContent = t('lab_switch_ready');
                    goBtn.disabled = false;
                }
            };
            paint();
            const stop = every(paint, 250);
            goBtn.addEventListener('click', () => {
                if (goBtn.disabled) return;
                stop();
                stopSampling();
                resolve();
            });
        });
    }

    // ---- stage: self-rating -------------------------------------------------
    function stageRate(round) {
        return new Promise((resolve) => {
            const buttons = Array.from({ length: 10 }, (_, i) => (
                `<button type="button" class="lab-rate-btn lab-mono" data-rate="${i + 1}">${i + 1}</button>`
            )).join('');
            setStage(`
                <section class="lab-card" data-stage="rate">
                    <p class="lab-eyebrow">${esc(t(round === 1 ? 'lab_round_1' : 'lab_round_2'))}</p>
                    <h2>${esc(t('lab_rate_title'))}</h2>
                    <div class="lab-rate-row">${buttons}</div>
                    <div class="lab-rate-ends"><span>${esc(t('lab_rate_low'))}</span><span>${esc(t('lab_rate_high'))}</span></div>
                    <div class="lab-actions">
                        <button type="button" class="lab-btn lab-btn-primary" data-rate-go disabled>${esc(t('lab_rate_confirm'))}</button>
                    </div>
                </section>
            `);
            let value = null;
            const goBtn = stage.querySelector('[data-rate-go]');
            stage.querySelectorAll('[data-rate]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    value = Number(btn.dataset.rate);
                    stage.querySelectorAll('[data-rate]').forEach((b) => b.classList.toggle('is-picked', b === btn));
                    goBtn.disabled = false;
                });
            });
            goBtn.addEventListener('click', () => { if (value !== null) resolve(value); });
        });
    }

    // ---- stage: the colour-word questions -----------------------------------
    function stageStroop({ phase, cond = '', totalSec, bank, label }) {
        return new Promise((resolve) => {
            const keys = STROOP_INKS.map((ink, i) => `
                <button type="button" class="lab-key" data-ink="${i}">
                    <span class="lab-key-label">${esc(inkLabel(i, langCode))}</span>
                    <kbd>${ink.key}</kbd>
                </button>`).join('');
            setStage(`
                <section class="lab-stroop" data-stage="stroop" data-phase="${phase}" ${cond ? `data-cond="${cond}"` : ''}>
                    <p class="lab-stroop-rule">${esc(t('lab_rule'))}</p>
                    <div class="lab-stroop-screen">
                        <span class="lab-stroop-word" data-word></span>
                        <span class="lab-stroop-mark" data-mark></span>
                        <i class="lab-stroop-limit" data-limit></i>
                    </div>
                    <div class="lab-stroop-keys">${keys}</div>
                </section>
            `);
            const wordEl = stage.querySelector('[data-word]');
            const markEl = stage.querySelector('[data-mark]');
            const limitEl = stage.querySelector('[data-limit]');
            const keyEls = Array.from(stage.querySelectorAll('[data-ink]'));
            const segmentStart = performance.now();
            const hideStrip = showStrip({ label, cond, totalMs: totalSec * 1000 });
            startSampling(phase, cond, totalSec);

            let cursor = 0;
            let seq = 0;
            let current = null;
            let limitTimer = null;
            let gapTimer = null;
            let finished = false;

            const showNext = () => {
                if (finished) return;
                const question = bank[cursor % bank.length];
                const lap = Math.floor(cursor / bank.length);
                cursor += 1;
                wordEl.textContent = inkLabel(question.word, langCode);
                wordEl.style.color = STROOP_INKS[question.ink].hex;
                wordEl.dataset.no = String(question.no);
                wordEl.dataset.ink = STROOP_INKS[question.ink].id;
                wordEl.classList.add('is-shown');
                markEl.textContent = '';
                markEl.className = 'lab-stroop-mark';
                limitEl.classList.remove('is-running');
                // Stamp the start time on the frame the word is painted.
                requestAnimationFrame(() => {
                    if (finished) return;
                    void limitEl.offsetWidth;
                    limitEl.style.animationDuration = `${STROOP_LIMIT_MS}ms`;
                    limitEl.classList.add('is-running');
                    current = { question, lap, onset: performance.now() };
                    limitTimer = later(() => answer(-1, true), STROOP_LIMIT_MS);
                });
            };

            function answer(inkIndex, timedOut = false) {
                if (!current || finished) return;
                const now = performance.now();
                if (limitTimer) cancel(limitTimer);
                const { question, lap, onset } = current;
                current = null;
                seq += 1;
                const correct = !timedOut && inkIndex === question.ink;
                trials.push({
                    phase,
                    cond,
                    seq,
                    no: question.no,
                    lap,
                    word: STROOP_INKS[question.word].id,
                    ink: STROOP_INKS[question.ink].id,
                    congruent: question.congruent,
                    response: timedOut ? '' : STROOP_INKS[inkIndex].id,
                    correct,
                    rtMs: timedOut ? STROOP_LIMIT_MS : Math.round(now - onset),
                    timeout: timedOut,
                    atSec: Math.round((now - segmentStart) / 100) / 10
                });
                wordEl.classList.remove('is-shown');
                limitEl.classList.remove('is-running');
                markEl.textContent = timedOut ? t('lab_feedback_slow') : (correct ? '✓' : '✗');
                markEl.className = `lab-stroop-mark is-shown ${correct ? 'is-right' : 'is-wrong'}`;
                markEl.setAttribute('aria-label', timedOut ? t('lab_feedback_slow') : t(correct ? 'lab_feedback_right' : 'lab_feedback_wrong'));
                keyEls.forEach((el, i) => el.classList.toggle('is-pressed', i === inkIndex));
                gapTimer = later(() => {
                    keyEls.forEach((el) => el.classList.remove('is-pressed'));
                    showNext();
                }, STROOP_GAP_MS);
            }

            // event.code, not event.key: a Chinese input method reports the key
            // as "Process", but the physical key code stays KeyD / KeyF / ...
            const onKey = (event) => {
                if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
                const index = STROOP_INKS.findIndex((ink) => ink.code === event.code);
                if (index === -1) return;
                event.preventDefault();
                answer(index);
            };
            const onPointer = (event) => {
                const btn = event.target.closest('[data-ink]');
                if (!btn) return;
                event.preventDefault();
                answer(Number(btn.dataset.ink));
            };
            window.addEventListener('keydown', onKey, true);
            stage.addEventListener('pointerdown', onPointer);
            const removeListeners = () => {
                window.removeEventListener('keydown', onKey, true);
                stage.removeEventListener('pointerdown', onPointer);
            };
            disposers.push(removeListeners);

            later(() => {
                // Time is up: the word on screen, if any, is dropped unanswered.
                finished = true;
                current = null;
                if (limitTimer) cancel(limitTimer);
                if (gapTimer) cancel(gapTimer);
                removeListeners();
                stopSampling();
                hideStrip();
                resolve();
            }, totalSec * 1000);

            showNext();
        });
    }

    // ---- quick try-out: live focus line -------------------------------------
    function createLine(totalSec) {
        const host = $('[data-lab-line]');
        const W = 400;
        const H = 120;
        const PAD = 8;
        host.hidden = false;
        root.dataset.line = 'on';
        host.innerHTML = `
            <div class="lab-line-head">
                <span class="lab-line-title">${esc(t('lab_quick_line_title'))}</span>
                <span class="lab-line-legend"><i data-seg="1"></i>${esc(t('lab_quick_legend_1'))}</span>
                <span class="lab-line-legend"><i data-seg="2"></i>${esc(t('lab_quick_legend_2'))}</span>
            </div>
            <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
                <line class="lab-line-grid" x1="0" x2="${W}" y1="${PAD}" y2="${PAD}"></line>
                <line class="lab-line-grid" x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}"></line>
                <line class="lab-line-grid" x1="0" x2="${W}" y1="${H - PAD}" y2="${H - PAD}"></line>
                <line class="lab-line-split" x1="${W / 2}" x2="${W / 2}" y1="0" y2="${H}"></line>
                <polyline data-seg="1" points=""></polyline>
                <polyline data-seg="2" points=""></polyline>
                <circle class="lab-line-pen" data-pen r="4" cx="0" cy="0"></circle>
            </svg>
        `;
        const lines = { 1: host.querySelector('polyline[data-seg="1"]'), 2: host.querySelector('polyline[data-seg="2"]') };
        const pen = host.querySelector('[data-pen]');
        const points = { 1: [], 2: [] };
        let smooth = null;
        return {
            push(elapsedSec, value, segment) {
                smooth = smooth === null ? value : smooth + 0.35 * (value - smooth);
                const x = Math.min(W, (elapsedSec / totalSec) * W);
                const y = H - PAD - (Math.max(0, Math.min(100, smooth)) / 100) * (H - PAD * 2);
                const point = `${x.toFixed(1)},${y.toFixed(1)}`;
                // Start the second colour from the last point of the first.
                if (segment === 2 && points[2].length === 0 && points[1].length) {
                    points[2].push(points[1][points[1].length - 1]);
                }
                points[segment].push(point);
                lines[segment].setAttribute('points', points[segment].join(' '));
                pen.dataset.seg = String(segment);
                pen.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
            },
            hide() { host.hidden = true; host.innerHTML = ''; delete root.dataset.line; }
        };
    }

    // ---- flows ----------------------------------------------------------------
    async function runFull() {
        const practiceBank = buildStroopBank(PRACTICE_SEED, STROOP_BLOCK_SIZE);
        const bank = buildStroopBank(STROOP_SEED);
        const order = peekOrder(source);
        const [first, second] = conditionsForOrder(order);
        const segSec = sec(LAB_RULES.segmentSec);
        const ratings = {};

        await stageCheck();
        await stageCard({
            name: 'practice-intro',
            title: t('lab_practice_title'),
            body: `${ruleBlock()}<p class="lab-fine">${esc(t('lab_practice_note'))}</p>`,
            button: t('lab_practice_start')
        });
        await getReady();
        await stageStroop({ phase: 'practice', totalSec: sec(LAB_RULES.practiceSec), bank: practiceBank, label: t('lab_practice_label') });
        await stageRest();

        const condIntro = (cond, round) => stageCard({
            name: 'cond-intro',
            cond,
            eyebrow: t(round === 1 ? 'lab_round_1' : 'lab_round_2'),
            title: condName(cond),
            body: `<p class="lab-place">${esc(placeText(cond))}</p><p class="lab-fine">${esc(t('lab_cond_intro_note'))}</p>`,
            button: t('lab_start')
        });
        const runCond = async (cond, round) => {
            await getReady();
            await stageStroop({
                phase: 'test',
                cond,
                totalSec: segSec,
                bank,
                label: `${t(round === 1 ? 'lab_round_1' : 'lab_round_2')} · ${condName(cond)}`
            });
            ratings[cond] = await stageRate(round);
        };

        await condIntro(first, 1);
        await runCond(first, 1);
        await stageSwitch(second);
        await runCond(second, 2);

        setStage(`<div class="lab-ready" data-stage="saving">${esc(t('lab_saving'))}</div>`);

        const build = (cond) => {
            const condTrials = trials.filter((tr) => tr.phase === 'test' && tr.cond === cond);
            return {
                position: cond === first ? 1 : 2,
                task: summarizeTrials(condTrials),
                signal: summarizeSeconds(seconds.filter((r) => r.phase === 'test' && r.cond === cond), segSec),
                rating: ratings[cond],
                // True if the participant answered more than the whole bank.
                wrapped: condTrials.some((tr) => tr.lap > 0)
            };
        };
        const conditions = { on: build('on'), off: build('off') };
        const record = {
            id: newSessionId(),
            version: 1,
            user,
            startedAt: startedAtIso,
            finishedAt: new Date().toISOString(),
            source,
            order,
            seed: STROOP_SEED,
            limitMs: STROOP_LIMIT_MS,
            lang: langCode,
            fast,
            segmentSec: segSec,
            conditions,
            rest: summarizeSeconds(seconds.filter((r) => r.phase === 'rest'), sec(LAB_RULES.restSec)),
            comparison: compareConditions(conditions.on, conditions.off),
            seconds,
            trials
        };
        saveSession(record);
        commitOrder(source, order);
        if (typeof onFinish === 'function') onFinish(record.id);
    }

    async function runQuick() {
        const segSec = sec(LAB_RULES.quickSegmentSec);
        // The try-out uses the practice set, so it never shows the scored questions.
        const bank = buildStroopBank(PRACTICE_SEED, STROOP_BLOCK_SIZE * 2);

        await stageCheck();
        await stageCard({
            name: 'quick-intro',
            eyebrow: t('lab_quick_title'),
            title: t('lab_question'),
            body: `<p class="lab-lead">${esc(t('lab_quick_lead'))}</p>${ruleBlock()}`,
            button: t('lab_start')
        });
        await getReady();

        const line = createLine(segSec * 2);
        const lineStart = performance.now();
        // The colour of the line follows the clock, not the screen change, so
        // the split always sits exactly at the halfway mark.
        const stopLine = every(() => {
            const elapsed = (performance.now() - lineStart) / 1000;
            if (elapsed <= segSec * 2) line.push(elapsed, runtime.getLabSample().focus, elapsed < segSec ? 1 : 2);
        }, 250);

        await stageStroop({ phase: 'quick-1', totalSec: segSec, bank, label: t('lab_quick_seg1') });

        await new Promise((resolve) => {
            setStage(`
                <section class="lab-phone" data-stage="quick-2">
                    <h2>${esc(t('lab_quick_seg2'))}</h2>
                    <p>${esc(t('lab_quick_seg2_sub'))}</p>
                </section>
            `);
            const hideStrip = showStrip({ label: t('lab_quick_seg2'), totalMs: segSec * 1000 });
            startSampling('quick-2', '', segSec);
            later(() => { stopSampling(); hideStrip(); resolve(); }, segSec * 1000);
        });
        stopLine();

        const result = summarizeQuick(
            seconds.filter((r) => r.phase === 'quick-1'),
            seconds.filter((r) => r.phase === 'quick-2')
        );
        const headline = !result.usable
            ? t('lab_quick_unusable')
            : t(result.verdict === 'dropped' ? 'lab_quick_dropped' : 'lab_quick_same');
        const means = result.usable
            ? fill(t('lab_quick_means'), { a: Math.round(result.firstMean), b: Math.round(result.secondMean) })
            : '';
        setStage(`
            <section class="lab-card lab-card-result" data-stage="quick-result" data-verdict="${result.usable ? result.verdict : 'unusable'}">
                <p class="lab-eyebrow">${esc(t('lab_quick_title'))}</p>
                <h2>${esc(headline)}</h2>
                ${means ? `<p class="lab-lead lab-mono-numbers">${esc(means)}</p>` : ''}
                <p class="lab-fine">${esc(t(`lab_quick_note_${source}`))}</p>
                <p class="lab-fine">${esc(t('lab_demo_tag'))}</p>
                <div class="lab-actions">
                    <button type="button" class="lab-btn lab-btn-primary" data-quick-full>${esc(t('lab_quick_full'))}</button>
                    <button type="button" class="lab-btn" data-quick-again>${esc(t('lab_quick_again'))}</button>
                    <button type="button" class="lab-btn" data-quick-home>${esc(t('back_home'))}</button>
                </div>
            </section>
        `);
        stage.querySelector('[data-quick-full]').addEventListener('click', () => onQuickFull?.());
        stage.querySelector('[data-quick-again]').addEventListener('click', () => onQuickAgain?.());
        stage.querySelector('[data-quick-home]').addEventListener('click', () => onHome?.());
    }

    return {
        // Called by the runtime once the entry countdown has finished.
        start() {
            if (started || dead) return;
            started = true;
            source = runtime.getLabSample().source;
            fast = source !== 'eeg' && readFastFlag();
            scale = fast ? 0.1 : 1;
            root.dataset.source = source;
            root.dataset.mode = isQuick ? 'quick' : 'full';
            if (isQuick) {
                tag.textContent = t('lab_demo_tag');
                tag.hidden = false;
            } else if (source !== 'eeg') {
                tag.textContent = t(source === 'camera' ? 'lab_tag_camera' : 'lab_tag_demo');
                tag.hidden = false;
            }
            (isQuick ? runQuick() : runFull()).catch((error) => {
                if (!dead) console.error('Experiment flow stopped:', error);
            });
        },
        destroy() {
            dead = true;
            timeouts.forEach((id) => clearTimeout(id));
            intervals.forEach((id) => clearInterval(id));
            timeouts.clear();
            intervals.clear();
            disposers.forEach((fn) => { try { fn(); } catch (e) { /* already gone */ } });
            root.innerHTML = '';
        }
    };
}
