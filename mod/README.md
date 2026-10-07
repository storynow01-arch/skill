# mod — Claude Code 外掛（mod）

未來所有 mod 都放在這個資料夾，一個 mod 一個子資料夾，並登記到倉庫根目錄的 `.claude-plugin/marketplace.json`。

| mod | 作用 |
|---|---|
| `token-meter` | 輸入框上方一列：上下文／5 小時／7 天用量數字＋進度條＋本次花費；`/token` 切換 |
| `task-dashboard` | 輸入框上方一列：只列執行中的專案、全部進度百分比、預計完成時間；`/dashboard` 開完整面板。掃描 `~/.claude/projects` 對話紀錄（只讀，需要 Python `py`）；專案用 `.claude/dashboard.json` 設定（見下） |

## 安裝（每台電腦做一次）

在 Claude Code 裡輸入：

```
/plugin marketplace add storynow01-arch/skill
/plugin install token-meter@storynow-mods
/plugin install task-dashboard@storynow-mods
```

更新：`/plugin marketplace update storynow-mods` 後 `/reload-plugins`。

⚠ 這個倉庫含範本示範片，從 GitHub clone 約要 2 分鐘，超過預設 120 秒會失敗（「Git clone timed out」）。
先設環境變數 `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS=600000`（或寫進 `~/.claude/settings.json` 的 `"env"`）再安裝／更新。

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

## 新增一個 mod

1. 在 `mod/<名稱>/` 放 `.claude-plugin/plugin.json`、`hooks/hooks.json`、`hooks/register.tsx`（用到 `$.state` 再加 `types/index.d.ts`）
2. `marketplace.json` 的 `plugins` 加一筆 `{ "name": "<名稱>", "source": "./mod/<名稱>", "description": "…" }`
3. 驗證：`claude plugin validate mod/<名稱>`、`claude plugin test mod/<名稱>`
4. 改版時把 `plugin.json` 的 `version` 加一，其他電腦才會更新到

`.claude-plugin/types/` 是引擎自動產生的型別檔，不進版控。
