/* 範本I 漫畫風工具箱（2026-10-07，從屏榮招生片「漫畫風」抽出、拿掉所有寫死的內容）：
   字型、分格、網點、集中線、速度線、對話框、旁白框、擬聲字、爆炸徽章、大數字、漫畫小人。
   規則：①所有隨機都用 remotion 的 random(seed)，可決定 ②集中線「靜止」（只依格子 seed 畫一次，不隨時間換形，
   原版每 12 格換一次會被最終品檢判成畫面突跳）③速度線慢速平移 ④不用 feTurbulence／大模糊。 */
import React from 'react';
import {Easing, interpolate, random, spring, useCurrentFrame} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadBangers} from '@remotion/google-fonts/Bangers';

export const TC = loadTC('normal', {weights: ['900'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const EN = loadBangers('normal', {weights: ['400'], ignoreTooManyRequestsWarning: true}).fontFamily;

export const INK = '#111';
export const PAPER = '#fff';
export const Y = '#ffd23f';     // 唯一強調色：黃
export const RED = '#e2342b';   // 只用在測驗揭曉的紅圈

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** 進度 0→1（緩動） */
export const pr = (f: number, at: number, dur = 15) => interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
/** 彈出（spring 0→1，有回彈） */
export const pop = (f: number, at: number, damping = 11) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping, stiffness: 180}}));

/** 全域 SVG 圖樣（網點）。整支片放一次，其他 SVG 用 url(#id) 引用 */
export const Defs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <pattern id="cmHt" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx={7} cy={7} r={2.6} fill="#000" fillOpacity={0.28} />
      </pattern>
      <pattern id="cmHtD" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx={4.5} cy={4.5} r={2.6} fill="#000" fillOpacity={0.55} />
      </pattern>
      <pattern id="cmHtY" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <circle cx={6} cy={6} r={3.4} fill={Y} />
      </pattern>
    </defs>
  </svg>
);

/** 集中線（靜止：形狀只由 seed 決定，整格期間不變） */
export const Focus: React.FC<{w: number; h: number; cx?: number; cy?: number; n?: number; seed: string; inner?: number}> = (
  {w, h, cx = w / 2, cy = h / 2, n = 70, seed, inner = 0.34}) => {
  const R = Math.hypot(w, h);
  const rx = w * inner, ry = h * inner;
  const tris: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + random(`${seed}a${i}`) * 0.08;
    const k = 1 + random(`${seed}k${i}`) * 0.6;
    const wd = 0.008 + random(`${seed}w${i}`) * 0.022;
    const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k;
    const ox1 = cx + Math.cos(a - wd) * R, oy1 = cy + Math.sin(a - wd) * R;
    const ox2 = cx + Math.cos(a + wd) * R, oy2 = cy + Math.sin(a + wd) * R;
    tris.push(`M${px.toFixed(1)} ${py.toFixed(1)}L${ox1.toFixed(1)} ${oy1.toFixed(1)}L${ox2.toFixed(1)} ${oy2.toFixed(1)}Z`);
  }
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
      <path d={tris.join('')} fill={INK} />
    </svg>
  );
};

/** 速度線（橫向、慢速平移；每格位移小，不會造成閃動） */
export const Speed: React.FC<{w: number; h: number; n?: number; seed: string}> = ({w, h, n = 22, seed}) => {
  const f = useCurrentFrame();
  return (
    <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
      {Array.from({length: n}, (_, i) => {
        const y = random(`${seed}y${i}`) * h;
        const len = 120 + random(`${seed}l${i}`) * 420;
        const sp = 6 + random(`${seed}s${i}`) * 8;
        const x = ((random(`${seed}x${i}`) * (w + len) - f * sp) % (w + len) + (w + len)) % (w + len) - len;
        const th = 2 + random(`${seed}t${i}`) * 5;
        return <rect key={i} x={x} y={y} width={len} height={th} fill={INK} opacity={0.55} />;
      })}
    </svg>
  );
};

export type Bg = 'white' | 'ht' | 'focus' | 'speed' | 'yellow';

/** 一格漫畫：粗黑框，於 at 格「啪」地出現（3 格淡入＋輕微縮放，不做瞬間黑白反轉）。children 以格內左上為原點。
    tint：0→1 時底色漸變成黃色（測驗揭曉用） */
