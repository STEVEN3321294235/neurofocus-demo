// Voyage system: the infinite, irregular route of the training journey.
//   - routeXAt(z): a never-repeating winding course (sum of incommensurate
//     sines), so the "correct path" bends unpredictably forever;
//   - a pool of glowing dashes hugs the route curve ahead of the boat;
//   - beacon buoys sit on the route every CHECKPOINT_SPACING metres — each
//     pass is one countable checkpoint event (with gulls for life);
//   - everything recycles ahead of the boat, so scene cost is constant.
//
// Deliberately self-contained: runtime.js only calls the exported functions
// and never reaches into this module's internals.

export const CHECKPOINT_SPACING = 500; // metres between beacon buoys
const BUOY_POOL = 3;
const RECYCLE_BEHIND = 70;             // recycle once this far behind the boat
const LANE_DASH_SPACING = 22;          // metres between dashes
const LANE_DASH_COUNT = 36;            // ~790m of course visible
const BIRDS_PER_BUOY = 2;

// The winding course. Incommensurate frequencies + mixed amplitudes make it
// irregular (never a plain sine) and it extends for as long as you sail.
export function routeXAt(z) {
    const t = z * 0.001;
    return (
        40 * Math.sin(t * 2.10 + 1.7) +
        24 * Math.sin(t * 4.73 + 0.4) +
        12 * Math.sin(t * 8.97 + 2.9) +
        28 * Math.sin(t * 1.13 + 4.2)
    );
}

// Route heading at z for a boat travelling toward -Z. Positive = course bends
// toward +X. Matches the yaw convention used by runtime.js.
export function routeYawAt(z) {
    return Math.atan2(routeXAt(z - 2) - routeXAt(z + 2), 4);
}

let THREE = null;
let root = null;
let laneDashes = [];
let buoys = [];                // { group, z, x, checkpointIndex, state, lampMat, birds }
let sharedGeo = null;
let sharedMat = null;
let ecoEnabled = true;
let enabled = false;
let checkpointsPassed = 0;
let frontierIndex = 0;
let originZ = 0;

function makeDashTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 32, 128);
    const grad = ctx.createLinearGradient(0, 6, 0, 122);
    grad.addColorStop(0, 'rgba(125, 211, 252, 0)');
    grad.addColorStop(0.3, 'rgba(175, 233, 255, 1)');
    grad.addColorStop(0.7, 'rgba(175, 233, 255, 1)');
    grad.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(6, 6, 20, 116, 8);
    else ctx.rect(6, 6, 20, 116);
    ctx.fill();
    return new THREE.CanvasTexture(canvas);
}

function buildLane(scene) {
    const tex = makeDashTexture();
    const geo = new THREE.PlaneGeometry(2.8, 12);
    const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    sharedGeo.dash = geo;
    sharedMat.dash = mat;
    sharedMat.dashTexture = tex;
    for (let i = 0; i < LANE_DASH_COUNT; i++) {
        const dash = new THREE.Mesh(geo, mat);
        dash.rotation.order = 'YXZ';
        dash.rotation.x = -Math.PI / 2;
        dash.position.y = -0.05;
        dash.renderOrder = 1;
        scene.add(dash);
        laneDashes.push(dash);
    }
}

function buildShared() {
    sharedGeo = {
        float: new THREE.CylinderGeometry(1.5, 2.3, 1.9, 10),
        band: new THREE.CylinderGeometry(1.28, 1.52, 1.0, 10),
        pole: new THREE.CylinderGeometry(0.16, 0.2, 3.4, 6),
        lamp: new THREE.SphereGeometry(0.62, 10, 8),
        cap: new THREE.ConeGeometry(0.5, 0.7, 8),
        wing: new THREE.PlaneGeometry(1.7, 0.5)
    };
    sharedMat = {
        red: new THREE.MeshStandardMaterial({ color: 0xd25b4a, flatShading: true, roughness: 0.55 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf4f0e8, flatShading: true, roughness: 0.5 }),
        dark: new THREE.MeshStandardMaterial({ color: 0x2b3a4a, flatShading: true, roughness: 0.7 }),
        bird: new THREE.MeshBasicMaterial({ color: 0xf5faff, side: THREE.DoubleSide })
    };
}

