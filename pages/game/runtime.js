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

// --- Configuration & State ---
const CONFIG = {
    // SECURITY NOTE: In a real production app, never hardcode API keys. 
    // Use a backend proxy. For this prototype, we check localStorage first.
    deepseekApiKey: localStorage.getItem('deepseek_api_key') || "sk-34b023fc593e4cc6b5b2c7c5d8fda6b7", 
    apiUrl: "https://api.deepseek.com/chat/completions",
    currentLang: "hk",
    currentUser: null,
    difficulty: "easy",
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

let runtimeResultsHandler = null;

function isCompactViewport() {
    return Math.min(window.innerWidth, window.innerHeight) < 820 || (window.devicePixelRatio || 1) > 1.8;
}

function getFallbackQuestions() {
    return langText([
        {
            question: '小明將一疊書平均放入 3 個書架，每個書架有 12 本，請問總共有幾多本書？',
            options: ['24本', '36本', '48本', '12本'],
            answer: 1,
            explanation: '3 個書架，每個 12 本，所以是 3 x 12 = 36。'
        },
        {
            question: '一架車 2 分鐘行 1 公里，8 分鐘行了多少公里？',
            options: ['2公里', '4公里', '6公里', '8公里'],
            answer: 1,
            explanation: '8 分鐘是 2 分鐘的 4 倍，所以距離也是 4 倍。'
        },
        {
            question: '如果今天比昨天多做 5 題，而昨天做了 18 題，今天做了多少題？',
            options: ['13題', '18題', '23題', '28題'],
            answer: 2,
            explanation: '18 + 5 = 23。'
        }
    ], [
        {
            question: 'A stack of books is divided equally across 3 shelves with 12 books on each shelf. How many books are there in total?',
            options: ['24', '36', '48', '12'],
            answer: 1,
            explanation: '3 shelves x 12 books = 36.'
        },
        {
            question: 'A car travels 1 km in 2 minutes. How far does it travel in 8 minutes?',
            options: ['2 km', '4 km', '6 km', '8 km'],
            answer: 1,
            explanation: '8 minutes is 4 times 2 minutes, so distance is also 4 times.'
        },
        {
            question: 'If you solve 5 more questions today than yesterday, and yesterday you solved 18, how many did you solve today?',
            options: ['13', '18', '23', '28'],
            answer: 2,
            explanation: '18 + 5 = 23.'
        }
    ]);
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
        const bestDist = parseFloat(localStorage.getItem('best_distance') || '0');
        const bestAcc = parseFloat(localStorage.getItem('best_accuracy') || '0');
        const bestTime = parseFloat(localStorage.getItem('best_time') || '999999999'); // Lower is better? Or maybe longest time? Usually time is "speedrun" style (lower better) or "survival" (higher better).
        // For this game, it's 10 questions. So faster is better? Or just "Time Taken".
        // Let's assume Time Taken (Lower is better).
        
        const isNewDist = distance > bestDist;
        const isNewAcc = accuracy > bestAcc;
        const isNewTime = timeMs < bestTime && accuracy === 100; // Only track best time for perfect runs? Or just best time. Let's say best time regardless.
        
        if (distance > bestDist) localStorage.setItem('best_distance', distance.toFixed(1));
        if (accuracy > bestAcc) localStorage.setItem('best_accuracy', accuracy.toFixed(1));
        if (timeMs < bestTime) localStorage.setItem('best_time', timeMs.toString());
        
        return { isNewDist, isNewAcc, isNewTime };
    },
    
    getBest() {
        return {
            distance: localStorage.getItem('best_distance') || '—',
            accuracy: localStorage.getItem('best_accuracy') || '—',
            time: localStorage.getItem('best_time') || '—'
        };
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
    bgmNature: new Audio('bgm/nature.mp3'),
    correct: new Audio('bgm/rightanswer.mp3'),
    wrong: new Audio('bgm/error.mp3')
};

// Configure Audio
if (SOUNDS.bgmOcean) SOUNDS.bgmOcean.loop = true;
SOUNDS.bgmNature.loop = true;
if (SOUNDS.bgmOcean) SOUNDS.bgmOcean.volume = 0.5;
SOUNDS.bgmNature.volume = 0.3;
SOUNDS.correct.volume = 0.8;
SOUNDS.wrong.volume = 0.8;

const TOTAL_QUESTIONS = 10;
let isWaitingForQuestions = false;

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
let lastEEGDataTime = 0;
let retryCount = 0;
const MAX_RETRIES = 3;

// #region debug-point C:runtime-report
const DEBUG_SERVER_URL = window.__TRAE_DEBUG_SERVER_URL__ || null;
const reportRuntimeDebug = (hypothesisId, msg, data = {}) => {
    if (!DEBUG_SERVER_URL) return Promise.resolve();
    return fetch(DEBUG_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'stitch-layout-game-render', runId: 'post-fix', hypothesisId, location: 'pages/game/runtime.js', msg: `[DEBUG] ${msg}`, data, ts: Date.now() })
    }).catch(() => {});
};
// #endregion

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
    // 0. Flow State Logic
    const isFlowState = (focusLevel > 80 && CONFIG.streak >= 3);
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
    if (!isGameActive) {
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

    const moveDist = speedMPS * delta; 
    
    // Update Stats
    if (isGameActive && !CONFIG.isPaused) {
        CONFIG.totalDistance += moveDist;
        
        // TEST PANEL UPDATE
        TEST_PANEL.update(delta * 1000, CONFIG.totalDistance);

        // Update DOM - Throttled for readability and performance (User request: ~20ms interval)
        const now = performance.now();
        if (!CONFIG.lastHUDUpdate || now - CONFIG.lastHUDUpdate > 20) {
            CONFIG.lastHUDUpdate = now;
            
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
            const elapsed = now - CONFIG.gameStartTime;
            const timeEl = document.getElementById('play-time-value');
            if (timeEl) {
                const timeText = GAME_STATS.formatTime(elapsed).substring(0, 5); // mm:ss only for HUD
                updateDigitDisplay(timeEl, timeText);
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
        const targetOffset = new THREE.Vector3(20, 11, 36);
        const targetPos = boat.position.clone().add(targetOffset);
        camera.position.lerp(targetPos, 0.06); 
        
        // Keep the full hull inside frame while showing its right-rear side.
        const lookAtTarget = new THREE.Vector3(
            boat.position.x + 0.6,
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

// Expose to global scope for HTML onclick
window.startGameWithDifficulty = function(level) {
    CONFIG.difficulty = level;
    
    // Show transition loader immediately to prevent "crash" perception
    const tLoader = document.getElementById('transition-loader');
    if (tLoader) {
        tLoader.style.display = 'flex';
        tLoader.style.opacity = '1';
    }
    
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
        canvasContainer.style.opacity = '0';
        canvasContainer.style.filter = 'blur(10px) saturate(0.72)';
        canvasContainer.style.transform = 'scale(1.02)';
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

function initGameSession() {
    console.log("Starting Game Session...");
    // #region debug-point C:init-game-session
    reportRuntimeDebug('C', 'initGameSession called', {
        selectedInputMode,
        hasExistingScene: Boolean(scene),
        hasBoat: Boolean(boat),
        hasRenderer: Boolean(renderer),
        currentQuestionBankSize: questionBank.length
    });
    // #endregion
    CONFIG.score = 0;
    CONFIG.streak = 0;
    CONFIG.wrongAnswers = [];
    CONFIG.totalDistance = 0;
    updateLoadingStatus(I18N[CONFIG.currentLang].preparing_game);
    
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
    document.getElementById('score-text').textContent = "0/10";
    document.getElementById('distance-value').textContent = "0.0 m";
    document.getElementById('play-time-value').textContent = "00:00";
    
    // Start BGM
    startBGM();
    
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

    const transitionLoader = document.getElementById('transition-loader');
    if (transitionLoader) {
        transitionLoader.style.display = 'flex';
        transitionLoader.style.opacity = '1';
    }

    // Initial Load: keep question panel hidden until countdown finishes
    const qPanel = document.getElementById('question-panel');
    qPanel.style.display = 'none';
    const qHeader = document.getElementById('question-header');
    qHeader.textContent = I18N[CONFIG.currentLang].game_question_title;
    document.getElementById('question-text').textContent = "";
    document.getElementById('question-options').innerHTML = "";
    
    // Fetch AI questions in the background, but do not block the first playable frame on them.
    fetchBatchQuestions(2, true).catch(err => {
        console.warn("Initial AI fetch failed. Falling back to local starter questions:", err);
        if (questionBank.length === 0) {
            questionBank = getFallbackQuestions();
            currentQuestionIndex = 0;
        }
        return [];
    });

    const coreAssetPromise = typeof assetsLoadedPromise !== 'undefined'
        ? assetsLoadedPromise
        : (typeof boatLoadedPromise !== 'undefined' ? boatLoadedPromise : Promise.resolve());

    Promise.allSettled([coreAssetPromise]).then(() => {
        // #region debug-point D:game-start-ready
        reportRuntimeDebug('D', 'game start promise settled', {
            hasBoat: Boolean(boat),
            questionBankSize: questionBank.length,
            hasScene: Boolean(scene),
            hasRendererDom: Boolean(renderer?.domElement),
            canvasChildren: document.getElementById('canvas-container')?.childElementCount || 0
        });
        // #endregion
        // 1. Ensure boat exists if it failed
        if (!boat) {
            console.warn("Boat missing after timeout. Creating fallback.");
            boat = createFallbackBoat();
            boat.position.y = -0.35;
            scene.add(boat);
        }
        
        // 2. Ensure questions exist for the first playable frame
        if (questionBank.length === 0) {
            console.warn("Questions not ready yet. Using local starter questions.");
            questionBank = getFallbackQuestions();
            currentQuestionIndex = 0;
        }

        // 3. Force Camera & Controls to Game Position (Prevent Fly-in glitch)
        // MOVED BEFORE WARM-UP to ensure warm-up frame is correct
        if (boat && camera && controls) {
             const targetOffset = new THREE.Vector3(20, 11, 36); 
             const targetPos = boat.position.clone().add(targetOffset);
             camera.position.copy(targetPos);
             
             const lookAtTarget = new THREE.Vector3(
                boat.position.x + 0.6,
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

        // 6. Remove "ready" loader copy and hand off directly to countdown
        if (transitionLoader) {
            transitionLoader.style.opacity = '0';
            setTimeout(() => { transitionLoader.style.display = 'none'; }, 180);
        }

        setGamePresentationState('countdown');

        requestAnimationFrame(() => startCountdown(() => {
            setGamePresentationState('active');
            loadQuestionFromBank();
            CONFIG.gameStartTime = performance.now();
            isGameActive = true; 
            
            // After game starts, keep filling the bank in background if needed.
            if (questionBank.length < 6) {
                fetchBatchQuestions(8, false);
            }
        }));
    }).catch(err => {
        console.error("Critical Error during game start:", err);
        
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
function resetFocusTelemetry(usePlaceholder = false) {
        focusLevel = 0;
        targetSpeed = 0;
        boatSpeed = 0;
        isHeadsetConnected = false;
        hasLiveEEGData = false;

        const focusValEl = document.getElementById('focus-value');
        if (focusValEl) focusValEl.textContent = usePlaceholder ? '--' : '0%';

        const focusBarEl = document.getElementById('focus-bar');
        if (focusBarEl) focusBarEl.style.width = '0%';

        const speedValEl = document.getElementById('speed-value');
        if (speedValEl) updateDigitDisplay(speedValEl, '0 km/h');

        const speedBarEl = document.getElementById('speed-bar');
        if (speedBarEl) {
            speedBarEl.style.width = '0%';
            speedBarEl.style.background = 'linear-gradient(90deg, #090b12 0%, #2a0000 42%, #ff3b30 100%)';
            speedBarEl.style.boxShadow = 'none';
        }
    }

function startFocusSimulation() {
        if(focusInterval) clearInterval(focusInterval);
        
        // Only run if in simulation mode
        if (!isSimulationMode) return;
        
        console.log("Starting Focus Simulation...");
        resetFocusTelemetry(false);
        focusLevel = 50;
        let phase = 0;
        
        focusInterval = setInterval(() => {
            phase += 0.25;
            const base = 50;
            const amp = 10;
            focusLevel = base + Math.sin(phase) * amp;
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
    
    const canDriveWithEEG = selectedInputMode === 'eeg' && isHeadsetConnected && hasLiveEEGData;
    if (canDriveWithEEG || isSimulationMode) {
        // Connected: Speed 0 - MAX based on focus
        // Focus 0-100 -> Speed 0-MAX
        // Req: 0% = 0.
        const maxSpeed = CONFIG.MAX_SHIP_SPEED;
        const normalizedFocus = THREE.MathUtils.clamp(focusLevel / 100, 0, 1);
        targetSpeed = Math.pow(normalizedFocus, 1.18) * maxSpeed;
        boatSpeed = THREE.MathUtils.lerp(boatSpeed, targetSpeed, isSimulationMode ? 0.085 : 0.07);
    } else {
        // Not Connected: Decelerate to 0
        targetSpeed = 0;
        boatSpeed = THREE.MathUtils.lerp(boatSpeed, targetSpeed, 0.045);
    }
    
    // Update UI Text/Bar
    const speedValEl = document.getElementById('speed-value');
    if(speedValEl) {
        updateDigitDisplay(speedValEl, Math.round(boatSpeed) + ' km/h');
    }
    
    const speedBarEl = document.getElementById('speed-bar');
    if(speedBarEl) {
        const maxSpeed = CONFIG.MAX_SHIP_SPEED;
        const speedPercent = THREE.MathUtils.clamp((boatSpeed / maxSpeed) * 100, 0, 100);
        speedBarEl.style.width = speedPercent + '%';
        speedBarEl.style.background = 'linear-gradient(90deg, #090b12 0%, #2a0000 42%, #ff3b30 100%)';
        speedBarEl.style.boxShadow = `0 0 14px rgba(255, 59, 48, ${0.18 + (speedPercent / 100) * 0.32})`;
    }
}

function loadQuestionFromBank() {
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
    } else {
        // Game Over - Show Results
        showResults();
    }
}

function renderResults() {
    const finalScore = CONFIG.score;
    const totalQ = TOTAL_QUESTIONS;
    const accuracy = (finalScore / totalQ) * 100;
    
    CONFIG.gameEndTime = performance.now();
    const totalTimeMs = CONFIG.gameEndTime - CONFIG.gameStartTime;
    
    // Save Best
    const { isNewDist, isNewAcc, isNewTime } = GAME_STATS.saveBest(CONFIG.totalDistance, accuracy, totalTimeMs);
    const bests = GAME_STATS.getBest();
    
    // Update UI
    document.getElementById('res-distance').textContent = CONFIG.totalDistance.toFixed(1) + " m";
    document.getElementById('res-accuracy').textContent = accuracy.toFixed(0) + "%";
    document.getElementById('res-time').textContent = GAME_STATS.formatTime(totalTimeMs);
    
    document.getElementById('best-distance').textContent = `${I18N[CONFIG.currentLang].best_label}: ${bests.distance} m ${isNewDist ? '🔥' : ''}`;
    document.getElementById('best-accuracy').textContent = `${I18N[CONFIG.currentLang].best_label}: ${bests.accuracy} % ${isNewAcc ? '🔥' : ''}`;
    document.getElementById('best-time').textContent = `${I18N[CONFIG.currentLang].best_label}: ${GAME_STATS.formatTime(bests.time)} ${isNewTime ? '🔥' : ''}`;
    
    // Render Wrong Answers List
    const list = document.getElementById('wrong-answers-list');
    list.innerHTML = '';
    
    if (CONFIG.wrongAnswers.length === 0) {
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

async function fetchBatchQuestions(count = 10, isInitial = true) {
    // Reset lock if it's been too long (e.g. > 5 seconds)
    if (isFetchingQuestion && (Date.now() - lastFetchTime > 10000)) {
        console.warn("Resetting fetch lock due to timeout");
        isFetchingQuestion = false;
    }

    if (isFetchingQuestion) return;
    isFetchingQuestion = true;
    lastFetchTime = Date.now();

    updateLoadingStatus(I18N[CONFIG.currentLang].loading_ai_connect);

    if (!CONFIG.deepseekApiKey) {
        throw new Error("Missing API Key");
    }

    try {
        const langStr = CONFIG.currentLang === 'hk' ? "Traditional Chinese (Cantonese context if applicable)" : "English";
        const diffStr = CONFIG.difficulty;
        
        // Revised Prompt - Optimized for speed (concise, fewer tokens)
        const prompt = `Generate ${count} "Daily Life Logic" puzzles.
        Level: ${diffStr}. Language: ${langStr}. Audience: Middle school.
        Keep each question concise: <= 38 Chinese characters or <= 90 English characters.
        Keep each option concise: <= 14 Chinese characters or <= 32 English characters.
        Keep each explanation short: <= 22 Chinese characters or <= 50 English characters.
        Avoid long stories and filler.
        Format: STRICT JSON Array.
        Fields: 'question', 'options' (4 strings), 'answer' (0-3), 'explanation' (short).
        Example: [{"question":"...", "options":["A","B","C","D"], "answer":0, "explanation":"..."}]`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout for AI

        const response = await fetch(CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.deepseekApiKey.trim()}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", 
                messages: [
                    {"role": "system", "content": "You are a creative game designer. Return strictly valid JSON array."},
                    {"role": "user", "content": prompt}
                ],
                temperature: 0.8, // Slightly lower for faster/stable output
                max_tokens: 1024 // Limit output size
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
        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '');
        
        // Ensure it's an array
        let parsed;
        try {
            parsed = JSON.parse(content);
        } catch(e) {
            throw new Error("Invalid JSON from AI");
        }
        
        let newQuestions = [];
        
        if (Array.isArray(parsed)) {
            newQuestions = parsed.map(normalizeQuestionItem).filter((item) => item.question && item.options.length === 4);
        } else if (parsed.question) {
            newQuestions = [normalizeQuestionItem(parsed)].filter((item) => item.question && item.options.length === 4);
        }
        
        if (newQuestions.length === 0) {
            throw new Error("AI returned empty question list");
        }
        
        if (isInitial) {
            questionBank = newQuestions;
            currentQuestionIndex = 0;
            loadQuestionFromBank();
        } else {
            questionBank = [...questionBank, ...newQuestions];
            console.log(`Background fetch loaded ${newQuestions.length} more questions.`);
            
            // Resume if user was waiting
            if (isWaitingForQuestions) {
                loadQuestionFromBank();
            }
        }
        
        updateLoadingStatus(I18N[CONFIG.currentLang].loading_ai_ready);

    } catch (error) {
        console.error("Fetch Questions Error:", error);
        updateLoadingStatus(`${I18N[CONFIG.currentLang].loading_failed}: ${error.message}`);
        throw error; // Propagate error to initGameSession catch block
    } finally {
        isFetchingQuestion = false;
    }
}

function generateMockPuzzle(index = 0) {
    const hkQ = [
        { q: "數列：2, 4, 8, 16, ? 下一個數字是？", o: ["24", "32", "64", "20"], a: 1 },
        { q: "如果 A > B，且 B > C，那麼？", o: ["A < C", "A = C", "A > C", "無法判斷"], a: 2 },
        { q: "哪一個不是水果？", o: ["蘋果", "香蕉", "西蘭花", "橙"], a: 2 },
        { q: "冰變成水是什麼過程？", o: ["凝固", "融化", "蒸發", "昇華"], a: 1 },
        { q: "1, 1, 2, 3, 5, ? (斐波那契數列)", o: ["8", "7", "6", "9"], a: 0 }
    ];
    
    // Cycle through mock questions
    const qData = hkQ[index % hkQ.length];

    return {
        question: CONFIG.currentLang === 'hk' ? qData.q : "Mock Question " + (index+1),
        options: CONFIG.currentLang === 'hk' ? qData.o : ["A", "B", "C", "D"],
        answer: qData.a,
        explanation: langText('留意題目中的規律。', 'Focus on the pattern.')
    };
}

function compactText(value, maxLength) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
}

function normalizeQuestionItem(item = {}) {
    const isHk = CONFIG.currentLang === 'hk';
    const questionLimit = isHk ? 38 : 90;
    const optionLimit = isHk ? 14 : 32;
    const explanationLimit = isHk ? 22 : 50;

    return {
        question: compactText(item.question, questionLimit),
        options: Array.isArray(item.options)
            ? item.options.slice(0, 4).map((option) => compactText(option, optionLimit))
            : [],
        answer: Number.isInteger(item.answer) ? item.answer : 0,
        explanation: compactText(item.explanation || '', explanationLimit)
    };
}

function renderPuzzle(data) {
    const qPanel = document.getElementById('question-panel');
    qPanel.style.display = 'block'; // Show panel if hidden
    const qHeader = document.getElementById('question-header');
    qHeader.textContent = I18N[CONFIG.currentLang].puzzle_title;

    const qText = document.getElementById('question-text');
    const qOptions = document.getElementById('question-options');

    qText.textContent = data.question;
    qOptions.innerHTML = '';

    data.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        // Pass all buttons to checkAnswer so we can highlight correct one
        btn.onclick = () => checkAnswer(index, data.answer, btn, qOptions.children);
        qOptions.appendChild(btn);
    });
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
    
    if (CONFIG.streak > 1) {
        streakDisplay.style.display = 'block';
        streakCount.textContent = 'x' + CONFIG.streak;
        
        // Reset animation
        streakCount.style.animation = 'none';
        streakCount.offsetHeight; /* trigger reflow */
        streakCount.style.animation = 'pulse 0.5s';
        
        // Play streak sound
        if (CONFIG.streak % 3 === 0) {
             playTone(1000 + (CONFIG.streak * 50), 'triangle', 0.3);
        }
    } else {
        streakDisplay.style.display = 'none';
    }
}

// --- 3D Scene (Three.js) ---
let boatLoadedResolve;
const boatLoadedPromise = new Promise(resolve => boatLoadedResolve = resolve);

let assetsLoadedResolve;
const assetsLoadedPromise = new Promise(resolve => assetsLoadedResolve = resolve);

function init3DScene() {
    // #region debug-point C:init-scene-entry
    reportRuntimeDebug('C', 'init3DScene entry', {
        hasCanvasContainer: Boolean(document.getElementById('canvas-container')),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight
    });
    // #endregion
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
        // #region debug-point E:loading-manager-error
        reportRuntimeDebug('E', 'loading manager asset error', { url });
        // #endregion
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
        antialias: !compactViewport,
        alpha: true,
        powerPreference: 'high-performance'
    }); 
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactViewport ? 1.2 : 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Physically Correct Lights & Tone Mapping
    renderer.physicallyCorrectLights = true; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0; // Adjusted for HDR as requested
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Force sRGB
    
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    // #region debug-point C:renderer-appended
    reportRuntimeDebug('C', 'renderer appended', {
        hasScene: Boolean(scene),
        hasRenderer: Boolean(renderer),
        canvasChildren: document.getElementById('canvas-container')?.childElementCount || 0
    });
    // #endregion

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
    directionalLight.castShadow = true;
    
    // Optimized Shadow Settings
    directionalLight.shadow.mapSize.width = compactViewport ? 1024 : 2048; // Keep quality high on desktop, lighten mobile/tablet GPU cost
    directionalLight.shadow.mapSize.height = compactViewport ? 1024 : 2048;
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
    const envPromise = setupEnvironment(); // HDRI & Water Logic moved here

    // Do not block the first playable frame on the HDRI. Water and fallback lighting
    // are ready immediately, while the heavy environment map can settle in afterward.
    Promise.all([texturesPromise, boatLoadedPromise])
        .then(() => {
             console.log("Promise.all complete: Textures and Boat loaded. HDR continues in background if needed.");
             // #region debug-point D:asset-promise-all-success
             reportRuntimeDebug('D', 'all core assets resolved', {
                 hasBoat: Boolean(boat),
                 hasWaterNormalTexture: Boolean(waterNormalTexture),
                 hasFoamTexture: Boolean(foamTexture),
                 hasSplashTexture: Boolean(splashTexture),
                 hasSceneEnvironment: Boolean(scene?.environment)
             });
             // #endregion
             if (assetsLoadedResolve) assetsLoadedResolve();
        })
        .catch(err => {
             console.error("Asset Load Failed", err);
             // #region debug-point E:asset-promise-all-error
             reportRuntimeDebug('E', 'core asset promise rejected', {
                 message: err?.message || String(err)
             });
             // #endregion
             // Resolve anyway to prevent hang
             if (assetsLoadedResolve) assetsLoadedResolve();
        });

    envPromise.catch(err => {
        console.warn("Environment map load failed after gameplay unlocked.", err);
    });


    // 7. Load Boat (GLB)
    const loader = new GLTFLoader(loadingManager);
    const modelLoadStart = performance.now();
    updateLoadingStatus(I18N[CONFIG.currentLang].loading_boat);
    console.log("Starting model load: assets/EGGShip2.glb");
    
    loader.load(
        './assets/EGGShip2.glb',
        function (gltf) {
            // #region debug-point E:boat-load-success
            reportRuntimeDebug('E', 'boat model load success callback', {
                hasScene: Boolean(gltf?.scene),
                childCount: gltf?.scene?.children?.length || 0
            });
            // #endregion
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
                    child.castShadow = true;
                    child.receiveShadow = true;
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
            // #region debug-point E:boat-added-scene
            reportRuntimeDebug('E', 'boat added to scene', {
                boatType: boat?.type,
                sceneChildren: scene?.children?.length || 0
            });
            // #endregion
        },
        undefined,
        function (error) {
            // #region debug-point E:boat-load-error
            reportRuntimeDebug('E', 'boat model load error callback', {
                message: String(error?.message || error)
            });
            // #endregion
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
    if (isCompactViewport()) {
        composer = null;
        return;
    }

    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.8;  // Only very bright things bloom
    bloomPass.strength = 0.6;   // Moderate bloom intensity
    bloomPass.radius = 0.5;     // Blur radius

    // SMAA Pass for superior Anti-Aliasing
    const smaaPass = new SMAAPass(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(smaaPass); // Add SMAA as final pass
}

function loadTextures() {
    updateLoadingStatus(I18N[CONFIG.currentLang].loading_water);
    console.log("Loading Advanced Ocean Textures...");
    const loader = new THREE.TextureLoader(loadingManager);
    
    // Create Promises for each texture load
    const p1 = new Promise(resolve => {
        waterNormalTexture = loader.load('assets/water_normal.jpg', (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(4, 4);
            // #region debug-point D:texture-water-normal
            reportRuntimeDebug('D', 'water normal texture loaded', {
                imageWidth: tex.image?.width || null,
                imageHeight: tex.image?.height || null
            });
            // #endregion
            resolve(tex);
        });
    });

    const p2 = new Promise(resolve => {
        foamTexture = loader.load('assets/foam.jpg', (tex) => {
            tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
            // #region debug-point D:texture-foam
            reportRuntimeDebug('D', 'foam texture loaded', {
                imageWidth: tex.image?.width || null,
                imageHeight: tex.image?.height || null
            });
            // #endregion
            resolve(tex);
        });
    });

    const p3 = new Promise(resolve => {
        splashTexture = loader.load('assets/splash.png', (tex) => {
            // #region debug-point D:texture-splash
            reportRuntimeDebug('D', 'splash texture loaded', {
                imageWidth: tex.image?.width || null,
                imageHeight: tex.image?.height || null
            });
            // #endregion
            resolve(tex);
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
        const splashRate = Math.min(speed * 0.45, 7.5);
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
        const wakeRate = Math.min(speed * 0.7, 12.0);
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
    const normalTex = waterNormalTexture || new THREE.TextureLoader(loadingManager).load('assets/water_normal.jpg');
    // Ensure wrapping for detail
    normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
    // High Quality Filtering (Anti-Aliasing for Texture)
    normalTex.minFilter = THREE.LinearMipmapLinearFilter;
    normalTex.magFilter = THREE.LinearFilter;
    normalTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), isCompactViewport() ? 4 : 8);
    
    // If not already set by loadTextures (e.g. fallback path)
    if (!waterNormalTexture) normalTex.repeat.set(4, 4);

    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
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
        const hdrPath = isDay ? './assets/sky_day%202.hdr' : './assets/sky_moon.hdr';
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCompactViewport() ? 1.2 : 1.5));
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
        detailEl.textContent = I18N[CONFIG.currentLang].mode_simulation_detail;
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
            child.castShadow = true;
            child.receiveShadow = true;
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

    const bridgeHosts = Array.from(new Set([
        window.__EEG_BRIDGE_HOST__ || '',
        window.location.hostname || '',
        'localhost',
        '127.0.0.1'
    ].filter(Boolean)));
    const bridgeUrls = bridgeHosts.flatMap((host) => [
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

                        if (hasValidSignal) {
                            isHeadsetConnected = true;
                            hasLiveEEGData = true;
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
                resetFocusTelemetry(selectedInputMode === 'eeg');
                removeDebugOverlay();
                if (selectedInputMode === 'eeg') {
                    setEEGConnectionState('idle', langText('真實 EEG bridge 已關閉，請重新選擇 EEG 裝置。', 'Real EEG bridge is closed. Choose EEG Equipment to start again.'));
                }
                updateConnectBtn("Connect EEG", false, false);
                stopConnectionWatchdog();
                settle(false);
            };

            bridgeSocket.onerror = (e) => {
                console.error("Bridge WebSocket Error", e);
                updateConnectBtn("Bridge Connection Failed", false, false);
                settle(false);
            };
        });
    }

    function disconnectBridge() {
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
            if (!bridgeConnected) return;
            
            const now = Date.now();
            if (isHeadsetConnected && now - lastEEGDataTime > 5000) {
                console.warn("EEG Data Timeout (>5s). Signal Lost.");
                resetFocusTelemetry(selectedInputMode === 'eeg');
                setEEGConnectionState('warning', 'Signal timed out. The headset is connected but live EEG data stopped arriving.');
                updateConnectBtn("Signal Lost", true, false);
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
            const focusValEl = document.getElementById('focus-value');
            if(focusValEl) focusValEl.textContent = focusLevel + '%';
            
            const focusBarEl = document.getElementById('focus-bar');
            if(focusBarEl) focusBarEl.style.width = focusLevel + '%';
            
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
        setEEGConnectionState('simulation', 'Simulation mode is active. Focus values are generated locally.');
        updateConnectBtn("Simulation Mode", false, true);
        startFocusSimulation();
        updateSimulationHint();
    }
    
    function updateSimulationHint() {
        const hintEl = document.getElementById('simulation-hint-eeg');
        if(hintEl) {
            if (selectedInputMode === 'simulation') {
                hintEl.textContent = "Simulation signal";
                hintEl.style.display = 'block';
                hintEl.style.color = '#fde047';
            } else if (selectedInputMode === 'eeg' && hasLiveEEGData) {
                hintEl.textContent = "Live MindWave signal";
                hintEl.style.display = 'block';
                hintEl.style.color = '#86efac';
            } else if (selectedInputMode === 'eeg') {
                hintEl.textContent = "Waiting for MindWave";
                hintEl.style.display = 'block';
                hintEl.style.color = '#93c5fd';
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
        onResults = runtimeResultsHandler
    } = options;

    CONFIG.currentUser = user || null;
    CONFIG.currentLang = lang || CONFIG.currentLang;
    CONFIG.difficulty = difficulty || CONFIG.difficulty;
    runtimeResultsHandler = onResults || null;

    const displayUsernameEl = document.getElementById('display-username');
    if (displayUsernameEl && CONFIG.currentUser) {
        displayUsernameEl.textContent = CONFIG.currentUser;
    }

    document.body.dataset.lang = CONFIG.currentLang;
    document.documentElement.lang = CONFIG.currentLang === 'hk' ? 'zh-HK' : 'en';
}

function startGameSession() {
    initGameSession();
}

function disposeGameSession() {
    isGameActive = false;
    stopBGM();

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

    return connectBLE();
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
