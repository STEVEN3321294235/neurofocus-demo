import { importGameRuntime } from './runtimeLoader.js?v=2026-07-20-1';

async function getRuntime() {
    return importGameRuntime('/pages/game/runtime.js');
}

export async function syncRuntimeState(payload) {
    const runtime = await getRuntime();
    runtime.configureRuntime(payload);
    return runtime;
}

export async function activateEEGMode() {
    const runtime = await getRuntime();
    return runtime.activateEEGMode();
}

export async function activateSimulationMode() {
    const runtime = await getRuntime();
    runtime.enterSimulationMode();
    return true;
}

export async function disposeMode(resetSimulation = true) {
    const runtime = await getRuntime();
    runtime.leaveEEGMode(resetSimulation);
}
