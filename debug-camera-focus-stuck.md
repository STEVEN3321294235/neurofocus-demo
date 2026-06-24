# Debug Session: camera-focus-stuck
- **Status**: [OPEN]
- **Issue**: Simulation camera mode stays around 84% and does not change after entering game; on phone the camera stream no longer remains active after continuing; when no face is visible focus should be 0 and timer should pause.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-camera-focus-stuck.ndjson

## Reproduction Steps
1. Open setup in simulation mode.
2. Allow camera access.
3. Tap continue, then choose difficulty and enter game.
4. Observe focus remains near 84% and camera no longer actively tracks.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `data-camera-continue` stops the camera stream before entering the game flow. | High | Low | Pending |
| B | `FaceLandmarker` initializes asynchronously, but prediction only tries to start once and can miss the ready moment. | High | Medium | Pending |
| C | The game loop treats stale camera score as valid because there is no explicit "camera unavailable / no face" state. | High | Medium | Pending |
| D | No-face state is not wired into the pause/timer logic, so the game continues even when tracking is lost. | High | Medium | Pending |

## Log Evidence
- Static inspection identified a direct `stopCameraPreview()` call in `pages/setup/index.js` on camera continue.
- Static inspection identified `requestCameraPreview()` starting MediaPipe initialization without awaiting model readiness, which could miss the single startup window.
- Static inspection identified the off-screen processing video using `display: none`, which can prevent continuous frame updates on some mobile browsers.
- Static inspection identified no explicit game-level pause rule for `camera-ready` mode when stream is lost or when no face is detected.

## Verification Conclusion
- Implemented:
  - Keep camera stream alive after the setup continue step.
  - Await MediaPipe model initialization before starting prediction.
  - Replace `display: none` hidden video with off-screen mounted video for mobile compatibility.
  - Force `focusLevel = 0` and pause gameplay when stream is lost or no face is detected.
- Pending user runtime verification on phone.
