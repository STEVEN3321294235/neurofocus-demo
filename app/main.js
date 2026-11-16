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

// Loading screen counter, in the style of the Home intro. Real progress is not
// known, so the number eases towards 99 while the screen is up and jumps to
// 100 as it closes. Only the number and the line move.
function startLoaderCounter() {
    const loader = document.getElementById('transition-loader');
    const count = loader?.querySelector('.loader-count');
    const fill = loader?.querySelector('.loader-bar-fill');
    if (!loader || !count) return;
    let frame = 0;
    let shownAt = 0;
    const tick = (now) => {
        const t = (now - shownAt) / 1000;
        const value = Math.min(99, Math.round(99 * (1 - Math.exp(-t / 2.2))));
        count.textContent = String(value).padStart(3, '0');
        if (fill) fill.style.transform = `scaleX(${value / 100})`;
        frame = requestAnimationFrame(tick);
    };
    const visible = () => loader.style.display !== 'none' && loader.style.display !== '';
    let wasVisible = false;
    const sync = () => {
        const now = visible();
        if (now && !wasVisible) {
            shownAt = performance.now();
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(tick);
        } else if (!now && wasVisible) {
            cancelAnimationFrame(frame);
            count.textContent = '100';
            if (fill) fill.style.transform = 'scaleX(1)';
        }
        wasVisible = now;
    };
    new MutationObserver(sync).observe(loader, { attributes: true, attributeFilter: ['style'] });
    sync();
}
startLoaderCounter();

bootstrap().catch((error) => {
    console.error('Application bootstrap failed', error);
    const root = document.getElementById('app-root');
    if (root) {
        root.innerHTML = `<main class="page" style="display:grid;place-items:center;min-height:100vh;padding:2rem;"><div class="loader-error">${error.message || error}</div></main>`;
    }
});
