/* 範本J 地圖風工具箱（2026-10-08，從屏榮招生片「地圖風 MapQuest」抽出、拿掉所有寫死的屏榮內容）：
   字型、羊皮紙色票、緩動、平滑曲線、描線、紅色圖釘、指南針、註記卡、紅緞帶、蠟封章、打勾章、樹與山的小插畫。
   規則：①所有隨機都用 remotion 的 random(seed)，可決定 ②不用 feTurbulence／大模糊（紙紋用漸層與少量形狀）
   ③閃動一律慢速（sin(f/6) 以下），大面積不閃 ④本檔只放元件，不放任何影片內容文字。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';
import {loadFont as loadSerif} from '@remotion/google-fonts/NotoSerifTC';
import {loadFont as loadKai} from '@remotion/google-fonts/LXGWWenKaiTC';
import {loadFont as loadCinzel} from '@remotion/google-fonts/Cinzel';
import {textW, wrap} from '../../tpl/common';

export const SERIF = loadSerif('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const KAI = loadKai('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const CINZEL = loadCinzel('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;

/* ───── 色彩（羊皮紙＋墨褐＋朱紅） ───── */
export const INK = '#4a2c17';
export const RED = '#b8322a';
export const RED_D = '#6e1712';
export const PAPER = '#ecdcb0';
export const PAPER2 = '#f4e8c6';
export const SEA = '#a9c8c6';
export const SEA_INK = '#4f7f86';
export const TABLE = '#3b2616';
export const GOLD = '#e0b13f';
export const MUTED = '#7a4f2a';
export const LEAF = '#9aae6a';
export const CREAM = '#fff4dc';

export type P = {x: number; y: number};
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const easeIO = Easing.inOut(Easing.cubic);
/** 進度 0→1（緩動） */
export const pr = (f: number, at: number, dur = 15) => interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: easeIO});
/** 彈出（spring 0→1，有回彈） */
export const pop = (f: number, at: number, damping = 11) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping, stiffness: 180}}));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ───── 文字工具 ───── */
/** 物件文字分行：畫面上不放「，；」、不以「。」結尾（品檢「物件標點」）；逗號處優先斷行 */
export const lines = (raw: unknown, n: number, max: number): string[] => {
  const s = String(raw ?? '').trim().replace(/[。]+$/, '');
  const segs = s.split(/[，；]/).map((x) => x.trim()).filter(Boolean);
  if (!segs.length) return [];
  const joined = segs.join('　');
  if (textW(joined) <= n) return [joined];
  const out = segs.flatMap((x) => wrap(x, n));
  return out.length <= max ? out : wrap(joined, n).slice(0, max);
};
/** 多行文字在 maxW 內放得下的字級（ls＝每字額外字距 em） */
export const fitLines = (ls: string[], maxW: number, base: number, min = 26, ls2 = 0.04) =>
  Math.max(min, Math.min(base, ...ls.map((l) => maxW / Math.max(1, textW(l) * (1 + ls2)))));
/** 一行放得下且字級 ≥ minOne 就一行，否則對半分兩行 */
export const smart = (raw: unknown, maxW: number, base: number, minOne = 48): string[] => {
  const one = lines(raw, 99, 1);
  if (!one.length || fitLines(one, maxW, base) >= minOne) return one;
  const two = lines(raw, Math.ceil(textW(one[0]) / 2), 2);
  return fitLines(two, maxW, base) > fitLines(one, maxW, base) ? two : one;
};
export const isAscii = (s: string) => /^[\u0000-ÿ]*$/.test(s);

