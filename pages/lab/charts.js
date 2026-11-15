// Scientific figures for the "Your answer" page. Plain SVG, no library.
//
// Figure 1  focus score second by second across the whole test, with the
//           stages shaded and each test's average drawn as a flat line
// Figure 2  every reaction time as a dot (right = filled, wrong = ring), with
//           the average of right answers and its 95% range
// Figure 3  the colour-word conflict: average time for matching vs
//           mismatching words, one line per condition
//
// Chart rules followed (dataviz guide): one y-axis per chart, 2px lines,
// dots >= 8px with a ring in the surface colour, hairline grid, text never in
// the series colour, a legend for two series, hover readout on every mark, a
// table view so nothing depends on hovering. Colours come from CSS variables,
// so light and dark themes each use their own validated pair.

const NS = 'http://www.w3.org/2000/svg';

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fill(text, vars = {}) {
    return Object.keys(vars).reduce((out, key) => out.replace(`{${key}}`, vars[key]), text);
}

function niceStep(range, target) {
    const raw = range / Math.max(1, target);
    const pow = 10 ** Math.floor(Math.log10(raw));
    const n = raw / pow;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
}

function ticks(min, max, target = 5) {
    const step = niceStep(max - min, target);
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1000) / 1000);
    return out;
}

function mean(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

// Mean with a 95% range (mean +/- 1.96 standard errors).
export function meanWithRange(values) {
    const n = values.length;
    if (!n) return null;
    const m = mean(values);
    if (n < 2) return { n, mean: m, low: m, high: m };
    const sd = Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (n - 1));
    const half = 1.96 * sd / Math.sqrt(n);
    return { n, mean: m, low: m - half, high: m + half };
}

// Small deterministic jitter so the dot cloud is identical on every render.
function jitter(i) {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x) - 0.5;
}

// ---- tooltip shared by all figures -------------------------------------------
function makeTip(host) {
    const tip = document.createElement('div');
    tip.className = 'nb-tip';
    tip.setAttribute('role', 'status');
    host.appendChild(tip);
    return {
        show(x, y, lines) {
            tip.textContent = '';
            lines.forEach((line, i) => {
                const el = document.createElement(i === 0 ? 'strong' : 'span');
                el.textContent = line;
                tip.appendChild(el);
            });
            const w = host.clientWidth;
            tip.style.left = `${Math.max(70, Math.min(w - 70, x))}px`;
            tip.style.top = `${y}px`;
            tip.classList.add('is-on');
        },
        hide() { tip.classList.remove('is-on'); }
    };
}

function tableHTML(t, head, rows) {
    return `
        <details>
            <summary>${esc(t('fig_table_show'))}</summary>
            <div class="nb-table-wrap">
                <table class="nb-table">
                    <thead><tr>${head.map((h, i) => `<th class="${i ? 'nb-num' : ''}">${esc(h)}</th>`).join('')}</tr></thead>
                    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i ? 'nb-num' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
                </table>
            </div>
        </details>`;
}

