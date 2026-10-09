/* 網點「照片」：用幾何圖形算濃淡，再排成報紙網點（不用真的照片）。
   shade(u, v) 回傳 0..1（1＝最黑），u、v 是 0..1 的畫面座標。 */
import React, {useMemo} from 'react';

export type Shade = (u: number, v: number) => number;
const sm = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const disk = (u: number, v: number, cx: number, cy: number, r: number) => 1 - sm(r - 0.012, r + 0.012, Math.hypot(u - cx, v - cy));
const box = (u: number, v: number, x0: number, y0: number, x1: number, y1: number) =>
  sm(x0 - 0.01, x0 + 0.01, u) * (1 - sm(x1 - 0.01, x1 + 0.01, u)) * sm(y0 - 0.01, y0 + 0.01, v) * (1 - sm(y1 - 0.01, y1 + 0.01, v));

/** 頭版照：一疊書＋升起的太陽 */
export const SUNRISE: Shade = (u, v) => {
  let s = 0.55 - v * 0.45; // 天空上暗下亮
  s -= disk(u, v, 0.66, 0.5, 0.2) * 0.5; // 太陽（亮）
  const ray = Math.abs(Math.sin(Math.atan2(v - 0.5, u - 0.66) * 7));
  if (v < 0.62) s -= (ray > 0.8 ? 0.12 : 0) * (1 - sm(0.2, 0.6, Math.hypot(u - 0.66, v - 0.5)));
  if (v > 0.62) s = 0.35 + (v - 0.62) * 0.4; // 地平線以下
  s = Math.max(s, box(u, v, 0.1, 0.72, 0.62, 0.8) * 0.95);
  s = Math.max(s, box(u, v, 0.14, 0.64, 0.56, 0.72) * 0.75);
  s = Math.max(s, box(u, v, 0.08, 0.8, 0.66, 0.9) * 0.88);
  return Math.max(0.03, Math.min(1, s));
};
/** 自發：往上長的箭頭 */
export const RISE: Shade = (u, v) => {
  let s = 0.12 + v * 0.25;
  const stem = box(u, v, 0.44, 0.42, 0.56, 0.9);
  const head = v > 0.12 && v < 0.46 && Math.abs(u - 0.5) < (v - 0.12) * 0.95 ? 1 : 0;
  s = Math.max(s, Math.max(stem, head) * 0.92);
  return s;
};
/** 互動：兩個交疊的圓 */
export const MEET: Shade = (u, v) => {
  const a = disk(u, v, 0.38, 0.5, 0.27), b = disk(u, v, 0.62, 0.5, 0.27);
  return Math.max(0.1, a * 0.5 + b * 0.5 + a * b * 0.45);
};
/** 共好：一圈人圍著中心 */
export const RING: Shade = (u, v) => {
  let s = 0.08 + 0.18 * (1 - Math.hypot(u - 0.5, v - 0.5));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    s = Math.max(s, disk(u, v, 0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3, 0.1) * 0.9);
  }
  s = Math.max(s, disk(u, v, 0.5, 0.5, 0.13) * 0.55);
  return s;
};

/** 網點圖：w×h（頁面單位），格距 step；p＝顯影進度 0..1（網點由小到大長出來） */
export const Halftone: React.FC<{w: number; h: number; shade: Shade; step?: number; p?: number; ink: string}> = ({w, h, shade, step = 24, p = 1, ink}) => {
  const dots = useMemo(() => {
    const out: [number, number, number][] = [];
    const nx = Math.floor(w / step), ny = Math.floor(h / step);
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5) * step;
        if (x > w) continue;
        const y = (j + 0.5) * step;
        const r = Math.sqrt(shade(x / w, y / h)) * step * 0.62;
        if (r > 0.6) out.push([x, y, r]);
      }
    return out;
  }, [w, h, shade, step]);
  const pp = Math.round(p * 40) / 40; // 顯影進度分 40 階，同一階直接重用
  return useMemo(() => (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={dots.map(([x, y, r]) => `M${(x - r * pp).toFixed(1)},${y.toFixed(1)}a${(r * pp).toFixed(1)},${(r * pp).toFixed(1)} 0 1,0 ${(2 * r * pp).toFixed(1)},0a${(r * pp).toFixed(1)},${(r * pp).toFixed(1)} 0 1,0 ${(-2 * r * pp).toFixed(1)},0`).join('')} fill={ink} />
    </svg>
  ), [dots, pp, w, h, ink]);
};
