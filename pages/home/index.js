// Home page (TALE 2026 glass redesign).
//
// Top to bottom: big question, two buttons, three true facts about the test,
// a demo brainwave card (clearly labelled as a demo), a slow ticker of
// questions for later, three steps, the honesty note and three privacy points.

import { getState, setState } from '../../app/state.js';
import { LANGUAGE_NAMES, t } from '../../app/i18n.js?v=2026-07-28-2';
import { setLang as persistLang } from '../../services/storageService.js';
import { logout } from '../../services/authService.js';
import { stopCameraPreview } from '../../services/focusInputService.js?v=2026-07-28-2';
import {
    backdropHTML, bindThemeToggle, playIntro, prefersReducedMotion, rollLabel, startReveals, themeToggleHTML
} from '../../components/motion.js?v=2026-07-28-2';

function renderLanguageSwitch(lang) {
    return `
        <span class="nb-lang" role="group">
            <button type="button" class="nb-lang-btn ${lang === 'hk' ? 'is-on' : ''}" data-lang="hk" aria-pressed="${lang === 'hk'}">${LANGUAGE_NAMES.hk}</button>
            <button type="button" class="nb-lang-btn ${lang === 'en' ? 'is-on' : ''}" data-lang="en" aria-pressed="${lang === 'en'}">${LANGUAGE_NAMES.en}</button>
        </span>`;
}

function renderStep(number, titleKey, bodyKey, delay) {
    return `
        <li class="nb-step" data-reveal style="--d:${delay}ms">
            <span class="nb-step-no nb-mono">0${number}</span>
            <h3>${t(titleKey)}</h3>
            <p>${t(bodyKey)}</p>
        </li>`;
}

function renderPrivacyPoint(icon, titleKey, bodyKey, delay) {
    return `
        <li class="nb-point" data-reveal style="--d:${delay}ms">
            <span class="nb-point-icon" aria-hidden="true">${icon}</span>
            <h3>${t(titleKey)}</h3>
            <p>${t(bodyKey)}</p>
        </li>`;
}

function renderTicker() {
    const items = [1, 2, 3, 4, 5, 6, 7].map((n) => `<span class="nb-ticker-item">${t(`home_idea_${n}`)}</span>`).join('');
    // Two copies side by side so the loop has no visible seam.
    return `
        <div class="nb-ticker" data-ticker>
            <div class="nb-ticker-track">
                <div class="nb-ticker-run">${items}</div>
                <div class="nb-ticker-run" aria-hidden="true">${items}</div>
            </div>
        </div>`;
}

let cleanup = () => {};

