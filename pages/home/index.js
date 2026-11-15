// Home page (TALE 2026 "lab notebook" version).
//
// Top to bottom: big question, two buttons, three steps, the honesty note and
// three privacy points. No scores or signal numbers are shown here: the only
// moving thing is a slow demo brainwave line, clearly labelled as a demo.

import { getState, setState } from '../../app/state.js';
import { LANGUAGE_NAMES, t } from '../../app/i18n.js?v=2026-07-28-2';
import { setLang as persistLang } from '../../services/storageService.js';
import { logout } from '../../services/authService.js';
import { stopCameraPreview } from '../../services/focusInputService.js?v=2026-07-28-2';

// One period of a made-up brainwave trace, as SVG path data. It is built from
// a few sine waves whose lengths divide the period exactly, so two copies set
// side by side join without a seam and can scroll forever.
function demoWavePath(period = 720, height = 96) {
    const mid = height / 2;
    const parts = [];
    for (let x = 0; x <= period * 2; x += 4) {
        const p = (x % period) / period;
        const y = mid
            - Math.sin(p * Math.PI * 2 * 3) * 13
            - Math.sin(p * Math.PI * 2 * 11 + 0.8) * 8
            - Math.sin(p * Math.PI * 2 * 29 + 1.9) * 4.5
            - Math.sin(p * Math.PI * 2 * 47 + 0.3) * 2.5;
        parts.push(`${x === 0 ? 'M' : 'L'}${x} ${y.toFixed(1)}`);
    }
    return parts.join(' ');
}

function renderLanguageSwitch(lang) {
    return `
        <span class="nb-lang" role="group">
            <button type="button" class="nb-lang-btn ${lang === 'hk' ? 'is-on' : ''}" data-lang="hk" aria-pressed="${lang === 'hk'}">${LANGUAGE_NAMES.hk}</button>
            <button type="button" class="nb-lang-btn ${lang === 'en' ? 'is-on' : ''}" data-lang="en" aria-pressed="${lang === 'en'}">${LANGUAGE_NAMES.en}</button>
        </span>
    `;
}

function renderStep(number, titleKey, bodyKey) {
    return `
        <li class="nb-step">
            <span class="nb-step-no nb-mono">${number}</span>
            <h3>${t(titleKey)}</h3>
            <p>${t(bodyKey)}</p>
        </li>
    `;
}

function renderPrivacyPoint(titleKey, bodyKey) {
    return `
        <li class="nb-point">
            <h3>${t(titleKey)}</h3>
            <p>${t(bodyKey)}</p>
        </li>
    `;
}

let stopWave = () => {};

export default {
    render() {
        const state = getState();
        return `
            <main class="page page-home nb-page">
                <div class="nb-shell nb-home">
                    <header class="nb-top nb-home-top">
                        <span class="nb-brand">NeuroFocus</span>
                        <nav class="nb-home-nav">
                            ${renderLanguageSwitch(state.lang)}
                            ${state.currentUser
                                ? `<span class="nb-home-user">${t('home_signed_in')} <strong>${state.currentUser}</strong></span>
                                   <button type="button" class="nb-link" data-home-logout>${t('auth_logout')}</button>`
                                : `<button type="button" class="nb-link" data-home-login>${t('home_login')}</button>`}
                        </nav>
                    </header>

                    <section class="nb-hero">
                        <h1 class="nb-title nb-hero-title">${t('home_title')}</h1>
                        <p class="nb-lead nb-hero-lead">${t('home_subtitle')}</p>
                        <div class="nb-actions nb-hero-actions">
                            <button type="button" class="nb-btn nb-btn-primary nb-btn-lg" data-lab-start>${t('home_start_test')}</button>
                            <button type="button" class="nb-btn nb-btn-lg" data-lab-quick>${t('home_try_quick')}</button>
                        </div>
                        <figure class="nb-wave" data-wave>
                            <span class="nb-wave-label">${t('home_wave_label')}</span>
                            <div class="nb-wave-window">
                                <svg class="nb-wave-svg" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true">
                                    <path d="${demoWavePath()}"></path>
                                </svg>
                            </div>
                            <figcaption>${t('home_wave_caption')}</figcaption>
                        </figure>
                    </section>

                    <section class="nb-section">
                        <h2 class="nb-section-title">${t('home_steps_title')}</h2>
                        <ol class="nb-steps">
                            ${renderStep(1, 'home_step_1', 'home_step_1_body')}
                            ${renderStep(2, 'home_step_2', 'home_step_2_body')}
                            ${renderStep(3, 'home_step_3', 'home_step_3_body')}
                        </ol>
                    </section>

                    <section class="nb-section nb-honest">
                        <h2>${t('home_honest')}</h2>
                        <p>${t('home_honest_body')}</p>
                    </section>

                    <section class="nb-section">
                        <h2 class="nb-section-title">${t('home_privacy_title')}</h2>
                        <ul class="nb-points">
                            ${renderPrivacyPoint('home_privacy_1', 'home_privacy_1_body')}
                            ${renderPrivacyPoint('home_privacy_2', 'home_privacy_2_body')}
                            ${renderPrivacyPoint('home_privacy_3', 'home_privacy_3_body')}
                        </ul>
                    </section>

                    <footer class="nb-foot">
                        <button type="button" class="nb-link" data-enter-app>${t('home_other_modes')}</button>
                        <span class="nb-foot-note">${t('home_footer')} · ${t('home_footer_note')}</span>
                    </footer>
                </div>
            </main>
        `;
    },

    mount({ root, router }) {
        try {
            stopCameraPreview();
        } catch (e) { /* no camera was open */ }
        document.body.classList.add('nb-body');

        // The demo line only moves while it is on screen, and not at all when
        // the device asks for reduced motion (handled in CSS).
        const wave = root.querySelector('[data-wave]');
        if (wave && 'IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => wave.classList.toggle('is-running', entry.isIntersecting));
            }, { threshold: 0.05 });
            observer.observe(wave);
            const onVisibility = () => { if (document.hidden) wave.classList.remove('is-running'); };
            document.addEventListener('visibilitychange', onVisibility);
            stopWave = () => {
                observer.disconnect();
                document.removeEventListener('visibilitychange', onVisibility);
            };
        } else if (wave) {
            wave.classList.add('is-running');
        }

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
        stopWave();
        stopWave = () => {};
        document.body.classList.remove('nb-body');
    }
};
