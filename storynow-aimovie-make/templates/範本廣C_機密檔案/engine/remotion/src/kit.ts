/* 廣C 小工具：緩動、進度、決定性隨機 */
import {Easing, interpolate, random} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EI = Easing.bezier(0.7, 0, 0.84, 0);
export const EIO = Easing.bezier(0.83, 0, 0.17, 1);
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) => interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
export const rnd01 = (seed: string | number) => random(seed);
