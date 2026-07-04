# NeuroFocus 專案分析與全平台交接手冊

> 文件目的：這份文件不是單純簡介，而是整個專案的全域交接稿。任何人或任何裝置接手這個專案時，都應先看這份文件，再看 `README.md`。
> 專案核心目標：透過 EEG / 外界偵測路徑，即時觀察用戶專注狀態，配合遊戲化神經回饋、呼吸介入與進度量化，協助使用者建立「專注但放鬆」的可練習狀態，目標不是一次性表現，而是長期改善專注穩定度與自我調節能力。

***

## 【專案當前概括】

### 1a. 已完成的模組：

- **產品主流程框架**：已完成 `Home -> Auth -> Setup -> Game -> Results` 的單頁式產品流程，並以 hash router 管理頁面切換。
- **雙層模式架構**：系統不是只有一個 mode，而是先決定「訓練任務模式」，再決定「訊號來源模式」。
  - 訓練任務模式：
    - `訓練模式`：純專注航行，不出題，主打穩定維持專注。
    - `挑戰模式`：加入 Stroop / 邏輯題，主打在認知負荷下維持專注。
  - 訊號來源模式：
    - `Real EEG`：透過 Python Bridge 接 MindWave。
    - `Simulation`：展示 / 備援用。
- **Simulation 內部再細分為兩條路徑**：
  - `camera-ready`：使用相機 + MediaPipe face landmarker 估算專注度。
  - `simulation-fallback`：若相機未授權 / 出錯，就用內建 focus profile 產生 20/80 式模擬專注片段，確保任何環境都可 demo。
- **Real EEG 連線防呆**：前端已加入「必須先等到真實 EEG 封包」的進場檢查，避免 headset 未連好就直接進 Game。
- **神經回饋遊戲機制**：已將專注狀態映射成船速 / 行進表現，形成即時回饋。
- **呼吸介入機制**：已完成 Box Breathing 提示與介面。這個介入層不是只屬於某一條輸入路線，而是理論上可接在所有專注偵測機制之後；當系統判定長時間低專注時就會觸發。
- **訓練模式專屬 UI**：支援 30 秒到 30 分鐘的倒數時長設定、右側浮動倒數、暫停圖示保留、低於剩餘 20% 時紅字提醒。
- **挑戰模式題目流程**：已保留問答、題庫、答題結果與專注度聯動。
- **結果頁量化報告**：已可顯示距離、時間，以及訓練模式專屬指標如 Focus Stability、Recovery Time、Breathing Count。
- **雙語系統**：`hk` / `en` 已接入 i18n。
- **主題系統**：淺色 / 深色模式可切換。
- **展示備援能力**：已具備 Real EEG 失敗時，自然切換去 Simulation 繼續展示的架構基礎。

### 1b. 網頁運作流程：

1. **Home**
   - 作用：對外講故事、呈現產品價值、作為展示入口。
   - 技術：hero 視覺、語言切換、主題切換、進入產品流程。

2. **Auth**
   - 作用：建立本地 session user，讓整個流程有「使用者」概念。
   - 現況：屬本地假登入，不是真正雲端帳戶系統。

3. **Setup**
  - 作用：整個產品最重要的決策頁。
  - 流程分成幾步：
    - 先選 `Session Goal`：
       - `訓練模式`：練穩定專注，不出題。
       - `挑戰模式`：在題目壓力下維持專注。
     - 如果是 `Challenge Mode`：
       - 選 `easy / medium / hard`。
     - 如果是 `Training Mode`：
       - 選倒數長度。

    - 再選 `Input Mode`：
       - `EEG Equipment`
       - `Simulation Mode`
     - 如果是 `Simulation`：
       - 系統會詢問是否授權相機。
       - 授權成功：走 `camera-ready`。
       - 拒絕或失敗：走 `simulation-fallback`。

