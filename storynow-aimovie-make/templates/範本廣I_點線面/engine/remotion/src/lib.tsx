/* 範本廣I 共用：時間表型別、配色、鏡頭、重擊、主角路徑、等角投影、會被「畫出來」的字與線。
   所有時間、座標、字都讀 timeline.json（timeline.py 依 storyboard 算好）。 */
import React from 'react';
import {easeOutBack, EIO, k, lerp, LIN, rnd} from './kit';
import {NOTO, SG} from './fonts';
import TJ from './timeline.json';

export type Pt = [number, number];
export type Part = {pts: Pt[]; fill: string | null; closed: boolean; role: 'o' | 'd'; w: number; len: number; t0?: number; dur?: number};
export type Dim = {
  n: 1 | 2 | 3; key: string; object: string; X: number; start: number; end: number; label: string; labelSize: number; note: string; noteSize: number;
  parts: Part[]; bb: [number, number, number, number]; acc: Pt; labelAt: number; noteAt: number; dimAt: number;
  flash?: number; fill?: number; copies?: number;
  A?: number; PO?: Pt; net?: Pt[]; netLen?: number; netAt?: number; netDur?: number; folds?: number[]; rail?: number; plate?: number; print0?: number; print1?: number;
};
export type Film = {
  wide: string; wideSize: number; title: string; titleSize: number; sub: string; subSize: number; words: string[]; wordSizes: number[]; slateSize: number;
  slate: number; titleAt: number; subAt: number; actors: number[]; stack: number[]; bulb: number; spin: number; word1: number; word2: number;
};
type Seg = {k: string; t0: number; t1: number; p?: Pt; a?: Pt | null; b?: Pt | null; h?: number; pts?: Pt[]};
type TL = {
  fps: number; frames: number; beatFrames: number; barFrames: number;
  secs: Record<'point' | 'line' | 'plane' | 'solid' | 'motion' | 'collapse' | 'logo' | 'end', number>;
  marks: Record<string, number>; head: Record<string, number>; segs: Seg[]; lands: number[]; cam: [number, number, number, number][];
  punch: [number, number][]; TX: number; LY: number; lensR: number; sWide: number; sDive: number; xs: number[];
  d: {
    title: string; kicker: string; kickerSize: number; line: string; lineSize: number; ask: string; askSize: number;
    dims: Dim[]; film: Film | null;
    end: {name: string; nameSize: number; sub: string; subSize: number; slogan: string; sloganSize: number; url: string; urlSize: number; texts: (number | null)[]};
  };
};
export const T = TJ as unknown as TL;
export const D = T.d;
export const MK = T.marks;
export const BF = T.beatFrames;
export {NOTO, SG};

export const C = {
  paper: '#f2efe8', soft: '#fbf8f1', ink: '#1b1b1b', mute: '#8a8478', grid: '#d8d2c4',
  red: '#e63946', blue: '#1d4ed8', yellow: '#f4b400', lightBlue: '#8ea6ee',
};
/** 部件顏色代號 → 顏色；2D 只有紅藍（黃改淡藍），每升一維多一色 */
export const colOf = (fill: string | null, dim: number): string | null => {
  if (!fill) return null;
  if (fill === 'r') return C.red;
  if (fill === 'b') return C.blue;
  if (fill === 'y') return dim >= 3 ? C.yellow : C.lightBlue;
  if (fill === 'k') return C.ink;
  return C.soft;
};
export const dimOf = (n: number) => D.dims.find((e) => e.n === n);

