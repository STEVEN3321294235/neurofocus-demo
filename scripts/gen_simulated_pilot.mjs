// gen_simulated_pilot.mjs — build the SIMULATED n=4 pilot dataset.
//
// ⚠️  READ THIS FIRST
// Every number this script writes is INVENTED. It is a rehearsal / template
// artefact so the team can practise the analysis, the charts and the answer
// script BEFORE the real Beijing hotel session. It must never be shown to a
// judge, a teacher or a report as a real result. Every output file carries
// "SIMULATED" in its name, in a `data_source` column and in every chart title.
//
// The design copied here is the real one — EXHIBITION_HANDBOOK Part 12:
//   within-subject crossover, 4 participants, each does paper ×1 + platform ×1,
//   order and depth counterbalanced.
//     S01  1) paper+foundation     2) platform+advanced
//     S02  1) platform+foundation  2) paper+advanced
//     S03  1) paper+advanced       2) platform+foundation
//     S04  1) platform+advanced    2) paper+foundation
//
// Paper sessions carry NO focus data on purpose: there is no sensor on paper.
// Only quiz score and stopwatch time are comparable between the two conditions.
//
//   node scripts/gen_simulated_pilot.mjs
//
// Outputs into pilot_simulated/ :
//   SIMULATED_pilot_master_n4.csv        one row per session (8 rows)
//   SIMULATED_platform_S0x_*.csv         4 files, same columns the app exports
//   SIMULATED_pilot_perquestion.csv      long format, 40 rows, for charting
//   SIMULATED_pilot_charts.html          paired + process charts

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const OUT_DIR = 'pilot_simulated';
const WATERMARK = 'SIMULATED';

// Deterministic PRNG so re-running gives the identical dataset.
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const rand = mulberry32(20260727);
const jitter = (spread) => (rand() * 2 - 1) * spread;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const SECTIONS = { foundation: 5, advanced: 6 }; // matches studyMaterials.js
const QUIZ_TOTAL = 10;

// Per-participant behaviour profile. focus = the mean the simulated attention
// signal hovers around; pace = seconds per reading section.
const PEOPLE = {
    S01: { focusMean: 68, pace: 72, quizPace: 26 },
    S02: { focusMean: 76, pace: 82, quizPace: 22 },
    S03: { focusMean: 71, pace: 62, quizPace: 24 },
    S04: { focusMean: 60, pace: 57, quizPace: 31 }  // the restless one
};

// The design table, plus the quiz score each session lands on.
// S04 shows NO platform advantage on purpose — the team must rehearse
// answering a negative result, not just a flattering one.
const SESSIONS = [
    { id: 'S01', order: 1, condition: 'paper',    depth: 'foundation', score: 6 },
    { id: 'S01', order: 2, condition: 'platform', depth: 'advanced',   score: 7 },
    { id: 'S02', order: 1, condition: 'platform', depth: 'foundation', score: 8 },
    { id: 'S02', order: 2, condition: 'paper',    depth: 'advanced',   score: 6 },
    { id: 'S03', order: 1, condition: 'paper',    depth: 'advanced',   score: 5 },
    { id: 'S03', order: 2, condition: 'platform', depth: 'foundation', score: 7 },
    { id: 'S04', order: 1, condition: 'platform', depth: 'advanced',   score: 6 },
    { id: 'S04', order: 2, condition: 'paper',    depth: 'foundation', score: 6 }
];

