// "Your answer": the results page of the experiment mode.
//
// Reads the finished test from local storage (pages/lab/labStore.js), so it
// survives a refresh. Layout, top to bottom:
//   the question -> one-sentence answer -> small print
//   -> three rows, each with a blue bar (phone on the desk) and a gold bar
//      (phone out of the room): task, brainwaves, how it felt
//   -> do the three agree? -> downloads -> earlier tests of this account

import { t } from '../../app/i18n.js?v=2026-07-28-2';
import { getState, resetFlowState, setState } from '../../app/state.js';
import { getLastSession, listSessions } from './labStore.js?v=2026-07-28-2';
import { summaryCsv, secondsCsv, trialsCsv, fileName, downloadCsv } from './labCsv.js?v=2026-07-28-2';
import { conditionsForOrder } from './labAnalysis.js?v=2026-07-28-2';

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function fill(text, vars = {}) {
    return Object.keys(vars).reduce((out, key) => out.replace(`{${key}}`, vars[key]), text);
}

const condName = (cond) => t(cond === 'on' ? 'lab_cond_on' : 'lab_cond_off');

// The one-sentence answer, built from the numbers.
export function buildVerdict(cmp) {
    if (!cmp || cmp.verdict !== 'clear') return t('labres_same');
    const task = cmp.task;
    // Counted over the same number of questions in both tests (see
    // labAnalysis.compareConditions), so it never contradicts the accuracy bars.
    const n = Math.abs(task.rightGap);
    const right = n === 0
        ? t('labres_same_right')
        : fill(t(task.rightGap > 0 ? 'labres_more_right' : 'labres_fewer_right'), { n });
    const rightDir = Math.sign(task.rightGap);
    const secs = task.rtGapMs === null ? null : Math.abs(task.rtGapMs) / 1000;
    const speedDir = secs === null || secs < 0.005 ? 0 : Math.sign(task.rtGapMs);
    const speed = speedDir === 0
        ? t('labres_same_speed')
        : fill(t(speedDir > 0 ? 'labres_faster' : 'labres_slower'), { s: secs.toFixed(2) });
    // "but" when one half is better and the other worse.
    const opposed = rightDir !== 0 && speedDir !== 0 && rightDir !== speedDir;
    const worse = !opposed && (rightDir < 0 || speedDir < 0) && rightDir <= 0 && speedDir <= 0;
    const prefix = t(worse ? 'labres_prefix_worse' : 'labres_prefix');
    // No reaction time to compare (one test had no correct answers at all):
    // say only what is known.
    if (secs === null) return `${prefix}${right}${t('labres_end')}`;
    return `${prefix}${right}${t(opposed ? 'labres_join_but' : 'labres_join')}${speed}${t('labres_end')}`;
}

function dirText(dir, tradeOff = false) {
    if (tradeOff) return t('labres_dir_mixed');
    if (dir > 0) return t('labres_dir_better');
    if (dir < 0) return t('labres_dir_worse');
    return t('labres_dir_same');
}

// Two bars for one measure. `max` fixes the scale; `format` writes the number.
function barPair({ label, on, off, max, format, hint = '' }) {
    const bar = (cond, value) => {
        const has = Number.isFinite(value);
        const ratio = has && max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
        return `
            <div class="nb-bar" data-cond="${cond}">
                <span class="nb-bar-name">${esc(condName(cond))}</span>
                <span class="nb-bar-track"><i class="nb-bar-fill" data-grow="${ratio.toFixed(4)}"></i></span>
                <span class="nb-bar-value nb-mono" ${has ? `data-count="${value}" data-format="${format}"` : ''}>${has ? '0' : '—'}</span>
            </div>`;
    };
    return `
        <div class="nb-measure">
            <div class="nb-measure-label">${esc(label)}${hint ? `<span class="nb-measure-hint">· ${esc(hint)}</span>` : ''}</div>
            ${bar('on', on)}
            ${bar('off', off)}
        </div>`;
}

