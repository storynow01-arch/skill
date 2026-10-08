---
name: storynow-aimovie-make
description: 「從內容長出影片」的 AI 影片工作流——使用者給一句話＋資料（PDF、講義、純文字稿、活動通知），先理解內容、問三輪定調問題，再從內容產生 3 個完全不同的創意概念（含英文提示詞），經過文本審閱與 10 秒動態試看後，用程式手刻（Remotion 畫面＋numpy 配樂＋Gemini Flash TTS 或 edge-tts 旁白，依專案 .env.local 有無金鑰）做出成片並自動品檢。適用：宣傳片、招生影片、科系形象片、教學影片、微課、研習／活動說明影片。也在使用者說「做影片」「做一支宣傳片／招生片／教學影片」「手刻影片」「程式做影片」「產生創意概念」「做試看」，或輸入「資訊科範本1」「範本F」「範本G」時觸發。使用者說「系列教學影片」「調用教學影片的工作流」「做一整個科目的教學影片」「<科目>第 N 支」時走系列教學影片工作流（references/series-workflow.md）。使用者問「我的語音有哪些／目前有哪些聲音可以選／用我的聲音」時也觸發（跑 engine/scripts/list_voices.py 列出克隆與設計聲音）。
metadata:
  tags: video, remotion, numpy-audio, gemini-tts, creative-concept, recruitment, lesson, trailer, workflow
  author: storynow01-arch
---

# storynow-aimovie-make：從內容長出影片

## 這個 skill 的核心（先讀）

這不是「套模板、換外觀」的工具，是一位**創意總監＋工程師**。讓成品驚喜的是四件事，每一支影片都要做到：

1. **從內容長出畫面**：先讀懂內容的觀念、比喻、衝突，再讓**每一條資訊都變成一個會動的視覺比喻**（數字→計數器、流程→光點沿路、比喻→實景）。
2. **概念要真的不同**：3 個概念各有自己的世界觀、構圖、鏡頭、剪接、配樂，場景程式**為該概念重新寫**；只換顏色／字型／背景＝換皮，不算不同概念。
3. **聲音與畫面是同一件事**：切點對齊小節，每個畫面事件都有音效，旁白出現時音樂自動退後。
4. **人只在關鍵處決定**：六個煞車點（概念、文本、試看、分鏡預覽、聲音、成片抽檢）由使用者決定，其餘自動。

**做錯過的事（不要再犯）**：①把 10 種外觀風格當成「不同風格」（使用者看不出差別）；②直接沿用舊產線的分鏡、跳過「從內容產生概念」；③不問就把個資（手機、Email）放進會轉傳的影片；④照提示詞寫錯事實（提示詞說全國賽包辦，資料是分區賽）。

