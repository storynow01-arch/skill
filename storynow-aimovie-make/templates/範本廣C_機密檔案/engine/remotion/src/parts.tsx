/* 廣C 的小元件：打字機字、手寫、紅筆、印章、圖釘、文件紙（原作：02_試做/廣告30風格 第 12 支） */
import React from 'react';
import {interpolate} from 'remotion';
import {clamp, EO, EI, k, lerp, rnd, rnd01} from './kit';
import {SERIF, ELITE, KAI} from './fonts';

export const INK = '#1d1a17';
export const RED = '#c1272d';
export const KRAFT = '#c9a46c';
export const PAPER = '#f3ecdb';
export const STICKY = '#f4d34c';
export const PEN = '#22305a';

/** 全形字（中文、全形標點）佔一整格，其餘半形佔 0.6 格 */
const wide = (c: string) => c.charCodeAt(0) >= 0x2e80;
export const cellW = (c: string, size: number) => (wide(c) ? size : size * 0.6);
/** 一行字在某字之前的寬度（畫紅圈、底線用） */
export const textX = (text: string, idx: number, size: number) => text.slice(0, idx).split('').reduce((a, c) => a + cellW(c, size), 0);

/** 打字機逐字打出：每個字依序出現，墨色深淺、上下位置略有不同（鉛字的感覺）；剛打下的字先重一點再沉下去 */
export const Typed: React.FC<{
  f: number; text: string; start: number; step: number; size: number; x: number; y: number;
  color?: string; weight?: number; seed?: string; spacing?: number;
}> = ({f, text, start, step, size, x, y, color = INK, weight = 500, seed = 't', spacing = 0}) => {
  const n = f < start ? 0 : Math.min(text.length, Math.floor((f - start) / step) + 1);
  let cx = 0;
  return (
    <div style={{position: 'absolute', left: x, top: y, height: size * 1.2, whiteSpace: 'nowrap', fontFamily: `'${ELITE}', '${SERIF}'`, fontWeight: weight, fontSize: size, lineHeight: 1.2, color}}>
      {text.split('').map((c, i) => {
        const w = cellW(c, size) + spacing;
        const left = cx;
        cx += w;
        if (i >= n) return null;
        const age = f - (start + i * step);
        const fresh = interpolate(age, [0, 3], [1, 0], clamp);
        const op = 0.8 + 0.2 * rnd01(`${seed}o${i}`);
        return (
          <span key={i} style={{position: 'absolute', left, top: rnd(`${seed}y${i}`) * size * 0.025 + fresh * size * 0.04, width: w, textAlign: 'center', opacity: Math.min(1, op + fresh * 0.3)}}>
            {c}
          </span>
        );
      })}
    </div>
  );
};

/** 手寫：多行文字從左到右被「寫出來」（依字數平均分配時間） */
export const Hand: React.FC<{f: number; lines: string[]; start: number; end: number; size: number; x: number; y: number; color?: string; lh?: number; rot?: number}> = ({
  f, lines, start, end, size, x, y, color = PEN, lh = 1.3, rot = 0,
}) => {
  const total = lines.reduce((a, l) => a + l.length, 0);
  const p = interpolate(f, [start, end], [0, total], clamp);
  let acc = 0;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `rotate(${rot}deg)`, fontFamily: `'${KAI}'`, fontWeight: 700, fontSize: size, lineHeight: lh, color, whiteSpace: 'nowrap'}}>
      {lines.map((l, i) => {
        const lp = Math.max(0, Math.min(1, (p - acc) / l.length));
        acc += l.length;
        return (
          <div key={i} style={{clipPath: `inset(-20% ${(1 - lp) * 100}% -20% 0)`}}>
            {l}
          </div>
        );
      })}
    </div>
  );
};

/** 用筆畫出的線（紅筆圈、底線、打勾、航線） */
export const PenPath: React.FC<{d: string; p: number; color?: string; w?: number; dash?: string}> = ({d, p, color = RED, w = 6, dash}) =>
  p <= 0 ? null : (
    <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
      strokeDasharray={dash ?? '1 1'} strokeDashoffset={dash ? 0 : 1 - p} />
  );

