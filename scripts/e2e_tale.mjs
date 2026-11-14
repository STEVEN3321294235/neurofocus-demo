// Browser run-through of the experiment mode (Playwright + local server).
//
//   python3 serve_local.py               # in another terminal (port 8000)
//   node scripts/e2e_tale.mjs quick-demo
//   node scripts/e2e_tale.mjs full-demo [--real-time] [--runs=10]
//   node scripts/e2e_tale.mjs quick-camera | full-camera
//   node scripts/e2e_tale.mjs full-eeg        # needs tests/fake_headset.py + eeg_bridge.py
//   node scripts/e2e_tale.mjs old-modes       # training, challenge, study still work
//   node scripts/e2e_tale.mjs old-frontend    # NF_BASE = a copy of the OLD site + new bridge
//   node scripts/e2e_tale.mjs offline         # every non-local request blocked
//
// Rehearsal runs use ?labfast=1 (every stage at one tenth of its length; the
// app only honours it when the input is not the brainwave headband).
// --real-time runs the true 5-minute flow.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = process.env.NF_BASE || 'http://localhost:8000';
const OUT = process.env.NF_OUT || path.resolve('e2e-output');
const args = process.argv.slice(2);
const scenario = args[0] || 'quick-demo';
const realTime = args.includes('--real-time');
const runs = Number((args.find((a) => a.startsWith('--runs=')) || '--runs=1').split('=')[1]);
const lang = (args.find((a) => a.startsWith('--lang=')) || '--lang=hk').split('=')[1];
fs.mkdirSync(OUT, { recursive: true });

const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);
const KEY_FOR = { red: 'KeyD', blue: 'KeyF', green: 'KeyJ', yellow: 'KeyK' };

