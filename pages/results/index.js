import { renderControlBar, bindControlBar } from '../../components/controlBar.js';
import { t } from '../../app/i18n.js';
import { getState, resetFlowState, setState } from '../../app/state.js';
import { disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js';

async function getRuntime() {
    return import('../game/runtime.js');
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
        await syncRuntimeState({ user: state.currentUser, lang: state.lang, difficulty: state.difficulty });
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
