import { getState, resetFlowState, setState } from '../../app/state.js';
import { t } from '../../app/i18n.js?v=2026-06-24-21';
import { logout } from '../../services/authService.js';
import { disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-06-24-21';
import { importGameRuntime } from '../../services/runtimeLoader.js?v=2026-06-24-21';

async function getRuntime() {
    return importGameRuntime('/pages/game/runtime.js');
}

// #region debug-point C:game-page-report
const DEBUG_SERVER_URL = window.__TRAE_DEBUG_SERVER_URL__ || null;
const reportGamePageDebug = (hypothesisId, msg, data = {}) => {
    if (!DEBUG_SERVER_URL || DEBUG_SERVER_URL.includes('127.0.0.1:7777')) return Promise.resolve();
    return fetch(DEBUG_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'stitch-layout-game-render', runId: 'post-fix', hypothesisId, location: 'pages/game/index.js', msg: `[DEBUG] ${msg}`, data, ts: Date.now() })
    }).catch(() => {});
};
// #endregion

export default {
    render() {
        const state = getState();
        return `
            <main class="page page-game">
                <div id="canvas-container"></div>
                <div id="ui-container">
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

                        <div id="gate-counter" style="display: none;">
                            <div class="label">
                                <span>🎯 <span data-i18n="gate_label">Gates</span></span>
                                <span id="gate-counter-value">0/0</span>
                            </div>
                        </div>
                    </div>

                    <div id="onboarding-cue" style="display: none;">
                        <span id="onboarding-cue-text"></span>
                    </div>

                    <div id="boost-flash" style="display: none;">
                        <span id="boost-flash-text"></span>
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
        // #region debug-point C:game-mount-entry
        reportGamePageDebug('C', 'game page mount entry', {
            currentUser: state.currentUser,
            difficulty: state.difficulty,
            hasCanvasContainer: Boolean(root.querySelector('#canvas-container')),
            hasUiContainer: Boolean(root.querySelector('#ui-container')),
            canvasContainerRect: root.querySelector('#canvas-container')?.getBoundingClientRect?.() || null
        });
        // #endregion
        if (!state.currentUser || !state.difficulty) {
            router.navigate('setup');
            return;
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
            onResults: () => router.navigate('results')
        });
        runtime.switchLanguage(state.lang);
        // #region debug-point C:game-runtime-ready
        reportGamePageDebug('C', 'game runtime imported and configured', {
            selectedRoute: state.route,
            lang: state.lang,
            canvasChildrenBeforeStart: root.querySelector('#canvas-container')?.childElementCount || 0
        });
        // #endregion
        runtime.startGameSession();

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
            // #region debug-point D:game-unmount
            reportGamePageDebug('D', 'game page unmount', {});
            // #endregion
            const runtime = await getRuntime();
            runtime.disposeGameSession();
        } catch (error) {
            console.warn('Unable to dispose game session cleanly.', error);
        }
    }
};
