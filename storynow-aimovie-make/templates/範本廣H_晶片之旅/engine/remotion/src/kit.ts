/* 範本廣H 自帶的小工具（原作 import 的 ../kit 有學校資料，通用版只搬需要的緩動與決定性隨機）。
   所有動畫只由「格數」決定（Remotion 規則：不能用 Math.random、Date、CSS 動畫／transition）。 */
import {Easing, interpolate, random} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1); // 指數減速（砸入）
export const EIO = Easing.bezier(0.83, 0, 0.17, 1); // 急進急出（甩鏡）
export const EB = Easing.bezier(0.34, 1.56, 0.64, 1); // 回彈
/** t 在 a→b 之間的 0→1 進度 */
export const k = (t: number, a: number, b: number, e: (x: number) => number = EO) =>
  b <= a ? (t >= b ? 1 : 0) : interpolate(t, [a, b], [0, 1], {...clamp, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** 決定性隨機（-1..1）／（0..1）；同一個 seed 永遠同一個值 */
export const rnd = (seed: string | number) => random(seed) * 2 - 1;
export const rnd01 = (seed: string | number) => random(seed);
/** 拍點脈衝：每拍開頭 1 → 拍內衰減到 0 */
export const pulse = (f: number, B: number, decay = 0.35) => {
  const ph = (((f % B) + B) % B) / B;
  return Math.max(0, 1 - ph / decay);
};
