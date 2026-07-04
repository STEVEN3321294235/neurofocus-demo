# NeuroFocus IEYI 比賽衝刺計劃（2026-07-03 → 七月尾）

## Context（點解要做呢個計劃）

現時 `neurofocus-demo` 已經係一個相當完整嘅 prototype：Home→Auth→Setup→Game→Results 全流程、雙訊號來源（Real EEG / Simulation）、Box Breathing 介入、AI 出題 + fallback 題庫都已經做好（見 `PROJECT_ANALYSIS.md`、`docs/GAMEPLAY_UPGRADE_CONFIRMATION_2026-06-23.md`）。但直接讀 code 之後發現幾個未喺內部文件講到但會直接影響比賽同長遠發展嘅問題：

1. **`services/runtimeLoader.js` 第 1 行同第 19 行**：DeepSeek API key 寫死喺前端 code 入面並存入 `localStorage`，已經 commit 落 git history，任何人開 devtools 都攞到。你話呢個 key 係 mentor 俾，唔想換，但你想順便起返個免費 backend（處理呢個 key 之餘連登入系統都做埋）——呢個諗法啱，兩個問題可以一齊解決。
2. **EEG 藍牙穩定性**係內部文件都認自己承認嘅頭號比賽風險，需要實機 rehearsal 而唔淨係 code fix。
3. **「點證明真係有效？」**係 `PROJECT_ANALYSIS.md` 自己都認嘅評判必問問題，而家淨係得單次 session 結果，冧因為未有 pre/post 對比或者跨 session 紀錄。
4. Home page 講緊 support Muse/Emotiv，但實際上只做咗 MindWave——呢個 gap 評判一問就穿。
5. 完全冇後端、冇帳戶系統，長遠想搞訂閱/賺錢會冇地基。
6. **`pages/game/runtime.js:350-359` 嘅 `FOCUS_TRAINING` 門檻（`lowThreshold: 45`、`recoveryThreshold: 55`）係寫死常數**，唔理邊個用戶、練咗幾多次都用同一把尺——即係而家個系統淨係做到「量度 + 即時介入」，未做到隨用戶進度調節嘅「訓練」，呢個亦係「長遠點樣真係改善專注力，並且可量度」呢個問題嘅根源。

你話：3 人隊，但 develop 淨係得你一個人做（會用 TRAE 寫 code，我負責 review + 出 prompt）；賺錢部分比賽之後先深入諗，而家淨係要方向。所以呢個 list 會盡量精簡、分清邊啲一定要做、邊啲時間夠先做，並且將起 backend 呢一步設計成「一次過解決 key 安全 + 登入系統 + 未來賺錢地基」嘅單一動作，最大化你有限開發時間嘅槓桿。

### 已拍板嘅產品方向（2026-07-03 你嘅決定）

1. **隻船嘅角色**：船嘅核心機制其實已經做咗——專注時平穩順滑、分心時搖晃（`runtime.js:1332` bobAmplitude 跟 inverse focus）、呼吸介入完成後有 100% 專注 5 秒獎勵（`runtime.js:670-671` boostActive）。真正欠嘅係**溝通**：用戶唔知隻船係「你個腦嘅倒影」。解法 = 開場教學講明 + 令對比更加易讀 + 令 boost 獎勵睇得見（Prompt K/J）。
2. **第二訓練環境**：你唔想「簡約模式」太空泛——改為起一個 **voxel 風格書房/圖書館** 3D 環境（類 Minecraft 美術，但只用 Three.js BoxGeometry 砌、唔用任何 Minecraft asset/名字，避開版權），畀覺得海面太刺激嘅用戶揀（Prompt L，P2）。
3. **EEG 裝置作用放大**：做 (a) 專注+放鬆雙軸狀態（用返一直送緊但前端未用嘅 meditation 數據，`runtime.js:4439`）、(c) 呼吸介入時實時顯示腦電放鬆值上升、(d) 佩戴/訊號質素 UI。全部原始數據顯示放喺一個 `DEMO_MODE` 開關後面——比賽 demo 時顯示，將來變產品可以一鍵收起（Prompt M）。
4. **ADHD 定位**：行「ADHD-friendly 設計、唔落醫療宣稱」路線——對外只講「專注力訓練、目標長期改善」，設計上刻意照顧專注力弱嘅用戶（短 session、高頻離散獎勵、低雜訊畫面、即時回饋）。
5. **字體統一**：全站有三隻字體——`Inter`（內文）、`EB Garamond`（標題）、`Orbitron`（`--font-tech` 科技感數字）。**Orbitron 只保留喺真正嘅遊戲畫面（3D game HUD）內**；Setup / Results / Auth 全部改用返 homepage 嗰對（EB Garamond 標題 + Inter 內文）。呢個係你嘅決定（見 Prompt N）。
6. **Footer 死連結**：homepage footer 四個掣（隱私政策/服務條款/技術支援/聯絡我們）全部係 `href="#"` 死連結。決定：**隱私政策 + 聯絡變真，刪走服務條款 + 技術支援**。隱私政策要**先諗清楚法律問題**（見下面「Footer 法律考量」），再由 **Claude Code（我）/ TRAE** 撰寫。
7. **文案 humanize**：全站文句要自然、有溫度、唔浮誇、唔過度宣稱（現有好多 marketing 式 + 過度宣稱句，例如「解鎖大腦無限可能」，本身亦係評判風險）。**網頁文句由 Claude Code（我）直接起草 + 同你逐句 iterate**，唔交晒俾 TRAE（見「文案 voice guide + 示範改寫」）。
8. **更多動畫**：homepage / 選單 / 結果頁可以加 polish 同 micro-interaction；但**遊戲訓練期間必須保持克制**（低雜訊 = ADHD 護欄），只有獎勵一刻（通過 gate、boost）先俾明顯動畫（見 Prompt O）。

> **邊啲由我（Claude Code）直接做**：#6 隱私政策/Footer、#7 網頁文案 humanize——呢兩樣我可以直接改、commit、push 上 branch，TRAE `git pull` 就同步。#5 字體、#8 動畫出 TRAE prompt（你想我直接做都得，因為字體改動純機械、我驗到）。

---

## 你嘅角色：每個階段你親自做咩（完全唔使識 code）

你係概念/產品負責人 + prompt 操作員。逐個階段：

**P0（本星期）**
- 開一個免費 Supabase 帳戶：supabase.com → New Project → 記低 `Project URL` 同 `anon public key` 兩串字（之後 TRAE 會留咗 TODO 位置俾你貼入去）
- 開 Vercel dashboard → 你個 project → Settings → Environment Variables → 加 `DEEPSEEK_API_KEY`（個值就係 mentor 俾你嗰條 key）
- 貼 Prompt A 俾 TRAE，等佢做完 → 將 Supabase 嗰兩串字填入佢指示嘅檔案位置 → push
- **你嘅驗收（唔使識 code）**：開個新 deploy 咗嘅網站 → 撳 F12 開 DevTools → Network 分頁 → 玩一次 Challenge mode → 喺 request 度 Ctrl+F 搵「sk-」→ 搵唔到就 pass
- 同隊友夾一日做 EEG rehearsal：戴頭帶行勻成個流程最少 5 次，用手機影低每次斷線/失敗，寫低「咩情況斷、點救返」一頁紙
- Message mentor：話佢知條 key 已經上咗 public git history，俾佢決定換唔換

**P1（第二星期）**
- 每日貼一個 prompt 俾 TRAE（次序：B → C → D → E → H → M），做完一個驗收一個先開下一個，唔好一次過貼晒
- 每個 prompt 嘅「我會點 review」段落就係你嘅驗收清單——全部都係「打開網站→做咩→應該見到咩」嘅動作，唔使睇 code
- 有懷疑就叫 Claude Code review TRAE 改咗嘅嘢（git pull 之後叫佢對住個 prompt 逐項 check）

**P2（第三星期）**
- **文案 humanize + Footer 隱私政策**：直接同 Claude Code（我）一齊做——我起草雙語文案 + 誠實版隱私政策，你逐句睇、話我改，滿意我就 commit + push，你完全唔使掂 code
- 貼 Prompt N（字體統一）、F/G/I/J/K/L/O 俾 TRAE（次序：F 先、G 最後；N 早啲做冇壞；I/J/K/L/O 時間夠先做）
- 每做完一個都喺 Windows 機開一次網站行一圈

> **UI 打磨呢批可以早過 P2 做**：字體統一（N）、文案 humanize、Footer 三樣都係「低風險、收窄評判風險、令個網站睇落成熟」嘅快贏，如果 P0 搞掂咗、你有心情，P1 期間隨時可以插隊做，唔使等到 P2。

**P3（最後星期）——你做主角，唔再郁 code**
- 帶隊 rehearsal 最少兩次（台詞 + demo + Q&A 互考）
- 喺比賽實際會用嘅 Windows 機 + iPad 度行勻成個流程，包括拔 EEG、斷 Wi-Fi 嘅救場演練
- 執攤位物資 checklist（`README.md` 有底稿）

