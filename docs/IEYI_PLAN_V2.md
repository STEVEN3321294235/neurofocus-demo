# NeuroFocus IEYI 衝刺計劃 V2（2026-07-05 起・唯一有效版本）

> 舊版 plan（`IEYI_SPRINT_PLAN.md`）已刪除，內容已整合入本檔。**由今日起一切以呢份為準，全 repo 得呢一份 plan。**
>
> 現況一句講晒：後端、登入、key 安全、Results 證據鏈、EEG 放大、UI reskin 已全部完成。
> 剩低三條戰線：**① Gameplay（玩法真係練到專注）、② 畫質精細 + 運行流暢、③ EEG 穩定 + 比賽 rehearsal**。

---

## 0. 目錄

1. 現狀 snapshot（乜嘢已完成）
2. 2026-07-05 呢個 commit 做咗乜（T1 / T10 / T11）
3. **發佈工作流程**：Claude branch → main → TRAE 同步（每次跟住做）
4. **Vercel + DeepSeek API 驗證指南**（P0，發佈完即刻做）
5. 三條戰線 roadmap + 每步嘅 TRAE Prompt
6. 時間表（P0 → P3）+ 應急計劃
7. 比賽日 checklist

---

## 1. 現狀 snapshot（截至 2026-07-05）

| 已完成 | 證據（file / commit） |
|--------|----------------------|
| DeepSeek key 收埋喺 server（Vercel serverless proxy + GET 健康檢查） | `api/questions.js`；commit `bbec2301`、`06059cdf` |
| 真 Supabase Auth（錯密碼入唔到；離線先 fallback 本地 session） | `services/authService.js`；commit `4e259748` |
| Results Dashboard（session 內前後對比 + 專注曲線 + 跨 session trend） | `pages/game/runtime.js`（`showResultsDashboard` 區）；commit `31a27261` |
| 跨 session 歷史（Supabase `session_history` + localStorage mirror） | `services/storageService.js`；commit `9f01445c` |
| 自適應門檻（用歷史調 recovery/trigger，唔再死 45/55） | `resolveAdaptiveFocusTraining()`；commit `ded3f46c` |
| 即時 FPS meter（DEMO_MODE 先顯示，顏色分級） | `updateFpsMeter()`；commit `1a03e356` |
| EEG 雙軸心流 + 呼吸實時腦電回饋 + 訊號質素 chip | commit `a843f5ae`（Prompt M） |
| 字體統一（Orbitron 只留 game HUD） | commit `5aab7ba2`；2026-07-05 已複驗通過 |
| UI reskin（Clay/Glass、動畫） | commit `da6f888b` |
| Stroop 互動題（hard challenge） | commit `785ef1f1` |

**未做 / 待做**：Focus Gates 重啟（而家 flag off）、訓練模式離散回饋、動態畫質、畫面加靚、文案 humanize + 隱私政策、EEG rehearsal、（人手）提醒 mentor 換 DeepSeek key（舊 key 仲喺 public git history）。

---

## 2. 2026-07-05 呢個 commit 做咗乜

- **T1　書房完全移除，兩個模式統一用海洋**：
  - `pages/setup/index.js`：`environment` 恆等於 `'ocean'`（之前 training 會入書房）。
  - `pages/game/runtime.js`：剷走成個 study 環境層（import、`maybeApplyStudyEnvironment`、環境切換、鏡頭分支、雙版本 onboarding 文案）。
  - 刪檔：`pages/game/environments/voxelStudy.js`、`assets/models/`（manifest）。
  - `app/i18n.js`：刪 `setup_env_*` 三條死字串（雙語）。
  - **玩法零改動**——訓練／挑戰嘅規則、計分、呼吸介入全部照舊，唯一分別係訓練唔再入書房。
- **T10　repo 執手尾**：刪 30MB `EEG_2026_Windows.zip`（`.gitignore` 加 `*.zip`，日後大 binary 用 GitHub Releases 派發）；剷清 7 個檔案共 45 個 `#region debug-point` 遙測 block（TRAE debug 時期留低嘅 fetch 上報），連埋孤兒 reference（3 個 texture fallback 改用 `console.warn`，`eeg_bridge.py` 刪埋唔再用嘅 `urllib` import 同 debug 常數）。
- **T11　字體複驗**：`--font-tech`（Orbitron）確認只喺 `styles/pages/game.css`（10 處，全部 game HUD）；Setup/Results/Auth 用 EB Garamond + Inter。**唔使改。**
- **Vercel**：`vercel.json` 加 `"functions": {"api/questions.js": {"maxDuration": 30}}`——DeepSeek 有時要 10 秒以上先答完，Vercel 預設 function 上限得 10 秒，唔加呢句就會出現「本地得、上到 Vercel 就 timeout」。

