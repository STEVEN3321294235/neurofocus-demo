# NeuroFocus IEYI 計劃 V2（2026-07-16 更新・唯一有效版本）

> **全 repo 得呢一份 plan。** 展覽 / 答辯嘅參考大全喺另一份 [`docs/EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md)。
>
> **一句總覽**：後端 / 登入 / key 安全 / 證據鏈 / EEG 放大 / UI reskin / 書房移除 / repo 清潔 / 文件整合 —— 全部已完成並喺 `main`。
> Repo 而家**只有一條 `main` branch**，Claude 同 TRAE 都直接喺 `main` 做嘢。
>
> **剩低嘅工作分三條線：**
> - **【D3 學習模式】✅ 全部完成（2026-07-16）**：負責老師要求做「紙本 vs 平台」對照實驗 → 已建成第三個 Session 目標「學習模式」（閱讀器＋固定審核卷測驗＋溫習/答題兩階段數據＋CSV 匯出），訓練/挑戰模式一行 code 都冇郁。老師教材已數碼化入庫。詳見 §5 D3。**賽前仲要做嘅係 2–3 個學生嘅 pilot 實驗**（人手，見 §6）。
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
>
> **2026-07-11 深夜 第四輪（「無法進入遊戲」修復，Steven 截圖回報）**：
> ⑬ **啟動看門狗真正接上**：舊 code 宣告咗個 startup timeout 但從來冇 arm——任何一個載入請求 hang 死（網絡慢/CDN 卡住）就會**無限 Loading**。而家入場 25 秒未 boot 完 → 自動收隊、彈雙語提示、帶返 Setup 頁再試；boot 成功一刻即解除（唔會誤殺慢機開場倒數）。
> ⑭ **Simulation／相機模式唔再等 AI 題**：載入唔再有「準備題庫」呢步——本地題庫**即秒**入場，AI 題 4 秒後靜靜哋喺背景補上（夠題就自動換用）；EEG 模式先保留「AI 優先、8 秒可中斷」嘅等待。效果：模擬模式由「等 AI 慢就卡」變成幾秒內必入場。
>
> **2026-07-12 → 07-15 第五輪（老師實驗 → D3 學習模式立項）**：
> ⑮ 負責老師開會要求做**對照實驗**（紙本讀 vs 平台讀，同卷測驗，比較成績＋介入後恢復時間）→ 定案做**第三個 Session 目標「學習模式」**（詳見 §5 D3）：閱讀器（每頁 3 分鐘上限、可提早跳下一節）、海景無船背景、溫習/答題兩階段數據斬開、CSV 匯出、編號式學生 ID（S01/S02/S03）。**實驗計分用 AI 預先生成＋老師審核＋鎖死嘅固定卷**（AI 每次生成必然唔同，唔鎖卷實驗就唔公平）。
> ⑯ 手冊 Box Breathing 描述修正（Steven 直接喺 GitHub 改）：呼吸引導係一輪 4-4-4（12 秒），舊文案寫「兩輪」唔啱——已對返 code 核實（`interventionDurationMs: 12000`）。
>
> **2026-07-16 第六輪（D3 學習模式：由立項到全部完成，同日）**：
> ⑰ **D3-1**：Setup 第三張目標卡「學習模式 / Study Mode」＋學科（生物可入＋化學/物理/歷史 🔒）＋深度（基礎/進階）＋共用輸入來源/相機步驟。
> ⑱ **D3-2**：閱讀器＝螢幕**右邊圓角磨砂面板**（跟深淺色變白/黑、闊約 60vw、唔重疊左邊 HUD）；**筆記式排版**（標題/段落/重點列表/名詞解釋/重點框）；計時器內嵌；**每頁最少讀 15 秒先解鎖「下一頁」、最多 3 分鐘自動揭頁**；收起船/航道/浮標，海景無船；經現有 pause 管線凍結頁計時。
> ⑲ **D3-3**：閱讀期間專注監測——喺閱讀→測驗交界 snapshot 專注穩定度、分心恢復次數、呼吸介入、平均恢復、每頁用時，供 Study Results 斬開兩階段。
> ⑳ **D3-4**：答題階段——撳「進行測驗」後閱讀器收起、**船同航道返場**、用該材料嘅**固定審核卷**行返正常題目流程（唔經 AI/隨機）；記低每題用時＋答題時專注。
> ㉑ **D3-5**：Study Results——📖 溫習階段卡＋✍️ 答題階段卡疊喺挑戰式分數/答錯回顧上面；**「匯出 CSV」掣**（每場一行、學生編號、本地下載唔經伺服器）。報告喺 showResults() 未 dispose 前建立，refresh 由 snapshot 還原。
> ㉒ **D3-6**：學習模式**正式站解鎖**（額外學科維持鎖住）；reading→quiz→results→CSV 全流程 headless 深淺色實測 ✅。
> ㉓ **教材（老師提供，已數碼化）**：生物「細胞膜與物質運輸」——基礎（初中，4 sub-topic）＋進階（高中，4 sub-topic＋延伸節），雙語筆記，各 **10 條**審核 MC（老師卷 8 條＋補 2 條同標準）。存 `pages/game/studyMaterials.js`，老師可直接審核/取代。
> ㉔ **同批打磨（Steven 07-16 指示）**：每頁最短閱讀 60 秒→**15 秒**；學習模式設定面板**刪走鏡頭距離＋音量**兩組；Setup **移除頂部引導步驟**、電腦上**拉闊**、學科**每行一個**、目標說明**加返學習模式**；**Auth 手機置中**＋短螢幕遊戲 HUD 微調。模組版本 `2026-07-16-3`。
>
> **2026-07-17 第七輪（Steven 六點回饋打磨）**：
> ㉕ **閱讀器**：字體改**襯線（EB Garamond + CJK serif）**、放大（`--sr-fs` clamp 隨螢幕縮放，全部標題/內文/名詞/掣一齊 scale）、面板**拉高拉闊**（`min(66vw, …)` × `min(90vh, 52rem)`）；呼吸介面文字**加深色 halo 陰影**（喺白色閱讀器上都睇得清）。
> ㉖ **HUD 修復**：Focus 標籤三格（名稱＋狀態 chip＋%）加 flex 收縮規則——「DISTRACTED」再長都唔會逼走 %（名稱先縮、chip 再縮、% 永遠見）；彈出提示防重疊（呼吸提示出現時收起航程 cue；學習模式大 boost flash 改成細 cue、擺去閱讀器左邊唔遮）。
> ㉗ **Setup 拉闊**：`.setup-panel-compact` 由 **760px → min(96vw, 1440px)**（實測 1512 螢幕面板 1440px、目標卡三欄一行、唔使捲）；框感減淡。
> ㉘ **Results**：跨場趨勢圖 0 值改顯示「—」（＝嗰局冇分心要救，唔係漏數據）＋過濾冇 focus 數字嘅舊 row；**學習模式隱藏跨場趨勢卡**（study 數據喺溫習/答題卡＋匯出，唔喺 training/challenge 歷史）；新增**「匯出 PDF」**（用瀏覽器 print-to-PDF 直接 capture 成頁、含**用戶名＋email**頁首、圖表照印、自動展開答錯卡）——login/register 會記住 email 俾匯出用；CSV 仍保留做原始數據。
> ㉙ **紙本教材**：新增 `docs/STUDY_MATERIALS_PRINT.md`——由 `scripts/gen_materials_md.mjs` 程式生成，同平台版逐字一致，實驗紙本組直接印。模組版本 `2026-07-17-1`。
>
> **2026-07-17 第八輪（Steven 四點回饋・效能急救）**：
> ㉚ **閱讀器高度**：由「垂直置中（`top:50%`＋translateY）＋固定 `min(90vh,52rem)` 高」改成**上下錨定**（`top: clamp(4.4rem,7vh,6rem)`、`bottom: clamp(0.75rem,1.6vh,1.6rem)`）——面板永遠喺頂列**按鈕下面**、唔再遮住右上角掣，同時食滿剩餘高度。
> ㉛ **⚡ FPS 急跌急救（最高畫質由 120 跌到有時 <60）**：查出三個**逐幀**成本源並修好——(a) 主題切換後 `envState.isTransitioning` 冇 set 返 `false`，令一段**重 per-frame lerp ＋ boat.traverse 永遠行落去** → progress 滿咗即 stop；(b) 暫停檢查每幀 `getComputedStyle(warningEl)` **強制同步 style recalc** → 改用 `matchMedia` cache（`portraitBlockActive`，只喺 resize/orientation 時更新）；(c) 閱讀器 `backdrop-filter: blur(20px)` 罩住 66vw×90vh 動畫場景**每幀 GPU 重算** → 收細到 `blur(7px)`＋加厚面板底色補償。另外學習頁計時器/下一頁掣加 `dataset` 去重，唔再每 tick 重砌 DOM。
> ㉜ **匯出 PDF 補 email**：`authService` 新增 `nf_user_email`（login/register 都記低）＋ `syncUserEmail()`（舊用戶由 Supabase session 回填），Results 頁首而家真係印到登入 email。
> ㉝ **Setup 右上設定選單**：齒輪掣 → **重設所有數據**（清進度/歷史/結果＋雲端 session rows，保留登入＋語言/主題）＋**刪除帳戶**（清晒數據＋email＋登出＋返主頁）；兩個都有中文確認彈窗，`storageService` 加 `resetAllData()`/`deleteAccountData()`。模組版本 `2026-07-17-2`。全部 headless 實測 ✅（Setup 選單 12/12、遊戲 4 秒 render loop 零錯）。
>
> **2026-07-17 第九輪（老師回饋 → 答辯策略大轉向・純文件）**：
> ㉞ **策略轉向**：老師睇完話「技術夠分，但展示訊息唔清、三部份未有綜合感、太 technical 會冗長」。正式答辯改為 **3–4 分鐘、PPT 主導、問題行先、淨係現場 demo 學習模式（一個模式串起成個閉環）、technical 全部落 Q&A**。
> ㉟ **答辯包（Steven 指示改為唔開新 MD）**：內容全部併入**手冊 Part 6**（策略＋demo 時間分析＋PPT 大綱連 **Canva prompt**＋分段講稿 A–E＋A0 海報）；Q&A 併入 Part 7、Pros & Cons 併入 Part 9。曾短暫存在嘅 `IEYI_PRESENTATION_PACKAGE.md` 已刪。
> ㊱ **細船建議 → ❌ 唔做（Steven 07-17 拍板）**：曾建議閱讀階段角落加細船補「綜合感」，Steven 決定**維持原設計**（閱讀時收船，免分散閱讀注意力）；「綜合感」由「一個閉環」敘事＋測驗階段船返場負責。呢項已 closed，唔使再提。
> ㊲ **⏱️ Demo 時間重新分析（Steven 07-17 指正）**：學習模式每頁鎖 15 秒 ×5 頁＋10 條 MC，完整流程機械下限 ≈2.5–3 分鐘，**現場行唔晒**。新方案（手冊 6.2）：現場只 demo 閱讀第 1 頁＋分心→呼吸介入；測驗用截圖；儀表板**切去朝早預先完成場次嘅 Results tab**；另備成套錄屏做保險。（⚠️ 呢個方案已被 ㊴ 取代：改為**全預錄影片、零現場操作**。）
> ㊳ **Part 9 Pros/Cons 重整（Steven 07-17 指示）**：Pros 8 項按最新狀態重寫（老師認證題目、閉環一個模式示範完、webcam 無門檻、過程數據、教育落地、Q&A 技術彈藥、誠實框架）；Cons 收窄剩 4 項**真・弱點**（EEG 脆弱／單通道語義／科學敘事／介入單一），已解決項（訊息唔清、綜合感、長期實證）同風險項（Simulation 誤會、醫療定位）搬離 Cons，下面加咗**逐項收窄建議**。
> ㊴ **Part 5/6 大重組（Steven 07-17 第三輪指示）**：答辯改為**零現場操作**——S2 問題頁改用**真實研究數據 dashboard**（47 秒單螢幕專注／中斷後 23 分 15 秒先返到任務／JAMA 2018 高頻媒體 2 倍 ADHD 症狀風險／香港青少年日均 6–7 小時螢幕，全部已上網核實、附來源）；新增 **S5 三種模式**概念頁；demo 改為**賽前預錄「專心 vs 分心」對比影片**（拍攝清單喺手冊 6.5）；PPT 改 9 頁**多文字版**、內文可直接 copy；刪晒所有顏色／字體規範（設計隊自主）；語言建議：標題雙語、內文中文為主。Part 5 重組成「答辯線 vs 攤位線」，舊 6.7 攤位 SOP 併入 5.6；講稿 A–E 全部重寫對應新 9 頁。
>
> **2026-07-18 第十輪（Steven 五項指示：音效＋A0＋文案／代碼／安全總審查）**：
> ㊵ **專注提示音效**：Steven 提供嘅 warning notification MP3 已入 `bgm/focusalert.mp3`——**專注提示（breathing prompt）彈出嗰一刻響一次**（rising-edge 偵測，game loop 每幀重叫都唔會重複；另加 **6 秒冷卻**防 focus 喺門檻附近閃動時機關槍式重響）；跟遊戲內**音效音量滑桿**；Playwright 全流程實測（boot→提示→響一次→復原→再分心→再響）零 JS 錯誤。
> ㊶ **A0 海報對齊隊員 template**：手冊 **6.6** 重寫成隊員 Canva template 實際版面（頁首＋2×2 細格＋大格＋闊格＋References），每格有齊可直接抄嘅內容＋附圖清單＋截圖規格；**頁首英文 Overview 句要修文法**（見 6.6）；Part 11 嘅舊五區海報計劃已併入 6.6（唔再兩邊維護）。
> ㊷ **全站文案 sweep（第二輪）**：冇發現任何過度宣稱／醫療聲稱（掃齊「臨床/醫療/治療/proven/保證/大數據」等關鍵字全部乾淨，Home 有齊「數據僅供演示」聲明）；修復 setup EEG「未收到真實腦波」訊息**淨中文冇英文**嘅雙語缺口（新 i18n key `setup_eeg_no_live_data`）。細位（唔急）：Home 中文 hero「掌握專注，釋放專注力潛能」重複「專注」、第一張 feature 卡係書面語同其餘口語唔一致——留 Steven 逐句 review 時一齊拍板。
> ㊸ **代碼／安全審查（F1 之上新發現）**：① `session_history` 雲端讀取加 `user_id` client-side filter 做 **RLS 雙保險**（RLS 設錯都唔會顯示他人數據；RLS 本身仍要照 F1 條 SQL 人手核實）；② 相機 lifecycle 核實正確（遊戲完→Results 已熄相機，全程本地處理不上傳）；③ 量化死 code：i18n 有 **~60 個無引用 key**（home_*/results_*/dash_* 大部分——Results 版面實際由 runtime `langText()` 畫）＋ runtime 內部 legacy `ROUTER`/`initApp`——**照 F1 政策賽後先清**，賽前唔郁大檔。模組版本 `2026-07-18-1`。
> ㊹ **Results「冇最近一場數據」修復（Steven 07-18 回報，影 S7 相時發現）**：根因——快照只存喺**玩嗰部機**嘅 localStorage，換機／清咗數據就得個零。已修：冇快照時自動 fallback 攞**跨場歷史最新一場**（登入攞雲端、否則本機 mirror）重畫 hero＋四格指標＋前後半 badge（逐秒曲線 history 冇存 sample，維持空狀態屬預期）。Playwright 三情境實測（即場完成／refresh／無快照）全部有真數據。**S7＋海報用嘅四張淺色截圖已由 Claude headless 出咗**（訓練 Results 連 3 局趨勢／Study Results 8/10 兩階段／閱讀器／測驗船返場）。隊員 A0 template 已命名四細格（The Gap／Solution／Three Sessions' Goal／Technical），手冊 6.6 已對應；**PPT 審查發現 5 個要修位**（S2 圖表 Average 殘留＋來源切斷、S5「simulated distractions」講咗冇嘅功能、S8 Gloria Mark 引用錯配＋「需要提及係」草稿句）——詳見對話記錄。模組版本 `2026-07-18-2`。
>
> **2026-07-18 第十一輪（Steven：Study 跨局追蹤＋PPT 覆審＋refs 整合）**：
> ㊺ **Study Results 加跨場趨勢**：新開**獨立本地 store `nf_study_history`**（唔入 `session_history`，唔污染訓練/挑戰趨勢；同 CSV 一樣本地、綁編號式學生 ID、reset/delete 會清）。追蹤**最有價值嘅兩個指標**：① **溫習專注穩定度 %**（sustained attention 質素）② **分心恢復時間**（旗艦——直接對應老師實驗 metric #2「介入後拉返專注嘅時間」＝訓練有效嘅硬證據）。**分數／正確率刻意唔入趨勢**（固定審核卷＝同一份題，分數升只反映記憶唔係專注訓練——會俾評判捉，留喺答題卡）。趨勢卡＝穩定度 bar＋恢復 bar＋「恢復快咗 X%」headline，同訓練趨勢同一套視覺；只喺 study mode 顯示，PDF 匯出會印埋。headless 實測（seed 2 場＋跑 1 場真 session＝3 條 bar、append 正確、訓練趨勢維持隱藏、零錯）。模組版本 `2026-07-18-3`。
> ㊻ **PPT 覆審（第二版）**：上輪 5 個要修位**全部已改**（S2 Average 殘留冇咗＋來源完整、S5 移走 simulated distractions、S8 Gloria Mark 抽走＋草稿句修好）。PPT 主體收貨。餘下細位（唔急）：S4 閉環圖 Detect 淨寫 webcam（建議加返「EEG／相機／模擬」）、S1 中文「的技能」書面 vs 全 deck 口語、S9 英文雙空格。
> ㊼ **References 整合**：隊員交咗 18 條學術 refs（6 類：ADHD 注意力訓練／EEG neurofeedback／Box Breathing／遊戲化／相機隱私 HCI／前後測實驗設計，存 refs docx）＋ Claude 提供嘅 S2 數據來源＋技術 attribution → 併成**海報底部 References 區＋PPT 尾頁**建議（curated，唔全塞）。內容見手冊 6.6 References 段。
> ㊽ **海報 6.6 深化（Steven 07-18）**：References 段**改晒全英文**（直接落版用）＋致謝改「study material prepared by our team」（教材由隊員提供）＋刪走提醒句；構圖用返原本 ASCII 但**加密每格內容**＋補「3 米→1 米→埋身」閱讀動線文句；每格由表格改成**逐格 copy-ready 詳細規格**（標題／主視覺／可抄文字／排版）。純文件改動。
>
> **2026-07-20 第十二輪（Steven：poster 全英文＋架構圖＋PPT 三審）**：
> ㊾ **語言拍板**：presentation 英文講 3 分鐘 → **poster 落版全英文**；手冊 6.6 每格重寫成**正式中英對照**（EN 係 finished copy 直接落版；中文對照俾隊員理解＋備稿，唔上海報）。格名對齊隊員最新 template（The Problems／Our Solution／Three Session Goals／Technical）。
> ㊿ **技術架構圖**：手冊 Part 3 mermaid 重寫成**全英文詳細版**（三層輸入／瀏覽器 focus engine／雲端，privacy 標註齊）；另出咗一張 **7080×3720 高清 PNG**（poster 米白色系、全英文）直接落 poster ④ Technical 格——poster 唔使 crop GitHub render。純文件改動（冇郁 app code，唔使 bump 版本）。
> 51 **PPT 三審**：冇新問題；隊員仲未執嘅 4 個細位——S7 **Results 截圖仲未貼**（有現成相）、S4 Detect 淨寫 webcam（EEG 冇提）、S9 "sustained  growth" 雙空格、S2 X 軸「2004年」中文「年」字（英文 deck 建議拎走）。
>
> **2026-07-20 第十三輪（Steven：刪 PPT 大綱＋教材 provenance 統一）**：
> 52 **刪 PPT 逐頁大綱**：PPT 已喺 Canva 完成，手冊 6.3 嘅 9 頁逐頁大綱＋Canva prompt 已移除（留 S1–S9 頁序 breadcrumb 俾 6.4 講稿對照），dangling 連結全修（Part 6 intro／Part 10 checklist／本表）。
> 53 **教材 provenance 統一＝隊員（Steven 揀 B）**：原本手冊「老師提供教材／老師審核卷／teacher-vetted quiz」同致謝「prepared by our team」自相矛盾——評判追問「份卷邊個整」會穿。全部統一成**隊員編寫**：S5／S8 講稿（中英）、poster S5／S8、Q&A、Pros #5、Part 2、檔案表、`studyMaterials.js` 註解共 ~16 處改晒；「審核卷」→「固定測驗卷」（保留鎖卷＝實驗公平嘅理由）。**特登保留**：老師=市場客戶（學校／老師／家長）、Pros #1 老師讚**課題**貼身（唔關教材事）、內部答辯策略筆記。全 repo syntax／i18n（205=205）／版本號（07-20-1）核對通過。
> ⚠️ **plan §5 D3 內部歷史仍寫「老師提供教材／老師要求對照實驗」**——係專案歷史記錄（非評判可見），冇改；如要連內部都統一，話我知。

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
3. **分工（Claude 做 ~90% code，TRAE 幾乎唔再需要）**
4. Vercel + DeepSeek API 驗證（唔係死線）
5. Roadmap（D3 學習模式 → 階段一設計 → 階段二收尾）
6. 時間表
7. 比賽日 checklist

---

## 1. 現狀 snapshot（截至 2026-07-15）

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
| 「無法進入遊戲」修復：25s 啟動看門狗＋boot 成功即解除 | commits `bae88fe2`+`e270e3d1`（2026-07-11） |
| Simulation/相機載入唔等 AI 題（本地題庫即秒入場、AI 背景補充） | commit `bae88fe2`（2026-07-11） |
| **D3 學習模式 ✅ 全部完成**（閱讀器＋固定卷測驗＋兩階段 Results＋CSV＋老師教材數碼化） | commits `8ab95b45`→`91e9a82a`（2026-07-16） |

**未做 / 待做**：見 §5 —— **D3 學習模式已全部完成**。剩低：E1 要真頭帶嗰部分（斷線凍結→fallback＋Results 標注）、U1 隱私政策頁＋逐句 review；人手任務（🔴 借 Windows 機＋EEG 裝置、T2 rehearsal、學習模式 pilot 實驗、Vercel 驗證、RLS 核實、A0 海報）。

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
- 🔴 **鐵律**：同一時間**只可以一邊**改嘢，尤其係 `pages/game/runtime.js`（接近 7000 行大檔）。兩邊同時改必撞、必亂。
- 🔴 **第二鐵律（2026-07-11 起）**：**每次 push 前 bump 模組版本號**——`services/runtimeLoader.js` 嘅 `MODULE_VERSION` 改成當日日期（例：`2026-07-16-1`），再全檔 sed 換埋各檔案 hardcode 嘅 `?v=` 查詢字串。唔 bump = 用戶食舊 cache，會出「改咗但睇唔到」嘅怪 bug（07-11 「語言唔跟」件事就係咁）。

---

## 3. 分工（2026-07-16 更新：Claude 做 ~90% code，TRAE 幾乎唔再需要）

> **點解要重寫呢段**：原本個計劃驚 Claude 睇唔到 3D 畫面，所以將「靚唔靚 / CSS 打磨」呢類要即時睇 browser 嘅嘢分咗畀 TRAE。但由 07-11 起 Claude 已經喺 sandbox 度用 Playwright + 本地 three.js **完整跑到成個 3D 遊戲、截到圖、驗到互動**（挑戰模式船照行、學習模式閱讀器都係咁測出嚟）。即係話「要睇住畫面」呢個限制冇咗——**Claude 而家連視覺打磨都做到**。

### 而家點分（實況）

| 類型 | 邊個做 | 佔比 |
|------|:---:|:---:|
| **所有 code**：D3 學習模式、runtime 邏輯、CSS/版面、i18n 文案、bug 修復、審計、視覺打磨、headless 測試 | **Claude**（寫＋自己截圖驗收） | **~90%** |
| **產品判斷 / 拍板**：模式點玩、文案語氣、設計方向、實驗設計 | **Steven 話事**（Claude 出建議＋實裝） | — |
| **真硬件先做到嘅嘢**：EEG 實機 rehearsal（T2）、斷線實測餵 E1 收尾、借 Windows 機／EEG 裝置 | **Steven ＋ 隊友** | 純人手 |
| **真人先做到嘅嘢**：跑學生實驗、A0 海報美術定稿送印、逐句 review 中英文、Vercel 後台設定/RLS 核實 | **Steven** | 純人手 |

**一句記法**：**碼（連靚）交 Claude；拍板同真人／真硬件先做到嘅嘢先係你嘅事。**

### TRAE 仲使唔使？

**基本上唔使。** 如果你鍾意用 TRAE 喺本機**即興微調 CSS**（例如即場試 hover 效果），可以，但**唔係必要**——Claude 已經 cover 到。**唯一要守嘅規矩**：如果你真係用 TRAE 改咗嘢，**開新 Claude 對話第一句要講「你先 `git pull origin main`，我頭先用 TRAE 改咗嘢」**，等 Claude 攞返最新先做，免得兩份改動撞。**一次一邊，做完 push，先換手**（`git status` 要 clean）。如果你全部交畀 Claude，就冇呢個煩惱。

### 邊啲嘢 Claude 做唔到、一定要你出手（重要）

1. 🔴 **借 Windows 機＋2 個 EEG 裝置**——冇實物 Claude 郁唔到，係而家最大 blocker。
2. **T2 EEG 實機 rehearsal**——戴真頭帶行 ≥5 次記斷線筆記，呢啲筆記係 E1 收尾嘅輸入。
3. **跑學生實驗**——揾 2–3 個學生、同老師落實同材料同卷、真人坐低讀＋答，出 CSV。
4. **Vercel 後台**：加 `DEEPSEEK_API_KEY` 環境變數、Supabase RLS 用 F1 條 SQL 核實（Claude 冇你個後台權限）。
5. **A0 海報美術定稿＋送印**、**逐句 review 全站中英文**先算收貨。

---

## 4. Vercel + DeepSeek API 驗證（發佈後做一次；⚠️ 但唔係死線——見下）

> **Steven 07-16 問「AI 出題仲使唔使、驚 Generate 有問題」——直接答你：**
> **A. 遊戲唔會因為 AI 出唔到題而死。** 挑戰模式一入場就用**本地雙語題庫**即秒開波，AI 只係喺背景靜靜補題（夠題先自動換用，出唔到就照玩本地題）——即係 DeepSeek 就算完全連唔到，挑戰模式一樣玩得晒，只係啲題冇咁「即時生成」咁潮。
> **B. D3 學習模式嘅實驗計分，根本唔靠即場 AI。** 實驗用嘅係**老師審核鎖死嘅固定卷**（正正因為 AI 每次生成都唔同，唔鎖死唔公平）。所以就算 AI 有問題，**實驗分毫不受影響**。
> **C. 咁 AI 出題仲有咩用？** 兩個用途：①挑戰模式嘅「即時／個人化」賣點；②學習模式攤位 demo 時，示範「即場由文章生成題目」呢個技術亮點（D3-4 個開關）。**兩個都係加分位，唔係保命符。**
> **結論**：DeepSeek **值得整好**（係賣點），但**唔使急、唔係死線**——有本地題庫同固定卷包住底。下面四步驗證照做一次確認個 key 通咗就得；就算最後搞唔掂，比賽照上。

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

### 📅 完成時序一覽（由先到後）

| # | 項目 | 完成日 | 狀態 |
|---|------|--------|:---:|
| 1 | **D2 Gameplay 重新設計**（航海旅程 × 心流充能，12 步） | 2026-07-07 | ✅ |
| 2 | **D1 Results Dashboard 重新設計**（v0 → vanilla，兩模式＋深淺色） | 2026-07-10 | ✅ |
| 3 | **P1 動態畫質**（四級自動階梯）＋**遊戲設定面板** | 2026-07-10/11 | ✅ |
| 4 | **P2 加靚**（Claude scope：過場、loading、水痕/浮標/海鷗、船身物理） | 2026-07-10/11 | ✅ |
| 5 | **U1 文案**（全站 sweep，主體）＋**F1 審計報告** | 2026-07-10/11 | ✅ |
| 6 | **E1 EEG 韌性**（重連退避、協議核實，邏輯層） | 2026-07-11 | 🟡 剩真頭帶收尾 |
| 7 | **「無法進入遊戲」修復**＋模擬即秒載入 | 2026-07-11 | ✅ |
| 8 | **D3 學習模式**（D3-1→D3-6：閱讀器＋固定卷測驗＋兩階段 Results＋CSV＋老師教材） | 2026-07-16 | ✅ |

> 下面各節按**呢個時序**由上到下排（D2 → D1 → D3 → 階段二 P1/P2/U1/E1/F1）。**剩低唯一要 code 收尾**係 E1 嘅「斷線凍結→fallback＋Results 標注」，等 T2 真頭帶筆記先做。其餘全部係**人手/硬件**（見 §6、§3）。

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

#### D3 — 學習模式 Study Mode ✅ 全部完成（2026-07-16；老師實驗需求 → 第三個 Session 目標）

> **背景**：負責老師要求做對照實驗證明平台有效（手稿已文字化如下）。呢個模式係**新增第三選項**，訓練/挑戰模式一行 code 都唔郁（比賽 demo 保命符）。

**老師嘅實驗設計（文字化）**：
- 同一科（生物）兩級深度材料：材料一（淺）、材料二（深）。
- A 組紙本讀材料一 → 測驗；B 組**平台**讀材料一 → 測驗（AB 深度相約）；C/D 組用材料二重複（CD 深度相約）。
- 評估指標：**① 學生測驗成績**；**② 學生有提示（介入）後拉返專注嘅時間**（平台已量：avgRecoveryMs）。①②均正面 → it works；之後第二科重複。
- 規模：賽前完成，約 2–3 個學生（pilot 性質，答辯要誠實講 n 細）。

**卷設計決定（Claude 建議，待老師確認）**：AI 每次生成題目必然唔同（有隨機性），所以**實驗計分用「AI 同一標準預先生成 → 老師審核 → 鎖死」嘅固定卷**；紙本組同平台組**同材料同卷**（唯一變量=學習媒介）。「AI 即場由文章出題」保留做攤位 demo，唔計實驗分。

**兩套題目、要對答辯講清楚（Steven 2026-07-16 確認要講）**：
- **實驗用**（跑 pilot 果陣）：老師審核鎖死嘅**固定卷**——保證公平、可重複。
- **比賽攤位/答辯 demo 用**：可以照用 AI **即場**由文章生成題目（D3-4 嘅「demo 用 AI 即場出題開關」），畀評判睇到「即時出題」呢個技術亮點。
- **講法**：評判問起就直接講——「量化實驗嗰陣為咗公平用鎖死嘅審核卷；而家畀你哋睇嘅係 AI 即場生成，每次都唔同」。兩者唔矛盾，反而係一個誠實嘅設計取捨（同挑戰模式「AI 出題失敗自動轉本地題庫」嘅邏輯一致）。

**字眼定案（2026-07-15 Steven 拍板）**：
- 模式名：中文「**學習模式**」／英文「**Study Mode**」（同訓練/挑戰模式對仗）。
- 材料深度顯示：「**基礎 / 進階**」（英文 Foundation / Advanced）——實驗記錄內部仍對應老師嘅「材料一（淺）/材料二（深）」。
- 鎖定學科卡：**化學＋物理＋歷史** 🔒 Coming Soon（純展示未來路線，唔使做內容）。**確認（Steven 2026-07-16）：呢三科比賽前都唔會解鎖**——冇時間搵/整學習材料，一直維持鎖住狀態去到比賽完；賽後如要擴科先再排。
- 上線策略：D3 建置期間第三張卡曾「顯示但鎖住」；**D3 全部完成後（07-16）已解鎖，正式站可直接入**。（如果將來想要一個「乾淨比賽版」暫時收起，`localStorage` set `nf_study_lock=1` 就會再鎖住。）額外學科（化學/物理/歷史）維持鎖住。

**產品流程**：Setup 揀「學習模式」→ 學科選擇（**生物可入＋化學/物理/歷史 🔒 Coming Soon**）→ 揀材料（基礎/進階）→ **閱讀階段**：sub-topic 分頁閱讀器，**每頁最多 3 分鐘**倒數（到時自動下一節；可撳「下一節」提早，實際用時入數據），背景=現有天空+海景 **無船無航道** → **答題階段**：**船隻＋題目 HUD 返場**，該材料嘅固定審核卷（MC，限時，量答題專注）→ **Study Results**。

**畫面設計方案（2026-07-15 拍板，07-16 第二輪微調，已全部實裝）**：
- **閱讀階段**：材料放**螢幕右邊**一塊圓角**磨砂玻璃**閱讀器（質感似呼吸介入 overlay，**跟深淺色模式變白色/黑色磨砂**；闊約螢幕 60%，會隨比例縮細，並**永遠唔會overlap左邊 focus HUD**）；閱讀器內**由上到下**：學科·深度 chip＋頁數進度、**內嵌計時器**（本頁剩餘時間，3:00 起跳）、學科主題＋本節標題、**筆記式內文**、下方大掣。左邊 focus HUD 照留（專注%/訊號）；收起速度／距離／航海圖／能量環（航行專用，閱讀時冇意義）。背景照用而家嘅天空＋海，**無船無航道**；**天氣共感照行**（分心→起霧變暗）；**呼吸介入照觸發**（介入期間本頁倒數凍結，跟現有 pause 管線，唔會蝕閱讀時間）。
- **閱讀節奏（07-16 Steven 定）**：每頁**最少讀 1 分鐘**先解鎖「下一頁」（未夠鐘個掣 disable 住＋顯示「請先閱讀（N 秒）」倒數），**最多 3 分鐘**到時自動揭頁；1–3 分鐘之間可自行提早揭頁，實際用時全部入數據。目的：逼用戶真係讀，唔好一入就狂撳跳過（實驗數據先有意義）。
- **筆記式排版（07-16 Steven 提，已實裝）**：內文唔係一嚿 PDF 死板文字，而係結構化**筆記**——主題句、分段、**重點列表（bullet）**、**名詞解釋格**（term＋定義）、**重點框**（takeaway）。讀落似溫書 notes，唔會好辛苦。每份材料**第 1 節必定係「這一課學什麼」**（介紹主題＋大綱），用戶一入就知讀緊咩。
- **答題階段**：**船隻＋挑戰式題目 HUD 返場**——畫面同挑戰模式基本一樣（專注揸舵、船速跟專注、天氣共感、題目卡照現有位置），唯一分別係題目嚟自該材料嘅**固定審核卷**（唔係 AI 即場題/本地隨機題）；每題用時、答題期間專注 % 全部入數據。工程上係同一個 3D 場景切 `boat.visible`＋航行系統開關，唔使砌兩個場景。
- **完成後**：直接跳 **Study Results**（溫習/答題兩階段斬開＋CSV 匯出）。
- **訊號輸入：一概不變**——Real EEG 一條線；Simulation 入面相機／內建曲線兩條線。閱讀同答題兩個階段都食同一條 `focusLevel` 管線（天氣、介入、數據記錄全部照舊），同訓練/挑戰模式完全一樣。
- ⚗️ **實驗公平性提醒（要同老師確認埋）**：測驗**建議兩組都喺平台上做**——咁答題環境先相同，唯一變量正正係「溫習媒介」（紙 vs 平台閱讀器）；紙本組答卷前畀 1 分鐘熟習下操作，減「唔識用平台」嘅干擾。如果老師想紙本組連測驗都用紙筆，都做到，但要接受「答題環境」變埋第二個變量，答辯時照直講。

**Study Results（溫習/答題數據斬開）**：
- 📖 溫習階段卡：總閱讀時長、每節用時、專注穩定度%、分心次數、介入次數、**介入後平均恢復時間**、閱讀專注曲線。
- ✍️ 答題階段卡：分數、每題用時、答題期間專注%、答錯回顧。
- 對比行：閱讀 vs 答題專注；**「匯出 CSV」掣**（每場一行：學生編號+兩階段全欄位；本地生成下載，唔經伺服器）。
  - ⚠️ **CSV 本質係純數字表格，冇圖表冇顏色格式**（CSV 格式本身就係咁，Excel/Sheets 開返出嚟先自己畫圖）——呢個係為咗畀你/老師攞去做統計分析（t-test、畫對比圖）用嘅「原始數據」，唔係畀評判睇嘅視覺化版面。**平台入面嘅圖表（曲線、bar chart）本身唔會因為匯出 CSV 而跟住走樣或消失**——兩樣係獨立嘅：Study Results 頁面自己嘅圖表你隨時都睇到；CSV 淨係加多一個「攞走做分析」嘅出口。若果想要有畫面、有格式嘅版本畀評判/貼海報，**用返 Results 頁截圖**（同現有 Results 頁做法一致，見手冊 Part 10 checklist）。
- 學生識別：**編號式用戶名（S01/S02/S03）**，唔用真名/email（私隱）。

**實作拆步**（✅ 六步全部完成，每步一 commit、逐步 headless 驗收；正式站已解鎖）：
| 步 | 內容 | 狀態 |
|---|---|---|
| D3-1 | Setup 第三張卡「學習模式 · Coming Soon」（顯示但鎖住）+ 學科選擇 UI（生物可入＋化學/物理/歷史 3 鎖）+ 深度（基礎/進階）+ state/route 底盤 | ✅ 07-16 |
| D3-2 | 閱讀器：**螢幕右邊圓角磨砂面板（闊約 60vw、隨比例縮、唔重疊左邊 HUD）**、跟深淺色變白/黑；**筆記式排版**；內嵌計時器；**每頁最少讀 15 秒先解鎖、最多 3 分鐘自動揭頁**；海景無船（收起船/航道/浮標）；最後頁「進行測驗」掣 | ✅ 07-16 |
| D3-3 | 閱讀期間專注監測（穩定度/分心/介入/恢復/每頁用時，交界 snapshot）+ 介入重用（凍結頁倒數） | ✅ 07-16 |
| D3-4 | 答題階段：船隻＋題目 HUD 返場；用材料**固定審核卷**行正常題目流程；每題用時＋答題時專注記錄 | ✅ 07-16 |
| D3-5 | Study Results 兩階段版面（📖 溫習卡＋✍️ 答題卡）+ CSV 匯出 | ✅ 07-16 |
| D3-6 | 雙語文案 + 正式站解鎖入口 + docs 更新 + 全流程 headless 實測 | ✅ 07-16 |

> **設計演進記錄**：閱讀卡由「螢幕中間」→ **右邊**（左邊 focus HUD 照留）；計時器放**入閱讀器內**；闊度 **60vw**（隨比例縮、唔重疊 HUD）；背景**磨砂＋跟深淺色白/黑**；每頁最短閱讀 **15 秒**（原 1 分鐘，Steven 07-16 改）；內文**筆記式**。全部已實裝並 headless 驗過（reading→quiz→results→CSV，深淺色）。

**教材（老師提供，已數碼化）**：生物科「細胞膜與物質運輸」單元，兩級深度存 `pages/game/studyMaterials.js`：
- **基礎（初中）**：細胞膜差異透性、擴散、滲透、主動運輸（4 sub-topic＋導論頁）＋ **10 條**審核 MC。
- **進階（高中）**：流動鑲嵌模型、滲透對動植物差異、氣體交換擴散、植物滲透支撐（4 sub-topic）＋**延伸節（運輸能量比較、表面積體積比）**＋ **10 條**審核 MC。
- 全部**雙語（中/英）**、筆記式結構、MC 跟遊戲題目 schema（4 選項＋正解＋解釋）。老師卷原本各 8 條，補足到 10 條同標準。**老師可直接審核或整份換走**（改同一個檔案即得，唔使郁其他 code）。
- 📄 **紙本版（實驗紙本組用）**：`docs/STUDY_MATERIALS_PRINT.md` 係由 `scripts/gen_materials_md.mjs` **程式自動生成**，同平台版**逐字一致**（筆記＋MC＋答案），直接打印就得。改咗 `studyMaterials.js` 之後重新生成：`node scripts/gen_materials_md.mjs > docs/STUDY_MATERIALS_PRINT.md`。

**依賴/待辦（人手，非 code）**：① 老師確認卷設計（同材料同卷 **＋ 兩組係咪都喺平台答卷**——見上面公平性提醒）＋審核教材同 MC；② 若要用其他科目/課題，提供材料換入 `studyMaterials.js`；③ 定實驗日期＋招 2–3 個學生（留 buffer 出 CSV）。
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

- 🔴 **T0 — 借 Windows 機＋EEG 裝置**（最優先，已過原定 07-15 限期）：問學校/隊友借；冇呢兩樣，T2/E1 全部郁唔到。
- **T1-D3 — 實驗人手配套**（跟住 D3 build 並行）：① 同老師確認「同材料同卷」設計；② 攞材料一（淺）/材料二（深）畀 Claude 入庫；③ 老師審核 AI 預生成卷並鎖死；④ 招 2–3 個學生＋定實驗日（07-21 → 07-24 窗口）；⑤ 分配編號 S01/S02/S03（唔收真名/email）。
- **T2 — EEG 實機 rehearsal**（越早越好）：比賽用嗰部 Windows 戴 MindWave 行完整流程 ≥5 次，記低每次連接用幾耐、幾時斷、斷喺邊步、點救返。試埋極端情況（長頭髮、出汗、圍觀人多藍牙干擾、連玩 30 分鐘）。寫成一頁「斷線急救卡」。**呢啲筆記係 E1 prompt 嘅輸入。**
- **Vercel + DeepSeek 驗證**：見 §4。
- **提醒隊友換 DeepSeek key**：見 §4 步驟 4。
- **練「30 秒切 Simulation」台詞**：EEG 死咗當場點講點切（demo 保命符，見手冊 Part 5/6）。

---

## 6. 時間表（2026-07-15 重排；比賽日程已由官方 PDF 確認：**07-28 setup、評審 07-28 下晝 → 07-29 中午**；code freeze **07-25** 不變）

> **D3 學習模式（連老師教材）已喺 07-16 全部完成**，比原計劃快好多。剩低嘅關鍵路徑幾乎全部係**人手＋硬件**：🔴 **借 Windows 機＋EEG 裝置**仍然係最大 blocker、跑 pilot 實驗、E1 真頭帶收尾、A0 海報。Code freeze 07-25 不變。

| 時段 | 做乜 |
|------|------|
| ✅ 已完成（07-06 → 07-16） | D2、D1、P1（連設定面板）、P2 Claude scope、U1 主體、E1 邏輯層、F1 報告、入場 hang 修復、模擬即秒載入、**D3 學習模式全套（含老師教材）**——全部喺 main |
| **07-16 → 07-21** | 🔴 **Steven 最優先：借 Windows 機＋EEG 裝置**（已過原定限期）；同老師確認「同材料同卷＋兩組都喺平台答卷」＋審核已數碼化嘅生物教材/MC；招 2–3 個學生、定實驗日；Vercel/DeepSeek 四步驗證；Supabase RLS 用 F1 條 SQL 核實。**Claude 備用**：睇 Steven 驗收 D3 後有冇要調嘅位、E1 等 T2 筆記 |
| **🎤 答辯準備（07-17 起・零現場操作版）** | **9 頁 PPT ✅ 已喺 Canva 完成**（逐頁大綱已由手冊 6.3 移除，以 deck 為準）；**拍 S6 對比影片**（專心 vs 分心，照手冊 **6.5** 拍攝清單，~40 秒）；cap 截圖（閱讀/測驗/Results/Setup）；S2 四個數據來源隊員再核實一次；講稿 A–E（手冊 **6.4**）連影片計時行一次 ≤3 分 50 秒；比賽日手提機開定真平台 standby 畀 Q&A |
| **07-18 → 07-24** | 🧪 **跑學習模式 pilot 實驗（2–3 學生，紙本組 vs 平台組，一鍵出 CSV）**——結果入海報「證據」區＋答辯口徑（誠實講 n 細）；**T2 實機 rehearsal ×5**（有機＋頭帶就即開始，記斷線筆記）→ 交 Claude 做 **E1 收尾**（斷線凍結→fallback＋Results 標注）；U1 收尾：隱私政策頁＋Steven 逐句 review；起草＋送印 **A0 海報**（照手冊 **6.5** 大綱） |
| **07-25 → 07-27** | **Code freeze（07-25）**——之後唔加新功能。完整 rehearsal ×2、跨裝置 QA、故障演練（EEG 斷→Simulation、無網→本地 fallback）、DEMO_MODE 開關拍板、所有裝置電量策略準備（攤位冇電源！見手冊 Part 11） |
| **07-27 晚** | 裝置全部叉滿、AAA 電池換新、海報＋物資裝箱（清單：手冊 Part 11） |
| **07-28 → 07-29** | 🏁 比賽：11:00 setup → 評審期輪更留守＋輪流去維修區充電 |

**時間唔夠就保呢啲（順序）**：① T2 rehearsal（現場風險最大）＋ E1 收尾（要 T2 筆記）；② A0 海報（官方必須）；③ D3 pilot 實驗（老師要求——實在跑唔切就 D3 做完 demo 到、實驗改為賽後補做，同老師預早講）。隱私政策頁同 P2 加碼位可以犧牲。
**實驗如果排唔到學生**：最少搵隊友/同學做 1–2 場「流程綵排」出樣板 CSV，確保比賽日答辯有嘢畀評判睇（標明係 pilot 綵排數據）。

---

## 7. 比賽日 checklist（P3 展開）

- [ ] 比賽機裝好：Chrome、bridge、電池 ×2、後備 MindWave（如有）
- [ ] 斷線急救卡（T2 產出）貼喺攤位
- [ ] 30 秒切 Simulation 台詞人人識背
- [ ] devtools Network 最後檢查：零 key 外露（F1 已驗）
- [ ] 離線 fallback 實測：拔網線照玩到
- [ ] Results 頁截圖印出嚟（評判追問「證據」時直接畀睇）
- [ ] **Study Results 頁截圖**（如果 pilot 實驗做完）連同 CSV 匯出嘅原始數據都印/存埋——截圖畀評判睇「有格式嘅版面」，CSV 純數字表格留返自己/老師做統計分析用，兩者唔係同一樣嘢
