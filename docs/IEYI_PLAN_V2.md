# NeuroFocus — 專案計劃（2026-07-25 重排・出發前定版）

> **全 repo 得呢一份 plan**，講「專案狀態同剩低要做咩」。
> 現場執行、講稿、Q&A、實驗操作 → 睇 **[`docs/EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md)**。
>
> **一句總覽**：平台**功能全部完成並凍結**（code freeze 2026-07-25）。海報已交、PPT 已完成、講稿已練。
> 剩低嘅全部係**人手工序**：機場拍片 → 酒店跑 pilot 實驗 → 酒店夾 present → 07-28/29 參展。

---

## 1. 平台狀態（截至 code freeze）

| 範疇 | 狀態 |
|---|---|
| **三個 Session 目標** | 訓練／挑戰／學習 全部完成，三個都實測過真 EEG 入到場 |
| **三層訊號輸入** | Real EEG（MindWave→Python bridge→WebSocket）／Webcam（MediaPipe，本機處理）／內建模擬曲線 |
| **閉環** | 偵測 → 視覺化（船）→ 呼吸介入（連提示音）→ 量化（Results） |
| **數據** | 單場報告＋跨場趨勢＋PDF／CSV 匯出；學習模式獨立本地 store |
| **後端** | Supabase 帳戶／歷史（RLS）＋ Vercel serverless AI 出題（key 只喺 server） |
| **離線** | three.js／MediaPipe／字型／Tailwind 全部自存 `/vendor`；實測封鎖晒外網仍然 8/8 通過 |
| **啟動** | Windows 只需 Python（`serve_local.py` 取代 Node）；`start_2a_demo_windows.bat` 一鍵起 bridge＋本機站 |
| **模組版本** | `2026-07-25-5` |

**已知限制（誠實記錄，答辯用得著）**
- 單通道消費級 EEG，只做訓練輸入同展示，唔係研究級量測。
- Pilot 樣本極細（n≈2–4），只報描述性數據。
- 介入手段目前只有 Box Breathing 一種。
- 相機模式量嘅係「注意力朝向」嘅代理指標，唔係腦活動。

---

## 2. 由而家到比賽完（唯一要跟嘅時間表）

| 時間 | 做乜 | 負責 |
|---|---|---|
| **出發日・機場** | 📹 **拍 S6 對比影片**（Simulation／**相機模式**，見手冊 6.5）→ 落機前／酒店剪好 | 全隊 |
| **抵京當晚（07-27）** | 🧪 **跑 pilot 實驗**（手冊 **Part 12**，2–4 位同學，≤90 分鐘）→ 出 CSV | Steven 主持 |
| **同晚** | 🎤 **夾 present**（英文 ≤3:00 計時 ×2、90–120 秒 core version ×1、分工確認） | 四人 |
| **同晚** | 裝置叉滿、AAA 換新、offline backup 播一次確認 | 全隊 |
| **07-28** | 12:00 前攤位就緒 → **評審 14:00–17:00** | 輪更留守 |
| **07-29** | **評審 09:00–12:00** → 交流 14:00–16:00 → **撤展 16:00–17:00** | 全隊 |
| **07-30** | 頒獎＋閉幕 09:00–11:00 | 全隊 |

**離港前最後檢查**（過咗就補唔到）
- [ ] **紙本材料印晒**（實驗要用，北京酒店印唔到）：Foundation 筆記、Advanced 筆記、兩份測驗卷**（唔可以有答案）**、答案紙、紀錄表 — 清單見手冊 Part 12
- [ ] USB 有：PPT、S6 影片、Results 截圖、流程圖（離線備份）
- [ ] 裝置：Windows／Mac／iPad／2×MindWave／新 AAA 一盒／PD 尿袋 ×2／拖板

---

## 3. 剩低嘅待辦（除咗上面時間表）

**要做**
1. 機場拍片（唯一仲未有嘅答辯素材）
2. 酒店 pilot 實驗（唯一仲未有嘅真數據）
3. 酒店夾 present

**可以放棄（時間不夠就斬，唔影響 demo）**
- E1 EEG 斷線收尾（凍結→fallback＋Results 標注）——Simulation 已經係保命符
- Supabase RLS 用 `docs/F1_AUDIT.md` 條 SQL 人手核實（安全事項，唔影響現場）
- 死 code 清理（~60 個無引用 i18n key、legacy `ROUTER`/`initApp`）——賽後做

---

## 4. 開發規矩（如果真係要改 code）

> ⚠️ **已 code freeze。** 除非現場出致命 bug，否則唔好改。

```bash
git fetch origin main        # 開工前
# 改嘢…
git add -A && git commit -m "講清楚改咗乜"
git push origin main         # 唔可以 force push
```

- 🔴 **改咗任何 JS/CSS/HTML** → 一定要 bump `services/runtimeLoader.js` 嘅 `MODULE_VERSION` 做當日日期版本，再 sed 全部檔案嘅 `?v=` 查詢字串。唔 bump ＝ 用戶食舊 cache，會出「改咗但睇唔到」嘅怪 bug。純 Python／純文件改動唔使。
- 🔴 **語法檢查要用 `.mjs`**：`node --check foo.js` 對 ES module 會當 CommonJS 解析，收唔到 `await` 之類嘅錯。正確做法：`cp foo.js /tmp/c.mjs && node --check /tmp/c.mjs`。
- 同一時間只可以一邊改嘢，尤其 `pages/game/runtime.js`（~7,900 行）。

---

## 5. 檔案地圖

| 檔案 | 負責 |
|---|---|
| `index.html` | 入口、import map（指 `/vendor`）、全域 DOM 容器 |
| `app/main.js` `router.js` `state.js` `i18n.js` | Bootstrap、hash router、全域狀態、中英文案 |
| `pages/game/runtime.js` | **核心引擎**：Three.js 場景、航行物理、心流摘星、天氣共感、題目、專注更新、呼吸介入、EEG bridge、Results、學習模式閱讀器 |
| `pages/game/voyage.js` | 無限彎曲航道、航標浮塔、航海圖 |
| `pages/game/studyMaterials.js` | 學習模式教材＋固定測驗卷（隊員編寫，可整份換走） |
| `services/focusInputService.js` | 相機專注偵測（MediaPipe，本機處理） |
| `services/storageService.js` | localStorage ＋ 跨場歷史 ＋ 學習模式獨立 store |
| `services/authService.js` `supabaseClient.js` | Supabase 登入（離線 fallback） |
| `services/runtimeLoader.js` | 版本號 query string（cache 剋星） |
| `api/questions.js` | Vercel serverless：DeepSeek 代理，key 只喺 server |
| `eeg_bridge.py` | 本機硬件橋：掃 COM port、解析 ThinkGear、WebSocket 廣播 |
| `serve_local.py` | 本機靜態站（免 Node，MIME 已釘死） |
| `vendor/**` | 自存第三方資源（three／MediaPipe／字型／Tailwind），出處見 `vendor/README.md` |
| `docs/STUDY_MATERIALS_PRINT.md` | 紙本教材（程式生成，同平台版逐字一致） |

---

## 6. 核心設計原則（歷史記錄）

1. **平台 100% 目標 = 改善專注力**，唔係普通遊戲。
2. **EEG 係體驗靈魂**（真神經回饋閉環＝wow factor），設計投放向佢傾斜。
3. **Simulation 係保命符**：現場任何時候唔穩就切，兩者唔矛盾。
4. **誠實框架**：對外永遠分清「已做到」同「仲要證實」。

---

## 附錄 A — 開發歷程（濃縮）

> 由 2026-06-23 第一個 commit 到 07-25 code freeze，約五星期。`runtime.js` 由 3,961 行長到 ~7,900 行。
> 逐輪詳細記錄已濃縮成下表；實作細節睇 git log。

| 期間 | 做咗乜 |
|---|---|
| **06-23 → 07-05** | 由「EEG Focus Game」起步：後端接通（Supabase auth、跨場歷史）、DeepSeek key 收埋落 server、EEG 雙軸心流、字體統一、書房場景移除、repo 清潔 |
| **07-06 → 07-07** | **D2 Gameplay 重造**：航海旅程 × 心流充能（無限彎曲航道、航標浮塔、天氣共感、摘星、呼吸撥霧、黃金時刻、真實航行物理、船尾水痕） |
| **07-10** | **D1 Results Dashboard 重造**（v0 設計 → vanilla 實作，訓練／挑戰兩版＋深淺色）；refresh 唔再歸零；footer 死鏈清理；**F1 安全審計** |
| **07-10 → 07-11** | **P1 動態畫質**（FPS 驅動 L0–L3）＋遊戲內設定面板；**P2 視覺打磨**；**U1 文案 sweep**；模組版本制度化；「無法進入遊戲」修復（25 秒啟動看門狗） |
| **07-16** | **D3 學習模式**全套（閱讀器＋固定測驗卷＋兩階段 Results＋CSV 匯出＋教材數碼化），一日完成 |
| **07-17 → 07-18** | 老師回饋 → **答辯策略轉向**（PPT 主導、零現場操作、預錄影片）；閱讀器打磨；FPS 急救；Setup 數據管理選單；專注提示音；A0 海報對齊隊員 template |
| **07-18 → 07-20** | Study 跨場趨勢；PPT 三審；References 整合；poster 全英文落版＋架構圖；教材 provenance 統一成「隊員編寫」 |
| **07-20** | 官方 delegation PDF 對照：北京五日程、英文 ≤3 分鐘硬限、40-30-30 評分、data card、海報死線；PPT／海報截圖出齊 |
| **07-25（freeze 日）** | **離線化**（vendor 三大依賴，捉到 Tailwind CDN 失敗會令全站崩嘅 bug）；DEMO_MODE 收口；免 Node 啟動；**真頭帶首次跑通**，同場修好四個 EEG bug（訊號極性讀反、訊號差照計時、門檻用錯尺、eSense 0 當零分）＋一個自製 regression＋bridge 發送迴圈崩潰；HUD 標籤／短螢幕適配；Q&A 重寫成三層 |

---

## 附錄 B — 現場 debug 速查

| 症狀 | 極可能原因 | 點做 |
|---|---|---|
| Bridge 配對到但攞唔到數據 | 揀錯 COM port（Windows 會開 outgoing＋incoming 兩個） | 睇 bridge 視窗，佢會自己認出並鎖定；仲唔得就 `start_eeg_bridge_windows.bat COM5` |
| COM 開唔到，錯 121／233 | 頭帶冇應機（唔係 port 錯） | 先開 bridge，**再**扭開頭帶；重複 power-cycle 頭帶 2–3 次 |
| 訊號 100% 但 attention 一直 0 | **耳夾冇夾實耳垂**（最常見）／要等 10–30 秒建立基線 | 夾實耳垂皮膚，靜坐等 |
| 計時凍結、船唔郁 | 設計如此：訊號唔可用就暫停 | 睇 HUD 提示調整感測器；返到可用會自動繼續 |
| 遊戲頁入唔到 | 舊 cache | `Ctrl+Shift+R` 硬重新整理 |
| 首頁排版散晒 | Tailwind CDN 唔通（已有本地墊底，唔應該再發生） | 用本機版本 `localhost:8000` |
| Bridge 玩完一場就唔再送數據 | 已修（發送迴圈崩潰）——如果再現，重開 bridge 即可 | `start_eeg_bridge_windows.bat` |
