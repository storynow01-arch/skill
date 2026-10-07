/* 螢幕模擬元件庫（範本H，2026-10-07）：Windows 11 桌面、Chrome、Windows 終端機、iPhone、游標、鏡頭、重點泡泡。
   給文本就能演出「像螢幕錄影」的操作：所有狀態都由 actions（build.py 已換算成場景內格數 f）決定，同一格永遠畫出同一個畫面。
   座標一律是「螢幕座標」（1920×1080，鏡頭放大前）；元件的位置寫死在這裡，鏡頭與泡泡才能精準指到同一個東西。
   介面字型用 Windows 11 原生字（Segoe UI Variable、微軟正黑體 UI、Cascadia Mono），在 Windows 上算圖最像真的。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';

export const W = 1920, H = 1080, TASKBAR = 60;
export const UI = '"Segoe UI Variable Text", "Segoe UI", "Microsoft JhengHei UI", "Noto Sans TC", sans-serif';
export const MONO = '"Cascadia Mono", Consolas, "Microsoft JhengHei UI", monospace';
const ease = Easing.bezier(0.65, 0, 0.35, 1);
export const seg = (lf: number, a: number, b: number) =>
  interpolate(lf, [a, Math.max(a + 0.001, b)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});
export const fadeIn = (lf: number, a: number, d = 8) => interpolate(lf, [a, a + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Act = {do: string; f: number; [k: string]: any};
export type Rect = {x: number; y: number; w: number; h: number};
export type TaskBarActive = string[];

// ───────────── 版面常數（目標點） ─────────────
export const OMNI: Rect = {x: 190, y: 64, w: 1560, h: 44};
export const TAB: Rect = {x: 12, y: 10, w: 300, h: 46};
export const STATUS: Rect = {x: 0, y: H - TASKBAR - 36, w: 260, h: 36};
export const TERM: Rect = {x: 330, y: 170, w: 1260, h: 720};
export const TERM_TEXT = {x: TERM.x + 18, y: TERM.y + 46 + 14, lineH: 34, charW: 13.2, rows: 19};
export const TASK_ICONS: Record<string, number> = {start: 818, search: 872, files: 926, browser: 980, edge: 1034, terminal: 1088};
export const PAGE_TOP = 117;
export const PHONE: Rect = {x: 762, y: 46, w: 396, h: 850};   // 底部留給字幕（y>930）

// ───────────── 狀態：依動作推出這一格的畫面 ─────────────
const done = (acts: Act[], lf: number, pred: (a: Act) => boolean) => acts.filter((a) => a.f <= lf && pred(a));
const lastOf = (acts: Act[], lf: number, pred: (a: Act) => boolean) => {
  const xs = done(acts, lf, pred);
  return xs.length ? xs[xs.length - 1] : undefined;
};
export const typedText = (a: Act, lf: number) => String(a.typed ?? '').slice(0, (a.keys as number[] ?? []).filter((k) => k <= lf).length);

export type BrowserInit = {tab?: string; url?: string; page?: Page};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Page = string | {title?: string; site?: string; blocks?: any[]};

export const browserState = (acts: Act[], lf: number, init: BrowserInit = {}) => {
  const B = acts.filter((a) => a.app === 'browser' || ['load'].includes(a.do) || (a.do === 'click' && a.to === 'omnibox'));
  const lastType = lastOf(B, lf, (a) => a.do === 'type' && a.app === 'browser');
  const lastEnter = lastOf(B, lf, (a) => a.do === 'enter' && a.app === 'browser');
  const lastLoad = lastOf(B, lf, (a) => a.do === 'load');
  const clickedOmni = lastOf(B, lf, (a) => a.do === 'click' && a.to === 'omnibox');
  const loading = !!lastEnter && (!lastLoad || lastLoad.f < lastEnter.f);
  const navUrl = lastEnter ? (lastType ? String(lastType.typed) : init.url ?? '') : init.url ?? '';
  const editing = !loading && (!!clickedOmni || !!lastType) && (!lastLoad || Math.max(clickedOmni?.f ?? -1, lastType?.f ?? -1) > lastLoad.f);
  const url = editing ? (lastType && lastType.f >= (clickedOmni?.f ?? -1) ? typedText(lastType, lf) : '') : lastLoad ? String(lastLoad.url ?? navUrl) : init.url ?? '';
  let status = '';
  if (loading && lastEnter) {
    const st: string[] = lastEnter.status ?? ['正在解析主機...'];
    const nextLoad = acts.find((a) => a.do === 'load' && a.f > lastEnter.f);
    const span = (nextLoad ? nextLoad.f : lastEnter.f + 90) - lastEnter.f;
    status = st[Math.min(st.length - 1, Math.floor(((lf - lastEnter.f) / Math.max(1, span)) * st.length))] ?? '';
  }
  const page: Page = lastLoad ? lastLoad.page : init.page ?? 'newtab';
  const tab = loading ? navUrl : lastLoad ? String(lastLoad.title ?? lastLoad.url ?? '') : init.tab ?? '新分頁';
  return {editing, url, loading, status, page, tab, loadedAt: lastLoad?.f ?? -99, caretOn: editing && Math.floor(lf / 15) % 2 === 0};
};

export const TERM_HEAD = {
  powershell: ['Windows PowerShell', '著作權所有，並保留一切權利。Microsoft Corporation。', '', '安裝最新的 PowerShell 以取得新功能和改進功能！https://aka.ms/PSWindows', ''],
  cmd: ['Microsoft Windows [版本 10.0.22631.4317]', '(c) Microsoft Corporation. 著作權所有，並保留一切權利。', ''],
};
export type TermInit = {shell?: 'powershell' | 'cmd'; open?: boolean; user?: string; history?: string[]};
export const promptOf = (init: TermInit) => (init.shell === 'cmd' ? `C:\\Users\\${init.user ?? 'student'}>` : `PS C:\\Users\\${init.user ?? 'student'}> `);

/** 終端機這一格的所有文字行（含指令與輸出），回傳 {lines, cmdIdx：每行是不是指令行} */
export const termLines = (acts: Act[], lf: number, init: TermInit = {}) => {
  const prompt = promptOf(init);
  const lines: {text: string; kind: 'head' | 'cmd' | 'out'; cmd?: string}[] = [];
  (TERM_HEAD[init.shell ?? 'powershell']).forEach((t) => lines.push({text: t, kind: 'head'}));
  (init.history ?? []).forEach((t) => lines.push({text: t, kind: 'out'}));
  const T = acts.filter((a) => a.app === 'terminal' && (a.do === 'type' || a.do === 'enter'));
  let cur = '';
  let waiting = true;
  for (const a of T) {
    if (a.f > lf) break;
    if (a.do === 'type') { cur = typedText(a, lf); waiting = true; }
    if (a.do === 'enter') {
      lines.push({text: prompt + cur, kind: 'cmd', cmd: cur});
      const out: string[] = a.output ?? [];
      const n = Math.max(0, Math.min(out.length, Math.floor((lf - (a.outF ?? a.f)) / 2) + 1));
      out.slice(0, n).forEach((t) => lines.push({text: t, kind: 'out'}));
      cur = '';
      waiting = n >= out.length;
      if (!waiting) return {lines, prompt, cur: '', showPrompt: false};
    }
  }
  return {lines, prompt, cur, showPrompt: waiting};
};

