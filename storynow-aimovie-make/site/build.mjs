// 範本與工作流挑選網站（2026-10-06）：直接讀 skill 裡的 README、流程文件、示範片、截圖，產生靜態網頁到 dist/。
// 改了範本或流程 → push → Vercel 重新部署，網站就跟著更新（不用另外維護一份）。
// 本機預覽：cd site && npm install && npm run build && npx serve dist（登入閘門要部署到 Vercel 才有作用）
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Marked } from 'marked';

const SITE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SKILL = path.resolve(SITE, '..');
const DIST = path.join(SITE, 'dist');
const GH = 'https://github.com/storynow01-arch/skill/blob/main/storynow-aimovie-make/';

// 範本：目錄前綴 → 網址代號
const TEMPLATES = [
  ['範本A_', 'a'], ['範本B_', 'b'], ['範本C_', 'c'], ['範本D_', 'd'],
  ['範本E_', 'e'], ['範本F_', 'f'], ['範本G_', 'g'], ['資訊科範本1', 'info1'],
];
// README 抓不到「適合／觸發」時用這裡（範本E、資訊科範本1 的 README 格式不同）
const FALLBACK = {
  e: { fit: '一整門課：幾十節風格完全一致的教學影片，再合併成 30 分鐘左右的集；重點是內容正確、字幕與唸法零錯誤', trig: '範本E／教學課程產線／整門課的教學影片' },
  info1: { fit: '研習、座談的現場說明（約 2 分半）＋資訊科宣傳片（60 秒），串成一支現場播放', trig: '資訊科範本1' },
};
// 工作流文件 → 網址
const DOCS = [
  { key: 'skill', file: 'SKILL.md', title: '總覽：skill 怎麼用', desc: '觸發用語、範本流程、十一步流程、硬規則' },
  { key: 'workflow', file: 'references/workflow.md', title: '十一步流程細節', desc: '「做影片」＋資料：理解素材 → 三個創意概念 → 試看 → 製作 → 品檢' },
  { key: 'e14', file: 'templates/範本E_教學課程產線/規範/完整工作流程.md', title: '範本E 完整 14 步流程', desc: '一整門課：文稿審查 → 分鏡預覽 → 配音 → 聽檢 → 探針 → 渲染 → 品檢' },
  { key: 'scenes', file: 'templates/範本風格_場景語彙.md', title: '範本 A～D 共用場景語彙', desc: '9 種場景與欄位，同一份分鏡換範本就能重算' },
  { key: 'qa', file: 'final_qa/README.md', title: '品檢工具', desc: '最終品檢、文稿檢查、逐字審稿、分鏡預覽、交叉聽、停頓檢查' },
];

const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const mk = (p) => fs.mkdirSync(p, { recursive: true });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rel = (from, to) => path.relative(from, to).split(path.sep).join('/');
const MEDIA = /\.(jpe?g|png|gif|svg|webp|mp4)$/i;

// 清空 dist（只刪裡面的東西：本機預覽伺服器可能正開著這個資料夾）
mk(DIST);
for (const x of fs.readdirSync(DIST)) rm(path.join(DIST, x));