---

## 3. 發佈工作流程（Claude ↔ main ↔ TRAE，每次跟住做）

而家嘅實況：**`main` 仲停留喺好舊嘅位（`4a4c699b`），成條 sprint 嘅 19 個 commit 全部只喺 `claude/eeg-ieyi-competition-plan-jjhder` 呢條 branch。** 所以第一步就係照下面做一次合併，之後 TRAE 同 Vercel 先會見到全部新嘢。

### 3.1 一次過發佈上 main（喺 TRAE 個 terminal 度打，或者任何裝咗 git 嘅機）

```bash
# 1. 攞最新
git fetch origin

# 2. 去 main 並更新
git checkout main
git pull origin main

# 3. 合併 Claude 條 branch 入 main
git merge origin/claude/eeg-ieyi-competition-plan-jjhder

# 4. 推上 GitHub —— 呢一下就係「發佈」
git push origin main
```

如果你想用 GitHub 網頁做：去 repo → **Pull requests** → **New pull request** → base 揀 `main`、compare 揀 `claude/eeg-ieyi-competition-plan-jjhder` → **Create** → **Merge**。效果一樣。

### 3.2 發佈完，令 TRAE 本地同步（每次都要）

```bash
git checkout main
git pull origin main
```

### 3.3 點確認「兩邊真係同步咗」

```bash
git log -1 --oneline          # 本地最新 commit
git log -1 --oneline origin/main   # GitHub 最新 commit（要先 git fetch）
```

兩行 hash 一樣 = 同步。唔一樣就 `git pull origin main`。

### 3.4 之後嘅日常循環（記住呢個節奏）

1. **Claude Code（呢邊）**做嘢 → push 上 `claude/...` branch。
2. **你**照 3.1 合併上 `main`。
3. **Vercel** 見到 `main` 有新 commit 會自動 deploy（去 Vercel dashboard 睇 Deployments 確認轉綠）。
4. **TRAE** 開工前先 `git pull origin main`；TRAE 做完嘢 commit 之後 `git push origin main`。
5. Claude 下次開工會自己 fetch 最新 `main`——你唔使幫我搬。

⚠️ 唯一會撞車嘅情況：TRAE 同 Claude **同時**改同一個檔案。避免方法：同一時間只派一邊做嘢（尤其 `pages/game/runtime.js` 呢個 5000+ 行大檔案）。

---

## 4. Vercel + DeepSeek API 驗證指南（P0：發佈上 main 之後即刻做）

你唔肯定 DeepSeek 喺 Vercel 上面行唔行——照以下四步就有決定性答案。**就算最後行唔通，遊戲有本地 fallback 題庫，照玩得，比賽現場唔會死**；但 AI 出題係賣點，值得整好。

### 步驟 1：健康檢查（30 秒）

瀏覽器開：

```
https://<你嘅-app>.vercel.app/api/questions
```

| 見到咩 | 意思 | 做咩 |
|--------|------|------|
| `{"ok":true,"hasKey":true,...}` | key 已駁通 | 去步驟 2 |
| `{"ok":true,"hasKey":false,...}` | **Vercel 未set環境變數**（最常見死因） | Vercel dashboard → 你個 Project → **Settings → Environment Variables** → 加 `DEEPSEEK_API_KEY`（Production + Preview 都剔）→ **Deployments 度撳 Redeploy**（唔 redeploy 唔會生效！）→ 重做步驟 1 |
| 404 / 空白 | function 冇 deploy 到 | 確認 `api/questions.js` 有喺 main、Vercel 項目 root 冇set錯（要係 repo root） |

### 步驟 2：真打一炮（1 分鐘）

Terminal 度：

```bash
curl -s -X POST "https://<你嘅-app>.vercel.app/api/questions" \
  -H "Content-Type: application/json" \
  -d '{"count":3,"difficulty":"easy","lang":"hk"}'
```

