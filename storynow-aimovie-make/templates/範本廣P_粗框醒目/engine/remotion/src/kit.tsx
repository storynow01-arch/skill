/* 廣P 小工具（原作 import 的 ../kit 搬進範本自己的 src）：節拍、緩動、彈簧、固定種子亂數、吃角子老虎數字 Roller。
   所有動畫只由「格數」決定（不用 Math.random、Date、CSS 動畫）。 */
import React from 'react';
import {Easing, interpolate, random, spring} from 'remotion';
import T from './timeline.json';

export const FPS = 30;
/** 一拍幾格（160 BPM＝11.25 格）、一小節 */
export const B: number = T.beat;
export const BAR = 4 * B;
/** 拍數 → 格數 */
export const nb = (n: number) => n * B;

/* ───── 緩動與進度 ───── */
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EI = Easing.bezier(0.7, 0, 0.84, 0); // 加速（抽走）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const LIN = (x: number) => x;
/** t 在 a→b 之間的 0→1 進度 */
export const k = (t: number, a: number, b2: number, e: (x: number) => number = EO) => interpolate(t, [a, b2], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b2: number, p: number) => a + (b2 - a) * p;
/** 彈簧 0→1（t<at 時為 0） */
export const sp = (t: number, at: number, damping = 12, stiffness = 220, mass = 0.8) =>
  t < at ? 0 : spring({frame: t - at, fps: FPS, config: {damping, stiffness, mass}});
/** 0..1 的鐘形（中間 1、兩端 0） */
export const bell = (p: number) => Math.sin(Math.PI * Math.max(0, Math.min(1, p)));
/** 決定性隨機（-1..1） */
export const rnd = (seed: string | number) => random(seed) * 2 - 1;

/* ───── 章資料 ───── */
export type Chap = {type: string; from: number; to: number; nb: number; beat: number; trans: string; win: [number, number]; tr: Record<string, any>} & Record<string, any>;
export type ChP = {t: number; c: Chap};
export const LAB = T.d.labels as Record<string, string>;

/* ───── 滾動數字：舊的往上滑出淡出、新的從下滑入淡入（不要逐格硬換數字，品檢會判抖動） ───── */
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
