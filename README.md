# NeuroFocus

用 **EEG 腦電專注度**（或相機 / 模擬）即時控制帆船嘅**神經回饋專注訓練平台原型**。IEYI 參賽作品。

專注 → 船加速；分心 → 船變慢、觸發呼吸介入；每次訓練都量化，仲可以跨 session 對比進步。

---

## 兩份核心文件（睇呢兩份就夠）

| 文件 | 用嚟做咩 |
|---|---|
| **[`docs/EXHIBITION_HANDBOOK.md`](docs/EXHIBITION_HANDBOOK.md)** | **展覽 + 答辯總手冊**：產品、技術架構、玩法、現場執行、台上台詞、評判 Q&A、Windows 部署、競爭力分析。展覽當日開嚟用。 |
| **[`docs/IEYI_PLAN_V2.md`](docs/IEYI_PLAN_V2.md)** | **開發計劃**：目前進度、待辦、可直接貼落 TRAE 嘅 prompt、Vercel/DeepSeek 驗證步驟。 |
| **[`docs/STUDY_MATERIALS_PRINT.md`](docs/STUDY_MATERIALS_PRINT.md)** | **學習模式教材紙本版**（生物・雙語）：由 `scripts/gen_materials_md.mjs` 自動生成，同平台版逐字一致，實驗紙本組直接打印。 |

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