| 結果 | 意思 |
|------|------|
| `{"ok":true,"questions":[...]}` | ✅ 全通，收工 |
| `{"ok":false,"reason":"upstream-401"}` | key 錯／過期──搵 mentor 換 key，再重set環境變數 |
| `{"ok":false,"reason":"upstream-402"}` | DeepSeek 戶口冇錢──搵 mentor 增值 |
| `{"ok":false,"reason":"timeout"}` | DeepSeek 太慢──確認 main 上面 `vercel.json` 已有 `maxDuration: 30` 嗰句（今次 commit 已加）而且 redeploy 咗 |

### 步驟 3：遊戲入面驗（2 分鐘）

開 deployed site → 揀挑戰模式 → 開 devtools **Network** tab → 開始遊戲 → 見到 `POST /api/questions` 回 `200` + questions = AI 題行緊；見到 fallback 都唔使慌，玩法唔受影響。順便確認 Network 度**冇任何 request 見到 DeepSeek key**（只應該見到自己個 domain 嘅 `/api/questions`）。

### 步驟 4：提醒 mentor（人手，一句話）

> 「舊 DeepSeek key 曾經 hardcode 喺 public repo 嘅 git history，任何人翻歷史都攞到。請考慮喺 DeepSeek 後台 revoke 舊 key、開新 key，新 key 只放入 Vercel 環境變數。」

---

## 5. 三條戰線 roadmap + TRAE Prompts

> **建議次序**：G1 → G2 → P1 → P2 → U1；E1 同 rehearsal（人手）並行做。
> **每個 prompt 開工前**：確保 TRAE 已 `git pull origin main`。
> **每個 prompt 做完**：`node server.js`（port 8000）行一次 Simulation 模式全流程先算數，然後 commit + push，先開下一個。
> 一次只跑一個 prompt——runtime.js 係大檔案，兩個 prompt 同時改必撞。

### 戰線一：Gameplay（訓練真係練到專注，而且睇得見）

#### Prompt G1 — 重啟 Focus Gates（可數嘅專注閘門）

**背景**：module 已寫好（`pages/game/focusGates.js`），之前因為光環讀落似喺船右邊掠過而唔係穿過正中，所以 flag 熄咗。呢個 prompt 係修好對齊 + 重開。

```
Context: NeuroFocus is a no-build vanilla-JS + Three.js focus-training game
(brainwave attention drives a boat). Run locally with `node server.js`, open
http://localhost:8000, choose Simulation as the signal source (no EEG needed).

The file pages/game/focusGates.js already implements "focus gates" — glowing
rings the boat sails through, each ring scoring whether the player held focus
at that moment. It is currently DISABLED via the flag FOCUS_GATES_ENABLED in
pages/game/runtime.js because of one visual bug: the rings appeared to pass to
the RIGHT of the boat instead of the boat sailing through the ring centre, so
the score didn't feel earned.

Task:
1. Fix the alignment so each gate spawns centred on the boat's sailing line
   (the boat moves along the z-axis; gates must spawn at the boat's x position,
   at deck height, facing the camera) and visibly passes AROUND the boat.
2. On the frame the boat crosses a gate's z position, judge pass/fail:
   pass = getEffectiveFocusLevel() >= FOCUS_TRAINING.stableThreshold (this is
   the adaptive per-player threshold — do NOT hardcode 50).
3. Pass: brief ring flash + soft chime (reuse the existing audio helpers in
   runtime.js). Fail: ring fades out grey, no harsh feedback (this is a
   training app for kids — failure must stay gentle).
4. Enable in BOTH training and challenge modes. Space gates so roughly one
   gate every 20-30 seconds of sailing.
5. HUD: live "gates passed / total" counter (the element and
   updateGateCounterHUD() already exist, as does the i18n key gate_label).
6. At session end, write gates passed/total into the session summary object
   passed to appendSessionSummary (services/storageService.js) and show
   "You passed X/Y focus gates" on the Results dashboard, bilingual (add i18n
   keys to app/i18n.js in BOTH the en and hk blocks).
7. Flip FOCUS_GATES_ENABLED to true.

Constraints:
- Do not change boat physics, question flow, breathing intervention, or the
  adaptive threshold logic.
- Must work in Simulation mode (test by holding/releasing the focus you get
  from the simulator and watching gates pass/fail accordingly).
- Keep the per-frame cost tiny: no per-frame allocations in the gate update
  path; reuse vectors. Verify with the on-screen FPS meter (visible because
  DEMO_MODE is true) that FPS does not drop when a gate spawns or is judged.
```