## 快速指令
| 使用者說 | 做什麼 |
|---|---|
| 「系列教學影片」「調用教學影片的工作流」「<科目>第 N 支」 | **照 [`references/series-workflow.md`](references/series-workflow.md)**：一個科目的整個系列（YouTube 教學頻道用）。甲 系列開始（大綱、**選範本或讓系統提案 3 個概念**、聲音、樣片、上架規格）→ 乙 每一支 13 步（老師提醒 → 寫稿＋存 AI 初稿 → 第⓪關 → 審稿 → 分鏡預覽 → make_video 一行出片 → 抽檢 → 上架資料 → 修改對照）→ 丙 合併長片（要合併時必走：**整集品檢不能省略**）。科目資料夾有 `系列設定.md` 就直接做下一支 |
| 「資訊科範本1」 | 照 [`templates/資訊科範本1/README.md`](templates/資訊科範本1/README.md)：活動說明（研習／座談）＋資訊科宣傳片，3 分半成片 |
| 「範本A」「闖關遊戲範本」 | 照 [`templates/範本A_闖關遊戲/README.md`](templates/範本A_闖關遊戲/README.md)：任何文本 → 遊戲畫面 |
| 「範本B」「手稿範本」 | 照 [`templates/範本B_創客手稿/README.md`](templates/範本B_創客手稿/README.md)：任何文本 → 一鏡到底筆記本 |
| 「範本C」「快剪範本」 | 照 [`templates/範本C_動態字體快剪/README.md`](templates/範本C_動態字體快剪/README.md)：任何文本 → 動態字體快剪 |
| 「範本D」「白板手繪」「手繪範本」 | 照 [`templates/範本D_白板手繪/README.md`](templates/範本D_白板手繪/README.md)：任何文本 → 白板手繪（一支馬克筆先描線再上色，一鏡到底） |
| 「範本E」「教學課程產線」「整門課的教學影片」 | 照 [`templates/範本E_教學課程產線/README.md`](templates/範本E_教學課程產線/README.md)：一整門課 → 幾十節風格一致（garychen-dark 深色科技風）的教學影片，合併成集；附四關品檢；配音用 **Gemini Flash TTS（自動最新版）**；**完整 15 步流程（建課程→寫稿分鏡→文稿檢查→逐字審稿→使用者審稿→分鏡預覽頁→選聲音→配音（唸法標準題、壞音檔關卡）→配音後聽檢（兩個 AI 交叉聽）→建置→版面探針→渲染合併→品檢→使用者抽檢→收工紀錄）見 [`templates/範本E_教學課程產線/規範/完整工作流程.md`](templates/範本E_教學課程產線/規範/完整工作流程.md)** |
| 「範本F」「開發者流程線」「01 風格」 | 照 [`templates/範本F_開發者流程線/README.md`](templates/範本F_開發者流程線/README.md)：有步驟的文本 → 深色開發者風（點陣底、上方流程節點列講到哪亮到哪、下方舞台換成對話氣泡／文件卡／任務卡／紅轉綠／檢查列，雙色標語收尾）＋輕柔配樂；可兩段式（活動說明→單位介紹）。寫 `storyboard.json` 後 `engine/make.py` 一行出片（edge-tts，不走 Remotion） |
| 「範本G」「動態圖卡教學」「06 風格」 | 照 [`templates/範本G_動態圖卡教學/README.md`](templates/範本G_動態圖卡教學/README.md)：教學文本 → 深藍光暈＋格線，段落標題膠囊，圖卡／圓環／打字機／分鏡格／要點膠囊／時間軸／問題→解法**在旁白念到時彈出**，段落上飄重疊轉場；只有旁白。寫 `storyboard.json` 後 `engine/make.py` 一行出片 |
| 「範本H」「螢幕模擬」「模擬螢幕錄影」「不錄螢幕的操作教學」 | 照 [`templates/範本H_螢幕模擬/README.md`](templates/範本H_螢幕模擬/README.md)：**給文本就產生像螢幕錄影的操作畫面**（不錄真實螢幕）——Windows 11 桌面＋Chrome（網址列打字、載入、DNS 錯誤頁、自訂網頁）＋Windows 終端機（指令逐行輸出）＋iPhone 訊息 App；游標滑過去點、逐字打字有按鍵聲、鏡頭平滑推近、白色泡泡＋螢光筆，**每個操作用旁白原文 cue 對時**。場景 title／screen／phone／recap，`make_video.py storyboard.json --template H`（同一套品質關卡） |
| 「做成範本」「新增範本」「把這個風格變成範本」「上傳範本」 | **照 [`templates/範本規格.md`](templates/範本規格.md) 的「新增範本 SOP」做**：先試作給使用者看 → 在 `templates/範本清單.json` 登記 → 寫程式（預設共用引擎型：`tpl/Template<代號>.tsx`＋`make_video.py --template <代號>`）→ 分鏡預覽給使用者看 ⛔ → 正式出片＋最終品檢全過 → 30 秒示範片（演出每一種場景與招牌特效）→ README 固定段落＋完整版提示詞 → 登記各處 → `python templates/check_templates.py` 全部 ✓ 才 push |
| 「加封面／片頭／LOGO」 | **選用**：只有使用者要求時才在 storyboard 加 `"brand": {"dir": "<素材資料夾>"}`（cover.jpg、intro.mp4、logo.png）；沒寫就不加任何封面片頭。範本 A～D 的引擎都支援（10/5 在範本D 實作時使用者要求加入），範本E 用自己的 `assemble.py` 接封面片頭，細節見 [`templates/範本風格_場景語彙.md`](templates/範本風格_場景語彙.md) 的「品牌素材」 |
| 「用範本做」＋文本（沒指定哪個） | AskUserQuestion 讓使用者選 A／B／C／D（附一句特色），或「全部都做」；有明確步驟的內容可另外推薦 F，觀念教學可推薦 G，要示範電腦／手機操作推薦 H（F／G 用自己的 storyboard 格式，不吃 A～D 的 storyboard） |
| 「做影片」＋資料 | 走完整十二步流程（下方） |
| 「用 XX 概念做這份內容」 | 從第 ② 步開始，第 ④ 步直接採用指定概念，但仍要重新設計分鏡 |

