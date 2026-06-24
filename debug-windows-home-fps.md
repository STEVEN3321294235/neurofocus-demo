[OPEN] Windows Home FPS Debug Session

- Session ID: `windows-home-fps`
- Started: 2026-06-23
- Symptom:
  - Windows device shows only around 20-30 FPS even on homepage.
  - iPad game page is around 45 FPS and other pages are smooth.
- Expected:
  - Homepage and non-game pages should remain smooth on Windows.
  - Game page should stay playable without excessive battery drain.

## Hypotheses

1. Homepage CSS blur, glow, glassmorphism and floating animation stack is too expensive on Windows integrated GPUs.
2. Windows is still rendering at too high DPR on homepage and/or shared layout, so even non-game pages overdraw too much.
3. Shared transitions or observers trigger too many repaints on scroll and initial mount.
4. Game runtime or heavy assets are being eagerly imported or initialized too early from non-game pages.
5. Windows browser/GPU path is weaker with `backdrop-filter`, large `blur()` layers and multiple animated shadows than iPad Safari in this layout.

## Evidence To Collect

- Homepage mount timing and user agent.
- Count of animated/glass elements on homepage.
- Whether runtime loader imports game code on homepage.
- Browser FPS / jank symptoms on Windows after targeted instrumentation.

## Status

- Awaiting instrumentation.
