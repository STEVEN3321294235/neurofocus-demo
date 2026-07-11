# F1 審計報告（2026-07-10，Claude 掃全 repo）

> 分三類：**已修** / **要 Steven 決定** / **已知風險（可接受）**。
> 原則：只改明確安全嘅嘢；有風險或要判斷嘅唔擅自拆。

## ✅ 已修（今次批次內）

| 項 | 內容 |
|---|---|
| EEG 重連斷尾 | 重連由「固定 1.8 秒 × 12 次就放棄」改為指數退避（1→2→4→8 秒，上限 10 秒）**永不放棄**，攤位重啟 bridge 會自動接返 |
| 文案殘留 | setup 嘅「voxel 書房」描述（場景早已移除）、「支援 Muse/Emotiv」、假「v4.0」、假 demo 片按鈕等已全部清走（見 U1） |
| Footer 死鏈 | 四個 `href="#"` 死掣已移除 |
| 入場穿崩 | loader 同步覆蓋，冇 raw frame 外洩 |

## 🟡 要 Steven 決定

1. **`DEMO_MODE = true`**（`pages/game/runtime.js:20`）：而家開住，效果係 (a) FPS meter＋畫質 L 徽章可見、(b) console 有 `EEG_APP.debug.*` 掣（earnStar / setGolden / setGloom / triggerBreathing / teleport）、(c) EEG 原始數值 debug overlay。**比賽日建議**：攤位機開住（方便示範黃金時刻＋睇 FPS），公開網址如果唔想俾人撳出星星，可以改 false 再 deploy——你揀。
2. **Supabase RLS 核實**（我喺呢度冇你 Supabase 後台權限，驗唔到）：anon key（`sb_publishable_…`）出現喺 client 係**設計如此**（publishable key），真正安全防線係 RLS。請你入 Supabase → SQL Editor 行：
   ```sql
   select tablename, policyname, cmd from pg_policies where tablename = 'session_history';
   ```
   應該見到 select/insert 都有「`auth.uid() = user_id`」之類嘅 policy。**如果一條 policy 都冇**，即任何人攞住 anon key 可以讀寫全表——要即刻補（`docs/supabase_schema.sql` 應有範本）。
3. **舊 DeepSeek key 喺 git 歷史**：你已表示 repo private 唔處理——維持現狀；**如果將來轉 public 先要 revoke**。
4. **`run_eeg_game.sh`**（舊 Mac 啟動腳本，依賴 `.venv`）：已被新 `start_demo_mac.command` 取代，建議刪除但你話事。

## 🟢 已知風險（可接受 / 有後備）

| 風險 | 現狀 | 後備 |
|---|---|---|
| CDN 依賴（會場網差就出事） | three.js（unpkg）、MediaPipe＋Supabase（jsdelivr）、Tailwind CDN、Google Fonts 全部外連 | 遊戲頁必需 three.js——**攤位主 demo 行本地 `node server.js` 但 CDN 照外連**，所以會場要有熱點後備（手冊 Part 5 已列）；題目有本地題庫、Supabase 有離線 fallback、相機掛咗有模擬 fallback |
| 死 code（唔影響行為，量少） | runtime 內部 legacy `ROUTER`/`initApp`（0 個外部引用）、注釋咗嘅 `animate()`、i18n `home_*` keys（0 引用）、舊 `.spinner` CSS、clay-liquid 幾個過時 selector | 賽前唔郁（改 6000 行大檔冇必要風險）；賽後清 |
| 單通道 EEG 語義限制 | attention/meditation 係消費級指標 | 文案已用「設計框架」誠實講法（U1 完成） |
| `#` 錨點連結 | Home nav 嘅 #features/#science 係頁內錨點，正常 | 無需處理 |

## 安全掃描結果（乾淨）

- ✅ 零 client-side secrets（DeepSeek key 只喺 `process.env`，`runtimeLoader.js` 仲會清走瀏覽器殘留嘅舊 key）
- ✅ 零 hardcoded 私人 email
- ✅ 相機影像永不上傳（`focusInputService` 本地 MediaPipe，setup 文案有講明）
- ✅ Results 答題文字有 HTML escape（防 AI 題注入）
