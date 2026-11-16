// Home page 3D scene: thousands of small triangles that form one shape per
// section and re-form as the visitor scrolls (the scroll motion of the
// reference site the team picked).
//
// Each shape belongs to its section:
//   0 brain             hero: "When do you focus best?"
//   1 brainwave readout what the headband reads (demo)
//   2 phone + message   "Phone on the desk or out of the room?"
//   3 bar chart         three steps: two tests, compared (blue vs gold)
//   4 headband          honesty note: one sensor on the forehead
//   5 lock              privacy: your data stays yours
//
// No overlap with the page: every section has an empty "stage" element
// ([data-slot]). The shape is drawn inside the stage of the current section
// and follows it while it scrolls; between two sections it glides from one
// stage to the next. On wide screens the stage is a right-hand column, on
// phones it sits above the text (see styles/pages/home.css).
//
// Look: a light mesh of lines joining nearby points, partly covered by small
// solid pyramids (tetrahedra) with soft lighting.
//
// All shape blending runs in the vertex shader; the CPU only reads six
// element positions and sets a few uniforms per frame. The loop stops while
// the tab is hidden, and "reduce motion" gets still shapes that swap.

import * as THREE from 'three';

const SHAPES = 6;

// ---- deterministic random ------------------------------------------------------
function rng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function onSphere(r) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return [s * Math.cos(th), u, s * Math.sin(th)];
}

// Pick a segment in proportion to its length, then a point on it.
function onSegments(segments, r, jitter = 0.008) {
    let total = 0;
    const lens = segments.map(([a, b]) => {
        const l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        total += l;
        return l;
    });
    let pick = r() * total;
    let k = 0;
    while (k < lens.length - 1 && pick > lens[k]) { pick -= lens[k]; k += 1; }
    const [a, b] = segments[k];
    const t = r();
    return [
        a[0] + (b[0] - a[0]) * t + (r() - 0.5) * jitter,
        a[1] + (b[1] - a[1]) * t + (r() - 0.5) * jitter,
        a[2] + (b[2] - a[2]) * t + (r() - 0.5) * jitter
    ];
}

function roundedRectPath(w, h, rad, z, steps = 10) {
    // Closed outline of a rounded rectangle, as segments.
    const pts = [];
    const corners = [[w - rad, h - rad, 0], [-w + rad, h - rad, Math.PI / 2], [-w + rad, -h + rad, Math.PI], [w - rad, -h + rad, Math.PI * 1.5]];
    corners.forEach(([cx, cy, start]) => {
        for (let i = 0; i <= steps; i += 1) {
            const a = start + (i / steps) * (Math.PI / 2);
            pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, z]);
        }
    });
    const segs = [];
    for (let i = 0; i < pts.length; i += 1) segs.push([pts[i], pts[(i + 1) % pts.length]]);
    return segs;
}

function circlePath(cx, cy, rad, z, steps = 24) {
    const segs = [];
    for (let i = 0; i < steps; i += 1) {
        const a = (i / steps) * Math.PI * 2;
        const b = ((i + 1) / steps) * Math.PI * 2;
        segs.push([[cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, z], [cx + Math.cos(b) * rad, cy + Math.sin(b) * rad, z]]);
    }
    return segs;
}

