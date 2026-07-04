// The DeepSeek API key now lives ONLY on the server (Vercel env var
// DEEPSEEK_API_KEY, used by /api/questions.js). It must never appear in any
// client-side file again.
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

// Clean up any key that older builds persisted into this browser's
// localStorage, so the leaked value stops lingering on returning visitors.
try {
    localStorage.removeItem('deepseek_api_key');
} catch (error) {
    /* ignore storage access errors */
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
