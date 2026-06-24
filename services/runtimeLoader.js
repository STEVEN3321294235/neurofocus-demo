const FRONTEND_DEEPSEEK_API_KEY = 'sk-34b023fc593e4cc6b5b2c7c5d8fda6b7';
const MODULE_VERSION = '2026-06-24-23';

// #region debug-point C:runtime-loader-report
const DEBUG_SERVER_URL = typeof window !== 'undefined'
    ? (window.__TRAE_DEBUG_SERVER_URL__ || localStorage.getItem('__TRAE_DEBUG_SERVER_URL__') || null)
    : null;
const reportRuntimeLoaderDebug = (hypothesisId, msg, data = {}) => {
    if (!DEBUG_SERVER_URL) return Promise.resolve();
    return fetch(DEBUG_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'windows-home-fps', runId: 'pre-fix', hypothesisId, location: 'services/runtimeLoader.js', msg: `[DEBUG] ${msg}`, data, ts: Date.now() })
    }).catch(() => {});
};
// #endregion

try {
    localStorage.setItem('deepseek_api_key', FRONTEND_DEEPSEEK_API_KEY);
} catch (error) {
    console.warn('[runtimeLoader] Failed to persist DeepSeek API key in localStorage.', error);
}

function withModuleVersion(relativePath) {
    const separator = relativePath.includes('?') ? '&' : '?';
    return `${relativePath}${separator}v=${MODULE_VERSION}`;
}

export function importVersionedModule(relativePath) {
    return import(withModuleVersion(relativePath));
}

export function getGameRuntimeUrl(relativePath = '../pages/game/runtime.js') {
    return withModuleVersion(relativePath);
}

export async function importGameRuntime(relativePath = '../pages/game/runtime.js') {
    // #region debug-point C:import-game-runtime
    reportRuntimeLoaderDebug('C', 'importGameRuntime invoked', {
        relativePath,
        href: typeof window !== 'undefined' ? window.location.href : null
    });
    // #endregion
    return importVersionedModule(relativePath);
}

export const RUNTIME_VERSION = MODULE_VERSION;
export { MODULE_VERSION };
