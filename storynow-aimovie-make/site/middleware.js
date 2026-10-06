// 私人網站的登入閘門（Vercel Routing Middleware，所有請求都先經過這裡）。
// 密碼只放 Vercel 專案的環境變數 SITE_PASSWORD（本機測試用 site/.env.local，不進 git）。
// 沒設 SITE_PASSWORD 時一律擋住（寧可進不去，也不要變成公開網站）。
export const config = { matcher: ['/((?!login\\.html|login\\.css|favicon\\.svg).*)'] };

const COOKIE = 'site_auth';
const enc = new TextEncoder();

async function sha256(s) {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 兩個等長字串逐字比較（不提早結束，避免用回應時間猜密碼）
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

const token = (pw) => sha256(`${pw}:storynow-site-v1`);
const pass = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
const redirect = (url, extra = {}) => new Response(null, { status: 303, headers: { Location: url, ...extra } });

export default async function middleware(request) {
  const url = new URL(request.url);
  const pw = process.env.SITE_PASSWORD || '';

  if (url.pathname === '/logout') {
    return redirect('/login.html', { 'Set-Cookie': `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` });
  }

  if (url.pathname === '/login' && request.method === 'POST') {
    const form = await request.formData();
    const given = String(form.get('password') || '');
    const next = String(form.get('next') || '/');
    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';
    if (pw && same(await sha256(given), await sha256(pw))) {
      const t = await token(pw);
      return redirect(safeNext, { 'Set-Cookie': `${COOKIE}=${t}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax` });
    }
    return redirect(`/login.html?e=1&next=${encodeURIComponent(safeNext)}`);
  }

  const m = (request.headers.get('cookie') || '').match(/(?:^|;\s*)site_auth=([a-f0-9]{64})/);
  if (pw && m && same(m[1], await token(pw))) return pass();

  return redirect(`/login.html?next=${encodeURIComponent(url.pathname + url.search)}`);
}
