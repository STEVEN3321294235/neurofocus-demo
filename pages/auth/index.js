import { t } from '../../app/i18n.js?v=2026-07-28-2';
import { getState, setState } from '../../app/state.js';
import { login, register, logout } from '../../services/authService.js';
import { syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-07-28-2';
import { backdropHTML, bindThemeToggle, prefersReducedMotion, rollLabel, startReveals, themeToggleHTML } from '../../components/motion.js?v=2026-07-28-2';

// Log-in / sign-up page, in the same glass style as Home. Wide screens: a short
// intro with the brain shape on the left, the form on the right. Phones: the
// form only. Sized to fit one screen without scrolling.
let cleanup = () => {};

function renderAuthForm(state) {
    const isLogin = state.authView !== 'register';
    return `
        <div class="auth-glass" data-reveal style="--d:120ms">
            <div class="auth-tabs" role="tablist">
                <button type="button" class="auth-tab ${isLogin ? 'is-on' : ''}" ${isLogin ? 'aria-selected="true"' : 'data-switch-auth'}>${t('auth_login_title')}</button>
                <button type="button" class="auth-tab ${isLogin ? '' : 'is-on'}" ${isLogin ? 'data-switch-auth' : 'aria-selected="true"'}>${t('auth_register_title')}</button>
            </div>
            <p class="auth-desc">${isLogin ? t('auth_login_desc') : t('auth_register_desc')}</p>
            <div class="auth-fields">
                ${isLogin ? '' : `
                <label class="auth-field">
                    <span>${t('auth_username_placeholder')}</span>
                    <input id="auth-username" type="text" autocomplete="nickname" value="${state.currentUser || ''}">
                    <small>${t('auth_username_hint')}</small>
                </label>`}
                <label class="auth-field">
                    <span>${t('auth_email_placeholder')}</span>
                    <input id="auth-email" type="email" autocomplete="email">
                </label>
                <label class="auth-field">
                    <span>${t('auth_password_placeholder')}</span>
                    <input id="auth-password" type="password" autocomplete="${isLogin ? 'current-password' : 'new-password'}">
                </label>
            </div>
            <button type="button" class="nb-btn nb-btn-primary nb-btn-lg auth-submit" data-submit-auth>${rollLabel(isLogin ? t('auth_submit_login') : t('auth_submit_register'))}</button>
            <p class="auth-message" id="auth-message" aria-live="polite"></p>
            <div class="auth-foot">
                <button type="button" class="nb-link" data-switch-auth>${isLogin ? t('auth_need_account') : t('auth_has_account')}</button>
                <button type="button" class="nb-link" data-back-home>${t('back_home')}</button>
            </div>
        </div>
    `;
}

function renderSessionCard(state) {
    const separator = state.lang === 'en' ? ', ' : '，';
    return `
        <div class="auth-glass" data-reveal style="--d:120ms">
            <h2 class="auth-hello">${t('auth_session_ready')}${separator}<span class="nb-mono">${state.currentUser}</span></h2>
            <p class="auth-desc">${t('auth_session_desc')}</p>
            <div class="auth-stack">
                <button type="button" class="nb-btn nb-btn-primary nb-btn-lg" data-continue-setup>${rollLabel(t('continue'))}<span class="nb-arrow" aria-hidden="true">→</span></button>
                <button type="button" class="nb-btn" data-logout-user>${rollLabel(t('auth_logout'))}</button>
            </div>
            <div class="auth-foot">
                <button type="button" class="nb-link" data-back-home>${t('back_home')}</button>
            </div>
        </div>
    `;
}

export default {
    render() {
        const state = getState();
        return `
            <main class="page page-auth nb-page">
                ${backdropHTML()}
                <canvas class="nb-scene" data-scene aria-hidden="true"></canvas>
                <div class="auth-wrap">
                    <header class="auth-top" data-reveal>
                        <span class="nb-brand">NeuroFocus</span>
                        ${themeToggleHTML(t)}
                    </header>
                    <section class="auth-intro" data-shape="0">
                        <div class="auth-intro-text">
                            <p class="nb-eyebrow" data-reveal>${t('auth_title')}</p>
                            <h1 class="auth-title" data-split="60">${t('home_title')}</h1>
                            <p class="nb-lead" data-reveal style="--d:200ms">${t('auth_intro_desc')}</p>
                        </div>
                        <div class="auth-slot" data-slot aria-hidden="true"></div>
                    </section>
                    <section class="auth-side">
                        ${state.currentUser ? renderSessionCard(state) : renderAuthForm(state)}
                    </section>
                </div>
            </main>
        `;
    },

    unmount() {
        cleanup();
        cleanup = () => {};
        document.body.classList.remove('nb-body');
    },

    mount({ root, router }) {
        document.body.classList.add('nb-body');
        const stopReveals = startReveals(root);
        bindThemeToggle(root, () => router.refresh());

        // The brain shape from Home, beside the intro on wide screens only.
        let scene = null;
        const canvas = root.querySelector('[data-scene]');
        if (window.matchMedia('(min-width: 900px) and (min-height: 560px)').matches) {
            import('../home/brainScene.js?v=2026-07-28-2').then(({ mountBrainScene }) => {
                if (!canvas.isConnected) return;
                scene = mountBrainScene(canvas, [root.querySelector('[data-shape="0"]')], {
                    reduceMotion: prefersReducedMotion(),
                    lowPower: document.documentElement.dataset.platform === 'windows'
                });
            }).catch(() => canvas.remove());
        } else {
            canvas.remove();
        }
        cleanup = () => { scene?.destroy(); stopReveals(); };

        // Enter in any box submits the form.
        root.querySelectorAll('.auth-field input').forEach((input) => {
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') root.querySelector('[data-submit-auth]')?.click();
            });
        });

        root.querySelectorAll('[data-back-home]').forEach((button) => button.addEventListener('click', () => router.navigate('home')));

        const continueButton = root.querySelector('[data-continue-setup]');
        if (continueButton) {
            continueButton.addEventListener('click', () => {
                // Setup must start at step 01 (session goal), not input mode.
                // Coming from "Start a test" on Home, go straight to the
                // experiment's signal-source step instead.
                setState({ setupStep: getState().testMode === 'lab' ? 'mode' : 'test' });
                router.navigate('setup');
            });
        }

        const logoutButton = root.querySelector('[data-logout-user]');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => {
                logout();
                setState({ currentUser: null, authView: 'login' });
                router.refresh();
            });
        }

        root.querySelectorAll('[data-switch-auth]').forEach((switchButton) => {
            switchButton.addEventListener('click', () => {
                const next = getState().authView === 'register' ? 'login' : 'register';
                setState({ authView: next });
                router.refresh();
            });
        });

        const submitButton = root.querySelector('[data-submit-auth]');
        if (submitButton) {
            submitButton.addEventListener('click', async () => {
                const state = getState();
                const username = root.querySelector('#auth-username')?.value;
                const email = root.querySelector('#auth-email')?.value;
                const password = root.querySelector('#auth-password')?.value;
                const message = root.querySelector('#auth-message');

                submitButton.disabled = true;
                try {
                    const session = state.authView === 'register'
                        ? await register({ username, email, password })
                        : await login({ email, password });

                    if (session.needsEmailConfirm) {
                        // Account created but the Supabase project requires email
                        // confirmation before login — tell the user and stay here.
                        if (message) message.textContent = t('auth_confirm_email_sent');
                        setState({ authView: 'login' });
                        return;
                    }

                    setState({
                        currentUser: session.username,
                        setupStep: state.testMode === 'lab' ? 'mode' : 'test',
                        inputMode: 'idle',
                        cameraConsent: 'unknown',
                        focusSource: 'simulation-fallback'
                    });
                    await syncRuntimeState({
                        user: session.username,
                        lang: state.lang,
                        difficulty: state.difficulty,
                        inputMode: 'idle',
                        cameraConsent: 'unknown',
                        focusSource: 'simulation-fallback'
                    });
                    router.navigate('setup');
                } catch (error) {
                    if (message) {
                        const key = error?.code ? `auth_error_${error.code}` : '';
                        const translated = key ? t(key) : '';
                        // Server errors arrive in English only, so anything without our
                        // own wording gets one plain line in the page language.
                        message.textContent = translated && translated !== key ? translated : t('auth_error_generic');
                    }
                } finally {
                    submitButton.disabled = false;
                }
            });
        }
    }
};
