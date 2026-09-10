---
name: vercel-supabase-latency
description: 診斷並修正 Vercel + Supabase 架構「整站都慢」的問題。當使用者說網站很慢、每一頁都要好幾秒、換到 Supabase 之後反而變慢、部署到 Vercel 之後變慢、懷疑要加索引或優化查詢、或問「為什麼這麼慢」時使用。核心是先分離「網路距離」與「資料庫處理」兩件事——用 x-vercel-id 看函式跑在哪個機房、用 x-envoy-upstream-service-time 看資料庫真正花了幾毫秒，再決定要搬機房還是改查詢。也在使用者說「網站好慢」「速度優化」「Vercel 很慢」「Supabase 很慢」「頁面載入要好幾秒」時觸發。
metadata:
  tags: vercel, supabase, latency, performance, region, 效能, 速度, 機房, serverless
---

# Vercel + Supabase「整站都慢」的診斷與修正

這個組合最常見的效能問題**不是查詢寫得爛，也不是缺索引**，而是**程式跑的機房跟資料庫的機房隔了半個地球**。

症狀很沒有特色：每一頁都要 2～5 秒，沒有錯誤訊息，Supabase 後台看起來一切正常。因為沒有任何東西「壞掉」，很容易一路往「加索引」「改查詢」「加快取」的方向優化，結果動了一堆程式卻只快一點點。

**先量再改。** 下面的流程可以在十分鐘內把「網路距離」和「資料庫處理」分開，答案通常在第二步就出來了。

---

## 一、三個關鍵訊號

診斷的全部基礎就這三個，每一個都是免費且立即可得的。

### 1. `x-vercel-id` —— 函式實際跑在哪

```bash
curl -sI https://你的網站.vercel.app/ | grep -i x-vercel-id
# x-vercel-id: hkg1::iad1::zw4gn-1789045980345-8ca944121769
#              ↑邊界   ↑函式實際執行的機房
```

**第一段是邊界節點（依使用者位置決定），第二段才是 serverless 函式真正執行的機房。** 這兩個常常被搞混：邊界在香港不代表你的程式在香港跑。

**Vercel 的預設函式機房是 `iad1`（美國東岸維吉尼亞）。** 這是全域統一的預設值，跟你人在哪、資料庫在哪都無關——匯入專案時它不會問你，也不可能知道你的 Supabase 開在哪一區。

### 2. `x-envoy-upstream-service-time` —— 資料庫真正花了幾毫秒

Supabase 的 REST 回應會帶這個標頭，數值是**資料庫端實際處理的時間**，不含網路。

```bash
curl -s -o /dev/null -D - \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "https://<專案>.supabase.co/rest/v1/<任一表>?select=*&limit=1" \
  | grep -i envoy-upstream
# x-envoy-upstream-service-time: 3
```

**這是整個診斷最關鍵的一個數字。**

- 個位數毫秒（2～10ms）→ 資料庫很快，慢的是網路距離。加索引、改查詢都不會有明顯效果。
- 上百毫秒 → 這才是查詢本身的問題，去看執行計畫、加索引。

### 3. 靜態頁 vs 動態頁的落差 —— 網路到底佔多少

```js
// 在瀏覽器 console 對自己的網站跑
const t = async (url) => { const a=performance.now(); const r=await fetch(url,{cache:'no-store'}); await r.text(); return Math.round(performance.now()-a); };
console.log('404（不查資料庫）', await t('/__不存在的路徑'));
console.log('首頁（要查）    ', await t('/'));
```

404 的時間 ≈ 使用者到邊界節點的純網路成本。**如果 404 只要 200ms、但每一頁都要 3 秒，那 2.8 秒全部發生在伺服器端**，而不是使用者的網路。

---

## 二、決定性的一步：從函式內部量

前面三步能指出方向，但要坐實「距離」這個結論，必須從**函式內部**計時——外面量不出「函式→資料庫」那一段。

貼一個臨時端點上去（完整程式碼見 [`references/diag-route.ts`](references/diag-route.ts)），量完就刪：

```
GET /api/diag  →  { "region": "iad1", "marks": { "auth.getUser": 632, "最小查詢": 374, ... } }
```

**判讀方式：**

| 從函式內量到的單次查詢 | 意義 |
|---|---|
| 5～20 ms | 同區，正常 |
| 50～120 ms | 鄰近區域（例如新加坡↔東京） |
| **200 ms 以上** | **跨洲。這就是病因** |

