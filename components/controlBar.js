import { getState, setState } from '../app/state.js';
import { setLang as persistLang, setTheme as persistTheme } from '../services/storageService.js';
import { importGameRuntime } from '../services/runtimeLoader.js?v=2026-07-25-1';

function applyTheme(theme) {
    document.body.classList.toggle('light-mode', theme === 'light');
    document.body.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme !== 'light');
}

export function renderControlBar() {
    const state = getState();
    const isLight = state.theme === 'light';

    return `
        <div class="control-bar">
            <div class="lang-switch">
                <button type="button" id="lang-hk" data-lang="hk" class="${state.lang === 'hk' ? 'active' : ''}">繁</button>
                <button type="button" id="lang-en" data-lang="en" class="${state.lang === 'en' ? 'active' : ''}">EN</button>
            </div>
            <button type="button" id="theme-toggle" class="theme-toggle" data-theme-toggle aria-label="${isLight ? 'Switch to dark mode' : 'Switch to light mode'}">${isLight ? '◐' : '☀'}</button>
        </div>
    `;
}

export function bindControlBar(root, { refresh } = {}) {
    root.querySelectorAll('[data-lang]').forEach((button) => {
        button.addEventListener('click', async () => {
            const lang = button.dataset.lang;
            persistLang(lang);
            setState({ lang });
            document.body.dataset.lang = lang;
            document.documentElement.lang = lang === 'hk' ? 'zh-HK' : 'en';
            if (typeof refresh === 'function') {
                await refresh();
            }
        });
    });

    const themeButton = root.querySelector('[data-theme-toggle]');
    if (themeButton) {
        themeButton.addEventListener('click', async () => {
            const current = getState().theme;
            const next = current === 'light' ? 'dark' : 'light';
            persistTheme(next);
            setState({ theme: next });
            applyTheme(next);

            try {
                const runtime = await importGameRuntime('/pages/game/runtime.js');
                runtime.switchEnvironment(next === 'light' ? 'day' : 'night');
            } catch (error) {
                // Ignore until the game runtime is loaded.
            }

            if (typeof refresh === 'function') {
                await refresh();
            }
        });
    }
}

export function applyStoredTheme(theme) {
    applyTheme(theme);
}