/* ───── 曲線工具 ───── */
/** Catmull-Rom → 三次貝茲（平滑曲線） */
export const smooth = (pts: P[], closed: boolean) => {
  const n = pts.length;
  const g = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
    const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
    d += `C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return closed ? d + 'Z' : d;
};
/** 不規則圓（等高線、湖泊用） */
export const blob = (cx: number, cy: number, r: number, seed: string, n = 11, amp = 0.22) =>
  smooth(Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (1 + (random(`${seed}-${i}`) - 0.5) * 2 * amp);
    return {x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.78};
  }), true);
/** 二次曲線取樣成折線（bend＝往法線方向彎的比例） */
export const quadPts = (a: P, b: P, bend: number, n = 48): P[] => {
  const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
  const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
  const c = {x: (a.x + b.x) / 2 + nx * bend * len, y: (a.y + b.y) / 2 + ny * bend * len};
  return Array.from({length: n + 1}, (_, k) => {
    const t = k / n;
    return {x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y};
  });
};
/** 折線取前 p 比例 */
export const partial = (pts: P[], p: number): P[] => {
  if (p <= 0) return [];
  if (p >= 1) return pts;
  const fi = p * (pts.length - 1), i = Math.floor(fi), t = fi - i;
  const a = pts[i], b = pts[i + 1];
  return [...pts.slice(0, i + 1), {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t}];
};
export const ptsD = (pts: P[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');

/* ───── SVG 元件 ───── */
/** 描線：p＝0→1 畫出比例（pathLength 正規化） */
export const Stroke: React.FC<{d: string; p: number; w?: number; color?: string; opacity?: number}> = (
  {d, p, w = 5, color = INK, opacity = 1}) => {
  if (p <= 0.002) return null;
  return <path d={d} pathLength={1} strokeDasharray={`${p} 2`} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} />;
};

/** 虛線路線（折線版）：只畫到 p，前端有紅點 */
export const DashRoute: React.FC<{pts: P[]; p: number; w?: number; color?: string; head?: boolean; f?: number; glow?: number}> = (
  {pts, p, w = 9, color = RED, head = true, f = 0, glow = 0}) => {
  if (p <= 0) return null;
  const seg = partial(pts, p);
  if (seg.length < 2) return null;
  const d = ptsD(seg), h = seg[seg.length - 1];
  return (
    <g>
      {glow > 0 && <path d={d} fill="none" stroke="#ffd36b" strokeWidth={w * 3.2} opacity={0.55 * glow} strokeLinecap="round" strokeLinejoin="round" />}
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeDasharray={`${w * 2.8} ${w * 1.9}`} strokeLinecap="round" strokeLinejoin="round" />
      {head && p < 1 && (
        <g transform={`translate(${h.x} ${h.y})`}>
          <circle r={w * 2.3} fill={color} stroke={PAPER2} strokeWidth={w * 0.6} />
          <circle r={w * 4.2} fill="none" stroke={color} strokeWidth={w * 0.4} opacity={0.55 + 0.35 * Math.sin(f / 6)} />
        </g>
      )}
    </g>
  );
};

/** 紅色圖釘：「咚」地插下（x,y＝針尖） */
export const Pin: React.FC<{x: number; y: number; f: number; at: number; size?: number; color?: string}> = ({x, y, f, at, size = 1, color = RED}) => {
  if (f < at) return null;
  const p = Math.min(1, pop(f, at, 9));
  const fall = interpolate(f, [at, at + 7], [-320, 0], {...clamp, easing: Easing.in(Easing.quad)});
  const squash = f >= at + 7 && f < at + 12 ? 1 - 0.18 * Math.sin(((f - at - 7) / 5) * Math.PI) : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <ellipse cx={14} cy={4} rx={26 * p} ry={8 * p} fill="#000" opacity={0.25} />
      <g transform={`translate(0 ${fall}) scale(1 ${squash})`}>
        <line x1={0} y1={0} x2={0} y2={-60} stroke="#7a7a7a" strokeWidth={6} strokeLinecap="round" />
        <circle cx={0} cy={-84} r={32} fill={color} stroke={RED_D} strokeWidth={4} />
        <circle cx={-10} cy={-95} r={9} fill="#f6b3a8" />
      </g>
      {f < at + 20 && f >= at + 7 && (
        <circle cx={0} cy={0} r={20 + (f - at - 7) * 7} fill="none" stroke={color} strokeWidth={5} opacity={1 - (f - at - 7) / 13} />
      )}
    </g>
  );
};

/** 指南針玫瑰（SVG，原點＝中心） */
export const CompassRose: React.FC<{size: number; rot?: number}> = ({size, rot = 0}) => {
  const pts = (rr: number, n: number, off: number) => Array.from({length: n}, (_, i) => {
    const a = (i / n) * Math.PI * 2 + off;
    return `${(Math.sin(a) * rr).toFixed(1)} ${(-Math.cos(a) * rr).toFixed(1)}`;
  });
  const long = pts(size, 4, 0), short = pts(size * 0.62, 4, Math.PI / 4), inner = pts(size * 0.16, 4, Math.PI / 4);
  return (
    <g transform={`rotate(${rot})`}>
      <circle r={size * 0.8} fill="none" stroke={INK} strokeWidth={size * 0.025} />
      <circle r={size * 0.72} fill="none" stroke={INK} strokeWidth={size * 0.012} strokeDasharray={`${size * 0.04} ${size * 0.03}`} />
      {[0, 1, 2, 3].map((i) => (
        <g key={`s${i}`}>
          <path d={`M0 0L${inner[(i + 3) % 4]}L${short[i]}Z`} fill={INK} />
          <path d={`M0 0L${inner[i]}L${short[i]}Z`} fill={PAPER2} stroke={INK} strokeWidth={size * 0.012} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => (
        <g key={`l${i}`}>
          <path d={`M0 0L${inner[(i + 3) % 4]}L${long[i]}Z`} fill={i === 0 ? RED : INK} />
          <path d={`M0 0L${inner[i]}L${long[i]}Z`} fill={PAPER2} stroke={INK} strokeWidth={size * 0.012} />
        </g>
      ))}
      <circle r={size * 0.06} fill={PAPER2} stroke={INK} strokeWidth={size * 0.015} />
      <text y={-size * 1.08} textAnchor="middle" fontFamily={CINZEL} fontWeight={700} fontSize={size * 0.26} fill={RED}>N</text>
    </g>
  );
};

/** 小樹（x,y＝樹根） */
export const Tree: React.FC<{x: number; y: number; s?: number; k?: number}> = ({x, y, s = 1, k = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1={0} y1={0} x2={0} y2={-24} stroke={INK} strokeWidth={4 * k} />
    <circle cx={0} cy={-40} r={20} fill={LEAF} stroke={INK} strokeWidth={3.5 * k} />
  </g>
);
/** 小山（x,y＝山腳中心） */
export const Mount: React.FC<{x: number; y: number; s?: number; k?: number}> = ({x, y, s = 1, k = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={INK} strokeWidth={4 * k} strokeLinejoin="round">
    <path d="M-55 0L-5 -70L45 0" fill={PAPER2} />
    <path d="M-5 -70L5 -40L-2 -20L8 0" strokeWidth={2.5 * k} />
    <path d="M20 0L50 -40L80 0" fill={PAPER2} />
  </g>
);
/** 水波 */
export const Waves: React.FC<{x: number; y: number; n?: number; k?: number}> = ({x, y, n = 3, k = 1}) => {
  let d = `M${x} ${y}`;
  for (let i = 0; i < n; i++) d += 'q10 -12 20 0t20 0';
  return <path d={d} fill="none" stroke={SEA_INK} strokeWidth={4 * k} strokeLinecap="round" />;
};

/** 打勾章（紅圓＋白勾），x,y＝中心 */
export const CheckSeal: React.FC<{x: number; y: number; f: number; at: number; r?: number}> = ({x, y, f, at, r = 26}) => {
  const p = pop(f, at, 10);
  if (p <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${p})`}>
      <circle r={r} fill={RED} stroke={RED_D} strokeWidth={r * 0.12} />
      <path d={`M${-r * 0.44} 0L${-r * 0.12} ${r * 0.36}L${r * 0.5} ${-r * 0.4}`} fill="none" stroke={CREAM} strokeWidth={r * 0.24}
        strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
};

