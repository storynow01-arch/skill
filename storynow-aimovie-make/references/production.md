# 製作與品檢（第 ⑧⑨ 步）

## 環境
- Python 3.11：`numpy scipy edge-tts`（moviepy、Pillow 僅 Python 版宣傳片需要）
- Node 18+、ffmpeg；Remotion 4.0.300（`engine/template/package.json` 已鎖版本，套件版本必須一致）
- 字型：@remotion/google-fonts（Noto Sans TC、Noto Serif TC、霞鶩文楷 TC、Press Start 2P、Orbitron……），首次算圖會下載

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

## 配樂曲風（make_music.py，13 種）
techhouse 128、minimal 112、lofi 88、synthwave 108、dnb 172、futurebass 150、pianopulse 96、acoustic 84、chiptune 140、
cinematic 90、phonk 145、marimba 100、comedy 110。`--bed` 為旁白底樂模式。
音效：impact、riser、whoosh、blip；`concepts/audio/` 另有 coin、jingle、scribble、thud、buzz、ding、boing、whistle、beep。

## 品檢清單
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
