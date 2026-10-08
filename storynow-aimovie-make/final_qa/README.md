# final_qa：第⑪步「最終品檢」

**最少只需要成片 mp4**，不依賴任何專案格式；有原始資料時加參數就能多量字幕與版面。
十二步流程做的片、範本 A～E 做的片都能跑，**不會修改任何檔案**。
2026-10 在範本E（教學課程產線）實際用於 EP1／EP2 驗收後抽出。

```bash
# 最少：只給影片
python final_qa/final_qa.py out/成片.mp4 --lufs -14

# 十二步流程做的片：加上 spec.json 與版面量測，字幕與版面一起量
python final_qa/final_qa.py out/成片.mp4 --lufs -14 \
    --spec src/data/spec.json --layout qa_layout.json \
    --terms "IP,DNS,HTTPS,443" --text 旁白全文.txt
```

輸出到 `<影片名>_品檢/`（或 `--out` 指定）：

| 檔案 | 內容 |
|---|---|
| `final_qa.html` | **報告**：結果摘要、逐項表格、明細、截圖總覽 |
| `final_qa.md` | 摘要（文字版） |
| `final_qa.json` | 全部數據 |
| `sheet.jpg` | 截圖總覽（均勻取 12 格） |

有未通過項目時 exit code 為 1。

## 檢查項目

**只看影片（一定會量）**

| 代號 | 檢查 | 怎麼量 | 門檻 |
|---|---|---|---|
| F1 | 字幕閃爍 | 逐格掃字幕帶（y 930～1020），前後有字、中間空 1～2 格 | 0 |
| F2 | 字幕抖動 | 同一頁字幕的白字外框，前後兩格一致而中間一格不同 | 0 |
| F3 | 黑畫面 | blackdetect pix_th 0.08（Remotion 全範圍色彩的黑＝16） | 無 >0.3 秒 |
| F4 | 最長靜止 | 4fps、480×270 逐格差分 | 參考 |
| F5 | 規格 | ffprobe | 1920×1080、30fps、H.264、AAC |
| F6 | 響度／峰值 | EBU R128（ebur128） | 目標 ±1 LU、≤ −1 dBTP |
| F7 | 中段無聲 | silencedetect −45dB 1.5 秒 | 0（`--silence-ok` 宣告設計上的無聲，例如測驗倒數） |
| F8 | 長度 | ffprobe | `--minutes` |
| F9 | 英數詞唸法（`--terms`） | **時長比對**：同詞重複 4 次送 TTS，跟逐字母／逐字／中文整數等候選比時長 | 每個詞都要「＝某個正確唸法」 |
| F10 | 多音詞（`--text`） | `多音字清單.json` 比對旁白 | 人工試聽 |

**有 `--spec spec.json` 時（十二步流程 build.py 產出的）**

| 代號 | 檢查 | 門檻 |
|---|---|---|
| G1 | 字幕句尾標點 | 0（句中標點另列） |
| G2 | Netflix 繁中字幕規範 | 每行 ≤16 字（必要時 18）、每秒 ≤9 字、每頁 5/6～7 秒 |
| G3 | 字幕串起來＝旁白原文 | 一致 |
| G4 | 字幕與旁白同步 | 每頁字幕落在所屬旁白句的時間內 ±0.25 秒（需要 spec 裡的 voiceLines；舊版沒有時標示「無法量」） |
| G5 | 唸法文字殘留 | 字幕不得出現「D N S」這類送進 TTS 的寫法 |
| G6 | 斷句不佳 | 一頁不得以「的、了、」」開頭 |

**有 `--layout qa_layout.json` 時**：把版面探針（engine/scripts/qa_layout.mjs，或範本E 的 qa_layout.mjs）的結果一起列入報告與判定。

## 規格出處

- 字幕：Netflix Partner Help Center「Chinese (Traditional) Timed Text Style Guide」「Timed Text Style Guide: General Requirements」
- 響度：EBU R128 量測
- 版面：Remotion 官方 agent skills（remotion-dev/skills）video-layout、W3C WCAG 2.x 1.4.3（對比）——由版面探針負責

**為什麼不用語音辨識判斷唸法**：中文模式的 whisper 對英文縮寫、數字唸法分辨不出來（實測 HTTP 21 次都沒聽出），只能當試聽清單。
**字幕帶位置**：預設 y 930～1020（本 skill 的字幕區在 y>930）。字幕在別處時用 `--band-y`、`--band-h`。