4. **Game / Runtime**
   - 作用：把專注狀態變成可視化、可操作、可感受的即時回饋。
   - 遊戲內部邏輯：
     - 接收 focus input。
     - 映射成船速、視覺、節奏和回饋。
     - 若長時間偏離穩定狀態，進入 Box Breathing 介入。
   - 訓練模式：
     - 不出題。
     - 核心目標是維持平穩專注。
   - 挑戰模式：
     - 有問題、有認知負荷。
     - 核心目標是測試「一邊思考一邊維持專注」。

5. **Results**
   - 作用：將每次 session 變成可量化、可比較的結果。
   - 價值：這一頁是未來證明產品「有冇長期效果」的基礎。

### 1c. 網站所有模式的目的：

#### 訓練任務模式

- **訓練模式**
  - 目的：專注力基本功訓練。
  - 適合展示：解釋「專注可以被練習」。
  - 適合使用場景：每日短時間訓練、上課前 warm-up、自我調節練習。

- **挑戰模式**
  - 目的：測試在認知負荷下的專注力。
  - 適合展示：解釋「現實世界唔係靜坐，而係要做緊任務都專心」。
  - 適合使用場景：做功課前、認知耐力測試、進階訓練。

#### 訊號來源模式

- **Real EEG**
  - 目的：展示真實神經訊號輸入，強調科技含量與真實性。
  - 優勢：wow factor 高，最吸引評判。
  - 限制：藍牙、COM port、bridge、瀏覽器權限都會影響穩定性。

- **Simulation - Camera Ready**
  - 目的：在無 EEG 頭帶的情況下，仍可用鏡頭觀察頭部 / 臉部狀態，生成較有互動感的 focus score。
  - 技術原理：MediaPipe face landmark 追蹤臉部是否在畫面中央、是否有明顯 blink、look-away 等，再轉成 0-100 分數。
  - 展示價值：比純亂數模擬更「活」，亦更符合現場 iPad / laptop demo。

- **Simulation - Fallback**
  - 目的：即使相機都不能用，仍能保證完整展示。
  - 技術原理：系統以預設 focus profile 生成高低起伏，觸發船速變化與呼吸介入。
  - 展示價值：保底，保證任何環境都不會 demo 死。

#### 介入模式 / 改善機制

- **Box Breathing**
  - 定位：不是獨立輸入模式，而是整個專注訓練系統的統一介入層。
  - 觸發邏輯：無論前面使用 `Real EEG`、`Simulation - Camera Ready` 或 `Simulation - Fallback`，只要系統判定用戶長時間偏離穩定專注狀態，都可以觸發。
  - 作用：從「只量度專注」推進到「主動改善專注」。
  - 專案意義：這一層正正體現產品目標不是停留在檢測，而是即時介入與訓練。
  - 未來方向：除 Box Breathing 外，後續亦可加入更多改善專注的方法，例如個人化節奏提示、短時間 reset protocol、更多生理調節機制與長期 progress 建議。

#### 挑戰難度模式

- **Easy**
  - 目的：降低進入門檻，讓新手體驗系統如何根據專注度改變表現。

- **Medium**
  - 目的：讓玩家進入較真實的認知負荷。

- **Hard**
  - 目的：作展示「高壓情境下專注力容易崩」以及未來 AI 調難度的基礎。

### 1d. 主要檔案負責的事：

- **`index.html`**
  - 系統載入入口。
  - 定義 import map。
  - 載入 Tailwind CDN、Google Fonts、Material Symbols、主 CSS、主 JS。
  - 也預先放入 countdown、breathing intervention、transition loader 等全域 DOM 容器。

- **`app/main.js`**
  - App bootstrap。
  - 讀取 localStorage 的語言 / 主題 / session。
  - 設定 body / html 狀態，然後啟動 router。

- **`app/router.js`**
  - 單頁式 hash router。
  - 對應 `home/auth/setup/game/results`。
  - 負責頁面 module lazy import、render、mount、unmount。

- **`app/state.js`**
  - 全域狀態管理。
  - 核心欄位包括 `testMode`、`trainingDurationSec`、`inputMode`、`setupStep`、`difficulty`、`cameraConsent`、`focusSource`。

- **`app/i18n.js`**
  - 中英文文案集中管理。
  - 包含 Home、Auth、Setup、Results 等流程文案。

