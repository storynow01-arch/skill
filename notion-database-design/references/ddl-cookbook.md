# Notion 建表 DDL 速查

Notion MCP 的 `create-database` 工具接受 SQL `CREATE TABLE` 語法。欄位名用雙引號，型別參數用單引號。

## 型別對照

| DDL 型別 | Notion 型別 | 用途 |
|---|---|---|
| `TITLE` | title | 主鍵，每張表恰好一個 |
| `RICH_TEXT` | rich_text | 一般文字、JSON 字串、密文 |
| `NUMBER` | number | 數值。可加 `FORMAT 'dollar'` 等 |
| `SELECT('值':顏色, ...)` | select | 單選 |
| `MULTI_SELECT('值':顏色, ...)` | multi_select | 多選 |
| `STATUS` | status | 狀態（filter 語法與 select 不同，一般用 SELECT 即可） |
| `DATE` | date | 日期／時間 |
| `CHECKBOX` | checkbox | 布林 |
| `FILES` | files | 附件 |
| `URL` / `EMAIL` / `PHONE_NUMBER` | 對應型別 | 有格式驗證 |
| `PEOPLE` | people | Notion 使用者，非本系統帳號 |
| `RELATION('data_source_id')` | relation | 關聯（權限邊界欄位不要用） |
| `UNIQUE_ID PREFIX 'X'` | unique_id | Notion 自動遞增，但無法自訂格式 |
| `CREATED_TIME` / `LAST_EDITED_TIME` | 系統欄位 | 唯讀 |

可用顏色：`default gray brown orange yellow green blue purple pink red`

## 常用配色慣例

| 語意 | 顏色 |
|---|---|
| 正常／啟用／進行中／收入 | `green` |
| 已刪除／停用／失敗／支出 | `red` |
| 已封存／已沖銷／中性 | `gray` |
| 系統管理者／警示 | `red` |
| 一般使用者／內部 | `blue` |
| 特殊、需注意 | `orange` / `purple` |

## 範例：帶權限邊界的實體表

```sql
CREATE TABLE (
  "學生KEY" TITLE COMMENT '格式：班級ID-座號補零2位',
  "班級ID" RICH_TEXT COMMENT '權限邊界，由系統寫入',
  "座號" NUMBER,
  "姓名" RICH_TEXT,
  "性別" SELECT('男':blue, '女':pink, '不指定':gray),
  "家長電話" RICH_TEXT COMMENT '🔒 加密欄位，密文為正常現象',
  "版本" NUMBER COMMENT '樂觀鎖',
  "狀態" SELECT('正常':green, '已刪除':red),
  "刪除時間" DATE COMMENT '回收桶保留期判定依據'
)
```

## 範例：使用者與密碼

```sql
-- 使用者
CREATE TABLE (
  "帳號" TITLE COMMENT '唯一，可用中文',
  "顯示姓名" RICH_TEXT,
  "角色" SELECT('系統管理者':red, '一般使用者':blue),
  "授權範圍" MULTI_SELECT('範例範圍':blue) COMMENT '可存取的範圍ID，支援多筆',
  "狀態" SELECT('啟用':green, '停用':gray),
  "需強制改密碼" CHECKBOX,
  "最後登入時間" DATE,
  "登入失敗次數" NUMBER,
  "鎖定至" DATE
)

-- 密碼
CREATE TABLE (
  "帳號" TITLE,
  "雜湊" RICH_TEXT COMMENT 'argon2id 完整字串，含參數與 salt',
  "更新時間" DATE
)
```

`MULTI_SELECT()` 至少要給一個初始選項，之後程式寫入新值時 Notion 會自動建立。

## 範例：系統設定與稽核日誌

```sql
-- 系統設定
CREATE TABLE (
  "設定KEY" TITLE COMMENT '格式：GLOBAL-名稱 或 範圍ID-名稱',
  "範圍ID" RICH_TEXT COMMENT '空值代表全域設定',
  "設定值" RICH_TEXT,
  "型別" SELECT('文字':gray, '數字':blue, '布林':green, 'JSON':purple),
  "說明" RICH_TEXT
)

-- 稽核日誌
CREATE TABLE (
  "日誌KEY" TITLE COMMENT '格式：ISO時間戳-流水號',
  "範圍ID" RICH_TEXT COMMENT '系統層級操作可空',
  "時間" DATE,
  "操作者帳號" RICH_TEXT,
  "動作" SELECT('登入':green, '登入失敗':red, '登出':gray, '新增':blue, '修改':yellow, '刪除':orange, '還原':green, '永久刪除':red, '匯入':purple, '設定變更':brown, '密碼重設':pink),
  "目標表" RICH_TEXT,
  "目標KEY" RICH_TEXT,
  "變更內容" RICH_TEXT COMMENT 'JSON。敏感欄位只記「已變更」',
  "IP" RICH_TEXT
)
```

## 範例：單例 JSON 表

適用於「每個範圍恰好一筆、總是整份讀寫」的資料。

```sql
CREATE TABLE (
  "座位表KEY" TITLE COMMENT '格式：範圍ID-座位表',
  "班級ID" RICH_TEXT,
  "排數" NUMBER,
  "每排位數" NUMBER,
  "配置JSON" RICH_TEXT COMMENT '二維陣列，值為座號，null 為空位',
  "版本" NUMBER,
  "更新時間" DATE
)
```

## 範例：不可修改的金錢分錄

```sql
CREATE TABLE (
  "分錄KEY" TITLE COMMENT '格式：範圍ID-A流水號',
  "班級ID" RICH_TEXT,
  "日期" DATE,
  "類型" SELECT('收入':green, '支出':red),
  "摘要" RICH_TEXT,
  "金額" NUMBER COMMENT '一律為正數，方向由類型決定',
  "附件" FILES,
  "沖銷對象" RICH_TEXT COMMENT '更正時填入被沖銷的分錄KEY',
  "操作者" RICH_TEXT,
  "狀態" SELECT('正常':green, '已沖銷':gray)
)
```

分錄一經建立不可修改、不可刪除。更正只能新增反向分錄。

## 建立時的參數

```json
{
  "parent": { "type": "page_id", "page_id": "<Root Page ID>" },
  "title": "導師・學生",
  "description": "系統名稱 — 這張表的用途。⚠️ 含加密個資，密文為正常現象。",
  "schema": "CREATE TABLE (...)"
}
```

`description` 會顯示在 Notion 資料庫標題下方，把「這是哪個系統的」「有沒有個資」寫進去，避免日後有人誤刪或誤改。
