import { getState, setState } from '../../app/state.js';
import { setLang as persistLang, setTheme as persistTheme } from '../../services/storageService.js';
import { applyStoredTheme } from '../../components/controlBar.js?v=2026-06-24-21';
import { importGameRuntime } from '../../services/runtimeLoader.js?v=2026-06-24-21';
import { stopCameraPreview } from '../../services/focusInputService.js?v=2026-06-24-23';

// #region debug-point A:home-report
const DEBUG_SERVER_URL = window.__TRAE_DEBUG_SERVER_URL__ || null;
const reportHomeDebug = (hypothesisId, msg, data = {}) => {
    if (!DEBUG_SERVER_URL) return Promise.resolve();
    return fetch(DEBUG_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'stitch-layout-game-render', runId: 'post-fix', hypothesisId, location: 'pages/home/index.js', msg: `[DEBUG] ${msg}`, data, ts: Date.now() })
    }).catch(() => {});
};
// #endregion

function renderThemeToggle(theme) {
    const isLight = theme === 'light';
    return `
        <button aria-label="Toggle Theme" class="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors duration-300 text-slate-600 dark:text-slate-300" data-theme-toggle>
            <span class="material-symbols-outlined ${isLight ? '' : 'hidden'}">dark_mode</span>
            <span class="material-symbols-outlined ${isLight ? 'hidden' : ''}">light_mode</span>
        </button>
    `;
}

function dualText(en, hk, className = '') {
    const normalizedClass = className ? ` class="${className}"` : '';
    return `<span class="lang-en"${normalizedClass}>${en}</span><span class="lang-hk"${normalizedClass}>${hk}</span>`;
}

function renderLanguageToggle(lang) {
    const enClass = lang === 'en'
        ? 'font-bold text-slate-900 dark:text-white cursor-pointer'
        : 'cursor-pointer hover:text-primary transition-colors duration-300';
    const hkClass = lang === 'hk'
        ? 'font-bold text-slate-900 dark:text-white cursor-pointer'
        : 'cursor-pointer hover:text-primary transition-colors duration-300';

    return `
        <div class="text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center gap-2 border border-slate-300 dark:border-slate-700 rounded-full px-4 py-2 transition-colors duration-300 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm whitespace-nowrap">
            <span class="material-symbols-outlined text-sm">language</span>
            <span class="lang-toggle-text">
                <span class="${enClass}" data-lang="en">EN</span>
                <span class="mx-1 opacity-50">|</span>
                <span class="${hkClass}" data-lang="hk">中文</span>
            </span>
        </div>
    `;
}

