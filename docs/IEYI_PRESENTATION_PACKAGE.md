# NeuroFocus — IEYI 3–4 分鐘答辯包 Presentation Package

> **點解有呢份**：2026-07-17 老師睇完之後嘅回饋——**技術已夠分，但展示嘅訊息唔夠清楚、三大部份（遊戲／溫習／腦電波）未有「綜合」嘅感覺、講得太technical會冗長**。所以策略由「逐個 session demo」改為：**PPT 主導、3–4 分鐘、問題行先、淨係現場 demo 學習模式（因為佢一個模式已經串起晒所有功能）、technical 全部留 Q&A**。
>
> **點用呢份**：§1 照住做 PPT；§2 係逐句講稿（中英＋幾時撳邊度 demo）；§3 砌 A0 海報；§4 背 Q&A；§5 係 Pros/Cons 同一個**重要產品建議**（溫習時顯示隻船）。
>
> 呢份係「**正式答辯**」用；攤位互動嘅長版 walkthrough 仍睇 [`EXHIBITION_HANDBOOK.md`](./EXHIBITION_HANDBOOK.md) Part 6。
>
> 最後更新：**2026-07-17**

---

## 0. 策略定調（老師回饋 → 新方向）

**老師三點回饋**
1. 技術上已做得很好，但**展示時（面對使用者、針對要解決的問題）訊息不夠清楚**。
2. 遊戲、學習（溫習）、腦電波分析**暫時未有「綜合」的感覺**。
3. 題目**非常貼近當代年輕人的需要，非常值得發展下去**。

**四條定調（每次 present 都要做到）**
- **問題行先**：頭 30 秒就要令評判 100% 清楚「解決緊咩問題、為邊個解決」。
- **一個核心訊息**（成隊人講同一句）：
  > **中**：NeuroFocus 將「專注力」由一個睇唔到、齋靠意志力頂嘅嘢，變成**睇得到、練得到、量得到**嘅技能——用一隻**會因為你分心而飄走嘅船**即時話你知你幾時走神，再用**呼吸提示**同**進度儀表板**幫你逐次把專注練返嚟。
  > **EN**: NeuroFocus turns focus — normally invisible and willpower-dependent — into a skill you can **see, train and measure**: a boat that **drifts when your attention wanders** shows the exact moment you lose focus, then breathing cues and a progress dashboard help you train it back, session by session.
- **綜合感**：唔好講成三件事，要講成**一個閉環**：`偵測 → 睇到（船）→ 提示（呼吸）→ 量化（儀表板）`。學習模式就係呢個閉環嘅**最完整示範**。
- **Technical 留 Q&A**：EEG bridge、相機演算法、AI 出題、Supabase、three.js——**一句帶過，評判想深入先喺 Q&A answer**。

**時間分配（目標 3.5 分鐘）**
| 段 | 內容 | 時間 |
|---|---|---|
| A | 問題（短片＋一句痛點） | 40s |
| B | 我哋嘅答案＝一個閉環（核心訊息） | 30s |
| C | **現場 demo 學習模式**（閱讀→分心提示→測驗→儀表板） | 90s |
| D | 成效觀點（誠實）＋市場＋願景 | 40s |
| E | 收結一句 → 邀請 Q&A | 15s |

---

## 1. PowerPoint 每頁詳細大綱（8 頁）

> 設計基調：深藍海洋漸變底、留白多、每頁**一個重點一張圖**、字少。中英對照放標題同關鍵字即可，唔好成段字。

### Slide 1 — 封面 Hook（15s）
- **標題**：NeuroFocus
- **副題（中/EN）**：睇得到的專注力訓練 / Focus you can *see*, train and measure
- **版面**：全屏一張海洋＋船 hero 圖；左下角隊名、學校、IEYI 2026；右下角一個 QR code（連去 demo 網址）。
- **講者**：只講核心訊息第一句。
- **示範平台？** 否（PPT 全屏）。

