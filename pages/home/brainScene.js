// Home page 3D scene: a cloud of small triangles that assembles into a brain,
// then re-forms into other shapes as the visitor scrolls (the scroll motion of
// the reference site the team picked).
//
// Shapes, in scroll order (one per Home section):
//   0 brain        hero ("When do you focus best?")
//   1 brainwave    the demo brainwave card
//   2 phone        "questions you could test next"
//   3 two columns  "three steps" (two tests, compared side by side)
//   4 headband     the honesty note (one sensor on the forehead)
//   5 sphere       "compared only with yourself"
//
// All motion runs in the vertex shader: every triangle carries its position in
// all six shapes, and the shader blends between two of them, with a per-
// triangle delay and a brief scatter mid-way. The CPU only updates a few
// uniforms per frame, so it stays cheap on school laptops. The loop stops
// while the page is hidden or the scene is off screen, and "reduce motion"
// gets still shapes that simply swap.

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

// ---- shape samplers: each returns n points (Float32Array, xyz) ----------------
function onSphere(r) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return [s * Math.cos(th), u, s * Math.sin(th)];
}

function brain(n, r) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
        const pick = r();
        let x;
        let y;
        let z;
        if (pick < 0.8) {
            // Cerebrum: a squashed ellipsoid with folds (gyri) and a split
            // down the middle between the two halves.
            let [ux, uy, uz] = onSphere(r);
            const folds = 1
                + 0.075 * Math.sin(ux * 9 + uy * 6) * Math.sin(uz * 8 - uy * 5)
                + 0.04 * Math.sin(ux * 17 + uz * 13);
            x = ux * 1.62 * folds;
            y = uy * 1.08 * folds;
            z = uz * 1.22 * folds;
            if (y < -0.35) y = -0.35 + (y + 0.35) * 0.45; // flatter underside
            z += Math.sign(z || 1) * 0.07; // the gap between the halves
            if (x > 0.6 && y < -0.1) y += 0.12; // front lobe tilts up a little
        } else if (pick < 0.93) {
            // Cerebellum: small, ribbed, at the back underneath.
            const [ux, uy, uz] = onSphere(r);
            const ribs = 1 + 0.06 * Math.sin(uy * 22);
            x = -1.05 + ux * 0.62 * ribs;
            y = -0.78 + uy * 0.36 * ribs;
            z = uz * 0.82 * ribs;
        } else {
            // Brain stem.
            const t = r();
            const a = r() * Math.PI * 2;
            const rad = 0.2 * (1 - t * 0.25);
            x = -0.35 - t * 0.25 + Math.cos(a) * rad;
            y = -0.7 - t * 0.95;
            z = Math.sin(a) * rad;
        }
        out.set([x, y + 0.15, z], i * 3);
    }
    return out;
}

function wave(n, r) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
        const x = (r() * 2 - 1) * 2.6;
        const lane = Math.floor(r() * 3);
        const z = (lane - 1) * 0.55 + (r() - 0.5) * 0.12;
        const y = 0.55 * Math.sin(x * 2.2 + lane) + 0.22 * Math.sin(x * 6.3 + lane * 2) + (r() - 0.5) * 0.05;
        out.set([x, y, z], i * 3);
    }
    return out;
}

function phone(n, r) {
    const out = new Float32Array(n * 3);
    const w = 1.05;
    const h = 2.05;
    const d = 0.13;
    const rad = 0.22;
    for (let i = 0; i < n; i += 1) {
        const pick = r();
        let x;
        let y;
        let z;
        if (pick < 0.62) {
            // Front glass, with the screen edge denser than the middle.
            x = (r() * 2 - 1) * w;
            y = (r() * 2 - 1) * h;
            z = d;
            if (r() < 0.5) {
                const side = Math.floor(r() * 4);
                if (side === 0) x = w * 0.9; else if (side === 1) x = -w * 0.9;
                else if (side === 2) y = h * 0.93; else y = -h * 0.93;
            }
        } else {
            // Rounded rim.
            const t = r() * 4;
            const s = r() * 2 - 1;
            if (t < 1) { x = w; y = s * (h - rad); } else if (t < 2) { x = -w; y = s * (h - rad); }
            else if (t < 3) { y = h; x = s * (w - rad); } else { y = -h; x = s * (w - rad); }
            z = (r() * 2 - 1) * d;
        }
        // round the corners
        const cx = Math.max(Math.abs(x) - (w - rad), 0);
        const cy = Math.max(Math.abs(y) - (h - rad), 0);
        const c = Math.hypot(cx, cy);
        if (c > rad) {
            x = Math.sign(x) * ((w - rad) + (cx / c) * rad);
            y = Math.sign(y) * ((h - rad) + (cy / c) * rad);
        }
        out.set([x, y, z], i * 3);
    }
    return out;
}