export const Panel: React.FC<{at: number; x: number; y: number; w: number; h: number; bg?: Bg; seed?: string;
  fx?: number; fy?: number; tint?: number; children?: React.ReactNode}> = ({at, x, y, w, h, bg = 'white', seed = 'p', fx, fy, tint = 0, children}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pop(f, at, 12);
  const sc = 1 + 0.08 * (1 - k);
  const op = interpolate(f, [at, at + 4], [0, 1], clamp);
  const iw = w - 16, ih = h - 16;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `scale(${sc})`, opacity: op,
      border: `8px solid ${INK}`, background: bg === 'yellow' ? Y : PAPER, overflow: 'hidden', boxSizing: 'border-box'}}>
      {tint > 0 && <div style={{position: 'absolute', inset: 0, background: Y, opacity: tint}} />}
      {bg === 'ht' && (
        <svg width={iw} height={ih} style={{position: 'absolute', left: 0, top: 0}}>
          <rect width={iw} height={ih} fill="url(#cmHt)" />
          <ellipse cx={iw * 0.5} cy={ih * 0.5} rx={iw * 0.42} ry={ih * 0.42} fill="#fff" opacity={0.75 * (1 - tint)} />
        </svg>
      )}
      {bg === 'yellow' && (
        <svg width={iw} height={ih} style={{position: 'absolute', left: 0, top: 0}}><rect width={iw} height={ih} fill="url(#cmHt)" opacity={0.5} /></svg>
      )}
      {bg === 'focus' && <Focus w={iw} h={ih} cx={fx ?? iw / 2} cy={fy ?? ih / 2} seed={seed} />}
      {bg === 'speed' && <Speed w={iw} h={ih} seed={seed} />}
      {children}
    </div>
  );
};

export type Anchor = 'tl' | 'tc' | 'cc';
const anchorT = (a: Anchor) => (a === 'tc' ? 'translate(-50%, 0) ' : a === 'cc' ? 'translate(-50%, -50%) ' : '');

/** 在 at 格彈出的容器（anchor：tl＝x,y 是左上、tc＝上緣中點、cc＝正中心） */
export const Pop: React.FC<{at: number; x: number; y: number; rot?: number; anchor?: Anchor; damping?: number; children?: React.ReactNode}> = (
  {at, x, y, rot = 0, anchor = 'tl', damping = 10, children}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pop(f, at, damping);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `${anchorT(anchor)}scale(${k}) rotate(${rot}deg)`, transformOrigin: 'center'}}>
      {children}
    </div>
  );
};

export type TxtKind = 'box' | 'ybox' | 'pop' | 'ink' | 'plain';
/** 文字字寬（NotoSansTC 900＋字距 2 的實際寬度；全形 1.04、半形 0.6） */
export const cw = (s: string, size: number) => Array.from(s).reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? 0.6 : 1.04), 0) * size + Array.from(s).length * 2;
/** 多行文字在 maxW 內放得下的字級（不超過 base、不小於 min） */
export const fitLines = (lines: string[], maxW: number, base: number, min = 26) =>
  Math.max(min, Math.min(base, ...lines.map((ln) => Math.floor(base * maxW / Math.max(1, cw(ln, base))))));
/** 框類文字的外框寬（含內距與邊框） */
export const boxW = (s: string, size: number) => cw(s, size) + size * 0.64 + 10;

/** 文字：box＝白底黑框旁白框、ybox＝黃底、pop＝黃字黑邊、ink＝黑字白邊、plain＝黑字。lines＝多行（每行一個元素） */
export const Txt: React.FC<{at: number; x: number; y: number; size: number; kind?: TxtKind; rot?: number; font?: string; anchor?: Anchor;
  align?: 'left' | 'center'; lines?: string[]; children?: React.ReactNode}> = (
  {at, x, y, size, kind = 'box', rot = 0, font = TC, anchor = 'tl', align = 'left', lines, children}) => {
  const base: React.CSSProperties = {fontFamily: font, fontWeight: font === TC ? 900 : 400, fontSize: size, lineHeight: 1.18,
    whiteSpace: 'nowrap', color: INK, letterSpacing: font === TC ? 2 : 3, textAlign: align};
  let st: React.CSSProperties = {};
  if (kind === 'box' || kind === 'ybox') {
    st = {background: kind === 'ybox' ? Y : PAPER, border: `5px solid ${INK}`, padding: `${size * 0.12}px ${size * 0.32}px`, boxShadow: `6px 6px 0 ${INK}`};
  } else if (kind === 'pop') {
    st = {color: Y, WebkitTextStroke: `${Math.max(8, size * 0.1)}px ${INK}`, paintOrder: 'stroke fill', textShadow: `${size * 0.05}px ${size * 0.05}px 0 ${INK}`};
  } else if (kind === 'ink') {
    st = {WebkitTextStroke: `${Math.max(8, size * 0.1)}px #fff`, paintOrder: 'stroke fill'};
  }
  return (
    <Pop at={at} x={x} y={y} rot={rot} anchor={anchor}>
      <div style={{...base, ...st}}>{lines ? lines.map((ln, i) => <div key={i}>{ln}</div>) : children}</div>
    </Pop>
  );
};