// Centre a point cloud and scale it so its larger half-extent (x or y) is 1.
function normalise(out) {
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    for (let i = 0; i < out.length; i += 3) {
        minX = Math.min(minX, out[i]); maxX = Math.max(maxX, out[i]);
        minY = Math.min(minY, out[i + 1]); maxY = Math.max(maxY, out[i + 1]);
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const s = 1 / Math.max((maxX - minX) / 2, (maxY - minY) / 2);
    for (let i = 0; i < out.length; i += 3) {
        out[i] = (out[i] - cx) * s;
        out[i + 1] = (out[i + 1] - cy) * s;
        out[i + 2] *= s;
    }
    return out;
}

// ---- 0: brain (cerebrum only), side view, front to the right ---------------------
// Only the large upper brain, so the outline never looks like a mushroom.
// The surface is pushed out along ridges (gyri) and in along grooves (sulci),
// so it has real bumps, plus the two named grooves: the lateral sulcus above
// the temporal lobe and the central sulcus over the top.
function brain(n, r) {
    const out = new Float32Array(n * 3);
    const fold = (x, y, z) => Math.sin(5.2 * x + 2.9 * y + 0.7) * Math.sin(4.1 * y - 3.2 * z + 0.3)
        + 0.8 * Math.sin(6.8 * z + 3.6 * x - 1.1) * Math.sin(5.4 * x - 2.0 * y)
        + 0.35 * Math.sin(11 * x + 9 * z) * Math.sin(10 * y - 7 * x);
    let i = 0;
    let guard = 0;
    while (i < n && guard < n * 40) {
        guard += 1;
        const [ux, uy, uz] = onSphere(r);
        // Base outline: longer front-to-back, rounder at the back, flatter
        // underneath, with the temporal lobe bulging low at the front-middle.
        let x = ux * 1.6;
        let y = uy * 1.02;
        let z = uz * 1.18;
        if (x < -0.6) y *= 0.92;                                     // back rounds off
        if (y < -0.2) {
            const temporal = Math.max(0, 1 - Math.abs(x - 0.25) / 0.95); // bulge under the middle
            y = -0.2 + (y + 0.2) * (0.38 + 0.5 * temporal);
        }
        if (x > 0.55) y += (x - 0.55) * 0.1;                          // forehead lifts a little
        // Bumps: push the surface out on ridges and in on grooves.
        const f = fold(x, y, z);
        const bump = 1 + 0.075 * Math.tanh(f * 2.6);
        x *= bump; y *= bump; z *= bump;
        const groove = Math.abs(f) < 0.16;
        if (groove && r() < 0.88) continue;                          // grooves read as gaps
        // Lateral sulcus (a long groove sloping up towards the back).
        const sulcusY = -0.16 + (0.9 - x) * -0.18;
        if (x > -0.5 && x < 1.15 && Math.abs(y - sulcusY) < 0.055 && Math.abs(uz) > 0.45) continue;
        // Central sulcus: from the top, down and slightly forward.
        if (y > -0.1 && Math.abs(x - (-0.05 + 0.32 * (1 - y))) < 0.045 && Math.abs(uz) > 0.2) continue;
        // The gap between the two halves, seen along the top.
        if (y > 0.35 && Math.abs(z) < 0.07) continue;
        z += Math.sign(z || 1) * 0.04;
        out.set([x, y, z], i * 3);
        i += 1;
    }
    return normalise(out);
}

// ---- 1: four-channel brainwave readout ------------------------------------------
function readout(n, r) {
    const out = new Float32Array(n * 3);
    const channels = 4;
    const wave = (c, x) => {
        // Alpha-like bursts on some channels, faster ripples on others.
        const burst = 0.5 + 0.5 * Math.sin(x * 1.3 + c * 1.7);
        return 0.13 * Math.sin(x * (9 + c * 2) + c) * burst
            + 0.05 * Math.sin(x * (23 + c * 5) + c * 2)
            + 0.03 * Math.sin(x * 47 + c * 3);
    };
    for (let i = 0; i < n; i += 1) {
        const p = r();
        let x; let y; let z = (r() - 0.5) * 0.02;
        if (p < 0.88) {
            const c = Math.floor(r() * channels);
            x = -1.4 + r() * 2.8;
            y = 0.9 - c * 0.6 + wave(c, x) + (r() - 0.5) * 0.008;
        } else if (p < 0.95) {
            // Faint baselines
            const c = Math.floor(r() * channels);
            x = -1.4 + r() * 2.8; y = 0.9 - c * 0.6; z -= 0.05;
        } else {
            // A scale bar at the left.
            x = -1.55 + (r() < 0.5 ? 0 : (r() * 0.2));
            y = r() < 0.5 ? -1.05 + r() * 0.35 : -1.05;
        }
        out.set([x, y, z], i * 3);
    }
    return normalise(out);
}

// ---- 2: phone with a notification ----------------------------------------------------
function phone(n, r) {
    const out = new Float32Array(n * 3);
    const W = 0.56; const H = 1.15; const D = 0.05;
    const outer = roundedRectPath(W, H, 0.16, D);
    const inner = roundedRectPath(W - 0.05, H - 0.05, 0.12, D + 0.002);
    const island = roundedRectPath(0.12, 0.035, 0.035, D + 0.004, 4).map(([a, b]) => [[a[0], a[1] + H - 0.13, a[2]], [b[0], b[1] + H - 0.13, b[2]]]);
    const icons = [];
    for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 4; col += 1) {
            const cx = -0.36 + col * 0.24;
            const cy = 0.62 - row * 0.27;
            roundedRectPath(0.075, 0.075, 0.025, D + 0.004, 3).forEach(([a, b]) => icons.push([[a[0] + cx, a[1] + cy, a[2]], [b[0] + cx, b[1] + cy, b[2]]]));
        }
    }
    // The notification that pulls attention away, floating in front.
    const bubble = roundedRectPath(0.5, 0.13, 0.06, D + 0.18, 5).map(([a, b]) => [[a[0] + 0.3, a[1] + 0.95, a[2]], [b[0] + 0.3, b[1] + 0.95, b[2]]]);
    const lines = [
        [[-0.05, 1.0, D + 0.18], [0.6, 1.0, D + 0.18]],
        [[-0.05, 0.9, D + 0.18], [0.42, 0.9, D + 0.18]]
    ];
    const dot = circlePath(0.78, 1.08, 0.05, D + 0.2, 12);
    for (let i = 0; i < n; i += 1) {
        const p = r();
        let pt;
        if (p < 0.3) pt = onSegments(outer, r, 0.012);
        else if (p < 0.4) pt = onSegments(inner, r, 0.006);
        else if (p < 0.43) pt = onSegments(island, r, 0.004);
        else if (p < 0.72) pt = onSegments(icons, r, 0.006);
        else if (p < 0.88) pt = onSegments(bubble, r, 0.008);
        else if (p < 0.95) pt = onSegments(lines, r, 0.01);
        else if (p < 0.97) pt = onSegments(dot, r, 0.01);
        else pt = [(r() * 2 - 1) * W, (r() * 2 - 1) * H, -D]; // faint back
        out.set(pt, i * 3);
    }
    return normalise(out);
}

