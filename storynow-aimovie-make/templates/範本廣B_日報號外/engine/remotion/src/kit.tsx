/* 廣B 小工具：緩動、進度、滾動數字、字寬估算（跟 engine/timeline.py 的 em() 同一套）、字級自動縮放 */
import React from 'react';
import {Easing, interpolate} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const bell = (p: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, p)));

/** 一個字的寬度（em）：中文 1、數字 0.6、% 0.85、英文大寫 0.72、小寫 0.55 */
export const cw = (c: string) => {
  const o = c.codePointAt(0) as number;
  if (o >= 0x2e80 || '…・，。！？「」：；（）％'.includes(c)) return 1.0;
  if (c === ' ') return 0.3;
  if (".,:;/-·'|".includes(c)) return 0.38;
  if (c === '%') return 0.85;
  if (/[0-9]/.test(c)) return 0.6;
  if (/[A-Z]/.test(c)) return 0.72;
  if (/[a-z]/.test(c)) return 0.55;
  return 0.65;
};
export const em = (s: string) => Array.from(String(s ?? '')).reduce((a, c) => a + cw(c), 0);
/** 字級：不超過 fs，也不讓整行超過 maxw */
export const fitFs = (s: string, fs: number, maxw: number) => Math.min(fs, maxw / Math.max(0.01, em(s)));
/** 每個字的起點（em 累加） */
export const charX = (s: string) => {
  const out: {x: number; w: number}[] = [];
  let x = 0;
  for (const c of Array.from(String(s))) {
    out.push({x, w: cw(c)});
    x += cw(c);
  }
  return out;
};

/* 滾動數字：舊的往上滑出淡出、新的從下滑入淡入 */
export const DigitCol: React.FC<{w: number; cw?: number}> = ({w, cw: cww = 0.62}) => {
  const base = Math.floor(w);
  const fr = w - base;
  const d0 = ((base % 10) + 10) % 10;
  const d1 = (((base + 1) % 10) + 10) % 10;
  const cell: React.CSSProperties = {position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center'};
  return (
    <span style={{position: 'relative', display: 'inline-block', width: `${cww}em`, height: '1.08em', verticalAlign: 'top', overflow: 'hidden'}}>
      <span style={{...cell, transform: `translateY(${-fr * 1.05}em)`, opacity: 1 - fr}}>{d0}</span>
      {fr > 0.001 && <span style={{...cell, transform: `translateY(${(1 - fr) * 1.05}em)`, opacity: fr}}>{d1}</span>}
    </span>
  );
};
/** 吃角子老虎式：每位數各轉 laps 圈，第 i 位在 lock[i] 格停住；非數字原樣顯示 */
export const Roller: React.FC<{value: string; t: number; start: number; lock: number[]; laps?: number; cw?: number}> = ({value, t, start, lock, laps = 1, cw: cww}) => {
  let di = 0;
  return (
    <span style={{display: 'inline-flex', lineHeight: 1}}>
      {String(value).split('').map((ch, i) => {
        if (!/[0-9]/.test(ch)) return <span key={i} style={{display: 'inline-block', lineHeight: 1}}>{ch}</span>;
        const d = Number(ch);
        const L = lock[Math.min(di, lock.length - 1)];
        di++;
        const p = interpolate(t, [start, L], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <DigitCol key={i} w={p * (laps * 10 + d)} cw={cww} />;
      })}
    </span>
  );
};