// ---------------------------------------------------------------------------
// Generate one session. Every summary figure is DERIVED from the per-section
// and per-question detail, so the CSV is internally consistent — a judge who
// adds up the columns gets the same numbers as the summary row.
// ---------------------------------------------------------------------------
function buildSession(s) {
    const p = PEOPLE[s.id];
    const nSections = SECTIONS[s.depth];
    const depthLoad = s.depth === 'advanced' ? 1.15 : 1.0; // advanced reads slower

    const sectionMs = [];
    for (let i = 0; i < nSections; i += 1) {
        const sec = p.pace * depthLoad + jitter(p.pace * 0.22);
        sectionMs.push(Math.round(clamp(sec, 20, 240) * 1000));
    }
    // Protocol cap: reading is stopped at 8 minutes (Part 12.5). Anyone who
    // would have run over is scaled back to just under the cap.
    const READ_CAP_MS = 8 * 60 * 1000;
    let readingTotalMs = sectionMs.reduce((a, b) => a + b, 0);
    if (readingTotalMs > READ_CAP_MS - 12000) {
        const k = (READ_CAP_MS - 12000) / readingTotalMs;
        for (let i = 0; i < sectionMs.length; i += 1) sectionMs[i] = Math.round(sectionMs[i] * k);
        readingTotalMs = sectionMs.reduce((a, b) => a + b, 0);
    }

    // Per-question focus + time. Focus wanders around the person's mean;
    // a low-focus question takes longer.
    const questions = [];
    for (let i = 0; i < QUIZ_TOTAL; i += 1) {
        const focus = Math.round(clamp(p.focusMean + jitter(16) - (s.depth === 'advanced' ? 3 : 0), 18, 96));
        const slow = (80 - focus) / 40;               // 0 = sharp, ~1.5 = drifting
        const ms = Math.round(clamp(p.quizPace * (0.75 + slow * 0.6) + jitter(5), 6, 90) * 1000);
        questions.push({ focus, ms, correct: 0 });
    }

    // Mark the wrong answers: drawn from the lowest-focus questions, but not
    // mechanically the bottom N — one candidate is spared at random so the
    // relationship stays noisy rather than perfect.
    const wrongCount = QUIZ_TOTAL - s.score;
    const byFocus = questions.map((q, i) => ({ i, focus: q.focus })).sort((a, b) => a.focus - b.focus);
    const pool = byFocus.slice(0, Math.min(QUIZ_TOTAL, wrongCount + 2));
    const chosen = new Set();
    while (chosen.size < wrongCount) chosen.add(pool[Math.floor(rand() * pool.length)].i);
    questions.forEach((q, i) => { q.correct = chosen.has(i) ? 0 : 1; });

    const quizTotalMs = questions.reduce((a, q) => a + q.ms, 0);
    const quizFocusPct = Math.round(questions.reduce((a, q) => a + q.focus, 0) / QUIZ_TOTAL);

    // Reading-phase focus: same person, slightly steadier than under quiz
    // pressure. Distraction = a dip below the platform's 40 threshold.
    const readingFocusPct = Math.round(clamp(p.focusMean + jitter(4), 20, 95));
    const distractions = Math.max(1, Math.round((85 - readingFocusPct) / 6 + jitter(1)));
    const interventions = Math.max(0, Math.round(distractions * 0.5 + jitter(0.6)));
    const avgRecoveryMs = Math.round(clamp(9000 + (80 - readingFocusPct) * 260 + jitter(1200), 4000, 25000));

    return {
        ...s, sectionMs, readingTotalMs, questions, quizTotalMs, quizFocusPct,
        readingFocusPct, distractions, interventions, avgRecoveryMs
    };
}

const data = SESSIONS.map(buildSession);

// Paper sessions: stopwatch numbers only. Reuse the generated reading/quiz
// durations (same person, same material length) then strip every focus field.
const NA = 'NA';

mkdirSync(OUT_DIR, { recursive: true });

