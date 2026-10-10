/* 範本M 手繪線稿風共用元件（2026-10-10，學「別再手動整理5T素材」前 55 秒的手法）：
   米白紙底、黑色粗線稿、磚紅主點綴＋皇小米身上的金黃／藏青／鼠尾草綠；字模糊淡入、線條畫出來、游標演戲、震動線、蓋章。
   品檢約束：畫面字 ≥32px、小字用深色（對比 4.5:1）、裝飾字標 data-qa="ignore"、不用 feTurbulence／大模糊。 */
import React from 'react';
import {Easing, interpolate, spring} from 'remotion';
import {loadFont as loadSerif} from '@remotion/google-fonts/NotoSerifTC';
import {loadFont as loadSans} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {sketchFor} from '../sketches';

export const SERIF = `${loadSerif('normal', {weights: ['900'], ignoreTooManyRequestsWarning: true}).fontFamily}, serif`;
const SANS_F = loadSans('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const SANS = `${SANS_F}, sans-serif`;
export const MONO = `${loadMono('normal', {weights: ['500', '700'], subsets: ['latin'], ignoreTooManyRequestsWarning: true}).fontFamily}, ${SANS_F}, monospace`;

/** 配色：紅色字在米白底上要夠深才過對比（RED_T 給小字用） */
export const C = {
  paper: '#F5F1E8', ink: '#1B1B1B', red: '#C4553A', redT: '#A8432B', white: '#FFFFFF', grey: '#5C574E', mute: '#B9B3A6', faint: '#EFE0C2',
  gold: '#E9A93C', goldT: '#8F5F12', goldTint: '#FBEBC8', navy: '#2F4B7C', navyTint: '#DFE6F1', sage: '#5E8F5A', sageT: '#3F6B3C', sageTint: '#E3EEDC',
  hl: 'rgba(233,169,60,0.28)',
};
export const ACCENTS = [C.gold, C.navy, C.sage, C.red];
export const TINTS = [C.goldTint, C.navyTint, C.sageTint, '#F6DDD5'];
export const DARK = [C.goldT, C.navy, C.sageT, C.redT];

export const FPS = 30;
export const ez = Easing.bezier(0.22, 1, 0.36, 1);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** 0→1：從 a 格開始、d 格內走完 */
export const p = (f: number, a: number, d = 12, e = ez) => interpolate(f, [a, a + d], [0, 1], {...clamp, easing: e});
/** 彈出（有一點回彈） */
export const pop = (f: number, a: number, damping = 13) => (f < a ? 0 : spring({frame: f - a, fps: FPS, config: {damping, stiffness: 190, mass: 0.8}}));
/** 撞擊後的小抖動 */
export const jolt = (f: number, at: number, amp = 6, len = 12) => (f < at || f > at + len ? 0 : Math.sin((f - at) * 2.6) * amp * (1 - (f - at) / len));

/** 線條畫出來（SVG path，pathLength=1） */
export const Draw: React.FC<{d: string; f: number; at: number; dur?: number; sw?: number; color?: string; fill?: string}> = ({d, f, at, dur = 18, sw = 5, color = C.ink, fill}) => {
  const t = p(f, at, dur, Easing.inOut(Easing.cubic));
  if (t <= 0) return null;
  return (
    <>
      {fill && <path d={d} fill={fill} opacity={p(f, at + dur * 0.7, 8)} stroke="none" />}
      <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
    </>
  );
};

/** 模糊淡入的字（stagger>0 逐字錯開）；品檢量的是外層 div 的字 */
export const Blur: React.FC<{text: string; f: number; at: number; size: number; color?: string; font?: string; weight?: number; stagger?: number; style?: React.CSSProperties}> = ({text, f, at, size, color = C.ink, font = SERIF, weight = 900, stagger = 0, style}) => {
  const chars = stagger ? Array.from(text) : [text];
  return (
    <div style={{fontFamily: font, fontWeight: weight, fontSize: size, color, lineHeight: 1.2, whiteSpace: 'pre', ...style}}>
      {chars.map((c, i) => {
        const t = p(f, at + i * stagger, 14);
        return <span key={i} style={{display: 'inline-block', opacity: t, filter: t < 1 ? `blur(${(1 - t) * 14}px)` : undefined, transform: `translateY(${(1 - t) * 12}px)`}}>{c === ' ' ? ' ' : c}</span>;
      })}
    </div>
  );
};

/** 以 (x, y) 為中心擺放 */
export const At: React.FC<{x: number; y: number; children: React.ReactNode; style?: React.CSSProperties}> = ({x, y, children, style}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: 'translate(-50%, -50%)', ...style}}>{children}</div>
);

