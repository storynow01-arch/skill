/* 廣A 的彈簧：封閉解的階躍響應。一個值多次換目標＝每次變化一個彈簧相加，保持是時間的純函數（任何一格都算得出來）。
   整支是無縫循環（最後一格接回第一格），所以每個彈簧都把「上一輪」的尾巴也算進來。週期＝timeline.json 的 frames。 */
import T from './timeline.json';

export const P = T.frames;
const FPS = T.fps;

/** 單一階躍響應 0→1（ζ<1 時有極小過衝） */
export const S = (dt: number, w = 18, z = 0.82) => {
  if (dt <= 0) return 0;
  const s = dt / FPS;
  const q = Math.sqrt(1 - z * z);
  const wd = w * q;
  return 1 - Math.exp(-z * w * s) * (Math.cos(wd * s) + (z / q) * Math.sin(wd * s));
};

export type Key = {t: number; v: number; w?: number; z?: number};

/** 循環的多目標彈簧：keys 依時間排序；第一個 key 之前的值＝最後一個 key（上一輪留下來的） */
export const track = (keys: Key[], f: number, w = 18, z = 0.82) => {
  const n = keys.length;
  if (!n) return 0;
  let out = keys[n - 1].v;
  for (let i = 0; i < n; i++) {
    const d = keys[i].v - (i ? keys[i - 1].v : keys[n - 1].v);
    if (d === 0) continue;
    const ww = keys[i].w ?? w;
    const zz = keys[i].z ?? z;
    out += d * (S(f - keys[i].t, ww, zz) + S(f + P - keys[i].t, ww, zz) - 1);
  }
  return out;
};

/** 從狀態表做出某個欄位的 key（undefined＝這一步不變） */
export const keysOf = <T extends Record<string, number | undefined>>(rows: {t: number; s: T}[], field: keyof T): Key[] => {
  const out: Key[] = [];
  for (const r of rows) {
    const v = r.s[field];
    if (v === undefined) continue;
    if (out.length && out[out.length - 1].v === v) continue;
    out.push({t: r.t, v: v as number});
  }
  return out;
};

export const cl = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;

/** 內容視窗：[a, b) 期間可見（b<a 表示跨過循環點）。進場與退場各帶一段短模糊 */
export const win = (f: number, a: number, b: number) => {
  let bb = b;
  let ff = f;
  if (bb < a) {
    bb += P;
    if (ff < a - 100) ff += P;
  }
  const inn = cl((ff - a - 2) / 6);
  const out = 1 - cl((ff - bb) / 5);
  const e = (x: number) => 1 - Math.pow(1 - x, 3);
  const o = Math.min(e(inn), out);
  return {o, blur: (1 - e(inn)) * 9 + (1 - out) * 9, on: o > 0.001};
};
