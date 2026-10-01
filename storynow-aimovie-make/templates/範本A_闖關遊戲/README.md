# 範本A_闖關遊戲：闖關遊戲 LEVEL UP

> 來源：2026-10-01 招生片三概念試做，使用者評價「這三個提示詞的風格流程都很好」。
> 觸發：使用者說「**範本A／闖關遊戲範本／遊戲風**」，或在選範本時選 A。
> 用法：**丟任何文本 → 拆成共用場景語彙 → 選本範本 → 產出同一風格的影片**。

## 適合
國中生、程式入門、營隊、需要「好玩」的內容；榮耀類內容氣勢較弱

## 原始提示詞（招生片版本，逐字保存）
```
Create a 60-second recruitment video programmatically, coded and rendered with whatever tools you need.
The entire video IS a retro video game: the viewer is the player, a "Lv.1 Rookie" junior-high student, and joining the
IT Department of Haiching Industrial High School (海青工商資訊科) is pressing START. Title: "你的未來，自己寫".

1. Press Start: a pixel title screen, blinking "PRESS START", a coin-insert sound; the player sprite drops in.
2. World Map: a side-scrolling world map with four stages — C/Python, AI Vision, ESP32 IoT, Robot Arm.
   The player walks between stage nodes; each clear pops "SKILL UNLOCKED" with an XP bar filling and a level-up jingle.
3. Boss Stage: the National Skills Competition — medals drop as loot; a "HALL OF FAME" leaderboard reveals
   10 WorldSkills competitors and 12 national golds; regional gold/silver/bronze sweep shown as a 3-star clear.
4. Next World: 26 admissions to national universities appear as unlocked new worlds (Taiwan Tech, YunTech, NKUST).
5. Continue?: "NEW GAME: 海青資訊科 — YES ▶", the cursor blinks on YES.

Visuals: chunky pixel art, parallax side-scrolling camera, HUD with HP/XP bars, score popups, screen shake on hits.
Audio: upbeat 8-bit chiptune at 150 BPM with crisp coin, jump, power-up and level-up sound effects on every event.
Narration: a friendly senior student, like a game guide talking to the new player.
```

## 範本設定
| 項目 | 設定 |
|---|---|
| Composition | `TemplateA`（`engine/template/src/tpl/TemplateA.tsx`） |
| 配樂 | `"music": {"genre": "chiptune", "bpm": 140, "key": "C"}` |
| 旁白 | 學長姐口吻；招生用女聲曉臻 +15%，教學用男聲雲哲 +18%；`narrator` 決定對話框名牌 |
| 字幕 | RPG 對話框（名牌＋逐字打出） |
| 音效 | 投幣、升級和弦、錯誤蜂鳴、過關號角（`tpl_sfx.py A`） |
| 切點 | `"snapBars": true`（場景補足整數小節） |

## 場景對應
| 場景 | 畫面 |
|---|---|
| title | WORLD 開場：字掉落彈跳＋PRESS START |
| scenario | QUEST 任務板：大圖示＋任務清單逐項打勾，最後一項紅色「?!」 |
| definition | NEW ITEM GET!：道具卡，標亮字閃金光，註解＝道具屬性 |
| cards | INVENTORY：鎖住的「?」格依旁白解鎖、噴金幣 |
| vs | VS 對戰：ENEMY／HERO／PLAYER |
| stat | STATUS：數字一格一格跳 |
| quiz | QUIZ BATTLE：游標跳動→CORRECT! +100 XP |
| recap | STAGE CLEAR!：LOOT＋RESULT＋NEXT ▶ |
| qaEnd | FINAL BOSS QUIZ：血條倒數 |

## 執行步驟
1. **拿到文本**（講義、旁白稿、活動資料）→ 依 [`../範本風格_場景語彙.md`](../範本風格_場景語彙.md) 拆成 9 種場景，寫出 `storyboard.json`（旁白一行一句）。
2. **給使用者審文本** ⛔（場景表：型別、畫面重點、旁白）。
3. 建專案並建置：
   ```bash
   python <skill>/engine/scripts/new_project.py <專案> --no-install   # 再 npm install 或 junction 共用 node_modules
   python <skill>/engine/scripts/build.py storyboard.json
   python <skill>/engine/scripts/tpl_sfx.py A
   python <skill>/engine/scripts/qa.py --comp TemplateA          # 版面＋旁白品檢
   npx remotion render src/index.ts TemplateA out/x.mp4 --concurrency=4 --crf=18 --audio-codec=aac
   ffmpeg -i out/x.mp4 -c:v copy -af loudnorm=I=-14:TP=-1:LRA=9 -c:a aac out/成片.mp4
   python <skill>/engine/scripts/qa.py --comp TemplateA --skip-layout --skip-asr --video out/成片.mp4
   ```
4. 看 `qa_report.md` 與總覽圖，有必修項目就修正重算。

## 參考實作
- 招生片完整版（為那支片客製的場景）：`concepts/levelup/（招生片完整版 LevelUpFull、1-1 教學 LessonLevelUp）`
- 通用渲染器（任何文本）：`engine/template/src/tpl/TemplateA.tsx`
- 範例分鏡：`engine/examples/template_1-3_storyboard.json`（同一份分鏡三個範本都能用）
