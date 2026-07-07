// Voyage system: the visible "route" of the training journey.
//   - a glowing dashed lane on the water showing the course ahead;
//   - procedural lighthouse islands every CHECKPOINT_SPACING metres, passed
//     beside (never through) — each pass is one countable checkpoint event;
//   - light ecosystem touches (pulsing beacons, circling gulls) gated behind
//     the performance profile.
//
// Deliberately self-contained: runtime.js only calls the exported functions
// and never reaches into this module's internals. All geometry is shared and
// the islands recycle ahead of the boat, so scene cost is constant.

export const CHECKPOINT_SPACING = 500; // metres between lighthouses
const ISLAND_POOL = 3;                 // recycled island groups
const ISLAND_SIDE_X = 58;              // lateral offset from the lane
const RECYCLE_BEHIND = 80;             // recycle once this far behind the boat
const LANE_LENGTH = 900;
const LANE_WIDTH = 1.7;
const LANE_DASH_METRES = 22;           // world length of one dash repeat
const BIRDS_PER_ISLAND = 3;

let THREE = null;
let root = null;               // parent scene
let laneMesh = null;
let laneTexture = null;
let islands = [];              // { group, z, side, checkpointIndex, state, beaconMat, birds }
let sharedGeo = null;
let sharedMat = null;
let ecoEnabled = true;
let enabled = false;
let checkpointsPassed = 0;
let frontierIndex = 0;         // highest checkpoint index currently placed
let originZ = 0;               // boat Z at session start (world is boat-relative)

function makeLaneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 256);
    // One soft-edged dash in the top half; the empty bottom half becomes the gap.
    const grad = ctx.createLinearGradient(0, 10, 0, 140);
    grad.addColorStop(0, 'rgba(125, 211, 252, 0)');
    grad.addColorStop(0.25, 'rgba(155, 226, 255, 0.9)');
    grad.addColorStop(0.75, 'rgba(155, 226, 255, 0.9)');
    grad.addColorStop(1, 'rgba(125, 211, 252, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(22, 10, 20, 130, 10);
    else ctx.rect(22, 10, 20, 130);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, LANE_LENGTH / LANE_DASH_METRES);
    return tex;
}

