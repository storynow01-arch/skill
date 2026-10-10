/* 廣S 工具箱（原作 showreel/kit.tsx 搬進範本）：節拍、色票、緩動、時間伸縮、滾動數字、形狀變形、點陣字。
   所有動畫都只由「章內時間 t（格）」決定；拍點＝n*B（128 BPM，一拍 14.0625 格）。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';
import T from './timeline.json';

/* ───── 節拍 ───── */
export const FPS = 30;
export const B: number = T.beat;
export const BAR = 4 * B;
export const W = 1920;
export const H = 1080;
/** 第 n 拍（章內） */
export const nb = (n: number) => n * B;

/* ───── 色票：深藍墨底＋電光藍＋螢光珊瑚＋暖白（原作） ───── */
export const C = {
  bg: '#171a27',
  bg2: '#13151d',
  bg3: '#1b1e29',
  blue: '#2f6bff',
  blueD: '#1a3fa8',
  coral: '#ff5a4e',
  white: '#f4efe6',
  dim: 'rgba(244,239,230,0.45)',
  faint: 'rgba(244,239,230,0.14)',
  line: 'rgba(244,239,230,0.08)',
};

/* ───── 緩動與進度 ───── */
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EI = Easing.bezier(0.7, 0, 0.84, 0); // 加速（抽走）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const LIN = (x: number) => x;
/** 0→1 進度 */
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) =>
  interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** 彈簧 0→1（t<at 時為 0） */
export const sp = (t: number, at: number, damping = 12, stiffness = 220, mass = 0.8) =>
  t < at ? 0 : spring({frame: t - at, fps: FPS, config: {damping, stiffness, mass}});
/** 0..1 內的「鐘形」：中間 1、兩端 0 */
export const bell = (p: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, p)));
/** 決定性隨機（-1..1） */
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
/** 時間伸縮：實際格數 → 原作章內格數（pts＝[[原作拍, 實際拍], …]，由 timeline.py 依字數算好；超出最後一點 1:1） */
export const warp = (t: number, pts: number[][]) => {
  const tb = t / B;
  for (let i = 0; i + 1 < pts.length; i++) {
    const [o0, a0] = pts[i];
    const [o1, a1] = pts[i + 1];
    if (tb <= a1 || i + 2 === pts.length && tb <= a1) return (o0 + ((tb - a0) * (o1 - o0)) / (a1 - a0)) * B;
  }
  const [o, a] = pts[pts.length - 1];
  return (o + tb - a) * B;
};
/** 字寬（中文 1、英數 0.6 字級） */
export const em = (s: string, latin = 0.6) => Array.from(s).reduce((a, c) => a + ((c.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : c === ' ' ? 0.3 : latin), 0);

/* ───── 章資料 ───── */
export type Chap = {type: string; tech: string; from: number; to: number; nb: number; beat: number; trans: string; win: [number, number];
  anchor: [number, number]; no: number} & Record<string, any>;
export type ChP = {t: number; c: Chap};
export const LAB = T.d.labels as Record<string, string>;

/* ───── 滾動數字：舊數字往上滑出淡出、新數字從下滑入淡入 ───── */
export const DigitCol: React.FC<{w: number; cw?: number}> = ({w, cw = 0.66}) => {
  const base = Math.floor(w);
  const fr = w - base;
  const d0 = ((base % 10) + 10) % 10;
  const d1 = (((base + 1) % 10) + 10) % 10;
  const cell: React.CSSProperties = {position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center'};
  return (
    <span style={{position: 'relative', display: 'inline-block', width: `${cw}em`, height: '1.08em', verticalAlign: 'top', overflow: 'hidden'}}>
      <span style={{...cell, transform: `translateY(${-fr * 1.05}em)`, opacity: 1 - fr}}>{d0}</span>
      {fr > 0.001 && <span style={{...cell, transform: `translateY(${(1 - fr) * 1.05}em)`, opacity: fr}}>{d1}</span>}
    </span>
  );
};
/** 吃角子老虎式滾動：每位數各自轉 laps 圈後，在 lock[i] 格停在目標數字（非數字字元原樣顯示） */
export const Roller: React.FC<{value: string; t: number; start: number; lock: number[]; laps?: number; cw?: number}> = ({value, t, start, lock, laps = 1, cw}) => {
  let di = 0;
  return (
    <span style={{display: 'inline-flex', lineHeight: 1}}>
      {value.split('').map((ch, i) => {
        if (!/[0-9]/.test(ch)) return <span key={i} style={{display: 'inline-block', lineHeight: 1}}>{ch}</span>;
        const d = Number(ch);
        const L = lock[Math.min(di, lock.length - 1)] + Math.max(0, di - lock.length + 1) * 8;
        di++;
        const p = interpolate(t, [start, L], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <DigitCol key={i} w={p * (laps * 10 + d)} cw={cw} />;
      })}
    </span>
  );
};

/* ───── 形狀變形（多邊形重取樣後逐點內插） ───── */
export type Pt = [number, number];
const NPTS = 140;
export const resample = (poly: Pt[], n = NPTS): Pt[] => {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push(l);
    total += l;
  }
  const out: Pt[] = [];
  let si = 0, acc = 0;
  for (let j = 0; j < n; j++) {
    const target = (j / n) * total;
    while (si < segs.length - 1 && acc + segs[si] < target) {
      acc += segs[si];
      si++;
    }
    const a = poly[si], b = poly[(si + 1) % poly.length];
    const u = segs[si] > 0 ? (target - acc) / segs[si] : 0;
    out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
  }
  return out;
};
/** 讓 b 的起點對齊 a（找總距離最小的旋轉），變形時才不會打結 */
export const align = (a: Pt[], b: Pt[]): Pt[] => {
  let best = 0, bestD = Infinity;
  for (let s = 0; s < b.length; s += 2) {
    let d = 0;
    for (let i = 0; i < a.length; i += 4) {
      const q = b[(i + s) % b.length];
      d += (a[i][0] - q[0]) ** 2 + (a[i][1] - q[1]) ** 2;
    }
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return b.map((_, i) => b[(i + best) % b.length]);
};
export const mixPts = (a: Pt[], b: Pt[], p: number): Pt[] => a.map((q, i) => [lerp(q[0], b[i][0], p), lerp(q[1], b[i][1], p)]);
export const ptsPath = (pts: Pt[]) => 'M' + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L') + 'Z';
export const circlePts = (r: number, n = 72, cx = 0, cy = 0, rot = -Math.PI / 2): Pt[] =>
  Array.from({length: n}, (_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

/* ───── 5×7 點陣字（粒子聚成數字用；原作只有 3 4 .，通用版補齊數字與符號） ───── */
export const DOT_FONT: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
};

/* ───── 共用小元件 ───── */
/** 遮罩上滑出現的一行字 */
export const MaskLine: React.FC<{p: number; out?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({p, out = 0, style, children}) => (
  <div style={{overflow: 'hidden', ...style}}>
    <div style={{transform: `translateY(${(1 - p) * 110 - out * 110}%)`, opacity: Math.min(1, p * 1.5) * (1 - out)}}>{children}</div>
  </div>
);
export const abs: React.CSSProperties = {position: 'absolute'};
