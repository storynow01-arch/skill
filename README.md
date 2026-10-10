# 我的 Claude Skills 收藏庫

存放個人常用的 [Claude Skill](https://www.anthropic.com/) —— 每個資料夾代表一個獨立且模組化的 Skill，包含一份核心 `SKILL.md`（定義觸發時機、參數規格與執行步驟），並視需要搭配 `references/`、`scripts/` 或範本檔案。

適用於 Claude Code、Claude.ai、Cowork 等任何支援 `SKILL.md` 格式的 Claude 介面。**不是**通用的 AI plugin 格式，其他廠牌的 AI 工具（Copilot、Cursor 等）不會認得這裡的內容。

---

## 📂 資料夾與模組分類結構 (Directory Structure)

本儲存庫採分類模組化管理，主目錄保持乾淨，所有技能邏輯與範本均收納於專屬資料夾內：

```text
.
├── 📂 user-agreement/               # 模組：通用服務條款與免責聲明生成器 (Universal Generator)
│   ├── 📄 SKILL.md                  # 條款生成器 Skill 指引與參數規格
│   └── 📄 USER_AGREEMENT.md         # 服務條款通用範本全文 (§1 ~ §9)
│
├── 📂 shift-log/                    # 模組：開發工作階段與交接日誌管理慣例
│   └── 📄 SKILL.md                  # 開工 / 收工日誌自動化與狀態驗證技能
│
├── 📂 notion-database-design/       # 模組：Notion 架構規劃與系統資料庫設計
│   ├── 📄 SKILL.md                  # Notion 資料庫建置規則、加密防線與 SQL DDL
│   └── 📂 references/
│       └── 📄 ddl-cookbook.md       # SQL DDL 快速建表語法參考手冊
│
├── 📂 vercel-supabase-latency/      # 模組：Vercel + Supabase 效能診斷與機房調校
│   ├── 📄 SKILL.md                  # 「整站都慢」的診斷流程與修正方式
│   └── 📂 references/
│       ├── 📄 diag-route.ts         # 可直接貼上的函式內部量測端點
│       └── 📄 region-map.md         # Supabase 區域 → Vercel 區域對照表
│
├── 📂 supabase-key-usage/           # 模組：Supabase 兩把 key 的用法與安全驗證
│   ├── 📄 SKILL.md                  # publishable / secret 放哪裡、RLS 鎖定、heartbeat 喚醒、外洩處理
│   └── 📂 references/
│       ├── 📄 lockdown.sql          # 全表開 RLS＋heartbeat＋私有 bucket 的 SQL 範本
│       └── 📄 check-keys.mjs        # 驗證兩把 key 沒放錯的腳本（publishable 讀不到、heartbeat 回 200）
│
├── 📂 storynow-aimovie-make/        # 模組：從內容長出影片的 AI 影片工作流（Remotion＋numpy 配樂＋edge-tts）
│   ├── 📄 SKILL.md                  # 十二步流程、六個煞車點、快速指令（含「資訊科範本1」、範本E）
│   ├── 📂 references/               # 流程細節、定調題庫、概念設計法、製作與品檢、實戰教訓
│   │   ├── 📂 prompts/              # 創意提示詞庫（#01 原始旗艦宣傳片提示詞、招生三概念、教學三概念）
│   │   └── 📂 examples/             # 事實清單、內容分析、三概念分鏡的實作範例
│   ├── 📂 engine/                   # Remotion 範本＋Python 腳本（建專案、旁白→時間軸→配樂、13 種曲風合成）
│   ├── 📂 concepts/                 # 做過的概念場景程式（闖關遊戲、創客手稿、動態字體、物流中心、小劇場、穿越網路線）
│   └── 📂 templates/                # 資訊科範本1、範本A 闖關遊戲、範本B 創客手稿、範本C 動態字體快剪、範本D 白板手繪
│
├── 📂 reel-showcase/                # 模組：統一的素材／版本展示網站（所有專案共用同一套版面）
│   ├── 📄 SKILL.md                  # 四個分區、三種頁面、視覺規格、挑選流程、同步規則、踩過的坑
│   └── 📂 assets/                   # 標準程式：產生網頁、本機存檔伺服器、整理待挑選、樣式與互動
│
└── 📄 README.md                     # 本儲存庫總覽與各 Skill 詳細說明
```

---

## 🛠️ 收錄 Skill 總覽表

| Skill 名稱 | 分類標籤 | 觸發關鍵字 / 時機 | 用途摘要 |
|---|---|---|---|
| [`user-agreement`](#1-user-agreement--通用型服務條款與免責聲明生成器) | 系統法務 / 規範模組 | 「產生服務條款」、「新增免責聲明」、「註冊同意書」、「使用者協議」 | 為任何 Web/App 系統一鍵生成客製化服務條款 Markdown 文件、React 同意書 Modal 元件與常數資料。 |
| [`shift-log`](#2-shift-log--開工--收工-工作階段管理慣例) | 開發流程 / 階段交接 | 「開工」、「收工」、「今天先做到這」、「交接一下」 | 開工時核對並實體驗證專案狀態與機密防線；收工時記錄決策理由並寫回進度日誌。 |
| [`notion-database-design`](#3-notion-database-design--notion-系統資料庫規劃與建置) | 後端架構 / 資料庫設計 | 「用 Notion 當資料庫」、「幫我在 Notion 建表」、「Notion 資料庫規劃」 | 將 Notion 規劃為多系統共存的後端資料庫（Page 前綴架構、AES-256 加密、限速佇列與 DDL 建表）。 |
| [`vercel-supabase-latency`](#4-vercel-supabase-latency--vercel--supabase-整站都慢的診斷) | 效能調校 / 部署架構 | 「網站好慢」、「每一頁都要好幾秒」、「換到 Supabase 反而變慢」、「速度優化」 | 分離「網路距離」與「資料庫處理」兩件事，找出函式機房與資料庫不同洲的問題。實測案例快了六倍。 |
| [`supabase-key-usage`](#5-supabase-key-usage--supabase-兩把-key-的用法與安全驗證) | 資安 / 部署架構 | 「接 Supabase」、「Supabase 的 key」、「RLS 要怎麼設」、「喚醒 Supabase」、「heartbeat」 | 伺服器專用架構：secret key 只在伺服器、publishable key 只給喚醒腳本；全表鎖 RLS 並用程式驗證「公開的 key 什麼都讀不到」。 |
| [`storynow-aimovie-make`](#6-storynow-aimovie-make--從內容長出影片的-ai-影片工作流) | 影音製作 / 創意工作流 | 「做影片」、「招生片」、「宣傳片」、「教學影片」、「產生創意概念」、「做試看」、「資訊科範本1」 | 讀懂資料→三輪定調問答→從內容產生 3 個全新創意概念（含英文提示詞）→文本審閱→10 秒動態試看→程式手刻成片並自動品檢。另有「資訊科範本1」與範本風格 A／B／C／D（丟文本選範本即可產出）。 |
| [`reel-showcase`](#7-reel-showcase--統一的素材版本展示網站) | 展示網頁 / 挑選流程 | 「做展示網頁」、「展示版面」、「更新展示網頁」、「挑完了」、「待挑選」 | 所有專案共用的展示網站：待挑選／純廣告／旁白影片／收進 skill 四區，按鈕自動存檔，說「挑完了」就自動分類。 |

### 🧩 Claude Code mod（外掛）

所有 mod 放在 [`mod/`](mod/README.md)，透過 `.claude-plugin/marketplace.json`（marketplace 名稱 `storynow-mods`）安裝：

```
/plugin marketplace add storynow01-arch/skill
/plugin install token-meter@storynow-mods
/plugin install task-dashboard@storynow-mods
```

---

## 📖 各 Skill 詳細功能說明

### 1. `user-agreement` — 通用型服務條款與免責聲明生成器
- **模組路徑**：[`user-agreement/`](user-agreement/SKILL.md)
- **核心定位**：為任何個人、團隊開發的系統（如排課系統、學生管理、記帳軟體等）產出專業、合規的免責聲明與使用者服務條款。
- **支援動態參數標籤**：
  - `{SYSTEM_NAME}`：系統或產品名稱（如：努豆先生線上排課系統）
  - `{DEVELOPER_NAME}`：開發者或團隊名稱（如：努豆先生 / 開發團隊）
  - `{EFFECTIVE_YEAR}`：生效年份（如：2026）
  - `{SUPPORT_EMAIL}`：聯絡管道 / 客服信箱
  - `{GOVERNING_COURT}`：爭議管轄法院（預設：台灣台北地方法院）
- **支援產出 3 種格式**：
  1. **Markdown 文件 (`USER_AGREEMENT.md`)**：適用於 GitHub 儲存庫或官網靜態條款頁面。
  2. **React / Next.js 彈窗元件 (`TermsModal.tsx`)**：包含強制滾動檢閱、核取同意、按鈕控制之完整前端 UI。
  3. **TypeScript 常數檔 (`termsData.ts`)**：結構化資料，便於動態渲染。
- **條款架構涵蓋**：
  - §1 服務性質與免費聲明（無 SLA 保證）
  - §2 服務中斷與停止免責
  - §3 資料儲存與維護免責（強烈建議自備備份）
  - §4 使用限制（僅供非商業用途、禁止轉售）
  - §5 智慧財產權聲明
  - §6 隱私與個人資料保護
  - §7 現狀擔保免除 (AS IS)
  - §8 條款隨時變更權利
  - §9 中華民國準據法與管轄法院

---

### 2. `shift-log` — 開工 / 收工 工作階段管理慣例
- **模組路徑**：[`shift-log/`](shift-log/SKILL.md)
- **核心哲學**：交接文件是寫給「下一個對話的自己」看的。開工時動手核對而非盲信舊快照；收工時交代「為什麼這樣做」與「可直接執行的下一步」。
- **開工流程 (Session Start)**：
  1. 尋找交接檔（`HANDOFF.md`、`STATUS.md` 或 `PROGRESS.md`）。
  2. 閱讀現況與進度日誌。
  3. **動手驗證狀態**（實測 port/process、檢查 `git status`、檢查部署網址，不照單全收）。
  4. **順手確認 `.env` 機密檔已在 `.gitignore` 排除**，防止金鑰意外上傳。
- **收工流程 (Session End)**：
  1. 整理工作摘要：著重記錄「做了什麼」與**「為什麼選 A 不選 B 的決策理由」**。
  2. 交代具體可執行的下一步（指令、檔名、行號）。
  3. 同步更新文件開頭的「目前運行狀態」區塊。
  4. 確保留下的程式碼為**「可編譯/可運行狀態」**。
  5. **金鑰安全掃描**：收工前掃描 diff 確保無寫死 API Key / Secret。
  6. 僅更新文件內容，除非使用者明確要求，否則不擅自執行 commit / push。

---

### 3. `notion-database-design` — Notion 系統資料庫規劃與建置
- **模組路徑**：[`notion-database-design/`](notion-database-design/SKILL.md)
- **核心定位**：解決 Notion 作為系統資料庫時的缺點（無 RLS、無交易、API 限速低），固化最佳實踐。
- **核心架構（單一 Page + 前綴詞）**：
  - 所有系統資料表統一收納於單一 Root Page。
  - 資料表命名：`{系統前綴}・{資料表名}`（如：`培訓・使用者`、`導師・學生成績`）。
  - 程式端僅需 2 個環境變數（`NOTION_TOKEN`、`NOTION_ROOT_PAGE_ID`），自動探索與快取。
- **五大結構決策**：
  1. **權限邊界**：用 `RICH_TEXT` 存範圍 ID（不用 relation）。
  2. **高格數資料**：座位表/課表等整張存為單筆 JSON 欄位（避免多次 API 打擊）。
  3. **長文字存儲**：超過 1800 字元自動切段存入 rich_text 陣列。
  4. **敏感個資加密**：寫入前進行 **AES-256-GCM** 加密（格式 `enc:v1:iv:ciphertext`），金鑰永不進版控。
  5. **不實體刪除**：一般資料採軟刪除（`已刪除` 狀態），金錢分錄採反向沖銷。
- **系統必備四張表**：
  - `{前綴}・使用者`、`{前綴}・密碼` (argon2id 雜湊)、`{前綴}・系統設定`、`{前綴}・稽核日誌`。
- **程式端防線**：
  - 唯一資料存取層、權限隔離三道防線、2.5 req/s 集中式節流佇列、分層快取（含租戶 ID）。

---

### 4. `vercel-supabase-latency` — Vercel + Supabase「整站都慢」的診斷
- **模組路徑**：[`vercel-supabase-latency/`](vercel-supabase-latency/SKILL.md)
- **核心定位**：這個組合最常見的效能問題**不是查詢寫得爛，也不是缺索引**，而是 serverless 函式跑的機房跟資料庫隔了半個地球。症狀沒有特色（每頁 2～5 秒、沒有錯誤訊息），很容易一路往「加索引」的方向白忙。
- **三個關鍵訊號（都是免費且立即可得）**：
  1. `x-vercel-id` 的**第二段**＝函式實際執行的機房（第一段只是邊界節點，常被搞混）。Vercel 預設是 `iad1` 美國東岸，跟你人在哪、資料庫在哪都無關。
  2. `x-envoy-upstream-service-time`＝**Supabase 端真正花的毫秒數**。個位數就代表資料庫很快，慢的是距離。
  3. **404 頁 vs 動態頁的落差**＝分離「使用者端網路」與「伺服器端耗時」。
- **決定性的一步**：貼一個臨時的 `/api/diag` 端點**從函式內部計時**——外面量不到「函式 → 資料庫」那一段。
- **修正**：`vercel.json` 設 `regions`，把**函式搬到資料庫旁邊**（不是搬到使用者旁邊——使用者↔函式只有一次來回，函式↔資料庫有 5～10 次）。
- **附帶的優化清單**：獨立查詢改 `Promise.all`、middleware 的 `auth.getUser()` 是網路呼叫、巢狀 select 解 N+1、`createSignedUrls` 批次簽。
- **實測成果**：同一份程式碼只改一行機房設定，首頁 3,294 ms → **534 ms**（快六倍）。資料庫本身只佔 2% 的時間，其餘 98% 是網路距離。

---

### 5. `supabase-key-usage` — Supabase 兩把 key 的用法與安全驗證
- **模組路徑**：[`supabase-key-usage/`](supabase-key-usage/SKILL.md)
- **核心定位**：兩把 key 用錯地方是 Supabase 最常見、也最嚴重的設定錯誤。這份規則採**伺服器專用架構**——瀏覽器完全不直接連 Supabase，一律經過自己的 API，權限規則只寫一次、也最容易驗證。
- **兩把 key 的分工**：

  | | Publishable（`sb_publishable_`） | Secret（`sb_secret_`） |
  |---|---|---|
  | 權限 | 受 RLS 限制 | 不受 RLS 限制，能讀寫全部 |
  | 用在哪 | **只給喚醒腳本讀 heartbeat** | 伺服器端讀寫所有資料 |
  | 放在哪 | GAS；網站本身不需要 | `.env.local` 與部署平台，**不加 `NEXT_PUBLIC_`** |

- **全表鎖 RLS**：每張表都開 RLS 且不給 `anon` 任何 policy，只有沒有個資的 `heartbeat` 例外。
- **用程式驗證，不要用眼睛看**：publishable key 讀**有資料的表**要回 0 筆（RLS 擋讀取時回的是 200＋空陣列，拿空表測什麼都證明不了）、寫入要被拒（`42501`）、heartbeat 要回 200。
- **免費版 7 天暫停**：外部排程（GAS）每天打 `heartbeat`，只帶 `apikey` 標頭（新版 key 不要加 `Authorization`）。
- **兩個實際踩過的坑**：
  1. Node 20 上 `supabase-js` 的 `createClient` 一建立就丟 WebSocket 例外（realtime 需要 Node 22）→ 改用 `postgrest-js`＋`storage-js`。
  2. 在 Vercel 用 `postgres://` 直連網址會踩 IPv6／連線池／密碼 → 只用 `SUPABASE_URL`＋secret key 走 REST。
- **secret key 外洩處理**：出現在任何對話、截圖、commit 就當作外洩 → 新增一把、刪掉舊的、重新部署。

---

### 6. `storynow-aimovie-make` — 從內容長出影片的 AI 影片工作流
- **模組路徑**：[`storynow-aimovie-make/`](storynow-aimovie-make/SKILL.md)
- **核心定位**：不是套模板換外觀，而是「創意總監＋工程師」。讓成片驚喜的四件事：
  1. **從內容長出畫面**：每一條資訊都變成會動的視覺比喻（數字→計數器、流程→光點沿路、比喻→實景）。
  2. **概念要真的不同**：3 個概念在世界觀、構圖、鏡頭、剪接、配樂都不同，場景程式為概念重新寫。
  3. **聲音與畫面同步**：切點對齊小節、畫面事件配音效、旁白出現時音樂自動退後。
  4. **人只在關鍵處決定**：概念、文本、試看、分鏡預覽、聲音、成片抽檢六個煞車點，其餘自動。
- **十二步流程**（2026-10-07 起，跟範本E 15 步同順序）：① 輸入 → ② 理解素材（事實清單／內容分析，抓資料衝突與個資）→ ③ 三輪定調問答 → ④ **3 個創意概念**（英文提示詞＋中文對照）⛔ → ⑤ 文本（逐字審稿＋文稿檢查）⛔ → ⑥ **10 秒動態試看** ⛔ → ⑦ **分鏡預覽**（edge 暫配、每場截圖＋旁白）⛔ → ⑧ 選聲音 ⛔ → ⑨ 製作 → ⑩ 品檢（AI 交叉聽、停頓、版面、響度 −14 LUFS）→ ⑪ **最終品檢**（對要交出去的成片再量一次：字幕閃爍／抖動、黑畫面、響度、無聲、唸法時長比對、多音詞；`final_qa/`）→ ⑫ 交付與沉澱（使用者抽檢 ⛔、提示詞庫、場景庫、收工紀錄）。
- **系列教學影片**（2026-10-08，`references/series-workflow.md`）：一個科目的 YouTube 教學系列。甲 系列開始做一次（課程大綱、選現有範本或讓系統提案 3 個概念、聲音、樣片、上架規格）→ 乙 每一支 13 步（老師提醒、存 AI 初稿、文稿／聲音／畫面／成片四道關卡、上架資料、修改對照）；科目專用的念法與教法放 `科目包/`。
- **範本E 教學課程產線**：一整門課 → 幾十節風格一致（garychen-dark 深色科技風）的教學影片並合併成集；字幕依 Netflix 繁中規範、版面依 Remotion 官方規則與 WCAG 對比；四關品檢＋自我測試（故意做壞 21 種都要被抓到）。
- **技術堆疊**：Remotion 4（React 畫面）、numpy/scipy 合成配樂（13 種曲風＋音效）、edge-tts 台灣腔旁白（逐句合成→自動字幕與動畫 cue）、ffmpeg 響度校正與串接。
- **快速指令「資訊科範本1」**：活動／研習說明（賽博霓虹、旁白字幕、9 種說明場景）＋資訊科宣傳片「攜手築夢·智造未來」，約 3 分半成片。
- **範本風格 A／B／C／D**（丟任何文本、選範本就能產出同風格影片）：**A 闖關遊戲**（遊戲畫面、RPG 對話框、晶片音樂）、**B 創客手稿**（一鏡到底筆記本、逐筆描出、木吉他）、**C 動態字體快剪**（文字即畫面、拍點硬切、Phonk）、**D 白板手繪**（一支馬克筆先描線再上色、一鏡到底大白板、木琴）。四個範本共用 9 種場景語彙，同一份分鏡可直接換範本。
- **範本F 開發者流程線**：有步驟的文本 → 深色開發者風（點陣底、上方流程節點列講到哪亮到哪、對話氣泡／文件卡／任務卡），自帶引擎 `make.py` 一行出片。
- **範本G 動態圖卡教學**：教學文本 → 深藍光暈＋格線，圖卡／圓環／打字機／時間軸在旁白念到時彈出，自帶引擎 `make.py` 一行出片。
- **範本H 螢幕模擬**（2026-10-07）：給文本就產生像螢幕錄影的操作畫面，不錄真實螢幕——Windows 11＋Chrome＋終端機＋iPhone，游標點擊、逐字打字、鏡頭推近、白色泡泡，每個操作跟著旁白發生；`make_video.py --template H`。
- **範本I 漫畫風**（2026-10-07）：每段一頁白紙漫畫——粗黑框分格依旁白出現、網點、集中線、對話框、黃字擬聲字、簡筆小人、翻頁轉場；共用 9 種場景，`make_video.py --template I`。
- **範本J 地圖風**（2026-10-08）：一張羊皮紙探索地圖，每個場景是一站——紅色虛線路線一站站畫過去、圖釘落下、墨線水彩地標、註記卡與蠟封章；共用 9 種場景，`make_video.py --template J`。
- **範本K 宇宙風**（2026-10-08）：太空船星際航行，每個場景是一顆星體——HUD 鎖定、全像資料面板逐行出現、片尾星圖；共用 9 種場景，`make_video.py --template K`。
- **範本L 黏土玩具風**（2026-10-08）：桌面攝影棚＋黏土玩具實景、立體字、章節膠囊、翻頁捲角，固定主角是使用者畫的捲毛小狗；共用 9 種場景，`make_video.py --template L`。
- **範本廣A 一個形狀不剪接**（2026-10-09，第一個廣告範本、無旁白）：一個圓角形狀從頭到尾不剪接，游標點、拖驅動它變形成按鈕／播放器／開關／分頁／圖表／⌘K／通知，最後一格接回第一格；吃任何文本、片長依內容伸縮，`engine/ad/make_ad.py 廣A <專案>` 一行出片（說明：`storynow-aimovie-make/references/廣告範本工作流.md`）。
- **範本廣B 日報號外**（2026-10-09，廣告範本、無旁白）：深夜趕印號外——印刷機吐報、號外章、鏡頭在報紙上讀頭條與專欄（四塊可省略）、翻頁、摺報丟上報紙堆，紅鉛筆貫穿全片；`engine/ad/make_ad.py 廣B <專案>` 一行出片。
- **範本廣C 機密檔案**（2026-10-09，廣告範本、無旁白）：俯拍木桌上的機密檔案——極機密章、撕封條、文件攤成偵探牆（打字機、紅筆圈、地圖航線、拍立得線索，可省略）、音樂抽空後蓋下「核准」大印章、檔案闔上；紅桿鋼筆貫穿全片、冷爵士配樂；`engine/ad/make_ad.py 廣C <專案>` 一行出片。
- **範本廣D 電視購物台**（2026-10-09，廣告範本、無旁白）：熱鬧誇張的電視購物節目——主持人＋連續攝影棚甩鏡，原價牌劃掉→「現在只要」大爆炸，加碼金卡、吊牌、禮盒、膠囊、倒數可省略，電話號碼與收尾大貼圖；`engine/ad/make_ad.py 廣D <專案>` 一行出片。
- **範本廣E 一鏡到底**（2026-10-10，廣告範本、無旁白）：色鉛筆一鏡到底——主角走過一天、天色由早到晚，站點（搭車看板／建築黑板／水池）依文本排、可省略，傍晚房間牌子讀文本，最後推進窗戶星空浮出名稱；`engine/ad/make_ad.py 廣E <專案>` 一行出片。
- **範本廣F 職人食譜**（2026-10-10，廣告範本、無旁白）：把任何主題包裝成一份食譜——主廚的手粉筆寫材料與步驟（項數可變、可省略一段），剁蔥敲蛋拉花、烤箱「叮！」、醬汁在盤上寫出名稱；`engine/ad/make_ad.py 廣F <專案>` 一行出片。
- **範本廣G 證書的旅程**（2026-10-10，廣告範本、無旁白）：水彩繪本——會害羞的紙片主角飛過 1～4 道門、每道蓋一個章，最後貼上塗鴉牆中央、名稱一字一張卡；`engine/ad/make_ad.py 廣G <專案>` 一行出片。
- **範本廣H 晶片之旅**（2026-10-10，廣告範本、無旁白）：電子光點帶路一鏡推進晶片——城市地標逐一點亮（3～6 座）、靜音一拍後 drop 連鎖點亮，拉遠回電路板排出像素名稱；`engine/ad/make_ad.py 廣H <專案>` 一行出片。
- **範本廣I 點線面**（2026-10-10，廣告範本、無旁白）：一個點在製圖紙上升維——線稿、拼面、擠出立體（8 種通用物件），鑽進鏡頭變片中片，最後收成名稱的句點；`engine/ad/make_ad.py 廣I <專案>` 一行出片。
- **範本廣J 寵物直播**（2026-10-10，廣告範本、無旁白）：柴犬主播手機直播帶貨——商品卡、彈幕愛心、揭曉、關鍵字、展示品、人數爆表、下播亮招牌；`engine/ad/make_ad.py 廣J <專案>` 一行出片。
- **範本廣K 紅點作品集**（2026-10-10，廣告範本、無旁白）：人氣第 1 名提示詞——一顆紅點帶鏡快剪：縮寫大字、數字組合、劃掉換值、DROP 大數字、甩鏡、名稱疊上、LOGO 重擊；`engine/ad/make_ad.py 廣K <專案>` 一行出片。
- **範本廣L 新創快剪**（2026-10-10，廣告範本、無旁白）：人氣第 7 名提示詞——把主題包裝成新創產品發表：輸入框、Hero、DROP、產品卡片、指標、功能、CTA；`engine/ad/make_ad.py 廣L <專案>` 一行出片。
- **提示詞庫**：#01 為使用者原始的旗艦宣傳片提示詞（逐字保存＋範本化＋為什麼驚喜的設計對照）；另收招生片三概念、教學 1-1 三概念。
- **環境需求**：Python 3.11（numpy、scipy、edge-tts）、Node 18+、ffmpeg。
- **四項增強**：
  1. **真實照片／影片**：`mediaDir`＋`media` 欄位（檔名或關鍵字），Ken Burns 推移；**沒有照片自動退回插畫**，影片照常產出。
  2. **概念元件庫**（`engine/template/src/lib/`）：一鏡到底攝影機、等角世界、角色劇、動態字體、像素遊戲、縱深隧道、手繪描線。
  3. **自動品檢** `qa.py`：瀏覽器內量測文字重疊／超出畫面／闖進字幕區、whisper 回聽旁白比對稿子、黑畫面／無聲／響度／長度，產出報告與總覽圖。
  4. **聲音升級**：逐句語氣與角色聲音、旁白 EQ＋壓縮、側鏈閃避、配樂母帶處理、選用 Azure 語音。
- **隱私**：含個資的分鏡用 `*.local.json`、算好的影片放 `cache/`，皆不進版控；公開範本中的姓名、電話、Email 一律是 `{欄位}`。

---

### 7. `reel-showcase` — 統一的素材／版本展示網站
- **模組路徑**：[`reel-showcase/`](reel-showcase/SKILL.md)
- **核心定位**：所有專案的展示網頁共用同一套程式與外觀，要改版面先改這裡的 `assets/` 再同步到各專案，版面才會一致。
- **四個分區**：01 待挑選（新做好、還沒決定）→ 按「要」自動依類型移到 02 純廣告或 03 旁白影片、按「不要」進資源回收筒；02／03 按「＋ 收進 skill」→ 04 收進 skill。
- **三種頁面**：首頁（縮圖牆大標、四個入口卡、最新加入）、分區頁（滑過播 6 秒預覽、篩選搜尋）、單支頁（大播放器、品檢、附件、左右鍵換片）。
- **挑選不用複製**：雙擊 `啟動展示網頁.bat` 開本機小伺服器，按鈕自動存到 `挑選紀錄.json`；說「挑完了」Claude 就執行 `整理待挑選.py`。
- **視覺**：深色放映廳風（淺色模式自動切換）、單一重點色訊號橘、Noto Sans TC＋Space Grotesk。

---

## 💻 怎麼在一台新機器上安裝使用

Claude Code 是在每次對話開始時，掃描本機的 `~/.claude/skills/` 資料夾來列出可用的 skill —— 不會即時連線 GitHub 抓取。要在新機器使用：

1. **Clone 這個儲存庫到本機任一位置**，例如 `D:\Claude\skill`：
   ```bash
   git clone https://github.com/storynow01-arch/skill.git D:\Claude\skill
   ```
2. **建立符號連結 (Symlink)** 指向 clone 位置（而非複製檔案），日後 `git pull` 即可自動同步：
   
   *Windows PowerShell（請以系統管理員權限開啟）：*
   ```powershell
   # 連結 user-agreement skill
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\user-agreement" `
     -Target "D:\Claude\skill\user-agreement"

   # 連結 shift-log skill
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\shift-log" `
     -Target "D:\Claude\skill\shift-log"

   # 連結 notion-database-design skill
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\notion-database-design" `
     -Target "D:\Claude\skill\notion-database-design"

   # 連結 vercel-supabase-latency skill
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\vercel-supabase-latency" `
     -Target "D:\Claude\skill\vercel-supabase-latency"

   # 連結 supabase-key-usage skill
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\supabase-key-usage" `
     -Target "D:\Claude\skill\supabase-key-usage"

   # 連結 reel-showcase skill
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\reel-showcase" `
     -Target "D:\Claude\skill\reel-showcase"

   # 連結 storynow-aimovie-make skill（另需 Node 18+、ffmpeg、pip install numpy scipy edge-tts）
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\storynow-aimovie-make" `
     -Target "D:\Claude\skill\storynow-aimovie-make"
   ```

3. 開啟新的 Claude Code 對話即可自動載入所有 Skill！

---

## 🔄 怎麼更新與擴充

- **日常更新**：直接在 clone 資料夾內修改，執行 `git commit` 與 `git push`。本機因使用 Symlink 會立刻生效。其他機器只需執行 `git pull`。
- **新增 Skill**：
  1. 在根目錄建立專屬小寫連字號資料夾（例如 `my-skill/`）。
  2. 撰寫 `SKILL.md`（包含 YAML frontmatter `name` 與 `description`）。
  3. 輔助文件放至 `references/`、腳本放至 `scripts/`。
  4. 更新本 `README.md` 中的分類與總覽表。
