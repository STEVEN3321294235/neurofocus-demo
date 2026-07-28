# NeuroFocus

用 **EEG 腦電專注度**（或相機 / 模擬）即時控制帆船嘅**神經回饋專注訓練平台原型**。IEYI 參賽作品。

專注 → 船加速；分心 → 船變慢、觸發呼吸介入；每次訓練都量化，仲可以跨 session 對比進步。

---

## 三份文件（全 repo 得呢三份 .md）

| 文件 | 用嚟做咩 |
|---|---|
| **[`docs/EXHIBITION_HANDBOOK.md`](docs/EXHIBITION_HANDBOOK.md)** | **現場唯一要開嘅文件**。🔴 攤位返到就睇 **Part 0 攤位急救卡**（60 秒 loop／收尾句／訪客分流）；其餘：產品、技術架構、玩法、講稿、評判 Q&A（L1–L4）、Windows／EEG 排障、攤位規格、Pilot 實驗紀錄。 |
| **[`docs/IEYI_PLAN_V2.md`](docs/IEYI_PLAN_V2.md)** | **專案計劃**：平台狀態、時間表、Day 1 檢討、檔案地圖、開發規矩、現場 debug 速查。 |
| **[`docs/STUDY_MATERIALS_PRINT.md`](docs/STUDY_MATERIALS_PRINT.md)** | **學習模式教材紙本版**（生物・雙語）：由 `scripts/gen_materials_md.mjs` 自動生成，同平台版逐字一致——pilot 實驗紙本組用嘅就係呢份。 |

---

## 快速上手

**本地行（唔使 EEG，用 Simulation 模式測試）**
```bash
node server.js          # 開 http://localhost:8000
```

**真 EEG（Windows 現場）**：見手冊 Part 8，或雙擊 `start_2a_demo_windows.bat`。

---

## 技術概覽

- **前端**：Vanilla JS ES Modules + hash router + import maps；Three.js 3D；Tailwind CDN + custom CSS。冇 build step。
- **訊號**：MindWave Mobile 2 → `eeg_bridge.py`（Python）→ WebSocket → 前端；或相機（MediaPipe）／內建模擬。
- **後端**：Supabase（真登入 + 跨 session 歷史）；Vercel serverless `/api/questions`（DeepSeek key 收埋喺 server）。
- **部署**：Vercel 靜態前端 + 本地 Python bridge。

架構細節見手冊 Part 3。
