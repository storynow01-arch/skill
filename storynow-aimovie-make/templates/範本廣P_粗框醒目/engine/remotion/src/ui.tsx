/* 廣P「粗框醒目」（新粗野主義）共用介面元件（原作 ad05/ui.tsx）：
   粗黑框＋硬陰影的視窗、按鈕、游標、勾選框、開關、貼紙、跑馬燈膠帶、點陣桌面、爆開小方塊、工作列。
   所有動畫只由章內格數 t 決定。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import T from './timeline.json';
import {MONO, SG, TC} from './fonts';
import {EIO, EO, LIN, k, lerp, rnd, sp} from './kit';

export {MONO, SG, TC};

/* 原色配色＋黑框（原作） */
export const C = {y: '#ffe14d', b: '#3a5bff', p: '#ff6fb5', m: '#4dffb8', w: '#fffdf5', k: '#111'};
export const abs: React.CSSProperties = {position: 'absolute'};
/** 估字寬（中文 1 字＝1 字級、英數 0.6） */
export const emw = (s: string) => Array.from(s).reduce((a, c) => a + ((c.codePointAt(0) ?? 0) >= 0x2e80 ? 1 : c === ' ' ? 0.3 : 0.6), 0);

/** 粗框＋硬陰影 */
export const bx = (bg: string, sh = 12, bw = 6): React.CSSProperties => ({
  background: bg, border: `${bw}px solid ${C.k}`, boxShadow: sh > 0 ? `${sh}px ${sh}px 0 ${C.k}` : 'none', boxSizing: 'border-box',
});
/** 彈出（0→略超過 1 再回 1） */
export const pop = (t: number, at: number) => sp(t, at, 11, 260, 0.7);
/** 按一下：按下→放開（0→1→0） */
export const tap = (t: number, at: number, hold = 5) => Math.max(0, k(t, at, at + 2, LIN) - k(t, at + hold, at + hold + 5, EO));

/** 游標路徑：keys＝[格, x, y]，段與段之間急進急出 */
export const path = (t: number, keys: [number, number, number][]): [number, number] => {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b[0]) {
      const p = k(t, a[0], b[0], EIO);
      return [lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
    }
  }
  const z = keys[keys.length - 1];
  return [z[1], z[2]];
};

/* ───── 點陣桌面 ───── */
export const DotBg: React.FC<{bg: string; dot?: string}> = ({bg, dot = 'rgba(17,17,17,0.2)'}) => (
  <AbsoluteFill style={{background: bg, backgroundImage: `radial-gradient(${dot} 2.6px, transparent 3.2px)`, backgroundSize: '44px 44px', backgroundPosition: '22px 22px'}} />
);

