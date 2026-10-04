---
name: storynow-aimovie-make
description: 「從內容長出影片」的 AI 影片工作流——使用者給一句話＋資料（PDF、講義、純文字稿、活動通知），先理解內容、問三輪定調問題，再從內容產生 3 個完全不同的創意概念（含英文提示詞），經過文本審閱與 10 秒動態試看後，用程式手刻（Remotion 畫面＋numpy 配樂＋edge-tts 旁白）做出成片並自動品檢。適用：宣傳片、招生影片、科系形象片、教學影片、微課、研習／活動說明影片。也在使用者說「做影片」「做一支宣傳片／招生片／教學影片」「手刻影片」「程式做影片」「產生創意概念」「做試看」，或輸入「資訊科範本1」時觸發。
metadata:
  tags: video, remotion, numpy-audio, edge-tts, creative-concept, recruitment, lesson, trailer, workflow
  author: storynow01-arch
---

# storynow-aimovie-make：從內容長出影片

## 這個 skill 的核心（先讀）

這不是「套模板、換外觀」的工具，是一位**創意總監＋工程師**。讓成品驚喜的是四件事，每一支影片都要做到：

1. **從內容長出畫面**：先讀懂內容的觀念、比喻、衝突，再讓**每一條資訊都變成一個會動的視覺比喻**（數字→計數器、流程→光點沿路、比喻→實景）。
2. **概念要真的不同**：3 個概念各有自己的世界觀、構圖、鏡頭、剪接、配樂，場景程式**為該概念重新寫**；只換顏色／字型／背景＝換皮，不算不同概念。
3. **聲音與畫面是同一件事**：切點對齊小節，每個畫面事件都有音效，旁白出現時音樂自動退後。
4. **人只在關鍵處決定**：四個煞車點（概念、文本、試看、聲音）由使用者決定，其餘自動。

**做錯過的事（不要再犯）**：①把 10 種外觀風格當成「不同風格」（使用者看不出差別）；②直接沿用舊產線的分鏡、跳過「從內容產生概念」；③不問就把個資（手機、Email）放進會轉傳的影片；④照提示詞寫錯事實（提示詞說全國賽包辦，資料是分區賽）。

## 快速指令
| 使用者說 | 做什麼 |
|---|---|
| 「資訊科範本1」 | 照 [`templates/資訊科範本1/README.md`](templates/資訊科範本1/README.md)：活動說明（研習／座談）＋資訊科宣傳片，3 分半成片 |
| 「範本A」「闖關遊戲範本」 | 照 [`templates/範本A_闖關遊戲/README.md`](templates/範本A_闖關遊戲/README.md)：任何文本 → 遊戲畫面 |
| 「範本B」「手稿範本」 | 照 [`templates/範本B_創客手稿/README.md`](templates/範本B_創客手稿/README.md)：任何文本 → 一鏡到底筆記本 |
| 「範本C」「快剪範本」 | 照 [`templates/範本C_動態字體快剪/README.md`](templates/範本C_動態字體快剪/README.md)：任何文本 → 動態字體快剪 |
| 「範本D」「白板手繪」「手繪範本」 | 照 [`templates/範本D_白板手繪/README.md`](templates/範本D_白板手繪/README.md)：任何文本 → 白板手繪（一支馬克筆先描線再上色，一鏡到底） |
| 「範本E」「教學課程產線」「整門課的教學影片」 | 照 [`templates/範本E_教學課程產線/README.md`](templates/範本E_教學課程產線/README.md)：一整門課 → 幾十節風格一致（garychen-dark 深色科技風）的教學影片，合併成集；附四關品檢；配音用 **Gemini 3.8 Flash TTS**（金鑰放課程根目錄 `.env.local`，見範本 README「配音」） |
| 「用範本做」＋文本（沒指定哪個） | AskUserQuestion 讓使用者選 A／B／C／D（附一句特色），或「全部都做」 |
| 「做影片」＋資料 | 走完整十一步流程（下方） |
| 「用 XX 概念做這份內容」 | 從第 ② 步開始，第 ④ 步直接採用指定概念，但仍要重新設計分鏡 |

