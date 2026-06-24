import { renderControlBar, bindControlBar } from '../../components/controlBar.js?v=2026-06-24-21';
import { t } from '../../app/i18n.js?v=2026-06-24-21';
import { getState, resetFlowState, setState } from '../../app/state.js';
import { disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-06-24-21';
import { importGameRuntime } from '../../services/runtimeLoader.js?v=2026-06-24-21';

async function getRuntime() {
    return importGameRuntime('/pages/game/runtime.js');
}

export default {
    render() {
        return `
            <main class="page page-results">
                <section id="results-screen">
                    <div class="results-panel">
                        <header class="page-header results-header">
                            <div>
                                <span class="eyebrow">Results</span>
                                <h1>${t('results_title')}</h1>
                                <p class="results-lead">${t('results_lead')}</p>
                            </div>
                            ${renderControlBar()}
                        </header>

                        <div class="results-stats-grid">
                            <div class="stat-card">
                                <span class="stat-icon">${t('results_distance')}</span>
                                <h3 data-i18n="stat_distance">Total Distance</h3>
                                <div class="stat-value" id="res-distance">0.0 m</div>
                                <div class="stat-best" id="best-distance">${t('results_best')}: --</div>
                            </div>
                            <div class="stat-card">
                                <span class="stat-icon">${t('results_accuracy')}</span>
                                <h3 data-i18n="stat_accuracy">Correct Rate</h3>
                                <div class="stat-value" id="res-accuracy">0%</div>
                                <div class="stat-best" id="best-accuracy">${t('results_best')}: --</div>
                            </div>
                            <div class="stat-card">
                                <span class="stat-icon">${t('results_time')}</span>
                                <h3 data-i18n="stat_time">Total Time</h3>
                                <div class="stat-value" id="res-time">00:00</div>
                                <div class="stat-best" id="best-time">${t('results_best')}: --</div>
                            </div>
                        </div>

                        <section class="results-training-panel" aria-labelledby="results-training-title">
                            <div class="results-training-header">
                                <h2 id="results-training-title">${t('results_training_title')}</h2>
                                <p>${t('results_training_lead')}</p>
                            </div>
                            <div class="results-insights-grid">
                                <div class="stat-card">
                                    <span class="stat-icon">${t('results_focus_rate')}</span>
                                    <div class="stat-value" id="res-focus-rate">0%</div>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-icon">${t('results_recovery_time')}</span>
                                    <div class="stat-value" id="res-recovery-time">--</div>
                                </div>
                                <div class="stat-card">
                                    <span class="stat-icon">${t('results_breathing_count')}</span>
                                    <div class="stat-value" id="res-breathing-count">0</div>
                                </div>
                            </div>
                        </section>

                        <div id="wrong-answers-list"></div>

                        <div class="results-actions">
                            <button type="button" class="primary-btn" id="btn-restart">${t('play_again')}</button>
                            <button type="button" class="secondary-btn" id="btn-home">${t('back_home')}</button>
                        </div>
                    </div>
                </section>
            </main>
        `;
    },

    async mount({ root, router }) {
        bindControlBar(root, { refresh: router.refresh });
        const state = getState();
        const runtime = await getRuntime();
        await syncRuntimeState({
            user: state.currentUser,
            lang: state.lang,
            difficulty: state.difficulty,
            inputMode: state.inputMode,
            focusSource: state.focusSource,
            cameraConsent: state.cameraConsent
        });
        runtime.switchLanguage(state.lang);
        runtime.renderResults();

        root.querySelector('#btn-restart')?.addEventListener('click', () => {
            setState({ setupStep: 'mode', difficulty: null });
            router.navigate('setup');
        });

        root.querySelector('#btn-home')?.addEventListener('click', async () => {
            await disposeMode();
            resetFlowState();
            router.navigate('home');
        });
    }
};
