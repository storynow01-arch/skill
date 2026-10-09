/* 廣C 場景幾何：桌上每份文件的位置、鏡頭路線、主角鋼筆的路線。全部由格數決定；
   時間全部來自 timeline.json（timeline.py 依內容算），省略的文件（地圖、線索、清單）鏡頭與鋼筆自動跳過。 */
import {interpolate} from 'remotion';
import {clamp, EO, EIO, k, lerp} from './kit';
import T from './timeline.json';
import {textX} from './parts';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const E = T.ev as Record<string, number>;
export const TY = T.type as Record<string, {text: string; start: number; step: number}>;
export const HD = T.hand as Record<string, {text: string; start: number; end: number}>;
export const HAS = T.has as Record<string, boolean>;
export const D = T.d as any;

export type Doc = {id: string; w: number; h: number; x: number; y: number; r: number; at: number; dur: number; fx: number; fy: number; fr: number; drop?: boolean};
export const FOLDER = {x: 960, y: 560, w: 1240, h: 820};

/* 文件：home＝攤在桌上的位置；f＝從哪裡被抽出來 */
const ALL: (Doc & {need?: string})[] = [
  {id: 'doc1', w: 1180, h: 700, x: 1060, y: 480, r: -2, at: E.doc1, dur: 24, fx: 960, fy: 600, fr: 0},
  {id: 'map', need: 'map', w: 1060, h: 760, x: 2250, y: 430, r: 2.5, at: E.map, dur: 26, fx: 1350, fy: 700, fr: -6},
  {id: 'pol1', need: 'pol1', w: 440, h: 530, x: 2980, y: 720, r: -7, at: E.pol1, dur: 22, fx: 3700, fy: 300, fr: -30},
  {id: 'pol2', need: 'pol2', w: 440, h: 530, x: 1650, y: 1120, r: 6, at: E.pol2, dur: 22, fx: 1000, fy: 1500, fr: 25},
  {id: 'sticky', need: 'sticky', w: 340, h: 340, x: 2500, y: 1180, r: -4, at: E.sticky, dur: 10, fx: 2500, fy: 1180, fr: -14, drop: true},
  {id: 'check', need: 'check', w: 900, h: 700, x: 1000, y: 1480, r: 1.5, at: E.check, dur: 24, fx: 960, fy: 700, fr: -4},
  {id: 'letter', w: 1080, h: 760, x: 1900, y: 950, r: -1, at: E.letter, dur: 28, fx: 1900, fy: 2100, fr: 8},
];
export const DOCS: Doc[] = ALL.filter((d) => !d.need || HAS[d.need]);
export const docById = (id: string) => DOCS.find((d) => d.id === id)!;

/** 文件在第 f 格的位置（被抽出→攤開→最後被收回檔案夾） */
export const docState = (d: Doc, f: number) => {
  const p = k(f, d.at, d.at + d.dur, EO);
  let x = lerp(d.fx, d.x, p), y = lerp(d.fy, d.y, p), r = lerp(d.fr, d.r, p);
  let s = d.drop ? lerp(1.35, 1, p) : 1;
  let lift = d.drop ? 1 - p : Math.sin(Math.PI * p) * 0.8;
  const i = DOCS.indexOf(d);
  const q = k(f, E.sweep + i * 3, E.sweep + i * 3 + 26, EIO);
  if (q > 0) {
    x = lerp(x, FOLDER.x, q); y = lerp(y, FOLDER.y + 10, q); r = lerp(r, (i % 2 ? 1 : -1) * 1.5, q);
    s = lerp(s, Math.min(1, (FOLDER.w - 60) / d.w, (FOLDER.h - 40) / d.h), q);
    lift = Math.max(lift, Math.sin(Math.PI * q) * 0.9);
  }
  return {x, y, r, s, lift, visible: f >= d.at && f < E.closed + 2};
};

