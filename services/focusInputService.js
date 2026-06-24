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
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
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
    const centeredness = clamp01(1 - (centerOffsetX * 1.6 + centerOffsetY * 1.8));
    const sizeConfidence = clamp01((Math.max(eyeDistance, faceHeight * 0.42) - 0.08) / 0.12);
    const basePoseScore = 35 + centeredness * 40 + sizeConfidence * 20;

    const blinkIntensity = (eyeBlinkLeft + eyeBlinkRight) / 2;
    let score = basePoseScore;

    const lookDeduction = Math.min(26, lookAwayScore * 16);
    score -= lookDeduction;

    const blinkDeduction = Math.min(22, blinkIntensity * 22);
    score -= blinkDeduction;

    score += (Math.random() * 4 - 2);

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
    const shouldProcessFrame = lastVideoTime !== currentTime || (now - lastPredictionAt) >= 250;
    if (shouldProcessFrame) {
        lastVideoTime = currentTime;
        lastPredictionAt = now;

        const results = faceLandmarker.detectForVideo(hiddenVideoEl, now);

        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            isFaceDetected = true;
            lastFaceDetectedAt = Date.now();
            const targetScore = calculateFocusScore(results);
            currentFocusScore = currentFocusScore * 0.55 + targetScore * 0.45;
        } else {
            isFaceDetected = false;
            currentFocusScore = 0;
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
    return {
        streamActive,
        modelReady: isModelReady,
        isPredicting,
        hasFace: streamActive && isFaceDetected,
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
