# 我的 Claude Skills 收藏庫

存放個人常用的 [Claude Skill](https://www.anthropic.com/) —— 每個資料夾是一個獨立的 skill，包含一份 `SKILL.md`（定義觸發時機與執行步驟），之後也可能包含 `scripts/`、`references/`、`assets/` 等輔助檔案。

適用於 Claude Code、Claude.ai、Cowork 等任何讀取 `SKILL.md` 格式的 Claude 介面。**不是**通用的 AI plugin 格式，其他廠牌的 AI 工具（Copilot、Cursor 等）不會認得這裡的內容。

---

## 📂 資料夾與目錄結構分類說明 (Directory Categorization)

本儲存庫依模組功能劃分為以下主要分類與資料夾架構：

```text
.
├── 📄 USER_AGREEMENT.md             # 系統通用：使用者服務條款與免責聲明全文
├── 📂 user-agreement/               # 模組：使用者服務條款與授權規範管理
│   ├── 📄 SKILL.md                  # 條款查詢與發布技能指引
│   └── 📄 USER_AGREEMENT.md         # 服務條款全文規範
├── 📂 shift-log/                    # 模組：開發工作階段與交接日誌管理
│   └── 📄 SKILL.md                  # 開工 / 收工日誌自動化技能
└── 📂 notion-database-design/       # 模組：Notion 架構規劃與系統資料庫設計
    └── 📄 SKILL.md                  # Notion 資料庫建置與 SQL DDL 規範技能
```

### 分類項目詳細對照表

| 分類類別 | 資料夾 / 檔案路徑 | 說明與用途 | 適用場景 / 觸發時機 |
|---|---|---|---|
| **系統與規範** | [`USER_AGREEMENT.md`](USER_AGREEMENT.md) | 努豆先生線上排課系統與個人軟體之服務條款、免責聲明與隱私規範 | 使用者註冊同意書查詢、免責與免費聲明參考 |
| **條款管理模組** | [`user-agreement/`](user-agreement/SKILL.md) | 服務條款 Skill：包含 `SKILL.md` 技能指引與完整同意書檔案 | 檢視、維護或產出註冊同意書與系統聲明時 |
| **開發流程模組** | [`shift-log/`](shift-log/SKILL.md) | 開工 / 收工工作階段慣例：開工讀取交接檔，收工自動寫回日誌 | 每日開發階段開始與結束時進行進度記錄與對齊 |
| **資料庫設計** | [`notion-database-design/`](notion-database-design/SKILL.md) | Notion 系統資料庫規劃與建置流程（含 Page 前綴共存、權限防線與 SQL DDL） | 使用 Notion 作為系統資料庫或規劃資料模型時 |

---

## 🛠️ 目前收錄的 Skill

| Skill | 相關文件 | 用途摘要 |
|---|---|---|
| [`user-agreement`](user-agreement/SKILL.md) | [使用者服務條款](USER_AGREEMENT.md) | 檢視與維護系統使用者服務條款、免責聲明與隱私權規範。 |
| [`shift-log`](shift-log/SKILL.md) | [SKILL.md](shift-log/SKILL.md) | 「開工 / 收工」工作階段慣例：開工時讀專案交接文件（HANDOFF.md 等）並驗證狀態；收工時把工作摘要寫回交接文件的進度日誌。適用於任何專案資料夾。 |
| [`notion-database-design`](notion-database-design/SKILL.md) | [SKILL.md](notion-database-design/SKILL.md) | 用 Notion 當應用系統資料庫時的規劃與建置流程：單一 Page + 前綴詞的多系統共存架構、主鍵格式設計、權限隔離三道防線、敏感個資加密、API 速率限制的因應、以及建表用的 SQL DDL 速查。 |

---

## 怎麼在一台新機器上安裝使用

Claude Code 是在每次對話開始時，掃描本機的 `~/.claude/skills/` 資料夾來列出可用的 skill —— 不會即時連線 GitHub 抓取。所以要讓某台機器用得到這裡的 skill，需要：

1. Clone 這個 repo 到本機任一位置，例如 `D:\Claude\skill`。
2. 針對想用的每個 skill，在 `~/.claude/skills/<skill 名稱>` 建一個指向 clone 位置的**符號連結 (symlink)**，而不是複製一份檔案。這樣以後編輯 repo 裡的內容，本機馬上就是最新版，不用每次手動同步。

   Windows PowerShell 範例（要用系統管理員權限開的 PowerShell）：
   ```powershell
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\shift-log" `
     -Target "D:\Claude\skill\shift-log"
   ```

3. 開一個新的 Claude Code 對話（skill 清單是對話開始時載入的，改動要新對話才會看到）。

---

## 怎麼更新

直接在這個 clone 出來的資料夾裡改 `SKILL.md`，存檔後 `git commit` + `git push`。因為本機是 symlink 指過來的，改完立即可用，不用重新連結。

其他機器要跟上更新，`git pull` 一次即可。

---

## 怎麼新增一個新的 skill

1. 在 repo 根目錄新增一個資料夾，名稱用小寫英文 + 連字號（例如 `my-new-skill`）。
2. 裡面放一份 `SKILL.md`，至少要有 YAML frontmatter 的 `name`（跟資料夾名稱一致）與 `description`（講清楚「做什麼」和「什麼情況該觸發」，寫具體一點，觸發判斷主要就是看這段）。
3. 需要輔助腳本或參考文件的話，依慣例分別放進 `scripts/`、`references/`、`assets/` 子資料夾。
4. 更新這份 README 最上面的資料夾分類與清單表格，加一行說明。
5. 照上面「安裝使用」的方式建立 symlink，新對話測試看看會不會正確觸發。