### Slide 2 — 問題 The Problem（40s）
- **標題（中/EN）**：注意力，正在碎片化 / Attention is being fragmented
- **版面**：**嵌入你哋之前條短片（20–30 秒）**——現代人掛住碌手機、溫唔到書嘅處境。片下面三個關鍵字：短片轟炸 Short-video overload／通知打斷 Notifications／睇落清醒但注意力好碎 "Awake but scattered"。
- **講者**：講到年輕人切身、老師話「非常貼近需要」嗰點。
- **示範平台？** 否（播片）。

### Slide 3 — 舊方法點解唔夠 Why current fixes fail（20s）
- **標題（中/EN）**：叫人「專心啲」冇用 / "Just focus" doesn't work
- **版面**：左右對比。左：意志力／番茄鐘／溫習 app——**只計時間，唔知你幾時分咗心**。右：一個問號「幾時走神？走神點拉返？」。
- **講者**：帶出「缺口」＝冇即時覺察、冇即時介入、冇量化進步。
- **示範平台？** 否。

### Slide 4 — 我哋嘅答案：一個閉環 Our answer: one loop（30s）
- **標題（中/EN）**：一個閉環，唔係三件事 / One loop, not three features
- **版面**：**中央一個圓環圖**：`偵測 Detect → 視覺化 See（船）→ 回饋+呼吸介入 Cue → 量化 Measure`，箭咀轉返起點（重複練習）。呢頁專門答老師「未有綜合感」嗰點。
- **講者**：講明遊戲／溫習／腦電波**唔係三個獨立嘢，係同一個閉環嘅唔同入口**；跟住 demo 學習模式，因為佢一次過 show 晒成個閉環。
- **示範平台？** 否（but 過渡去 demo）。

### Slide 5 — Demo：學習模式（閱讀）Study Mode — Reading（demo 開始，40s）
- **標題（中/EN）**：同一份書，喺 NeuroFocus 溫 / Same notes, revised on NeuroFocus
- **版面**：一張學習模式閱讀截圖（右邊閱讀器＋左邊 focus 指標）。**呢頁開始切去真實平台**。
- **講者**：一路操作一路講（見 §2-C1）；示範分心 → 彈呼吸提示。
- **示範平台？** ✅ 係。**導航**：Setup → 學習模式 → 生物 → 基礎 → Simulation → （相機 skip）→ 閱讀畫面。

### Slide 6 — Demo：測驗＋船 Study Mode — Quiz + Boat（demo 續，30s）
- **標題（中/EN）**：讀完即刻考，船同你一齊航 / Read, then quiz — the boat sails with you
- **版面**：測驗階段截圖（船返場＋題目 HUD）。
- **講者**：撳「進行測驗」→ 船返場；狀態好船順、分心船慢；用老師審核嘅固定卷。
- **示範平台？** ✅ 係（接住上一頁）。**導航**：閱讀器撳「進行測驗 Start Quiz」。

### Slide 7 — Demo：儀表板 Dashboard（demo 收，20s）
- **標題（中/EN）**：唔止分數，仲有你嘅專注歷史 / Not just a score — your focus history
- **版面**：Results 截圖（溫習卡＋答題卡＋跨 session 趨勢）。
- **講者**：量化專注穩定度、分心恢復時間、**跨 session 進步趨勢，有進步就鼓勵**（直接答老師點 3）。可一鍵匯出 PDF/CSV 畀老師。
- **示範平台？** ✅ 係（Results 頁）。**導航**：完成測驗 → 自動去 Results，或撳結算。

### Slide 8 — 成效 · 市場 · 願景 + Q&A（40s + 收結）
- **標題（中/EN）**：由「叫你專心」到「畀你練專心」 / From "focus!" to "train your focus"
- **版面**：三欄——**誠實成效**（機制對齊科學／pilot n≈2–3／未做長期實證）｜**市場**（有 webcam 就用到 → 學生／教育）｜**願景**（EEG 閉環、大樣本研究）。底部：`Technical 細節（EEG bridge／相機／AI 出題／雲端）歡迎 Q&A`。
- **講者**：§2-D + E。
- **示範平台？** 否。

