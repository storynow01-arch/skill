/* 範本K 宇宙風共用元件：字型、色彩、星體（行星／恆星／星門／太空站／衛星）、分層視差星空、掃描圈、HUD 鎖定框、全像面板。
   來源：屏榮招生片「宇宙風」（風格四連發 Cosmos.tsx＋cosmos/bodies.tsx），拿掉所有寫死的學校內容，改成通用參數。
   效能：星點 ≤250 顆簡單圓點／短線；星雲與行星用 radialGradient，不用 feTurbulence／大模糊。
   品檢：星空只畫在 y<900（svg 高 900）；循環平移的邊界都在畫面外；閃爍各星獨立相位（不會全畫面同步）。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';
import {loadFont as loadNoto} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadOrb} from '@remotion/google-fonts/Orbitron';

export const NOTO = loadNoto('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const ORB = loadOrb('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;

/* ───── 色彩 ───── */
export const BG = '#05070f';
export const PURPLE = '#6b4bd8';
export const CYAN = '#36e2ff';
export const ORANGE = '#ffa040';
export const RED = '#ff5a5a';
export const GREEN = '#6cf0a0';
export const SUBTXT = '#a8bfe6';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** 進度 0→1（緩動） */
export const pr = (f: number, at: number, dur = 15) => interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
/** 彈出（spring 0→1，有回彈） */
export const pop = (f: number, at: number, damping = 13) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping, stiffness: 170}}));
export const glow = (c: string): React.CSSProperties => ({textShadow: `0 0 16px ${c}, 0 0 38px ${c}88`});

/* ───── 星體 ───── */
export type Pal = {c1: string; c2: string; c3: string; acc: string};
export const PALS: Pal[] = [
  {c1: '#bfe6ff', c2: '#3a86e8', c3: '#0d2a6e', acc: '#5cc8ff'},
  {c1: '#ffc6ea', c2: '#d23d98', c3: '#4a0b3c', acc: '#ff6ac1'},
  {c1: '#e2d4ff', c2: '#7a56e8', c3: '#1e0f5a', acc: '#b28cff'},
  {c1: '#ffe0a8', c2: '#ec7a26', c3: '#5a1f06', acc: ORANGE},
  {c1: '#dcfcff', c2: '#1f94c4', c3: '#062a44', acc: CYAN},
  {c1: '#fff6f4', c2: '#f0b8c0', c3: '#7a2a3e', acc: '#ff7a8e'},
];
export const PAL_HOME: Pal = {c1: '#d6e0ff', c2: '#4b54d8', c3: '#120f4a', acc: CYAN};
export const PAL_DANGER: Pal = {c1: '#ffd2c4', c2: '#e2412e', c3: '#46080c', acc: RED};
export const PAL_SAFE: Pal = {c1: '#dcffe8', c2: '#3cc07c', c3: '#0a3e28', acc: GREEN};
export const PAL_SUN: Pal = {c1: '#fff8d8', c2: '#ffc23a', c3: '#e0661e', acc: '#ffd36b'};
export const PAL_GATE: Pal = {c1: '#c8fff6', c2: '#1fb8a8', c3: '#063a3e', acc: '#5af0dc'};

export type Kind = 'planet' | 'sun' | 'gate' | 'station' | 'moon';
export type Body = Pal & {
  id: string; kind: Kind; x: number; y: number; r: number;
  ring?: {tilt: number; k: number; dashed?: boolean};
  bands?: number; spot?: boolean; clouds?: boolean; circuit?: boolean;
};

/** 每個星體自帶漸層定義（id 唯一） */
const Grad: React.FC<{b: Body}> = ({b}) => (
  <defs>
    <radialGradient id={`bd-${b.id}`} cx="36%" cy="32%" r="78%">
      <stop offset="0%" stopColor={b.c1} />
      <stop offset="55%" stopColor={b.c2} />
      <stop offset="100%" stopColor={b.c3} />
    </radialGradient>
    <radialGradient id={`atm-${b.id}`}>
      <stop offset="55%" stopColor={b.acc} stopOpacity={0.4} />
      <stop offset="72%" stopColor={b.acc} stopOpacity={0.16} />
      <stop offset="100%" stopColor={b.acc} stopOpacity={0} />
    </radialGradient>
    <clipPath id={`cl-${b.id}`}><circle r={b.r} /></clipPath>
  </defs>
);