// ---- 3: bar chart, two tests side by side -----------------------------------------------
function chart(n, r, side) {
    const out = new Float32Array(n * 3);
    const heights = [[0.95, 1.25, 1.05], [1.35, 1.65, 1.5]]; // blue (phone on desk), gold (phone away)
    const axes = [
        [[-1.3, -0.9, 0], [1.35, -0.9, 0]],
        [[-1.3, -0.9, 0], [-1.3, 1.0, 0]],
        ...[0, 1, 2, 3].map((k) => [[-1.36, -0.9 + k * 0.45, 0], [-1.3, -0.9 + k * 0.45, 0]])
    ];
    for (let i = 0; i < n; i += 1) {
        let pt;
        if (r() < 0.1) {
            pt = onSegments(axes, r, 0.006);
        } else {
            const s = side[i];
            const bar = Math.floor(r() * 3);
            const h = heights[s][bar];
            const x0 = (s === 0 ? -1.1 : 0.15) + bar * 0.38;
            // Edges denser than faces, so each bar reads as a solid block.
            const edge = r() < 0.45;
            let x = x0 + r() * 0.28;
            let y = -0.88 + r() * h;
            if (edge) {
                if (r() < 0.5) x = x0 + (r() < 0.5 ? 0 : 0.28);
                else y = -0.88 + h;
            }
            pt = [x, y, (r() - 0.5) * 0.12];
        }
        out.set(pt, i * 3);
    }
    return normalise(out);
}

// ---- 4: the brainwave headband (MindWave-style), no head ------------------------
// Front view: a band arching over the top from ear to ear, a housing on the
// left, a sensor arm reaching forward to the forehead pad, and an ear clip
// hanging on its cable.
function headband(n, r) {
    const out = new Float32Array(n * 3);
    const RX = 0.82; const RY = 0.98;
    const bandAt = (deg) => {
        const a = (deg * Math.PI) / 180;
        return [Math.cos(a) * RX, Math.sin(a) * RY - 0.05];
    };
    // Sensor arm: a smooth curve from the housing up and forward to the pad.
    const arm = (t) => [-0.62 + t * 0.6, 0.02 + Math.sin(t * 1.6) * 0.42, 0.12 + t * 0.62];
    const pad = arm(1);
    let i = 0;
    while (i < n) {
        const p = r();
        let x; let y; let z;
        if (p < 0.46) {
            // Band: a flat strip with rounded edges, ear to ear over the top.
            const deg = -18 + r() * 216;
            const [bx, by] = bandAt(deg);
            const across = (r() * 2 - 1) * 0.11;            // width of the strip (z)
            const thick = (r() < 0.7 ? 1 : -1) * 0.022;       // two faces of the strip
            const nx = Math.cos((deg * Math.PI) / 180); const ny = Math.sin((deg * Math.PI) / 180);
            const edge = r() < 0.35 ? Math.sign(across || 1) * 0.11 : across; // edges denser
            x = bx + nx * thick; y = by + ny * thick; z = edge;
        } else if (p < 0.64) {
            // Housing on the left end: a rounded box with a ring button.
            const [hx, hy] = bandAt(198);
            const u = r() * 2 - 1; const v = r() * 2 - 1;
            const face = r();
            if (face < 0.5) { x = hx - 0.06 + u * 0.13; y = hy - 0.1 + v * 0.2; z = 0.13; }
            else if (face < 0.8) { x = hx - 0.06 + (r() < 0.5 ? -0.13 : 0.13); y = hy - 0.1 + v * 0.2; z = u * 0.13; }
            else { const a = r() * Math.PI * 2; x = hx - 0.06 + Math.cos(a) * 0.05; y = hy - 0.1 + Math.sin(a) * 0.05; z = 0.14; }
        } else if (p < 0.78) {
            // Sensor arm: a slim tube.
            const t = r();
            const [ax, ay, az] = arm(t);
            const a = r() * Math.PI * 2;
            x = ax + Math.cos(a) * 0.025; y = ay + Math.sin(a) * 0.025; z = az;
        } else if (p < 0.88) {
            // Forehead sensor pad: a disc facing forward, rim denser.
            const a = r() * Math.PI * 2;
            const rad = r() < 0.5 ? 0.11 : Math.sqrt(r()) * 0.11;
            x = pad[0] + Math.cos(a) * rad; y = pad[1] + Math.sin(a) * rad; z = pad[2] + 0.02;
        } else if (p < 0.95) {
            // Cable from the housing down to the ear clip.
            const t = r();
            const [hx, hy] = bandAt(198);
            x = hx - 0.06 + Math.sin(t * 2.2) * 0.08; y = hy - 0.3 - t * 0.5; z = 0.05 + t * 0.04;
        } else {
            // Ear clip: two small jaws.
            const [hx, hy] = bandAt(198);
            const jaw = r() < 0.5 ? -0.04 : 0.04;
            x = hx - 0.02 + (r() * 2 - 1) * 0.06; y = hy - 0.86 + (r() * 2 - 1) * 0.07; z = 0.09 + jaw;
        }
        out.set([x, y, z], i * 3);
        i += 1;
    }
    return normalise(out);
}

