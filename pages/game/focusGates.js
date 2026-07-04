// Focus Gates: glowing rings along the boat's rail. The boat always passes
// through them (there is no steering) — the challenge is WHEN you pass:
// if your live focus is at or above the threshold at the moment of crossing,
// the gate lights up and counts as cleared; otherwise it dims and counts as
// missed. Every gate is one discrete, countable focus datapoint.
//
// Deliberately self-contained: runtime.js only calls the exported functions
// and never reaches into this module's internals.

const GATE_COUNT = 8;
const GATE_SPACING = 130;      // metres between gates along -Z
const GATE_RADIUS = 7;
const GATE_TUBE = 0.35;
const RECYCLE_BEHIND = 40;     // recycle once this far behind the boat

const COLOR_IDLE = 0x38bdf8;   // waiting (soft blue)
const COLOR_CLEAR = 0x22c55e;  // cleared (green)
const COLOR_MISS = 0x64748b;   // missed (grey)

let gates = [];
let gateGeometry = null;
let stats = { cleared: 0, total: 0 };
let enabled = false;

export function initFocusGates(scene, THREE, startZ = 0) {
    disposeFocusGates(scene);
    gateGeometry = new THREE.TorusGeometry(GATE_RADIUS, GATE_TUBE, 12, 48);

    for (let i = 0; i < GATE_COUNT; i++) {
        const material = new THREE.MeshStandardMaterial({
            color: COLOR_IDLE,
            emissive: COLOR_IDLE,
            emissiveIntensity: 0.7,
            transparent: true,
            opacity: 0.85,
            roughness: 0.4,
            metalness: 0.2
        });
        const mesh = new THREE.Mesh(gateGeometry, material);
        mesh.position.set(0, GATE_RADIUS * 0.75, startZ - GATE_SPACING * (i + 1));
        mesh.userData.state = 'idle';
        scene.add(mesh);
        gates.push(mesh);
    }

    stats = { cleared: 0, total: 0 };
    enabled = true;
    return gates.length;
}

// Called every frame while the game is active. Returns 'cleared' | 'missed'
// when the boat crosses a gate this frame, otherwise null.
export function updateFocusGates({ boatZ, focus, threshold, elapsedMs }) {
    if (!enabled || gates.length === 0) return null;

    let event = null;
    const pulse = 0.55 + Math.sin(elapsedMs / 400) * 0.25;

    for (const gate of gates) {
        // Boat travels toward -Z: crossing happens when boatZ dips below gate z.
        if (gate.userData.state === 'idle') {
            gate.material.emissiveIntensity = pulse;
            if (boatZ <= gate.position.z) {
                const cleared = focus >= threshold;
                gate.userData.state = cleared ? 'cleared' : 'missed';
                gate.material.color.setHex(cleared ? COLOR_CLEAR : COLOR_MISS);
                gate.material.emissive.setHex(cleared ? COLOR_CLEAR : COLOR_MISS);
                gate.material.emissiveIntensity = cleared ? 1.6 : 0.15;
                gate.material.opacity = cleared ? 1 : 0.4;
                stats.total += 1;
                if (cleared) stats.cleared += 1;
                event = cleared ? 'cleared' : 'missed';
            }
        } else if (boatZ < gate.position.z - RECYCLE_BEHIND) {
            // Behind the boat: recycle to the front of the furthest gate.
            let minZ = Infinity;
            for (const g of gates) minZ = Math.min(minZ, g.position.z);
            gate.position.z = minZ - GATE_SPACING;
            gate.userData.state = 'idle';
            gate.material.color.setHex(COLOR_IDLE);
            gate.material.emissive.setHex(COLOR_IDLE);
            gate.material.opacity = 0.85;
        }
    }

    return event;
}

export function getGateStats() {
    return { ...stats };
}

export function resetGateStats() {
    stats = { cleared: 0, total: 0 };
}

export function disposeFocusGates(scene) {
    for (const gate of gates) {
        if (scene) scene.remove(gate);
        gate.material?.dispose?.();
    }
    gates = [];
    if (gateGeometry) {
        gateGeometry.dispose();
        gateGeometry = null;
    }
    enabled = false;
}