/** 紅色手繪叉 */
export const Cross: React.FC<{x: number; y: number; s: number; p: number; color?: string}> = ({x, y, s, p, color = RED}) => (
  <g transform={`translate(${x} ${y})`}>
    <Stroke d={`M${-s} ${-s}L${s} ${s}`} p={Math.min(1, p * 2)} w={s * 0.28} color={color} />
    <Stroke d={`M${s} ${-s}L${-s} ${s}`} p={Math.max(0, p * 2 - 1)} w={s * 0.28} color={color} />
  </g>
);

/** 手繪紅圈（圍住 cx,cy 的橢圓，起筆略過頭） */
export const RedRing: React.FC<{cx: number; cy: number; rx: number; ry: number; p: number; w?: number; color?: string}> = (
  {cx, cy, rx, ry, p, w = 7, color = RED}) => {
  const d = `M${cx - rx * 0.05} ${cy - ry}C${cx + rx * 0.9} ${cy - ry * 1.04} ${cx + rx * 1.12} ${cy - ry * 0.15} ${cx + rx * 0.98} ${cy + ry * 0.3}`
    + `C${cx + rx * 0.8} ${cy + ry * 0.98} ${cx - rx * 0.78} ${cy + ry * 1.0} ${cx - rx * 1.02} ${cy + ry * 0.15}`
    + `C${cx - rx * 1.2} ${cy - ry * 0.5} ${cx - rx * 0.85} ${cy - ry * 0.95} ${cx + rx * 0.14} ${cy - ry * 0.97}`;
  return <Stroke d={d} p={p} w={w} color={color} />;
};

