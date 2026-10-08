/* 範本L 黏土玩具風工具箱（2026-10-08，從屏榮招生片「黏土玩具風」抽出、拿掉所有寫死的內容）：
   字型、色票、漸層定義、落下壓扁回彈、地面柔影、厚實立體字、黏土卡片、章節膠囊、翻頁捲角。
   所有物件都是「圓潤有厚度」：頂部亮、底部暗的漸層＋內陰影＋地面柔影。
   規則：①隨機一律 random(seed) ②不用 feTurbulence／大模糊（柔影用徑向漸層或多層位移）③顏色變化都是 6 格以上的漸變。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadBaloo} from '@remotion/google-fonts/Baloo2';

export const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const BALOO = loadBaloo('normal', {weights: ['800'], subsets: ['latin'], ignoreTooManyRequestsWarning: true}).fontFamily;
/** 立體字字型：英數用 Baloo 2 圓胖字，中文自動退回 Noto Sans TC */
export const FAT = `${BALOO}, ${TC}`;

export const OR = '#d9663a';
export const NV = '#1f3a7a';
export const MU = '#e0a52e';
export const GR = '#3aa86b';
export const BGC = '#e9e5dc';
export const SKY = '#6fa8e8';
export const PINK = '#f2a7b5';
export const RED = '#d94a4a';
export const WOOD = '#b97a45';
export const CREAM = '#fbf8f2';
export const GOLD = '#e9b93a';
export const INK = '#2a2230';
/** 攝影棚背景（暖米白、中央亮四周暗） */
export const STAGE_BG = 'radial-gradient(ellipse 78% 72% at 50% 40%, #f5f2eb 0%, #ebe7de 52%, #dbd5c8 100%)';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** 進度 0→1（緩動） */
export const pr = (f: number, at: number, dur = 15) => interpolate(f, [at, at + dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
/** 彈出（spring 0→1，有回彈） */
export const pop = (f: number, at: number, damping = 11) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping, stiffness: 180}}));

