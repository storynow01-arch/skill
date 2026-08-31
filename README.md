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
└── 📄 README.md                     # 本儲存庫總覽與各 Skill 詳細說明
```

---

## 🛠️ 收錄 Skill 總覽表

| Skill 名稱 | 分類標籤 | 觸發關鍵字 / 時機 | 用途摘要 |
|---|---|---|---|
| [`user-agreement`](#1-user-agreement--通用型服務條款與免責聲明生成器) | 系統法務 / 規範模組 | 「產生服務條款」、「新增免責聲明」、「註冊同意書」、「使用者協議」 | 為任何 Web/App 系統一鍵生成客製化服務條款 Markdown 文件、React 同意書 Modal 元件與常數資料。 |
| [`shift-log`](#2-shift-log--開工--收工-工作階段管理慣例) | 開發流程 / 階段交接 | 「開工」、「收工」、「今天先做到這」、「交接一下」 | 開工時核對並實體驗證專案狀態與機密防線；收工時記錄決策理由並寫回進度日誌。 |
| [`notion-database-design`](#3-notion-database-design--notion-系統資料庫規劃與建置) | 後端架構 / 資料庫設計 | 「用 Notion 當資料庫」、「幫我在 Notion 建表」、「Notion 資料庫規劃」 | 將 Notion 規劃為多系統共存的後端資料庫（Page 前綴架構、AES-256 加密、限速佇列與 DDL 建表）。 |

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
