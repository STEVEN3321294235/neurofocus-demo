# vendor/ — self-hosted third-party assets

These files are **not written by us**. They are pinned copies of the libraries the
app used to pull from a CDN, moved here on 2026-07-25 so the booth demo survives a
dead or region-blocked venue network (the competition is in Beijing, where
Google-hosted assets are not reliably reachable, and the booth network is a single
shared data card).

| Path | What | Source | Version |
|---|---|---|---|
| `three/three.module.js` | Three.js core | npm `three` | 0.161.0 |
| `three/addons/**` | The 9 addons the game imports + their transitive deps (16 files) | npm `three` `examples/jsm` | 0.161.0 |
| `mediapipe/vision_bundle.mjs`, `mediapipe/wasm/**` | MediaPipe Tasks Vision runtime (camera focus detection) | npm `@mediapipe/tasks-vision` | 0.10.3 |
| `mediapipe/face_landmarker.task` | Face landmark model | storage.googleapis.com/mediapipe-models | float16/1 |
| `fonts/**` | EB Garamond, Inter, Orbitron, Material Symbols (woff2 + rewritten CSS) | Google Fonts | — |
| `tailwind/tailwind.fallback.css` | Pre-compiled Tailwind used as a floor when the CDN is unreachable | Tailwind CLI 3.4.17 | — |

Supabase is deliberately NOT vendored: `services/supabaseClient.js` already falls
back to a local session when the SDK cannot load, so a CDN failure degrades
gracefully instead of breaking the page.

Rebuilding the Tailwind fallback (only needed if homepage classes change):

    npx tailwindcss -c tailwind.config.js -i in.css -o vendor/tailwind/tailwind.fallback.css --minify