async function launch({ camera = false, offline = false } = {}) {
    const browser = await chromium.launch({
        args: [
            '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
            ...(camera ? ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] : [])
        ]
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        acceptDownloads: true,
        permissions: camera ? ['camera'] : []
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    page.on('dialog', (d) => d.accept());
    if (offline) {
        // Block everything that is not this machine, like a venue with no network.
        await context.route('**/*', (route) => {
            const url = new URL(route.request().url());
            if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
            return route.abort('internetdisconnected');
        });
    }
    return { browser, context, page, errors };
}

async function open(page, { user = null, fast = true } = {}) {
    await page.addInitScript(([u, l]) => {
        try {
            if (u) localStorage.setItem('current_user', u);
            localStorage.setItem('game_lang', l);
        } catch (e) { /* ignore */ }
    }, [user, lang]);
    await page.goto(`${BASE}/${fast ? '?labfast=1' : '?labfast=0'}#home`);
    await page.waitForSelector('[data-lab-start]');
}

// Answer colour-word questions until the stage ends. `accuracy` is the share
// answered correctly; the rest get a wrong key.
async function answerUntilDone(page, { accuracy = 0.92, delayMs = 420 } = {}) {
    let answered = 0;
    let lastNo = null;
    for (;;) {
        const state = await page.evaluate(() => {
            const el = document.querySelector('#lab-layer [data-stage="stroop"] [data-word]');
            if (!el) return null;
            return { shown: el.classList.contains('is-shown'), no: el.dataset.no, ink: el.dataset.ink };
        });
        if (!state) return answered;
        if (state.shown && state.no !== lastNo) {
            await page.waitForTimeout(delayMs);
            const inks = Object.keys(KEY_FOR);
            const right = Math.random() < accuracy;
            const ink = right ? state.ink : inks.find((i) => i !== state.ink);
            await page.keyboard.press(KEY_FOR[ink]);
            lastNo = state.no;
            answered += 1;
        } else {
            await page.waitForTimeout(40);
            lastNo = state.shown ? lastNo : null;
        }
    }
}

async function enterGame(page, { mode, source }) {
    await page.click(mode === 'quick' ? '[data-lab-quick]' : '[data-lab-start]');
    await page.waitForSelector('.page-setup');
    if (source === 'demo') {
        await page.click('[data-lab-demo]');
    } else if (source === 'eeg') {
        await page.click('[data-mode="eeg"]');
    } else {
        await page.click('[data-mode="simulation"]');
        await page.click('[data-camera-allow]');
        await page.click('[data-camera-continue]');
    }
    await page.waitForSelector('#lab-layer [data-stage="check"]', { timeout: 90000 });
}

async function passCheck(page) {
    await page.waitForSelector('[data-check-go]:not([disabled])', { timeout: 60000 });
    await page.click('[data-check-go]');
}

async function runQuick(page, source) {
    await enterGame(page, { mode: 'quick', source });
    const tag = await page.textContent('[data-lab-tag]');
    await passCheck(page);
    await page.click('[data-stage="quick-intro"] [data-card-go]');
    await page.waitForSelector('[data-stage="stroop"]');
    const answered = await answerUntilDone(page);
    await page.waitForSelector('[data-stage="quick-2"]');
    const lineVisible = await page.isVisible('[data-lab-line] svg');
    await page.screenshot({ path: path.join(OUT, `quick-${source}-phone.png`) });
    await page.waitForSelector('[data-stage="quick-result"]', { timeout: 60000 });
    const verdict = await page.getAttribute('[data-stage="quick-result"]', 'data-verdict');
    const headline = await page.textContent('[data-stage="quick-result"] h2');
    await page.screenshot({ path: path.join(OUT, `quick-${source}-result.png`) });
    const saved = await page.evaluate(() => localStorage.getItem('nf_lab_sessions_v1'));
    return { tag, answered, lineVisible, verdict, headline, savedAnything: Boolean(saved) };
}

async function runFull(page, source, { shots = false, accuracy = [0.9, 0.9] } = {}) {
    await enterGame(page, { mode: 'lab', source });
    await passCheck(page);
    await page.click('[data-stage="practice-intro"] [data-card-go]');
    await page.waitForSelector('[data-stage="stroop"][data-phase="practice"]');
    const breathingSeen = [];
    const watchBreathing = setInterval(async () => {
        try {
            const on = await page.evaluate(() => {
                const a = document.getElementById('breathing-prompt');
                const b = document.getElementById('breathing-intervention');
                return (a && a.style.display !== 'none' && a.classList.contains('active'))
                    || (b && b.style.display !== 'none' && b.classList.contains('active'));
            });
            if (on) breathingSeen.push(Date.now());
        } catch (e) { /* page busy */ }
    }, 500);
    await answerUntilDone(page);
    await page.waitForSelector('[data-stage="rest"]');
    if (shots) await page.screenshot({ path: path.join(OUT, `full-${source}-rest.png`) });
    await page.waitForSelector('[data-stage="cond-intro"]', { timeout: 120000 });
    const firstCond = await page.getAttribute('[data-stage="cond-intro"]', 'data-cond');
    if (shots) await page.screenshot({ path: path.join(OUT, `full-${source}-cond-intro.png`) });
    await page.click('[data-stage="cond-intro"] [data-card-go]');
    await page.waitForSelector('[data-stage="stroop"][data-phase="test"]');
    if (shots) { await page.waitForTimeout(600); await page.screenshot({ path: path.join(OUT, `full-${source}-test.png`) }); }
    const firstNos = [];
    const grab = setInterval(async () => {
        try {
            const no = await page.evaluate(() => document.querySelector('[data-stage="stroop"] [data-word]')?.dataset.no);
            if (no && firstNos[firstNos.length - 1] !== no) firstNos.push(no);
        } catch (e) { /* ignore */ }
    }, 60);
    await answerUntilDone(page, { accuracy: accuracy[0] });
    clearInterval(grab);
    await page.waitForSelector('[data-stage="rate"]', { timeout: 120000 });
    if (shots) await page.screenshot({ path: path.join(OUT, `full-${source}-rate.png`) });
    await page.click('[data-rate="6"]');
    await page.click('[data-rate-go]');
    await page.waitForSelector('[data-stage="switch"]');
    const secondCond = await page.getAttribute('[data-stage="switch"]', 'data-cond');
    if (shots) await page.screenshot({ path: path.join(OUT, `full-${source}-switch.png`) });
    await page.waitForSelector('[data-switch-go]:not([disabled])', { timeout: 60000 });
    await page.click('[data-switch-go]');
    await page.waitForSelector('[data-stage="stroop"][data-phase="test"]');
    await answerUntilDone(page, { accuracy: accuracy[1] });
    await page.waitForSelector('[data-stage="rate"]', { timeout: 120000 });
    await page.click('[data-rate="7"]');
    await page.click('[data-rate-go]');
    clearInterval(watchBreathing);
    await page.waitForSelector('.page-lab-results', { timeout: 30000 });
    await page.waitForTimeout(1200);
    const record = await page.evaluate(() => {
        const all = JSON.parse(localStorage.getItem('nf_lab_sessions_v1') || '[]');
        return all[all.length - 1];
    });
    return { firstCond, secondCond, breathingSeen: breathingSeen.length, firstNos, record };
}

function sameQuestions(record) {
    const seq = (cond) => record.trials.filter((t) => t.phase === 'test' && t.cond === cond).map((t) => `${t.no}:${t.word}/${t.ink}`);
    const a = seq('on');
    const b = seq('off');
    const n = Math.min(a.length, b.length);
    return { n, identical: a.slice(0, n).join() === b.slice(0, n).join(), startsAtOne: a[0]?.startsWith('1:') && b[0]?.startsWith('1:') };
}

// ---- the three older modes -------------------------------------------------
async function toSetupGoal(page) {
    await page.click('[data-enter-app]');
    await page.waitForSelector('[data-continue-setup]');
    await page.click('[data-continue-setup]');
    await page.waitForSelector('[data-test-mode="training"]');
}

async function chooseBuiltInCurve(page) {
    await page.click('[data-mode="simulation"]');
    await page.click('[data-camera-deny]');
}

async function hudState(page) {
    return page.evaluate(() => {
        const shown = (id) => {
            const el = document.getElementById(id);
            return Boolean(el && getComputedStyle(el).display !== 'none');
        };
        return {
            labSession: document.body.classList.contains('lab-session'),
            labLayerEmpty: !document.getElementById('lab-layer') || document.getElementById('lab-layer').children.length === 0,
            trainingCountdown: shown('training-countdown-display'),
            questionPanel: shown('question-panel'),
            score: shown('score-display'),
            studyReader: shown('study-reader'),
            flowRing: shown('flow-ring'),
            voyageCard: shown('voyage-card'),
            focusValue: document.getElementById('focus-value')?.textContent || ''
        };
    });
}

async function runOldModes(page) {
    const out = {};
    const hasLabLayer = await page.evaluate(() => true);

    // Training: shortest session (30 s), built-in curve, through to results.
    await toSetupGoal(page);
    await page.click('[data-test-mode="training"]');
    await chooseBuiltInCurve(page);
    await page.waitForSelector('#training-duration-slider');
    await page.evaluate(() => {
        const slider = document.getElementById('training-duration-slider');
        slider.value = '30';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.click('[data-training-start]');
    await page.waitForFunction(() => document.getElementById('ui-container')?.style.opacity === '1', null, { timeout: 120000 });
    await page.waitForTimeout(5000);
    out.training = { hud: await hudState(page) };
    await page.waitForSelector('.page-results', { timeout: 180000 });
    await page.waitForTimeout(1500);
    out.training.results = await page.evaluate(() => ({
        heroChars: document.getElementById('results-hero')?.textContent.trim().length || 0,
        metricCards: document.querySelectorAll('#results-metrics > *').length,
        historyEntries: JSON.parse(localStorage.getItem('session_history') || '[]').length,
        lastMode: localStorage.getItem('last_session_mode')
    }));

    // Challenge: easy, answer the questions through to results.
    await page.click('#btn-home');
    await page.waitForSelector('[data-enter-app]');
    await toSetupGoal(page);
    await page.click('[data-test-mode="challenge"]');
    await chooseBuiltInCurve(page);
    await page.click('[data-difficulty="easy"]');
    await page.waitForSelector('#question-panel .option-btn', { timeout: 120000 });
    out.challenge = { hud: await hudState(page) };
    let clicks = 0;
    const deadline = Date.now() + 240000;
    while (Date.now() < deadline) {
        if (await page.$('.page-results')) break;
        const btn = await page.$('#question-panel .option-btn:not([disabled])');
        if (btn) { try { await btn.click({ timeout: 1000 }); clicks += 1; } catch (e) { /* re-rendered */ } }
        await page.waitForTimeout(300);
    }
    await page.waitForSelector('.page-results', { timeout: 30000 });
    await page.waitForTimeout(1500);
    out.challenge.answers = clicks;
    out.challenge.results = await page.evaluate(() => ({
        heroChars: document.getElementById('results-hero')?.textContent.trim().length || 0,
        historyEntries: JSON.parse(localStorage.getItem('session_history') || '[]').length,
        lastMode: localStorage.getItem('last_session_mode')
    }));

    // Study: open the reader and turn one page.
    await page.click('#btn-home');
    await page.waitForSelector('[data-enter-app]');
    await toSetupGoal(page);
    await page.click('[data-test-mode="study"]');
    await page.click('[data-subject="biology"]');
    await page.click('[data-depth="foundation"]');
    await chooseBuiltInCurve(page);
    await page.waitForFunction(() => {
        const el = document.getElementById('study-reader');
        return el && getComputedStyle(el).display !== 'none' && document.getElementById('study-reader-title')?.textContent;
    }, null, { timeout: 120000 });
    out.study = {
        hud: await hudState(page),
        title: await page.textContent('#study-reader-title'),
        progress: await page.textContent('#study-reader-progress')
    };
    return out;
}

async function main() {
    const report = { scenario, realTime, lang };
    if (scenario === 'old-modes') {
        const { browser, page, errors } = await launch();
        await open(page, { user: 'tester01' });
        report.modes = await runOldModes(page);
        report.errors = errors;
        await browser.close();
    } else if (scenario === 'old-frontend') {
        // The site as it was BEFORE this work, talking to the NEW bridge.
        const { browser, page, errors } = await launch();
        await page.addInitScript(() => { try { localStorage.setItem('current_user', 'tester01'); } catch (e) { /* ignore */ } });
        await page.goto(`${BASE}/#home`);
        await page.waitForSelector('[data-enter-app]');
        await toSetupGoal(page);
        await page.click('[data-test-mode="training"]');
        await page.click('[data-mode="eeg"]');
        await page.waitForSelector('[data-training-start]', { timeout: 60000 });
        await page.click('[data-training-start]');
        await page.waitForFunction(() => document.getElementById('ui-container')?.style.opacity === '1', null, { timeout: 120000 });
        await page.waitForTimeout(12000);
        report.hud = await page.evaluate(() => ({
            focusValue: document.getElementById('focus-value')?.textContent,
            signalChip: document.getElementById('eeg-signal-chip')?.textContent,
            attention: document.getElementById('eeg-attention-value')?.textContent,
            meditation: document.getElementById('eeg-meditation-value')?.textContent,
            playTime: document.getElementById('training-countdown-value')?.textContent
        }));
        report.hasLabLayer = await page.evaluate(() => Boolean(document.getElementById('lab-layer')));
        report.errors = errors;
        await browser.close();
    } else if (scenario === 'offline') {
        const { browser, page, errors } = await launch({ offline: true });
        await open(page, { user: 'tester01' });
        report.home = await page.evaluate(() => ({
            title: document.querySelector('h1')?.textContent.trim(),
            buttons: document.querySelectorAll('[data-lab-start], [data-lab-quick]').length
        }));
        await page.screenshot({ path: path.join(OUT, 'offline-home.png') });
        report.quick = await runQuick(page, 'demo');
        report.fonts = await page.evaluate(async () => {
            await document.fonts.ready;
            return Array.from(document.fonts).filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`).sort();
        });
        report.errors = errors;
        await browser.close();
    } else if (scenario === 'quick-demo' || scenario === 'quick-camera') {
        const source = scenario.endsWith('camera') ? 'camera' : 'demo';
        const { browser, page, errors } = await launch({ camera: source === 'camera' });
        await open(page, { fast: !realTime });
        report.result = await runQuick(page, source);
        report.errors = errors;
        await browser.close();
    } else if (scenario === 'full-demo' || scenario === 'full-camera' || scenario === 'full-eeg') {
        const source = scenario.split('-')[1];
        const { browser, page, errors } = await launch({ camera: source === 'camera' });
        // The headband can never be sped up, so that run is always real time.
        await open(page, { user: 'tester01', fast: !realTime && source !== 'eeg' });
        report.runs = [];
        for (let i = 0; i < runs; i += 1) {
            if (i > 0) {
                await page.click('[data-lab-home]');
                await page.waitForSelector('[data-lab-start]');
            }
            const r = await runFull(page, source, { shots: i === 0 });
            const rec = r.record;
            report.runs.push({
                run: i + 1,
                order: rec.order,
                first: r.firstCond,
                second: r.secondCond,
                breathingSeen: r.breathingSeen,
                source: rec.source,
                fast: rec.fast,
                segmentSec: rec.segmentSec,
                secondsOn: rec.seconds.filter((s) => s.phase === 'test' && s.cond === 'on').length,
                secondsOff: rec.seconds.filter((s) => s.phase === 'test' && s.cond === 'off').length,
                answeredOn: rec.conditions.on.task.answered,
                answeredOff: rec.conditions.off.task.answered,
                accOn: rec.conditions.on.task.accuracyPct,
                accOff: rec.conditions.off.task.accuracyPct,
                rtOn: rec.conditions.on.task.meanRtMs,
                rtOff: rec.conditions.off.task.meanRtMs,
                ratings: [rec.conditions.on.rating, rec.conditions.off.rating],
                signalValid: rec.comparison.signal.valid,
                goodSeconds: [rec.conditions.on.signal.goodSeconds, rec.conditions.off.signal.goodSeconds],
                focusMean: [rec.conditions.on.signal.focusMean, rec.conditions.off.signal.focusMean],
                indexMean: [rec.conditions.on.signal.indexMean, rec.conditions.off.signal.indexMean],
                rowsWithBands: rec.seconds.filter((s) => s.bands).length,
                sampleSecond: rec.seconds.find((s) => s.phase === 'test' && s.bands) || null,
                verdict: rec.comparison.verdict,
                sameQuestions: sameQuestions(rec)
            });
            log(`run ${i + 1}/${runs}: order=${rec.order}`);
            if (i === 0) {
                await page.screenshot({ path: path.join(OUT, `full-${source}-results.png`), fullPage: true });
                report.verdictText = await page.textContent('.nb-verdict');
                report.agreeText = (await page.textContent('.nb-agree')).replace(/\s+/g, ' ').trim();
                report.signalInvalidText = await page.evaluate(() => document.querySelector('[data-signal-invalid]')?.textContent || null);
                report.rehearsalShown = await page.evaluate(() => Boolean(document.querySelector('[data-rehearsal]')));
                // Downloads: all three CSV files.
                report.csv = {};
                for (const kind of ['summary', 'seconds', 'answers']) {
                    const [download] = await Promise.all([
                        page.waitForEvent('download'),
                        page.click(`[data-export="${kind}"]`)
                    ]);
                    const file = path.join(OUT, download.suggestedFilename());
                    await download.saveAs(file);
                    const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
                    const lines = text.trim().split(/\r?\n/);
                    report.csv[kind] = { file: path.basename(file), header: lines[0], rows: lines.length - 1 };
                }
            }
        }
        report.orders = report.runs.map((r) => r.order);
        report.errors = errors;
        await browser.close();
    } else {
        throw new Error(`Unknown scenario: ${scenario}`);
    }
    fs.writeFileSync(path.join(OUT, `report-${scenario}${realTime ? '-realtime' : ''}.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
    console.error('E2E FAILED:', error);
    process.exit(1);
});
