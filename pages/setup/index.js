import { t } from '../../app/i18n.js?v=2026-07-28-2';
import { getState, setState } from '../../app/state.js';
import { activateEEGMode, activateSimulationMode, disposeMode, isEegStation, syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-07-28-2';
import { attachCameraPreview, detachCameraPreview, requestCameraPreview, stopCameraPreview } from '../../services/focusInputService.js?v=2026-07-28-2';
import { resetAllData, deleteAccountData } from '../../services/storageService.js';
import { clearLabData } from '../lab/labStore.js?v=2026-07-28-2';
import { backdropHTML, bindThemeToggle, startReveals, themeToggleHTML } from '../../components/motion.js?v=2026-07-28-2';

// Experiment mode (TALE 2026): 'lab' = full test, 'quick' = one-minute try-out.
// Both skip the goal / difficulty / duration steps: once the signal source is
// settled they go straight into the test.
function isLabFlow(state = getState()) {
    return state.testMode === 'lab' || state.testMode === 'quick';
}

// Study Mode is live (D3 complete, 2026-07-16). The card is fully enterable;
// only the extra subjects (Chemistry/Physics/History) stay locked until their
// materials exist. Set localStorage 'nf_study_lock' = '1' to hide it again
// (e.g. if a clean competition build is ever wanted).
function isStudyModeUnlocked() {
    try {
        return localStorage.getItem('nf_study_lock') !== '1';
    } catch (e) {
        return true;
    }
}

function renderTestStep(state) {
    const studyLocked = !isStudyModeUnlocked();
    return `
        <div class="setup-card">
            <h2>${t('setup_test_title')}</h2>
            <p>${t('setup_test_desc')}</p>
            <div class="setup-option-grid">
                <button type="button" class="option-card option-safe" data-test-mode="training">
                    <strong>${t('setup_test_training')}</strong>
                    <span>${t('setup_test_training_desc')}</span>
                </button>
                <button type="button" class="option-card option-danger" data-test-mode="challenge">
                    <strong>${t('setup_test_challenge')}</strong>
                    <span>${t('setup_test_challenge_desc')}</span>
                </button>
                <button type="button" class="option-card option-study ${studyLocked ? 'is-locked' : ''}" data-test-mode="study" ${studyLocked ? 'disabled aria-disabled="true"' : ''}>
                    ${studyLocked ? `<span class="option-card-badge">${t('setup_test_study_locked')}</span>` : ''}
                    <strong>${t('setup_test_study')}</strong>
                    <span>${t('setup_test_study_desc')}</span>
                </button>
            </div>
            <div class="mode-helper-card">
                <div class="mode-helper-title">${t('setup_test_helper_title')}</div>
                <div class="mode-helper-detail">${t('setup_test_helper_desc')}</div>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="secondary-btn" data-back-auth>${t('setup_back')}</button>
            </div>
        </div>
    `;
}

function renderSubjectStep() {
    return `
        <div class="setup-card">
            <h2>${t('setup_subject_title')}</h2>
            <p>${t('setup_subject_desc')}</p>
            <div class="setup-option-grid subject-grid">
                <button type="button" class="option-card option-safe" data-subject="biology">
                    <strong>${t('setup_subject_biology')}</strong>
                    <span>${t('setup_subject_biology_desc')}</span>
                </button>
                <button type="button" class="option-card option-study is-locked" disabled aria-disabled="true">
                    <span class="option-card-badge">${t('setup_subject_locked_badge')}</span>
                    <strong>${t('setup_subject_chemistry')}</strong>
                </button>
                <button type="button" class="option-card option-study is-locked" disabled aria-disabled="true">
                    <span class="option-card-badge">${t('setup_subject_locked_badge')}</span>
                    <strong>${t('setup_subject_physics')}</strong>
                </button>
                <button type="button" class="option-card option-study is-locked" disabled aria-disabled="true">
                    <span class="option-card-badge">${t('setup_subject_locked_badge')}</span>
                    <strong>${t('setup_subject_history')}</strong>
                </button>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="secondary-btn" data-back-test-step>${t('setup_back')}</button>
            </div>
        </div>
    `;
}

function renderDepthStep() {
    return `
        <div class="setup-card">
            <h2>${t('setup_depth_title')}</h2>
            <p>${t('setup_depth_desc')}</p>
            <div class="setup-option-grid">
                <button type="button" class="option-card option-safe" data-depth="foundation">
                    <strong>${t('setup_depth_foundation')}</strong>
                    <span>${t('setup_depth_foundation_desc')}</span>
                </button>
                <button type="button" class="option-card option-danger" data-depth="advanced">
                    <strong>${t('setup_depth_advanced')}</strong>
                    <span>${t('setup_depth_advanced_desc')}</span>
                </button>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="secondary-btn" data-back-subject>${t('setup_back')}</button>
            </div>
        </div>
    `;
}

function renderLabIntro(state) {
    const quick = state.testMode === 'quick';
    return `
        <div class="lab-brief" data-lab-brief="${quick ? 'quick' : 'full'}">
            <span class="lab-brief-kind">${t(quick ? 'setup_quick_title' : 'setup_lab_title')}</span>
            <span class="lab-brief-label">${t('setup_lab_question_label')}</span>
            <strong class="lab-brief-question">${t('lab_question')}</strong>
            <span class="lab-brief-desc">${t(quick ? 'setup_quick_desc' : 'setup_lab_desc')}</span>
            ${quick ? `<span class="lab-brief-tag">${t('lab_demo_tag')}</span>` : ''}
        </div>
    `;
}

function renderModeStep(state = getState()) {
    const lab = isLabFlow(state);
    return `
        <div class="setup-card">
            ${lab ? renderLabIntro(state) : ''}
            <h2>${lab ? t('setup_lab_source_title') : t('setup_mode_title')}</h2>
            <p>${lab ? t('setup_lab_source_desc') : t('setup_mode_desc')}</p>
            <div class="setup-option-grid">
                <button type="button" class="option-card option-danger" data-mode="eeg">
                    <strong>${t('setup_mode_eeg')}</strong>
                    <span>${t('setup_mode_eeg_desc')}</span>
                </button>
                <button type="button" class="option-card option-safe" data-mode="simulation">
                    <strong>${t('setup_mode_sim')}</strong>
                    <span>${t('setup_mode_sim_desc')}</span>
                </button>
                ${lab ? `
                <button type="button" class="option-card option-study" data-lab-demo>
                    <strong>${t('setup_mode_demo')}</strong>
                    <span>${t('setup_mode_demo_desc')}</span>
                </button>` : ''}
            </div>
            <div class="mode-helper-card">
                <div id="mode-selection-helper-title" class="mode-helper-title">${t('setup_helper_title')}</div>
                <div id="mode-selection-helper-detail" class="mode-helper-detail">${t('setup_helper_desc')}</div>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="secondary-btn" data-back-test>${t('setup_back')}</button>
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
            <p>${t('setup_current_mode')}${t('colon')}<strong>${state.inputMode === 'eeg' ? t('setup_mode_eeg') : t('setup_mode_sim')}</strong></p>
            <p>${t('setup_source_label')}${t('colon')}<strong>${sourceLabel}</strong></p>
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

// "30 s" / "30 秒", "3 min" / "3 分鐘": the unit follows the page language.
function formatTrainingDurationLabel(totalSeconds) {
    if (totalSeconds < 60) return t('setup_unit_seconds').replace('{n}', totalSeconds);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds === 0
        ? t('setup_unit_minutes').replace('{n}', minutes)
        : t('setup_unit_min_sec').replace('{m}', minutes).replace('{s}', seconds);
}

function getTrainingDurationPercent(totalSeconds) {
    const min = 30;
    const max = 1800;
    const clamped = Math.max(min, Math.min(max, Number(totalSeconds || 180)));
    return ((clamped - min) / (max - min)) * 100;
}

// Thumb is 28px (see the Apple slider in clay-liquid.css); its centre travels
// between 14px and (track - 14px), so marks/fill must be inset by the radius
// to line up with the handle instead of drifting toward the ends.
const THUMB_RADIUS_PX = 14;

function trackInsetPosition(totalSeconds) {
    const frac = getTrainingDurationPercent(totalSeconds) / 100;
    return `calc(${THUMB_RADIUS_PX}px + (100% - ${THUMB_RADIUS_PX * 2}px) * ${frac})`;
}

function renderTrainingScaleMark(label, totalSeconds) {
    return `<span class="training-duration-mark" style="left:${trackInsetPosition(totalSeconds)}">${label}</span>`;
}

function updateTrainingSliderUI(slider, valueEl) {
    if (!slider) return;
    const nextValue = Number(slider.value || 180);
    slider.style.setProperty('--training-progress', trackInsetPosition(nextValue));
    if (valueEl) {
        valueEl.textContent = formatTrainingDurationLabel(nextValue);
    }
}

function renderTrainingStep(state) {
    const totalSeconds = Math.max(30, Math.min(1800, Number(state.trainingDurationSec || 180)));
    return `
        <div class="setup-card">
            <h2>${t('setup_training_duration_title')}</h2>
            <p>${t('setup_training_duration_desc')}</p>
            <div class="mode-helper-card training-slider-card">
                <div class="mode-helper-title">${t('setup_training_duration_value')}</div>
                <div class="training-duration-value" id="training-duration-value">${formatTrainingDurationLabel(totalSeconds)}</div>
                <input
                    id="training-duration-slider"
                    class="training-duration-slider"
                    type="range"
                    min="30"
                    max="1800"
                    step="30"
                    value="${totalSeconds}"
                />
                <div class="training-duration-scale">
                    ${renderTrainingScaleMark(formatTrainingDurationLabel(30), 30)}
                    ${renderTrainingScaleMark(formatTrainingDurationLabel(300), 300)}
                    ${renderTrainingScaleMark(formatTrainingDurationLabel(900), 900)}
                    ${renderTrainingScaleMark(formatTrainingDurationLabel(1800), 1800)}
                </div>
            </div>
            <div class="setup-footer-actions">
                <button type="button" class="primary-btn" data-training-start>${t('setup_training_duration_start')}</button>
                <button type="button" class="secondary-btn" data-back-training>${t('setup_back')}</button>
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
            <main class="page page-setup nb-page">
                ${backdropHTML()}
                <section class="page-shell setup-layout setup-layout-compact">
                    <div class="setup-panel setup-panel-compact">
                        <header class="page-header setup-header">
                            <div>
                                <span class="eyebrow">${t('setup_eyebrow')}</span>
                                <h1>${t('setup_title')}</h1>
                                ${state.currentUser ? `<p class="page-support">${t('game_player')}${t('colon')}${state.currentUser}</p>` : ''}
                            </div>
                            <div class="setup-header-tools">
                            ${themeToggleHTML(t)}
                            <div class="setup-settings" ${state.currentUser ? '' : 'hidden'}>
                                <button type="button" class="setup-settings-btn" id="setup-settings-btn" aria-label="${t('setup_settings')}" aria-haspopup="true" aria-expanded="false">⚙</button>
                                <div class="setup-settings-menu" id="setup-settings-menu" style="display: none;">
                                    <div class="setup-settings-menu-title">${t('setup_data_menu_title')}</div>
                                    <button type="button" class="setup-settings-item" data-reset-data>
                                        <strong>${t('setup_reset_data')}</strong>
                                        <span>${t('setup_reset_data_desc')}</span>
                                    </button>
                                    <button type="button" class="setup-settings-item is-danger" data-delete-account>
                                        <strong>${t('setup_delete_account')}</strong>
                                        <span>${t('setup_delete_account_desc')}</span>
                                    </button>
                                </div>
                            </div>
                            </div>
                        </header>
                        ${state.setupStep === 'test'
                            ? renderTestStep(state)
                            : state.setupStep === 'subject'
                                ? renderSubjectStep()
                            : state.setupStep === 'depth'
                                ? renderDepthStep()
                            : state.setupStep === 'training'
                                ? renderTrainingStep(state)
                            : state.setupStep === 'difficulty'
                            ? renderDifficultyStep(state)
                            : state.setupStep === 'camera'
                                ? renderCameraStep(state)
                                : renderModeStep(state)}
                    </div>
                </section>
            </main>
        `;
    },

    async mount({ root, router }) {
        const state = getState();
        document.body.classList.add('nb-body');
        // Two columns: what this step is about (left) and the choices (right).
        // CSS stacks them on portrait screens and puts them side by side on
        // landscape ones, so the step fits one screen.
        const card = root.querySelector('.setup-card');
        if (card && !card.querySelector('.setup-col-intro')) {
            const intro = document.createElement('div');
            intro.className = 'setup-col-intro';
            const choices = document.createElement('div');
            choices.className = 'setup-col-panel';
            const header = root.querySelector('.setup-header');
            if (header) intro.appendChild(header);
            Array.from(card.children).forEach((el) => {
                const isIntro = el.matches('h2, p, .lab-brief, .mode-helper-card');
                (isIntro ? intro : choices).appendChild(el);
            });
            card.append(intro, choices);
        }
        root.querySelectorAll('.setup-col-intro > *, .setup-col-panel > *').forEach((el, i) => {
            el.setAttribute('data-reveal', '');
            el.style.setProperty('--d', `${Math.min(i, 6) * 60}ms`);
        });
        startReveals(root);
        bindThemeToggle(root, () => router.refresh());
        // The one-minute try-out is the only flow that needs no account.
        if (!state.currentUser && state.testMode !== 'quick') {
            router.navigate('auth');
            return;
        }

        // The click handlers below are attached only after the game engine has
        // loaded (the first visit can take a few seconds). Until then the
        // choices are held disabled, so an early click is never lost.
        const heldButtons = Array.from(root.querySelectorAll('.setup-card button:not([disabled])'));
        heldButtons.forEach((button) => { button.disabled = true; });
        root.querySelector('.setup-card')?.setAttribute('aria-busy', 'true');

        await syncRuntimeState({
            user: state.currentUser,
            lang: state.lang,
            difficulty: state.difficulty,
            inputMode: state.inputMode,
            focusSource: state.focusSource,
            cameraConsent: state.cameraConsent,
            testMode: state.testMode
        });

        // --- Top-right settings menu: reset data / delete account ---
        const settingsBtn = root.querySelector('#setup-settings-btn');
        const settingsMenu = root.querySelector('#setup-settings-menu');
        if (settingsBtn && settingsMenu) {
            const closeMenu = () => {
                settingsMenu.style.display = 'none';
                settingsBtn.setAttribute('aria-expanded', 'false');
            };
            settingsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const open = settingsMenu.style.display === 'none';
                settingsMenu.style.display = open ? 'block' : 'none';
                settingsBtn.setAttribute('aria-expanded', String(open));
            });
            // Click outside closes the menu.
            document.addEventListener('click', (e) => {
                if (!settingsMenu.contains(e.target) && e.target !== settingsBtn) closeMenu();
            });

            const resetBtn = root.querySelector('[data-reset-data]');
            resetBtn?.addEventListener('click', async () => {
                if (!window.confirm(t('setup_reset_data_confirm'))) return;
                resetBtn.disabled = true;
                const label = resetBtn.querySelector('strong');
                const orig = label ? label.textContent : '';
                if (label) label.textContent = t('setup_working');
                try { await resetAllData(); } catch (e) { /* best-effort */ }
                clearLabData(getState().currentUser);
                if (label) label.textContent = orig;
                resetBtn.disabled = false;
                closeMenu();
                window.alert(t('setup_reset_done'));
            });

            const deleteBtn = root.querySelector('[data-delete-account]');
            deleteBtn?.addEventListener('click', async () => {
                if (!window.confirm(t('setup_delete_account_confirm'))) return;
                deleteBtn.disabled = true;
                clearLabData(getState().currentUser);
                try { await deleteAccountData(); } catch (e) { /* best-effort */ }
                setState({ currentUser: null });
                window.alert(t('setup_delete_done'));
                router.navigate('home');
            });
        }

        const backAuth = root.querySelector('[data-back-auth]');
        if (backAuth) {
            backAuth.addEventListener('click', async () => {
                stopCameraPreview();
                await disposeMode();
                setState({
                    setupStep: 'test',
                    testMode: 'training',
                    trainingDurationSec: 180,
                    inputMode: 'idle',
                    cameraConsent: 'unknown',
                    focusSource: 'simulation-fallback'
                });
                router.navigate('auth');
            });
        }

        const backTest = root.querySelector('[data-back-test]');
        if (backTest) {
            backTest.addEventListener('click', async () => {
                stopCameraPreview();
                if (isLabFlow()) {
                    // The experiment is entered from Home, so "back" returns there.
                    await disposeMode();
                    setState({
                        setupStep: 'test',
                        testMode: 'training',
                        difficulty: null,
                        inputMode: 'idle',
                        cameraConsent: 'unknown',
                        focusSource: 'simulation-fallback'
                    });
                    router.navigate('home');
                    return;
                }
                const isStudy = getState().testMode === 'study';
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: isStudy ? 'study' : null,
                    inputMode: 'idle',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'unknown',
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                setState({
                    setupStep: isStudy ? 'depth' : 'test',
                    inputMode: 'idle',
                    difficulty: isStudy ? 'study' : null,
                    cameraConsent: 'unknown',
                    focusSource: 'simulation-fallback'
                });
                router.refresh();
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
                    cameraConsent: 'unknown',
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
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

        root.querySelectorAll('[data-test-mode]').forEach((button) => {
            button.addEventListener('click', async () => {
                if (button.disabled || button.classList.contains('is-locked')) return;
                const testMode = button.dataset.testMode;
                const initialDifficulty = testMode === 'training' ? 'training' : (testMode === 'study' ? 'study' : null);
                setState({
                    testMode,
                    environment: 'ocean',
                    setupStep: testMode === 'study' ? 'subject' : 'mode',
                    trainingDurationSec: 180,
                    difficulty: initialDifficulty,
                    inputMode: 'idle',
                    cameraConsent: 'unknown',
                    focusSource: 'simulation-fallback',
                    studySubject: null,
                    studyDepth: null
                });
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: initialDifficulty,
                    inputMode: 'idle',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'unknown',
                    testMode,
                    trainingDurationSec: 180
                });
                router.refresh();
            });
        });

        // Study Mode: subject -> depth -> signal source. The two extra steps
        // only exist for testMode 'study'; everything after reuses the shared
        // mode/camera steps.
        root.querySelectorAll('[data-subject]').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.disabled) return;
                setState({ studySubject: button.dataset.subject, setupStep: 'depth' });
                router.refresh();
            });
        });

        root.querySelectorAll('[data-depth]').forEach((button) => {
            button.addEventListener('click', async () => {
                setState({ studyDepth: button.dataset.depth, setupStep: 'mode' });
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: 'study',
                    inputMode: 'idle',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'unknown',
                    testMode: 'study',
                    studySubject: getState().studySubject,
                    studyDepth: getState().studyDepth
                });
                router.refresh();
            });
        });

        const backTestStep = root.querySelector('[data-back-test-step]');
        if (backTestStep) {
            backTestStep.addEventListener('click', () => {
                setState({ setupStep: 'test', studySubject: null, studyDepth: null });
                router.refresh();
            });
        }

        const backSubject = root.querySelector('[data-back-subject]');
        if (backSubject) {
            backSubject.addEventListener('click', () => {
                setState({ setupStep: 'subject', studyDepth: null });
                router.refresh();
            });
        }

        // Study Mode has no difficulty/duration step: once the signal source is
        // settled (EEG confirmed, or camera allowed/denied), it goes straight
        // into the reading session.
        const launchStudyGame = async () => {
            if (getState().inputMode === 'simulation') {
                await activateSimulationMode();
            }
            await syncRuntimeState({
                user: getState().currentUser,
                lang: getState().lang,
                difficulty: 'study',
                inputMode: getState().inputMode,
                focusSource: getState().focusSource,
                cameraConsent: getState().cameraConsent,
                testMode: 'study',
                trainingDurationSec: getState().trainingDurationSec,
                studySubject: getState().studySubject,
                studyDepth: getState().studyDepth
            });
            setState({ difficulty: 'study' });
            router.navigate('game');
        };

        // Experiment mode has no goal / difficulty / duration step either.
        const launchLabGame = async () => {
            await syncRuntimeState({
                user: getState().currentUser,
                lang: getState().lang,
                difficulty: 'lab',
                inputMode: getState().inputMode,
                focusSource: getState().focusSource,
                cameraConsent: getState().cameraConsent,
                testMode: getState().testMode
            });
            if (getState().inputMode === 'simulation') {
                await activateSimulationMode();
            }
            setState({ difficulty: 'lab' });
            router.navigate('game');
        };

        // Demo mode: the built-in curve, with no headband and no camera.
        const labDemoBtn = root.querySelector('[data-lab-demo]');
        if (labDemoBtn) {
            labDemoBtn.addEventListener('click', async () => {
                labDemoBtn.disabled = true;
                stopCameraPreview();
                setState({
                    inputMode: 'simulation',
                    focusSource: 'simulation-fallback',
                    cameraConsent: 'denied'
                });
                await launchLabGame();
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
                        // On a machine where the headset has already been
                        // confirmed working (the booth laptop), skip the
                        // confirmation: a refresh or a trip back to Home used to
                        // put this dialog in front of every visitor.
                        const confirmed = isEegStation() || window.confirm(t('setup_confirm_eeg'));
                        if (!confirmed) {
                            button.disabled = false;
                            return;
                        }
                        if (title) title.textContent = t('setup_eeg_armed');
                        if (message) message.textContent = t('setup_eeg_searching');
                        const eegResult = await activateEEGMode();
                        if (!eegResult?.ok) {
                            if (eegResult?.reason === 'no-live-data' || eegResult?.reason === 'bridge-unavailable') {
                                const skipNow = window.confirm(`${t('setup_eeg_skip_desc')}\n\n${t('setup_eeg_skip')}`);
                                if (skipNow) {
                                    setState({
                                        inputMode: 'eeg',
                                        setupStep: getState().testMode === 'challenge' ? 'difficulty' : 'training',
                                        focusSource: 'eeg',
                                        cameraConsent: 'unknown'
                                    });
                                    if (isLabFlow()) {
                                        await launchLabGame();
                                    } else if (getState().testMode === 'study') {
                                        await launchStudyGame();
                                    } else if (getState().testMode === 'challenge') {
                                        router.refresh();
                                    } else {
                                        await syncRuntimeState({
                                            user: getState().currentUser,
                                            lang: getState().lang,
                                            difficulty: 'training',
                                            inputMode: 'eeg',
                                            focusSource: 'eeg',
                                            cameraConsent: 'unknown',
                                            testMode: getState().testMode,
                                            trainingDurationSec: getState().trainingDurationSec
                                        });
                                        router.refresh();
                                    }
                                    return;
                                }
                            }
                            if (message) {
                                if (eegResult?.reason === 'no-live-data') {
                                    message.textContent = t('setup_eeg_no_live_data');
                                } else {
                                    message.textContent = t('setup_eeg_unavailable');
                                }
                            }
                            button.disabled = false;
                            return;
                        }
                        setState({
                            inputMode: 'eeg',
                            setupStep: getState().testMode === 'challenge' ? 'difficulty' : 'training',
                            focusSource: 'eeg',
                            cameraConsent: 'unknown'
                        });
                        if (isLabFlow()) {
                            await launchLabGame();
                            return;
                        }
                        if (getState().testMode === 'study') {
                            await launchStudyGame();
                            return;
                        }
                        if (getState().testMode === 'training') {
                            await syncRuntimeState({
                                user: getState().currentUser,
                                lang: getState().lang,
                                difficulty: 'training',
                                inputMode: 'eeg',
                                focusSource: 'eeg',
                                cameraConsent: 'unknown',
                                testMode: getState().testMode,
                                trainingDurationSec: getState().trainingDurationSec
                            });
                            router.refresh();
                            return;
                        }
                    } else {
                        stopCameraPreview();
                        await syncRuntimeState({
                            user: getState().currentUser,
                            lang: getState().lang,
                            difficulty: null,
                            inputMode: 'simulation',
                            focusSource: 'simulation-fallback',
                            cameraConsent: 'prompt',
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
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
                        cameraConsent: 'granted',
                        testMode: getState().testMode,
                        trainingDurationSec: getState().trainingDurationSec
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
                        cameraConsent: 'error',
                        testMode: getState().testMode,
                        trainingDurationSec: getState().trainingDurationSec
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
                    cameraConsent: 'denied',
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                setState({
                    cameraConsent: 'denied',
                    focusSource: 'simulation-fallback',
                    setupStep: getState().testMode === 'challenge' ? 'difficulty' : 'training'
                });
                if (isLabFlow()) {
                    await launchLabGame();
                } else if (getState().testMode === 'study') {
                    await launchStudyGame();
                } else if (getState().testMode === 'challenge') {
                    router.refresh();
                } else {
                    await syncRuntimeState({
                        user: getState().currentUser,
                        lang: getState().lang,
                        difficulty: 'training',
                        inputMode: 'simulation',
                        focusSource: 'simulation-fallback',
                        cameraConsent: 'denied',
                        testMode: getState().testMode,
                        trainingDurationSec: getState().trainingDurationSec
                    });
                    router.refresh();
                }
            });
        }

        const cameraContinueBtn = root.querySelector('[data-camera-continue]');
        if (cameraContinueBtn) {
            cameraContinueBtn.addEventListener('click', async () => {
                setState({ setupStep: getState().testMode === 'challenge' ? 'difficulty' : 'training' });
                if (isLabFlow()) {
                    await launchLabGame();
                    return;
                }
                if (getState().testMode === 'study') {
                    await launchStudyGame();
                    return;
                }
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: null,
                    inputMode: 'simulation',
                    focusSource: getState().focusSource,
                    cameraConsent: getState().cameraConsent,
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                if (getState().testMode === 'challenge') {
                    router.refresh();
                } else {
                    await syncRuntimeState({
                        user: getState().currentUser,
                        lang: getState().lang,
                        difficulty: 'training',
                        inputMode: 'simulation',
                        focusSource: getState().focusSource,
                        cameraConsent: getState().cameraConsent,
                        testMode: getState().testMode,
                        trainingDurationSec: getState().trainingDurationSec
                    });
                    router.refresh();
                }
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
                    cameraConsent: 'denied',
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                setState({
                    cameraConsent: 'denied',
                    focusSource: 'simulation-fallback'
                });
                router.refresh();
            });
        }

        const trainingSlider = root.querySelector('#training-duration-slider');
        const trainingValue = root.querySelector('#training-duration-value');
        if (trainingSlider && trainingValue) {
            updateTrainingSliderUI(trainingSlider, trainingValue);
            trainingSlider.addEventListener('input', () => {
                const nextValue = Number(trainingSlider.value || 180);
                updateTrainingSliderUI(trainingSlider, trainingValue);
                setState({ trainingDurationSec: nextValue });
            });
        }

        const backTraining = root.querySelector('[data-back-training]');
        if (backTraining) {
            backTraining.addEventListener('click', async () => {
                const isSimulation = getState().inputMode === 'simulation';
                const nextStep = isSimulation ? 'camera' : 'mode';
                setState({ setupStep: nextStep });
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: 'training',
                    inputMode: getState().inputMode,
                    focusSource: getState().focusSource,
                    cameraConsent: getState().cameraConsent,
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                router.refresh();
            });
        }

        const trainingStart = root.querySelector('[data-training-start]');
        if (trainingStart) {
            trainingStart.addEventListener('click', async () => {
                if (getState().inputMode === 'simulation') {
                    await activateSimulationMode();
                }
                await syncRuntimeState({
                    user: getState().currentUser,
                    lang: getState().lang,
                    difficulty: 'training',
                    inputMode: getState().inputMode,
                    focusSource: getState().focusSource,
                    cameraConsent: getState().cameraConsent,
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                setState({ difficulty: 'training' });
                router.navigate('game');
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
                    cameraConsent: getState().cameraConsent,
                    testMode: getState().testMode,
                    trainingDurationSec: getState().trainingDurationSec
                });
                router.navigate('game');
            });
        });

        heldButtons.forEach((button) => { button.disabled = false; });
        root.querySelector('.setup-card')?.removeAttribute('aria-busy');
    },

    unmount() {
        document.body.classList.remove('nb-body');
        const previewVideo = document.getElementById('camera-preview-video');
        detachCameraPreview(previewVideo);
    }
};