/* ───── 鏡頭：關鍵格 [格, 中心x, 中心y, 縮放]，同一個緩動家族（EIO）；縮放用對數內插，推近時目標點平順移動 ───── */
export type Cam = {x: number; y: number; s: number};
const CAMK = T.cam;
export const cam = (f: number): Cam => {
  if (f <= CAMK[0][0]) return {x: CAMK[0][1], y: CAMK[0][2], s: CAMK[0][3]};
  for (let i = 0; i < CAMK.length - 1; i++) {
    const a = CAMK[i], b = CAMK[i + 1];
    if (f < b[0]) {
      if (b[0] <= a[0]) continue;
      const p = EIO((f - a[0]) / (b[0] - a[0]));
      const s = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), p));
      const q = Math.abs(a[3] - b[3]) < 1e-6 ? p : (1 / a[3] - 1 / s) / (1 / a[3] - 1 / b[3]);
      return {x: lerp(a[1], b[1], q), y: lerp(a[2], b[2], q), s};
    }
  }
  const z = CAMK[CAMK.length - 1];
  return {x: z[1], y: z[2], s: z[3]};
};
export const camT = (c: Cam) => `translate(960 540) scale(${c.s}) translate(${-c.x} ${-c.y})`;

/* ───── 鏡頭重擊：拍點上整個畫面推一下＋震一下 ───── */
export const punch = (f: number) => {
  let sc = 0, dx = 0, dy = 0;
  for (const [e, A] of T.punch) {
    if (f < e || f > e + 14) continue;
    const d = Math.exp(-(f - e) / 3.5);
    sc += A * d;
    dx += rnd(`px${e}${f}`) * A * 260 * d;
    dy += rnd(`py${e}${f}`) * A * 200 * d;
  }
  return {sc, dx, dy, t: `translate(${960 + dx} ${540 + dy}) scale(${1 + sc}) translate(-960 -540)`};
};

/* ───── 折線工具：長度、沿線取點 ───── */
export const polyD = (pts: Pt[], close = true) => 'M' + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L') + (close ? 'Z' : '');
const cumOf = (pts: Pt[]) => {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
};
export const pointAt = (pts: Pt[], u: number, cum = cumOf(pts)): Pt => {
  const L = cum[cum.length - 1] * Math.max(0, Math.min(1, u));
  let i = 1;
  while (i < cum.length - 1 && cum[i] < L) i++;
  const seg = cum[i] - cum[i - 1] || 1;
  const t = (L - cum[i - 1]) / seg;
  return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)];
};
export const centroid = (pts: Pt[]): Pt => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
};

/* ───── 主角（一個點）：沿時間表的路徑段走；回傳世界座標與形變 ───── */
export type Hero = {x: number; y: number; sx: number; sy: number; sc: number};
const SEGS = T.segs;
const CUMS = SEGS.map((s) => (s.pts ? cumOf(s.pts) : null));
const landSq = (f: number, at: number) => (f >= at && f < at + 9 ? Math.sin(((f - at) / 9) * Math.PI) * 0.3 : 0);
const arcP = (f: number, t0: number, t1: number, a: Pt, b: Pt, h: number): Pt => {
  const u = k(f, t0, t1, LIN);
  const e = u * u * (3 - 2 * u);
  return [lerp(a[0], b[0], e), lerp(a[1], b[1], e) - h * Math.sin(Math.PI * u)];
};

/** 3D 噴頭：沿印出來的高度來回掃 */
export const nozzle = (f: number): Pt => {
  const d3 = dimOf(3);
  if (!d3) return [T.TX, T.LY];
  const [x0, , x1, y1] = d3.bb;
  const top = d3.bb[1];
  const h = k(f, d3.print0 as number, d3.print1 as number, LIN) * (y1 - top);
  const om = (f - (d3.print0 as number)) * 0.32 * (f > MK.hit ? 1.6 : 1);
  return [(x0 + x1) / 2 + ((x1 - x0) / 2 + 10) * Math.sin(om), y1 - h - 14];
};

