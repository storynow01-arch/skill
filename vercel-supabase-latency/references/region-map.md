# Supabase 區域 → Vercel 函式區域對照

目標是**讓 Vercel 函式跟 Supabase 資料庫在同一個城市，或至少同一個大陸**。

## 對照表

| Supabase 區域 | 城市 | 對應的 Vercel 區域代號 |
|---|---|---|
| `ap-northeast-1` | 東京 | **`hnd1`** |
| `ap-northeast-2` | 首爾 | `icn1` |
| `ap-southeast-1` | 新加坡 | **`sin1`** |
| `ap-southeast-2` | 雪梨 | `syd1` |
| `ap-south-1` | 孟買 | `bom1` |
| `us-east-1` | 維吉尼亞（美東） | `iad1`（Vercel 預設） |
| `us-west-1` | 加州（美西） | `sfo1` |
| `eu-west-1` | 愛爾蘭 | `dub1` |
| `eu-west-2` | 倫敦 | `lhr1` |
| `eu-central-1` | 法蘭克福 | `fra1` |
| `sa-east-1` | 聖保羅 | `gru1` |

> 台灣沒有 Vercel 機房。台灣使用者 + 台灣附近的資料庫，選 **`hnd1`（東京）** 通常最好，`sin1`（新加坡）次之。

## 怎麼確認 Supabase 在哪一區

**方法一（最快）**：Supabase 後台 → Project Settings → General → Region。

**方法二（最可靠）**：直接試。查表可能對不上實際的網路路徑（Supabase 前面有 Cloudflare，實際路由不一定符合直覺），實測兩分鐘就有答案：

```bash
# 改 vercel.json 的 regions → git push → 等部署 → 重量一次頁面時間
```

實際案例：查表推測是新加坡，改成 `sin1` 後快了 3 倍；再試 `hnd1`（東京）又快了 2 倍——資料庫其實在東京。**實測勝過查表。**

## 設定方式

專案根目錄的 `vercel.json`：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["hnd1"]
}
```

- Hobby 方案只能指定**一個**區域，這樣寫就對了。
- 也可以在 Vercel 後台 Settings → Functions → Function Region 設定，但**寫進 `vercel.json` 比較好**：進版控、換帳號或重建專案時不會遺失，而且新加入的人看得到。

## 驗證有沒有生效

```bash
curl -sI https://你的網站.vercel.app/ | grep -i x-vercel-id
# x-vercel-id: hkg1::hnd1::...
#                    ↑ 這一段要變成你設定的區域
```

第一段（邊界節點）會跟著使用者位置變動，**不用管它**；第二段才是函式機房。