function renderRows(session) {
    const { on, off } = session.conditions;
    const cmp = session.comparison;
    const source = session.source;

    const rtMax = Math.max(on.task.meanRtMs || 0, off.task.meanRtMs || 0, 1) / 1000;
    const taskRow = `
        <section class="nb-row" data-row="task">
            <header class="nb-row-head">
                <h2><span class="nb-row-no nb-mono">1</span>${esc(t('labres_row_task'))}</h2>
                <span class="nb-row-dir" data-dir="${cmp.task.dir}">${esc(dirText(cmp.task.dir, cmp.task.tradeOff))}</span>
            </header>
            ${barPair({ label: t('labres_accuracy'), on: on.task.accuracyPct, off: off.task.accuracyPct, max: 100, format: 'pct' })}
            ${barPair({ label: t('labres_rt'), hint: t('labres_unit_sec'), on: (on.task.meanRtMs ?? NaN) / 1000, off: (off.task.meanRtMs ?? NaN) / 1000, max: rtMax, format: 'sec' })}
            <p class="nb-fine nb-mono-numbers">
                ${esc(condName('on'))}：${esc(fill(t('labres_answers_count'), { c: on.task.correct, n: on.task.answered }))}　
                ${esc(condName('off'))}：${esc(fill(t('labres_answers_count'), { c: off.task.correct, n: off.task.answered }))}
            </p>
        </section>`;

    const signalValid = cmp.signal.valid;
    const hasBands = on.signal.hasBands && off.signal.hasBands;
    const indexMax = Math.max(on.signal.indexMean || 0, off.signal.indexMean || 0, 0.001);
    let signalBody;
    if (!signalValid) {
        signalBody = `
            <p class="nb-invalid" data-signal-invalid>${esc(t('labres_signal_invalid'))}</p>
            <p class="nb-fine nb-mono-numbers">${esc(fill(t('labres_signal_seconds'), { a: on.signal.goodSeconds, b: off.signal.goodSeconds }))}</p>`;
    } else {
        signalBody = `
            ${barPair({ label: t('labres_focus'), on: on.signal.focusMean, off: off.signal.focusMean, max: 100, format: 'int' })}
            ${source === 'eeg' && hasBands
                ? barPair({ label: t('labres_index'), on: on.signal.indexMean, off: off.signal.indexMean, max: indexMax, format: 'index' })
                : ''}
            ${source === 'eeg' ? `<p class="nb-fine">${esc(hasBands ? t('labres_index_note') : t('labres_no_bands'))}</p>` : ''}`;
    }
    const signalRow = `
        <section class="nb-row" data-row="signal" data-valid="${signalValid ? '1' : '0'}">
            <header class="nb-row-head">
                <h2><span class="nb-row-no nb-mono">2</span>${esc(t(`labres_row_signal_${source}`))}</h2>
                ${signalValid ? `<span class="nb-row-dir" data-dir="${cmp.signal.dir}">${esc(dirText(cmp.signal.dir))}</span>` : ''}
            </header>
            ${signalBody}
        </section>`;

    const selfRow = `
        <section class="nb-row" data-row="self">
            <header class="nb-row-head">
                <h2><span class="nb-row-no nb-mono">3</span>${esc(t('labres_row_self'))}</h2>
                <span class="nb-row-dir" data-dir="${cmp.rating.dir}">${esc(dirText(cmp.rating.dir))}</span>
            </header>
            ${barPair({ label: t('labres_rating'), on: on.rating, off: off.rating, max: 10, format: 'int', hint: t('labres_unit_of_10') })}
        </section>`;

    return taskRow + signalRow + selfRow;
}

function renderAgreement(cmp) {
    const two = cmp.compared < 3;
    const key = `labres_${cmp.agree ? 'agree' : 'disagree'}_${two ? '2' : '3'}`;
    return `
        <div class="nb-agree" data-agree="${cmp.agree ? '1' : '0'}">
            <strong>${esc(t(key))}</strong>
            ${two ? `<span>${esc(t('labres_two_only'))}</span>` : ''}
        </div>`;
}