/** 找某段文字在終端機的位置（給 highlight／zoom／callout 用） */
export const termFind = (acts: Act[], lf: number, init: TermInit, match: string): Rect | null => {
  const {lines} = termLines(acts, Number.MAX_SAFE_INTEGER, init);
  const shown = termLines(acts, lf, init).lines.length + 1;
  const off = Math.max(0, shown - TERM_TEXT.rows);
  for (let i = lines.length - 1; i >= 0; i--) {
    const k = lines[i].text.indexOf(match);
    if (k >= 0) {
      return {x: TERM_TEXT.x + termPx(lines[i].text.slice(0, k)), y: TERM_TEXT.y + (i - off) * TERM_TEXT.lineH, w: termPx(match), h: TERM_TEXT.lineH};
    }
  }
  return null;
};
/** 終端機裡一段字的實際寬度（px）：英數用 Cascadia Mono 22px＝13.2px；中文退回微軟正黑體＝22px（不是 2 格的 26.4px，
    2026-10-07 示範片抓到：前面有 7 個中文字時螢光筆往右偏一個字） */
export const termPx = (s: string) => Array.from(s).reduce((n, ch) => n + (/[⺀-￿]/.test(ch) ? 22 : TERM_TEXT.charW), 0);
/** 等寬字：中文佔兩格 */
export const textCols = (s: string) => Array.from(s).reduce((n, ch) => n + (/[\u2e80-\uffff]/.test(ch) ? 2 : 1), 0);

// ───────────── 自訂網頁：區塊依序往下排（位置算得出來，鏡頭與泡泡才指得準） ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Block = {id?: string; kind: string; [k: string]: any};
const PAGE_X = 460, PAGE_W = 1000;
export const blockH = (b: Block) => {
  switch (b.kind) {
    case 'h1': return 84;
    case 'p': return Math.ceil(textCols(String(b.text ?? '')) / 80) * 38 + 14;
    case 'button': return 80;
    case 'input': return 110;
    case 'card': return 150;
    case 'list': return (b.items?.length ?? 0) * 44 + 16;
    case 'code': return (b.lines?.length ?? 1) * 32 + 36;
    case 'image': return 280;
    default: return 60;
  }
};
export const pageLayout = (blocks: Block[]) => {
  let y = PAGE_TOP + 64 + 56;
  return blocks.map((b) => {
    // 按鈕只有字那麼寬（20px 字＋左右 30px 內距）：泡泡、鏡頭才會指在按鈕本身，不是整排區塊的右邊（2026-10-07 示範片抓到）
    const w = b.kind === 'button' ? Math.round(textCols(String(b.text ?? '')) * 10 + 60) : PAGE_W;
    const r = {x: PAGE_X, y, w, h: b.kind === 'button' ? 56 : blockH(b)}; y += blockH(b) + 18; return {b, r};
  });
};

// ───────────── 目標點（click／zoom／callout 的 to） ─────────────
export type Ctx = {acts: Act[]; lf: number; term?: TermInit; page?: Page};
export const targetRect = (to: unknown, ctx: Ctx): Rect => {
  if (to && typeof to === 'object') { const o = to as Rect; return {x: o.x, y: o.y, w: o.w ?? 10, h: o.h ?? 10}; }
  const s = String(to ?? '');
  if (s === 'omnibox') return OMNI;
  if (s === 'tab') return TAB;
  if (s === 'status') return STATUS;
  if (s === 'terminal') return TERM;
  if (s === 'page') return {x: 0, y: PAGE_TOP, w: W, h: H - TASKBAR - PAGE_TOP};
  if (s.startsWith('icon:')) { const x = TASK_ICONS[s.slice(5)] ?? 960; return {x: x - 22, y: H - TASKBAR + 8, w: 44, h: 44}; }
  if (s.startsWith('term:')) return termFind(ctx.acts, ctx.lf, ctx.term ?? {}, s.slice(5)) ?? TERM;
  if (s.startsWith('page:')) {
    const p = ctx.page;
    const blocks = p && typeof p === 'object' ? p.blocks ?? [] : [];
    const hit = pageLayout(blocks).find(({b}) => b.id === s.slice(5));
    if (hit) return hit.r;
    if (p === 'dns_error' && DNS_ERR[s.slice(5)]) return DNS_ERR[s.slice(5)];
    return {x: 560, y: 300, w: 800, h: 300};
  }
  if (s.startsWith('phone:')) return phoneTarget(s.slice(6));
  return {x: 900, y: 500, w: 120, h: 80};
};
export const center = (r: Rect) => ({x: r.x + r.w / 2, y: r.y + r.h / 2});

