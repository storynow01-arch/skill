// 逐格渲染器（範本F／G 共用）：場景頁提供 window.ready（Promise）、window.DURATION（秒）、window.seek(t)（async 可）
// 每一格畫面只由 t 決定 → Playwright 截圖 → ffmpeg 編碼
//
// 抽格檢查：node shared/render.mjs <場景資料夾> --stills 0,3.5,10 [--out 抽格]
// 整支渲染：node shared/render.mjs <場景資料夾> --video out/video.mp4 [--workers 3] [--from 0 --to 10]
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

function findChrome() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
  for (const d of dirs) { const p = path.join(base, d, 'chrome-win64', 'chrome.exe'); if (fs.existsSync(p)) return p; }
}
const CHROME = findChrome();
const W = 1920, H = 1080, FPS = 30;

const args = process.argv.slice(2);
const sceneDir = path.resolve(args[0]);
const ROOT = sceneDir;
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

async function openPage(browser, url) {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.ready !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => window.ready);
  return page;
}

const shot = (page, t) => page.evaluate(t => window.seek(t), t).then(() => page.screenshot({ type: 'jpeg', quality: 95 }));

const srv = await serve();
const url = `http://127.0.0.1:${srv.address().port}/scene.html`;
const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

try {
  if (opt('stills')) {
    const out = path.resolve(sceneDir, opt('out', '抽格'));
    fs.mkdirSync(out, { recursive: true });
    const page = await openPage(browser, url);
    const ts = opt('stills').split(',').map(Number);
    const files = [];
    for (const t of ts) {
      const f = path.join(out, `t${t.toFixed(2).padStart(6, '0')}.jpg`);
      fs.writeFileSync(f, await shot(page, t));
      files.push(f);
    }
    // 拼縮圖總覽（每列 4 張）
    const cols = Math.min(4, files.length), rows = Math.ceil(files.length / cols);
    const inputs = files.flatMap(f => ['-i', f]);
    const pads = files.map((_, i) => `[${i}]scale=480:270,drawtext=fontfile=arial.ttf:text='${ts[i].toFixed(2)}s':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(';');
    const blanks = rows * cols - files.length;
    let layout = files.map((_, i) => `${(i % cols) * 480}_${Math.floor(i / cols) * 270}`).join('|');
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex',
      `${pads};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`,
      '-frames:v', '1', path.join(out, '_總覽.jpg')], { stdio: 'inherit', cwd: 'C:/Windows/Fonts' });
    if (files.length === 1) fs.copyFileSync(files[0], path.join(out, '_總覽.jpg'));
    console.log('抽格完成', out, blanks ? '' : '');
  } else {
    const outFile = path.resolve(sceneDir, opt('video', 'out/video.mp4'));
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    const probe = await openPage(browser, url);
    const dur = await probe.evaluate(() => window.DURATION);
    await probe.close();
    const from = Math.round(Number(opt('from', 0)) * FPS);
    const to = Math.round(Number(opt('to', dur)) * FPS);
    const workers = Number(opt('workers', 3));
    const per = Math.ceil((to - from) / workers);
    const t0 = Date.now();
    let done = 0;
    const segs = await Promise.all([...Array(workers)].map(async (_, w) => {
      const a = from + w * per, b = Math.min(to, a + per);
      const seg = outFile.replace(/\.mp4$/, `.seg${w}.mp4`);
      if (a >= b) return null;
      const page = await openPage(browser, url);
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let f = a; f < b; f++) {
        const buf = await shot(page, f / FPS);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        if (++done % 60 === 0) process.stdout.write(`\r${done}/${to - from} 格  ${((Date.now() - t0) / done).toFixed(0)} ms/格   `);
      }
      ff.stdin.end();
      await new Promise(r => ff.on('close', r));
      await page.close();
      return seg;
    }));
    const list = outFile + '.txt';
    fs.writeFileSync(list, segs.filter(Boolean).map(s => `file '${s.replace(/\\/g, '/')}'`).join('\n'));
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', outFile], { stdio: 'inherit' });
    segs.filter(Boolean).forEach(s => fs.unlinkSync(s)); fs.unlinkSync(list);
    console.log(`\n渲染完成 ${outFile}（${to - from} 格，${((Date.now() - t0) / 1000).toFixed(0)} 秒）`);
  }
} finally {
  await browser.close();
  srv.close();
}