function formatDate(iso) {
    const d = new Date(iso);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function renderHistory(sessions, currentId) {
    const earlier = sessions.filter((s) => s.id !== currentId).slice(-8).reverse();
    if (!earlier.length) return `<p class="nb-fine">${esc(t('labres_history_empty'))}</p>`;
    const rows = earlier.map((s) => `
        <tr>
            <td class="nb-mono">${esc(formatDate(s.startedAt))}</td>
            <td class="nb-mono">${s.conditions.on.task.accuracyPct ?? '—'}% → ${s.conditions.off.task.accuracyPct ?? '—'}%</td>
            <td class="nb-mono">${s.conditions.on.task.meanRtMs !== null ? (s.conditions.on.task.meanRtMs / 1000).toFixed(2) : '—'} → ${s.conditions.off.task.meanRtMs !== null ? (s.conditions.off.task.meanRtMs / 1000).toFixed(2) : '—'}</td>
            <td>${esc(dirText(s.comparison.task.dir, s.comparison.task.tradeOff))}</td>
        </tr>`).join('');
    return `
        <div class="nb-table-wrap">
            <table class="nb-table">
                <thead><tr>
                    <th>${esc(t('labres_history_date'))}</th>
                    <th>${esc(t('labres_accuracy'))}</th>
                    <th>${esc(t('labres_rt'))} · ${esc(t('labres_unit_sec'))}</th>
                    <th>${esc(t('labres_history_result'))}</th>
                </tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <p class="nb-fine"><span class="nb-swatch" data-cond="on"></span>${esc(condName('on'))} → <span class="nb-swatch" data-cond="off"></span>${esc(condName('off'))}</p>`;
}

const FORMATS = {
    pct: (v) => `${v.toFixed(1)}%`,
    sec: (v) => v.toFixed(2),
    int: (v) => String(Math.round(v)),
    index: (v) => v.toFixed(2)
};

// Bars grow from zero and numbers count up. Only transform changes (the bar is
// scaled, never resized). With "reduce motion" on, everything lands at once.
function animateIn(root) {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const bars = Array.from(root.querySelectorAll('[data-grow]'));
    const counts = Array.from(root.querySelectorAll('[data-count]'));
    const setFinal = () => {
        bars.forEach((el) => { el.style.transform = `scaleX(${el.dataset.grow})`; });
        counts.forEach((el) => { el.textContent = FORMATS[el.dataset.format](Number(el.dataset.count)); });
    };
    if (reduce) {
        root.classList.add('nb-no-motion');
        setFinal();
        return () => {};
    }
    let frame = 0;
    const startedAt = performance.now();
    const DURATION = 900;
    requestAnimationFrame(() => {
        bars.forEach((el) => { el.style.transform = `scaleX(${el.dataset.grow})`; });
    });
    const step = (now) => {
        const p = Math.min(1, (now - startedAt) / DURATION);
        const eased = 1 - (1 - p) ** 3;
        counts.forEach((el) => {
            el.textContent = FORMATS[el.dataset.format](Number(el.dataset.count) * eased);
        });
        if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
}

let stopAnimation = () => {};

export default {
    render() {
        const state = getState();
        const session = getLastSession(state.currentUser);
        if (!session) {
            return `
                <main class="page page-lab-results nb-page">
                    <section class="nb-shell nb-shell-narrow">
                        <header class="nb-top">
                            <span class="nb-brand">NeuroFocus</span>
                        </header>
                        <h1 class="nb-title">${esc(t('labres_none_title'))}</h1>
                        <p class="nb-lead">${esc(t('labres_none'))}</p>
                        <div class="nb-actions">
                            <button type="button" class="nb-btn nb-btn-primary" data-lab-again>${esc(t('home_start_test'))}</button>
                            <button type="button" class="nb-btn" data-lab-home>${esc(t('back_home'))}</button>
                        </div>
                    </section>
                </main>`;
        }
        const [first, second] = conditionsForOrder(session.order);
        const rehearsal = session.source !== 'eeg';
        return `
            <main class="page page-lab-results nb-page" data-session="${esc(session.id)}" data-source="${esc(session.source)}">
                <section class="nb-shell">
                    <header class="nb-top">
                        <span class="nb-brand">NeuroFocus</span>
                        <span class="nb-top-meta nb-mono">${esc(session.user)} · ${esc(formatDate(session.startedAt))}</span>
                    </header>

                    <p class="nb-eyebrow">${esc(t('labres_title'))}</p>
                    <h1 class="nb-question">${esc(t('lab_question'))}</h1>
                    <p class="nb-verdict" data-verdict="${esc(session.comparison.verdict)}">${esc(buildVerdict(session.comparison))}</p>
                    <p class="nb-fine nb-note">${esc(t('labres_note'))}</p>
                    ${session.comparison.verdict === 'clear' && session.comparison.task.rightGap !== 0
                        ? `<p class="nb-fine">${esc(fill(t('labres_base_note'), { n: session.comparison.task.sameBase }))}</p>`
                        : ''}
                    ${rehearsal ? `<p class="nb-rehearsal" data-rehearsal>${esc(t('labres_rehearsal'))}</p>` : ''}

                    <div class="nb-legend">
                        <span><i class="nb-swatch" data-cond="on"></i>${esc(condName('on'))}</span>
                        <span><i class="nb-swatch" data-cond="off"></i>${esc(condName('off'))}</span>
                    </div>

                    <div class="nb-rows">${renderRows(session)}</div>

                    ${renderAgreement(session.comparison)}

                    <p class="nb-fine" data-order="${esc(session.order)}">${esc(fill(t('labres_order'), { a: condName(first), b: condName(second) }))}</p>

                    <section class="nb-block">
                        <h2>${esc(t('labres_export_title'))}</h2>
                        <p class="nb-fine">${esc(t('labres_export_lead'))}</p>
                        <div class="nb-actions">
                            <button type="button" class="nb-btn" data-export="summary">${esc(t('labres_export_summary'))}</button>
                            <button type="button" class="nb-btn" data-export="seconds">${esc(t('labres_export_seconds'))}</button>
                            <button type="button" class="nb-btn" data-export="answers">${esc(t('labres_export_trials'))}</button>
                        </div>
                    </section>

                    <section class="nb-block">
                        <h2>${esc(t('labres_history_title'))}</h2>
                        ${renderHistory(listSessions(state.currentUser), session.id)}
                    </section>

                    <div class="nb-actions nb-actions-end">
                        <button type="button" class="nb-btn nb-btn-primary" data-lab-again>${esc(t('labres_again'))}</button>
                        <button type="button" class="nb-btn" data-lab-home>${esc(t('back_home'))}</button>
                    </div>
                </section>
            </main>`;
    },

    mount({ root, router }) {
        const state = getState();
        document.body.classList.add('nb-body');
        const session = getLastSession(state.currentUser);

        stopAnimation = animateIn(root);

        root.querySelectorAll('[data-export]').forEach((button) => {
            button.addEventListener('click', () => {
                if (!session) return;
                const kind = button.dataset.export;
                if (kind === 'summary') {
                    // One row per test, for every test this account has done.
                    downloadCsv(fileName(session, 'summary'), summaryCsv(listSessions(state.currentUser)));
                } else if (kind === 'seconds') {
                    downloadCsv(fileName(session, 'seconds'), secondsCsv(session));
                } else {
                    downloadCsv(fileName(session, 'answers'), trialsCsv(session));
                }
            });
        });

        root.querySelector('[data-lab-again]')?.addEventListener('click', () => {
            setState({
                testMode: 'lab',
                setupStep: 'mode',
                difficulty: 'lab',
                inputMode: 'idle',
                cameraConsent: 'unknown',
                focusSource: 'simulation-fallback'
            });
            router.navigate('setup');
        });

        root.querySelector('[data-lab-home]')?.addEventListener('click', () => {
            resetFlowState();
            router.navigate('home');
        });
    },

    unmount() {
        stopAnimation();
        document.body.classList.remove('nb-body');
    }
};