/** 文件本地座標（左上角為原點）→ 桌面座標（以攤開位置計） */
export const toWorld = (d: Doc, lx: number, ly: number): [number, number] => {
  const a = (d.r * Math.PI) / 180, dx = lx - d.w / 2, dy = ly - d.h / 2;
  return [d.x + dx * Math.cos(a) - dy * Math.sin(a), d.y + dx * Math.sin(a) + dy * Math.cos(a)];
};

/* ───── 鏡頭（背景比前景早一拍先動：鏡頭移動都比文件進場早幾格） ───── */
type Key = [number, number, number, number];
const CAM: Key[] = (() => {
  const c: Key[] = [[0, 960, 560, 0.92], [E.folderLand + 10, 960, 560, 0.92], [E.secret - 4, 960, 540, 1.0], [E.flap, 960, 540, 1.0],
    [E.flap + 28, 700, 560, 0.78], [E.doc1 + 4, 700, 560, 0.78], [E.doc1 + 34, 1060, 500, 1.0]];
  const go = (t: number, x: number, y: number, s: number, lead = 34) => {
    c.push([t - 4, c[c.length - 1][1], c[c.length - 1][2], c[c.length - 1][3]], [t - 4 + lead, x, y, s]);
  };
  if (HAS.map) go(E.map, 2250, 470, 1.0, 36);
  if (HAS.pol1) go(E.pol1, 2620, 700, 0.82);
  if (HAS.pol2) go(E.pol2, 2050, 980, 0.82);
  if (HAS.sticky) go(E.sticky, 2350, 820, 0.64, 26);
  if (E.pullback !== undefined) {
    // 拉遠看整面偵探牆：依實際有哪些文件框住（省略地圖時不會中間一大片空桌面）
    const wall = DOCS.filter((d) => !['check', 'letter'].includes(d.id));
    const x0 = Math.min(...wall.map((d) => d.x - d.w / 2)), x1 = Math.max(...wall.map((d) => d.x + d.w / 2));
    const y0 = Math.min(...wall.map((d) => d.y - d.h / 2)), y1 = Math.max(...wall.map((d) => d.y + d.h / 2));
    go(E.pullback, (x0 + x1) / 2, (y0 + y1) / 2, Math.min(0.8, 1920 / (x1 - x0 + 260), 1080 / (y1 - y0 + 200)), 30);
  }
  if (HAS.check) go(E.check, 1000, 1480, 1.0, 30);
  go(E.letter, 1900, 950, 0.6, 24);
  c.push([E.letter + 32, 1900, 950, 0.6], [E.letter + 60, 1920, 980, 1.0], [E.stamp - 30, 1920, 980, 1.0], [E.stamp - 2, 1940, 990, 1.08],
    [E.sweep, 1940, 990, 1.08], [E.sweep + 32, 960, 580, 0.7], [E.close + 30, 960, 560, 0.95], [E.closed + 40, 960, 560, 1.0]);
  return c.sort((a, b) => a[0] - b[0]);
})();
/** 拍點重擊：整個畫面推一下（amp＝放大量），蓋章時再加震動 */
const KICKS: [number, number][] = [
  [E.folderLand, 0.03], [E.secret, 0.025], [E.stamp, 0.07], [E.closed, 0.035], [E.school, 0.03],
  ...(HAS.map ? [[E.pinJP, 0.02]] as [number, number][] : []),
  ...(HAS.pol2 ? [[E.clip, 0.015]] as [number, number][] : []),
  ...(HAS.sticky ? [[E.sticky, 0.02]] as [number, number][] : []),
  ...(['pol1', 'pol2', 'sticky'].filter((x) => HAS[x]).map((x) => [E['pin_' + x], 0.015]) as [number, number][]),
];
export const camAt = (f: number) => {
  let i = 0;
  while (i + 1 < CAM.length && f >= CAM[i + 1][0]) i++;
  const a = CAM[i], b = CAM[Math.min(i + 1, CAM.length - 1)];
  const p = b[0] === a[0] ? 1 : k(f, a[0], b[0], EIO);
  let x = lerp(a[1], b[1], p), y = lerp(a[2], b[2], p), s = Math.exp(lerp(Math.log(a[3]), Math.log(b[3]), p));
  let kick = 0;
  for (const [t, amp] of KICKS) if (f >= t && f < t + 20) kick += amp * Math.exp(-(f - t) / 4) * (f - t < 2 ? (f - t + 1) / 2 : 1);
  s *= 1 + kick;
  const sh = f >= E.stamp && f < E.stamp + 16 ? Math.exp(-(f - E.stamp) / 5) : 0;
  x += Math.sin(f * 2.7) * 26 * sh; y += Math.cos(f * 3.3) * 20 * sh;
  return {x, y, s};
};

