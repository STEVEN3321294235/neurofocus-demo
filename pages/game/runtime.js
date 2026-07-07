import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { setState, getState } from '../../app/state.js';
import { getCameraFocusScore, getCameraTrackingStatus, stopCameraPreview } from '../../services/focusInputService.js?v=2026-06-24-23';
import { appendSessionSummary, getSessionHistory } from '../../services/storageService.js';

// DEMO_MODE shows the raw EEG channels (attention / meditation / signal) for
// the competition booth. Flip to false in a future product build to hide the
// raw numbers while keeping the state-level behaviour (dual-axis flow, live
// breathing feedback) intact.
const DEMO_MODE = true;
const MEDITATION_FLOW_THRESHOLD = 50;

// Latest live EEG channels (Real EEG mode only). meditation/signal stay null
// in Simulation/camera modes so nothing is ever faked.
let latestEEG = { attention: 0, meditation: null, signal: null };

function renderEegDualAxis() {
    const host = document.getElementById('eeg-dual-axis');
    if (!host) return;
    const inEEG = selectedInputMode === 'eeg' && latestEEG.meditation !== null;
    host.style.display = (DEMO_MODE && inEEG) ? '' : 'none';
    if (!inEEG) return;
    const focusBar = document.getElementById('eeg-attention-bar');
    const relaxBar = document.getElementById('eeg-meditation-bar');
    if (focusBar) focusBar.style.width = `${Math.max(0, Math.min(100, latestEEG.attention))}%`;
    if (relaxBar) relaxBar.style.width = `${Math.max(0, Math.min(100, latestEEG.meditation))}%`;
}

function renderSignalChip() {
    const chip = document.getElementById('eeg-signal-chip');
    if (!chip) return;
    if (selectedInputMode !== 'eeg' || latestEEG.signal === null) {
        chip.style.display = 'none';
        return;
    }
    chip.style.display = '';
    const s = latestEEG.signal;
    // MindWave signal_quality: 0 = perfect contact, 100+ = no contact.
    let label = langText('訊號良好', 'Good signal');
    let cls = 'sig-good';
    if (s >= 50) { label = langText('冇接觸', 'No contact'); cls = 'sig-bad'; }
    else if (s >= 20) { label = langText('訊號弱', 'Weak signal'); cls = 'sig-weak'; }
    if (chip.className !== `eeg-signal-chip ${cls}`) chip.className = `eeg-signal-chip ${cls}`;
    chip.textContent = `📶 ${label}`;
}

// Live meditation readout inside the breathing overlay (Real EEG mode only) —
// "the headset can see your brain calming down."
function renderBreathingEegFeedback() {
    const host = document.getElementById('breathing-eeg-feedback');
    if (!host) return;
    const show = selectedInputMode === 'eeg' && latestEEG.meditation !== null;
    host.style.display = show ? '' : 'none';
    if (!show) return;
    const bar = document.getElementById('breathing-meditation-bar');
    const label = document.getElementById('breathing-meditation-label');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, latestEEG.meditation))}%`;
    if (label) label.textContent = langText(
        `部機見到你個腦冷靜緊落嚟（放鬆 ${Math.round(latestEEG.meditation)}）`,
        `The headset sees your brain calming down (relax ${Math.round(latestEEG.meditation)})`
    );
}

// Live FPS readout (behind DEMO_MODE) so performance is judged by numbers,
// not by feel. Averaged over ~0.5s windows.
let fpsAccumMs = 0;
let fpsFrames = 0;
function updateFpsMeter(deltaMs) {
    const el = document.getElementById('fps-meter');
    if (!el) return;
    if (!DEMO_MODE) { if (el.style.display !== 'none') el.style.display = 'none'; return; }
    if (el.style.display === 'none') el.style.display = '';
    fpsFrames += 1;
    fpsAccumMs += deltaMs;
    if (fpsAccumMs >= 500) {
        const fps = Math.round((fpsFrames * 1000) / fpsAccumMs);
        el.textContent = `${fps} FPS`;
        el.dataset.tier = fps >= 55 ? 'good' : fps >= 35 ? 'ok' : 'low';
        fpsAccumMs = 0;
        fpsFrames = 0;
    }
}

// Module handle to the bloom pass so the game loop can escalate it during
// flow state (it is created inside the post-processing setup function).
let bloomPassRef = null;
const BLOOM_BASE_STRENGTH = 0.35;
const BLOOM_FLOW_STRENGTH = 0.7;

// --- Configuration & State ---
const CONFIG = {
    // Questions come from our own serverless proxy (/api/questions.js), which
    // holds the DeepSeek key server-side. No API key is ever read or stored on
    // the client.
    apiUrl: "/api/questions",
    currentLang: "hk",
    currentUser: null,
    difficulty: "easy",
    testMode: "challenge",
    trainingDurationSec: 180,
    focusSource: 'simulation-fallback',
    cameraConsent: 'unknown',
    score: 0,
    wrongAnswers: [],
    streak: 0,
    // --- New Stats ---
    gameStartTime: 0,
    gameEndTime: 0,
    totalDistance: 0,
    isPaused: false,
    // --- Constants ---
    MAX_SHIP_SPEED: 130 // km/h
};

const DEFAULT_TRAINING_DURATION_SEC = 180;

let runtimeResultsHandler = null;

// Snapshot of the just-finished session, set by renderResults() and read by
// the results-dashboard renderers.
let lastSessionSummary = null;

function isTrainingMode() {
    return CONFIG.testMode === 'training';
}

function isChallengeMode() {
    return !isTrainingMode();
}

function shouldUseQuestionFlow() {
    return isChallengeMode();
}

function getTrainingSessionDurationMs() {
    return Math.max(30, Math.min(1800, Number(CONFIG.trainingDurationSec || DEFAULT_TRAINING_DURATION_SEC))) * 1000;
}

function isCompactViewport() {
    return window.innerWidth < 800 || window.innerHeight < 500;
}

function getPerformanceProfile() {
    const ua = navigator.userAgent;
    const dpr = window.devicePixelRatio || 1;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isWindows = /Windows/i.test(ua);
    const memoryGb = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 8;
    const compactViewport = isCompactViewport();
    const lowPowerDevice = isMobile || isWindows || memoryGb <= 8 || cores <= 8 || compactViewport;
    const ultraLowProfile = isMobile || (isWindows && (memoryGb <= 8 || compactViewport));

    return {
        isMobile,
        isWindows,
        memoryGb,
        cores,
        compactViewport,
        lowPowerDevice,
        ultraLowProfile,
        pixelRatioCap: ultraLowProfile ? 1.0 : isWindows ? 1.1 : compactViewport ? 1.25 : Math.min(dpr, 1.5),
        // Hardware MSAA everywhere: navigator.deviceMemory caps at 8, so the
        // old `memoryGb <= 8` gate classified virtually every device as low
        // power and silently disabled AA on all of them (hence the jagged
        // hull). MSAA is resolved in fixed-function hardware and is cheap on
        // modern GPUs incl. mobile tilers; heavier knobs below pay for it.
        antialias: true,
        msaaSamples: ultraLowProfile ? 2 : 4,
        usePostProcessing: !(isWindows || lowPowerDevice),
        enableShadows: !lowPowerDevice,
        shadowMapSize: ultraLowProfile ? 512 : compactViewport ? 768 : 1024,
        // One notch lower than before to offset the MSAA cost on weak GPUs.
        waterResolution: ultraLowProfile ? 160 : lowPowerDevice ? 224 : 320,
        textureAnisotropy: ultraLowProfile ? 2 : lowPowerDevice ? 4 : 8,
        particleMultiplier: ultraLowProfile ? 0.45 : lowPowerDevice ? 0.65 : 1.0
    };
}

const PERFORMANCE_PROFILE = getPerformanceProfile();

function getAdaptiveRenderScale() {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, PERFORMANCE_PROFILE.pixelRatioCap);
}

const DIFFICULTY_PROFILES = {
    easy: {
        ageBand: { hk: '7-10 歲', en: 'Ages 7-10' },
        promptAge: 'primary students aged 7-10',
        skillPool: ['pattern', 'classification', 'everyday math']
    },
    medium: {
        ageBand: { hk: '11-13 歲', en: 'Ages 11-13' },
        promptAge: 'middle school students aged 11-13',
        skillPool: ['sequence', 'logic deduction', 'multi-step math']
    },
    hard: {
        ageBand: { hk: '14-16 歲', en: 'Ages 14-16' },
        promptAge: 'secondary students aged 14-16',
        skillPool: ['stroop conflict', 'reverse instruction', 'hidden rule detection']
    }
};

const ASSET_URLS = {
    boat: new URL('../../assets/EGGShip2.glb', import.meta.url).href,
    waterNormal: new URL('../../assets/water_normal.jpg', import.meta.url).href,
    splash: new URL('../../assets/splash.png', import.meta.url).href,
    hdrDay: new URL('../../assets/sky_day_2.hdr', import.meta.url).href,
    hdrNight: new URL('../../assets/sky_moon.hdr', import.meta.url).href,
    bgmNature: new URL('../../bgm/nature.mp3', import.meta.url).href,
    bgmRight: new URL('../../bgm/rightanswer.mp3', import.meta.url).href,
    bgmWrong: new URL('../../bgm/error.mp3', import.meta.url).href
};

const HUD_GRADIENTS = {
    focus: [
        { max: 19, gradient: 'linear-gradient(90deg, #04070d 0%, #0b1220 100%)', glow: 'none', tone: '#7b8ba5' },
        { max: 44, gradient: 'linear-gradient(90deg, #04070d 0%, #112743 52%, #1c4f88 100%)', glow: '0 0 14px rgba(61, 122, 201, 0.2)', tone: '#7dd3fc' },
        { max: 74, gradient: 'linear-gradient(90deg, #04070d 0%, #0d3a48 50%, #18b8c9 100%)', glow: '0 0 16px rgba(24, 184, 201, 0.24)', tone: '#67e8f9' },
        { max: 100, gradient: 'linear-gradient(90deg, #04070d 0%, #0f4f59 40%, #35f0df 100%)', glow: '0 0 18px rgba(53, 240, 223, 0.32)', tone: '#99f6e4' }
    ],
    speed: [
        { max: 19, gradient: 'linear-gradient(90deg, #050608 0%, #12070a 100%)', glow: 'none', tone: '#94a3b8' },
        { max: 44, gradient: 'linear-gradient(90deg, #050608 0%, #261014 52%, #6a171f 100%)', glow: '0 0 14px rgba(190, 24, 45, 0.18)', tone: '#fda4af' },
        { max: 74, gradient: 'linear-gradient(90deg, #050608 0%, #321114 42%, #bc2d24 100%)', glow: '0 0 16px rgba(220, 38, 38, 0.24)', tone: '#fca5a5' },
        { max: 100, gradient: 'linear-gradient(90deg, #050608 0%, #3c1114 36%, #ff5a36 100%)', glow: '0 0 18px rgba(255, 90, 54, 0.32)', tone: '#fdba74' }
    ]
};

// --- Stroop stimulus (hard difficulty only) ---
// A real color/word-conflict task: the WORD names one color, the FONT shows
// another; the player must answer the font color under time pressure.
const STROOP_COLORS = [
    { hk: '紅色', en: 'RED', hex: '#ef4444' },
    { hk: '藍色', en: 'BLUE', hex: '#3b82f6' },
    { hk: '綠色', en: 'GREEN', hex: '#22c55e' },
    { hk: '黃色', en: 'YELLOW', hex: '#eab308' },
    { hk: '紫色', en: 'PURPLE', hex: '#a855f7' },
    { hk: '橙色', en: 'ORANGE', hex: '#f97316' }
];

const STROOP_TIME_LIMIT_MS = 9000;
let stroopTimerId = null;

function clearStroopTimer() {
    if (stroopTimerId) {
        clearInterval(stroopTimerId);
        stroopTimerId = null;
    }
    const timerEl = document.getElementById('question-timer');
    if (timerEl) {
        timerEl.textContent = '';
        timerEl.classList.remove('stroop-active', 'is-urgent');
    }
}

function generateStroopPuzzle(index = 0) {
    const isHk = CONFIG.currentLang === 'hk';
    const n = STROOP_COLORS.length;
    const wordIdx = index % n;
    const displayIdx = (wordIdx + 1 + (index % (n - 1))) % n; // guaranteed !== wordIdx
    const word = STROOP_COLORS[wordIdx];
    const display = STROOP_COLORS[displayIdx];

    // Options always include the correct font color AND the trap word meaning.
    const others = STROOP_COLORS.filter((c) => c !== word && c !== display);
    const extra1 = others[index % others.length];
    const extra2 = others[(index + 1) % others.length];
    const pool = [display, word, extra1, extra2];
    const rot = index % 4;
    const rotated = pool.slice(rot).concat(pool.slice(0, rot));
    const label = (c) => (isHk ? c.hk : c.en);

    return normalizeQuestionItem({
        type: 'stroop',
        word: label(word),
        displayColor: display.hex,
        question: isHk ? '呢個字係用咩顏色顯示？' : 'What COLOR is this word displayed in?',
        options: rotated.map(label),
        answer: rotated.indexOf(display),
        explanation: isHk ? '要答字體顯示嘅顏色，唔好被字嘅意思誤導。' : 'Answer the display color, not what the word says.',
        skill: isHk ? 'Stroop 陷阱' : 'Stroop Trap',
        ageBand: getAgeBandLabel(),
        validation: isHk ? '字體顏色先係答案' : 'The font color is the answer',
        source: 'fallback',
        isMock: true
    });
}

function getFallbackQuestions(count = 10) {
    const fallback = [];
    const seen = new Set(questionBank.map(questionSignature));
    let attempts = 0;

    while (fallback.length < count && attempts < 120) {
        const candidate = generateMockPuzzle(fallbackQuestionCursor + attempts);
        const signature = questionSignature(candidate);
        if (signature && !seen.has(signature)) {
            seen.add(signature);
            fallback.push(candidate);
        }
        attempts += 1;
    }

    fallbackQuestionCursor += attempts;
    persistFallbackQuestionCursor(fallbackQuestionCursor);
    return fallback;
}

const FALLBACK_CURSOR_STORAGE_KEY = 'fallback_question_cursor_v1';

function loadFallbackQuestionCursor() {
    try {
        const rawValue = Number(localStorage.getItem(FALLBACK_CURSOR_STORAGE_KEY));
        if (Number.isFinite(rawValue) && rawValue >= 0) {
            return Math.floor(rawValue);
        }
    } catch (error) {
        console.warn('[Fallback] Failed to read fallback cursor from localStorage.', error);
    }

    return Math.floor(Math.random() * TOTAL_QUESTIONS);
}

function persistFallbackQuestionCursor(value = 0) {
    try {
        localStorage.setItem(FALLBACK_CURSOR_STORAGE_KEY, String(Math.max(0, Math.floor(value))));
    } catch (error) {
        console.warn('[Fallback] Failed to persist fallback cursor.', error);
    }
}

// --- Router System ---
const ROUTER = {
    routes: {
        '': 'home',
        '#': 'home',
        '#home': 'home',
        '#login': 'login',
        '#game': 'game',
        '#results': 'results'
    },
    
    init() {
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute(); // Handle initial load
    },

    navigate(path) {
        window.location.hash = path;
    },

    handleRoute() {
        const hash = window.location.hash || '#home';
        const route = this.routes[hash] || 'home'; // Fallback to home (404 handling)
        
        console.log(`Navigating to: ${route} (${hash})`);
        
        // Hide all screens first
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('ui-container').style.display = 'none';
        document.getElementById('results-screen').style.display = 'none';
        document.getElementById('canvas-container').style.display = 'none';
        document.getElementById('difficulty-screen').style.display = 'none';
        const modeScreen = document.getElementById('mode-selection-screen');
        if (modeScreen) modeScreen.style.display = 'none';
        
        // Stop Game Loop if leaving game
        if (route !== 'game') {
            isGameActive = false;
            stopBGM();
        }

        switch(route) {
            case 'home':
                leaveEEGMode();
                document.getElementById('landing-page').style.display = 'block';
                break;
            case 'login':
                document.getElementById('start-screen').style.display = 'flex';
                // Check if user is logged in, if so show mode selection
                if (CONFIG.currentUser) {
                    document.getElementById('login-form').style.display = 'none';
                    document.getElementById('mode-selection-screen').style.display = 'flex';
                } else {
                    document.getElementById('login-form').style.display = 'block';
                    if (document.getElementById('mode-selection-screen')) document.getElementById('mode-selection-screen').style.display = 'none';
                    document.getElementById('difficulty-screen').style.display = 'none';
                }
                break;
            case 'game':
                // Check if we have valid game state, if not redirect to login
                if (!CONFIG.currentUser) {
                    this.navigate('#login');
                    return;
                }
                
                document.getElementById('ui-container').style.display = 'flex';
                document.getElementById('canvas-container').style.display = 'block';
                updateModeStatusUI();
                
                // If game not active (e.g. refresh), restart or resume?
                // For simplicity, we restart if state is lost, but try to persist via sessionStorage if needed.
                // Current requirement: "Ensure user stays on current page".
                // If we are here and game is not running, we should start it.
                if (!isGameActive) {
                    // Restore state or start new? 
                    // Let's start new for now as 3D state restoration is complex without serialization.
                    // But we set isGameActive = true to allow animate loop.
                    initGameSession();
                }
                break;
            case 'results':
                document.getElementById('results-screen').style.display = 'flex';
                // Render results if data exists
                renderResults();
                break;
        }
    }
};

// --- Game Stats & Persistence ---
const GAME_STATS = {
    saveBest(distance, accuracy, timeMs) {
        try {
            const bestDist = parseFloat(localStorage.getItem('best_distance') || '0');
            const bestAcc = parseFloat(localStorage.getItem('best_accuracy') || '0');
            const bestTime = parseFloat(localStorage.getItem('best_time') || '999999999'); 
            
            const isNewDist = distance > bestDist;
            const isNewAcc = accuracy > bestAcc;
            const isNewTime = timeMs < bestTime && accuracy === 100;
            
            if (distance > bestDist) localStorage.setItem('best_distance', distance.toFixed(1));
            if (accuracy > bestAcc) localStorage.setItem('best_accuracy', accuracy.toFixed(1));
            if (timeMs < bestTime) localStorage.setItem('best_time', timeMs.toString());
            
            return { isNewDist, isNewAcc, isNewTime };
        } catch (e) {
            console.warn('localStorage error:', e);
            return { isNewDist: false, isNewAcc: false, isNewTime: false };
        }
    },
    
    getBest() {
        try {
            return {
                distance: localStorage.getItem('best_distance') || '—',
                accuracy: localStorage.getItem('best_accuracy') || '—',
                time: localStorage.getItem('best_time') || '—'
            };
        } catch (e) {
            return { distance: '—', accuracy: '—', time: '—' };
        }
    },
    
    formatTime(ms) {
        if (ms === '—' || !ms) return '—';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const millis = Math.floor((ms % 1000) / 10); // 2 digits
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }
};

// --- Audio Context ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SOUNDS = {
    // `oceanwavesmp3.mp3` is an invalid placeholder on this machine.
    // Leave it disabled so page startup and game flow do not get blocked by media load errors.
    bgmOcean: null,
    bgmNature: new Audio(ASSET_URLS.bgmNature),
    correct: new Audio(ASSET_URLS.bgmRight),
    wrong: new Audio(ASSET_URLS.bgmWrong)
};

Object.values(SOUNDS).forEach((sound) => {
    if (sound) sound.preload = 'none';
});

// Configure Audio
if (SOUNDS.bgmOcean) SOUNDS.bgmOcean.loop = true;
SOUNDS.bgmNature.loop = true;
if (SOUNDS.bgmOcean) SOUNDS.bgmOcean.volume = 0.5;
SOUNDS.bgmNature.volume = 0.3;
SOUNDS.correct.volume = 0.8;
SOUNDS.wrong.volume = 0.8;

const TOTAL_QUESTIONS = 10;
const INITIAL_AI_TIMEOUT_MS = 8000;
const BACKGROUND_AI_TIMEOUT_MS = 15000;
const INITIAL_PLAYABLE_QUESTIONS = 4;
const SIMULATION_STABLE_SEGMENT_PROBABILITY = 0.8;
const DEFAULT_FOCUS_TRAINING = {
    stableThreshold: 50,
    lowThreshold: 45,
    recoveryThreshold: 55,
    promptDelayMs: 400,
    triggerDurationMs: 5000,
    interventionDurationMs: 12000,
    interventionCooldownMs: 10000,
    boostDurationMs: 5000
};

// Per-session copy: adaptive personalization reassigns this at session start;
// the shared defaults above are never mutated.
let FOCUS_TRAINING = { ...DEFAULT_FOCUS_TRAINING };

// --- Flow charge (training mode's countable win) ---
// Hold focus at/above the personal stable threshold and the ring charges; a
// full ring mints one flow star. Distraction only pauses the charge — it
// never drains (gentle by design: the win structure rewards sustained focus,
// losing it must not punish).
const FLOW_CHARGE_MS = 25000;
const RESCUE_CHARGE_MULTIPLIER = 1.5; // faster refill right after a breathing rescue
const FLOW_RING_CIRCUMFERENCE = 2 * Math.PI * 26; // matches SVG r=26

// Adapt the recovery bar to the player's own recent history (simple clamped
// rules, deliberately not ML — easy to explain to judges):
// - recoveryThreshold rises from 55 toward 65 as average focus stability
//   across the last sessions improves.
// - triggerDurationMs tightens from 5000ms toward a 3500ms floor as the
//   player's average recovery gets faster.
// Fewer than 3 past sessions -> pure defaults (first-timers never face a
// harder bar).
async function resolveAdaptiveFocusTraining() {
    FOCUS_TRAINING = { ...DEFAULT_FOCUS_TRAINING };
    try {
        const history = await getSessionHistory(5);
        if (!Array.isArray(history) || history.length < 3) {
            console.info('[Adaptive] Using default thresholds (history:', history?.length || 0, 'sessions)');
            return FOCUS_TRAINING;
        }
        const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
        const avgFocusedRatio = avg(history.map((s) => Math.max(0, Math.min(100, s.focusedRatio || 0))));
        const avgRecoveryMs = avg(history.map((s) => Math.max(0, s.avgRecoveryMs || 0)));

        const recoveryThreshold = Math.round(
            Math.min(65, Math.max(55, 55 + (avgFocusedRatio - 50) * 0.2))
        );
        const triggerDurationMs = Math.round(
            Math.min(5000, Math.max(3500, 3500 + avgRecoveryMs * 0.15))
        );

        FOCUS_TRAINING = { ...DEFAULT_FOCUS_TRAINING, recoveryThreshold, triggerDurationMs };
        console.info('[Adaptive] Personalized thresholds for this session:', {
            sessions: history.length,
            avgFocusedRatio: Math.round(avgFocusedRatio * 10) / 10,
            avgRecoverySec: Math.round(avgRecoveryMs / 100) / 10,
            recoveryThreshold,
            triggerDurationMs
        });
    } catch (e) {
        console.warn('[Adaptive] Falling back to default thresholds.', e);
    }
    return FOCUS_TRAINING;
}
let isWaitingForQuestions = false;

const FOCUS_SAMPLE_INTERVAL_MS = 2000;
const FOCUS_SAMPLE_CAP = 1800; // 1 hour at 2s per sample

function createTrainingAnalytics() {
    return {
        focusedTimeMs: 0,
        recoveryDurationsMs: [],
        recoveryPending: false,
        currentRecoveryMs: 0,
        lowFocusStreakMs: 0,
        interventionCount: 0,
        promptActive: false,
        interventionActive: false,
        interventionStartMs: 0,
        interventionEndsAt: 0,
        interventionCooldownUntil: 0,
        boostActive: false,
        boostEndsAt: 0,
        // Flow charge: fills while focus is held, one star per full ring.
        flowCharge: 0,
        flowStars: 0,
        chargeBoostUntil: 0,
        // Silent focus timeline for the results dashboard (one value per ~2s).
        focusSamples: [],
        sampleAccumulatorMs: 0
    };
}

const I18N = {
    hk: {
        nav_features: "特色",
        nav_benefits: "學習效益",
        nav_research: "科學原理",
        nav_start: "進入系統",
        hero_title: "透過腦電波輔助的專注力增強平台",
        hero_subtitle: "結合腦電波偵測與遊戲互動，為香港學生打造的下一代專注力訓練系統。",
        stat_accuracy: "專注度偵測準確度",
        stat_latency: "超低延遲回饋",
        stat_ai: "自適應難度調整",
        dashboard_title: "專業數據分析面板",
        login: "登入",
        register: "註冊",
        start_game: "開始遊戲",
        create_account: "建立帳號",
        no_account: "還沒有帳號？",
        has_account: "已有帳號？",
        register_link: "註冊",
        login_link: "登入",
        logout: "登出",
        focus_level: "專注度",
        simulate_eeg: "模擬腦電波輸入",
        next_question: "下一題",
        stability: "穩定度",
        loading_ai: "正在生成 AI 題目...",
        game_title: "專注漂浮船探險",
        game_subtitle: "Focus Floating Boat Adventure",
        puzzle_title: "邏輯挑戰",
        correct: "正確！",
        incorrect: "錯誤，請再試一次。",
        error_api: "請輸入 API Key 或檢查網絡",
        loading_game: "正在生成遊戲內容 (10題)...",
        speed: "速度",
        select_difficulty: "選擇難度",
        difficulty_desc: "請選擇你的挑戰等級",
        diff_easy: "容易 (Easy)",
        diff_medium: "普通 (Medium)",
        diff_hard: "困難 (Hard)",
        results_title: "挑戰總結",
        final_score: "最終得分",
        restart: "重新開始",
        explanation: "解釋",
        distance: "距離",
        stat_distance: "總移動距離",
        stat_accuracy: "答對百分比",
        stat_time: "總用時",
        play_again: "再玩一次",
        back_home: "返回首頁",
        preparing_game: "準備遊戲場景...",
        loading_boat: "載入船隻模型...",
        loading_water: "載入水面材質...",
        loading_sky: "載入天空光照...",
        loading_ai_connect: "連接 AI 題庫...",
        loading_ai_parse: "整理挑戰內容...",
        loading_ai_ready: "AI 題目已就緒",
        loading_ready: "準備完成",
        loading_failed: "載入失敗",
        retry: "重試",
        mode_idle: "待命",
        device_waiting: "等待中",
        choose_mode: "選擇模式",
        mode_real_or_sim: "選擇真實 EEG 或模擬模式",
        mode_simulation: "模擬 EEG",
        device_virtual: "虛擬訊號",
        mode_simulation_title: "模擬驅動中",
        mode_simulation_detail: "本地測試訊號",
        mode_real: "真實 EEG",
        state_ready: "已就緒",
        state_searching: "搜尋中",
        state_connected: "已連接",
        state_streaming: "即時數據",
        state_warning: "未有訊號",
        state_blocked: "已阻擋",
        state_virtual: "模擬中",
        mode_real_standby: "真實 EEG 待命",
        mode_searching_device: "搜尋裝置中",
        mode_bridge_connected: "Bridge 已連接",
        mode_live_active: "即時 EEG 啟動中",
        mode_signal_pending: "訊號尚未穩定",
        mode_blocked: "EEG 受限制",
        waiting_live_data: "等待即時腦波",
        signal_flowing: "訊號已流入",
        adjust_sensor: "請調整頭帶接觸",
        permissions_check: "請檢查本機權限",
        best_label: "最佳",
        correct_answer: "正確答案",
        no_explanation: "暫無解釋"
    },
    en: {
        nav_features: "Features",
        nav_benefits: "Benefits",
        nav_research: "Science",
        nav_start: "Enter System",
        hero_title: "Focus Revolution",
        hero_subtitle: "Next-gen focus training platform for students, powered by neurofeedback and gamification.",
        stat_accuracy: "Accuracy",
        stat_latency: "Low Latency",
        stat_ai: "AI Adaptive",
        dashboard_title: "Professional Analytics Dashboard",
        login: "Login",
        register: "Register",
        start_game: "Start Game",
        create_account: "Create Account",
        no_account: "No account?",
        has_account: "Has account?",
        register_link: "Register",
        login_link: "Login",
        logout: "Logout",
        focus_level: "Focus Level",
        simulate_eeg: "Simulate EEG Input",
        next_question: "Next Question",
        stability: "Stability",
        loading_ai: "Generating AI Puzzle...",
        game_title: "Focus Floating Boat Adventure",
        game_subtitle: "Experience Focus",
        puzzle_title: "Logic Puzzle",
        correct: "Correct!",
        incorrect: "Incorrect, try again.",
        error_api: "Please enter API Key or check network",
        loading_game: "Generating Game Content (10 Qs)...",
        speed: "Speed",
        select_difficulty: "Select Difficulty",
        difficulty_desc: "Choose your challenge level",
        diff_easy: "Easy",
        diff_medium: "Medium",
        diff_hard: "Hard",
        results_title: "Challenge Summary",
        final_score: "Final Score",
        restart: "Restart",
        explanation: "Explanation",
        distance: "Distance",
        stat_distance: "Total Distance",
        stat_accuracy: "Accuracy",
        stat_time: "Total Time",
        play_again: "Play Again",
        back_home: "Back to Home",
        preparing_game: "Preparing game session...",
        loading_boat: "Loading boat model...",
        loading_water: "Loading water textures...",
        loading_sky: "Loading sky lighting...",
        loading_ai_connect: "Connecting to AI challenge set...",
        loading_ai_parse: "Parsing challenge set...",
        loading_ai_ready: "AI challenge set ready",
        loading_ready: "Ready",
        loading_failed: "Load failed",
        retry: "Retry",
        mode_idle: "Idle",
        device_waiting: "Waiting",
        choose_mode: "Choose mode",
        mode_real_or_sim: "Select real EEG or simulation",
        mode_simulation: "Simulation EEG",
        device_virtual: "Virtual Stream",
        mode_simulation_title: "Simulation driving",
        mode_simulation_detail: "Local test signal",
        mode_real: "Real EEG",
        state_ready: "Ready",
        state_searching: "Searching",
        state_connected: "Connected",
        state_streaming: "Live Data",
        state_warning: "No Signal",
        state_blocked: "Blocked",
        state_virtual: "Virtual",
        mode_real_standby: "Real EEG standby",
        mode_searching_device: "Searching device",
        mode_bridge_connected: "Bridge connected",
        mode_live_active: "Live EEG active",
        mode_signal_pending: "Signal not ready",
        mode_blocked: "EEG blocked",
        waiting_live_data: "Waiting for live data",
        signal_flowing: "Signal flowing",
        adjust_sensor: "Adjust the sensor",
        permissions_check: "Check local permissions",
        best_label: "Best",
        correct_answer: "Correct Answer",
        no_explanation: "No explanation provided"
    }
};

function langText(hk, en) {
    return CONFIG.currentLang === 'hk' ? hk : en;
}

function formatAverageRecovery(ms) {
    if (!Number.isFinite(ms) || ms <= 0) {
        return '—';
    }

    const seconds = ms / 1000;
    return `${seconds.toFixed(seconds >= 10 ? 1 : 2)}s`;
}

function showBreathingPrompt(message = langText('請留意呼吸，慢慢將注意力帶回畫面。', 'Notice your breathing and gently bring your attention back.')) {
    const promptEl = document.getElementById('breathing-prompt');
    const textEl = document.getElementById('breathing-prompt-text');
    if (!promptEl) return;

    if (textEl) textEl.textContent = message;
    promptEl.style.display = 'flex';
    promptEl.classList.add('active');
}

function hideBreathingPrompt() {
    const promptEl = document.getElementById('breathing-prompt');
    if (!promptEl) return;
    promptEl.classList.remove('active');
    promptEl.style.display = 'none';
}

function isFocusBoostActive(now = performance.now()) {
    return trainingAnalytics.boostActive && now < trainingAnalytics.boostEndsAt;
}

function getEffectiveFocusLevel(now = performance.now()) {
    if (isFocusBoostActive(now)) {
        return 100;
    }

    return focusLevel;
}

function hideBreathingIntervention() {
    const overlay = document.getElementById('breathing-intervention');
    if (!overlay) return;
    overlay.classList.remove('active', 'phase-inhale', 'phase-hold', 'phase-exhale');
    overlay.style.display = 'none';
}

function renderBreathingIntervention(now = performance.now()) {
    const overlay = document.getElementById('breathing-intervention');
    if (!overlay || !trainingAnalytics.interventionActive) return;

    const titleEl = document.getElementById('breathing-title');
    const phaseEl = document.getElementById('breathing-phase');
    const helperEl = document.getElementById('breathing-helper');
    const elapsed = Math.max(0, now - trainingAnalytics.interventionStartMs);
    const cycleElapsed = elapsed % 12000;

    let phaseClass = 'phase-inhale';
    let phaseTitle = langText('慢慢吸氣，重新穩定', 'Slow inhale and reset');
    let phaseText = langText('吸氣', 'Inhale');
    let helperText = langText('跟住呼吸環由細慢慢放大，持續 4 秒吸氣。', 'Follow the ring from small to large and inhale for 4 seconds.');

    if (cycleElapsed >= 4000 && cycleElapsed < 8000) {
        phaseClass = 'phase-hold';
        phaseTitle = langText('憋氣穩住節奏', 'Hold and stay steady');
        phaseText = langText('憋氣', 'Hold');
        helperText = langText('保持呼吸環停留在最大狀態，穩住 4 秒。', 'Keep the ring at its largest size and hold for 4 seconds.');
    } else if (cycleElapsed >= 8000) {
        phaseClass = 'phase-exhale';
        phaseTitle = langText('慢慢呼氣，回到題目', 'Slow exhale and refocus');
        phaseText = langText('呼氣', 'Exhale');
        helperText = langText('跟住呼吸環由大慢慢收細，用 4 秒慢慢呼氣。', 'Follow the ring from large to small and exhale slowly over 4 seconds.');
    }

    overlay.style.display = 'flex';
    overlay.classList.add('active');
    overlay.classList.remove('phase-inhale', 'phase-hold', 'phase-exhale');
    overlay.classList.add(phaseClass);

    if (titleEl) titleEl.textContent = phaseTitle;
    if (phaseEl) phaseEl.textContent = phaseText;
    if (helperEl) helperEl.textContent = helperText;

    renderBreathingEegFeedback();
}

function startBreathingIntervention(now = performance.now()) {
    hideBreathingPrompt();
    trainingAnalytics.interventionActive = true;
    trainingAnalytics.interventionCount += 1;
    trainingAnalytics.interventionStartMs = now;
    trainingAnalytics.interventionEndsAt = now + FOCUS_TRAINING.interventionDurationMs;
    trainingAnalytics.interventionCooldownUntil = trainingAnalytics.interventionEndsAt + FOCUS_TRAINING.interventionCooldownMs;
    trainingAnalytics.lowFocusStreakMs = 0;
    const overlay = document.getElementById('breathing-intervention');
    if (overlay) {
        overlay.style.display = 'flex';
        overlay.classList.add('active');
        overlay.classList.remove('phase-inhale', 'phase-hold', 'phase-exhale');
        void overlay.offsetWidth;
        requestAnimationFrame(() => renderBreathingIntervention(performance.now()));
        return;
    }

    renderBreathingIntervention(now);
}

function stopBreathingIntervention() {
    trainingAnalytics.interventionActive = false;
    trainingAnalytics.promptActive = false;
    trainingAnalytics.lowFocusStreakMs = 0;
    trainingAnalytics.boostActive = true;
    trainingAnalytics.boostEndsAt = performance.now() + FOCUS_TRAINING.boostDurationMs;
    hideBreathingIntervention();
    celebrateBoost();
}

// Make the post-breathing 100% boost FELT — it used to happen silently.
function celebrateBoost() {
    playCorrectSound();
    document.body.classList.add('boost-celebrate');
    const flash = document.getElementById('boost-flash');
    const flashText = document.getElementById('boost-flash-text');
    if (flash && flashText) {
        flashText.textContent = langText('🔥 專注全滿 5 秒！', '🔥 Full focus for 5s!');
        flash.style.display = '';
        flash.classList.remove('is-in');
        void flash.offsetWidth; // restart CSS animation
        flash.classList.add('is-in');
    }
    setTimeout(() => {
        document.body.classList.remove('boost-celebrate');
        if (flash) flash.style.display = 'none';
    }, FOCUS_TRAINING.boostDurationMs);
}

// A full flow ring = one star: the discrete, countable "win" of training
// mode. Kept deliberately gentle — soft chime + ring pop, no siren lights.
function earnFlowStar() {
    trainingAnalytics.flowStars += 1;
    playStarSound();
    renderFlowCharge(true);
    const ring = document.getElementById('flow-ring');
    if (ring) {
        ring.classList.remove('star-pop');
        void ring.offsetWidth; // restart CSS animation
        ring.classList.add('star-pop');
    }
}

// Charge-ring HUD. Cheap by construction: writes DOM only when the rounded
// percent or the star count actually changes.
function renderFlowCharge(force = false) {
    const host = document.getElementById('flow-ring');
    if (!host) return;
    const show = isTrainingMode() && isGameActive;
    const displayValue = show ? '' : 'none';
    if (host.style.display !== displayValue) host.style.display = displayValue;
    if (!show) return;

    const pct = Math.round(THREE.MathUtils.clamp(trainingAnalytics.flowCharge, 0, 1) * 100);
    const stars = trainingAnalytics.flowStars;
    if (!force && host.dataset.pct === String(pct) && host.dataset.stars === String(stars)) return;
    host.dataset.pct = String(pct);
    host.dataset.stars = String(stars);

    const fill = document.getElementById('flow-ring-fill');
    if (fill) fill.style.strokeDashoffset = String(FLOW_RING_CIRCUMFERENCE * (1 - pct / 100));
    const starsEl = document.getElementById('flow-ring-stars');
    if (starsEl && starsEl.textContent !== String(stars)) starsEl.textContent = String(stars);
    host.classList.toggle('is-nearly-full', pct >= 85);
}

function playStarSound() {
    // Gentle two-note chime (E5 -> A5), softer than the answer sounds.
    playTone(659.25, 'sine', 0.35);
    setTimeout(() => playTone(880, 'sine', 0.5), 130);
}

// Wordless-first onboarding beat: one line that explains the core mapping,
// shown as gameplay begins, auto-dismissed.
function showOnboardingCue() {
    const cue = document.getElementById('onboarding-cue');
    const cueText = document.getElementById('onboarding-cue-text');
    if (!cue || !cueText) return;
    cueText.textContent = langText(
        '🚤 隻船就係你個腦嘅倒影——集中精神，佢就會平穩加速',
        '🚤 The boat mirrors your mind — focus, and it speeds up smoothly'
    );
    cue.style.display = '';
    cue.classList.remove('is-in');
    void cue.offsetWidth;
    cue.classList.add('is-in');
    setTimeout(() => {
        cue.classList.remove('is-in');
        setTimeout(() => { cue.style.display = 'none'; }, 600);
    }, 8000);
}

function updateTrainingAnalytics(deltaMs, effectiveFocus = focusLevel) {
    if (effectiveFocus >= FOCUS_TRAINING.stableThreshold) {
        trainingAnalytics.focusedTimeMs += deltaMs;

        // Flow charge (training only): sustained focus fills the ring; a
        // recent breathing rescue refills it faster so "分心→救返" also pays.
        if (isTrainingMode()) {
            const boost = performance.now() < trainingAnalytics.chargeBoostUntil
                ? RESCUE_CHARGE_MULTIPLIER
                : 1;
            trainingAnalytics.flowCharge += (deltaMs / FLOW_CHARGE_MS) * boost;
            if (trainingAnalytics.flowCharge >= 1) {
                trainingAnalytics.flowCharge = 0;
                earnFlowStar();
            }
        }
    }

    if (trainingAnalytics.recoveryPending) {
        trainingAnalytics.currentRecoveryMs += deltaMs;
        if (effectiveFocus >= FOCUS_TRAINING.recoveryThreshold) {
            trainingAnalytics.recoveryDurationsMs.push(trainingAnalytics.currentRecoveryMs);
            trainingAnalytics.recoveryPending = false;
            trainingAnalytics.currentRecoveryMs = 0;
        }
    } else if (effectiveFocus < FOCUS_TRAINING.lowThreshold) {
        trainingAnalytics.recoveryPending = true;
        trainingAnalytics.currentRecoveryMs = deltaMs;
    }

    if (effectiveFocus <= FOCUS_TRAINING.lowThreshold) {
        trainingAnalytics.lowFocusStreakMs += deltaMs;
    } else {
        trainingAnalytics.lowFocusStreakMs = 0;
    }

    // Silent sampling for the results dashboard (focus curve + halves compare).
    trainingAnalytics.sampleAccumulatorMs += deltaMs;
    if (trainingAnalytics.sampleAccumulatorMs >= FOCUS_SAMPLE_INTERVAL_MS) {
        trainingAnalytics.sampleAccumulatorMs = 0;
        if (trainingAnalytics.focusSamples.length < FOCUS_SAMPLE_CAP) {
            trainingAnalytics.focusSamples.push(Math.round(effectiveFocus));
        }
    }
}

// --- Precision Timing & Calibration ---
class PrecisionLoop {
    constructor(callback) {
        this.callback = callback;
        this.isRunning = false;
        this.lastTime = 0;
        this.accumulatedTime = 0;
        this.animationFrameId = null;
        this.stats = {
            fps: 0,
            delta: 0,
            elapsed: 0,
            lastFrameTime: 0
        };
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulatedTime = 0;
        this.loop();
    }

    stop() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }

    loop() {
        if (!this.isRunning) return;

        const now = performance.now();
        const delta = now - this.lastTime;
        this.lastTime = now;
        this.accumulatedTime += delta;

        // Update Stats
        this.stats.delta = delta;
        this.stats.elapsed = this.accumulatedTime;
        this.stats.fps = 1000 / delta;
        
        // Callback with high precision delta (ms)
        this.callback(delta, this.accumulatedTime);

        this.animationFrameId = requestAnimationFrame(() => this.loop());
    }
}

// --- Visual Test Panel ---
const TEST_PANEL = {
    active: false,
    el: null,
    testEl: null,
    targetSpeedKmh: 1.0, // 1 km/h
    pixelsPerMeter: 100, // 1m = 100px
    startTime: 0,
    logs: [],
    
    init() {
        if (this.el) return;
        
        // Create Panel
        this.el = document.createElement('div');
        this.el.id = 'precision-test-panel';
        this.el.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 300px;
            background: rgba(0,0,0,0.9);
            color: #0f0;
            font-family: monospace;
            padding: 10px;
            border: 1px solid #0f0;
            z-index: 9999;
            font-size: 11px;
            display: none;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        `;
        
        // Add Canvas for Graph
        this.el.innerHTML = '<div id="test-stats"></div><canvas id="test-graph" width="280" height="50" style="margin-top:5px; border:1px solid #333;"></canvas>';
        document.body.appendChild(this.el);

        // Create Test Object (The moving div)
        this.testEl = document.createElement('div');
        this.testEl.id = 'precision-test-object';
        this.testEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 0;
            width: 4px;
            height: 30px;
            background: #ff00ff;
            z-index: 9998;
            display: none;
            transform: translate3d(0, -50%, 0);
            box-shadow: 0 0 5px #ff00ff;
        `;
        document.body.appendChild(this.testEl);
    },

    toggle() {
        this.active = !this.active;
        if (this.active) {
            this.init();
            this.el.style.display = 'block';
            this.testEl.style.display = 'block';
            this.startTime = performance.now();
            this.logs = [];
        } else {
            if (this.el) this.el.style.display = 'none';
            if (this.testEl) this.testEl.style.display = 'none';
        }
    },

    update(deltaMs, totalDistanceMeters) {
        if (!this.active) return;

        // 1. Calculate Theoretical Position
        // Speed = 1 km/h = 1000m / 3600s = 1/3.6 m/s ~= 0.277778 m/s
        const now = performance.now();
        const testElapsedSec = (now - this.startTime) / 1000;
        const targetSpeedMs = this.targetSpeedKmh / 3.6;
        
        const theoreticalDistM = targetSpeedMs * testElapsedSec;
        const actualDistM = totalDistanceMeters; // From game engine
        
        const errorMm = (actualDistM - theoreticalDistM) * 1000;
        
        // 2. Visual Update (Pixel Displacement)
        // 1m = 100px
        const pixelPos = (theoreticalDistM % (window.innerWidth / this.pixelsPerMeter)) * this.pixelsPerMeter; 
        this.testEl.style.transform = `translate3d(${pixelPos}px, -50%, 0)`;

        // 3. Update Panel Stats
        const statsEl = this.el.querySelector('#test-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <strong>PRECISION TEST MODE</strong><br>
                Target Speed: ${this.targetSpeedKmh.toFixed(3)} km/h<br>
                Time: ${testElapsedSec.toFixed(3)} s<br>
                Dist (Theory): ${theoreticalDistM.toFixed(4)} m<br>
                Dist (Engine): ${actualDistM.toFixed(4)} m<br>
                Error: <span style="color: ${Math.abs(errorMm) > 1 ? 'red' : '#0f0'}">${errorMm.toFixed(4)} mm</span><br>
                Latency: ${(deltaMs * 1000).toFixed(0)} µs<br>
                FPS: ${(1000/deltaMs).toFixed(1)}
            `;
        }

        // 4. Update Graph (Error Curve)
        this.logs.push(errorMm);
        if (this.logs.length > 140) this.logs.shift(); // Keep last 140 frames

        const canvas = this.el.querySelector('#test-graph');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.beginPath();
            ctx.strokeStyle = '#0f0';
            ctx.lineWidth = 1;
            
            const midY = canvas.height / 2;
            const scaleY = 10; // 1mm = 10px height
            
            // Draw Zero Line
            ctx.strokeStyle = '#333';
            ctx.moveTo(0, midY);
            ctx.lineTo(canvas.width, midY);
            ctx.stroke();

            // Draw Error Line
            ctx.beginPath();
            ctx.strokeStyle = '#0f0';
            for (let i = 0; i < this.logs.length; i++) {
                const x = i * 2;
                const y = midY - (this.logs[i] * scaleY);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
    }
};