/** 擬聲字：斜放、黑邊黃字，出現時抖一下（只抖 10 格、小範圍） */
export const Sfx: React.FC<{at: number; x: number; y: number; size?: number; rot?: number; text: string}> = (
  {at, x, y, size = 110, rot = -12, text}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const sh = interpolate(f, [at, at + 10], [1, 0], clamp);
  const dx = Math.sin(f * 2.3) * 5 * sh, dy = Math.cos(f * 2.9) * 5 * sh;
  return (
    <Pop at={at} x={x + dx} y={y + dy} rot={rot} damping={8}>
      <div style={{fontFamily: TC, fontWeight: 900, fontSize: size, color: Y, whiteSpace: 'nowrap', lineHeight: 1,
        WebkitTextStroke: `${size * 0.13}px ${INK}`, paintOrder: 'stroke fill', textShadow: `${size * 0.07}px ${size * 0.07}px 0 ${INK}`,
        fontStyle: 'italic'}}>{text}</div>
    </Pop>
  );
};

/** 對話框：白底黑邊橢圓＋尾巴。tail 為相對於框左上的尾巴尖端座標；lines 多行置中 */
export const Bubble: React.FC<{at: number; x: number; y: number; w: number; h: number; size: number; tail: [number, number];
  lines: string[]; fill?: string}> = ({at, x, y, w, h, size, tail, lines, fill = '#fff'}) => {
  const cx = w / 2, cy = h / 2, rx = w / 2 - 6, ry = h / 2 - 6;
  const a = Math.atan2(tail[1] - cy, tail[0] - cx);
  const p = (t: number) => `${(cx + Math.cos(t) * rx * 0.85).toFixed(1)},${(cy + Math.sin(t) * ry * 0.85).toFixed(1)}`;
  const tri = `${p(a - 0.22)} ${tail[0]},${tail[1]} ${p(a + 0.22)}`;
  return (
    <Pop at={at} x={x} y={y}>
      <div style={{position: 'relative', width: w, height: h}}>
        <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
          <polygon points={tri} fill={fill} stroke={INK} strokeWidth={12} strokeLinejoin="round" />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={fill} stroke={INK} strokeWidth={6} />
          <polygon points={tri} fill={fill} />
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          fontFamily: TC, fontWeight: 900, fontSize: size, lineHeight: 1.18, color: INK, whiteSpace: 'nowrap', letterSpacing: 2}}>
          {lines.map((ln, i) => <div key={i}>{ln}</div>)}
        </div>
      </div>
    </Pop>
  );
};

/** 爆炸星形徽章 */
export const Burst: React.FC<{at: number; x: number; y: number; size: number; rot?: number; text: string; anchor?: Anchor}> = (
  {at, x, y, size, rot = -6, text, anchor = 'tl'}) => {
  const w = cw(text, size) + size * 3.2, h = size * 3.4;
  const n = 16;
  const pts = Array.from({length: n * 2}, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 ? 0.78 : 1;
    return `${(w / 2 + Math.cos(a) * (w / 2 - 6) * r).toFixed(1)},${(h / 2 + Math.sin(a) * (h / 2 - 6) * r).toFixed(1)}`;
  }).join(' ');
  return (
    <Pop at={at} x={x} y={y} rot={rot} anchor={anchor}>
      <div style={{position: 'relative', width: w, height: h}}>
        <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
          <polygon points={pts} fill={Y} stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: TC, fontWeight: 900, fontSize: size, color: INK, whiteSpace: 'nowrap', letterSpacing: 2}}>{text}</div>
      </div>
    </Pop>
  );
};