export default {
    render() {
        const state = getState();
        return `
            <main class="page page-home nb-page">
                ${backdropHTML()}
                <canvas class="nb-scene" data-scene aria-hidden="true"></canvas>
                <div class="nb-shell nb-home">
                    <header class="nb-top nb-home-top" data-reveal>
                        <span class="nb-brand">NeuroFocus</span>
                        <nav class="nb-home-nav">
                            ${renderLanguageSwitch(state.lang)}
                            ${themeToggleHTML(t)}
                            ${state.currentUser
                                ? `<span class="nb-home-user">${t('home_signed_in')} <strong>${state.currentUser}</strong></span>
                                   <button type="button" class="nb-link" data-home-logout>${t('auth_logout')}</button>`
                                : `<button type="button" class="nb-link" data-home-login>${t('home_login')}</button>`}
                        </nav>
                    </header>

                    <section class="nb-pair nb-hero" data-shape="0">
                        <div class="nb-pair-text">
                            <p class="nb-eyebrow" data-reveal><span class="nb-pulse" aria-hidden="true"></span>${t('home_kicker')}</p>
                            <h1 class="nb-title nb-hero-title" data-split="80">${t('home_title')}</h1>
                            <p class="nb-lead nb-hero-lead" data-reveal style="--d:350ms">${t('home_subtitle')}</p>
                            <div class="nb-actions nb-hero-actions" data-reveal style="--d:480ms">
                                <button type="button" class="nb-btn nb-btn-primary nb-btn-lg" data-lab-start>${rollLabel(t('home_start_test'))}<span class="nb-arrow" aria-hidden="true">→</span></button>
                                <button type="button" class="nb-btn nb-btn-lg" data-lab-quick>${rollLabel(t('home_try_quick'))}</button>
                            </div>
                            <dl class="nb-facts" data-reveal style="--d:600ms">
                                <div><dt class="nb-mono">5</dt><dd>${t('home_stat_1')}</dd></div>
                                <div><dt class="nb-mono">90</dt><dd>${t('home_stat_2')}</dd></div>
                                <div><dt class="nb-mono">3</dt><dd>${t('home_stat_3')}</dd></div>
                            </dl>
                        </div>
                        <div class="nb-slot" data-slot aria-hidden="true"></div>
                    </section>

                    <section class="nb-pair" data-shape="1">
                        <div class="nb-pair-text">
                            <p class="nb-eyebrow" data-reveal><span class="nb-tag">${t('home_wave_label')}</span></p>
                            <h2 class="nb-pair-title" data-split>${t('home_wave_title')}</h2>
                            <p class="nb-lead" data-reveal>${t('home_wave_body')}</p>
                            <p class="nb-fine" data-reveal>${t('home_wave_caption')}</p>
                        </div>
                        <div class="nb-slot" data-slot aria-hidden="true"></div>
                    </section>

                    <section class="nb-pair" data-shape="2">
                        <div class="nb-pair-text">
                            <h2 class="nb-section-title" data-reveal>${t('home_ideas_title')}</h2>
                            ${renderTicker()}
                            <p class="nb-fine" data-reveal>${t('home_ideas_note')}</p>
                        </div>
                        <div class="nb-slot" data-slot aria-hidden="true"></div>
                    </section>

                    <section class="nb-pair" data-shape="3">
                        <div class="nb-pair-text">
                            <h2 class="nb-section-title" data-reveal>${t('home_steps_title')}</h2>
                            <ol class="nb-steps">
                                ${renderStep(1, 'home_step_1', 'home_step_1_body', 0)}
                                ${renderStep(2, 'home_step_2', 'home_step_2_body', 90)}
                                ${renderStep(3, 'home_step_3', 'home_step_3_body', 180)}
                            </ol>
                        </div>
                        <div class="nb-slot" data-slot aria-hidden="true"></div>
                    </section>

                    <section class="nb-pair" data-shape="4">
                        <div class="nb-pair-text nb-honest" data-reveal>
                            <h2 data-split>${t('home_honest')}</h2>
                            <p>${t('home_honest_body')}</p>
                        </div>
                        <div class="nb-slot" data-slot aria-hidden="true"></div>
                    </section>

                    <section class="nb-pair" data-shape="5">
                        <div class="nb-pair-text">
                            <h2 class="nb-section-title" data-reveal>${t('home_privacy_title')}</h2>
                            <ul class="nb-points">
                                ${renderPrivacyPoint('◎', 'home_privacy_1', 'home_privacy_1_body', 0)}
                                ${renderPrivacyPoint('◇', 'home_privacy_2', 'home_privacy_2_body', 90)}
                                ${renderPrivacyPoint('↻', 'home_privacy_3', 'home_privacy_3_body', 180)}
                            </ul>
                        </div>
                        <div class="nb-slot" data-slot aria-hidden="true"></div>
                    </section>

                    <footer class="nb-foot" data-reveal>
                        <button type="button" class="nb-link" data-enter-app>${t('home_other_modes')}</button>
                        <span class="nb-foot-note">${t('home_footer')} · ${t('home_footer_note')}</span>
                    </footer>
                </div>
            </main>
        `;
    },

    async mount({ root, router }) {
        try {
            stopCameraPreview();
        } catch (e) { /* no camera was open */ }
        document.body.classList.add('nb-body');

        await playIntro(t('intro_loading'));
        const stopReveals = startReveals(root);

        // The triangle scene loads after the page is on screen, so the text is
        // never held back by the 3D library. If WebGL is missing, the page
        // simply has no scene.
        let scene = null;
        const canvas = root.querySelector('[data-scene]');
        const anchors = Array.from(root.querySelectorAll('[data-shape]'))
            .sort((a, b) => Number(a.dataset.shape) - Number(b.dataset.shape));
        import('./brainScene.js?v=2026-07-28-2').then(({ mountBrainScene }) => {
            if (!canvas.isConnected) return;
            scene = mountBrainScene(canvas, anchors, {
                reduceMotion: prefersReducedMotion(),
                lowPower: document.documentElement.dataset.platform === 'windows'
            });
        }).catch((error) => {
            console.warn('3D scene unavailable:', error);
            canvas.remove();
        });

        // The ticker only moves while it is on screen.
        const movers = Array.from(root.querySelectorAll('[data-ticker]'));
        let observer = null;
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => entry.target.classList.toggle('is-running', entry.isIntersecting));
            }, { threshold: 0.01 });
            movers.forEach((el) => observer.observe(el));
        } else {
            movers.forEach((el) => el.classList.add('is-running'));
        }
        const onVisibility = () => {
            if (document.hidden) movers.forEach((el) => el.classList.remove('is-running'));
        };
        document.addEventListener('visibilitychange', onVisibility);
        cleanup = () => {
            scene?.destroy();
            stopReveals();
            observer?.disconnect();
            document.removeEventListener('visibilitychange', onVisibility);
        };

        root.querySelectorAll('[data-lang]').forEach((button) => {
            button.addEventListener('click', () => {
                const lang = button.dataset.lang;
                persistLang(lang);
                setState({ lang });
                document.body.dataset.lang = lang;
                document.documentElement.lang = lang === 'hk' ? 'zh-HK' : 'en';
                router.refresh();
            });
        });

        bindThemeToggle(root, () => router.refresh());

        // Training / challenge / study: clear any half-started experiment so
        // this entry always opens their own chooser.
        const enterOtherModes = () => {
            setState({ testMode: 'training', setupStep: 'test', difficulty: null });
            router.navigate('auth');
        };
        root.querySelectorAll('[data-enter-app], [data-home-login]').forEach((button) => {
            button.addEventListener('click', enterOtherModes);
        });

        root.querySelector('[data-home-logout]')?.addEventListener('click', () => {
            logout();
            setState({ currentUser: null, authView: 'login' });
            router.refresh();
        });

        // Experiment mode. The full test needs an account (the Setup page sends
        // a signed-out visitor to log in first); the one-minute try-out does not.
        const enterLab = (testMode) => {
            setState({
                testMode,
                setupStep: 'mode',
                difficulty: 'lab',
                inputMode: 'idle',
                cameraConsent: 'unknown',
                focusSource: 'simulation-fallback'
            });
            router.navigate('setup');
        };
        root.querySelectorAll('[data-lab-start]').forEach((button) => {
            button.addEventListener('click', () => enterLab('lab'));
        });
        root.querySelectorAll('[data-lab-quick]').forEach((button) => {
            button.addEventListener('click', () => enterLab('quick'));
        });
    },

    unmount() {
        cleanup();
        cleanup = () => {};
        document.body.classList.remove('nb-body');
    }
};