---

## 2. 講稿（中英對照 · 附示範／導航提示）

> 標記：`[NAV]` = 撳邊度／去邊頁；`[DEMO]` = 現場操作；其餘係口稿。**唔再分講者**——你哋自己切段（例：A/B 一人、C demo 一人、D/E 一人）。

### A — 問題（Slide 1→2）
> **【中】** 各位評判好，我哋係 NeuroFocus。（播片）大家見到呢個畫面——而家嘅年輕人喺短片同通知轟炸下，好容易「睇落清醒，但注意力好碎」：想溫書，五分鐘就摸手機，摸完又唔記得讀到邊。專注力唔係唔想，而係**佢哋根本唔察覺自己幾時走咗神**。
>
> **【EN】** Good afternoon judges, we are NeuroFocus. (play clip) What you see here is today's reality: under a flood of short videos and notifications, young people look awake but their attention is fragmented. They sit down to study and reach for the phone within five minutes — and don't even notice the moment they drifted. It's not that they don't want to focus; they simply **can't sense when they lost it**.

### B — 我哋嘅答案（Slide 3→4）
> **【中】** 叫人「專心啲」冇用，番茄鐘只計時間，兩者都唔會即時話你知你幾時分心。所以我哋做嘅**唔係三個獨立功能，而係一個閉環**：即時**偵測**你嘅專注 → 用一隻**船**畀你即刻**睇到** → 分心太耐就用**呼吸提示**幫你拉返 → 每次完再**量化**你嘅進步。跟住我用**學習模式**示範，因為佢一個模式已經串起晒成個閉環。
>
> **【EN】** Telling someone to "focus" doesn't work, and a timer only counts minutes — neither tells you *when* you drifted. So we didn't build three separate features; we built **one loop**: detect your focus in real time → let you *see* it through a boat → if you drift too long, a breathing cue pulls you back → and every session *measures* your progress. I'll demo our **Study mode**, because a single mode already shows the whole loop.

### C — 現場 Demo（Slide 5→6→7）
**C1 — 閱讀階段**
> `[NAV]` 主頁 → Setup → **學習模式 Study** → **生物 Biology** → **基礎 Foundation** → 訊號來源揀 **Simulation**（今日唔 show EEG）→ 相機可以 skip。
>
> **【中】** 而家我用平台溫一份真嘅生物筆記。右邊係閱讀器，左邊呢個指標就係我而家嘅專注度。`[DEMO 示範分心]` 我而家扮走神、望開——大家見到，當我持續分心，系統會彈出**呼吸提示**，叫我跟住一齊呼吸，幫我由「散」返去「定」。呢個就係**即時覺察＋即時介入**。
>
> **【EN】** I'm now revising a real biology note on the platform. On the right is the reader; on the left, this meter is my live focus level. `[DEMO drift]` I'll pretend to lose focus and look away — as I stay distracted, the system pops a **breathing cue** and guides my breath to bring me from "scattered" back to "settled." That's **real-time awareness plus real-time intervention**.

**C2 — 測驗＋船**
> `[NAV]` 閱讀器撳 **「進行測驗 Start Quiz」**。
>
> **【中】** 讀完即刻考——用嘅係**老師審核嘅固定卷**。呢個時候隻**船返場**：我狀態好，船就順就快；我一分心，船就失去節奏。我一邊維持專注、一邊答題，就好似真實世界要「一邊做嘢一邊專心」。
>
> **【EN】** Right after reading, we quiz — on a **teacher-vetted fixed paper**. Now the **boat returns**: when my state is good it sails smooth and fast; when I drift, it loses rhythm. I answer while holding focus — just like the real world, where you must stay focused *while* doing a task.

