/* 等角世界（來自「物流中心模擬器」）：世界座標 (x, y, z) → 螢幕；IsoBox 畫三個可見面。
   用法：
     const W = makeIso({ox: 800, oy: 170, s: 72});
     <svg width={1920} height={1080}><W.Ground x0={-2} y0={-2} x1={16} y1={12} color="#BFE3C8" />
       <W.Box x={0} y={1} w={3} d={7} h={2} color="#5B8DEF" label="倉庫 A" /></svg>
   技巧：先畫遠的（x+y 小）再畫近的；主體要佔畫面 70% 以上（調 s 與 ox/oy）。 */
import React from 'react';

export const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c * k)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
};
const pts = (a: [number, number][]) => a.map((p) => p.join(',')).join(' ');

export const makeIso = ({ox = 960, oy = 300, s = 60, ink = '#2D3A4A', font = 'sans-serif'} = {}) => {
  const iso = (x: number, y: number, z = 0): [number, number] => [ox + (x - y) * s * 0.866, oy + (x + y) * s * 0.5 - z * s];
  const Box: React.FC<{x: number; y: number; z?: number; w: number; d: number; h: number; color: string; label?: string; lsize?: number; opacity?: number}> = (
    {x, y, z = 0, w, d, h, color, label, lsize = 22, opacity = 1}) => {
    const top = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
    const left = [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
    const right = [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)];
    const [cx, cy] = iso(x + w / 2, y + d / 2, z + h);
    return (
      <g opacity={opacity}>
        <polygon points={pts(left)} fill={shade(color, 0.78)} stroke={ink} strokeWidth={2} />
        <polygon points={pts(right)} fill={shade(color, 0.62)} stroke={ink} strokeWidth={2} />
        <polygon points={pts(top)} fill={color} stroke={ink} strokeWidth={2} />
        {label && <text x={cx} y={cy + lsize * 0.35} textAnchor="middle" fontFamily={font} fontWeight={900} fontSize={lsize} fill={ink}>{label}</text>}
      </g>
    );
  };
  const Ground: React.FC<{x0: number; y0: number; x1: number; y1: number; color: string}> = ({x0, y0, x1, y1, color}) =>
    <polygon points={pts([iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)])} fill={color} />;
  /** 平鋪在地面上的帶狀物（道路、輸送帶） */
  const Strip: React.FC<{x0: number; y0: number; x1: number; y1: number; color: string; opacity?: number}> = ({x0, y0, x1, y1, color, opacity = 1}) =>
    <polygon points={pts([iso(x0, y0), iso(x1, y0), iso(x1, y1), iso(x0, y1)])} fill={color} opacity={opacity} />;
  return {iso, Box, Ground, Strip};
};
