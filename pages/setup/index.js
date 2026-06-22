import { renderControlBar, bindControlBar } from '../../components/controlBar.js';
import { t } from '../../app/i18n.js';
import { getState, setState } from '../../app/state.js';
import { activateEEGMode, activateSimulationMode, disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js';

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
    return `
        <div class="setup-card">
            <h2>${t('setup_diff_title')}</h2>
            <p>${t('setup_current_mode')}：<strong>${state.inputMode === 'eeg' ? t('setup_mode_eeg') : t('setup_mode_sim')}</strong></p>
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
                            <span>02 ${t('setup_flow_diff')}</span>
                            <span>03 ${t('setup_flow_enter')}</span>
                        </div>
                        ${state.setupStep === 'difficulty' ? renderDifficultyStep(state) : renderModeStep()}
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
        await syncRuntimeState({ user: state.currentUser, lang: state.lang, difficulty: state.difficulty });

        const backAuth = root.querySelector('[data-back-auth]');
        if (backAuth) {
            backAuth.addEventListener('click', async () => {
                await disposeMode();
                setState({ setupStep: 'mode', inputMode: 'idle' });
                router.navigate('auth');
            });
        }

        const backMode = root.querySelector('[data-back-mode]');
        if (backMode) {
            backMode.addEventListener('click', () => {
                setState({ setupStep: 'mode', difficulty: null });
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
                        setState({ inputMode: 'eeg', setupStep: 'difficulty' });
                    } else {
                        await activateSimulationMode();
                        setState({ inputMode: 'simulation', setupStep: 'difficulty' });
                    }
                    router.refresh();
                } catch (error) {
                    if (message) message.textContent = error.message || String(error);
                    button.disabled = false;
                }
            });
        });

        root.querySelectorAll('[data-difficulty]').forEach((button) => {
            button.addEventListener('click', async () => {
                const difficulty = button.dataset.difficulty;
                setState({ difficulty });
                await syncRuntimeState({ user: getState().currentUser, lang: getState().lang, difficulty });
                router.navigate('game');
            });
        });
    }
};
