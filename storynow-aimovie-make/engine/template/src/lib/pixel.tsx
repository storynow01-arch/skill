/* 像素遊戲元件（來自「闖關遊戲」）：精靈角色、像素字、像素框、金幣噴發、RPG 對話框、像素溶解轉場。
   時間一律量化（step）才有 8-bit 感；座標量化成 8px。 */
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

export const step = (f: number, n = 2) => Math.floor(f / n) * n;
export const q8 = (v: number) => Math.round(v / 8) * 8;
export const PIX = {ink: '#1A1C2C', white: '#F4F4F4', gold: '#FFCD75', blue: '#41A6F6', green: '#A7F070', red: '#EF7D57', dark: '#333C57'};

/** 字元地圖精靈：'.' 透明，其餘字元查 palette */
export const Sprite: React.FC<{map: string[]; palette: Record<string, string>; x: number; y: number; s?: number}> = ({map, palette, x, y, s = 8}) => (
  <div style={{position: 'absolute', left: x, top: y}}>
    {map.map((row, r) => row.split('').map((ch, c) => ch === '.' ? null : (
      <div key={`${r}-${c}`} style={{position: 'absolute', left: c * s, top: r * s, width: s, height: s, background: palette[ch]}} />)))}
  </div>
);
export const HERO = ['...11111....', '..1111111...', '..2222222...', '..2262262...', '..2222222...', '...22222....', '..3333333...',
  '.333333333..', '.2.33333.2..', '...33333....', '...44.44....', '...44.44....', '..55..55....'];
export const HERO_WALK = [...HERO.slice(0, 10), '...44.44....', '..44...44...', '.55.....55..'];
export const HERO_PAL: Record<string, string> = {'1': '#5A3A2E', '2': '#FFD2A8', '3': PIX.blue, '4': '#29366F', '5': '#1A1C2C', '6': '#1A1C2C'};

export const PixText: React.FC<{children: React.ReactNode; size: number; font: string; color?: string; style?: React.CSSProperties}> = ({children, size, font, color = PIX.white, style}) => (
  <div style={{fontFamily: font, fontWeight: 900, fontSize: size, color, lineHeight: 1.3, textShadow: `${Math.max(3, size / 14)}px ${Math.max(3, size / 14)}px 0 ${PIX.ink}`, ...style}}>{children}</div>
);
export const PixBox: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({children, color = PIX.white, style}) => (
  <div style={{background: PIX.dark, border: `8px solid ${color}`, boxShadow: '10px 10px 0 #000', ...style}}>{children}</div>
);

/** 第 at 格噴出金幣（重力、量化） */
export const Coins: React.FC<{at: number; x: number; y: number; n?: number}> = ({at, x, y, n = 8}) => {
  const f = useCurrentFrame(); const d = step(f - at);
  if (d < 0 || d > 22) return null;
  return <>{Array.from({length: n}, (_, k) => {
    const vx = (random(`c${at}${k}`) - 0.5) * 22, vy = -14 - random(`v${at}${k}`) * 10;
    return <div key={k} style={{position: 'absolute', left: q8(x + vx * d), top: q8(y + vy * d + 0.9 * d * d), width: 22, height: 22, background: PIX.gold,
      border: `4px solid ${PIX.ink}`, opacity: 1 - d / 22}} />;
  })}</>;
};

/** RPG 對話框：名牌＋逐字打出 */
export const RpgDialog: React.FC<{name: string; text: string; from: number; to: number; font: string}> = ({name, text, from, to, font}) => {
  const f = useCurrentFrame();
  if (f < from || f > to + 8) return null;
  const chars = Array.from(text);
  const shown = chars.slice(0, Math.ceil(chars.length * Math.min(1, (f - from) / Math.max(1, (to - from) * 0.8)))).join('');
  return (
    <div style={{position: 'absolute', left: 200, right: 200, bottom: 34, height: 120, background: PIX.ink, border: `8px solid ${PIX.white}`, boxShadow: '10px 10px 0 #000',
      display: 'flex', alignItems: 'center', padding: '0 40px'}}>
      <div style={{position: 'absolute', left: 30, top: -38, background: PIX.blue, border: `6px solid ${PIX.white}`, padding: '2px 18px'}}><PixText size={22} font={font}>{name}</PixText></div>
      <PixText size={40} font={font}>{shown}</PixText>
    </div>
  );
};

/** 像素溶解：p 0→1 蓋住、1→0 掀開 */
export const PixelDissolve: React.FC<{p: number; color?: string; cols?: number; rows?: number}> = ({p, color = PIX.ink, cols = 24, rows = 14}) => p <= 0 ? null : (
  <AbsoluteFill style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`}}>
    {Array.from({length: cols * rows}, (_, i) => <div key={i} style={{background: color, opacity: random(`pd${i}`) < p ? 1 : 0}} />)}
  </AbsoluteFill>
);
