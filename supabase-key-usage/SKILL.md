---
name: supabase-key-usage
description: Supabase 兩把 API key（publishable／secret）該怎麼用、放哪裡、怎麼驗證沒放錯的規則。當使用者要把系統接上 Supabase、要設定 SUPABASE_URL 或 API key、問 publishable key 和 secret key 差在哪、要不要把 key 放在前端、要設定 RLS、要用 GAS 或排程每天喚醒 Supabase 避免免費版暫停、在對話中貼出 secret key、或遇到 Node 20 建立 Supabase client 時出現 WebSocket 錯誤時使用。也在使用者說「接 Supabase」「Supabase 的 key」「RLS 要怎麼設」「喚醒 Supabase」「heartbeat」「Supabase 被暫停」時觸發。
metadata:
  tags: supabase, api-key, publishable, secret, rls, security, heartbeat, gas, vercel, nextjs
---

# Supabase 兩把 key 的用法：伺服器專用架構

Supabase 給你兩把 key，**用錯地方是最常見、也最嚴重的設定錯誤**——secret key 流到前端等於整個資料庫公開；
反過來，把所有東西都丟給 publishable key + RLS，又得把每一條權限規則都寫進資料庫，一條寫錯就外洩。

這份規則描述一種**簡單、好驗證**的做法：**瀏覽器完全不直接連 Supabase，一律經過自己的伺服器 API。**

---

## 一、兩把 key 各是什麼

| | Publishable key（`sb_publishable_...`） | Secret key（`sb_secret_...`） |
|---|---|---|
| 設計用途 | 可以放在瀏覽器、公開也沒關係 | **只能放在伺服器** |
| 權限 | 受 RLS 規則限制 | **不受 RLS 限制**，能讀寫全部資料 |
| 外洩的後果 | 只能做 RLS 允許的事 | **整個資料庫失守** |
| 本架構的用法 | **只給喚醒腳本讀 heartbeat 一張表** | 伺服器端讀寫所有資料 |
| 放在哪 | 喚醒腳本（GAS）裡；網站本身不需要 | `.env.local` 與部署平台的環境變數 |

> 舊版的 `anon` / `service_role` JWT key 對應的就是這兩把。新專案用新版 key。

---

## 二、架構：瀏覽器只跟自己的 API 說話

```
瀏覽器 ──→ 自己的 API（Next.js Route Handler）──secret key──→ Supabase
   ↑                     ↑
   │            權限、班級／租戶隔離、敏感欄位加解密都在這層
   └── 永遠拿不到任何 Supabase key
```

**為什麼不讓瀏覽器直接用 publishable key 連？**

- 權限規則只需要寫**一次**（在伺服器程式裡，可以寫測試），不用在 RLS 裡再寫一份
- 自訂登入（例如中文帳號、argon2id 密碼）、欄位加密、稽核日誌，都只能在伺服器做
- 驗證很容易：只要確認「publishable key 什麼都讀不到」，就知道沒有任何資料會從前端漏出去

**什麼時候不適用**：要用 Supabase Auth 讓使用者直接從瀏覽器讀寫（例如即時聊天、純前端 App）。
那種架構必須為每張表寫完整的 RLS policy，不在這份規則的範圍。

---

## 三、設定步驟

### 1. 環境變數

