/* 手繪描線（來自「創客手稿」）：文字與路徑逐筆畫出、鉛筆、紙張背景。放在 <svg> 內使用。
   <DrawText x y text size font color start dur f />   先描外框再填色
   <DrawPath d start dur f color w len />               len 要 ≥ 路徑實際長度 */
import React from 'react';
import {Easing, interpolate} from 'remotion';

const io = Easing.inOut(Easing.cubic);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...clamp, easing: io});

export const DrawText: React.FC<{x: number; y: number; text: string; size: number; font: string; color: string; start: number; dur: number; f: number; weight?: number}> = (
  {x, y, text, size, font, color, start, dur, f, weight = 700}) => {
  const p = prog(f, start, start + dur);
  const fill = prog(f, start + dur * 0.6, start + dur + 8);
  return <text x={x} y={y} fontFamily={font} fontWeight={weight} fontSize={size} fill={color} fillOpacity={fill} stroke={color} strokeWidth={2.2}
    strokeDasharray={3000} strokeDashoffset={3000 * (1 - p)} style={{opacity: p > 0 ? 1 : 0}}>{text}</text>;
};

export const DrawPath: React.FC<{d: string; start: number; dur: number; f: number; color?: string; w?: number; len?: number}> = (
  {d, start, dur, f, color = '#23324A', w = 5, len = 1200}) => {
  const p = prog(f, start, start + dur);
  return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={len} strokeDashoffset={len * (1 - p)} opacity={p > 0 ? 1 : 0} />;
};

export const Pencil: React.FC<{x: number; y: number; ink?: string}> = ({x, y, ink = '#23324A'}) => (
  <g transform={`translate(${x} ${y}) rotate(-35)`}>
    <rect x={0} y={-9} width={150} height={18} fill="#F2B233" stroke={ink} strokeWidth={2} />
    <polygon points="0,-9 -26,0 0,9" fill="#F5D7A1" stroke={ink} strokeWidth={2} />
    <polygon points="-18,-3 -26,0 -18,3" fill={ink} />
    <rect x={150} y={-9} width={20} height={18} fill="#E58FA0" stroke={ink} strokeWidth={2} />
  </g>
);

/** 方格筆記紙（div 背景用） */
export const paperStyle = (paper = '#FBF8F1', grid = '#cfdcf0', size = 50): React.CSSProperties => ({
  background: paper, backgroundImage: `linear-gradient(${grid} 1.5px, transparent 1.5px), linear-gradient(90deg, ${grid} 1.5px, transparent 1.5px)`,
  backgroundSize: `${size}px ${size}px`,
});