// =============================================================================
// Figure 1: focus score over time
// =============================================================================
function renderTimeline(host, session, t) {
    const rows = session.seconds || [];
    const plot = host.querySelector('.nb-figure-plot');
    const width = Math.max(300, plot.clientWidth);
    const height = width < 520 ? 210 : 250;
    const m = { top: 30, right: 12, bottom: 34, left: 34 };
    const W = width - m.left - m.right;
    const H = height - m.top - m.bottom;
    const n = rows.length;
    if (!n) {
        plot.innerHTML = `<p class="nb-fine">${esc(t('fig_no_data'))}</p>`;
        return () => {};
    }
    const x = (sec) => m.left + ((sec - 0.5) / n) * W;
    const y = (v) => m.top + H - (Math.max(0, Math.min(100, v)) / 100) * H;

    // Stage bands
    const bands = [];
    rows.forEach((r) => {
        const key = `${r.phase}|${r.cond || ''}`;
        const last = bands[bands.length - 1];
        if (last && last.key === key) last.to = r.sec;
        else bands.push({ key, phase: r.phase, cond: r.cond || '', from: r.sec, to: r.sec });
    });
    const bandName = (b) => {
        if (b.phase === 'test') return b.cond === 'on' ? t('lab_cond_on') : t('lab_cond_off');
        return t(`fig_phase_${b.phase}`) || b.phase;
    };

    // Line segments, broken at weak seconds, coloured by condition.
    const segs = [];
    let cur = null;
    rows.forEach((r) => {
        const cls = r.phase === 'test' ? r.cond : 'none';
        if (!r.good || !Number.isFinite(r.score)) { cur = null; return; }
        if (!cur || cur.cls !== cls) { cur = { cls, pts: [] }; segs.push(cur); }
        cur.pts.push([x(r.sec), y(r.score)]);
    });

    const yTicks = [0, 25, 50, 75, 100];
    const xTicks = ticks(0, n, width < 520 ? 4 : 8).filter((v) => v > 0 && v <= n);

    let svg = `<svg viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-label="${esc(t('fig_timeline_title'))}">`;
    svg += '<g>';
    bands.forEach((b) => {
        const x0 = x(b.from) - (W / n) / 2;
        const x1 = x(b.to) + (W / n) / 2;
        const tested = b.phase === 'test';
        svg += `<rect class="nf-phase" x="${x0.toFixed(1)}" y="${m.top}" width="${Math.max(0, x1 - x0 - 2).toFixed(1)}" height="${H}" rx="4" opacity="${tested ? 1 : 0.55}"></rect>`;
        if (x1 - x0 > 46) {
            svg += `<text class="nf-phase-label" x="${(x0 + 6).toFixed(1)}" y="${m.top - 9}">${esc(bandName(b))}</text>`;
        }
    });
    svg += '</g><g class="nf-grid">';
    yTicks.forEach((v) => { svg += `<line x1="${m.left}" x2="${m.left + W}" y1="${y(v)}" y2="${y(v)}"></line>`; });
    svg += '</g><g class="nf-axis">';
    yTicks.forEach((v) => { svg += `<text x="${m.left - 8}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`; });
    xTicks.forEach((v) => { svg += `<text x="${x(v)}" y="${m.top + H + 16}" text-anchor="middle">${v}</text>`; });
    svg += `<text class="nf-axis-title" x="${m.left + W}" y="${height - 4}" text-anchor="end">${esc(t('fig_axis_seconds'))}</text>`;
    svg += '</g>';

    // Average line for each test (drawn under the data line).
    bands.filter((b) => b.phase === 'test').forEach((b) => {
        const vals = rows.filter((r) => r.sec >= b.from && r.sec <= b.to && r.good && Number.isFinite(r.score)).map((r) => r.score);
        const avg = mean(vals);
        if (avg === null) return;
        svg += `<line class="nf-mean nf-c-${b.cond}" x1="${x(b.from)}" x2="${x(b.to)}" y1="${y(avg)}" y2="${y(avg)}"></line>`;
        svg += `<text class="nf-label" x="${x(b.to) - 4}" y="${y(avg) - 6}" text-anchor="end">${avg.toFixed(0)}</text>`;
    });

    segs.forEach((s) => {
        if (s.pts.length < 2) return;
        const d = s.pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
        const len = s.pts.reduce((acc, p, i) => (i ? acc + Math.hypot(p[0] - s.pts[i - 1][0], p[1] - s.pts[i - 1][1]) : 0), 0);
        svg += `<path class="nf-line nf-draw nf-c-${s.cls}" d="${d}" style="--len:${Math.ceil(len)}"></path>`;
    });
    svg += `<line class="nf-cross" x1="0" x2="0" y1="${m.top}" y2="${m.top + H}" visibility="hidden"></line>`;
    svg += `<circle class="nf-hover-ring" r="6" cx="0" cy="0" visibility="hidden"></circle>`;
    svg += `<rect x="${m.left}" y="${m.top}" width="${W}" height="${H}" fill="transparent" data-hit tabindex="0"></rect>`;
    svg += '</svg>';
    plot.innerHTML = svg;

    // Crosshair snaps to the nearest second; keyboard arrows step through it.
    const tip = makeTip(plot);
    const svgEl = plot.querySelector('svg');
    const cross = svgEl.querySelector('.nf-cross');
    const ring = svgEl.querySelector('.nf-hover-ring');
    const hit = svgEl.querySelector('[data-hit]');
    let focusSec = 1;
    const showAt = (sec) => {
        const r = rows[Math.max(0, Math.min(n - 1, sec - 1))];
        if (!r) return;
        focusSec = r.sec;
        const px = x(r.sec);
        cross.setAttribute('x1', px); cross.setAttribute('x2', px); cross.setAttribute('visibility', 'visible');
        const band = bands.find((b) => r.sec >= b.from && r.sec <= b.to);
        const lines = [];
        if (r.good && Number.isFinite(r.score)) {
            ring.setAttribute('cx', px); ring.setAttribute('cy', y(r.score)); ring.setAttribute('visibility', 'visible');
            lines.push(`${t('fig_axis_focus')} ${r.score}`);
        } else {
            ring.setAttribute('visibility', 'hidden');
            lines.push(t('fig_tip_weak'));
        }
        lines.push(`${fill(t('fig_tip_second'), { n: r.sec })} · ${band ? bandName(band) : ''}`);
        if (Number.isFinite(r.signal)) lines.push(fill(t('fig_tip_signal'), { n: r.signal }));
        const scale = plot.clientWidth / width;
        tip.show(px * scale, (r.good && Number.isFinite(r.score) ? y(r.score) : m.top + H / 2) * scale, lines);
    };
    const hide = () => { cross.setAttribute('visibility', 'hidden'); ring.setAttribute('visibility', 'hidden'); tip.hide(); };
    hit.addEventListener('pointermove', (e) => {
        const rect = svgEl.getBoundingClientRect();
        const px = (e.clientX - rect.left) * (width / rect.width);
        showAt(Math.round(((px - m.left) / W) * n + 0.5));
    });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('focus', () => showAt(focusSec));
    hit.addEventListener('blur', hide);
    hit.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); showAt(focusSec + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); showAt(focusSec - 1); }
    });
    return hide;
}