// ---------- 範本資料 ----------
const tdirs = fs.readdirSync(path.join(SKILL, 'templates'), { withFileTypes: true }).filter((d) => d.isDirectory());
const templates = [];
for (const [prefix, slug] of TEMPLATES) {
  const d = tdirs.find((x) => x.name.startsWith(prefix));
  if (!d) continue;
  const dir = path.join(SKILL, 'templates', d.name);
  const readme = path.join(dir, 'README.md');
  if (!fs.existsSync(readme)) continue;
  const md = fs.readFileSync(readme, 'utf8');
  const h1 = (md.match(/^#\s+(.+)$/m) || [, d.name])[1];
  const fit = (md.match(/^##\s*適合[^\n]*\n+([\s\S]*?)(?=\n##\s|$)/m) || [, ''])[1]
    .split('\n').map((l) => l.replace(/^[-*>]\s?/, '').replace(/\*\*/g, '').trim()).filter((l) => l && !l.startsWith('|'))[0]
    || FALLBACK[slug]?.fit || '';
  const trigLine = (md.match(/觸發[^：:]*[：:]\s*([^\n]+)/) || [, ''])[1].replace(/\*\*/g, '');
  const trig = (trigLine.match(/「([^」]+)」/) || [, ''])[1] || FALLBACK[slug]?.trig || '';
  const demo = path.join(dir, '示範', '示範.mp4');
  const poster = path.join(dir, '示範', 'poster.jpg');
  templates.push({ slug, dir, name: d.name, title: h1.replace(/^[^：:]*[：:]\s*/, '') || h1, label: d.name.split('_')[0],
                   fit, trig, demo: fs.existsSync(demo) ? demo : null, poster: fs.existsSync(poster) ? poster : null, readme,
                   prompt: fs.readdirSync(dir).filter((x) => /^提示詞_.*完整版\.md$/.test(x)).map((x) => path.join(dir, x))[0] || null });
}

// 示範片只放一份在 /media/，README 裡的連結改指過去
const demoUrl = new Map(templates.filter((t) => t.demo).map((t) => [path.normalize(t.demo), `/media/${t.slug}.mp4`]));
// 頁面對照表：哪些 .md 有網頁（連結會改指過去）
const pageOf = new Map();
for (const t of templates) {
  pageOf.set(path.normalize(t.readme), `/t/${t.slug}/`);
  if (t.prompt) pageOf.set(path.normalize(t.prompt), `/t/${t.slug}/prompt/`);
}
for (const doc of DOCS) pageOf.set(path.normalize(path.join(SKILL, doc.file)), `/w/${doc.key}/`);

// ---------- markdown → html（連結與圖片改寫） ----------
function renderMd(mdFile, outDir) {
  const base = path.dirname(mdFile);
  const md = new Marked({            // 每份文件一個新的 Marked，連結改寫規則才不會互相疊加
    walkTokens(tok) {
      if (tok.type !== 'link' && tok.type !== 'image') return;
      const href = tok.href || '';
      if (/^(https?:|mailto:|#)/.test(href)) return;
      const [p, hash] = decodeURI(href).split('#');
      const abs = path.normalize(path.resolve(base, p));
      if (demoUrl.has(abs)) { tok.href = demoUrl.get(abs); return; }
      if (MEDIA.test(abs) && fs.existsSync(abs)) {                  // 圖片／影片：複製到這一頁的資料夾
        const name = crypto.createHash('md5').update(abs).digest('hex').slice(0, 10) + path.extname(abs).toLowerCase();
        mk(path.join(outDir, 'm'));
        fs.copyFileSync(abs, path.join(outDir, 'm', name));
        tok.href = `m/${name}`;
      } else if (pageOf.has(abs)) {                                  // 有網頁的文件
        tok.href = pageOf.get(abs) + (hash ? `#${hash}` : '');
      } else if (abs.startsWith(SKILL)) {                            // 其他檔案：連到 GitHub
        tok.href = GH + encodeURI(rel(SKILL, abs)) + (hash ? `#${hash}` : '');
      }
    },
  });
  return md.parse(fs.readFileSync(mdFile, 'utf8'));
}

// ---------- 版面 ----------
const CSS = fs.readFileSync(path.join(SITE, 'style.css'), 'utf8');
fs.writeFileSync(path.join(DIST, 'style.css'), CSS);
for (const f of ['login.html', 'login.css', 'favicon.svg']) fs.copyFileSync(path.join(SITE, f), path.join(DIST, f));

const page = (title, body, depth = 0) => `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/style.css"><meta name="robots" content="noindex,nofollow"></head>
<body><header class="top"><a class="brand" href="/">影片工作流</a><nav><a href="/#templates">範本</a><a href="/#workflows">工作流</a>
<a href="/logout" class="out">登出</a></nav></header><main>${body}</main>
<footer>內容直接來自 skill 倉庫（storynow-aimovie-make），每次推送自動更新</footer></body></html>`;

// 範本詳細頁
for (const t of templates) {
  const out = path.join(DIST, 't', t.slug); mk(out);
  let video = '';
  if (t.demo) {
    mk(path.join(DIST, 'media'));
    fs.copyFileSync(t.demo, path.join(DIST, 'media', `${t.slug}.mp4`));
    if (t.poster) fs.copyFileSync(t.poster, path.join(DIST, 'media', `${t.slug}.jpg`));
    video = `<video class="hero" controls playsinline preload="metadata" ${t.poster ? `poster="/media/${t.slug}.jpg"` : ''} src="/media/${t.slug}.mp4"></video>`;
  }
  const html = renderMd(t.readme, out);
  fs.writeFileSync(path.join(out, 'index.html'), page(`${t.label} ${t.title}`,
    `<p class="crumb"><a href="/">首頁</a> › ${esc(t.label)}</p>${video}
     <p class="gh"><a href="${GH}templates/${encodeURI(t.name)}">在 GitHub 看這個範本的檔案 ↗</a></p><article class="md">${html}</article>`));
}

// 完整版提示詞頁（沒有 skill 的地方貼這份）
for (const t of templates.filter((x) => x.prompt)) {
  const out = path.join(DIST, 't', t.slug, 'prompt'); mk(out);
  fs.writeFileSync(path.join(out, 'index.html'), page(`${t.label} 完整版提示詞`,
    `<p class="crumb"><a href="/">首頁</a> › <a href="/t/${t.slug}/">${esc(t.label)}</a> › 完整版提示詞</p><article class="md">${renderMd(t.prompt, out)}</article>`));
}

// 工作流文件頁
for (const doc of DOCS) {
  const f = path.join(SKILL, doc.file);
  if (!fs.existsSync(f)) continue;
  const out = path.join(DIST, 'w', doc.key); mk(out);
  fs.writeFileSync(path.join(out, 'index.html'), page(doc.title,
    `<p class="crumb"><a href="/">首頁</a> › ${esc(doc.title)}</p><article class="md">${renderMd(f, out)}</article>`));
}

// 首頁
const cards = templates.map((t) => `
  <article class="card">
    ${t.demo ? `<video controls playsinline preload="none" ${t.poster ? `poster="/media/${t.slug}.jpg"` : ''} src="/media/${t.slug}.mp4"></video>`
              : '<div class="nodemo">還沒有示範片</div>'}
    <div class="body"><span class="tag">${esc(t.label)}</span><h3>${esc(t.title)}</h3>
      ${t.fit ? `<p>${esc(t.fit)}</p>` : ''}${t.trig ? `<p class="trig">在 Claude Code 說：${esc(t.trig)}</p>` : ''}
      <div class="links"><a class="more" href="/t/${t.slug}/">看說明、截圖 →</a>${t.prompt ? `<a class="more" href="/t/${t.slug}/prompt/">完整版提示詞 →</a>` : ''}</div></div>
  </article>`).join('');
const flows = DOCS.map((d) => `<a class="flow" href="/w/${d.key}/"><b>${esc(d.title)}</b><span>${esc(d.desc)}</span></a>`).join('');
fs.writeFileSync(path.join(DIST, 'index.html'), page('影片工作流與範本', `
  <section class="intro"><h1>影片工作流與範本</h1>
    <p>每個範本都有 10 秒左右的示範片（主題「測試範本」）。挑好範本後，在 Claude Code 說出卡片上的觸發詞（任一個）就會照那個範本做；點「看說明」有完整版提示詞、截圖與流程。</p></section>
  <section id="templates"><h2>範本</h2><div class="grid">${cards}</div></section>
  <section id="workflows"><h2>工作流</h2><div class="flows">${flows}</div></section>`));

console.log(`網站 → ${DIST}：範本 ${templates.length} 個（有示範片 ${templates.filter((t) => t.demo).length}），文件 ${DOCS.length} 份`);
