/* 廣L 新創快剪：共用（配色、細線格背景、噪點、游標、甩鏡殘影、鏡頭重擊、小標、SVG 箭頭）。
   時間全部讀 timeline.json 的 marks（timeline.py 依內容排好）。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {EIO, k} from './kit';
import {GE, TC} from './fonts';
import T from './timeline.json';

export {GE, TC};
/* timeline.json 的形狀依內容而變（例如某段省略時是空陣列），所以這裡明寫型別，不靠 JSON 推斷 */
type Data = {
  brand: {mark: string; name: string};
  input: {prompt: string; size: number; placeholder: string; hint: string; enter: string};
  hero: {lines: string[]; size: number; sub: string; subEm: string; subSize: number; kicker: string};
  drop: {tag: string; items: {n: string; unit: string; unitSize: number; label: string; labelSize: number; bigSize: number; en: string; w: number}[]; size: number; line: string; lineSize: number};
  cards: {tag: string; title: string; titleEm: string; titleSize: number; items: {tag: string; name: string; size: number; en: string; desc: string; hook: string}[]};
  metrics: {
    tag: string;
    items: {kind: 'ring' | 'swap'; tag: string; prefix: string; value: string; unit: string; size: number; pct: number; from: string; fromSize: number;
      label: string; labelSize: number; note: string; noteSize: number}[];
  };
  features: {label: string; items: {tag: string; title: string; titleSize: number; sub: string; subSize: number; vis: string; icon: string; route: string[]; checks: string[]}[]};
  cta: {name: string; nameSize: number; slogan: string; sloganSize: number; button: string; buttonSize: number; url: string; urlSize: number};
};
export const D = T.d as unknown as Data;
type Marks = {
  enter: number; hero1: number; hero2: number; heroSub: number; b: number[]; dive: number; drop: number; n: number[];
  rail?: number; focus?: number[]; m?: number[]; zero?: (number | null)[]; locks?: number[][]; f?: number[];
  cta: number; click: number; url: number; end: number;
};
export const MK = T.marks as unknown as Marks;
export const B = T.beatFrames; // 15

/** 每段的開始格：DROP 之後接的是哪一段、指標牆之後接哪一段 */
export const AFTER_DROP = MK.rail ?? MK.m?.[0] ?? MK.f?.[0] ?? MK.cta;
export const AFTER_METRICS = MK.f?.[0] ?? MK.cta;
export const AFTER_RAIL = MK.m?.[0] ?? MK.f?.[0] ?? MK.cta;

/* 配色：一個品牌主色＋中性灰階 */
export const C = {
  paper: '#F3F3EF',
  ink: '#0D0E12',
  gray: '#6B6F7A',
  line: 'rgba(13,14,18,0.07)',
  line2: 'rgba(13,14,18,0.14)',
  brand: '#2B4BFF',
  brandLt: '#7C93FF',
  dark: '#23262E',
  white: '#FFFFFF',
};