**C3 — 儀表板**
> `[NAV]` 完成 → **Results / 儀表板**。
>
> **【中】** 每次溫完，平台唔止畀個分數，仲量化咗我嘅**專注穩定度**、**分心之後幾快拉返**，同埋**跟之前幾次嘅進步趨勢**——有進步就會鼓勵我。老師可以一鍵匯出 PDF 或 CSV 做分析。
>
> **【EN】** After each session, the platform gives more than a score — it quantifies my **focus stability**, **how fast I recover after a distraction**, and my **progress trend across sessions** — and encourages me when I improve. Teachers can export a PDF or CSV in one click.

### D — 成效 · 市場 · 願景（Slide 8）
> **【中】** 要誠實講：我哋嘅機制對齊科學——即時回饋建立自我覺察、呼吸調節喚醒、重複練習訓練「拉返專注」——**但長期成效仲要更大研究先證實**，我哋而家係 n 得 2–3 個學生嘅 pilot。市場方面，因為**唔一定要 EEG 頭帶、有鏡頭就用到**，任何學生都試到，仲可以入去學校同溫習市場。下一步係接返真 EEG 閉環同做大樣本研究。
>
> **【EN】** To be honest: our mechanisms align with the science — real-time feedback builds awareness, breathing regulates arousal, repeated practice trains recovery — **but long-term efficacy still needs a larger study**; today it's a pilot of only 2–3 students. On market: because it **doesn't require an EEG headband — a webcam is enough**, any student can try it, opening the school and revision market. Next we reconnect the full EEG loop and run a larger study.

### E — 收結（Slide 8）
> **【中】** 一句講晒：NeuroFocus 將專注力由「叫你專心」變成「**畀你睇到、練到、量到**」。技術細節——EEG、相機演算法、AI 出題、雲端——我哋非常樂意喺 Q&A 詳談。多謝各位。
>
> **【EN】** In one line: NeuroFocus turns focus from "just concentrate" into something you can **see, train and measure**. The technical details — EEG, camera algorithm, AI question generation, cloud — we'd love to go deep in Q&A. Thank you.

---

## 3. A0 海報設計大綱 Poster（841 × 1189 mm，直度 Portrait）

> 目標：**3 米外睇到主訊息，1 米內睇到閉環同截圖**。字級：大題 ≥100pt、段題 ≥54pt、內文 ≥28pt。色：深藍海洋漸變底、青色 accent（跟 app）、白字。留白要夠。

**版面（由上到下、分 3 欄）**
```
┌───────────────────────────────────────────────┐
│  頁首 Header：NeuroFocus  ｜ 一句核心訊息(中/EN)   │  ← 佔頂 12%，隊名/校/IEYI logo/QR
├───────────────┬───────────────┬───────────────┤
│ ① 問題        │ ④ 閉環大圖     │ ⑥ 儀表板截圖   │
│ Problem       │ The Loop       │ Dashboard      │  ← 中欄放最大嘅
│ (痛點+短片QR) │ (偵測→睇→提示  │ (趨勢/恢復)    │     閉環圓環圖
│               │  →量化 圓環)   │                │
├───────────────┼───────────────┼───────────────┤
│ ② 舊方法唔夠  │ ⑤ 學習模式流程 │ ⑦ 成效(誠實)   │
│ Why fail      │ 3 步截圖:      │ + 市場 + 願景  │
│               │ 閱讀→測驗→結果 │                │
├───────────────┴───────────────┴───────────────┤
│  頁尾 Footer：科學依據一行 + 團隊分工 + 試玩 QR   │
└───────────────────────────────────────────────┘
```

