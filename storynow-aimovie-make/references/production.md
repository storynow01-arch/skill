# 製作與品檢（第 ⑧⑨ 步）

## 環境
- Python 3.11：`numpy scipy edge-tts`（moviepy、Pillow 僅 Python 版宣傳片需要）
- Node 18+、ffmpeg；Remotion 4.0.300（`engine/template/package.json` 已鎖版本，套件版本必須一致）
- 字型：@remotion/google-fonts（Noto Sans TC、Noto Serif TC、霞鶩文楷 TC、Press Start 2P、Orbitron……），首次算圖會下載

## 安裝
```bash
pip install numpy scipy edge-tts pillow faster-whisper pypinyin opencc-python-reimplemented
```
（faster-whisper 第一次會下載 base 模型，約 140 MB）

## 真實照片／影片
- storyboard 頂層 `"mediaDir": "./素材"`（相對 storyboard）
- 任何 props 裡名為 `media` 的欄位都會解析：檔名、路徑、或**關鍵字**（在 mediaDir 檔名中搜尋），也可寫 `{"file": "x.jpg", "focus": [0.5, 0.3], "start": 2}`
- 圖片自動轉正（EXIF）並縮到 2400px 以內，複製到 `public/media/`；影片原檔複製
- 找不到 → `{ok: false}`，場景畫 `fallback` 插畫；build 結束時列出「缺照片」清單
- 場景：`photo`（滿版＋Ken Burns＋壓字）、`gallery`（2–4 張，依旁白進場；亮色／黑板風自動用拍立得框）、`split`（半照片＋重點）
- 照片版權與肖像權：學生正臉照片要確認有授權

## 時間軸
- 教學／說明（teach）：場景長度由旁白決定；`build.py` 逐句合成，自動產生字幕與 cues（每句起始 frame）
- 宣傳（promo）：場景以小節數或秒數指定，秒數會吸附到整數小節
- 混合（旁白＋強烈對拍）：場景＝旁白＋前導＋尾巴，補足到整數小節（參考 `concepts/audio/full_build.py`）
- 旁白中單獨一行「……」＝停頓 2 秒（課中測驗）
- 長句自動分頁字幕（預設 24 字）

## 聲音
| 用途 | 聲音 | 語速 |
|---|---|---|
| 教學 | zh-TW-YunJheNeural | +18% |
| 招生學長姐 | zh-TW-HsiaoChenNeural | +15% |
| 現場公告 | YunJhe | +3% |
| 角色 | YunJhe 音高 +25Hz（小 A）／HsiaoYu（小 B） | +15% |

唸法：`pron_zh-TW.json`（IP 逐字唸、IPv4/GAS/QR Code/AI 拆字母）。新縮寫加進「詞典」。

**逐句語氣與角色**：
```jsonc
"voices": {"小A": {"name": "zh-TW-YunJheNeural", "rate": "+15%", "pitch": "+25Hz"}},
"lines": ["一般句子", {"text": "這句要興奮！", "rate": "+22%", "pitch": "+8Hz"}, {"text": "我是小A", "voice": "小A"}]
```
**Azure（選用）**：句子或角色加 `"provider": "azure"`，並設定環境變數 `AZURE_SPEECH_KEY`、`AZURE_SPEECH_REGION`；
可用 `"style"`（只有部分聲音支援，zh-TW 聲音沒有情緒風格）。沒設定金鑰會自動改用 edge-tts。

**混音**：旁白自動 高通 80Hz＋3.5kHz 臨場感＋輕壓縮；音樂用旁白包絡做側鏈閃避（`duckDepth` 預設 0.3，`"sidechain": false` 可關）；
配樂預設經過母帶鏈（殘響＋匯流排壓縮＋柔性限幅，`--no-master` 可關）。

## 配樂曲風（make_music.py，13 種）
techhouse 128、minimal 112、lofi 88、synthwave 108、dnb 172、futurebass 150、pianopulse 96、acoustic 84、chiptune 140、
cinematic 90、phonk 145、marimba 100、comedy 110。`--bed` 為旁白底樂模式。
音效：impact、riser、whoosh、blip；`concepts/audio/` 另有 coin、jingle、scribble、thud、buzz、ding、boing、whistle、beep。

## 自動品檢 qa.py
```bash
python <skill>/engine/scripts/qa.py                       # 算圖前：版面＋旁白（約 1–2 分鐘）
python <skill>/engine/scripts/qa.py --video out/x.mp4     # 算圖後：再加成片檢查與總覽圖
```
| 檢查 | 方法 | 等級 |
|---|---|---|
| 超出畫面、闖進字幕區 | 每場景 35%／70%／95% 三格，在瀏覽器裡量每段文字的位置（QaProbe） | 必修 |
| 文字重疊、內容溢出 | 同上 | 建議 |
| 旁白唸錯 | faster-whisper 回聽每句 → 轉簡體 → 轉拼音 → 與稿子比對相似度（< 0.8 列出） | 必修／建議 |
| 黑畫面、無聲、響度、長度 | ffmpeg blackdetect／silencedetect／ebur128 | 必修／建議 |
- 結果寫在 `qa_report.md`＋`qa_contact.jpg`；有必修項目時結束碼為 1
- 拼音比對抓的是「聲音唸錯」；同音字（工場／工廠）聽起來一樣，不會被當成錯
- 自動品檢管不到美感（例如標題斷在奇怪的地方），交付前仍要看一眼總覽圖

## 品檢清單（人工補看）
| 項目 | 方法 | 標準 |
|---|---|---|
| 每場景畫面 | 每場景 60–70% 處抽一格拼成總覽圖 | 無重疊、無溢出、內容不進字幕區、角色不被對話框擋 |
| 試看結尾 | 抽最後 0.3 秒 | 標題寫完、動畫演完 |
| 長度 | ffprobe | 目標 ±10%（使用者說「約」時很寬鬆） |
| 響度 | ffmpeg ebur128 | −14 LUFS（成片統一用 loudnorm 只重編音訊） |
| 事實 | 對照事實清單 | 每個數字、校名、名次都有來源 |
| 個資 | grep 姓名、電話、Email | 未經同意不得出現 |

抽格指令：
```bash
ffmpeg -ss <秒> -i in.mp4 -frames:v 1 -vf scale=480:270 out.png   # 再用 PIL 拼成一張總覽
```

## 已知數據（量出來的）
- 1080p 60 秒、4 並行：像素／快剪類 1.5–2 分鐘；一鏡到底大畫布 4 分鐘；3 分 46 秒教學 7 分鐘
- 同時跑兩個算圖，各自慢 3 倍以上 → 一次只跑一個
- edge-tts：YunJhe +18% 約 5.5 字/秒；HsiaoChen +15% 約 5 字/秒
- 混音後響度常在 −12～−18，成片一律 loudnorm 到 −14
