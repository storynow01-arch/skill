/* 範本廣K 自帶的小工具（原作 import 的 ../kit 有學校資料，通用版只搬需要的緩動、彈簧、決定性隨機、滾動數字、遮罩字、形狀變形）。
   所有動畫只由「格數」決定（Remotion 規則：不能用 Math.random、Date、CSS 動畫／transition）。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EI = Easing.bezier(0.7, 0, 0.84, 0); // 加速（抽走）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const LIN = (x: number) => x;
/** t 在 a→b 之間的 0→1 進度 */
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) =>
  b <= a ? (t >= b ? 1 : 0) : interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** 彈簧 0→1（t<at 時為 0） */
export const sp = (t: number, at: number, damping = 12, stiffness = 220, mass = 0.8) =>
  t < at ? 0 : spring({frame: t - at, fps: 30, config: {damping, stiffness, mass}});
/** 0..1 的鐘形（中間 1、兩端 0） */
export const bell = (p: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, p)));
/** 決定性隨機（-1..1） */
export const rnd = (seed: string | number) => random(seed) * 2 - 1;

/* ───── 滾動數字：舊的往上滑出淡出、新的從下滑入淡入（不要逐格硬換數字，品檢會判抖動） ───── */
export const DigitCol: React.FC<{w: number; cw?: number}> = ({w, cw = 0.62}) => {
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
/** 吃角子老虎式：每位數各轉 laps 圈，第 i 位在 lock[i] 格停在目標數字。非數字字元原樣顯示 */
export const Roller: React.FC<{value: string; t: number; start: number; lock: number[]; laps?: number; cw?: number}> = ({value, t, start, lock, laps = 1, cw}) => {
  let di = 0;
  return (
    <span style={{display: 'inline-flex', lineHeight: 1}}>
      {value.split('').map((ch, i) => {
        if (!/[0-9]/.test(ch)) return <span key={i} style={{display: 'inline-block', lineHeight: 1.08}}>{ch}</span>;
        const d = Number(ch);
        const L = lock[Math.min(di, lock.length - 1)];
        di++;
        const p = interpolate(t, [start, L], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <DigitCol key={i} w={p * (laps * 10 + d)} cw={cw} />;
      })}
    </span>
  );
};

/* ───── 形狀變形（多邊形依弧長重取樣後逐點內插） ───── */
export type Pt = [number, number];
export const resample = (poly: Pt[], n = 140): Pt[] => {
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
export const mixPts = (a: Pt[], b: Pt[], p: number): Pt[] => a.map((q, i) => [lerp(q[0], b[i][0], p), lerp(q[1], b[i][1], p)]);
export const ptsPath = (pts: Pt[]) => 'M' + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L') + 'Z';
export const circlePts = (r: number, n = 72): Pt[] =>
  Array.from({length: n}, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });

/** 遮罩上滑出現的一行字（p：0→1 出現） */
export const MaskLine: React.FC<{p: number; style?: React.CSSProperties; children: React.ReactNode}> = ({p, style, children}) => (
  <div style={{overflow: 'hidden', ...style}}>
    <div style={{transform: `translateY(${(1 - p) * 110}%)`, opacity: Math.min(1, p * 1.5)}}>{children}</div>
  </div>
);
