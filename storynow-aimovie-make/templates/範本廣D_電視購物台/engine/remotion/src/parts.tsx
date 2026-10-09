/* 廣D 共用小零件：字型、配色、綜藝立體字、爆炸星、定位、殘影、對白泡泡（原作：02_試做/廣告30風格 第 19 支） */
import React from 'react';
import {loadFont as loadReggae} from '@remotion/google-fonts/ReggaeOne';
import {getInfo as notoInfo, loadFont as loadNoto} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {rnd} from './kit';
import T from './timeline.json';

/* 綜藝字 Reggae One 是日文字型，換文本時一定會遇到缺的繁體字：字型串接 Noto Sans TC 900，缺的字自動退回（原作是手動列出缺字）。
   中文字型只載入文本用到的字所在子集。 */
const parseRanges = (s: string): [number, number][] =>
  s.split(',').map((p) => {
    const [a, b] = p.trim().replace('U+', '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
const codes = Array.from(new Set(Array.from(T.allText))).map((c) => c.codePointAt(0) as number);
const ranges = notoInfo().unicodeRanges as Record<string, string>;
const need = Object.keys(ranges).filter((key) => parseRanges(ranges[key]).some(([lo, hi]) => codes.some((c) => c >= lo && c <= hi)));
const REG0 = loadReggae().fontFamily;
const NOTO0 = loadNoto('normal', {weights: ['900'], subsets: need as never[], ignoreTooManyRequestsWarning: true} as never).fontFamily;
export const NOTO = `'${NOTO0}'`;
export const REG = `'${REG0}', '${NOTO0}'`;
export const ANTON = `'${loadAnton().fontFamily}', '${NOTO0}'`;
export const Y = '#ffe600';
export const RED = '#ff1e1e';
export const BLUE = '#1e4dff';
export const GRN = '#39ff14';
export const INK = '#1a1030';
export const GOLD = '#ffc21a';
export const WHITE = '#ffffff';

/** 原作的缺字處理；現在字型串接自動退回，保留這個函式只為了相容 */
export const R = (s: string) => s;

/** 綜藝立體字：多層位移疊字當擠出＋粗外框＋斜體（不用 text-shadow） */
export const Pop: React.FC<{
  size: number; fill?: string; stroke?: string; ext?: string; depth?: number; font?: string; skew?: number; sw?: number; weight?: number;
  grad?: string; style?: React.CSSProperties; children: React.ReactNode;
}> = ({size, fill = Y, stroke = INK, ext = RED, depth = 6, font = REG, skew = 9, sw, weight = 400, grad, style, children}) => {
  const s = sw ?? Math.max(5, size * 0.075);
  const dx = size * 0.012, dy = size * 0.017;
  const base: React.CSSProperties = {position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap'};
  return (
    <div style={{position: 'relative', display: 'inline-block', fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.12, transform: `skewX(${-skew}deg)`, whiteSpace: 'nowrap', ...style}}>
      {Array.from({length: depth}, (_, j) => {
        const i = depth - j;
        const last = i === depth;
        return (
          <div key={i} style={{...base, transform: `translate(${i * dx}px,${i * dy}px)`, color: last ? INK : ext, WebkitTextStroke: `${last ? s * 1.5 : s}px ${last ? INK : ext}`}}>
            {children}
          </div>
        );
      })}
      <div style={{...base, color: stroke, WebkitTextStroke: `${s}px ${stroke}`}}>{children}</div>
      <div style={{position: 'relative', color: fill, ...(grad ? {background: grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'} : {})}}>{children}</div>
    </div>
  );
};

/** 多角爆炸星（決定性鋸齒） */
export const burstD = (n: number, r1: number, r2: number, seed: string) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = (i % 2 === 0 ? r1 : r2) * (1 + rnd(seed + i) * 0.07);
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
  }
  return d + 'Z';
};
export const Burst: React.FC<{r: number; n?: number; fill: string; fill2?: string; seed?: string; rot?: number; sw?: number}> = ({r, n = 16, fill, fill2, seed = 'b', rot = 0, sw = 10}) => {
  const P = r + 30;
  return (
    <svg width={P * 2} height={P * 2} style={{position: 'absolute', left: `calc(50% - ${P}px)`, top: `calc(50% - ${P}px)`, overflow: 'visible'}}>
      <g transform={`translate(${P},${P}) rotate(${rot})`}>
        <path d={burstD(n, r, r * 0.74, seed)} fill={INK} transform="translate(10,14)" />
        <path d={burstD(n, r, r * 0.74, seed)} fill={fill} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        {fill2 && <path d={burstD(n, r * 0.84, r * 0.62, seed + 'i')} fill={fill2} transform={`rotate(${180 / n})`} />}
      </g>
    </svg>
  );
};

/** 以中心點定位 */
export const At: React.FC<{x: number; y: number; s?: number; r?: number; o?: number; children: React.ReactNode; z?: number}> = ({x, y, s = 1, r = 0, o = 1, children, z}) =>
  o <= 0.001 || s <= 0.001 ? null : (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${s}) rotate(${r}deg)`, opacity: Math.min(1, o), zIndex: z}}>{children}</div>
  );

/** 簡易動態模糊：往回畫 n 層逐漸透明的殘影（不用 blur 濾鏡） */
export const Ghosts: React.FC<{f: number; on: boolean; render: (ff: number) => React.ReactNode; n?: number; step?: number}> = ({f, on, render, n = 4, step = 1.2}) => (
  <>
    {on &&
      Array.from({length: n}, (_, j) => {
        const i = n - j;
        return (
          <div key={i} style={{position: 'absolute', inset: 0, opacity: 0.34 * (1 - (i - 1) / n)}}>
            {render(f - i * step)}
          </div>
        );
      })}
    {render(f)}
  </>
);

/** 四角閃光星芒（小面積） */
export const Sparkle: React.FC<{x: number; y: number; s: number; c?: string}> = ({x, y, s, c = WHITE}) =>
  s <= 0.02 ? null : (
    <svg width={80} height={80} style={{position: 'absolute', left: x - 40, top: y - 40, transform: `scale(${s})`, overflow: 'visible'}}>
      <path d="M40,0 Q44,36 80,40 Q44,44 40,80 Q36,44 0,40 Q36,36 40,0Z" fill={c} />
      <circle cx={40} cy={40} r={6} fill={WHITE} />
    </svg>
  );

/** 對白泡泡 */
export const Bubble: React.FC<{text: string; size?: number}> = ({text, size = 54}) => (
  <div style={{position: 'relative', background: WHITE, border: `7px solid ${INK}`, borderRadius: 60, padding: '12px 34px', fontFamily: REG, fontSize: size, color: INK, whiteSpace: 'nowrap', lineHeight: 1.15}}>
    {R(text)}
    <svg width={60} height={50} style={{position: 'absolute', left: '50%', bottom: -44, marginLeft: -30, overflow: 'visible'}}>
      <path d="M8,0 L30,44 L44,0" fill={WHITE} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
      <rect x={4} y={-8} width={44} height={10} fill={WHITE} />
    </svg>
  </div>
);
