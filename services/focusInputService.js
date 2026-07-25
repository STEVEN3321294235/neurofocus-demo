import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

let previewStream = null;
let faceLandmarker = null;
let isPredicting = false;
let lastVideoTime = -1;
let currentFocusScore = 0; // 0 to 100
let lastPredictionAt = 0;
let isModelReady = false;
let lastFaceDetectedAt = 0;
let lastCameraError = null;
let isFaceDetected = false;
let faceCenteredness = 0;
let facePresenceConfidence = 0;

const FACE_GRACE_MS = 1400;

// Internal off-screen video element to keep processing camera stream even when UI video is destroyed.
// `display: none` can stop frame updates on some mobile browsers, so keep it mounted but off-screen.
const hiddenVideoEl = document.createElement('video');
hiddenVideoEl.autoplay = true;
hiddenVideoEl.muted = true;
hiddenVideoEl.playsInline = true;
hiddenVideoEl.style.position = 'absolute';
hiddenVideoEl.style.left = '-9999px';
hiddenVideoEl.style.top = '-9999px';
hiddenVideoEl.style.width = '1px';
hiddenVideoEl.style.height = '1px';
hiddenVideoEl.style.opacity = '0';
hiddenVideoEl.style.pointerEvents = 'none';
if (typeof document !== 'undefined') {
    document.body.appendChild(hiddenVideoEl);
}

function getStreamActiveState() {
    return Boolean(previewStream && previewStream.getTracks().some((track) => track.readyState === 'live'));
}

async function initFaceLandmarker() {
    if (faceLandmarker) return faceLandmarker;
    try {
        // Self-hosted from /vendor/mediapipe: the wasm runtime and the face model
        // used to come from jsdelivr / storage.googleapis.com, which are slow or
        // unreachable on a weak venue network and in regions that block Google.
        // Serving them from our own origin keeps camera mode working offline.
        const vision = await FilesetResolver.forVisionTasks("/vendor/mediapipe/wasm");
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "/vendor/mediapipe/face_landmarker.task",
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        isModelReady = true;
        return faceLandmarker;
    } catch (error) {
        lastCameraError = error;
        isModelReady = false;
        throw error;
    }
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

function calculateFocusScore(results) {
    const landmarks = results?.faceLandmarks?.[0];
    if (!landmarks || landmarks.length === 0) return 0;

    const blendshapeCategories = results?.faceBlendshapes?.[0]?.categories || [];
    
    let eyeBlinkLeft = 0;
    let eyeBlinkRight = 0;
    let lookAwayScore = 0;
    
    blendshapeCategories.forEach(shape => {
        if (shape.categoryName === 'eyeBlinkLeft') eyeBlinkLeft = shape.score;
        if (shape.categoryName === 'eyeBlinkRight') eyeBlinkRight = shape.score;
        // Approximation for looking away (accumulate scores of eyeLook directions)
        if (shape.categoryName.includes('eyeLook')) {
            lookAwayScore += shape.score;
        }
    });

    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseTip = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];

    if (!leftEye || !rightEye || !noseTip || !forehead || !chin) {
        return 0;
    }

    const faceCenterX = noseTip.x;
    const faceCenterY = (forehead.y + chin.y) * 0.5;
    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const faceHeight = Math.abs(chin.y - forehead.y);
    const centerOffsetX = Math.abs(faceCenterX - 0.5);
    const centerOffsetY = Math.abs(faceCenterY - 0.5);
    const centeredness = clamp01(1 - (centerOffsetX * 1.2 + centerOffsetY * 1.35));
    const sizeConfidence = clamp01((Math.max(eyeDistance, faceHeight * 0.42) - 0.08) / 0.12);
    const centralBonus = Math.pow(centeredness, 1.8) * 12;
    const basePoseScore = 42 + centeredness * 30 + sizeConfidence * 16 + centralBonus;

    const blinkIntensity = (eyeBlinkLeft + eyeBlinkRight) / 2;
    let score = basePoseScore;

    const lookDeduction = Math.min(26, lookAwayScore * 16);
    score -= lookDeduction;

    const blinkDeduction = Math.min(22, blinkIntensity * 22);
    score -= blinkDeduction;

    if (lookAwayScore < 0.45 && blinkIntensity < 0.22 && centeredness > 0.72) {
        score += 6;
    }

    score += (Math.random() * 2.4 - 1.2);

    return Math.max(0, Math.min(100, Math.round(score)));
}

