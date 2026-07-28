# NeuroFocus — 專案計劃（2026-07-28 重排・Day 1 評審後）

> **全 repo 得呢一份 plan**，講「專案狀態同剩低要做咩」。
> 現場執行、講稿、Q&A → 睇 **[`docs/EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md)**。
>
> **一句總覽**：平台完成並凍結、海報已交、PPT 已完成、S6 影片已剪、**pilot 實驗 07-27 已跑完（n=4）**、**Day 1 評審（07-28 下午）已完成**。
> 剩低得一件事：**Day 2 評審 07-29 09:00–12:00**，重點係修正攤位打法 → **手冊 Part 0**。

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

| 時間 | 做乜 | 狀態 |
|---|---|---|
| 出發日・機場 | 📹 拍 S6 對比影片（相機模式）→ 剪好 | ✅ 完成 |
| 07-27 當晚 | 🧪 pilot 實驗 n=4（手冊 Part 12）→ 出 CSV | ✅ 完成 |
| 07-27 當晚 | 🎤 夾 present（英文 ≤3:00、core version、分工） | ✅ 完成 |
| **07-28 下午** | **Day 1 評審 14:00–17:00** | ✅ 完成 → 檢討見下面第 3 節 |
| **07-29 上午** | 🔴 **Day 2 評審 09:00–12:00** ← 剩低嘅唯一一場 | ⬜ **今晚要準備** |
| 07-29 下午 | 交流 14:00–16:00 → 撤展 16:00–17:00 | ⬜ |
| 07-30 | 頒獎＋閉幕 09:00–11:00 | ⬜ |

**今晚（07-28 夜）要做嘅三件事**
- [ ] 三個人**逐隻字**背熟手冊 **Part 0.4 開場句** 同 **Part 0.5 收尾句**（唔背熟，聽日又會變回講座）
- [ ] 對住鏡／互相練 **Part 0.3 個 60 秒 loop** 三次，計時
- [ ] 攤位企位按 **Part 0.8** 重新分配（講解／硬件／招手），確認邊個做邊個

---

## 3. Day 1 檢討（07-28）→ Day 2 要改咩

**隊員回饋**
1. 部分街客**一頭霧水**，唔知睇緊咩。
2. 部分街客覺得**「呢個只係一個 idea」**。
3. **每個客花太多時間**，做到有時要特登避開街客。

**診斷**：三樣都係同一個病因 —— 攤位用緊台上答辯嘅次序（先講問題 → 再解釋 → 最後示範）。街客只肯畀 10 秒，聽到嘅只有「講緊嘢」，所以覺得係 idea；而因為冇收尾句，一開口就甩唔到身，於是要避人。

**答辯線檢討（同日兩輪）**
- 第一輪：跟稿＋隨機應變，時間啱好；但太緊張，**播片嗰段拖慢晒**；Q&A 被問 **evidence** 同 **「學生會唔會反而沉迷」**；有一位評判明顯冇睇好。
- 第二輪：好轉好多；主理評判對 project 明顯有興趣、有幫手。
- 應對已寫入手冊 **Part 7 L0**（四條：evidence 三層答法／防沉迷三個設計決定／唔 buy 嘅評判點收科／播片緊張點自救）。**Day 2 開場前三人過一次 L0。**

**已寫入手冊 Part 0（Day 2 照做）**
- **倒轉次序**：先郁後講，10 秒內叫佢自己望開電話、睇住隻船慢低。
- **訪客分流**：路過 10 秒／有興趣 60 秒／評判 3 分鐘，唔係個個都服務到底。
- **一句收尾句＋後退半步**遞 QR，令每個客 60 秒完得成。
- **「只係 idea」三步破解**：自己試 → 開 Results 真數據 → 講 n=4 pilot（連「太細」一齊講）。
- **待機畫面要行緊**，唔好停喺選單。

**賽後先做（唔影響現場）**
- Supabase RLS 人手核實（見第 6 節）
- 死 code 清理（~60 個無引用 i18n key、legacy `ROUTER`/`initApp`）

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

---

## 附錄 C — 賽後要核實嘅安全事項（原 `F1_AUDIT.md`，該檔已刪）

Supabase 嘅 anon key 出現喺 client 係**設計如此**（publishable key），真正防線係 RLS。入 Supabase → SQL Editor 行：

```sql
select tablename, policyname, cmd from pg_policies where tablename = 'session_history';
```

應該見到 select／insert 都有 `auth.uid() = user_id` 之類嘅 policy。**一條都冇 = 任何人攞住 anon key 可以讀寫全表**，要即刻補（範本喺 `docs/supabase_schema.sql`）。

另外：舊 DeepSeek key 仲喺 git 歷史入面。repo 保持 private 就冇事，**將來一旦轉 public 就要先 revoke**。