function buildBuoy(scene, poolSlot) {
    const group = new THREE.Group();

    const float = new THREE.Mesh(sharedGeo.float, sharedMat.red);
    float.position.y = 0.6;
    const band = new THREE.Mesh(sharedGeo.band, sharedMat.white);
    band.position.y = 2.0;
    const pole = new THREE.Mesh(sharedGeo.pole, sharedMat.dark);
    pole.position.y = 4.1;
    // Lamp gets its own material so each buoy pulses on its own phase.
    const lampMat = new THREE.MeshStandardMaterial({
        color: 0xfff3c4,
        emissive: 0xffdf8a,
        emissiveIntensity: 1.4,
        roughness: 0.3
    });
    const lamp = new THREE.Mesh(sharedGeo.lamp, lampMat);
    lamp.position.y = 6.1;
    const cap = new THREE.Mesh(sharedGeo.cap, sharedMat.red);
    cap.position.y = 7.0;
    group.add(float, band, pole, lamp, cap);

    // A couple of gulls riding the wind around the lamp.
    const birds = [];
    if (ecoEnabled) {
        for (let b = 0; b < BIRDS_PER_BUOY; b++) {
            const bird = new THREE.Group();
            const left = new THREE.Mesh(sharedGeo.wing, sharedMat.bird);
            left.position.x = -0.8;
            left.rotation.z = 0.45;
            const right = new THREE.Mesh(sharedGeo.wing, sharedMat.bird);
            right.position.x = 0.8;
            right.rotation.z = -0.45;
            bird.add(left, right);
            bird.userData = {
                radius: 5.5 + b * 3,
                height: 9 + b * 2.2,
                speed: 0.5 + b * 0.16,
                phase: b * 2.4 + poolSlot * 1.7
            };
            group.add(bird);
            birds.push(bird);
        }
    }

    group.scale.setScalar(2.1); // stylized-large so it reads from a distance
    group.traverse((child) => { child.castShadow = false; child.receiveShadow = false; });
    scene.add(group);
    return { group, z: 0, x: 0, checkpointIndex: 0, state: 'idle', lampMat, birds, poolSlot };
}

function placeBuoy(buoy, checkpointIndex) {
    buoy.checkpointIndex = checkpointIndex;
    buoy.state = 'idle';
    buoy.z = originZ - CHECKPOINT_SPACING * checkpointIndex;
    // Sit just off the lane edge, alternating sides, so the boat sweeps past.
    const side = checkpointIndex % 2 === 0 ? 1 : -1;
    buoy.x = routeXAt(buoy.z) + side * 7;
    buoy.group.position.set(buoy.x, -0.2, buoy.z);
    buoy.group.rotation.y = ((checkpointIndex * 53) % 360) * (Math.PI / 180);
    buoy.lampMat.emissiveIntensity = 1.4;
}

export function initVoyage(scene, threeRef, profile = {}) {
    THREE = threeRef;
    disposeVoyage(scene);
    root = scene;
    ecoEnabled = !profile.ultraLowProfile;
    buildShared();
    buildLane(scene);
    for (let i = 0; i < BUOY_POOL; i++) {
        buoys.push(buildBuoy(scene, i));
    }
    resetVoyage(0);
    enabled = true;
}

// Reposition everything relative to the boat's current Z (sessions can start
// wherever the previous one ended — the world is boat-relative).
export function resetVoyage(startZ = 0) {
    originZ = startZ;
    checkpointsPassed = 0;
    frontierIndex = BUOY_POOL;
    buoys.forEach((buoy, i) => placeBuoy(buoy, i + 1));
}