const posAt = (f: number): [Pt, number] => {
  let i = SEGS.findIndex((s) => f < s.t1);
  if (i < 0) i = SEGS.length - 1;
  const s = SEGS[i];
  let sq = 0;
  let p: Pt = [0, 0];
  switch (s.k) {
    case 'hold':
      p = s.p as Pt;
      break;
    case 'bounce': {
      const ph = (((f - s.t0) % BF) + BF) % BF / BF;
      p = [(s.p as Pt)[0], (s.p as Pt)[1] - 26 * Math.sin(Math.PI * ph)];
      sq = landSq(f, f - ((((f - s.t0) % BF) + BF) % BF));
      break;
    }
    case 'charge':
      p = [(s.p as Pt)[0] - 22 * k(f, s.t0, s.t1), (s.p as Pt)[1]];
      sq = -0.3 * k(f, s.t0, s.t1);
      break;
    case 'drag':
      p = [lerp((s.a as Pt)[0], (s.b as Pt)[0], k(f, s.t0, s.t1)), (s.b as Pt)[1]];
      sq = -0.5 * Math.sin(Math.PI * k(f, s.t0, s.t1, LIN));
      break;
    case 'path':
      p = pointAt(s.pts as Pt[], k(f, s.t0, s.t1, LIN), CUMS[i] as number[]);
      break;
    case 'nozzle':
      p = nozzle(f);
      break;
    default: {
      const a = s.a ?? posAt(s.t0 - 0.001)[0];
      const b = s.b ?? nozzle(s.t1);
      p = arcP(f, s.t0, s.t1, a, b, s.h ?? 100);
    }
  }
  for (const l of T.lands) sq += landSq(f, l);
  return [p, sq];
};

export const hero = (f: number): Hero => {
  const [[x, y], sq0] = posAt(f);
  let sq = sq0;
  const h = T.head;
  let sc = f < h.pop ? 0 : easeOutBack(k(f, h.pop, h.pop + 10, LIN));
  if (f >= MK.collapse) sc = 1 + 0.6 * k(f, MK.collapse + 6, MK.collapse + 30);
  for (const d of D.dims) if (d.flash !== undefined && f >= d.flash) sq += 0.4 * Math.exp(-(f - d.flash) / 4) * (f < d.flash + 20 ? 1 : 0);
  return {x, y, sx: 1 + sq, sy: 1 - sq, sc};
};

/* ───── 等角投影（2.5D） ───── */
export type V3 = [number, number, number];
export const iso = (o: Pt, p: V3): Pt => [o[0] + (p[0] - p[1]) * 0.866, o[1] + (p[0] + p[1]) * 0.5 - p[2]];
const LDIR: V3 = (() => {
  const v: V3 = [0.25, 0.55, 0.9];
  const n = Math.hypot(...v);
  return [v[0] / n, v[1] / n, v[2] / n];
})();
/** 面的明暗：法向量與光線夾角決定亮度（0.55～1） */
export const shadeOf = (q: V3[]) => {
  const u: V3 = [q[1][0] - q[0][0], q[1][1] - q[0][1], q[1][2] - q[0][2]];
  const v: V3 = [q[3][0] - q[0][0], q[3][1] - q[0][1], q[3][2] - q[0][2]];
  let n: V3 = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const l = Math.hypot(...n) || 1;
  n = [n[0] / l, n[1] / l, n[2] / l];
  if (n[0] + n[1] + n[2] < 0) n = [-n[0], -n[1], -n[2]];
  const d = n[0] * LDIR[0] + n[1] * LDIR[1] + n[2] * LDIR[2];
  return 0.55 + 0.45 * Math.max(0, d);
};
/** 顏色乘亮度 */
export const tint = (hex: string, m: number) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const o = c.map((x) => Math.round(Math.min(255, m >= 1 ? x + (255 - x) * (m - 1) : x * m)));
  return `rgb(${o[0]},${o[1]},${o[2]})`;
};

/* ───── 文字寬度估計（剪裁用） ───── */
export const textW = (s: string, size: number, ls = 0) => {
  let w = 0;
  for (const ch of s) w += ((ch.codePointAt(0) as number) >= 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.6) * size + ls;
  return w;
};