// ---- 5: lock --------------------------------------------------------------------------------
function lock(n, r) {
    const out = new Float32Array(n * 3);
    const bodyW = 0.62; const bodyH = 0.48; const bodyD = 0.2;
    const keyhole = (x, y) => Math.hypot(x, y - 0.05) < 0.1 || (Math.abs(x) < 0.04 && y < 0.05 && y > -0.22);
    let i = 0;
    while (i < n) {
        const p = r();
        let x; let y; let z;
        if (p < 0.3) {
            // Shackle: an arch of tube with two legs.
            const t = r();
            const b = r() * Math.PI * 2;
            const tube = 0.06;
            const R = 0.4;
            if (t < 0.6) {
                const a = (t / 0.6) * Math.PI;
                const cx = Math.cos(a) * R; const cy = bodyH + 0.18 + Math.sin(a) * R;
                x = cx + Math.cos(a) * tube * Math.cos(b); y = cy + Math.sin(a) * tube * Math.cos(b); z = tube * Math.sin(b);
            } else {
                const leg = r() < 0.5 ? -R : R;
                x = leg + tube * Math.cos(b); y = bodyH - 0.02 + r() * 0.2; z = tube * Math.sin(b);
            }
        } else {
            // Body: front face (with the keyhole cut out), edges denser.
            const face = r();
            if (face < 0.62) {
                x = (r() * 2 - 1) * bodyW; y = (r() * 2 - 1) * bodyH; z = bodyD;
                if (keyhole(x, y)) continue;
                if (r() < 0.4) {
                    const e = Math.floor(r() * 4);
                    if (e === 0) x = bodyW; else if (e === 1) x = -bodyW; else if (e === 2) y = bodyH; else y = -bodyH;
                }
            } else if (face < 0.78) {
                // Keyhole outline
                const segs = [...circlePath(0, 0.05, 0.1, bodyD, 16), [[-0.04, -0.22, bodyD], [0.04, -0.22, bodyD]], [[-0.04, -0.22, bodyD], [-0.04, -0.03, bodyD]], [[0.04, -0.22, bodyD], [0.04, -0.03, bodyD]]];
                [x, y, z] = onSegments(segs, r, 0.006);
            } else {
                // Sides
                z = (r() * 2 - 1) * bodyD;
                if (r() < 0.5) { x = r() < 0.5 ? bodyW : -bodyW; y = (r() * 2 - 1) * bodyH; } else { y = r() < 0.5 ? bodyH : -bodyH; x = (r() * 2 - 1) * bodyW; }
            }
        }
        out.set([x, y, z], i * 3);
        i += 1;
    }
    return normalise(out);
}