- **`services/storageService.js`**
  - 透過 localStorage 儲存語言、主題、使用者。

- **`services/authService.js`**
  - 本地登入 / 註冊假流程。
  - 目前不接後端。

- **`services/runtimeLoader.js`**
  - 管理版本號 query string。
  - 用動態 import 方式載入 runtime，降低快取干擾。

- **`services/eegBridgeService.js`**
  - Setup / Results 等頁跟 `pages/game/runtime.js` 之間的橋。
  - 控制 activate EEG、activate Simulation、dispose mode、sync runtime state。

- **`services/focusInputService.js`**
  - 相機專注偵測核心。
  - 使用 `@mediapipe/tasks-vision` 的 `FaceLandmarker`。
  - 管理 camera stream、hidden video、predict loop、focus score、tracking status。

- **`pages/home/index.js`**
  - Landing page。
  - 處理語言切換、主題切換、進入 app。
  - 也是展示「科技感」與「產品感」最強的一頁。

- **`pages/auth/index.js`**
  - 登入 / 註冊頁。

- **`pages/setup/index.js`**
  - 最複雜的產品設定頁。
  - 管理模式選擇、相機授權、EEG 確認、challenge 難度、training 時長滑桿。

- **`pages/game/runtime.js`**
  - 全專案核心引擎。
  - 內容包括：
    - Three.js 3D scene
    - 題目邏輯
    - focus level 更新
    - breathing intervention
    - simulation profile
    - bridge reconnect
    - results data
    - audio / BGM
    - performance profile

- **`pages/results/index.js`**
  - 結果頁 UI 與 runtime 結果資料接合。

- **`eeg_bridge.py`**
  - 本地硬體橋接器。
  - 功能包括：
    - 掃描 COM ports
    - 優先挑選 MindWave / NeuroSky 相關 serial port
    - 讀取 raw serial data
    - 解析 attention / meditation / signal quality
    - 建立 WebSocket server
    - 將資料廣播給前端

- **`styles/pages/*.css`、`styles/shared/*.css`、`styles/main.css`**
  - UI 外觀、Liquid Glass、dark mode、各頁局部樣式。

- **Windows 批次檔與 SOP 文件**
  - `start_eeg_bridge_windows.bat`
  - `start_local_site_windows.bat`
  - `WINDOWS_2A_DEPLOYMENT_SOP.md`
  - 功能是讓 Windows 端可以不依賴使用者記憶技術細節而啟動 demo。

### 1e. 已經使用的技術清單：

#### 前端基礎技術

- **HTML5**
  - 單一 `index.html` 作為容器頁。

- **Vanilla JavaScript ES Modules**
  - 專案並非 React / Vue，而是原生模組化前端。
  - 優點是輕量、快、易於 Vercel 靜態部署。

- **Import Maps**
  - 在瀏覽器直接指定 `three` 和 `@mediapipe/tasks-vision` 的模組來源。

- **Hash Router**
  - 以 `#home`、`#setup` 等方式管理路由。
  - 適合靜態 hosting，不需 server-side routing。

#### UI / 視覺技術

- **Tailwind CSS CDN**
  - 用於首頁等高密度視覺排版。

- **Custom CSS**
  - 用於 Liquid Glass slider、page-level layout、dark mode 細節、training HUD。

- **Google Fonts / Material Symbols**
  - 提升展示感與界面可讀性。

#### 3D 與互動技術

- **Three.js**
  - 負責 3D 場景、相機、光影、材質、粒子效果、船隻更新。

- **GLTF / HDR 資產**
  - `EGGShip2.glb`、HDR sky、water normal map。

- **Web Audio / 音效邏輯**
  - runtime 內有 BGM 和答題音效控制。

#### 專注輸入與感測技術

- **EEG 單通道腦波輸入**
  - 以 MindWave Mobile 2 為核心硬體。
  - 目前主要使用裝置輸出的 `attention`、`meditation`、`signal_quality`。

- **WebSocket**
  - 前端與本地 Python bridge 的即時通訊管道。