// --- Global Variables ---
let isConnected = false;
let isHeadsetConnected = false;
let isSimulationMode = false;
let eegModeActive = false;
let selectedInputMode = 'idle';
let eegConnectionState = 'idle';
let eegStatusDetail = 'Choose a mode to begin.';
let hasLiveEEGData = false;
let connectionWatchdogInterval = null;
let bridgeReconnectTimeoutId = null;
let lastEEGDataTime = 0;
let bridgeReconnectAttempts = 0;
let suppressBridgeAutoReconnect = false;
const MAX_BRIDGE_RECONNECT_ATTEMPTS = 12;
const LIVE_EEG_WAIT_TIMEOUT_MS = 18000;


let scene, camera, renderer, controls;
let mixer; // Animation Mixer
let water, boat;
let waterNormalTexture, foamTexture, splashTexture;
let boatParticles, particleGeometry, particleMaterial;
let particleData = []; // Store velocity/life for each particle

let islands = [];
let balloons = [];
let focusLevel = 50;
let boatSpeed = 0; // km/h
let boatDistance = 0; // Virtual distance traveled
// const clock = new THREE.Clock(); // REPLACED BY PRECISION LOOP
let isGameActive = false;
let questionBank = []; // Store batch of questions
let currentQuestionIndex = 0;
let isFetchingQuestion = false;
let fallbackQuestionCursor = loadFallbackQuestionCursor();
let trainingAnalytics = createTrainingAnalytics();
let activeGameSessionId = 0;
let startupTimeoutId = null;
let directionalLight, ambientLight; // Global lighting references
let loadingManager; // Asset Loading Manager
let envState = {
    targetFogColor: new THREE.Color(0xaaccff),
    targetFogDensity: 0.002,
    targetSunColor: new THREE.Color(0xfff0dd),
    targetSunIntensity: 2.0,
    targetAmbientColor: new THREE.Color(0xffffff),
    targetAmbientIntensity: 0.5,
    targetWaterColor: new THREE.Color(0x001e0f),
    targetSunDirection: new THREE.Vector3(50, 50, -50),
    targetExposure: 1.2, // Added exposure target
    targetRimIntensity: 0.0, // Added rim light target
    targetHemisphereIntensity: 0.0,
    targetCameraLightIntensity: 1.35,
    targetBoatEmissiveIntensity: 0.0,
    isTransitioning: false,
    transitionStartTime: 0,
    transitionDuration: 2000 // 2s transition
};
let cachedEnvMaps = {}; // Cache HDRIs


// Precision Timer Instance
const gameLoop = new PrecisionLoop((deltaMs, totalTimeMs) => {
    // This is the core update function called every frame
    // Allow loop to run even if game not active (for idle animations/water)
    // if (!isGameActive) return;

    updateFpsMeter(deltaMs);

    // 1. Calculate Delta in Seconds (High Precision)
    const deltaSec = deltaMs / 1000;

    // 2. Logic Update
    updateGameLogic(deltaSec);

    // 2.1 Environment Transition Lerp
    if (envState.isTransitioning) {
        const now = performance.now();
        const progress = Math.min(1.0, (now - envState.transitionStartTime) / envState.transitionDuration);
        
        // Lerp Exposure
        if (renderer) {
            renderer.toneMappingExposure = THREE.MathUtils.lerp(renderer.toneMappingExposure, envState.targetExposure, 0.05);
        }

        // Lerp Fog
        if (scene.fog) {
            scene.fog.color.lerp(envState.targetFogColor, 0.05);
            scene.fog.density = THREE.MathUtils.lerp(scene.fog.density, envState.targetFogDensity, 0.05);
        }
        
        // Lerp Rim Light
        if (rimLight) {
             rimLight.intensity = THREE.MathUtils.lerp(rimLight.intensity, envState.targetRimIntensity, 0.05);
        }
        
        // Lerp Lights
        if (directionalLight) {
            directionalLight.color.lerp(envState.targetSunColor, 0.05);
            directionalLight.intensity = THREE.MathUtils.lerp(directionalLight.intensity, envState.targetSunIntensity, 0.05);
            directionalLight.position.lerp(envState.targetSunDirection, 0.02);
        }
        if (ambientLight) {
            ambientLight.color.lerp(envState.targetAmbientColor, 0.05);
            ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, envState.targetAmbientIntensity, 0.05);
        }
        if (hemisphereLight) {
            hemisphereLight.intensity = THREE.MathUtils.lerp(hemisphereLight.intensity, envState.targetHemisphereIntensity, 0.05);
        }
        if (cameraLight) {
            cameraLight.intensity = THREE.MathUtils.lerp(cameraLight.intensity, envState.targetCameraLightIntensity, 0.06);
        }
        
        // Lerp Water
        if (water && water.material) {
            water.material.uniforms.sunColor.value.lerp(envState.targetSunColor, 0.05);
            water.material.uniforms.waterColor.value.lerp(envState.targetWaterColor, 0.05);
            
            // Sync water sun direction
            if (directionalLight) {
                water.material.uniforms.sunDirection.value.copy(directionalLight.position).normalize();
            }
        }

        if (boat) {
            boat.traverse((child) => {
                if (!child.isMesh || !child.material) return;
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    if ('emissiveIntensity' in material) {
                        material.emissiveIntensity = THREE.MathUtils.lerp(
                            material.emissiveIntensity || 0,
                            envState.targetBoatEmissiveIntensity,
                            0.05
                        );
                    }
                });
            });
        }
        
        if (progress >= 1.0) {
            // envState.isTransitioning = false; // Keep updating subtly is fine, or stop to save perf
        }
    }

    // 3. Render

    if (renderer && scene && camera) {
        if (composer) {
            composer.render();
        } else {
            renderer.render(scene, camera);
        }
    }
});


// --- Helper: Fixed Width Digit Rendering ---
function updateDigitDisplay(element, text) {
    if (!element) return;
    
    // Only update if value changed to minimize DOM operations
    if (element.dataset.value === text) return;
    element.dataset.value = text;

    let html = '<div class="digit-row">';
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (/[0-9]/.test(char)) {
            html += `<span class="digit-box">${char}</span>`;
        } else if (/[.:]/.test(char)) {
            html += `<span class="digit-separator">${char}</span>`;
        } else {
            // Units (km, m, etc.) or spaces
            html += `<span class="digit-unit" style="margin-left: 2px;">${char}</span>`;
        }
    }
    html += '</div>';
    element.innerHTML = html;
}

