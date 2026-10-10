/* 廣N 小工具與故障元件（原作 import 的 ../kit 與 ad02/kit.tsx 搬進範本自己的 src）：
   緩動、彈簧、固定種子亂數、拍點脈衝、吃角子老虎數字 Roller；RGB 色版分離、切條撕裂、亂碼解碼、雪花、資料損壞色塊、十六進位資料流、錯誤視窗、分段進度條。
   所有動畫只由「格數」決定（不用 Math.random、Date、CSS 動畫）。 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, spring} from 'remotion';
import T from './timeline.json';
import {MONO} from './fonts';

export const W = 1920;
export const FPS = 30;
/** 一拍幾格（110 BPM＝16.36 格）、章內第 n 拍的格數 */
export const B: number = T.beat;
export const b = (n: number) => n * B;

/* ───── 緩動與進度 ───── */
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EI = Easing.bezier(0.7, 0, 0.84, 0); // 加速（抽走）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const LIN = (x: number) => x;
export const k = (t: number, a: number, b2: number, e: (x: number) => number = EO) => interpolate(t, [a, b2], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b2: number, p: number) => a + (b2 - a) * p;
/** 彈簧 0→1（t<at 時為 0） */
export const sp = (t: number, at: number, damping = 12, stiffness = 220, mass = 0.8) =>
  t < at ? 0 : spring({frame: t - at, fps: FPS, config: {damping, stiffness, mass}});
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
export const rnd01 = (seed: string | number) => random(seed);
/** 拍點脈衝：每拍開頭 1 → 拍內衰減到 0 */
export const pulse = (f: number, BB: number, decay = 0.35) => {
  const ph = (f % BB) / BB;
  return Math.max(0, 1 - ph / decay);
};
/** 拍點觸發：拍頭 1，w 格內衰減到 0（d 為相對某拍的格數） */
export const hit = (d: number, w = 4) => (d < 0 || d >= w ? 0 : 1 - d / w);

/* ───── 配色 ───── */
export const BG = '#1d1f2a';
export const BG2 = '#272b3c';
export const GRN = '#39ff88';
export const MAG = '#ff2bd6';
export const CYN = '#22e4ff';
export const WHT = '#f4f6ff';
export const RED = '#ff3b5c';
export const DIM = '#9aa0c4';
export const INK = '#141620';
export const abs: React.CSSProperties = {position: 'absolute'};

/* ───── 滾動數字：舊的往上滑出淡出、新的從下滑入淡入（不要逐格硬換數字） ───── */
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
        if (!/[0-9]/.test(ch)) return <span key={i} style={{display: 'inline-block', lineHeight: 1}}>{ch}</span>;
        const d = Number(ch);
        const L = lock[Math.min(di, lock.length - 1)];
        di++;
        const p = interpolate(t, [start, L], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <DigitCol key={i} w={p * (laps * 10 + d)} cw={cw} />;
      })}
    </span>
  );
};

