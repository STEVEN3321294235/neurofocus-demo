# NeuroFocus IEYI 計劃 V2（2026-07-06 更新・唯一有效版本）

> **全 repo 得呢一份 plan。** 展覽 / 答辯嘅參考大全喺另一份 [`docs/EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md)。
>
> **一句總覽**：後端 / 登入 / key 安全 / 證據鏈 / EEG 放大 / UI reskin / 書房移除 / repo 清潔 / 文件整合 —— 全部已完成並喺 `main`。
> Repo 而家**只有一條 `main` branch**，Claude 同 TRAE 都直接喺 `main` 做嘢。
>
> **剩低嘅工作分兩階段：**
> - **【階段一 · 重新設計】** D2 Gameplay 重新設計（**設計已定案：航海旅程 × 心流充能**，實作步驟見 §5）→ D1 Results Dashboard（D2 完成後由 Stitch 出設計稿、Claude 實作；Training / Challenge 分開設計）
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

> 註：`pages/game/focusGates.js` 已於 2026-07-06（D2-0）**移除**——佢嘅「離散事件」角色由 D2 新設計嘅「心流充能摘星」取代（見 §5）。

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
| **D1 Dashboard 重新設計**（Training / Challenge 分開兩版） | **Stitch 出設計稿** → **Claude 實作** | 版面視覺交 Stitch 生成；數據流 / i18n / 響應式由 Claude 落地 |
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

### 🎨 階段一 — 重新設計（設計已定案 2026-07-06，實作中）

> D2 gameplay 設計已經同 Steven 對齊定案，下面係**定案內容 + 一步步實作計劃**。
> 鐵律照舊：**一次只做一步**，每步做完喺 Simulation 本地測（開 FPS meter），Steven 驗收 OK 先開下一步；每步 commit + push `origin main`。

#### D2 — Gameplay 定案：「航海旅程 × 心流充能」

**核心概念**：個海嘅天氣 = 你個腦嘅倒影（世界回饋）；穩住專注儲能量、儲滿摘星（可數成就）。兩者合體——「星」負責目標感同進步感，「天氣」負責靚、攤位吸引力、EEG 高光。

**已拍板嘅設計決定**（Steven 2026-07-06 確認）：

| 決定 | 內容 |
|---|---|
| 航線 | **1a 直線航道 + 視覺路線**：船照直行，水面有發光航道線，沿途島嶼/燈塔 checkpoint；minimap 畫成風格化彎路 |
| 偏航 | **2a 溫柔偏航（無懲罰）**：分心 → 船慢慢飄離航道線；專注返 → 自動滑返。冇 game over，分心嘅代價只係充能暫停 |
| Minimap | **3a 風格化航海圖卡，modern 設計**：路線 + 島 + 船位 + 「下一個島仲有 XXXm」；輕量 2D（SVG/HTML），零 FPS 負擔 |
| 續航 | **4b 每場獨立 + 航海日誌**：每場由頭開始（機制簡單），但累積總航程/總燈塔數會喺開場同 Results 顯示（「你嘅航程總共已行咗 12.4 km、經過 9 座燈塔」）。總航程由歷史每場距離加總得出，**唔使改 session_history 結構** |
| UI | **5a 保留骨架、圍住新元素重新編排**：能量環、航海圖卡、天氣狀態做新主角；**必須考慮唔同裝置比例**（手機橫屏 / iPad / desktop）嘅排版 |
| Assets | **6a 程序化 + 現有資產，但盡量整到最靚**：島/燈塔用程序化幾何砌，加**少少生態環境**（海鳥、島上植被等平價元素，全部 gate 喺 performance profile 後面）。唔下載大型模型；精選細模型替換留到 P2 先考慮 |
| 模式分工 | 訓練模式用足全套（星＋天氣＋航線）；挑戰模式答題做主軸，繼承天氣＋航線，**唔加星**（避免同題目分數打架） |
| EEG 80/20 | 「黃金時刻」（專注+放鬆雙軸達標嘅特別視覺狀態）係 **Real EEG 專屬**；Simulation 玩到其餘全套（單軸） |
| focusGates | 已移除（D2-0），角色由心流充能取代 |

**實作步驟**（每步一個 commit，附 Steven 驗收方法）：

| 步 | 內容 | 驗收（Simulation 模式 + FPS meter） | 狀態 |
|---|---|---|---|
| **D2-0** | 定案寫入本 plan + 拆走 focusGates（module、HUD、i18n、CSS） | game 行一場一切如舊、console 冇錯 | ✅ 2026-07-06 |
| **D2-1** | **畫質急救：抗鋸齒 + 資源重平衡**——回應「船身好多鋸齒」：開返硬件抗鋸齒（包括 bloom 管線下嘅多重採樣），同時調低其他負載（水面反射解像度等）補償，Windows/iPad 唔可以因此掉幀 | 望船身邊緣：鋸齒明顯減少；FPS 冇跌（前後對比） | ⬜ |
| **D2-2** | **心流充能引擎**：企穩喺個人穩定線以上能量環慢慢充，分心暫停（唔倒扣），充滿≈25 秒得一粒星；HUD 能量環 + 星數 | 專注段充緊、分心段停咗、儲滿「叮」+1 星 | ⬜ |
| **D2-3** | **摘星慶祝一刻**：得星嗰 2–3 秒短暫滑行加速 + 光暈 + 溫柔音效 | 摘星有「爽」感；FPS 企穩 | ⬜ |
| **D2-4** | **天氣共感**：分心持續 → 海面起霧、水色轉濁；專注返 → 霧散陽光返（旁觀者唔使識睇 HUD 都知狀態） | 霧慢入慢散唔閃跳；FPS 企穩 | ⬜ |
| **D2-5** | **呼吸介入 v2「撥霧」**：觸發呼吸時霧鎖畫面 → 呼氣霧退 → 完成陽光爆返 + 充能加速獎勵 | 用測試面板迫低專注，睇成幕戲順唔順 | ⬜ |
| **D2-6** | **黃金時刻（EEG 雙軸專屬）**：專注+放鬆都達標 → 天色轉暖、船發光、水面金光；測試面板加「假放鬆值」掣方便無頭帶驗證 | 測試面板較高雙軸 → 入/出黃金時刻順滑 | ⬜ |
| **D2-7** | **航線 + 島嶼 checkpoint + 少少生態**：水面發光航道線；每隔一段距離程序化島/燈塔；經過 → 鐘聲 + 「⚓ 到達第 N 座燈塔」；海鳥/植被等平價生態點綴（gate 喺 performance profile） | 行到 checkpoint 有事件感；遠望見到下一個島；FPS 企穩 | ⬜ |
| **D2-8** | **航海圖卡 minimap（modern）**：風格化路線 + 島 + 船位 + 「下一個島 XXXm」；響應式 | desktop / iPad / 手機橫屏都擺得靚讀得明 | ⬜ |
| **D2-9** | **航海日誌（4b）**：累積總航程 + 總燈塔數，開場見「你嘅航程已達…」，Results 有航海日誌一行；登入用雲端歷史、訪客用本機 | 玩兩場，第二場開場顯示累積數 | ⬜ |
| **D2-10** | **溫柔偏航**：分心 → 慢慢飄離航道線；專注返 → 滑返；minimap 同步顯示 | 較低專注 → 肉眼見到偏航同回正 | ⬜ |
| **D2-11** | **挑戰模式配平 + HUD 執位 + 雙語掃尾**：答題流程不變、繼承天氣航線唔加星；新 HUD 元素喺唔同裝置比例排版；i18n hk/en key 齊 | 挑戰模式全程行一次；切中英各行一場；iPad 尺寸睇一次 | ⬜ |
| **D2-12** | **總驗收 + FPS 掃尾**：訓練+挑戰全流程、執漏、FPS 對比記錄 | Steven 當自己係攤位訪客玩兩場收貨 | ⬜ |

**時間唔夠嘅保命次序**：D2-1～6（核心循環＋畫質）必保；D2-7～8（航線+minimap）高價值；D2-9～10（日誌+偏航）可壓縮。

#### D1 — Results Dashboard（D2 完成後先開）

**流程已定**：Training 同 Challenge 兩個模式嘅 Results **分開設計**。版面視覺由 **Stitch** 出設計稿（Steven 主導），Claude 負責：
1. **D2 新數據落地**：session 摘要加「星數 / checkpoint 數 / 黃金時刻秒數 / 呼吸救返次數」（以新增欄位方式，唔郁現有結構；動 schema 前要同 Steven 講清楚）。
2. 攞住 Stitch 設計稿實作：數據綁定、雙語 i18n、響應式、EEG session 豐富版 vs Simulation 簡化版。
3. 設計原則保留：**3 秒內答到「今次得唔得？有冇進步？」**；EEG session 展示最豐富數據；跨 session 進步要一眼睇到。

> D1 嘅詳細拆步等 Stitch 設計稿出咗、Steven 揀咗先寫入呢度。

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

> （可選加碼）D2 嘅島/燈塔係程序化幾何。如果 P1 之後 FPS 有富餘，可以喺呢步用 1–3 個 **CC0 授權**細模型替換（每個壓縮後幾 MB 內、載入 + FPS 實測先收貨）。

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
| **07-06 → 07-09** | D2-0～6（核心循環：拆舊 + 畫質急救 + 充能摘星 + 天氣 + 撥霧 + 黃金時刻）。並行：T2 rehearsal 開跑、Vercel/DeepSeek 驗證。 |
| **07-10 → 07-13** | D2-7～12（航線 + minimap + 航海日誌 + 偏航 + 配平 + 總驗收）。並行：Stitch 出 D1 設計稿（Training / Challenge 兩版）。 |
| **07-14 → 07-16** | D1 實作（Stitch 稿 → Claude 落地：數據綁定、雙語、響應式）。 |
| **07-17 → 07-19** | P1 動態畫質。 |
| **07-20 → 07-23** | P2 Web 加靚（TRAE 主力；如 FPS 容許先考慮精選細模型替換島/燈塔）。 |
| **07-24 → 07-27** | U1 文案 + Footer（你逐句 review）→ E1 EEG 韌性（用 T2 筆記）。 |
| **07-28 → 07-31** | F1 審計 → code freeze。完整 rehearsal ×2、跨裝置 QA、故障演練（EEG 斷→Simulation、無網→local fallback）。唔加新功能。 |

**時間唔夠就保呢啲**：T2（現場風險）+ D2-1～6（核心循環+畫質）+ P1（流暢度）+ E1（EEG 韌性）。D2-9～10、P2 加靚同 F1 可以壓縮。

---

## 7. 比賽日 checklist（P3 展開）

- [ ] 比賽機裝好：Chrome、bridge、電池 ×2、後備 MindWave（如有）
- [ ] 斷線急救卡（T2 產出）貼喺攤位
- [ ] 30 秒切 Simulation 台詞人人識背
- [ ] devtools Network 最後檢查：零 key 外露（F1 已驗）
- [ ] 離線 fallback 實測：拔網線照玩到
- [ ] Results 頁截圖印出嚟（評判追問「證據」時直接畀睇）
