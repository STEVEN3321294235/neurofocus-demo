import { setState } from './state.js';
import { getSessionUser } from '../services/authService.js';
import { importVersionedModule } from '../services/runtimeLoader.js?v=2026-06-24-23';
import { getLang, getTheme } from '../services/storageService.js';

// #region debug-point A:main-report
const DEBUG_SERVER_URL = window.__TRAE_DEBUG_SERVER_URL__ || null;
const reportMainDebug = (hypothesisId, msg, data = {}) => {
    if (!DEBUG_SERVER_URL) return Promise.resolve();
    return fetch(DEBUG_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'stitch-layout-game-render', runId: 'post-fix', hypothesisId, location: 'app/main.js', msg: `[DEBUG] ${msg}`, data, ts: Date.now() })
    }).catch(() => {});
};
// #endregion

async function bootstrap() {
    const [{ initRouter }, { applyStoredTheme }] = await Promise.all([
        importVersionedModule('/app/router.js'),
        importVersionedModule('/components/controlBar.js')
    ]);

    const lang = getLang();
    const theme = getTheme();
    const sessionUser = getSessionUser();
    // #region debug-point A:bootstrap-entry
    reportMainDebug('A', 'bootstrap entry', {
        lang,
        theme,
        hasAppRoot: Boolean(document.getElementById('app-root')),
        stylesheetCount: document.styleSheets.length,
        stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((node) => node.getAttribute('href'))
    });
    // #endregion

    setState({
        lang,
        theme,
        currentUser: sessionUser?.username || null
    });

    document.body.dataset.lang = lang;
    document.documentElement.lang = lang === 'hk' ? 'zh-HK' : 'en';
    applyStoredTheme(theme);

    await initRouter(document.getElementById('app-root'));
    // #region debug-point A:bootstrap-mounted
    reportMainDebug('A', 'bootstrap mounted root content', {
        currentRouteHash: window.location.hash,
        rootChildren: document.getElementById('app-root')?.childElementCount || 0,
        bodyClassName: document.body.className,
        bodyTheme: document.body.dataset.theme || null
    });
    // #endregion
}

bootstrap().catch((error) => {
    console.error('Application bootstrap failed', error);
    // #region debug-point E:bootstrap-error
    reportMainDebug('E', 'bootstrap catch triggered', {
        message: error?.message || String(error),
        stack: error?.stack || null
    });
    // #endregion
    const root = document.getElementById('app-root');
    if (root) {
        root.innerHTML = `<main class="page" style="display:grid;place-items:center;min-height:100vh;padding:2rem;"><div class="loader-error">${error.message || error}</div></main>`;
    }
});