/** 四角閃光 */
export const sparkle = (x: number, y: number, s: number) =>
  `M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z`;

/* ───── HTML 元件 ───── */
export const cardBox: React.CSSProperties = {
  position: 'absolute', background: PAPER2, border: `4px solid ${INK}`, borderRadius: 6, boxSizing: 'border-box',
  boxShadow: `inset 0 0 0 8px ${PAPER2}, inset 0 0 0 10px ${INK}, 10px 14px 0 rgba(40,20,5,0.35)`,
};

/** 地圖註記卡：從右側滑入、微旋轉、淡入（at 之前不畫） */
export const NoteCard: React.FC<{f: number; at: number; x: number; y: number; w: number; h: number; rot?: number; border?: string;
  bg?: string; dim?: number; children?: React.ReactNode; style?: React.CSSProperties}> = (
  {f, at, x, y, w, h, rot = 0, border = INK, bg = PAPER2, dim = 1, children, style}) => {
  if (f < at) return null;
  const v = pr(f, at, 12);
  return (
    <div style={{...cardBox, left: x, top: y, width: w, height: h, background: bg, borderColor: border,
      boxShadow: `inset 0 0 0 8px ${bg}, inset 0 0 0 10px ${border}, 10px 14px 0 rgba(40,20,5,0.35)`,
      opacity: v * dim, transform: `translateX(${(1 - v) * 60}px) rotate(${rot + (1 - v) * 3}deg)`, ...style}}>
      {children}
    </div>
  );
};

