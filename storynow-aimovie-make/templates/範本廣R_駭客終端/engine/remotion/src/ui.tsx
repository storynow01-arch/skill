/* 廣R「駭客終端」共用元件（原作 ad09/ui.tsx）：配色、提示字元、逐字打字、游標、ASCII 方塊大字、楷體大字掃描、文字進度條、
   視窗框、十六進位資料流、tmux 狀態列、會往上捲的輸出行、TUI 細框。
   主機名、使用者、狀態列的字全部讀 timeline.json（timeline.py 依 storyboard 排好）。 */
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {KAI, MONO} from './fonts';
import {clamp, rnd01} from './kit';

export {KAI, MONO};

export const C = {
  bg: '#16261f', // 終端機底（墨綠灰）
  desk: '#12201a', // 桌面
  bar: '#203a2e', // 標題列
  line: '#3d6250', // 窗格邊框
  g: '#3dff8a', // 磷光綠
  gd: '#2a9a5c', // 暗綠（陰影字）
  a: '#ffb84d', // 琥珀
  c: '#5ce1e6', // 青
  w: '#e8f5ec', // 白
  dim: '#93b8a3', // 次要文字
  r: '#ff6b5e', // 錯誤紅（少量）
  ink: '#0f1b15',
};
export const D = T.d as {host: string; user: string; session: string; url: string; wins: string[]; iconsL: string[]; iconsR: string[]; labels: Record<string, string>};
export const abs: React.CSSProperties = {position: 'absolute'};

/** 終端機字級與行高 */
export const FS = 32;
export const LH = 50;

/* 視窗：全螢幕時的位置（下方 y ≥ 900 留給靜止狀態列） */
export const FULL = {x: 24, y: 18, w: 1872, h: 868};
export const TB = 52; // 標題列高
export const IN = {w: FULL.w, h: FULL.h - TB}; // 內容區 1872 × 816

/** 逐字打字：t0→t1 之間把字串打完 */
export const typed = (s: string, t: number, t0: number, t1: number) => {
  const ch = Array.from(s);
  const n = Math.floor(interpolate(t, [t0, t1], [0, ch.length], clamp) + 0.0001);
  return ch.slice(0, n).join('');
};

/** 游標：打字中常亮，閒置時每秒閃 2 次（小面積） */
export const Cursor: React.FC<{solid?: boolean; color?: string; w?: number}> = ({solid, color = C.g, w = 0.6}) => {
  const f = useCurrentFrame();
  const vis = solid || f % 15 < 8;
  return <span style={{display: 'inline-block', width: `${w}em`, height: '1.05em', verticalAlign: '-0.2em', marginLeft: 3, background: vis ? color : 'transparent'}} />;
};

/** 提示字元 user@host:~$ */
export const PS: React.FC<{short?: boolean; dir?: string}> = ({short, dir = '~'}) =>
  short ? (
    <span style={{color: C.g, fontWeight: 700}}>$ </span>
  ) : (
    <>
      <span style={{color: C.g, fontWeight: 700}}>{D.user}@{D.host}</span>
      <span style={{color: C.w}}>:</span>
      <span style={{color: C.c, fontWeight: 700}}>{dir}</span>
      <span style={{color: C.w}}>$ </span>
    </>
  );

/** 一行指令：t0 開始打字，enter 那格按下 Enter（打字在 enter 前 2 格打完） */
export const Cmd: React.FC<{t: number; s: string; t0: number; enter: number; short?: boolean; hold?: boolean; style?: React.CSSProperties}> = ({t, s, t0, enter, short, hold, style}) => {
  const txt = typed(s, t, t0, enter - 2);
  const flash = t >= enter ? Math.max(0, 1 - (t - enter) / 8) : 0;
  const live = hold || t < enter;
  return (
    <div style={{whiteSpace: 'nowrap', height: LH, lineHeight: `${LH}px`, position: 'relative', ...style}}>
      {flash > 0 && <div style={{...abs, left: -12, right: 0, top: 4, bottom: 4, background: `rgba(61,255,138,${0.16 * flash})`}} />}
      <span style={{position: 'relative'}}>
        <PS short={short} />
        <span style={{color: C.w}}>{txt}</span>
        {live && <Cursor solid={t >= t0 && t < enter - 2} />}
      </span>
    </div>
  );
};