function updateGameLogic(delta) {
    // Check Pause Conditions
    let shouldPause = false;
    
    // Condition 1: Question missing but waiting
    if (isWaitingForQuestions) shouldPause = true;
    
    // Condition 2: Screen issue (portrait warning)
    const warningEl = document.getElementById('portrait-warning');
    if (warningEl && window.getComputedStyle(warningEl).display !== 'none') {
        shouldPause = true;
    }
    
    // Condition 3: EEG data missing in EEG mode
    if (selectedInputMode === 'eeg' && typeof eegModeActive !== 'undefined' && eegModeActive) {
        if (Date.now() - lastEEGDataTime > 2000) {
            shouldPause = true;
        }
    }

    if (selectedInputMode === 'simulation' && CONFIG.focusSource === 'camera-ready') {
        const cameraTracking = getCameraTrackingStatus();
        if (!cameraTracking.streamActive || !cameraTracking.modelReady || !cameraTracking.isPredicting) {
            focusLevel = 0;
            shouldPause = true;
            setEEGConnectionState('warning', langText('相機串流已中斷，計時已暫停。請重新回到鏡頭授權或鏡頭畫面。', 'Camera stream stopped, timer paused. Please restore camera access or return to the camera view.'));
        } else if (!cameraTracking.hasFace && !cameraTracking.faceRecentlySeen) {
            focusLevel = 0;
            shouldPause = true;
            setEEGConnectionState('warning', langText('未偵測到人臉，專注度已歸零並暫停計時。請回到鏡頭範圍內。', 'No face detected. Focus is now 0 and the timer is paused. Please return to the camera frame.'));
        } else if (!cameraTracking.hasFace && cameraTracking.faceRecentlySeen) {
            setEEGConnectionState('simulation', langText('正在重新鎖定人臉，專注值會短暫平滑維持。', 'Reacquiring your face. Focus stays smoothed briefly.'));
        }
    }

    const now = performance.now();
    const externalPause = shouldPause;
    const effectiveFocusLevel = getEffectiveFocusLevel(now);

    if (trainingAnalytics.boostActive && now >= trainingAnalytics.boostEndsAt) {
        trainingAnalytics.boostActive = false;
    }

    if (trainingAnalytics.interventionActive) {
        if (now >= trainingAnalytics.interventionEndsAt) {
            stopBreathingIntervention();
        } else {
            renderBreathingIntervention(now);
            shouldPause = true;
        }
    }

    if (isGameActive && !externalPause && !trainingAnalytics.interventionActive) {
        updateTrainingAnalytics(delta * 1000, effectiveFocusLevel);

        if (
            effectiveFocusLevel <= FOCUS_TRAINING.lowThreshold &&
            trainingAnalytics.lowFocusStreakMs >= FOCUS_TRAINING.promptDelayMs &&
            now < trainingAnalytics.interventionCooldownUntil
        ) {
            showBreathingPrompt(langText('先慢慢呼吸，將視線重新集中。', 'Breathe slowly and bring your gaze back to the center.'));
            trainingAnalytics.promptActive = true;
        } else if (
            effectiveFocusLevel <= FOCUS_TRAINING.lowThreshold &&
            trainingAnalytics.lowFocusStreakMs >= FOCUS_TRAINING.promptDelayMs
        ) {
            showBreathingPrompt(langText('請專注呼吸，若狀態未回升將啟動呼吸引導。', 'Focus on your breathing. Guided breathing will start if focus does not recover.'));
            trainingAnalytics.promptActive = true;
        } else if (trainingAnalytics.promptActive) {
            hideBreathingPrompt();
            trainingAnalytics.promptActive = false;
        }

        if (
            trainingAnalytics.lowFocusStreakMs >= FOCUS_TRAINING.triggerDurationMs &&
            now >= trainingAnalytics.interventionCooldownUntil
        ) {
            startBreathingIntervention(now);
            shouldPause = true;
        }
    } else if (!trainingAnalytics.interventionActive) {
        trainingAnalytics.lowFocusStreakMs = 0;
        if (trainingAnalytics.promptActive) {
            hideBreathingPrompt();
            trainingAnalytics.promptActive = false;
        }
    }

    CONFIG.isPaused = shouldPause;

    if (CONFIG.isPaused) {
        renderFocusTelemetry(0);
    } else {
        renderFocusTelemetry(effectiveFocusLevel);
    }

    // 0. Flow State Logic
    // Dual-axis flow (Real EEG only): "focused AND relaxed". In Simulation/
    // camera modes there is no meditation signal, so the single-axis rule
    // stays unchanged.
    const meditationOk = !(selectedInputMode === 'eeg' && latestEEG.meditation !== null)
        || latestEEG.meditation >= MEDITATION_FLOW_THRESHOLD;
    const isFlowState = (focusLevel > 80 && CONFIG.streak >= 3 && meditationOk);
    if (isFlowState) {
        document.body.classList.add('flow-state-mode');
    } else {
        document.body.classList.remove('flow-state-mode');
    }

    // 1. Update Speed Logic
    updateSpeedVisuals();
    
    // 2. Boat Movement (Forward along -Z)
    // 1 unit = 1 meter approx. 110 km/h ~= 30 m/s.
    let speedMPS = boatSpeed / 3.6; 
    
    // FORCE IDLE IF GAME NOT ACTIVE (Cinematic Waiting)
    if (!isGameActive || CONFIG.isPaused) {
        speedMPS = 0;
    }

    // OVERRIDE FOR TEST MODE
    if (TEST_PANEL.active) {
        boatSpeed = TEST_PANEL.targetSpeedKmh;
        speedMPS = boatSpeed / 3.6;
    }

    // Flow State Boost
    if (isFlowState) {
        speedMPS *= 1.2;
        camera.fov = THREE.MathUtils.lerp(camera.fov, 65, 0.05);
    } else {
        camera.fov = THREE.MathUtils.lerp(camera.fov, 55, 0.05);
    }
    camera.updateProjectionMatrix();

    // Flow-state visual payoff: bloom swells while in flow, settles smoothly
    // after. Only runs when post-processing exists (perf profile permitting).
    if (bloomPassRef) {
        bloomPassRef.strength = THREE.MathUtils.lerp(
            bloomPassRef.strength,
            isFlowState ? BLOOM_FLOW_STRENGTH : BLOOM_BASE_STRENGTH,
            0.04
        );
    }

    const moveDist = speedMPS * delta; 
    
    // Update Stats
    if (isGameActive) {
        if (!CONFIG.isPaused) {
            CONFIG.totalDistance += moveDist;
            CONFIG.accumulatedPlayTime = (CONFIG.accumulatedPlayTime || 0) + (delta * 1000);
            
            // TEST PANEL UPDATE
            TEST_PANEL.update(delta * 1000, CONFIG.totalDistance);

            if (isTrainingMode() && CONFIG.accumulatedPlayTime >= getTrainingSessionDurationMs()) {
                CONFIG.gameEndTime = performance.now();
                isGameActive = false;
                showResults();
            }
        }

        // Update DOM - Throttled for readability and performance (User request: ~20ms interval)
        const hudNow = performance.now();
        if (!CONFIG.lastHUDUpdate || hudNow - CONFIG.lastHUDUpdate > 20) {
            CONFIG.lastHUDUpdate = hudNow;

            renderFlowCharge();

            const distEl = document.getElementById('distance-value');
            if (distEl) {
                let distText = "";
                if (CONFIG.totalDistance > 1000) {
                    distText = (CONFIG.totalDistance / 1000).toFixed(2) + " km"; // 2 decimals for km
                } else {
                    distText = CONFIG.totalDistance.toFixed(1) + " m"; // 1 decimal for m
                }
                updateDigitDisplay(distEl, distText);
            }
            
            // Update Time
            const timeEl = document.getElementById('play-time-value');
            const trainingCountdownEl = document.getElementById('training-countdown-value');
            const trainingCountdownDisplay = document.getElementById('training-countdown-display');
            if (isTrainingMode()) {
                if (trainingCountdownEl) {
                    const remainingMs = Math.max(0, getTrainingSessionDurationMs() - (CONFIG.accumulatedPlayTime || 0));
                    const countdownText = GAME_STATS.formatTime(remainingMs).substring(0, 5);
                    const remainingRatio = getTrainingSessionDurationMs() > 0 ? remainingMs / getTrainingSessionDurationMs() : 1;
                    if (trainingCountdownDisplay) {
                        trainingCountdownDisplay.classList.toggle('is-critical', remainingRatio <= 0.2);
                    }
                    if (CONFIG.isPaused) {
                        trainingCountdownEl.innerHTML = `<span class="material-symbols-outlined pause-icon" style="font-size: 1.1em; vertical-align: text-bottom; margin-right: 4px; color: inherit; text-shadow: inherit;">pause_circle</span>${countdownText}`;
                    } else {
                        updateDigitDisplay(trainingCountdownEl, countdownText);
                    }
                }
            } else if (timeEl) {
                const timeText = GAME_STATS.formatTime(CONFIG.accumulatedPlayTime || 0).substring(0, 5); // mm:ss only for HUD
                if (CONFIG.isPaused) {
                    timeEl.innerHTML = `<span class="material-symbols-outlined pause-icon" style="font-size: 1.1em; vertical-align: text-bottom; margin-right: 4px; color: #FFD700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">pause_circle</span>` + timeText;
                } else {
                    updateDigitDisplay(timeEl, timeText);
                }
            }
        }
    }
    
    if (boat) {
        // Move Boat
        boat.position.z -= moveDist;

        // Update wake / splash effects
        updateParticles(delta, speedMPS);

        
        // Update Water Position
        if (water) water.position.z = boat.position.z;
        
        // Camera Follow Logic (Free View)
        if (controls) {
            camera.position.z -= moveDist;
            controls.target.z -= moveDist;

            // Clamp Camera Y (Seabed Collision Protection)
            if (camera.position.y < 1.0) camera.position.y = 1.0;

            controls.update();
        }
    }
        
    // 3. Water Logic
    const inverseFocus = 100 - focusLevel;
    const waveIntensity = THREE.MathUtils.clamp(inverseFocus / 100, 0, 1);
    
    // Update Water Uniforms - RESTORED: Wave Undulation
    if (water) {
        // Base Flow
        water.material.uniforms['time'].value += delta;
        
        // Speed Influence (Gentle)
        // Only increase time speed slightly, do NOT change distortionScale aggressively
        const maxSpeedMPS = CONFIG.MAX_SHIP_SPEED / 3.6;
        const speedRatio = Math.min(speedMPS / maxSpeedMPS, 1.0);
        const flowSpeed = 0.9 + speedRatio * 0.85; 
        water.material.uniforms['time'].value += delta * (flowSpeed - 1.0); // Add extra flow
        const targetDistortion = THREE.MathUtils.clamp(3.4 + waveIntensity * 3.4 + (1 - speedRatio) * 1.1, 3.4, 7.2);
        water.material.uniforms['distortionScale'].value = THREE.MathUtils.lerp(
            water.material.uniforms['distortionScale'].value,
            targetDistortion,
            0.04
        );
    }

    if (boat) {
        // 4. Boat Physics (SPEEDBOAT REALISM)
        const timeVal = performance.now() / 1000;
        const maxSpeedMPS = CONFIG.MAX_SHIP_SPEED / 3.6;
        const speedFactor = Math.min(speedMPS / maxSpeedMPS, 1.0);
        
        // --- Float Height ---
        // Slow speed rides lower, fast speed planes a little higher.
        const targetLift = 1.08 + speedFactor * 0.46 - waveIntensity * 0.1; 
        
        // --- Bobbing ---
        // Low speed + low focus = rougher water and larger drift.
        const bobAmplitude = 0.16 + waveIntensity * 0.34 + (1.0 - speedFactor) * 0.08; 
        const bobFreq = 1.35 + waveIntensity * 1.6 + speedFactor * 2.1;
        const bobbing = Math.sin(timeVal * bobFreq) * bobAmplitude;
        const secondaryHeave = Math.sin(timeVal * 0.65 + 1.2) * (0.05 + waveIntensity * 0.08);
        
        const targetY = THREE.MathUtils.clamp(targetLift + bobbing + secondaryHeave, 0.88, 1.78);
        boat.position.y = THREE.MathUtils.lerp(boat.position.y, targetY, 0.1);

        // --- Roll ---
        const rollAmp = 0.02 + waveIntensity * 0.085 + (1.0 - speedFactor) * 0.025;
        const rollWobble =
            Math.sin(timeVal * 0.92) * rollAmp +
            Math.sin(timeVal * 1.9 + 0.8) * rollAmp * 0.32;
        
        boat.rotation.z = THREE.MathUtils.lerp(boat.rotation.z, rollWobble, 0.05);
        
        // --- Pitch ---
        // Faster speed keeps a mild bow-up posture, rough low-speed water increases pitch swing.
        const pitchCurve = Math.sin(speedFactor * Math.PI / 2) * 0.105 - waveIntensity * 0.012;
        const wavePitch = Math.cos(timeVal * bobFreq) * (0.014 + waveIntensity * 0.02);
        boat.rotation.x = THREE.MathUtils.lerp(boat.rotation.x, pitchCurve + wavePitch, 0.05);
        
        // 5. Camera Follow (Starboard rear quarter view)
        let screenOffsetX = 0;
        if (window.innerWidth < 1024) screenOffsetX = -4;
        if (window.innerWidth < 720) screenOffsetX = -8;

        const targetOffset = new THREE.Vector3(20 + screenOffsetX, 11, 36);
        const targetPos = boat.position.clone().add(targetOffset);
        camera.position.lerp(targetPos, 0.06); 
        
        // Keep the full hull inside frame while showing its right-rear side.
        const lookAtTarget = new THREE.Vector3(
            boat.position.x + 0.6 + screenOffsetX,
            boat.position.y + 2.8,
            boat.position.z - 1.2
        );
        controls.target.lerp(lookAtTarget, 0.06);
        controls.update(); 
        
        // 6. Rim Light Follow (Night Mode)
        if (rimLight) {
            // Position relative to boat: Behind (+Z) and Above (+Y)
            rimLight.position.copy(boat.position).add(new THREE.Vector3(0, 30, -50));
            rimLight.target.position.copy(boat.position);
        }
    }
    
    // Update Day/Night Cycle
    // updateDayNightCycle(); // DISABLED
    
    // Mixer update
    if (mixer) mixer.update(delta);
}
const uiContainer = document.getElementById('ui-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const displayUsername = document.getElementById('display-username');

// --- Initialization ---
// Note: initApp is called at the end of the file

function initApp() {
    console.log("Initializing App v1.4 (Routing Refactor)...");
    
    // Initialize Router
    ROUTER.init();
    updateModeStatusUI();
    updateModeSelectionHelper(
        'Choose Input',
        'Real EEG searches only after confirmation. Simulation uses local test data.'
    );

    // Remove Initial Loader (but keep it if we are going straight to game and it needs assets? No, just remove it here, and if game needs more, game will show its own)
    // User requested "Second waiting screen added after completion... otherwise user thinks it crashed".
    // This implies we should keep the loader until everything is ready.
    setTimeout(() => {
        const loader = document.getElementById('initial-loader');
        // Only hide if we are NOT going straight to game logic which might need it.
        // If hash is #game, initGameSession will handle hiding it after questions load.
        if (loader && window.location.hash !== '#game') {
             loader.style.opacity = '0';
             loader.style.transition = 'opacity 0.5s ease';
             setTimeout(() => {
                 loader.style.display = 'none';
             }, 500);
        }
    }, 500);

    try {
        setupLandingPage();
    } catch(e) { console.error("Error in setupLandingPage:", e); }
    
    try {
        initAudio();
    } catch(e) { console.error("Error in initAudio:", e); }

    try {
        setupAuthListeners();
    } catch(e) { console.error("Error in setupAuthListeners:", e); }

    try {
        setupLanguageListeners();
    } catch(e) { console.error("Error in setupLanguageListeners:", e); }

    try {
        setupThemeListeners();
    } catch(e) { console.error("Error in setupThemeListeners:", e); }

    try {
        setupGameListeners();
    } catch(e) { console.error("Error in setupGameListeners:", e); }

    try {
        setupDashboard();
    } catch(e) { console.error("Error in setupDashboard:", e); }
    
    // Check for saved lang
    const savedLang = localStorage.getItem('game_lang') || 'hk';
    switchLanguage(savedLang);

    // Check for saved user (simple mock session)
    const savedUser = localStorage.getItem('current_user');
    if (savedUser) {
        CONFIG.currentUser = savedUser;
        if(document.getElementById('username')) {
            document.getElementById('username').value = savedUser;
        }
        if(document.getElementById('display-username')) {
            document.getElementById('display-username').textContent = savedUser;
        }
    }
}

// --- Theme System ---
function setupThemeListeners() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;
    
    // Check saved theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        toggleBtn.textContent = '🌙';
    }
    
    // Initial Environment Set
    // Wait for scene to be ready (it might not be init yet if this runs before init3DScene)
    // But init3DScene calls setupEnvironment which uses defaults.
    // We should trigger a switch if needed after init.
    // REMOVED: Redundant and causes potential race conditions.
    // init3DScene now handles initial state instantly.
    // setTimeout(() => {
    //    if (scene) switchEnvironment(savedTheme === 'light' ? 'day' : 'night');
    // }, 1000);

    toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        toggleBtn.textContent = isLight ? '🌙' : '☀️';
        
        // Trigger 3D Environment Switch
        switchEnvironment(isLight ? 'day' : 'night');

        // Adjust BGM Volume
        if (SOUNDS.bgmNature) {
            SOUNDS.bgmNature.volume = isLight ? 0.6 : 0.2; // Louder in day, quieter at night
        }
    });
}

// --- Scroll to Reference Helper ---
window.scrollToRef = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        el.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
        setTimeout(() => {
            el.style.backgroundColor = 'transparent';
        }, 2000);
    }
};

// --- Dashboard Visualization (Real-like Data) ---
function setupDashboard() {
    // Note: The previous chart logic is now replaced by the static DataPanel in HTML
    // However, if we want to keep some charts as "Visual Decor" inside the cards or elsewhere,
    // we can re-enable them. For now, the user requested a COMPLETE OVERHAUL of the panel
    // to show "Detailed text + Exact Value".
    // So we will disable the old chart injection logic to avoid conflicts or empty divs if they are gone.
    
    const lineChart = document.querySelector('.line-chart');
    if (lineChart) {
        // ... (Old logic omitted for brevity, but won't run if element missing)
    }
}

// --- Auth System (Mock) ---
function setupAuthListeners() {
    // Switch between Login/Register
    document.getElementById('link-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    document.getElementById('link-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Login Action
    document.getElementById('btn-login').addEventListener('click', () => {
        const username = document.getElementById('username').value;
        if (username) {
            loginUser(username);
        } else {
            alert("Please enter a username");
        }
    });

    // Register Action
    document.getElementById('btn-register').addEventListener('click', () => {
        const username = document.getElementById('reg-username').value;
        if (username) {
            // In a real app, we would send to backend. Here we just "log them in"
            alert("Account created! Logging in...");
            loginUser(username);
        }
    });

    // Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        if(confirm("Are you sure you want to logout? Progress will be lost.")) {
            CONFIG.currentUser = null;
            localStorage.removeItem('current_user');
            
            leaveEEGMode();
            
            ROUTER.navigate('#home');
            window.location.reload(); // Reload to clear GL context
        }
    });
    
    // Back to Login from Difficulty
    const btnBackLogin = document.getElementById('btn-back-login');
    if (btnBackLogin) {
        btnBackLogin.addEventListener('click', () => {
            // Go back to mode selection
            document.getElementById('difficulty-screen').style.display = 'none';
            document.getElementById('mode-selection-screen').style.display = 'flex';
        });
    }

    // Mode Selection Actions
    const btnModeEeg = document.getElementById('btn-mode-eeg');
    const btnModeSim = document.getElementById('btn-mode-sim');
    const btnBackMode = document.getElementById('btn-back-mode');
    
    if (btnModeEeg) {
        btnModeEeg.addEventListener('click', async () => {
            try {
                const confirmed = window.confirm('確認頭帶已戴好、藍燈正常，並準備開始搜尋已配對的 MindWave Mobile 2？');
                if (!confirmed) return;

                selectedInputMode = 'eeg';
                eegModeActive = true;
                isSimulationMode = false;
                if (focusInterval) clearInterval(focusInterval);
                resetFocusTelemetry(true);
                updateModeSelectionHelper(
                    'Real EEG Armed',
                    'Searching your paired MindWave.'
                );
                setEEGConnectionState('searching', 'Searching your paired MindWave and opening the local EEG bridge...');
                updateSimulationHint();
                const connected = await connectBLE();
                if (connected) {
                    document.getElementById('mode-selection-screen').style.display = 'none';
                    document.getElementById('difficulty-screen').style.display = 'flex';
                    setEEGConnectionState('connected', 'Bridge connected. Waiting for live MindWave packets.');
                } else {
                    setEEGConnectionState('error', 'Unable to reach the local EEG bridge. Make sure the launcher is still running.');
                }
            } catch (err) {
                console.error("BLE Connection Error:", err);
                setEEGConnectionState('error', String(err?.message || err));
            }
        });
    }

    if (btnModeSim) {
        btnModeSim.addEventListener('click', () => {
            selectedInputMode = 'simulation';
            leaveEEGMode();
            selectedInputMode = 'simulation';
            updateModeSelectionHelper(
                'Simulation Ready',
                'Using local focus values.'
            );
            enterSimulationMode();
            document.getElementById('mode-selection-screen').style.display = 'none';
            document.getElementById('difficulty-screen').style.display = 'flex';
        });
    }

    if (btnBackMode) {
        btnBackMode.addEventListener('click', () => {
            leaveEEGMode();
            selectedInputMode = 'idle';
            CONFIG.currentUser = null;
            localStorage.removeItem('current_user');
            ROUTER.navigate('#login');
        });
    }

    // Restart
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
        btnRestart.addEventListener('click', () => {
            // Go back to difficulty select
            ROUTER.navigate('#login'); 
        });
    }

    // Back Home Result
    const btnHomeRes = document.getElementById('btn-home');
    if (btnHomeRes) {
        btnHomeRes.addEventListener('click', () => {
             leaveEEGMode();
             selectedInputMode = 'idle';
             ROUTER.navigate('#home');
        });
    }
}

function loginUser(username) {
    CONFIG.currentUser = username;
    localStorage.setItem('current_user', username);
    const displayUsernameEl = document.getElementById('display-username');
    if (displayUsernameEl) {
        displayUsernameEl.textContent = username;
    }
    
    // Refresh view to show difficulty
    ROUTER.handleRoute();
}

function showTransitionLoader(message = '') {
    const loader = document.getElementById('transition-loader');
    if (!loader) return;
    const textEl = loader.querySelector('.loading-text');
    if (textEl && message) textEl.textContent = message;
    loader.style.display = 'flex';
    requestAnimationFrame(() => {
        loader.style.opacity = '1';
    });
}

function hideTransitionLoader() {
    const loader = document.getElementById('transition-loader');
    if (!loader) return;
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
    }, 260);
}

// Expose to global scope for HTML onclick
window.startGameWithDifficulty = function(level) {
    CONFIG.difficulty = level;
    showTransitionLoader(langText('正在鎖定關卡與場景...', 'Locking session and scene...'));
    
    // Small delay to allow loader to render before heavy lifting
    requestAnimationFrame(() => {
        // Navigate to game route
        ROUTER.navigate('#game');
    });
}

function startCountdown(onComplete) {
    const overlay = document.getElementById('game-countdown');
    const text = document.getElementById('countdown-text');
    
    if (!overlay || !text) {
        if (onComplete) onComplete();
        return;
    }

    overlay.style.display = 'flex';
    
    // Disable transition for instant appearance (prevent "bright flash" of undimmed scene)
    overlay.style.transition = 'none';
    // Force reflow
    void overlay.offsetWidth;
    
    overlay.classList.add('active');
    
    // Restore transition for fade out later
    requestAnimationFrame(() => {
        overlay.style.transition = '';
    });

    let count = 3;
    animateCountdownStep(text, count, 1);

    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            animateCountdownStep(text, count, 1);
        } else if (count === 0) {
            animateCountdownStep(text, CONFIG.currentLang === 'hk' ? '開始' : 'GO!', 1.08);
        } else {
            clearInterval(interval);
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.style.display = 'none';
                text.style.transform = 'scale(0.92)';
                text.style.opacity = '1';
                text.style.filter = 'drop-shadow(0 0 18px rgba(56, 189, 248, 0.2))';
                if (onComplete) onComplete();
            }, 320);
        }
    }, 1000);
}

function animateCountdownStep(textNode, value, scale = 1) {
    if (!textNode) return;
    textNode.style.opacity = '0.12';
    textNode.style.transform = 'scale(0.82)';
    textNode.style.filter = 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.12))';
    requestAnimationFrame(() => {
        textNode.textContent = value;
        textNode.style.opacity = '1';
        textNode.style.transform = `scale(${scale})`;
        textNode.style.filter = 'drop-shadow(0 0 22px rgba(56, 189, 248, 0.26))';
    });
}

function setGamePresentationState(state = 'hidden') {
    const canvasContainer = document.getElementById('canvas-container');
    const uiContainer = document.getElementById('ui-container');

    if (!canvasContainer || !uiContainer) return;

    if (state === 'hidden') {
        canvasContainer.style.opacity = '0.14';
        canvasContainer.style.filter = 'blur(8px) saturate(0.7)';
        canvasContainer.style.transform = 'scale(1.012)';
        uiContainer.style.opacity = '0';
        uiContainer.style.transform = 'translateY(10px)';
        uiContainer.style.filter = 'blur(6px)';
        return;
    }

    if (state === 'countdown') {
        canvasContainer.style.opacity = '0.38';
        canvasContainer.style.filter = 'blur(2px) saturate(0.88)';
        canvasContainer.style.transform = 'scale(1.01)';
        uiContainer.style.opacity = '0.2';
        uiContainer.style.transform = 'translateY(4px)';
        uiContainer.style.filter = 'blur(2px)';
        return;
    }

    canvasContainer.style.opacity = '1';
    canvasContainer.style.filter = 'none';
    canvasContainer.style.transform = 'scale(1)';
    uiContainer.style.opacity = '1';
    uiContainer.style.transform = 'translateY(0)';
    uiContainer.style.filter = 'none';
}

function attachRendererToCanvasHost() {
    const canvasHost = document.getElementById('canvas-container');
    if (!canvasHost || !renderer?.domElement) return false;

    if (renderer.domElement.parentElement !== canvasHost) {
        if (renderer.domElement.parentElement) {
            renderer.domElement.parentElement.removeChild(renderer.domElement);
        }
        if (canvasHost.firstElementChild && canvasHost.firstElementChild !== renderer.domElement) {
            canvasHost.innerHTML = '';
        }
        canvasHost.appendChild(renderer.domElement);
    }

    onWindowResize();

    return Boolean(
        canvasHost.contains(renderer.domElement) &&
        renderer.domElement.width > 0 &&
        renderer.domElement.height > 0
    );
}