const hx = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
/** 兩色混合（t=0 → a，t=1 → b） */
export const mix = (a: string, b: string, t: number) => {
  const A = hx(a), B = hx(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
};

/* ───── 全域 SVG 漸層：G(key) 直向（頂亮底暗）、R(key) 球面 ───── */
export const PAL: Record<string, string> = {
  o: OR, b: NV, y: MU, g: GR, s: SKY, p: PINK, r: RED, wd: WOOD, w: CREAM, gd: GOLD, k: '#34343f', gr: '#b9b4aa',
  t: '#5cc3e0', fur: '#eeae5c', mz: '#f8d7a6', furd: '#d58c3e', bp: '#24427f', lg: '#8fd0a4', pc: '#2f8a57', br: '#8a5a3c',
};
export const G = (k: string) => `url(#cgv-${k})`;
export const R = (k: string) => `url(#cgr-${k})`;
export const ClayDefs: React.FC = () => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      {Object.entries(PAL).map(([k, c]) => (
        <React.Fragment key={k}>
          <linearGradient id={`cgv-${k}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={mix(c, '#ffffff', 0.38)} />
            <stop offset="0.45" stopColor={c} />
            <stop offset="1" stopColor={mix(c, '#000000', 0.24)} />
          </linearGradient>
          <radialGradient id={`cgr-${k}`} cx="0.38" cy="0.3" r="0.78">
            <stop offset="0" stopColor={mix(c, '#ffffff', 0.45)} />
            <stop offset="0.5" stopColor={c} />
            <stop offset="1" stopColor={mix(c, '#000000', 0.28)} />
          </radialGradient>
        </React.Fragment>
      ))}
    </defs>
  </svg>
);

/* ───── 落下＋壓扁回彈 ───── */
export const drop = (f: number, at: number, h = 420) => {
  const t = f - at;
  const FALL = 10;
  if (t < 0) return {y: -h, sx: 1, sy: 1, o: 0, sh: 0};
  if (t < FALL) {
    const e = (t / FALL) ** 2;
    return {y: -h * (1 - e), sx: 0.93, sy: 1.08, o: Math.min(1, t / 3), sh: e};
  }
  const u = t - FALL;
  const k = Math.exp(-u / 5) * Math.cos(u * 0.85);
  return {y: 0, sx: 1 + 0.15 * k, sy: 1 - 0.15 * k, o: 1, sh: 1};
};

/** 地面橢圓柔影 */
export const Shadow: React.FC<{x: number; y: number; w: number; o?: number}> = ({x, y, w, o = 1}) => (
  <div style={{position: 'absolute', left: x - w / 2, top: y - w * 0.09, width: w, height: w * 0.18, borderRadius: '50%',
    background: 'radial-gradient(closest-side, rgba(70,50,30,0.36), rgba(70,50,30,0))', opacity: o}} />
);

/** 物件從上方掉進來：以 (x,y) 為「底部中央」落地點；sw＝地面柔影寬（0＝不畫） */
export const Drop: React.FC<{f: number; at: number; x: number; y: number; sw?: number; h?: number; children: React.ReactNode}> = (
  {f, at, x, y, sw = 200, h = 420, children}) => {
  if (f < at) return null;
  const d = drop(f, at, h);
  return (
    <>
      {sw > 0 && <Shadow x={x} y={y} w={sw * (0.45 + 0.55 * d.sh)} o={d.sh} />}
      {/* 還在空中（尚未落地）時不量版面：從畫面上方掉下來的那幾格本來就會超出畫面 */}
      <div data-qa={Math.abs(d.y) > 4 ? 'ignore' : undefined} style={{position: 'absolute', left: x, top: y}}>
        <div style={{position: 'absolute', left: 0, bottom: 0, transform: `translate(-50%, ${d.y}px) scale(${d.sx}, ${d.sy})`,
          transformOrigin: '50% 100%', opacity: d.o}}>{children}</div>
      </div>
    </>
  );
};

/** 彈出（卡片類）：以 (x,y) 為底部中央；out＝在這一格開始縮小消失 */
export const Pop: React.FC<{f: number; at: number; x: number; y: number; out?: number; rot?: number; children: React.ReactNode}> = (
  {f, at, x, y, out, rot = 0, children}) => {
  if (f < at) return null;
  let p = pop(f, at, 10);
  let o = interpolate(f, [at, at + 4], [0, 1], clamp);
  if (out !== undefined && f >= out) {
    const q = interpolate(f, [out, out + 8], [1, 0], clamp);
    p *= q;
    o *= q;
    if (q <= 0) return null;
  }
  return (
    <div style={{position: 'absolute', left: x, top: y}}>
      <div style={{position: 'absolute', left: 0, bottom: 0, transform: `translateX(-50%) scale(${p}) rotate(${rot}deg)`, transformOrigin: '50% 100%', opacity: o}}>
        {children}
      </div>
    </div>
  );
};

/** 立體字的厚度陰影（多層 text-shadow 疊出側面＋地面柔影） */
export const depthShadow = (size: number, color: string, depth?: number) => {
  const dp = depth ?? Math.max(6, Math.min(14, Math.round(size * 0.075)));
  const side = mix(color, '#000000', 0.32);
  return Array.from({length: dp}, (_, i) => `0 ${i + 1}px 0 ${mix(side, '#000000', (i / dp) * 0.25)}`).join(',') +
    `, 0 ${dp + 12}px ${Math.round(size * 0.12)}px rgba(70,48,25,0.30)`;
};

/* ───── 厚實立體字：底層多層 text-shadow 疊出厚度，頂層漸層字面（頂層標 ignore：同一段字不重複量版面） ───── */
export const Clay3D: React.FC<{text: string; size: number; color: string; depth?: number; font?: string; style?: React.CSSProperties}> = (
  {text, size, color, depth, font = FAT, style}) => {
  const side = mix(color, '#000000', 0.32);
  const base: React.CSSProperties = {fontFamily: font, fontWeight: 900, fontSize: size, lineHeight: 1.1, whiteSpace: 'nowrap', letterSpacing: size * 0.02};
  return (
    <div style={{position: 'relative', ...base, ...style}}>
      <span style={{display: 'inline-block', color: side, textShadow: depthShadow(size, color, depth), WebkitTextStroke: `${size * 0.02}px ${side}`}}>{text}</span>
      <span data-qa="ignore" style={{position: 'absolute', left: 0, top: 0, color: 'transparent',
        backgroundImage: `linear-gradient(to bottom, ${mix(color, '#ffffff', 0.42)} 8%, ${color} 52%, ${mix(color, '#000000', 0.14)} 100%)`,
        WebkitBackgroundClip: 'text', backgroundClip: 'text'}}>{text}</span>
    </div>
  );
};

/* ───── 黏土卡片（軟糖感膠囊） ───── */
export const Card: React.FC<{children: React.ReactNode; bg?: string; fg?: string; size?: number; style?: React.CSSProperties}> = (
  {children, bg = CREAM, fg = NV, size = 40, style}) => (
  <div style={{padding: `${size * 0.32}px ${size * 0.8}px`, borderRadius: size * 0.7, whiteSpace: 'nowrap', textAlign: 'center',
    background: `linear-gradient(to bottom, ${mix(bg, '#ffffff', 0.5)}, ${bg} 50%, ${mix(bg, '#000000', 0.07)})`,
    boxShadow: `inset 0 3px 0 rgba(255,255,255,0.75), inset 0 -5px 10px rgba(0,0,0,0.07), 0 ${size * 0.2}px 0 ${mix(bg, '#000000', 0.2)}, 0 ${size * 0.5}px ${size * 0.6}px rgba(70,50,30,0.22)`,
    fontFamily: TC, fontWeight: 900, fontSize: size, lineHeight: 1.25, color: fg, ...style}}>{children}</div>
);

/** 黏土小球（編號、勾勾、叉叉用）：直徑 d */
export const Ball: React.FC<{d: number; c: string; children?: React.ReactNode; fg?: string; font?: string}> = ({d, c, children, fg = '#fff', font = FAT}) => (
  <div style={{width: d, height: d, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `radial-gradient(circle at 36% 30%, ${mix(c, '#ffffff', 0.45)}, ${c} 55%, ${mix(c, '#000000', 0.25)})`,
    boxShadow: `0 ${d * 0.07}px 0 ${mix(c, '#000000', 0.3)}, 0 ${d * 0.16}px ${d * 0.2}px rgba(70,50,30,0.25)`,
    fontFamily: font, fontWeight: 900, fontSize: d * 0.58, color: fg, lineHeight: 1, textShadow: `0 ${d * 0.03}px 0 ${mix(c, '#000000', 0.3)}`}}>{children}</div>
);

/** 左上章節膠囊（學參考影片的「1 寫短」）：n＝第幾段 */
export const Chapter: React.FC<{f: number; at: number; n?: number; label: string}> = ({f, at, n, label}) => {
  const p = pop(f, at, 10);
  if (f < at) return null;
  const size = Math.max(26, Math.min(38, 560 / Math.max(1, Array.from(label).length)));
  return (
    <div style={{position: 'absolute', left: 56, top: 46, transform: `scale(${p})`, transformOrigin: '0% 50%', display: 'flex', alignItems: 'center', gap: 14,
      padding: '10px 40px 12px 14px', borderRadius: 40, background: `linear-gradient(to bottom, ${mix(OR, '#ffffff', 0.25)}, ${OR} 55%, ${mix(OR, '#000000', 0.12)})`,
      boxShadow: `inset 0 3px 0 rgba(255,255,255,0.35), 0 6px 0 ${mix(OR, '#000000', 0.3)}, 0 14px 18px rgba(70,50,30,0.25)`,
      fontFamily: TC, fontWeight: 900, fontSize: size, color: '#fff', whiteSpace: 'nowrap', lineHeight: 1.3}}>
      {n !== undefined ? (
        <span style={{width: 50, height: 50, borderRadius: 25, background: '#fff', color: OR, fontFamily: FAT, fontSize: 34, display: 'flex',
          alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.12)', flex: 'none'}}>{n}</span>
      ) : <span style={{width: 6}} />}
      <span>{label}</span>
    </div>
  );
};

/** 木頭／奶油色黏土桌（以桌面左上 x,y 為原點，寬 w、桌身高 h） */
export const Table: React.FC<{x: number; y: number; w: number; h?: number; o?: number; gray?: number}> = ({x, y, w, h = 150, o = 1, gray = 0}) => {
  const wood = mix(WOOD, '#9a948a', gray);
  const top = mix(CREAM, '#d6d2ca', gray);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h + 34, opacity: o}}>
      <div style={{position: 'absolute', left: 20, right: 20, top: 26, bottom: 0, borderRadius: '0 0 24px 24px',
        background: `repeating-linear-gradient(to right, ${mix(wood, '#000000', 0.08)} 0 6px, ${wood} 6px 120px), ${wood}`,
        boxShadow: 'inset 0 -10px 0 rgba(0,0,0,0.15), 0 14px 20px rgba(70,50,30,0.25)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 34, borderRadius: 17,
        background: `linear-gradient(to bottom, #ffffff, ${top} 50%, ${mix(top, '#000000', 0.12)})`, boxShadow: `0 6px 0 ${mix(top, '#000000', 0.2)}`}} />
    </div>
  );
};

/** 物件落地時噴出的小黏土球（seed 決定方向；落地後 46 格內淡出） */
export const Splash: React.FC<{f: number; at: number; x: number; y: number; w: number; n?: number; seed: string}> = ({f, at, x, y, w, n = 14, seed}) => {
  const t = f - at;
  if (t < 0 || t > 50) return null;
  return (
    <>
      {Array.from({length: n}, (_, k) => {
        const ang = -Math.PI * (0.08 + 0.84 * rnd(`${seed}a${k}`));
        const v = 8 + 7 * rnd(`${seed}v${k}`);
        const x0 = x - w / 2 + w * rnd(`${seed}x${k}`);
        const px = x0 + Math.cos(ang) * v * t;
        const py = y + Math.sin(ang) * v * t + 0.45 * t * t;
        const o = interpolate(t, [0, 4, 34, 46], [0, 1, 1, 0], clamp);
        const col = [OR, MU, GR, SKY, '#e889a0'][k % 5];
        const r = 8 + 8 * rnd(`${seed}r${k}`);
        if (py > 880) return null;
        return <div key={k} style={{position: 'absolute', left: px - r, top: py - r, width: r * 2, height: r * 2, borderRadius: '50%', opacity: o,
          background: `radial-gradient(circle at 35% 30%, ${mix(col, '#ffffff', 0.45)}, ${col} 55%, ${mix(col, '#000000', 0.25)})`}} />;
      })}
    </>
  );
};
const rnd = (s: string) => random(s);

/* ───── 翻頁捲角：右上角往左下翻過去 ───── */
type Pt = [number, number];
const W = 1920, H = 1080;
const L = Math.hypot(W, H);
const DX = -W / L, DY = H / L;
const proj = (p: Pt) => (p[0] - W) * DX + p[1] * DY;
const RECT: Pt[] = [[0, 0], [W, 0], [W, H], [0, H]];
const clipPoly = (poly: Pt[], g: (p: Pt) => number): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ga = g(a), gb = g(b);
    if (ga >= 0) out.push(a);
    if ((ga >= 0) !== (gb >= 0)) {
      const t = ga / (ga - gb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
};
const pts = (p: Pt[]) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');

/** p：0→1（連續）。children＝要翻走的舊頁（需自帶不透明背景） */
export const PageTurn: React.FC<{p: number; children: React.ReactNode}> = ({p, children}) => {
  const s = p * L;
  const old = clipPoly(RECT, (q) => proj(q) - s);
  if (old.length < 3) return null;
  const flapSrc = clipPoly(RECT, (q) => s - proj(q));
  const flap: Pt[] = flapSrc.map((q) => {
    const g = proj(q) - s;
    return [q[0] - 2 * g * DX, q[1] - 2 * g * DY];
  });
  const strip = clipPoly(clipPoly(RECT, (q) => s - proj(q)), (q) => proj(q) - (s - 110));
  const fold: Pt = [W + DX * s, DY * s];
  const tip: Pt = [W + DX * 2 * s, DY * 2 * s];
  const back: Pt = [W + DX * (s - 110), DY * (s - 110)];
  const clip = `polygon(${old.map((q) => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(',')})`;
  return (
    <div data-qa="ignore" style={{position: 'absolute', inset: 0}}>
      {strip.length >= 3 && (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="ptStrip" gradientUnits="userSpaceOnUse" x1={back[0]} y1={back[1]} x2={fold[0]} y2={fold[1]}>
              <stop offset="0" stopColor="#3a2a18" stopOpacity={0} />
              <stop offset="1" stopColor="#3a2a18" stopOpacity={0.28} />
            </linearGradient>
          </defs>
          <polygon points={pts(strip)} fill="url(#ptStrip)" />
        </svg>
      )}
      <div style={{position: 'absolute', inset: 0, clipPath: clip, WebkitClipPath: clip}}>{children}</div>
      {flap.length >= 3 && (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="ptFlap" gradientUnits="userSpaceOnUse" x1={fold[0]} y1={fold[1]} x2={tip[0]} y2={tip[1]}>
              <stop offset="0" stopColor="#cfcac1" />
              <stop offset="0.18" stopColor="#ebe8e2" />
              <stop offset="0.55" stopColor="#f7f5f1" />
              <stop offset="1" stopColor="#d9d5cd" />
            </linearGradient>
          </defs>
          {/* 翻起頁的柔影（多層位移、不用模糊濾鏡） */}
          {[18, 11, 5].map((d, i) => (
            <polygon key={i} points={pts(flap.map((q) => [q[0] - d * 0.6, q[1] + d] as Pt))} fill="#3a2a18" opacity={0.07 + i * 0.03} />
          ))}
          <polygon points={pts(flap)} fill="url(#ptFlap)" stroke="#c4bfb5" strokeWidth={1.5} />
        </svg>
      )}
    </div>
  );
};
