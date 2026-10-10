# mod — Claude Code 外掛（mod）

未來所有 mod 都放在這個資料夾，一個 mod 一個子資料夾，並登記到倉庫根目錄的 `.claude-plugin/marketplace.json`。

| mod | 作用 |
|---|---|
| `token-meter` | 輸入框上方一列：上下文／5 小時／7 天用量數字＋進度條＋本次花費；`/token` 切換 |
| `task-dashboard` | 輸入框上方一列：只列執行中的專案、全部進度百分比、預計完成時間；`/dashboard` 開完整面板。掃描 `~/.claude/projects` 對話紀錄（只讀，需要 Python `py`）；專案用 `.claude/dashboard.json` 設定（見下） |
| `edit-guard` | 多個對話改同一個檔案時先問：每次 Write／Edit／NotebookEdit 成功後，把檔名、時間、對話 ID、專案資料夾記到 `~/.claude/edit-ledger.json`（所有對話共用，只留 30 分鐘）；寫檔前發現 30 分鐘內別的對話改過同一個檔案，跳出對話框問「繼續寫入／取消」。只管這三個工具，用 Bash 寫檔不會被記錄或攔下 |
| `record-mask` | `/record` 開關錄影遮罩：我打的訊息、Claude 的回答、指令與工具結果裡的 email、API key、電話號碼換成遮罩（狀態列顯示「● 錄影遮罩中」）；只改畫面，Claude 讀到的內容不變。不遮輸入框裡正在打的字、狀態列與面板 |
| `handoff-button` | 上下文用到 70% 時，輸入框上方出現「交接（收工）」按鈕；按下送出「收工…」，照 `shift-log` skill 寫交接文件（不 commit） |

三個新 mod 都在系統提示加一段說明（`prompt.compose`），之後開的每個對話都知道它們的行為。

**這台電腦（storynow）的裝法**：三個新 mod 另外放在使用者資料夾的本機市集 `C:\Users\storynow\claude-mods`（`storynow-local-mods`，user 範圍安裝、直接讀那個資料夾）；這裡是同一份的倉庫備份，改版時兩邊同步。其他電腦照下面裝法用 `storynow-mods` 安裝即可。

## 安裝（每台電腦做一次）—— 建議：直接讀本機的 skill 資料夾

每台電腦都已經有這個倉庫的 clone（例：`D:\claude\skill-push`），在 Claude Code 輸入（路徑換成那台的位置）：

```
/plugin marketplace add D:\claude\skill-push
/plugin install token-meter@storynow-mods
/plugin install task-dashboard@storynow-mods
/plugin install edit-guard@storynow-mods
/plugin install record-mask@storynow-mods
/plugin install handoff-button@storynow-mods
```

之前從 GitHub 裝過的，先 `/plugin marketplace remove storynow-mods` 再做上面幾行。

**之後更新**：在 skill 資料夾 `git pull`，開新對話就是最新版（不用 marketplace update、不用重新下載）。
`/plugin list` 會顯示 `Read from: D:\claude\skill-push\mod\…` 表示是讀本機資料夾。

### 另一種：從 GitHub 安裝（沒有本機 clone 時才用）

```
/plugin marketplace add storynow01-arch/skill
```
⚠ 倉庫含範本示範片，clone 約 2 分鐘，超過預設 120 秒會失敗 → 先設 `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS=600000`。
這種裝法每次改版都要把 `plugin.json` 的 version 加一，再 `/plugin marketplace update storynow-mods`。

## task-dashboard 的專案設定 `.claude/dashboard.json`

```json
{
  "logs": ["11_品檢/v8_batch.log"],
  "progress": {
    "label": "節", "total": 56, "glob": "11_品檢/v8_*/.ok",
    "extra": [{ "label": "集", "total": 8, "glob": "06_輸出_集/v8/EP?.mp4" }],
    "wait": { "until": "15:05", "items": ["11_品檢/v8_4-12/.ok"] },
    "tail_min": 30
  }
}
```

- `logs`：30 分鐘內有更新就算「背景執行中」，顯示最後一行
- `progress.glob`：每完成一項就多一個檔案（完成記號）；百分比＝檔案數／`total`
- 預計完成時間＝剩餘項數 × 每項分鐘數 ＋ `tail_min`（收尾）。每項分鐘數取最近 24 小時完成記號間隔的中位數（只算 3～60 分），也可用 `per_item_min` 指定
- `wait`：今天 `until` 之前不會動的項目（例：等配音額度），預估會排到 `until` 之後
- `extra`：只顯示數量，不算進百分比

### 沒有設定 `progress` 的專案（後備進度，自動）

依序找，找到就停（`dashboard.json` 的 `progress` 永遠最優先，行為不變）：

1. **對話裡的工作清單**：最新那份對話紀錄中 Claude 用 `TaskCreate`／`TaskUpdate` 建的待辦（讀整份紀錄的成功結果，不受 400 KB 限制）。顯示「清單 38% 3/8項 · 預計 15:26 完成」。
   - 一份清單＝前一份全部做完（或還沒有項目）後新建的項目起算；刪掉的項目不算
   - 每項分鐘數＝完成間隔的中位數（60 秒內一起勾完的算一批、時間平均分攤；超過 2 小時的間隔當休息不算）；還沒完成任何一項就顯示「完成時間估算中」
   - 對話超過 30 分鐘沒動作、清單又還沒做完 →「暫停中」，不估完成時間，也不佔輸入框上方那一列
2. **專案資料夾的 `工作清單.md` 勾選框**（`- [x]`／`- [ ]`）：顯示「勾選 60% 3/5項 · 不估完成時間」（沒有時間紀錄，不猜時間）
3. **都沒有**：不顯示百分比（不捏造數字）；輸入框上方照舊顯示 Claude 最後一句，`/dashboard` 面板顯示「進度：沒有工作清單，不估算」

想讓某專案一定有準確進度：在 `.claude/dashboard.json` 設 `progress`，或請 Claude 工作時用工作清單（TaskCreate）列出步驟。

## 新增一個 mod

1. 在 `mod/<名稱>/` 放 `.claude-plugin/plugin.json`、`hooks/hooks.json`、`hooks/register.tsx`（用到 `$.state` 再加 `types/index.d.ts`）
2. `marketplace.json` 的 `plugins` 加一筆 `{ "name": "<名稱>", "source": "./mod/<名稱>", "description": "…" }`
3. 驗證：`claude plugin validate mod/<名稱>`、`claude plugin test mod/<名稱>`
4. 改版時把 `plugin.json` 的 `version` 加一，其他電腦才會更新到

`.claude-plugin/types/` 是引擎自動產生的型別檔，不進版控。