/* ───── 紅筆圈／底線的位置（依字寬算） ───── */
const A: string = TY.b1a.text, B: string = TY.b1b.text;
const ci = D.brief.circle ? A.indexOf(D.brief.circle) : -1;
const cx0 = ci >= 0 ? 80 + textX(A, ci, 48) : 0, cx1 = ci >= 0 ? 80 + textX(A, ci + D.brief.circle.length, 48) : 0;
export const CIRCLE = {on: ci >= 0, cx: (cx0 + cx1) / 2, cy: 329, rx: (cx1 - cx0) / 2 + 34, ry: 48};
const ui = D.brief.underline ? B.indexOf(D.brief.underline) : -1;
export const UNDER = {on: ui >= 0, x0: ui >= 0 ? 80 + textX(B, ui, 48) : 0, x1: ui >= 0 ? 80 + textX(B, ui + D.brief.underline.length, 48) : 0};
export const ROUTE = {x0: 215, y0: 590, cx: 330, cy: 230, x1: 760, y1: 250};
export const bez = (p: number): [number, number] => {
  const u = 1 - p, R = ROUTE;
  return [u * u * R.x0 + 2 * u * p * R.cx + p * p * R.x1, u * u * R.y0 + 2 * u * p * R.cy + p * p * R.y1];
};

