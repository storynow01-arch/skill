/* 範本廣F 共用：時間表型別、配色、緩動、小工具。
   時間表（timeline.json）由 engine/timeline.py 依 storyboard 算好：黑板每一行的位置與書寫格、手的動作、道具、事件、鏡頭。 */
import {Easing, interpolate} from 'remotion';
import T from './timeline.json';

export type Line =
  | {kind: 'text'; text: string; x: number; y: number; size: number; color: string; align: 'left' | 'center'; bullet: string | null; w: number; left: number}
  | {kind: 'tick'; x: number; y: number; color: string; w: number; left: number};
export type Task = {type: string; a: number; b: number; [k: string]: unknown};
export type Prop = {id: string; kind: string; at: number; x: number; y: number; s: number; rot: number; frm: 'top' | 'right'; [k: string]: unknown};
type TLT = {
  fps: number; frames: number; beat: number;
  lines: Record<string, Line>; pages: string[][]; pageOf: Record<string, number>;
  w: Record<string, [number, number]>; erase: [number, number][]; tasks: Task[]; props: Prop[];
  ev: Record<string, number | number[]>; cam: [number, number, number, number][]; kicks: [number, number][];
  d: {title: string; plate: {name: string; size: number; over: string}; card: {head: string; url: string}; nMat: number; nStep: number};
};
export const J = T as unknown as TLT;
export const has = (key: string) => key in J.ev;
export const ev = (key: string) => J.ev[key] as number;
export const evs = (key: string) => J.ev[key] as number[];

export const C: Record<string, string> = {
  chalk: '#FBF8EE',
  yellow: '#F7E08C',
  pink: '#F7B9C8',
  blue: '#B4DDF4',
  board: '#33443D',
  boardDeep: '#2A3832',
  kraft: '#D9B98A',
  ink: '#4A3426',
  sauce: '#7A3B1A',
  green: '#5C8B39',
};

export const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EI = Easing.bezier(0.7, 0, 0.84, 0);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const LIN = (x: number) => x;
export const k = (f: number, a: number, b: number, e: (x: number) => number = EO) =>
  b <= a ? (f >= b ? 1 : 0) : interpolate(f, [a, b], [0, 1], {...cl, easing: e});
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** 落地後的小彈跳（回傳縮放量，1＝靜止） */
export const settle = (f: number, at: number, amp = 0.07) => {
  if (f < at) return 1;
  const t = f - at;
  return 1 - amp * Math.exp(-t / 4) * Math.cos(t * 0.9);
};

/** 估算文字寬度（與 timeline.py 同規則：中文全形＝1 字寬，英數 0.6，空白 0.3） */
export const textW = (s: string, size: number) => {
  let w = 0;
  for (const ch of s) w += size * ((ch.codePointAt(0) as number) >= 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.6);
  return w;
};
