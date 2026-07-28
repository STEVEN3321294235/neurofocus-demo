import { setState } from './state.js';
import { getSessionUser } from '../services/authService.js';
import { importVersionedModule } from '../services/runtimeLoader.js?v=2026-07-28-2';
import { getLang, getTheme } from '../services/storageService.js';


async function bootstrap() {
    const [{ initRouter }, { applyStoredTheme }] = await Promise.all([
        importVersionedModule('/app/router.js'),
        importVersionedModule('/components/controlBar.js')
    ]);

    const lang = getLang();
    const theme = getTheme();
    const sessionUser = getSessionUser();

    setState({
        lang,
        theme,
        currentUser: sessionUser?.username || null
    });

    document.body.dataset.lang = lang;
    document.documentElement.lang = lang === 'hk' ? 'zh-HK' : 'en';
    document.documentElement.dataset.platform = /Windows/i.test(navigator.userAgent) ? 'windows' : 'default';
    applyStoredTheme(theme);

    await initRouter(document.getElementById('app-root'));
}

bootstrap().catch((error) => {
    console.error('Application bootstrap failed', error);
    const root = document.getElementById('app-root');
    if (root) {
        root.innerHTML = `<main class="page" style="display:grid;place-items:center;min-height:100vh;padding:2rem;"><div class="loader-error">${error.message || error}</div></main>`;
    }
});
