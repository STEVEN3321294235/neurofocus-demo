// CSV export for the experiment mode: three files per test.
//   summary  one row per test (all of this user's tests, oldest first)
//   seconds  one row per second of this test
//   answers  one row per answered question of this test
//
// Column names are plain English so the files open the same way whatever the
// interface language is. File names use the account's user name only: no
// e-mail address and no real name is ever written by this module.

import { BAND_NAMES } from './labAnalysis.js?v=2026-07-28-2';

function cell(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header, rows) {
    return [header, ...rows].map((line) => line.map(cell).join(',')).join('\r\n') + '\r\n';
}

function conditionColumns(prefix) {
    return [
        `${prefix}_position`, `${prefix}_answered`, `${prefix}_correct`, `${prefix}_accuracy_pct`,
        `${prefix}_mean_rt_ms`, `${prefix}_timeouts`, `${prefix}_match_rt_ms`, `${prefix}_mismatch_rt_ms`,
        `${prefix}_interference_ms`, `${prefix}_focus_mean`, `${prefix}_index_mean`, `${prefix}_index_median`,
        `${prefix}_good_seconds`, `${prefix}_signal_valid`, `${prefix}_self_rating`
    ];
}

function conditionValues(c) {
    if (!c) return Array(15).fill('');
    return [
        c.position, c.task.answered, c.task.correct, c.task.accuracyPct,
        c.task.meanRtMs, c.task.timeouts, c.task.match.meanRtMs, c.task.mismatch.meanRtMs,
        c.task.interferenceMs, c.signal.focusMean, c.signal.indexMean, c.signal.indexMedian,
        c.signal.goodSeconds, c.signal.valid ? 1 : 0, c.rating
    ];
}

export const SUMMARY_HEADER = [
    'user', 'test_id', 'started_at', 'input_source', 'order', 'question_seed', 'time_limit_ms',
    // The 30 seconds of quiet sitting before the first test ("how are you today").
    'rest_focus_mean', 'rest_index_mean', 'rest_good_seconds',
    ...conditionColumns('phone_on_desk'),
    ...conditionColumns('phone_away'),
    'accuracy_gap_pp', 'correct_gap', 'right_gap_same_base', 'same_base_questions', 'rt_gap_ms', 'rt_gap_pct', 'focus_gap', 'index_gap', 'rating_gap',
    'task_direction', 'signal_direction', 'rating_direction', 'results_compared', 'results_agree', 'verdict'
];

export function summaryCsv(sessions = []) {
    const rows = sessions.map((s) => {
        const cmp = s.comparison || { task: {}, signal: {}, rating: {} };
        return [
            s.user, s.id, s.startedAt, s.source, s.order, s.seed, s.limitMs,
            s.rest?.focusMean, s.rest?.indexMean, s.rest?.goodSeconds,
            ...conditionValues(s.conditions?.on),
            ...conditionValues(s.conditions?.off),
            cmp.task.accGapPP, cmp.task.correctGap, cmp.task.rightGap, cmp.task.sameBase, cmp.task.rtGapMs, cmp.task.rtGapPct,
            cmp.signal.focusGap, cmp.signal.indexGap, cmp.rating.gap,
            cmp.task.dir, cmp.signal.dir, cmp.rating.dir, cmp.compared,
            cmp.agree ? 1 : 0, cmp.verdict
        ];
    });
    return toCsv(SUMMARY_HEADER, rows);
}

export const SECONDS_HEADER = [
    'second', 'phase', 'condition', 'phase_second', 'focus_score', 'signal', 'signal_good',
    ...BAND_NAMES, 'own_index'
];

export function secondsCsv(session) {
    const rows = (session.seconds || []).map((r) => [
        r.sec, r.phase, r.cond || '', r.phaseSec, r.score, r.signal, r.good ? 1 : 0,
        ...BAND_NAMES.map((name) => (r.bands ? r.bands[name] : '')),
        r.index === null || r.index === undefined ? '' : Math.round(r.index * 10000) / 10000
    ]);
    return toCsv(SECONDS_HEADER, rows);
}

export const TRIALS_HEADER = [
    'phase', 'condition', 'order_in_segment', 'question_no', 'word', 'ink', 'type',
    'response', 'correct', 'reaction_ms', 'timed_out', 'at_second'
];

export function trialsCsv(session) {
    const rows = (session.trials || []).map((tr) => [
        tr.phase, tr.cond || '', tr.seq, tr.no, tr.word, tr.ink, tr.congruent ? 'match' : 'mismatch',
        tr.response || '', tr.correct ? 1 : 0, tr.rtMs, tr.timeout ? 1 : 0, tr.atSec
    ]);
    return toCsv(TRIALS_HEADER, rows);
}

function safeName(user) {
    const cleaned = String(user || 'user').normalize('NFKC').replace(/[^\p{L}\p{N}_-]+/gu, '_').replace(/^_+|_+$/g, '');
    return cleaned || 'user';
}

function stamp(iso) {
    const d = new Date(iso || Date.now());
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// neurofocus_<user>_<yyyymmdd-hhmm>_<kind>[_DEMO|_CAMERA].csv
export function fileName(session, kind) {
    const tag = session.source === 'eeg' ? '' : `_${session.source === 'camera' ? 'CAMERA' : 'DEMO'}`;
    return `neurofocus_${safeName(session.user)}_${stamp(session.startedAt)}_${kind}${tag}.csv`;
}

export function downloadCsv(name, text) {
    // BOM so spreadsheet apps read the file as UTF-8.
    const blob = new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