function initGameSession() {
    console.log("Starting Game Session...");
    const sessionId = ++activeGameSessionId;
    CONFIG.score = 0;
    CONFIG.streak = 0;
    CONFIG.wrongAnswers = [];
    CONFIG.totalDistance = 0;
    CONFIG.accumulatedPlayTime = 0;
    CONFIG.isPaused = false;
    currentQuestionIndex = 0;
    questionBank = [];
    isWaitingForQuestions = false;
    isFetchingQuestion = false;
    lastFetchTime = 0;
    fallbackQuestionCursor = loadFallbackQuestionCursor();
    trainingAnalytics = createTrainingAnalytics();
    // Teach the core mapping as play begins (after the entry countdown).
    setTimeout(showOnboardingCue, 3500);
    // Personalize thresholds from recent history (resolves within the first
    // moments of play; defaults apply until then and for new players).
    resolveAdaptiveFocusTraining().catch(() => {});
    hideBreathingPrompt();
    hideBreathingIntervention();
    updateLoadingStatus(
        isTrainingMode()
            ? langText('正在校準專注訓練場景與感測流程...', 'Calibrating the focus training scene and sensors...')
            : I18N[CONFIG.currentLang].preparing_game
    );

    // Re-attach the existing WebGL canvas when the SPA remounts the game page.
    if (scene && renderer?.domElement) {
        attachRendererToCanvasHost();
    }
    
    // Reset 3D Positions for new game
    if (boat) boat.position.set(0, 0, 0);
    if (water) water.position.z = 0;
    if (camera) camera.position.set(0, 20, 44);
    if (controls) controls.target.set(0, 0, 0);
    
    updateStreakDisplay();
    
    if (selectedInputMode === 'simulation' && typeof enterSimulationMode === 'function') {
        enterSimulationMode();
    } else if (selectedInputMode === 'eeg') {
        isSimulationMode = false;
        eegModeActive = true;
        updateSimulationHint();
        setEEGConnectionState(
            isConnected ? 'connected' : 'warning',
            isConnected
                ? langText('Bridge 已連接，等待即時腦波封包。', 'Bridge connected. Waiting for live MindWave packets.')
                : langText('已選擇真實 EEG，等待 bridge 與即時訊號。', 'Real EEG selected. Waiting for bridge and live signal.')
        );
    } else {
        isSimulationMode = false;
        updateSimulationHint();
        updateModeStatusUI();
    }
    
    // Reset Score UI
    applySessionModeUI();
    document.getElementById('distance-value').textContent = "0.0 m";
    document.getElementById('play-time-value').textContent = "00:00";
    
    if (startupTimeoutId) {
        clearTimeout(startupTimeoutId);
        startupTimeoutId = null;
    }
    
    // Initial Hint Check
    updateSimulationHint();

    // Init 3D Scene if not already done
    if (!scene) {
        let isClassicName = false;
        try {
            init3DScene();
        } catch (e) {
            console.error("Critical: init3DScene failed", e);
            alert("3D Scene Init Error: " + e.message);
            // We might still want to proceed or stop?
            // If scene is broken, game won't work.
            // But let's let it fall through to the Promise logic which might try to start anyway.
        }
        // Use Precision Loop
        if (typeof gameLoop !== 'undefined') {
            gameLoop.start();
        } else {
            animate();
        }
    } else {
        // If scene exists, just ensure game loop is running
        if (typeof gameLoop !== 'undefined' && !gameLoop.isRunning) {
            gameLoop.start();
        }
    }
    
    setGamePresentationState('hidden');

    showTransitionLoader(langText('正在校準場景、題庫與渲染品質...', 'Calibrating scene, challenge set, and render quality...'));

    // Initial Load: keep question panel hidden until countdown finishes
    const qPanel = document.getElementById('question-panel');
    qPanel.style.display = 'none';
    const qHeader = document.getElementById('question-header');
    qHeader.textContent = I18N[CONFIG.currentLang].game_question_title;
    document.getElementById('question-text').textContent = "";
    document.getElementById('question-options').innerHTML = "";
    
    // Challenge mode waits for its first playable question batch; training mode starts immediately.
    const initialQuestionPromise = shouldUseQuestionFlow()
        ? fetchBatchQuestions(INITIAL_PLAYABLE_QUESTIONS, true)
        : Promise.resolve();

    const coreAssetPromise = typeof assetsLoadedPromise !== 'undefined'
        ? assetsLoadedPromise
        : (typeof boatLoadedPromise !== 'undefined' ? boatLoadedPromise : Promise.resolve());

    Promise.allSettled([coreAssetPromise, initialQuestionPromise]).then(() => {
        if (sessionId !== activeGameSessionId) return;
        // 1. Ensure boat exists if it failed
        if (!boat) {
            console.warn("Boat missing after timeout. Creating fallback.");
            boat = createFallbackBoat();
            boat.position.y = -0.35;
            scene.add(boat);
        }

        attachRendererToCanvasHost();
        const canvasHost = document.getElementById('canvas-container');
        const hasRenderableScene = Boolean(
            scene &&
            camera &&
            renderer &&
            renderer.domElement &&
            canvasHost &&
            canvasHost.contains(renderer.domElement) &&
            renderer.domElement.width > 0 &&
            renderer.domElement.height > 0
        );

        if (!hasRenderableScene) {
            handleStartupFailure(langText('場景初始化失敗，請重新選擇輸入模式。', 'Scene initialization failed. Please choose the input mode again.'));
            return;
        }
        
        // 2. Ensure questions exist for the first playable frame after AI had a chance to respond
        if (shouldUseQuestionFlow() && questionBank.length === 0) {
            console.warn("Questions not ready yet. Using local starter questions.");
            questionBank = getFallbackQuestions(INITIAL_PLAYABLE_QUESTIONS);
            currentQuestionIndex = 0;
        }

        // 3. Force Camera & Controls to Game Position (Prevent Fly-in glitch)
        // MOVED BEFORE WARM-UP to ensure warm-up frame is correct
        if (boat && camera && controls) {
             let screenOffsetX = 0;
             if (window.innerWidth < 1024) screenOffsetX = -4;
             if (window.innerWidth < 720) screenOffsetX = -8;

             const targetOffset = new THREE.Vector3(20 + screenOffsetX, 11, 36); 
             const targetPos = boat.position.clone().add(targetOffset);
             camera.position.copy(targetPos);
             
             const lookAtTarget = new THREE.Vector3(
                boat.position.x + 0.6 + screenOffsetX,
                boat.position.y + 2.8,
                boat.position.z - 1.2
            );
            controls.target.copy(lookAtTarget);
            controls.update();
        }

        // 4. PRE-COMPILE SHADERS & GPU WARM-UP
        if (renderer && scene && camera) {
            try {
                console.log("Pre-compiling shaders...");
                renderer.compile(scene, camera);
                
                // GPU WARM-UP: Render a transparent frame to force texture upload
                const originalClearAlpha = renderer.getClearAlpha();
                renderer.setClearAlpha(0); // Transparent background
                renderer.render(scene, camera);
                renderer.setClearAlpha(originalClearAlpha); // Restore
                console.log("GPU Warm-up complete.");
            } catch (e) {
                console.warn("GPU Warm-up error (non-fatal):", e);
            }
        }

        // 5. Keep loader visible until countdown starts, then reveal scene
        const iLoader = document.getElementById('initial-loader');
        if (iLoader) {
             iLoader.style.opacity = '0';
             setTimeout(() => { iLoader.style.display = 'none'; }, 500);
        }

        // 6. Give GPU one more frame to settle before removing the loader
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                hideTransitionLoader();
                setGamePresentationState('countdown');

                startCountdown(() => {
                    if (sessionId !== activeGameSessionId) return;
                    setGamePresentationState('active');
                    startBGM();
                    CONFIG.gameStartTime = performance.now();
                    isGameActive = true; 
                    if (shouldUseQuestionFlow()) {
                        loadQuestionFromBank();
                    }
                    if (startupTimeoutId) {
                        clearTimeout(startupTimeoutId);
                        startupTimeoutId = null;
                    }
                    
                    // After game starts, keep filling the bank in background if needed.
                    if (shouldUseQuestionFlow() && questionBank.length < TOTAL_QUESTIONS) {
                        fetchBatchQuestions(TOTAL_QUESTIONS - questionBank.length, false);
                    }
                });
            });
        });
    }).catch(err => {
        if (sessionId !== activeGameSessionId) return;
        console.error("Critical Error during game start:", err);
        handleStartupFailure(err?.message || langText('遊戲載入失敗，請重新選擇模式。', 'Game failed to load. Please choose the mode again.'));
        
        // Ensure loaders are hidden on error too
        const tLoader = document.getElementById('transition-loader');
        if (tLoader) {
            tLoader.innerHTML = `
                <div style="color: #ff4444; padding: 20px; text-align: center;">
                    <h2>${I18N[CONFIG.currentLang].loading_failed}</h2>
                    <p>${err.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">${I18N[CONFIG.currentLang].retry}</button>
                </div>
            `;
        }
        
        const iLoader = document.getElementById('initial-loader');
        if (iLoader) iLoader.style.display = 'none'; // Hide initial loader so transition loader (with error) is visible? 
        // Or show error on initial loader?
        
        if (iLoader && iLoader.style.display !== 'none') {
             iLoader.innerHTML = `
                <div style="color: #ff4444; padding: 20px; text-align: center;">
                    <h2>Game Load Failed</h2>
                    <p>${err.message}</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">Retry</button>
                </div>
            `;
        }

    });
}

// --- Language System ---
function setupLanguageListeners() {
    const langHkButton = document.getElementById('lang-hk');
    const langEnButton = document.getElementById('lang-en');
    if (langHkButton) langHkButton.addEventListener('click', () => switchLanguage('hk'));
    if (langEnButton) langEnButton.addEventListener('click', () => switchLanguage('en'));
}

function switchLanguage(lang) {
    CONFIG.currentLang = lang;
    localStorage.setItem('game_lang', lang);
    document.body.dataset.lang = lang;
    document.documentElement.lang = lang === 'hk' ? 'zh-HK' : 'en';

    // Update Buttons
    const langHkButton = document.getElementById('lang-hk');
    const langEnButton = document.getElementById('lang-en');
    if (langHkButton) langHkButton.classList.toggle('active', lang === 'hk');
    if (langEnButton) langEnButton.classList.toggle('active', lang === 'en');

    // Update Text Content
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (I18N[lang][key]) {
            el.textContent = I18N[lang][key];
        }
    });
}

// --- Game Logic & AI ---
function setupGameListeners() {
    // Slider removed as requested.
    // Default state: No EEG connected -> Focus disabled, Speed 55km/h
    focusLevel = 0; 
    updateSpeedVisuals();
    
    // Disable Focus Display initially
    document.getElementById('focus-value').textContent = "--";
    document.getElementById('focus-bar').style.width = '0%';
    
    // Setup EEG Connect Button
    const btnConnect = document.getElementById('btn-connect-eeg');
    if(btnConnect) {
        btnConnect.addEventListener('click', connectBLE);
    }
}

let focusInterval;

function renderFocusTelemetry(level = 0) {
    const safeLevel = THREE.MathUtils.clamp(Math.round(level), 0, 100);
    const focusValEl = document.getElementById('focus-value');
    if (focusValEl) {
        focusValEl.textContent = `${safeLevel}%`;
        focusValEl.dataset.boost = String(safeLevel >= 100);
    }

    // Focus-zone band: read the STATE, not just the number.
    const zoneChip = document.getElementById('focus-zone-chip');
    if (zoneChip) {
        zoneChip.style.display = '';
        let zoneClass = 'zone-stable';
        let zoneText = langText('穩定', 'Stable');
        if (safeLevel < FOCUS_TRAINING.lowThreshold) {
            zoneClass = 'zone-low';
            zoneText = langText('分心', 'Distracted');
        } else if (safeLevel > 80) {
            zoneClass = 'zone-flow';
            zoneText = langText('心流', 'Flow');
        }
        if (zoneChip.className !== zoneClass) zoneChip.className = zoneClass;
        if (zoneChip.textContent !== zoneText) zoneChip.textContent = zoneText;
    }
    const focusIndicatorEl = document.getElementById('focus-indicator');
    if (focusIndicatorEl) {
        focusIndicatorEl.dataset.boost = String(safeLevel >= 100);
    }

    const focusBarEl = document.getElementById('focus-bar');
    if (focusBarEl) applyTelemetryBarState('focus', safeLevel);
}

function renderSpeedTelemetry(speedKmh = 0) {
    const safeSpeed = Math.max(0, Number(speedKmh) || 0);
    const speedValEl = document.getElementById('speed-value');
    const hasBoostTone = getEffectiveFocusLevel() >= 100;
    if (speedValEl) {
        updateDigitDisplay(speedValEl, `${Math.round(safeSpeed)} km/h`);
        speedValEl.dataset.boost = String(hasBoostTone);
    }

    const speedBarEl = document.getElementById('speed-bar');
    if (speedBarEl) {
        const maxSpeed = CONFIG.MAX_SHIP_SPEED;
        const speedPercent = THREE.MathUtils.clamp((safeSpeed / maxSpeed) * 100, 0, 100);
        applyTelemetryBarState('speed', speedPercent);
    }
}

function applyTelemetryBarState(kind, percent = 0) {
    const barEl = document.getElementById(kind === 'focus' ? 'focus-bar' : 'speed-bar');
    if (!barEl) return;

    const clamped = THREE.MathUtils.clamp(percent, 0, 100);
    const state = HUD_GRADIENTS[kind].find((item) => clamped <= item.max) || HUD_GRADIENTS[kind][HUD_GRADIENTS[kind].length - 1];
    barEl.style.width = `${clamped}%`;
    
    // Create layers for smooth crossfade if they don't exist
    let bgLayer = barEl.querySelector('.bg-layer');
    let nextBgLayer = barEl.querySelector('.next-bg-layer');
    
    if (!bgLayer) {
        barEl.style.position = 'relative';
        barEl.style.background = state.gradient;
        barEl.style.backgroundImage = state.gradient;
        barEl.style.overflow = 'hidden';
        barEl.style.isolation = 'isolate';
        barEl.style.zIndex = '0';
        
        bgLayer = document.createElement('div');
        bgLayer.className = 'bg-layer';
        bgLayer.style.position = 'absolute';
        bgLayer.style.inset = '0';
        bgLayer.style.borderRadius = 'inherit';
        bgLayer.style.zIndex = '0';
        bgLayer.style.background = state.gradient;
        bgLayer.style.pointerEvents = 'none';
        barEl.appendChild(bgLayer);
        
        nextBgLayer = document.createElement('div');
        nextBgLayer.className = 'next-bg-layer';
        nextBgLayer.style.position = 'absolute';
        nextBgLayer.style.inset = '0';
        nextBgLayer.style.borderRadius = 'inherit';
        nextBgLayer.style.zIndex = '1';
        nextBgLayer.style.opacity = '0';
        nextBgLayer.style.transition = 'opacity 0.6s ease';
        nextBgLayer.style.pointerEvents = 'none';
        barEl.appendChild(nextBgLayer);
        
        barEl.dataset.currentGradient = state.gradient;
    }

    barEl.style.background = state.gradient;
    barEl.style.backgroundImage = state.gradient;
    if (bgLayer) bgLayer.style.zIndex = '0';
    if (nextBgLayer) nextBgLayer.style.zIndex = '1';

    if (barEl.dataset.currentGradient !== state.gradient) {
        // Crossfade to new gradient
        nextBgLayer.style.background = state.gradient;
        // Force reflow
        void nextBgLayer.offsetWidth;
        nextBgLayer.style.opacity = '1';
        
        // After transition, swap and reset
        setTimeout(() => {
            bgLayer.style.background = state.gradient;
            nextBgLayer.style.opacity = '0';
            barEl.dataset.currentGradient = state.gradient;
        }, 600);
    }
    
    barEl.style.boxShadow = state.glow;
    barEl.dataset.tone = state.tone;
}

function resetFocusTelemetry(usePlaceholder = false) {
        focusLevel = 0;
        targetSpeed = 0;
        boatSpeed = 0;
        isHeadsetConnected = false;
        hasLiveEEGData = false;
        trainingAnalytics.promptActive = false;
        trainingAnalytics.interventionActive = false;
        trainingAnalytics.boostActive = false;
        trainingAnalytics.boostEndsAt = 0;
        hideBreathingPrompt();
        hideBreathingIntervention();

        const focusValEl = document.getElementById('focus-value');
        if (focusValEl) {
            focusValEl.textContent = usePlaceholder ? '--' : '0%';
            focusValEl.dataset.boost = 'false';
        }
        const focusIndicatorEl = document.getElementById('focus-indicator');
        if (focusIndicatorEl) focusIndicatorEl.dataset.boost = 'false';
        const speedValEl = document.getElementById('speed-value');
        if (speedValEl) speedValEl.dataset.boost = 'false';

        const focusBarEl = document.getElementById('focus-bar');
        if (focusBarEl) applyTelemetryBarState('focus', 0);

        renderSpeedTelemetry(0);
    }

function startFocusSimulation() {
        if(focusInterval) clearInterval(focusInterval);
        
        // Only run if in simulation mode
        if (!isSimulationMode) return;
        
        console.log("Starting Focus Simulation...");
        resetFocusTelemetry(false);
        const useFallbackProfile = CONFIG.focusSource !== 'camera-ready';
        focusLevel = useFallbackProfile ? 62 : 58;
        let phase = 0;
        let segmentTicks = 0;
        let profile = {
            baseline: 60,
            amplitude: 6,
            jitter: 3,
            detail: langText('模擬校準中，訊號逐步穩定。', 'Simulation calibrating. Signal is stabilizing.')
        };

        const createFallbackProfile = () => {
            const isHighFocus = Math.random() < SIMULATION_STABLE_SEGMENT_PROBABILITY;
            if (isHighFocus) {
                return {
                    baseline: THREE.MathUtils.randFloat(64, 86),
                    amplitude: THREE.MathUtils.randFloat(4.2, 7.2),
                    jitter: THREE.MathUtils.randFloat(1.4, 3.0),
                    duration: Math.round(THREE.MathUtils.randFloat(5, 11)),
                    detail: langText('未授權相機，正以 20/80 fallback 模擬穩定專注片段。', 'Camera not allowed. Running the 20/80 fallback in a stable focus segment.')
                };
            }

            return {
                baseline: THREE.MathUtils.randFloat(34, 52),
                amplitude: THREE.MathUtils.randFloat(4.5, 8.0),
                jitter: THREE.MathUtils.randFloat(2.4, 4.2),
                duration: Math.round(THREE.MathUtils.randFloat(2, 4)),
                detail: langText('未授權相機，正以 20/80 fallback 模擬短暫失焦片段。', 'Camera not allowed. Running the 20/80 fallback in a short distraction segment.')
            };
        };

        const nextProfile = () => {
            if (useFallbackProfile) {
                profile = createFallbackProfile();
                segmentTicks = profile.duration;
                setEEGConnectionState('simulation', profile.detail);
            } else {
                setEEGConnectionState('simulation', langText('相機預覽已準備，正在透過鏡頭觀察專注度。', 'Camera preview ready. Monitoring focus via camera.'));
            }
        };

        nextProfile();

        focusInterval = setInterval(() => {
            if (useFallbackProfile) {
                if (segmentTicks <= 0) nextProfile();
                segmentTicks -= 1;
                phase += 0.38;
                const wave = Math.sin(phase) * profile.amplitude;
                const drift = Math.sin(phase * 0.42) * 3.5;
                const jitter = (Math.random() - 0.5) * profile.jitter * 2;
                focusLevel = THREE.MathUtils.clamp(profile.baseline + wave + drift + jitter, 0, 100);
            } else {
                const cameraTracking = getCameraTrackingStatus();
                if (!cameraTracking.streamActive || !cameraTracking.modelReady || !cameraTracking.isPredicting) {
                    focusLevel = 0;
                    setEEGConnectionState('warning', langText('相機串流未持續運行，計時將保持暫停。', 'Camera stream is not running continuously. The timer stays paused.'));
                } else if (!cameraTracking.hasFace && !cameraTracking.faceRecentlySeen) {
                    focusLevel = 0;
                    setEEGConnectionState('warning', langText('未偵測到人臉，計時已暫停，請回到鏡頭範圍。', 'No face detected. Timer paused. Please return to the camera frame.'));
                } else if (!cameraTracking.hasFace && cameraTracking.faceRecentlySeen) {
                    focusLevel = Math.max(24, cameraTracking.focusScore || focusLevel || 0);
                    setEEGConnectionState('simulation', langText('鏡頭正在重新鎖定人臉，專注度暫時平滑維持。', 'Camera is reacquiring your face. Focus is being smoothed temporarily.'));
                } else {
                    const cameraScore = getCameraFocusScore();
                    const centeredBonus = (cameraTracking.faceCenteredness || 0) * 8;
                    const presenceBonus = (cameraTracking.facePresenceConfidence || 0) * 4;
                    focusLevel = THREE.MathUtils.clamp(cameraScore + centeredBonus + presenceBonus, 0, 100);
                    setEEGConnectionState('simulation', langText('相機鏡頭正持續觀察專注狀態。', 'Camera is actively monitoring focus state.'));
                }
            }
            updateFocusFromEEG(Math.round(focusLevel));
        }, 1000); // Update every second like real EEG
    }

// Target speed for smooth transition
let targetSpeed = 0; 
let speedUpdateInterval;

function updateSpeedVisuals() {
    // Logic updated to match user requirements:
    // 1. If Connected or Manual Mode: Map Focus 0-100 to Speed 0-MAX
    // 2. If Not Connected: Speed = 0
    
    if (CONFIG.isPaused) {
        targetSpeed = 0;
        boatSpeed = 0;
        renderSpeedTelemetry(0);
        return;
    }

    const canDriveWithEEG = selectedInputMode === 'eeg' && isHeadsetConnected && hasLiveEEGData;
    if (canDriveWithEEG || isSimulationMode) {
        // Connected: Speed 0 - MAX based on focus
        // Focus 0-100 -> Speed 0-MAX
        // Req: 0% = 0.
        const maxSpeed = CONFIG.MAX_SHIP_SPEED;
        const normalizedFocus = THREE.MathUtils.clamp(getEffectiveFocusLevel() / 100, 0, 1);
        targetSpeed = Math.pow(normalizedFocus, 1.18) * maxSpeed;
        boatSpeed = THREE.MathUtils.lerp(boatSpeed, targetSpeed, isSimulationMode ? 0.085 : 0.07);
    } else {
        // Not Connected: Decelerate to 0
        targetSpeed = 0;
        boatSpeed = THREE.MathUtils.lerp(boatSpeed, targetSpeed, 0.045);
    }
    
    // Update UI Text/Bar
    renderSpeedTelemetry(boatSpeed);
}

function loadQuestionFromBank() {
    if (!shouldUseQuestionFlow()) {
        showResults();
        return;
    }
    if (currentQuestionIndex < questionBank.length) {
        isWaitingForQuestions = false;
        renderPuzzle(questionBank[currentQuestionIndex]);
    } else if (questionBank.length < TOTAL_QUESTIONS) {
        // Waiting for background fetch
        isWaitingForQuestions = true;
        const qPanel = document.getElementById('question-panel');
        const qHeader = document.getElementById('question-header');
        const qText = document.getElementById('question-text');
        const qOptions = document.getElementById('question-options');
        
        qPanel.style.display = 'block';
        qHeader.textContent = I18N[CONFIG.currentLang].game_question_title;
        qText.textContent = langText('正在補充更多題目...', 'Loading more questions...');
        qOptions.innerHTML = '<div style="text-align:center; padding: 20px;">⏳</div>'; 

        const needed = TOTAL_QUESTIONS - questionBank.length;
        if (needed > 0) {
            fetchBatchQuestions(needed, false);
        }
    } else {
        // Game Over - Show Results
        showResults();
    }
}

function renderResults() {
    const finalScore = CONFIG.score;
    const totalQ = TOTAL_QUESTIONS;
    const accuracy = (finalScore / totalQ) * 100;
    const focusedRatio = CONFIG.accumulatedPlayTime > 0
        ? (trainingAnalytics.focusedTimeMs / CONFIG.accumulatedPlayTime) * 100
        : 0;
    const averageRecoveryMs = trainingAnalytics.recoveryDurationsMs.length > 0
        ? trainingAnalytics.recoveryDurationsMs.reduce((sum, value) => sum + value, 0) / trainingAnalytics.recoveryDurationsMs.length
        : 0;
    
    CONFIG.gameEndTime = performance.now();
    const totalTimeMs = CONFIG.gameEndTime - CONFIG.gameStartTime;
    hideBreathingPrompt();
    hideBreathingIntervention();
    
    // Save Best
    const scoreMetric = isTrainingMode() ? focusedRatio : accuracy;
    const { isNewDist, isNewAcc, isNewTime } = GAME_STATS.saveBest(CONFIG.totalDistance, scoreMetric, totalTimeMs);
    const bests = GAME_STATS.getBest();

    // Within-session before/after: first half vs second half of the focus timeline.
    const samples = trainingAnalytics.focusSamples;
    const mid = Math.floor(samples.length / 2);
    const avgOf = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
    const firstHalfFocus = avgOf(samples.slice(0, mid));
    const secondHalfFocus = avgOf(samples.slice(mid));

    // Persist this session into cross-session history (cloud when signed in,
    // localStorage otherwise). Fire-and-forget: results must render even if
    // storage fails.
    lastSessionSummary = {
        testMode: isTrainingMode() ? 'training' : 'challenge',
        difficulty: CONFIG.difficulty,
        focusedRatio: Math.round(focusedRatio * 10) / 10,
        avgRecoveryMs: Math.round(averageRecoveryMs),
        accuracy: isTrainingMode() ? null : Math.round(accuracy * 10) / 10,
        distance: Math.round(CONFIG.totalDistance * 10) / 10,
        durationMs: Math.round(totalTimeMs),
        firstHalfFocus: Math.round(firstHalfFocus * 10) / 10,
        secondHalfFocus: Math.round(secondHalfFocus * 10) / 10,
        breathingCount: trainingAnalytics.interventionCount,
        adaptiveThresholdUsed: FOCUS_TRAINING.recoveryThreshold
    };
    appendSessionSummary(lastSessionSummary).catch(() => {});
    
    // Update UI
    document.getElementById('res-distance').textContent = CONFIG.totalDistance.toFixed(1) + " m";
    document.getElementById('res-accuracy').textContent = isTrainingMode()
        ? langText('專注訓練', 'Attention Training')
        : `${accuracy.toFixed(0)}%`;
    document.getElementById('res-time').textContent = GAME_STATS.formatTime(totalTimeMs);
    const focusRateEl = document.getElementById('res-focus-rate');
    const recoveryEl = document.getElementById('res-recovery-time');
    const breathingCountEl = document.getElementById('res-breathing-count');
    const bestAccuracyEl = document.getElementById('best-accuracy');
    if (focusRateEl) focusRateEl.textContent = `${Math.round(focusedRatio)}%`;
    if (recoveryEl) recoveryEl.textContent = formatAverageRecovery(averageRecoveryMs);
    if (breathingCountEl) breathingCountEl.textContent = String(trainingAnalytics.interventionCount);
    
    document.getElementById('best-distance').textContent = `${I18N[CONFIG.currentLang].best_label}: ${bests.distance} m ${isNewDist ? '🔥' : ''}`;
    if (bestAccuracyEl) {
        if (isTrainingMode()) {
            bestAccuracyEl.textContent = '';
            bestAccuracyEl.classList.add('is-hidden');
        } else {
            bestAccuracyEl.textContent = `${I18N[CONFIG.currentLang].best_label}: ${bests.accuracy} % ${isNewAcc ? '🔥' : ''}`;
            bestAccuracyEl.classList.remove('is-hidden');
        }
    }
    document.getElementById('best-time').textContent = `${I18N[CONFIG.currentLang].best_label}: ${GAME_STATS.formatTime(bests.time)} ${isNewTime ? '🔥' : ''}`;
    
    // Render Wrong Answers List
    const list = document.getElementById('wrong-answers-list');
    list.innerHTML = '';
    
    if (isTrainingMode()) {
        list.innerHTML = `<div style="text-align:center; color: #93c5fd; font-size: 1.05em;">${langText('此模式不設答題，目標是穩定維持專注並在分心後盡快拉回。', 'This mode has no quiz review. The goal is to sustain stable focus and recover quickly after distraction.')}</div>`;
    } else if (CONFIG.wrongAnswers.length === 0) {
        list.innerHTML = `<div style="text-align:center; color: #16a34a; font-size: 1.05em;">${langText('全對完成，專注表現非常穩定。', 'Perfect run. Your focus stayed very stable.')}</div>`;
    } else {
        CONFIG.wrongAnswers.forEach(item => {
            const div = document.createElement('div');
            div.className = 'wrong-answer-item';
            div.innerHTML = `
                <h4>Q: ${item.question}</h4>
                <p><strong>${langText('你的答案', 'Your Answer')}:</strong> <span style="color:#dc2626">${item.userChoice}</span></p>
                <p><strong>${I18N[CONFIG.currentLang].correct_answer}:</strong> <span style="color:#16a34a">${item.correctChoice}</span></p>
                <p class="explanation-row"><strong>${I18N[CONFIG.currentLang].explanation}:</strong> <span class="explanation-text">${item.explanation || I18N[CONFIG.currentLang].no_explanation}</span></p>
            `;
            list.appendChild(div);
        });
    }
}

// --- Results Dashboard renderers (focus curve, halves compare, trend) ---

function svgEscapeNumber(value) {
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}

// Inline SVG focus curve for this session (no chart library, theme-aware via
// currentColor + CSS classes).
function renderSessionDashboard() {
    const curveHost = document.getElementById('dash-focus-curve');
    const halvesHost = document.getElementById('dash-halves');
    const summary = lastSessionSummary;
    const samples = trainingAnalytics.focusSamples;

    if (curveHost) {
        if (samples.length < 5) {
            curveHost.innerHTML = `<p class="dash-empty">${langText('本局時間太短，未足以繪製專注曲線。', 'This session was too short to draw a focus curve.')}</p>`;
        } else {
            const w = 600;
            const h = 160;
            const pad = 8;
            const stepX = (w - pad * 2) / Math.max(1, samples.length - 1);
            const points = samples
                .map((v, i) => `${svgEscapeNumber(pad + i * stepX)},${svgEscapeNumber(h - pad - (Math.max(0, Math.min(100, v)) / 100) * (h - pad * 2))}`)
                .join(' ');
            const stableY = svgEscapeNumber(h - pad - (FOCUS_TRAINING.stableThreshold / 100) * (h - pad * 2));
            curveHost.innerHTML = `
                <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="dash-curve-svg" role="img" aria-label="focus curve">
                    <line x1="${pad}" y1="${stableY}" x2="${w - pad}" y2="${stableY}" class="dash-curve-threshold" />
                    <polyline points="${points}" class="dash-curve-line" fill="none" />
                </svg>
                <div class="dash-curve-legend">
                    <span class="dash-legend-line"></span>${langText('專注值', 'Focus')}
                    <span class="dash-legend-threshold"></span>${langText('穩定線', 'Stable line')} (${FOCUS_TRAINING.stableThreshold})
                </div>`;
        }
    }

    if (halvesHost && summary) {
        const first = summary.firstHalfFocus || 0;
        const second = summary.secondHalfFocus || 0;
        const delta = second - first;
        let verdictText = langText('局內保持平穩', 'Held steady during the session');
        let verdictClass = 'is-flat';
        if (delta >= 3) { verdictText = langText('局內有進步', 'Improved during the session'); verdictClass = 'is-up'; }
        else if (delta <= -3) { verdictText = langText('局內有回落', 'Dropped during the session'); verdictClass = 'is-down'; }
        const arrow = delta >= 3 ? '↑' : delta <= -3 ? '↓' : '→';
        halvesHost.innerHTML = `
            <div class="dash-halves-grid">
                <div class="dash-half-card">
                    <span class="dash-half-label">${langText('前半段', 'First Half')}</span>
                    <span class="dash-half-value">${first.toFixed(1)}</span>
                </div>
                <div class="dash-half-arrow ${verdictClass}">${arrow}</div>
                <div class="dash-half-card">
                    <span class="dash-half-label">${langText('後半段', 'Second Half')}</span>
                    <span class="dash-half-value">${second.toFixed(1)}</span>
                </div>
            </div>
            <p class="dash-half-verdict ${verdictClass}">${verdictText} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})</p>`;
    }
}

