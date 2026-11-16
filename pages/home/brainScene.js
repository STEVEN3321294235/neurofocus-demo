// Home page 3D scene: thousands of small triangles that form one shape per
// section and re-form as the visitor scrolls (the scroll motion of the
// reference site the team picked).
//
// Each shape belongs to its section:
//   0 brain             hero: "When do you focus best?"
//   1 brainwave readout what the headband reads (demo)
//   2 phone + message   "Phone on the desk or out of the room?"
//   3 bar chart         three steps: two tests, compared (blue vs gold)
//   4 head + headband   honesty note: one sensor on the forehead
//   5 lock              privacy: your data stays yours
//
// No overlap with the page: every section has an empty "stage" element
// ([data-slot]). The shape is drawn inside the stage of the current section
// and follows it while it scrolls; between two sections it glides from one
// stage to the next. On wide screens the stage is a right-hand column, on
// phones it sits above the text (see styles/pages/home.css).
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

// ---- 0: brain, side view, front to the right ----------------------------------
function brain(n, r) {
    const out = new Float32Array(n * 3);
    // Folds: a smooth 3D pattern; points are thinned out where it is near zero,
    // which draws the grooves (sulci) between the ridges (gyri).
    const fold = (x, y, z) => Math.sin(5.6 * x + 3.1 * y + 0.7) * Math.sin(4.3 * y - 3.4 * z + 0.3)
        + 0.75 * Math.sin(7.2 * z + 3.8 * x - 1.1) * Math.sin(5.9 * x - 2.1 * y);
    let i = 0;
    let guard = 0;
    while (i < n && guard < n * 40) {
        guard += 1;
        const pick = r();
        let x; let y; let z;
        if (pick < 0.72) {
            // Cerebrum
            const [ux, uy, uz] = onSphere(r);
            x = ux * 1.55; y = uy * 1.0; z = uz * 1.15;
            if (y < -0.25) y = -0.25 + (y + 0.25) * 0.5;            // flat underside
            if (x > 0.5) y += (x - 0.5) * 0.12;                       // forehead lifts a little
            const f = Math.abs(fold(x, y, z));
            if (f < 0.2 && r() < 0.96) continue;                      // groove (almost empty)
            if (f > 0.55 && r() < 0.35) continue;                     // keep ridges as lines, not slabs
            // Lateral sulcus: a gap that separates the temporal lobe.
            const sulcusY = -0.12 + (x + 0.2) * 0.32;
            if (x > -0.3 && x < 1.05 && Math.abs(y - sulcusY) < 0.05 && Math.abs(z) > 0.55) continue;
            z += Math.sign(z || 1) * 0.06;                            // gap between the halves
        } else if (pick < 0.82) {
            // Temporal lobe: a bulge under the lateral sulcus.
            const [ux, uy, uz] = onSphere(r);
            x = 0.35 + ux * 0.75; y = -0.42 + uy * 0.32; z = uz * 1.0;
            if (Math.abs(uz) < 0.45) continue;                        // outer faces only
            if (Math.abs(fold(x, y, z)) < 0.2 && r() < 0.95) continue;
        } else if (pick < 0.94) {
            // Cerebellum with thin stripes (folia).
            const [ux, uy, uz] = onSphere(r);
            x = -1.0 + ux * 0.55; y = -0.72 + uy * 0.32; z = uz * 0.8;
            if (Math.sin(uy * 34) < -0.2) continue;
        } else {
            // Brain stem.
            const t = r();
            const a = r() * Math.PI * 2;
            const rad = 0.17 * (1 - t * 0.2);
            x = -0.35 - t * 0.2 + Math.cos(a) * rad; y = -0.6 - t * 0.85; z = Math.sin(a) * rad;
        }
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

// ---- 4: head wearing the single-sensor headband ---------------------------------------
function headband(n, r) {
    const out = new Float32Array(n * 3);
    let i = 0;
    while (i < n) {
        const p = r();
        let x; let y; let z;
        if (p < 0.4) {
            // Head (faint shell), facing right, with a little nose and chin.
            const [ux, uy, uz] = onSphere(r);
            x = ux * 0.72; y = uy * 0.92; z = uz * 0.7;
            if (ux > 0.75 && uy > -0.35 && uy < 0.05) x += 0.08 * (1 - Math.abs(uy + 0.15) * 5); // nose
            if (uy < -0.6) x *= 0.85;                                  // jaw
            if (r() < 0.35) continue;
        } else if (p < 0.47) {
            // Neck
            const a = r() * Math.PI * 2;
            x = -0.12 + Math.cos(a) * 0.3; z = Math.sin(a) * 0.3; y = -0.9 - r() * 0.45;
        } else if (p < 0.82) {
            // Band round the head at forehead height, tilted forward.
            const a = r() * Math.PI * 2;
            const b = r() * Math.PI * 2;
            const R = 0.8; const tube = 0.07;
            x = (R + tube * Math.cos(b)) * Math.cos(a);
            z = (R + tube * Math.cos(b)) * Math.sin(a) * 0.95;
            y = 0.42 + tube * Math.sin(b) * 0.6 - x * 0.06;
        } else if (p < 0.9) {
            // Sensor arm and the pad on the forehead.
            if (r() < 0.5) {
                const t = r();
                x = 0.84 + t * 0.03; y = 0.4 - t * 0.2; z = 0.1 + (r() - 0.5) * 0.03;
            } else {
                const a = r() * Math.PI * 2; const rad = Math.sqrt(r()) * 0.1;
                x = 0.86; y = 0.18 + Math.sin(a) * rad; z = 0.1 + Math.cos(a) * rad;
            }
        } else if (p < 0.96) {
            // Ear clip and its cable down from the band.
            if (r() < 0.5) {
                const [ux, uy, uz] = onSphere(r);
                x = -0.05 + ux * 0.07; y = -0.18 + uy * 0.09; z = 0.74 + uz * 0.05;
            } else {
                const t = r();
                x = -0.05 - t * 0.15; y = -0.12 + t * 0.48; z = 0.76 + Math.sin(t * 3) * 0.04;
            }
        } else {
            // The small box on the side of the band.
            x = -0.55 + r() * 0.22; y = 0.42 + r() * 0.16; z = 0.62 + r() * 0.08;
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

// ---- shaders ----------------------------------------------------------------------------------
const VERTEX = /* glsl */`
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2;
    attribute vec3 aP3; attribute vec3 aP4; attribute vec3 aP5;
    attribute vec4 aRand;      // x,y,z: spin seeds, w: delay
    attribute float aSide;     // 0 or 1: which test a chart bar belongs to
    uniform float uProgress;   // 0..5
    uniform float uTime;
    uniform float uScatter;
    uniform vec3 uPalA[6];
    uniform vec3 uPalB[6];
    uniform vec3 uOn;
    uniform vec3 uOff;
    varying vec3 vColor;
    varying float vShade;

    vec3 shape(float i) {
        return i < 0.5 ? aP0 : i < 1.5 ? aP1 : i < 2.5 ? aP2 : i < 3.5 ? aP3 : i < 4.5 ? aP4 : aP5;
    }

    vec3 shapeColor(float i, vec3 p) {
        int k = int(i + 0.5);
        vec3 a = uPalA[0]; vec3 b = uPalB[0];
        if (k == 1) { a = uPalA[1]; b = uPalB[1]; }
        else if (k == 2) { a = uPalA[2]; b = uPalB[2]; }
        else if (k == 3) { a = uPalA[3]; b = uPalB[3]; }
        else if (k == 4) { a = uPalA[4]; b = uPalB[4]; }
        else if (k == 5) { a = uPalA[5]; b = uPalB[5]; }
        if (k == 3) return mix(uOn, uOff, aSide); // chart bars wear the two test colours
        float g = clamp(0.5 + p.x * 0.3 + p.y * 0.25 + (aRand.y - 0.5) * 0.25, 0.0, 1.0);
        return mix(a, b, g);
    }

    mat3 rotAxis(vec3 a, float ang) {
        float s = sin(ang); float c = cos(ang); float oc = 1.0 - c;
        return mat3(
            oc * a.x * a.x + c,       oc * a.x * a.y + a.z * s, oc * a.z * a.x - a.y * s,
            oc * a.x * a.y - a.z * s, oc * a.y * a.y + c,       oc * a.y * a.z + a.x * s,
            oc * a.z * a.x + a.y * s, oc * a.y * a.z - a.x * s, oc * a.z * a.z + c);
    }

    float easeInOutCubic(float t) {
        return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    }

    void main() {
        float seg = clamp(floor(uProgress), 0.0, 4.0);
        float local = clamp((uProgress - seg) * 1.5 - aRand.w * 0.5, 0.0, 1.0);
        float e = easeInOutCubic(local);
        vec3 from = shape(seg);
        vec3 to = shape(seg + 1.0);
        vec3 p = mix(from, to, e);

        vec3 dir = normalize(aRand.xyz - 0.5 + 0.0001);
        p += dir * sin(e * 3.14159) * uScatter * (0.4 + aRand.w * 0.6);
        p += 0.006 * vec3(sin(uTime * 0.9 + aRand.x * 40.0), cos(uTime * 0.7 + aRand.y * 40.0), sin(uTime * 0.8 + aRand.z * 40.0));

        vColor = mix(shapeColor(seg, from), shapeColor(seg + 1.0, to), e);

        vec3 axis = normalize(aRand.zxy - 0.5 + 0.0001);
        float ang = uTime * (0.3 + aRand.x * 0.6) + e * 6.2831 + aRand.y * 6.2831;
        mat3 R = rotAxis(axis, ang);
        float size = 0.012 + aRand.z * 0.016;
        vec3 v = R * (position * size);
        vShade = 0.5 + 0.5 * abs((R * vec3(0.0, 0.0, 1.0)).z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p + v, 1.0);
    }
`;

const FRAGMENT = /* glsl */`
    precision mediump float;
    uniform float uAlpha;
    varying vec3 vColor;
    varying float vShade;
    void main() {
        // Low contrast: shading only nudges brightness.
        gl_FragColor = vec4(vColor * (0.82 + 0.22 * vShade), uAlpha);
    }
`;

// Soft, low-contrast colours chosen for what each shape means. Two stops per
// shape, blended across it. Dark theme first, light theme second.
const PALETTE = {
    dark: [
        ['#b9a3d6', '#8fa9d8'],   // brain: lavender to soft blue
        ['#86c2b4', '#8fb3cc'],   // brainwaves: sage teal to mist blue
        ['#a9b6c9', '#d6b892'],   // phone: slate with a warm notification
        ['#8ea6d9', '#c8ab73'],   // chart: soft blue (phone on desk), soft gold (phone away)
        ['#c7b2a0', '#8fbfae'],   // head and headband: sand to sage
        ['#9fc4a8', '#b8cfa0']    // lock: soft greens (safe)
    ],
    light: [
        ['#7e66a6', '#5a76ad'],
        ['#4f8f80', '#557d99'],
        ['#6b7a91', '#a8835a'],
        ['#5b77b8', '#a3834a'],
        ['#9a7f69', '#5c8f7d'],
        ['#5f8f6b', '#7d9963']
    ]
};

export function mountBrainScene(canvas, anchors, { reduceMotion = false, lowPower = false } = {}) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
        canvas.remove();
        return { destroy() {}, setTheme() {} };
    }
    const narrow = window.matchMedia('(max-width: 760px)').matches;
    const count = lowPower ? 3000 : narrow ? 3200 : 5200;
    const r = rng(20261202);

    const side = new Uint8Array(count);
    for (let i = 0; i < count; i += 1) side[i] = r() < 0.5 ? 0 : 1;

    const geometry = new THREE.InstancedBufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 0, -0.87, -0.5, 0, 0.87, -0.5, 0], 3));
    const shapes = [brain(count, r), readout(count, r), phone(count, r), chart(count, r, side), headband(count, r), lock(count, r)];
    shapes.forEach((data, i) => geometry.setAttribute(`aP${i}`, new THREE.InstancedBufferAttribute(data, 3)));
    const rand = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i += 1) rand[i] = r();
    geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 4));
    geometry.setAttribute('aSide', new THREE.InstancedBufferAttribute(Float32Array.from(side), 1));
    geometry.instanceCount = count;

    const uniforms = {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uScatter: { value: reduceMotion ? 0 : 0.35 },
        uAlpha: { value: 0.9 },
        uPalA: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
        uPalB: { value: Array.from({ length: 6 }, () => new THREE.Color()) },
        uOn: { value: new THREE.Color('#7f9ce0') },
        uOff: { value: new THREE.Color('#c9a560') }
    };
    const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const group = new THREE.Group();
    group.add(mesh);
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
        uniforms.uAlpha.value = light ? 0.8 : 0.88;
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

    // Scroll -> which section is current. A section is "formed" when its
    // middle crosses the middle of the screen.
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

    // Where a stage is on screen, in world units at z = 0.
    const worldPerPx = () => (2 * DIST * Math.tan((FOV * Math.PI) / 360)) / window.innerHeight;
    const stageAt = (i) => {
        const rect = slots[i].getBoundingClientRect();
        const k = worldPerPx();
        return {
            x: (rect.left + rect.width / 2 - window.innerWidth / 2) * k,
            y: -(rect.top + rect.height / 2 - window.innerHeight / 2) * k,
            // Shapes are normalised to a half-size of 1; keep a margin inside the stage.
            s: (Math.min(rect.width, rect.height) / 2) * 0.86 * k
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
        progress += (target - progress) * (reduceMotion ? 1 : Math.min(1, dt * 3.4));
        const i = Math.max(0, Math.min(SHAPES - 2, Math.floor(progress)));
        const f = Math.max(0, Math.min(1, progress - i));
        const e = f < 0.5 ? 4 * f * f * f : 1 - ((-2 * f + 2) ** 3) / 2;
        const a = stageAt(i);
        const b = stageAt(i + 1);
        group.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, 0);
        group.scale.setScalar(a.s + (b.s - a.s) * e);
        uniforms.uProgress.value = progress;
        uniforms.uTime.value = time;
        // A gentle sway (never a full turn), so each shape stays readable.
        const swayY = reduceMotion ? 0.25 : 0.25 + Math.sin(time * 0.4) * 0.28 + tiltX;
        const swayX = reduceMotion ? 0.05 : 0.06 + Math.sin(time * 0.3) * 0.06 + tiltY;
        group.rotation.y += (swayY - group.rotation.y) * 0.05;
        group.rotation.x += (swayX - group.rotation.x) * 0.05;
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
            geometry.dispose();
            material.dispose();
            renderer.dispose();
        }
    };
}
