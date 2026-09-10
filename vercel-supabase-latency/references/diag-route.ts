/**
 * 臨時的效能量測端點（Next.js App Router）
 *
 * 放到 `src/app/api/diag/route.ts`，部署後打 `/api/diag`，量完刪掉。
 *
 * 為什麼一定要從函式內部量：從瀏覽器只量得到「使用者 → 函式」那一段，
 * 量不到「函式 → 資料庫」。而後者才是 Vercel + Supabase 架構真正的瓶頸所在。
 *
 * 安全考量：
 * - 只回傳毫秒數與機房代號，不回傳任何資料內容
 * - 要登入才看得到（順便把 auth.getUser 一起量了）
 * - 量完就刪，不要留在正式環境
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // ← 換成你專案的 server client 路徑

export async function GET() {
  const marks: Record<string, number> = {};

  const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const t0 = Date.now();
    const result = await fn();
    marks[label] = Date.now() - t0;
    return result;
  };

  const supabase = await time('建立 client', async () => createClient());

  // middleware 每一頁都會做這件事，而它是網路呼叫不是本地解 JWT
  const {
    data: { user },
  } = await time('auth.getUser', () => supabase.auth.getUser());
  if (!user) return NextResponse.json({ error: '要登入' }, { status: 401 });

  // 最小查詢：讀一列。這個數字幾乎純粹是「函式 ↔ 資料庫」的來回時間
  await time('最小查詢（讀一列）', async () =>
    supabase.from('你的任一張表').select('*').limit(1),
  );

  // 再放幾個這個專案實際會用到的查詢，看重的頁面慢在哪
  await time('計數查詢', async () =>
    supabase.from('你的任一張表').select('id', { count: 'exact', head: true }),
  );

  return NextResponse.json({
    region: process.env.VERCEL_REGION ?? '（本機）',
    marks,
  });
}