// Trend across recent sessions: focus-stability bars + recovery-time bars.
async function renderHistoryTrend() {
    const host = document.getElementById('dash-history-trend');
    if (!host) return;

    let history = [];
    try {
        history = await getSessionHistory(10);
    } catch (e) {
        history = [];
    }

    if (!Array.isArray(history) || history.length < 2) {
        host.innerHTML = `<p class="dash-empty">${langText('多玩幾局就會解鎖你嘅進度趨勢圖。', 'Play a few more sessions to unlock your trend chart.')}</p>`;
        return;
    }

    const bars = (values, formatter, invert = false) => {
        const max = Math.max(...values, 1);
        return values.map((v, i) => {
            const ratio = Math.max(0.06, v / max);
            const isLatest = i === values.length - 1;
            // invert=true means lower is better (recovery time)
            const goodness = invert ? 1 - ratio : ratio;
            return `<div class="dash-bar-wrap" title="${formatter(v)}">
                <div class="dash-bar ${isLatest ? 'is-latest' : ''} ${goodness > 0.66 ? 'is-good' : goodness < 0.33 ? 'is-weak' : ''}" style="height:${Math.round(ratio * 100)}%"></div>
            </div>`;
        }).join('');
    };

    const focusValues = history.map((s) => Math.max(0, Math.min(100, s.focusedRatio || 0)));
    const recoveryValues = history.map((s) => Math.max(0, (s.avgRecoveryMs || 0) / 1000));

    // Headline: is the player recovering faster than their own recent average?
    let headline = '';
    const withRecovery = recoveryValues.filter((v) => v > 0);
    if (withRecovery.length >= 2) {
        const latest = recoveryValues[recoveryValues.length - 1];
        const previous = recoveryValues.slice(0, -1).filter((v) => v > 0);
        const prevAvg = previous.length ? previous.reduce((s, v) => s + v, 0) / previous.length : 0;
        if (latest > 0 && prevAvg > 0) {
            const diffPct = ((prevAvg - latest) / prevAvg) * 100;
            if (diffPct >= 5) {
                headline = `<p class="dash-recovery-headline is-up">▲ ${langText(
                    `分心後拉返專注快咗 ${diffPct.toFixed(0)}%（對比你之前幾局平均）`,
                    `You recover from distraction ${diffPct.toFixed(0)}% faster than your recent average`
                )}</p>`;
            } else if (diffPct <= -5) {
                headline = `<p class="dash-recovery-headline is-down">▼ ${langText(
                    `今局恢復速度慢過你之前平均 ${Math.abs(diffPct).toFixed(0)}%，好正常，繼續練`,
                    `Recovery was ${Math.abs(diffPct).toFixed(0)}% slower than your recent average — keep training`
                )}</p>`;
            } else {
                headline = `<p class="dash-recovery-headline is-flat">▶ ${langText(
                    '恢復速度同你最近平均相若',
                    'Recovery speed is in line with your recent average'
                )}</p>`;
            }
        }
    }

    host.innerHTML = `
        ${headline}
        <div class="dash-trend-grid">
            <div class="dash-trend-block">
                <h4>${langText('專注穩定度 %', 'Focus Stability %')}</h4>
                <div class="dash-bars">${bars(focusValues, (v) => `${v.toFixed(0)}%`)}</div>
            </div>
            <div class="dash-trend-block">
                <h4>${langText('恢復時間（秒）', 'Recovery Time (s)')}</h4>
                <div class="dash-bars">${bars(recoveryValues, (v) => `${v.toFixed(1)}s`, true)}</div>
            </div>
        </div>
        <p class="dash-trend-note">${langText(`最近 ${history.length} 局，最右邊係今次。`, `Last ${history.length} sessions; rightmost is this one.`)}</p>`;
}

// Alias for compatibility if needed, but we should use ROUTER
function showResults() {
    if (typeof runtimeResultsHandler === 'function') {
        runtimeResultsHandler();
        return;
    }
    ROUTER.navigate('#results');
}

function updateLoadingStatus(msg) {
    console.log("[Loading Status] " + msg);
    const tLoaderText = document.querySelector('#transition-loader .loading-text');
    if (tLoaderText) tLoaderText.innerText = msg;
    
    const iLoaderText = document.querySelector('#initial-loader div:nth-child(2)');
    if (iLoaderText) iLoaderText.innerText = msg;
}

let lastFetchTime = 0;

function mergeUniqueQuestions(existing = [], incoming = [], maxCount = TOTAL_QUESTIONS) {
    const seen = new Set();
    const merged = [];

    [...existing, ...incoming].forEach((item) => {
        const normalized = normalizeQuestionItem(item);
        const signature = questionSignature(normalized);
        if (!signature || seen.has(signature)) return;
        seen.add(signature);
        merged.push(normalized);
    });

    return merged.slice(0, maxCount);
}

function handleStartupFailure(message) {
    console.error('[Game Startup Failed]', message);
    updateLoadingStatus(message);
    if (startupTimeoutId) {
        clearTimeout(startupTimeoutId);
        startupTimeoutId = null;
    }
    isGameActive = false;
    isWaitingForQuestions = false;
    isFetchingQuestion = false;
    lastFetchTime = 0;
    stopBGM();
    hideTransitionLoader();
    const questionPanel = document.getElementById('question-panel');
    if (questionPanel) questionPanel.style.display = 'none';
    if (typeof gameLoop !== 'undefined' && gameLoop?.isRunning) {
        gameLoop.stop();
    }
    leaveEEGMode(true);
    window.setTimeout(() => window.alert(message), 0);
    setState({ setupStep: 'mode', difficulty: null });
    window.location.hash = '#setup';
}

function getDifficultyProfile() {
    return DIFFICULTY_PROFILES[CONFIG.difficulty] || DIFFICULTY_PROFILES.easy;
}

function applySessionModeUI() {
    const questionPanel = document.getElementById('question-panel');
    const scoreDisplay = document.getElementById('score-display');
    const streakDisplay = document.getElementById('streak-display');
    const scoreText = document.getElementById('score-text');
    const playTimeDisplay = document.getElementById('play-time-display');
    const trainingCountdownDisplay = document.getElementById('training-countdown-display');
    const trainingCountdownValue = document.getElementById('training-countdown-value');

    if (isTrainingMode()) {
        if (questionPanel) questionPanel.style.display = 'none';
        if (scoreDisplay) scoreDisplay.style.display = 'none';
        if (streakDisplay) streakDisplay.style.display = 'none';
        if (playTimeDisplay) playTimeDisplay.style.display = 'none';
        if (trainingCountdownDisplay) trainingCountdownDisplay.style.display = '';
        if (trainingCountdownDisplay) trainingCountdownDisplay.classList.remove('is-critical');
        if (trainingCountdownValue) trainingCountdownValue.textContent = GAME_STATS.formatTime(getTrainingSessionDurationMs()).substring(0, 5);
        if (scoreText) scoreText.textContent = langText('訓練', 'TRAIN');
        return;
    }

    if (questionPanel) questionPanel.style.display = 'none';
    if (scoreDisplay) scoreDisplay.style.display = '';
    if (streakDisplay) streakDisplay.style.display = '';
    if (playTimeDisplay) playTimeDisplay.style.display = '';
    if (trainingCountdownDisplay) trainingCountdownDisplay.style.display = 'none';
    if (scoreText) scoreText.textContent = '0/10';
}

function getAgeBandLabel(profile = getDifficultyProfile()) {
    return profile.ageBand[CONFIG.currentLang] || profile.ageBand.hk;
}

function questionSignature(item = {}) {
    if (item.type === 'stroop') {
        return `stroop::${String(item.word || '').toLowerCase()}::${String(item.displayColor || '').toLowerCase()}`;
    }
    const question = String(item.question || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const options = Array.isArray(item.options)
        ? item.options.map((option) => String(option || '').toLowerCase().replace(/\s+/g, ' ').trim()).join('|')
        : '';
    return `${question}::${options}`;
}

function validateQuestionItem(item, seenSignatures = new Set()) {
    const reasons = [];
    const normalizedOptions = Array.isArray(item.options)
        ? item.options.map((option) => String(option || '').trim()).filter(Boolean)
        : [];

    // Stroop items validate on word/displayColor instead of question text length.
    if (item.type === 'stroop') {
        if (!item.word || String(item.word).trim().length === 0) reasons.push('stroop-missing-word');
        if (!/^#[0-9a-fA-F]{6}$/.test(String(item.displayColor || ''))) reasons.push('stroop-bad-color');
        if (normalizedOptions.length !== 4) reasons.push('option-count');
        if (new Set(normalizedOptions.map((option) => option.toLowerCase())).size !== 4) reasons.push('duplicate-options');
        if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) reasons.push('answer-range');
        const stroopSignature = questionSignature(item);
        if (!stroopSignature || seenSignatures.has(stroopSignature)) reasons.push('duplicate-question');
        return { ok: reasons.length === 0, reasons, signature: stroopSignature };
    }

    if (!item.question || item.question.length < 6) reasons.push('question-too-short');
    if (normalizedOptions.length !== 4) reasons.push('option-count');
    if (new Set(normalizedOptions.map((option) => option.toLowerCase())).size !== 4) reasons.push('duplicate-options');
    if (!Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3) reasons.push('answer-range');
    if (!item.explanation || item.explanation.length < (CONFIG.currentLang === 'hk' ? 8 : 18)) reasons.push('explanation-too-short');

    const bannedPatterns = /(all of the above|none of the above|以上皆是|以上皆非)/i;
    if (normalizedOptions.some((option) => bannedPatterns.test(option))) reasons.push('ambiguous-option');

    const signature = questionSignature(item);
    if (!signature || seenSignatures.has(signature)) reasons.push('duplicate-question');

    return {
        ok: reasons.length === 0,
        reasons,
        signature
    };
}

function finalizeQuestionBatch(items = [], count = 10) {
    const seenSignatures = new Set(questionBank.map(questionSignature));
    const accepted = [];

    items.forEach((item) => {
        const normalized = normalizeQuestionItem(item);
        const verdict = validateQuestionItem(normalized, seenSignatures);
        if (!verdict.ok) return;
        seenSignatures.add(verdict.signature);
        accepted.push(normalized);
    });

    const fallbackCandidates = getFallbackQuestions(Math.max(0, count - accepted.length));
    fallbackCandidates.forEach((fallback) => {
        if (accepted.length >= count) return;
        const verdict = validateQuestionItem(fallback, seenSignatures);
        if (!verdict.ok) return;
        seenSignatures.add(verdict.signature);
        accepted.push(fallback);
    });

    return accepted.slice(0, count);
}

async function fetchBatchQuestions(count = 10, isInitial = true) {
    const requestSessionId = activeGameSessionId;
    // Reset lock if it's been too long (e.g. > 15 seconds)
    if (isFetchingQuestion && (Date.now() - lastFetchTime > 15000)) {
        console.warn("Resetting fetch lock due to timeout");
        isFetchingQuestion = false;
    }

    if (isFetchingQuestion) return { ok: false, source: 'skipped', reason: 'fetch-in-progress' };
    isFetchingQuestion = true;
    lastFetchTime = Date.now();

    updateLoadingStatus(I18N[CONFIG.currentLang].loading_ai_connect);

    try {
        console.info('[AI] Starting question fetch via proxy', {
            requestedCount: count,
            isInitial,
            difficulty: CONFIG.difficulty,
            language: CONFIG.currentLang
        });

        const controller = new AbortController();
        const timeoutMs = isInitial ? INITIAL_AI_TIMEOUT_MS : BACKGROUND_AI_TIMEOUT_MS;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // The prompt is built server-side by /api/questions.js; the browser only
        // sends the parameters and never sees the DeepSeek key.
        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                count,
                difficulty: CONFIG.difficulty,
                lang: CONFIG.currentLang
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

        updateLoadingStatus(I18N[CONFIG.currentLang].loading_ai_parse);
        const data = await response.json();
        if (!data || data.ok === false) {
            throw new Error(data && data.reason ? `Proxy error: ${data.reason}` : "Proxy returned no questions");
        }

        const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
        if (rawQuestions.length === 0) {
            throw new Error("AI returned empty question list");
        }

        // Client-side authoritative validation + fallback merge (defense in depth).
        const newQuestions = finalizeQuestionBatch(rawQuestions, count);

        if (requestSessionId !== activeGameSessionId) return;
        
        if (newQuestions.length === 0) {
            throw new Error("AI returned empty question list");
        }
        
        if (isInitial) {
            if (questionBank.length === 0) {
                questionBank = newQuestions;
                currentQuestionIndex = 0;
                if (isWaitingForQuestions || document.getElementById('question-panel').style.display !== 'none') {
                    loadQuestionFromBank();
                }
            } else {
                questionBank = mergeUniqueQuestions(questionBank, newQuestions, TOTAL_QUESTIONS);
                console.log("Question bank already active. Merging AI questions without replacing the live question.");
                if (isWaitingForQuestions) loadQuestionFromBank();
            }
        } else {
            questionBank = mergeUniqueQuestions(questionBank, newQuestions, TOTAL_QUESTIONS);
            console.log(`Background fetch loaded ${newQuestions.length} more questions.`);
            
            // Resume if user was waiting
            if (isWaitingForQuestions) {
                loadQuestionFromBank();
            }
        }
        
        updateLoadingStatus(I18N[CONFIG.currentLang].loading_ai_ready);
        return { ok: true, source: 'ai', count: newQuestions.length };

    } catch (error) {
        console.warn("Fetch Questions Error:", error);
        if (requestSessionId !== activeGameSessionId) return;

        const lowerMessage = String(error?.message || error || '').toLowerCase();
        console.warn('[AI] Question fetch failed', {
            requestedCount: count,
            isInitial,
            difficulty: CONFIG.difficulty,
            language: CONFIG.currentLang,
            reason: error?.message || String(error)
        });
        if (lowerMessage.includes('401') || lowerMessage.includes('unauthorized') || lowerMessage.includes('missing deepseek_api_key') || lowerMessage.includes('server misconfiguration')) {
            updateLoadingStatus(langText('AI 服務設定缺失或金鑰無效，已切換本地題庫。', 'AI service misconfigured or key invalid. Switching to local question bank.'));
        } else if (lowerMessage.includes('429')) {
            updateLoadingStatus(langText('AI 題庫請求過多，稍後重試並先使用本地題庫。', 'AI rate limit reached. Retrying later and using local fallback now.'));
        } else if (lowerMessage.includes('abort')) {
            updateLoadingStatus(langText('AI 題庫回應逾時，先使用本地題庫。', 'AI request timed out. Using local fallback now.'));
        } else if (lowerMessage.includes('empty question list') || lowerMessage.includes('missing questions') || lowerMessage.includes('invalid json')) {
            updateLoadingStatus(langText('AI 回傳格式異常，已切換本地題庫。', 'AI returned an invalid format. Switching to local fallback.'));
        }
        
        // If it's a timeout or network error, silently fall back
        if (isInitial) {
            console.log("Initial fetch failed. Using local fallback questions instantly.");
            if (questionBank.length === 0) {
                questionBank = getFallbackQuestions(INITIAL_PLAYABLE_QUESTIONS);
                currentQuestionIndex = 0;
                loadQuestionFromBank();
            }
        } else if (isWaitingForQuestions) {
            // If user is stuck waiting for background questions, give them fallback
            const needed = TOTAL_QUESTIONS - questionBank.length;
            if (needed > 0) {
                console.log(`Background fetch failed. Providing ${needed} local fallback questions to continue.`);
                questionBank = mergeUniqueQuestions(questionBank, getFallbackQuestions(needed), TOTAL_QUESTIONS);
                loadQuestionFromBank();
            }
        }
        return { ok: false, source: 'fallback', reason: error?.message || String(error) };
    } finally {
        isFetchingQuestion = false;
    }
}

function generateMockPuzzle(index = 0) {
    // Hard mode: every third fallback item is a real interactive Stroop task.
    if (CONFIG.difficulty === 'hard' && index % 3 === 2) {
        return generateStroopPuzzle(Math.floor(index / 3));
    }
    const localBank = {
        easy: {
            hk: [
                { q: "牛奶離開雪櫃後很快變壞，最直接原因是？", o: ["溫度升高", "顏色變白", "樽身變輕", "標籤褪色"], a: 0, e: "溫度升高會令細菌更快繁殖，其餘選項不直接影響變壞速度。", s: "生物判斷" },
                { q: "做水果冰時加鹽在冰旁邊，主要作用是？", o: ["令冰更冷", "令糖更甜", "令水變藍", "令水果更大"], a: 0, e: "鹽可令冰點下降，使冰混合物更冷。", s: "生活化學" },
                { q: "跑步後會更口渴，最合理原因是？", o: ["身體失水", "眼睛變大", "頭髮變短", "鞋變重"], a: 0, e: "流汗會令身體失水，所以會更口渴。", s: "身體科學" },
                { q: "哪種情況最可能令食物較快滋生細菌？", o: ["暖而潮濕", "凍而乾爽", "密封冷藏", "剛煮熟"], a: 0, e: "細菌通常在較暖和潮濕環境繁殖較快。", s: "生物常識" },
                { q: "如果今天是星期二，再過 2 天是星期幾？", o: ["星期三", "星期四", "星期五", "星期六"], a: 1, e: "星期二後兩天是星期四。", s: "時間推理" },
                { q: "一杯熱茶放著變涼，最可能是因為？", o: ["熱傳到周圍", "茶突然變少", "杯變透明", "空氣停止"], a: 0, e: "熱量會由較熱的茶傳到較冷的周圍環境。", s: "生活科學" },
                { q: "飯盒放室溫太久較易變味，最合理原因是？", o: ["微生物增多", "盒蓋變圓", "飯粒變大", "匙羹變冷"], a: 0, e: "室溫放太久會讓微生物更易繁殖，令食物變壞。", s: "食物安全" },
                { q: "切開蘋果後表面變啡，最接近哪種變化？", o: ["氧化反應", "結冰", "蒸發", "發光"], a: 0, e: "蘋果接觸空氣後會產生氧化，令表面變啡。", s: "生活化學" },
                { q: "洗手用肥皂比只用清水更有效，主因是？", o: ["較易帶走油污", "令手變長", "令水變暖", "令細菌變大"], a: 0, e: "肥皂能幫助油污和附著物被水帶走，所以較有效。", s: "健康科學" },
                { q: "雪櫃門常打開，食物較難保持低溫，因為？", o: ["暖空氣進入", "食物會變重", "燈光令冰溶化", "盒子會縮小"], a: 0, e: "開門時外面的暖空氣進入，會令內部溫度上升。", s: "熱傳遞" }
            ],
            en: [
                { q: "Milk spoils faster outside the fridge mainly because?", o: ["Higher temperature", "Whiter color", "Lighter bottle", "Faded label"], a: 0, e: "Warmer temperature helps bacteria grow faster, unlike the other changes.", s: "Biology Logic" },
                { q: "Why is salt added around ice when making ice cream?", o: ["It makes the ice colder", "It makes sugar sweeter", "It turns water blue", "It enlarges fruit"], a: 0, e: "Salt lowers the freezing point, so the ice mixture can get colder.", s: "Everyday Chemistry" },
                { q: "Why are you thirstier after running?", o: ["Your body lost water", "Your eyes got bigger", "Your hair got shorter", "Your shoes got heavier"], a: 0, e: "Sweating removes water from the body, so thirst increases.", s: "Body Science" },
                { q: "Which condition helps bacteria grow faster on food?", o: ["Warm and moist", "Cold and dry", "Sealed and chilled", "Freshly boiled"], a: 0, e: "Bacteria generally multiply faster in warm, moist places.", s: "Biology" },
                { q: "If today is Tuesday, what day is it in 2 days?", o: ["Wednesday", "Thursday", "Friday", "Saturday"], a: 1, e: "Two days after Tuesday is Thursday.", s: "Time Logic" },
                { q: "A hot cup of tea cools because?", o: ["Heat moves to the room", "The tea suddenly shrinks", "The cup turns clear", "Air stops moving"], a: 0, e: "Heat transfers from the hotter tea to the cooler surroundings.", s: "Daily Science" },
                { q: "Why does lunch left out too long taste bad sooner?", o: ["Microbes increase", "The box gets rounder", "The rice gets bigger", "The spoon gets colder"], a: 0, e: "Food left at room temperature lets microbes multiply more easily.", s: "Food Safety" },
                { q: "A cut apple turns brown mainly because of?", o: ["Oxidation", "Freezing", "Evaporation", "Glowing"], a: 0, e: "Exposure to air causes oxidation, which browns the cut surface.", s: "Everyday Chemistry" },
                { q: "Why is soap better than only water for washing hands?", o: ["It lifts oily dirt", "It makes hands longer", "It warms the water", "It enlarges germs"], a: 0, e: "Soap helps loosen oils and dirt so they can be washed away.", s: "Health Science" },
                { q: "Why does a fridge warm up when its door stays open?", o: ["Warm air enters", "Food gets heavier", "The light melts all ice", "Boxes shrink"], a: 0, e: "Opening the door lets warmer room air enter and raises the inside temperature.", s: "Heat Transfer" }
            ]
        },
        medium: {
            hk: [
                { q: "同量熱水與凍水混合後，溫度最可能？", o: ["介乎兩者之間", "高過熱水", "低過凍水", "完全不變"], a: 0, e: "混合後通常會達到介乎兩者之間的溫度平衡。", s: "熱平衡" },
                { q: "一株植物放入黑暗櫃兩日，最先受影響的是？", o: ["製造食物能力", "根即時消失", "葉即時透明", "泥土變金色"], a: 0, e: "缺少光線會先影響光合作用，即製造食物能力。", s: "植物科學" },
                { q: "感冒時多數不建議共用水樽，主因是？", o: ["可減少病菌傳播", "可令水更甜", "可令樽更輕", "可提高身高"], a: 0, e: "共用水樽會增加病菌經口水傳播的機會。", s: "健康推理" },
                { q: "實驗要比較肥料效果，哪項應保持相同？", o: ["植物品種與光照", "只改花盆顏色", "只改記錄字體", "只改澆水時間名"], a: 0, e: "要公平比較，應盡量固定植物種類與光照等條件。", s: "實驗設計" },
                { q: "若所有貓都是動物，而小白是貓，那麼？", o: ["小白不是動物", "小白是動物", "所有動物都是貓", "無法判斷"], a: 1, e: "小白屬於貓，而貓屬於動物，所以小白是動物。", s: "集合推理" },
                { q: "巴士 7:20 開出，45 分鐘後到站，時間是？", o: ["7:55", "8:05", "8:15", "8:25"], a: 1, e: "20 分加 45 分是 65 分，即 1 小時 5 分，所以是 8:05。", s: "時間推理" },
                { q: "同一杯水量下，哪種方法最能公平比較溶糖速度？", o: ["只改水溫", "同時改杯形和水溫", "同時改糖量和水量", "每次用不同匙"], a: 0, e: "要公平比較，應只改一個變量，例如水溫，其餘保持不變。", s: "變量控制" },
                { q: "兩片麵包中只有一片發霉，若條件幾乎相同，最應先檢查哪項差異？", o: ["保存濕度", "包裝顏色", "桌面花紋", "標籤字體"], a: 0, e: "霉菌生長和濕度關係大，應先檢查保存環境是否較潮濕。", s: "生物推理" },
                { q: "一杯冰水外壁出現小水珠，水最可能來自？", o: ["空氣中的水氣", "杯內漏水穿牆", "玻璃本身融化", "桌面冒出水"], a: 0, e: "冷杯令空氣中的水氣凝結成小水珠，並非杯內穿出。", s: "相變判讀" },
                { q: "要驗證植物是否需要陽光製造食物，較合理設計是？", o: ["同種植物分光暗組", "只看一株今天高不高", "只換花盆顏色", "只改記錄時間"], a: 0, e: "以同種植物分成有光和無光兩組，比較才較能驗證光照影響。", s: "實驗設計" }
            ],
            en: [
                { q: "If equal hot and cold water are mixed, the final temperature is usually?", o: ["Between the two", "Hotter than the hot water", "Colder than the cold water", "Exactly unchanged"], a: 0, e: "Mixing usually leads to a temperature between the two starting values.", s: "Heat Balance" },
                { q: "A plant is kept in darkness for two days. What is affected first?", o: ["Its food-making ability", "Its roots vanish", "Its leaves turn clear", "Its soil turns gold"], a: 0, e: "Without light, photosynthesis is affected first.", s: "Plant Science" },
                { q: "Why should sick classmates avoid sharing one water bottle?", o: ["It reduces germ spread", "It makes water sweeter", "It makes the bottle lighter", "It increases height"], a: 0, e: "Sharing bottles can spread germs through saliva.", s: "Health Logic" },
                { q: "To compare fertilizers fairly, what should stay the same?", o: ["Plant type and light", "Only pot color", "Only font in notes", "Only the name of watering time"], a: 0, e: "A fair test keeps important conditions such as plant type and light constant.", s: "Experiment Design" },
                { q: "If all cats are animals and Snowy is a cat, then?", o: ["Snowy is not an animal", "Snowy is an animal", "All animals are cats", "Unknown"], a: 1, e: "Snowy belongs to cats, and cats belong to animals, so Snowy is an animal.", s: "Set Logic" },
                { q: "A bus leaves at 7:20 and arrives 45 minutes later. What time is that?", o: ["7:55", "8:05", "8:15", "8:25"], a: 1, e: "20+45 gives 65 minutes, which is 1 hour and 5 minutes, so 8:05.", s: "Time Logic" },
                { q: "What is the fairest way to test whether warm water dissolves sugar faster?", o: ["Change only water temperature", "Change cup shape and temperature", "Change sugar and water amounts", "Use a different spoon each time"], a: 0, e: "A fair test changes one variable only, so temperature should change while the rest stays the same.", s: "Variable Control" },
                { q: "Only one of two bread slices grows mold. What difference is best to check first?", o: ["Storage humidity", "Package color", "Table pattern", "Label font"], a: 0, e: "Mold growth depends strongly on moisture, so humidity is the most useful difference to inspect.", s: "Biology Reasoning" },
                { q: "Drops appear outside a cup of ice water. Where did the water most likely come from?", o: ["Water vapor in the air", "Water leaking through the cup", "The glass melting", "The table creating water"], a: 0, e: "The cold surface causes water vapor in the air to condense into droplets.", s: "State Change" },
                { q: "How would you best test whether plants need sunlight to make food?", o: ["Split same plants into light and dark groups", "Look at one plant only once", "Change pot color only", "Change note-taking time only"], a: 0, e: "Using similar plants in light and dark groups is the clearest controlled comparison.", s: "Experiment Design" }
            ]
        },
        hard: {
            hk: [
                { q: "「紅」字用藍色顯示，代表「藍」的字體實際是？", o: ["紅色", "藍色", "綠色", "白色"], a: 0, e: "要看字體顏色，不是字面意思。", s: "閱讀陷阱" },
                { q: "以下哪個不是「不是圓形」？", o: ["圓形", "三角形", "正方形", "長方形"], a: 0, e: "雙重否定代表它其實是圓形。", s: "反向指令" },
                { q: "不要計算 48+27，只答共有多少個數字？", o: ["2", "4", "5", "6"], a: 1, e: "題目內有 4、8、2、7，共四個數字。", s: "隱藏指令" },
                { q: "規則是「選字數最少但不要選 A」，哪個符合？", o: ["A蘋果", "雨", "白雲", "海洋"], a: 1, e: "最短的是「雨」，而且不是 A。", s: "規則切換" },
                { q: "哪句與「所有方格都不是圓形」意思相同？", o: ["有些圓形是方格", "方格全都非圓形", "只有圓形是方格", "沒有方格存在"], a: 1, e: "它直接重述原句，其他都改變了意思。", s: "語句邏輯" },
                { q: "看到「不要選最右邊」後，再看到「改為選最右邊」，應選？", o: ["最左", "左二", "右二", "最右"], a: 3, e: "後面的指令覆蓋前面的指令。", s: "反向指令" },
                { q: "若後天是星期五，今天是星期幾？", o: ["星期三", "星期四", "星期五", "星期六"], a: 0, e: "後天是兩天後，所以今天是星期三。", s: "時間推理" },
                { q: "題末最重要：3, 6, 9, 12。請選最大的偶數。", o: ["3", "6", "9", "12"], a: 3, e: "要忽略前面節奏，直接看最後指令。", s: "隱藏指令" },
                { q: "題目叫你選第二長的詞，哪個正確？", o: ["山", "白雲", "微風聲", "深藍天空"], a: 2, e: "字數依次為 1、2、3、4，所以第二長是 3 字。", s: "閱讀理解" },
                { q: "若「不是所有人都遲到」為真，哪句必真？", o: ["全部遲到", "至少一人準時", "沒有人到場", "全部準時"], a: 1, e: "代表至少有一個人不是遲到。", s: "語句邏輯" }
            ],
            en: [
                { q: "The word 'BLUE' is shown in red. What is the actual text color?", o: ["Red", "Blue", "Green", "White"], a: 0, e: "You must read the display color, not the word meaning.", s: "Stroop Trap" },
                { q: "Which option is not 'not a circle'?", o: ["Circle", "Triangle", "Square", "Rectangle"], a: 0, e: "A double negative means the answer is the circle.", s: "Reverse Instruction" },
                { q: "Do not solve 48+27. How many digits appear there?", o: ["2", "4", "5", "6"], a: 1, e: "The digits are 4, 8, 2, and 7, so there are four digits.", s: "Hidden Instruction" },
                { q: "Rule: choose the shortest word but not A. Which fits?", o: ["A apple", "Rain", "Clouds", "Ocean"], a: 1, e: "Rain is the shortest non-A option.", s: "Rule Switching" },
                { q: "Which sentence matches 'All squares are not circles'?", o: ["Some circles are squares", "No square is a circle", "Only circles are squares", "Squares do not exist"], a: 1, e: "It restates the original meaning without changing it.", s: "Statement Logic" },
                { q: "First read 'Do not pick the far right', then 'Now pick the far right'. Choose?", o: ["Far left", "Left middle", "Right middle", "Far right"], a: 3, e: "The later instruction overrides the earlier one.", s: "Reverse Instruction" },
                { q: "If the day after tomorrow is Friday, what day is today?", o: ["Wednesday", "Thursday", "Friday", "Saturday"], a: 0, e: "Two days before Friday is Wednesday.", s: "Calendar Logic" },
                { q: "Most important: 3, 6, 9, 12. Pick the largest even number.", o: ["3", "6", "9", "12"], a: 3, e: "Ignore the setup and follow the final instruction exactly.", s: "Hidden Instruction" },
                { q: "Pick the second longest word. Which is correct?", o: ["Sun", "Cloud", "Breeze", "DeepBlue"], a: 2, e: "Lengths are 3, 5, 6, and 8, so Breeze is second longest.", s: "Reading Control" },
                { q: "If 'not everyone is late' is true, what must be true?", o: ["Everyone is late", "At least one is on time", "Nobody arrived", "Everyone is on time"], a: 1, e: "It means at least one person is not late.", s: "Statement Logic" }
            ]
        }
    };

    const difficultyBank = localBank[CONFIG.difficulty] || localBank.easy;
    const localeBank = CONFIG.currentLang === 'hk' ? difficultyBank.hk : difficultyBank.en;
    const qData = localeBank[index % localeBank.length];

    return normalizeQuestionItem({
        question: qData.q,
        options: qData.o,
        answer: qData.a,
        explanation: qData.e,
        skill: qData.s,
        ageBand: getAgeBandLabel(),
        validation: qData.e,
        source: 'fallback',
        isMock: true
    });
}

function compactText(value, maxLength) {
    const normalized = String(value || '')
        .replace(/\s+/g, ' ')
        .trim();

    if (!Number.isFinite(maxLength) || maxLength <= 0) {
        return normalized;
    }

    return normalized.slice(0, maxLength);
}

function normalizeQuestionItem(item = {}) {
    const isHk = CONFIG.currentLang === 'hk';
    const explanationLimit = isHk ? 60 : 140;
    const profile = getDifficultyProfile();

    const normalized = {
        question: compactText(item.question),
        options: Array.isArray(item.options)
            ? item.options.slice(0, 4).map((option) => compactText(option))
            : [],
        answer: Number.isInteger(item.answer) ? item.answer : 0,
        explanation: compactText(item.explanation || '', explanationLimit),
        skill: compactText(item.skill || langText('邏輯推理', 'Logic'), isHk ? 10 : 24),
        ageBand: compactText(item.ageBand || getAgeBandLabel(profile), isHk ? 10 : 24),
        validation: compactText(item.validation || item.explanation || '', explanationLimit),
        source: item.source || 'ai'
    };

    // Stroop items carry the stimulus word and its display color through.
    if (item.type === 'stroop') {
        normalized.type = 'stroop';
        normalized.word = compactText(item.word, 12);
        normalized.displayColor = String(item.displayColor || '').trim();
    }

    return normalized;
}

function renderPuzzle(data) {
    const qPanel = document.getElementById('question-panel');
    qPanel.style.display = 'block'; // Show panel if hidden
    const qHeader = document.getElementById('question-header');
    qHeader.textContent = I18N[CONFIG.currentLang].puzzle_title;
    const qSkill = document.getElementById('question-skill-chip');
    const qBand = document.getElementById('question-band-chip');

    const qText = document.getElementById('question-text');
    const qOptions = document.getElementById('question-options');

    if (qSkill) qSkill.textContent = data.skill || langText('邏輯推理', 'Logic');
    if (qBand) qBand.textContent = data.ageBand || getAgeBandLabel();

    clearStroopTimer();
    const isStroop = data.type === 'stroop';

    if (isStroop) {
        // Show the conflicting word in its display color, plus a small swatch
        // so the hue stays identifiable for color-blind players.
        qText.textContent = '';
        qText.classList.add('stroop-word');
        const instruction = document.createElement('span');
        instruction.className = 'stroop-instruction';
        instruction.textContent = data.question;
        const wordEl = document.createElement('span');
        wordEl.className = 'stroop-stimulus';
        wordEl.textContent = data.word;
        wordEl.style.color = data.displayColor;
        const swatch = document.createElement('span');
        swatch.className = 'stroop-swatch';
        swatch.style.background = data.displayColor;
        wordEl.appendChild(swatch);
        qText.appendChild(instruction);
        qText.appendChild(wordEl);
    } else {
        qText.classList.remove('stroop-word');
        qText.style.color = '';
        qText.textContent = data.question;
    }

    qOptions.innerHTML = '';

    data.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        // Pass all buttons to checkAnswer so we can highlight correct one
        btn.onclick = () => {
            clearStroopTimer();
            checkAnswer(index, data.answer, btn, qOptions.children);
        };
        qOptions.appendChild(btn);
    });

    if (isStroop) {
        startStroopCountdown(data);
    }
}