function columns(n, r, side) {
    // Two groups of bars: left (blue, phone on the desk) and right (gold,
    // phone away). Each triangle remembers its side so it can take that colour.
    const out = new Float32Array(n * 3);
    const heights = [1.2, 1.7, 1.45, 2.1, 1.9, 2.45];
    for (let i = 0; i < n; i += 1) {
        const s = side[i];
        const bar = Math.floor(r() * 3);
        const hgt = heights[s * 3 + bar];
        const x = (s === 0 ? -1.55 : 0.45) + bar * 0.42 + (r() - 0.5) * 0.3;
        const y = -1.2 + r() * hgt;
        const z = (r() - 0.5) * 0.3;
        out.set([x, y, z], i * 3);
    }
    return out;
}

function headband(n, r) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
        let x;
        let y;
        let z;
        if (r() < 0.86) {
            const a = r() * Math.PI * 2;
            const b = r() * Math.PI * 2;
            const R = 1.55;
            const tube = 0.13;
            x = (R + tube * Math.cos(b)) * Math.cos(a);
            z = (R + tube * Math.cos(b)) * Math.sin(a) * 0.8;
            y = tube * Math.sin(b) + Math.sin(a * 2) * 0.05;
        } else {
            // The single sensor at the front.
            const [ux, uy, uz] = onSphere(r);
            x = ux * 0.2;
            y = uy * 0.2 + 0.05;
            z = 1.32 + uz * 0.12;
        }
        // Tilt the ring towards the viewer (about 60 degrees) so it reads as a
        // band, not a line.
        const tilt = 1.05;
        const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
        const tz = y * Math.sin(tilt) + z * Math.cos(tilt);
        out.set([x, ty + 0.1, tz], i * 3);
    }
    return out;
}

function sphere(n, r) {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i += 1) {
        const [ux, uy, uz] = onSphere(r);
        const rad = r() < 0.75 ? 1.45 : 0.55 + r() * 0.3; // shell and a small core
        out.set([ux * rad, uy * rad, uz * rad], i * 3);
    }
    return out;
}

// ---- shaders ----------------------------------------------------------------------
const VERTEX = /* glsl */`
    attribute vec3 aP0; attribute vec3 aP1; attribute vec3 aP2;
    attribute vec3 aP3; attribute vec3 aP4; attribute vec3 aP5;
    attribute vec4 aRand;      // x,y,z: spin axis seed, w: delay
    attribute float aSide;     // 0 or 1, used by the two-column shape
    uniform float uProgress;   // 0..5
    uniform float uTime;
    uniform float uScatter;
    varying float vShade;
    varying float vSide;
    varying float vMix;
    varying float vGrad;
    varying float vSpark;

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

    float easeInOutCubic(float t) {
        return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    }

    void main() {
        float seg = clamp(floor(uProgress), 0.0, 4.0);
        float local = clamp((uProgress - seg) * 1.55 - aRand.w * 0.55, 0.0, 1.0);
        float e = easeInOutCubic(local);
        vec3 from = shape(seg);
        vec3 to = shape(seg + 1.0);
        vec3 p = mix(from, to, e);

        // Mid-way, every triangle swings out a little before settling.
        vec3 dir = normalize(aRand.xyz - 0.5 + 0.0001);
        p += dir * sin(e * 3.14159) * uScatter * (0.6 + aRand.w);
        // A gentle idle drift.
        p += 0.018 * vec3(sin(uTime * 0.9 + aRand.x * 40.0), cos(uTime * 0.7 + aRand.y * 40.0), sin(uTime * 0.8 + aRand.z * 40.0));

        vec3 axis = normalize(aRand.zxy - 0.5 + 0.0001);
        float ang = uTime * (0.4 + aRand.x) + e * 6.2831 + aRand.y * 6.2831;
        mat3 R = rotAxis(axis, ang);
        float size = 0.032 + aRand.z * 0.04;
        vec3 v = R * (position * size);

        vShade = 0.55 + 0.45 * abs((R * vec3(0.0, 0.0, 1.0)).z);
        vSide = aSide;
        vMix = 1.0 - abs(uProgress - 3.0); // how close we are to the two-column shape
        vGrad = clamp(0.5 + (p.x * 0.28 + p.y * 0.22), 0.0, 1.0);
        vSpark = step(0.86, aRand.y);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p + v, 1.0);
    }
`;