**同 TRAE 協作嘅 git 流程（貼喺當眼位）**
1. 開始前：TRAE 度 `git pull` 攞最新
2. 貼 prompt → TRAE 改 code → 你照「我會點 review」驗收
3. 驗收 pass → TRAE `git add -A && git commit && git push`
4. 想 Claude Code 覆核：話佢知「pull 完 review 下 XX prompt 嘅改動」
5. 呢份 plan 本身放咗喺 repo `docs/IEYI_SPRINT_PLAN.md`——邊個 AI 改完 plan 都要 push，你先至永遠睇到最新版

---

## 核心技術決定：一個免費 Supabase + 一個 Vercel Function

呢個項目而家係純靜態網站（vanilla JS、冇 build step、冇 package.json）。為咗用最少工夫換最大效益，建議：

- **Supabase（免費 tier）**：用嚟做真正登入系統（Auth）同儲存跨 session 紀錄（Postgres + Row Level Security）。Supabase 出面已經有可以直接喺瀏覽器 `import` 嘅 JS SDK（同你而家 `three` / `@mediapipe/tasks-vision` 用 import map 嘅方式一樣），唔使自己起 REST API，唔使自己管密碼/JWT。`SUPABASE_URL` 同 `SUPABASE_ANON_KEY` 設計上就係俾瀏覽器用，唔算洩漏（安全靠 RLS policy，唔係靠隱藏呢兩個值）。
- **一個 Vercel Serverless Function**（`/api/questions.js`）：**淨係**用嚟保護 DeepSeek key。呢個 key 唔會俾瀏覽器見到，改用 Vercel 環境變數 `DEEPSEEK_API_KEY`（你話呢個可以做，因為淨係加環境變數，唔洗換 key 本身）。

呢個設計嘅好處：起一次，同時解決 (a) key 安全、(b) 你想要嘅登入系統、(c) 為 pre/post test 同 history trend 提供真正資料庫（而唔淨係 localStorage）、(d) 為之後想收訂閱做好地基。全部都係免費 tier 就夠用。

---

## 分優次 To-Do List

> 如果最後時間唔夠，只做得三件事，就做 **P0-1（起 backend）、P0-2（EEG rehearsal）、P1-2（pre/post baseline test）**——呢三樣分別解決安全風險、最大現場風險、同評判必問嘅「證明有效」風險。如果仲有空間做第四件事，排 **P1-5（自適應門檻 + Recovery Time trend）**——呢個係令個產品由「量度 + demo」變成「真係可以訓練、可以量度進步」嘅核心機制。

### P0｜本星期（07-03 → 07-09）：地基 + 安全 + 收窄風險

| # | 項目 | 邊個做 | 點解排第一 |
|---|------|--------|-----------|
| P0-1 | 起 Supabase 專案 + Vercel `/api/questions.js` proxy，撤走前端 hardcode key | 你 + TRAE（見 Prompt A） | 一次過解決洩漏 key + 起到登入系統地基 |
| P0-2 | EEG 藍牙全流程 rehearsal（Windows + `eeg_bridge.py` + 頭帶 + 瀏覽器），記錄失敗模式同復原步驟 | 你 + 隊友（非 code） | 內部文件都認呢個係頭號現場風險，一定要提早試到爆 |
| P0-3 | 修正 Home page「支援 Muse/Emotiv」講法，收窄做「MindWave 為主，架構可擴展」 | 你或隊友（純文案，唔使 TRAE） | 評判一問就穿，改一句字已經解決 |
| P0-4 | 提醒俾你 key 嘅 mentor：呢條 key 已經喺 public git history 出現咗，等佢知（唔使你自己換） | 你 | 唔係你責任換，但都應該講一聲畀對方決定 |

### P1｜第二星期（07-10 → 07-16）：解決評判最會質疑嘅位

| # | 項目 | 邊個做 | 點解 |
|---|------|--------|-----|
| P1-1 | 用 Supabase Auth 換走假登入（`services/authService.js`） | TRAE（見 Prompt B） | P0-1 起完 backend 之後嘅自然延伸，登入變真 |
| P1-2 | **Results Dashboard**（取代原本嘅 pre/post baseline test）：你決定唔好喺遊戲前逼用戶做測試（會唔耐煩）。改為將 Results 頁升級成 Dashboard——(a) **session 內前後對比**（同一局前半 vs 後半嘅專注平均值/恢復速度，零摩擦嘅「前後數據」）、(b) 本局專注曲線圖表、(c) 跨 session trend（配合 P1-3）、(d) 答錯題目 + 解釋回顧（code 已有，升級做 Dashboard 卡片） | **Claude Code 直接做**（見 Prompt C'） | 一樣回應「點證明有效」，但零遊戲前摩擦；圖表 + 前後對比對評判說服力仲高 |
| P1-3 | 跨 session history + trend（存入 Supabase，冇網絡就 fallback 落 localStorage） | **Claude Code 直接做**（見 Prompt D） | 補「冇長期數據」呢個評判必問缺口，而且日後都用得著 |
| P1-4 | 真正 Stroop 互動題（而家「Stroop」淨係得個名） | TRAE（見 Prompt E） | 令你哋台詞入面講嘅嘢變真，改動細但吸睛 |
| P1-5 | **自適應門檻 + Recovery Time trend**：用用戶自己嘅歷史表現拉高/拉低 `FOCUS_TRAINING` 門檻（而唔係死用 45/55），並將 Recovery Time trend 變成 Results 頁最顯眼嘅「進步證明」 | TRAE（見 Prompt H，需要 Prompt D 先做完） | 呢個先係真正「訓練」機制，而唔淨係「量度」；同時係全個計劃入面對「長遠點樣切實改善專注力、可量度」呢條問題最紮實嘅答案 |
| P1-6 | **放大 EEG 裝置作用**：(a) 專注+放鬆雙軸心流（用埋一直冇用嘅 meditation 數據）、(c) 呼吸介入時實時顯示腦電放鬆值上升、(d) 佩戴/訊號質素 UI——全部收喺 `DEMO_MODE` 開關後面 | TRAE（見 Prompt M） | 令部 EEG 由「單一數字來源」變成「見證你個腦點運作」嘅主角；呼吸時見住腦電平靜落嚟係攤位最有說服力嘅一幕；EEG 部分要有部 MindWave 先測到，配合 P0-2 rehearsal 一齊驗 |

### P2｜第三星期（07-17 → 07-23）：打磨、效能、內容對齊（時間唔夠可以縮）

| # | 項目 | 邊個做 |
|---|------|--------|
| P2-1 | 跟進 Windows home page FPS 問題（`debug-windows-home-fps.md`，TRAE 已經有 debug-point 遙測喺度用緊） | TRAE（見 Prompt F） |
| P2-2 | `README.md` / `PROJECT_ANALYSIS.md` / Home page 講法一致化 | 隊友寫 draft，你 review |
| P2-3 | Repo 執手尾：移除/`.gitignore` 30MB 嘅 `EEG_2026_Windows.zip`，FPS 問題解決後清走 7 個檔案入面嘅 `#region debug-point` 遙測 code | TRAE（見 Prompt G） |
| P2-4 | Auth 密碼欄位（P1-1 做完真登入之後呢個自動解決；如果 P1-1 冇做，就至少令個密碼欄位真係做嘢） | 隨 P1-1 |
| P2-5 *(有時間先做)* | 第二種短介入手法（Box Breathing 以外，例如簡單敲擊節奏 reset） | TRAE |

### G｜遊戲玩法 / 3D / UI-UX 改善（打磨層 — P0/P1 做完先郁，唔好搶時間）

> **關鍵背景（直接讀 code 得出）**：隻船而家喺**固定軌道**向前衝（`runtime.js:1276`，冇軚、冇閃避），速度 = 專注值；`islands`（`createFloatingIslands()` line 4128）同 balloons 係**純裝飾**，隨機撒一次，永遠唔會撞、唔會俾分、唔會反應。即係 moment-to-moment 回饋淨係「專心→船快→distance 數字大」，好被動，用戶冇當下目標亦冇理由望個 3D 世界。已有嘅 `isFlowState`（line 1177：`focus>80 && streak≥3`）淨係開大 FOV + 1.2x 速度 + 加一個 `flow-state-mode` body class，視覺回報好細。以下改善全部**重用現有系統、唔郁 EEG / 呼吸 state machine / 出題邏輯**，風險受控。

