# 我的 Claude Skills 收藏庫

存放個人常用的 [Claude Skill](https://www.anthropic.com/) —— 每個資料夾是一個獨立的 skill,包含一份 `SKILL.md`(定義觸發時機與執行步驟),之後也可能包含 `scripts/`、`references/`、`assets/` 等輔助檔案。

適用於 Claude Code、Claude.ai、Cowork 等任何讀取 `SKILL.md` 格式的 Claude 介面。**不是**通用的 AI plugin 格式,其他廠牌的 AI 工具(Copilot、Cursor 等)不會認得這裡的內容。

## 目前收錄的 Skill

| Skill | 用途 |
|---|---|
| [`shift-log`](shift-log/SKILL.md) | 「開工 / 收工」工作階段慣例:開工時讀專案交接文件(HANDOFF.md 等)並驗證裡面的運行狀態是否過期;收工時把工作摘要寫回交接文件的進度日誌。適用於任何專案資料夾,不限定特定專案。 |

## 怎麼在一台新機器上安裝使用

Claude Code 是在每次對話開始時,掃描本機的 `~/.claude/skills/` 資料夾來列出可用的 skill——不會即時連線 GitHub 抓取。所以要讓某台機器用得到這裡的 skill,需要：

1. Clone 這個 repo 到本機任一位置,例如 `D:\Claude\skill`。
2. 針對想用的每個 skill,在 `~/.claude/skills/<skill 名稱>` 建一個指向 clone 位置的**符號連結(symlink)**,而不是複製一份檔案。這樣以後編輯 repo 裡的內容,本機馬上就是最新版,不用每次手動同步。

   Windows PowerShell 範例(要用系統管理員權限開的 PowerShell):
   ```powershell
   New-Item -ItemType SymbolicLink `
     -Path "$env:USERPROFILE\.claude\skills\shift-log" `
     -Target "D:\Claude\skill\shift-log"
   ```

3. 開一個新的 Claude Code 對話(skill 清單是對話開始時載入的,改動要新對話才會看到)。

## 怎麼更新

直接在這個 clone 出來的資料夾裡改 `SKILL.md`,存檔後 `git commit` + `git push`。因為本機是 symlink 指過來的,改完立刻生效,不用重新連結。

其他機器要跟上更新,`git pull` 一次即可。

## 怎麼新增一個新的 skill

1. 在 repo 根目錄新增一個資料夾,名稱用小寫英文 + 連字號(例如 `my-new-skill`)。
2. 裡面放一份 `SKILL.md`,至少要有 YAML frontmatter 的 `name`(跟資料夾名稱一致)與 `description`(講清楚「做什麼」和「什麼情況該觸發」,寫具體一點,觸發判斷主要就是看這段)。
3. 需要輔助腳本或參考文件的話,依慣例分別放進 `scripts/`、`references/`、`assets/` 子資料夾。
4. 更新這份 README 最上面的清單表格,加一行說明。
5. 照上面「安裝使用」的方式建立 symlink,新對話測試看看會不會正確觸發。
