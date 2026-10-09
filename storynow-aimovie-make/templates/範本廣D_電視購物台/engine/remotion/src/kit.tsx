/* 廣D 小工具：緩動、進度、彈簧、拍點脈衝、決定性隨機、吃角子老虎數字 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';

export const FPS = 30;
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EI = Easing.bezier(0.7, 0, 0.84, 0);
export const EIO = Easing.bezier(0.83, 0, 0.17, 1);
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const sp = (t: number, at: number, damping = 12, stiffness = 220, mass = 0.8) =>
  t < at ? 0 : spring({frame: t - at, fps: FPS, config: {damping, stiffness, mass}});
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
export const rnd01 = (seed: string | number) => random(seed);
export const pulse = (f: number, B: number, decay = 0.35) => Math.max(0, 1 - ((f % B) / B) / decay);

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
export const Roller: React.FC<{value: string; t: number; start: number; lock: number[]; laps?: number; cw?: number}> = ({value, t, start, lock, laps = 1, cw}) => {
  let di = 0;
  return (
    <span style={{display: 'inline-flex', lineHeight: 1}}>
      {String(value).split('').map((ch, i) => {
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
