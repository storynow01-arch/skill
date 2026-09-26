/**
 * Supabase 兩把 key 的設定驗證（只讀；唯一的寫入嘗試預期會被拒絕）。
 *
 * 放到專案的 scripts/ 底下執行：
 *   npm i @supabase/postgrest-js @supabase/storage-js
 *   node scripts/check-keys.mjs <publishable key> <一張有資料的表> [私有 bucket 名稱]
 *
 * 例：
 *   node scripts/check-keys.mjs sb_publishable_xxx users private-files
 *
 * secret key 從 .env.local 的 SUPABASE_SECRET_KEY 讀，不要放在命令列（會留在 shell 歷史）。
 * publishable key 本來就是公開的，當參數沒關係。
 *
 * ⚠️ 第二個參數一定要是「已經有資料」的表。RLS 擋下讀取時回的是 200 + 空陣列，
 *    拿空表來測，0 筆什麼都證明不了。
 */
import fs from 'node:fs'
import { PostgrestClient } from '@supabase/postgrest-js'
import { StorageClient } from '@supabase/storage-js'

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const [公開key, 有資料的表, bucket] = process.argv.slice(2)
if (!公開key || !有資料的表) {
  console.error('用法：node scripts/check-keys.mjs <publishable key> <有資料的表> [私有 bucket]')
  process.exit(1)
}

const URL_ = env.SUPABASE_URL ?? ''
const 秘密 = env.SUPABASE_SECRET_KEY ?? ''

let 失敗 = 0
const 驗 = (名, ok, 備註 = '') => {
  if (!ok) 失敗++
  console.log(`  ${ok ? '✅' : '❌'} ${名}${備註 ? `　${備註}` : ''}`)
}

// Node 20 不要用 supabase-js 的 createClient（會建立需要 Node 22 WebSocket 的 realtime）
// 新版 key 只放 apikey 標頭，不要加 Authorization
const 連線 = (key) => ({
  from: (t) => new PostgrestClient(`${URL_}/rest/v1`, { headers: { apikey: key } }).from(t),
  storage: new StorageClient(`${URL_}/storage/v1`, { apikey: key }),
})

console.log('\n── 0. 環境變數')
驗('SUPABASE_URL 只到 .supabase.co', /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(URL_), URL_.includes('/rest/v1') ? '多加了 /rest/v1' : '')
驗('SUPABASE_SECRET_KEY 是 sb_secret_ 開頭', 秘密.startsWith('sb_secret_'))
驗('沒有 NEXT_PUBLIC_ 開頭的 Supabase 設定', !Object.keys(env).some((k) => k.startsWith('NEXT_PUBLIC_') && /SUPABASE/i.test(k)))

console.log('\n── 1. secret key（伺服器用）')
const 伺服器 = 連線(秘密)
const { count, error } = await 伺服器.from(有資料的表).select('*', { count: 'exact', head: true })
驗(`讀得到 ${有資料的表}`, !error && count > 0, error ? error.message : `${count} 筆${count === 0 ? '（這張表是空的，換一張有資料的）' : ''}`)
if (bucket) {
  const { data, error: e } = await 伺服器.storage.getBucket(bucket)
  驗(`bucket ${bucket} 是私有的`, data?.public === false, e?.message ?? `public=${data?.public}`)
}

console.log('\n── 2. publishable key（公開的）不能碰任何業務資料')
const 匿名 = 連線(公開key)
const 讀 = await 匿名.from(有資料的表).select('*').limit(1)
驗(`讀 ${有資料的表} 回 0 筆（RLS 擋住了）`, Boolean(讀.error) || (讀.data ?? []).length === 0,
  讀.error ? `被拒：${讀.error.code}` : `回傳 ${(讀.data ?? []).length} 筆`)
const 寫 = await 匿名.from(有資料的表).insert({})
驗('寫入被拒', Boolean(寫.error), 寫.error?.code ?? '竟然寫成功了！')
if (bucket) {
  const l = await 匿名.storage.from(bucket).list()
  驗(`讀不到 bucket ${bucket}`, Boolean(l.error) || (l.data ?? []).length === 0)
}

console.log('\n── 3. heartbeat（喚醒腳本用）')
const t0 = Date.now()
const r = await fetch(`${URL_}/rest/v1/heartbeat?select=id&limit=1`, { headers: { apikey: 公開key } })
const 內容 = await r.text()
驗('回 200 且讀得到一列', r.status === 200 && 內容.includes('"id":1'),
  `HTTP ${r.status}，資料庫處理 ${r.headers.get('x-envoy-upstream-service-time') ?? '?'} ms，來回 ${Date.now() - t0} ms`)

console.log(失敗 ? `\n❌ ${失敗} 項沒通過` : '\n✅ 全部通過')
process.exit(失敗 ? 1 : 0)
