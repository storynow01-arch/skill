/* 縱深隧道（來自「穿越網路線」）：往前衝的光環隧道、速度線、3D 投影、發光膠囊、全息標籤。
   proj(角度, 半徑, 深度z) → 螢幕座標；z 越小越近。 */
import React from 'react';
import {random} from 'remotion';

export const CENTER = {x: 960, y: 540};
export const proj = (ang: number, rad: number, z: number): [number, number] => [CENTER.x + (Math.cos(ang) * rad) / z, CENTER.y + (Math.sin(ang) * rad) / z];

export const Tunnel: React.FC<{f: number; speed: number; color: string; accent: string; rings?: number; lines?: number}> = ({f, speed, color, accent, rings = 22, lines = 46}) => (
  <svg width={1920} height={1080} style={{position: 'absolute'}}>
    {Array.from({length: rings}, (_, i) => {
      const z = (((i - f * speed) % rings) + rings) % rings + 0.35;
      return <circle key={i} cx={CENTER.x} cy={CENTER.y} r={760 / z} fill="none" stroke={i % 4 === 0 ? accent : color} strokeWidth={Math.max(1, 9 / z)} opacity={Math.min(0.9, 1.4 / z)} />;
    })}
    {Array.from({length: lines}, (_, i) => {
      const a = random(`sa${i}`) * Math.PI * 2, z = ((random(`sz${i}`) * 10 - f * speed * 1.6) % 10 + 10) % 10 + 0.4;
      const [x1, y1] = proj(a, 700, z), [x2, y2] = proj(a, 700, z + 0.5);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 ? color : accent} strokeWidth={Math.max(1, 4 / z)} opacity={Math.min(1, 1.2 / z)} />;
    })}
  </svg>
);

export const Capsule: React.FC<{x: number; y: number; s: number; label: string; color: string; textColor?: string; broken?: number; font?: string}> = (
  {x, y, s, label, color, textColor = '#020817', broken = 0, font = 'monospace'}) => (
  <div style={{position: 'absolute', left: x - 90 * s, top: y - 40 * s, width: 180 * s, height: 80 * s, borderRadius: 40 * s, background: `linear-gradient(90deg, ${color}, #fff4)`,
    boxShadow: `0 0 ${30 * s}px ${color}`, border: `${3 * s}px solid #fff`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - broken,
    transform: broken ? `scale(${1 + broken}) rotate(${broken * 40}deg)` : undefined}}>
    <span style={{fontFamily: font, fontWeight: 700, fontSize: 30 * s, color: textColor}}>{label}</span>
  </div>
);

/** 全息標籤：從左到右掃描出現 */
export const Holo: React.FC<{text: string; at: number; f: number; top: number; color: string; size?: number; font?: string}> = ({text, at, f, top, color, size = 54, font = 'sans-serif'}) => f < at ? null : (
  <div style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', opacity: Math.min(1, (f - at) / 8)}}>
    <span style={{fontFamily: font, fontWeight: 900, fontSize: size, color, padding: '8px 30px', border: `2px solid ${color}`, background: '#02081799',
      textShadow: `0 0 18px ${color}`, boxShadow: `0 0 24px ${color}55`, clipPath: f - at < 6 ? `inset(0 ${100 - (f - at) * 17}% 0 0)` : undefined}}>{text}</span>
  </div>
);