// Time pressure is what makes Stroop a focus task: run a visible countdown
// and treat expiry as a wrong answer.
function startStroopCountdown(data) {
    const timerEl = document.getElementById('question-timer');
    const deadline = performance.now() + STROOP_TIME_LIMIT_MS;
    if (timerEl) timerEl.classList.add('stroop-active');

    const tick = () => {
        const remainingMs = deadline - performance.now();
        if (remainingMs <= 0) {
            clearStroopTimer();
            handleStroopTimeout(data);
            return;
        }
        if (timerEl) {
            timerEl.textContent = `⏱ ${Math.ceil(remainingMs / 1000)}s`;
            timerEl.classList.toggle('is-urgent', remainingMs <= 3000);
        }
    };
    tick();
    stroopTimerId = setInterval(tick, 200);
}

function handleStroopTimeout(data) {
    const options = document.querySelectorAll('.option-btn');
    options.forEach((opt) => (opt.disabled = true));

    playWrongSound();
    CONFIG.streak = 0;
    updateStreakDisplay();

    if (options[data.answer]) {
        options[data.answer].style.background = '#4eff4e';
        options[data.answer].style.color = 'black';
    }

    CONFIG.wrongAnswers.push({
        question: `${data.question} [${data.word}]`,
        userChoice: langText('（超時未答）', '(time out)'),
        correctChoice: data.options[data.answer],
        explanation: data.explanation
    });

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestionFromBank();
    }, 2000);
}

function checkAnswer(selectedIndex, correctIndex, btn) {
    const options = document.querySelectorAll('.option-btn');
    options.forEach(opt => opt.disabled = true); // Disable all

    const currentQ = questionBank[currentQuestionIndex];

    if (selectedIndex === correctIndex) {
        playCorrectSound();
        CONFIG.streak++;
        updateStreakDisplay();

        btn.style.background = '#4eff4e';
        btn.style.color = 'black';
        btn.textContent += ` (${I18N[CONFIG.currentLang].correct})`;
        
        // Update Score
        CONFIG.score++;
        const scoreEl = document.getElementById('score-text');
        if (scoreEl) {
            updateDigitDisplay(scoreEl, `${CONFIG.score}/10`);
        }
        
        // Wait 2s then next
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestionFromBank();
        }, 2000);
    } else {
        playWrongSound();
        CONFIG.streak = 0;
        updateStreakDisplay();

        btn.style.background = '#ff4e4e';
        btn.textContent += ` (${I18N[CONFIG.currentLang].incorrect})`;
        
        // Highlight correct one
        options[correctIndex].style.background = '#4eff4e';
        options[correctIndex].style.color = 'black';

        // Record Wrong Answer
        CONFIG.wrongAnswers.push({
            question: currentQ.question,
            userChoice: currentQ.options[selectedIndex],
            correctChoice: currentQ.options[correctIndex],
            explanation: currentQ.explanation
        });

        // Wait 2s then next
        setTimeout(() => {
            currentQuestionIndex++;
            loadQuestionFromBank();
        }, 2000);
    }
}

function updateStreakDisplay() {
    const streakDisplay = document.getElementById('streak-display');
    const streakCount = document.getElementById('streak-count');
    if (!streakDisplay || !streakCount) return;
    
    if (CONFIG.streak > 1) {
        streakDisplay.classList.remove('hidden');
        streakCount.textContent = 'x' + CONFIG.streak;
        
        // Add pop effect
        streakDisplay.style.transform = 'scale(1.2)';
        setTimeout(() => {
            streakDisplay.style.transform = 'scale(1)';
        }, 200);
        
        // Reset animation
        streakCount.style.animation = 'none';
        streakCount.offsetHeight; /* trigger reflow */
        streakCount.style.animation = 'pulse 0.5s';
        
        // Play streak sound
        if (CONFIG.streak % 3 === 0) {
             playTone(1000 + (CONFIG.streak * 50), 'triangle', 0.3);
        }
    } else {
        streakDisplay.classList.add('hidden');
        streakDisplay.style.transform = 'scale(0.8)';
    }
}

// --- 3D Scene (Three.js) ---
let boatLoadedResolve;
const boatLoadedPromise = new Promise(resolve => boatLoadedResolve = resolve);

let assetsLoadedResolve;
const assetsLoadedPromise = new Promise(resolve => assetsLoadedResolve = resolve);

function init3DScene() {
    const sceneSessionId = activeGameSessionId;
    // 0. Initialize Loading Manager
    loadingManager = new THREE.LoadingManager();
    loadingManager.onLoad = () => {
        console.log("All assets loaded via LoadingManager (Internal Track).");
        // assetsLoadedResolve will be called via Promise.all below
    };
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        console.log(`[Loading] ${url} (${itemsLoaded}/${itemsTotal})`);
    };
    loadingManager.onError = (url) => {
        console.error('[Loading] There was an error loading ' + url);
    };

    // 1. Scene Setup
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xaaccff, 0.005); 

    // 2. Camera
    camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 1, 2000000);
    camera.position.set(20, 11, 36);
    
    // 3. Renderer
    const compactViewport = isCompactViewport();
    
    renderer = new THREE.WebGLRenderer({
        antialias: PERFORMANCE_PROFILE.antialias,
        alpha: true,
        powerPreference: 'high-performance'
    }); 
    renderer.setPixelRatio(getAdaptiveRenderScale());
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x06101d, 1);
    
    // Physically Correct Lights & Tone Mapping
    renderer.physicallyCorrectLights = true; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Adjusted for HDR as requested
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Force sRGB
    
    renderer.shadowMap.enabled = PERFORMANCE_PROFILE.enableShadows;
    renderer.shadowMap.type = PERFORMANCE_PROFILE.enableShadows ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    // Setup Post-Processing (Bloom + SMAA)
    setupPostProcessing();

    // 4. Controls - Free view disabled (Locked Follow)
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = false; // Disable user rotation
    controls.enableZoom = false;   // Disable user zoom
    controls.enablePan = false;    // Disable user pan
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; 
    controls.target.set(0.6, 2.8, -1.2);
    // ...

    // 5. Lighting
    // Ambient Light (Base) - Reduced for HDR contrast
    ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);

    // Directional Light (Sun/Moon)
    directionalLight = new THREE.DirectionalLight(0xfff0dd, 2.0); // Warm sun
    directionalLight.position.set(50, 50, -50); // Angle for shadows
    directionalLight.castShadow = PERFORMANCE_PROFILE.enableShadows;
    
    // Optimized Shadow Settings
    directionalLight.shadow.mapSize.width = PERFORMANCE_PROFILE.shadowMapSize;
    directionalLight.shadow.mapSize.height = PERFORMANCE_PROFILE.shadowMapSize;
    directionalLight.shadow.bias = -0.00005; 
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);

    // 6. Environment & Water
    setupRimLight(); // Initialize Rim Light & Moon
    const texturesPromise = loadTextures(); // Start loading textures
    const envPromise = setupEnvironment(); // HDRI & Water Logic

    // Wait for ALL core assets including HDRI to prevent "coating pop-in" (塗層) during gameplay
    Promise.all([texturesPromise, boatLoadedPromise, envPromise])
        .then(() => {
             console.log("Promise.all complete: Textures, Boat, and HDRI loaded.");
             if (assetsLoadedResolve) assetsLoadedResolve();
        })
        .catch(err => {
             console.error("Asset Load Failed", err);
             // Resolve anyway to prevent hang
             if (assetsLoadedResolve) assetsLoadedResolve();
        });


    // 7. Load Boat (GLB)
    const loader = new GLTFLoader(loadingManager);
    const modelLoadStart = performance.now();
    updateLoadingStatus(I18N[CONFIG.currentLang].loading_boat);
    console.log("Starting model load: assets/EGGShip2.glb");
    
    loader.load(
        ASSET_URLS.boat,
        function (gltf) {
            if (sceneSessionId !== activeGameSessionId) return;
            const loadTime = performance.now() - modelLoadStart;
            console.log(`[Performance] Model loaded in ${loadTime.toFixed(2)}ms`);

            if (!gltf.scene || gltf.scene.children.length === 0) {
                console.warn('Boat GLB is empty. Switching to procedural fallback boat.');
                boat = createFallbackBoat();
                boat.position.y = -0.35;
                scene.add(boat);
                if (boatLoadedResolve) boatLoadedResolve(boat);
                return;
            }
            
            boat = gltf.scene;
            if (boatLoadedResolve) boatLoadedResolve(boat);
            boat.position.y = -0.5;
            boat.scale.set(3, 3, 3);

            // Add Depth Shadow (Simulate darker water near boat)
            try {
                const shadowTex = createShadowTexture();
                const shadowGeo = new THREE.PlaneGeometry(3.5, 8); // Scaled by boat (3x) -> ~10x24 world units
                const shadowMat = new THREE.MeshBasicMaterial({
                    map: shadowTex,
                    transparent: true,
                    opacity: 0.7,
                    depthWrite: false,
                    side: THREE.DoubleSide
                });
                const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
                shadowPlane.rotation.x = -Math.PI / 2;
                shadowPlane.position.y = 0.2; // Relative to boat (which is at -0.5). 0.2 means -0.5 + 0.2*3? No.
                // Boat is scaled 3x. Position is also scaled? No, position is local.
                // Boat world Y is -0.5.
                // If I put shadow at local Y = 0.1, it will be at -0.5 + 0.3 = -0.2 (World).
                // Water is at -0.5.
                // I want shadow at -0.6 (World).
                // So -0.5 + localY * 3 = -0.6 => localY * 3 = -0.1 => localY = -0.033.
                // Let's put it at local Y = 0.05 to be slightly above water?
                // Wait, if water is transparent, shadow BELOW water is better?
                // If shadow is at -0.6 (World), it is BELOW water (-0.5).
                // Since water has alpha 0.8, we can see through it.
                // A dark plane at -1.0 (World) -> localY = (-1.0 - (-0.5)) / 3 = -0.16.
                shadowPlane.position.y = -0.2; 
                boat.add(shadowPlane);
            } catch (e) {
                console.warn("Failed to add boat shadow", e);
            }

            // Animation Support
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(boat);
                gltf.animations.forEach((clip) => {
                    mixer.clipAction(clip).play();
                });
                console.log(`[Animation] Loaded and playing ${gltf.animations.length} animations`);
            }
            
            // Ensure consistent materials and shadow properties
            boat.traverse(function (child) {
                if (child.isMesh) {
                    child.castShadow = PERFORMANCE_PROFILE.enableShadows;
                    child.receiveShadow = PERFORMANCE_PROFILE.enableShadows;
                    // Preserve original materials but ensure they handle lights correctly
                    if (child.material) {
                        child.material.needsUpdate = true;
                        
                        // Fix for PBR darkness
                        child.material.envMapIntensity = 1.0; 
                        if (child.material.emissive && child.material.emissiveIntensity !== undefined) {
                            child.material.emissiveIntensity = 0.18;
                        }
                        
                        // Adjust Roughness/Metalness if too dark/absorbent
                        if (child.material.roughness !== undefined) {
                            // Ensure it's not perfectly smooth (0) or perfectly rough (1) if undefined
                            // child.material.roughness = Math.max(0.5, child.material.roughness); 
                        }
                        
                        // Fix for missing maps or black textures if any
                        if (child.material.map) child.material.map.encoding = THREE.sRGBEncoding;
                        if (child.material.emissiveMap) child.material.emissiveMap.encoding = THREE.sRGBEncoding;
                    }
                }
                // Handle potential collision meshes (hide them if they are just for physics)
                if (child.name.toLowerCase().includes('collision') || child.name.toLowerCase().includes('collider')) {
                    child.visible = false;
                }
            });
            scene.add(boat);
            console.log("Model added to scene with scale (3,3,3) and Y-offset -0.5");
        },
        undefined,
        function (error) {
            if (sceneSessionId !== activeGameSessionId) return;
            console.error('Error loading boat model:', error);
            boat = createFallbackBoat();
            boat.position.y = -0.35;
            scene.add(boat);
            
            if (boatLoadedResolve) boatLoadedResolve(boat);
            console.warn("Boat model unavailable. Using procedural fallback boat.");
        }
    );

    // 8. Environment - CLEANED UP
    // createFloatingIslands();  <-- Removed per request
    // createBalloons();         <-- Removed per request
    // setupSkySystem();         <-- DISABLED: Conflicts with HDRI

    // Setup Rim Light for Night Mode
    setupRimLight();
    setupBoatParticles();
    
    // 9. Resize Handler
    window.addEventListener('resize', onWindowResize);

    // Expose for Testing
    window.EEG_APP = {
        scene,
        camera,
        renderer,
        getBoat: () => boat,
        togglePrecisionTest: () => TEST_PANEL.toggle()
    };
}

// --- Sky System ---
let sky, sun;
let stars;

function setupSkySystem() {
    // DISABLED: Procedural Sky conflicts with HDRI
    console.log("Sky system disabled in favor of HDRI.");
}



// --- Rim Light (Night Visibility) ---
let rimLight;
let moonMesh;
let hemisphereLight;

function setupRimLight() {
    // A blueish backlight to outline the boat in the dark
    rimLight = new THREE.SpotLight(0xaaccff, 0); // Start off (intensity 0)
    rimLight.position.set(0, 20, 20); // Behind and above
    rimLight.target.position.set(0, 0, 0); // Point at center (boat)
    rimLight.angle = Math.PI / 4;
    rimLight.penumbra = 0.5; // Soft edges
    rimLight.decay = 2;
    rimLight.distance = 100;
    
    // Do not cast shadow to save perf, just highlight
    rimLight.castShadow = false;
    
    scene.add(rimLight);
    scene.add(rimLight.target);
    
    // Setup Hemisphere Light (Hidden by default)
    hemisphereLight = new THREE.HemisphereLight(0x000000, 0x000000, 0.0);
    scene.add(hemisphereLight);
}

// --- Boat Lighting (Legacy) ---
let boatSpotLight;
let boatVolumetricCone;

function setupBoatLighting() {
    // Spotlight
    boatSpotLight = new THREE.SpotLight(0xffffff, 50); // High intensity for GLTF/PBR
    boatSpotLight.angle = Math.PI / 6;
    boatSpotLight.penumbra = 0.2;
    boatSpotLight.decay = 2;
    boatSpotLight.distance = 200;
    boatSpotLight.castShadow = true;
    boatSpotLight.shadow.mapSize.width = 1024;
    boatSpotLight.shadow.mapSize.height = 1024;
    
    // Parent to boat when boat is loaded, but for now just create it.
    // We will attach it in the animate loop or when boat is ready.
}

let composer;
let pmremGenerator;

function setupPostProcessing() {
    if (isCompactViewport() || !PERFORMANCE_PROFILE.usePostProcessing) {
        composer = null;
        return;
    }

    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.82; // Only very bright things bloom
    bloomPass.strength = BLOOM_BASE_STRENGTH;   // Lighter bloom (perf)
    bloomPass.radius = 0.4;     // Blur radius
    bloomPassRef = bloomPass;   // expose to the game loop for flow-state boost

    // The composer renders into an offscreen target, which bypasses the
    // renderer's own MSAA. On WebGL2 we hand the composer a multisampled
    // target instead, which also lets us drop the (more expensive) SMAA pass.
    const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    const msaaSamples = renderer.capabilities.isWebGL2 ? PERFORMANCE_PROFILE.msaaSamples : 0;
    const composerTarget = new THREE.WebGLRenderTarget(drawSize.width, drawSize.height, {
        samples: msaaSamples,
        type: THREE.HalfFloatType
    });

    composer = new EffectComposer(renderer, composerTarget);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    if (!msaaSamples) {
        // WebGL1 fallback only: SMAA as the final AA pass.
        const smaaPass = new SMAAPass(drawSize.width, drawSize.height);
        composer.addPass(smaaPass);
    }
    // Normalize sizes (composer tracks CSS px + pixel ratio internally, while
    // our target was created at drawing-buffer size). setSize keeps `samples`.
    composer.setSize(window.innerWidth, window.innerHeight);
}

function loadTextures() {
    updateLoadingStatus(I18N[CONFIG.currentLang].loading_water);
    console.log("Loading Advanced Ocean Textures...");
    const loader = new THREE.TextureLoader(loadingManager);
    const applyRepeat = (tex) => {
        if (!tex) return tex;
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
    };
    
    // Create Promises for each texture load
    const p1 = new Promise(resolve => {
        waterNormalTexture = loader.load(ASSET_URLS.waterNormal, (tex) => {
            applyRepeat(tex);
            tex.repeat.set(4, 4);
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, isCompactViewport() ? 4 : 12);
            resolve(tex);
        }, undefined, () => {
            console.warn('[assets] water normal texture failed, using generated placeholder');
            const fallback = new THREE.Texture();
            waterNormalTexture = fallback;
            resolve(fallback);
        });
    });

    const p2 = new Promise(resolve => {
        foamTexture = loader.load(ASSET_URLS.splash, (tex) => {
            applyRepeat(tex);
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, isCompactViewport() ? 4 : 8);
            resolve(tex);
        }, undefined, () => {
            console.warn('[assets] foam texture failed, reusing water normal texture');
            foamTexture = waterNormalTexture || new THREE.Texture();
            resolve(foamTexture);
        });
    });

    const p3 = new Promise(resolve => {
        splashTexture = loader.load(ASSET_URLS.splash, (tex) => {
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.anisotropy = Math.min(renderer?.capabilities?.getMaxAnisotropy?.() || 1, isCompactViewport() ? 4 : 8);
            resolve(tex);
        }, undefined, () => {
            console.warn('[assets] splash texture failed, using foam fallback texture');
            splashTexture = foamTexture || waterNormalTexture || new THREE.Texture();
            resolve(splashTexture);
        });
    });
    
    // Return Promise.all for tracking
    return Promise.all([p1, p2, p3]);
}

// --- Dual-Layer Plane Wake System ---
const splashPlanes = [];
const foamPlanes = [];
let cameraLight;
const splashPlaneGeometry = new THREE.PlaneGeometry(3.6, 3.6);
const wakePlaneGeometry = new THREE.PlaneGeometry(3.2, 3.2);

function setupBoatParticles() {
    // Clear old system if exists
    if (boatParticles) {
        scene.remove(boatParticles);
        boatParticles = null;
    }
    particleData.length = 0;

    // Clear Dual-Layer System
    for (const p of splashPlanes) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
    }
    splashPlanes.length = 0;
    
    for (const p of foamPlanes) {
        scene.remove(p.mesh);
        p.mesh.material.dispose();
    }
    foamPlanes.length = 0;

    // Initialize Camera Light (Headlamp)
    if (!cameraLight) {
        cameraLight = new THREE.DirectionalLight(0xffffff, 1.5);
        cameraLight.castShadow = false; // Performance
        scene.add(cameraLight);
    }
}

