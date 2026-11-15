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
    backdropHTML, bindThemeToggle, playIntro, rollLabel, startReveals, themeToggleHTML
} from '../../components/motion.js?v=2026-07-28-2';

// One period of a made-up brainwave trace, as SVG path data. Built from sine
// waves whose lengths divide the period exactly, so two copies set side by
// side join without a seam and can scroll forever.
function demoWavePath(period = 720, height = 120, phase = 0, scale = 1) {
    const mid = height / 2;
    const parts = [];
    for (let x = 0; x <= period * 2; x += 4) {
        const p = (x % period) / period;
        const y = mid - scale * (
            Math.sin(p * Math.PI * 2 * 3 + phase) * 16
            + Math.sin(p * Math.PI * 2 * 11 + 0.8 + phase) * 9
            + Math.sin(p * Math.PI * 2 * 29 + 1.9) * 5
            + Math.sin(p * Math.PI * 2 * 47 + 0.3) * 2.5
        );
        parts.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
    }
    return parts.join(' ');
}

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

                    <section class="nb-hero">
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
                    </section>

                    <figure class="nb-wave" data-wave data-reveal style="--d:700ms">
                        <div class="nb-wave-head">
                            <span class="nb-wave-label">${t('home_wave_label')}</span>
                            <span class="nb-wave-caption">${t('home_wave_caption')}</span>
                        </div>
                        <div class="nb-wave-window">
                            <svg class="nb-wave-svg" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
                                <path class="nb-wave-back" d="${demoWavePath(720, 120, 1.7, 0.7)}"></path>
                                <path class="nb-wave-front" d="${demoWavePath()}"></path>
                            </svg>
                        </div>
                    </figure>

                    <section class="nb-section">
                        <h2 class="nb-section-title" data-reveal>${t('home_ideas_title')}</h2>
                        ${renderTicker()}
                        <p class="nb-fine" data-reveal>${t('home_ideas_note')}</p>
                    </section>

                    <section class="nb-section">
                        <h2 class="nb-section-title" data-reveal>${t('home_steps_title')}</h2>
                        <ol class="nb-steps">
                            ${renderStep(1, 'home_step_1', 'home_step_1_body', 0)}
                            ${renderStep(2, 'home_step_2', 'home_step_2_body', 90)}
                            ${renderStep(3, 'home_step_3', 'home_step_3_body', 180)}
                        </ol>
                    </section>

                    <section class="nb-section nb-honest" data-reveal>
                        <h2 data-split>${t('home_honest')}</h2>
                        <p>${t('home_honest_body')}</p>
                    </section>

                    <section class="nb-section">
                        <h2 class="nb-section-title" data-reveal>${t('home_privacy_title')}</h2>
                        <ul class="nb-points">
                            ${renderPrivacyPoint('◎', 'home_privacy_1', 'home_privacy_1_body', 0)}
                            ${renderPrivacyPoint('◇', 'home_privacy_2', 'home_privacy_2_body', 90)}
                            ${renderPrivacyPoint('↻', 'home_privacy_3', 'home_privacy_3_body', 180)}
                        </ul>
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

        // The demo line and the ticker only move while they are on screen.
        const movers = Array.from(root.querySelectorAll('[data-wave], [data-ticker]'));
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