搭配訊號 2 一起看：如果 `x-envoy-upstream-service-time` 是 3ms，但函式量到 300ms，那 297ms 全花在來回路上。

---

## 三、修正：把函式搬到資料庫旁邊

在專案根目錄建立 `vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["hnd1"]
}
```

**搬函式，不要搬資料庫。** 一次頁面請求裡，使用者↔函式只有一次來回，函式↔資料庫卻有 5～10 次。把函式移近資料庫，省下的是那 5～10 次；把函式移近使用者，只省一次。

區域代號對照見 [`references/region-map.md`](references/region-map.md)。

**不確定 Supabase 在哪一區怎麼辦？**

最快的方法是**直接試**。Supabase 後台（Project Settings → General → Region）會寫，但實測比查表可靠——改一行 `vercel.json`、推上去、重量一次頁面時間，兩分鐘就有答案。實際案例裡新加坡比美東快了 3 倍，東京又比新加坡快了 2 倍，資料庫其實在東京。

⚠️ **這一行要進版控。** 它不是「調校參數」而是「架構前提」，拿掉就會慢回去，而且沒有任何錯誤訊息提醒你。

---

## 四、搬完之後還能再快的地方

搬機房通常一次解決 70～80%。剩下的：

1. **把獨立的查詢改成並行。** Server Component 裡一連串 `await` 是逐一等待，五個查詢就是五次來回。彼此不相依的用 `Promise.all` 併起來。

2. **middleware 的 `auth.getUser()` 每一頁都會跑一次。** 它是網路呼叫，不是本地解 JWT。這也是為什麼「幾乎不查資料庫的登入頁」有時反而最慢——它照樣要過這一關。

3. **N+1 要在查詢層解掉。** Supabase 的巢狀 select（`select('id, items(name)')`）一次就把關聯撈回來，不要在迴圈裡逐筆查。

4. **簽名網址批次簽。** `createSignedUrls`（複數）一次簽一批，不要在迴圈裡呼叫單數版。

---

## 五、常見誤判

| 你以為 | 實際上 |
|---|---|
| 「換到 Supabase 才變慢，是 Supabase 的問題」 | 多半是部署平台的機房沒跟著調整。`x-envoy-upstream-service-time` 會證明資料庫只花幾毫秒 |
| 「`x-vercel-id` 顯示香港，所以在亞洲跑」 | 那是邊界節點。**第二段**才是函式機房 |
| 「我從自己電腦量，Supabase 很快啊」 | 你在台灣、函式在美東，兩條路徑完全不同。**一定要從函式內部量** |
| 「加索引應該會有幫助」 | 資料庫只花 3ms 的時候，索引再好也省不到什麼 |
| 「頁面慢是因為圖片大」 | 先量。圖片是並行下載的，通常不是關鍵路徑；伺服器回應才是 |

---

## 六、完整檢查清單

```
□ curl -sI 網址 | grep x-vercel-id      → 第二段是哪個機房？
□ 量 404 vs 首頁                        → 落差是不是都在伺服器端？
□ 看 x-envoy-upstream-service-time      → 資料庫本身幾毫秒？
□ 貼 /api/diag 從函式內量               → 單次查詢幾毫秒？
□ 加 vercel.json 的 regions             → 搬到資料庫那一區
□ 重量一次，確認真的變快                 → 沒變快就換一個候選區域再試
□ 刪掉 /api/diag                        → 量測端點不要留在正式環境
□ 把 regions 這件事寫進 README           → 下一個人（或未來的你）才知道不能拿掉
```

---

## 附錄：一個真實案例的數字

同一份程式碼，只改函式機房：

| 頁面 | `iad1` 美東 | `sin1` 新加坡 | `hnd1` 東京 |
|---|---|---|---|
| 首頁 | 3,294 ms | 1,188 ms | **534 ms** |
| 清單頁 | 2,475 ms | 987 ms | **471 ms** |
| 統計頁 | 3,054 ms | 1,008 ms | **584 ms** |
| 最重的一頁 | 4,457 ms | 1,305 ms | **611 ms** |

診斷過程中的關鍵數字：

- 404 頁：**213 ms**（所以使用者端的網路不是問題）
- 幾乎不查資料庫的登入頁：**3,838 ms**（最慢的一頁，推翻「查詢太多」的假設）
- `x-envoy-upstream-service-time`：**2～5 ms**（資料庫本身很快）
- 從 `iad1` 函式內量單次查詢：**236～637 ms**（跨太平洋來回）

**資料庫佔 2%，網路距離佔 98%。** 一行設定，快了六倍。