| # | 項目 | 價值 | 優次 |
|---|------|------|------|
| G-1 | **Focus Gates（專注閘門）**：沿住軌道定期放「光環/浮標」，船經過嗰刻若專注值高過門檻就「通過 + 亮燈 + 加分」，唔夠就「熄燈 / miss」。**每一個 gate 係一個離散、可數、可量度嘅事件**（「你通過咗 8/10 個專注閘門」）| 全個打磨層最高價值：由被動「專心→船快」變成有當下目標嘅主動玩法，而且**直接餵養「可量度」thesis**（每個 gate = 一粒 datapoint）。因為隻船冇軚，gate 係「經過嗰刻專注夠唔夠」而唔係「閃避」，啱啱好等於神經回饋，唔使加任何操控系統 | **最高**（值得考慮由 P2 抽上 P1，如果 P1 有位）｜見 Prompt I |
| G-2 | **世界對專注反應 + Flow State 視覺回報**：而家嘅靜態 islands/balloons 令佢哋喺 flow state 亮起 / 升起 / 加 bloom，分心時變灰 / 下沉；順手 recycle 佈景（船衝過就 wrap 返去前面，唔好衝出空海）| 近乎零新 code（重用 `flow-state-mode` class + 現有 `bloomPass` line 3459 + 現有 meshes），但令「好狀態」變得**一望就靚**——呢個係神經回饋嘅情感核心，亦係攤位 wow factor | 中｜見 Prompt J |
| G-3 | **UI/UX 可讀性 + 隻船嘅目的**：HUD 加一條「專注區間」band（分心 / 穩定 / 心流），令用戶睇**狀態**而唔係一個乾數字；頭 5-10 秒無字 onboarding 講明「**船就係你個腦嘅倒影**——你專注，佢就平穩加速」（直接回應「唔知隻船目的係咩」嘅用戶反饋）；令呼吸後嘅 100% boost 獎勵**睇得見**（發光+音效慶祝，佢而家靜靜雞發生咗都冇人知）；Results 頁配合 P1-5 將 Recovery Time 進步放到最大 | 攤位上 iPad 隔幾步睇都要一秒讀懂；解決「我到底要做咩」嘅 demo 殺手 | 中｜見 Prompt K |
| G-4 | *(原則)* 唔好起需要新 asset 嘅 3D model / 大改 `runtime.js` 結構 | 一個 dev + deadline + 5,218 行 monolith，外部 asset 係時間黑洞。**juice 現有嘢**（燈光、post-processing、reactive 佈景）回報高、風險低。G-5 係唯一例外，因為 voxel 環境純用 code 砌、唔使任何外部 asset | — |
| G-5 | **第二訓練環境「Voxel 書房」**：類 Minecraft 美術嘅 3D 書房/圖書館（純 Three.js BoxGeometry 砌，冇外部 asset），畀覺得海面/船太刺激嘅用戶揀——畫面近乎靜止，靠燈光/漂浮書本對專注反應。呢個都係 ADHD-friendly 設計嘅一部分：有啲用戶需要**更少**動態刺激 | 直接回應「隻船令人分心」嘅另一半用戶；環境選擇本身都係產品賣點（「唔同人需要唔同刺激水平」好啱評判聽） | 中，P2 尾（P0/P1 全部搞掂先郁；時間唔夠就跳過）｜見 Prompt L |

### U｜UI 統一 / 文案 / Footer 法律（快贏 — 收窄評判風險、令網站睇落成熟，P1 有位就插隊做）

| # | 項目 | 邊個做 | 價值 |
|---|------|--------|------|
| U-1 | **字體統一**：Orbitron（`--font-tech`）只保留喺 game HUD；Setup（setup.css 6 處）、Results（results.css）、utilities.css 嗰啲 Orbitron 全部改用 homepage 對（`--font-display` 標題 + `--font-main` 內文） | TRAE（Prompt N）或 Claude Code（純機械 CSS 改動，我驗到） | 全站字體由 3 隻收成 2 隻（+ 遊戲專用 1 隻），視覺即刻統一成熟 |
| U-2 | **文案 humanize**：全站雙語文句改到自然、有溫度、誠實、唔過度宣稱（i18n.js + home/index.js 內嘅 `dualText()` 串） | **Claude Code（我）直接起草 + 同你逐句 iterate**，滿意先 push | 過度宣稱本身係評判風險（plan 前面已 flag）；humanized 文案令產品由「AI 生成感」變「真人做嘅產品」 |
| U-3 | **Footer**：刪走「服務條款 / 技術支援」兩個死連結；「隱私政策」做成一頁誠實嘅短 policy、「聯絡我們」放真 email | **Claude Code（我）** 先諗清楚法律（見下），起草隱私政策，你睇完先 push | 死連結 = 未完成感；但隱私政策對一個收集 EEG/鏡頭/帳戶數據嘅產品係**加分**，唔係裝飾 |
| U-4 | **更多動畫**：homepage/選單/結果頁加 polish + micro-interaction（scroll reveal 已有，可加 hero 入場、數字 count-up、按鈕回饋、頁面切換過場）；遊戲內保持克制，只獎勵一刻先加明顯動畫 | TRAE（Prompt O） | 攤位 wow factor + 產品質感；但要守住 ADHD 低雜訊護欄，唔可以喺訓練期間加干擾 |

### P3｜第四星期（07-24 → 07-31）：Rehearsal + 交付（唔再加新功能）

- 完整 rehearsal（台詞 + demo + 評判 Q&A），practice 到熟——隊友主導
- 用比賽現場實際裝置（Windows 手提電腦 + iPad）做一次完整跨裝置 QA
- 現場故障演練：EEG 斷 → 切 Simulation、Wi-Fi 斷 → 用 `server.js` 本地離線版
- 攤位物資 checklist 最終確認（`README.md` 已有 checklist 底稿）
- **Code freeze**：最後檢查瀏覽器 devtools network tab 確認冇任何 key 外露，確認 debug-point 遙測已清走

---

## TRAE Prompts（可以直接貼俾 TRAE）

每個 prompt 後面我都寫低「我會點 review」，等 TRAE 交返嚟之後我可以快速核對。

### Prompt A — Supabase backend + 保護 DeepSeek key（對應 P0-1）

```
Goal: Remove the hardcoded DeepSeek API key from the client bundle and stand up a
minimal free backend (Supabase) for future auth + session history.

Context: This is a no-build-step vanilla JS ES Modules SPA (see index.html import
map). services/runtimeLoader.js line 1 hardcodes
`const FRONTEND_DEEPSEEK_API_KEY = 'sk-...'` and line 19 persists it to
localStorage — both must be deleted. pages/game/runtime.js CONFIG (~line 15-19)
and fetchBatchQuestions (~line 2656) currently call the DeepSeek Chat
Completions API directly from the browser using that key.

Do this:
1. Add /api/questions.js as a Vercel Node serverless function. It must:
   - accept POST { count, difficulty, lang }
   - validate count is an integer 1-20, difficulty in easy|medium|hard, lang in hk|en
   - read the key from process.env.DEEPSEEK_API_KEY (do NOT put the key value in
     any file — I will set it in Vercel project env vars myself)
   - build the same prompt currently built client-side in fetchBatchQuestions
     (reuse the DIFFICULTY_PROFILES / hardModeRules logic, duplicate it into the
     function file since this is a no-build-step project and can't share an ESM
     module between browser and Node function)
   - call DeepSeek server-side, validate the response using the same rules as
     validateQuestionItem/finalizeQuestionBatch (~line 2607-2654: reject missing/
     short question text, invalid answer index, duplicate options/questions,
     "all of the above" style options, missing explanation)
   - return { ok: true, questions: [...] } on success or { ok: false, reason }
     on failure/timeout (use the same 8s/15s timeout pattern as
     INITIAL_AI_TIMEOUT_MS/BACKGROUND_AI_TIMEOUT_MS)
2. In services/runtimeLoader.js: delete the FRONTEND_DEEPSEEK_API_KEY constant
   (line 1) and the localStorage.setItem('deepseek_api_key', ...) block (~lines
   18-22). Update the stale "SECURITY NOTE" comment above it.
3. In pages/game/runtime.js: remove deepseekApiKey from CONFIG, change apiUrl to
   "/api/questions", remove the Authorization header and the `if (!apiKey) throw`
   check in fetchBatchQuestions, change the request body to
   { count, difficulty: CONFIG.difficulty, lang: CONFIG.currentLang }, and change
   response parsing to read data.questions directly instead of
   data.choices[0].message.content. Keep finalizeQuestionBatch running
   client-side too as defense-in-depth.
4. Add a new services/supabaseClient.js that creates a Supabase browser client
   using SUPABASE_URL and SUPABASE_ANON_KEY (I will provide these after creating
   a free Supabase project — for now read them from a config object with
   placeholder values and a clear TODO comment for me to fill in). Add the
   Supabase JS CDN import to the import map in index.html the same way three/
   @mediapipe/tasks-vision are already imported there.
5. Do NOT touch the EEG bridge code (connectBridge/waitForLiveEEG/
   scheduleBridgeReconnect, ~lines 4330-4780), the Three.js scene, or the
   breathing intervention state machine — out of scope for this change.
6. Note in your summary that local dev via server.js / run_eeg_game.sh has no
   /api routing, so AI question generation should be tested on a Vercel preview
   deployment (or via `vercel dev`) — local runs will just fall back to the
   local question bank, which is expected, not a bug.
```

**我會點 review**：check `/api/questions.js` 完全冇 hardcode 任何 key、確認 client 邊個 file 都搵唔到 `sk-` 開頭嘅字串、開瀏覽器 devtools network tab 睇 request 有冇夾帶 key、確認冇改動 EEG/Three.js 相關 code。

---

### Prompt B — Supabase Auth 換走假登入（對應 P1-1，需要 Prompt A 先做完）

```
Goal: Replace the fake local login in services/authService.js with real Supabase
Auth, without changing how pages/auth/index.js calls it.

Context: services/authService.js login()/register() currently only check
username and never validate password. services/storageService.js handles
localStorage for lang/theme/user. services/supabaseClient.js (added in a prior
change) exports a configured Supabase client.

Do this:
1. Rewrite services/authService.js so login(username, password) calls
   supabase.auth.signInWithPassword and register(username, password) calls
   supabase.auth.signUp, but KEEP the same exported function names/signatures
   used by pages/auth/index.js so that page's code doesn't need to change.
2. On successful login/register, store the Supabase session/user in the same
   place storageService.js currently stores the fake local user, so the rest of
   the app (which reads the "current user" from storageService) keeps working
   unchanged.
3. Handle and surface auth errors (wrong password, user exists, etc.) using
   whatever error-display mechanism pages/auth/index.js already has for its
   current fake-login failure states.
4. Do not change the Setup/Game/Results pages at all.
```