/** 混合字型的大數字（英數用 Bangers、中文用 NotoSansTC），parts＝[文字, 字級, 是否英數]；anchor 預設正中心 */
export const Num: React.FC<{at: number; x: number; y: number; parts: [React.ReactNode, number, boolean?][]; rot?: number; anchor?: Anchor}> = (
  {at, x, y, parts, rot = 0, anchor = 'cc'}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = interpolate(f, [at, at + 4, at + 8], [0.2, 1.12, 1], clamp);
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `${anchorT(anchor)}scale(${k}) rotate(${rot}deg)`, transformOrigin: 'center',
      display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
      {parts.map(([t, size, en], i) => (
        <span key={i} style={{fontFamily: en ? EN : TC, fontWeight: en ? 400 : 900, fontSize: size, lineHeight: 1, color: Y,
          letterSpacing: en ? 4 : 2, WebkitTextStroke: `${Math.max(9, size * 0.08)}px ${INK}`, paintOrder: 'stroke fill',
          textShadow: `${size * 0.045}px ${size * 0.045}px 0 ${INK}`, marginRight: i < parts.length - 1 ? Math.max(10, size * 0.14) : 0}}>{t}</span>
      ))}
    </div>
  );
};

/** 打勾（黃勾黑邊），在 at 格畫出 */
export const Check: React.FC<{at: number; x: number; y: number; size: number}> = ({at, x, y, size}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pr(f, at, 8);
  const L = 150;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{position: 'absolute', left: x, top: y, overflow: 'visible'}}>
      <path d="M14 52 L40 78 L90 16" fill="none" stroke={INK} strokeWidth={26} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - k)} />
      <path d="M14 52 L40 78 L90 16" fill="none" stroke={Y} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={L} strokeDashoffset={L * (1 - k)} />
    </svg>
  );
};

/** 紅圈（手繪感橢圓、畫出來），揭曉答案用；x,y 為圓心 */
export const RedCircle: React.FC<{at: number; x: number; y: number; rx: number; ry: number}> = ({at, x, y, rx, ry}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pr(f, at, 12);
  const d = `M ${x + rx} ${y} A ${rx} ${ry} 0 1 1 ${x + rx * 0.96} ${y - ry * 0.28} L ${x + rx * 1.02} ${y - ry * 0.36}`;
  const L = Math.PI * (rx + ry) * 1.12;
  return (
    <svg width={1} height={1} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <path d={d} fill="none" stroke={RED} strokeWidth={12} strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - k)} transform={`rotate(-4 ${x} ${y})`} />
    </svg>
  );
};

/* ───────── 漫畫小人 ───────── */
export type Expr = 'happy' | 'wow' | 'smile' | 'think' | 'grin';
export type Pose = 'down' | 'up' | 'point' | 'wave' | 'hold' | 'cheer';

const arm = (sx: number, sy: number, hx: number, hy: number, bend = 1) => {
  const mx = (sx + hx) / 2 + (hy - sy) * 0.18 * bend, my = (sy + hy) / 2 - (hx - sx) * 0.18 * bend;
  return `M${sx} ${sy} Q${mx} ${my} ${hx} ${hy}`;
};