- **MediaPipe FaceLandmarker**
  - 在 Simulation camera 模式中估算專注狀態。
  - 觀察 blink、eye look、臉部居中程度、臉部存在信心等。

- **getUserMedia Camera API**
  - 啟動前鏡頭。

#### 本地橋接與系統技術

- **Python asyncio**
  - 管理 WebSocket server 和 queue。

- **pyserial**
  - 讀取 MindWave serial stream。

- **websockets**
  - Python 端 WebSocket server。

- **serial.tools.list_ports**
  - 列出 COM / serial 裝置。

- **threading**
  - 將 serial worker 與 async server 分工。

#### 狀態與持久化

- **localStorage**
  - 儲存語言、主題、當前 user。

#### 部署與跨平台

- **Vercel 靜態前端部署**
  - 前端可直接以網址打開。

- **本地 Python Bridge**
  - 實機 EEG 不放上雲，而是在本地啟動。

- **Windows Batch 啟動腳本**
  - 方便在比賽電腦快速啟動。

### 1f. 目前應如何理解這個產品：

- 它**不是單純遊戲**，而是神經回饋訓練原型。
- 它**不是單純 EEG 讀數器**，而是把讀到的狀態轉成即時訓練回饋。
- 它**不是醫療器材**，目前定位應是：
  - 教育 / 訓練 / 展示用 neurofeedback prototype
  - 專注訓練平台概念驗證
  - 可延伸成商業產品的互動原型

***

## 2. 未完成與待修復的問題：

- **藍牙連線穩定性仍是第一風險**
  - MindWave 依賴藍牙配對與 COM port。
  - 會場干擾時，連線仍可能不穩。

- **單通道 EEG 的語義限制**
  - 目前使用的是商業裝置輸出的 attention / meditation 指標，不是研究級多通道 EEG。
  - 可以用作訓練輸入與展示，但不應講成完整腦狀態診斷。

- **Simulation 容易被誤會成造假**
  - 若講法不清楚，評判可能誤會成「無頭帶都係假腦波」。
  - 所以對外必須明確說 Simulation 是展示與備援路徑，不是真實 EEG。

- **長期改善的證據仍未建立**
  - 目前結果頁只顯示單次 session。
  - 未有帳戶系統、後端資料庫、長期追蹤圖。

- **產品級驗證不足**
  - 未有正式用戶研究、前測後測、對照組、長期追蹤。

- **改善方法仍以 Box Breathing 為主，介入層不夠豐富**
  - 目前最完整的改善手段是 Box Breathing。
  - 雖然已經足夠支撐 demo，但若要更貼近長期訓練平台定位，未來仍需擴展更多介入與改善方法。

- **雲端與本地訊號橋接仍需更多實機驗證**
  - HTTPS 前端接本地 WS bridge 在不同瀏覽器組合上仍需再驗證。

- **部分首頁文案與實際技術有落差**
  - 例如首頁提及主流 EEG 裝置，但目前真實實作主要圍繞 MindWave。
  - 對外表述要收斂，避免被問到其他裝置支援時答唔準。

***

## 3. 比賽競爭力分析 (創科比賽 & STEAM 展覽 - 發明品類別)

### 優勢 (Pros) - 技術亮點與吸睛處

1. **問題定義清楚**
   - 主題直指數碼分心年代下的專注力下降。
   - 評判容易理解，社會需求明確。

2. **有完整閉環，不只是監測**
   - `偵測 -> 視覺化 -> 遊戲回饋 -> 呼吸介入 -> 報告`
   - 這比單純顯示腦波數字更像產品。

3. **展示策略非常成熟**
   - `Real EEG` 用來吸睛。
   - `Simulation` 用來保底。
   - 即使硬體出事，整體 demo 仍成立。

4. **技術跨域度高**
   - 前端、3D、EEG、Python bridge、相機視覺、遊戲設計、UI/UX 都有整合。

5. **互動感強**
   - 評判可以即刻感受到「我專心 -> 船快」「我分心 -> 船慢 / 介入」。
   - 這種可感知回饋非常適合展覽。