**我會點 review**：用真實/錯誤密碼各試一次登入，確認錯密碼真係入唔到（而家假登入淨係睇 username，實測後對比）。

---

### Prompt C'（新版）— Results Dashboard：session 內前後對比 + 圖表 + 題目解釋回顧（對應 P1-2）

> **2026-07-04 決定**：原版 Prompt C 嘅「遊戲前 baseline test」會令用戶唔耐煩，取消。改為零摩擦方案：遊戲期間靜靜哋每 2 秒 sample 一次專注值，完場後喺 Dashboard 度做「本局前半 vs 後半」對比 + 專注曲線圖 + 跨 session trend + 答錯題解釋回顧。全部由 Claude Code 直接實作。

```
Goal: Upgrade the Results page into a Dashboard that proves progress with zero
pre-game friction: (a) within-session before/after (first half vs second half
average focus + recovery), (b) a focus-over-time curve for this session
(inline SVG, no chart library), (c) cross-session trend (from Prompt D data),
(d) the existing wrong-answer + explanation review restyled as a dashboard
card. Sample focus silently every ~2s during play into trainingAnalytics
(capped array), compute halves at session end, include them in the session
summary saved by appendSessionSummary, and render everything in
pages/results/index.js via new runtime exports following the existing
renderResults() DOM-by-id pattern. i18n strings in app/i18n.js (hk/en).
No EEG/camera dependency; works in all modes.
```

### Prompt C（舊版，已取消——保留做紀錄）— Pre/Post Baseline Test

```
Goal: Add an optional 60-90 second "baseline" reaction/accuracy test that runs
once before a session (Training or Challenge) and once after it ends, so
Results can show a measurable before/after comparison — this directly answers
the "how do you prove it actually works" judge question.

Do this:
1. Create pages/game/baselineTest.js exporting
   runBaselineTest({ mount, onComplete }). It should render 6-8 quick rounds
   into the given mount element: show a stimulus (reuse the Stroop word/color
   stimulus if that feature already exists, otherwise a simple "tap when the
   circle turns green" reaction task), record reactionMs (time between stimulus
   shown and click) and whether the answer was correct, then call
   onComplete({ avgReactionMs, accuracy }) with the aggregate.
2. Wire it in as a full-screen overlay injected into the existing #ui-container
   in pages/game/index.js mount() (~lines 125-161), calling runBaselineTest
   BEFORE runtime.startGameSession() for the "pre" pass, storing the result via
   app/state.js setState({ baselinePre: {...} }).
3. Call it again for the "post" pass right before results are shown — hook into
   the game-over path (showResults(), ~line 2504 in pages/game/runtime.js) or
   into pages/results/index.js mount() (~lines 88-104) before
   runtime.renderResults(). Store as baselinePost in state.
4. In pages/results/index.js, add a new section between the existing stats grid
   (~lines 34-53) and training panel (~lines 55-74) showing pre vs post
   reaction time and accuracy with a simple faster/slower, more/less-accurate
   indicator. Add a corresponding runtime.renderBaselineComparison() export in
   pages/game/runtime.js, following the same "write directly into DOM elements
   by id" pattern renderResults() (~line 2433) already uses.
5. This must work completely independently of EEG/camera state — it's pure
   click/tap timing, not a biometric signal, so it can never break Simulation
   mode or fail if a headset/camera isn't available.
6. Keep it skippable/optional from a Setup toggle (don't force it into every
   run) so the team can demo the plain flow if a judge is in a hurry.
```

**我會點 review**：跑一次完整 Training session，check baseline pre 同 post 兩次都跳出嚟、Results 頁有顯示前後對比、冇 EEG/camera 都一樣行得通（用 Simulation-fallback 路線試）。

---

### Prompt D — 跨 Session History + Trend（對應 P1-3，需要 Prompt A 先做完）

```
Goal: Store a rolling history of past session summaries (in Supabase if the
user is logged in, otherwise localStorage) and show a small trend view on the
Results page — this answers the "no longitudinal data" gap.

Do this:
1. Add a Postgres table via Supabase (write the SQL for me to run in the
   Supabase SQL editor) called session_history: id, user_id (references
   auth.users), ts, test_mode, difficulty, focused_ratio, avg_recovery_ms,
   accuracy, distance. Add a Row Level Security policy so a user can only
   read/write their own rows (user_id = auth.uid()).
2. Extend services/storageService.js with getSessionHistory()/
   appendSessionSummary(summary) that write to Supabase when a session exists,
   and fall back to a capped (last 10) JSON array in localStorage when there's
   no logged-in user or the network call fails.
3. Call appendSessionSummary at the end of renderResults() in
   pages/game/runtime.js (~line 2433-2465), right after the existing
   GAME_STATS.saveBest call, using accuracy/focusedRatio/averageRecoveryMs/
   CONFIG.totalDistance that are already computed there.
4. In pages/results/index.js, add a section after the training panel showing
   the last 5-10 sessions as a small inline SVG or CSS bar sparkline (no chart
   library — this project has no build step) for focus stability and recovery
   time. Add a runtime.renderHistoryTrend() export mirroring renderResults()'s
   pattern.
```

**我會點 review**：連續跑 2-3 次 session，check history 有無疊加、登出/離線狀態下 fallback 落 localStorage 係咪仍然work、Supabase table 嘅 RLS policy 用第二個帳戶登入試下攞唔攞到人哋啲資料。

---

### Prompt H — 自適應 Recovery 門檻 + Recovery Time Trend（對應 P1-5，全個計劃對「點樣切實改善專注力」最核心嘅答案，需要 Prompt D 先做完）

```
Goal: Make the focus-recovery threshold adapt to each user's own historical
performance instead of using fixed constants for everyone, and make Recovery
Time trend the headline "you are improving" proof on the Results page. This is
the mechanism that turns the product from "measuring focus" into "training
focus" in a way that is concretely measurable session over session.

Context: pages/game/runtime.js:350-359 defines FOCUS_TRAINING as fixed
constants (stableThreshold: 50, lowThreshold: 45, recoveryThreshold: 55,
triggerDurationMs: 5000, interventionDurationMs: 12000,
interventionCooldownMs: 10000, boostDurationMs: 5000) applied identically to
every user/session regardless of difficulty or history — DIFFICULTY_PROFILES
(line 100-116) only changes question age-band/skill pool, never these
thresholds. trainingAnalytics.recoveryDurationsMs (per-session array,
populated around line 680-689) already measures how long it takes focus to
climb back to recoveryThreshold after a dip — this is already the right
metric, it just isn't personalized or trended yet. Prompt D added
getSessionHistory()/appendSessionSummary() (services/storageService.js) and a
session_history table (Supabase, RLS-scoped per user) with avg_recovery_ms and
focused_ratio per past session.

Do this:
1. Before a session starts (wherever FOCUS_TRAINING is currently read to
   initialize a run), call getSessionHistory() and compute a rolling personal
   baseline from the last 5 sessions: avgRecoveryMs and avgFocusedRatio. If
   fewer than 3 past sessions exist, skip personalization entirely and use the
   existing fixed defaults unchanged — a first-time user must never be
   penalized with a harder bar on their very first run.
2. Build a per-session copy of FOCUS_TRAINING (do NOT mutate the shared
   constant) with two adjustments, both clamped to safe ranges so the game
   never becomes unplayable:
   - recoveryThreshold: nudge up from 55 toward a ceiling of ~65 as
     avgFocusedRatio improves across past sessions, a few points at a time
     (not a big jump session to session).
   - triggerDurationMs: nudge down slightly (tighter tolerance) as
     avgRecoveryMs improves, rewarding users who already recover fast, with a
     floor so it never becomes unfairly strict.
   Keep the formula simple and rule-based (clamped rolling average) — no ML —
   both because the timeline doesn't allow for it and because a simple formula
   is much easier to explain to competition judges than a black-box model.
3. Record which threshold value was actually used for a session as part of
   the summary passed to appendSessionSummary (extend the session_history
   schema from Prompt D with an adaptive_threshold_used numeric column), so
   the trend view can also show "your bar has been rising" as its own proof
   point.
4. On the Results page, elevate Recovery Time to the most visually prominent
   stat: extend renderHistoryTrend() (added in Prompt D) to show it as a
   trend line/sparkline with an explicit faster/slower arrow and a one-line
   label such as "your recovery speed vs your last 5 sessions" — this should
   read as the single strongest "you are improving" evidence on the page.
5. Do not touch the EEG bridge, camera/Simulation input paths, the Three.js
   scene, or the AI question logic — this only touches how FOCUS_TRAINING is
   resolved at session start and the Results/history display.
6. Log the resolved per-session threshold values to the console (or a small
   debug readout) during development so it's easy to verify the adaptation is
   actually happening without needing 20 real sessions to eyeball it.
```