/** 彈出容器：以 (x, y) 為中心 */
export const Pop: React.FC<{f: number; at: number; x: number; y: number; children: React.ReactNode; rot?: number}> = ({f, at, x, y, children, rot = 0}) =>
  f < at ? null : (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${pop(f, at)}) rotate(${rot}deg)`}}>{children}</div>
  );

/** 線稿卡片：白底黑框＋右下實心影 */
export const Card: React.FC<{children: React.ReactNode; bg?: string; border?: string; style?: React.CSSProperties}> = ({children, bg = C.white, border = C.ink, style}) => (
  <div style={{background: bg, border: `5px solid ${border}`, borderRadius: 16, boxShadow: `7px 7px 0 ${C.ink}`, ...style}}>{children}</div>
);

/** 線稿視窗（標題列金黃底、三個圈） */
export const Win: React.FC<{x: number; y: number; w: number; h: number; title?: string; children?: React.ReactNode}> = ({x, y, w, h, title, children}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: C.white, border: `5px solid ${C.ink}`, borderRadius: 16, overflow: 'hidden', boxShadow: `8px 8px 0 ${C.ink}`}}>
    <div style={{height: 52, borderBottom: `4px solid ${C.ink}`, background: C.goldTint, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px'}}>
      {[0, 1, 2].map((i) => <div key={i} style={{width: 16, height: 16, borderRadius: 8, border: `3px solid ${C.ink}`}} />)}
      {title && <div style={{marginLeft: 14, fontFamily: MONO, fontSize: 32, fontWeight: 700, color: C.ink}}>{title}</div>}
    </div>
    <div style={{position: 'relative', height: h - 57}}>{children}</div>
  </div>
);

/** 震動線：(x, y) 四周冒出短線 */
export const Shake: React.FC<{f: number; at: number; x: number; y: number; r?: number; len?: number; angles?: number[]}> = ({f, at, x, y, r = 80, len = 32, angles = [-150, -120, -90, -60, -30]}) => {
  const t = p(f, at, 6), o = 1 - p(f, at + 10, 8);
  if (t <= 0 || o <= 0) return null;
  return (
    <svg data-qa="ignore" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
      {angles.map((a, i) => {
        const rad = (a * Math.PI) / 180, r0 = r + 8 * t, r1 = r0 + len * t;
        return <line key={i} x1={x + Math.cos(rad) * r0} y1={y + Math.sin(rad) * r0} x2={x + Math.cos(rad) * r1} y2={y + Math.sin(rad) * r1} stroke={C.ink} strokeWidth={5} strokeLinecap="round" opacity={o} />;
      })}
    </svg>
  );
};

/** 手畫打勾／打叉（中心 0,0） */
export const Check: React.FC<{t: number; size?: number; color?: string}> = ({t, size = 60, color = C.sage}) => (
  <svg width={size} height={size} viewBox="-30 -30 60 60" style={{overflow: 'visible'}}>
    <path d="M-20 0 L-6 14 L22 -16" fill="none" stroke={color} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - t} />
  </svg>
);
export const Cross: React.FC<{t: number; size?: number; color?: string}> = ({t, size = 60, color = C.red}) => (
  <svg width={size} height={size} viewBox="-30 -30 60 60" style={{overflow: 'visible'}}>
    <path d="M-20 -20 L20 20" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.min(1, t * 2)} />
    <path d="M20 -20 L-20 20" fill="none" stroke={color} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - Math.max(0, t * 2 - 1)} />
  </svg>
);

/** 編號圓（淡彩底＋深色字：彩色底配白字對比不夠，品檢會擋，2026-10-10） */
export const Num: React.FC<{n: React.ReactNode; i: number; d?: number}> = ({n, i, d = 64}) => (
  <div style={{width: d, height: d, borderRadius: d / 2, background: TINTS[i % 4], border: `5px solid ${ACCENTS[i % 4]}`, color: DARK[i % 4], display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SANS, fontWeight: 700, fontSize: Math.max(34, d * 0.56), flexShrink: 0}}>{n}</div>
);

/** 紅色圓形印章 */
export const Stamp: React.FC<{f: number; at: number; text: string; x: number; y: number; size?: number; rot?: number}> = ({f, at, text, x, y, size = 220, rot = -12}) => {
  if (f < at) return null;
  const t = p(f, at, 6, Easing.in(Easing.cubic));
  return (
    <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, transform: `rotate(${rot}deg) scale(${2.2 - 1.2 * t})`, opacity: t, border: `8px solid ${C.red}`, borderRadius: size / 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.redT, fontFamily: SERIF, fontWeight: 900, fontSize: size * 0.2, textAlign: 'center', lineHeight: 1.15, whiteSpace: 'pre-line', background: 'rgba(245,241,232,0.85)'}}>{text}</div>
  );
};

/** 線稿圖示：skill 的 44 個手繪線稿（lib/sketches.ts）逐筆畫出；沒有對應時畫圓框＋emoji */
export const HandIcon: React.FC<{icon?: string; f: number; at: number; size: number; color?: string; tint?: string}> = ({icon, f, at, size, color = C.ink, tint}) => {
  const sk = sketchFor(icon);
  const n = sk ? sk.paths.length : 1;
  const per = Math.max(5, Math.round(20 / n));
  return (
    <svg data-qa="ignore" width={size} height={size} viewBox="0 0 200 200" style={{overflow: 'visible'}}>
      {tint && <circle cx={100} cy={100} r={96} fill={tint} opacity={p(f, at, 8)} />}
      {sk ? (
        <>
          {sk.paths.map((d, i) => <Draw key={i} d={d} f={f} at={at + i * per} dur={per + 6} sw={7} color={color} />)}
          {(sk.dots ?? []).map(([x, y], i) => <circle key={`d${i}`} cx={x} cy={y} r={7 * p(f, at + n * per, 6)} fill={C.red} />)}
        </>
      ) : (
        <>
          <Draw d="M100 18 A82 82 0 1 1 99.9 18 Z" f={f} at={at} dur={16} sw={7} color={color} />
          {icon && <text x={100} y={128} textAnchor="middle" fontSize={80} opacity={p(f, at + 8, 8)}>{icon}</text>}
        </>
      )}
    </svg>
  );
};

/** 物件文字：去掉句尾句號、逗號改全形空白（品檢「物件標點」） */
export const clean = (s: unknown) => String(s ?? '').trim().replace(/[。]+$/, '').replace(/[，；]/g, '　').replace(/—/g, '－');