function buildLane(scene) {
    laneTexture = makeLaneTexture();
    const geo = new THREE.PlaneGeometry(LANE_WIDTH, LANE_LENGTH);
    const mat = new THREE.MeshBasicMaterial({
        map: laneTexture,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    laneMesh = new THREE.Mesh(geo, mat);
    laneMesh.rotation.x = -Math.PI / 2;
    laneMesh.position.set(0, -0.12, -LANE_LENGTH * 0.35);
    laneMesh.renderOrder = 1;
    scene.add(laneMesh);
}

// Shared low-poly building blocks (flat-shaded, stylized-modern).
function buildShared() {
    sharedGeo = {
        // Tapered cylinders (not cones) so the island still has real width at
        // the waterline instead of reading as a floating cone tip.
        rock: new THREE.CylinderGeometry(14, 30, 12, 9),
        grass: new THREE.CylinderGeometry(9, 14.5, 4, 9),
        towerBase: new THREE.CylinderGeometry(2.5, 3.1, 5, 10),
        towerBand: new THREE.CylinderGeometry(2.35, 2.5, 2.2, 10),
        towerTop: new THREE.CylinderGeometry(2.1, 2.35, 4, 10),
        lantern: new THREE.CylinderGeometry(1.6, 1.6, 1.9, 8),
        roof: new THREE.ConeGeometry(2.1, 1.8, 8),
        trunk: new THREE.CylinderGeometry(0.32, 0.45, 5, 5),
        leaves: new THREE.ConeGeometry(2.4, 2.4, 6),
        wing: new THREE.PlaneGeometry(2.0, 0.62)
    };
    sharedMat = {
        rock: new THREE.MeshStandardMaterial({ color: 0x7c6a54, flatShading: true, roughness: 0.95 }),
        grass: new THREE.MeshStandardMaterial({ color: 0x3d8b52, flatShading: true, roughness: 0.9 }),
        white: new THREE.MeshStandardMaterial({ color: 0xf4f0e8, flatShading: true, roughness: 0.6 }),
        red: new THREE.MeshStandardMaterial({ color: 0xd25b4a, flatShading: true, roughness: 0.6 }),
        trunk: new THREE.MeshStandardMaterial({ color: 0x8a5a33, flatShading: true, roughness: 0.95 }),
        bird: new THREE.MeshBasicMaterial({ color: 0xf5faff, side: THREE.DoubleSide })
    };
}

function buildIsland(scene, poolSlot) {
    const group = new THREE.Group();

    const rock = new THREE.Mesh(sharedGeo.rock, sharedMat.rock);
    rock.position.y = -3; // spans -9..+3: solid width at the waterline
    group.add(rock);

    const grass = new THREE.Mesh(sharedGeo.grass, sharedMat.grass);
    grass.position.y = 5; // plateau 3..7 on top of the rock
    group.add(grass);

    // Lighthouse stack on the summit.
    const towerY = 7.0;
    const base = new THREE.Mesh(sharedGeo.towerBase, sharedMat.white);
    base.position.y = towerY + 2.5;
    const band = new THREE.Mesh(sharedGeo.towerBand, sharedMat.red);
    band.position.y = towerY + 6.1;
    const top = new THREE.Mesh(sharedGeo.towerTop, sharedMat.white);
    top.position.y = towerY + 9.2;
    // Beacon gets its own material so each island can pulse on its own phase.
    const beaconMat = new THREE.MeshStandardMaterial({
        color: 0xfff3c4,
        emissive: 0xffdf8a,
        emissiveIntensity: 1.2,
        roughness: 0.3
    });
    const lantern = new THREE.Mesh(sharedGeo.lantern, beaconMat);
    lantern.position.y = towerY + 12.2;
    const roof = new THREE.Mesh(sharedGeo.roof, sharedMat.red);
    roof.position.y = towerY + 14.0;
    group.add(base, band, top, lantern, roof);

    // A couple of stylized palms on the grass.
    if (ecoEnabled) {
        for (let t = 0; t < 2; t++) {
            const px = t === 0 ? -7 : 8;
            const pz = t === 0 ? 5 : -4;
            const trunk = new THREE.Mesh(sharedGeo.trunk, sharedMat.trunk);
            trunk.position.set(px, 7.4, pz);
            trunk.rotation.z = t === 0 ? 0.16 : -0.12;
            const leaves = new THREE.Mesh(sharedGeo.leaves, sharedMat.grass);
            leaves.position.set(px + (t === 0 ? 0.8 : -0.6), 10.4, pz);
            group.add(trunk, leaves);
        }
    }

    // Gulls circling the lantern.
    const birds = [];
    if (ecoEnabled) {
        for (let b = 0; b < BIRDS_PER_ISLAND; b++) {
            const bird = new THREE.Group();
            const left = new THREE.Mesh(sharedGeo.wing, sharedMat.bird);
            left.position.x = -0.95;
            left.rotation.z = 0.45;
            const right = new THREE.Mesh(sharedGeo.wing, sharedMat.bird);
            right.position.x = 0.95;
            right.rotation.z = -0.45;
            bird.add(left, right);
            bird.userData = {
                radius: 10 + b * 4,
                height: 26 + b * 2.5,
                speed: 0.45 + b * 0.12,
                phase: b * 2.1 + poolSlot * 1.3
            };
            group.add(bird);
            birds.push(bird);
        }
    }

    group.traverse((child) => { child.castShadow = false; child.receiveShadow = false; });
    scene.add(group);
    return { group, z: 0, side: 1, checkpointIndex: 0, state: 'idle', beaconMat, birds, poolSlot };
}

// Deterministic small variation so islands don't look copy-pasted.
function placeIsland(island, checkpointIndex) {
    island.checkpointIndex = checkpointIndex;
    island.state = 'idle';
    island.z = originZ - CHECKPOINT_SPACING * checkpointIndex;
    island.side = checkpointIndex % 2 === 0 ? 1 : -1;
    const wobble = ((checkpointIndex * 7919) % 13) - 6; // -6..+6 m
    const scale = 0.85 + ((checkpointIndex * 104729) % 100) / 100 * 0.35; // 0.85..1.2
    island.group.position.set(island.side * (ISLAND_SIDE_X + wobble), 0, island.z);
    island.group.scale.setScalar(scale);
    island.group.rotation.y = ((checkpointIndex * 31) % 360) * (Math.PI / 180);
    island.beaconMat.emissiveIntensity = 1.2;
}

export function initVoyage(scene, threeRef, profile = {}) {
    THREE = threeRef;
    disposeVoyage(scene);
    root = scene;
    ecoEnabled = !profile.ultraLowProfile;
    buildShared();
    buildLane(scene);
    for (let i = 0; i < ISLAND_POOL; i++) {
        islands.push(buildIsland(scene, i));
    }
    resetVoyage(0);
    enabled = true;
}

// Reposition everything relative to the boat's current Z (sessions can start
// wherever the previous one ended — the world is boat-relative).
export function resetVoyage(startZ = 0) {
    originZ = startZ;
    checkpointsPassed = 0;
    frontierIndex = ISLAND_POOL;
    islands.forEach((island, i) => placeIsland(island, i + 1));
}

// Called every frame. Returns { index, passed } when the boat passes a
// lighthouse this frame (only while `active`), otherwise null.
export function updateVoyage({ boatZ = 0, elapsedMs = 0, deltaSec = 0, active = false } = {}) {
    if (!enabled) return null;

    // Lane follows the boat; texture offset counter-scrolls so the dashes
    // stay fixed in world space (course lines, not a conveyor belt).
    if (laneMesh) {
        const laneZ = boatZ - LANE_LENGTH * 0.35;
        laneMesh.position.z = laneZ;
        laneTexture.offset.y = -(laneZ / LANE_DASH_METRES) % 1;
    }

    let event = null;
    for (const island of islands) {
        // Beacon pulse (cheap: one uniform write per island).
        island.beaconMat.emissiveIntensity = 1.2 + Math.sin(elapsedMs / 600 + island.poolSlot * 2.4) * 0.45;

        // Gulls circle the lantern; skip flocks far behind/ahead of the boat.
        if (island.birds.length && Math.abs(island.z - boatZ) < 700) {
            const t = elapsedMs / 1000;
            for (const bird of island.birds) {
                const d = bird.userData;
                const a = t * d.speed + d.phase;
                bird.position.set(Math.cos(a) * d.radius, d.height, Math.sin(a) * d.radius);
                bird.rotation.y = -a - Math.PI / 2;
                const flap = Math.sin(t * 9 + d.phase);
                bird.children[0].rotation.z = 0.45 + flap * 0.35;
                bird.children[1].rotation.z = -0.45 - flap * 0.35;
            }
        }

        if (island.state === 'idle' && active && boatZ <= island.z) {
            island.state = 'passed';
            island.beaconMat.emissiveIntensity = 2.6; // salute flash
            checkpointsPassed += 1;
            event = { index: island.checkpointIndex, passed: checkpointsPassed };
        } else if (boatZ < island.z - RECYCLE_BEHIND) {
            frontierIndex += 1;
            placeIsland(island, frontierIndex);
        }
    }
    return event;
}

export function getVoyageStats(boatZ = 0) {
    let next = null;
    for (const island of islands) {
        if (island.state === 'idle' && (next === null || island.z > next.z)) next = island;
    }
    return {
        passed: checkpointsPassed,
        nextIndex: next ? next.checkpointIndex : checkpointsPassed + 1,
        distanceToNextM: next ? Math.max(0, boatZ - next.z) : CHECKPOINT_SPACING,
        spacing: CHECKPOINT_SPACING
    };
}

export function disposeVoyage(scene) {
    const target = scene || root;
    if (laneMesh) {
        target?.remove(laneMesh);
        laneMesh.geometry?.dispose?.();
        laneMesh.material?.dispose?.();
        laneTexture?.dispose?.();
        laneMesh = null;
        laneTexture = null;
    }
    for (const island of islands) {
        target?.remove(island.group);
        island.beaconMat?.dispose?.();
    }
    if (sharedGeo) Object.values(sharedGeo).forEach((g) => g.dispose?.());
    if (sharedMat) Object.values(sharedMat).forEach((m) => m.dispose?.());
    sharedGeo = null;
    sharedMat = null;
    islands = [];
    checkpointsPassed = 0;
    frontierIndex = 0;
    enabled = false;
    root = null;
}