// ---- mesh: pairs of nearby points in one shape ---------------------------------------
// Returns `count` pairs of point indices that are close together in `pts`,
// using a coarse spatial grid (fast enough for thousands of points).
function neighbourPairs(pts, n, count, r) {
    const cell = 0.09;
    const grid = new Map();
    const key = (x, y, z) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
    for (let i = 0; i < n; i += 1) {
        const k = key(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]);
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push(i);
    }
    const pairs = new Int32Array(count * 2);
    let made = 0;
    let guard = 0;
    while (made < count && guard < count * 6) {
        guard += 1;
        const i = Math.floor(r() * n);
        const x = pts[i * 3]; const y = pts[i * 3 + 1]; const z = pts[i * 3 + 2];
        const cx = Math.floor(x / cell); const cy = Math.floor(y / cell); const cz = Math.floor(z / cell);
        let best = -1; let bestD = cell * cell * 1.6;
        let second = -1; let secondD = bestD;
        for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
            const list = grid.get(`${cx + dx},${cy + dy},${cz + dz}`);
            if (!list) continue;
            for (const j of list) {
                if (j === i) continue;
                const d = (pts[j * 3] - x) ** 2 + (pts[j * 3 + 1] - y) ** 2 + (pts[j * 3 + 2] - z) ** 2;
                if (d < bestD) { second = best; secondD = bestD; best = j; bestD = d; }
                else if (d < secondD) { second = j; secondD = d; }
            }
        }
        // Link to the second-nearest now and then, so the mesh forms triangles.
        const j = second >= 0 && r() < 0.45 ? second : best;
        if (j < 0) continue;
        pairs[made * 2] = i;
        pairs[made * 2 + 1] = j;
        made += 1;
    }
    for (; made < count; made += 1) { pairs[made * 2] = 0; pairs[made * 2 + 1] = 0; }
    return pairs;
}

// ---- shaders ----------------------------------------------------------------------------------
// Shared GLSL: which shape, blend timing, and the colour of a shape.
const COMMON = /* glsl */`
    uniform float uProgress;   // 0..5
    uniform float uTime;
    uniform float uScatter;
    uniform vec3 uPalA[6];
    uniform vec3 uPalB[6];
    uniform vec3 uOn;
    uniform vec3 uOff;
    uniform float uShadeMin;   // darkest shading; higher = softer (light theme)

    float easeInOutCubic(float t) {
        return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    }

    // Blend amount between the current shape and the next, with a small
    // per-element delay so the change sweeps across the shape.
    float blendAmount(float delay) {
        float seg = clamp(floor(uProgress), 0.0, 4.0);
        return easeInOutCubic(clamp((uProgress - seg) * 1.35 - delay * 0.35, 0.0, 1.0));
    }

    vec3 paletteColor(float i, vec3 p, float rnd, float side) {
        int k = int(i + 0.5);
        vec3 a = uPalA[0]; vec3 b = uPalB[0];
        if (k == 1) { a = uPalA[1]; b = uPalB[1]; }
        else if (k == 2) { a = uPalA[2]; b = uPalB[2]; }
        else if (k == 3) { return mix(uOn, uOff, side); }
        else if (k == 4) { a = uPalA[4]; b = uPalB[4]; }
        else if (k == 5) { a = uPalA[5]; b = uPalB[5]; }
        float g = clamp(0.5 + p.x * 0.3 + p.y * 0.25 + (rnd - 0.5) * 0.2, 0.0, 1.0);
        return mix(a, b, g);
    }
`;

// Solid pyramids (tetrahedra), lit softly so they read as 3D pieces.
const SOLID_VERTEX = /* glsl */`
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2;
    attribute vec3 aP3; attribute vec3 aP4; attribute vec3 aP5;
    attribute vec4 aRand;
    attribute float aSide;
    varying vec3 vColor;
    varying float vLight;
    ${COMMON}

    vec3 shape(float i) {
        return i < 0.5 ? aP0 : i < 1.5 ? aP1 : i < 2.5 ? aP2 : i < 3.5 ? aP3 : i < 4.5 ? aP4 : aP5;
    }

    mat3 rotAxis(vec3 a, float ang) {
        float s = sin(ang); float c = cos(ang); float oc = 1.0 - c;
        return mat3(
            oc * a.x * a.x + c,       oc * a.x * a.y + a.z * s, oc * a.z * a.x - a.y * s,
            oc * a.x * a.y - a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z + a.x * s,
            oc * a.z * a.x + a.y * s, oc * a.y * a.z - a.x * s, oc * a.z * a.z + c);
    }

    void main() {
        float seg = clamp(floor(uProgress), 0.0, 4.0);
        float e = blendAmount(aRand.w);
        vec3 from = shape(seg);
        vec3 to = shape(seg + 1.0);
        vec3 p = mix(from, to, e);
        vec3 dir = normalize(aRand.xyz - 0.5 + 0.0001);
        p += dir * sin(e * 3.14159) * uScatter * (0.4 + aRand.w * 0.6);

        vColor = mix(paletteColor(seg, from, aRand.y, aSide), paletteColor(seg + 1.0, to, aRand.y, aSide), e);

        vec3 axis = normalize(aRand.zxy - 0.5 + 0.0001);
        float ang = uTime * (0.25 + aRand.x * 0.5) + e * 6.2831 + aRand.y * 6.2831;
        mat3 R = rotAxis(axis, ang);
        // Mostly small pieces, a few larger ones for depth.
        float size = 0.011 + aRand.z * 0.015 + step(0.93, aRand.x) * 0.024;
        vec3 v = R * (position * size);
        vec3 nrm = normalize(normalMatrix * (R * normal));
        vLight = uShadeMin + (1.0 - uShadeMin) * max(dot(nrm, normalize(vec3(0.35, 0.75, 0.6))), 0.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p + v, 1.0);
    }
`;