/* ───── 細線格背景（位移由外部給，背景比前景早先動） ───── */
export const Grid: React.FC<{x: number; y: number; color: string; major?: string; size?: number}> = ({x, y, color, major, size = 80}) => {
  const ox = ((x % size) + size) % size;
  const oy = ((y % size) + size) % size;
  const M = size * 4;
  const mx = ((x % M) + M) % M;
  const my = ((y % M) + M) % M;
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(to right, ${color} 1px, transparent 1px), linear-gradient(to bottom, ${color} 1px, transparent 1px)` +
          (major ? `, linear-gradient(to right, ${major} 1px, transparent 1px), linear-gradient(to bottom, ${major} 1px, transparent 1px)` : ''),
        backgroundSize: `${size}px ${size}px, ${size}px ${size}px` + (major ? `, ${M}px ${M}px, ${M}px ${M}px` : ''),
        backgroundPosition: `${ox}px ${oy}px, ${ox}px ${oy}px` + (major ? `, ${mx}px ${my}px, ${mx}px ${my}px` : ''),
      }}
    />
  );
};

/* ───── 靜態噪點（固定 seed、不隨格數改變） ───── */
export const Noise: React.FC<{opacity?: number}> = ({opacity = 0.05}) => (
  <AbsoluteFill style={{opacity, mixBlendMode: 'multiply', pointerEvents: 'none'}}>
    <svg width="1920" height="1080">
      <filter id="adLn">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="1920" height="1080" filter="url(#adLn)" />
    </svg>
  </AbsoluteFill>
);

/* ───── 游標（箭頭）：press 0..1 按下 ───── */
export const Cursor: React.FC<{x: number; y: number; press?: number; color?: string; scale?: number}> = ({x, y, press = 0, color = C.ink, scale = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `scale(${scale * (1 - press * 0.15)})`, transformOrigin: '0 0'}}>
    <svg width="54" height="64" viewBox="0 0 27 32" style={{overflow: 'visible'}}>
      <path d="M2 1 L2 25 L8.5 19 L12.6 29 L16.6 27.3 L12.6 17.8 L21.5 17.8 Z" fill={color} stroke={color === C.ink ? '#fff' : C.ink} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  </div>
);

/** SVG 箭頭（字型不一定有 ↑ → ⏎，一律畫出來）：dir 'up' | 'right' | 'enter' */
export const Arrow: React.FC<{dir: 'up' | 'right' | 'enter'; size: number; color: string; stroke?: number}> = ({dir, size, color, stroke = 2.2}) => {
  const d = dir === 'up' ? 'M12 20 L12 4 M5 11 L12 4 L19 11' : dir === 'right' ? 'M4 12 L20 12 M13 5 L20 12 L13 19' : 'M20 4 L20 14 L5 14 M10 9 L5 14 L10 19';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
      <path d={d} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ───── 甩鏡：一段鏡頭的進場／出場水平位移（都往左） ───── */
export const WHIP = 520;
export const shotX = (f: number, from: number, to: number, inLen = 9, outLen = 6, dist = WHIP) => {
  const pin = k(f, from, from + inLen);
  const pout = k(f, to - outLen, to, (x) => x * x * x);
  return (1 - pin) * dist - pout * dist;
};
/** 殘影：位移速度大時，畫 3 層逐漸透明的殘影（不用 blur） */
export const Ghosted: React.FC<{x: number; v: number; y?: number; vy?: number; children: React.ReactNode}> = ({x, v, y = 0, vy = 0, children}) => {
  const fast = Math.abs(v) + Math.abs(vy) > 10;
  return (
    <>
      {fast &&
        [3, 2, 1].map((i) => (
          <AbsoluteFill key={i} style={{transform: `translate(${x + v * i * 0.45}px, ${y + vy * i * 0.45}px)`, opacity: 0.09 * (4 - i)}}>
            {children}
          </AbsoluteFill>
        ))}
      <AbsoluteFill style={{transform: `translate(${x}px, ${y}px)`}}>{children}</AbsoluteFill>
    </>
  );
};

/** 鏡頭重擊：在 at 格推一下，0..1 衰減 */
export const punch = (f: number, ats: number[], amt = 0.05, len = 10) => {
  let s = 0;
  for (const a of ats) if (f >= a && f < a + len) s = Math.max(s, amt * (1 - k(f, a, a + len)));
  return 1 + s;
};

/** 背景網格位移：每個轉場往左（或往上）推，背景比前景早 lead 格 */
export const gridPos = (f: number) => {
  const lead = 5;
  const g = f + lead;
  let x = -g * 0.8;
  for (const h of T.slides) x -= 240 * k(g, h - 6, h + 6, EIO);
  let y = 0;
  for (const h of T.vslides) y -= 300 * k(g, h - 8, h + 8, EIO);
  return {x, y};
};

/** 小標籤（英文大寫字距＋中文） */
export const Tag: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({children, color = C.gray, style}) => (
  <div style={{fontFamily: GE, fontWeight: 400, fontSize: 28, letterSpacing: '0.14em', color, textTransform: 'uppercase', whiteSpace: 'nowrap', ...style}}>{children}</div>
);

/** 逐字遮罩上推（拍點上砸出來） */
export const CharsUp: React.FC<{text: string; f: number; at: number; stagger?: number; dur?: number; style?: React.CSSProperties; color?: string}> = ({text, f, at, stagger = 2, dur = 10, style, color}) => (
  <div style={{display: 'flex', whiteSpace: 'pre', ...style}}>
    {Array.from(text).map((ch, i) => {
      const p = k(f, at + i * stagger, at + i * stagger + dur);
      return (
        <span key={i} style={{display: 'inline-block', overflow: 'hidden', padding: '0.06em 0', margin: '-0.06em 0'}}>
          <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * 105}%)`, color, whiteSpace: 'pre'}}>{ch}</span>
        </span>
      );
    })}
  </div>
);