/* ───── RGB 三色版分離：洋紅／青／紅三層錯位（screen 疊色），本色在上 ───── */
export const RGB: React.FC<{s: number; ang?: number; color?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({s, ang = 0, color = WHT, style, children}) => {
  const dx = Math.cos(ang) * s;
  const dy = Math.sin(ang) * s;
  const layer = (c: string, x: number, y: number, o = 1) => (
    <div style={{...abs, inset: 0, color: c, transform: `translate(${x}px,${y}px)`, mixBlendMode: 'screen', opacity: o}}>{children}</div>
  );
  return (
    <div style={{position: 'relative', ...style}}>
      {s > 0.4 && (
        <>
          {layer(MAG, dx, dy)}
          {layer(CYN, -dx, -dy)}
          {layer(RED, dy * 0.7, dx * 0.5, 0.8)}
        </>
      )}
      <div style={{position: 'relative', color}}>{children}</div>
    </div>
  );
};

/* ───── 橫向切條位移：內容切成 n 條，各條 translateX 不同 ───── */
export const Slices: React.FC<{n: number; amt: number; seed: string | number; style?: React.CSSProperties; children: React.ReactNode}> = ({n, amt, seed, style, children}) => {
  if (Math.abs(amt) < 0.5) return <div style={{position: 'relative', ...style}}>{children}</div>;
  const cuts = [0];
  for (let i = 1; i < n; i++) cuts.push(Math.min(1, Math.max(0, i / n + (rnd(`${seed}c${i}`) * 0.4) / n)));
  cuts.push(1);
  return (
    <div style={{position: 'relative', ...style}}>
      <div style={{visibility: 'hidden'}}>{children}</div>
      {cuts.slice(0, -1).map((c0, j) => {
        const r = rnd(`${seed}:${j}`);
        const x = Math.abs(r) > 0.4 ? r * amt : r * amt * 0.12;
        return (
          <div key={j} style={{...abs, inset: 0, clipPath: `inset(${c0 * 100}% 0 ${(1 - cuts[j + 1]) * 100}% 0)`, transform: `translateX(${x.toFixed(1)}px)`}}>
            {children}
          </div>
        );
      })}
    </div>
  );
};

/* ───── 亂碼解碼：鎖定前隨機字、鎖定後固定（字池要跟 timeline.py 的 CJK_POOL、LAT_POOL 一致，字型才會載到） ───── */
const GLY = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&@$*?<>/=+';
const CJKP = '訊號解碼錯誤資料損壞系統重啟傳輸頻道載入緩衝封包節點掃描同步';
const isCJK = (c: string) => /[㐀-鿿]/.test(c);
export const glyph = (c: string, seed: string) => {
  const pool = isCJK(c) ? CJKP : GLY;
  return pool[Math.floor(rnd01(seed) * pool.length) % pool.length];
};
const SKIP = /[\s　・·，。、：；！？（）「」()…～~]/;
export const Dec: React.FC<{text: string; t: number; start: number; step?: number; pre?: number; seed: string; col?: string; locks?: number[]; rate?: number; cell?: number}> = ({
  text, t, start, step = 2, pre = 6, seed, col = GRN, locks, rate = 2, cell,
}) => {
  const box = (i: number, c: React.ReactNode, st?: React.CSSProperties) => (
    <span key={i} style={{display: cell ? 'inline-block' : undefined, width: cell ? `${cell}em` : undefined, textAlign: 'center', ...st}}>{c}</span>
  );
  return (
    <>
      {Array.from(text).map((c, i) => {
        const L = locks ? locks[Math.min(i, locks.length - 1)] : start + i * step;
        if (SKIP.test(c)) return box(i, c, t < start - pre ? {opacity: 0} : undefined);
        if (t >= L) return box(i, c);
        if (t < start - pre) return box(i, c, {opacity: 0});
        return box(i, glyph(c, `${seed}:${i}:${Math.floor(t / rate)}`), {color: col, opacity: 0.9});
      })}
    </>
  );
};

/* ───── 雪花雜訊：小張 SVG 紋理只算一次，每格換位置 ───── */
const NOISE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer><feFuncA type='linear' slope='1.4'/></feComponentTransfer></filter><rect width='256' height='256' filter='url(#n)'/></svg>`;
const NOISE = `url("data:image/svg+xml;utf8,${encodeURIComponent(NOISE_SVG)}")`;
/** 下方 180px 淡出，避免底部快速變化 */
export const TOPMASK: React.CSSProperties = {
  maskImage: 'linear-gradient(to bottom, #000 0, #000 800px, transparent 880px)',
  WebkitMaskImage: 'linear-gradient(to bottom, #000 0, #000 800px, transparent 880px)',
};
export const Snow: React.FC<{f: number; o: number}> = ({f, o}) =>
  o <= 0.01 ? null : (
    <AbsoluteFill
      style={{
        backgroundImage: NOISE, backgroundSize: '512px 512px', imageRendering: 'pixelated',
        backgroundPosition: `${Math.floor(rnd01(`sx${f}`) * 512)}px ${Math.floor(rnd01(`sy${f}`) * 512)}px`,
        opacity: o, ...TOPMASK,
      }}
    />
  );

/* ───── 資料損壞色塊（datamosh） ───── */
const MOSHC = [GRN, MAG, CYN, WHT, '#5a4cff', BG2];
export const Mosh: React.FC<{f: number; n: number; amt: number; seed: string; y0?: number; y1?: number; rate?: number}> = ({f, n, amt, seed, y0 = 60, y1 = 840, rate = 2}) => {
  if (amt <= 0.02) return null;
  const q = Math.floor(f / rate);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {Array.from({length: n}, (_, j) => {
        const s = `${seed}${q}_${j}`;
        if (rnd01(s + 'v') > amt) return null;
        const w = 30 + rnd01(s + 'w') * 320;
        const h = 6 + rnd01(s + 'h') * 46;
        const x = rnd01(s + 'x') * (W - w);
        const y = y0 + rnd01(s + 'y') * (y1 - y0 - h);
        const c = MOSHC[Math.floor(rnd01(s + 'c') * MOSHC.length)];
        const smear = rnd01(s + 'm') > 0.5;
        return (
          <div key={j} style={{
            ...abs, left: x, top: y, width: w, height: h, opacity: 0.25 + rnd01(s + 'o') * 0.5,
            background: smear ? `repeating-linear-gradient(90deg, ${c} 0 6px, transparent 6px 11px)` : c,
          }} />
        );
      })}
    </AbsoluteFill>
  );
};

/* ───── 背景資料流（十六進位字串，慢慢往上捲） ───── */
export const HexBG: React.FC<{t: number; seed: string; o?: number; color?: string}> = ({t, seed, o = 0.1, color = GRN}) => (
  <AbsoluteFill style={{overflow: 'hidden', opacity: o, ...TOPMASK}}>
    {Array.from({length: 9}, (_, c) => (
      <div key={c} style={{...abs, left: 40 + c * 214, top: -((t * (0.6 + (c % 3) * 0.25)) % 120) - 20, fontFamily: MONO, fontSize: 28, lineHeight: '40px', color, whiteSpace: 'pre'}}>
        {Array.from({length: 26}, (_, r) => {
          const v = Math.floor(rnd01(`${seed}${c}_${r}`) * 0xffffffff);
          return <div key={r}>{v.toString(16).toUpperCase().padStart(8, '0').replace(/(.{4})/, '$1 ')}</div>;
        })}
      </div>
    ))}
  </AbsoluteFill>
);

/* ───── 錯誤視窗 ───── */
export const Win: React.FC<{x: number; y: number; w: number; title: React.ReactNode; tc: string; style?: React.CSSProperties; children: React.ReactNode}> = ({x, y, w, title, tc, style, children}) => (
  <div style={{...abs, left: x, top: y, width: w, background: 'rgba(36,39,56,0.95)', border: `3px solid ${tc}`, boxShadow: `10px 10px 0 rgba(10,10,20,0.35), 0 0 40px ${tc}40`, ...style}}>
    <div style={{height: 54, background: tc, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px', fontFamily: MONO, fontWeight: 700, fontSize: 28, color: INK, whiteSpace: 'nowrap', overflow: 'hidden'}}>
      <span>{title}</span>
      <span style={{letterSpacing: 6}}>_ x</span>
    </div>
    <div style={{padding: '22px 28px'}}>{children}</div>
  </div>
);

/** 分段進度條 */
export const Bar: React.FC<{p: number; n?: number; c?: string; w?: number; h?: number}> = ({p, n = 24, c = GRN, w = 600, h = 26}) => {
  const fill = Math.floor(Math.max(0, Math.min(1, p)) * n + 0.0001);
  return (
    <div style={{display: 'flex', gap: 4, width: w, height: h, padding: 4, border: `2px solid ${c}`, flexShrink: 0}}>
      {Array.from({length: n}, (_, i) => <div key={i} style={{flex: 1, background: i < fill ? c : 'transparent', opacity: i < fill ? 1 : 0.15}} />)}
    </div>
  );
};

/** 每一章拿到的資料（timeline.py 的 chapters[i]；欄位依章型不同） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Chap = {type: string; label: string; from: number; to: number; nb: number; beat: number} & Record<string, any>;
export type ChP = {t: number; f: number; c: Chap; i: number};
export const LAB = T.d.labels as Record<string, string>;
