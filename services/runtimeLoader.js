const FRONTEND_DEEPSEEK_API_KEY = 'sk-34b023fc593e4cc6b5b2c7c5d8fda6b7';
const MODULE_VERSION = '2026-06-24-23';

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
    return importVersionedModule(relativePath);
}

export const RUNTIME_VERSION = MODULE_VERSION;
export { MODULE_VERSION };