## 範本流程（使用者丟文本、選範本時用；比十二步流程快）
1. 讀文本 → 依 [`templates/範本風格_場景語彙.md`](templates/範本風格_場景語彙.md) 拆成 9 種場景（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd），寫 `storyboard.json`
2. **逐字審稿**：`python final_qa/review_prep.py storyboard.json` 產出審稿表 → Claude 逐句審（清單見 workflow.md「逐字審稿」）寫進 `審稿筆記.json` → `python final_qa/review_report.py qa/逐字審稿` → 連同文本給使用者審 ⛔（事實、旁白、場景型別、審稿建議）
3. `new_project.py <專案>` → **分鏡預覽** `make_video.py storyboard.json --template A|B|C|D|H --preview`（edge-tts 暫配、不花 Gemini 額度，每場一張截圖＋旁白 → `qa/分鏡預覽/分鏡預覽.html`）給使用者看畫面 ⛔
4. **`make_video.py storyboard.json --template A|B|C|D|H`**（一行：同步範本程式→檢查圖示→文稿檢查→**唸法標準題**→建置（Gemini 過**壞音檔關卡**）→音效→AI 耳朵→**兩個 AI 交叉聽**→**句內停頓**→品檢→算圖→響度→成片品檢）
5. **概念忠實度**：照 make_video 最後印出的清單，用連續格逐項核對招牌特徵（技術品檢管不到這個）
6. **抽檢回報 → 品檢規則**：使用者看片回報「第幾秒、看到什麼」→ 找根因修好 → **把這類問題加進品檢規則或標準題**，不只修這一支
7. **收工紀錄**：專案的 `進度.md` 寫做了什麼、為什麼、踩到的坑、下一步（可直接照跑的指令）；多次對話接續才找得回來
8. 範本F／G、資訊科範本1 也是同樣的步驟：`make.py <專案> --preview`／`make_info1.py --preview` 做分鏡預覽，正式出片時自動跑交叉聽與停頓檢查
9. 同一份 storyboard 可以換範本重算，分鏡與旁白不用改（`snapBars` 依範本曲速重新對拍）；圖示欄位寫 emoji 或線稿名都可（見 `lib/sketches.ts`）

## 十二步流程（2026-10-07 起：分鏡預覽獨立成⑦、交付沉澱移到最後，跟範本E 15 步同順序；細節見 [`references/workflow.md`](references/workflow.md)）

