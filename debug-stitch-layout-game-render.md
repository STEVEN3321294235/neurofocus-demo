# Debug Session: stitch-layout-game-render [OPEN]

## Problem Summary
- Homepage / stitch layout is not rendering as designed.
- Styles appear completely changed or missing.
- Game objects are not rendering correctly.

## Scope
- Frontend resource loading
- Stitch layout validity
- CSS loading and path correctness
- Game asset loading and rendering lifecycle

## Initial Hypotheses
- H1: The SPA refactor replaced the stitch-generated DOM/CSS structure, so the current homepage is no longer using the stitch layout contract.
- H2: Stylesheets are loading, but the active selectors/class names no longer match the stitch HTML structure, causing a full visual mismatch.
- H3: The game route mounts a new DOM shell that is incompatible with parts of the legacy runtime, so Three.js/UI elements initialize against missing or changed nodes.
- H4: Some asset or module paths are valid for static fetch but fail at runtime because initialization order or route lifecycle disposes/recreates containers incorrectly.
- H5: Browser/runtime errors during module bootstrap or render cause partial page mount, leaving fallback/default styles and no game object rendering.

## Evidence Log
- `index.html` currently loads only Google Fonts + `styles/main.css`, but the Stitch source in `code.html` depends on Tailwind CDN, Tailwind runtime config, Material Symbols, and large inline style blocks.
- `code.html` is still present as the Stitch source of truth, while the live homepage is rendered by `pages/home/index.js` using a custom `home-*` CSS implementation rather than the original Stitch utility-class layout.
- Runtime logs in `.dbg/trae-debug-log-stitch-layout-game-render.ndjson` confirm the app mounts the SPA homepage successfully, but this only proves the custom SPA page renders, not that the Stitch layout contract is active.
- Static asset requests return `200`, but `EGGShip2.glb` and `sky_day.hdr` are currently served by `python -m http.server` as `application/octet-stream`, not by the project's expected custom static server behavior.

## Hypothesis Verification
| ID | Hypothesis | Status | Evidence |
|----|------------|--------|----------|
| A | The SPA refactor replaced the Stitch-generated DOM/CSS structure. | Confirmed | Live `index.html` no longer includes Stitch head config; live homepage is custom `pages/home/index.js`, while Stitch source remains in `code.html`. |
| B | Styles load, but active selectors/config no longer match the Stitch structure. | Confirmed | `styles/main.css` is loaded, but it styles `home-*` classes instead of Tailwind utility classes from Stitch. |
| C | Game DOM shell is incompatible with runtime mount. | Inconclusive | `#canvas-container` and `#ui-container` are still created on the game route, so top-level shell exists. |
| D | Resource path or serving layer is incorrect for game assets. | Confirmed | Asset URLs return `200`, but `.glb` / `.hdr` are served generically; project memory and prior behavior require custom MIME handling. |
| E | Bootstrap/runtime exceptions are the primary reason homepage styles are wrong. | Rejected for homepage | Current `pre-fix` logs show successful bootstrap/home mount without entering `bootstrap catch`. |

## Status
- Step 1 complete: session created, hypotheses defined.
- Step 2 complete: instrumentation evidence collected.
- Step 3 complete: minimal fixes applied.
- Next: user verification of homepage fidelity and in-game object rendering.

## Fix Summary
- Restored the Stitch homepage contract in the live app by reintroducing Tailwind runtime config, Material Symbols, and a Stitch-style homepage layout in the SPA render path.
- Replaced the external hero placeholder image with a local asset: `assets/stitch-hero-visual.svg`.
- Restored custom static asset serving via `server.js` so `.glb` and `.hdr` assets are served through the project server instead of a generic Python static server.
- Updated `run_eeg_game.sh` to launch the custom server instead of `python -m http.server`.

## Post-Fix Evidence
- `post-fix` log shows homepage bootstrap now loads the expected extra head resources, including Material Symbols, and still mounts cleanly.
- `post-fix` log shows `hasStitchMarkup: true` on homepage mount after the Stitch-style layout restoration.
- `curl -I http://localhost:8000/assets/EGGShip2.glb` now returns `Content-Type: model/gltf-binary`.
- `curl -I http://localhost:8000/assets/EGGShip2.glb?v=1` returns `200`, confirming query-string-safe asset serving.

## Iteration Note
- User feedback: homepage still needs to be visually closer to the original Stitch design, and auth/setup/results/game HUD should also be modernized while keeping the same Stitch-style color language.
- Follow-up change: homepage was further aligned to Stitch utility-style layout and internal pages were visually upgraded with the same glass + teal/purple design system.