```text
SUPABASE_URL=https://<專案代號>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

- **網址只到 `.supabase.co`**，不要加 `/rest/v1/`（後台 API 頁面顯示的網址有加，複製時要拿掉）
- **絕對不要加 `NEXT_PUBLIC_` 前綴**——加了就會被打包進前端 JS，任何人都看得到
- 網站本身**不需要** publishable key，不用放進 `.env`

### 2. 建表時一律鎖死 RLS

每張表都 `enable row level security`，**而且不建立任何給 `anon` 的 policy**——
secret key 本來就不受 RLS 限制，伺服器照常讀寫；publishable key 則什麼都拿不到。

唯一例外是喚醒用的 `heartbeat` 表（見第四節）。範本見 [`references/lockdown.sql`](references/lockdown.sql)。

私有檔案（例如學生照片）的 Storage bucket 一律 `public = false`，由伺服器讀出來再串流給瀏覽器，
**不要把簽名網址或公開網址交給瀏覽器**——拿到網址的人在有效期內誰都能看。

### 3. 用程式驗證，不要用眼睛看

設定完**一定要跑一次驗證**（腳本見 [`references/check-keys.mjs`](references/check-keys.mjs)）：

| 檢查 | 預期 |
|---|---|
| secret key 讀每一張表 | 讀得到（有資料的表回傳筆數） |
| **publishable key 讀有資料的表** | **回傳 0 筆**——這才證明 RLS 擋住了（不是因為表是空的） |
| publishable key 寫入 | 被拒（錯誤碼 `42501`） |
| publishable key 讀私有 bucket | 讀不到 |
| publishable key 讀 heartbeat | **200，讀得到一列** |

⚠️ RLS 擋下讀取時，PostgREST 回的是 **200 + 空陣列**，不是錯誤。所以一定要拿**已經有資料**的表來測，
空表回 0 筆什麼都證明不了。

---

## 四、免費版暫停：用 heartbeat 每天喚醒

Supabase 免費版**連續 7 天沒有請求會自動暫停**（寒暑假、長假很容易碰到）。

做法：建一張**沒有任何個資**的 `heartbeat` 表，只開放匿名讀取，由外部排程每天打一次。

```sql
create table if not exists public.heartbeat (id int primary key, note text not null);
insert into public.heartbeat values (1, '喚醒用，勿刪') on conflict (id) do nothing;
alter table public.heartbeat enable row level security;
create policy heartbeat_anon_read on public.heartbeat for select to anon using (true);
```

GAS（Google Apps Script）每天觸發的請求：

```javascript
var endpoint = project.url + '/rest/v1/heartbeat?select=id&limit=1';
var options = {
  method: 'get',
  headers: { apikey: project.key },  // publishable key；新版 key 只要這一個標頭，不要加 Authorization
  muteHttpExceptions: true
};
```

- 預期回 **200**。回 401 代表 policy 沒設好
- **第二道保險**：如果網站本身有每天執行的排程（例如 Vercel Cron 清回收桶），它也會連資料庫
- GAS 裡放的是 **publishable key**，被看到也只讀得到 heartbeat

---

## 五、伺服器端怎麼連

### ⚠️ Node 20 不要用 `createClient`

`@supabase/supabase-js` 的 `createClient` 會順便建立即時推播（realtime），而它需要 **Node 22 才內建的 WebSocket**。
在 Node 20 上**一建立 client 就丟例外**：

```
Error: Node.js 20 detected without native WebSocket support.
```

不用即時推播的話，直接用它底下的兩個元件（`npm i @supabase/postgrest-js @supabase/storage-js`）：

```ts
import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'

const headers = { apikey: process.env.SUPABASE_SECRET_KEY! }  // 新版 key 只放 apikey
export const db = new PostgrestClient(`${process.env.SUPABASE_URL}/rest/v1`, { headers })
export const storage = new StorageClient(`${process.env.SUPABASE_URL}/storage/v1`, headers)
```

本機與 Vercel 的 Node 版本不一定相同，**用這種寫法兩邊都不用擔心**。

### 不要用 `postgres://` 直連網址

在 Vercel 這類 serverless 平台上，直連網址會踩到 IPv6、連線池（pooler 的 port 與模式）、資料庫密碼等一連串設定問題。
**只用 `SUPABASE_URL` + secret key 走 REST**，完全沒有這些坑。

建表、改結構用後台的 **SQL Editor** 貼上執行（SQL 檔放在 repo 的 `supabase/migrations/` 進版控）。

### 機房

函式機房要跟資料庫同一區，否則每頁慢好幾秒且沒有錯誤訊息——見 [`vercel-supabase-latency`](../vercel-supabase-latency/SKILL.md)。

---

## 六、secret key 外洩了怎麼辦

**只要在任何地方出現過（對話、截圖、commit、訊息），就當作已經外洩。**

1. Supabase 後台 → Project Settings → API Keys → **新增一把 secret key → 刪掉舊的**
2. 新的那把直接貼進 `.env.local` 與部署平台，**不要再貼到任何對話或文件**
3. 如果曾經 commit 進 git，光刪檔案沒用（歷史裡還在），一樣要換 key
4. 部署平台更新環境變數後要**重新部署**才會生效

publishable key 外洩沒關係——它本來就設計成公開的，前提是第三節的驗證有通過。

---

## 七、檢查清單

```
□ SUPABASE_URL 只到 .supabase.co，沒有 /rest/v1/
□ SUPABASE_SECRET_KEY 沒有 NEXT_PUBLIC_ 前綴，只在 .env.local 與部署平台
□ .env.local 在 .gitignore 裡（git check-ignore .env.local）
□ 每張表都開 RLS，沒有給 anon 的 policy（heartbeat 除外）
□ 私有 bucket 是 public = false
□ 跑 check-keys：publishable key 讀有資料的表回 0 筆、寫入被拒、heartbeat 回 200
□ 伺服器端用 postgrest-js / storage-js（Node 20 不用 createClient）
□ 不用 postgres:// 直連網址
□ 函式機房與資料庫同區（vercel.json regions）
□ 喚醒腳本已加上這個專案，手動執行一次看到 200
```