| 步驟 | 內容 | 煞車點 |
|---|---|---|
| ① 輸入 | 專案資料夾路徑＋一句話＋資料。資料複製到 `00_資料/` | |
| ② 理解素材 | 產出 `01_事實清單.md`（宣傳類，逐條標來源頁碼）或 `01_內容分析.md`（教學類：觀念、比喻、迷思、**衝突→解答骨架**）。**列出資料衝突與敏感資訊** | |
| ③ 定調問答 | AskUserQuestion 三輪、每輪 ≤4 題、選擇題＋推薦預設（題庫：[`references/question-bank.md`](references/question-bank.md)） | |
| ④ 創意概念 | 產出 `02_三種創意概念.md`：3 個**全新**概念，各附英文提示詞（格式同 [`references/prompts/01_…原始提示詞.md`](references/prompts/01_旗艦科技宣傳片_原始提示詞.md)）＋中文對照＋比較表（方法：[`references/concept-design.md`](references/concept-design.md)） | ⛔ |
| ⑤ 文本 | `03_分鏡文本.md`：每場景的畫面／旁白／大字卡／秒數＋**事實核對表**；多概念時同一旁白對照多種畫面。**交使用者審之前先做逐字審稿**（`final_qa/review_prep.py` 審稿表 → Claude 逐句審 → `final_qa/review_report.py` 報告）**並跑文稿檢查** `python final_qa/term_check.py <文稿或 storyboard.json> --out 11_品檢/文稿檢查`（網址／協定／產品名寫法、年份與百分比、大陸用語、唸法寫進稿子；規則 `final_qa/用詞規範.json`；必改 0 才往下） | ⛔ |
| ⑥ 動態試看 | 每概念 **10 秒**動態短片（新寫場景程式＋專屬配樂與音效），不是靜態圖 | ⛔ |
| ⑦ 分鏡預覽 | 概念與文本定了之後、配音前：`make_video.py storyboard.json --template A|B|C|D|H --preview`（範本F／G：`make.py <專案> --preview`；資訊科範本1：`make_info1.py --preview`）——edge-tts 暫配（不花 Gemini 額度）→ 建置 → 每場在「物件都出現了」那一格截圖 → `qa/分鏡預覽/分鏡預覽.html`（截圖＋場景型別＋旁白）。畫面文字、圖示、比喻、順序在這裡就改掉 | ⛔ |
| ⑧ 細節（選聲音） | 旁白聲音試聽：依內容與使用者要求（性別、年齡、個性、粗細／深沉、語速）寫 3 段聲音描述，**`python engine/scripts/voice_preview.py --out 05_聲音試聽 --line "台詞" --voice "A=描述" --voice "B=描述" --voice "C=描述"`** 產出固定格式試聽頁（聲音內嵌、附音高與語速）；使用者選定後把 voices.json 的 voice_id 寫進 storyboard 的 voice；字幕樣式 | ⛔ |
| ⑨ 製作 | **唸法標準題**（`engine/scripts/pron_test.py`，沒全過不配音）→ 旁白（配音規則：專案 `.env.local` 有 Gemini 金鑰才用 Gemini，否則 edge-tts；Gemini 整支片的句子批次合成、whisper 對齊切回逐句、**壞音檔關卡**）→ 時間軸（旁白長度補足到整數小節）→ 配樂＋事件音效＋人聲閃避 → Remotion 場景 → 算圖 | |
| ⑩ 品檢 | **配音後**：AI 耳朵（`ai_listen.py`）→ **兩個 AI 交叉聽**（`final_qa/listen_crosscheck.py`，只有確定／待聽要人聽）→ **句內停頓**（`final_qa/pause_check.py`，只提醒）；**`qa.py` 自動品檢**：版面（瀏覽器內量測重疊／超出畫面／闖進字幕區）、旁白回聽（whisper 比對稿子）、黑畫面／無聲／響度／長度、總覽圖＋`qa_report.md`；有「必修」就修正重算（[`references/production.md`](references/production.md)）；**再做概念忠實度檢查**：用連續格逐項核對範本 README 的招牌特徵（技術全過≠概念還在） | |
| ⑪ 最終品檢 | **對要交出去的那支 mp4 再量一次**（⑩ 量的是製作中的版本，重新算圖、合併、響度處理都可能帶進新問題）：`python final_qa/final_qa.py out/成片.mp4 --lufs -14 --spec src/data/spec.json --layout qa_layout.json --terms <英數詞> --text <旁白全文>`，交出 `final_qa.html`＋`final_qa.md`——字幕閃爍／抖動、字幕＝旁白與同步、黑畫面、規格、響度、無聲、長度、版面、英數詞唸法（時長比對）、多音詞試聽清單；有字幕就依 Netflix 繁中字幕規範（每行 ≤16 字、每秒 ≤9 字）。全部通過才算交付（[`final_qa/README.md`](final_qa/README.md)） | |
| ⑫ 交付沉澱 | 最終品檢通過的成片交使用者**抽檢** ⛔＋把使用者喜歡的概念存進 `references/prompts/`、場景程式存進 `concepts/`；**抽檢回報（第幾秒、看到什麼）→ 修好並把這類問題加進品檢規則**；**收工紀錄**（`進度.md`：做了什麼、為什麼、坑、下一步） | ⛔ |

使用者回答模糊（例如選項沒有的「1 和 4」）時，**用下一輪問題確認，不要猜**。

## 工具與檔案