/** 共用漸層（整張世界 SVG 放一次） */
export const SharedDefs: React.FC = () => (
  <defs>
    <radialGradient id="csShade" cx="32%" cy="30%" r="80%">
      <stop offset="45%" stopColor="#000010" stopOpacity={0} />
      <stop offset="100%" stopColor="#000010" stopOpacity={0.78} />
    </radialGradient>
    <radialGradient id="csCorona">
      <stop offset="0%" stopColor="#fff6c8" stopOpacity={1} />
      <stop offset="40%" stopColor="#ffc23a" stopOpacity={0.45} />
      <stop offset="100%" stopColor="#ff8a20" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="csPortal">
      <stop offset="0%" stopColor="#e8fffb" stopOpacity={0.95} />
      <stop offset="35%" stopColor="#3ae0cc" stopOpacity={0.6} />
      <stop offset="100%" stopColor="#06303a" stopOpacity={0.15} />
    </radialGradient>
  </defs>
);

const Ring: React.FC<{b: Body; half: 'back' | 'front'; f: number}> = ({b, half, f}) => {
  if (!b.ring) return null;
  const rx = b.r * b.ring.k, ry = rx * 0.26;
  const arc = (k: number) => (half === 'back' ? `M${-rx * k} 0A${rx * k} ${ry * k} 0 0 1 ${rx * k} 0` : `M${-rx * k} 0A${rx * k} ${ry * k} 0 0 0 ${rx * k} 0`);
  return (
    <g transform={`rotate(${b.ring.tilt})`} opacity={half === 'back' ? 0.75 : 1}>
      <path d={arc(0.86)} fill="none" stroke={b.c1} strokeOpacity={0.22} strokeWidth={b.r * 0.2} />
      <path d={arc(1)} fill="none" stroke={b.acc} strokeOpacity={0.85} strokeWidth={b.r * 0.028}
        strokeDasharray={b.ring.dashed ? `${b.r * 0.12} ${b.r * 0.07}` : undefined} strokeDashoffset={b.ring.dashed ? -f * 1.5 : undefined} />
      <path d={arc(0.86)} fill="none" stroke={b.c1} strokeOpacity={0.5} strokeWidth={b.r * 0.012} />
    </g>
  );
};

const Planet: React.FC<{b: Body; f: number}> = ({b, f}) => {
  const r = b.r;
  return (
    <>
      <circle r={r * 1.42} fill={`url(#atm-${b.id})`} />
      <Ring b={b} half="back" f={f} />
      <circle r={r} fill={`url(#bd-${b.id})`} />
      <g clipPath={`url(#cl-${b.id})`}>
        {Array.from({length: b.bands ?? 0}, (_, i) => {
          const n = b.bands ?? 1;
          const yy = -r + ((i + 0.5) * 2 * r) / n;
          const sway = Math.sin(f / 70 + i * 1.7) * r * 0.06;
          return <ellipse key={i} cx={sway} cy={yy} rx={r * 1.3} ry={r * (0.05 + 0.035 * (i % 3))} fill={i % 2 ? b.c1 : b.c3} opacity={0.22} />;
        })}
        {b.spot && (
          <>
            <ellipse cx={-r * 0.18} cy={r * 0.12} rx={r * 0.36} ry={r * 0.22} fill={b.acc} opacity={0.8} />
            <ellipse cx={-r * 0.18} cy={r * 0.12} rx={r * 0.46} ry={r * 0.3} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={r * 0.02} />
          </>
        )}
        {b.clouds && [0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx={Math.cos(i * 1.9) * r * 0.5 + Math.sin(f / 90 + i) * r * 0.05} cy={Math.sin(i * 2.3) * r * 0.55}
            rx={r * (0.28 + 0.06 * (i % 2))} ry={r * 0.12} fill="#ffffff" opacity={0.3} />
        ))}
        {b.circuit && [0, 1, 2, 3, 4, 5].map((i) => {
          const y = -r * 0.7 + i * r * 0.28;
          const xm = -r * 0.2 + (i % 3) * r * 0.2;
          return (
            <g key={i}>
              <path d={`M${-r * 0.9} ${y}H${xm}L${xm + r * 0.12} ${y + r * 0.12}H${r * 0.9}`} fill="none" stroke={b.acc} strokeOpacity={0.55} strokeWidth={r * 0.018} />
              <circle cx={xm + r * 0.12} cy={y + r * 0.12} r={r * 0.035} fill={b.acc} opacity={0.5 + 0.4 * Math.sin(f / 18 + i * 1.3)} />
            </g>
          );
        })}
      </g>
      <circle r={r} fill="url(#csShade)" />
      <circle r={r} fill="none" stroke={b.acc} strokeOpacity={0.55} strokeWidth={r * 0.018} />
      <Ring b={b} half="front" f={f} />
    </>
  );
};