**我點驗收**：Simulation 入面（a）船眼見穿過光環**正中**；（b）谷高專注過閘 = 亮 + 一聲；（c）遊魂過閘 = 灰 + 冇懲罰感；（d）HUD 有 X/Y 跳動；（e）Results 有雙語「你通過 X/Y 個專注閘門」；（f）FPS meter 冇跌。訓練＋挑戰各走一次。

#### Prompt G2 — 訓練模式離散回饋（hold streak）+ 心流修正

**背景**：訓練模式而家冇離散「贏緊」事件，淨係望住個 ratio；而且訓練模式**永遠入唔到心流**，因為 `isFlowState` 要 `CONFIG.streak >= 3`，但 streak 只有答啱題先加——訓練模式冇題答。

```
Context: same project as before (`node server.js`, port 8000, Simulation mode).
In pages/game/runtime.js, training mode currently gives only continuous
feedback (boat speed + a stability ratio). Two problems:
(a) no discrete "win" moments, so training feels passive;
(b) flow state (isFlowState) requires CONFIG.streak >= 3, but streak only
    increments on correct quiz answers — training mode has no quiz, so
    training can literally never reach flow. Find isFlowState by searching
    for "Flow State Logic".

Task:
1. Add a "focus hold streak" to training mode: every continuous N seconds
   (start with N=20) that getEffectiveFocusLevel() stays >=
   FOCUS_TRAINING.stableThreshold earns one "hold" — a discrete counter tick
   with a subtle chime and a small HUD pulse. Dropping below the threshold
   resets the current N-second progress (but keeps holds already earned).
2. Show a thin progress arc/bar toward the next hold so the player can see
   the streak building.
3. Fix flow for training mode: in training mode, let holds substitute for
   quiz streak in the isFlowState condition (e.g. flow = focus > 80 AND
   holds-equivalent condition AND meditationOk). Challenge mode keeps the
   existing quiz-streak rule unchanged.
4. Write holds earned into the session summary passed to
   appendSessionSummary and surface it on the Results dashboard, bilingual
   (i18n keys in BOTH en and hk blocks of app/i18n.js).

Constraints:
- Reuse updateStreakDisplay / existing HUD patterns; match the existing
  Liquid Glass HUD look (styles/pages/game.css), no new fonts.
- Calm by default: the celebration is a small pulse + soft sound, not a
  screen takeover (kids' training app).
- Must work in Simulation mode; verify training mode can now actually enter
  flow state (body gets class flow-state-mode) by holding high focus.
```

**我點驗收**：訓練模式維持高專注 20 秒 → 粒數 +1 有聲有 pulse；中途跌落門檻 → 進度環歸零但粒數保留；焗住高專注一排 → 真係入到心流（畫面有 flow 效果）；Results 見到 holds 數；挑戰模式規則不變。

### 戰線二：網頁 UI / 畫質（精細 + 流暢並存）

#### Prompt P1 — 動態畫質 scaling（先做安全網，再加靚）

```
Context: same project. pages/game/runtime.js already has:
- updateFpsMeter(deltaMs): a rolling FPS accumulator updating an on-screen
  meter (search "updateFpsMeter");
- PERFORMANCE_PROFILE (from getPerformanceProfile()): static per-device
  quality knobs including waterResolution;
- getAdaptiveRenderScale(): currently returns a mostly-static render scale;
- setupPostProcessing(): builds the composer + bloom pass.

Task: turn the static quality settings into a closed-loop dynamic quality
system driven by measured FPS.
1. Track a rolling average FPS (reuse the accumulator in updateFpsMeter — do
   not add a second timer).
2. If avg FPS stays below 45 for 3+ seconds, step quality DOWN one level;
   if it stays above 55 for 10+ seconds, step quality UP one level. The
   asymmetric windows are deliberate (fast down, slow up) to avoid
   oscillation. Never change more than one level per 3 seconds.
3. Quality ladder (level 0 = full):
   L0 full: current settings.
   L1: renderer pixel ratio capped ~25% lower (renderer.setPixelRatio).
   L2: bloom/composer bypassed (render straight to canvas), pixel ratio as L1.
   L3: water reflection texture at half PERFORMANCE_PROFILE.waterResolution
       (rebuild or resize the water render target), everything above.
4. Apply changes without visible hitching (never rebuild mid-frame; schedule
   the switch for the next frame boundary).
5. When DEMO_MODE is true, show the current quality level (L0-L3) next to the
   FPS meter so we can watch it work.

Constraints: no changes to gameplay logic; Simulation mode must run
identically; test by artificially loading the GPU (e.g. temporarily set a
huge pixel ratio via devtools) and watching the ladder step down then
recover.
```