```
engine/
  template/        Remotion 專案範本（theme／kit／scenes／lesson／mediaScenes／motion／lib 元件庫／custom／QaProbe）—— new_project.py 會複製它
  scripts/         new_project.py（建專案）、build.py（storyboard→照片解析→旁白→時間軸→配樂→側鏈閃避→spec.json）、
                   gemini_tts.py（Gemini 配音共用模組：自動用最新 Flash TTS）、voice_preview.py（第⑧步聲音試聽頁）、qa.py＋qa_layout.mjs（自動品檢）、
                   make_music.py（13 種曲風 numpy 合成＋音效）、from_ai_pipeline.py（舊產線 .md+plan → storyboard，選用）、
                   pron_zh-TW.json（唸法：IP 逐字、縮寫拆字母）、pron_test.py（唸法標準題）、preview_stills.mjs（分鏡預覽截圖）、
                   ai_listen.py（配音後 AI 耳朵；A～D、F、G、資訊科範本1 共用）、
                   revision.py（修改紀錄：AI 初稿／審稿後快照＋修改對照）、publish_meta.py（上架資料檢查後寫進上架清單.csv）
  examples/        storyboard 範例（教學、宣傳、活動說明、舊產線轉換）
concepts/          做過的概念場景程式（參考實作，新影片要依內容改寫，不要直接套）
  levelup/ notebook/ kinetic/ lesson-logistics/ lesson-sitcom/ lesson-cable/ audio/
references/        流程、題庫、概念方法、製作與品檢、教訓、提示詞庫（prompts/）、實作範例（examples/：事實清單、內容分析、三概念分鏡）
templates/資訊科範本1/   研習說明＋資訊科宣傳片（含宣傳片原始碼）
templates/範本A～D_*/   範本風格（README：原始提示詞、忠實度檢查、範本設定）；範本風格_場景語彙.md＝四個範本共用的 9 種場景
templates/範本E_教學課程產線/  整門課的教學影片產線（自成一包：engine／規範／examples，new_course.py 建新課程；15 步流程（規範/完整工作流程.md 開頭有總覽表）；含四關品檢＋自我測試；
                   tts_gemini.py＝Gemini 配音（整節成功才覆寫、對齊檢查），tts.py＝edge-tts 備用；qa/term_check.py＝文稿檢查、
                   qa/read_check.py＝唸法清單、qa/ai_listen.py＝配音後 AI 耳朵聽檢、qa/poly_ab.py＝多音詞判讀（edge 用）；
                   規範/配音設定.json 已填選定聲音：作者的克隆聲音 storynow01＋風格 11C（同一把付費 key 才叫得到，別的 key 清空 voice_id 會依描述重新設計））
templates/範本F_開發者流程線/  01 風格（自成一包）：engine（make.py 一行出片、lib_F.js 畫面庫、render.mjs 逐格截圖、build_audio.py、make_music.py）、
                   examples（04 研習＋資訊科兩段式、01 Matt Pocock）、截圖（逐段截圖）、原始提示詞與完整版提示詞
templates/範本H_螢幕模擬/  給文本產生螢幕錄影般的操作畫面（共用 make_video；元件庫 engine/template/src/lib/screen.tsx、渲染器 tpl/TemplateH.tsx、build.py resolve_screen 把動作 cue 換算秒數）、範例 1-3 DNS、示範片、完整版提示詞
templates/範本G_動態圖卡教學/  06 風格（自成一包）：engine（make.py、lib_G.js、render.mjs、build_audio.py）、examples（06 教學動畫）、截圖、原始提示詞與完整版提示詞
科目包/            科目專用的教法、念法（念法.json）、專用場景用法；storyboard 寫 "subject": "<科目>" 就套用（見 科目包/README.md）
final_qa/          第⑪步最終品檢（只需要 mp4，任何範本都能用）：final_qa.py、pron_check.py（唸法時長比對）、多音字清單.json；
                   term_check.py＋用詞規範.json＝第⑤步文稿檢查（第⓪關：配音前檢查專業用詞與寫法）；
                   review_prep.py＋review_report.py＝逐字審稿、storyboard_page.py＝分鏡預覽頁、listen_crosscheck.py＋唸法接受清單.json＝兩個 AI 交叉聽、
                   pause_check.py＝句內停頓（2026-10-06 從範本E 移植，所有範本共用）
```

## 四項增強（2026-10-01）
| 功能 | 怎麼用 | 沒有素材時 |
|---|---|---|
| **真實照片／影片** | storyboard 設 `"mediaDir": "./素材"`；場景 props 寫 `"media": "檔名或關鍵字"`；場景型別 `photo`／`gallery`／`split`，或在自訂場景用 `lib/media` 的 `<Photo>` | **自動退回插畫**（`fallback: {icon, label, colors}`），build 會列出缺哪幾張，影片照常產出 |
| **概念元件庫** | `engine/template/src/lib/`：camera（一鏡到底）、iso（等角世界）、character（角色劇）、kinetic（動態字體）、pixel（像素遊戲）、tunnel（縱深隧道）、draw（手繪描線）、penkit（筆跟著筆跡）、sketches（線稿庫）、whiteboard（白板手繪引擎＋彩色圖示庫，範本D）、media | — |
| **自動品檢** | `python engine/scripts/qa.py [--video out/x.mp4]` | — |
| **聲音升級** | 專案自己的 `.env.local` 有 `GEMINI_API_KEY` 才用 Gemini Flash TTS（自動最新正式版），沒有就用 edge-tts；聲音用 `"description"` 描述、第一次自動設計；逐句覆寫 `{"text", "voice", "style"}`；`"voices"` 定義角色聲音；旁白自動 EQ＋壓縮；音樂用旁白包絡做側鏈閃避；配樂母帶；備用 edge-tts／Azure（`"provider"`） | 沒有金鑰自動退回 edge-tts 並警告 |