6. **具有產品延展性**
   - 容易延伸到教育、家庭、訓練中心、企業專注訓練等場景。

### 劣勢與風險 (Cons) - 潛在問題與改進建議

1. **真實 EEG 路徑脆弱**
   - 風險：硬體、藍牙、serial、bridge、權限、瀏覽器，任何一環都可能出錯。
   - 改進建議：長期引入更多 sensor 路線，如 camera / eye tracking / HRV。

2. **「效果證明」仍不足**
   - 風險：評判可能追問「你點證明真係改善咗？」
   - 改進建議：加入前測後測、每週訓練紀錄、持續追蹤 dashboard。

3. **科學敘事需要更精準**
   - 風險：若把 Alpha / Beta 講成過於絕對，會被專業評判質疑。
   - 改進建議：用「以 Alpha / Beta 作為專注與放鬆平衡的設計框架」去講，而不是講成唯一標準答案。

4. **醫療定位風險**
   - 風險：如果講成治療 ADHD，要求證據等級會突然變高。
   - 改進建議：目前應講成訓練工具 / 原型 / 教育科技產品，而非醫療治療。

5. **單次結果頁未足夠支持長期改善論述**
   - 改進建議：把「長期改善」定位為 roadmap，而非現階段已完成能力。

6. **介入手段仍偏單一**
   - 風險：如果評判追問「除咗呼吸之外仲有咩方法改善專注」，目前可展示的已實裝內容不多。
   - 改進建議：逐步加入更多短介入機制，令產品更完整地對應「改善專注」而不是只對應「量度專注」。

### 市場可行性分析

- **教育市場**
  - 家長和學校都關注學生專注力、情緒調節、自主學習能力。
  - 本產品切中高頻問題，而且比純紙筆訓練更有吸引力。

- **家庭市場**
  - 若未來可不用昂貴 EEG，單靠 camera + 軟件訂閱已具家庭市場潛力。

- **訓練中心 / 治療輔助市場**
  - 可作為專注訓練輔助工具，而非直接取代治療。

- **商業模式可行方向**
  - 短期：學校展示、STEAM 教材、體驗工作坊。
  - 中期：軟件訂閱、課程包、雲端進度追蹤。
  - 長期：多感測器版本、個人化 AI 難度調節、報表系統。

***

## 4. 做什麼行為會有效提升專注力，以及本產品如何對應

### 已有科學機制支持、可合理主張的部分

- **即時回饋比抽象提醒更容易建立自我覺察**
  - 用戶不是被動聽「專心啲」，而是即時見到專注狀態改變畫面。
  - 這有利建立自我監察能力。

- **循序漸進練習比一次過高壓測試更適合訓練**
  - 本產品用 `訓練模式 -> 挑戰模式` 做 progression。
  - 先練穩定，再練認知負荷。

- **節律呼吸有助短時間降低過高喚醒狀態**
  - 慢而規律的呼吸與副交感神經 / vagal modulation 有關，對情緒穩定與壓力調節有支持。
  - 這正是 Box Breathing 放在產品中的理由。

- **檢測 + 介入比單純檢測更接近真正訓練**
  - 只量度專注，只會知道結果。
  - 加入介入層，才有機會把「知道自己分心」變成「學會如何拉回自己」。

- **重複練習 + 即時獎勵有助形成穩定策略**
  - 船速加快是一種即時 reward。
  - 用戶可逐步學會：當分心 / 緊張時，如何自行拉回狀態。

- **認知負荷訓練有助貼近真實世界情境**
  - 真實生活不是靜坐，而是做緊 task 都要專心。
  - 挑戰模式的價值就在這裡。

### 目前不能過度主張的部分

- **不能直接說已經證明可治療 ADHD**
  - 現階段無臨床試驗、無對照組、無產品級實證。

- **不能直接說 Alpha + Beta 穩定就必然等於 Flow**
  - 這是產品設計框架與神經科學啟發，不應說成臨床定律。

- **不能直接說你們產品已證明有長期療效**
  - 因為尚未建立 longitudinal dataset。