// --- 1. master CSV, one row per session --------------------------------------
const masterCols = [
    'data_source', 'participant_id', 'session_order', 'condition', 'subject', 'depth',
    'reading_total_s', 'quiz_total_s', 'quiz_score', 'quiz_total',
    'reading_focus_pct', 'reading_distractions', 'reading_interventions',
    'reading_avg_recovery_ms', 'quiz_focus_pct'
];
const masterRows = data.map((d) => {
    const platform = d.condition === 'platform';
    return [
        WATERMARK, d.id, d.order, d.condition, 'biology', d.depth,
        Math.round(d.readingTotalMs / 1000), Math.round(d.quizTotalMs / 1000),
        d.score, QUIZ_TOTAL,
        platform ? d.readingFocusPct : NA,
        platform ? d.distractions : NA,
        platform ? d.interventions : NA,
        platform ? d.avgRecoveryMs : NA,
        platform ? d.quizFocusPct : NA
    ].join(',');
});
writeFileSync(join(OUT_DIR, `${WATERMARK}_pilot_master_n4.csv`),
    `${masterCols.join(',')}\n${masterRows.join('\n')}\n`);

// --- 2. one file per platform session, in the app's own export format --------
// Same column order as buildStudyCsv() in pages/game/runtime.js, with a
// data_source column bolted on the front so the file can never be mistaken
// for a real export.
for (const d of data.filter((x) => x.condition === 'platform')) {
    const cols = [
        ['data_source', WATERMARK],
        ['student_id', d.id],
        ['subject', 'biology'],
        ['depth', d.depth],
        ['reading_total_ms', d.readingTotalMs],
        ['reading_focus_pct', d.readingFocusPct],
        ['reading_distractions', d.distractions],
        ['reading_interventions', d.interventions],
        ['reading_avg_recovery_ms', d.avgRecoveryMs],
        ['quiz_score', d.score],
        ['quiz_total', QUIZ_TOTAL],
        ['quiz_focus_pct', d.quizFocusPct]
    ];
    d.sectionMs.forEach((ms, i) => cols.push([`read_section${i + 1}_ms`, ms]));
    d.questions.forEach((q, i) => {
        cols.push([`q${i + 1}_time_ms`, q.ms]);
        cols.push([`q${i + 1}_focus`, q.focus]);
        cols.push([`q${i + 1}_correct`, q.correct]);
    });
    const csv = `${cols.map((c) => c[0]).join(',')}\n${cols.map((c) => c[1]).join(',')}\n`;
    writeFileSync(join(OUT_DIR, `${WATERMARK}_platform_${d.id}_biology_${d.depth}.csv`), csv);
}

// --- 3. long per-question CSV (the one you actually chart) --------------------
const pqHeader = 'data_source,participant_id,condition,depth,question_no,time_ms,focus,correct';
const pqRows = [];
for (const d of data.filter((x) => x.condition === 'platform')) {
    d.questions.forEach((q, i) => {
        pqRows.push([WATERMARK, d.id, d.condition, d.depth, i + 1, q.ms, q.focus, q.correct].join(','));
    });
}
writeFileSync(join(OUT_DIR, `${WATERMARK}_pilot_perquestion.csv`), `${pqHeader}\n${pqRows.join('\n')}\n`);

// --- 4. charts ---------------------------------------------------------------
const paired = ['S01', 'S02', 'S03', 'S04'].map((id) => {
    const paper = data.find((d) => d.id === id && d.condition === 'paper');
    const plat = data.find((d) => d.id === id && d.condition === 'platform');
    return { id, paper: paper.score, platform: plat.score, plat };
});
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

writeFileSync(join(OUT_DIR, `${WATERMARK}_pilot_charts.html`), renderCharts(paired, data));
console.log(`wrote ${OUT_DIR}/ — ${data.length} sessions, ${pqRows.length} question rows`);
console.log(`paper mean ${mean(paired.map((p) => p.paper)).toFixed(2)} / 10 · ` +
    `platform mean ${mean(paired.map((p) => p.platform)).toFixed(2)} / 10`);

