# 範本L_黏土玩具風：黏土玩具風 Clay Toy

> 來源：2026-10-07 使用者提供一支喜歡的廣告影片，要求「利用我的 skill 去拆解，然後一樣用屏榮的介紹當腳本產生一個影片」。學它的手法（不用原片的角色與署名），吉祥物是**使用者自己畫的捲毛小狗**；試看後依意見改得更像狗、放大、字幕改深色膠囊，最終品檢一次全過。2026-10-08 使用者指定收進範本庫，並決定小狗是本範本的固定主角。
> 觸發：使用者說「**範本L／黏土玩具風／黏土範本**」，或在選範本時選 L。
> 用法：**丟任何文本 → 拆成共用場景語彙 → 選本範本 → 產出同一風格的影片**。

## 長什麼樣（30 秒示範片）

[![點開看示範片](示範/poster.jpg)](示範/示範.mp4)

![示範片三格總覽](示範/總覽.jpg)

示範片：[`示範/示範.mp4`](示範/示範.mp4)（edge-tts 配音，旁白介紹本範本、演出所有場景型別）；示範分鏡：[`示範/storyboard.json`](示範/storyboard.json)；9 場景完整測試分鏡：[`示範/範例_完整測試_storyboard.json`](示範/範例_完整測試_storyboard.json)；沒有這個 skill 時用：[`提示詞_範本L完整版.md`](提示詞_範本L完整版.md)

## 適合
觀念說明、招生與活動介紹、親子與生活教育、「抓幾個重點」型的知識短片：每個觀念變成桌上一組摸得到的黏土玩具實景，固定主角小狗陪觀眾一段段看下去，溫暖、可愛、好記。
不適合：嚴肅正式的公告、需要真實照片或操作畫面的內容（改用範本H）。

## 原始提示詞（逐字保存）
```
"fbreels.mp4":這是我最近看到、覺得還不錯的廣告影片，請你幫我利用我的 skill 去拆解，然後一樣用屏榮的介紹當腳本，產生一個影片。
```
吉祥物：
```
好，吉祥物用原創的，樣子參考圖1..圖1是我畫的..吉祥物做出來要這一個影片的樣子，模型就是形態存在..先做試看
```
收進範本時的要求：
```
我覺得有幾個風格滿不錯的，可以上傳到我的範本庫當範本。…這幾個風格都不錯，讀完我的 skill 後依照規則變成範本：漫畫風、地圖風、宇宙風、黏土玩具風
```
**這個範本怎麼解讀它**：暖米白「桌面攝影棚」，所有觀念都是圓潤、有厚度的黏土玩具（頂光漸層、柔和落影，掉進來壓扁回彈）；厚實立體字；左上章節膠囊；段與段之間翻頁捲角；深色小膠囊字幕；固定主角是使用者畫的捲毛小狗（大垂耳、紅愛心、深藍書包、Lv.3 徽章、頭上燈泡）。

## 流程與品檢（共用引擎，和範本 A～D 一致）
1. **逐字審稿**：`final_qa/review_prep.py storyboard.json` → Claude 逐句審 → `final_qa/review_report.py` → 給使用者 ⛔
2. **分鏡預覽**：`make_video.py storyboard.json --template L --preview`（edge-tts 暫配）→ `qa/分鏡預覽/分鏡預覽.html` ⛔
3. **正式出片**：`make_video.py storyboard.json --template L`：圖示檢查（含黏土物件庫）→ 名詞檢查 → 唸法標準題 → 建置 → 範本音效 → AI 耳朵 → 交叉聽 → 句內停頓 → 版面品檢 → 算圖 → 響度 → 成片檢查
4. **最終品檢**：`final_qa/final_qa.py <成片> --spec src/data/spec.json --layout qa_layout.json` 全部通過；再照下表用連續格核對概念忠實度

配音：專案自己的 `.env.local` 有 `GEMINI_API_KEY` 才用 Gemini Flash TTS，否則 edge-tts。

## 概念忠實度檢查（交付前逐項打勾，用「連續格」看，不是只看單格）
| # | 招牌特徵 | 怎麼驗 | 現況 |
|---|---|---|---|
| 1 | 暖米白桌面攝影棚；物件都是有厚度的黏土玩具（頂光漸層、內陰影、地面柔影），依旁白掉進來、壓扁回彈、噴出小黏土球 | 每場景抽 3 格 | ✅ |
| 2 | 固定主角捲毛小狗每段都在場：眨眼、彈跳、驚訝、開心、揮手、燈泡亮、愛心舉高，跟物件互動 | 每場景抽 2 格 | ✅ |
| 3 | 厚實立體字（多層陰影疊出厚度）從上方掉下來；數字砸下後**往上數**（`lib/rollnum.tsx`） | title／stat 連續格 | ✅ |
| 4 | 左上章節膠囊（第幾段＋標題） | 總覽圖 | ✅ |
| 5 | 段與段之間翻頁捲角（約 0.7 秒、連續，右上往左下） | 場景交界連續格 | ✅ |
| 6 | 字幕是深藍小膠囊；翻頁層在字幕之下，字幕永遠在最上層；變色都是 10～12 格漸變 | F1 字幕閃爍、F11 畫面突跳 | ✅ |
| 7 | 音效：翻頁咻、物件落下「啵」、title／stat／recap 彈跳重音 | 聽成片 | ✅ |

