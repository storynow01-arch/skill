/* 廣O 小工具與剪紙元件（原作 import 的 ../kit 與 ad04/lib.tsx 搬進範本自己的 src）：
   節拍、緩動、彈簧、固定種子亂數、吃角子老虎數字 Roller；剪紙多邊形（邊緣手剪微抖）、滑入黑條、手排鉛字、遮罩滑出、置中彈出。
   所有動畫只由「格數」決定（不用 Math.random、Date、CSS 動畫）。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';
import T from './timeline.json';
import {SERIF} from './fonts';

export const FPS = 30;
/** 一拍幾格（140 BPM＝12.86 格）、一小節、搖擺反拍位置 */
export const B: number = T.beat;
export const BAR = 4 * B;
export const SW: number = T.sw;
export const bt = (n: number) => n * B;
/** 章內的銅管搶拍（第 2 小節第 4 拍後半）與銅管重音（第 3 小節第 1 拍）：配樂每章從第 2 小節起每兩小節打一次 */
export const P1 = BAR + (3 + SW) * B;
export const H1 = 2 * BAR;
/** 每小節第 4 拍後半（小鼓）的點頭量 0..1（t＝章內格數） */
export const nod = (t: number) => {
  const ph = (((t % BAR) + BAR) % BAR) - (3 + SW) * B;
  return ph >= 0 ? Math.exp(-ph / 4) : 0;
};

/* ───── 緩動與進度 ───── */
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EI = Easing.bezier(0.7, 0, 0.84, 0); // 加速（抽走）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const EB = Easing.bezier(0.34, 1.56, 0.64, 1); // 回彈
export const LIN = (x: number) => x;
export const k = (t: number, a: number, b2: number, e: (x: number) => number = EO) => interpolate(t, [a, b2], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b2: number, p: number) => a + (b2 - a) * p;
export const sp = (t: number, at: number, damping = 12, stiffness = 220, mass = 0.8) =>
  t < at ? 0 : spring({frame: t - at, fps: FPS, config: {damping, stiffness, mass}});
export const bell = (p: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, p)));
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
export const rnd01 = (seed: string | number) => random(seed);

/* ───── 配色（原作：橘、米、深青、芥末、墨、白、紅、深棕） ───── */
export const C = {
  or: '#e8572a', cr: '#f2e6cf', te: '#1f5f6b', mu: '#e0a526',
  ink: '#161412', wh: '#fbf6ea', red: '#c62a22', dark: '#2e2824',
};

/* ───── 章資料 ───── */
export type Chap = {type: string; from: number; to: number; nb: number; beat: number; trans: string; win: [number, number]} & Record<string, any>;
export type ChP = {t: number; f: number; c: Chap; i: number};
export const LAB = T.d.labels as Record<string, string>;

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