const FRAGMENT = /* glsl */`
    precision mediump float;
    uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC;
    uniform vec3 uOn; uniform vec3 uOff;
    uniform float uAlpha;
    varying float vShade;
    varying float vSide;
    varying float vMix;
    varying float vGrad;
    varying float vSpark;
    void main() {
        // Teal at the front-top fading to violet at the back, with a few
        // blue sparks; the two-column shape takes the two condition colours.
        vec3 base = mix(uColB, uColA, vGrad);
        base = mix(base, uColC, vSpark);
        vec3 cond = mix(uOn, uOff, vSide);
        vec3 col = mix(base, cond, clamp(vMix, 0.0, 1.0));
        gl_FragColor = vec4(col * (0.62 + 0.5 * vShade), uAlpha);
    }
`;

function readColor(name, fallback) {
    const value = getComputedStyle(document.body).getPropertyValue(name).trim();
    try {
        return new THREE.Color(value || fallback);
    } catch (e) {
        return new THREE.Color(fallback);
    }
}

// Where each shape sits on screen, and how strongly it shows. Desktop puts the
// shape to the right of the text; phones put it faintly behind the text.
const LAYOUT_WIDE = [
    { x: 2.35, y: 0.05, s: 1.0, a: 0.95 },
    { x: 0.0, y: 0.35, s: 1.05, a: 0.55 },
    { x: 2.6, y: 0.0, s: 0.85, a: 0.7 },
    { x: 2.4, y: 0.25, s: 0.95, a: 0.6 },
    { x: 2.5, y: 0.1, s: 1.0, a: 0.7 },
    { x: 2.5, y: 0.0, s: 0.95, a: 0.7 }
];
const LAYOUT_NARROW = [
    { x: 0.0, y: 1.25, s: 0.62, a: 0.55 },
    { x: 0.0, y: 0.6, s: 0.6, a: 0.35 },
    { x: 0.0, y: 0.8, s: 0.55, a: 0.35 },
    { x: 0.0, y: 0.8, s: 0.6, a: 0.35 },
    { x: 0.0, y: 0.8, s: 0.6, a: 0.35 },
    { x: 0.0, y: 0.8, s: 0.6, a: 0.35 }
];