**我會點 review**：用同一個測試帳戶連續跑 4-5 次 session（用 Simulation-fallback 就得，唔使日日等 EEG），睇 console/debug log 印出嚟嘅實際門檻數值係咪跟住之前幾次表現微調、確認新用戶（少於 3 次歷史）第一次玩唔會俾錯誤咁高嘅門檻卡住、Results 頁 Recovery Time trend 顯示方向正確。

---

### Prompt E — 真正互動 Stroop 題（對應 P1-4）

```
Goal: Add a real interactive Stroop stimulus to Challenge mode (currently
"Stroop" is only a metadata label, not an actual color/word mismatch task).

Do this:
1. Add an optional `type: 'stroop'` field to question objects (default all
   existing items to `type: 'mcq'` implicitly). A stroop item looks like:
   { type: 'stroop', word: 'BLUE', displayColor: '#ef4444', options: ['Red',
   'Blue','Green','Yellow'], answer: 0, explanation, skill: 'Stroop Trap',
   ageBand, source }.
2. Add 8-10 such items into the `hard` bank inside generateMockPuzzle
   (~lines 2919-2944 in pages/game/runtime.js), alongside the existing
   entries.
3. In validateQuestionItem/finalizeQuestionBatch (~lines 2607-2654), add a
   branch for type === 'stroop' that validates word/displayColor (must be a
   valid CSS color)/options.length === 4 instead of the normal question-text/
   explanation-length checks.
4. In renderPuzzle (~lines 2995-3019), branch on data.type === 'stroop': set
   qText.textContent = data.word and qText.style.color = data.displayColor
   (reset qText.style.color = '' for normal mcq items so style doesn't leak
   across question types). Do not change checkAnswer (~lines 3021-3074) — it
   already just compares selectedIndex to data.answer, which works unchanged.
5. Use the existing but currently-unused #question-timer DOM node (declared in
   pages/game/index.js ~line 109) to show a countdown specifically for stroop
   items, for time pressure.
6. Pair each color with a small text label/swatch for color-blind
   accessibility. Keep this Challenge-mode + hard-difficulty only — Training
   mode has no question panel at all (see applySessionModeUI, ~lines
   2566-2593) and must stay untouched.
```

**我會點 review**：入 Challenge Mode → Hard，check 有冇跳出真正顏色/文字唔一致嘅 Stroop 題、計時器有冇行、答啱答錯邏輯正常、Training mode 完全冇受影響。

---

### Prompt F — 跟進 Windows FPS 問題（對應 P2-1）

```
Goal: Continue diagnosing and fixing the Windows home-page low-FPS issue
tracked in debug-windows-home-fps.md, using the existing debug-point
instrumentation already wired into app/main.js, app/router.js,
services/runtimeLoader.js, pages/game/index.js, pages/game/runtime.js,
pages/home/index.js.

Do this: review the current debug-point telemetry output from the last
Windows test run, identify the remaining FPS bottleneck (renderer settings,
asset loading, transition timing — see the "Entry Stability And Render
Quality" section of docs/GAMEPLAY_UPGRADE_CONFIRMATION_2026-06-23.md for what
was already tried), apply a fix, and update debug-windows-home-fps.md's status
section honestly (it currently says fixed but the file title still says
[OPEN] — reconcile this either way).
```

**我會點 review**：喺實際 Windows 機/或者相近規格裝置度量返 FPS,對比之前個 debug log baseline。

---

### Prompt G — Repo 執手尾（對應 P2-3，留到 FPS 問題解決之後先做）

```
Goal: Clean up repo bloat and stale debug instrumentation before final
submission — only run this AFTER the Windows FPS work (Prompt F) is confirmed
done, since it removes the debug harness that work depends on.

Do this:
1. Remove EEG_2026_Windows.zip from the repo (git rm) and add it to
   .gitignore so it doesn't get re-added.
2. Remove all "#region debug-point ..." blocks and their associated
   fetch(DEBUG_SERVER_URL, ...) helper functions from: app/main.js,
   app/router.js, services/runtimeLoader.js, pages/game/index.js,
   pages/game/runtime.js, pages/home/index.js, eeg_bridge.py. Leave everything
   else in those files untouched.
3. Delete debug-windows-home-fps.md if the FPS issue is fully resolved, or
   fix its title/status mismatch if not.
4. Delete docs/_generate_exhibition_pdf.py (hardcodes a Mac-only absolute path,
   one-off script, not portable) unless I tell you otherwise.
```

**我會點 review**：確認 zip 真係喺 git history 減咗（或者至少之後唔會再入返嚟）、`grep -r "debug-point"` 全個 repo 應該零結果、site 喺 Vercel 上重新 deploy 一次確認冇壞。

---

### Prompt I — Focus Gates 專注閘門（對應 G-1，打磨層最高價值，同「可量度」thesis 直接扣連）

```
Goal: Add "focus gates" — periodic ring/buoy markers along the boat's forward
path that the boat passes THROUGH (not steers into), which "open/light up and
award a bonus" if the player's live focus is above a threshold at the moment of
passing, and "stay dim / count as missed" otherwise. Each gate is a discrete,
countable event so the session can report "you cleared 8 of 10 focus gates" —
turning passive "focus makes the boat faster" into an active moment-to-moment
goal AND a measurable focus metric.

Context: The boat moves forward on a fixed rail — pages/game/runtime.js:1276
does boat.position.z -= moveDist; there is NO steering/left-right input, so a
gate must be a pass-through timing challenge (is focus high enough as the boat
reaches the gate), not a spatial dodge. Live focus is available in the game loop
as focusLevel/effectiveFocusLevel (~line 1170-1185). There is an existing
static-scatter pattern to copy: createFloatingIslands() (line 4128) spawns
meshes down the -Z rail into islands[] (line 925). FOCUS_TRAINING thresholds
live at line 350-359. CONFIG.streak (line 29) and isFlowState (line 1177)
already exist. Do NOT add any new input/control system.

Do this:
1. Add a new module pages/game/focusGates.js (sibling module, keep runtime.js
   from growing) exporting createFocusGates(scene, THREE) and
   updateFocusGates(boatZ, currentFocus, deltaMs) — spawn ~1 gate every N
   meters ahead of the boat along -Z (reuse the scatter approach from
   createFloatingIslands but place them ON the rail at x≈0 so the boat passes
   through them), each a simple torus/ring mesh. Recycle gates that fall behind
   the boat back to ahead (so an endless session keeps having gates).
2. When the boat's z crosses a gate's z, evaluate currentFocus against a
   "gate threshold" (reuse FOCUS_TRAINING.stableThreshold, or the adaptive
   per-session threshold if Prompt H is already merged — read it, don't
   hardcode): >= threshold => mark gate cleared, light it up (emissive/bloom),
   play the existing correct sound (SOUNDS.correct), increment a gatesCleared
   counter and optionally CONFIG.streak; < threshold => mark missed, keep it
   dim, increment gatesTotal only. Track gatesCleared/gatesTotal on the session.
3. Surface a small live counter in the game HUD (e.g. "Gates 6/8") reusing the
   existing HUD styling, and include gatesCleared/gatesTotal in the results
   summary object that renderResults() (~line 2433) builds, so it shows on the
   Results page and (if Prompt D is merged) gets written to session_history.
4. This is CHALLENGE-and-TRAINING agnostic but must be feature-flaggable /
   easy to disable, and must not interfere with the question flow, the Box
   Breathing intervention, or the EEG/camera input — it only reads focusLevel
   and the boat's z position. Keep gate visuals cheap (a handful of ring meshes,
   recycled) so it doesn't hurt FPS on the Windows demo laptop.
5. Do NOT touch the EEG bridge, breathing state machine, water/boat physics
   shaders, or the AI question logic.
```

**我會點 review**：入 Training 同 Challenge 各跑一次，check 船經過光環嗰刻專注高就亮燈+加分、唔夠就 miss、HUD 個 counter 有郁、Results 頁有顯示 gates 8/10；用 Simulation-fallback 谷高谷低專注測 threshold 判定啱唔啱；開住 FPS 讀數確認冇明顯掉幀。

---

### Prompt J — 世界對專注反應 + Flow State 視覺回報（對應 G-2）

```
Goal: Make the existing decorative 3D world visibly respond to the player's
focus state, and give "flow state" a real visual payoff, so good focus is
unmistakably beautiful — reinforcing the neurofeedback thesis and the booth
wow-factor. Also recycle scenery so a long session never sails into empty ocean.

Context: pages/game/runtime.js has createFloatingIslands() (line 4128, into
islands[] at line 925) and createBalloons() (~line 4142) that scatter static
meshes ONCE into a fixed z band (roughly -500..500) and never move or react.
isFlowState (line 1177: focus>80 && streak>=3) currently only widens camera FOV
and applies 1.2x speed + adds a 'flow-state-mode' body class (line 1179).
bloomPass exists (line 3459). The main loop already computes focusLevel and
waveIntensity each frame.

Do this:
1. Recycle scenery: in the main loop, when an island/balloon falls behind the
   boat (its z is greater than boat.position.z by some margin), wrap it back to
   a random position ahead of the boat, so the world feels endless and no perf
   is wasted on meshes far behind. This is a contained change to the existing
   islands[]/balloons update.
2. Focus-reactive scenery: drive a subtle per-frame response from focusLevel —
   e.g. islands/balloons gently rise + brighten (emissive up) when focus is
   high, sink slightly + desaturate when focus is low. Keep it subtle and
   lerped (no jarring pops), and cheap (no per-frame allocations).
3. Flow-state visual payoff: when isFlowState is active, push a clear but
   tasteful escalation — raise bloomPass strength toward a capped max, warm/
   brighten the scene lighting or sky exposure a touch, intensify the existing
   boat wake/particle system — then lerp back smoothly when flow ends. Reuse
   the existing 'flow-state-mode' body class hook for any CSS-side glow on the
   HUD. Do NOT change game speed logic or the focus->speed mapping.
4. All of this must be gated behind the existing adaptive/perf profile
   (PERFORMANCE_PROFILE / particleMultiplier, ~line 89) so low-power devices
   and the Windows demo laptop can dial it down. Verify it does not regress the
   home-page/game FPS work.
5. Do NOT touch the EEG bridge, breathing intervention, question logic, or the
   water shader uniforms themselves — only scenery mesh transforms, lighting/
   bloom intensity, and particle intensity.
```

