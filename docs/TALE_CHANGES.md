# TALE 2026：改咗咩、點測試、仲有咩未做

> 任務原文：[`docs/tale/NeuroFocus_TALE_Prompt.md`](tale/NeuroFocus_TALE_Prompt.md)　計劃書：[`docs/tale/NeuroFocus_Lab.pdf`](tale/NeuroFocus_Lab.pdf)
> Branch：`tale-2026`（`main` 未郁，確認冇問題先合併）

---

## 1. 改咗咩

### 1.1 核心邏輯（md 第 1 至 3 節）

| 項目 | 做法 | 檔案 |
|---|---|---|
| 完整測試 | 檢查訊號（連續 5 秒良好）→ 練習 20 秒 → 靜坐 30 秒 → 第一次測試 90 秒 → 自評 → 轉換 30 秒（倒數完先可以撳「繼續」）→ 第二次測試 90 秒 → 自評 → 「你的答案」 | `pages/lab/labController.js` |
| 快速體驗 | 唔使登入、乜都唔儲存；20 秒答題 + 20 秒望手機；兩色即時專注線；結果卡（後段跌 ≥10 分先算「跌咗」） | 同上 |
| 次序 | 隨機，但每部機每 4 次測試一組、組內 2:2（純隨機 4 人有 62.5% 機會唔平衡）；每種量度方法各自一條隊，排練唔會用走真測試嘅次序；測試完成先「用」個次序 | `pages/lab/labAnalysis.js`、`labStore.js` |
| 題目 | 固定 seed 生成 120 題：4 色、一致／唔一致各半、每 24 題一組各自平衡、唔會連續重複；兩次都由第 1 題開始；練習用另一個 seed | `pages/lab/stroopBank.js` |
| 作答 | 4 個大掣或者 D/F/J/K（用 `event.code`，中文輸入法開住都得）；每題最多 **2 秒**，超時當錯；答完 0.15 秒出下一題 | `labController.js` |
| 呼吸提示 | 實驗模式全程關閉；訓練模式照舊 | `runtime.js`（加開關） |
| 0x83 頻段 | bridge 讀 8 個頻段（3 bytes、big-endian），websocket 訊息加 `bands`；舊欄位不變 | `eeg_bridge.py` |
| 自家指標 | 每秒 `(lowBeta+highBeta)/(theta+lowAlpha+highAlpha)`；只計訊號 ≥70 嘅秒數；一段少過 60 秒良好訊號 →「呢次腦電波訊號唔夠穩定，腦電波結果唔計」 | `labAnalysis.js` |
| 結果頁 | 問題 → 一句結論 → 細字 → 三行比較（藍＝手機喺枱面、金＝手機唔喺度）→ 三樣是否一致 → 三張科研圖 → 3 個 CSV → 以前嘅測試 | `pages/lab/results.js`、`charts.js` |
| CSV | 總結檔（呢個帳戶每次測試一行）、逐秒檔、逐題檔；檔名只用用戶名；唔係頭帶嘅測試檔名加 `_DEMO` / `_CAMERA` | `pages/lab/labCsv.js` |

### 1.2 字句（md 第 4 節）
- `app/i18n.js` 重寫：兩種語言 key 完全對應，用淺白字句，術語跟 md 對照表。
- `runtime.js` 只改字：佢自己嘅字典同 212 對 `langText`；頭帶連接程式嘅英文狀態訊息，而家會轉做頁面語言。
- 各頁寫死嘅字搬入字典。`scripts/check_i18n.mjs` 會擋住任何中英夾雜同漏翻譯。
- 唯一刻意並排兩種語言嘅位：語言切換掣（「中文」「EN」），等唔識現時語言嘅人都搵到出口。