const SOLID_FRAGMENT = /* glsl */`
    precision mediump float;
    uniform float uAlpha;
    varying vec3 vColor;
    varying float vLight;
    void main() {
        gl_FragColor = vec4(vColor * vLight, uAlpha);
    }
`;

// Mesh lines: each line joins two nearby points of the current shape.
const LINE_VERTEX = /* glsl */`
    attribute vec3 aA0; attribute vec3 aA1; attribute vec3 aA2;
    attribute vec3 aA3; attribute vec3 aA4; attribute vec3 aA5;
    attribute vec3 aB0; attribute vec3 aB1; attribute vec3 aB2;
    attribute vec3 aB3; attribute vec3 aB4; attribute vec3 aB5;
    attribute vec4 aRand;
    varying vec3 vColor;
    varying float vFade;
    ${COMMON}

    vec3 endA(float i) { return i < 0.5 ? aA0 : i < 1.5 ? aA1 : i < 2.5 ? aA2 : i < 3.5 ? aA3 : i < 4.5 ? aA4 : aA5; }
    vec3 endB(float i) { return i < 0.5 ? aB0 : i < 1.5 ? aB1 : i < 2.5 ? aB2 : i < 3.5 ? aB3 : i < 4.5 ? aB4 : aB5; }

    void main() {
        float seg = clamp(floor(uProgress), 0.0, 4.0);
        float e = blendAmount(aRand.w);
        float useB = position.x;
        vec3 from = mix(endA(seg), endB(seg), useB);
        vec3 to = mix(endA(seg + 1.0), endB(seg + 1.0), useB);
        vec3 p = mix(from, to, e);
        vec3 dir = normalize(aRand.xyz - 0.5 + 0.0001);
        p += dir * sin(e * 3.14159) * uScatter * (0.4 + aRand.w * 0.6);
        vColor = mix(paletteColor(seg, from, aRand.y, step(0.5, aRand.z)), paletteColor(seg + 1.0, to, aRand.y, step(0.5, aRand.z)), e);
        // Lines fade out while a shape is changing, so the mesh never draws
        // long streaks across the screen.
        vFade = 1.0 - sin(e * 3.14159) * 0.9;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const LINE_FRAGMENT = /* glsl */`
    precision mediump float;
    uniform float uLineAlpha;
    varying vec3 vColor;
    varying float vFade;
    void main() {
        gl_FragColor = vec4(vColor, uLineAlpha * vFade);
    }