**我會點 review**：跑一段長 session 確認佈景會 recycle、唔會衝出空海；谷高專注睇下佈景/燈光/bloom 有冇 flow 回報、跌返落去有冇平順收返；喺低階裝置/Windows demo 機開住 FPS 讀數確認 flow state 唔會掉幀。

---

### Prompt K — UI/UX 可讀性：專注區間 band + 無字 onboarding + Results 層次（對應 G-3）

```
Goal: Make the on-screen focus feedback readable at a glance (including on an
iPad seen from a few steps away at a competition booth), teach a first-time
user what to do without words, and make the Results page lead with ONE headline
improvement number.

Context: The game HUD shows a raw 0-100 focus value and speed
(renderFocusTelemetry / renderSpeedTelemetry, ~line 1170-1185, 2399). There is
an unused #question-timer node and various HUD elements written by id. Results
is rendered by renderResults() (~line 2433) writing directly into DOM by id.
i18n strings live in app/i18n.js (hk/en). Do NOT restructure runtime.js.

Do this:
1. Focus-zone band: next to (or around) the focus number in the game HUD, add
   a three-state label/color band — Distracted / Stable / Flow — driven by the
   same thresholds already used (FOCUS_TRAINING at line 350-359, or the adaptive
   threshold if Prompt H is merged). This lets users read STATE, not just a
   number. Use color-blind-safe colors and pair color with the text label. Add
   the hk/en strings to app/i18n.js.
2. Wordless onboarding beat: in the first ~5-10 seconds of a session, show a
   brief non-blocking cue (a pulse/arrow + one short i18n line) that makes the
   "your focus drives the boat" mapping obvious — e.g. prompt the user to focus,
   and visibly start the boat moving as focus rises. It must auto-dismiss and
   never block the demo. Make it skippable / only-on-first-run if easy.
3. Booth readability pass on the game HUD: bump the key numbers' font size and
   contrast so they're legible from a few steps back on an iPad; make sure the
   focus HUD, speed, and (challenge mode) question panel have a clear visual
   priority order rather than competing equally for attention.
4. Results hierarchy (coordinate with P1-5/Prompt H): make the single most
   important "you improved" figure — recovery-time trend / improvement vs your
   last sessions — the visually dominant element on the Results page, and demote
   the secondary stats (distance, breathing count, etc.) to a smaller row.
5. Pure DOM/CSS/i18n changes — do NOT touch the EEG bridge, breathing state
   machine, Three.js scene, or question logic.
```

**我會點 review**：睇 HUD 個專注 band 三個狀態（分心/穩定/心流）切換啱唔啱、隔幾步睇 iPad 讀唔讀到；新開一次 session 睇頭 5-10 秒個 onboarding cue 出唔出到又自動收；Results 頁最大嗰個數字係咪 recovery-time 進步而唔係 distance；呼吸介入完成嗰下有冇明顯嘅「獎勵一刻」（發光+音效），5 秒 boost 期間 HUD 有冇特別狀態。

---

### Prompt M — 放大 EEG 裝置作用：雙軸心流 + 呼吸實時腦電 + 佩戴質素 UI（對應 P1-6）

```
Goal: Elevate the EEG headset from "a single number source" to the visible
protagonist of the product, using data it ALREADY sends but the frontend
ignores. Three features, all gated behind a single DEMO_MODE flag so raw-data
overlays can be shown at the competition demo but hidden with one switch in a
future product version.

Context: eeg_bridge.py already broadcasts {attention, meditation,
signal_quality} over WebSocket. pages/game/runtime.js receives meditation at
line ~4439 and stores it at ~4461, but it is ONLY shown in a hidden debug panel
(line ~4667) — gameplay uses attention alone. isFlowState (line 1177) is
`focusLevel > 80 && CONFIG.streak >= 3`. The Box Breathing intervention overlay
is rendered by renderBreathingIntervention() (~line 608-663). The team's core
product slogan is "focused AND relaxed" (專注但放鬆) — meditation data is
exactly the missing half of that slogan.

Do this:
1. Add a single `DEMO_MODE` boolean (default true) in a config location that's
   easy to flip (e.g. near the top of runtime.js CONFIG or a small
   services/demoConfig.js). Every raw-number overlay added below must render
   only when DEMO_MODE is true; the state-level effects (flow definition,
   breathing feedback message) stay in both modes.
2. Dual-axis flow (Real EEG mode ONLY): when the input source is the EEG
   bridge, redefine flow state as attention high (existing rule) AND meditation
   >= a threshold (start ~50, make it a named constant). In Simulation/camera
   modes there is NO meditation signal — keep the existing single-axis rule
   there unchanged, and make the code path explicit about this so it never
   reads undefined meditation. In DEMO_MODE, show a small two-axis indicator in
   the HUD (Focus / Relax as two mini-bars) so judges can see both channels
   moving independently.
3. Breathing intervention live feedback (Real EEG mode ONLY): while the Box
   Breathing overlay is active, show the live meditation value as a gently
   rising bar or mini-sparkline inside the existing breathing overlay, with an
   i18n line (hk/en, add to app/i18n.js) like「部機見到你個腦冷靜緊落嚟」/
   "The headset can see your brain calming down." If meditation does not rise,
   show nothing judgmental — just the live value. In Simulation mode, hide this
   entirely (never fake it — the team's credibility depends on Simulation being
   clearly labeled as simulation).
4. Wear/signal-quality chip: a small persistent HUD chip showing headset
   contact quality derived from signal_quality (good / weak / no contact),
   visible in Real EEG mode regardless of DEMO_MODE (it's an operational
   necessity, not a demo flourish) — this also makes booth troubleshooting
   instant (bad contact is the #1 real-world failure mode). Reuse the existing
   setEEGConnectionState() plumbing (~line 4448) rather than adding a parallel
   status system.
5. Do NOT touch the water/boat physics, question logic, or the breathing state
   machine's timing/logic itself — only its overlay content. Do not change
   what Simulation mode reports about itself.
```

**我會點 review**：戴住 MindWave 行一次 Real EEG session——HUD 見到 Focus/Relax 兩條 bar 郁；除低頭帶睇 signal chip 有冇即刻變「no contact」；焗自己觸發呼吸介入，睇 overlay 入面 meditation 值有冇實時更新；切去 Simulation mode 確認所有 EEG-only UI 完全唔出現；將 DEMO_MODE 較 false 再行一次，確認原始數字 overlay 收晒但心流/呼吸機制照行。

---

### Prompt L — 第二訓練環境「Voxel 書房」（對應 G-5，P2 尾，時間唔夠就跳過）

```
Goal: Add a second, selectable 3D training environment — a cozy voxel-style
study room / library (Minecraft-like aesthetic built purely from Three.js
BoxGeometry primitives; do NOT use any Minecraft assets, textures, or the name
anywhere in UI/code) — for users who find the ocean/boat scene overstimulating.
This is an ADHD-friendly design choice: some users need LESS dynamic stimulus,
so this scene is deliberately near-static, with focus feedback carried by
lighting and small ambient details instead of motion.

Context: The current ocean scene lives inside pages/game/runtime.js (Three.js
scene, boat, water, sky — a 5,218-line monolith; do NOT restructure it). New
features are being added as sibling ES modules. The game loop already computes
focusLevel every frame, and isFlowState exists (line 1177). Setup page
(pages/setup/index.js) already has a multi-step chooser flow driven by
state.setupStep in app/state.js.

Do this:
1. Create pages/game/environments/voxelStudy.js exporting an environment
   object: { init(scene, THREE, performanceProfile), update(focusLevel,
   isFlowState, deltaMs), dispose() }. Build the room ONLY from instanced
   BoxGeometry meshes and simple materials: walls of voxel bookshelves, a desk,
   a window, a few floating dust motes. No external models, textures, or new
   assets. Use InstancedMesh and cap total instance counts so it runs on the
   Windows demo laptop; respect the existing PERFORMANCE_PROFILE /
   particleMultiplier (~line 89) scaling.
2. Focus feedback design (deliberately calm — this is the whole point):
   - window light: warms and brightens as focus rises, dims/cools when
     distracted (lerped, slow)
   - desk lamp: soft steady glow when stable, gentle flicker when distracted
   - flow state: a few books float up slowly and glow faintly; they settle
     when flow ends
   - camera: fixed position with an extremely slow subtle drift; NO forward
     motion, NO bobbing
3. Environment selection: add a simple environment picker step or toggle in
   pages/setup/index.js (ocean voyage / study room), stored in app/state.js,
   defaulting to the existing ocean scene so nothing changes for current
   users. In the game bootstrap, if study room is selected, skip creating the
   boat/water/sky and init the voxel environment instead. All HUD, focus
   input, breathing intervention, questions, and analytics must work
   identically in both environments — they read focusLevel, not the scene.
4. Distance/speed stats don't apply in a static room: when this environment
   is active, show "focused time" in place of distance in the HUD and Results
   (the value already exists as trainingAnalytics.focusedTimeMs).
5. Keep the whole feature skippable: if this module fails to load, fall back
   to the ocean scene with a console warning rather than blocking the game.
   Do NOT modify the ocean scene code paths beyond the single branch point
   that chooses which environment to init.
```