export function mountBrainScene(canvas, anchors, { reduceMotion = false, lowPower = false } = {}) {
    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'low-power' });
    } catch (e) {
        canvas.remove();
        return { destroy() {}, setTheme() {} };
    }
    const narrowQuery = window.matchMedia('(max-width: 760px)');
    const count = lowPower || narrowQuery.matches ? 1400 : 2600;
    const r = rng(20261202);

    const side = new Uint8Array(count);
    for (let i = 0; i < count; i += 1) side[i] = r() < 0.5 ? 0 : 1;

    const geometry = new THREE.InstancedBufferGeometry();
    // One small triangle, shared by every instance.
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 0, -0.87, -0.5, 0, 0.87, -0.5, 0], 3));
    const shapes = [brain(count, r), wave(count, r), phone(count, r), columns(count, r, side), headband(count, r), sphere(count, r)];
    shapes.forEach((data, i) => geometry.setAttribute(`aP${i}`, new THREE.InstancedBufferAttribute(data, 3)));
    const rand = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i += 1) rand[i] = r();
    geometry.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 4));
    geometry.setAttribute('aSide', new THREE.InstancedBufferAttribute(Float32Array.from(side), 1));
    geometry.instanceCount = count;

    const uniforms = {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uScatter: { value: reduceMotion ? 0 : 0.55 },
        uAlpha: { value: 0.95 },
        uColA: { value: new THREE.Color('#5eead4') },
        uColB: { value: new THREE.Color('#8b7bff') },
        uColC: { value: new THREE.Color('#5B87F5') },
        uOn: { value: new THREE.Color('#5B87F5') },
        uOff: { value: new THREE.Color('#BF8826') }
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
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    camera.position.set(0, 0, 9);

    const setTheme = () => {
        uniforms.uColA.value = readColor('--nb-accent', '#5eead4');
        uniforms.uColB.value = readColor('--nb-violet', '#8b7bff');
        uniforms.uColC.value = readColor('--nb-on', '#5B87F5');
        uniforms.uOn.value = readColor('--nb-on', '#5B87F5');
        uniforms.uOff.value = readColor('--nb-off', '#BF8826');
    };
    setTheme();

    const resize = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    resize();

    // Scroll -> target progress. Each anchor element marks where a shape should
    // be fully formed: when its middle crosses the middle of the screen.
    let target = 0;
    let progress = 0;
    const measure = () => {
        const mid = window.innerHeight * 0.5;
        const centres = anchors.map((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top + rect.height * 0.5;
        });
        // Hero counts as formed while it is still in the top half.
        if (centres[0] > mid - window.innerHeight * 0.2) centres[0] = mid + 1;
        let value = 0;
        for (let i = 0; i < centres.length - 1; i += 1) {
            const a = centres[i];
            const b = centres[i + 1];
            if (mid >= b) { value = i + 1; continue; }
            if (mid > a) { value = i + (mid - a) / Math.max(1, b - a); break; }
            break;
        }
        target = Math.max(0, Math.min(SHAPES - 1, value));
        if (reduceMotion) target = Math.round(target);
    };
    measure();
    progress = target;

    // A small tilt towards the pointer.
    let tiltX = 0;
    let tiltY = 0;
    const onPointer = (e) => {
        tiltX = (e.clientX / window.innerWidth - 0.5) * 0.35;
        tiltY = (e.clientY / window.innerHeight - 0.5) * 0.2;
    };

    const layoutAt = (p) => {
        const table = narrowQuery.matches ? LAYOUT_NARROW : LAYOUT_WIDE;
        const i = Math.max(0, Math.min(SHAPES - 2, Math.floor(p)));
        const f = Math.max(0, Math.min(1, p - i));
        const e = f < 0.5 ? 4 * f * f * f : 1 - ((-2 * f + 2) ** 3) / 2;
        const a = table[i];
        const b = table[i + 1];
        return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, s: a.s + (b.s - a.s) * e, a: a.a + (b.a - a.a) * e };
    };

    let running = false;
    let frame = 0;
    let last = performance.now();
    let time = 0;
    const draw = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (!reduceMotion) time += dt;
        progress += (target - progress) * (reduceMotion ? 1 : Math.min(1, dt * 3.2));
        const look = layoutAt(progress);
        uniforms.uProgress.value = progress;
        uniforms.uTime.value = time;
        uniforms.uAlpha.value = look.a;
        group.position.set(look.x, look.y, 0);
        group.scale.setScalar(look.s);
        // Sway rather than spin: the brain stays mostly side-on (easy to
        // recognise) and the headband never turns fully edge-on.
        group.rotation.y += ((reduceMotion ? 0.35 : 0.3 + Math.sin(time * 0.35) * 0.55 + tiltX) - group.rotation.y) * 0.05;
        group.rotation.x += ((reduceMotion ? 0.1 : 0.12 + tiltY) - group.rotation.x) * 0.05;
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

    const onScroll = () => {
        measure();
        if (reduceMotion) requestAnimationFrame(draw);
    };
    const onVisibility = () => {
        if (document.hidden) stop();
        else if (!reduceMotion) start();
    };
    const onResize = () => {
        resize();
        measure();
        if (reduceMotion) requestAnimationFrame(draw);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    if (reduceMotion) requestAnimationFrame(draw);
    else start();
    canvas.classList.add('is-ready');

    return {
        setTheme: () => {
            setTheme();
            if (reduceMotion) requestAnimationFrame(draw);
        },
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
