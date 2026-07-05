// Voxel Study — a calm, near-static second training environment for users who
// find the ocean scene overstimulating (an ADHD-friendly "less stimulus"
// choice). Built ONLY from Three.js BoxGeometry primitives (no external assets,
// no Minecraft naming). Focus feedback is carried by light and small ambient
// details instead of motion.
//
// Interface (called by runtime.js): initVoxelStudy(scene, THREE),
// updateVoxelStudy(focusLevel, isFlowState, dtMs), disposeVoxelStudy(scene).
// The module owns its own group so runtime can add/remove it cleanly.

let group = null;
let windowLight = null;
let deskLamp = null;
let books = [];        // floating books that rise during flow
let motes = [];        // slow ambient dust
let ambient = null;
let elapsed = 0;
let THREERef = null;

function box(THREE, w, h, d, color, opts = {}) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.9,
        metalness: opts.metalness ?? 0.0,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1
    });
    return new THREE.Mesh(geo, mat);
}

const BOOK_COLORS = [0xef4444, 0x3b82f6, 0x22c55e, 0xeab308, 0xa855f7, 0xf97316, 0x14b8a6];

export function initVoxelStudy(scene, THREE) {
    disposeVoxelStudy(scene);
    THREERef = THREE;
    group = new THREE.Group();
    books = [];
    motes = [];
    elapsed = 0;

    // Floor + back/side walls (warm neutral voxel room)
    const floor = box(THREE, 40, 1, 40, 0x6b5842, { roughness: 1 });
    floor.position.set(0, -2, 0);
    group.add(floor);

    const backWall = box(THREE, 40, 26, 1, 0x8a7761, { roughness: 1 });
    backWall.position.set(0, 11, -18);
    group.add(backWall);

    const sideWall = box(THREE, 1, 26, 40, 0x7d6b55, { roughness: 1 });
    sideWall.position.set(-18, 11, 0);
    group.add(sideWall);

    // Voxel bookshelves along the back wall, filled with coloured book spines
    for (let shelf = 0; shelf < 4; shelf++) {
        const y = 2 + shelf * 5.5;
        const plank = box(THREE, 30, 0.6, 3, 0x5c4a36, { roughness: 1 });
        plank.position.set(-1, y - 1.5, -16.4);
        group.add(plank);
        for (let b = 0; b < 22; b++) {
            const h = 3.2 + (b % 4) * 0.5;
            const spine = box(THREE, 0.9, h, 2, BOOK_COLORS[(shelf * 7 + b) % BOOK_COLORS.length], { roughness: 0.7 });
            spine.position.set(-15 + b * 1.25, y + h / 2 - 1.5, -16.4);
            group.add(spine);
        }
    }

    // Desk + a couple of stacked books + the desk lamp
    const desk = box(THREE, 14, 1, 7, 0x4a3b2a, { roughness: 1 });
    desk.position.set(2, 1, 6);
    group.add(desk);
    const deskLeg1 = box(THREE, 1, 4, 1, 0x3a2e20);
    deskLeg1.position.set(-3, -0.5, 4);
    group.add(deskLeg1);
    const deskLeg2 = box(THREE, 1, 4, 1, 0x3a2e20);
    deskLeg2.position.set(7, -0.5, 4);
    group.add(deskLeg2);

    const lampArm = box(THREE, 0.5, 6, 0.5, 0x2b2b2b);
    lampArm.position.set(7, 4.5, 8);
    group.add(lampArm);
    const lampHead = box(THREE, 2.4, 1.4, 2.4, 0x1f1f1f, { emissive: 0xffcf8a, emissiveIntensity: 0.9 });
    lampHead.position.set(6, 7.4, 8);
    group.add(lampHead);

    // Window on the side wall — the main focus indicator (light warms/cools)
    const windowFrame = box(THREE, 0.6, 12, 12, 0x3a2e20);
    windowFrame.position.set(-17.4, 13, 4);
    group.add(windowFrame);
    const windowPane = box(THREE, 0.3, 10, 10, 0x8fd3ff, {
        emissive: 0x9fd8ff, emissiveIntensity: 0.5, transparent: true, opacity: 0.6, roughness: 0.2
    });
    windowPane.position.set(-17.2, 13, 4);
    group.add(windowPane);

    // Floating books that rise/glow during flow
    for (let i = 0; i < 5; i++) {
        const bk = box(THREE, 2.4, 0.6, 3.2, BOOK_COLORS[i % BOOK_COLORS.length], { roughness: 0.6 });
        bk.position.set(-6 + i * 3.2, 3.2, 2 + (i % 2) * 2);
        bk.userData.baseY = bk.position.y;
        bk.userData.phase = i * 1.3;
        group.add(bk);
        books.push(bk);
    }

    // Ambient dust motes (tiny slow-floating cubes)
    for (let i = 0; i < 14; i++) {
        const m = box(THREE, 0.18, 0.18, 0.18, 0xfff4d6, { emissive: 0xfff0c4, emissiveIntensity: 0.4 });
        m.position.set(-14 + Math.random() * 28, 2 + Math.random() * 18, -12 + Math.random() * 22);
        m.userData.phase = Math.random() * Math.PI * 2;
        m.userData.speed = 0.2 + Math.random() * 0.3;
        group.add(m);
        motes.push(m);
    }

    // Lighting: soft ambient + a warm point light at the window + desk lamp glow
    ambient = new THREE.AmbientLight(0xfff1dd, 0.5);
    group.add(ambient);
    windowLight = new THREE.PointLight(0xffd9a0, 1.1, 120, 2);
    windowLight.position.set(-14, 14, 4);
    group.add(windowLight);
    deskLamp = new THREE.PointLight(0xffcf8a, 0.8, 40, 2);
    deskLamp.position.set(6, 7, 8);
    group.add(deskLamp);

    scene.add(group);
    return group;
}