const Sun: React.FC<{b: Body; f: number}> = ({b, f}) => {
  const r = b.r;
  return (
    <>
      <circle r={r * 2.3} fill="url(#csCorona)" opacity={0.85} />
      <g transform={`rotate(${f * 0.25})`} opacity={0.32}>
        {Array.from({length: 14}, (_, i) => {
          const a = (i / 14) * Math.PI * 2, L = r * (i % 2 ? 1.7 : 2.05), w = 0.07;
          return <path key={i} d={`M${Math.cos(a - w) * r} ${Math.sin(a - w) * r}L${Math.cos(a) * L} ${Math.sin(a) * L}L${Math.cos(a + w) * r} ${Math.sin(a + w) * r}Z`} fill={b.c1} />;
        })}
      </g>
      <circle r={r} fill={`url(#bd-${b.id})`} />
      <circle r={r * 0.98} fill="none" stroke="#fff6d0" strokeOpacity={0.6} strokeWidth={r * 0.03} />
    </>
  );
};

const Gate: React.FC<{b: Body; f: number}> = ({b, f}) => {
  const r = b.r;
  return (
    <>
      <circle r={r * 1.4} fill={`url(#atm-${b.id})`} />
      <circle r={r * 0.86} fill="url(#csPortal)" />
      <g transform={`rotate(${f * 0.9})`}>
        <circle r={r * 0.66} fill="none" stroke={b.acc} strokeOpacity={0.7} strokeWidth={r * 0.02} strokeDasharray={`${r * 0.18} ${r * 0.1}`} />
      </g>
      <g transform={`rotate(${-f * 0.6})`}>
        <circle r={r * 0.42} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={r * 0.015} strokeDasharray={`${r * 0.08} ${r * 0.08}`} />
      </g>
      <circle r={r} fill="none" stroke={b.c3} strokeWidth={r * 0.24} />
      <circle r={r} fill="none" stroke={b.c2} strokeWidth={r * 0.16} />
      <circle r={r * 1.07} fill="none" stroke={b.c1} strokeOpacity={0.8} strokeWidth={r * 0.02} />
      <circle r={r * 0.93} fill="none" stroke={b.c1} strokeOpacity={0.6} strokeWidth={r * 0.015} />
      <g transform={`rotate(${-f * 0.4})`}>
        {Array.from({length: 8}, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <circle key={i} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={r * 0.05} fill={b.acc} />;
        })}
      </g>
    </>
  );
};

const Station: React.FC<{b: Body; f: number}> = ({b, f}) => {
  const r = b.r;
  return (
    <>
      <circle r={r * 1.35} fill={`url(#atm-${b.id})`} opacity={0.6} />
      <g transform={`rotate(${f * 0.22})`}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return <line key={i} x1={0} y1={0} x2={Math.cos(a) * r} y2={Math.sin(a) * r} stroke={b.c2} strokeWidth={r * 0.07} />;
        })}
        <circle r={r} fill="none" stroke={b.c3} strokeWidth={r * 0.2} />
        <circle r={r} fill="none" stroke={b.c2} strokeWidth={r * 0.13} />
        <circle r={r} fill="none" stroke={b.c1} strokeOpacity={0.7} strokeWidth={r * 0.02} strokeDasharray={`${r * 0.1} ${r * 0.06}`} />
        {Array.from({length: 6}, (_, i) => (
          <g key={i} transform={`rotate(${(i / 6) * 360}) translate(${r} 0)`}>
            <rect x={-r * 0.12} y={-r * 0.1} width={r * 0.24} height={r * 0.2} rx={r * 0.03} fill={b.c1} stroke={b.c3} strokeWidth={r * 0.015} />
            <circle r={r * 0.035} fill={b.acc} />
          </g>
        ))}
      </g>
      <circle r={r * 0.3} fill={`url(#bd-${b.id})`} stroke={b.acc} strokeWidth={r * 0.02} />
      <circle r={r * 0.1} fill={b.acc} opacity={0.9} />
    </>
  );
};