## 範本流程（使用者丟文本、選範本時用；比十步流程快）
1. 讀文本 → 依 [`templates/範本風格_場景語彙.md`](templates/範本風格_場景語彙.md) 拆成 9 種場景（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd），寫 `storyboard.json`
2. 給使用者審文本 ⛔（事實、旁白、場景型別）
3. `new_project.py <專案>` → **`make_video.py storyboard.json --template A|B|C|D`**（一行：同步範本程式→檢查圖示→建置→音效→品檢→算圖→響度→成片品檢）
4. **概念忠實度**：照 make_video 最後印出的清單，用連續格逐項核對招牌特徵（技術品檢管不到這個）
5. 同一份 storyboard 可以換範本重算，分鏡與旁白不用改（`snapBars` 依範本曲速重新對拍）；圖示欄位寫 emoji 或線稿名都可（見 `lib/sketches.ts`）

## 十一步流程（細節見 [`references/workflow.md`](references/workflow.md)）

| 步驟 | 內容 | 煞車點 |
|---|---|---|
| ① 輸入 | 專案資料夾路徑＋一句話＋資料。資料複製到 `00_資料/` | |
| ② 理解素材 | 產出 `01_事實清單.md`（宣傳類，逐條標來源頁碼）或 `01_內容分析.md`（教學類：觀念、比喻、迷思、**衝突→解答骨架**）。**列出資料衝突與敏感資訊** | |
| ③ 定調問答 | AskUserQuestion 三輪、每輪 ≤4 題、選擇題＋推薦預設（題庫：[`references/question-bank.md`](references/question-bank.md)） | |
| ④ 創意概念 | 產出 `02_三種創意概念.md`：3 個**全新**概念，各附英文提示詞（格式同 [`references/prompts/01_…原始提示詞.md`](references/prompts/01_旗艦科技宣傳片_原始提示詞.md)）＋中文對照＋比較表（方法：[`references/concept-design.md`](references/concept-design.md)） | ⛔ |
| ⑤ 文本 | `03_分鏡文本.md`：每場景的畫面／旁白／大字卡／秒數＋**事實核對表**；多概念時同一旁白對照多種畫面 | ⛔ |
| ⑥ 動態試看 | 每概念 **10 秒**動態短片（新寫場景程式＋專屬配樂與音效），不是靜態圖 | ⛔ |
| ⑦ 細節 | 旁白聲音試聽（同一句話三種聲音）、語速、字幕樣式 | ⛔ |
| ⑧ 製作 | 旁白逐句 TTS → 時間軸（旁白長度補足到整數小節）→ 配樂＋事件音效＋人聲閃避 → Remotion 場景 → 算圖 | |
| ⑨ 品檢 | **`qa.py` 自動品檢**：版面（瀏覽器內量測重疊／超出畫面／闖進字幕區）、旁白回聽（whisper 比對稿子）、黑畫面／無聲／響度／長度、總覽圖＋`qa_report.md`；有「必修」就修正重算（[`references/production.md`](references/production.md)）；**再做概念忠實度檢查**：用連續格逐項核對範本 README 的招牌特徵（技術全過≠概念還在） | |
| ⑩ 交付沉澱 | 成片＋把使用者喜歡的概念存進 `references/prompts/`、場景程式存進 `concepts/` | |
| ⑪ 最終品檢 | **對要交出去的那支 mp4 再量一次**（⑨ 量的是製作中的版本，重新算圖、合併、響度處理都可能帶進新問題）：`python final_qa/final_qa.py out/成片.mp4 --lufs -14 --spec src/data/spec.json --layout qa_layout.json --terms <英數詞> --text <旁白全文>`，交出 `final_qa.html`＋`final_qa.md`——字幕閃爍／抖動、字幕＝旁白與同步、黑畫面、規格、響度、無聲、長度、版面、英數詞唸法（時長比對）、多音詞試聽清單；有字幕就依 Netflix 繁中字幕規範（每行 ≤16 字、每秒 ≤9 字）。全部通過才算交付（[`final_qa/README.md`](final_qa/README.md)） | |

使用者回答模糊（例如選項沒有的「1 和 4」）時，**用下一輪問題確認，不要猜**。

