// The DeepSeek API key now lives ONLY on the server (Vercel env var
// DEEPSEEK_API_KEY, used by /api/questions.js). It must never appear in any
// client-side file again.
const MODULE_VERSION = '2026-07-28-1';


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
    return importVersionedModule(relativePath);
}

export const RUNTIME_VERSION = MODULE_VERSION;
export { MODULE_VERSION };