const MoonArt: React.FC<{b: Body}> = ({b}) => (
  <>
    <circle r={b.r * 1.6} fill={`url(#atm-${b.id})`} opacity={0.7} />
    <circle r={b.r} fill={`url(#bd-${b.id})`} />
    <circle r={b.r} fill="url(#csShade)" />
    <circle r={b.r} fill="none" stroke={b.acc} strokeOpacity={0.6} strokeWidth={Math.max(1.5, b.r * 0.04)} />
  </>
);

/** 依種類繪出星體（在 b.x,b.y；bob＝上下漂浮） */
export const BodyG: React.FC<{b: Body; f: number; bob?: number; opacity?: number}> = ({b, f, bob = 0, opacity = 1}) => (
  <g transform={`translate(${b.x} ${b.y + bob})`} opacity={opacity}>
    <Grad b={b} />
    {b.kind === 'sun' ? <Sun b={b} f={f} /> : b.kind === 'gate' ? <Gate b={b} f={f} /> : b.kind === 'station' ? <Station b={b} f={f} />
      : b.kind === 'moon' ? <MoonArt b={b} /> : <Planet b={b} f={f} />}
  </g>
);

/* ───── 鏡頭與星空 ───── */
export type Cam = {x: number; y: number; z: number};
export type Pt = {x: number; y: number};

const LAYERS = [
  {n: 130, d: 0.05, r0: 0.9, r1: 1.7, o0: 0.25, o1: 0.6},
  {n: 80, d: 0.13, r0: 1.3, r1: 2.3, o0: 0.4, o1: 0.8},
  {n: 40, d: 0.28, r0: 1.9, r1: 3.1, o0: 0.6, o1: 1},
];
const SW = 2040, SH = 980;   // 星點循環範圍比畫面大：繞回的那一瞬間都在畫面外
const STARS = LAYERS.flatMap((L, li) => Array.from({length: L.n}, (_, i) => {
  const t = random(`kt${li}-${i}`);
  return {
    d: L.d, x: random(`kx${li}-${i}`) * SW, y: random(`ky${li}-${i}`) * SH,
    r: L.r0 + random(`kr${li}-${i}`) * (L.r1 - L.r0), o: L.o0 + random(`ko${li}-${i}`) * (L.o1 - L.o0),
    per: 60 + random(`kp${li}-${i}`) * 120, ph: random(`kf${li}-${i}`) * Math.PI * 2,
    tint: t < 0.12 ? '#ffd8a8' : t < 0.32 ? '#b4f2ff' : '#ffffff',
  };
}));
const mod = (a: number, m: number) => ((a % m) + m) % m;
const NEBULAE = [
  {x: 160, y: 240, rx: 760, ry: 380, c: PURPLE, o: 0.42},
  {x: 1250, y: 650, rx: 720, ry: 330, c: '#1f6fd0', o: 0.3},
  {x: 2050, y: 200, rx: 660, ry: 300, c: '#8a3fc0', o: 0.3},
  {x: -500, y: 700, rx: 700, ry: 320, c: '#1a9fb8', o: 0.22},
  {x: 900, y: 110, rx: 520, ry: 230, c: '#c0603a', o: 0.15},
  {x: 2700, y: 620, rx: 720, ry: 340, c: '#1a9fb8', o: 0.22},
];

