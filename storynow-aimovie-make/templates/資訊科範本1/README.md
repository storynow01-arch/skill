# 資訊科範本1：活動說明 ＋ 資訊科宣傳片（約 3 分半）

> 來源：2026-09-30「教師 AI 程式設計增能研習」現場播放影片（使用者評價：最驚喜）。
> 結構：**活動說明（約 2 分 30 秒，賽博霓虹＋旁白字幕）→ 資訊科宣傳片「攜手築夢·智造未來」（60 秒）**
> 使用者輸入「資訊科範本1」時，照本檔執行。

## 執行步驟

### 1. 問三件事（AskUserQuestion）
1. **這次的活動資料**：行前通知 PDF／文字（放進專案 `00_資料/`），或「沿用 0930 研習當示範」
2. **要額外加的提醒**（例：洗手間位置、餐盒帶回）
3. **總長**（預設約 3 分半）與**宣傳片版本**（Remotion 版 (推薦)／Python 版）

### 2. 填入說明段分鏡
以 [`notice/notice_template.json`](notice/notice_template.json) 為骨架，依活動資料改寫。場景與型別：

| # | 段落 | type | 說明 |
|---|---|---|---|
| A1 | 開場 | title | 活動名稱、副標、日期梯次 |
| A2 | 活動資訊 | infoGrid | 時間／地點／講師／主持（cueMap 對旁白） |
| A3 | 交通與電梯 | parking | 校門→警衛室→停車場路線＋電梯；可放「提前 10 分鐘到校」 |
| A4 | 簽到簽退 | flow | 三步驟＋「＝核給研習時數」 |
| A5 | 課前準備 | checklist | 逐項打勾 |
| A6 | 個資提醒 | compare | ✓ 模擬資料 vs ✕ 真實名冊 |
| A7 | 課程流程 | schedule | rows＋lightMap（每句旁白亮哪幾列） |
| A8 | 生活提醒 | cards | 使用者額外加的項目（2 張卡） |
| A9 | 聯絡與轉場 | closing | 承辦人、分機、Email → 「接下來先認識資訊科」 |

活動沒有的段落就刪（例如沒有停車需求就拿掉 A3），新段落可用 cards／statement。
設定沿用：`style: cyber-neon`、`voice: YunJhe rate +3% pitch +2Hz`、`lineGap 0.62`、`lead 0.6`；用 `tail` 調整總長。

### 3. 先給文本 ⛔
把每段「畫面＋旁白」整理成 Markdown 給使用者確認。
**隱私預設**：手機號碼不放（影片會被轉傳），只放分機與公務 Email；需要確認時要問。

### 4. 一行出片（說明段＋宣傳片＋串接）
```bash
python <skill>/engine/scripts/new_project.py <專案>/notice --no-install     # 再 npm install 或 junction 共用 node_modules
cp storyboard.json <專案>/notice/ && cd <專案>/notice
python <skill>/engine/scripts/make_info1.py storyboard.json --name <活動簡稱>
```
`make_info1.py` 會：同步引擎程式 → 建置說明段（旁白、配樂、字幕）→ 版面＋旁白品檢（有必修就停）→ 算圖 →
宣傳片（有快取 `cache/trailer_remotion.mp4` 直接用；**新電腦／剛 clone 沒有快取**時自動複製 `trailer/` 到 `<專案>/trailer`、共用 node_modules、合成配樂、算圖並存回快取）→
兩段各自 loudnorm −14 串接 → `out/<活動簡稱>_說明+資訊科宣傳片.mp4`。
- 改了宣傳片事實（下表）後加 `--rebuild-trailer`
- Python 版宣傳片：`--trailer python`（需 moviepy、Pillow；路徑在 `trailer/python_trailer.py` 檔頭）

### 5. 品檢
抽 12 格（說明段每段一格＋宣傳片 3 格）、確認長度與響度 −14 LUFS、確認 34% 等數字正確。

## 宣傳片內的事實（要更新時改這裡）
| 事實 | 現值 | 程式位置（trailer/src/scenes.tsx） |
|---|---|---|
| WorldSkills 國手 | 10 位 | `WorldSkills` → `BigStat to={10}` |
| 全國金牌 | 12 面 | `Gold12` → `BigStat to={12}` |
| 第 56 屆 | 南區分區賽雙職類金銀銅包辦＋全國總決賽銅牌 | `Nat56` |
| 國際賽時間軸 | 2017 阿布達比 … 2025 上海 | `TL` 陣列 |
| 國立科大錄取率 | **約 34%（每 3 位 1 位）** | `Rate`（Counter 34、圓環 0.34） |
| 國立大專錄取 | 26 人次；臺科／雲科／高科 | `Unis`、`UNIS` |
| 出路 | AI 軟體、半導體韌體、網路資安、物聯網自動化 | `Career` |

資料來源：115 學年度資訊科親師座談會簡報（錄取率依使用者 2026-09-30 更正為約 34%）。
改數字後：Remotion 版與 Python 版都要改，並刪除 `cache/` 重算。

## 本機專用檔（不進 git）
- `notice/notice_0930.local.json`：0930 研習的完整分鏡（含講師姓名、分機、Email），本機示範用
- `cache/`：算好的宣傳片 mp4