**我會點 review**：Setup 度揀「書房」入到去——望落係咪一間 voxel 書房而唔係空海；用 Simulation-fallback 谷高谷低專注，睇窗光/燈/漂浮書本有冇跟住反應；HUD 同 Results 顯示 focused time 而唔係 distance；切返「海洋」環境確認原有玩法一啲都冇變；喺 Windows demo 機開 FPS 讀數行一次。

---

### Prompt N — 字體統一：Orbitron 只留喺遊戲畫面（對應 U-1）

```
Goal: Reduce font variety across the site. The site has three fonts defined in
styles/shared/base.css: --font-main ('Inter', body), --font-display
('EB Garamond', headings), and --font-tech ('Orbitron', sci-fi numbers). The
homepage only uses --font-display + --font-main. Keep --font-tech (Orbitron)
ONLY inside the actual in-game 3D HUD; every other page should match the
homepage pairing.

Do this:
1. Find every use of var(--font-tech) OUTSIDE the live game HUD and replace it
   with the appropriate homepage font: use var(--font-display) for heading-like
   / emphasis text and var(--font-main) for body/label text. Known locations to
   change: styles/pages/setup.css (6 uses), styles/pages/results.css (2 uses),
   styles/shared/utilities.css (3 uses — CAUTION: these are shared utility
   classes; check which pages actually apply them and make sure changing them
   doesn't alter the in-game HUD; if a utility class is used by the game HUD,
   split it rather than break the game look).
2. KEEP --font-tech (Orbitron) in styles/pages/game.css (the 5 uses:
   ~line 27, 282, 611, 775, 792) and the monospace in runtime.js (~line 773) —
   that is the deliberate gameplay aesthetic the product owner wants to keep.
   The line game.css:401 already uses --font-main; leave it.
3. Do not touch the --font-* variable definitions themselves in base.css, and
   do not remove the Orbitron @import from index.html (the game still needs it).
4. After the change, the only place Orbitron appears on screen should be the
   live 3D game HUD. Setup, Results, Auth should visually read like the
   homepage.
```

**我會點 review**：開 Setup、Results、Auth 逐頁望，確認啲數字/標題唔再係 Orbitron（變返 EB Garamond / Inter）；開 game 入面確認 HUD 嗰啲科技感數字**仍然**係 Orbitron；特別留意 utilities.css 改完冇連累到 game HUD 個 look。

---

### Prompt O — 更多動畫：選單/結果頁 polish，遊戲內克制（對應 U-4）

```
Goal: Add tasteful animation polish to the marketing/menu surfaces (Home,
Setup, Results) for wow-factor and product feel, while keeping the in-session
training experience deliberately calm (ADHD low-noise guardrail).

Context: The homepage already has scroll-reveal (fade-up-element via
IntersectionObserver in pages/home/index.js mount ~line 396-407), animate-float,
and glass-card hover transitions. A transition loader already exists for route
changes. Fonts/colors are theme-aware (light/dark). Do NOT add ambient motion
to the live training game beyond reward moments.

Do this (marketing/menu surfaces — go for polish):
1. Home: add a hero entrance animation on load (staggered fade/slide of the
   title, subtitle, CTA), a subtle animated background motif that fits the
   product (e.g. a slow-moving EEG-wave / aurora gradient — CSS only, cheap),
   and number count-up animations for any stat figures.
2. Setup: animate transitions between the setup steps (slide/fade as
   state.setupStep changes) and add clear selection-feedback animation when a
   mode/difficulty is chosen.
3. Results: count-up the key numbers, and draw-in the trend sparkline
   (from Prompt D/H) rather than popping it in.
4. Route transitions: smooth the page-to-page handoff using the existing
   transition loader rather than a hard swap.

Do this (in-session training — stay calm, this is the guardrail):
5. Inside the live game, do NOT add new ambient/background animation. The ONLY
   new animation allowed here is on REWARD moments: a focus-gate cleared
   (Prompt I), the post-breathing 100% boost (make the existing boost visibly
   celebratory — glow + brief particle burst + sound), and flow-state entry
   (Prompt J). These are earned, discrete, positive — consistent with the
   ADHD-friendly design (reward, not noise).

Constraints: all animations must respect prefers-reduced-motion (provide a
reduced/none path), must not regress FPS on the Windows demo laptop (test with
the FPS readout), and must not touch the EEG bridge, breathing state-machine
logic, or question logic.
```

**我會點 review**：開 Home 睇入場動畫 + 背景 motif 順唔順、有冇掉幀；Setup 揀模式睇過場同選擇回饋；Results 睇數字 count-up + sparkline draw-in；**最緊要**入 game 確認訓練期間畫面依然平靜、只有通過 gate / boost / flow 嗰下先有慶祝動畫；開 OS 嘅 reduce-motion 設定確認有 fallback。

---

### 文案 humanize — voice guide + 示範改寫（U-2，由 Claude Code 直接做，唔使 TRAE）

> 呢部分**唔係一個 TRAE prompt**——係我（Claude Code）直接起草雙語文案、同你逐句 iterate，滿意先 commit + push。以下係我會跟嘅 voice guide，等你知道個方向、可以隨時話我調整。

**文案原則（humanized 即係咩）：**
- **講返人話**：好似同一個中學生朋友解釋，唔好似 marketing slogan 或者 AI 生成
- **誠實、唔過度宣稱**：唔好講「解鎖大腦無限可能」「釋放學術潛力」呢類——一嚟浮誇，二嚟正正係評判會質疑嘅過度宣稱（plan 前面已 flag）
- **有溫度、唔責備**：分心唔係「你失敗咗」，係「拉返你入狀態」
- **具體過抽象**：「一次大約 5 分鐘，你會即刻見到自己專注點影響個畫面」好過「體驗革命性神經科技」
- **中文係主場**：香港中學隊，中文要似真人講嘢，英文係輔助

**示範改寫（現有 → humanized）：**

| 位置 | 現有（浮誇/robotic） | Humanized 方向 |
|------|---------------------|----------------|
| Home CTA 段 | 「今天就開始你的第一次訓練，解鎖大腦無限可能！」 | 「一次大概幾分鐘。開始之後，你會即刻見到自己專注嘅時候，個畫面點樣跟住變。」 |
| Home CTA 標題 | 「準備好釋放你的學術潛力嗎？」 | 「想試下用另一種方法練專注？」 |
| 裝置連接卡 | 「支援主流腦電波儀器，透過藍牙高速連接」 | 「而家用緊 MindWave 腦電波頭帶；架構上可以擴展去更多裝置。」（同 P0-3 一致，唔亂認 Muse/Emotiv） |
| 科學段 | 把 Alpha/Beta 講到好絕對 | 「我哋用 Alpha／Beta 作為『專注同放鬆之間平衡』嘅設計框架」（同 PROJECT_ANALYSIS.md 建議一致，唔講成臨床定律） |

**我點做**：我 pull 最新 repo → 改 `app/i18n.js`（hk/en）同 `pages/home/index.js` 入面嘅 `dualText()` 串 → 將改咗嘅逐句貼返俾你睇 → 你 OK 我先 commit + push。你完全唔使掂 code。

---

### Footer 法律考量 + 隱私政策（U-3，由 Claude Code 直接做）

> **我唔係律師，以下係為一個學生比賽 prototype 而寫嘅「誠實、克制」版本，唔係正式法律意見。** 一旦將來真係商業化收錢，先好搵人做正式法律審查。但為咗比賽，一頁誠實嘅隱私政策**係加分**，因為你哋真係掂緊 EEG / 鏡頭 / 帳戶數據。

**Footer 具體改動**（`pages/home/index.js:324-327`）：
- **刪走**：「服務條款」（Terms of Service）、「技術支援」（Support）——未做、對一個 demo 唔必要、死連結反而扣分
- **保留變真**：「隱私政策」→ 一頁誠實 policy；「聯絡我們」→ 放一個真 email（你俾我個 team/聯絡 email，我填入去；未有就先留 placeholder）