export default {
    render() {
        const state = getState();
        const heroVisualSrc = state.theme === 'light'
            ? 'assets/Homepage_Day_2.jpg'
            : 'assets/Homepage_Moon_2.jpg';
        return `
            <main class="page page-home page-home-stitch">
                <nav class="fixed top-0 left-0 right-0 z-50 glass-panel border-b border-slate-200 dark:border-white/10 transition-all duration-500 overflow-hidden">
                    <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                        <div class="flex items-center justify-between py-2 md:py-4 h-14 md:h-20 gap-2 md:gap-4 overflow-x-auto no-scrollbar">
                            <div class="flex-shrink-0 flex items-center gap-1.5 cursor-pointer transition-transform duration-300 hover:scale-105">
                                <span class="material-symbols-outlined text-primary text-2xl md:text-4xl">psychology</span>
                                <span class="font-display font-bold text-base md:text-2xl tracking-tight dark:text-white text-slate-900 transition-colors duration-500 whitespace-nowrap">
                                    ${dualText('NeuroFocus', 'NeuroFocus')}
                                </span>
                            </div>
                            <div class="flex items-center justify-end gap-1.5 md:gap-6 flex-shrink-0">
                                ${renderThemeToggle(state.theme)}
                                ${renderLanguageToggle(state.lang)}
                                <button type="button" class="bg-primary hover:bg-[#4a8a98] text-white px-4 py-1.5 md:px-6 md:py-2.5 rounded-full text-xs md:text-sm font-semibold shadow-lg shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 border border-transparent whitespace-nowrap" data-enter-app>
                                    ${dualText('Start', '進入遊戲')}
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <section class="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-gradient-light dark:bg-gradient-dark transition-colors duration-500 fade-up-element">
                    <div class="absolute inset-0 bg-hero-glow dark:bg-hero-glow-dark z-0 pointer-events-none transition-colors duration-500"></div>
                    <div class="absolute top-20 right-0 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-[100px] filter opacity-60 animate-float transition-colors duration-500"></div>
                    <div class="absolute bottom-0 left-0 w-72 h-72 bg-secondary/10 dark:bg-secondary/20 rounded-full blur-[100px] filter opacity-60 transition-colors duration-500" style="animation-delay: 2s;"></div>
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <div class="inline-flex items-center space-x-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-full px-4 py-1.5 mb-8 shadow-sm transition-colors duration-500">
                            <span class="relative flex h-2.5 w-2.5">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                            </span>
                            <span class="text-xs font-bold tracking-widest uppercase text-slate-700 dark:text-slate-200 font-display transition-colors duration-500">System Online v4.0</span>
                        </div>
                        <h1 class="home-title-stitch text-5xl md:text-7xl font-display font-black tracking-tight mb-8 leading-tight dark:text-white text-slate-900 drop-shadow-sm transition-colors duration-500">
                            ${dualText('Master Focus, <br class="md:hidden"> Unlock Your Potential.', '掌握專注，<br class="md:hidden">釋放專注力潛能。')}
                        </h1>
                        <p class="mt-4 max-w-2xl mx-auto text-xl text-slate-600 dark:text-slate-300 font-normal leading-relaxed tracking-wide transition-colors duration-500">
                            ${dualText('A student-led EEG neurofeedback platform using real-time data analysis to scientifically enhance concentration and learning strategies.', '這是一個由學生主導研發的 EEG 腦電波回饋平台，運用實時數據分析，助你科學化提升集中力，讓學習變得更有策略。')}
                        </p>
                        <div class="mt-12 flex flex-col sm:flex-row justify-center gap-5">
                            <button type="button" class="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-primary rounded-full hover:bg-[#4a8a98] border border-transparent shadow-[0_4px_20px_rgba(93,168,184,0.4)] hover:shadow-[0_8px_30px_rgba(93,168,184,0.6)] hover:-translate-y-1" data-enter-app>
                                ${dualText('Start Learning', '啟動學習模組')}
                                <span class="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">rocket_launch</span>
                            </button>
                            <a class="glass-btn group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold dark:text-slate-200 text-slate-700 transition-all duration-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:-translate-y-1 shadow-sm" href="#features">
                                <span class="material-symbols-outlined mr-2 text-primary group-hover:text-slate-900 dark:group-hover:text-white transition-colors">play_circle</span>
                                ${dualText('Watch Demo', '觀看演示影片')}
                            </a>
                        </div>
                        <div class="mt-24 relative max-w-5xl mx-auto fade-up-element" style="transition-delay: 200ms;">
                            <div class="hero-visual-frame relative overflow-hidden shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 aspect-[16/9] group transition-colors duration-500">
                                <div class="hero-image-shell">
                                    <img alt="NeuroFocus hero visual" class="brain-visual" src="${heroVisualSrc}" fetchpriority="high" decoding="async">
                                    <div class="hero-image-vignette"></div>
                                </div>
                                <div class="hero-focus-card hero-overlay-card absolute animate-float z-20 transition-colors duration-500">
                                    <span class="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1 transition-colors duration-500">
                                        <span class="material-symbols-outlined text-sm">bolt</span> ${dualText('Focus Level', '專注指標')}
                                    </span>
                                    <div class="flex items-end gap-3 mt-1">
                                        <span class="text-4xl font-bold dark:text-white text-slate-900 tracking-tight transition-colors duration-500">86<span class="text-2xl text-slate-500 dark:text-slate-400">%</span></span>
                                        <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 bg-emerald-100 dark:bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20 transition-colors duration-500">▲ 3.4%</span>
                                    </div>
                                    <div class="hero-card-meter w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden border border-slate-300 dark:border-slate-700 transition-colors duration-500">
                                        <div class="hero-card-meter-fill h-1.5 rounded-full shadow-[0_0_10px_rgba(93,168,184,0.8)]" style="width: 86%"></div>
                                    </div>
                                </div>
                                <div class="hero-status-pill hero-overlay-card absolute z-20 transition-colors duration-500">
                                    <span class="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] border border-green-200 dark:border-transparent transition-colors duration-500"></span>
                                    <span class="text-xs font-mono font-medium text-slate-700 dark:text-blue-200 transition-colors duration-500">SIGNAL STABLE: 12ms</span>
                                    <span class="material-symbols-outlined text-primary dark:text-primary text-sm animate-pulse transition-colors duration-500">wifi</span>
                                </div>
                                <div class="hero-visual-note absolute z-20 text-right">
                                    <span class="hero-note-pill transition-colors duration-500">
                                        ${dualText('*Data simulated for demonstration purposes', '*數據僅供演示用途')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="py-24 relative bg-slate-50 dark:bg-slate-900/50 transition-colors duration-500 fade-up-element" id="features">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="text-center mb-20">
                            <span class="text-primary font-bold tracking-widest text-sm uppercase mb-2 block">Core Features</span>
                            <h2 class="text-3xl md:text-5xl font-display font-bold dark:text-white text-slate-900 mb-6 transition-colors duration-500">
                                ${dualText('Core Features', '核心功能特點')}
                            </h2>
                            <p class="text-slate-600 dark:text-slate-400 max-w-3xl mx-auto text-lg leading-relaxed transition-colors duration-500">
                                ${dualText('Combining neuroscience with gamification, using advanced technology to bring you a comprehensive cognitive enhancement experience. Each training session is a deep exploration of your brain\'s potential.', '結合神經科學與遊戲化機制，運用先進科技為你帶來全方位的認知提升體驗。每一次訓練，都是對大腦潛能的深度探索。')}
                            </p>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div class="glass-card p-8 rounded-3xl group hover:-translate-y-2 transition-all duration-300 hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] hover:border-primary/30 relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-primary/20"></div>
                                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 dark:from-slate-800 to-white dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-sm dark:shadow-md">
                                    <span class="material-symbols-outlined text-primary text-3xl transition-colors">monitoring</span>
                                </div>
                                <h3 class="text-2xl font-bold dark:text-white text-slate-900 mb-4 tracking-tight transition-colors duration-500">
                                    ${dualText('Real-time Data Visualization', '實時數據可視化')}
                                </h3>
                                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed text-justify-inter font-normal transition-colors duration-500">
                                    ${dualText('Transform abstract EEG signals into intuitive charts. Visualize your concentration fluctuations in real-time, just as clearly as a heartbeat, helping you adjust your learning state more intelligently.', '將抽象的腦電波（EEG）轉化為簡單易懂的圖表。你能即時看到自己的專注力起伏，就像看到心跳一樣直觀，幫助你更聰明地調整學習狀態。')}
                                </p>
                            </div>
                            <div class="glass-card p-8 rounded-3xl group hover:-translate-y-2 transition-all duration-300 hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] hover:border-secondary/30 relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full blur-2xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-secondary/20"></div>
                                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 dark:from-slate-800 to-white dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-sm dark:shadow-md">
                                    <span class="material-symbols-outlined text-secondary text-3xl transition-colors">view_in_ar</span>
                                </div>
                                <h3 class="text-2xl font-bold dark:text-white text-slate-900 mb-4 tracking-tight transition-colors duration-500">
                                    ${dualText('3D Immersive Engine', '3D 沉浸式引擎')}
                                </h3>
                                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed text-justify-inter font-normal transition-colors duration-500">
                                    ${dualText('An interactive environment built with WebGL technology. No keyboard or mouse required; your focus is the controller. As you concentrate, the game environment evolves positively, achieving true mind-interaction.', '使用 WebGL 技術打造的互動環境。不需要鍵盤，你的專注就是控制器。當你越專心，遊戲環境就會產生正向變化，實現真正的意念互動。')}
                                </p>
                            </div>
                            <div class="glass-card p-8 rounded-3xl group hover:-translate-y-2 transition-all duration-300 hover:bg-white dark:hover:bg-slate-800/80 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)] hover:border-teal-500/30 relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-teal-500/20"></div>
                                <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 dark:from-slate-800 to-white dark:to-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-sm dark:shadow-md">
                                    <span class="material-symbols-outlined text-teal-500 dark:text-teal-400 text-3xl transition-colors">sensors</span>
                                </div>
                                <h3 class="text-2xl font-bold dark:text-white text-slate-900 mb-4 tracking-tight transition-colors duration-500">
                                    ${dualText('Device Connectivity', '裝置連接')}
                                </h3>
                                <p class="text-slate-600 dark:text-slate-400 text-base leading-relaxed text-justify-inter font-normal transition-colors duration-500">
                                    ${dualText('Supports mainstream EEG headsets like Muse and Emotiv via Bluetooth high-speed connection. Plug-and-play ensures every thought is instantly captured and fed back by the system.', '支援主流腦電波儀器，透過藍牙高速連接。確保你的每一個念頭都能被系統即時捕捉並回饋。')}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="py-24 relative overflow-hidden bg-white dark:bg-[#0B1120] transition-colors duration-500 fade-up-element" id="science">
                    <div class="absolute inset-0 opacity-5 z-0 pointer-events-none science-grid-overlay"></div>
                    <div class="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-slate-100/50 dark:from-primary/5 to-transparent pointer-events-none transition-colors duration-500"></div>
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex flex-col lg:flex-row items-center gap-20">
                            <div class="lg:w-1/2">
                                <span class="inline-block py-1.5 px-3 rounded-md bg-blue-50 dark:bg-slate-800/80 border border-blue-200 dark:border-white/10 text-primary text-xs font-bold tracking-wider mb-6 transition-colors duration-500">THE TECHNOLOGY</span>
                                <h2 class="text-4xl md:text-5xl font-display font-bold dark:text-white text-slate-900 mb-8 leading-tight transition-colors duration-500">
                                    ${dualText('Transforming Abstract Signals into <span style="font-size: 3rem;">Interactive Experiences</span>', '將抽象信號<br>轉化為互動體驗')}
                                </h2>
                                <p class="text-slate-600 dark:text-slate-400 mb-8 text-lg leading-relaxed text-justify-inter border-l-4 border-primary pl-6 font-normal transition-colors duration-500">
                                    ${dualText('The NeuroFocus system precisely analyzes your brainwave data, extracting Alpha waves representing relaxation and Beta waves representing focus. We bridge the gap between your brain activity and the digital world, making cognitive training tangible data rather than abstract theory.', 'NeuroFocus 系統能精確分析你的腦波數據，重點提取代表放鬆的 Alpha 波與代表專注的 Beta 波。我們在你的大腦活動與數位世界之間架起橋樑，讓認知訓練不再是空泛的理論，而是看得見的數據。')}
                                </p>
                                <div class="space-y-8">
                                    <div class="flex gap-5 group">
                                        <div class="flex-shrink-0 mt-1 w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-sm">
                                            <span class="material-symbols-outlined text-primary group-hover:text-white transition-colors">psychology_alt</span>
                                        </div>
                                        <div>
                                            <h4 class="dark:text-white text-slate-900 font-bold text-xl mb-2 transition-colors duration-500">
                                                ${dualText('Neuroplasticity', '神經可塑性')}
                                            </h4>
                                            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal transition-colors duration-500">
                                                ${dualText('Through repetitive and targeted focus exercises, we can strengthen specific neural circuit connections, enhancing brain efficiency at a physiological level.', '透過重複且有目標的專注力練習，我們能強化特定神經迴路的連接，從生理層面提升大腦的運作效率。')}
                                            </p>
                                        </div>
                                    </div>
                                    <div class="flex gap-5 group">
                                        <div class="flex-shrink-0 mt-1 w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:bg-secondary group-hover:border-secondary transition-all duration-300 shadow-sm">
                                            <span class="material-symbols-outlined text-secondary group-hover:text-white transition-colors">poll</span>
                                        </div>
                                        <div>
                                            <h4 class="dark:text-white text-slate-900 font-bold text-xl mb-2 transition-colors duration-500">
                                                ${dualText('Big Data Analytics', '大數據分析')}
                                            </h4>
                                            <p class="text-slate-600 dark:text-slate-400 text-sm leading-relaxed font-normal transition-colors duration-500">
                                                ${dualText('Every training session\'s data is recorded to generate detailed cognitive growth reports, allowing you to clearly visualize your progress trajectory.', '每一次的訓練數據都會被記錄下來，生成詳盡的認知成長報告，讓你能清楚看到自己的進步軌跡。')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="lg:w-1/2 flex justify-center items-center relative h-[500px] w-full">
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <div class="w-64 h-64 radar-ring border-primary/30"></div>
                                    <div class="w-64 h-64 radar-ring border-secondary/30" style="animation-delay: 1s;"></div>
                                    <div class="w-64 h-64 radar-ring border-cyan-500/30" style="animation-delay: 2s;"></div>
                                    <div class="w-96 h-96 bg-gradient-to-r from-primary/10 dark:from-primary/20 to-secondary/10 dark:to-secondary/20 rounded-full blur-3xl absolute transition-colors duration-500"></div>
                                </div>
                                <div class="relative glass-card p-8 rounded-3xl w-80 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] z-20 transition-colors duration-500">
                                    <div class="flex items-center justify-between mb-6 border-b border-slate-200 dark:border-white/10 pb-4 transition-colors duration-500">
                                        <div class="flex items-center gap-3">
                                            <div class="h-8 w-8 rounded-full bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 flex items-center justify-center shadow-sm transition-colors duration-500">
                                                <span class="material-symbols-outlined text-green-600 dark:text-green-400 text-sm font-bold transition-colors duration-500">check</span>
                                            </div>
                                            <span class="font-bold dark:text-white text-slate-900 text-sm transition-colors duration-500">
                                                ${dualText('Test Complete', '完成測試')}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="space-y-6">
                                        <div>
                                            <div class="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 transition-colors duration-500">
                                                ${dualText('Alpha Waves (8-13Hz)', 'Alpha 波 (8-13Hz)')}
                                                <span class="text-primary transition-colors duration-500">${dualText('Relaxed', '放鬆')}</span>
                                            </div>
                                            <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 transition-colors duration-500">
                                                <div class="bg-primary h-full rounded-full w-3/4 shadow-[0_0_10px_rgba(93,168,184,0.6)]"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div class="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-300 mb-2 transition-colors duration-500">
                                                ${dualText('Beta Waves (13-30Hz)', 'Beta 波 (13-30Hz)')}
                                                <span class="text-secondary transition-colors duration-500">${dualText('Active', '活躍')}</span>
                                            </div>
                                            <div class="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 transition-colors duration-500">
                                                <div class="bg-secondary h-full rounded-full w-1/2 shadow-[0_0_10px_rgba(139,92,246,0.6)]"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="mt-8 pt-4 border-t border-slate-200 dark:border-white/10 text-center transition-colors duration-500">
                                        <button class="text-xs font-bold dark:text-slate-200 text-slate-700 hover:text-primary dark:hover:text-primary transition-colors flex items-center justify-center gap-1 mx-auto group">
                                            ${dualText('Generate Full AI Report', 'AI 生成完整報告')}
                                            <span class="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_forward</span>
                                        </button>
                                        <p class="mt-4 text-[10px] text-slate-500 font-normal tracking-wide transition-colors duration-500">
                                            ${dualText('*Data simulated for demonstration purposes', '*數據僅供演示用途')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="py-24 px-4 bg-slate-50 dark:bg-background-dark transition-colors duration-500 fade-up-element">
                    <div class="max-w-5xl mx-auto">
                        <div class="relative rounded-[2.5rem] overflow-hidden px-6 py-20 md:px-20 md:py-24 text-center border border-slate-200 dark:border-white/10 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none transition-colors duration-500">
                            <div class="absolute inset-0 bg-gradient-to-br from-[#4a8a98] via-slate-800 to-secondary dark:from-slate-800 dark:via-slate-900 dark:to-[#1a1c29] z-0 transition-colors duration-500"></div>
                            <div class="absolute inset-0 opacity-10 z-0 mix-blend-overlay carbon-overlay"></div>
                            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] transition-colors duration-500"></div>
                            <div class="relative z-10">
                                <h2 class="text-4xl md:text-6xl font-display font-bold text-white mb-8 tracking-tight drop-shadow-sm transition-colors duration-500">
                                    ${dualText('Ready to Release Your <br>Academic Potential?', '準備好釋放你的<br>學術潛力嗎？')}
                                </h2>
                                <p class="text-slate-200 text-lg md:text-xl mb-12 max-w-2xl mx-auto font-normal transition-colors duration-500">
                                    ${dualText('Start your first training session today and unlock the unlimited possibilities of your brain!', '今天就開始你的第一次訓練，解鎖大腦無限可能！')}
                                </p>
                                <button type="button" class="bg-white text-slate-900 hover:bg-slate-50 hover:text-primary px-10 py-4 rounded-full font-bold text-lg shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-1 inline-flex items-center group border border-transparent" data-enter-app>
                                    ${dualText('Get Started Now', '立即開始')}
                                    <span class="material-symbols-outlined ml-2 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform">rocket_launch</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <footer class="bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5 pt-20 pb-10 transition-colors duration-500">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
                            <div class="flex items-center gap-3 mb-6 md:mb-0 group cursor-pointer">
                                <span class="material-symbols-outlined text-primary text-4xl group-hover:scale-105 transition-transform duration-300">psychology</span>
                                <div>
                                    <span class="font-bold text-2xl dark:text-white text-slate-900 block tracking-tight transition-colors duration-500">NeuroFocus</span>
                                    <span class="text-xs text-slate-500 tracking-wider font-semibold transition-colors duration-500">COGNITIVE SYSTEMS</span>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-8">
                                <a class="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors duration-300" href="#">${dualText('Privacy Policy', '隱私政策')}</a>
                                <a class="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors duration-300" href="#">${dualText('Terms of Service', '服務條款')}</a>
                                <a class="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors duration-300" href="#">${dualText('Support', '技術支援')}</a>
                                <a class="text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-white text-sm font-medium transition-colors duration-300" href="#">${dualText('Contact', '聯繫我們')}</a>
                            </div>
                        </div>
                        <div class="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200 dark:border-white/5 transition-colors duration-500">
                            <div class="flex flex-col md:flex-row items-center gap-4">
                                <p class="text-slate-500 text-xs text-center md:text-left font-mono transition-colors duration-500">© Cyt. All rights reserved.</p>
                                <span class="text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-900 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-800 transition-colors duration-500">${dualText('Project by HK Secondary School Innovation Team', '香港中學創新團隊項目')}</span>
                            </div>
                            <div class="mt-4 md:mt-0 flex items-center text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-full px-4 py-1.5 border border-slate-200 dark:border-white/10 shadow-sm transition-colors duration-300">
                                <span class="mr-2 font-medium">${dualText('Language:', '語言：')}</span>
                                <span class="lang-toggle-text text-xs flex">
                                    <span class="${state.lang === 'en' ? 'font-bold text-slate-900 dark:text-white cursor-pointer' : 'cursor-pointer hover:text-primary transition-colors duration-300'}" data-lang="en">EN</span>
                                    <span class="mx-1 opacity-50">|</span>
                                    <span class="${state.lang === 'hk' ? 'font-bold text-slate-900 dark:text-white cursor-pointer' : 'cursor-pointer hover:text-primary transition-colors duration-300'}" data-lang="hk">中文</span>
                                </span>
                            </div>
                        </div>
                    </div>
                </footer>
            </main>
        `;
    },

    mount({ root, router }) {
        try {
            stopCameraPreview();
        } catch (e) {}

        // #region debug-point A:home-mounted
        reportHomeDebug('A', 'spa home page mounted', {
            sectionCount: root.querySelectorAll('section').length,
            hasHeroCard: Boolean(root.querySelector('.home-title-stitch')),
            hasStitchMarkup: root.innerHTML.includes('glass-panel') || root.innerHTML.includes('bg-gradient-light'),
            stylesheetCount: document.styleSheets.length,
            computedBackground: window.getComputedStyle(root.querySelector('.brain-visual') || root).backgroundImage || null,
            titleFontFamily: window.getComputedStyle(root.querySelector('.home-title-stitch') || root).fontFamily || null
        });
        // #endregion

        const fadeUpElements = root.querySelectorAll('.fade-up-element');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });
            fadeUpElements.forEach((element) => observer.observe(element));
            fadeUpElements[0]?.classList.add('is-visible');
        } else {
            fadeUpElements.forEach((element) => element.classList.add('is-visible'));
        }

        root.querySelectorAll('[data-lang]').forEach((button) => {
            button.addEventListener('click', async () => {
                const lang = button.dataset.lang;
                persistLang(lang);
                setState({ lang });
                document.body.dataset.lang = lang;
                document.documentElement.lang = lang === 'hk' ? 'zh-HK' : 'en';
                router.refresh();
            });
        });

        const themeButton = root.querySelector('[data-theme-toggle]');
        if (themeButton) {
            themeButton.addEventListener('click', async () => {
                const current = getState().theme;
                const next = current === 'light' ? 'dark' : 'light';
                persistTheme(next);
                setState({ theme: next });
                applyStoredTheme(next);
                try {
                    const runtime = await importGameRuntime('/pages/game/runtime.js');
                    runtime.switchEnvironment(next === 'light' ? 'day' : 'night');
                } catch (error) {
                    // Ignore until the game runtime is loaded.
                }
                router.refresh();
            });
        }

        root.querySelectorAll('[data-enter-app]').forEach((button) => {
            button.addEventListener('click', () => router.navigate('auth'));
        });
    }
};