/** 深空：星雲（隨鏡頭微幅平移，不取餘數）＋三層視差星點（航行時拉成光線） */
export const Starfield: React.FC<{f: number; cam: Cam; prev: Cam}> = ({f, cam, prev}) => {
  const ox = -cam.x - f * 0.9, oy = -cam.y;
  const px = -prev.x - (f - 1) * 0.9, py = -prev.y;
  return (
    <svg width={1920} height={900} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        {NEBULAE.map((n, i) => (
          <radialGradient key={i} id={`kneb${i}`}>
            <stop offset="0%" stopColor={n.c} stopOpacity={n.o} />
            <stop offset="55%" stopColor={n.c} stopOpacity={n.o * 0.35} />
            <stop offset="100%" stopColor={n.c} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      {NEBULAE.map((n, i) => (
        <ellipse key={i} cx={n.x - cam.x * 0.03} cy={n.y - cam.y * 0.025} rx={n.rx} ry={n.ry} fill={`url(#kneb${i})`} />
      ))}
      {STARS.map((s, i) => {
        const x = mod(s.x + ox * s.d, SW) - 60;
        const y = mod(s.y + oy * s.d, SH) - 40;
        const vx = (ox - px) * s.d, vy = (oy - py) * s.d;
        const sp = Math.hypot(vx, vy);
        if (sp > 1.2 && sp < 400) {
          const k = Math.min(3, 60 / sp);
          return <line key={i} x1={x} y1={y} x2={x - vx * k} y2={y - vy * k} stroke={s.tint} strokeWidth={s.r * 1.1} strokeLinecap="round" opacity={s.o} />;
        }
        const tw = 0.7 + 0.3 * Math.sin((f / s.per) * Math.PI * 2 + s.ph);
        return <circle key={i} cx={x} cy={y} r={s.r} fill={s.tint} opacity={s.o * tw} />;
      })}
    </svg>
  );
};

/* ───── 掃描圈 ───── */
export const ScanRing: React.FC<{f: number; at: number; acc: string; size: number}> = ({f, at, acc, size}) => {
  const p = pop(f, at, 14);
  const h = size / 2;
  return (
    <svg width={size} height={size} viewBox={`${-h} ${-h} ${size} ${size}`} style={{overflow: 'visible', transform: `scale(${Math.min(1.08, p)})`, opacity: Math.min(1, p * 1.5)}}>
      <circle r={h * 0.92} fill={acc} opacity={0.07} />
      <circle r={h * 0.92} fill="none" stroke={acc} strokeOpacity={0.35} strokeWidth={2} />
      <g transform={`rotate(${(f - at) * 2})`}>
        <circle r={h * 0.8} fill="none" stroke={acc} strokeWidth={3} strokeDasharray="12 9" />
      </g>
      <g transform={`rotate(${-(f - at) * 1.4})`}>
        <path d={`M${h * 0.97} 0A${h * 0.97} ${h * 0.97} 0 0 1 0 ${h * 0.97}`} fill="none" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        <path d={`M${-h * 0.97} 0A${h * 0.97} ${h * 0.97} 0 0 1 0 ${-h * 0.97}`} fill="none" stroke={acc} strokeWidth={4} strokeLinecap="round" />
      </g>
      {[0, 90, 180, 270].map((a) => <line key={a} x1={h * 0.84} y1={0} x2={h * 1.02} y2={0} stroke={acc} strokeWidth={3} transform={`rotate(${a})`} />)}
    </svg>
  );
};

/* ───── 鎖定框（螢幕座標）：四角由大縮小鎖住目標，鎖定後轉橘，LOCKED 標籤淡入後柔和脈動 2 次（每秒 2 次、只在標籤範圍） ───── */
export const LockFrame: React.FC<{f: number; at: number; sx: number; sy: number; r: number; code: string; label?: string; color?: string; out?: number}> = (
  {f, at, sx, sy, r, code, label = 'LOCKED', color = ORANGE, out = 0}) => {
  const t0 = at - 12;
  if (f < t0 || out >= 1) return null;
  const s = interpolate(f, [t0, at + 2], [r * 2.3, r * 1.32], {...clamp, easing: Easing.out(Easing.cubic)});
  const a = interpolate(f, [t0, t0 + 6], [0, 1], clamp) * (1 - out);
  const lf = f - (at + 2);
  const lockA = lf < 0 ? 0 : lf < 6 ? lf / 6 : lf < 36 ? 0.7 + 0.3 * Math.cos(((lf - 6) / 15) * Math.PI * 2) : 1;
  const L = Math.min(46, r * 0.5);
  const tw = label.length * 22 + 34;   // Orbitron 字寬較寬
  return (
    <g opacity={a}>
      <g transform={`translate(${sx} ${sy})`}>
        <g transform={`rotate(${f * 0.8})`} opacity={0.5}>
          <circle r={r * 1.2} fill="none" stroke={CYAN} strokeWidth={2} strokeDasharray="4 10" />
          <path d={`M${r * 1.2} 0A${r * 1.2} ${r * 1.2} 0 0 1 0 ${r * 1.2}`} fill="none" stroke={CYAN} strokeWidth={4} />
        </g>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([cx, cy], i) => (
          <path key={i} d={`M${cx * s} ${cy * s - cy * L}L${cx * s} ${cy * s}L${cx * s - cx * L} ${cy * s}`} fill="none"
            stroke={lf >= 0 ? color : CYAN} strokeWidth={5} strokeLinecap="square" />
        ))}
        <g opacity={lockA}>
          <rect x={-s} y={-s - 50} width={tw} height={36} fill={color} opacity={0.92} />
          <text x={-s + 14} y={-s - 23} fontFamily={ORB} fontWeight={900} fontSize={22} letterSpacing={4} fill="#140a00">{label}</text>
          <text x={-s + tw + 14} y={-s - 24} fontFamily={ORB} fontWeight={700} fontSize={17} letterSpacing={3} fill={color}>{code}</text>
        </g>
      </g>
    </g>
  );
};

/* ───── 全像面板：先橫向展開再縱向展開（16 格），角標＋靜態掃描線 ───── */
export const HoloPanel: React.FC<{f: number; at: number; x: number; y: number; w: number; h?: number; acc: string; out?: number; pad?: string;
  origin?: string; children?: React.ReactNode; dim?: number}> = ({f, at, x, y, w, h, acc, out = 0, pad = '24px 34px', origin = 'left top', children, dim = 1}) => {
  const open = pr(f, at, 16);
  if (open <= 0 || out >= 1) return null;
  const sx = interpolate(open, [0, 0.45], [0.03, 1], clamp);
  const sy = interpolate(open, [0.3, 1], [0.04, 1], clamp);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, padding: pad, boxSizing: 'border-box',
      transformOrigin: origin, transform: `scale(${sx}, ${sy})`, opacity: (1 - out) * dim,
      background: 'linear-gradient(160deg, rgba(20,34,72,0.74), rgba(8,12,30,0.66))', border: `2px solid ${acc}99`,
      boxShadow: `0 0 28px ${acc}40, inset 0 0 40px rgba(54,226,255,0.08)`, borderRadius: 8}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 8, pointerEvents: 'none', opacity: 0.35,
        background: 'repeating-linear-gradient(to bottom, rgba(140,220,255,0.08) 0 2px, transparent 2px 6px)'}} />
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([ix, iy], i) => (
        <div key={i} style={{position: 'absolute', width: 24, height: 24, left: ix ? undefined : -2, right: ix ? -2 : undefined,
          top: iy ? undefined : -2, bottom: iy ? -2 : undefined, borderColor: '#fff', borderStyle: 'solid',
          borderWidth: `${iy ? 0 : 4}px ${ix ? 4 : 0}px ${iy ? 4 : 0}px ${ix ? 0 : 4}px`}} />
      ))}
      <div style={{position: 'relative', height: '100%'}}>{children}</div>
    </div>
  );
};

