import { importGameRuntime } from './runtimeLoader.js?v=2026-07-25-2';

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

// True on a machine where Real EEG has already been confirmed working, so the
// setup flow can skip the headset confirmation for every later visitor.
// Synchronous read of the same localStorage flag the runtime writes, so the
// setup page does not have to pull in the whole runtime just to ask.
export function isEegStation() {
    try { return localStorage.getItem('nf_eeg_station') === '1'; } catch (e) { return false; }
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