/** 漫畫小人（寬＝高×2/3，x,y 為左上；輕微上下晃動） */
export const Kid: React.FC<{at: number; x: number; y: number; h: number; expr?: Expr; pose?: Pose; girl?: boolean; flip?: boolean;
  hat?: 'grad' | 'none'; glasses?: boolean; seed?: number}> = (
  {at, x, y, h, expr = 'smile', pose = 'down', girl = false, flip = false, hat = 'none', glasses = false, seed = 0}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pop(f, at, 10);
  const bob = Math.sin((f + seed * 7) / 5) * 4;
  const w = (h * 2) / 3;
  const wav = Math.sin((f + seed * 3) / 3) * 10;
  let L: [number, number] = [46, 214], R: [number, number] = [154, 214];
  if (pose === 'up') { L = [34, 66]; R = [166, 66]; }
  if (pose === 'point') { R = [190, 100]; }
  if (pose === 'wave') { R = [172 + wav * 0.6, 70]; }
  if (pose === 'hold') { L = [84, 186]; R = [116, 186]; }
  if (pose === 'cheer') { R = [166, 62 + wav * 0.5]; L = [52, 190]; }
  const front = pose === 'hold';
  const arms = (
    <g>
      <path d={arm(66, 150, L[0], L[1], pose === 'hold' ? -1 : 1)} stroke={INK} strokeWidth={22} fill="none" strokeLinecap="round" />
      <path d={arm(66, 150, L[0], L[1], pose === 'hold' ? -1 : 1)} stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" />
      <path d={arm(134, 150, R[0], R[1], -1)} stroke={INK} strokeWidth={22} fill="none" strokeLinecap="round" />
      <path d={arm(134, 150, R[0], R[1], -1)} stroke="#fff" strokeWidth={10} fill="none" strokeLinecap="round" />
      <circle cx={L[0]} cy={L[1]} r={11} fill="#fff" stroke={INK} strokeWidth={5} />
      <circle cx={R[0]} cy={R[1]} r={11} fill="#fff" stroke={INK} strokeWidth={5} />
    </g>
  );
  const eyesY = 80;
  let face: React.ReactNode;
  if (expr === 'happy' || expr === 'grin') {
    face = (
      <g>
        <path d="M70 84 Q80 70 90 84 M110 84 Q120 70 130 84" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
        {expr === 'happy'
          ? <path d="M82 98 Q100 126 118 98 Z" fill={INK} />
          : <path d="M76 96 Q100 132 124 96 Z" fill="#fff" stroke={INK} strokeWidth={5} strokeLinejoin="round" />}
        <path d="M62 96 l-6 9 M70 97 l-6 9 M138 96 l-6 9 M146 97 l-6 9" stroke={INK} strokeWidth={3} />
      </g>
    );
  } else if (expr === 'wow') {
    face = (
      <g>
        <circle cx={80} cy={eyesY} r={12} fill={INK} /><circle cx={120} cy={eyesY} r={12} fill={INK} />
        <circle cx={76} cy={eyesY - 4} r={4} fill="#fff" /><circle cx={116} cy={eyesY - 4} r={4} fill="#fff" />
        <ellipse cx={100} cy={108} rx={9} ry={12} fill={INK} />
      </g>
    );
  } else if (expr === 'think') {
    face = (
      <g>
        <ellipse cx={82} cy={eyesY - 2} rx={5} ry={8} fill={INK} /><ellipse cx={122} cy={eyesY - 2} rx={5} ry={8} fill={INK} />
        <path d="M88 106 L112 102" stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d="M158 40 Q150 54 158 60 Q166 54 158 40 Z" fill="#fff" stroke={INK} strokeWidth={4} />
      </g>
    );
  } else {
    face = (
      <g>
        <ellipse cx={80} cy={eyesY} rx={5.5} ry={9} fill={INK} /><ellipse cx={120} cy={eyesY} rx={5.5} ry={9} fill={INK} />
        <path d="M84 100 Q100 114 116 100" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <div style={{position: 'absolute', left: x, top: y + bob, width: w, height: h, transform: `scale(${flip ? -k : k}, ${k})`, transformOrigin: '50% 100%'}}>
      <svg width={w} height={h} viewBox="0 0 200 300" style={{overflow: 'visible'}}>
        <path d="M86 228 L80 284 M114 228 L120 284" stroke={INK} strokeWidth={11} strokeLinecap="round" />
        <ellipse cx={74} cy={288} rx={15} ry={8} fill={INK} /><ellipse cx={126} cy={288} rx={15} ry={8} fill={INK} />
        {!front && arms}
        <path d="M62 140 Q100 126 138 140 L148 234 L52 234 Z" fill="#fff" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        {girl && <path d="M54 210 L146 210 L158 244 L42 244 Z" fill="url(#cmHtD)" stroke={INK} strokeWidth={6} strokeLinejoin="round" />}
        <path d="M100 140 L92 152 L100 192 L108 152 Z" fill={Y} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        {front && arms}
        {girl && <path d="M44 80 Q40 150 64 156 L70 90 Z M156 80 Q160 150 136 156 L130 90 Z" fill={INK} />}
        <circle cx={100} cy={74} r={56} fill="#fff" stroke={INK} strokeWidth={7} />
        {girl
          ? <path d="M42 86 Q34 10 100 12 Q166 10 158 86 Q150 54 128 46 Q118 62 96 60 Q72 58 64 46 Q50 56 42 86 Z" fill={INK} />
          : <path d="M44 72 Q38 10 100 14 Q162 10 156 72 L146 50 L136 62 L124 40 L112 58 L100 36 L88 58 L76 40 L64 62 L54 50 Z" fill={INK} />}
        {girl && <circle cx={140} cy={36} r={9} fill={Y} stroke={INK} strokeWidth={4} />}
        {face}
        {glasses && <g fill="none" stroke={INK} strokeWidth={5}><circle cx={80} cy={80} r={16} /><circle cx={120} cy={80} r={16} /><path d="M96 80 L104 80" /></g>}
        {hat === 'grad' && (
          <g>
            <path d="M100 -6 L160 16 L100 38 L40 16 Z" fill={INK} />
            <path d="M68 26 L68 40 Q100 52 132 40 L132 26" fill={INK} />
            <path d="M160 16 L160 50" stroke={Y} strokeWidth={5} /><circle cx={160} cy={54} r={6} fill={Y} stroke={INK} strokeWidth={3} />
          </g>
        )}
      </svg>
    </div>
  );
};