**每格內容**
- **頁首**：大 logo「NeuroFocus」＋核心訊息（中英各一行）＋角落 QR（試玩）。
- **① 問題**：一句痛點＋短片 QR＋三個 icon（短片／通知／碎片化）。
- **② 舊方法唔夠**：番茄鐘/意志力 ✗，缺「即時覺察＋介入＋量化」。
- **④ 閉環大圖（海報主角，放中欄最大）**：圓環 `偵測→視覺化(船)→呼吸介入→量化→重複`。呢張圖就係答「未有綜合感」。
- **⑤ 學習模式 3 步截圖**：閱讀（focus 指標）→ 測驗（船返場）→ 結果（儀表板）。
- **⑥ 儀表板截圖**：跨 session 趨勢＋恢復時間，圈住「進步」。
- **⑦ 成效/市場/願景**：誠實三行（機制✓／pilot n≈2–3／長期待證）＋「webcam 就用到」＋願景。
- **頁尾**：科學依據一行（neurofeedback＋box breathing＋arousal 調節）＋團隊＋QR。

**設計提示**：唔好塞滿字；每格一個重點；截圖要大、加圓角同陰影；閉環圖用 app 嘅青／藍。

---

## 4. Q&A 手冊（分類 · 中英關鍵字）

> Technical 而家**全部落 Q&A**，所以呢部分要熟。答法原則：**先一句到位，評判想深入先展開**；誠實講限制係加分位。

### 4.1 定位 / 問題
- **Q：你哋到底解決緊咩問題？/ What problem do you actually solve?**
  A：年輕人喺短片同通知下注意力碎片化，**溫書/做嘢分心又唔自覺**。我哋令佢即時察覺、即時拉返、再量化進步——由「監測」升級到「訓練」。
- **Q：點解要咁多模式？會唔會太散？/ Why so many modes — isn't it scattered?**
  A：（**老師最可能問呢條**）核心係**一個閉環**，模式只係唔同入口：訓練＝純練、挑戰＝加任務壓力、**學習＝閉環最完整嘅示範**。所以我哋今日淨係 demo 學習模式，其餘留俾深入試玩。

### 4.2 技術（今日主要留呢度）
- **Q：EEG 點運作？/ How does the EEG work?**
  A：NeuroSky 單通道頭帶讀腦電 → 本地 Python bridge → WebSocket → 網頁，轉成即時專注指標驅動隻船。今日用 Simulation demo，EEG 係另一條獨立輸入。
- **Q：冇 EEG 嗰陣個「專注」點嚟？/ Without EEG, where does focus come from?**
  A：相機用 MediaPipe 面部 landmark 估**望開/眨眼/臉部集中**，或者 fallback 模擬曲線，確保任何裝置都 demo 到。
- **Q：題目係 AI 生成定固定？/ AI-generated or fixed questions?**
  A：**兩套刻意分開**：量化實驗用**老師審核鎖死嘅固定卷**（公平比較）；攤位展示先用 AI 即場出題（show 技術）。AI 失敗會自動轉本地題庫。
- **Q：數據存喺邊？/ Where is data stored?**
  A：Supabase 帳戶＋`session_history`（跨 session），本地亦有 mirror，離線都用到。

### 4.3 科學 / 成效
- **Q：你點證明真係有效？/ How do you prove it works?**
  A：現階段：即時回饋＋呼吸介入＋單次量化＋**跨 session 前後對比**。另有紙本 vs 平台 pilot（n≈2–3，誠實講係 pilot 唔係研究）。長期成效下一步做大樣本對照。
- **Q：單通道消費級 EEG 準唔準？/ Is single-channel consumer EEG accurate?**
  A：我哋用佢做**訓練輸入同展示**，唔當研究級診斷——係設計上誠實嘅取捨，重點係閉環訓練體驗。
- **Q：係咪醫療產品？/ Is this a medical product?**
  A：唔係。定位係教育／訓練／神經回饋**原型**，幫用戶建立自我覺察同專注調節。

### 4.4 市場 / 發展
- **Q：邊個會用？點賺錢？/ Who uses it? How does it scale?**
  A：學生自用＋學校/補習/家長。因為 webcam 就用到，受眾唔再綁 EEG 硬件；跨 session 進度＝回訪/訂閱鈎。
- **Q：Box Breathing 點解有用？/ Why box breathing?**
  A：規律呼吸短時間內降低過高喚醒，幫你由太緊太散返去「專注但放鬆」；佢係接喺所有偵測後面嘅統一介入層。

