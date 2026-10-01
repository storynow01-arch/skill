# 範本B_創客手稿：創客手稿 Maker's Notebook

> 來源：2026-10-01 招生片三概念試做，使用者評價「這三個提示詞的風格流程都很好」。
> 觸發：使用者說「**範本B／手稿範本／筆記本風**」，或在選範本時選 B。
> 用法：**丟任何文本 → 拆成共用場景語彙 → 選本範本 → 產出同一風格的影片**。

## 適合
觀念教學、微課、「我也做得到」的溫暖內容；最後會拉遠看整本筆記

## 原始提示詞（招生片版本，逐字保存）
```
Create a 60-second recruitment video programmatically, coded and rendered with whatever tools you need.
One continuous camera move glides across a giant maker's desk and grid notebook, where an invisible pen draws everything
in real time — for the IT Department of Haiching Industrial High School (海青工商資訊科). Title: "你的未來，自己寫".

1. First Line: a pen writes print("Hello") on the notebook; the ink lines grow into the hand-lettered title.
2. Sketch to Reality: hand-drawn sketches of C/Python code, an AI eye recognising doodles, an ESP32 wiring diagram and
   a robot arm — each sketch "comes alive": lines animate, LEDs light up, the arm moves on the page.
3. The Trophy Page: polaroid photos and tape slide onto the page; numbers are hand-written and circled with a marker —
   10 WorldSkills competitors, 12 national golds, a regional gold/silver/bronze sweep stamped like stickers.
4. Next Chapter: university names are written on sticky notes and pinned to a map — 26 admissions to national universities.
5. Your Page: the camera pulls back to a blank page; the pen writes "你的未來，自己寫" and stops, waiting for you.

Visuals: SVG line drawing (stroke reveal), paper texture, tape, sticky notes, polaroids, marker circles, hand-lettering;
the camera never cuts — it pans, zooms and rotates across one huge canvas.
Audio: warm lo-fi / acoustic hip-hop at 90 BPM with pencil-scribble, paper-slide and tape sound effects.
Narration: a senior student, calm and encouraging, like showing you their own notebook.
```

## 範本設定
| 項目 | 設定 |
|---|---|
| Composition | `TemplateB`（`engine/template/src/tpl/TemplateB.tsx`） |
| 配樂 | `"music": {"genre": "acoustic", "bpm": 90, "key": "G"}` |
| 旁白 | 溫暖、像拿筆記本給你看；建議女聲曉臻 +12～15% 或男聲雲哲 +15% |
| 字幕 | 紙膠帶條（霞鶩文楷） |
| 音效 | 鉛筆沙沙聲、紙張滑入、貼紙「啪」（`tpl_sfx.py B`） |
| 切點 | `"snapBars": true`（場景補足整數小節） |

## 場景對應
| 場景 | 畫面 |
|---|---|
| title | 手寫大標＋紅筆底線＋英文副標 |
| scenario | 大圓圈圖示＋手繪核取方塊逐項打勾，最後一項紅叉 |
| definition | 標籤貼紙＋大字描出＋螢光筆畫過標亮字＋便利貼註解 |
| cards | 便利貼一張張貼上（圖示＋標題＋說明） |
| vs | 兩個手繪框，右上角蓋 ✕／✓ 印章 |
| stat | 手寫巨大數字＋紅筆圈起來 |
| quiz | 選項框，揭曉時紅筆圈出答案 |
| recap | 「今天帶走」打勾清單＋箭頭「下一節」 |
| qaEnd | 2×2 選項框，時間到紅筆圈答案 |

## 執行步驟
1. **拿到文本**（講義、旁白稿、活動資料）→ 依 [`../範本風格_場景語彙.md`](../範本風格_場景語彙.md) 拆成 9 種場景，寫出 `storyboard.json`（旁白一行一句）。
2. **給使用者審文本** ⛔（場景表：型別、畫面重點、旁白）。
3. 建專案並建置：
   ```bash
   python <skill>/engine/scripts/new_project.py <專案> --no-install   # 再 npm install 或 junction 共用 node_modules
   python <skill>/engine/scripts/build.py storyboard.json
   python <skill>/engine/scripts/tpl_sfx.py B
   python <skill>/engine/scripts/qa.py --comp TemplateB          # 版面＋旁白品檢
   npx remotion render src/index.ts TemplateB out/x.mp4 --concurrency=4 --crf=18 --audio-codec=aac
   ffmpeg -i out/x.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=9 -c:a aac out/成片.mp4
   python <skill>/engine/scripts/qa.py --comp TemplateB --skip-layout --skip-asr --video out/成片.mp4
   ```
4. 看 `qa_report.md` 與總覽圖，有必修項目就修正重算。

## 參考實作
- 招生片完整版（為那支片客製的場景）：`concepts/notebook/（招生片完整版 NotebookFull）`
- 通用渲染器（任何文本）：`engine/template/src/tpl/TemplateB.tsx`
- 範例分鏡：`engine/examples/template_1-3_storyboard.json`（同一份分鏡三個範本都能用）