**建專案**：`python engine/scripts/new_project.py <資料夾> --example teach|promo`（同機已有專案可用 junction 共用 `node_modules`）
**建置**：`python engine/scripts/build.py storyboard.json [--style X]`
**算圖**：`npx remotion render src/index.ts <Composition> out/x.mp4 --concurrency=4 --crf=18 --audio-codec=aac`
**響度**：`ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=9 -c:a aac out.mp4`

## 硬規則
- **在這個 skill 倉庫第一次 push 前，先確認 push 前檢查已啟用**：`git config --get core.hooksPath` 不是 `.githooks` 就執行 `git config core.hooksPath .githooks`（git 不會自動啟用倉庫帶來的 hook，每個 clone 要啟用一次；啟用後每次 push 都會自動跑範本檢查，沒過推不上去）。
- **push 這個 skill 之前一定跑 `python templates/check_templates.py`**，有 ✗ 就先補齊，不推（規格：[`templates/範本規格.md`](templates/範本規格.md)）。自帶產線型範本（E、F、G、資訊科範本1）的流程受保護：只補 README 段落與登記，不為了規格改它的流程、引擎、規範；範本E 只能在本機課程專案改再匯出。
- **文稿寫專業寫法，唸法交給程式**：網址寫 mail.google.com（不寫「mail 點 google 點 com」）、年份與百分比用阿拉伯數字；配音前跑 `final_qa/term_check.py`，必改 0 才配音。
- **配音選擇規則（2026-10-06，外層工作流與所有範本一致）**：專案自己的 `.env.local` 有 `GEMINI_API_KEY` 才用 Gemini Flash TTS（自動最新正式版），沒有就用 edge-tts。只看這個專案的 `.env.local`，不讀系統環境變數、不借上層資料夾別的專案的金鑰。用 Gemini 時 `model="auto"` 自動挑最新版，不要寫死；金鑰不可進 git。Gemini 音檔一律過**壞音檔關卡**（`gemini_tts.bad_audio`：長時間無聲、語速異常 → 不進快取、重跑重新要）。
- **配音前先讀 [`references/gemini-voice-lessons.md`](references/gemini-voice-lessons.md)**：網址唸法（字母間的 . → 點、單獨 com 前加點、edu／gov／tw 逐字母）、「；」與「……」的切句坑、AI 耳朵唸法約定。使用者說「用我的聲音／克隆聲音」→ 照 `engine/scripts/voices.json` 的 `storynow01`（voice_id＋選定風格）。
- **使用者問「目前我的語音有哪些可以選擇」**（或「我有哪些聲音」「列出我的語音」）→ 在專案資料夾跑 `python <skill>/engine/scripts/list_voices.py`（要 `.env.local` 的 GEMINI_API_KEY），把結果整理成表格回覆：名稱、類型（克隆／文字設計）、voice_id、選定風格與其他風格、語速、到期日，★標預設；最後告訴使用者怎麼指定（「用 storynow01 配音，風格 11C」）。要給人看的頁面加 `--html 我的語音.html`。只列這把金鑰專案裡的聲音，不列 Google 內建的 prebuilt。
- **做某一科的教學影片前，先讀 `科目包/<科目>/README.md`**，storyboard 加 `"subject": "<科目>"`；這科新學到的教法、念法、坑寫回科目包，不寫進 SKILL.md 或範本 README（2026-10-08）。
- 數字、校名、名次**逐條對資料**；資料與提示詞衝突時照資料，並明講差異。
- 會轉傳的影片：手機、個人 Email、學生姓名等**先問再放**。
- 回覆一律繁體中文。
- 一次只跑一個算圖；長批次寫成 shell 迴圈並把進度寫入 log。
- 程式／畫面的版面：字幕區在畫面底部約 y>930，內容不要放進去。