const lerp = (a, b, t) => a + (b - a) * t;

export function updateVoxelStudy(focusLevel, isFlowState, dtMs) {
    if (!group || !THREERef) return;
    const dt = Math.min(dtMs, 100) / 1000;
    elapsed += dt;
    const focus = Math.max(0, Math.min(100, focusLevel)) / 100;

    // Window light: warm + bright when focused, dim + cool when distracted (slow)
    if (windowLight) {
        windowLight.intensity = lerp(windowLight.intensity, 0.5 + focus * 1.4, 0.03);
        windowLight.color.setHSL(lerp(0.58, 0.09, focus), 0.7, 0.6);
    }
    // Desk lamp: steady glow when stable, gentle flicker when distracted
    if (deskLamp) {
        const flicker = focus < 0.45 ? 0.75 + Math.sin(elapsed * 18) * 0.2 : 1;
        deskLamp.intensity = lerp(deskLamp.intensity, (0.5 + focus * 0.6) * flicker, 0.15);
    }

    // Floating books: settle when not in flow, rise + glow faintly during flow
    for (const bk of books) {
        const targetY = bk.userData.baseY + (isFlowState ? 2.2 : 0);
        bk.position.y = lerp(bk.position.y, targetY + Math.sin(elapsed + bk.userData.phase) * (isFlowState ? 0.4 : 0.05), 0.04);
        bk.rotation.z = lerp(bk.rotation.z, isFlowState ? Math.sin(elapsed * 0.6 + bk.userData.phase) * 0.2 : 0, 0.04);
        if (bk.material) bk.material.emissiveIntensity = lerp(bk.material.emissiveIntensity, isFlowState ? 0.5 : 0, 0.05);
        if (bk.material && isFlowState) bk.material.emissive.copy(bk.material.color);
    }

    // Dust motes drift slowly regardless (calm ambient life)
    for (const m of motes) {
        m.position.y += Math.sin(elapsed * m.userData.speed + m.userData.phase) * 0.004;
        m.rotation.x += 0.01;
        m.rotation.y += 0.008;
    }
}

// Fixed camera with an extremely slow subtle drift — NO forward motion.
export function applyStudyCamera(camera, THREE) {
    camera.position.set(10, 9, 26);
    camera.lookAt(0, 8, 0);
    camera.userData.studyBaseX = 10;
}

export function driftStudyCamera(camera) {
    if (!camera) return;
    const t = performance.now() / 1000;
    const baseX = camera.userData.studyBaseX ?? 10;
    // Pin ALL THREE axes every frame — other systems (intro tweens, follow
    // logic) must never be able to walk the camera out of the room.
    camera.position.x = baseX + Math.sin(t * 0.15) * 0.8;
    camera.position.y = 9 + Math.cos(t * 0.1) * 0.4;
    camera.position.z = 26;
    camera.lookAt(0, 8, 0);
}

export function disposeVoxelStudy(scene) {
    if (group) {
        if (scene) scene.remove(group);
        group.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
        });
    }
    group = null;
    windowLight = null;
    deskLamp = null;
    books = [];
    motes = [];
    ambient = null;
}

export function isStudyReady() {
    return group !== null;
}
