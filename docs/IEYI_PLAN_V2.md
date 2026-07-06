# NeuroFocus IEYI 計劃 V2（2026-07-06 更新・唯一有效版本）

> **全 repo 得呢一份 plan。** 展覽 / 答辯嘅參考大全喺另一份 [`docs/EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md)。
>
> **一句總覽**：後端 / 登入 / key 安全 / 證據鏈 / EEG 放大 / UI reskin / 書房移除 / repo 清潔 / 文件整合 —— 全部已完成並喺 `main`。
> Repo 而家**只有一條 `main` branch**，Claude 同 TRAE 都直接喺 `main` 做嘢。
>
> **剩低嘅工作分兩階段：**
> - **【階段一 · 重新設計】** D1 Results Dashboard 重新設計 → D2 Gameplay 重新設計（吸引到人 + 真係改善專注）
> - **【階段二 · 收尾打磨】** P1 動態畫質 → P2 Web 加靚/現代化 → U1 文案人性化 + Footer → E1 EEG 韌性 → F1 審計（過期檔案/漏洞/風險）

---

## 🎯 核心設計原則（所有設計決定都要對齊呢個）

1. **網頁 100% 目標 = 改善專注力。** 唔係普通遊戲，係神經回饋訓練工具。每一個設計決定都要問返：「呢樣嘢點幫用戶練到專注？」
2. **80% 體驗重心放喺 EEG。** 真神經回饋閉環（腦→船→即時回饋）先係產品嘅靈魂同 wow factor。Gameplay、Dashboard、獎勵、進度——全部要令**戴住 EEG 嘅用戶**覺得最爽、最有成就感、最睇到自己進步。
3. **20% effort 擺喺 Simulation。** 佢淨係一個 **fallback**：畀冇 EEG 裝置嘅用戶 / demo 保底用。要求只係「玩到、唔穿崩、唔穿煲（唔會令人以為係假 EEG）」，唔使喺佢身上落太多花巧。
4. ⚠️ **注意分清兩件事**：以上係「**設計投放**」原則（狂谷 EEG 體驗）。但現場 demo 嘅「**可靠度保命符**」仍然係 Simulation（EEG 藍牙唔穩時即刻切）。兩者唔矛盾：設計時 EEG 做主角，現場穩定性 Simulation 做安全網。

---

## 0. 目錄

1. 現狀 snapshot（已完成）
2. 工作流程（已改：直接喺 main 做）
3. **Claude vs TRAE 分工 + 點交接**
4. Vercel + DeepSeek API 驗證
5. Roadmap（階段一設計 → 階段二收尾）
6. 時間表
7. 比賽日 checklist

---

## 1. 現狀 snapshot（截至 2026-07-06）

| 已完成 | 證據 |
|--------|------|
| DeepSeek key 收埋喺 server（Vercel serverless proxy + GET 健康檢查） | `api/questions.js` |
| 真 Supabase Auth（錯密碼入唔到；離線 fallback） | `services/authService.js` |
| Results Dashboard 基礎（session 內前後對比 + 專注曲線 + 跨 session trend） | `runtime.js` `showResultsDashboard` 區 |
| 跨 session 歷史（Supabase + localStorage mirror） | `services/storageService.js` |
| 自適應門檻（用歷史調 recovery/trigger） | `resolveAdaptiveFocusTraining()` |
| 即時 FPS meter（DEMO_MODE 後面） | `updateFpsMeter()` |
| EEG 雙軸心流 + 呼吸實時腦電回饋 + 訊號質素 chip | commit `a843f5ae` |
| 字體統一（Orbitron 只留 game HUD） | `styles/pages/game.css` |
| 兩個模式統一海洋（書房已完全移除） | commit `daa57813` |
| Repo 清潔（30MB zip、debug 遙測已清）+ 文件整合成手冊 | commit `71e327a6` |

**未做 / 待做**：見 §5 —— 階段一（Dashboard + Gameplay 重新設計）、階段二（P1 P2 U1 E1 F1）、人手任務（EEG rehearsal、Vercel 驗證、換 key）。

> 註：`pages/game/focusGates.js`（專注閘門模組）目前 disable。**佢嘅去留由 D2 gameplay 重新設計決定**——本 plan 唔再事先規定點用佢。

---

## 2. 工作流程（已改：直接喺 main 做）

Repo 而家淨返 **`main` 一條 branch**，冇再分叉。無論 Claude 定 TRAE：

```bash
# 開工前（每次）
git pull origin main

# 做完（每次）
git add -A
git commit -m "講清楚改咗乜"
git push origin main
```

- Vercel 見到 `main` 有新 commit 會自動 deploy（去 Vercel dashboard → Deployments 睇轉綠）。
- **確認同步**：`git fetch` 之後比較 `git log -1 --oneline` 同 `git log -1 --oneline origin/main`，兩個 hash 一樣 = 同步。
- 🔴 **鐵律**：同一時間**只可以一邊**（Claude 或 TRAE）改嘢，尤其係 `pages/game/runtime.js`（5000+ 行大檔）。兩邊同時改必撞、必亂。

---

## 3. Claude vs TRAE 分工 + 點交接

### 邊個做邊樣（按強項分）

| 任務 | 建議由邊個做 | 點解 |
|------|:---:|------|
| **D1 Dashboard 重新設計**（數據 + 版面邏輯） | **Claude** | 多檔案推理、資料流、i18n 一致性 |
| **D2 Gameplay 重新設計**（分析 + 設計 + 核心邏輯） | **Claude**（設計+寫）＋ **你/TRAE**（試玩回饋） | runtime.js 大重構要小心；但「好唔好玩」要真人試 |
| **P1 動態畫質**（FPS 邏輯） | **Claude** | 純邏輯、要細心改 runtime.js |
| **P2 Web 加靚 / CSS 動畫** | **TRAE 為主**（你睇住即時效果調）＋ Claude 起底 | 「靚唔靚」要**即時睇住個 browser** 先判斷得到 |
| **U1 文案人性化 + Footer** | **Claude 起草** → **你逐句 review** | 雙語一致、避免過度宣稱；但語氣你話事 |
| **E1 EEG 韌性**（reconnect 邏輯） | **Claude 寫** → **你/TRAE 用真頭帶測** | 邏輯 Claude 寫得好；但一定要真 EEG 先試到斷線 |
| **F1 審計**（過期檔案/漏洞/風險） | **Claude** | 掃全 repo、找 dead code / 風險係 Claude 強項 |
| **T2 實機 rehearsal** | **你 + 隊友** | 純硬件實測，冇 code |

**一句記法**：**「要動腦 / 改大檔 / 掃全 repo」畀 Claude；「要即時睇畫面 / 要真硬件」畀 TRAE 或你自己。**

### 點交接（每次切換都要做，唔可以懶）

**Claude → TRAE**（我做完，輪到 TRAE）：
1. 確認 Claude 已 `git push origin main`（我會同你講「已 push」）。
2. TRAE 度打 `git pull origin main`。
3. 先確認 TRAE 睇到最新（`git log -1 --oneline` 對得上）先開工。

**TRAE → Claude**（TRAE 做完，輪到我）：
1. TRAE 度 `git add -A && git commit && git push origin main`。
2. 開新 Claude 對話，第一句話：「**你先 `git pull origin main` 攞最新，我頭先用 TRAE 改咗嘢**」。
3. 我會 pull latest 先做嘢。

**🔴 交接鐵律**：切換之前，上一邊一定要 **push 完 + 冇未存檔嘢**（`git status` 應該係 clean）。唔好 Claude 改到一半、又叫 TRAE 開工——兩份改動撞埋會好麻煩。**一次一邊，做完 push，先換手。**

---

## 4. Vercel + DeepSeek API 驗證（發佈後即刻做一次）

你唔肯定 DeepSeek 喺 Vercel 行唔行——照四步就有決定性答案。**就算行唔通，遊戲有本地 fallback 題庫照玩，比賽唔會死**；但 AI 出題係賣點，值得整好。

**步驟 1 — 健康檢查**：瀏覽器開 `https://<你嘅-app>.vercel.app/api/questions`

| 見到 | 意思 | 做咩 |
|------|------|------|
| `{"ok":true,"hasKey":true}` | key 已駁通 | 去步驟 2 |
| `{"ok":true,"hasKey":false}` | Vercel 未 set 環境變數（最常見） | Vercel → Project → Settings → Environment Variables → 加 `DEEPSEEK_API_KEY`（Production + Preview 都剔）→ Deployments 撳 **Redeploy** → 重做步驟 1 |
| 404 / 空白 | function 冇 deploy | 確認 `api/questions.js` 喺 main、Vercel root 冇 set 錯 |

**步驟 2 — 真打一炮**：
```bash
curl -s -X POST "https://<你嘅-app>.vercel.app/api/questions" \
  -H "Content-Type: application/json" \
  -d '{"count":3,"difficulty":"easy","lang":"hk"}'
```
`{"ok":true,"questions":[...]}` = 全通。`upstream-401` = key 錯/過期。`upstream-402` = DeepSeek 冇錢。`timeout` = 確認 `vercel.json` 有 `maxDuration: 30` 而且 redeploy 咗。

**步驟 3 — 遊戲入面驗**：開站 → 挑戰模式 → devtools Network → 見 `POST /api/questions` 回 200 + questions = AI 行緊。順便確認 Network **冇任何 request 見到 DeepSeek key**。

**步驟 4 — 提醒隊友（人手）**：舊 DeepSeek key 曾 hardcode 喺 public git history，任何人翻歷史都攞到 → 考慮喺 DeepSeek 後台 revoke 舊 key、開新 key，新 key 只放 Vercel 環境變數。

---

## 5. Roadmap

> **每步開工前**：`git pull origin main`。
> **每步做完**：`node server.js`（port 8000）行一次 Simulation 全流程 + 開 FPS meter 確認唔掉幀 → commit + push → 先開下一步。
> **一次只做一步。** runtime.js 係大檔，兩件事同時改必撞。

---

### 🎨 階段一 — 重新設計（交畀下一個對話由零設計）

> 呢兩件係**設計任務**，唔係填色。下一個對話要先**分析、提案、同你對齊**，先至寫 code。所以下面寫嘅係**目標 + 約束 + 要回答嘅設計問題**，唔係一步步指令——等 Claude 自己諗個好設計出嚟畀你揀。

#### D1 — Results Dashboard 重新設計

**現狀**：Results 已有 session 內前後對比、專注曲線 SVG、跨 session trend（`runtime.js` 內 `showResultsDashboard` 區）。功能夠，但版面 / 說服力 / 靚度仲有大進步空間。

**目標**：打開 Results 嗰一刻，用戶（同評判）**3 秒內睇到「我今次專注得唔得？有冇進步？」**。呢一頁係「**點證明真係改善咗專注**」嘅核心證據，要靚、要清、要有說服力。

**約束**：
- **EEG 為主角**：EEG session 要展示最豐富嘅數據（雙軸專注+放鬆、恢復速度、跨 session 進步曲線）；Simulation session 版面簡化即可。
- 雙語（`app/i18n.js` hk/en 兩個 block 都要有 key）。
- 保留現有數據來源，唔好搞亂 `appendSessionSummary` / `session_history` 結構（除非 D1 明確要加欄位，要同你講清楚）。
- 手機 / iPad / desktop 都要睇得靚。

**要回答嘅設計問題**（下個對話要提案）：
- 邊 3 個指標最能講「改善專注」嘅故事？點樣一眼睇到 vs 上次？
- 跨 session 進步點視覺化先最有說服力（曲線？進度環？「你比上次快 X 秒回復專注」）？
- 評判追問「證據」時，呢一頁點樣自己講故事？

#### D2 — Gameplay 重新設計（吸引到人 + 真係改善專注）

**現狀痛點**：訓練模式冇離散「贏緊」嘅事件，玩家淨望住一個 ratio，被動又悶；成個 gameplay 嘅「吸引力」同「訓練效果」都未拉到滿。（舊 plan 試過用 Focus Gates / hold streak 解決，但依家決定**由零重新諗**，唔受舊設計綁死。）

**目標**：設計一套 gameplay，**同時做到兩件事**——
1. **吸引到人**（攤位上有人行過會想試、試完想再玩、旁邊人想睇）。
2. **真係改善專注**（有明確目標、有維持專注嘅獎勵、有溫柔嘅分心恢復、有進步感）。

**約束（對齊核心設計原則）**：
- **EEG 體驗做主角**：隻船 = 你個腦。設計要令「我專注 → 船有反應」嘅閉環**又快又爽又睇得到**；雙軸（專注 AND 放鬆）、呼吸介入（分心→救返嘅一幕）要係 gameplay 嘅高光位。
- **Simulation 只求玩到**：唔使為 Simulation 度身設計花巧嘢。
- **溫柔**：呢個係俾學生 / 小朋友嘅訓練工具，失敗要溫柔（唔好懲罰感）、唔好過度刺激（唔係街機）。
- 唔好破壞現有：船物理、題目流程、呼吸介入邏輯、自適應門檻（除非設計明確要改，要同你講）。
- `pages/game/focusGates.js` 可以**重用 / 重新設計 / 刪走**——由呢個設計決定。

**要回答嘅設計問題**（下個對話要先提案，你揀咗先寫 code）：
- 「贏」嘅結構係咩？訓練模式點樣有可數、可追求嘅目標（而唔淨係一條 ratio）？
- 點樣獎勵「**持續維持專注**」而唔係「一刻高專注」？
- 分心之後點樣溫柔咁 pull 返用戶（呼吸介入之外仲有冇）？
- 點樣令旁觀者一睇就明「佢而家好專注 / 佢分咗心」？（攤位吸引力）
- 訓練模式 vs 挑戰模式喺新設計入面點分工？

> **交付方式**：下個對話應該**先出一份 gameplay 設計提案（2–3 個方向 + 推薦）畀你揀**，對齊咗方向先開始寫 code、拆成細步實作。

---

### 🛠️ 階段二 — 收尾打磨

#### P1 — 動態畫質 scaling（流暢度安全網，要最先做）

```
Context: NeuroFocus, no-build vanilla-JS + Three.js. Run `node server.js`,
open http://localhost:8000, Simulation mode (no EEG needed).
pages/game/runtime.js already has:
- updateFpsMeter(deltaMs): rolling FPS accumulator + on-screen meter;
- PERFORMANCE_PROFILE (getPerformanceProfile()): static quality knobs incl. waterResolution;
- getAdaptiveRenderScale(): currently mostly-static;
- setupPostProcessing(): builds composer + bloom.

Task: turn static quality into a closed-loop dynamic system driven by measured FPS.
1. Reuse the FPS accumulator in updateFpsMeter (do NOT add a second timer).
2. avg FPS < 45 for 3s+ → step quality DOWN one level; > 55 for 10s+ → step UP.
   Asymmetric windows (fast down, slow up) to avoid oscillation. Max one step / 3s.
3. Quality ladder (L0 = full):
   L0: current settings.
   L1: renderer pixel ratio ~25% lower (renderer.setPixelRatio).
   L2: bloom/composer bypassed, pixel ratio as L1.
   L3: water reflection texture at half PERFORMANCE_PROFILE.waterResolution, + above.
4. No mid-frame rebuilds; switch at next frame boundary (no visible hitch).
5. When DEMO_MODE, show current level (L0-L3) next to the FPS meter.

Constraints: no gameplay logic changes; Simulation must run identically;
test by forcing a huge pixel ratio via devtools and watching it step down then recover.
```
**驗收**：開 FPS meter 睇個 L 字——人為加負荷 → 幾秒內逐級落、FPS 回穩；移走負荷 → 慢慢升返 L0；肉眼冇跳格。Windows 機實測前後 FPS。

#### P2 — Web 加靚 / 現代化 / CSS 動畫 redesign（P1 做完先開；建議 TRAE 主力）

**目標**：令成個網站（尤其 Home + Setup + Results）睇落**現代、精緻、吸引到人行過想試**。呢步好睇「即時視覺效果」，所以**建議喺 TRAE 度做**（你可以即刻喺 browser 睇住調）。

```
Context: same project. Dynamic quality scaling (P1's L0-L3 ladder) is live, so
richer visuals are safe on weak machines. In-game 3D effects must gate behind
L0/L1 only and respect PERFORMANCE_PROFILE.

Task — modernise the look, keep it calm/premium (not cartoonish, not a street arcade):
1. Home / Setup / Results：refresh layout、spacing、typography hierarchy、
   卡片質感（Clay/Glass 已有，加強一致性）；加細膩 CSS 過場動畫（hover、
   進場 fade/slide、按鈕微互動）。目標：睇落似一個 2026 年嘅產品，唔似 demo。
2. 尊重 Windows 效能保護（html[data-platform="windows"] 已關重 blur/動畫）——
   新動畫喺 Windows 要有 reduced 版本 / prefers-reduced-motion fallback。
3. In-game：水面近船 sun glint + normal-map 細節、warm-cool 光影對比、
   flow-state 一刻（body class flow-state-mode）bloom+曝光升 ~15% 兩秒 + wake 粒子擴大，
   令「入心流」嘅獎勵感覺得到。用返現有 bloom pass，唔好加新 pass。
4. 唔好搞亂 game HUD 嘅 Liquid Glass 風格同 Orbitron 字體。

Constraints: 全部 in-game 新效果 gate 喺 quality level 後面；用 FPS meter + 
quality badge 確認 L0 >= 55 FPS、迫落 L2 見到新效果自動熄。
```
**驗收**：前後截圖對比（Home / Setup / Results 現代化程度、in-game flow 一刻）；FPS meter 企穩；Windows 機唔掉幀；開 prefers-reduced-motion 有 fallback。

#### U1 — 文案人性化 + 符合進度 + Homepage Footer（Claude 起草 → 你逐句 review）

```
Context: same project — bilingual copy in app/i18n.js (en + hk blocks, keys must match).
Student competition (IEYI); judges probe overclaims. Product state has advanced:
real Supabase auth, cross-session dashboard, dual-axis EEG flow — copy must MATCH current reality.

Task:
1. 全站文案人性化 + 符合目前進度：sweep home / auth / setup / game HUD tooltips /
   results 雙語文案。語氣要溫暖、鼓勵、似真人講嘢；同時**誠實**——
   - 移除過度宣稱（"clinically proven"、"醫療"、"讀你個腦"）。
   - Home 裝置講法：由「支援 Muse/Emotiv」改做「以 NeuroSky MindWave 為主，架構可擴展」。
   - 講返而家真係做到嘅（真登入、跨 session 進步對比、雙軸專注+放鬆）。
2. Homepage 底部欄（Footer）：現時有「服務條款 / 技術支援 / 隱私政策 / 聯絡我們」等
   按鈕但多數係死連結。逐個處理：
   - 死連結（無內容嗰啲）→ 移除，或者填返有需要嘅文案 / 頁面。
   - 「隱私政策」→ 做一頁誠實 policy（route 法跟現有簡單頁），雙語講清：
     收咩（session 期間 EEG attention/meditation、選用嘅本地相機專注分且從不上傳、
     帳戶 email、session 摘要）、去邊（Supabase）、永不收咩（原始影片/音訊）、可要求刪除。
   - 「聯絡我們」→ 真 mailto:。
3. 每個 i18n key 喺 hk 同 en 兩個 block 都要有（缺 key 會顯示做原始 key 名）。

Verification: 逐頁撳晒 footer 每個 link；切語言逐頁重讀所有改過嘅文案。
```
**驗收**：你（Steven）逐句過中英文先准 push——尤其 Home 裝置講法、Footer 每個按鈕、隱私政策內容；Claude 核對雙語 key 有齊 + 冇死 link。

#### E1 — EEG 韌性 + 作用（要先做完 T2 rehearsal，有真實斷線筆記先入 prompt；Claude 寫、真頭帶測）

```
Context: same project. EEG path: NeuroSky MindWave -> eeg_bridge.py (local WebSocket)
-> browser WS client in pages/game/runtime.js (search "bridge-connect" / activateEEGMode).
A signal-quality chip exists in the HUD. Real booth-rehearsal failure notes:
[貼 T2 嘅實測筆記：邊一步斷、幾密、點救返]

Task:
1. Browser: auto-reconnect with backoff (1s,2s,4s, max ~10s, keep trying) when the
   bridge WS drops mid-session, WITHOUT interrupting gameplay — freeze last focus value
   up to 10s, then ease into simulation fallback, show non-blocking "reconnecting…" on
   the signal chip (bilingual, i18n keys in both blocks).
2. On headset reconnect, ease back from fallback to real EEG (lerp focus source ~2s, no boat jump).
3. eeg_bridge.py: on serial read failure, retry the port-scan loop instead of needing a
   manual restart; keep status messages flowing to the client.
4. Results honesty: if any part ran on fallback, note "signal dropped for Xs" in the summary.

Constraints: never crash gameplay on disconnect; Simulation-only sessions behave exactly
as before; test by killing/restarting eeg_bridge.py mid-session with the game running.
```
**驗收**：遊戲中途 kill bridge → 船唔跳崖、chip 顯示 reconnecting、10 秒後順滑轉 fallback；重啟 bridge → 自動接返、速度冇突變；Results 誠實標注斷咗幾耐。**呢個一定要用真頭帶再實測一次。**

#### F1 — 審計：過期檔案 / 漏洞 / 風險（最後掃底；Claude 做）

```
Context: same project, everything on main. Before code freeze, do a full audit and
report (fix the safe ones, list the rest for me to decide).

Task — check and report:
1. 過期 / 死檔案 / dead code：搵無人 import 嘅檔、無人叫嘅 function、註解掉嘅舊 code、
   重複邏輯、剩低嘅 debug flag（DEMO_MODE 等——列出邊啲 demo-only、比賽前要唔要關）。
2. 安全 / 漏洞：
   - devtools Network 確認**零** DeepSeek key 外露（只應見自己 domain /api/questions）。
   - Supabase anon key 係設計上 public（靠 RLS）——**核實 Supabase RLS policy 真係開咗**，
     唔係靠隱藏 key。
   - 舊 DeepSeek key 仲喺 git history（已知）——喺報告重申，提你搵隊友 revoke。
   - 掃有冇其他 hardcode 嘅 secret / token / 私人 email 誤入 code。
3. 穩定性風險：CDN 依賴（three / mediapipe / supabase 靠 unpkg/jsdelivr/esm）——
   會場網絡差會點？列出單點故障 + 有冇本地 fallback。
   錯誤處理有冇缺口（未 catch 嘅 async、會 crash 成頁嘅位）。
4. 出一份 report：分「已修 / 要你決定 / 已知風險（可接受）」三類。

Constraints: 只改明確安全嘅嘢（刪死 code、修錯處理）；有風險 / 要判斷嘅唔好自己拆，列出嚟等我決定。
```
**驗收**：Claude 交一份分三類嘅 report；`node server.js` 全流程仍然行到；比賽前 demo-only flag 清單清楚。

---

### 👤 人手任務（非 code，同 code 並行做）

- **T2 — EEG 實機 rehearsal**（越早越好）：比賽用嗰部 Windows 戴 MindWave 行完整流程 ≥5 次，記低每次連接用幾耐、幾時斷、斷喺邊步、點救返。試埋極端情況（長頭髮、出汗、圍觀人多藍牙干擾、連玩 30 分鐘）。寫成一頁「斷線急救卡」。**呢啲筆記係 E1 prompt 嘅輸入。**
- **Vercel + DeepSeek 驗證**：見 §4。
- **提醒隊友換 DeepSeek key**：見 §4 步驟 4。
- **練「30 秒切 Simulation」台詞**：EEG 死咗當場點講點切（demo 保命符，見手冊 Part 5/6）。

---

## 6. 時間表（到 7 月尾）

| 時段 | 做乜 |
|------|------|
| **依家 → 07-13** | 開新對話做**階段一設計**：D1 Dashboard + D2 Gameplay（先提案對齊、再實作）。並行：T2 rehearsal 開跑、Vercel/DeepSeek 驗證。 |
| **07-14 → 07-20** | P1 動態畫質 → P2 Web 加靚（TRAE 主力）。 |
| **07-21 → 07-26** | U1 文案 + Footer（你逐句 review）→ E1 EEG 韌性（用 T2 筆記）。 |
| **07-27 → 07-31** | F1 審計 → code freeze。完整 rehearsal ×2、跨裝置 QA、故障演練（EEG 斷→Simulation、無網→local fallback）。唔加新功能。 |

**時間唔夠就保呢啲**：T2（現場風險）+ D2 gameplay（吸引力+訓練效果）+ P1（流暢度）+ E1（EEG 韌性）。P2 加靚同 F1 可以壓縮。

---

## 7. 比賽日 checklist（P3 展開）

- [ ] 比賽機裝好：Chrome、bridge、電池 ×2、後備 MindWave（如有）
- [ ] 斷線急救卡（T2 產出）貼喺攤位
- [ ] 30 秒切 Simulation 台詞人人識背
- [ ] devtools Network 最後檢查：零 key 外露（F1 已驗）
- [ ] 離線 fallback 實測：拔網線照玩到
- [ ] Results 頁截圖印出嚟（評判追問「證據」時直接畀睇）
