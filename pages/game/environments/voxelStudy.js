// Voxel Library — an enclosed, cozy reading room for the calm training mode.
// Fully sealed (four walls + floor + ceiling) so NOTHING outside the room is
// ever visible: no sky, no sea, no drifting particles. Built only from
// Three.js BoxGeometry (no external assets, no Minecraft naming).
//
// Layout: bookshelves line every wall; a reading desk with a chair sits in the
// centre with a few books and a lamp on top. The camera is parked at the desk,
// looking across it toward the far bookshelves. Focus feedback is carried by
// light: the lamp and room warm/brighten with focus; during flow a couple of
// books on the desk lift and glow. Deliberately near-static.
//
// Interface: initVoxelStudy(scene, THREE), updateVoxelStudy(focus, isFlow, dt),
// applyStudyCamera(camera, THREE), driftStudyCamera(camera),
// disposeVoxelStudy(scene), isStudyReady().

let group = null;
let roomLight = null;
let lampLight = null;
let lampShade = null;
let deskBooks = [];   // books on the desk that lift/glow during flow
let elapsed = 0;
let THREERef = null;

const ROOM = 44;        // interior width/depth
const WALL_H = 26;      // wall height
const SHELF_BOOK_COLORS = [0x9b2c2c, 0x2c5282, 0x276749, 0xb7791f, 0x553c9a, 0xc05621, 0x2c7a7b, 0x744210];
const WOOD_DARK = 0x4a3524;
const WOOD_MED = 0x6b4f34;
const WOOD_WALL = 0x7a5c3c;

function mat(THREE, color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.92,
        metalness: opts.metalness ?? 0.0,
        emissive: opts.emissive ?? 0x000000,
        emissiveIntensity: opts.emissiveIntensity ?? 0
    });
}

function box(THREE, w, h, d, color, opts = {}) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(THREE, color, opts));
}

// A voxel bookshelf unit facing +normal: back panel, shelves, coloured spines.
function buildShelfWall(THREE, parent, cx, cz, rotY, length) {
    const unit = new THREE.Group();
    // Back panel
    const back = box(THREE, length, WALL_H - 2, 0.6, WOOD_DARK);
    back.position.set(0, (WALL_H - 2) / 2, 0);
    unit.add(back);
    // Horizontal shelves + spines
    const rows = 6;
    for (let r = 0; r < rows; r++) {
        const y = 2 + r * ((WALL_H - 5) / rows);
        const plank = box(THREE, length - 1, 0.4, 2.4, WOOD_MED);
        plank.position.set(0, y - 0.9, 1.1);
        unit.add(plank);
        const count = Math.floor(length / 1.3);
        for (let b = 0; b < count; b++) {
            const h = 2.4 + ((r + b) % 4) * 0.5;
            const spine = box(THREE, 0.95, h, 1.8, SHELF_BOOK_COLORS[(r * 5 + b) % SHELF_BOOK_COLORS.length], { roughness: 0.7 });
            spine.position.set(-length / 2 + 0.9 + b * 1.3, y + h / 2 - 0.9, 1.15);
            unit.add(spine);
        }
    }
    unit.position.set(cx, 0, cz);
    unit.rotation.y = rotY;
    parent.add(unit);
}