### 1.3 外觀（md 第 5 節，之後按團隊決定改咗方向）
md 原本要「實驗筆記簿」（紙色、方格、冇玻璃）。做完之後團隊揀咗另一個方向（方案 A + 參考 dala.craftedbygc.com 嘅捲動動畫），所以最後版本係：
- **深色（預設）＋淺色主題**，半透明玻璃卡片、1px 淺色邊框、慢慢飄嘅光暈；冇方格。
- **首頁 3D 三角形場景**（`pages/home/brainScene.js`）：大約 2,600 粒三角形（手機同 Windows 1,400 粒）砌成一個腦，捲落去會逐個散開再重組成腦電波 → 手機 → 兩條柱（藍／金）→ 頭帶 → 球體，每個 section 一個。全部喺 GPU shader 計，離開畫面或者分頁唔見就停；用自存嘅 three.js，封網都行。
- **動畫**（跟參考網站）：標題逐個字由遮罩向上滑入、區塊捲到先浮現、按鈕 hover 文字向上翻、第一次入首頁 0→100 載入計數、結果長條由零生長、數字由零跳上去、圖表線條畫出嚟。全部只用 transform／opacity（圖表畫線用 stroke-dashoffset），「減少動態效果」會全部關閉。
- **字型**：中英文都用襯線體：Noto Serif TC（500/700）＋ Source Serif 4，數字用 IBM Plex Mono；全部自存喺 `vendor/fonts`。中文字型按字分成細片，頁面只會下載用到嘅字。
- **兩隻情況顏色**用 dataviz 驗證工具喺深淺兩個主題都跑過色盲同對比檢查，全部通過：深色 `#5B87F5` / `#BF8826`，淺色 `#2F5BD3` / `#B87A10`。
- **blur**：只喺非 Windows 機嘅普通頁面用；Windows 同 3D 測試畫面上一律唔用（手冊 Part 8：Windows 整合顯卡會跌 FPS）。
- 首頁「86%」同「SIGNAL STABLE: 12ms」已刪除。

---

## 2. 同 md 唔同嘅地方（同原因）

| md 寫 | 而家 | 原因 |
|---|---|---|
| 每題最多 3 秒 | 2 秒 | 團隊要求唔好太易；正常作答大約 0.6 至 1 秒，2 秒只會影響真係分咗心嘅時候 |
| 「答啱多咗 X 題」 | 以兩次都做到嘅題數計 | 答得快嘅一次會做多啲題，直接相減有時同答對率長條方向相反 |
| 開 `tale-2026` | 照做，冇改 `main` | — |
| 唔准輸入真名，用 P 編號 | 用登入用戶名，註冊頁提示「用暱稱，唔好用真名」 | 團隊決定；CSV 同結果頁唔會出現電郵 |
| 完整測試／快速體驗 | 完整測試要登入，快速體驗唔使 | 團隊決定 |
| 外觀：筆記簿、冇玻璃、只准 4 種動畫 | 見 1.3 | 團隊睇完筆記簿版本後改咗方向 |

---

## 3. 點測試

全部喺 repo 根目錄行。先開本機站：`python3 serve_local.py`（唔好用 `node server.js`，見 README）。

| 指令 | 測咩 |
|---|---|
| `python3 tests/test_eeg_bridge_bands.py` | 0x83 解析（10 項，用假 bytes） |
| `node scripts/test_lab.mjs` | 題庫、結論規則、次序、CSV（28 項） |
| `node scripts/check_i18n.mjs` | 中英夾雜、漏翻譯 |
| `node scripts/e2e_tale.mjs quick-demo` | 快速體驗（示範模式） |
| `node scripts/e2e_tale.mjs full-demo [--runs=10] [--real-time]` | 完整測試（示範模式）；`--runs=10` 列出 10 次次序 |
| `NF_FAKE_VIDEO=<face.y4m> node scripts/e2e_tale.mjs quick-camera` / `full-camera` | 相機模式（要一段有人面嘅 Y4M 影片，否則假鏡頭冇人面） |
| `node scripts/e2e_tale.mjs full-eeg` | 腦電波頭帶（要先開 `tests/fake_headset.py` 同 `eeg_bridge.py`） |
| `node scripts/e2e_tale.mjs old-modes` | 訓練、挑戰、學習三個舊模式 |
| `NF_BASE=<舊版網址> node scripts/e2e_tale.mjs old-frontend` | 舊版前端 + 新 bridge |
| `node scripts/e2e_tale.mjs offline` | 封網（所有非本機請求都擋） |
| `node scripts/e2e_tale.mjs language-scan --lang=hk\|en` | 逐個畫面讀字，搵中英夾雜 |
| `node scripts/e2e_tale.mjs screenshots`、`node scripts/page_shots.cjs <資料夾>`、`node scripts/scene_shots.cjs <資料夾>` | 1440px／390px 截圖、首頁每個捲動位置 |