/** 字元格：每個字固定寬度 */
export const Cell: React.FC<{c: string; w: number; color: string; style?: React.CSSProperties}> = ({c, w, color, style}) => (
  <span style={{display: 'inline-block', width: w, textAlign: 'center', color, ...style}}>{c}</span>
);

/* ───── ASCII 方塊大字（█ 實心、░ 陰影、· 底點；用 div 畫格子，不靠字型），scan＝由左往右掃描顯示的進度 0..1 ─────
   原作只有 P R H S 四個字；這裡用同一種 6×7、兩格粗筆畫補齊 A–Z、0–9 與 - . ! + */
const GLYPH: Record<string, string[]> = {
  A: ['.####.', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  B: ['#####.', '##..##', '##..##', '#####.', '##..##', '##..##', '#####.'],
  C: ['.#####', '##....', '##....', '##....', '##....', '##....', '.#####'],
  D: ['#####.', '##..##', '##..##', '##..##', '##..##', '##..##', '#####.'],
  E: ['######', '##....', '##....', '#####.', '##....', '##....', '######'],
  F: ['######', '##....', '##....', '#####.', '##....', '##....', '##....'],
  G: ['.#####', '##....', '##....', '##.###', '##..##', '##..##', '.#####'],
  H: ['##..##', '##..##', '##..##', '######', '##..##', '##..##', '##..##'],
  I: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '######'],
  J: ['....##', '....##', '....##', '....##', '##..##', '##..##', '.####.'],
  K: ['##..##', '##.##.', '####..', '###...', '####..', '##.##.', '##..##'],
  L: ['##....', '##....', '##....', '##....', '##....', '##....', '######'],
  M: ['#....#', '##..##', '######', '##..##', '##..##', '##..##', '##..##'],
  N: ['##..##', '###.##', '######', '##.###', '##..##', '##..##', '##..##'],
  O: ['.####.', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  P: ['#####.', '##..##', '##..##', '#####.', '##....', '##....', '##....'],
  Q: ['.####.', '##..##', '##..##', '##..##', '##.###', '##..##', '.###.#'],
  R: ['#####.', '##..##', '##..##', '#####.', '##.##.', '##..##', '##..##'],
  S: ['.#####', '##....', '##....', '.####.', '....##', '....##', '#####.'],
  T: ['######', '..##..', '..##..', '..##..', '..##..', '..##..', '..##..'],
  U: ['##..##', '##..##', '##..##', '##..##', '##..##', '##..##', '.####.'],
  V: ['##..##', '##..##', '##..##', '##..##', '##..##', '.####.', '..##..'],
  W: ['##..##', '##..##', '##..##', '##..##', '######', '######', '.#..#.'],
  X: ['##..##', '##..##', '.####.', '..##..', '.####.', '##..##', '##..##'],
  Y: ['##..##', '##..##', '.####.', '..##..', '..##..', '..##..', '..##..'],
  Z: ['######', '....##', '...##.', '..##..', '.##...', '##....', '######'],
  '0': ['.####.', '##..##', '##.###', '######', '###.##', '##..##', '.####.'],
  '1': ['..##..', '.###..', '..##..', '..##..', '..##..', '..##..', '.####.'],
  '2': ['.####.', '##..##', '....##', '...##.', '..##..', '.##...', '######'],
  '3': ['#####.', '....##', '....##', '.####.', '....##', '....##', '#####.'],
  '4': ['##..##', '##..##', '##..##', '######', '....##', '....##', '....##'],
  '5': ['######', '##....', '#####.', '....##', '....##', '##..##', '.####.'],
  '6': ['.####.', '##....', '##....', '#####.', '##..##', '##..##', '.####.'],
  '7': ['######', '....##', '...##.', '..##..', '..##..', '..##..', '..##..'],
  '8': ['.####.', '##..##', '##..##', '.####.', '##..##', '##..##', '.####.'],
  '9': ['.####.', '##..##', '##..##', '.#####', '....##', '....##', '.####.'],
  '-': ['......', '......', '......', '######', '......', '......', '......'],
  '.': ['......', '......', '......', '......', '......', '..##..', '..##..'],
  '!': ['..##..', '..##..', '..##..', '..##..', '..##..', '......', '..##..'],
  '+': ['......', '..##..', '..##..', '######', '..##..', '..##..', '......'],
};
const ROWS = 7;
const gridCache: Record<string, number[][]> = {};
export const asciiGrid = (word: string) => {
  if (gridCache[word]) return gridCache[word];
  const adv = Array.from(word).map((c) => (c === ' ' ? 4 : 8));
  const cols = adv.reduce((a, x) => a + x, 0) - 2 + 1;
  const g: number[][] = Array.from({length: ROWS + 1}, () => Array(cols).fill(0));
  let x0 = 0;
  Array.from(word).forEach((L, li) => {
    (GLYPH[L] || []).forEach((row, r) => row.split('').forEach((ch, c) => {
      if (ch === '#') g[r][x0 + c] = 1;
    }));
    x0 += adv[li];
  });
  for (let r = ROWS; r >= 1; r--) for (let c = cols - 1; c >= 1; c--) if (g[r][c] === 0 && g[r - 1][c - 1] === 1) g[r][c] = 2;
  gridCache[word] = g;
  return g;
};
const DECODE = '#%@&$*+=';
export const Ascii: React.FC<{word: string; cw: number; ch: number; scan?: number; t: number; dots?: boolean; color?: string}> = ({word, cw, ch, scan = 1, t, dots = true, color = C.g}) => {
  const G = asciiGrid(word);
  const cols = G[0].length;
  const front = scan * (cols + 4);
  const dot = (key: number) => (dots ? <Cell key={key} c="·" w={cw} color="#2c4a3b" /> : <span key={key} style={{display: 'inline-block', width: cw}} />);
  return (
    <div style={{fontFamily: MONO, fontSize: Math.max(10, ch * 0.92), lineHeight: `${ch}px`, whiteSpace: 'nowrap'}}>
      {G.map((row, r) => (
        <div key={r} style={{height: ch, display: 'flex'}}>
          {row.map((v, c) => {
            if (c > front) return dot(c);
            if (c > front - 3 && v !== 0) {
              const kk = Math.floor(rnd01(`d${r}-${c}-${Math.floor(t / 2)}`) * DECODE.length);
              return <Cell key={c} c={DECODE[kk]} w={cw} color={C.w} />;
            }
            if (v === 1) return <span key={c} style={{display: 'inline-block', width: cw, height: ch, background: color, boxShadow: `0 0 ${cw * 0.4}px rgba(61,255,138,0.25)`}} />;
            if (v === 2) return <span key={c} style={{display: 'inline-block', width: cw, height: ch, background: `repeating-linear-gradient(135deg, ${C.gd} 0 2px, transparent 2px 5px)`, opacity: 0.85}} />;
            return dot(c);
          })}
        </div>
      ))}
    </div>
  );
};

/* ───── 楷體大字掃描（名稱沒有英數時代替 ASCII 方塊字）：由左往右逐字解碼出現 ───── */
export const KaiScan: React.FC<{s: string; size: number; scan: number; t: number; color?: string; glow?: boolean}> = ({s, size, scan, t, color = C.g, glow = true}) => {
  const ch = Array.from(s);
  const front = scan * (ch.length + 1);
  return (
    <span style={{fontFamily: KAI, fontWeight: 700, fontSize: size, lineHeight: 1.2, color, whiteSpace: 'nowrap', textShadow: glow ? '0 0 26px rgba(61,255,138,0.35)' : 'none'}}>
      {ch.map((c, i) => {
        if (i >= front) return <span key={i} style={{opacity: 0}}>{c}</span>;
        if (i >= front - 1 && c !== ' ') {
          const kk = Math.floor(rnd01(`k${i}-${Math.floor(t / 2)}`) * DECODE.length);
          return <span key={i} style={{display: 'inline-block', width: '1em', textAlign: 'center', color: C.w, fontFamily: MONO}}>{DECODE[kk]}</span>;
        }
        return <span key={i}>{c}</span>;
      })}
    </span>
  );
};

/** 文字進度條 [██████░░░░]（格子用 div 畫） */
export const Bar: React.FC<{p: number; n?: number; color?: string; cw?: number}> = ({p, n = 20, color = C.g, cw = 19}) => {
  const fill = Math.round(Math.max(0, Math.min(1, p)) * n);
  return (
    <span style={{whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle'}}>
      <span style={{color: C.w}}>[</span>
      {Array.from({length: n}, (_, i) => (
        <span key={i} style={{display: 'inline-block', width: cw - 3, height: '0.9em', margin: '0 1.5px', background: i < fill ? color : 'rgba(59,94,76,0.55)'}} />
      ))}
      <span style={{color: C.w}}>]</span>
    </span>
  );
};

/* ───── 十六進位資料流（標題列右側小區塊，平滑往左捲） ───── */
const HEX = '0123456789ABCDEF';
const HEXSTR = Array.from({length: 64}, (_, i) => HEX[Math.floor(rnd01(`h${i}a`) * 16)] + HEX[Math.floor(rnd01(`h${i}b`) * 16)]).join(' ');
export const HexStream: React.FC<{w: number}> = ({w}) => {
  const f = useCurrentFrame();
  const per = 64 * 3 * 16.8;
  const x = -((f * 2.4) % per);
  return (
    <div style={{width: w, height: TB, overflow: 'hidden', position: 'relative', maskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 100%)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 18%, #000 100%)'}}>
      <div style={{...abs, left: x, top: 0, lineHeight: `${TB}px`, fontFamily: MONO, fontSize: 28, color: C.gd, whiteSpace: 'nowrap'}}>
        {HEXSTR} {HEXSTR}
      </div>
    </div>
  );
};

/* ───── 視窗框：標題列＋內容區（內容以視窗中心為錨，縮小／最小化時從中間收） ───── */
export const Frame: React.FC<{
  x: number; y: number; w: number; h: number; title: string; glow?: number; hexW?: number;
  inner?: {w: number; h: number}; children: React.ReactNode;
}> = ({x, y, w, h, title, glow = 0, hexW = 520, inner = IN, children}) => {
  const ch = Math.max(0, h - TB);
  const top = (ch - inner.h) / 2;
  return (
    <div style={{...abs, left: x, top: y, width: w, height: h, background: C.bg, border: `2px solid ${glow > 0 ? `rgba(61,255,138,${0.4 + 0.6 * glow})` : '#35594a'}`, borderRadius: 10, overflow: 'hidden',
      boxShadow: `0 18px 50px rgba(0,0,0,0.35)${glow > 0 ? `, 0 0 ${30 * glow}px rgba(61,255,138,${0.5 * glow})` : ''}`}}>
      <div style={{...abs, left: 0, top: 0, right: 0, height: TB, background: glow > 0 ? `rgba(61,255,138,${0.12 + 0.3 * glow})` : C.bar, borderBottom: '2px solid #2d4d3d', zIndex: 2}}>
        {[C.r, C.a, C.g].map((c, i) => (
          <div key={i} style={{...abs, left: 22 + i * 30, top: 17, width: 18, height: 18, borderRadius: 9, background: c, opacity: 0.85}} />
        ))}
        <div style={{...abs, left: 120, top: 0, lineHeight: `${TB}px`, fontFamily: MONO, fontSize: 28, color: C.w, whiteSpace: 'nowrap'}}>{title}</div>
        {hexW > 0 && <div style={{...abs, right: 14, top: 0}}><HexStream w={hexW} /></div>}
      </div>
      <div style={{...abs, left: 0, top: TB, width: w, height: ch, overflow: 'hidden'}}>
        <div style={{...abs, left: (w - inner.w) / 2, top, width: inner.w, height: inner.h}}>{children}</div>
      </div>
    </div>
  );
};

/* ───── 下方靜止的 tmux 狀態列（y ≥ 900，只在換章那格改高亮，不放會跳動的字） ───── */
export const StatusArea: React.FC<{active: number}> = ({active}) => {
  const L = D.labels;
  const hint = (a: string, z: string, last?: boolean) => (
    <>
      <span style={{color: C.a}}>{a}</span> {z}{last ? '' : '　　'}
    </>
  );
  return (
    <div style={{...abs, left: 0, top: 900, width: 1920, height: 180, fontFamily: MONO, fontSize: 28}}>
      <div style={{...abs, left: 0, top: 0, width: 1920, height: 104, background: C.desk, borderTop: '2px solid #2a4537'}}>
        <div style={{...abs, left: 48, top: 0, lineHeight: '104px', color: C.dim, whiteSpace: 'nowrap'}}>
          {hint('^B %', L.vsplit)}{hint('^B "', L.hsplit)}{hint('^B z', L.zoom)}{hint('^B d', L.detach, true)}
        </div>
        {D.session && (
          <div style={{...abs, right: 48, top: 0, lineHeight: '104px', color: C.dim, whiteSpace: 'nowrap'}}>
            {L.session} <span style={{color: C.c}}>{D.session}</span>
          </div>
        )}
      </div>
      <div style={{...abs, left: 0, top: 112, width: 1920, height: 68, background: '#2fcf72', color: C.ink, lineHeight: '68px', whiteSpace: 'nowrap', display: 'flex'}}>
        <span style={{height: 68, padding: '0 22px', background: '#1d8f4d', color: C.w, fontWeight: 700, marginRight: 20}}>[{D.host}]</span>
        <span>
          {D.wins.map((n, i) => (
            <span key={i} style={{padding: '6px 10px', marginRight: 6, background: i === active ? C.ink : 'transparent', color: i === active ? C.g : C.ink, fontWeight: i === active ? 700 : 400}}>
              {i}:{n}{i === active ? '*' : ' '}
            </span>
          ))}
        </span>
        {D.url && <span style={{...abs, right: 26, top: 0, fontWeight: 700}}>{D.url}</span>}
      </div>
    </div>
  );
};

/** 以行為單位疊起來的輸出（超出高度自動往上捲，像真的終端機） */
export type Item = {at: number; h?: number; el: React.ReactNode};
export const Stack: React.FC<{t: number; items: Item[]; maxH: number; style?: React.CSSProperties}> = ({t, items, maxH, style}) => {
  const vis = items.filter((it) => t >= it.at);
  const total = vis.reduce((s, it) => s + (it.h ?? LH), 0);
  const off = Math.max(0, total - maxH);
  return (
    <div style={{...abs, overflow: 'hidden', height: maxH, ...style}}>
      <div style={{transform: `translateY(${-off}px)`}}>
        {vis.map((it, i) => (
          <div key={i} style={{height: it.h ?? LH, lineHeight: `${it.h ?? LH}px`, whiteSpace: 'nowrap', position: 'relative'}}>{it.el}</div>
        ))}
      </div>
    </div>
  );
};

/** 出現時從右側滑入＋淡入的一行 */
export const slideIn = (t: number, at: number, dist = 40): React.CSSProperties => {
  const p = interpolate(t, [at, at + 6], [0, 1], clamp);
  return {opacity: p, transform: `translateX(${(1 - p) * dist}px)`, display: 'inline-block'};
};

/** 細框盒子，左上角嵌標籤（像 TUI 的框） */
export const Box: React.FC<{x: number; y: number; w: number; h: number; label: string; color?: string; children?: React.ReactNode; style?: React.CSSProperties}> = ({x, y, w, h, label, color = C.line, children, style}) => (
  <div style={{...abs, left: x, top: y, width: w, height: h, border: `2px solid ${color}`, boxSizing: 'border-box', ...style}}>
    {label && <div style={{...abs, left: 20, top: -22, padding: '0 12px', background: C.bg, fontSize: 28, lineHeight: '40px', color, whiteSpace: 'nowrap'}}>{label}</div>}
    {children}
  </div>
);

export const base: React.CSSProperties = {...abs, inset: 0, fontFamily: MONO, fontSize: FS, color: C.w};
