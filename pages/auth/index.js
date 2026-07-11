import { t } from '../../app/i18n.js?v=2026-07-11-1';
import { getState, setState } from '../../app/state.js';
import { login, register, logout } from '../../services/authService.js';
import { syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-07-11-1';

function renderAuthForm(state) {
    const isLogin = state.authView !== 'register';

    return `
        <div class="auth-card">
            <h2>${isLogin ? t('auth_login_title') : t('auth_register_title')}</h2>
            <p>${isLogin ? t('auth_login_desc') : t('auth_register_desc')}</p>
            <div class="auth-form">
                ${isLogin ? '' : `<input id="auth-username" type="text" placeholder="${t('auth_username_placeholder')}" value="${state.currentUser || ''}">`}
                <input id="auth-email" type="email" placeholder="${t('auth_email_placeholder')}">
                <input id="auth-password" type="password" placeholder="${t('auth_password_placeholder')}">
                <button type="button" class="primary-btn" data-submit-auth>${isLogin ? t('auth_submit_login') : t('auth_submit_register')}</button>
            </div>
            <div class="auth-inline-actions">
                <button type="button" class="text-btn" data-switch-auth>${isLogin ? t('auth_need_account') : t('auth_has_account')}</button>
                <button type="button" class="text-btn" data-back-home>${t('back_home')}</button>
            </div>
            <p class="auth-message" id="auth-message"></p>
        </div>
    `;
}

function renderSessionCard(state) {
    const separator = state.lang === 'en' ? ', ' : '，';
    return `
        <div class="auth-card">
            <h2>${t('auth_session_ready')}${separator}${state.currentUser}</h2>
            <p>${t('auth_session_desc')}</p>
            <div class="auth-actions-stack">
                <button type="button" class="primary-btn" data-continue-setup>${t('continue')}</button>
                <button type="button" class="secondary-btn" data-logout-user>${t('auth_logout')}</button>
                <button type="button" class="text-btn" data-back-home>${t('back_home')}</button>
            </div>
        </div>
    `;
}

export default {
    render() {
        const state = getState();
        return `
            <main class="page page-auth">
                <section class="page-shell narrow-shell auth-layout auth-layout-compact">
                    <div class="auth-panel auth-panel-compact">
                        <header class="page-header">
                            <div>
                                <span class="eyebrow">Auth</span>
                                <h1>${t('auth_title')}</h1>
                                <p class="page-support">${t('auth_intro_desc')}</p>
                            </div>
                        </header>
                        ${state.currentUser ? renderSessionCard(state) : renderAuthForm(state)}
                    </div>
                </section>
            </main>
        `;
    },

    mount({ root, router }) {
        const backHome = root.querySelector('[data-back-home]');
        if (backHome) {
            backHome.addEventListener('click', () => router.navigate('home'));
        }

        const continueButton = root.querySelector('[data-continue-setup]');
        if (continueButton) {
            continueButton.addEventListener('click', () => {
                // Setup must start at step 01 (session goal), not input mode.
                setState({ setupStep: 'test' });
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

        const switchButton = root.querySelector('[data-switch-auth]');
        if (switchButton) {
            switchButton.addEventListener('click', () => {
                const next = getState().authView === 'register' ? 'login' : 'register';
                setState({ authView: next });
                router.refresh();
            });
        }

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
                        setupStep: 'test',
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
                        message.textContent = translated && translated !== key ? translated : (error.message || 'Error');
                    }
                } finally {
                    submitButton.disabled = false;
                }
            });
        }
    }
};
