import React, {createContext, useContext} from 'react';
import {Easing, interpolate} from 'remotion';
import {loadFont as NotoSansTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as NotoSerifTC} from '@remotion/google-fonts/NotoSerifTC';
import {loadFont as LXGWWenKaiTC} from '@remotion/google-fonts/LXGWWenKaiTC';
import {loadFont as Orbitron} from '@remotion/google-fonts/Orbitron';
import {loadFont as Rajdhani} from '@remotion/google-fonts/Rajdhani';
import {loadFont as JetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as ShareTechMono} from '@remotion/google-fonts/ShareTechMono';
import {loadFont as IBMPlexMono} from '@remotion/google-fonts/IBMPlexMono';
import {loadFont as Montserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as Audiowide} from '@remotion/google-fonts/Audiowide';
import {loadFont as VT323} from '@remotion/google-fonts/VT323';
import {loadFont as Poppins} from '@remotion/google-fonts/Poppins';
import {loadFont as Inter} from '@remotion/google-fonts/Inter';
import {loadFont as Caveat} from '@remotion/google-fonts/Caveat';
import {loadFont as PressStart2P} from '@remotion/google-fonts/PressStart2P';
import {loadFont as Cinzel} from '@remotion/google-fonts/Cinzel';
import STYLES from './styles.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOADERS: Record<string, (style?: any, opts?: any) => {fontFamily: string}> = {
  NotoSansTC, NotoSerifTC, LXGWWenKaiTC, Orbitron, Rajdhani, JetBrainsMono, ShareTechMono, IBMPlexMono,
  Montserrat, Audiowide, VT323, Poppins, Inter, Caveat, PressStart2P, Cinzel,
};

export type StyleId = keyof typeof STYLES;
type Raw = (typeof STYLES)['cyber-neon'] & {letterbox?: boolean};

export type Theme = {
  id: string; name: string; bg: string; dark: boolean; c: Raw['c']; glow: number; radius: number;
  scanlines: boolean; transition: string; letterbox: boolean;
  f: {tc: string; num: string; en: string; mono: string};
  w: {tc: number; num: number; en: number}; // 各字型可用的最粗字重
};

const fontCache: Record<string, string> = {};
const load = (name: string, weights: string[]) => {
  const k = `${name}:${weights.join(',')}`;
  if (!fontCache[k]) fontCache[k] = LOADERS[name]('normal', {weights, ignoreTooManyRequestsWarning: true}).fontFamily;
  return fontCache[k];
};

export const makeTheme = (id: string): Theme => {
  const s = ((STYLES as unknown as Record<string, Raw>)[id] ?? (STYLES as unknown as Record<string, Raw>)["cyber-neon"]);
  const F = s.fonts as unknown as Record<'tc' | 'num' | 'en' | 'mono', [string, string[]]>;
  const maxW = (k: 'tc' | 'num' | 'en') => Math.max(...F[k][1].map(Number));
  return {
    id, name: s.name, bg: s.bg, dark: s.dark, c: s.c, glow: s.glow, radius: s.radius, scanlines: s.scanlines,
    transition: s.transition, letterbox: Boolean(s.letterbox),
    f: {tc: load(...F.tc), num: load(...F.num), en: load(...F.en), mono: load(...F.mono)},
    w: {tc: maxW('tc'), num: maxW('num'), en: maxW('en')},
  };
};

export const ThemeCtx = createContext<Theme>(null as unknown as Theme);
export const useTheme = () => useContext(ThemeCtx);
export const ThemeProvider: React.FC<{theme: Theme; children: React.ReactNode}> = ({theme, children}) => (
  <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>
);

/* ---------- 動畫小工具 ---------- */
export const ease = (f: number, delay = 0, dur = 15) =>
  interpolate(f, [delay, delay + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
export const easeIO = (f: number, delay = 0, dur = 15) =>
  interpolate(f, [delay, delay + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});

/** 依風格強度產生光暈；glow=0 的風格改用柔和陰影（亮色系） */
export const glowOf = (t: Theme, color: string, s = 1) => {
  const g = t.glow * s;
  if (g <= 0.01) return t.dark ? 'none' : '0 6px 24px rgba(0,0,0,0.10)';
  return `0 0 ${8 * g}px ${color}, 0 0 ${22 * g}px ${color}aa, 0 0 ${48 * g}px ${color}55`;
};
export const dropGlow = (t: Theme, color: string, px = 10) =>
  t.glow > 0.01 ? `drop-shadow(0 0 ${px * t.glow}px ${color})` : t.dark ? 'none' : 'drop-shadow(0 4px 10px rgba(0,0,0,0.15))';

export const STYLE_IDS = Object.keys(STYLES);
