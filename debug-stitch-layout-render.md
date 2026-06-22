# Debug Session: stitch-layout-render
- **Status**: [OPEN]
- **Issue**: Homepage layout no longer matches the Stitch design, and in-game 3D objects do not render correctly after the SPA refactor.
- **Debug Server**: http://127.0.0.1:7777/event
- **Log File**: .dbg/trae-debug-log-stitch-layout-render.ndjson

## Reproduction Steps
1. Open the homepage.
2. Compare the current homepage layout with the Stitch-generated layout expectation.
3. Continue through auth/setup into the game route.
4. Observe whether the canvas, ship, water, and other in-game objects render.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The SPA homepage implementation replaced the Stitch layout rather than reusing it. | High | Low | Confirmed |
| B | The new SPA shell removed or changed DOM structure required by the game runtime. | High | Medium | Partially confirmed |
| C | The game runtime reads DOM nodes too early or mounts before route DOM is ready. | High | Medium | Suspected |
| D | Route mount/unmount logic disposes game resources before the scene becomes visible. | Medium | Medium | Rejected for homepage issue / unconfirmed for gameplay |
| E | A runtime error during scene/model/renderer initialization prevents 3D objects from rendering. | High | Medium | Partially confirmed |

## Log Evidence
- `pages/home/index.js` log reported `hasStitchMarkup: false` before the fix, confirming the homepage was rendering the custom SPA landing layout instead of the Stitch-style structure.
- `pages/game/index.js` log on `#game` showed the route mounted with `hasCanvasContainer: true` and `hasUiContainer: true`, so the new SPA shell still creates the required top-level containers.
- Static inspection of `pages/game/runtime.js` showed `switchLanguage()` accessed `lang-hk` and `lang-en` unconditionally, while the game route does not render those elements, creating a likely runtime interruption before `startGameSession()` completes.

## Verification Conclusion
- Homepage root cause identified and fixed in code by restoring a Stitch-style layout structure in `pages/home/index.js` and `styles/pages/home.css`.
- Game rendering root cause narrowed to a compatibility break introduced by the SPA refactor: runtime language syncing assumed legacy DOM buttons existed on every route. A null-safe fix has been applied in `pages/game/runtime.js`.
