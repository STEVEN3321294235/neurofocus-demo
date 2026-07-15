# NeuroFocus IEYI 計劃 V2（2026-07-11 更新・唯一有效版本）

> **全 repo 得呢一份 plan。** 展覽 / 答辯嘅參考大全喺另一份 [`docs/EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md)。
>
> **一句總覽**：後端 / 登入 / key 安全 / 證據鏈 / EEG 放大 / UI reskin / 書房移除 / repo 清潔 / 文件整合 —— 全部已完成並喺 `main`。
> Repo 而家**只有一條 `main` branch**，Claude 同 TRAE 都直接喺 `main` 做嘢。
>
> **剩低嘅工作分兩階段：**
> - **【階段一 · 重新設計】** D2 Gameplay ✅ **已完成（2026-07-07）** → D1 Results Dashboard ✅ **已完成（2026-07-10，v0 設計稿 → Claude 實作，Training / Challenge 兩版 + 深淺色，詳見 §5）**
> - **【階段二 · 收尾打磨】**（2026-07-10 晚 更新）
>   - **P1 動態畫質 ✅ 完成（07-11 擴充版）**：FPS 驅動四級自動階梯（L0-L3）＋遊戲內設定面板——畫質鎖定/自動、鏡頭距離、**BGM/音效音量**、**全螢幕**；開面板＝暫停（正規 pause 管線）。設定全部存 localStorage。
>   - **P2 加靚 ✅ Claude 部分完成**：頁面過渡 CSS（全站入場 rise-and-fade，遊戲頁除外）已加，連同早前 loading 現代化、提示重排、水痕/浮標/海鷗/船身物理打磨——**Claude scope 收貨**。剩餘（可選、TRAE/Steven 睇住 browser 做）：in-game sun glint / flow 一刻 bloom 脈衝、Home hover 微互動加碼。
>   - **U1 文案 🟡 主體完成**：全站 sweep 完成。「聯絡我們」**Steven 決定暫時唔做**。**簡體中文：建議賽前唔加**（理據見對話記錄：現有雙語架構係兩語設計，加第三語要掃幾百個字串位；而且而家嘅中文係粵語口語，正式簡中要重寫做書面語先似樣——賽後如要進軍內地市場再做）。剩：隱私政策頁、Steven 逐句 review。
>   - **E1 EEG 韌性 🟡 部分完成**：橋接協議（ThinkGear 同步/checksum/eSense/信號質素映射）已核實正確；serial 斷線自動重掃本身已有；瀏覽器重連改**指數退避＋永不放棄**。**Mac 結論（07-11 修訂）：淨做網站/備援機**——MindWave Mobile 2 喺近年 macOS 實測攞唔到數據，EEG demo 一律 Windows（`start_demo_mac.command` 留做起本地站用）。**⚠️ T2 blocker：Steven 手頭暫時冇 EEG 裝置同 Windows 機**——要盡早問學校/隊友借定，rehearsal 唔可以拖到比賽日先做。剩（要真頭帶）：斷線「凍結→順滑轉 fallback」＋ Results 標注斷線時長。
>   - **F1 審計 ✅ 報告已出**：見 [`docs/F1_AUDIT.md`](./F1_AUDIT.md)（已修/要 Steven 決定/可接受三類；secrets 掃描乾淨；RLS 核實 SQL 已附；DEMO_MODE 比賽日決定清單）。死 code 清理刻意留到賽後。
>
> **2026-07-10 額外修正（喺 main）**：① Homepage footer 死連結（隱私政策/服務條款/技術支援/聯絡我們，全部 `href="#"`）已移除，留返有真內容嘅版本俾 U1 做。② **Results 頁 refresh 唔再歸零**——一局完會存快照落 localStorage，refresh 後由快照還原真數據（附「一個 session 只計一次」保護，唔會重複入歷史/航海日誌）。
>
> **2026-07-10 第二輪（Steven 驗收回饋 + 打磨批次，全部喺 main）**：
> ③ Results 回饋修正：星星改「今次 ×N + 🏆單場最佳」（唔再誤導性五粒滿分）、黃金時刻卡自帶概念解釋、曲線加 X/Y 軸+格線、趨勢 bar 印數值、時長 chip 顯示真實 mm:ss、挑戰判語按分數分五級、下一個目標按「今場最弱一環」揀＋意義句按目標類型分池輪換（AI 生成 report 決定唔做，保持零外部依賴）。
> ④ **切換掣單一來源**：語言/深淺色只留 homepage；auth/setup/results 一律跟 homepage 設定。
> ⑤ 3D 打磨：船尾水痕重造（貼航向嘅連續 wash band，取代亂轉泡沫塊）、航道虛線降透明（0.75→0.5）、**船身跳動根因修復**（sin(t×freq) 變頻導致相位跳格 → 改累積相位＋參數調柔）、浮標加防撞圈/燈罩支架/呼吸光暈＋高段數幾何、海鷗加身體/鳥喙/側傾/滑翔起伏。
> ⑥ 遊戲內所有彈出提示（星星/航標/開場提示/加速/呼吸前置提示）搬去**螢幕底部**堆疊，唔再遮視線中央；呼吸引導 overlay 不變。
> ⑦ 入場穿崩修復（loader 同步不透明覆蓋 + 頁面初始隱藏態）＋ Loading 頁現代化（小艇+波浪+品牌+進度 shimmer）。
> ⑧ 文案 sweep（U1 主體）：詳見 §U1 狀態。
>
> **2026-07-11 第三輪（設定面板完成版 + IEYI 攤位計劃）**：
> ⑨ **遊戲設定面板修好＋擴充**：根因係面板唔喺 pointer-events 白名單（撳親都穿透落個海）——已修；加**音量滑桿（背景音樂/音效分開）**、**全螢幕切換**；**開設定＝經正規 pause 管線暫停**（計時/距離/呼吸全部凍結）。
> ⑩ **模組版本號全域 bump（06-24 → 07-11-1）**：六月起冇 bump 過，用戶瀏覽器食舊 cache 係「設定/AI 題目唔跟語言」嘅最可能根因（code 層面已核實：本地題庫雙語齊、Stroop 跟語言、/api/questions 有收 lang 並寫入 prompt）。以後**每次 push 前記得 bump `services/runtimeLoader.js` 嘅 MODULE_VERSION + 全檔 sed**。
> ⑪ **Mac 結論修訂**：MindWave Mobile 2（藍牙 Classic SPP）喺近年 macOS 實測攞唔到數據（Steven 經驗一致、NeuroSky 停更 macOS 支援）——**EEG demo 一律 Windows；Mac 做網站/備援機**。
> ⑫ **IEYI 官方攤位 PDF 已摘錄入手冊 Part 11**：07-28 11:00 setup、評審 28 下晝→29 中午、**攤位冇電源**（電量策略）、A0 海報必須（內容計劃已寫）、裝置清單已按官方 checklist 補齊。

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

## 1. 現狀 snapshot（截至 2026-07-11）

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
| D2 Gameplay 重新設計（航海旅程 × 心流充能，12 步） | 2026-07-07 |
| **D1 Results Dashboard 重新設計**（v0 → vanilla 實作，兩模式 + 深淺色） | commit `2419836c`（2026-07-10） |
| Results refresh 唔再歸零（localStorage 快照還原 + 一 session 只計一次） | commit `75591fcb`（2026-07-10） |
| Homepage footer 死連結移除（留返俾 U1 做真內容版） | commit `696b3203`（2026-07-10） |
| Results 驗收回饋輪＋3D 打磨＋提示落底＋Loading 重造＋文案 sweep | 2026-07-10 批次（overview ③—⑧） |
| P1 動態畫質＋遊戲設定面板（畫質/鏡頭/音量/全螢幕/暫停） | 2026-07-10/11（overview P1 + ⑨） |
| F1 審計報告 | `docs/F1_AUDIT.md`（2026-07-10） |
| 模組版本號 bump 制度化（cache 剋星） | 2026-07-11（overview ⑩） |

**未做 / 待做**：見 §5 —— 階段二（P1 P2 U1 E1 F1）、人手任務（EEG rehearsal、Vercel 驗證、換 key）。

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

### 🎨 階段一 — 重新設計（D2 已完成 2026-07-07 ✅）

> D2 gameplay 已按定案完成實作並全部 push 上 `main`（12 步、逐步 commit、每步 headless Simulation 實測）。
> 期間 Steven 有一輪中途修訂（2026-07-07），已全部併入下表。

#### D2 — Gameplay 定案：「航海旅程 × 心流充能」（已實裝）

**核心概念**：個海嘅天氣 = 你個腦嘅倒影（世界回饋）；穩住專注儲能量、儲滿摘星（可數成就）。「星」負責目標感同進步感，「天氣」負責靚、攤位吸引力、EEG 高光。

**最終設計決定**（Steven 2026-07-06 拍板 + 2026-07-07 修訂）：

| 決定 | 最終內容 |
|---|---|
| 航線 | **不規則無限彎曲航道**（修訂版）：多重不對稱正弦疊加、永不重複、無限延伸；水面發光虛線貼住真實彎位 |
| 航行物理 | **真實航向模型**（修訂版）：船有真實航向 + 慣性（加速有限、入彎側傾、加油抬頭）；**專注 = 舵嘅控制力**——專注先揸得返航道，分心會隨機漂向另一方向（±70m 軟牆，唔會走到無影）；分心嘅代價只係充能暫停，冇懲罰 |
| Checkpoint | **航標浮塔（beacon buoy）取代島嶼**（修訂版）：紅白浮標每 500m 座喺航道上，燈頭脈動、隨浪浮沉、海鷗盤旋；經過 → 港灣鐘聲 + 「⚓ 通過第 N 個航標」。大型島嶼留 P2 用靚模型做遠景先考慮 |
| Minimap | **真實局部海圖**：卡片顯示船周圍真實航道彎位 + 船嘅真實橫向位置（偏航喺圖上直接睇到）+ 視野內航標；挑戰模式縮做精簡行（⚓ 數 + 下一個航標距離） |
| 鏡頭 | **追尾鏡頭**（修訂版）：對準船身、部分跟隨航向令前方彎位可讀；距離按螢幕比例自動調整，16:9 / 4:3 / 手機橫屏都保持船約佔畫面 65% |
| 續航 | **4b 每場獨立 + 航海日誌**：累積總航程/總航標喺開場 cue、航線卡、Results 顯示；總航程由歷史距離加總（登入計雲端、訪客計本機），**冇改 session_history 結構** |
| 浪花 | **真實船尾水痕**（修訂版）：泡沫塊以世界座標留喺原地——船轉彎/漂航會留低真實彎曲水痕；浪花大細跟速度；密度跟 performance profile |
| 模式分工 | 訓練模式全套（星＋天氣＋航線＋航標）；挑戰模式答題做主軸，繼承天氣＋航線＋航標，**唔加星** |
| EEG 80/20 | 「黃金時刻」（專注+放鬆雙軸持續 4 秒 → 暖金黃昏視覺）係 **Real EEG 專屬**；Simulation 玩到其餘全套 |
| focusGates | 已移除（D2-0），角色由心流充能取代 |

**實作記錄**（全部 ✅，每步一個 commit 喺 `main`）：

| 步 | 內容 | 狀態 |
|---|---|---|
| **D2-0** | 定案入 plan + 拆走 focusGates | ✅ 07-06 |
| **D2-1** | 抗鋸齒：全裝置開硬件 MSAA（舊 gate 令所有機都冇 AA——鋸齒根因）；bloom 管線用多重採樣 target 兼慳走 SMAA；水面反射降一級補償 | ✅ 07-06 |
| **D2-2** | 心流充能引擎 + 能量環 HUD（穩住專注≈25 秒 = 1 粒星；分心只暫停唔倒扣） | ✅ 07-06 |
| **D2-3** | 摘星慶祝（滑行加速 + bloom 脈衝 + 金色橫額 + 輕柔 chime） | ✅ 07-06 |
| **D2-4** | 天氣共感（分心→起霧變濁天暗；復原→放晴；遲滯防閃爍） | ✅ 07-06 |
| **D2-5** | 呼吸介入 v2 撥霧（呼氣撥開霧、完成陽光爆返 + 20 秒充能 1.5×） | ✅ 07-06 |
| **D2-6** | 黃金時刻（EEG 雙軸專屬暖金視覺；goldenTimeMs 入數據；debug 掣可無頭帶示範） | ✅ 07-06 |
| **D2-7** | 航道 + checkpoint + 生態（07-07 修訂為不規則航道 + 航標浮塔 + 海鷗） | ✅ 07-07 |
| **D2-8** | 航海圖卡 minimap（07-07 修訂為真實局部海圖） | ✅ 07-07 |
| **D2-9** | 航海日誌（累積總航程；本機 counter + 雲端加總；Results 一行） | ✅ 07-06 |
| **D2-10R** | 真實航行物理 + 無限不規則航道 + 浮標 + 追尾鏡頭（Steven 修訂輪） | ✅ 07-07 |
| **D2-11** | 真實船尾水痕 + 挑戰模式排版配平 + 雙語掃尾 | ✅ 07-07 |
| **D2-12** | 總驗收（訓練+挑戰全流程 headless、黃金/撥霧/天氣迴歸、三種螢幕比例構圖）+ 文件更新 | ✅ 07-07 |

> **Steven 人手驗收指引**（本機）：`git pull origin main` → `node server.js` → Simulation 訓練模式玩一場（睇：航道彎位、能量環摘星、分心起霧+漂航、呼吸撥霧、經過航標、右下海圖、FPS meter 企穩）；再玩一場挑戰模式（題目照舊、無星環、左下精簡卡）。EEG 黃金時刻要頭帶或者 console 打 `EEG_APP.debug.setGolden(true)`。
> **DEMO_MODE debug 掣**（俾攤位/測試用，console）：`EEG_APP.debug.earnStar() / setGloom(0-1或null) / triggerBreathing() / setGolden(true/false/null) / teleport(米數)`。

#### D3 — 學習模式 Study Mode（2026-07-11 立項；老師實驗需求 → 第三個 Session 目標）

> **背景**：負責老師要求做對照實驗證明平台有效（手稿已文字化如下）。呢個模式係**新增第三選項**，訓練/挑戰模式一行 code 都唔郁（比賽 demo 保命符）。

**老師嘅實驗設計（文字化）**：
- 同一科（生物）兩級深度材料：材料一（淺）、材料二（深）。
- A 組紙本讀材料一 → 測驗；B 組**平台**讀材料一 → 測驗（AB 深度相約）；C/D 組用材料二重複（CD 深度相約）。
- 評估指標：**① 學生測驗成績**；**② 學生有提示（介入）後拉返專注嘅時間**（平台已量：avgRecoveryMs）。①②均正面 → it works；之後第二科重複。
- 規模：賽前完成，約 2–3 個學生（pilot 性質，答辯要誠實講 n 細）。

**卷設計決定（Claude 建議，待老師確認）**：AI 每次生成題目必然唔同（有隨機性），所以**實驗計分用「AI 同一標準預先生成 → 老師審核 → 鎖死」嘅固定卷**；紙本組同平台組**同材料同卷**（唯一變量=學習媒介）。「AI 即場由文章出題」保留做攤位 demo，唔計實驗分。

**產品流程**：Setup 揀「學習模式」→ 學科選擇（**生物可入＋化學/物理/歷史 🔒 Coming Soon**）→ 揀材料（淺/深）→ **閱讀階段**：sub-topic 分頁閱讀器，**每頁最多 3 分鐘**倒數（到時自動下一節；可撳「下一節」提早，實際用時入數據），背景=現有天空+海景 **無船無航道**，天氣共感保留（分心→起霧），呼吸介入照用，EEG/相機/模擬三路輸入照用 → **答題階段**：該材料嘅固定審核卷（MC，限時，量答題專注）→ **Study Results**。

**Study Results（溫習/答題數據斬開）**：
- 📖 溫習階段卡：總閱讀時長、每節用時、專注穩定度%、分心次數、介入次數、**介入後平均恢復時間**、閱讀專注曲線。
- ✍️ 答題階段卡：分數、每題用時、答題期間專注%、答錯回顧。
- 對比行：閱讀 vs 答題專注；**「匯出 CSV」掣**（每場一行：學生編號+兩階段全欄位；本地生成下載，唔經伺服器）。
- 學生識別：**編號式用戶名（S01/S02/S03）**，唔用真名/email（私隱）。

**實作拆步**（每步一 commit、逐步驗收；建置期以隱藏 flag 收起入口，做完先喺正式站開閘）：
| 步 | 內容 |
|---|---|
| D3-1 | Setup 第三選項 + 學科選擇 UI（1 科可用 + 3 鎖）+ state/route 底盤（隱藏 flag 後面） |
| D3-2 | 閱讀器：sub-topic 分頁 + 3min/頁倒數 + 提早下一節 + 海景無船背景 |
| D3-3 | 閱讀期間專注監測 + 介入重用 + 溫習階段數據記錄 |
| D3-4 | 答題階段：固定審核題庫（repo JSON per 材料）+（demo 用）AI 即場出題開關 |
| D3-5 | Study Results 兩階段版面 + CSV 匯出 |
| D3-6 | 雙語文案 + 開閘 + docs 更新 |

**依賴/待辦**：① 老師確認卷設計（同材料同卷）；② Steven 提供材料一/材料二（未有前用示範生物短文霸位）；③ 實驗日期定咗話聲（要留返 buffer 出 CSV 教學）。
**讓路**：P2 剩餘美化、隱私政策頁排 D3 之後。

#### D1 — Results Dashboard ✅ 已完成（2026-07-10）

**點做咗**：Steven 用 **v0** 出咗挑戰模式設計稿（React/Tailwind/recharts），Claude 唔搬框架，改為**照住個視覺用現有 vanilla JS + inline SVG 重畫**（保住「冇 build step、`node server.js` 就跑到、Vercel 靜態部署」嘅架構），訓練版用同一套設計 derive。兩版共用一套色系（teal + 金），深淺色都 cover，全部雙語、響應式。

**版面（由上到下）**：
1. **Hero 判語**：模式 chips（模式 / 難度或時長 / 訊號來源）+ 一句大字判語 + 專注率／正確率 subchips —— 做到「3 秒睇明今次點」。
2. **4 格指標**：專注穩定度（高亮）、平均恢復、呼吸救返；第 4 格挑戰係「距離 + 航標」、訓練係「訓練時長」。
3. **成就（訓練）**：心流星、航標、**黃金時刻（真 EEG 專屬，模擬會顯示鎖住）**、航海日誌累積；**答題回顧（挑戰）**：答對數 chip + 可展開嘅答錯卡（你的答案／正解／解釋，紅綠 teal 色標）。
4. **專注曲線**：area fill + 前半／後半對比 badge。
5. **跨局趨勢**：保留「分心恢復 vs 你最近平均」誠實 headline + 專注穩定度／恢復時間兩條 bar chart（最新一局高亮）。
6. **下一個目標**：一個具體目標 + 一句現實意義（例如「恢復快 = 溫書分咗心都追得返」）——令青少年見到進步之餘知道下一步。

**驗收（headless 已跑）**：訓練／挑戰 × 深／淺 × 雙語共 4 個情境全部零 JS 錯誤；答錯題文字 HTML-escape 防注入；home 照樣 boot。
**未做（可留 U1/之後）**：黃金時刻等豐富數據目前用本機 session 欄位；如要上雲端需按 §D1 原則同 Steven 傾 schema 先加。Steven 本機驗收指引：`node server.js` → Simulation 玩一局 → 完場睇 Results → 切語言／切深淺色 → refresh 確認唔歸零。

---

### 🛠️ 階段二 — 收尾打磨

#### P1 — 動態畫質 scaling ✅ 完成（2026-07-10；四級自動階梯 + 遊戲內設定面板〔畫質鎖定/自動 + 鏡頭距離〕；驗收方法照下面原文）

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

#### P2 — Web 加靚 / 現代化 / CSS 動畫 redesign ✅ Claude 部分完成（2026-07-10；頁面過渡 CSS 已加，餘項可選）

> **已做**（Claude，隨 Steven 回饋批次完成）：Loading 頁現代化＋入場穿崩修復；遊戲提示搬底部；船尾水痕重造＋航道虛線調透明；船身跳動修復＋物理調柔；浮標/海鷗精緻化；Results 頁已係全新 v0 設計。
> **剩低**（跟返原 prompt）：in-game 水面 sun glint / flow-state 一刻（bloom+曝光脈衝）；Home / Setup 嘅 CSS 過場動畫同 hover 微互動打磨（呢部分先係「TRAE 睇住 browser 調」嘅主場）。

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

#### U1 — 文案人性化 + 符合進度 + Homepage Footer 🟡 主體完成（2026-07-10）

> **已做**：全站文案 sweep 已完成並喺 main——Home 誠實化（裝置講法改「以 NeuroSky MindWave 為核心、相機/模擬保底、架構可擴展」；刪走假版本號/假 demo 片/「大數據」等過度宣稱；Alpha/Beta 改「設計框架」語氣；死嘅 AI report 掣改成真入口）、setup/auth 雙語人性化（**清走已移除嘅「書房場景」殘留描述**）、footer 死鏈已刪、Results 文案本身係新寫。
> **剩低**：① 隱私政策頁（雙語誠實版）＋「聯絡我們」真 mailto（要 Steven 提供 email）；② **Steven 逐句 review** 中英文（尤其 Home 全頁）先算收貨。

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

#### E1 — EEG 韌性 🟡 部分完成（重連指數退避＋永不放棄已入；協議已核實；Mac launcher 已加。凍結→fallback＋Results 斷線標注等 T2 真頭帶筆記先做）

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

#### F1 — 審計 ✅ 報告已出（2026-07-10，見 docs/F1_AUDIT.md；死 code 清理留賽後）

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

## 6. 時間表（2026-07-11 重排；比賽日程已由官方 PDF 確認：**07-28 setup、評審 07-28 下晝 → 07-29 中午**）

> Code 進度大幅超前原計劃（D1/P1/P2/F1 已完成、U1/E1 大部分完成）。剩低嘅關鍵路徑幾乎全部係**人手＋硬件**。

| 時段 | 做乜 |
|------|------|
| ✅ 已完成（07-06 → 07-11） | D2、D1、P1（連設定面板）、P2 Claude scope、U1 主體、E1 邏輯層、F1 報告——全部喺 main |
| **07-12 → 07-15** | 🔴 **借定 Windows 機＋攞返 EEG 裝置**（而家手頭兩樣都冇，係最大 blocker）；Steven 本機驗收 07-10/11 兩批改動；Vercel/DeepSeek 四步驗證；Supabase RLS 用 F1 條 SQL 核實 |
| **07-16 → 07-20** | **T2 實機 rehearsal ×5**（Windows＋MindWave，記斷線筆記）→ 筆記交 Claude 做 E1 收尾（斷線凍結→fallback＋Results 標注）；同步整 **A0 海報**（內容計劃見手冊 Part 11）＋ A4 傳單 |
| **07-21 → 07-24** | U1 收尾：隱私政策頁＋Steven 逐句 review 全站文案；（可選）P2 加碼位；海報送印 |
| **07-25 → 07-27** | **Code freeze（07-25）**——之後唔加新功能。完整 rehearsal ×2、跨裝置 QA、故障演練（EEG 斷→Simulation、無網→本地 fallback）、DEMO_MODE 開關拍板、所有裝置電量策略準備（攤位冇電源！見手冊 Part 11） |
| **07-27 晚** | 裝置全部叉滿、AAA 電池換新、海報＋物資裝箱（清單：手冊 Part 11） |
| **07-28 → 07-29** | 🏁 比賽：11:00 setup → 評審期輪更留守＋輪流去維修區充電 |

**時間唔夠就保呢啲**：T2 rehearsal（現場風險最大）＋ E1 收尾（要 T2 筆記）＋ A0 海報（官方必須）。隱私政策頁同 P2 加碼位可以犧牲。

---

## 7. 比賽日 checklist（P3 展開）

- [ ] 比賽機裝好：Chrome、bridge、電池 ×2、後備 MindWave（如有）
- [ ] 斷線急救卡（T2 產出）貼喺攤位
- [ ] 30 秒切 Simulation 台詞人人識背
- [ ] devtools Network 最後檢查：零 key 外露（F1 已驗）
- [ ] 離線 fallback 實測：拔網線照玩到
- [ ] Results 頁截圖印出嚟（評判追問「證據」時直接畀睇）