**冇頭帶測試 bridge**：`python3 tests/fake_headset.py`（會印出一個 port，例如 `/dev/pts/3`）→ 另一個視窗 `python3 eeg_bridge.py /dev/pts/3`。`--pattern patchy` 會令一半時間訊號弱，用嚟測「腦電波結果唔計」。⚠️ 只限測試，收真數據嗰陣唔好開。

**排練加速**：網址加 `?labfast=1`，每段時間變十分之一；用頭帶嗰陣唔會生效，所以真測試唔會被誤縮短。

---

## 4. 測試結果

（見第 6 節回報；呢度記錄每項嘅證據。）

| # | md 第 6 節項目 | 結果 | 證據 |
|---|---|---|---|
| 1 | 示範模式：完整測試由頭行到尾冇出錯 | ✅ | 排練速度行 10 次 + 真實時間行 1 次（全程 312 秒，兩段各 90 秒逐秒紀錄），冇頁面錯誤 |
| 2 | 示範模式：快速體驗由頭行到尾冇出錯 | ✅ | 去到結果卡；全程角落有「示範模式：唔會記錄做實驗數據」；本機冇儲存任何紀錄 |
| 3 | 相機模式：完整測試同快速體驗都行到 | ✅ | 用一段有真人面孔嘅影片做假鏡頭（相片來自 npm 套件 `@vladmandic/face-api` 嘅示範圖，只喺測試機用，冇放入 repo）；訊號檢查認到人面；結果頁顯示「排練」提示；CSV 檔名有 `_CAMERA`。真人鏡頭仍建議喺手提電腦試一次 |
| 4 | 次序真係隨機（10 次）；兩次題目一樣；冇呼吸提示 | ✅ | 10 次次序：先喺枱面、先唔喺度、先唔喺度、先喺枱面 ｜ 先唔喺度、先喺枱面、先唔喺度、先喺枱面 ｜ 先唔喺度、先喺枱面 → 每組 4 次都係 2:2，合共 5:5。每次兩段都由第 1 題開始、題目次序完全一樣；10 次都冇出過呼吸提示 |
| 5 | 0x83 解析測試通過；舊版前端收到新 bridge 訊息唔會出錯 | ✅ | `tests/test_eeg_bridge_bands.py` 10/10。真 bridge + 假頭帶（偽序列埠）送出 8 個頻段。`main` 版前端連新 bridge：訊號 chip 顯示「訊號良好 100%」、訓練模式正常開始、冇錯誤。註：測試機用軟件畫 3D，舊版載入要約 23 秒，貼近佢自己 25 秒嘅載入時限，有兩次因此超時；同 bridge 無關 |
| 6 | 訊號唔夠時，結果頁顯示「腦電波結果唔計」 | ✅ | 假頭帶一半時間訊號弱：兩段良好秒數 43 同 48（<60）→ 顯示「呢次腦電波訊號唔夠穩定，腦電波結果唔計」，「三樣」改為「只比較其餘兩樣」；答題同自評照樣顯示 |
| 7 | 三個 CSV 匯出到、欄位正確、冇真名 | ✅ | 總結檔、逐秒檔（秒數、階段、情況、專注分數、訊號、8 頻段、自家指標）、逐題檔；`scripts/test_lab.mjs` 逐欄驗證。檔名只用用戶名（所以要提醒參加者用暱稱） |
| 8 | 訓練、挑戰、學習三個舊模式照常運作 | ✅ | 訓練 30 秒行到結果頁並寫入歷史；挑戰答 10 題行到結果頁；學習模式打開教材第 1/5 頁；實驗模式冇寫入佢哋嘅歷史 |
| 9 | 中英切換後冇中英夾雜、冇漏翻譯 | ✅ | `check_i18n.mjs` 通過；瀏覽器逐個畫面讀字：中文 45 個畫面、英文 45 個畫面，錯語言字句 0 |
| 10 | 全站搵唔到「86%」同「SIGNAL STABLE」 | ✅ | `grep` 全站（唔計文件同 vendor）0 個 |
| 11 | 首頁、Setup、結果頁 1440px 同 390px 正常 | ✅ | 冇橫向捲軸；截圖喺 `docs/tale/screenshots/` |
| 12 | 封網之後網站仍然開到 | ✅ | 擋住所有非本機請求：首頁、快速體驗、襯線字型全部正常；只有 Tailwind CDN 同 Supabase 被擋（預期） |
| 13 | `services/` 冇改；列出 `runtime.js` 同 `eeg_bridge.py` 改咗邊幾行 | ✅ | 見第 6 節 |
| 14 | 寫 `docs/TALE_CHANGES.md` | ✅ | 就係呢份 |