**我點驗收**：開 FPS meter 睇住個 L 字——人為加負荷 → 幾秒內 L0→L1→L2 逐級落、FPS 回穩；移走負荷 → 慢慢升返 L0；肉眼冇「跳一下」嘅感覺;比賽 Windows 機實測一次前後 FPS。

#### Prompt P2 — 畫面加靚（P1 完成先開呢個）

```
Context: same project. Dynamic quality scaling (L0-L3 ladder) is now live, so
richer visuals are safe: weak machines will auto-степ down. All new effects in
this prompt must live at quality level L0/L1 only (skipped from L2 down), and
respect PERFORMANCE_PROFILE.

Task — refine the ocean scene, keeping the current art direction (calm,
premium, not cartoonish):
1. Water: slightly stronger sun glint and normal-map detail near the boat;
   keep distortionScale modest so it stays calm.
2. Lighting: warm-cool contrast — warm key light from the sky, cool fill from
   the water; gentle god-ray-ish glow around the sun via the existing bloom
   pass settings (do not add a new pass).
3. Flow-state payoff: when body has class flow-state-mode, ease bloom
   strength + exposure up ~15% over 2 seconds and widen the boat wake
   particles slightly — the "reward moment" should be FELT. Ease back out
   when flow ends. (Search for flow-state-mode in runtime.js.)
4. Do not touch the Clay/Glass HUD styling.

Constraints: every addition gated behind quality level checks; verify with
the FPS meter + quality badge that L0 stays >= 55 FPS on this dev machine and
that stepping to L2 visibly strips the new effects.
```

**我點驗收**：對比前後截圖（水面近船細節、日光、入 flow 嗰下嘅畫面回報）；FPS meter 企穩；手動迫落 L2 見到新效果自動熄。

#### Prompt U1 — 文案 humanize + Footer 隱私政策 + 裝置講法收窄

```
Context: same project — bilingual copy lives in app/i18n.js (en block + hk
block, keys must stay in sync). This is a student competition project (IEYI);
judges will probe any overclaim.

Task:
1. Home page device claim: replace any copy claiming support for Muse /
   Emotiv / multiple headsets with honest copy: built around NeuroSky
   MindWave Mobile 2, architecture designed to extend to other headsets.
2. Sweep ALL user-facing copy (home, auth, setup, game HUD tooltips, results)
   in both languages: remove overclaims (e.g. "clinically proven", "medical"),
   prefer concrete honest phrasing ("attention estimate from a consumer EEG
   band" not "reads your mind"). Keep the warm, encouraging tone. Traditional
   Chinese for hk, and keep 廣東話 phrasing where the existing copy already
   uses it.
3. Footer: remove dead links (Terms of Service / Tech Support if they go
   nowhere). Add a real Privacy Policy page (route it like the existing
   simple pages) stating honestly, bilingually: what we collect (EEG
   attention/meditation values during a session, optional camera-based focus
   score computed locally and never uploaded, account email, session summary
   stats), where it goes (Supabase), what we never collect (raw video,
   raw audio), and that data can be deleted on request. Link "Contact us" to
   a real mailto:.
4. Keep every i18n key present in BOTH language blocks; missing keys render
   as raw key names, so double-check.

Verification: click every footer link on every page; switch language and
re-read every changed screen in both languages.
```

**我點驗收**：你（Steven）逐句過中英文文案先准 push——尤其 Home 裝置講法同隱私政策內容；我會核對雙語 key 有齊 + 冇死 link。