/* ───── 主角：一支紅桿鋼筆。畫圈、畫航線、寫字、打勾都是它；沒事時懸在下一個重點旁邊，最後躺在名稱章旁 ───── */
type Task = {a: number; b: number; at: (p: number) => [number, number]};
const lineHand = (d: Doc, x0: number, y0: number, lens: number[], rowH: number) => (p: number): [number, number] => {
  const total = lens.reduce((a, b) => a + b, 0);
  let t = p * total, row = 0;
  while (row < lens.length - 1 && t > lens[row]) { t -= lens[row]; row++; }
  return toWorld(d, x0 + t, y0 + row * rowH + Math.sin(t * 0.15) * 8);
};
export const TICK_PTS: [number, number][] = [[14, 36], [30, 56], [66, -6]];
const tickAt = (d: Doc, bx: number, by: number) => (p: number): [number, number] => {
  const seg = p < 0.35 ? 0 : 1, pp = seg === 0 ? p / 0.35 : (p - 0.35) / 0.65;
  const A_ = TICK_PTS[seg], B_ = TICK_PTS[seg + 1];
  return toWorld(d, bx + lerp(A_[0], B_[0], pp), by + lerp(A_[1], B_[1], pp));
};
const handW = (s: string, size: number) => Math.min(380, Array.from(s).length * size);
export const TASKS: Task[] = (() => {
  const t: Task[] = [];
  const D1 = docById('doc1');
  if (CIRCLE.on) t.push({a: E.circle, b: E.circle + 26, at: (p) => {
    const a = -Math.PI * 0.95 + p * Math.PI * 2.15;
    return toWorld(D1, CIRCLE.cx + Math.cos(a) * CIRCLE.rx, CIRCLE.cy + Math.sin(a) * CIRCLE.ry);
  }});
  if (UNDER.on) t.push({a: E.underline, b: E.underline + 16, at: (p) => toWorld(D1, UNDER.x0 + p * (UNDER.x1 - UNDER.x0), 462 + Math.sin(p * 9) * 3)});
  if (HAS.map) t.push({a: E.route, b: E.route + 48, at: (p) => { const [x, y] = bez(p); return toWorld(docById('map'), x, y); }});
  if (HAS.pol1) t.push({a: HD.hand1.start, b: HD.hand1.end, at: lineHand(docById('pol1'), 32, 486, [handW(HD.hand1.text, 44)], 0)});
  if (HAS.pol2) t.push({a: HD.hand2.start, b: HD.hand2.end, at: lineHand(docById('pol2'), 32, 486, [handW(HD.hand2.text, 40)], 0)});
  if (HAS.sticky) t.push({a: HD.hand3.start, b: HD.hand3.end, at: lineHand(docById('sticky'), 44, 150, (T.note as string[]).map((s) => Array.from(s).length * 70), 94)});
  if (HAS.check) {
    t.push({a: E.tick1, b: E.tick1 + 12, at: tickAt(docById('check'), 70, 230)});
    t.push({a: E.tick2, b: E.tick2 + 12, at: tickAt(docById('check'), 70, 380)});
  }
  return t;
})();
const REST_START: [number, number] = [1720, 760];
export const PEN_END: [number, number] = [1240, 480]; // 檔案封面右側空白處（不壓到標語，標語長短不一）
/** 鋼筆筆尖位置與是否抬起（0＝貼紙寫字、1＝抬起懸空） */
export const penAt = (f: number) => {
  for (const t of TASKS) if (f >= t.a && f <= t.b) return {x: t.at((f - t.a) / (t.b - t.a))[0], y: t.at((f - t.a) / (t.b - t.a))[1], up: 0};
  let prev: [number, number] = REST_START, prevEnd = -999;
  for (const t of TASKS) if (t.b < f) { prev = t.at(1); prevEnd = t.b; }
  const next = TASKS.find((t) => t.a > f);
  const near = (pt: [number, number]): [number, number] => [pt[0] + 50, pt[1] + 70];
  let x: number, y: number;
  if (next) {
    const from = prevEnd < 0 ? REST_START : near(prev);
    const to = near(next.at(0));
    const p = k(f, next.a - 20, next.a, EIO);
    const settle = prevEnd < 0 ? 0 : k(f, prevEnd, prevEnd + 8, EO);
    const start: [number, number] = prevEnd < 0 ? from : [lerp(prev[0], from[0], settle), lerp(prev[1], from[1], settle)];
    x = lerp(start[0], to[0], p); y = lerp(start[1], to[1], p);
    if (p >= 1) { const q = k(f, next.a - 4, next.a, EO); x = lerp(to[0], next.at(0)[0], q); y = lerp(to[1], next.at(0)[1], q); }
  } else {
    // 最後：指著通知、退到一旁看蓋章，檔案闔上後躺到封面名稱章旁
    const letter = docById('letter');
    const point = toWorld(letter, 760, 360);
    const side: [number, number] = [2620, 1260];
    const a0 = k(f, Math.max(prevEnd, E.letter), E.letter + 40, EIO);
    x = lerp(prev[0], point[0], a0); y = lerp(prev[1], point[1], a0);
    const a = k(f, E.stampLift - 10, E.stampLift + 16, EIO);
    x = lerp(x, side[0], a); y = lerp(y, side[1], a);
    const b = k(f, E.closed + 4, E.closed + 30, EIO);
    x = lerp(x, PEN_END[0], b); y = lerp(y, PEN_END[1], b);
  }
  const first = TASKS.length ? TASKS[0].a - 20 : E.letter;
  const before = f < first;
  const landed = f >= E.closed + 30;
  const up = before || landed ? interpolate(f, [E.closed + 24, E.closed + 32], [1, 0], clamp) * (landed ? 1 : 0) : 1;
  return {x, y, up: before ? 0 : up};
};