---

## 5. 仲有咩未做到／要留意

- **真頭帶未試過**：所有頭帶測試都係用假頭帶（偽序列埠）經真 bridge 做。試行前請喺 Windows 手提電腦用真 MindWave 行一次完整測試。
- **真人鏡頭未試過**：相機模式用咗一張靜態相片做假鏡頭，證明流程行得通；「望開手機時專注線會跌」要真人先試到。
- **舊版前端載入時限**：舊版遊戲有 25 秒載入時限；喺測試機（軟件 3D）好接近。真機有顯示卡，唔會有呢個問題。
- **`node server.js` 用唔到**：佢冇設定 `.mjs`，首頁會成頁白（`main` 已經係咁）。`server.js` 唔准改，所以一律用 `python3 serve_local.py`；README 已寫明。
- **網站版本號**：冇改 `services/runtimeLoader.js` 嘅 `MODULE_VERSION`（`services/` 唔准改）。本機站已設定唔 cache，所以冇影響；部署去 Vercel 後，舊訪客可能要 `Ctrl+Shift+R` 先見到新版。
- **用戶名可能係真名**：系統只能提示用暱稱，冇辦法擋。試行前同參加者講清楚。
- **Supabase 電郵確認**：如果開咗確認，參加者註冊後要先去電郵撳連結。建議試行前一日註冊好。
- **自家指標**：每秒比率可以因為分母細而好大；CSV 同時記錄平均值同中位數，分析時可以兩個都睇。
- **未合併入 `main`**：喺 `tale-2026`，確認冇問題先合併。

---

## 6. `runtime.js` 同 `eeg_bridge.py` 改咗邊幾行

**`eeg_bridge.py`**：+40 行，0 行刪除，全部係新增：
- 第 44–57 行：`EEG_BAND_NAMES`、`EEG_POWER_LENGTH` 常數
- 第 71–73 行：`self.bands = None`
- 第 207–209 行：`emit_sense` 加 `"bands"` 欄位
- 第 217 行：`reset_state` 清 `bands`
- 第 440 行、459–473 行、481–483 行：`parse_payload` 讀 0x83
- 連線、換 port、送訊息嘅程式一行都冇郁。

**`pages/game/runtime.js`**：分兩類。
- **邏輯（只加實驗用開關）**，現時行號：64–65（存頻段）、325（`runtimeActiveHandler`）、365（`isLabMode`）、1909（實驗冇航標鐘聲）、2512（實驗冇呼吸提示）、3350–3372（實驗唔寫入歷史、唔出新手提示）、3638–3642（實驗冇背景音樂、倒數完交俾實驗流程）、5095–5112（實驗收起分數等 HUD）、7118–7119（websocket 收到 `bands` 時存低）、7605–7615（接受 `lab`／`quick` 模式）、7641 起（`getLabSample`，只讀）、7981（export）。EEG 連線、訊號判斷、ready gate、計時、CSV 匯出嘅邏輯冇改。
- **字句（只改文字，唔改行為）**：內置字典同 212 對 `langText`；`compactStatusMessage` 將頭帶狀態訊息轉做頁面語言；HUD 用內置曲線時寫「示範模式」。

**唔准改嘅檔案**：`git diff main --stat -- services api server.js serve_local.py '*.bat' '*.command'` 結果係空，即係冇改。