## 配音前後的共用工具（2026-10-06，從範本E 移植，所有範本都用）
| 工具 | 什麼時候 | 做什麼 |
|---|---|---|
| `review_prep.py`＋`review_report.py` | 交使用者審稿前 | 逐字審稿：審稿表（每句＋唸法要注意的地方）→ Claude 逐句審 → 審稿報告 HTML＋MD |
| `storyboard_page.py` | 配音前 | 分鏡預覽頁（截圖＋旁白）；截圖由 `engine/scripts/preview_stills.mjs` 或範本F／G 的 `make.py --preview` 產生 |
| `listen_crosscheck.py`＋`唸法接受清單.json` | 配音後 | 兩個 AI 交叉聽：AI 耳朵的疑點再用 whisper 聽，分確定／待聽／可接受／誤報 |
| `pause_check.py` | 配音後 | 句內超過 1.2 秒的停頓（只提醒） |
唸法標準題在 `engine/scripts/pron_test.py`（測 build.py 的 Gemini 唸法；專案可加 `唸法標準題.json`）；壞音檔關卡在 `engine/scripts/gemini_tts.py` 的 `bad_audio()`。

## 系列教學影片的品檢（2026-10-08，第二批階段 1）

級別寫在 `品檢分級.json`：**擋**＝第一支就擋；**提醒後擋**＝先只出報告，看前 3～5 支的誤報率，使用者同意後把「已升級」改 true；**提醒**＝只出報告。
刻意的例外：storyboard 場景寫 `"qaExempt": {"項目代號": "理由"}`，品檢總表會列出所有例外與理由。
每支品檢都用 `qa_record.py` 記錄結果與耗時到 `qa/品檢紀錄/`，`qa_summary.py` 彙整成 **品檢總表.md／.html**（含製作各步驟耗時）。`make_video.py` 全部自動跑。

| 工具 | 什麼時候 | 代號（級別） | 做什麼 |
|---|---|---|---|
| `code_check.py` | 配音前 | A1.執行／畫面／環境（擋）、A1.未標（提醒） | 場景 `verify` 的程式碼實際編譯執行（python、c、cpp），輸出要等於 `stdout` 且出現在畫面上；畫面像程式碼卻沒標 verify → 提醒 |
| `answer_check.py` | 配音前 | A2.答案／缺表（擋） | 場景標 `"exam": "114-專二-23"`，答案要等於 `科目包/<科目>/歷屆答案.json` 的官方參考答案 |
| `math_check.py` | 配音前 | A3.算錯／圈法／一致（擋）、A3.最簡（提醒後擋） | 卡諾圖每一圈與化簡結果、terms→place→ones 前後一致、readTable 比對結果自動驗證；`verify` 的 bool／calc／base 重算（sympy） |
| `read_list.py` | 配音前 | R.唸法清單（提醒） | 英數詞、數字、多音詞、符號、另寫念法實際送給 TTS 的字，審稿時看（範本E read_check 移植） |
| `voice_check.py` | 配音後 | B1.模型（擋）、B1.聲紋（提醒後擋） | 和系列樣片比：供應者／模型／聲音（Gemini auto 會自己換版本）；音高 ±8%、逐句語速中位數 ±10%、倒譜距離 ≤0.30 |
| 版面探針 `QaProbe.tsx` | 渲染前 | L.對比（提醒後擋） | WCAG AA 文字對比（範本E 移植，加讀 SVG 圖形的填色） |
| `final_qa.py` | 渲染後（自動） | F.最終品檢（擋） | 上表 F／G 各項 |
| `engine/scripts/assemble_series.py` | 合併長片 | M.合併前品檢（擋） | 每支都要有「通過」的 final_qa.json 才合併；封面＋片頭、縮停頓加速、響度正規化；寫合併紀錄與章節 |
| `seam_check.py` | 合併後 | M.長度／響度／接縫／章節（擋） | 每個接點的黑畫面、斷音、爆音、前後音量落差；YouTube 章節規則 |
| `selftest.py` | 改品檢規則後（pre-push 自動跑 `--fast`） | — | 27 種故意做壞的材料都要被抓到、乾淨的要通過 |

### 實測紀錄（2026-10-08）

- A3：卡諾圖 1、2 真實 storyboard 全部通過；故意改錯 6 處全部抓到
- B1：同一個聲音兩支 → 倒譜距離 0.092、語速中位數 5.12 vs 5.10；不同聲音（克隆 vs 雲哲）→ 距離 0.930、音高 −10%。
  最初用平均頻譜相似度，不同聲音也有 0.991 分不開；語速用整體平均會被念數字串的慢句拉偏 13%——兩者都已改掉
- L.對比：範本D 第一次實測 149 處不足——橘 1.93:1、綠 2.55:1、紅 2.23:1、橘標籤白字 2.08:1，是**範本配色本身**不合格；
  另修掉一個誤判：白字放在 SVG 標籤上，原本只讀 CSS 底色量成 1.15:1。調好範本D 配色前維持「提醒」
- 接縫：卡諾圖 1＋2＋驗算合成 6.4 分長片，原本把「下一支開場配樂從無聲直接進來」誤判成爆音，改成只抓「突然一下、馬上掉回去」的尖峰；
  驗算段開頭比前一支大聲 3.1 dB（上限 3）是真的