/* ───── 剪紙多邊形 ───── */
export type Pt = [number, number];
export const ptsPath = (pts: Pt[]) => 'M' + pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join('L') + 'Z';
export const cpoly = (pts: Pt[]) => `polygon(${pts.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
export const rectPts = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const barPts = (cx: number, cy: number, len: number, th: number, deg: number): Pt[] => {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  const hx = len / 2, hy = th / 2;
  return ([[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]] as Pt[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as Pt);
};
/** 邊緣微抖：固定的手剪不規則＋每 4 格換一次的輕微「沸騰」（逐格動畫感） */
export const jag = (pts: Pt[], seed: string, f: number, amp = 3, step = 38): Pt[] => {
  const ph = Math.floor(f / 4);
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b2 = pts[(i + 1) % pts.length];
    const L = Math.hypot(b2[0] - a[0], b2[1] - a[1]);
    const n = Math.max(1, Math.round(L / step));
    const nx = L > 0 ? -(b2[1] - a[1]) / L : 0, ny = L > 0 ? (b2[0] - a[0]) / L : 0;
    for (let j = 0; j < n; j++) {
      const u = j / n;
      const o = rnd(`${seed}s${i}_${j}`) * amp * 1.4 + rnd(`${seed}b${i}_${j}_${ph}`) * amp * 0.5;
      out.push([a[0] + (b2[0] - a[0]) * u + nx * o, a[1] + (b2[1] - a[1]) * u + ny * o]);
    }
  }
  return out;
};
export const circPts = (cx: number, cy: number, r: number, n = 40): Pt[] =>
  Array.from({length: n}, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r] as Pt);

/** 剪紙色塊（帶淡淡投影，像紙片疊在底色上） */
export const Cut: React.FC<{pts: Pt[]; fill: string; seed: string; f: number; amp?: number; step?: number; shadow?: boolean; opacity?: number}> = ({pts, fill, seed, f, amp = 3, step = 38, shadow = true, opacity = 1}) => {
  const d = ptsPath(jag(pts, seed, f, amp, step));
  return (
    <g opacity={opacity}>
      {shadow && <path d={d} fill="rgba(22,20,18,0.22)" transform="translate(7 9)" />}
      <path d={d} fill={fill} />
    </g>
  );
};

/** 沿自身方向滑入的黑條（Saul Bass 招牌）。from=1 從長軸的負向滑入，-1 從正向 */
export const SlideBar: React.FC<{t: number; at: number; cx: number; cy: number; len: number; th: number; deg: number; from?: number; dur?: number; seed: string; f: number; fill?: string; dx?: number; dy?: number}> =
  ({t, at, cx, cy, len, th, deg, from = 1, dur = 10, seed, f, fill = C.ink, dx = 0, dy = 0}) => {
    const p = k(t, at, at + dur, EO);
    if (p <= 0) return null;
    const a = (deg * Math.PI) / 180;
    const D = (2300 + len) * (1 - p) * from;
    return <Cut pts={barPts(cx - Math.cos(a) * D + dx, cy - Math.sin(a) * D + dy, len, th, deg)} fill={fill} seed={seed} f={f} amp={2} step={46} />;
  };

export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties; w?: number}> = ({children, style, w = 1920}) => (
  <svg width={w} height={1080} viewBox={`0 0 ${w} 1080`} style={{position: 'absolute', left: 0, top: 0, ...style}}>{children}</svg>
);

/* ───── 手排鉛字：每個字微微歪斜、高低不齊；可逐字從上方落位 ───── */
export const Type: React.FC<{text: string; size: number; font?: string; color: string; seed: string; t?: number; at?: number; stagger?: number; spacing?: number; x: number; y: number; align?: 'left' | 'center' | 'right'; wobble?: number; vertical?: boolean}> =
  ({text, size, font = SERIF, color, seed, t = 999, at = -999, stagger = 2, spacing = 0, x, y, align = 'left', wobble = 1, vertical = false}) => {
    const chars = Array.from(text);
    const tf = align === 'center' ? 'translateX(-50%)' : align === 'right' ? 'translateX(-100%)' : '';
    return (
      <div style={{position: 'absolute', left: x, top: y, transform: tf, display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: vertical ? 'center' : undefined, whiteSpace: 'nowrap', fontFamily: font, fontWeight: font === SERIF ? 900 : 400, fontSize: size, lineHeight: 1.05, color, letterSpacing: spacing}}>
        {chars.map((ch, i) => {
          const p = k(t, at + i * stagger, at + i * stagger + 9, EB);
          const q = k(t, at + i * stagger, at + i * stagger + 3, EO);
          const rot = rnd(`${seed}r${i}`) * 2.2 * wobble;
          const dy = rnd(`${seed}y${i}`) * size * 0.035 * wobble;
          return (
            <span key={i} style={{display: 'inline-block', opacity: q, transform: `translateY(${dy - (1 - p) * size * 0.7}px) rotate(${rot + (1 - p) * 14}deg)`, minWidth: ch === ' ' ? size * 0.3 : undefined, minHeight: vertical && ch === ' ' ? size * 0.4 : undefined}}>
              {ch === ' ' ? ' ' : ch}
            </span>
          );
        })}
      </div>
    );
  };

/** 遮罩滑出的一行字（從黑條底下抽出來的感覺） */
export const Slide: React.FC<{p: number; children: React.ReactNode; x: number; y: number; dir?: number; style?: React.CSSProperties}> = ({p, children, x, y, dir = 1, style}) => (
  <div style={{position: 'absolute', left: x, top: y, overflow: 'hidden', ...style}}>
    <div style={{transform: `translateX(${(1 - p) * -105 * dir}%)`, whiteSpace: 'nowrap'}}>{children}</div>
  </div>
);

/** 置中彈出的容器 */
export const Pop: React.FC<{x: number; y: number; s: number; rot?: number; children: React.ReactNode}> = ({x, y, s, rot = 0, children}) => (
  <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%,-50%) scale(${s}) rotate(${rot}deg)`}}>{children}</div>
);