export function initVoxelStudy(scene, THREE) {
    disposeVoxelStudy(scene);
    THREERef = THREE;
    group = new THREE.Group();
    deskBooks = [];
    elapsed = 0;

    // --- Sealed shell (floor, ceiling, 4 walls) ---
    const floor = box(THREE, ROOM, 1, ROOM, 0x5a4632, { roughness: 1 });
    floor.position.set(0, -0.5, 0);
    group.add(floor);
    // Subtle floor plank lines
    for (let i = -ROOM / 2 + 4; i < ROOM / 2; i += 4) {
        const line = box(THREE, ROOM, 0.06, 0.12, 0x4a3826, { roughness: 1 });
        line.position.set(0, 0.02, i);
        group.add(line);
    }
    const ceiling = box(THREE, ROOM, 1, ROOM, 0x6b563c, { roughness: 1 });
    ceiling.position.set(0, WALL_H, 0);
    group.add(ceiling);

    // Base walls behind the shelves (so no gaps ever show through)
    const wallDefs = [
        [0, -ROOM / 2, 0],            // back (-Z)
        [0, ROOM / 2, Math.PI],       // front (+Z)
        [-ROOM / 2, 0, Math.PI / 2],  // left (-X)
        [ROOM / 2, 0, -Math.PI / 2]   // right (+X)
    ];
    for (const [x, z, ry] of wallDefs) {
        const wall = box(THREE, ROOM, WALL_H, 0.8, WOOD_WALL, { roughness: 1 });
        wall.position.set(x, WALL_H / 2, z);
        wall.rotation.y = ry;
        group.add(wall);
    }

    // Bookshelves on back + left + right walls (front wall left open behind cam)
    buildShelfWall(THREE, group, 0, -ROOM / 2 + 0.9, 0, ROOM - 4);
    buildShelfWall(THREE, group, -ROOM / 2 + 0.9, 0, Math.PI / 2, ROOM - 4);
    buildShelfWall(THREE, group, ROOM / 2 - 0.9, 0, -Math.PI / 2, ROOM - 4);

    // --- Central reading desk ---
    const desk = new THREE.Group();
    const top = box(THREE, 16, 1, 9, WOOD_MED);
    top.position.set(0, 6, 0);
    desk.add(top);
    for (const [lx, lz] of [[-7, -3.5], [7, -3.5], [-7, 3.5], [7, 3.5]]) {
        const leg = box(THREE, 1, 6, 1, WOOD_DARK);
        leg.position.set(lx, 3, lz);
        desk.add(leg);
    }
    // Books flat + a small standing stack on the desk
    for (let i = 0; i < 4; i++) {
        const bk = box(THREE, 4.5, 0.7, 6, SHELF_BOOK_COLORS[i % SHELF_BOOK_COLORS.length], { roughness: 0.6 });
        bk.position.set(-4 + i * 0.2, 6.9 + i * 0.75, -1 + i * 0.3);
        bk.rotation.y = (i % 2) * 0.2 - 0.1;
        bk.userData.baseY = bk.position.y;
        bk.userData.phase = i * 1.1;
        desk.add(bk);
        deskBooks.push(bk);
    }
    const openBook = box(THREE, 6, 0.4, 5, 0xf5efdc, { roughness: 0.5 });
    openBook.position.set(3.5, 6.7, 1.5);
    openBook.rotation.y = -0.25;
    desk.add(openBook);

    // Desk lamp
    const lampBase = box(THREE, 1.4, 0.5, 1.4, 0x2b2b2b);
    lampBase.position.set(6, 6.75, -2);
    desk.add(lampBase);
    const lampArm = box(THREE, 0.35, 5, 0.35, 0x2b2b2b);
    lampArm.position.set(6, 9, -2);
    desk.add(lampArm);
    lampShade = box(THREE, 2.2, 1.3, 2.2, 0x1f1f1f, { emissive: 0xffcf8a, emissiveIntensity: 1.0 });
    lampShade.position.set(5, 11, -2);
    desk.add(lampShade);
    group.add(desk);

    // Chair in front of the desk (camera sits just behind it)
    const chair = new THREE.Group();
    const seat = box(THREE, 5, 0.8, 5, WOOD_DARK);
    seat.position.set(0, 4, 11);
    chair.add(seat);
    const backrest = box(THREE, 5, 6, 0.8, WOOD_DARK);
    backrest.position.set(0, 7, 13.2);
    chair.add(backrest);
    for (const [lx, lz] of [[-2, 9], [2, 9], [-2, 13], [2, 13]]) {
        const leg = box(THREE, 0.7, 4, 0.7, WOOD_DARK);
        leg.position.set(lx, 2, lz);
        chair.add(leg);
    }
    group.add(chair);

    // --- Lighting (warm, enclosed) ---
    roomLight = new THREE.AmbientLight(0xffe9cf, 0.55);
    group.add(roomLight);
    lampLight = new THREE.PointLight(0xffcf8a, 1.4, 90, 2);
    lampLight.position.set(5, 11, -2);
    group.add(lampLight);
    const fill = new THREE.PointLight(0xfff2dd, 0.5, 140, 2);
    fill.position.set(0, WALL_H - 3, 8);
    group.add(fill);

    scene.add(group);
    return group;
}

const lerp = (a, b, t) => a + (b - a) * t;

export function updateVoxelStudy(focusLevel, isFlowState, dtMs) {
    if (!group || !THREERef) return;
    const dt = Math.min(dtMs, 100) / 1000;
    elapsed += dt;
    const focus = Math.max(0, Math.min(100, focusLevel)) / 100;

    // Room + lamp warm and brighten with focus; gentle flicker when distracted.
    if (roomLight) roomLight.intensity = lerp(roomLight.intensity, 0.4 + focus * 0.5, 0.03);
    if (lampLight) {
        const flicker = focus < 0.45 ? 0.8 + Math.sin(elapsed * 16) * 0.15 : 1;
        lampLight.intensity = lerp(lampLight.intensity, (0.9 + focus * 1.1) * flicker, 0.12);
    }
    if (lampShade) lampShade.material.emissiveIntensity = lerp(lampShade.material.emissiveIntensity, 0.7 + focus * 0.8, 0.05);

    // Flow: a couple of desk books lift and glow, then settle.
    for (const bk of deskBooks) {
        const targetY = bk.userData.baseY + (isFlowState ? 2.4 : 0);
        bk.position.y = lerp(bk.position.y, targetY + (isFlowState ? Math.sin(elapsed + bk.userData.phase) * 0.35 : 0), 0.05);
        bk.rotation.z = lerp(bk.rotation.z, isFlowState ? Math.sin(elapsed * 0.7 + bk.userData.phase) * 0.15 : 0, 0.05);
        if (bk.material) {
            bk.material.emissiveIntensity = lerp(bk.material.emissiveIntensity, isFlowState ? 0.55 : 0, 0.05);
            if (isFlowState) bk.material.emissive.copy(bk.material.color);
        }
    }
}

// Camera parked at the desk/chair, looking across the desk to the far shelves.
export function applyStudyCamera(camera, THREE) {
    camera.position.set(0, 12, 20);
    camera.lookAt(0, 6, -6);
    camera.fov = 55;
    camera.updateProjectionMatrix();
    camera.userData.studyBaseY = 12;
}

// Fixed camera with an extremely slow, tiny breathing drift — never leaves room.
export function driftStudyCamera(camera) {
    if (!camera) return;
    const t = performance.now() / 1000;
    const baseY = camera.userData.studyBaseY ?? 12;
    camera.position.x = Math.sin(t * 0.12) * 0.6;
    camera.position.y = baseY + Math.cos(t * 0.1) * 0.3;
    camera.position.z = 20;
    camera.lookAt(0, 6, -6);
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
    roomLight = null;
    lampLight = null;
    lampShade = null;
    deskBooks = [];
}

export function isStudyReady() {
    return group !== null;
}