## 範本設定
| 項目 | 設定 |
|---|---|
| Composition | `TemplateL`（`engine/template/src/tpl/TemplateL.tsx`；元件 `engine/template/src/lib/clay/`：`kit.tsx` 黏土質感／立體字／翻頁、`pup.tsx` 固定主角小狗、`props.tsx`＋`objects.tsx` 黏土物件、`icons.tsx` 物件對照；數字 `lib/rollnum.tsx`） |
| 主角 | 使用者畫的捲毛小狗（原圖由使用者提供，造型照原圖：站姿、大垂耳、頭頂一撮捲毛、紅愛心、深藍書包、Lv.3 徽章、頭上燈泡） |
| 配樂 | `"music": {"genre": "marimba", "bpm": 120, "key": "F"}`（make_video 預設，旁白時自動閃避） |
| 旁白 | 男聲雲哲 `zh-TW-YunJheNeural`（使用者選定的測試聲音） |
| 字幕 | 深藍 #1f3a7a 小膠囊、白字、置中；下方固定淡色漸層底；緊接上一句時直接換字不淡入 |
| 字型 | 中文 Noto Sans TC 900；英數圓胖字 Baloo 2 |
| 色彩 | 米白 #e9e5dc、橘 #d9663a、深藍 #1f3a7a、芥末黃 #e0a52e、草綠 #3aa86b、木頭 #b97a45 |
| 音效 | `tpl_sfx.py L`：翻頁 whoosh（對齊翻頁開始）、每個 cue「啵」、title／stat／recap impact，寫進 `tpl_sfx.wav` |

## 場景對應
| 場景 | 畫面 |
|---|---|
| title | 大立體標題逐行掉下、落地噴黏土小球；深藍 eyebrow 膠囊、橘色副標膠囊、芥末黃英文立體字；小狗驚訝→跳兩下→燈泡亮→愛心舉高，面前有書和鉛筆 |
| scenario | 左邊一疊歪斜的物件；右邊編號黏土標籤依旁白逐個掉下；最後一個問題標籤橘底＋大問號，小狗冒問號、表情驚訝 |
| definition | 大立體字（10 字內一行，否則在逗號或對半斷行、不切斷重點詞）；念到重點時漸變橘色、長出芥末黃黏土條；補充說明是黏土卡片 |
| cards | 長木桌，2～4 個物件依旁白掉到桌上；上方編號標題卡、桌面說明名牌；footer 芥末黃膠囊；小狗每出現一個就跳一下 |
| vs | 左右兩張小桌：壞的漸變灰暗＋紅色 ✕，好的綠色卡＋綠色 ✓＋小星星；中間立體 VS；小狗先看左（驚訝）再看右（開心） |
| stat | 巨大立體數字砸下、壓扁、往上數；深藍說明膠囊＋補充卡；小狗驚訝、跳兩下、燈泡亮 |
| quiz | Q 題目膠囊＋2～4 個黏土按鈕；停頓時小狗東張西望；揭曉時正確按鈕彈起漸變綠、亮暖光、掉下綠勾，錯的壓下變灰 |
| recap | 奶油色清單板逐項打綠勾；前面用過的物件全部回到長桌上；立體「NEXT」＋預告膠囊；小狗跳、揮手 |
| qaEnd | 題目膠囊＋4 塊插地黏土牌；揭曉時正確的牌往上彈、漸變淡綠發光、掉下綠勾，其他變淡 |

圖示（黏土物件）：`icon` 可以填 emoji 或物件名稱：trophy、cert、cart、paw、board、globe、plane、bowl、cake、drink、cup、bell、camera、printer、laser、tablet、clapper、block、crib、chip、bulb、piggy、coin、tag、bus、house、pool、signpost、bush、books、book、openbook、clock、pencil、mic、target、chat、checklist、laptop、phone、calendar、magnifier、warning、star、heart、gear、rocket、papers、chart、person、screen、bolt、cross、tick。找不到時退回 `lib/sketches` 線稿（畫成黏土圓角粗線），再沒有才畫黏土圓牌＋emoji，不會出現空白或「?」。

## 執行步驟
1. **拿到文本** → 依 [`../範本風格_場景語彙.md`](../範本風格_場景語彙.md) 拆成 9 種場景，寫出 `storyboard.json`（旁白一行一句）。
2. **給使用者審文本** ⛔
3. 建專案並出片：
   ```bash
   python <skill>/engine/scripts/new_project.py <專案> --no-install   # 再 npm install 或 junction 共用 node_modules
   python <skill>/engine/scripts/make_video.py storyboard.json --template L --preview   # 分鏡預覽 ⛔
   python <skill>/engine/scripts/make_video.py storyboard.json --template L             # 正式出片
   python <skill>/final_qa/final_qa.py out/<成片>.mp4 --spec src/data/spec.json --layout qa_layout.json
   ```
4. 最終品檢全部通過後，照上面的忠實度表用連續格逐項核對。

## 參考實作
- 通用渲染器：`engine/template/src/tpl/TemplateL.tsx`＋`engine/template/src/lib/clay/`
- 9 場景完整測試（約 90 秒）：[`示範/範例_完整測試_storyboard.json`](示範/範例_完整測試_storyboard.json)
