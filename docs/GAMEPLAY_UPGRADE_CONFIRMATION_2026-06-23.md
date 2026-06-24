# Gameplay Upgrade Confirmation

Date: 2026-06-23
Scope: `pages/game/index.js`, `pages/game/runtime.js`, `styles/pages/game.css`

## Priority Order For 2 Days

1. P0: Remove entry blockers and visual failures
   - White/black scene flashes
   - Fuzzy render quality
   - Asset-load or transition stalls
2. P1: Guarantee question stability
   - AI question validation
   - Fallback question reliability
   - Age-band and skill alignment
3. P2: Rebuild HUD and transition visuals
   - Left telemetry HUD
   - Right question HUD
   - Rotate-device overlay

## Implemented Changes

### 1. Entry Stability And Render Quality
- Raised renderer quality adaptively instead of a fixed low cap.
- Added renderer clear color to avoid white/transparent flashes before the scene is fully visible.
- Kept transition loader visible with clearer state messaging during route-to-game handoff.
- Reduced the hidden-state flash by keeping a low-opacity scene background behind the loader instead of a hard blank frame.
- Upgraded water, splash and foam texture filtering plus anisotropy for sharper default visuals.

### 2. AI Question Validation
- Reworked the AI prompt so each question must return:
  - exactly one correct answer
  - explanation
  - skill label
  - age band
  - validation rule
- Added local validation to reject:
  - missing or short question text
  - invalid answer index
  - duplicate options
  - duplicate questions
  - ambiguous options such as "all of the above"
  - missing explanation
- Added batch finalization so invalid AI items are automatically replaced by validated local fallback puzzles.

### 3. Fallback Question Bank
- Rebuilt local fallback questions by difficulty:
  - `easy`
  - `medium`
  - `hard`
- Each fallback question now includes:
  - unique answer
  - short proof/explanation
  - skill tag
  - age band
- This keeps the game playable even when DeepSeek is slow or invalid.

### 4. HUD Visual Upgrade
- Reworked left telemetry HUD into a thicker framed blue sci-fi panel with internal structure closer to the provided reference.
- Reworked question HUD with:
  - more forward-facing 3D tilt
  - meta chips for skill and age band
  - stronger border hierarchy
  - more consistent glass/blue styling with the product
- Replaced simple fill-bar styling with threshold-triggered gradient states for both focus and speed.

### 5. Rotate Overlay Upgrade
- Replaced the old text-only rotate indicator with a CSS phone-and-arcs animation inspired by the provided rotate reference.
- Preserved portrait lock behavior while improving visual quality.

## Requirement Mapping

### Req 1: AI generated questions must be verifiable
Status: Partially completed
- Done:
  - strict local validation
  - explanation field retained
  - age-band and skill metadata added
  - invalid AI output replaced automatically
- Still needed:
  - stronger semantic verification for advanced logical proofs
  - optional server-side second-pass verifier

### Req 2: Cross-device compatibility and stability
Status: Partially completed
- Done:
  - responsive HUD adjustments retained
  - adaptive render scale improved
  - portrait warning upgraded
- Still needed:
  - structured FPS profiling on phone/tablet/desktop
  - weak-network and background-resume test matrix
  - crash-rate measurement tooling

### Req 3: Transition animation upgrade
Status: Completed for first pass
- Loader handoff is smoother
- Reduced flash risk during difficulty-to-game transition
- Added more product-like transition copy

### Req 4: HUD redesign based on reference
Status: Completed for first pass
- Left telemetry HUD and question HUD were restyled around the provided blue framed reference language
- Question panel tilt was adjusted away from a flat left twist and toward a more forward 3D lean

### Req 5: Threshold-based color rules
Status: Completed
- Focus and speed bars now change gradient state by thresholds
- They no longer rely on a single continuous long-bar gradient logic

### Req 6: Replace rotate animation
Status: Completed for first pass
- New portrait warning uses animated phone frame and directional arcs

## Simulation Mode Concept Direction

Goal: make Simulation Mode feel closer to "attention sensing" without pretending it is medical EEG.

### Recommended Product Direction
- Use multi-signal "focus confidence" instead of fake EEG numbers alone.
- Inputs can include:
  - camera presence / gaze stability proxy
  - microphone noise stability proxy
  - interaction rhythm and reaction time
  - task continuity such as fewer idle gaps and fewer repeated wrong taps

### Safe Rollout Path
1. Phase 1
   - keep simulation local
   - generate more human-like focus curves
   - add calibration period
2. Phase 2
   - optional microphone-based environmental stability score
   - never store raw audio
3. Phase 3
   - optional camera-based gaze-presence heuristic
   - explicit consent gate
   - no biometric identification

### Important Constraint
- Simulation Mode must be labelled clearly as an estimate or training proxy, not real EEG.

## Remaining High-Priority Work

1. Measure real in-browser FPS and tune post-processing for low-end devices.
2. Add semantic question verifier or curated question families for harder logic tasks.
3. Review transition timing in live preview and tune for 1.5-2.0s target.
4. Expand results/session schema for dashboard readiness.