/** 面板內的一行：由左往右展開（clip）＋淡入 */
export const Reveal: React.FC<{f: number; at: number; style?: React.CSSProperties; children?: React.ReactNode; center?: boolean}> = ({f, at, style, children, center}) => {
  if (f < at) return null;
  const p = pr(f, at, 12);
  return (
    <div style={{...style, opacity: Math.min(1, p * 1.4) * ((style?.opacity as number) ?? 1),
      clipPath: center ? `inset(0 ${(1 - p) * 50}% 0 ${(1 - p) * 50}%)` : `inset(-20% ${(1 - p) * 100}% -20% -4%)`,
      transform: `${style?.transform ?? ''} translateX(${center ? 0 : (1 - p) * 30}px)`}}>{children}</div>
  );
};

/** 小菱形項目符號 */
export const Diamond: React.FC<{c: string; size?: number; style?: React.CSSProperties}> = ({c, size = 16, style}) => (
  <div style={{width: size, height: size, flex: 'none', transform: 'rotate(45deg)', background: c, boxShadow: `0 0 10px ${c}`, ...style}} />
);

/** 太空船（原點在船身中心，朝 +x） */
export const Ship: React.FC<{f: number; s?: number}> = ({f, s = 1}) => (
  <g transform={`scale(${s})`}>
    <circle r={28} fill={CYAN} opacity={0.16} />
    <path d="M24 0L-14 -14L-7 0L-14 14Z" fill="#eaffff" stroke={CYAN} strokeWidth={2.5} />
    <path d="M-9 0L-26 -5L-26 5Z" fill={ORANGE} opacity={0.65 + 0.25 * Math.sin(f / 3)} />
  </g>
);