/* ───── 被「畫出來」的字：由左往右剪裁顯示，前緣有一條紅色筆尖線 ───── */
export const WText: React.FC<{
  id: string; x: number; y: number; size: number; text: string; p: number; weight?: number; fill?: string;
  family?: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; op?: number; pen?: string;
}> = ({id, x, y, size, text, p, weight = 300, fill = C.ink, family, anchor = 'start', ls = 0, op = 1, pen = C.red}) => {
  if (!text || p <= 0 || op <= 0) return null;
  const w = textW(text, size, ls);
  const x0 = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
  const front = x0 - size * 0.1 + (w + size * 0.2) * p;
  return (
    <g opacity={op}>
      <clipPath id={id}>
        <rect x={x0 - size * 0.2} y={y - size * 1.2} width={Math.max(0, front - x0 + size * 0.2)} height={size * 1.6} />
      </clipPath>
      <text x={x} y={y} fontSize={size} fontWeight={weight} fill={fill} fontFamily={family ?? NOTO} textAnchor={anchor}
        letterSpacing={ls} clipPath={`url(#${id})`}>{text}</text>
      {p < 1 && <line x1={front} x2={front} y1={y - size * 1.0} y2={y + size * 0.22} stroke={pen} strokeWidth={Math.max(2, size * 0.04)} />}
    </g>
  );
};

/* ───── 尺寸線：兩端短垂直線＋箭頭，從中間往兩邊畫開（不標數字：不編造尺寸） ───── */
export const DimLine: React.FC<{x1: number; y1: number; x2: number; y2: number; p: number; sw?: number; color?: string; op?: number}> = ({
  x1, y1, x2, y2, p, sw = 2.5, color = C.red, op = 1,
}) => {
  if (p <= 0) return null;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const a = [mx - (dx / 2) * p, my - (dy / 2) * p], b = [mx + (dx / 2) * p, my + (dy / 2) * p];
  const tick = 14, ar = 12;
  return (
    <g opacity={op} stroke={color} strokeWidth={sw} fill="none">
      <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
      {p > 0.98 && (
        <>
          <line x1={x1 + nx * tick} y1={y1 + ny * tick} x2={x1 - nx * tick} y2={y1 - ny * tick} />
          <line x1={x2 + nx * tick} y1={y2 + ny * tick} x2={x2 - nx * tick} y2={y2 - ny * tick} />
          <path d={`M${x1 + ux * ar + nx * ar * 0.45},${y1 + uy * ar + ny * ar * 0.45}L${x1},${y1}L${x1 + ux * ar - nx * ar * 0.45},${y1 + uy * ar - ny * ar * 0.45}`} />
          <path d={`M${x2 - ux * ar + nx * ar * 0.45},${y2 - uy * ar + ny * ar * 0.45}L${x2},${y2}L${x2 - ux * ar - nx * ar * 0.45},${y2 - uy * ar - ny * ar * 0.45}`} />
        </>
      )}
    </g>
  );
};

/* ───── 會被畫出來的線（stroke-dash） ───── */
export const Draw: React.FC<{d: string; len: number; p: number; color?: string; sw?: number; op?: number; fill?: string}> = ({
  d, len, p, color = C.ink, sw = 4, op = 1, fill = 'none',
}) => {
  if (p <= 0) return null;
  return <path d={d} fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={`${len} ${len + 10}`} strokeDashoffset={len * (1 - Math.min(1, p))} opacity={op} />;
};

/** 角度記號（只畫弧，不標度數） */
export const Angle: React.FC<{x: number; y: number; r?: number; a0: number; a1: number; p: number; color?: string}> = ({
  x, y, r = 34, a0, a1, p, color = C.red,
}) => {
  if (p <= 0) return null;
  const e = a0 + (a1 - a0) * p;
  const Pp = (a: number) => [x + Math.cos(a) * r, y + Math.sin(a) * r];
  const s = Pp(a0), t = Pp(e);
  return <path d={`M${s[0]},${s[1]}A${r},${r} 0 0 ${e > a0 ? 1 : 0} ${t[0]},${t[1]}`} stroke={color} strokeWidth={2.5} fill="none" />;
};
