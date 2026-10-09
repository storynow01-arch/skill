/* 廣A 的小零件：字型、字寬估算、文字、方塊、游標、打勾（圖示一律 5 單位筆畫、圓頭） */
import React from 'react';
import {loadFont as loadGeist} from '@remotion/google-fonts/Geist';
import {getInfo as tcInfo, loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import T from './timeline.json';

/* 中文字型只載入「文本實際用到的字」所在的子集（換文本自動跟著換） */
const parseRanges = (s: string): [number, number][] =>
  s.split(',').map((p) => {
    const [a, b] = p.trim().replace('U+', '').split('-');
    const lo = parseInt(a, 16);
    return [lo, b ? parseInt(b, 16) : lo];
  });
const ranges = tcInfo().unicodeRanges as Record<string, string>;
const codes = Array.from(new Set(Array.from(T.allText))).map((c) => c.codePointAt(0) as number);
const need = Object.keys(ranges).filter((key) => {
  const rs = parseRanges(ranges[key]);
  return codes.some((c) => rs.some(([lo, hi]) => c >= lo && c <= hi));
});
const g = loadGeist('normal', {weights: ['500', '600', '700'], subsets: ['latin']});
const tc = loadTC('normal', {weights: ['500', '700'], subsets: need as never[], ignoreTooManyRequestsWarning: true} as never);
export const FONT = `${g.fontFamily}, ${tc.fontFamily}, 'Segoe UI Symbol', sans-serif`;

export const INK = '#141312';
export const MUTE = '#8b867f';
export const LINE = '#E7E3DD';
export const STROKE = 5;

/** 字寬估算（跟 engine/timeline.py 的 tw() 同一套）：中文 1 字＝字級、英數約 0.55～0.64 字級 */
const cw = (c: string) => {
  const o = c.codePointAt(0) as number;
  if (o >= 0x2e80 || '…・，。！？「」：；（）'.includes(c)) return 1.0;
  if (c === ' ') return 0.28;
  if (".,:;/-·'|".includes(c)) return 0.35;
  if (/[A-Z0-9]/.test(c)) return 0.64;
  if (/[a-z]/.test(c)) return 0.55;
  return 0.6;
};
export const tw = (s: string, size: number, ls = 0) => Array.from(String(s)).reduce((a, c) => a + cw(c), 0) * size + ls * Array.from(String(s)).length;

export const gray = (L: number) => {
  const c = (x: number) => Math.round(Math.max(0, Math.min(255, x)));
  return `rgb(${c(L)},${c(L - 1.5)},${c(L - 3)})`;
};

/** 以座標原點為中心擺字；align：c＝置中、l＝左緣在 x、r＝右緣在 x */
export const Txt: React.FC<{
  x: number; y: number; size: number; w?: number; color?: string; align?: 'c' | 'l' | 'r'; ls?: number; style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({x, y, size, w = 700, color = INK, align = 'c', ls = 0, style, children}) => (
  <div
    style={{
      position: 'absolute', left: x, top: y, whiteSpace: 'nowrap', fontFamily: FONT, fontSize: size, fontWeight: w, color,
      lineHeight: 1, letterSpacing: ls,
      transform: `translate(${align === 'c' ? '-50%' : align === 'r' ? '-100%' : '0'}, -50%)`, ...style,
    }}
  >
    {children}
  </div>
);

/** 圓角方塊（以左上角定位） */
export const Box: React.FC<{x: number; y: number; w: number; h: number; r: number; bg: string; style?: React.CSSProperties; children?: React.ReactNode}> = ({
  x, y, w, h, r, bg, style, children,
}) => <div style={{position: 'absolute', left: x, top: y, width: Math.max(0, w), height: Math.max(0, h), borderRadius: r, background: bg, ...style}}>{children}</div>;

/** 游標（箭頭，黑底白邊）；尖端在 (0,0) */
export const Cursor: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <svg
    width={40} height={48} viewBox="-3 -3 40 48"
    style={{position: 'absolute', left: x - 3, top: y - 3, transform: `scale(${s})`, transformOrigin: '3px 3px', overflow: 'visible'}}
  >
    <path d="M0,0 L0,33 L8.5,25.5 L14.5,39 L20.5,36.3 L14.6,23.2 L26,23.2 Z" fill={INK} stroke="#fff" strokeWidth={2.6} strokeLinejoin="round" />
  </svg>
);

export const CheckPath: React.FC<{p: number; color: string; scale?: number}> = ({p, color, scale = 1}) => (
  <path
    d={`M ${-13 * scale} ${1 * scale} L ${-4 * scale} ${10 * scale} L ${14 * scale} ${-10 * scale}`}
    fill="none" stroke={color} strokeWidth={STROKE + 1} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
    strokeDasharray={1} strokeDashoffset={1 - p}
  />
);