**隱私政策要誠實 cover 嘅嘢（香港 PDPO 脈絡）：**
1. **收咩數據**：帳戶（Supabase 嘅 email/username）、專注 session 數據（分數、recovery time、歷史）、鏡頭、EEG（attention/meditation 值）
2. **最重要嘅誠實賣點——鏡頭係本機處理**：MediaPipe 喺瀏覽器本機分析臉部特徵，**唔會上傳或儲存任何影片**（呢個係真嘅，見 `focusInputService.js`）——呢句一定要清楚講，係好大嘅隱私加分
3. **EEG 同樣本機處理**：經本地 Python bridge 讀 attention/meditation，只有**彙總嘅 session 數字**會存去 Supabase，唔存原始腦電波串流
4. **唔賣、唔分享**畀第三方
5. **未成年人**：因為目標用戶包括學生/兒童，講明未成年用戶應由家長/監護人同意及陪同（PDPO 冇硬性年齡線，但呢個係誠實 + 負責任嘅講法，評判會欣賞）
6. **刪除數據途徑**：留個 email，用戶想刪帳戶/數據可以聯絡
7. **明確講呢個係比賽/研究用 prototype**，唔係醫療產品、唔提供醫療診斷或治療（同全 plan 護欄一致）

**我點做**：起一頁 `privacy.html`（或者 SPA 內一個 `#privacy` 路由，跟你哋現有 hash router 風格）+ 改 footer 連結 → 全部畀你睇過 → 你 OK 我先 push。

---

## ADHD-friendly 設計原則（貫穿所有 prompt 嘅護欄，唔係一個獨立功能）

對外一律講「**專注力訓練工具，目標係長期改善**」，唔講治療、唔講醫 ADHD——證據門檻同監管風險先唔會爆（`PROJECT_ANALYSIS.md` 自己都係咁建議）。但設計上刻意照顧專注力弱嘅用戶，每個 gameplay/UI prompt 執行時都應該對照呢五條：

1. **短 session 優先**——現有 30 秒至 30 分鐘時長設定已經啱，demo 預設應該揀短
2. **高頻、離散嘅獎勵**——Focus Gates（Prompt I）每一個 gate 就係一次即時獎勵；呼吸後 5 秒 boost 要睇得見（Prompt K）
3. **低雜訊畫面**——HUD 每一刻只有一個視覺主角（Prompt K）；接受唔到動態刺激嘅用戶有 Voxel 書房（Prompt L）
4. **即時、唔懲罰嘅回饋**——分心唔係「衰咗」，係「船搖咗，拉返佢」；文案永遠唔好用責備語氣
5. **可預測結構**——每次 session 流程一樣（開始→訓練→呼吸介入如需要→結果），唔好加 random 事件嚇用戶

呢五條係評判問「點解話適合專注力弱嘅人」時嘅標準答案，亦係將來產品化嘅設計地基。

---

## 長遠賺錢方向（比賽之後先深入，而家淨係留低方向）

- **短期**：用比賽成績/曝光去 approach 學校、補習社，賣 workshop/體驗環節。
- **中期**：而家為咗比賽起嘅 Supabase 帳戶系統，比賽後可以直接變成訂閱產品嘅地基——特別係 **camera-only（唔使 EEG 頭帶）嘅版本**，因為冇硬件成本先係最易規模化去學校/家庭市場嗰條路線（`PROJECT_ANALYSIS.md` 自己都咁分析）。
- **中期**：而家順手加一個 email waitlist（用返同一個 Supabase，多一個 table 就夠）擺喺 Home page，等現場評判/參觀者可以留低聯絡方式——比賽當日嘅人流就係第一批潛在客戶/資料，呢樣嘢好平就做到，如果 P1 做晒仲有時間可以加。
- **長期**：多感測器版本（camera + HRV + 互動節奏）、AI 個人化難度、報表系統——即係內部文件講嘅路線圖，比賽後先詳細規劃。
- **留意**：一旦真係開始收錢/處理未成年人嘅生物訊號數據，要提早了解返 PDPO（香港個人資料私隱條例）同埋家長同意嘅要求——而家唔使做，但比賽後要放喺待辦清單頭幾位。

---

## 驗證方法

- **P0-1 完成後**：Vercel preview deploy 一次，devtools network tab 檢查所有 request 冇夾帶任何 key；`/api/questions` 手動 curl 測試 valid/invalid payload 都要有正確回應。
- **P1 功能（baseline test / history / stroop）完成後**：分別喺 Training Mode 同 Challenge Mode、Real EEG 同 Simulation-fallback 路線，各行一次完整 Setup→Game→Results，確認新功能唔會令現有流程斷咗。
- **P1-5（自適應門檻）完成後**：用同一個帳戶連續跑 4-5 次 session（Simulation-fallback 就夠快），確認門檻隨表現微調而唔係跳動、新用戶首次遊玩用返預設門檻、Recovery Time trend 方向正確。
- **P1-6（EEG 放大）完成後**：必須用實機 MindWave 驗（配合 P0-2 rehearsal 同一日做最慳時間）——雙軸 bar 有郁、除頭帶 signal chip 即變、呼吸 overlay 實時 meditation 有更新、Simulation mode 下所有 EEG-only UI 完全唔出現、DEMO_MODE=false 收晒原始數字但機制照行。
- **G 打磨層（Focus Gates / reactive 世界 / UI-UX / Voxel 書房）完成後**：每個新功能都要喺 Windows demo 機開住 FPS 讀數行一次，確認冇掉幀；Focus Gates 要用 Simulation-fallback 谷高谷低專注測 threshold 判定；Voxel 書房要確認切返海洋環境時原有玩法零改變；確認全部改動都冇整爛 EEG / 呼吸介入 / 出題流程（呢三個係明確劃咗界唔准郁）。
- **U 打磨層（字體 / 文案 / Footer / 動畫）完成後**：字體——逐頁確認 Orbitron 只剩喺 game HUD；文案——你逐句睇過先 push；Footer——確認冇死連結、隱私政策一頁揀得開、聯絡 email 撳到；動畫——訓練期間畫面依然平靜（只獎勵一刻有慶祝）、開 reduce-motion 設定有 fallback、Windows 機 FPS 冇跌。
- **P2/P3**：喺實際比賽會用嘅 Windows 手提電腦 + iPad 上面各行一次完整流程（包括斷網、EEG 斷線、切 Simulation 嘅救場流程），並喺最後一星期至少完整綵排兩次。

---

## 進度紀錄（每次改動後更新）

| 日期 | Prompt / 項目 | 狀態 | Commit | 備註 |
|------|--------------|------|--------|------|
| 07-04 | Prompt A — Vercel proxy + 撤走前端 key | ✅ 完成 | `bbec2301` | Claude Code 直接實作（TRAE sandbox 問題後接手） |
| 07-04 | Supabase keys 填入 + plan 改 Dashboard 方案 | ✅ 完成 | `f012f0f1` | baseline test 取消，改 C' |
| 07-04 | Prompt B — Supabase 真登入 | ✅ 完成 | `4e259748` | 離線自動 fallback 本地模式 |
| 07-04 | Prompt D — 跨 session history | ✅ 完成 | `9f01445c` | SQL 喺 docs/supabase_schema.sql，**用戶要去 Supabase SQL Editor 行一次** |
| 07-04 | Prompt C' — Results Dashboard | ✅ 完成 | `31a27261` | 專注曲線 + 前後半對比 + 趨勢 + 題目回顧 |
| 07-04 | Prompt E — Stroop 互動題 | ✅ 完成 | `785ef1f1` | Hard mode，9 秒倒數 |
| 07-04 | Prompt H — 自適應門檻 | ✅ 完成 | `ded3f46c` | Console 有 [Adaptive] log 可驗證 |
| 07-04 | Prompt N — 字體統一 | ✅ 完成 | `5aab7ba2` | Orbitron 只留 game HUD |
| 07-04 | Prompt I — Focus Gates | ✅ 完成 | （見本 commit） | 新 module pages/game/focusGates.js，HUD 有 🎯 counter，Dashboard 顯示通過率 |
| 07-04 | Prompt K — 專注區間 chip + 開場教學 + boost 慶祝 | ✅ 完成 | （見本 commit） | 分心/穩定/心流三態；呼吸後 boost 有 🔥 動畫+音效 |
| 07-04 | Prompt J — 心流 bloom 視覺回報 | ✅ 完成（縮窄版） | （見本 commit） | 原定 islands/balloons 反應：發現嗰啲佈景一早被移除咗，故只做 bloom 部分；Focus Gates 補上世界視覺趣味 |
| — | Prompt M — EEG 放大（雙軸/呼吸實時腦電/訊號chip） | ⬜ 未做 | — | 要實機 MindWave 驗證，下一批 |
| — | Prompt L — Voxel 書房 | ⬜ 未做 | — | P2 尾 |
| — | Prompt O — 動畫 polish | ⬜ 未做 | — | |
| — | Prompt F — Windows FPS | ⬜ 未做 | — | 要 Windows 實機 |
| — | Prompt G — repo 執手尾 | ⬜ 未做 | — | 最後先做 |
| — | 文案 humanize + 隱私政策 | ⬜ 未做 | — | Claude Code 同用戶逐句傾 |
| — | Merge feature branch → main（正式出街） | ⬜ 未做 | — | 全部測完先做 |

**用戶待辦**：① Supabase SQL Editor 行 `docs/supabase_schema.sql`；② Supabase 關 Confirm email；③ Vercel 加多一條 `DEEPSEEK_API_KEY` 俾 Preview 環境（Production 嗰條掂唔到就另加一條 scope 做 Preview）。
