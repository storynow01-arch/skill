/* 色鉛筆手繪工具：抖動的輪廓（每 3 格換一次＝線條沸騰）、斜向筆觸紋理、手寫字。
   全部只由格數決定（boil 由 Ad.tsx 每格設定）。原作：02_試做/廣告30風格 第 13 支 ad13/draw.tsx。 */
import React from 'react';
import {random} from 'remotion';
import {WENKAI} from './fonts';

export type Pt = [number, number];
export const G = {b: 0, f: 0}; // b＝沸騰序號（每 3 格 +1），f＝目前格數；Ad.tsx 每格開頭設定

const R = (s: string) => random(s) * 2 - 1;

/** 把多邊形切細、每個點加抖動 → 手繪路徑 */
export const rough = (pts: Pt[], seed: string, amp: number, closed = true, step = 46): string => {
  const out: Pt[] = [];
  const n = pts.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return 'M' + out.map((p, i) => `${(p[0] + R(seed + 'x' + i) * amp).toFixed(1)},${(p[1] + R(seed + 'y' + i) * amp).toFixed(1)}`).join('L') + (closed ? 'Z' : '');
};

export const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const ell = (cx: number, cy: number, rx: number, ry: number, n = 22, a0 = 0, a1 = Math.PI * 2): Pt[] => {
  const o: Pt[] = [];
  const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6;
  const cnt = full ? n : n + 1;
  for (let i = 0; i < cnt; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return o;
};
/** 圓角矩形 */
export const rrect = (x: number, y: number, w: number, h: number, r: number): Pt[] => {
  const o: Pt[] = [];
  const c = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (Math.PI / 2) * (i / 4);
      o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  c(x + w - r, y + r, -Math.PI / 2);
  c(x + w - r, y + h - r, 0);
  c(x + r, y + h - r, Math.PI / 2);
  c(x + r, y + r, Math.PI);
  return o;
};

/** 色鉛筆形狀：底色（固定抖動）＋斜線筆觸＋兩道會沸騰的鉛筆輪廓 */
export const Sh: React.FC<{p: Pt[]; fill?: string; ink?: string | null; id: string; hatch?: 0 | 1 | 2; sw?: number; op?: number; amp?: number; open?: boolean}> = ({
  p, fill, ink = '#4a3a33', id, hatch = 1, sw = 3, op = 1, amp = 1.6, open = false,
}) => {
  const fp = open ? '' : rough(p, id + 'f', amp * 1.4);
  return (
    <g opacity={op}>
      {fill && !open ? <path d={fp} fill={fill} /> : null}
      {fill && !open && hatch ? <path d={fp} fill={hatch === 1 ? 'url(#h13)' : 'url(#h13d)'} /> : null}
      {ink ? <path d={rough(p, id + 'o' + G.b, amp, !open)} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" /> : null}
      {ink ? <path d={rough(p, id + 'q' + G.b, amp * 1.6, !open)} fill="none" stroke={ink} strokeWidth={sw * 0.6} strokeLinecap="round" opacity={0.45} /> : null}
    </g>
  );
};

/** 鉛筆線（開放折線） */
export const Ln: React.FC<{p: Pt[]; ink?: string; id: string; sw?: number; op?: number; amp?: number}> = ({p, ink = '#4a3a33', id, sw = 3, op = 1, amp = 1.4}) => (
  <path d={rough(p, id + G.b, amp, false, 30)} fill="none" stroke={ink} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={op} />
);

/** 手寫字（霞鶩文楷） */
export const Tx: React.FC<{x: number; y: number; s: number; c?: string; w?: 400 | 700; a?: 'start' | 'middle' | 'end'; rot?: number; op?: number; ls?: number; children: React.ReactNode}> = ({
  x, y, s, c = '#3b2f2a', w = 700, a = 'middle', rot = 0, op = 1, ls = 0, children,
}) => (
  <text x={x} y={y} fontFamily={WENKAI} fontWeight={w} fontSize={s} fill={c} textAnchor={a} opacity={op} letterSpacing={ls}
    transform={rot ? `rotate(${rot} ${x} ${y})` : undefined}>
    {children}
  </text>
);

/** 斜向色鉛筆筆觸紋理（世界座標，跟著場景一起動） */
export const Defs: React.FC = () => {
  const lines = (dark: boolean) =>
    Array.from({length: 9}, (_, i) => {
      const y = 2 + i * 4.4;
      const x0 = (random('hx' + i + dark) * 0.5) * 40 - 6;
      const x1 = x0 + 14 + random('hl' + i + dark) * 34;
      return <line key={i} x1={x0} y1={y} x2={x1} y2={y + 0.6} stroke={dark ? '#3a2a1c' : '#ffffff'} strokeWidth={dark ? 1.3 : 1.8} strokeLinecap="round" opacity={dark ? 0.1 + random('ho' + i) * 0.08 : 0.16 + random('hp' + i) * 0.2} />;
    });
  return (
    <defs>
      <pattern id="h13" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)">{lines(false)}</pattern>
      <pattern id="h13d" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(-34)">{lines(true)}</pattern>
      <radialGradient id="glow13"><stop offset="0" stopColor="#fff2b8" stopOpacity="0.95" /><stop offset="0.45" stopColor="#ffd77a" stopOpacity="0.45" /><stop offset="1" stopColor="#ffb84d" stopOpacity="0" /></radialGradient>
      <radialGradient id="soft13"><stop offset="0" stopColor="#ffffff" stopOpacity="1" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
      <radialGradient id="txglow13"><stop offset="0" stopColor="#0d1440" stopOpacity="0.55" /><stop offset="1" stopColor="#0d1440" stopOpacity="0" /></radialGradient>
      <linearGradient id="beam13" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#dfe8ff" stopOpacity="0.5" /><stop offset="1" stopColor="#dfe8ff" stopOpacity="0" /></linearGradient>
    </defs>
  );
};
