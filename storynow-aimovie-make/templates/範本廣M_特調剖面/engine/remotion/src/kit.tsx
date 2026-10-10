/* 廣M 小工具（原作 import 的 ../kit 搬進範本自己的 src：緩動、內插、固定種子亂數、遮罩上滑一行字） */
import React from 'react';
import {Easing, interpolate, random} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const LIN = (x: number) => x;
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
export const rnd01 = (seed: string | number) => random(seed);

/** 遮罩上滑出現的一行字（p：0→1 出現；out：0→1 往上收走） */
export const MaskLine: React.FC<{p: number; out?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({p, out = 0, style, children}) => (
  <div style={{overflow: 'hidden', ...style}}>
    <div style={{transform: `translateY(${(1 - p) * 110 - out * 110}%)`, opacity: Math.min(1, p * 1.5) * (1 - out)}}>{children}</div>
  </div>
);
