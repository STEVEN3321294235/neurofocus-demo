# 書房 3D 家具 asset（放呢度）

呢個資料夾係 voxel 書房訓練環境嘅 **3D 家具模型**。放咗 `.glb` 入去，書房會自動用返啲模型；冇放 / 載入失敗，書房會自動用返原本嘅 procedural（BoxGeometry 砌）家具——**唔會白屏、唔會壞 demo**。

## 你要做咩（一次過）

1. 去 **https://kenney.nl/assets/furniture-kit** → 撳 **Download**（免費 CC0，可能要你填 $0）
2. 解壓，入面搵 **`Models/GLB format/`** 資料夾（用 `.glb` 版最方便，單檔就搞掂）
3. 揀以下家具，**原檔名**放入呢個 `assets/models/` 資料夾：

| 用途 | 建議檔名（Kenney 原名） | 需要程度 |
|------|------------------------|----------|
| 書架 | `bookcaseClosed.glb` 或 `bookcaseOpen.glb` | 建議（書房主角） |
| 書桌 | `desk.glb`（或 `deskCorner.glb`） | 建議 |
| 椅 | `chair.glb`（或 `chairDesk.glb`） | 建議 |
| 座地燈 | `lampRoundFloor.glb` 或 `lampSquareFloor.glb` | 可選 |
| 地毯 | `rugRounded.glb` / `rugRectangle.glb` | 可選 |
| 植物 | `plantSmall.glb` | 可選 |
| 書（散書用） | `books.glb` / `bookcaseBooks.glb`（有先放） | 可選 |

4. **保持 Kenney 原本檔名**（下面個 manifest 就係認呢啲名）
5. `git add assets/models && git commit -m "add study furniture assets" && git push`
6. 話我知你**實際放咗邊幾個檔名** —— 我會即刻調 manifest 嘅擺位/大細，同埋加「整理圖書館」玩法

## 幾件事要知

- **總大小**：Kenney furniture glb 通常每個幾十 KB，好細；夾埋控制喺 ~4MB 以內就得。
- **All-or-nothing**：目前設計係「manifest 入面所有 asset 都成功載入」先會切換做 asset 家具；有任何一件缺失/載入失敗，就整套用返 procedural（避免 asset + 積木家具溝埋一齊唔靚）。收到你嘅實際檔名後我可以按需要放寬。
- **命名唔一樣都得**：你想改名 / 揀咗第二款，唔使遷就——直接話我知檔名，我改 manifest。
- Vercel 會自動 serve `.glb`（static 檔案唔會被 SPA rewrite 食走）；`.vercelignore` 冇排除 `assets/`，deploy 冇問題。

## Manifest 喺邊

擺位、旋轉、縮放全部集中喺 `pages/game/environments/voxelStudy.js` 頂部嘅 `STUDY_ASSETS` array，方便你睇效果、話我改數字，唔使掂深層 code。
