# final_qa：第⑪步「最終品檢」

**最少只需要成片 mp4**，不依賴任何專案格式；有原始資料時加參數就能多量字幕與版面。
十一步流程做的片、範本 A～E 做的片都能跑，**不會修改任何檔案**。
2026-10 在範本E（教學課程產線）實際用於 EP1／EP2 驗收後抽出。

```bash
# 最少：只給影片
python final_qa/final_qa.py out/成片.mp4 --lufs -14

# 十一步流程做的片：加上 spec.json 與版面量測，字幕與版面一起量
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

**有 `--spec spec.json` 時（十一步流程 build.py 產出的）**

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