function updateParticles(delta, speed) {
    // 1. Update Camera Light (Headlamp)
    if (cameraLight && camera) {
        cameraLight.position.copy(camera.position);
        // Make it shine in the direction the camera is looking
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        cameraLight.target.position.copy(camera.position).add(camDir);
        cameraLight.target.updateMatrixWorld();
    }

    if (!boat) return;

    // 2. Spawn Logic
    // Only spawn if moving
    if (speed > 1.0) {
        const time = performance.now() / 1000;
        
        // --- System A: Bow Impact (Splash) ---
        // Spawn rate based on speed
        const splashRate = Math.min(speed * 0.45, 7.5) * PERFORMANCE_PROFILE.particleMultiplier;
        if (Math.random() < splashRate * delta) {
            const material = new THREE.MeshBasicMaterial({
                map: splashTexture,
                transparent: true,
                opacity: 0.76,
                depthWrite: false, // Prevent Z-Fighting
                blending: THREE.NormalBlending,
                side: THREE.DoubleSide
            });
            const mesh = new THREE.Mesh(splashPlaneGeometry, material);
            
            // Position: Bow (Forward)
            // Boat forward is -Z. Bow is approx -9 units.
            const bowOffset = new THREE.Vector3(0, 0, -10.5).applyEuler(boat.rotation);
            mesh.position.copy(boat.position).add(bowOffset);
            
            // Randomize X slightly
            const randX = new THREE.Vector3((Math.random() - 0.5) * 3.0, 0, 0).applyEuler(boat.rotation);
            mesh.position.add(randX);
            
            // Flat on water
            mesh.rotation.x = -Math.PI / 2;
            mesh.rotation.z = Math.random() * Math.PI * 2; // Random rotation
            mesh.position.y = 0.12;
            
            // Velocity for expansion (V-shape)
            // Move OUTWARD from center line
            const right = new THREE.Vector3(1, 0, 0).applyEuler(boat.rotation);
            const sideDir = Math.random() > 0.5 ? 1 : -1;
            const velocity = right.clone().multiplyScalar(sideDir * (1.4 + Math.random() * 1.4));
            
            scene.add(mesh);
            splashPlanes.push({ mesh, life: 0.65, maxLife: 0.65, velocity });
        }

        // --- System B: Kelvin Wake (V-Shape Stern) ---
        // User Request: Two V-shaped expanding trails
        const wakeRate = Math.min(speed * 0.7, 12.0) * PERFORMANCE_PROFILE.particleMultiplier;
        if (Math.random() < wakeRate * delta) {
             // Left and Right Emitters
             [-1, 1].forEach(side => {
                const material = new THREE.MeshBasicMaterial({
                    map: splashTexture, // Fix: Use splash.png
                    transparent: true,
                    opacity: 0.52,
                    depthWrite: false,
                    blending: THREE.NormalBlending,
                    side: THREE.DoubleSide
                });
                const mesh = new THREE.Mesh(wakePlaneGeometry, material);
                
                // Position: Stern Sides (x: -1, 1)
                const sternOffset = new THREE.Vector3(side * 2.2, 0, 8.5).applyEuler(boat.rotation);
                mesh.position.copy(boat.position).add(sternOffset);
                
                mesh.rotation.x = -Math.PI / 2;
                mesh.rotation.z = boat.rotation.z; // Align with boat
                mesh.position.y = 0.08; 
                
                // Velocity: Outward and Backward
                // Outward: side * right
                // Backward: We simulate wake staying behind as boat moves forward
                // But user wants "Outward Backward" relative to boat?
                // Let's give them outward velocity + some backward spread
                const right = new THREE.Vector3(1, 0, 0).applyEuler(boat.rotation);
                const backward = new THREE.Vector3(0, 0, 1).applyEuler(boat.rotation); // +Z is backward
                
                const velocity = new THREE.Vector3();
                velocity.addScaledVector(right, side * 2.0);
                velocity.addScaledVector(backward, 1.6);
                
                scene.add(mesh);
                foamPlanes.push({ 
                    mesh, 
                    life: 1.15, 
                    maxLife: 1.15, 
                    velocity: velocity,
                    isKelvin: true 
                });
             });
        }
    }

    // 3. Update & Clean Up Loop
    // Splash (Bow)
    for (let i = splashPlanes.length - 1; i >= 0; i--) {
        const p = splashPlanes[i];
        p.life -= delta;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.material.dispose();
            splashPlanes.splice(i, 1);
        } else {
            // Expand / Move
            p.mesh.position.addScaledVector(p.velocity, delta);
            p.mesh.scale.multiplyScalar(1.0 + delta * 2.2);
            
            // Fade
            p.mesh.material.opacity = (p.life / p.maxLife) * 0.76;
        }
    }

    // Foam (Kelvin Wake)
    for (let i = foamPlanes.length - 1; i >= 0; i--) {
        const p = foamPlanes[i];
        p.life -= delta;
        
        if (p.life <= 0) {
            scene.remove(p.mesh);
            p.mesh.material.dispose();
            foamPlanes.splice(i, 1);
        } else {
            if (p.isKelvin) {
                // Kelvin Wake Logic
                p.mesh.position.addScaledVector(p.velocity, delta);
                // Scale x3 rapidly
                p.mesh.scale.multiplyScalar(1.0 + delta * 1.8); 
            } else {
                // Fallback for old particles (if any)
                p.mesh.scale.multiplyScalar(1.0 + delta * 0.2); 
            }
            p.mesh.material.opacity = (p.life / p.maxLife) * 0.52;
        }
    }
}

function setupEnvironment() {
    // 1. Initialize PMREM Generator (Required for HDRI)
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // 2. Initialize Fog (Default to Day)
    scene.fog = new THREE.FogExp2(0xaaccff, 0.002); 

    // 3. Initialize Water
    const waterGeometry = new THREE.PlaneGeometry(50000, 50000);
    
    // Use loaded texture or fallback
    const normalTex = waterNormalTexture || new THREE.TextureLoader(loadingManager).load(ASSET_URLS.waterNormal);
    // Ensure wrapping for detail
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
    // High Quality Filtering (Anti-Aliasing for Texture)
    normalTex.minFilter = THREE.LinearMipmapLinearFilter;
    normalTex.magFilter = THREE.LinearFilter;
    normalTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), PERFORMANCE_PROFILE.textureAnisotropy);
    
    // If not already set by loadTextures (e.g. fallback path)
    if (!waterNormalTexture) normalTex.repeat.set(4, 4);

    water = new Water(
        waterGeometry,
        {
            textureWidth: PERFORMANCE_PROFILE.waterResolution,
            textureHeight: PERFORMANCE_PROFILE.waterResolution,
            waterNormals: normalTex,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff, 
            waterColor: 0x001e0f, // Deep Indigo default
            distortionScale: 3.7, // RESTORED: Wave Undulation
            fog: scene.fog !== undefined,
            alpha: 0.8 
        }
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5; 
    
    // FOAM SHADER INJECTION
    if (water.material) {
        // Define uniform on material so we can update it later
        water.material.uniforms.foamTexture = { value: foamTexture };

        water.material.onBeforeCompile = function (shader) {
            shader.uniforms.foamTexture = water.material.uniforms.foamTexture;
            
            // Ensure vWorldPosition is available
            if (!shader.vertexShader.includes('varying vec3 vWorldPosition;')) {
                shader.vertexShader = 'varying vec3 vWorldPosition;\n' + shader.vertexShader;
                shader.vertexShader = shader.vertexShader.replace(
                    '#include <worldpos_vertex>',
                    `#include <worldpos_vertex>
                    vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;`
                );
            }
            
            if (!shader.fragmentShader.includes('varying vec3 vWorldPosition;')) {
                shader.fragmentShader = 'varying vec3 vWorldPosition;\n' + shader.fragmentShader;
            }

            // Inject Foam Logic
            shader.fragmentShader = 'uniform sampler2D foamTexture;\n' + shader.fragmentShader;
            
            const mainColorLogic = 'gl_FragColor = vec4( color, 1.0 ) * mix( refraction, reflection, reflectivity );';
            
            const newLogic = `
                vec4 baseColor = vec4( color, 1.0 ) * mix( refraction, reflection, reflectivity );
                
                // Foam Logic (Advanced)
                // Use surfaceNormal.y (1.0 is flat). Lower means steeper wave.
                // We want foam on steep slopes.
                float slope = 1.0 - surfaceNormal.y;
                float foamMask = smoothstep(0.02, 0.1, slope); // Threshold for foam
                
                // Flowing Foam Texture
                vec2 foamUv = vWorldPosition.xz * 0.05 + time * 0.05; 
                vec4 foamTex = texture2D(foamTexture, foamUv);
                
                float foamIntensity = 0.0; // Global foam disabled per user request
                
                gl_FragColor = mix(baseColor, vec4(0.95, 0.95, 1.0, 1.0), clamp(foamIntensity, 0.0, 0.8));
            `;
            
            shader.fragmentShader = shader.fragmentShader.replace(mainColorLogic, newLogic);
        };
    }

    water.material.transparent = true;
    if (water.material.uniforms.reflectivity) {
        water.material.uniforms.reflectivity.value = 0.6;
    }

    scene.add(water);
    
    // 4. Setup Particles - DISABLED PER USER REQUEST (Remove White Things)
    // setupBoatParticles();

    // 5. Trigger Initial Environment Load
    const savedTheme = localStorage.getItem('theme') || 'dark';
    // Use instant=true to prevent initial "not ready" transition glitch
    return switchEnvironment(savedTheme === 'light' ? 'day' : 'night', true);
}

function switchEnvironment(mode = 'day', instant = false) {
    if (!scene || !renderer) return Promise.resolve();
    console.log(`Switching Environment to: ${mode} (Instant: ${instant})`);
    
    return new Promise((resolve, reject) => {
        envState.isTransitioning = !instant;
        envState.transitionStartTime = performance.now();

        const isDay = mode === 'day';
        
        // 1. Set Target Values
        if (isDay) {
            // DAY SETTINGS
            // Fix: Reduce exposure to prevent "nuclear" whiteout
            envState.targetExposure = 1.0; 
            
            // Fix: Fog color to match HDRI horizon (Light Blue-Grey), Reduced Density
            envState.targetFogColor.setHex(0xcfe4fa); 
            envState.targetFogDensity = 0.0005; 
            
            envState.targetSunColor.setHex(0xffffff);
            envState.targetSunIntensity = 2.0;
            envState.targetSunDirection.set(50, 50, -50);
            
            envState.targetAmbientColor.setHex(0xffffff);
            envState.targetAmbientIntensity = 0.6;
            
            envState.targetWaterColor.setHex(0x006994);
            envState.targetRimIntensity = 0.0; // Day: No Rim Light
            envState.targetHemisphereIntensity = 0.0;
            envState.targetCameraLightIntensity = 1.25;
            envState.targetBoatEmissiveIntensity = 0.02;
            
            // Intensity for Day
            if(scene) scene.environmentIntensity = 1.0;
            
            // Disable Hemisphere Night Light
            if (hemisphereLight) hemisphereLight.intensity = 0;
            
            if (window.moonMesh) window.moonMesh.visible = false;

        } else {
            // NIGHT SETTINGS
            // Fix: High Visibility Night (User Request: Force Visibility)
            envState.targetExposure = 0.82; 
            
            // Fix: Dark Blue-Black Fog
            envState.targetFogColor.setHex(0x08111f); 
            envState.targetFogDensity = 0.0012; 
            
            // Fix: Artificial Moon Light (Directional)
            envState.targetSunColor.setHex(0xccddff); // Cold White
            envState.targetSunIntensity = 4.9;
            envState.targetSunDirection.set(-80, 60, -80); // Matches Artificial Moon Position
            
            // Fix: Strong Ambient Light - Force Visibility
            envState.targetAmbientColor.setHex(0x7a8cab);
            envState.targetAmbientIntensity = 3.45;
            
            envState.targetWaterColor.setHex(0x0d3154); // Lighter Night Water
            
            // Show Artificial Moon Mesh
            if (!window.moonMesh) {
                const moonGeo = new THREE.SphereGeometry(5, 32, 32);
                const moonMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
                window.moonMesh = new THREE.Mesh(moonGeo, moonMat);
                window.moonMesh.position.set(-80, 60, -80);
                scene.add(window.moonMesh);
            }
            window.moonMesh.visible = true;
            envState.targetRimIntensity = 4.6; 
            envState.targetHemisphereIntensity = 0.68;
            envState.targetCameraLightIntensity = 2.85;
            envState.targetBoatEmissiveIntensity = 0.18;
            
            // Intensity for Night
            if(scene) scene.environmentIntensity = 0.95;

            // Rim Light Config (Color/Position) 
            if (rimLight) {
                rimLight.color.setHex(0xaaccff);
                rimLight.castShadow = false;
                rimLight.position.set(-30, 36, 30);
            }
            
            // Enable Hemisphere Light
            if (hemisphereLight) {
                hemisphereLight.color.setHex(0x7893c7);
                hemisphereLight.groundColor.setHex(0x10243f);
                hemisphereLight.intensity = envState.targetHemisphereIntensity;
            }
        }
        
        // 2. Instant Application (if requested)
        if (instant) {
            renderer.toneMappingExposure = envState.targetExposure;
            
            if (scene.fog) {
                scene.fog.color.copy(envState.targetFogColor);
                scene.fog.density = envState.targetFogDensity;
            }
            
            if (directionalLight) {
                directionalLight.color.copy(envState.targetSunColor);
                directionalLight.intensity = envState.targetSunIntensity;
                directionalLight.position.copy(envState.targetSunDirection);
                // Ensure shadow is enabled for Moon
                directionalLight.castShadow = true; 
            }
            
            if (ambientLight) {
                ambientLight.color.copy(envState.targetAmbientColor);
                ambientLight.intensity = envState.targetAmbientIntensity;
            }
            
            if (rimLight) {
                rimLight.intensity = envState.targetRimIntensity;
                // Shadow state
                if (isDay) {
                    rimLight.castShadow = false;
                } else {
                    rimLight.castShadow = false;
                }
            }

            if (hemisphereLight) {
                hemisphereLight.intensity = envState.targetHemisphereIntensity;
            }

            if (cameraLight) {
                cameraLight.intensity = envState.targetCameraLightIntensity;
            }
            
            if (water && water.material) {
                // Fix: Water sunColor must be dark at night (0x111111), grey at day (0x888888)
                const targetWaterSun = isDay ? new THREE.Color(0x888888) : new THREE.Color(0x111111);
                water.material.uniforms.sunColor.value.copy(targetWaterSun);
                water.material.uniforms.waterColor.value.copy(envState.targetWaterColor);
                
                // Fix: Wave Details (Night Distortion 6.0, Day 3.7)
                water.material.uniforms.size.value = 10.0;
                water.material.uniforms.distortionScale.value = isDay ? 3.7 : 6.0;

                if (directionalLight) {
                    water.material.uniforms.sunDirection.value.copy(directionalLight.position).normalize();
                }
            }
        }
        
        // 3. Update Boat Material for Environment Reflection
        if (boat) {
            boat.traverse((child) => {
                if (child.isMesh && child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach((material) => {
                        const targetEnvIntensity = isDay ? 1.0 : 1.22; 
                        material.envMapIntensity = targetEnvIntensity;
                        if ('emissive' in material) {
                            material.emissive.setHex(isDay ? 0x000000 : 0x1b3558);
                        }
                        if ('emissiveIntensity' in material) {
                            material.emissiveIntensity = envState.targetBoatEmissiveIntensity;
                        }
                    });
                }
            });
        }
    
        // 4. Switch HDRI Background
        const hdrPath = isDay ? ASSET_URLS.hdrDay : ASSET_URLS.hdrNight;
    console.log(`[Environment] Switching to ${mode}, loading: ${hdrPath}`);
    updateLoadingStatus(I18N[CONFIG.currentLang].loading_sky);
    
    if (cachedEnvMaps[mode]) {
        // Use Cached
        console.log(`[Environment] Using cached HDRI for ${mode}`);
        scene.environment = cachedEnvMaps[mode];
        scene.background = cachedEnvMaps[mode];
        resolve(cachedEnvMaps[mode]);
    } else {
        // Load New
        new RGBELoader(loadingManager)
            //.setPath('assets/') // Using full relative path in load() for safety
            .load(hdrPath, function (texture) {
                if (!texture || !texture.image) {
                    console.warn(`[Environment] Invalid HDR payload for ${hdrPath}, using fallback lighting.`);
                    if (!isDay) {
                        scene.background = new THREE.Color(0x050b14);
                        scene.environment = null;
                    }
                    resolve(null);
                    return;
                }
                console.log(`[Environment] Success loading ${hdrPath}`);
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;
                cachedEnvMaps[mode] = envMap;
                
                scene.environment = envMap;
                scene.background = envMap;
                texture.dispose();
                resolve(envMap);
            }, undefined, function (err) {
                console.error(`[Environment] FAILED loading ${hdrPath}`, err);
                
                // Fix: Fallback to Black Background if HDR fails (Night)
                if (!isDay) {
                    scene.background = new THREE.Color(0x050b14);
                    scene.environment = null; // Or keep previous?
                }
                
                resolve(null); // Resolve anyway to avoid hanging
            });
    }
    });
}

function createWaterNormalMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    const imgData = context.createImageData(width, height);
    const data = imgData.data;

    // Multi-frequency noise for realistic waves
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;

            // Simple noise generation (since we don't have SimplexNoise lib imported)
            // We use overlapping sine waves
            let nx = 0;
            let ny = 0;
            let nz = 1;

            // Wave layer 1
            nx += Math.sin(x * 0.05) * 0.5;
            ny += Math.cos(y * 0.05) * 0.5;
            
            // Wave layer 2 (High freq)
            nx += Math.sin(x * 0.1 + y * 0.05) * 0.2;
            ny += Math.cos(y * 0.1 - x * 0.05) * 0.2;

            // Normalize
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            nx /= len;
            ny /= len;
            nz /= len;

            // Map to 0-255 (RGB)
            data[index] = (nx + 1) * 127.5;     // R
            data[index + 1] = (ny + 1) * 127.5; // G
            data[index + 2] = (nz + 1) * 127.5; // B
            data[index + 3] = 255;              // Alpha
        }
    }

    context.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

function createShadowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256; // Elongated for boat shape
    const context = canvas.getContext('2d');
    
    // Radial Gradient (simulating hull shadow)
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)'); // Dark center
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparent edge
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}


function createFloatingIslands() {
    const geometry = new THREE.DodecahedronGeometry(5);
    const material = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.8 });
    for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = Math.random() * 800 - 400;
        mesh.position.y = Math.random() * 10 - 2;
        mesh.position.z = Math.random() * 1000 - 500;
        mesh.scale.setScalar(Math.random() * 2 + 1);
        scene.add(mesh);
        islands.push(mesh);
    }
}

function createBalloons() {
    const geometry = new THREE.SphereGeometry(3, 32, 32);
    for (let i = 0; i < 10; i++) {
        const material = new THREE.MeshStandardMaterial({ 
            color: Math.random() * 0xffffff, 
            roughness: 0.3,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = Math.random() * 600 - 300;
        mesh.position.y = 30 + Math.random() * 50;
        mesh.position.z = Math.random() * 1000 - 500;
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -20, 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
        const line = new THREE.Line(lineGeo, lineMat);
        mesh.add(line);
        scene.add(mesh);
        balloons.push(mesh);
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(getAdaptiveRenderScale());
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (isCompactViewport()) {
        composer = null;
    } else if (!composer && scene && camera && renderer) {
        setupPostProcessing();
    }
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

function setChipState(element, label, tone = 'neutral') {
    if (!element) return;
    element.className = 'status-chip';
    if (tone !== 'neutral') element.classList.add(tone);
    element.textContent = label;
}

function updateModeSelectionHelper(title, detail) {
    const titleEl = document.getElementById('mode-selection-helper-title');
    const detailEl = document.getElementById('mode-selection-helper-detail');
    if (titleEl) titleEl.textContent = title;
    if (detailEl) detailEl.textContent = detail;
}

function compactStatusMessage(message = '') {
    const text = String(message || '').trim();
    const lower = text.toLowerCase();
    if (!text) return '';
    if (lower.includes('operation not permitted')) return langText('埠口存取被拒', 'Port access denied');
    if (lower.includes('grant bluetooth/serial access')) return langText('請授權藍牙或序列埠', 'Grant serial access');
    if (lower.includes('searching')) return langText('正在搜尋已配對 MindWave', 'Searching paired MindWave');
    if (lower.includes('opening paired mindwave serial port')) return langText('正在開啟 MindWave 埠口', 'Opening paired MindWave');
    if (lower.includes('mindwave serial connected')) return langText('MindWave 已連接', 'MindWave connected');
    if (lower.includes('no eeg data yet')) return langText('尚未收到即時腦波', 'No live signal yet');
    if (lower.includes('waiting for user to choose eeg equipment')) return langText('EEG 待命中', 'EEG idle');
    if (lower.includes('bridge connected')) return langText('Bridge 已就緒', 'Bridge ready');
    if (lower.includes('unable to reach the local eeg bridge')) return langText('Bridge 無法連接', 'Bridge unavailable');
    return text.length > 48 ? `${text.slice(0, 45)}...` : text;
}

function setEEGConnectionState(state, detail = '') {
    eegConnectionState = state;
    if (detail) eegStatusDetail = compactStatusMessage(detail);
    updateModeStatusUI();
    if (typeof updateSimulationHint === 'function') updateSimulationHint();
}

function updateModeStatusUI() {
    const modeBadge = document.getElementById('mode-badge');
    const deviceBadge = document.getElementById('device-badge');
    const titleEl = document.getElementById('mode-status-title');
    const detailEl = document.getElementById('mode-status-detail');
    if (!modeBadge || !deviceBadge || !titleEl || !detailEl) return;

    if (selectedInputMode === 'simulation') {
        setChipState(modeBadge, I18N[CONFIG.currentLang].mode_simulation, 'warning');
        setChipState(deviceBadge, I18N[CONFIG.currentLang].device_virtual, 'warning');
        titleEl.textContent = I18N[CONFIG.currentLang].mode_simulation_title;
        detailEl.textContent = CONFIG.focusSource === 'camera-ready'
            ? langText('相機鏡頭已準備，正在實時觀察你的專注狀態。', 'Camera is ready and actively monitoring your focus state.')
            : langText('未授權相機，正使用 20/80 fallback 模擬專注片段。', 'Camera not allowed. Using 20/80 fallback focus segments.');
        return;
    }

    if (selectedInputMode === 'eeg') {
        setChipState(modeBadge, I18N[CONFIG.currentLang].mode_real, 'info');
        const map = {
            idle: [I18N[CONFIG.currentLang].state_ready, 'info', I18N[CONFIG.currentLang].mode_real_standby, eegStatusDetail || I18N[CONFIG.currentLang].mode_real_standby],
            searching: [I18N[CONFIG.currentLang].state_searching, 'info', I18N[CONFIG.currentLang].mode_searching_device, eegStatusDetail || langText('正在搜尋已配對裝置', 'Searching paired MindWave')],
            connected: [I18N[CONFIG.currentLang].state_connected, 'info', I18N[CONFIG.currentLang].mode_bridge_connected, eegStatusDetail || I18N[CONFIG.currentLang].waiting_live_data],
            streaming: [I18N[CONFIG.currentLang].state_streaming, 'success', I18N[CONFIG.currentLang].mode_live_active, eegStatusDetail || I18N[CONFIG.currentLang].signal_flowing],
            warning: [I18N[CONFIG.currentLang].state_warning, 'warning', I18N[CONFIG.currentLang].mode_signal_pending, eegStatusDetail || I18N[CONFIG.currentLang].adjust_sensor],
            error: [I18N[CONFIG.currentLang].state_blocked, 'error', I18N[CONFIG.currentLang].mode_blocked, eegStatusDetail || I18N[CONFIG.currentLang].permissions_check],
            simulation: [I18N[CONFIG.currentLang].state_virtual, 'warning', I18N[CONFIG.currentLang].mode_simulation_title, eegStatusDetail || I18N[CONFIG.currentLang].mode_simulation_detail]
        };
        const [deviceLabel, tone, title, detail] = map[eegConnectionState] || map.idle;
        setChipState(deviceBadge, deviceLabel, tone);
        titleEl.textContent = title;
        detailEl.textContent = detail;
        return;
    }

    setChipState(modeBadge, I18N[CONFIG.currentLang].mode_idle, 'neutral');
    setChipState(deviceBadge, I18N[CONFIG.currentLang].device_waiting, 'neutral');
    titleEl.textContent = I18N[CONFIG.currentLang].choose_mode;
    detailEl.textContent = I18N[CONFIG.currentLang].mode_real_or_sim;
}

function createFallbackBoat() {
    const group = new THREE.Group();
    const hullMat = new THREE.MeshStandardMaterial({ color: 0xced7e2, roughness: 0.58, metalness: 0.18 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.42, metalness: 0.32 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65, metalness: 0.08 });

    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.2, 4.8, 8, 16), hullMat);
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1.45, 0.7, 0.92);
    hull.position.y = 0.7;
    group.add(hull);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.26, 1.85), accentMat);
    deck.position.set(0, 1.18, 0);
    group.add(deck);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.95, 1.3), trimMat);
    cabin.position.set(-0.15, 1.76, 0);
    group.add(cabin);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 10), trimMat);
    mast.position.set(0.65, 2.05, 0);
    group.add(mast);

    const sail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 1.1), new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.9, metalness: 0.02 }));
    sail.position.set(0.78, 2.1, 0.34);
    sail.rotation.z = -0.12;
    group.add(sail);

    group.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = PERFORMANCE_PROFILE.enableShadows;
            child.receiveShadow = PERFORMANCE_PROFILE.enableShadows;
        }
    });

    return group;
}