// =============================================================================
// Figure 2: reaction times
// =============================================================================
function renderReaction(host, session, t, condOrder) {
    const plot = host.querySelector('.nb-figure-plot');
    const trials = (session.trials || []).filter((tr) => tr.phase === 'test');
    const width = Math.max(280, plot.clientWidth);
    const rowH = 64;
    const m = { top: 8, right: 14, bottom: 34, left: 14 };
    const height = m.top + rowH * condOrder.length + m.bottom;
    const W = width - m.left - m.right;
    if (!trials.length) {
        plot.innerHTML = `<p class="nb-fine">${esc(t('fig_no_data'))}</p>`;
        return () => {};
    }
    const limit = session.limitMs || 2000;
    const x = (ms) => m.left + (Math.max(0, Math.min(limit, ms)) / limit) * W;
    const xt = ticks(0, limit, width < 420 ? 4 : 5);

    let svg = `<svg viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-label="${esc(t('fig_rt_title'))}">`;
    svg += '<g class="nf-grid">';
    xt.forEach((v) => { svg += `<line x1="${x(v)}" x2="${x(v)}" y1="${m.top}" y2="${height - m.bottom}"></line>`; });
    svg += '</g><g class="nf-axis">';
    xt.forEach((v) => { svg += `<text x="${x(v)}" y="${height - m.bottom + 16}" text-anchor="middle">${v}</text>`; });
    svg += `<text class="nf-axis-title" x="${m.left + W}" y="${height - 3}" text-anchor="end">${esc(t('fig_axis_rt'))}</text>`;
    svg += '</g>';

    const marks = [];
    condOrder.forEach((cond, row) => {
        const cy = m.top + row * rowH + rowH / 2;
        svg += `<text class="nf-phase-label" x="${m.left}" y="${cy - rowH / 2 + 12}">${esc(t(cond === 'on' ? 'lab_cond_on' : 'lab_cond_off'))}</text>`;
        const list = trials.filter((tr) => tr.cond === cond);
        list.forEach((tr, i) => {
            const cx = x(tr.rtMs);
            const yy = cy + 6 + jitter(i + row * 997) * (rowH * 0.42);
            marks.push({ cx, cy: yy, tr, cond });
            svg += `<circle class="nf-dot nf-pop nf-f-${cond}${tr.correct ? '' : ' is-wrong'}" r="4" cx="${cx.toFixed(1)}" cy="${yy.toFixed(1)}" style="--i:${i}"></circle>`;
        });
        const stats = meanWithRange(list.filter((tr) => tr.correct && !tr.timeout).map((tr) => tr.rtMs));
        if (stats) {
            const yb = cy + 6;
            svg += `<line class="nf-ci nf-c-${cond}" x1="${x(stats.low)}" x2="${x(stats.high)}" y1="${yb - rowH * 0.3}" y2="${yb - rowH * 0.3}"></line>`;
            svg += `<line class="nf-ci nf-c-${cond}" x1="${x(stats.mean)}" x2="${x(stats.mean)}" y1="${yb - rowH * 0.42}" y2="${yb - rowH * 0.18}"></line>`;
            marks.push({ cx: x(stats.mean), cy: yb - rowH * 0.3, stats, cond });
        }
    });
    svg += `<circle class="nf-hover-ring" r="7" visibility="hidden"></circle>`;
    svg += `<rect x="0" y="0" width="${width}" height="${height - m.bottom}" fill="transparent" data-hit></rect>`;
    svg += '</svg>';
    plot.innerHTML = svg;

    const tip = makeTip(plot);
    const svgEl = plot.querySelector('svg');
    const ring = svgEl.querySelector('.nf-hover-ring');
    const hit = svgEl.querySelector('[data-hit]');
    // Nearest mark to the pointer, so a 4px dot never has to be hit exactly.
    hit.addEventListener('pointermove', (e) => {
        const rect = svgEl.getBoundingClientRect();
        const s = width / rect.width;
        const px = (e.clientX - rect.left) * s;
        const py = (e.clientY - rect.top) * s;
        let best = null;
        let bestD = 18 * 18;
        marks.forEach((mk) => {
            const d = (mk.cx - px) ** 2 + (mk.cy - py) ** 2;
            if (d < bestD) { bestD = d; best = mk; }
        });
        if (!best) { ring.setAttribute('visibility', 'hidden'); tip.hide(); return; }
        ring.setAttribute('cx', best.cx); ring.setAttribute('cy', best.cy); ring.setAttribute('visibility', 'visible');
        const condName = t(best.cond === 'on' ? 'lab_cond_on' : 'lab_cond_off');
        const lines = best.stats
            ? [fill(t('fig_tip_mean'), { v: Math.round(best.stats.mean) }), fill(t('fig_tip_range'), { a: Math.round(best.stats.low), b: Math.round(best.stats.high) }), `${condName} · ${fill(t('fig_tip_count'), { n: best.stats.n })}`]
            : [`${best.tr.rtMs} ms`, `${fill(t('fig_tip_answer'), { n: best.tr.seq })} · ${t(best.tr.timeout ? 'fig_tip_slow' : best.tr.correct ? 'fig_tip_right' : 'fig_tip_wrong')}`, `${condName} · ${t(best.tr.congruent ? 'fig_match' : 'fig_mismatch')}`];
        tip.show(best.cx / s, best.cy / s, lines);
    });
    hit.addEventListener('pointerleave', () => { ring.setAttribute('visibility', 'hidden'); tip.hide(); });
    return () => tip.hide();
}

