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
  ['範本E_', 'e'], ['範本F_', 'f'], ['範本G_', 'g'], ['範本H_', 'h'], ['範本I_', 'i'], ['範本J_', 'j'], ['範本K_', 'k'], ['範本L_', 'l'], ['資訊科範本1', 'info1'],
];
// README 抓不到「適合／觸發」時用這裡（範本E、資訊科範本1 的 README 格式不同）
const FALLBACK = {
  e: { fit: '一整門課：幾十節風格完全一致的教學影片，再合併成 30 分鐘左右的集；重點是內容正確、字幕與唸法零錯誤', trig: '範本E／教學課程產線／整門課的教學影片' },
  info1: { fit: '研習、座談的現場說明（約 2 分半）＋資訊科宣傳片（60 秒），串成一支現場播放', trig: '資訊科範本1' },
};
// 工作流文件 → 網址
const DOCS = [
  { key: 'skill', file: 'SKILL.md', title: '總覽：skill 怎麼用', desc: '觸發用語、範本流程、十二步流程、硬規則' },
  { key: 'workflow', file: 'references/workflow.md', title: '十二步流程細節', desc: '「做影片」＋資料：理解素材 → 三個創意概念 → 試看 → 分鏡預覽 → 選聲音 → 製作 → 品檢' },
  { key: 'series', file: 'references/series-workflow.md', title: '系列教學影片工作流', desc: '一個科目的整個系列：大綱 → 選範本或系統提案 → 每支 13 步（老師提醒、AI 初稿、四道關卡、上架資料）' },
  { key: 'subjects', file: '科目包/README.md', title: '科目包', desc: '科目專用的教法、念法、專用場景；storyboard 寫 subject 就套用' },
  { key: 'e14', file: 'templates/範本E_教學課程產線/規範/完整工作流程.md', title: '範本E 完整 15 步流程', desc: '一整門課：文稿審查 → 審稿 → 分鏡預覽 → 選聲音 → 配音 → 聽檢 → 探針 → 渲染 → 品檢' },
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

// ---------- 版面（2026-10-09 改版：和本機展示網頁 reel-showcase 同一套樣式與結構） ----------
// 樣式直接用 reel-showcase/assets/展示網頁樣式/site.css（同一個倉庫）：改展示網頁外觀，本機與網路一起變
const BRAND = '皇小米', SITE_NAME = '影片工作室';
const REEL_CSS = path.resolve(SKILL, '..', 'reel-showcase', 'assets', '展示網頁樣式', 'site.css');
fs.writeFileSync(path.join(DIST, 'site.css'), fs.readFileSync(REEL_CSS, 'utf8'));
fs.writeFileSync(path.join(DIST, 'extra.css'), fs.readFileSync(path.join(SITE, 'extra.css'), 'utf8'));
for (const f of ['login.html', 'login.css', 'favicon.svg']) fs.copyFileSync(path.join(SITE, f), path.join(DIST, f));
fs.writeFileSync(path.join(DIST, 'style.css'), fs.readFileSync(path.join(SITE, 'style.css'), 'utf8'));   // 登入頁還在用
const VER = Date.now().toString(36);
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
  + '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">';

// 範本分兩區：有旁白的「範本」、沒有旁白的「廣告」（範本清單.json 的 "kind": "ad"）
const REG = JSON.parse(fs.readFileSync(path.join(SKILL, 'templates', '範本清單.json'), 'utf8')).templates;
for (const t of templates) {
  const r = REG.find((x) => x.dir === t.name) || {};
  t.kind = r.kind === 'ad' ? 'ad' : 'narrated';
  t.engine = r.type === 'standalone' ? '自帶產線' : '共用引擎';
}
// 文件分兩區：工作流與工具、科目包
const TOOLS = [
  { key: 'reel', file: path.resolve(SKILL, '..', 'reel-showcase', 'SKILL.md'), title: '展示網頁（reel-showcase）', desc: '挑版本模式＋系列教學模式（待確認／要修改／確定使用／已上架）、頻道總覽' },
];
for (const t of TOOLS) pageOf.set(path.normalize(t.file), `/w/${t.key}/`);
const SUBJ = fs.readdirSync(path.join(SKILL, '科目包'), { withFileTypes: true }).filter((d) => d.isDirectory())
  .map((d) => ({ key: 's-' + crypto.createHash('md5').update(d.name).digest('hex').slice(0, 6), name: d.name, file: path.join(SKILL, '科目包', d.name, 'README.md') }))
  .filter((s) => fs.existsSync(s.file));
for (const s of SUBJ) pageOf.set(path.normalize(s.file), `/w/${s.key}/`);
// 作品集：site/作品集.json（本機 sync_works.py 從各科展示紀錄統計後推上來；只有文字＋一張封面）
const WORKS = fs.existsSync(path.join(SITE, '作品集.json')) ? JSON.parse(fs.readFileSync(path.join(SITE, '作品集.json'), 'utf8')) : [];
if (fs.existsSync(path.join(SITE, 'works'))) { mk(path.join(DIST, 'works')); for (const f of fs.readdirSync(path.join(SITE, 'works'))) fs.copyFileSync(path.join(SITE, 'works', f), path.join(DIST, 'works', f)); }

const narrated = templates.filter((t) => t.kind === 'narrated'), ads = templates.filter((t) => t.kind === 'ad');
const FLOWS = [...DOCS.map((d) => ({ ...d, f: path.join(SKILL, d.file) })), ...TOOLS.map((t) => ({ ...t, f: t.file }))].filter((d) => fs.existsSync(d.f));
const SECTIONS = [
  { key: 'templates', title: '範本', en: 'Narrated Templates', desc: '有旁白與字幕的範本：教學、說明、招生。每張卡播 30 秒示範片；在 Claude Code 說出觸發詞就照那個範本做。', n: narrated.length, unit: '個' },
  { key: 'ads', title: '廣告', en: 'Ads & Reels', desc: '沒有旁白、靠畫面與音樂節奏的範本：廣告短片、社群開場。從本機 REEL 的「純廣告」收進 skill 後出現在這裡。', n: ads.length, unit: '個' },
  { key: 'workflows', title: '工作流與工具', en: 'Workflows & Tools', desc: '十二步流程、系列教學影片工作流、品檢工具、展示網頁……做影片時照這些走。', n: FLOWS.length, unit: '份' },
  { key: 'subjects', title: '科目包', en: 'Subject Packs', desc: '每一科專用的教法、念法、專業符號；storyboard 寫 subject 就套用。', n: SUBJ.length, unit: '科' },
  { key: 'works', title: '作品集', en: 'Works', desc: '已經做出來的系列作品統計：每一科多少節、已成片、已上架。只放文字與封面，影片在 YouTube。', n: WORKS.length, unit: '個' },
];
const posters = templates.filter((t) => t.poster).map((t) => `/media/${t.slug}.jpg`);

const head = (title) => `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}｜${BRAND}・${SITE_NAME}</title><link rel="icon" href="/favicon.svg">${FONTS}
<link rel="stylesheet" href="/site.css?v=${VER}"><link rel="stylesheet" href="/extra.css?v=${VER}"><meta name="robots" content="noindex,nofollow"></head><body>`;
const topbar = (cur) => `<header class="top"><a class="brand" href="/"><b>${BRAND}</b><span>${SITE_NAME}</span></a><nav>${
  SECTIONS.map((s) => `<a class="${cur === s.key ? 'on' : ''}" href="/${s.key}/"><span>${s.title}</span><i>${s.n}</i></a>`).join('')}</nav>
  <a class="picks-btn" href="/logout">登出</a></header>`;
const foot = `<footer class="foot"><span>${BRAND} · ${SITE_NAME}</span><span>內容直接來自 GitHub 上的 skill 倉庫；每次推送自動更新。</span></footer>
<script>${fs.readFileSync(path.join(SITE, 'site-public.js'), 'utf8')}</script></body></html>`;
const html = (title, cur, body) => head(title) + topbar(cur) + body + foot;

function tcard(t) {
  return `<article class="card" data-tags="${esc(t.engine)} ${esc(t.label)}">
  <a class="thumb" href="/t/${t.slug}/">${t.poster ? `<img loading="lazy" src="/media/${t.slug}.jpg" alt="">` : '<div class="emptystack">還沒有示範片</div>'}
    ${t.demo ? `<video muted loop playsinline preload="none" data-src="/media/${t.slug}.mp4"></video><span class="dur" data-dur="/media/${t.slug}.mp4"></span>` : ''}</a>
  <div class="cbody"><div class="kicker">${esc(t.label)} · ${esc(t.engine)}</div><h3><a href="/t/${t.slug}/">${esc(t.title)}</a></h3>
    ${t.fit ? `<p>${esc(t.fit)}</p>` : ''}${t.trig ? `<div class="cfoot"><span class="qa ok">觸發詞</span><span>${esc(t.trig)}</span></div>` : ''}
    <div class="cact">${t.prompt ? `<a class="ghost" href="/t/${t.slug}/prompt/">完整版提示詞</a>` : ''}<a class="ghost" href="/t/${t.slug}/">看說明 →</a></div></div></article>`;
}
const dcard = (href, title, desc, kick) => `<a class="doccard" href="${href}"><div class="kicker">${esc(kick)}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p><span class="go">打開 →</span></a>`;
function wcard(w) {
  return `<article class="card work"><div class="thumb">${w.封面 ? `<img loading="lazy" src="/works/${esc(w.封面)}" alt="">` : '<div class="emptystack">沒有封面</div>'}</div>
  <div class="cbody"><div class="kicker">${esc(w.類型 || '系列教學')} · ${esc(w.範本 || '')}</div><h3>${esc(w.名稱)}</h3><p>${esc(w.說明 || '')}</p>
  <div class="nums"><span><b>${w.已成片 ?? 0}</b>/ ${w.全部 ?? 0} 節已成片</span><span><b>${w.已上架 ?? 0}</b>已上架</span>${w.章數 ? `<span><b>${w.章數}</b>章</span>` : ''}</div>
  ${w.內容 ? `<ul class="wlist">${w.內容.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
  ${w.播放清單 ? `<div class="cfoot"><span class="qa ok">播放清單</span><span>${esc(w.播放清單)}</span></div>` : ''}<div class="cfoot"><span>更新 ${esc(w.更新 || '')}</span></div></div></article>`;
}
const phead = (s, extra = '') => `<section class="phead wrap"><div class="en">${s.en}</div><h1>${s.title}<small>${s.n} ${s.unit}</small></h1><p>${esc(s.desc)}</p>${extra}</section>`;
const tools = (chips) => `<div class="tools"><div class="chips"><button class="chip on" data-filter="">全部</button>${chips.map((c) => `<button class="chip" data-filter="${esc(c)}">${esc(c)}</button>`).join('')}</div><input type="search" placeholder="搜尋名稱、說明…" data-search></div>`;

// 範本單支頁（大播放器＋README）
for (const [i, t] of templates.entries()) {
  const out = path.join(DIST, 't', t.slug); mk(out);
  if (t.demo) { mk(path.join(DIST, 'media')); fs.copyFileSync(t.demo, path.join(DIST, 'media', `${t.slug}.mp4`)); }
  if (t.poster) { mk(path.join(DIST, 'media')); fs.copyFileSync(t.poster, path.join(DIST, 'media', `${t.slug}.jpg`)); }
  const list = t.kind === 'ad' ? ads : narrated, j = list.indexOf(t), prv = list[j - 1], nxt = list[j + 1];
  const sec = t.kind === 'ad' ? 'ads' : 'templates';
  const body = `<main class="wrap detail"><div class="crumb"><a href="/${sec}/">← ${t.kind === 'ad' ? '廣告' : '範本'}</a><span>${j + 1} / ${list.length}</span></div>
  <div class="theater">${t.demo ? `<video controls playsinline preload="metadata" ${t.poster ? `poster="/media/${t.slug}.jpg"` : ''} src="/media/${t.slug}.mp4"></video>` : '<div class="missing">還沒有示範片</div>'}</div>
  <div class="dgrid"><div class="dmain"><div class="kicker">${esc(t.label)} · ${esc(t.engine)}</div><h1>${esc(t.title)}</h1>${t.fit ? `<p class="lead">${esc(t.fit)}</p>` : ''}
    <div class="acts">${t.prompt ? `<a class="ghost" href="/t/${t.slug}/prompt/">完整版提示詞</a>` : ''}<a class="ghost" href="${GH}templates/${encodeURI(t.name)}" target="_blank">在 GitHub 看檔案 ↗</a></div>
    <article class="md">${renderMd(t.readme, out)}</article></div>
  <aside class="dside"><dl><dt>代號</dt><dd>${esc(t.label)}</dd><dt>類型</dt><dd>${t.kind === 'ad' ? '廣告（無旁白）' : '有旁白'}</dd><dt>引擎</dt><dd>${esc(t.engine)}</dd>
    ${t.trig ? `<dt>觸發詞</dt><dd>${esc(t.trig)}</dd>` : ''}${t.demo ? `<dt>示範片長度</dt><dd data-dur="/media/${t.slug}.mp4"></dd>` : ''}</dl></aside></div>
  <nav class="pnav">${prv ? `<a class="pn" data-key="prev" href="/t/${prv.slug}/"><span>← 上一個</span><b>${esc(prv.label)} ${esc(prv.title)}</b></a>` : '<span></span>'}${nxt ? `<a class="pn r" data-key="next" href="/t/${nxt.slug}/"><span>下一個 →</span><b>${esc(nxt.label)} ${esc(nxt.title)}</b></a>` : '<span></span>'}</nav></main>`;
  fs.writeFileSync(path.join(out, 'index.html'), html(`${t.label} ${t.title}`, sec, body));
}
// 完整版提示詞頁
for (const t of templates.filter((x) => x.prompt)) {
  const out = path.join(DIST, 't', t.slug, 'prompt'); mk(out);
  fs.writeFileSync(path.join(out, 'index.html'), html(`${t.label} 完整版提示詞`, t.kind === 'ad' ? 'ads' : 'templates',
    `<main class="wrap detail"><div class="crumb"><a href="/t/${t.slug}/">← ${esc(t.label)} ${esc(t.title)}</a><span>完整版提示詞</span></div><article class="md">${renderMd(t.prompt, out)}</article></main>`));
}
// 文件頁（工作流與工具、科目包）
for (const d of [...FLOWS.map((x) => ({ ...x, sec: 'workflows' })), ...SUBJ.map((x) => ({ key: x.key, f: x.file, title: x.name, sec: 'subjects' }))]) {
  const out = path.join(DIST, 'w', d.key); mk(out);
  fs.writeFileSync(path.join(out, 'index.html'), html(d.title, d.sec,
    `<main class="wrap detail"><div class="crumb"><a href="/${d.sec}/">← ${d.sec === 'subjects' ? '科目包' : '工作流與工具'}</a><span>${esc(d.title)}</span></div><article class="md">${renderMd(d.f, out)}</article></main>`));
}
// 分區頁
const secPage = (s, inner) => { mk(path.join(DIST, s.key)); fs.writeFileSync(path.join(DIST, s.key, 'index.html'), html(s.title, s.key, inner)); };
const [S1, S2, S3, S4, S5] = SECTIONS;
secPage(S1, phead(S1, tools(['共用引擎', '自帶產線'])) + `<main class="wrap"><div class="grid" data-grid>${narrated.map(tcard).join('')}</div><p class="empty" data-empty hidden>沒有符合的範本</p></main>`);
secPage(S2, phead(S2) + `<main class="wrap"><div class="grid" data-grid>${ads.map(tcard).join('') || '<p class="empty">還沒有收進 skill 的廣告範本。本機 REEL「純廣告」區按「＋收進 skill」，Claude 收進後會出現在這裡。</p>'}</div></main>`);
secPage(S3, phead(S3) + `<main class="wrap"><div class="docgrid">${FLOWS.map((d) => dcard(`/w/${d.key}/`, d.title, d.desc, TOOLS.includes(d) ? '工具' : '工作流')).join('')}</div></main>`);
secPage(S4, phead(S4) + `<main class="wrap"><div class="docgrid">${SUBJ.map((x) => dcard(`/w/${x.key}/`, x.name, '教法、念法、專用場景與專業符號', '科目包')).join('')}</div></main>`);
secPage(S5, phead(S5) + `<main class="wrap"><div class="grid">${WORKS.map(wcard).join('') || '<p class="empty">還沒有作品</p>'}</div></main>`);
// 首頁
const mosaic = (posters.length ? Array.from({ length: 18 }, (_, i) => posters[i % posters.length]) : []).map((p) => `<img src="${p}" alt="">`).join('');
const stackOf = { templates: narrated.filter((t) => t.poster).slice(0, 3).map((t) => `/media/${t.slug}.jpg`), ads: ads.filter((t) => t.poster).slice(0, 3).map((t) => `/media/${t.slug}.jpg`),
  works: WORKS.filter((w) => w.封面).slice(0, 3).map((w) => `/works/${w.封面}`) };
const tiles = SECTIONS.map((s, i) => `<a class="tile" href="/${s.key}/"><div class="tnum">0${i + 1}</div><div class="ttext"><div class="en">${s.en}</div><h2>${s.title}</h2><p>${esc(s.desc)}</p>
  <div class="tstat"><b>${s.n}</b> ${s.unit}</div><span class="go">進入 →</span></div><div class="stack">${(stackOf[s.key] || []).map((p, k) => `<img style="--i:${k}" src="${p}" alt="">`).join('') || '<div class="emptystack"></div>'}</div></a>`).join('');
fs.writeFileSync(path.join(DIST, 'index.html'), html('首頁', '', `<section class="hero"><div class="mosaic">${mosaic}</div><div class="veil"></div><div class="htext"><div class="en">${BRAND} · VIDEO STUDIO</div>
  <h1>丟進文本，<br>就出一支影片。</h1><p>每個範本都有 30 秒左右的示範片；挑好範本，在 Claude Code 說出觸發詞就照那個範本做。工作流、工具、科目包與作品統計都在這裡。</p>
  <div class="hstat"><div><b>${narrated.length}</b><span>個範本</span></div><div><b>${ads.length}</b><span>個廣告</span></div><div><b>${WORKS.length}</b><span>個作品</span></div></div></div></section>
  <main class="wrap"><div class="tiles five">${tiles}</div><div class="shead"><h2>範本</h2><span class="en">TEMPLATES</span></div><div class="grid">${narrated.slice(0, 6).map(tcard).join('')}</div></main>`));

console.log(`網站 → ${DIST}：範本 ${narrated.length}、廣告 ${ads.length}、工作流與工具 ${FLOWS.length}、科目包 ${SUBJ.length}、作品 ${WORKS.length}`);