// ───────────── 鏡頭：zoom 動作平滑推近／拉遠（螢幕錄影常見的特寫） ─────────────
export const camera = (acts: Act[], ctx: Ctx) => {
  let z = 1, x = W / 2, y = H / 2;
  for (const a of acts) {
    if (a.do !== 'zoom' || a.f > ctx.lf) continue;
    const dur = Math.round((a.dur ?? 0.9) * 30);
    const p = seg(ctx.lf, a.f, a.f + dur);
    const tz = a.reset ? 1 : a.z ?? 1.8;
    const c = a.reset ? {x: W / 2, y: H / 2} : center(targetRect(a.to, {...ctx, lf: a.f + dur}));
    z += (tz - z) * p; x += (c.x - x) * p; y += (c.y - y) * p;
  }
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - x * z));
  const ty = Math.min(0, Math.max(H - H * z, H / 2 - y * z));
  return {z, tx, ty, map: (r: Rect): Rect => ({x: tx + r.x * z, y: ty + r.y * z, w: r.w * z, h: r.h * z})};
};

// ───────────── 游標：click／move 前 0.55 秒開始移過去，點下去有按壓與漣漪 ─────────────
export const cursorAt = (acts: Act[], ctx: Ctx, start = {x: 1000, y: 640}) => {
  let pos = {...start};
  let clickF = -99;
  for (const a of acts) {
    if (!['click', 'move', 'focus'].includes(a.do)) continue;
    const to = a.do === 'focus' ? `icon:${a.app}` : a.to;
    const c = center(targetRect(to, {...ctx, lf: a.f}));
    const tgt = a.do === 'focus' ? c : {x: c.x + (a.ox ?? 0), y: c.y + (a.oy ?? 0)};
    const mv = Math.round((a.move ?? 0.55) * 30);
    if (ctx.lf < a.f - mv) break;
    const p = seg(ctx.lf, a.f - mv, a.f);
    pos = {x: pos.x + (tgt.x - pos.x) * p, y: pos.y + (tgt.y - pos.y) * p};
    if (a.do !== 'move' && ctx.lf >= a.f) clickF = a.f;
  }
  return {...pos, clickF};
};

export const Cursor: React.FC<{x: number; y: number; lf: number; clickF: number}> = ({x, y, lf, clickF}) => {
  const d = lf - clickF;
  const press = d >= 0 && d < 8 ? 1 - Math.abs(d / 4 - 1) : 0;
  return (
    <>
      {d >= 0 && d < 11 && <div style={{position: 'absolute', left: x - 26, top: y - 26, width: 52, height: 52, borderRadius: 26,
        border: '3px solid rgba(11,87,208,0.55)', transform: `scale(${0.4 + (d / 11) * 0.9})`, opacity: 1 - d / 11}} />}
      <svg width={30} height={44} viewBox="0 0 12 18" style={{position: 'absolute', left: x, top: y, transform: `scale(${1 - press * 0.12})`,
        transformOrigin: '0 0', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))'}}>
        <path d="M0.5 0.5 L0.5 14.5 L4 11.2 L6.4 16.8 L8.6 15.9 L6.2 10.4 L11 10.4 Z" fill="#fff" stroke="#000" strokeWidth={0.9} strokeLinejoin="round" />
      </svg>
    </>
  );
};