// =============================================================================
// Figure 3: colour-word conflict
// =============================================================================
function conflictStats(session, cond, congruent) {
    const list = (session.trials || []).filter((tr) => tr.phase === 'test' && tr.cond === cond && tr.congruent === congruent && tr.correct && !tr.timeout);
    return meanWithRange(list.map((tr) => tr.rtMs));
}

function renderConflict(host, session, t, condOrder) {
    const plot = host.querySelector('.nb-figure-plot');
    const width = Math.max(280, plot.clientWidth);
    const height = 250;
    const m = { top: 30, right: 34, bottom: 34, left: 48 };
    const W = width - m.left - m.right;
    const H = height - m.top - m.bottom;
    const cells = {};
    const all = [];
    condOrder.forEach((cond) => {
        cells[cond] = [true, false].map((cg) => conflictStats(session, cond, cg));
        cells[cond].forEach((c) => { if (c) all.push(c.low, c.high); });
    });
    if (!all.length) {
        plot.innerHTML = `<p class="nb-fine">${esc(t('fig_no_data'))}</p>`;
        return () => {};
    }
    const lo = Math.max(0, Math.floor((Math.min(...all) - 40) / 50) * 50);
    const hi = Math.ceil((Math.max(...all) + 40) / 50) * 50;
    const y = (v) => m.top + H - ((v - lo) / Math.max(1, hi - lo)) * H;
    const xs = [m.left + W * 0.22, m.left + W * 0.78];
    const yt = ticks(lo, hi, 4);
    let svg = `<svg viewBox="0 0 ${width} ${height}" height="${height}" role="img" aria-label="${esc(t('fig_stroop_title'))}">`;
    svg += '<g class="nf-grid">';
    yt.forEach((v) => { svg += `<line x1="${m.left}" x2="${m.left + W}" y1="${y(v)}" y2="${y(v)}"></line>`; });
    svg += '</g><g class="nf-axis">';
    yt.forEach((v) => { svg += `<text x="${m.left - 8}" y="${y(v) + 3.5}" text-anchor="end">${v}</text>`; });
    svg += `<text class="nf-phase-label" x="${xs[0]}" y="${height - m.bottom + 18}" text-anchor="middle">${esc(t('fig_match'))}</text>`;
    svg += `<text class="nf-phase-label" x="${xs[1]}" y="${height - m.bottom + 18}" text-anchor="middle">${esc(t('fig_mismatch'))}</text>`;
    svg += `<text class="nf-axis-title" x="${m.left - 40}" y="12">${esc(t('fig_axis_rt'))}</text>`;
    svg += '</g>';
    const marks = [];
    condOrder.forEach((cond, ci) => {
        const offset = (ci - 0.5) * 10;
        const pts = cells[cond].map((c, i) => (c ? [xs[i] + offset, y(c.mean), c, i] : null));
        if (pts[0] && pts[1]) {
            const len = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
            svg += `<path class="nf-line nf-draw nf-c-${cond}" d="M${pts[0][0]} ${pts[0][1]}L${pts[1][0]} ${pts[1][1]}" style="--len:${Math.ceil(len)}"></path>`;
        }
        pts.forEach((p, k) => {
            if (!p) return;
            const [px, py, c] = p;
            svg += `<line class="nf-ci nf-c-${cond}" x1="${px}" x2="${px}" y1="${y(c.low)}" y2="${y(c.high)}"></line>`;
            svg += `<circle class="nf-dot nf-pop nf-f-${cond}" r="5.5" cx="${px}" cy="${py}" style="--i:${k * 10 + ci * 20}"></circle>`;
            marks.push({ px, py, c, cond, k });
        });
        if (pts[1]) svg += `<text class="nf-label" x="${pts[1][0] + 10}" y="${pts[1][1] + 4}">${Math.round(pts[1][2].mean)}</text>`;
    });
    svg += `<circle class="nf-hover-ring" r="9" visibility="hidden"></circle>`;
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="transparent" data-hit></rect></svg>`;
    plot.innerHTML = svg;
    const tip = makeTip(plot);
    const svgEl = plot.querySelector('svg');
    const ring = svgEl.querySelector('.nf-hover-ring');
    svgEl.querySelector('[data-hit]').addEventListener('pointermove', (e) => {
        const rect = svgEl.getBoundingClientRect();
        const s = width / rect.width;
        const px = (e.clientX - rect.left) * s;
        const py = (e.clientY - rect.top) * s;
        let best = null;
        let bestD = 28 * 28;
        marks.forEach((mk) => {
            const d = (mk.px - px) ** 2 + (mk.py - py) ** 2;
            if (d < bestD) { bestD = d; best = mk; }
        });
        if (!best) { ring.setAttribute('visibility', 'hidden'); tip.hide(); return; }
        ring.setAttribute('cx', best.px); ring.setAttribute('cy', best.py); ring.setAttribute('visibility', 'visible');
        tip.show(best.px / s, best.py / s, [
            fill(t('fig_tip_mean'), { v: Math.round(best.c.mean) }),
            fill(t('fig_tip_range'), { a: Math.round(best.c.low), b: Math.round(best.c.high) }),
            `${t(best.cond === 'on' ? 'lab_cond_on' : 'lab_cond_off')} · ${t(best.k === 0 ? 'fig_match' : 'fig_mismatch')}`
        ]);
    });
    svgEl.querySelector('[data-hit]').addEventListener('pointerleave', () => { ring.setAttribute('visibility', 'hidden'); tip.hide(); });
    return () => tip.hide();
}

// =============================================================================
// Page section
// =============================================================================
export function figuresHTML(session, t) {
    const condOrder = ['on', 'off'];
    const legend = `
        <div class="nb-figure-legend">
            ${condOrder.map((c) => `<span><i class="nb-key-line" data-cond="${c}"></i>${esc(t(c === 'on' ? 'lab_cond_on' : 'lab_cond_off'))}</span>`).join('')}
        </div>`;
    const legendWithStages = `
        <div class="nb-figure-legend">
            ${condOrder.map((c) => `<span><i class="nb-key-line" data-cond="${c}"></i>${esc(t(c === 'on' ? 'lab_cond_on' : 'lab_cond_off'))}</span>`).join('')}
            <span><i class="nb-key-line" data-cond="none"></i>${esc(t('fig_phase_practice'))} · ${esc(t('fig_phase_rest'))} · ${esc(t('fig_phase_switch'))}</span>
        </div>`;
    const legendDots = `
        <div class="nb-figure-legend">
            ${condOrder.map((c) => `<span><i class="nb-key-line" data-cond="${c}"></i>${esc(t(c === 'on' ? 'lab_cond_on' : 'lab_cond_off'))}</span>`).join('')}
            <span><i class="nb-key-dot"></i>${esc(t('fig_tip_right'))}</span>
            <span><i class="nb-key-dot is-ring"></i>${esc(t('fig_tip_wrong'))}</span>
        </div>`;

    const c = session.conditions;
    const rt = (cond) => meanWithRange((session.trials || []).filter((tr) => tr.phase === 'test' && tr.cond === cond && tr.correct && !tr.timeout).map((tr) => tr.rtMs));
    const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
    const head = [t('fig_table_measure'), t('lab_cond_on'), t('lab_cond_off')];
    const tableTimeline = tableHTML(t, head, [
        [t('labres_focus'), fmt(c.on.signal.focusMean, 1), fmt(c.off.signal.focusMean, 1)],
        [t('labres_index'), fmt(c.on.signal.indexMean, 3), fmt(c.off.signal.indexMean, 3)]
    ]);
    const rOn = rt('on');
    const rOff = rt('off');
    const tableRt = tableHTML(t, head, [
        [t('fig_answers_label'), String(c.on.task.answered), String(c.off.task.answered)],
        [t('labres_accuracy'), `${fmt(c.on.task.accuracyPct, 1)}%`, `${fmt(c.off.task.accuracyPct, 1)}%`],
        [t('fig_axis_rt'), fmt(rOn?.mean), fmt(rOff?.mean)],
        ['95%', rOn ? `${fmt(rOn.low)}–${fmt(rOn.high)}` : '—', rOff ? `${fmt(rOff.low)}–${fmt(rOff.high)}` : '—']
    ]);
    const tableConflict = tableHTML(t, head, [
        [t('fig_match'), fmt(c.on.task.match.meanRtMs), fmt(c.off.task.match.meanRtMs)],
        [t('fig_mismatch'), fmt(c.on.task.mismatch.meanRtMs), fmt(c.off.task.mismatch.meanRtMs)]
    ]);

    return `
        <div class="nb-figures">
            <figure class="nb-figure nb-figure-wide" data-figure="timeline" data-reveal data-draw>
                <span class="nb-figure-label">${esc(fill(t('fig_label'), { n: 1 }))}</span>
                <h3>${esc(t('fig_timeline_title'))}</h3>
                ${legendWithStages}
                <div class="nb-figure-plot"></div>
                <figcaption>${esc(t('fig_timeline_caption'))}</figcaption>
                ${tableTimeline}
            </figure>
            <figure class="nb-figure" data-figure="reaction" data-reveal data-draw>
                <span class="nb-figure-label">${esc(fill(t('fig_label'), { n: 2 }))}</span>
                <h3>${esc(t('fig_rt_title'))}</h3>
                ${legendDots}
                <div class="nb-figure-plot"></div>
                <figcaption>${esc(t('fig_rt_caption'))}</figcaption>
                ${tableRt}
            </figure>
            <figure class="nb-figure" data-figure="conflict" data-reveal data-draw style="--d:90ms">
                <span class="nb-figure-label">${esc(fill(t('fig_label'), { n: 3 }))}</span>
                <h3>${esc(t('fig_stroop_title'))}</h3>
                ${legend}
                <div class="nb-figure-plot"></div>
                <figcaption>${esc(t('fig_stroop_caption'))}</figcaption>
                ${tableConflict}
            </figure>
        </div>`;
}

// Draws the three figures and redraws them when the width changes.
export function mountFigures(root, session, t) {
    const condOrder = ['on', 'off'];
    const hosts = {
        timeline: root.querySelector('[data-figure="timeline"]'),
        reaction: root.querySelector('[data-figure="reaction"]'),
        conflict: root.querySelector('[data-figure="conflict"]')
    };
    if (!hosts.timeline) return () => {};
    let lastWidth = 0;
    const draw = () => {
        const w = root.clientWidth;
        if (w === lastWidth) return;
        lastWidth = w;
        renderTimeline(hosts.timeline, session, t);
        renderReaction(hosts.reaction, session, t, condOrder);
        renderConflict(hosts.conflict, session, t, condOrder);
    };
    draw();
    let frame = 0;
    const onResize = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
}