// Called every frame. Returns { index, passed } when the boat passes a beacon
// this frame (only while `active`), otherwise null.
export function updateVoyage({ boatZ = 0, elapsedMs = 0, deltaSec = 0, active = false } = {}) {
    if (!enabled) return null;

    // Lane dashes hug the route curve on a world-fixed grid: each slot snaps
    // to a multiple of LANE_DASH_SPACING, so dashes never swim with the boat.
    const firstZ = boatZ + 90;
    for (let i = 0; i < laneDashes.length; i++) {
        const z = Math.floor((firstZ - i * LANE_DASH_SPACING) / LANE_DASH_SPACING) * LANE_DASH_SPACING;
        const dash = laneDashes[i];
        dash.position.x = routeXAt(z);
        dash.position.z = z;
        dash.rotation.y = -routeYawAt(z);
    }

    const t = elapsedMs / 1000;
    let event = null;
    for (const buoy of buoys) {
        // Lamp pulse + gentle bobbing/tilt in the swell.
        buoy.lampMat.emissiveIntensity = 1.4 + Math.sin(t * 1.8 + buoy.poolSlot * 2.4) * 0.5;
        buoy.group.position.y = -0.2 + Math.sin(t * 0.9 + buoy.poolSlot * 2.0) * 0.32;
        buoy.group.rotation.z = Math.sin(t * 0.7 + buoy.poolSlot) * 0.06;
        buoy.group.rotation.x = Math.cos(t * 0.8 + buoy.poolSlot * 1.4) * 0.05;

        if (buoy.birds.length && Math.abs(buoy.z - boatZ) < 650) {
            for (const bird of buoy.birds) {
                const d = bird.userData;
                const a = t * d.speed + d.phase;
                bird.position.set(Math.cos(a) * d.radius, d.height, Math.sin(a) * d.radius);
                bird.rotation.y = -a - Math.PI / 2;
                const flap = Math.sin(t * 9 + d.phase);
                bird.children[0].rotation.z = 0.45 + flap * 0.35;
                bird.children[1].rotation.z = -0.45 - flap * 0.35;
            }
        }

        if (buoy.state === 'idle' && active && boatZ <= buoy.z) {
            buoy.state = 'passed';
            buoy.lampMat.emissiveIntensity = 3.0; // salute flash
            checkpointsPassed += 1;
            event = { index: buoy.checkpointIndex, passed: checkpointsPassed };
        } else if (boatZ < buoy.z - RECYCLE_BEHIND) {
            frontierIndex += 1;
            placeBuoy(buoy, frontierIndex);
        }
    }
    return event;
}

export function getVoyageStats(boatZ = 0) {
    let next = null;
    for (const buoy of buoys) {
        if (buoy.state === 'idle' && (next === null || buoy.z > next.z)) next = buoy;
    }
    return {
        passed: checkpointsPassed,
        nextIndex: next ? next.checkpointIndex : checkpointsPassed + 1,
        distanceToNextM: next ? Math.max(0, boatZ - next.z) : CHECKPOINT_SPACING,
        spacing: CHECKPOINT_SPACING
    };
}

// Buoys inside a z-window around the boat (for the minimap).
export function getBuoysInWindow(boatZ, behindM = 80, aheadM = 760) {
    return buoys
        .filter((b) => b.z <= boatZ + behindM && b.z >= boatZ - aheadM)
        .map((b) => ({ index: b.checkpointIndex, z: b.z, x: b.x, state: b.state }))
        .sort((a, b) => b.z - a.z);
}

export function disposeVoyage(scene) {
    const target = scene || root;
    for (const dash of laneDashes) target?.remove(dash);
    laneDashes = [];
    for (const buoy of buoys) {
        target?.remove(buoy.group);
        buoy.lampMat?.dispose?.();
    }
    buoys = [];
    if (sharedGeo) Object.values(sharedGeo).forEach((g) => g?.dispose?.());
    if (sharedMat) Object.values(sharedMat).forEach((m) => m?.dispose?.());
    sharedGeo = null;
    sharedMat = null;
    checkpointsPassed = 0;
    frontierIndex = 0;
    enabled = false;
    root = null;
}