// OLD ANIMATE FUNCTION REMOVED - REPLACED BY gameLoop in PrecisionLoop
/*
function animate() {
    requestAnimationFrame(animate);
    
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();
    // ... logic moved to updateGameLogic ...
    renderer.render(scene, camera);
}
*/



    I18N.hk.eeg_simulation_hint = "目前為模擬腦電波，並非真實數據";
    I18N.en.eeg_simulation_hint = "Simulation Mode: Not Real EEG Data";
    I18N.hk.disconnect_eeg = "中斷連接";
    I18N.en.disconnect_eeg = "Disconnect";
    
    // --- EEG Connection (Python Bridge via WebSocket) ---
    let bridgeSocket = null;
    let bridgeConnected = false;

    function normalizeBridgeHost(value = '') {
        return String(value || '')
            .trim()
            .replace(/^wss?:\/\//i, '')
            .replace(/\/.*$/, '')
            .replace(/:\d+$/, '');
    }

    function normalizeBridgeUrl(value = '') {
        const raw = String(value || '').trim();
        if (!raw) return '';
        return /^wss?:\/\//i.test(raw) ? raw : `ws://${raw}`;
    }

    const bridgeParams = new URLSearchParams(window.location.search);
    const queryBridgeHost = normalizeBridgeHost(bridgeParams.get('bridgeHost') || '');
    const queryBridgeUrl = normalizeBridgeUrl(bridgeParams.get('bridgeUrl') || '');
    const storedBridgeHost = normalizeBridgeHost(localStorage.getItem('eeg_bridge_host') || '');
    const storedBridgeUrl = normalizeBridgeUrl(localStorage.getItem('eeg_bridge_url') || '');
    const explicitBridgeHost = normalizeBridgeHost(window.__EEG_BRIDGE_HOST__ || queryBridgeHost || storedBridgeHost);
    const explicitBridgeUrl = normalizeBridgeUrl(window.__EEG_BRIDGE_URL__ || queryBridgeUrl || storedBridgeUrl);

    if (queryBridgeHost) localStorage.setItem('eeg_bridge_host', queryBridgeHost);
    if (queryBridgeUrl) localStorage.setItem('eeg_bridge_url', queryBridgeUrl);

    const bridgeHosts = Array.from(new Set([
        explicitBridgeHost,
        '127.0.0.1',
        'localhost',
        window.location.hostname || ''
    ].filter(Boolean)));
    const bridgeUrls = explicitBridgeUrl
        ? [explicitBridgeUrl]
        : bridgeHosts.flatMap((host) => [
            `ws://${host}:8765`,
            `ws://${host}:8766`
        ]);
    let bridgeUrlIndex = 0;

    function connectBridge() {
        if (bridgeConnected && bridgeSocket) {
            return Promise.resolve(true);
        }

        updateConnectBtn("Connecting EEG Bridge...", true, false);
        const url = bridgeUrls[bridgeUrlIndex % bridgeUrls.length];
        bridgeUrlIndex++;

        return new Promise((resolve) => {
            let settled = false;
            const settle = (ok) => {
                if (settled) return;
                settled = true;
                resolve(ok);
            };

            try {
                bridgeSocket = new WebSocket(url);
            } catch (e) {
                console.error("Bridge WebSocket Construction Error", e);
                updateConnectBtn("Bridge Unavailable", false, false);
                settle(false);
                return;
            }

            bridgeSocket.onopen = () => {
                if (bridgeReconnectTimeoutId) {
                    clearTimeout(bridgeReconnectTimeoutId);
                    bridgeReconnectTimeoutId = null;
                }
                suppressBridgeAutoReconnect = false;
                bridgeReconnectAttempts = 0;
                bridgeConnected = true;
                isConnected = true;
                setEEGConnectionState('searching', 'Bridge connected. Opening your paired MindWave serial device...');
                try {
                    bridgeSocket.send(JSON.stringify({ action: "start_eeg" }));
                } catch (e) {
                    console.error("Failed to request EEG start", e);
                }
                updateConnectBtn("Bridge Connected", false, true);
                startConnectionWatchdog();
                settle(true);
            };

            bridgeSocket.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);
                    if (msg.type === "sense") {
                        if (!eegModeActive || selectedInputMode !== 'eeg') return;
                        lastEEGDataTime = Date.now();

                        const attention = Number(msg.attention || 0);
                        const meditation = Number(msg.meditation || 0);
                        const signal = Number(msg.signal_quality ?? 0);
                        const hasValidSignal = signal > 0 && attention >= 0 && attention <= 100;

                        latestEEG = { attention, meditation, signal };
                        renderSignalChip();
                        renderEegDualAxis();

                        if (hasValidSignal) {
                            isHeadsetConnected = true;
                            hasLiveEEGData = true;
                            bridgeReconnectAttempts = 0;
                            updateFocusFromEEG(attention);
                            setEEGConnectionState('streaming', `Live MindWave data received. Signal ${signal.toFixed(0)}%, attention ${attention}, meditation ${meditation}.`);
                            updateConnectBtn(`EEG Ready (${signal}%)`, false, true);
                        } else {
                            isHeadsetConnected = false;
                            hasLiveEEGData = false;
                            updateFocusFromEEG(0);
                            setEEGConnectionState('warning', 'Headset connected but signal quality is still too weak. Adjust the sensor and ear clip.');
                            updateConnectBtn("Poor Signal", false, true);
                        }

                        updateDebugOverlay({
                            signal_quality: signal,
                            attention: attention,
                            meditation: meditation
                        });
                    } else if (msg.type === "status") {
                        console.log("[Bridge Status]", msg.message);
                        const statusText = String(msg.message || "");
                        const statusLower = statusText.toLowerCase();
                        if (
                            statusLower.includes("failed") ||
                            statusLower.includes("error") ||
                            statusLower.includes("missing") ||
                            statusLower.includes("not permitted")
                        ) {
                            setEEGConnectionState('error', statusText);
                            updateConnectBtn(msg.message, false, false);
                        } else if (statusLower.includes("searching") || statusLower.includes("opening")) {
                            setEEGConnectionState('searching', statusText);
                            updateConnectBtn(msg.message, true, false);
                        } else if (statusLower.includes("no eeg data")) {
                            setEEGConnectionState('warning', statusText);
                            updateConnectBtn(msg.message, true, false);
                        } else if (statusLower.includes("successfully") || statusLower.includes("connected")) {
                            setEEGConnectionState('connected', statusText);
                            updateConnectBtn("EEG Connected", false, true);
                        } else {
                            setEEGConnectionState('idle', statusText);
                            updateConnectBtn(msg.message, true, false);
                        }
                    }
                } catch (e) {
                    console.error("Bridge Message Error", e);
                }
            };

            bridgeSocket.onclose = () => {
                bridgeConnected = false;
                isConnected = false;
                isHeadsetConnected = false;
                hasLiveEEGData = false;
                resetFocusTelemetry(selectedInputMode === 'eeg');
                removeDebugOverlay();
                if (selectedInputMode === 'eeg' && !suppressBridgeAutoReconnect) {
                    setEEGConnectionState('searching', langText('EEG bridge 已中斷，系統正持續嘗試重新連接。', 'EEG bridge disconnected. The system is trying to reconnect continuously.'));
                    scheduleBridgeReconnect();
                }
                updateConnectBtn("Connect EEG", false, false);
                stopConnectionWatchdog();
                settle(false);
            };

            bridgeSocket.onerror = (e) => {
                console.error("Bridge WebSocket Error", e);
                if (selectedInputMode === 'eeg' && eegModeActive) {
                    setEEGConnectionState('searching', langText('EEG bridge 連線失敗，正準備重新嘗試。', 'EEG bridge connection failed. Preparing another retry.'));
                    scheduleBridgeReconnect();
                }
                updateConnectBtn("Bridge Connection Failed", false, false);
                settle(false);
            };
        });
    }

    function scheduleBridgeReconnect(delayMs = 1800) {
        if (!eegModeActive || selectedInputMode !== 'eeg') return;
        if (bridgeConnected) return;
        if (bridgeReconnectTimeoutId) return;
        if (bridgeReconnectAttempts >= MAX_BRIDGE_RECONNECT_ATTEMPTS) {
            setEEGConnectionState('warning', langText('已多次嘗試重連 EEG bridge，請確認 Python 視窗仍在執行及頭帶已重新配對。', 'Multiple EEG bridge reconnect attempts were made. Please confirm the Python bridge is still running and the headset has been paired again.'));
            return;
        }

        bridgeReconnectAttempts += 1;
        bridgeReconnectTimeoutId = setTimeout(async () => {
            bridgeReconnectTimeoutId = null;
            if (!eegModeActive || selectedInputMode !== 'eeg' || bridgeConnected) return;
            try {
                await connectBridge();
            } catch (error) {
                console.warn('Bridge reconnect attempt failed:', error);
            }
        }, delayMs);
    }

    function waitForLiveEEG(timeoutMs = LIVE_EEG_WAIT_TIMEOUT_MS) {
        return new Promise((resolve) => {
            const startedAt = Date.now();
            const timer = setInterval(() => {
                if (!eegModeActive || selectedInputMode !== 'eeg') {
                    clearInterval(timer);
                    resolve({ ok: false, reason: 'cancelled' });
                    return;
                }

                if (hasLiveEEGData && isHeadsetConnected) {
                    clearInterval(timer);
                    resolve({ ok: true, reason: 'live' });
                    return;
                }

                if (Date.now() - startedAt >= timeoutMs) {
                    clearInterval(timer);
                    resolve({ ok: false, reason: bridgeConnected ? 'no-live-data' : 'bridge-unavailable' });
                }
            }, 250);
        });
    }

    function disconnectBridge() {
        if (bridgeReconnectTimeoutId) {
            clearTimeout(bridgeReconnectTimeoutId);
            bridgeReconnectTimeoutId = null;
        }
        suppressBridgeAutoReconnect = true;
        bridgeReconnectAttempts = 0;
        if (bridgeSocket) {
            try {
                bridgeSocket.send(JSON.stringify({ action: "stop_eeg" }));
            } catch (e) {
                console.warn("Failed to request EEG stop", e);
            }
            bridgeSocket.close();
        }
        bridgeConnected = false;
        isConnected = false;
        isHeadsetConnected = false;
        hasLiveEEGData = false;
        resetFocusTelemetry(selectedInputMode === 'eeg');
        removeDebugOverlay();
        if (selectedInputMode === 'eeg') {
            setEEGConnectionState('idle', langText('真實 EEG 已停止，如要重連請重新選擇 EEG 裝置。', 'Real EEG stopped. Choose EEG Equipment when you want to reconnect.'));
        }
        updateConnectBtn("Connect EEG", false, false);
        stopConnectionWatchdog();
    }

    async function connectBLE() {
        eegModeActive = true;
        removeDebugOverlay();
        return connectBridge();
    }

    function disconnectBLE() {
        disconnectBridge();
    }

    function removeDebugOverlay() {
        const overlay = document.getElementById('eeg-debug-overlay');
        if (overlay) overlay.remove();
    }

    function leaveEEGMode(resetSimulation = true) {
        eegModeActive = false;
        removeDebugOverlay();
        if (isConnected || bridgeConnected) {
            disconnectBLE();
        }
        if (resetSimulation) {
            isSimulationMode = false;
            if (typeof focusInterval !== 'undefined' && focusInterval) {
                clearInterval(focusInterval);
            }
        }
        resetFocusTelemetry(resetSimulation);
        eegConnectionState = 'idle';
        eegStatusDetail = 'Choose a mode to begin.';
        selectedInputMode = resetSimulation ? 'idle' : selectedInputMode;
        const panel = document.getElementById('manual-debug-panel');
        if (panel) panel.style.display = 'none';
        if (resetSimulation) {
            updateModeSelectionHelper(
                'Choose Your Input Mode',
                'Real EEG will search your paired MindWave only after you confirm. Simulation generates local focus values for testing.'
            );
        }
        updateSimulationHint();
        updateModeStatusUI();
    }

    function updateDebugOverlay(data) {
        if (!eegModeActive) return;
        let overlay = document.getElementById('eeg-debug-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'eeg-debug-overlay';
            overlay.style.position = 'fixed';
            overlay.style.bottom = '10px';
            overlay.style.right = '10px';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            overlay.style.color = '#0f0';
            overlay.style.padding = '10px';
            overlay.style.fontFamily = 'monospace';
            overlay.style.fontSize = '12px';
            overlay.style.zIndex = '9999';
            overlay.style.borderRadius = '5px';
            overlay.style.pointerEvents = 'none';
            document.body.appendChild(overlay);
        }
        
        let html = `<div>Signal: ${data.signal_quality}%</div>`;
        html += `<div>Attention: ${data.attention}</div>`;
        html += `<div>Meditation: ${data.meditation}</div>`;
        overlay.innerHTML = html;
    }

    function startConnectionWatchdog() {
        if (connectionWatchdogInterval) clearInterval(connectionWatchdogInterval);
        lastEEGDataTime = Date.now();
        
        connectionWatchdogInterval = setInterval(() => {
            if (!eegModeActive || selectedInputMode !== 'eeg') return;

            if (!bridgeConnected) {
                scheduleBridgeReconnect();
                return;
            }
            
            const now = Date.now();
            if (isHeadsetConnected && now - lastEEGDataTime > 5000) {
                console.warn("EEG Data Timeout (>5s). Signal Lost.");
                hasLiveEEGData = false;
                isHeadsetConnected = false;
                resetFocusTelemetry(selectedInputMode === 'eeg');
                setEEGConnectionState('searching', 'Signal timed out. Re-pairing will continue automatically once the headset comes back.');
                updateConnectBtn("Reconnecting EEG...", true, false);
            }
        }, 1000);
    }

    function stopConnectionWatchdog() {
        if (connectionWatchdogInterval) clearInterval(connectionWatchdogInterval);
    }

    // Expose for HTML onclick and Testing
    window.connectBridge = connectBridge;
    window.disconnectBridge = disconnectBridge;
    window.connectBLE = connectBLE;
    window.disconnectBLE = disconnectBLE;
    window.enableManualMode = enableManualMode;
    window.enterSimulationMode = enterSimulationMode;
    window.updateFocusFromEEG = updateFocusFromEEG;
    window.showDeviceModal = showDeviceModal;
    window.hideDeviceModal = hideDeviceModal;
    window.leaveEEGMode = leaveEEGMode;

    function updateFocusFromEEG(val) {
        if (val >= 0 && val <= 100) {
            focusLevel = val;
            renderFocusTelemetry(CONFIG.isPaused ? 0 : getEffectiveFocusLevel());
            
            updateSpeedVisuals();
        }
    }

    function updateConnectBtn(text, isLoading = false, isSuccess = false) {
        const btn = document.getElementById('btn-connect-eeg');
        if (!btn) return;
        
        if (btn.dataset.lastText === text && btn.dataset.lastLoading === String(isLoading) && btn.dataset.lastSuccess === String(isSuccess)) {
            return;
        }
        btn.dataset.lastText = text;
        btn.dataset.lastLoading = String(isLoading);
        btn.dataset.lastSuccess = String(isSuccess);

        btn.innerHTML = `<span>${isSuccess ? '🔗' : '🌐'}</span> ${text}`;
        
        btn.classList.remove('connected', 'signal-poor', 'loading');
        
        if (isLoading) {
            btn.disabled = true;
            btn.classList.add('loading');
            btn.onclick = null;
        } else {
            btn.disabled = false;
            if (isSuccess) {
                 if (text.includes("Weak") || text.includes("Poor") || text.includes("Lost") || text.includes("Failed") || text.includes("Error") || text.includes("missing")) {
                     btn.classList.add('signal-poor');
                 } else {
                     btn.classList.add('connected');
                 }
                btn.onclick = () => disconnectBridge();
            } else {
                btn.onclick = () => connectBridge();
            }
        }
    }
    
    function enableManualMode() {
        hideDeviceModal();
        selectedInputMode = 'simulation';
        isSimulationMode = true; 
        isConnected = false; 
        setEEGConnectionState('simulation', 'Manual focus slider is active. This is not real EEG data.');
        updateConnectBtn("Manual Mode", false, true); 
        
        const panel = document.getElementById('manual-debug-panel');
        if (panel) {
            panel.style.display = 'block';
            const slider = document.getElementById('manual-attention');
            const valDisplay = document.getElementById('manual-attention-val');
            updateFocusFromEEG(parseInt(slider.value));
            slider.oninput = (e) => {
                const val = parseInt(e.target.value);
                valDisplay.textContent = val;
                updateFocusFromEEG(val);
            };
        }
        updateSimulationHint();
    }

    function enterSimulationMode() {
        hideDeviceModal();
        removeDebugOverlay();
        selectedInputMode = 'simulation';
        eegModeActive = false;
        isSimulationMode = true;
        isConnected = false;
        if (focusInterval) clearInterval(focusInterval);
        resetFocusTelemetry(false);
        setEEGConnectionState(
            'simulation',
            CONFIG.focusSource === 'camera-ready'
                ? langText('相機鏡頭已準備。遊戲正透過相機觀察你的專注度。', 'Camera is ready. The game is monitoring your focus via camera.')
                : langText('未授權相機。Simulation mode 正使用 20/80 fallback 專注片段。', 'Camera not allowed. Simulation mode is using the 20/80 fallback focus segments.')
        );
        updateConnectBtn("Simulation Mode", false, true);
        startFocusSimulation();
        updateSimulationHint();
    }
    
    function updateSimulationHint() {
        const hintEl = document.getElementById('simulation-hint-eeg');
        if(hintEl) {
            hintEl.classList.remove('pairing', 'simulation', 'live');
            if (selectedInputMode === 'simulation') {
                hintEl.textContent = CONFIG.focusSource === 'camera-ready'
                    ? langText('Camera active · tracking focus', 'Camera active · tracking focus')
                    : langText('20/80 fallback simulation', '20/80 fallback simulation');
                hintEl.style.display = 'block';
                hintEl.style.color = '#fde047';
                hintEl.classList.add('simulation');
            } else if (selectedInputMode === 'eeg' && hasLiveEEGData) {
                hintEl.textContent = langText('Live MindWave signal', 'Live MindWave signal');
                hintEl.style.display = 'block';
                hintEl.style.color = '#86efac';
                hintEl.classList.add('live');
            } else if (selectedInputMode === 'eeg') {
                hintEl.textContent = langText('配對中，持續搜尋 MindWave...', 'Pairing in progress. Searching MindWave...');
                hintEl.style.display = 'block';
                hintEl.style.color = '#93c5fd';
                hintEl.classList.add('pairing');
            } else {
                hintEl.style.display = 'none';
            }
        }
    }

    function hideDeviceModal() {
        const modal = document.getElementById('device-modal');
        if (modal) modal.style.display = 'none';
    }

    function showDeviceModal() {
        const modal = document.getElementById('device-modal');
        if (modal) modal.style.display = 'flex';
    }

// --- Audio & Landing Page Logic ---
function initAudio() {
    // Resume audio context on user interaction
    document.body.addEventListener('click', () => {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }, { once: true });
}

function playTone(freq, type, duration) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playCorrectSound() {
    if (SOUNDS.correct) {
        SOUNDS.correct.currentTime = 0;
        SOUNDS.correct.play().catch(e => console.warn("Audio play blocked:", e));
    }
}

function playWrongSound() {
    if (SOUNDS.wrong) {
        SOUNDS.wrong.currentTime = 0;
        SOUNDS.wrong.play().catch(e => console.warn("Audio play blocked:", e));
    }
}

function startBGM() {
    if (SOUNDS.bgmOcean) SOUNDS.bgmOcean.play().catch(e => console.warn("BGM Ocean blocked:", e));
    if (SOUNDS.bgmNature) SOUNDS.bgmNature.play().catch(e => console.warn("BGM Nature blocked:", e));
}

function stopBGM() {
    if (SOUNDS.bgmOcean) {
        SOUNDS.bgmOcean.pause();
        SOUNDS.bgmOcean.currentTime = 0;
    }
    if (SOUNDS.bgmNature) {
        SOUNDS.bgmNature.pause();
        SOUNDS.bgmNature.currentTime = 0;
    }
}

function configureRuntime(options = {}) {
    const {
        user = CONFIG.currentUser,
        lang = CONFIG.currentLang,
        difficulty = CONFIG.difficulty,
        testMode = CONFIG.testMode,
        trainingDurationSec = CONFIG.trainingDurationSec,
        inputMode = selectedInputMode,
        focusSource = CONFIG.focusSource,
        cameraConsent = CONFIG.cameraConsent,
        onResults = runtimeResultsHandler
    } = options;

    CONFIG.currentUser = user || null;
    CONFIG.currentLang = lang || CONFIG.currentLang;
    CONFIG.difficulty = difficulty || CONFIG.difficulty;
    CONFIG.testMode = ['training', 'challenge'].includes(testMode) ? testMode : CONFIG.testMode;
    CONFIG.trainingDurationSec = Math.max(30, Math.min(1800, Number(trainingDurationSec || CONFIG.trainingDurationSec || DEFAULT_TRAINING_DURATION_SEC)));
    CONFIG.focusSource = focusSource || CONFIG.focusSource;
    CONFIG.cameraConsent = cameraConsent || CONFIG.cameraConsent;
    if (['idle', 'simulation', 'eeg'].includes(inputMode)) {
        selectedInputMode = inputMode;
    }
    runtimeResultsHandler = onResults || null;

    const displayUsernameEl = document.getElementById('display-username');
    if (displayUsernameEl && CONFIG.currentUser) {
        displayUsernameEl.textContent = CONFIG.currentUser;
    }

    document.body.dataset.lang = CONFIG.currentLang;
    document.documentElement.lang = CONFIG.currentLang === 'hk' ? 'zh-HK' : 'en';
    updateModeStatusUI();
    applySessionModeUI();
}

function startGameSession() {
    initGameSession();
}

function disposeGameSession() {
    activeGameSessionId += 1;
    isGameActive = false;
    stopBGM();
    clearStroopTimer();

    if (startupTimeoutId) {
        clearTimeout(startupTimeoutId);
        startupTimeoutId = null;
    }

    if (typeof gameLoop !== 'undefined' && gameLoop?.isRunning) {
        gameLoop.stop();
    }

    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    if (speedUpdateInterval) {
        clearInterval(speedUpdateInterval);
        speedUpdateInterval = null;
    }

    if (connectionWatchdogInterval) {
        clearInterval(connectionWatchdogInterval);
        connectionWatchdogInterval = null;
    }

    const questionPanel = document.getElementById('question-panel');
    if (questionPanel) questionPanel.style.display = 'none';

    const transitionLoader = document.getElementById('transition-loader');
    if (transitionLoader) {
        transitionLoader.style.display = 'none';
        transitionLoader.style.opacity = '0';
    }

    const countdown = document.getElementById('game-countdown');
    if (countdown) {
        countdown.classList.remove('active');
        countdown.style.display = 'none';
    }

    try {
        stopCameraPreview();
    } catch (e) {
        console.warn('Error stopping camera preview:', e);
    }

    leaveEEGMode(false);
}

async function activateEEGMode() {
    selectedInputMode = 'eeg';
    eegModeActive = true;
    isSimulationMode = false;

    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }

    resetFocusTelemetry(true);
    updateModeSelectionHelper(
        langText('真實 EEG 已待命', 'Real EEG Armed'),
        langText('正在搜尋已配對的 MindWave。', 'Searching your paired MindWave.')
    );
    setEEGConnectionState(
        'searching',
        langText('正在搜尋已配對的 MindWave，並啟動本機 EEG bridge...', 'Searching your paired MindWave and opening the local EEG bridge...')
    );
    updateSimulationHint();

    const bridgeOk = await connectBLE();
    if (!bridgeOk) {
        return { ok: false, reason: 'bridge-unavailable' };
    }

    const liveResult = await waitForLiveEEG();
    if (!liveResult.ok) {
        if (liveResult.reason === 'no-live-data') {
            setEEGConnectionState(
                'warning',
                langText('已連接到 bridge，但未收到真實腦波。請確認頭帶已開機、重新配對並保持感測器貼合。', 'Bridge connected, but no live EEG arrived. Confirm the headset is powered on, paired again, and the sensor is touching well.')
            );
        }
        return liveResult;
    }

    setEEGConnectionState(
        'streaming',
        langText('真實 EEG 已確認連接，可以開始遊戲。', 'Live EEG confirmed. You can start the game now.')
    );
    return { ok: true, reason: 'live' };
}

function setupLandingPage() {
    console.log("Setting up landing page...");
    const enterAppButtons = document.querySelectorAll('[data-enter-app]');
    enterAppButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            ROUTER.navigate('#login');
        });
    });

    // Back to Home from Auth Screen
    const btnBackAuth = document.getElementById('btn-back-home-auth');
    if (btnBackAuth) {
        btnBackAuth.addEventListener('click', (e) => {
            e.preventDefault();
            leaveEEGMode();
            ROUTER.navigate('#home');
        });
    }

    // Back to Home from Game UI
    const btnBackGame = document.getElementById('btn-back-home-game');
    if (btnBackGame) {
        btnBackGame.addEventListener('click', (e) => {
             // Confirm exit?
             if(confirm("Exit game and return to home? Progress will be lost.")) {
                 leaveEEGMode();
                 ROUTER.navigate('#home');
                 window.location.reload();
             }
        });
    }
}

// --- Data Visualization Modal Logic ---
window.showData = function(type) {
    const modal = document.getElementById('data-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!modal || !modalBody) return;
    
    let content = "";
    const lang = CONFIG.currentLang;
    
    if (type === 'focus') {
        content = `
            <h2 style="color: var(--primary-color); margin-bottom: 20px;">${lang === 'hk' ? '專注力提升數據' : 'Focus Improvement Data'}</h2>
            <p style="margin-bottom: 20px; color: var(--text-color);">
                ${lang === 'hk' 
                    ? '根據 500 名學生為期 8 週的測試，平均持續專注時間顯著提升。' 
                    : 'Based on an 8-week test with 500 students, average sustained focus time increased significantly.'}
            </p>
            
            <div class="data-chart-container">
                <div class="data-bar-group">
                    <div class="data-label"><span>Week 1</span><span>15 mins</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 25%"></div></div>
                </div>
                <div class="data-bar-group">
                    <div class="data-label"><span>Week 4</span><span>28 mins</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 46%"></div></div>
                </div>
                <div class="data-bar-group">
                    <div class="data-label"><span>Week 8</span><span>45 mins</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 75%"></div></div>
                </div>
            </div>
            
            <div style="margin-top: 30px; padding: 15px; background: rgba(14, 165, 233, 0.1); border-radius: 10px;">
                <strong style="color: var(--primary-color);">Insights:</strong>
                <ul style="margin-left: 20px; margin-top: 10px; color: var(--text-muted);">
                    <li>${lang === 'hk' ? '參與者報告課堂分心次數減少 60%。' : 'Participants reported 60% fewer distractions in class.'}</li>
                    <li>${lang === 'hk' ? '完成作業速度平均提升 30%。' : 'Homework completion speed increased by 30% on average.'}</li>
                </ul>
            </div>
        `;
    } else if (type === 'exam') {
        content = `
            <h2 style="color: #8b5cf6; margin-bottom: 20px;">${lang === 'hk' ? '考試焦慮改善' : 'Exam Anxiety Reduction'}</h2>
            <p style="margin-bottom: 20px; color: var(--text-color);">
                ${lang === 'hk' 
                    ? '透過 Alpha 波訓練，學生在模擬考試中的生理壓力指標顯著下降。' 
                    : 'Through Alpha wave training, students showed significantly lower physiological stress markers in mock exams.'}
            </p>
            
            <div class="data-chart-container">
                <div class="data-bar-group">
                    <div class="data-label"><span>Before Training (High Anxiety)</span><span>8.5/10</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 85%; background: #ef4444;"></div></div>
                </div>
                <div class="data-bar-group">
                    <div class="data-label"><span>After Training (Calm)</span><span>3.2/10</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 32%; background: #10b981;"></div></div>
                </div>
            </div>
             <div style="margin-top: 30px; padding: 15px; background: rgba(139, 92, 246, 0.1); border-radius: 10px;">
                <strong style="color: #8b5cf6;">Insights:</strong>
                <p style="margin-top: 10px; color: var(--text-muted);">
                    ${lang === 'hk' ? '心率變異度 (HRV) 分析顯示，受試者在解難題時更能保持冷靜。' : 'HRV analysis showed subjects remained calmer when solving difficult problems.'}
                </p>
            </div>
        `;
    } else if (type === 'memory') {
        content = `
            <h2 style="color: #10b981; margin-bottom: 20px;">${lang === 'hk' ? '記憶留存率比較' : 'Retention Rate Comparison'}</h2>
             <p style="margin-bottom: 20px; color: var(--text-color);">
                ${lang === 'hk' 
                    ? '專注力狀態下學習的內容，一週後的遺忘率明顯較低。' 
                    : 'Content learned in a focused state had a significantly lower forgetting rate after one week.'}
            </p>
            
            <div class="data-chart-container">
                <div class="data-bar-group">
                    <div class="data-label"><span>Standard Study</span><span>40% Retained</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 40%; background: #64748b;"></div></div>
                </div>
                <div class="data-bar-group">
                    <div class="data-label"><span>With EEG Focus Game</span><span>78% Retained</span></div>
                    <div class="data-bar-bg"><div class="data-bar-fill" style="width: 78%; background: #10b981;"></div></div>
                </div>
            </div>
        `;
    }
    
    modalBody.innerHTML = content;
    modal.style.display = 'flex';
    
    // Simple animation for bars
    setTimeout(() => {
        const bars = document.querySelectorAll('.data-bar-fill');
        bars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0';
            setTimeout(() => bar.style.width = width, 50);
        });
    }, 100);
}

window.closeDataModal = function() {
    const modal = document.getElementById('data-modal');
    if (modal) modal.style.display = 'none';
}

// Close on outside click
window.addEventListener('click', function(event) {
    const modal = document.getElementById('data-modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// --- Expose for Testing ---
window.GAME_STATS = GAME_STATS;
window.ROUTER = ROUTER;
window.updateDigitDisplay = updateDigitDisplay;
window.getBoatLoadedPromise = () => boatLoadedPromise;

export {
    activateEEGMode,
    CONFIG,
    GAME_STATS,
    ROUTER,
    compactStatusMessage,
    configureRuntime,
    connectBLE,
    connectBridge,
    disconnectBLE,
    disconnectBridge,
    disposeGameSession,
    enterSimulationMode,
    initApp,
    initGameSession,
    leaveEEGMode,
    renderResults,
    renderSessionDashboard,
    renderHistoryTrend,
    setEEGConnectionState,
    showResults,
    startGameSession,
    switchLanguage,
    switchEnvironment,
    updateFocusFromEEG,
    updateModeSelectionHelper,
    updateModeStatusUI,
    updateSimulationHint
};
