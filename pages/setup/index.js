import { renderControlBar, bindControlBar } from '../../components/controlBar.js?v=2026-06-24-21';
import { t } from '../../app/i18n.js?v=2026-06-24-21';
import { getState, setState } from '../../app/state.js';
import { activateEEGMode, activateSimulationMode, disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-06-24-21';
import { attachCameraPreview, detachCameraPreview, requestCameraPreview, stopCameraPreview } from '../../services/focusInputService.js?v=2026-06-24-23';

function renderModeStep() {
    return `
        <div class="setup-card">
            <h2>${t('setup_mode_title')}</h2>
            <p>${t('setup_mode_desc')}</p>
            <div class="setup-option-grid">
                <button type="button" class="option-card option-danger" data-mode="eeg">
                    <strong>${t('setup_mode_eeg')}</strong>
                    <span>${t('setup_mode_eeg_desc')}</span>
                </button>
                <button type="button" class="option-card option-safe" data-mode="simulation">
                    <strong>${t('setup_mode_sim')}</strong>
                    <span>${t('setup_mode_sim_desc')}</span>
                </button>
            </div>
            <div class="mode-helper-card">
                <div id="mode-selection-helper-title" class="mode-helper-title">${t('setup_helper_title')}</div>
                <div id="mode-selection-helper-detail" class="mode-helper-detail">${t('setup_helper_desc')}</div>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="secondary-btn" data-back-auth>${t('setup_back')}</button>
            </div>
        </div>
    `;
}

function renderDifficultyStep(state) {
    const sourceLabel = state.inputMode === 'simulation'
        ? (state.focusSource === 'camera-ready' ? t('setup_source_camera_ready') : t('setup_source_fallback'))
        : t('setup_mode_eeg');

    return `
        <div class="setup-card">
            <h2>${t('setup_diff_title')}</h2>
            <p>${t('setup_current_mode')}：<strong>${state.inputMode === 'eeg' ? t('setup_mode_eeg') : t('setup_mode_sim')}</strong></p>
            <p>${t('setup_source_label')}：<strong>${sourceLabel}</strong></p>
            <div class="difficulty-list">
                <button type="button" class="difficulty-btn diff-easy" data-difficulty="easy">${t('setup_diff_easy')}</button>
                <button type="button" class="difficulty-btn diff-medium" data-difficulty="medium">${t('setup_diff_medium')}</button>
                <button type="button" class="difficulty-btn diff-hard" data-difficulty="hard">${t('setup_diff_hard')}</button>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="secondary-btn" data-back-mode>${t('setup_back')}</button>
            </div>
        </div>
    `;
}

function renderCameraStep(state) {
    const isGranted = state.cameraConsent === 'granted';
    const isDenied = state.cameraConsent === 'denied';
    const isError = state.cameraConsent === 'error';
    const overlayTitle = isGranted
        ? t('setup_camera_ready')
        : t('setup_camera_not_allowed');
    const overlayBody = isGranted
        ? t('setup_camera_ready_desc')
        : (isError ? t('setup_camera_error') : t('setup_camera_denied_desc'));
    const sourceLabel = state.focusSource === 'camera-ready'
        ? t('setup_source_camera_ready')
        : t('setup_source_fallback');

    return `
        <div class="setup-card">
            <h2>${t('setup_camera_title')}</h2>
            <p>${t('setup_camera_desc')}</p>
            <div class="camera-consent-shell">
                <div class="camera-consent-panel ${isGranted ? 'is-live' : 'is-blocked'}">
                    <div class="camera-consent-header">
                        <span class="camera-pill">${t('setup_camera_panel_title')}</span>
                        <span class="camera-pill subtle">${sourceLabel}</span>
                    </div>
                    <div class="camera-preview-frame ${isDenied || isError ? 'is-denied' : ''}">
                        <video id="camera-preview-video" class="camera-preview-video" autoplay muted playsinline></video>
                        <div class="camera-preview-overlay ${isGranted ? 'is-hidden' : ''}">
                            <div class="camera-liquid-glass"></div>
                            <div class="camera-overlay-copy">
                                <strong>${overlayTitle}</strong>
                                <span>${overlayBody}</span>
                            </div>
                        </div>
                    </div>
                    <div class="camera-consent-copy">
                        <div class="camera-consent-caption">${t('setup_camera_local_only')}</div>
                        <div class="camera-consent-detail">${t('setup_camera_panel_desc')}</div>
                    </div>
                </div>
            </div>
            <div class="setup-footer-actions camera-actions">
                ${isGranted ? `
                    <button type="button" class="primary-btn" data-camera-continue>${t('setup_camera_continue')}</button>
                    <button type="button" class="secondary-btn" data-camera-turn-off>${t('setup_camera_turn_off')}</button>
                    <button type="button" class="secondary-btn" data-back-mode>${t('setup_back')}</button>
                ` : `
                    <button type="button" class="primary-btn" data-camera-allow>${isError || isDenied ? t('setup_camera_retry') : t('setup_camera_allow')}</button>
                    <button type="button" class="secondary-btn" data-camera-deny>${t('setup_camera_deny')}</button>
                    <button type="button" class="secondary-btn" data-back-mode>${t('setup_back')}</button>
                `}
            </div>
        </div>
    `;
}

export default {
    render() {
        const state = getState();
        return `
            <main class="page page-setup">
                <section class="page-shell narrow-shell setup-layout setup-layout-compact">
                    <div class="setup-panel setup-panel-compact">
                        <header class="page-header">
                            <div>
                                <span class="eyebrow">Setup</span>
                                <h1>${t('setup_title')}</h1>
                                <p class="page-support">${t('game_player')}：${state.currentUser || '-'}</p>
                            </div>
                            ${renderControlBar()}
                        </header>
                        <div class="setup-flow-inline">
                            <span>01 ${t('setup_flow_mode')}</span>
                            <span>02 ${t('setup_flow_camera')}</span>
                            <span>03 ${t('setup_flow_diff')}</span>
                            <span>04 ${t('setup_flow_enter')}</span>
                        </div>
                        ${state.setupStep === 'difficulty'
                            ? renderDifficultyStep(state)
                            : state.setupStep === 'camera'
                                ? renderCameraStep(state)
                                : renderModeStep()}
                    </div>
                </section>
            </main>
        `;
    },

    async mount({ root, router }) {
        const state = getState();
        if (!state.currentUser) {
            router.navigate('auth');
            return;
        }

        bindControlBar(root, { refresh: router.refresh });
        await syncRuntimeState({
            user: state.currentUser,
            lang: state.lang,
            difficulty: state.difficulty,
            inputMode: state.inputMode,
            focusSource: state.focusSource,
            cameraConsent: state.cameraConsent
        });

        const backAuth = root.querySelector('[data-back-auth]');
        if (backAuth) {
            backAuth.addEventListener('click', async () => {
                stopCameraPreview();
                await disposeMode();
                setState({
                    setupStep: 'mode',
                    inputMode: 'idle',
                    cameraConsent: 'unknown',
                    focusSource: 'simulation-fallback'
                });
                router.navigate('auth');
            });
        }

        const backMode = root.querySelector('[data-back-mode]');
        if (backMode) {
            backMode.addEventListener('click', async () => {
                stopCameraPreview();
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: null,
                    inputMode: 'idle',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'unknown'
                });
                setState({
                    setupStep: 'mode',
                    difficulty: null,
                    inputMode: 'idle',
                    cameraConsent: 'unknown',
                    focusSource: 'simulation-fallback'
                });
                router.refresh();
            });
        }

        root.querySelectorAll('[data-mode]').forEach((button) => {
            button.addEventListener('click', async () => {
                const mode = button.dataset.mode;
                const message = root.querySelector('#mode-selection-helper-detail');
                const title = root.querySelector('#mode-selection-helper-title');

                button.disabled = true;

                try {
                    if (mode === 'eeg') {
                        const confirmed = window.confirm(t('setup_confirm_eeg'));
                        if (!confirmed) {
                            button.disabled = false;
                            return;
                        }
                        if (title) title.textContent = t('setup_eeg_armed');
                        if (message) message.textContent = t('setup_eeg_searching');
                        const connected = await activateEEGMode();
                        if (!connected) {
                            if (message) message.textContent = t('setup_eeg_unavailable');
                            button.disabled = false;
                            return;
                        }
                        setState({
                            inputMode: 'eeg',
                            setupStep: 'difficulty',
                            focusSource: 'eeg',
                            cameraConsent: 'unknown'
                        });
                    } else {
                        stopCameraPreview();
                        await syncRuntimeState({
                            user: getState().currentUser,
                            lang: getState().lang,
                            difficulty: null,
                            inputMode: 'simulation',
                            focusSource: 'simulation-fallback',
                            cameraConsent: 'prompt'
                        });
                        setState({
                            inputMode: 'simulation',
                            setupStep: 'camera',
                            focusSource: 'simulation-fallback',
                            cameraConsent: 'prompt'
                        });
                    }
                    router.refresh();
                } catch (error) {
                    if (message) message.textContent = error.message || String(error);
                    button.disabled = false;
                }
            });
        });

        const previewVideo = root.querySelector('#camera-preview-video');
        if (previewVideo && state.cameraConsent === 'granted') {
            if (!attachCameraPreview(previewVideo)) {
                try {
                    await requestCameraPreview(previewVideo);
                } catch (error) {
                    setState({
                        cameraConsent: 'error',
                        focusSource: 'simulation-fallback'
                    });
                    router.refresh();
                    return;
                }
            }
        }

        const allowCameraBtn = root.querySelector('[data-camera-allow]');
        if (allowCameraBtn) {
            allowCameraBtn.addEventListener('click', async () => {
                try {
                    await requestCameraPreview(previewVideo);
                    await syncRuntimeState({
                        user: getState().currentUser,
                        lang: getState().lang,
                        difficulty: getState().difficulty,
                        inputMode: 'simulation',
                        focusSource: 'camera-ready',
                        cameraConsent: 'granted'
                    });
                    setState({
                        cameraConsent: 'granted',
                        focusSource: 'camera-ready'
                    });
                } catch (error) {
                    stopCameraPreview();
                    await syncRuntimeState({
                        user: getState().currentUser,
                        lang: getState().lang,
                        difficulty: getState().difficulty,
                        inputMode: 'simulation',
                        focusSource: 'simulation-fallback',
                        cameraConsent: 'error'
                    });
                    setState({
                        cameraConsent: 'error',
                        focusSource: 'simulation-fallback'
                    });
                }
                router.refresh();
            });
        }

        const denyCameraBtn = root.querySelector('[data-camera-deny]');
        if (denyCameraBtn) {
            denyCameraBtn.addEventListener('click', async () => {
                stopCameraPreview();
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: getState().difficulty,
                    inputMode: 'simulation',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'denied'
                });
                setState({
                    cameraConsent: 'denied',
                    focusSource: 'simulation-fallback',
                    setupStep: 'difficulty'
                });
                router.refresh();
            });
        }

        const cameraContinueBtn = root.querySelector('[data-camera-continue]');
        if (cameraContinueBtn) {
            cameraContinueBtn.addEventListener('click', async () => {
                setState({ setupStep: 'difficulty' });
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: null,
                    inputMode: 'simulation',
                    focusSource: getState().focusSource,
                    cameraConsent: getState().cameraConsent
                });
                router.refresh();
            });
        }

        const cameraTurnOffBtn = root.querySelector('[data-camera-turn-off]');
        if (cameraTurnOffBtn) {
            cameraTurnOffBtn.addEventListener('click', async () => {
                stopCameraPreview();
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: getState().difficulty,
                    inputMode: 'simulation',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'denied'
                });
                setState({
                    cameraConsent: 'denied',
                    focusSource: 'simulation-fallback'
                });
                router.refresh();
            });
        }

        root.querySelectorAll('[data-difficulty]').forEach((button) => {
            button.addEventListener('click', async () => {
                const difficulty = button.dataset.difficulty;
                setState({ difficulty });
                if (getState().inputMode === 'simulation') {
                    await activateSimulationMode();
                }
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty,
                    inputMode: getState().inputMode,
                    focusSource: getState().focusSource,
                    cameraConsent: getState().cameraConsent
                });
                router.navigate('game');
            });
        });
    },

    unmount() {
        const previewVideo = document.getElementById('camera-preview-video');
        detachCameraPreview(previewVideo);
    }
};