async function predictWebcam() {
    if (!isPredicting) return;

    if (!faceLandmarker || !getStreamActiveState()) {
        currentFocusScore = 0;
        isFaceDetected = false;
        if (isPredicting) {
            window.requestAnimationFrame(predictWebcam);
        }
        return;
    }

    if (hiddenVideoEl.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (isPredicting) {
            window.requestAnimationFrame(predictWebcam);
        }
        return;
    }

    const now = performance.now();
    const currentTime = hiddenVideoEl.currentTime;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const predictionInterval = isMobile ? 150 : 60; // 150ms (~6 fps) for mobile, 60ms (~16 fps) for desktop
    const shouldProcessFrame = lastVideoTime !== currentTime && (now - lastPredictionAt) >= predictionInterval;
    if (shouldProcessFrame) {
        lastVideoTime = currentTime;
        lastPredictionAt = now;

        const results = faceLandmarker.detectForVideo(hiddenVideoEl, now);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            isFaceDetected = true;
            lastFaceDetectedAt = Date.now();
            const noseTip = results.faceLandmarks[0]?.[1];
            const forehead = results.faceLandmarks[0]?.[10];
            const chin = results.faceLandmarks[0]?.[152];
            if (noseTip && forehead && chin) {
                const faceCenterX = noseTip.x;
                const faceCenterY = (forehead.y + chin.y) * 0.5;
                const centerOffsetX = Math.abs(faceCenterX - 0.5);
                const centerOffsetY = Math.abs(faceCenterY - 0.5);
                faceCenteredness = clamp01(1 - (centerOffsetX * 1.2 + centerOffsetY * 1.35));
            }
            facePresenceConfidence = Math.min(1, facePresenceConfidence + 0.28);
            const targetScore = calculateFocusScore(results);
            currentFocusScore = currentFocusScore * 0.5 + targetScore * 0.5;
        } else {
            isFaceDetected = false;
            const missingMs = Date.now() - lastFaceDetectedAt;
            facePresenceConfidence = Math.max(0, facePresenceConfidence - 0.2);
            faceCenteredness = Math.max(0, faceCenteredness - 0.12);
            if (missingMs <= FACE_GRACE_MS) {
                currentFocusScore = Math.max(18, currentFocusScore * 0.94);
            } else {
                currentFocusScore = Math.max(0, currentFocusScore * 0.72 - 8);
            }
        }
    }

    if (isPredicting) {
        window.requestAnimationFrame(predictWebcam);
    }
}

export function getCameraFocusScore() {
    return currentFocusScore;
}

export function getCameraTrackingStatus() {
    const streamActive = getStreamActiveState();
    const msSinceLastFace = lastFaceDetectedAt ? (Date.now() - lastFaceDetectedAt) : Number.POSITIVE_INFINITY;
    return {
        streamActive,
        modelReady: isModelReady,
        isPredicting,
        hasFace: streamActive && isFaceDetected,
        faceRecentlySeen: streamActive && msSinceLastFace <= FACE_GRACE_MS,
        faceCenteredness,
        facePresenceConfidence,
        focusScore: currentFocusScore,
        lastFaceDetectedAt,
        lastCameraError: lastCameraError ? String(lastCameraError.message || lastCameraError) : null
    };
}

function applyVideoStream(videoEl, stream) {
    if (!videoEl || !stream) return;
    videoEl.autoplay = true;
    videoEl.muted = true;
    videoEl.playsInline = true;
    videoEl.srcObject = stream;
    const playPromise = videoEl.play?.();
    if (playPromise?.catch) {
        playPromise.catch(() => {});
    }
}

function startHiddenPrediction(stream) {
    if (!hiddenVideoEl.srcObject) {
        hiddenVideoEl.srcObject = stream;
    }

    const ensurePlayback = () => {
        hiddenVideoEl.play().catch(() => {});
        if (faceLandmarker && !isPredicting) {
            isPredicting = true;
            predictWebcam();
        }
    };

    hiddenVideoEl.addEventListener('loadeddata', ensurePlayback, { once: true });
    hiddenVideoEl.addEventListener('playing', ensurePlayback, { once: true });

    if (hiddenVideoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ensurePlayback();
    } else if (faceLandmarker && !isPredicting) {
        hiddenVideoEl.play().catch(() => {});
    }

    if (faceLandmarker && !isPredicting && hiddenVideoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        isPredicting = true;
        predictWebcam();
    }
}

export function hasActiveCameraPreview() {
    return getStreamActiveState();
}

export async function requestCameraPreview(videoEl) {
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API unavailable');
    }

    lastCameraError = null;

    if (!hasActiveCameraPreview()) {
        previewStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 960 },
                height: { ideal: 540 }
            },
            audio: false
        });
    }

    await initFaceLandmarker();
    applyVideoStream(videoEl, previewStream);
    startHiddenPrediction(previewStream);
    return previewStream;
}

export function attachCameraPreview(videoEl) {
    if (!hasActiveCameraPreview()) return false;
    applyVideoStream(videoEl, previewStream);
    startHiddenPrediction(previewStream);
    return true;
}

export function stopCameraPreview() {
    isPredicting = false;
    currentFocusScore = 0;
    lastVideoTime = -1;
    lastPredictionAt = 0;
    lastFaceDetectedAt = 0;
    isFaceDetected = false;
    faceCenteredness = 0;
    facePresenceConfidence = 0;
    if (!previewStream) return;
    previewStream.getTracks().forEach((track) => track.stop());
    previewStream = null;
    hiddenVideoEl.pause?.();
    hiddenVideoEl.srcObject = null;
}

export function detachCameraPreview(videoEl) {
    if (videoEl) {
        videoEl.pause?.();
        videoEl.srcObject = null;
    }
}