### 比較嚴謹的有效性說法

- 可以說：
  - 本產品建基於 neurofeedback、即時回饋、呼吸調節與循序漸進注意力訓練的機制。
  - 目標是幫助用戶建立自我覺察與自我調節能力。
  - 系統理論上有助長期改善，但產品本身仍需更長期用戶研究驗證。

- 不建議說：
  - 「我哋已經證明所有人用完都會大幅提升專注力。」
  - 「我哋已經醫好 ADHD。」

### 目前可引用的外部證據方向

- **Neurofeedback 證據是混合的，不可講得太滿**
  - 2024 年一篇系統性回顧與 meta-analysis 指出，neurofeedback 對 ADHD 整體群體層面的效果未見明確穩定優勢，但在標準 protocol 下可能有小幅改善空間。
  - 這代表你們的正確講法應是「有科學基礎、有潛力，但仍需高質量驗證」。

- **慢速呼吸 / paced breathing 對 vagal modulation 有較一致支持**
  - 近年研究對 slow breathing、HRV、放鬆與壓力調節的支持相對更穩。
  - 所以 Box Breathing 是你們產品內較容易站得穩的一環。

- **較穩陣的對外講法**
  - 現階段可以說：本產品已整合多條專注偵測路徑，而 Box Breathing 作為共同介入層，可接在不同偵測機制之後。
  - 未來會逐步加入更多改善專注的方法，令系統由「量度 + 單一介入」進一步發展成「量度 + 多種個人化介入」平台。

### 建議未來如何真正證明「有效果」

1. 建立前測 / 後測
   - 例如 Stroop 正確率、反應時間、連續專注時間。

2. 建立長期追蹤
   - 每週 3 次、連續 4 至 8 週，觀察 focus stability 與 recovery time 是否改善。

3. 建立對照組
   - 一組只玩普通遊戲；另一組使用 neurofeedback + breathing 版本。

4. 建立主觀量表
   - 問卷自評：分心頻率、緊張程度、完成任務能力。

5. 建立行為證據
   - 看用戶是否更快從分心狀態回復。

***

## 【目前的進度】

- 已完成產品主流程頁面拆分與路由。
- 已完成 `訓練模式 / 挑戰模式` 的雙任務架構。
- 已完成 `Real EEG / Simulation` 的雙訊號來源架構。
- 已完成 `Simulation camera-ready / simulation-fallback` 兩條路徑。
- 已完成 Setup 頁的訓練時長 slider、dark mode、模式選擇流程。
- 已完成 runtime 的 breathing intervention、training countdown、results analytics。
- 已完成 Windows 端本地 EEG bridge。
- 已完成比賽展示用 `README.md`。

## 【目前需要解決的事】

1. **補強 `PROJECT_ANALYSIS.md` 與 `README.md` 的一致性**
   - 確保技術、模式、展示講法全部一致。

2. **跨裝置實機驗證**
   - Windows + Chrome + `eeg_bridge.py` + Vercel 前端要完整走一次。

3. **Windows EEG 實機連線穩定性測試**
   - 展覽現場可能會有大量藍牙干擾，需要在 Windows 筆電上進行長時間的 MindWave 連線壓力測試。
   - 確認 `eeg_bridge.py` 能夠在斷線後穩定重連，或者提供清晰的報錯訊息。

4. **Windows 本地伺服器與 Vercel 前端的跨網域 (CORS / Mixed Content) 驗證**
   - 由於 Vercel 是 HTTPS，而本地 Bridge 是 HTTP/WS (`ws://127.0.0.1:8765`)，需確保 Windows 上的瀏覽器（如 Chrome / Edge）不會阻擋 Mixed Content。
   - 驗證 `?bridgeHost=127.0.0.1` 參數在 Windows 實機上的有效性。

5. **Windows 效能與 Memory Leak 測試**
   - 確保在 Windows 電腦上長時間執行 WebGL (Three.js) 場景時，FPS 能夠維持穩定。
   - 檢查是否有 Memory Leak 導致瀏覽器崩潰或卡頓。