// ───────────── Windows 11 桌面與工作列 ─────────────
export const Wallpaper: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 80%, #8fb6e8 0%, #3b6fb6 35%, #1d3f78 70%, #12285a 100%)'}} />
);
export const Taskbar: React.FC<{active: string[]; clock?: string; date?: string}> = ({active, clock = '下午 03:41', date = '2026/10/7'}) => (
  <div style={{position: 'absolute', left: 0, top: H - TASKBAR, width: W, height: TASKBAR, background: 'rgba(238,242,247,0.94)',
    borderTop: '1px solid rgba(0,0,0,0.08)', fontFamily: UI}}>
    {Object.entries(TASK_ICONS).map(([k, x]) => (
      <div key={k} style={{position: 'absolute', left: x - 22, top: 8, width: 44, height: 44, borderRadius: 6,
        background: active.includes(k) ? 'rgba(255,255,255,0.75)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <TaskIcon k={k} />
        {active.includes(k) && <div style={{position: 'absolute', bottom: 2, width: 16, height: 3, borderRadius: 2, background: '#0067C0'}} />}
      </div>
    ))}
    <div style={{position: 'absolute', right: 24, top: 8, textAlign: 'right', fontSize: 15, lineHeight: '22px', color: '#1b1b1b'}}>
      <div>{clock}</div><div>{date}</div>
    </div>
  </div>
);
const TaskIcon: React.FC<{k: string}> = ({k}) => {
  if (k === 'start') return <svg width={26} height={26} viewBox="0 0 26 26">{[[0, 0], [14, 0], [0, 14], [14, 14]].map(([x, y], i) => <rect key={i} x={x} y={y} width={12} height={12} rx={1.5} fill="#0078D4" />)}</svg>;
  if (k === 'search') return <svg width={24} height={24} viewBox="0 0 24 24"><circle cx={10} cy={10} r={7} stroke="#333" strokeWidth={2.2} fill="none" /><path d="M15 15 L21 21" stroke="#333" strokeWidth={2.4} strokeLinecap="round" /></svg>;
  if (k === 'files') return <svg width={28} height={24} viewBox="0 0 28 24"><path d="M1 4 h10 l3 3 h13 v16 h-26 z" fill="#FFC83D" /><path d="M1 9 h26 v14 h-26 z" fill="#FFD75E" /></svg>;
  if (k === 'browser') return <ChromeLogo size={28} />;
  if (k === 'edge') return <svg width={28} height={28} viewBox="0 0 28 28"><circle cx={14} cy={14} r={12} fill="#1FA1E8" /><path d="M6 17 q4 -11 14 -6 q-6 -2 -8 3 q-1 6 7 7 q-9 4 -13 -4z" fill="#3DD07A" /></svg>;
  return <svg width={28} height={24} viewBox="0 0 28 24"><rect width={28} height={24} rx={4} fill="#2B2B2B" /><path d="M6 8 l5 4 l-5 4" stroke="#fff" strokeWidth={2} fill="none" /><path d="M13 17 h8" stroke="#fff" strokeWidth={2} /></svg>;
};
export const ChromeLogo: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <circle cx={24} cy={24} r={22} fill="#DB4437" />
    <path d="M24 24 L43.05 13 A22 22 0 0 1 35 43.05 Z" fill="#FFCD40" />
    <path d="M24 24 L35 43.05 A22 22 0 0 1 4.95 13 Z" fill="#0F9D58" />
    <circle cx={24} cy={24} r={10} fill="#fff" /><circle cx={24} cy={24} r={8} fill="#4285F4" />
  </svg>
);

// ───────────── Chrome ─────────────
const Spinner: React.FC<{lf: number; size: number}> = ({lf, size}) => (
  <svg width={size} height={size} viewBox="0 0 20 20" style={{transform: `rotate(${lf * 18}deg)`}}>
    <circle cx={10} cy={10} r={7.5} stroke="#0B57D0" strokeWidth={2.4} fill="none" strokeDasharray="30 18" strokeLinecap="round" />
  </svg>
);
const GoogleWord: React.FC<{size: number}> = ({size}) => {
  const c = ['#4285F4', '#EA4335', '#FBBC05', '#4285F4', '#34A853', '#EA4335'];
  return <div style={{fontFamily: '"Segoe UI Variable Display", "Segoe UI", sans-serif', fontWeight: 600, fontSize: size, letterSpacing: -2}}>
    {'Google'.split('').map((ch, i) => <span key={i} style={{color: c[i]}}>{ch}</span>)}</div>;
};
const GDot: React.FC = () => <div style={{width: 20, height: 20, borderRadius: 10, background: 'conic-gradient(#EA4335 0 25%, #FBBC05 0 50%, #34A853 0 75%, #4285F4 0)'}} />;

export const Browser: React.FC<{lf: number; acts: Act[]; init?: BrowserInit}> = ({lf, acts, init = {}}) => {
  const s = browserState(acts, lf, init);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H - TASKBAR, background: '#fff', fontFamily: UI, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 56, background: '#DCE3EC'}}>
        <div style={{position: 'absolute', left: TAB.x, top: TAB.y, width: TAB.w, height: TAB.h, background: '#fff', borderRadius: '12px 12px 0 0',
          display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', boxSizing: 'border-box', fontSize: 17, color: '#1f1f1f'}}>
          {s.loading ? <Spinner lf={lf} size={20} /> : s.page === 'google' ? <GDot /> : <div style={{width: 20, height: 20, borderRadius: 4, background: '#C9D2DE'}} />}
          <span style={{flex: 1, whiteSpace: 'nowrap', overflow: 'hidden'}}>{s.tab}</span>
          <span style={{fontSize: 18, color: '#555'}}>✕</span>
        </div>
        <div style={{position: 'absolute', left: 326, top: 16, fontSize: 26, color: '#444'}}>＋</div>
        <div style={{position: 'absolute', right: 0, top: 0, height: 56, display: 'flex'}}>
          {['—', '☐', '✕'].map((x, i) => <div key={i} style={{width: 68, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#222'}}>{x}</div>)}
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 56, width: W, height: 60, background: '#fff', borderBottom: '1px solid #e3e3e3', display: 'flex', alignItems: 'center'}}>
        {['←', '→', '⟳'].map((x, i) => <div key={i} style={{width: 48, marginLeft: i === 0 ? 14 : 0, textAlign: 'center', fontSize: 24, color: i === 1 ? '#bbb' : '#444'}}>{x}</div>)}
        <div style={{position: 'absolute', left: OMNI.x, top: OMNI.y - 56, width: OMNI.w, height: OMNI.h, borderRadius: 22,
          background: s.editing ? '#fff' : '#EDF1F6', boxShadow: s.editing ? 'inset 0 0 0 2px #0B57D0' : 'none',
          display: 'flex', alignItems: 'center', padding: '0 20px', boxSizing: 'border-box', fontSize: 19, color: '#1f1f1f'}}>
          {!s.editing && !s.loading && s.url && s.page !== 'newtab' && <span style={{marginRight: 12, fontSize: 16, color: '#444'}}>⚙</span>}
          {s.url ? <span>{s.url}</span> : !s.editing && !s.loading ? <span style={{color: '#6b6b6b'}}>搜尋 Google 或輸入網址</span> : null}
          {s.loading && !s.url && <span>{s.tab}</span>}
          {s.caretOn && <span style={{width: 2, height: 24, background: '#1f1f1f', marginLeft: 1}} />}
        </div>
        <div style={{position: 'absolute', right: 20, top: 12, width: 36, height: 36, borderRadius: 18, background: '#7B8FA8', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17}}>S</div>
      </div>
      <div style={{position: 'absolute', left: 0, top: PAGE_TOP, width: W, height: H - TASKBAR - PAGE_TOP, opacity: s.loadedAt >= 0 ? Math.min(1, 0.3 + fadeIn(lf, s.loadedAt, 6)) : 1}}>
        <PageView page={s.page} lf={lf} acts={acts} />
      </div>
      {s.status && <div style={{position: 'absolute', left: STATUS.x, top: STATUS.y, padding: '6px 14px', background: '#F1F3F4', border: '1px solid #d6d6d6',
        borderRadius: '0 8px 0 0', fontSize: 16, color: '#333'}}>{s.status}</div>}
    </div>
  );
};

export const PageView: React.FC<{page: Page; lf: number; acts: Act[]}> = ({page, lf, acts}) => {
  if (page === 'newtab') return <NewTab />;
  if (page === 'google') return <GoogleHome />;
  if (page === 'dns_error') return <DnsError />;
  if (page === 'blank' || !page) return null;
  if (typeof page === 'string') return null;
  return <CustomPage page={page} lf={lf} acts={acts} />;
};
const NewTab: React.FC = () => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 170}}>
    <GoogleWord size={96} />
    <div style={{marginTop: 36, width: 640, height: 54, borderRadius: 27, border: '1px solid #dfe1e5', boxShadow: '0 1px 6px rgba(32,33,36,0.12)',
      display: 'flex', alignItems: 'center', padding: '0 24px', boxSizing: 'border-box', color: '#70757a', fontSize: 18}}>🔍&nbsp;&nbsp;搜尋 Google 或輸入網址</div>
    <div style={{display: 'flex', gap: 34, marginTop: 50}}>
      {['YouTube', 'Gmail', '雲端硬碟', '學校網站', '新增捷徑'].map((x, i) => (
        <div key={x} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: 100}}>
          <div style={{width: 52, height: 52, borderRadius: 26, background: '#F1F3F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            color: ['#FF0000', '#EA4335', '#34A853', '#0B57D0', '#555'][i]}}>{i === 4 ? '＋' : x[0]}</div>
          <div style={{fontSize: 15, color: '#333'}}>{x}</div>
        </div>
      ))}
    </div>
  </div>
);
const GoogleHome: React.FC = () => (
  <div style={{position: 'relative', height: 900}}>
    <div style={{position: 'absolute', right: 40, top: 20, display: 'flex', gap: 22, alignItems: 'center', fontSize: 16, color: '#1f1f1f'}}>
      <span>Gmail</span><span>圖片</span><span style={{background: '#0B57D0', color: '#fff', padding: '9px 22px', borderRadius: 20}}>登入</span>
    </div>
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 210}}>
      <GoogleWord size={104} />
      <div style={{marginTop: 30, width: 690, height: 54, borderRadius: 27, border: '1px solid #dfe1e5', boxShadow: '0 1px 6px rgba(32,33,36,0.12)'}} />
      <div style={{display: 'flex', gap: 14, marginTop: 30}}>
        {['Google 搜尋', '好手氣'].map((x) => <span key={x} style={{background: '#F8F9FA', padding: '10px 18px', borderRadius: 6, fontSize: 16, color: '#3c4043'}}>{x}</span>)}
      </div>
    </div>
  </div>
);
/** Chrome「無法連上這個網站」（DNS 查不到：ERR_NAME_NOT_RESOLVED）。每一塊位置固定（螢幕座標），page:title／desc／code／reload 才指得準 */
export const DNS_ERR: Record<string, Rect> = {
  icon: {x: 560, y: 260, w: 72, h: 72}, title: {x: 560, y: 370, w: 420, h: 56}, desc: {x: 560, y: 446, w: 520, h: 34},
  tips: {x: 560, y: 500, w: 560, h: 100}, code: {x: 560, y: 620, w: 290, h: 30}, reload: {x: 560, y: 690, w: 132, h: 48},
};
const DnsError: React.FC = () => {
  const at = (k: string): React.CSSProperties => ({position: 'absolute', left: DNS_ERR[k].x, top: DNS_ERR[k].y - PAGE_TOP, fontFamily: UI, color: '#5f6368', whiteSpace: 'nowrap'});
  return (
    <>
      <svg style={at('icon')} width={72} height={72} viewBox="0 0 24 24"><path d="M3 5h18v12H3z" fill="none" stroke="#5f6368" strokeWidth={1.4} /><path d="M7 21h10" stroke="#5f6368" strokeWidth={1.4} /><path d="M9 9l6 4M15 9l-6 4" stroke="#5f6368" strokeWidth={1.4} /></svg>
      <div style={{...at('title'), fontSize: 40, fontWeight: 500, color: '#202124', lineHeight: '56px'}}>無法連上這個網站</div>
      <div style={{...at('desc'), fontSize: 21, lineHeight: '34px'}}>找不到這個網站的伺服器 IP 位址。</div>
      <div style={{...at('tips'), fontSize: 19, lineHeight: '33px'}}>請試試以下方法：<br />・檢查網路連線<br />・檢查 Proxy、防火牆和 DNS 設定</div>
      <div style={{...at('code'), fontSize: 18, letterSpacing: 0.5, lineHeight: '30px'}}>ERR_NAME_NOT_RESOLVED</div>
      <div style={{...at('reload'), background: '#0B57D0', color: '#fff', borderRadius: 24, fontSize: 17, width: 132, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>重新載入</div>
    </>
  );
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomPage: React.FC<{page: any; lf: number; acts: Act[]}> = ({page, lf, acts}) => {
  const lay = pageLayout(page.blocks ?? []);
  const typing = acts.filter((a) => a.do === 'type' && a.app === 'page');
  return (
    <div style={{position: 'absolute', inset: 0, background: page.bg ?? '#fff'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 64, background: page.brand ?? '#1A73E8', color: '#fff', display: 'flex', alignItems: 'center',
        padding: '0 48px', fontSize: 24, fontWeight: 600, boxSizing: 'border-box'}}>{page.site ?? page.title ?? ''}</div>
      {lay.map(({b, r}, i) => {
        const st: React.CSSProperties = {position: 'absolute', left: r.x, top: r.y - PAGE_TOP, width: r.w};
        const ty = typing.filter((a) => a.to === `page:${b.id}` && a.f <= lf).pop();
        switch (b.kind) {
          case 'h1': return <div key={i} style={{...st, fontSize: 44, fontWeight: 600, color: '#202124'}}>{b.text}</div>;
          case 'p': return <div key={i} style={{...st, fontSize: 22, color: '#3c4043', lineHeight: '38px'}}>{b.text}</div>;
          case 'button': return <div key={i} style={{...st, width: 'auto'}}><span style={{display: 'inline-block', background: b.color ?? '#1A73E8', color: '#fff', padding: '14px 30px', borderRadius: 8, fontSize: 20}}>{b.text}</span></div>;
          case 'input': return <div key={i} style={st}><div style={{fontSize: 18, color: '#5f6368', marginBottom: 8}}>{b.label}</div>
            <div style={{height: 52, border: '1px solid #c4c7c5', borderRadius: 8, display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: 20, color: '#202124'}}>{ty ? typedText(ty, lf) : b.value ?? ''}</div></div>;
          case 'card': return <div key={i} style={{...st, height: r.h, border: '1px solid #e0e0e0', borderRadius: 12, padding: 24, boxSizing: 'border-box'}}>
            <div style={{fontSize: 24, fontWeight: 600, color: '#202124'}}>{b.title}</div><div style={{fontSize: 19, color: '#5f6368', marginTop: 10}}>{b.text}</div></div>;
          case 'list': return <div key={i} style={st}>{(b.items ?? []).map((x: string, k: number) => <div key={k} style={{fontSize: 20, lineHeight: '44px', color: '#3c4043'}}>・{x}</div>)}</div>;
          case 'code': return <div key={i} style={{...st, background: '#F6F8FA', border: '1px solid #e1e4e8', borderRadius: 8, padding: '18px 20px', boxSizing: 'border-box', fontFamily: MONO, fontSize: 19, lineHeight: '32px', whiteSpace: 'pre'}}>{(b.lines ?? []).join('\n')}</div>;
          case 'image': return <div key={i} style={{...st, height: r.h, background: '#EEF2F7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a8696', fontSize: 22}}>{b.label}</div>;
          default: return null;
        }
      })}
    </div>
  );
};

// ───────────── Windows 終端機 ─────────────
export const Terminal: React.FC<{lf: number; acts: Act[]; init?: TermInit; openF: number; marks?: {rect: Rect; at: number}[]}> = ({lf, acts, init = {}, openF, marks = []}) => {
  const open = seg(lf, openF, openF + 9);
  const {lines, prompt, cur, showPrompt} = termLines(acts, lf, init);
  const all = [...lines.map((l) => ({...l})), ...(showPrompt ? [{text: prompt + cur, kind: 'cmd' as const, cmd: cur, live: true}] : [])];
  const off = Math.max(0, all.length - TERM_TEXT.rows);
  const caret = Math.floor(lf / 15) % 2 === 0;
  const title = init.shell === 'cmd' ? '命令提示字元' : 'Windows PowerShell';
  return (
    <div style={{position: 'absolute', left: TERM.x, top: TERM.y, width: TERM.w, height: TERM.h, borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 18px 60px rgba(0,0,0,0.45)', border: '1px solid #3a3a3a', opacity: open, transform: `scale(${0.94 + open * 0.06})`, transformOrigin: '50% 60%'}}>
      <div style={{height: 46, background: '#202020', display: 'flex', alignItems: 'flex-end', paddingLeft: 10, fontFamily: UI}}>
        <div style={{height: 38, width: 280, background: '#0C0C0C', borderRadius: '8px 8px 0 0', color: '#fff', fontSize: 16, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', boxSizing: 'border-box'}}>
          <span style={{color: '#5BA4E6'}}>❯_</span>{title}<span style={{marginLeft: 'auto', color: '#aaa'}}>✕</span></div>
        <div style={{color: '#ccc', fontSize: 22, padding: '0 14px 6px'}}>＋ ⌄</div>
        <div style={{marginLeft: 'auto', display: 'flex', color: '#ddd', fontSize: 15}}>{['—', '☐', '✕'].map((x, i) => <div key={i} style={{width: 58, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{x}</div>)}</div>
      </div>
      <div style={{position: 'relative', background: '#0C0C0C', height: TERM.h - 46, padding: '14px 18px', boxSizing: 'border-box', fontFamily: MONO, fontSize: 22,
        lineHeight: `${TERM_TEXT.lineH}px`, color: '#CCCCCC', whiteSpace: 'pre', overflow: 'hidden'}}>
        {marks.map((m, i) => {
          const p = seg(lf, m.at, m.at + 10);
          return p > 0 ? <div key={i} style={{position: 'absolute', left: m.rect.x - TERM.x - 4, top: m.rect.y - TERM.y - 46 + 2, height: m.rect.h - 4,
            width: (m.rect.w + 8) * p, background: 'rgba(255,214,0,0.45)', borderRadius: 4}} /> : null;
        })}
        {all.slice(off).map((l, i) => (
          <div key={i} style={{position: 'relative'}}>
            {l.kind === 'cmd' ? <>
              <span>{prompt}</span><span style={{color: '#F9F1A5'}}>{(l.cmd ?? '').split(' ')[0]}</span>
              <span>{(l.cmd ?? '').includes(' ') ? (l.cmd ?? '').slice((l.cmd ?? '').indexOf(' ')) : ''}</span>
              {'live' in l && caret && lf >= openF + 9 && <span style={{background: '#CCCCCC'}}>&nbsp;</span>}
            </> : <span>{l.text || '\u00a0'}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ───────────── iPhone ─────────────
export const phoneTarget = (k: string): Rect => {
  const P = PHONE;
  if (k === 'send' || k === 'mic') return {x: P.x + P.w - 86, y: P.y + P.h - 104, w: 56, h: 56};
  if (k === 'input') return {x: P.x + 26, y: P.y + P.h - 104, w: P.w - 130, h: 56};
  if (k === 'header') return {x: P.x, y: P.y + 50, w: P.w, h: 70};
  if (k === 'last') return {x: P.x + 20, y: P.y + P.h - 260, w: P.w - 40, h: 120};
  if (k === 'screen') return {x: P.x, y: P.y, w: P.w, h: P.h};
  return {x: P.x + 40, y: P.y + 200, w: P.w - 80, h: 200};
};
export type PhoneInit = {app?: string; color?: string; messages?: {from: 'me' | 'other'; text: string}[]; time?: string; mic?: boolean};
export const Phone: React.FC<{lf: number; acts: Act[]; init?: PhoneInit}> = ({lf, acts, init = {}}) => {
  const P = PHONE;
  const color = init.color ?? '#06C755';
  const msgs = [...(init.messages ?? []).map((m) => ({...m, f: -99})),
    ...acts.filter((a) => a.do === 'message' && a.f <= lf).map((a) => ({from: a.from ?? 'other', text: String(a.text ?? ''), f: a.f}))];
  const ty = lastOf(acts, lf, (a) => a.do === 'type');
  const sent = ty ? acts.find((a) => a.do === 'message' && a.from === 'me' && a.f >= ty.f && a.f <= lf) : undefined;
  const draft = ty && !sent ? typedText(ty, lf) : '';
  const note = lastOf(acts, lf, (a) => a.do === 'notify');
  const noteP = note ? Math.min(seg(lf, note.f, note.f + 8), 1 - seg(lf, note.f + Math.round((note.hold ?? 2.5) * 30), note.f + Math.round((note.hold ?? 2.5) * 30) + 8)) : 0;
  const recording = lastOf(acts, lf, (a) => a.do === 'tap' && a.to === 'mic');
  const recOn = recording && !acts.find((a) => a.do === 'message' && a.from === 'me' && a.f > recording.f && a.f <= lf);
  return (
    <div style={{position: 'absolute', left: P.x, top: P.y, width: P.w, height: P.h, borderRadius: 64, background: '#111', padding: 14, boxSizing: 'border-box',
      boxShadow: '0 30px 80px rgba(20,40,80,0.35)'}}>
      <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 52, overflow: 'hidden', background: '#F2F4F7', fontFamily: UI}}>
        <div style={{height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 34px', fontSize: 17, fontWeight: 600, color: '#111'}}>
          <span>{init.time ?? '3:41'}</span><span style={{width: 110, height: 30, borderRadius: 15, background: '#111', position: 'absolute', left: '50%', marginLeft: -55, top: 10}} /><span style={{fontSize: 15}}>5G ▮▮▮</span>
        </div>
        <div style={{height: 70, background: '#fff', display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', borderBottom: '1px solid #e6e6e6'}}>
          <span style={{fontSize: 24, color: '#333'}}>‹</span>
          <div style={{width: 40, height: 40, borderRadius: 20, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700}}>{(init.app ?? 'A')[0]}</div>
          <div style={{fontSize: 20, fontWeight: 600, color: '#111'}}>{init.app ?? 'App'}</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 120, bottom: 110, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 12, overflow: 'hidden'}}>
          {msgs.slice(-6).map((m, i) => {
            const g = seg(lf, m.f, m.f + 9);   // 新訊息高度由 0 長出來，舊訊息平滑往上（不瞬間跳，最終品檢 F11）
            return (
              <div key={i} style={{alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '78%', maxHeight: g * 160, marginTop: (g - 1) * 12, overflow: 'hidden', opacity: g}}>
                <div style={{background: m.from === 'me' ? color : '#fff', color: m.from === 'me' ? '#fff' : '#111',
                  borderRadius: 20, padding: '12px 16px', fontSize: 19, lineHeight: 1.45, boxShadow: '0 1px 2px rgba(0,0,0,0.08)'}}>{m.text}</div>
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, background: '#fff', borderTop: '1px solid #e6e6e6', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 20px', boxSizing: 'border-box'}}>
          <div style={{flex: 1, height: 52, borderRadius: 26, background: '#F2F4F7', display: 'flex', alignItems: 'center', padding: '0 18px', fontSize: 19, color: draft ? '#111' : '#999'}}>
            {draft || (recOn ? '正在聆聽…' : '輸入訊息')}{draft && Math.floor(lf / 15) % 2 === 0 && <span style={{width: 2, height: 22, background: '#111', marginLeft: 1}} />}</div>
          <div style={{width: 52, height: 52, borderRadius: 26, background: recOn ? '#E53935' : color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            transform: recOn ? `scale(${1 + Math.sin(lf / 4) * 0.06})` : undefined}}>{draft ? '➤' : '🎙'}</div>
        </div>
        {noteP > 0 && note && (
          <div style={{position: 'absolute', left: 12, right: 12, top: 12 + (noteP - 1) * 90, background: 'rgba(250,250,250,0.97)', borderRadius: 22, padding: '14px 18px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.18)', opacity: noteP}}>
            <div style={{fontSize: 15, color: '#666'}}>{note.title ?? init.app}</div><div style={{fontSize: 18, color: '#111', marginTop: 4}}>{note.text}</div>
          </div>
        )}
      </div>
    </div>
  );
};
export const PhoneBg: React.FC = () => (
  <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EAF0F7 60%, #DCE5F0 100%)'}} />
);
/** 手指點擊（手機用，取代滑鼠游標） */
export const Tap: React.FC<{acts: Act[]; lf: number}> = ({acts, lf}) => {
  const t = lastOf(acts, lf, (a) => a.do === 'tap');
  if (!t || lf - t.f > 14) return null;
  const c = center(phoneTarget(String(t.to)));
  const d = (lf - t.f) / 14;
  return <div style={{position: 'absolute', left: c.x - 34, top: c.y - 34, width: 68, height: 68, borderRadius: 34, background: 'rgba(0,0,0,0.18)',
    border: '3px solid rgba(255,255,255,0.9)', transform: `scale(${0.6 + d * 0.6})`, opacity: 1 - d}} />;
};

// ───────────── 重點泡泡（白卡片＋尖角，[[字]] ＝ 螢光筆） ─────────────
export const Bubble: React.FC<{lf: number; act: Act; endF: number; anchor: Rect; font: string}> = ({lf, act, endF, anchor, font}) => {
  const a = fadeIn(lf, act.f, 7) * (1 - fadeIn(lf, endF - 7, 7));
  if (a <= 0) return null;
  const pop = interpolate(lf - act.f, [0, 5, 9], [0.9, 1.03, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const side = act.side ?? (anchor.y + anchor.h > 760 ? 'above' : 'below');
  const lines = String(act.text ?? '').split('\n');
  const estW = Math.min(1100, Math.max(...lines.map((l) => textCols(l.replace(/\[\[|\]\]/g, '')) * 20)) + 70);
  const estH = lines.length * 56 + 44;
  let x = anchor.x + anchor.w / 2 - 70, y = side === 'below' ? anchor.y + anchor.h + 26 : side === 'above' ? anchor.y - estH - 26 : anchor.y + anchor.h / 2 - estH / 2;
  if (side === 'right') x = anchor.x + anchor.w + 30;
  if (side === 'left') x = anchor.x - estW - 30;
  x = Math.max(90, Math.min(W - 90 - estW, x));
  y = Math.max(110, Math.min(860 - estH, y));
  const tailX = Math.max(30, Math.min(estW - 50, anchor.x + anchor.w / 2 - x - 13));
  const tail: React.CSSProperties = side === 'below' ? {left: tailX, top: -13} : side === 'above' ? {left: tailX, bottom: -13} : side === 'right' ? {left: -13, top: estH / 2 - 13} : {right: -13, top: estH / 2 - 13};
  return (
    <div data-qa-box={`bubble-${act.f}`} style={{position: 'absolute', left: x, top: y, opacity: a, transform: `scale(${pop})`, transformOrigin: '30% 0',
      background: '#fff', borderRadius: 22, padding: '22px 32px', boxShadow: '0 12px 40px rgba(0,0,0,0.22)', border: '1px solid rgba(0,0,0,0.06)',
      fontFamily: font, fontSize: 36, fontWeight: 700, color: '#1b1b1b', lineHeight: '56px', whiteSpace: 'nowrap'}}>
      <div style={{position: 'absolute', width: 26, height: 26, background: '#fff', transform: 'rotate(45deg)', ...tail}} />
      {lines.map((l, i) => <div key={i} data-qa-in={`bubble-${act.f}`} style={{position: 'relative'}}>{markup(l, lf, act.f + 9 + i * 6)}</div>)}
    </div>
  );
};
/** [[重點]] → 黃色螢光筆由左往右畫過去 */
export const markup = (s: string, lf: number, at: number) => s.split(/(\[\[.*?\]\])/).map((part, i) => {
  if (!part.startsWith('[[')) return <span key={i}>{part}</span>;
  const p = seg(lf, at, at + 10);
  return <span key={i} style={{backgroundImage: 'linear-gradient(#FFE14D, #FFE14D)', backgroundRepeat: 'no-repeat', backgroundSize: `${p * 100}% 42%`,
    backgroundPosition: '0 88%', padding: '0 4px'}}>{part.slice(2, -2)}</span>;
});