// ---------------------------------------------------------------------------
// Chart rendering. Hand-built SVG, no libraries — the file must open from a USB
// stick in a Beijing hotel with no network.
// Palette: dataviz reference categorical slots 1–4, validated light + dark.
// ---------------------------------------------------------------------------
function renderCharts(pairs, sessions) {
    const S = ['S01', 'S02', 'S03', 'S04'];

    // Tied values put two labels on the same pixel row. Nudge them apart,
    // keeping their original order, and remember the offset so a leader line
    // can be drawn back to the real data point.
    const dodge = (ys, minGap = 15) => {
        const idx = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
        for (let k = 1; k < idx.length; k += 1) {
            if (idx[k].y - idx[k - 1].y < minGap) idx[k].y = idx[k - 1].y + minGap;
        }
        const overflow = idx[idx.length - 1].y - Math.max(...ys);
        if (overflow > 0) idx.forEach((o) => { o.y -= overflow / 2; });
        const out = new Array(ys.length);
        idx.forEach((o) => { out[o.i] = o.y; });
        return out;
    };

    const platforms = S.map((id) => sessions.find((d) => d.id === id && d.condition === 'platform'));
    const paperMean = mean(pairs.map((p) => p.paper));
    const platMean = mean(pairs.map((p) => p.platform));

    // --- slope chart: quiz score, paper -> platform, one line per participant
    const W = 640, H = 340, ML = 150, MR = 140, MT = 34, MB = 46;
    const y = (v) => MT + (10 - v) / 10 * (H - MT - MB);
    const xL = ML, xR = W - MR;
    const leftLbl = dodge(pairs.map((p) => y(p.paper)));
    const rightLbl = dodge(pairs.map((p) => y(p.platform)));
    const slopeMarks = pairs.map((p, i) => `
      <line x1="${xL}" y1="${y(p.paper)}" x2="${xR}" y2="${y(p.platform)}"
            stroke="var(--series-${i + 1})" stroke-width="2" stroke-linecap="round"/>
      <line x1="${xL - 34}" y1="${leftLbl[i]}" x2="${xL - 8}" y2="${y(p.paper)}" class="leader"/>
      <line x1="${xR + 8}" y1="${y(p.platform)}" x2="${xR + 30}" y2="${rightLbl[i]}" class="leader"/>
      <circle cx="${xL}" cy="${y(p.paper)}" r="5" fill="var(--series-${i + 1})" stroke="var(--surface-1)" stroke-width="2"/>
      <circle cx="${xR}" cy="${y(p.platform)}" r="5" fill="var(--series-${i + 1})" stroke="var(--surface-1)" stroke-width="2"/>
      <text x="${xL - 38}" y="${leftLbl[i] + 4}" class="lbl" text-anchor="end">${p.id} · ${p.paper}</text>
      <text x="${xR + 34}" y="${rightLbl[i] + 4}" class="lbl">${p.platform} · ${p.id}</text>`).join('');
    const gridRows = [0, 2, 4, 6, 8, 10].map((v) => `
      <line x1="${xL}" y1="${y(v)}" x2="${xR}" y2="${y(v)}" class="grid"/>
      <text x="${26}" y="${y(v) + 4}" class="tick">${v}</text>`).join('');

    // --- bars: platform-only reading focus stability
    const BW = 560, BH = 260, BML = 56, BMR = 24, BMT = 28, BMB = 48;
    const bx = (i) => BML + i * ((BW - BML - BMR) / 4) + 18;
    const bw = (BW - BML - BMR) / 4 - 36;
    const by = (v) => BMT + (100 - v) / 100 * (BH - BMT - BMB);
    const focusBars = platforms.map((d, i) => `
      <rect x="${bx(i)}" y="${by(d.readingFocusPct)}" width="${bw}"
            height="${BH - BMB - by(d.readingFocusPct)}" rx="4" fill="var(--series-${i + 1})"/>
      <text x="${bx(i) + bw / 2}" y="${by(d.readingFocusPct) - 8}" class="lbl" text-anchor="middle">${d.readingFocusPct}%</text>
      <text x="${bx(i) + bw / 2}" y="${BH - BMB + 20}" class="tick" text-anchor="middle">${d.id}</text>`).join('');
    const focusGrid = [0, 25, 50, 75, 100].map((v) => `
      <line x1="${BML}" y1="${by(v)}" x2="${BW - BMR}" y2="${by(v)}" class="grid"/>
      <text x="${BML - 10}" y="${by(v) + 4}" class="tick" text-anchor="end">${v}</text>`).join('');

    // --- bars: distractions per platform reading session
    const maxD = Math.max(...platforms.map((d) => d.distractions), 6);
    const dy = (v) => BMT + (maxD - v) / maxD * (BH - BMT - BMB);
    const distBars = platforms.map((d, i) => `
      <rect x="${bx(i)}" y="${dy(d.distractions)}" width="${bw}"
            height="${BH - BMB - dy(d.distractions)}" rx="4" fill="var(--series-${i + 1})"/>
      <text x="${bx(i) + bw / 2}" y="${dy(d.distractions) - 8}" class="lbl" text-anchor="middle">${d.distractions}</text>
      <text x="${bx(i) + bw / 2}" y="${BH - BMB + 20}" class="tick" text-anchor="middle">${d.id}</text>`).join('');
    const distGrid = Array.from({ length: maxD + 1 }, (_, v) => v).filter((v) => v % 2 === 0).map((v) => `
      <line x1="${BML}" y1="${dy(v)}" x2="${BW - BMR}" y2="${dy(v)}" class="grid"/>
      <text x="${BML - 10}" y="${dy(v) + 4}" class="tick" text-anchor="end">${v}</text>`).join('');

    // --- lines: focus per quiz question (platform sessions only)
    const LW = 720, LH = 320, LML = 56, LMR = 78, LMT = 28, LMB = 48;
    const lx = (q) => LML + (q - 1) / (QUIZ_TOTAL - 1) * (LW - LML - LMR);
    const ly = (v) => LMT + (100 - v) / 100 * (LH - LMT - LMB);
    const lineLbl = dodge(platforms.map((d) => ly(d.questions[QUIZ_TOTAL - 1].focus)), 16);
    const focusLines = platforms.map((d, i) => {
        const pts = d.questions.map((q, qi) => `${lx(qi + 1)},${ly(q.focus)}`).join(' ');
        const last = d.questions[QUIZ_TOTAL - 1];
        const dots = d.questions.map((q, qi) => `<circle cx="${lx(qi + 1)}" cy="${ly(q.focus)}" r="${q.correct ? 4 : 6}"
             fill="${q.correct ? `var(--series-${i + 1})` : 'var(--surface-1)'}"
             stroke="var(--series-${i + 1})" stroke-width="2"/>`).join('');
        return `<polyline points="${pts}" fill="none" stroke="var(--series-${i + 1})" stroke-width="2"
                  stroke-linejoin="round" stroke-linecap="round"/>${dots}
                <line x1="${lx(QUIZ_TOTAL) + 6}" y1="${ly(last.focus)}" x2="${lx(QUIZ_TOTAL) + 20}" y2="${lineLbl[i]}" class="leader"/>
                <text x="${lx(QUIZ_TOTAL) + 24}" y="${lineLbl[i] + 4}" class="lbl">${d.id}</text>`;
    }).join('');
    const lineGrid = [0, 25, 50, 75, 100].map((v) => `
      <line x1="${LML}" y1="${ly(v)}" x2="${LW - LMR}" y2="${ly(v)}" class="grid"/>
      <text x="${LML - 10}" y="${ly(v) + 4}" class="tick" text-anchor="end">${v}</text>`).join('');
    const qTicks = Array.from({ length: QUIZ_TOTAL }, (_, i) => i + 1).map((q) =>
        `<text x="${lx(q)}" y="${LH - LMB + 22}" class="tick" text-anchor="middle">Q${q}</text>`).join('');

    const legend = S.map((id, i) =>
        `<span class="key"><i style="background:var(--series-${i + 1})"></i>${id}</span>`).join('');

    const tableRows = sessions.map((d) => {
        const p = d.condition === 'platform';
        return `<tr><td>${d.id}</td><td>${d.order}</td><td>${d.condition}</td><td>${d.depth}</td>
      <td class="num">${d.score}/10</td><td class="num">${Math.round(d.readingTotalMs / 1000)}s</td>
      <td class="num">${p ? `${d.readingFocusPct}%` : '—'}</td><td class="num">${p ? d.distractions : '—'}</td>
      <td class="num">${p ? d.interventions : '—'}</td>
      <td class="num">${p ? `${(d.avgRecoveryMs / 1000).toFixed(1)}s` : '—'}</td>
      <td class="num">${p ? `${d.quizFocusPct}%` : '—'}</td></tr>`;
    }).join('');

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SIMULATED pilot data (n=4) — NeuroFocus rehearsal only</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font:15px/1.55 ui-sans-serif,system-ui,"Helvetica Neue",sans-serif;
         background:var(--page); color:var(--text-primary); }
  .viz-root {
    --page:#f6f6f4; --surface-1:#fcfcfb; --text-primary:#0b0b0b; --text-secondary:#52514e;
    --muted:#8a8984; --rule:#e3e2de;
    --series-1:#2a78d6; --series-2:#eb6834; --series-3:#1baf7a; --series-4:#eda100;
  }
  @media (prefers-color-scheme: dark) {
    :root:where(:not([data-theme="light"])) .viz-root {
      --page:#111110; --surface-1:#1a1a19; --text-primary:#ffffff; --text-secondary:#c3c2b7;
      --muted:#8f8e86; --rule:#33332f;
      --series-1:#3987e5; --series-2:#d95926; --series-3:#199e70; --series-4:#c98500;
    }
  }
  :root[data-theme="dark"] .viz-root {
    --page:#111110; --surface-1:#1a1a19; --text-primary:#ffffff; --text-secondary:#c3c2b7;
    --muted:#8f8e86; --rule:#33332f;
    --series-1:#3987e5; --series-2:#d95926; --series-3:#199e70; --series-4:#c98500;
  }
  .viz-root { background:var(--page); min-height:100vh; padding:24px 20px 56px; }
  .wrap { max-width:780px; margin:0 auto; }
  .stamp { border:2px dashed #e34948; color:#e34948; border-radius:10px; padding:12px 16px;
           font-weight:700; letter-spacing:.02em; margin-bottom:22px; background:transparent; }
  .stamp small { display:block; font-weight:400; color:var(--text-secondary); margin-top:6px; letter-spacing:0; }
  h1 { font-size:22px; margin:0 0 6px; }
  h2 { font-size:16px; margin:32px 0 2px; }
  p.sub { color:var(--text-secondary); margin:0 0 14px; font-size:13.5px; }
  figure { margin:0; background:var(--surface-1); border:1px solid var(--rule);
           border-radius:12px; padding:14px 12px 10px; overflow-x:auto; }
  figcaption { color:var(--text-secondary); font-size:12.5px; padding:8px 6px 0; }
  svg { display:block; max-width:100%; height:auto; }
  .grid { stroke:var(--rule); stroke-width:1; }
  .leader { stroke:var(--rule); stroke-width:1; }
  .tick { fill:var(--muted); font-size:12px; }
  .lbl  { fill:var(--text-primary); font-size:12.5px; font-weight:600; }
  .axis { fill:var(--text-secondary); font-size:13px; font-weight:600; }
  .legend { display:flex; gap:16px; flex-wrap:wrap; margin:10px 2px 0; }
  .key { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--text-secondary); }
  .key i { width:12px; height:12px; border-radius:3px; display:inline-block; }
  table { border-collapse:collapse; width:100%; font-size:13px; margin-top:10px; }
  th,td { border-bottom:1px solid var(--rule); padding:6px 8px; text-align:left; }
  th { color:var(--text-secondary); font-weight:600; }
  td.num { text-align:right; font-variant-numeric:tabular-nums; }
  .scroll { overflow-x:auto; }