`;

// Soft, low-contrast colours chosen for what each shape means. Two stops per
// shape, blended across it. Dark theme first, light theme second.
const PALETTE = {
    dark: [
        ['#b9a7d8', '#93acd8'],   // brain: lavender to soft blue
        ['#8cc4b6', '#93b5cc'],   // brainwaves: sage teal to mist blue
        ['#a9b6c9', '#d4b994'],   // phone: slate with a warm notification
        ['#93aadb', '#c9ae7a'],   // chart: soft blue (phone on desk), soft gold (phone away)
        ['#9fcabb', '#b3a8dc'],   // headband: sage to lilac
        ['#a3c7ab', '#bcd2a6']    // lock: soft greens (safe)
    ],
    light: [
        ['#9a88c6', '#7f99c9'],
        ['#6caa99', '#7ea2bc'],
        ['#8c9aaf', '#c39d70'],
        ['#7f97d0', '#c1a066'],
        ['#7fae9e', '#9d91c6'],
        ['#82b08f', '#9fbb89']
    ]
};

// A regular tetrahedron as 4 flat faces (12 vertices), with face normals.
function tetraGeometry() {
    const v = [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]].map((p) => p.map((c) => c / Math.sqrt(3)));
    const faces = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]];
    const pos = [];
    const nor = [];
    faces.forEach(([a, b, c]) => {
        const A = v[a]; const B = v[b]; const C = v[c];
        const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
        const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
        const len = Math.hypot(...n);
        [A, B, C].forEach((P) => { pos.push(...P); nor.push(n[0] / len, n[1] / len, n[2] / len); });
    });
    return { pos, nor };
}

export function mountBrainScene(canvas, anchors, { reduceMotion = false, lowPower = false } = {}) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
        canvas.remove();
        return { destroy() {}, setTheme() {} };
    }
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    // Points that define each shape; a share of them carry a solid piece,
    // and lines join nearby points into a mesh.
    const points = lowPower ? 2600 : narrow ? 2800 : 4200;
    const solids = lowPower ? 1300 : narrow ? 1400 : 2200;
    const lines = lowPower ? 2600 : narrow ? 3000 : 5200;
    const r = rng(20261202);

    const side = new Uint8Array(points);
    for (let i = 0; i < points; i += 1) side[i] = r() < 0.5 ? 0 : 1;
    const shapes = [brain(points, r), readout(points, r), phone(points, r), chart(points, r, side), headband(points, r), lock(points, r)];

    const uniforms = {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uScatter: { value: reduceMotion ? 0 : 0.28 },
        uAlpha: { value: 0.92 },
        uLineAlpha: { value: 0.26 },
        uShadeMin: { value: 0.58 },
        uPalA: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
        uPalB: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
        uOn: { value: new THREE.Color() },
        uOff: { value: new THREE.Color() }
    };

    // --- solid pieces ---
    const tetra = tetraGeometry();
    const solidGeo = new THREE.InstancedBufferGeometry();
    solidGeo.setAttribute('position', new THREE.Float32BufferAttribute(tetra.pos, 3));
    solidGeo.setAttribute('normal', new THREE.Float32BufferAttribute(tetra.nor, 3));
    shapes.forEach((data, i) => solidGeo.setAttribute(`aP${i}`, new THREE.InstancedBufferAttribute(data.subarray(0, solids * 3), 3)));
    const rand = new Float32Array(solids * 4);
    for (let i = 0; i < solids * 4; i += 1) rand[i] = r();
    solidGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 4));
    solidGeo.setAttribute('aSide', new THREE.InstancedBufferAttribute(Float32Array.from(side.subarray(0, solids)), 1));
    solidGeo.instanceCount = solids;
    const solidMat = new THREE.ShaderMaterial({
        vertexShader: SOLID_VERTEX, fragmentShader: SOLID_FRAGMENT, uniforms, transparent: true, depthWrite: true
    });
    const solidMesh = new THREE.Mesh(solidGeo, solidMat);
    solidMesh.frustumCulled = false;

    // --- mesh lines ---
    const lineGeo = new THREE.InstancedBufferGeometry();
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));
    shapes.forEach((pts, s) => {
        const pairs = neighbourPairs(pts, points, lines, r);
        const A = new Float32Array(lines * 3);
        const B = new Float32Array(lines * 3);
        for (let k = 0; k < lines; k += 1) {
            const i = pairs[k * 2]; const j = pairs[k * 2 + 1];
            A.set(pts.subarray(i * 3, i * 3 + 3), k * 3);
            B.set(pts.subarray(j * 3, j * 3 + 3), k * 3);
        }
        lineGeo.setAttribute(`aA${s}`, new THREE.InstancedBufferAttribute(A, 3));
        lineGeo.setAttribute(`aB${s}`, new THREE.InstancedBufferAttribute(B, 3));
    });
    const lineRand = new Float32Array(lines * 4);
    for (let i = 0; i < lines * 4; i += 1) lineRand[i] = r();
    lineGeo.setAttribute('aRand', new THREE.InstancedBufferAttribute(lineRand, 4));
    lineGeo.instanceCount = lines;
    const lineMat = new THREE.ShaderMaterial({
        vertexShader: LINE_VERTEX, fragmentShader: LINE_FRAGMENT, uniforms, transparent: true, depthWrite: false
    });
    const lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    lineMesh.frustumCulled = false;

    const group = new THREE.Group();
    group.add(lineMesh);
    group.add(solidMesh);
    const scene = new THREE.Scene();
    scene.add(group);
    const FOV = 30;
    const DIST = 10;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    camera.position.set(0, 0, DIST);

    const setTheme = () => {
        const light = document.body.classList.contains('light-mode');
        const pal = PALETTE[light ? 'light' : 'dark'];
        pal.forEach(([a, b], i) => {
            uniforms.uPalA.value[i].set(a);
            uniforms.uPalB.value[i].set(b);
        });
        // The chart keeps the meaning of the two test colours (blue = phone on
        // the desk, gold = phone away) in a softer, low-contrast tone.
        uniforms.uOn.value.set(pal[3][0]);
        uniforms.uOff.value.set(pal[3][1]);
        uniforms.uAlpha.value = light ? 0.85 : 0.92;
        uniforms.uShadeMin.value = light ? 0.8 : 0.58;
        uniforms.uLineAlpha.value = light ? 0.42 : 0.34;
    };
    setTheme();

    const resize = () => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.75));
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    };
    resize();

    const slots = anchors.map((section) => section.querySelector('[data-slot]') || section);

    // Scroll position -> progress through the six shapes. A section's shape
    // is fully formed when its middle reaches the middle of the screen; in
    // between, the change follows the scroll continuously.
    let target = 0;
    let progress = 0;
    const measure = () => {
        const mid = window.innerHeight * 0.5;
        const centres = anchors.map((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top + rect.height * 0.5;
        });
        if (centres[0] > mid - window.innerHeight * 0.15) centres[0] = mid + 1;
        let value = 0;
        for (let i = 0; i < centres.length - 1; i += 1) {
            const a = centres[i];
            const b = centres[i + 1];
            if (mid >= b) { value = i + 1; continue; }
            if (mid > a) { value = i + (mid - a) / Math.max(1, b - a); }
            break;
        }
        target = Math.max(0, Math.min(SHAPES - 1, value));
        if (reduceMotion) target = Math.round(target);
    };
    measure();
    progress = target;

    const worldPerPx = () => (2 * DIST * Math.tan((FOV * Math.PI) / 360)) / window.innerHeight;
    const stageAt = (i) => {
        // A page may have fewer stages than shapes (the log-in page has one).
        const rect = slots[Math.min(i, slots.length - 1)].getBoundingClientRect();
        const k = worldPerPx();
        return {
            x: (rect.left + rect.width / 2 - window.innerWidth / 2) * k,
            y: -(rect.top + rect.height / 2 - window.innerHeight / 2) * k,
            s: (Math.min(rect.width, rect.height) / 2) * 0.98 * k
        };
    };

    let tiltX = 0;
    let tiltY = 0;
    const onPointer = (e) => {
        tiltX = (e.clientX / window.innerWidth - 0.5) * 0.25;
        tiltY = (e.clientY / window.innerHeight - 0.5) * 0.15;
    };

    let running = false;
    let frame = 0;
    let last = performance.now();
    let time = 0;
    const draw = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduceMotion) time += dt;
        progress += (target - progress) * (reduceMotion ? 1 : Math.min(1, dt * 5));
        const i = Math.max(0, Math.min(SHAPES - 2, Math.floor(progress)));
        const f = Math.max(0, Math.min(1, progress - i));
        const e = f < 0.5 ? 4 * f * f * f : 1 - ((-2 * f + 2) ** 3) / 2;
        const a = stageAt(i);
        const b = stageAt(i + 1);
        group.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, 0);
        group.scale.setScalar(a.s + (b.s - a.s) * e);
        uniforms.uProgress.value = progress;
        uniforms.uTime.value = time;
        // Turning follows the scroll (one smooth arc across the page) plus a
        // gentle sway, so scrolling and shape change feel like one motion.
        const scrollTurn = Math.sin(progress * 0.9) * 0.35;
        const swayY = reduceMotion ? 0.25 : 0.2 + scrollTurn + Math.sin(time * 0.35) * 0.12 + tiltX;
        const swayX = reduceMotion ? 0.05 : 0.08 + Math.sin(time * 0.3) * 0.05 + tiltY;
        group.rotation.y += (swayY - group.rotation.y) * 0.06;
        group.rotation.x += (swayX - group.rotation.x) * 0.06;
        renderer.render(scene, camera);
        if (running) frame = requestAnimationFrame(draw);
    };
    const start = () => {
        if (running) return;
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(draw);
    };
    const stop = () => {
        running = false;
        cancelAnimationFrame(frame);
    };
    const redrawOnce = () => requestAnimationFrame(draw);

    const onScroll = () => { measure(); if (reduceMotion) redrawOnce(); };
    const onVisibility = () => { if (document.hidden) stop(); else if (!reduceMotion) start(); };
    const onResize = () => { resize(); measure(); if (reduceMotion) redrawOnce(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) redrawOnce();
    else start();
    canvas.classList.add('is-ready');

    return {
        setTheme: () => { setTheme(); if (reduceMotion) redrawOnce(); },
        destroy() {
            stop();
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('pointermove', onPointer);
            document.removeEventListener('visibilitychange', onVisibility);
            solidGeo.dispose();
            lineGeo.dispose();
            solidMat.dispose();
            lineMat.dispose();
            renderer.dispose();
        }
    };
}