/** 紅緞帶（兩端燕尾），cx＝中心、y＝上緣；寬度依文字自動 */
export const Ribbon: React.FC<{f: number; at: number; cx: number; y: number; text: string; size?: number; maxW?: number; h?: number}> = (
  {f, at, cx, y, text, size = 52, maxW = 1100, h = 108}) => {
  if (f < at) return null;
  const fs = Math.min(size, (maxW - 200) / Math.max(1, textW(text) * 1.2));
  const w = Math.min(maxW, Math.max(520, textW(text) * fs * 1.2 + 220));
  const p = pr(f, at, 18);
  return (
    <div style={{position: 'absolute', left: cx - w / 2, top: y, width: w, height: h, transform: `scaleX(${p})`, opacity: Math.min(1, p * 2)}}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={`M0 ${h * 0.24}L80 ${h * 0.24}L80 ${h * 0.86}L0 ${h * 0.86}L24 ${h * 0.55}Z M${w} ${h * 0.24}L${w - 80} ${h * 0.24}L${w - 80} ${h * 0.86}L${w} ${h * 0.86}L${w - 24} ${h * 0.55}Z`}
          fill="#8f2620" stroke={RED_D} strokeWidth={3} />
        <path d={`M60 4H${w - 60}V${h - 14}H60Z`} fill={RED} stroke={RED_D} strokeWidth={4} />
        <path d={`M72 14H${w - 72}M72 ${h - 24}H${w - 72}`} stroke="#e8a59a" strokeWidth={2} strokeDasharray="10 8" opacity={0.7} />
      </svg>
      <div style={{position: 'absolute', left: 70, right: 70, top: 4, height: h - 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SERIF, fontWeight: 900, fontSize: fs, color: CREAM, letterSpacing: fs * 0.12, whiteSpace: 'nowrap'}}>{text}</div>
    </div>
  );
};

/** 蠟封章（不規則波浪圓＋文字），x,y＝中心 */
export const WaxSeal: React.FC<{f: number; at: number; x: number; y: number; r: number; text: string; font?: string; dim?: number; color?: string}> = (
  {f, at, x, y, r, text, font, dim = 1, color = '#9e2420'}) => {
  if (f < at) return null;
  const p = pop(f, at, 10);
  const sc = 1.8 - 0.8 * Math.min(1, interpolate(f, [at, at + 7], [0, 1], clamp));
  const edge = Array.from({length: 18}, (_, i) => {
    const a = (i / 18) * Math.PI * 2;
    const rr = r * (1 + (random(`seal${text}${i}`) - 0.5) * 0.14 + (i % 2) * 0.05);
    return {x: r * 1.15 + Math.cos(a) * rr, y: r * 1.15 + Math.sin(a) * rr};
  });
  const fs = r * (isAscii(text) ? (text.length > 2 ? 0.62 : 0.95) : text.length > 1 ? 0.62 : 0.9);
  return (
    <div style={{position: 'absolute', left: x - r * 1.15, top: y - r * 1.15, width: r * 2.3, height: r * 2.3, opacity: Math.min(1, (f - at) / 3) * dim,
      transform: `scale(${sc * Math.min(1, p + 0.2)}) rotate(${-8 + (1 - Math.min(1, p)) * -16}deg)`}}>
      <svg width={r * 2.3} height={r * 2.3} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={smooth(edge, true)} fill={color} stroke="#5e1210" strokeWidth={Math.max(2, r * 0.05)} />
        <circle cx={r * 1.15} cy={r * 1.15} r={r * 0.74} fill="none" stroke="#e8a59a" strokeWidth={Math.max(1.5, r * 0.03)} strokeDasharray={`${r * 0.1} ${r * 0.08}`} opacity={0.7} />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: font ?? (isAscii(text) ? CINZEL : SERIF), fontWeight: 900, fontSize: fs, color: '#f6d3c5', lineHeight: 1}}>{text}</div>
    </div>
  );
};

/** 地圖上直接寫的字（紙色描邊，壓在地形上也看得清） */
export const MapText: React.FC<{f: number; at: number; x: number; y: number; text: string; size: number; color?: string; font?: string;
  anchor?: 'l' | 'c' | 'r'; rot?: number; ls?: number}> = ({f, at, x, y, text, size, color = INK, font, anchor = 'c', rot = 0, ls = 2}) => {
  if (f < at) return null;
  const v = pr(f, at, 10);
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(${tx}, ${(1 - v) * 16}px) rotate(${rot}deg)`, opacity: v,
      fontFamily: font ?? SERIF, fontWeight: 900, fontSize: size, color, whiteSpace: 'nowrap', letterSpacing: ls, lineHeight: 1.15,
      WebkitTextStroke: `${Math.max(8, size * 0.2)}px ${PAPER}`, paintOrder: 'stroke fill'}}>{text}</div>
  );
};