/* ───── 視窗 ───── */
export const Win: React.FC<{
  x: number; y: number; w: number; h: number; title: string; bar?: string; bg?: string; s?: number; rot?: number; sh?: number;
  dx?: number; dy?: number; ox?: string; barH?: number; titleColor?: string; children?: React.ReactNode; style?: React.CSSProperties;
}> = (p) => {
  const s = p.s ?? 1;
  if (s <= 0.002) return null;
  const bh = p.barH ?? 56;
  return (
    <div style={{...abs, left: p.x, top: p.y, width: p.w, height: p.h, ...bx(p.bg ?? C.w, p.sh ?? 12), display: 'flex', flexDirection: 'column',
      transform: `translate(${p.dx ?? 0}px,${p.dy ?? 0}px) rotate(${p.rot ?? 0}deg) scale(${s})`, transformOrigin: p.ox ?? 'center', ...p.style}}>
      <div style={{height: bh, flex: `0 0 ${bh}px`, background: p.bar ?? C.y, borderBottom: `6px solid ${C.k}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', overflow: 'hidden'}}>
        {[C.p, C.y, C.m].map((c, i) => (
          <div key={i} style={{width: 22, height: 22, flex: '0 0 22px', background: c, border: `4px solid ${C.k}`, boxSizing: 'border-box'}} />
        ))}
        <div style={{fontFamily: MONO, fontWeight: 700, fontSize: 28, color: p.titleColor ?? (p.bar === C.b ? C.w : C.k), marginLeft: 10, whiteSpace: 'nowrap', flex: 1, overflow: 'hidden'}}>{p.title}</div>
        <div style={{width: 34, height: 34, flex: '0 0 34px', background: C.w, border: `4px solid ${C.k}`, boxSizing: 'border-box', position: 'relative'}}>
          <div style={{...abs, left: 4, top: 11, width: 18, height: 4, background: C.k, transform: 'rotate(45deg)'}} />
          <div style={{...abs, left: 4, top: 11, width: 18, height: 4, background: C.k, transform: 'rotate(-45deg)'}} />
        </div>
      </div>
      <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>{p.children}</div>
    </div>
  );
};

/* ───── 按鈕：按下時陰影縮成 0、位移補回 ───── */
export const Btn: React.FC<{x: number; y: number; w: number; h: number; bg: string; press?: number; s?: number; rot?: number; sh?: number; children?: React.ReactNode; style?: React.CSSProperties}> = (p) => {
  const s = p.s ?? 1;
  if (s <= 0.002) return null;
  const sh = p.sh ?? 14;
  const pr = p.press ?? 0;
  const o = sh * pr;
  return (
    <div style={{...abs, left: p.x, top: p.y, width: p.w, height: p.h, ...bx(p.bg, sh * (1 - pr)), display: 'flex', alignItems: 'center', justifyContent: 'center',
      transform: `translate(${o}px,${o}px) rotate(${p.rot ?? 0}deg) scale(${s})`, ...p.style}}>
      {p.children}
    </div>
  );
};

/* ───── 游標（白箭頭＋硬陰影；click＝點擊放射線進度 0→1） ───── */
export const Cursor: React.FC<{x: number; y: number; down?: number; click?: number; s?: number}> = ({x, y, down = 0, click = 0, s = 1.7}) => {
  const d = 'M0,0 L0,46 L12,35 L20,54 L29,50 L21,32 L37,32 Z';
  const sc = s * (1 - 0.12 * down);
  return (
    <div style={{...abs, left: x, top: y, width: 0, height: 0}}>
      {click > 0 && click < 1 && (
        <svg style={{...abs, left: -80, top: -80, overflow: 'visible'}} width={160} height={160}>
          {Array.from({length: 7}, (_, i) => {
            const a = (-Math.PI * 0.95) + (i / 6) * Math.PI * 0.9 - 0.2;
            const r0 = 30 + 40 * click, r1 = 52 + 50 * click;
            return <line key={i} x1={80 + Math.cos(a) * r0} y1={80 + Math.sin(a) * r0} x2={80 + Math.cos(a) * r1} y2={80 + Math.sin(a) * r1}
              stroke={C.k} strokeWidth={8 * (1 - click) + 1} strokeLinecap="square" />;
          })}
        </svg>
      )}
      <svg style={{...abs, left: -4, top: -4, overflow: 'visible', transform: `scale(${sc})`, transformOrigin: '4px 4px'}} width={60} height={70}>
        <path d={d} transform="translate(9,9)" fill={C.k} />
        <path d={d} transform="translate(4,4)" fill={C.w} stroke={C.k} strokeWidth={4} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

/* ───── 勾選框 ───── */
export const Check: React.FC<{size: number; p: number; bg?: string}> = ({size, p, bg = C.w}) => (
  <div style={{width: size, height: size, flex: `0 0 ${size}px`, ...bx(bg, 6, 5), position: 'relative'}}>
    <svg style={{...abs, left: 0, top: 0}} width={size - 10} height={size - 10} viewBox="0 0 32 32">
      <path d="M5 16 L13 24 L28 6" fill="none" stroke={C.k} strokeWidth={6} strokeLinecap="square" strokeDasharray={40} strokeDashoffset={40 * (1 - p)} />
    </svg>
  </div>
);

/* ───── 開關 ───── */
export const Toggle: React.FC<{p: number; on?: string; w?: number; h?: number}> = ({p, on = C.m, w = 150, h = 76}) => {
  const kn = h - 22;
  return (
    <div style={{width: w, height: h, flex: `0 0 ${w}px`, ...bx(p > 0.5 ? on : '#e9e6dc', 6, 6), borderRadius: h / 2, position: 'relative'}}>
      <div style={{...abs, top: 5, left: lerp(5, w - kn - 17, p), width: kn, height: kn, borderRadius: kn / 2, background: C.w, border: `6px solid ${C.k}`, boxSizing: 'border-box'}} />
    </div>
  );
};

/* ───── 貼紙（啪一聲貼上：大→小、歪斜）；right＝靠右對齊時的右邊界 x ───── */
export const Sticker: React.FC<{x?: number; right?: number; y: number; p: number; rot?: number; bg?: string; color?: string; fs?: number; font?: string; children: React.ReactNode; style?: React.CSSProperties}> = (q) => {
  if (q.p <= 0.001) return null;
  const sc = lerp(1.8, 1, q.p);
  const pos: React.CSSProperties = q.right !== undefined ? {right: 1920 - q.right} : {left: q.x ?? 0};
  return (
    <div style={{...abs, ...pos, top: q.y, ...bx(q.bg ?? C.p, 8, 5), padding: '8px 22px', whiteSpace: 'nowrap', fontFamily: q.font ?? TC, fontWeight: 900, fontSize: q.fs ?? 40,
      color: q.color ?? C.k, lineHeight: 1.25, transform: `rotate(${(q.rot ?? 0) * (2 - q.p)}deg) scale(${sc})`, transformOrigin: 'center', opacity: Math.min(1, q.p * 3), ...q.style}}>
      {q.children}
    </div>
  );
};
/** 貼紙進度：在 at 格啪一下貼上 */
export const slap = (t: number, at: number) => k(t, at, at + 6, EO);

/* ───── 跑馬燈膠帶（固定寬度的段落重複，往左捲） ───── */
export const Tape: React.FC<{y: number; t: number; text: string; rot?: number; bg?: string; color?: string; fs?: number; speed?: number; p?: number}> = (q) => {
  const p = q.p ?? 1;
  if (p <= 0.001 || !q.text) return null;
  const fs = q.fs ?? 34;
  const h = fs * 1.9;
  const iw = Math.max(300, Math.round(emw(q.text) * fs + 40));
  const off = ((q.t * (q.speed ?? 6)) % iw + iw) % iw;
  return (
    <div style={{...abs, left: -240, top: q.y, width: 2400, height: h, background: q.bg ?? C.y, borderTop: `6px solid ${C.k}`, borderBottom: `6px solid ${C.k}`,
      boxSizing: 'content-box', overflow: 'hidden', transform: `rotate(${q.rot ?? 0}deg) scaleX(${p})`, transformOrigin: 'left center'}}>
      <div style={{...abs, left: -off, top: 0, height: h, display: 'flex', alignItems: 'center'}}>
        {Array.from({length: Math.ceil(2400 / iw) + 2}, (_, i) => (
          <div key={i} style={{width: iw, flex: `0 0 ${iw}px`, fontFamily: MONO, fontWeight: 700, fontSize: fs, color: q.color ?? C.k, whiteSpace: 'nowrap'}}>{q.text}</div>
        ))}
      </div>
    </div>
  );
};

/* ───── 爆開的小方塊 ───── */
export const Burst: React.FC<{t: number; at: number; cx: number; cy: number; n?: number; seed: string; dist?: number}> = ({t, at, cx, cy, n = 18, seed, dist = 900}) => {
  if (t < at || t > at + 40) return null;
  const p = k(t, at, at + 26, EO);
  const out = k(t, at + 22, at + 40, LIN);
  const cols = [C.p, C.y, C.m, C.b, C.w];
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rnd(`${seed}a${i}`) * 0.3;
        const dd = dist * (0.55 + 0.45 * Math.abs(rnd(`${seed}d${i}`)));
        const sz = 34 + 30 * Math.abs(rnd(`${seed}s${i}`));
        return (
          <div key={i} style={{...abs, left: cx + Math.cos(a) * dd * p - sz / 2, top: cy + Math.sin(a) * dd * p * 0.7 - sz / 2, width: sz, height: sz, ...bx(cols[i % cols.length], 6, 5),
            transform: `rotate(${rnd(`${seed}r${i}`) * 200 * p}deg) scale(${1 - out})`}} />
        );
      })}
    </>
  );
};

/* ───── 工作列（固定在最下方、完全靜止；內容讀 timeline 的 taskbar） ───── */
type TB = {key: string; text: string; font: string; col: keyof typeof C};
const TBI = (T.d.taskbar ?? []) as unknown as TB[];
export const Taskbar: React.FC = () => (
  <div style={{...abs, left: 0, top: 994, width: 1920, height: 86, background: C.w, borderTop: `6px solid ${C.k}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 18}}>
    {TBI.map((it, i) => (
      <React.Fragment key={i}>
        {it.key === 'url' && <div style={{flex: 1}} />}
        <div style={{...bx(C[it.col], 6, 5), height: 58, padding: '0 22px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap',
          fontFamily: it.font === 'sg' ? SG : it.font === 'mono' ? MONO : TC, fontWeight: it.font === 'tc' && it.key === 'app' ? 900 : 700, fontSize: it.font === 'sg' ? 32 : 30, color: C.k}}>
          {it.text}
        </div>
      </React.Fragment>
    ))}
  </div>
);

/** 游標點擊狀態：ats＝每次按下的格數；回傳按下程度與點擊放射線進度 */
export const clicks = (t: number, ats: number[], hold = 5) => {
  let down = 0, click = 0;
  for (const a of ats) {
    down = Math.max(down, tap(t, a, hold));
    if (t >= a && t < a + 10) click = (t - a) / 10;
  }
  return {down, click};
};