</style></head>
<body><div class="viz-root"><div class="wrap">

<div class="stamp">⚠️ SIMULATED DATA — NOT A REAL EXPERIMENT
  <small>Every number on this page was generated by <code>scripts/gen_simulated_pilot.mjs</code>.
  It exists so the team can rehearse the analysis and the charts before running the real
  pilot in Beijing. Do not present this to judges or teachers as a result.</small></div>

<h1>NeuroFocus pilot — SIMULATED walkthrough (n = 4)</h1>
<p class="sub">Within-subject crossover: every participant did one paper session and one platform
session, with order and material depth counterbalanced (Handbook Part 12.2).
Paper sessions have no focus data — there is no sensor on paper.</p>

<h2>Quiz score, paper → platform (SIMULATED)</h2>
<p class="sub">Same person, both conditions. Score out of 10 on the fixed question set.</p>
<figure>
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Simulated quiz scores, paper versus platform, four participants">
  ${gridRows}
  <text x="${xL}" y="${H - 14}" class="axis" text-anchor="middle">Paper</text>
  <text x="${xR}" y="${H - 14}" class="axis" text-anchor="middle">Platform</text>
  ${slopeMarks}
</svg>
<div class="legend">${legend}</div>
<figcaption>SIMULATED. Group mean ${paperMean.toFixed(2)} → ${platMean.toFixed(2)} out of 10.
S04 gets no benefit — that case is in the data on purpose, so the team practises answering it.
n = 4: descriptive only, no significance claim.</figcaption>
</figure>

