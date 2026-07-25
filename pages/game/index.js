import { getState, resetFlowState, setState } from '../../app/state.js';
import { t } from '../../app/i18n.js?v=2026-07-25-1';
import { logout } from '../../services/authService.js';
import { disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-07-25-1';
import { importGameRuntime } from '../../services/runtimeLoader.js?v=2026-07-25-1';

async function getRuntime() {
    return importGameRuntime('/pages/game/runtime.js');
}


export default {
    render() {
        const state = getState();
        return `
            <main class="page page-game">
                <!-- Both containers start in the same "hidden" pose that
                     setGamePresentationState('hidden') applies, so the very
                     first paint never flashes a raw scene/HUD frame. -->
                <div id="canvas-container" style="opacity: 0.14; filter: blur(8px) saturate(0.7); transform: scale(1.012);"></div>
                <div id="ui-container" style="opacity: 0; transform: translateY(10px); filter: blur(6px);">
                    <div id="portrait-warning">
                        <div class="warning-icon" aria-hidden="true">
                            <span class="warning-arc warning-arc-left"></span>
                            <span class="warning-arc warning-arc-right"></span>
                            <span class="warning-phone">
                                <span class="warning-speaker"></span>
                                <span class="warning-home"></span>
                            </span>
                        </div>
                        <h2>${t('game_rotate_title')}</h2>
                        <p>${t('game_rotate_desc')}</p>
                    </div>

                    <div id="manual-debug-panel" style="display: none;"></div>
                    <div id="fps-meter" style="display: none;">-- FPS</div>
                    <div id="user-info">${t('game_player')}：<span id="display-username">${state.currentUser || '-'}</span></div>

                    <div id="top-bar">
                        <div class="top-buttons">
                            <button id="btn-back-home-game" data-i18n="back_home">${t('back_home')}</button>
                            <button id="btn-logout" data-i18n="logout">${t('auth_logout')}</button>
                            <button id="game-settings-btn" type="button" aria-label="${t('settings_quality')}">⚙</button>
                        </div>
                    </div>

                    <div id="game-settings-panel" style="display: none;">
                        <div class="settings-group">
                            <div class="settings-label">${t('settings_quality')}</div>
                            <div class="settings-options">
                                <button type="button" data-quality="auto">${t('quality_auto')}</button>
                                <button type="button" data-quality="0">${t('quality_high')}</button>
                                <button type="button" data-quality="1">${t('quality_medium')}</button>
                                <button type="button" data-quality="2">${t('quality_low')}</button>
                                <button type="button" data-quality="3">${t('quality_lowest')}</button>
                            </div>
                        </div>
                        <div class="settings-group" data-settings-group="camera">
                            <div class="settings-label">${t('settings_camera')}</div>
                            <div class="settings-options">
                                <button type="button" data-camera="0.85">${t('camera_near')}</button>
                                <button type="button" data-camera="1">${t('camera_standard')}</button>
                                <button type="button" data-camera="1.2">${t('camera_far')}</button>
                            </div>
                        </div>
                        <div class="settings-group" data-settings-group="audio">
                            <div class="settings-label">${t('settings_audio')}</div>
                            <div class="settings-slider-row">
                                <span class="settings-slider-name">${t('settings_bgm')}</span>
                                <input type="range" id="setting-bgm-volume" min="0" max="100" step="5" value="100" aria-label="${t('settings_bgm')}">
                                <span class="settings-slider-value" id="setting-bgm-value">100%</span>
                            </div>
                            <div class="settings-slider-row">
                                <span class="settings-slider-name">${t('settings_sfx')}</span>
                                <input type="range" id="setting-sfx-volume" min="0" max="100" step="5" value="100" aria-label="${t('settings_sfx')}">
                                <span class="settings-slider-value" id="setting-sfx-value">100%</span>
                            </div>
                        </div>
                        <div class="settings-group">
                            <div class="settings-label">${t('settings_display')}</div>
                            <div class="settings-options">
                                <button type="button" id="fullscreen-toggle">${t('fullscreen_enter')}</button>
                            </div>
                        </div>
                        <div class="settings-note">${t('settings_paused_note')} ${t('settings_auto_note')}</div>
                    </div>

                    <!-- Study Mode reader (D3): right-hand frosted panel. All
                         text is runtime-driven from studyMaterials.js and
                         rendered as notes-style blocks (see paintStudyPage). -->
                    <div id="study-reader" style="display: none;">
                        <div class="study-reader-head">
                            <span id="study-reader-subject" class="study-reader-chip"></span>
                            <span id="study-reader-progress" class="study-reader-chip subtle"></span>
                        </div>
                        <div class="study-reader-timer">
                            <div id="study-page-timer-label" class="study-reader-timer-label"></div>
                            <div id="study-page-timer-value">03:00</div>
                        </div>
                        <div class="study-reader-titles">
                            <div id="study-reader-topic" class="study-reader-topic"></div>
                            <h3 id="study-reader-title"></h3>
                        </div>
                        <div id="study-reader-body"></div>
                        <div class="study-reader-actions">
                            <button type="button" id="study-next-btn"></button>
                            <div id="study-quiz-note" style="display: none;"></div>
                        </div>
                    </div>

                    <div id="focus-indicator">
                        <div id="mode-status-card">
                            <div class="status-chip-row">
                                <span id="mode-badge" class="status-chip neutral">Idle</span>
                                <span id="device-badge" class="status-chip neutral">Waiting</span>
                                <span id="eeg-signal-chip" class="eeg-signal-chip" style="display: none;"></span>
                            </div>
                            <div id="mode-status-title">Choose mode</div>
                            <div id="mode-status-detail">Real or simulation</div>
                        </div>

                        <div id="eeg-dual-axis" style="display: none;">
                            <div class="eeg-axis-row">
                                <span class="eeg-axis-label">${t('eeg_focus_axis')}</span>
                                <div class="eeg-axis-track"><div id="eeg-attention-bar" class="eeg-axis-fill focus"></div></div>
                            </div>
                            <div class="eeg-axis-row">
                                <span class="eeg-axis-label">${t('eeg_relax_axis')}</span>
                                <div class="eeg-axis-track"><div id="eeg-meditation-bar" class="eeg-axis-fill relax"></div></div>
                            </div>
                        </div>

                        <div class="label">
                                <span data-i18n="focus_level">Focus</span>
                            <span id="focus-zone-chip" class="zone-stable" style="display: none;"></span>
                            <span id="focus-value">--</span>
                        </div>
                        <div class="bar-container">
                            <div id="focus-bar" style="width: 0%"></div>
                        </div>

                        <div id="speed-display">
                            <div class="label">
                                <span data-i18n="speed">Speed</span>
                                <span id="speed-value">0 km/h</span>
                            </div>
                            <div class="bar-container speed-bar-container">
                                <div id="speed-bar"></div>
                            </div>
                        </div>

                        <div id="simulation-hint-eeg" data-i18n="eeg_simulation_hint">Waiting for mode</div>

                        <div id="distance-display">
                            <div class="label">
                                <span data-i18n="distance">Distance</span>
                                <span id="distance-value">0.0 m</span>
                            </div>
                        </div>

                    </div>

                    <div id="onboarding-cue" style="display: none;">
                        <span id="onboarding-cue-text"></span>
                    </div>

                    <div id="boost-flash" style="display: none;">
                        <span id="boost-flash-text"></span>
                    </div>

                    <div id="star-banner" style="display: none;">
                        <span id="star-banner-text"></span>
                    </div>

                    <div id="checkpoint-banner" style="display: none;">
                        <span id="checkpoint-banner-text"></span>
                    </div>

                    <div id="flow-ring" style="display: none;" aria-label="flow charge">
                        <svg viewBox="0 0 64 64" class="flow-ring-svg" aria-hidden="true">
                            <circle class="flow-ring-track" cx="32" cy="32" r="26"></circle>
                            <circle id="flow-ring-fill" class="flow-ring-fill" cx="32" cy="32" r="26"></circle>
                        </svg>
                        <div class="flow-ring-center">
                            <span class="flow-ring-star" aria-hidden="true">⭐</span>
                            <span id="flow-ring-stars">0</span>
                        </div>
                    </div>

                    <div id="voyage-card" style="display: none;" aria-label="voyage map">
                        <div class="voyage-card-head">
                            <span class="voyage-card-title" data-i18n="voyage_title">${t('voyage_title')}</span>
                            <span id="voyage-count">⚓ 0</span>
                        </div>
                        <svg id="voyage-map" viewBox="0 0 220 84" aria-hidden="true">
                            <path id="voyage-route" d="M10,42 L210,42" />
                            <g id="voyage-dot-prev" class="voyage-dot" style="display: none;">
                                <circle r="5.5"></circle>
                                <text y="-10"></text>
                            </g>
                            <g id="voyage-dot-next" class="voyage-dot" style="display: none;">
                                <circle r="5.5"></circle>
                                <text y="-10"></text>
                            </g>
                            <g id="voyage-dot-after" class="voyage-dot" style="display: none;">
                                <circle r="5.5"></circle>
                                <text y="-10"></text>
                            </g>
                            <circle id="voyage-boat" r="4.6"></circle>
                        </svg>
                        <div id="voyage-next"></div>
                        <div id="voyage-log-line" style="display: none;"></div>
                    </div>

                    <div id="play-time-display">
                        <span id="play-time-value">00:00</span>
                    </div>

                    <div id="training-countdown-display" style="display: none;">
                        <div class="training-countdown-label">${t('game_training_countdown')}</div>
                        <div id="training-countdown-value">03:00</div>
                    </div>

                    <div id="question-panel" style="display: none;">
                        <div class="hologram"></div>
                        <div class="header" id="question-header">${t('game_question_title')}</div>
                        <div class="meta-row">
                            <span id="question-skill-chip" class="question-meta-chip">Logic</span>
                            <span id="question-band-chip" class="question-meta-chip">Ages 11-13</span>
                        </div>
                        <div class="content" id="question-text">${t('game_loading_text')}</div>
                        <div class="options" id="question-options"></div>
                        <div class="timer" id="question-timer"></div>
                    </div>

                    <div id="score-display">
                        <span id="score-text">0/10</span>
                    </div>

                    <div id="streak-display">
                        <div id="streak-count">x0</div>
                        <div id="streak-label">COMBO</div>
                    </div>
                </div>
            </main>
        `;
    },

    async mount({ root, router }) {
        const state = getState();
        if (!state.currentUser || !state.difficulty) {
            router.navigate('setup');
            return;
        }

        // Cover the screen SYNCHRONOUSLY, before the first await below yields
        // to the browser — otherwise the raw HUD paints for a frame or two.
        // Transition is suppressed for this one show so the cover is instant
        // (the runtime's normal fade-out on ready is untouched).
        const loader = document.getElementById('transition-loader');
        if (loader) {
            const textEl = loader.querySelector('.loading-text');
            if (textEl) textEl.textContent = t('loader_preparing');
            loader.style.transition = 'none';
            loader.style.display = 'flex';
            loader.style.opacity = '1';
            requestAnimationFrame(() => { loader.style.transition = ''; });
        }

        const runtime = await getRuntime();
        await syncRuntimeState({
            user: state.currentUser,
            lang: state.lang,
            difficulty: state.difficulty,
            inputMode: state.inputMode,
            focusSource: state.focusSource,
            cameraConsent: state.cameraConsent,
            testMode: state.testMode,
            trainingDurationSec: state.trainingDurationSec,
            studySubject: state.studySubject,
            studyDepth: state.studyDepth,
            onResults: () => router.navigate('results')
        });
        runtime.switchLanguage(state.lang);
        runtime.startGameSession();

        // In-game settings: quality rung (or auto), camera distance, volumes,
        // fullscreen. Opening the panel pauses the session through the same
        // pipeline as question-wait/portrait pauses; closing resumes it.
        const settingsBtn = root.querySelector('#game-settings-btn');
        const settingsPanel = root.querySelector('#game-settings-panel');
        const bgmSlider = root.querySelector('#setting-bgm-volume');
        const sfxSlider = root.querySelector('#setting-sfx-volume');
        const bgmValue = root.querySelector('#setting-bgm-value');
        const sfxValue = root.querySelector('#setting-sfx-value');
        const fullscreenBtn = root.querySelector('#fullscreen-toggle');
        const refreshSettingsUI = () => {
            const s = runtime.getQualitySettings();
            root.querySelectorAll('[data-quality]').forEach((b) => {
                b.classList.toggle('is-active', String(s.mode) === b.dataset.quality);
            });
            root.querySelectorAll('[data-camera]').forEach((b) => {
                b.classList.toggle('is-active', Number(b.dataset.camera) === s.cameraScale);
            });
            if (bgmSlider) { bgmSlider.value = s.bgmVolume; if (bgmValue) bgmValue.textContent = `${s.bgmVolume}%`; }
            if (sfxSlider) { sfxSlider.value = s.sfxVolume; if (sfxValue) sfxValue.textContent = `${s.sfxVolume}%`; }
            if (fullscreenBtn) {
                fullscreenBtn.textContent = document.fullscreenElement ? t('fullscreen_exit') : t('fullscreen_enter');
            }
        };
        if (settingsBtn && settingsPanel) {
            const setPanelOpen = (open) => {
                settingsPanel.style.display = open ? 'block' : 'none';
                runtime.setSettingsPause(open);
                if (open) refreshSettingsUI();
            };
            settingsBtn.addEventListener('click', () => {
                setPanelOpen(settingsPanel.style.display === 'none');
            });
            settingsPanel.addEventListener('click', (event) => {
                const q = event.target.closest('[data-quality]');
                if (q) {
                    runtime.setQualityMode(q.dataset.quality === 'auto' ? 'auto' : Number(q.dataset.quality));
                    refreshSettingsUI();
                    return;
                }
                const c = event.target.closest('[data-camera]');
                if (c) {
                    runtime.setCameraDistanceScale(Number(c.dataset.camera));
                    refreshSettingsUI();
                }
            });
            bgmSlider?.addEventListener('input', () => {
                runtime.setBgmVolume(Number(bgmSlider.value));
                if (bgmValue) bgmValue.textContent = `${bgmSlider.value}%`;
            });
            sfxSlider?.addEventListener('input', () => {
                runtime.setSfxVolume(Number(sfxSlider.value));
                if (sfxValue) sfxValue.textContent = `${sfxSlider.value}%`;
            });
            if (fullscreenBtn) {
                if (!document.documentElement.requestFullscreen) {
                    fullscreenBtn.closest('.settings-group')?.style.setProperty('display', 'none');
                } else {
                    fullscreenBtn.addEventListener('click', async () => {
                        try {
                            if (document.fullscreenElement) await document.exitFullscreen();
                            else await document.documentElement.requestFullscreen();
                        } catch (e) {
                            console.warn('Fullscreen toggle failed:', e);
                        }
                    });
                    document.addEventListener('fullscreenchange', refreshSettingsUI);
                }
            }
        }

        const homeButton = root.querySelector('#btn-back-home-game');
        if (homeButton) {
            homeButton.addEventListener('click', async () => {
                const confirmed = window.confirm(t('game_home_confirm'));
                if (!confirmed) return;
                await runtime.disposeGameSession();
                await disposeMode();
                resetFlowState();
                router.navigate('home');
            });
        }

        const logoutButton = root.querySelector('#btn-logout');
        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                const confirmed = window.confirm(t('game_logout_confirm'));
                if (!confirmed) return;
                await runtime.disposeGameSession();
                await disposeMode();
                logout();
                setState({ currentUser: null });
                resetFlowState();
                router.navigate('home');
            });
        }
    },

    async unmount() {
        try {
            const runtime = await getRuntime();
            runtime.disposeGameSession();
        } catch (error) {
            console.warn('Unable to dispose game session cleanly.', error);
        }
    }
};