### 4.5 限制（要主動、誠實）
- pilot n 細、未做長期對照；單通道 EEG 唔係臨床級；今日未現場 show EEG（藍牙穩定性風險，故用 Simulation 保證流程）。**分清「已做到」同「仲要證實」正正係我哋嘅嚴謹態度。**

---

## 5. 目前專案 Pros & Cons（SWOT）

### 5.1 優勢 Strengths
- **一個閉環、概念清晰**：偵測→視覺化→介入→量化，容易講、容易記。
- **無硬件都用到**：相機 fallback → 任何有 webcam 嘅人都試到，受眾大。
- **量度到「過程」唔止「結果」**：專注穩定度、恢復時間、跨 session 趨勢。
- **教育切入點強**：紙本 vs 平台對照實驗、老師固定卷、可匯出 PDF/CSV。
- **題目 timely**：老師都認同貼近年輕人需要。
- **誠實框架**：清楚分「已做到／待證實」，答辯加分。

### 5.2 弱點 Weaknesses（＝老師點名嗰啲）
- **模式太多、重點散** → 觀感「未有綜合感」。**→ 新策略：淨係 demo 學習模式、用閉環圖講「一件事」。**
- **展示訊息唔夠清** → **→ 新策略：問題行先、一句核心訊息、technical 落 Q&A。**
- **EEG 未現場 demo** → 主打賣點只能口述。**→ 用 Simulation 保證流程；EEG 留 Q&A＋願景。**
- **⚠️ 學習模式「溫習時冇隻船」**：老師／你條片都講「旁邊有隻小小漂流船、分心就飄開」，但**目前閱讀階段係收起隻船嘅**（船只喺測驗先返場）。呢個直接令「綜合感」打折。**→ 見下方建議。**
- **pilot 太細**：n≈2–3，未有對照組。

### 5.3 機會 Opportunities
- 學校 / 補習 / 家長市場；SEN／專注力訓練延伸；接真 EEG 做更 wow 嘅閉環；大樣本研究出真數據。

### 5.4 威脅 Threats
- 現場藍牙/EEG 不穩；評判追問長期實證；市面有 focus app 競爭（差異化＝**即時神經回饋＋量度過程**，唔只計時）。

### 5.5 🔑 重要產品建議（直接答老師「未有綜合感」）
**喺學習模式閱讀階段，加返一隻「小小的船」喺角落**，隨你嘅專注即時飄移（分心就飄開、專注就穩），唔遮住閱讀器。
- **點解**：老師同你條片都係咁描述；而家 demo 學習模式時閱讀階段冇船，會同你講嘅嘢對唔上，亦削弱「溫習＝遊戲＝專注」係**同一件事**嘅綜合感。加返一隻**細船**（唔搶閱讀）就一次過補返。
- **改動細**：目前 `runtime.js` 係 `boat.visible = !isStudyReading()`（閱讀時收起）。可改成閱讀時顯示一隻縮細、放角落嘅船，focus 一樣驅動佢。
- **權衡**：原設計刻意收起船，係驚阻住讀字——所以要**細＋放角**，平衡「唔分心」同「有綜合感」。
- **要唔要做**：呢個係產品/UX 決定，**Steven 拍板**；如果要，我可以即刻整（細船＋角落＋跟 focus 飄移）。

---

## 6. 現場執行 checklist（精簡）
- [ ] PPT 8 頁做好，Slide 2 條片嵌好、可離線播。
- [ ] Demo 機預先登入、揀好 生物/基礎、Simulation 行得通（唔靠場地 wifi：見 handbook 離線注意）。
- [ ] 講稿 A–E 計時 ≤ 3.5 分鐘，留 buffer。
- [ ] 每人知自己讀邊段、demo 邊個負責撳。
- [ ] Q&A 4.2 技術題至少各背一句。
- [ ] A0 海報閉環圖同 3 步截圖清晰。
- [ ] （如決定做）閱讀階段細船已加。
