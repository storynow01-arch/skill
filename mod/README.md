# mod — Claude Code 外掛（mod）

未來所有 mod 都放在這個資料夾，一個 mod 一個子資料夾，並登記到倉庫根目錄的 `.claude-plugin/marketplace.json`。

| mod | 作用 |
|---|---|
| `token-meter` | 輸入框上方一列：上下文／5 小時／7 天用量數字＋進度條＋本次花費；`/token` 切換 |
| `task-dashboard` | 輸入框上方一列：只列執行中的專案與進度；`/dashboard` 開完整面板。掃描 `~/.claude/projects` 對話紀錄（只讀，需要 Python `py`）；專案可用 `.claude/dashboard.json` 登記背景紀錄檔 |

## 安裝（每台電腦做一次）

在 Claude Code 裡輸入：

```
/plugin marketplace add storynow01-arch/skill
/plugin install token-meter@storynow-mods
/plugin install task-dashboard@storynow-mods
```

更新：`/plugin marketplace update storynow-mods` 後 `/reload-plugins`。

## 新增一個 mod

1. 在 `mod/<名稱>/` 放 `.claude-plugin/plugin.json`、`hooks/hooks.json`、`hooks/register.tsx`（用到 `$.state` 再加 `types/index.d.ts`）
2. `marketplace.json` 的 `plugins` 加一筆 `{ "name": "<名稱>", "source": "./mod/<名稱>", "description": "…" }`
3. 驗證：`claude plugin validate mod/<名稱>`、`claude plugin test mod/<名稱>`
4. 改版時把 `plugin.json` 的 `version` 加一，其他電腦才會更新到

`.claude-plugin/types/` 是引擎自動產生的型別檔，不進版控。