<h2>Reading focus stability, platform sessions only (SIMULATED)</h2>
<p class="sub">Share of reading time the focus signal stayed above the platform's stable threshold.
There is no paper counterpart to compare against.</p>
<figure>
<svg viewBox="0 0 ${BW} ${BH}" role="img" aria-label="Simulated reading focus stability per participant">
  ${focusGrid}
  <text x="${BML - 10}" y="${BMT - 10}" class="tick" text-anchor="end">%</text>
  ${focusBars}
</svg>
<figcaption>SIMULATED. Platform sessions only.</figcaption>
</figure>

<h2>Distraction events per reading session (SIMULATED)</h2>
<p class="sub">Each event is a dip below the stable threshold long enough for the platform to register it.</p>
<figure>
<svg viewBox="0 0 ${BW} ${BH}" role="img" aria-label="Simulated distraction count per participant">
  ${distGrid}
  ${distBars}
</svg>
<figcaption>SIMULATED. Platform sessions only. Higher bar = more attention breaks.</figcaption>
</figure>

<h2>Focus during each quiz question (SIMULATED)</h2>
<p class="sub">Filled dot = answered correctly, hollow dot = answered wrongly.</p>
<figure>
<svg viewBox="0 0 ${LW} ${LH}" role="img" aria-label="Simulated focus level across the ten quiz questions">
  ${lineGrid}
  <text x="${LML - 10}" y="${LMT - 10}" class="tick" text-anchor="end">%</text>
  ${qTicks}
  ${focusLines}
</svg>
<div class="legend">${legend}</div>
<figcaption>SIMULATED. This is the process data only the platform can produce —
the paper condition cannot generate this chart at all.</figcaption>
</figure>

<h2>The whole table (SIMULATED)</h2>
<div class="scroll"><table>
<thead><tr><th>ID</th><th>Order</th><th>Condition</th><th>Depth</th><th>Score</th><th>Read</th>
<th>Focus</th><th>Distr.</th><th>Interv.</th><th>Recovery</th><th>Quiz focus</th></tr></thead>
<tbody>${tableRows}</tbody></table></div>

</div></div></body></html>`;
}