### 戰線三：EEG 穩定 + 連接（比賽現場命脈）

#### T2 — 實機 rehearsal（人手，唔係 code；本週就要開始）

1. 實機（比賽用嗰部 Windows）戴 MindWave 行**完整流程 ≥5 次**：開 bridge → 連接 → 訓練一場 → 挑戰一場 → Results。
2. 每次記低：連接用咗幾耐、有冇斷、斷咗喺邊一步、點救返（重啟 bridge？重新戴？換電？）。
3. 寫成一頁「**斷線急救卡**」貼喺攤位後面：症狀 → 動作（例：訊號 chip 轉紅 → 幫參加者較正額頭 sensor + 夾實耳夾）。
4. 試埋**極端情況**：長頭髮、出汗、行埋嚟圍觀嘅人多（藍牙干擾）、連續玩 30 分鐘。
5. 練「**30 秒切 Simulation**」台詞：EEG 死咗當場點講點切，先唔會冷場（呢個係 demo 保命符）。

#### Prompt E1 — EEG 連接韌性（做完 T2、知道實際斷法先做，對症下藥）

```
Context: same project. The EEG path is: NeuroSky MindWave -> eeg_bridge.py
(local WebSocket bridge) -> browser WebSocket client in pages/game/runtime.js
(search "bridge-connect" / activateEEGMode). A signal-quality chip already
exists in the HUD. Real-world failure notes from our booth rehearsal:
[PASTE THE FAILURE NOTES FROM T2 HERE — which step disconnects, how often,
what recovered it]

Task:
1. Browser side: auto-reconnect with backoff (1s, 2s, 4s, max ~10s, keep
   trying) when the bridge WebSocket drops mid-session, WITHOUT interrupting
   gameplay — while disconnected, freeze the last focus value for up to 10s,
   then ease into the simulation fallback, and show a small non-blocking
   "reconnecting…" state on the signal chip (bilingual, add i18n keys to both
   blocks).
2. If the headset reconnects, ease back from fallback to real EEG smoothly
   (no sudden boat speed jump — lerp the focus source over ~2s).
3. Bridge side (eeg_bridge.py): on serial read failure, retry the port scan
   loop instead of requiring a manual restart; keep the existing status
   messages flowing to the client.
4. Results honesty: if any part of the session ran on fallback, note it in
   the session summary ("signal dropped for Xs") — judges may ask.

Constraints: never crash gameplay on disconnect; Simulation-only sessions
must behave exactly as before; test by killing/restarting eeg_bridge.py
mid-session with the game running.
```

**我點驗收**：遊戲中途 kill bridge → 船唔跳崖、chip 顯示 reconnecting、10 秒後順滑轉 fallback;重啟 bridge → 自動接返、速度冇突變;Results 誠實標注斷咗幾耐。

---

## 6. 時間表 + 應急計劃

| 時段 | 做乜 |
|------|------|
| **P0（今日→07-11）** | §3 發佈上 main → §4 Vercel/DeepSeek 四步驗證 → T2 EEG rehearsal 開跑（人手，同 code 並行）→ Prompt G1 |
| **P1（07-12→07-18）** | Prompt G2 → Prompt P1；T2 持續，寫好斷線急救卡 |
| **P2（07-19→07-25）** | Prompt P2 → Prompt U1 → Prompt E1（用 T2 嘅實測筆記填入去） |
| **P3（07-26→07-31）** | 唔加新功能。完整 rehearsal ×2（台詞+demo+互考 Q&A）、比賽實機跨裝置 QA、故障演練（EEG 斷→Simulation、無網→local fallback）、code freeze |

**時間唔夠就只做三件**：T2（最大現場風險）→ G1（最大玩法弱點）→ P1（最大效能風險）。其他全部可以割。

---

## 7. 比賽日 checklist（P3 時再展開）

- [ ] 比賽機裝好：Chrome、bridge、電池 ×2、後備 MindWave（如有）
- [ ] 斷線急救卡（T2 產出）貼喺攤位
- [ ] 30 秒切 Simulation 台詞人人識背
- [ ] devtools Network 最後檢查：零 key 外露
- [ ] 離線 fallback 實測：拔網線照玩到
- [ ] Results 頁截圖印出嚟（評判追問「證據」時直接畀睇）