## 工具與檔案

```
engine/
  template/        Remotion 專案範本（theme／kit／scenes／lesson／mediaScenes／motion／lib 元件庫／custom／QaProbe）—— new_project.py 會複製它
  scripts/         new_project.py（建專案）、build.py（storyboard→照片解析→旁白→時間軸→配樂→側鏈閃避→spec.json）、qa.py＋qa_layout.mjs（自動品檢）、
                   make_music.py（13 種曲風 numpy 合成＋音效）、from_ai_pipeline.py（舊產線 .md+plan → storyboard，選用）、
                   pron_zh-TW.json（唸法：IP 逐字、縮寫拆字母）
  examples/        storyboard 範例（教學、宣傳、活動說明、舊產線轉換）
concepts/          做過的概念場景程式（參考實作，新影片要依內容改寫，不要直接套）
  levelup/ notebook/ kinetic/ lesson-logistics/ lesson-sitcom/ lesson-cable/ audio/
references/        流程、題庫、概念方法、製作與品檢、教訓、提示詞庫（prompts/）、實作範例（examples/：事實清單、內容分析、三概念分鏡）
templates/資訊科範本1/   研習說明＋資訊科宣傳片（含宣傳片原始碼）
templates/範本A～D_*/   範本風格（README：原始提示詞、忠實度檢查、範本設定）；範本風格_場景語彙.md＝四個範本共用的 9 種場景
templates/範本E_教學課程產線/  整門課的教學影片產線（自成一包：engine／規範／examples，new_course.py 建新課程；含四關品檢＋自我測試；
                   tts_gemini.py＝Gemini 3.8 Flash TTS 配音＋whisper 對齊時間戳，tts.py＝edge-tts 備用；qa/poly_ab.py＝多音詞 AI 判讀）
final_qa/          第⑪步最終品檢（只需要 mp4，任何範本都能用）：final_qa.py、pron_check.py（唸法時長比對）、多音字清單.json
```

## 四項增強（2026-10-01）
| 功能 | 怎麼用 | 沒有素材時 |
|---|---|---|
| **真實照片／影片** | storyboard 設 `"mediaDir": "./素材"`；場景 props 寫 `"media": "檔名或關鍵字"`；場景型別 `photo`／`gallery`／`split`，或在自訂場景用 `lib/media` 的 `<Photo>` | **自動退回插畫**（`fallback: {icon, label, colors}`），build 會列出缺哪幾張，影片照常產出 |
| **概念元件庫** | `engine/template/src/lib/`：camera（一鏡到底）、iso（等角世界）、character（角色劇）、kinetic（動態字體）、pixel（像素遊戲）、tunnel（縱深隧道）、draw（手繪描線）、penkit（筆跟著筆跡）、sketches（線稿庫）、whiteboard（白板手繪引擎＋彩色圖示庫，範本D）、media | — |
| **自動品檢** | `python engine/scripts/qa.py [--video out/x.mp4]` | — |
| **聲音升級** | 逐句覆寫 `{"text", "voice", "rate", "pitch", "volume"}`；`"voices"` 定義角色聲音；旁白自動 EQ＋壓縮；音樂用旁白包絡做側鏈閃避；配樂母帶（殘響＋匯流排壓縮＋限幅）；選用 Azure（`"provider": "azure"`＋環境變數） | — |

**建專案**：`python engine/scripts/new_project.py <資料夾> --example teach|promo`（同機已有專案可用 junction 共用 `node_modules`）
**建置**：`python engine/scripts/build.py storyboard.json [--style X]`
**算圖**：`npx remotion render src/index.ts <Composition> out/x.mp4 --concurrency=4 --crf=18 --audio-codec=aac`
**響度**：`ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=9 -c:a aac out.mp4`

## 硬規則
- 數字、校名、名次**逐條對資料**；資料與提示詞衝突時照資料，並明講差異。
- 會轉傳的影片：手機、個人 Email、學生姓名等**先問再放**。
- 回覆一律繁體中文。
- 一次只跑一個算圖；長批次寫成 shell 迴圈並把進度寫入 log。
- 程式／畫面的版面：字幕區在畫面底部約 y>930，內容不要放進去。
