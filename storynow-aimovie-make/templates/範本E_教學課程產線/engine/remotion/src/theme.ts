/** 設計 token。逆向自實測，數值來源見 00_規範/styles/garychen-dark/
 *
 *  本專案只用 garychen-dark 這一種風格。
 *  曾經試作過的杉本白板風與 PAPAYA Light 已整個移出，
 *  連同規格、元件、試片放在 10_風格實驗_未採用/，與這裡沒有任何引用關係。
 */

export type StyleName = 'garychen-dark';

type Palette = {
  bg: string; surface: string; card: string; high: string; border: string;
  primary: string; primaryDim: string; glow: string;
  success: string; secondary: string; danger: string;
  text: string; body: string; muted: string; faint: string;
  subtitleBg: string; subtitleText: string;
};

const PALETTES: Record<StyleName, Palette> = {
  /** GaryChen Dark — 兩支參考片交叉驗證 */
  'garychen-dark': {
    bg: '#181818', surface: '#202020', card: '#282828', high: '#303030', border: '#383838',
    primary: '#F89800', primaryDim: '#A06810', glow: 'rgba(248,152,0,0.18)',
    success: '#20C058', secondary: '#604098', danger: '#E05252',
    // muted 2026-10-04 由 #8A8A8A 調亮：在卡片底 #282828 上只有 4.28:1，未達 WCAG AA 4.5:1；#9A9A9A＝5.25:1
    // faint 只用於裝飾線條，不再用於文字（對比僅 2.3～2.8:1）
    text: '#FFFFFF', body: '#D8D8D8', muted: '#9A9A9A', faint: '#606060',
    subtitleBg: 'rgba(24,24,24,0.88)', subtitleText: '#FFFFFF',
  },
};

/** 目前生效的配色。Section 在渲染前用 applyStyle() 換掉內容。
 *  用「原地改寫同一個物件」而不是換參照，是為了讓所有已 import 的組件
 *  不必改成 hook 也能讀到新值 —— 一次渲染只有一種風格，不會有競態。 */
export const C: Palette = {...PALETTES['garychen-dark']};

export const applyStyle = (name: StyleName = 'garychen-dark') => {
  Object.assign(C, PALETTES[name] ?? PALETTES['garychen-dark']);
};

export const T = {
  hero: 148, h1: 84, h2: 64, h3: 46, body: 38,
  /** 規則：節編號 = 標題字級的一半 */
  eyebrow: 74,
  // 2026-10-04：cardNote 30→38、label 26→30（ChatGPT 建議內文 ≥38px；遠距教學常在手機上看）。
  // 放不下時改版型，不縮字。
  cardTitle: 44, cardNote: 38, label: 30, chapter: 24, subtitle: 44, code: 30,
} as const;

export const R = {sm: 8, md: 14, lg: 20, pill: 999} as const;
export const SP = {xs: 8, sm: 16, md: 28, lg: 48, xl: 80, xxl: 132} as const;

export {FONT_STACK as FONT} from './fonts';
export const MONO = "'JetBrains Mono','Fira Code',ui-monospace,monospace";

/** 版面座標，實測換算至 1920x1080 */
export const L = {
  safeX: 120, progressH: 4,
  chapter: {x: 40, y: 30},
  logo: {x: 40, y: 26, w: 220},
  subtitle: {y: 954, h: 38},
  content: {top: 120, bottom: 900},
} as const;

/** 標準進場：上浮 24px + 淡入，spring(damping 14, stiffness 110)，約 0.45s */
export const ENTER = {damping: 14, stiffness: 110, mass: 0.6} as const;