/** 印章：蓋下前看到木柄從上方落下（越近越大）、影子變深；蓋下後木柄抬走，留下有斑駁的紅色印痕 */
export const Stamp: React.FC<{f: number; at: number; w: number; h: number; rot?: number; round?: boolean; children: React.ReactNode; seed: string; fall?: number}> = ({
  f, at, w, h, rot = -8, round = false, children, seed, fall = 30,
}) => {
  const down = k(f, at - fall, at, EI);
  const up = k(f, at, at + 18, EO);
  const handleOn = f >= at - fall && f < at + 18;
  const hs = f < at ? lerp(2.3, 1, down) : lerp(1, 2.2, up);
  const ho = f < at ? Math.min(1, (f - (at - fall)) / 6) : 1 - up;
  const hx = f < at ? lerp(160, 0, down) : lerp(0, 420, up);
  const hy = f < at ? lerp(-220, 0, down) : lerp(0, -560, up);
  const inked = f >= at;
  const spread = interpolate(f - at, [0, 6], [1.05, 1], clamp);
  const R = Math.max(w, h) * 0.5;
  return (
    <div style={{position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h}}>
      {/* 影子 */}
      {handleOn && (
        <div style={{position: 'absolute', left: w / 2 - R * 1.1, top: h / 2 - R * 1.1, width: R * 2.2, height: R * 2.2, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 45%, rgba(0,0,0,0) 70%)',
          opacity: f < at ? down : 1 - up, transform: `scale(${f < at ? lerp(1.7, 0.9, down) : lerp(0.9, 1.6, up)})`}} />
      )}
      {inked && (
        <div style={{position: 'absolute', inset: 0, transform: `rotate(${rot}deg) scale(${spread})`, color: RED, opacity: 0.88, mixBlendMode: 'multiply'}}>
          <div style={{position: 'absolute', inset: 0, border: `${Math.round(h * 0.035)}px solid ${RED}`, borderRadius: round ? '50%' : 14}} />
          <div style={{position: 'absolute', inset: h * 0.06, border: `${Math.round(h * 0.014)}px solid ${RED}`, borderRadius: round ? '50%' : 8}} />
          <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>{children}</div>
          {/* 印泥沒吃滿的斑點 */}
          {Array.from({length: 46}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: `${rnd01(`${seed}x${i}`) * 100}%`, top: `${rnd01(`${seed}y${i}`) * 100}%`,
              width: 3 + rnd01(`${seed}s${i}`) * 9, height: 2 + rnd01(`${seed}t${i}`) * 6, borderRadius: '50%', background: PAPER, opacity: 0.75}} />
          ))}
        </div>
      )}
      {/* 木柄（俯視） */}
      {handleOn && (
        <div style={{position: 'absolute', left: w / 2 - R * 0.62, top: h / 2 - R * 0.62, width: R * 1.24, height: R * 1.24, borderRadius: '50%',
          transform: `translate(${hx}px, ${hy}px) scale(${hs})`, opacity: ho,
          background: 'radial-gradient(circle at 40% 35%, #b07a4a 0%, #7a4b26 55%, #4a2a12 100%)', boxShadow: '0 0 0 10px #2b1a0e, 0 30px 60px rgba(0,0,0,0.5)'}}>
          <div style={{position: 'absolute', inset: '30%', borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #c88f5a, #6b3f1e)'}} />
        </div>
      )}
    </div>
  );
};

/** 紅色圖釘（俯視）：按下時從大縮到原大小 */
export const Pin: React.FC<{f: number; at: number; x: number; y: number; color?: string}> = ({f, at, x, y, color = RED}) => {
  if (f < at - 6) return null;
  const p = k(f, at - 6, at, EI);
  const s = lerp(1.8, 1, p);
  return (
    <div style={{position: 'absolute', left: x - 22, top: y - 22, width: 44, height: 44, transform: `scale(${s})`, opacity: Math.min(1, p * 3)}}>
      <div style={{position: 'absolute', left: 8, top: 14, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', filter: 'blur(4px)'}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle at 35% 30%, #ff8a80 0%, ${color} 45%, #6d0f12 100%)`}} />
    </div>
  );
};

/** 一張紙（含陰影）；lift＝被拿起來時陰影變大 */
export const Sheet: React.FC<{w: number; h: number; bg?: string; lift?: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({w, h, bg = PAPER, lift = 0, children, style}) => (
  <div style={{position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h, background: bg, overflow: 'hidden',
    boxShadow: `0 ${8 + lift * 30}px ${18 + lift * 50}px rgba(20,8,0,${0.45 + lift * 0.1}), 0 2px 3px rgba(0,0,0,0.3)`, ...style}}>
    {children}
  </div>
);
