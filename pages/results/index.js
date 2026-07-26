import { t } from '../../app/i18n.js?v=2026-07-25-5';
import { getState, resetFlowState, setState } from '../../app/state.js';
import { disposeMode, syncRuntimeState } from '../../services/eegBridgeService.js?v=2026-07-25-5';
import { importGameRuntime } from '../../services/runtimeLoader.js?v=2026-07-25-5';
import { syncUserEmail } from '../../services/authService.js';

async function getRuntime() {
    return importGameRuntime('/pages/game/runtime.js');
}

// The results page always reflects the LAST completed session. In-memory app
// state (state.testMode) resets to the default on a page refresh, so prefer the
// mode persisted at game start; fall back to app state for the very first load.
function resolveMode() {
    const state = getState();
    let lastMode = null;
    try { lastMode = localStorage.getItem('last_session_mode'); } catch (e) { lastMode = null; }
    return (lastMode === 'training' || lastMode === 'challenge' || lastMode === 'study') ? lastMode : state.testMode;
}

export default {
    render() {
        const resolvedMode = resolveMode();
        return `
            <main class="page page-results">
                <section id="results-screen">
                    <div class="results-shell" data-mode="${resolvedMode}">
                        <!-- Language/theme follow the user's homepage settings; no
                             mid-flow toggles after setup. -->
                        <div class="results-topbar">
                            <div class="results-brand">
                                <span class="results-brand-mark">⛵</span>
                                <span class="results-brand-name">NeuroFocus</span>
                            </div>
                        </div>

                        <!-- Print-only header: student identity for the PDF export
                             (hidden on screen, shown when printing). -->
                        <div class="results-print-header" aria-hidden="true">
                            <div class="print-title">NeuroFocus — ${t('results_title')}</div>
                            <div class="print-meta">
                                <span>${t('game_player')}：<strong id="print-student-name">—</strong></span>
                                <span>Email：<strong id="print-student-email">—</strong></span>
                                <span id="print-date"></span>
                            </div>
                        </div>

                        <!-- 1. Hero verdict (painted by runtime) -->
                        <section class="results-hero" id="results-hero"></section>

                        <!-- Study Mode: reading + quiz split cards (painted by
                             runtime; hidden in training/challenge). -->
                        <div id="results-study-reading" style="display: none;"></div>

                        <!-- 2. Metric cards (painted by runtime) -->
                        <section class="results-metrics" id="results-metrics"></section>

                        <!-- 3. Achievements (training) / Answer review (challenge/study) -->
                        <section id="results-achievements"></section>

                        <!-- 4. Focus curve -->
                        <section class="results-card">
                            <div class="results-card-head">
                                <div>
                                    <h2>${t('dash_curve_title')}</h2>
                                    <p class="results-card-sub">${t('dash_curve_lead')}</p>
                                </div>
                                <div id="curve-halves-badge"></div>
                            </div>
                            <div id="dash-focus-curve"></div>
                        </section>

                        <!-- 5. Progress trend (hidden in Study Mode: study data
                             lives in the reading/quiz cards + CSV, not this
                             training/challenge cross-session history). -->
                        <section class="results-card" id="results-trend-card">
                            <div class="results-card-head">
                                <div>
                                    <h2>${t('dash_trend_title')}</h2>
                                    <p class="results-card-sub">${t('dash_trend_lead')}</p>
                                </div>
                            </div>
                            <div id="dash-history-trend"></div>
                        </section>

                        <!-- 5b. Study-Mode cross-session trend (shown only in
                             Study Mode; reads the separate local study history). -->
                        <section class="results-card" id="results-study-trend-card">
                            <div class="results-card-head">
                                <div>
                                    <h2>${t('dash_study_trend_title')}</h2>
                                    <p class="results-card-sub">${t('dash_study_trend_lead')}</p>
                                </div>
                            </div>
                            <div id="dash-study-trend"></div>
                        </section>

                        <!-- 6. Next goal (painted by runtime) -->
                        <section class="results-nextgoal" id="results-nextgoal"></section>

                        <!-- 7. Actions -->
                        <div class="results-actions">
                            <button type="button" class="results-btn-primary" id="btn-restart">${t('play_again')}</button>
                            <button type="button" class="results-btn-secondary" id="btn-export-pdf">${t('results_export_pdf')}</button>
                            <button type="button" class="results-btn-secondary" id="btn-export-csv" style="display: none;">${t('results_export_csv')}</button>
                            <button type="button" class="results-btn-secondary" id="btn-home">${t('back_home')}</button>
                        </div>
                    </div>
                </section>
            </main>
        `;
    },

    async mount({ root, router }) {
        const state = getState();
        const runtime = await getRuntime();
        await syncRuntimeState({
            user: state.currentUser,
            lang: state.lang,
            difficulty: state.difficulty,
            inputMode: state.inputMode,
            focusSource: state.focusSource,
            cameraConsent: state.cameraConsent,
            testMode: state.testMode,
            trainingDurationSec: state.trainingDurationSec
        });
        runtime.switchLanguage(state.lang);
        runtime.renderResults();
        runtime.renderSessionDashboard();
        runtime.renderHistoryTrend().catch(() => {});
        try { runtime.renderStudyHistoryTrend(); } catch (e) { /* study trend is best-effort */ }
        // Backfill the login email so the PDF export header can show it, even
        // for users who signed in before we started storing it.
        syncUserEmail().catch(() => {});

        // Answer-review cards expand/collapse on click (challenge mode).
        root.querySelector('#results-achievements')?.addEventListener('click', (event) => {
            const btn = event.target.closest('.review-q-btn');
            if (!btn) return;
            const item = btn.closest('.review-item');
            if (item) item.classList.toggle('is-open');
        });

        root.querySelector('#btn-export-pdf')?.addEventListener('click', () => {
            try { runtime.exportStudyPdf(); } catch (e) { console.warn('PDF export failed', e); }
        });

        root.querySelector('#btn-export-csv')?.addEventListener('click', () => {
            try { runtime.exportStudyCsv(); } catch (e) { console.warn('CSV export failed', e); }
        });

        root.querySelector('#btn-restart')?.addEventListener('click', () => {
            setState({ setupStep: 'test', difficulty: null });
            router.navigate('setup');
        });

        root.querySelector('#btn-home')?.addEventListener('click', async () => {
            await disposeMode();
            resetFlowState();
            router.navigate('home');
        });
    }
};
