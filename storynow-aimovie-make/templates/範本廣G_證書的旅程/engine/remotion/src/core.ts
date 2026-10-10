/* 範本廣G「證書的旅程」共用：時間表（timeline.json，由 engine/timeline.py 依 storyboard 算好）、緩動、紙片路徑、表情、鏡頭。
   原作 02_試做/廣告30風格 src/ads/ad16/core.ts 的時間表寫死 3 道門、60 秒；這裡門數 1～4、所有時間都讀 timeline.json。 */
import {Easing, interpolate, random} from 'remotion';
import TJ from './timeline.json';
import bg1 from './art/bg1.jpg';
import bg2 from './art/bg2.jpg';
import bg3 from './art/bg3.jpg';
import bg4 from './art/bg4.jpg';
import bg5 from './art/bg5.jpg';
import bg6 from './art/bg6.jpg';
import grain from './art/grain.png';

export type Gate = {
  seal: string[]; ssize: number; rect: boolean; mini: string; say: string; eq: string[];
  sign: string; signsize: number; big: string; label: string; climax: boolean;
};
export type Card = {ch: string; x: number; y: number; s: number};
type TLT = {
  fps: number; frames: number; beatFrames: number; barFrames: number;
  turns: number[]; turnLen: number; swoopDelay: number;
  stamps: number[]; gateOpen: number[]; gatePass: number[]; fly: number[];
  wake: number; float: number[]; toWindow: number[]; pin: number; draws: number[]; claps: number[];
  shy: number; final: number; blinks: number[]; writes: Record<string, [number, number]>;
  d: {
    hero: string; heroSize: number; kicker: string; title: string; side: string[]; gates: Gate[];
    wall: {name: string; mode: 'row' | 'rows' | 'banner'; cards: Card[]; bannerSize: number; bubble: string; bubbleSize: number;
      slogan: string; sloganSize: number; url: string; urlSize: number};
  };
};
export const T = TJ as unknown as TLT;
export const NG = T.d.gates.length;
export const CLIMAX = NG - 1;

/** 跨頁背景：第 0 頁房間、第 1～4 頁門（依序 bg2、bg3、bg4、bg6）、最後一頁塗鴉牆 */
export const BGS = [bg1, ...[bg2, bg3, bg4, bg6].slice(0, NG), bg5];
export const GRAIN = grain;

/* 版面：書（跨頁 1680×900）放在畫面 (120,70) */
export const BX = 120;
export const BY = 70;
export const PW = 840; // 單頁寬
export const PH = 900;

/* 全片同一個緩動家族：柔和三次 */
export const SM = Easing.bezier(0.45, 0, 0.25, 1); // 主要移動（緩入緩出、尾巴長一點）
export const OUT = Easing.bezier(0.2, 0.8, 0.3, 1); // 落定
export const IN = Easing.bezier(0.6, 0, 0.9, 0.5); // 往下砸
const cl = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const kk = (f: number, a: number, b: number, e: (x: number) => number = SM) =>
  b <= a ? (f >= b ? 1 : 0) : interpolate(f, [a, b], [0, 1], {...cl, easing: e});
export const mix = (a: number, b: number, p: number) => a + (b - a) * p;
export const decay = (f: number, at: number, tau = 7) => (f < at ? 0 : Math.exp(-(f - at) / tau));
/** 決定性隨機（-1..1） */
export const rnd = (seed: string | number) => random(seed) * 2 - 1;

/** 估算文字寬度（與 timeline.py 同規則：中文全形＝1 字寬，英數 0.6，空白 0.3） */
export const textW = (s: string, size: number) => {
  let w = 0;
  for (const ch of s) w += size * ((ch.codePointAt(0) as number) >= 0x2e80 ? 1 : ch === ' ' ? 0.3 : 0.6);
  return w;
};

/* ───── 每道門的造型（依門的順序；最後一道＝高潮，章更大） ───── */
export type GateLook = {x: number; ground: number; h: number; w: number; frame: string; door: string};
const LOOKS: GateLook[] = [
  {x: 960, ground: 720, h: 300, w: 220, frame: '#fbe08a', door: '#9fd8c0'},
  {x: 960, ground: 740, h: 310, w: 230, frame: '#f7c3d4', door: '#c9b6ec'},
  {x: 1000, ground: 730, h: 360, w: 260, frame: '#bcdcf5', door: '#ffd36e'},
  {x: 980, ground: 726, h: 330, w: 240, frame: '#c9b6ec', door: '#f6a7ba'},
];
export const look = (i: number): GateLook => {
  const L = LOOKS[i % 4];
  return T.d.gates[i].climax && NG > 1 ? {...L, x: 1000, h: Math.max(L.h, 350), w: Math.max(L.w, 256)} : L;
};
/** 紙片在第 i 頁等門開的位置（有小屋時停在小屋上方） */
const REST = (i: number): [number, number, number] => (T.d.gates[i].sign ? [470, 200, 0.95] : [330, 470, 1.0]);
/** 蓋章的位置（門的右邊） */
export const stampPt = (i: number): [number, number] => (T.d.gates[i].climax && NG > 1 ? [1280, 445] : [1300, 455]);
export const gateY = (i: number) => look(i).ground - look(i).h * 0.95;

/* ───── 紙片路徑（跨頁座標）：[格, x, y, 旋轉, 縮放] ───── */
type Key = [number, number, number, number, number];
const D = T.swoopDelay;
const KEYS: Key[] = (() => {
  const K: Key[] = [
    [0, 600, 640, -12, 0.9],
    [T.float[0], 600, 640, -12, 0.9],
    [T.float[1], 840, 400, 4, 1.0],
    [T.toWindow[0], 840, 400, 4, 1.0],
    [T.toWindow[1], 1290, 400, 10, 0.85],
  ];
  let prev: [number, number, number] = [1290, 400, 0.85];
  T.d.gates.forEach((g, i) => {
    const t = T.turns[i];
    const [rx, ry, rs] = REST(i);
    const [sx, sy] = stampPt(i);
    const sc = g.climax && NG > 1 ? 1.1 : 1.05;
    // 翻頁：跟著書頁的風往左
    K.push([t + D, prev[0], prev[1] - (i ? 10 : 0), i ? 0 : 10, prev[2]]);
    K.push([t + D + 22, 900, 220 - (g.sign ? 20 : 0), -14, 1.0]);
    K.push([t + D + 46, rx, ry, -4, rs]);
    K.push([T.fly[i], rx, ry, 0, rs]);
    K.push([T.gatePass[i], look(i).x, gateY(i) + 140, 8, 0.95]);
    K.push([T.gatePass[i] + 26, sx, sy, 0, sc]);
    K.push([T.stamps[i] + 50, sx, sy, 0, sc]);
    prev = [sx, sy, sc];
  });
  // 最後一頁：飛到塗鴉牆正中央
  const t = T.turns[NG];
  K.push([t + D, prev[0], prev[1] - 10, 0, prev[2]]);
  K.push([t + D + 24, 1060, 190, -12, 1.15]);
  K.push([T.pin - 6, 840, 340, -3, 1.2]);
  K.push([T.frames + 10, 840, 340, -3, 1.2]);
  // 保證時間遞增（文本很短時事件可能擠在一起）
  for (let i = 1; i < K.length; i++) if (K[i][0] <= K[i - 1][0]) K[i][0] = K[i - 1][0] + 1;
  return K;
})();

export type Pose = {x: number; y: number; rot: number; sc: number; flying: number};
/** 只看關鍵格的位置（沒有呼吸、沒有特效），給殘影與鏡頭用 */
export const rawPose = (f: number): Pose => {
  let i = 0;
  while (i + 1 < KEYS.length && f >= KEYS[i + 1][0]) i++;
  const a = KEYS[i];
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  const p = b[0] === a[0] ? 0 : kk(f, a[0], b[0]);
  const moving = (a[1] !== b[1] || a[2] !== b[2]) && f > a[0] && f < b[0] ? Math.sin(Math.PI * p) : 0;
  return {x: mix(a[1], b[1], p), y: mix(a[2], b[2], p), rot: mix(a[3], b[3], p), sc: mix(a[4], b[4], p), flying: moving};
};

/** 完整姿勢：加上漂浮、蓋章壓扁、開心轉圈、貼上時壓扁 */
export const pose = (f: number) => {
  const r = rawPose(f);
  const awake = f >= T.wake;
  const bob = awake ? Math.sin((f / 40) * Math.PI * 2) * 7 * (1 - r.flying) : 0;
  const sway = awake ? Math.sin((f / 80) * Math.PI * 2) * 2.5 : Math.sin((f / 60) * Math.PI * 2) * 1.2;
  let sx = 1, sy = 1, hop = 0, spin = 0;
  T.stamps.forEach((S, i) => {
    const big = i === CLIMAX && NG > 1;
    const d = decay(f, S, 5);
    sy *= 1 - 0.2 * d * (big ? 1.3 : 1);
    sx *= 1 + 0.12 * d;
    const h = kk(f, S + 12, S + 26, OUT) - kk(f, S + 26, S + 40, IN);
    hop += h * (big ? 60 : 36);
    spin += 360 * kk(f, S + 40, S + 64);
  });
  const pd = decay(f, T.pin, 5);
  sy *= 1 - 0.12 * pd; sx *= 1 + 0.08 * pd;
  // 醒來伸懶腰
  const st = Math.sin(Math.PI * kk(f, T.wake + 4, T.wake + 26, SM));
  sy *= 1 + 0.1 * st; sx *= 1 - 0.05 * st;
  // 最後一頁：跟拍子輕輕晃
  const fin = f > T.final ? Math.sin(((f - T.final) / 40) * Math.PI * 2) * 4 * kk(f, T.final, T.final + 30) : 0;
  return {...r, y: r.y + bob - hop, rot: r.rot + sway + spin + fin, sx, sy};
};

/** 速度（每格像素，用來決定殘影） */
export const speed = (f: number) => {
  const a = rawPose(f), b = rawPose(f - 2);
  return Math.hypot(a.x - b.x, a.y - b.y) / 2;
};

/* ───── 表情 ───── */
export type Face = 'sleep' | 'open' | 'happy' | 'shy' | 'blink' | 'worry';
export const face = (f: number): Face => {
  if (f < T.wake) return 'sleep';
  if (T.blinks.some((b) => f >= b && f < b + 5)) return 'blink';
  for (const S of T.stamps) {
    if (f >= S - 30 && f < S) return 'worry';
    if (f >= S && f < S + 50) return 'happy';
  }
  if (f >= T.pin && f < T.pin + 14) return 'happy';
  if (f >= T.shy && f < T.shy + 28) return 'shy';
  if (f >= T.shy + 28 && f < T.shy + 70) return 'happy';
  if (f >= T.final && f < T.final + 70) return 'happy';
  return 'open';
};
const W = (id: string) => T.writes[id];
/** 眼睛看哪裡（-1..1） */
export const lookAt = (f: number): [number, number] => {
  const tgt: [number, number, number, number][] = [
    // [從, 到, dx, dy]
    [T.wake + 10, T.float[0], -0.6, -0.5],
    [T.float[0], T.toWindow[0], 0.6, -0.8],
    [T.toWindow[0], T.turns[0], 1, -0.2],
  ];
  T.d.gates.forEach((g, i) => {
    const say = W(`g${i}say`) || W(`g${i}eq0`) || W(`g${i}sign`);
    if (say) tgt.push([say[0], say[1] + 10, g.sign ? -0.3 : -0.6, g.sign ? 1 : -0.9]);
    tgt.push([T.gateOpen[i] - 10, T.fly[i], 1, 0]);
    const S = T.stamps[i];
    tgt.push([S - 40, S, 0, -1]);
    tgt.push([S + 20, S + 36, 0.6, -1]);
  });
  const dr = T.draws;
  if (dr.length > 1) {
    dr.forEach((d, k) => tgt.push([d - 4, (dr[k + 1] ?? T.shy) - 4, -0.8 + (1.6 * k) / (dr.length - 1), 1]));
  } else tgt.push([dr[0] - 4, T.shy, 0, 1]);
  if (W('slogan')) tgt.push([W('slogan')[0], W('slogan')[1], 0, -1]);
  if (W('url')) tgt.push([W('url')[0], T.final, 0, T.d.wall.mode === 'row' ? 1 : -1]);
  let dx = 0, dy = 0;
  for (const [a, b, x, y] of tgt) {
    const w = kk(f, a, a + 6) * (1 - kk(f, b, b + 6));
    dx += x * w; dy += y * w;
  }
  return [Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy))];
};

/* ───── 寫字進度（沒有這個字就回 0） ───── */
export const wp = (f: number, id: string) => {
  const w = T.writes[id];
  if (!w) return 0;
  return interpolate(f, [w[0], w[1]], [0, 1], cl);
};

/* ───── 鏡頭：跟著紙片（有延遲），蓋章時推近、拍點重擊 ───── */
export const camera = (f: number) => {
  // 延遲跟隨：取過去 0～14 格的平均位置
  let ax = 0, ay = 0;
  for (let i = 0; i < 8; i++) {
    const p = rawPose(f - i * 2);
    ax += p.x; ay += p.y;
  }
  ax = ax / 8 + BX; ay = ay / 8 + BY;
  const d0 = T.draws[0];
  const settleAt = T.writes.bubble ? T.writes.bubble[0] : T.shy;
  let s = mix(0.86, 1, kk(f, 0, 70));
  s *= 1 + 0.07 * kk(f, T.wake - 30, T.wake + 10) * (1 - kk(f, T.toWindow[0], T.turns[0] + 10));
  T.stamps.forEach((S, i) => {
    const z = i === CLIMAX && NG > 1 ? 0.2 : 0.13;
    s *= 1 + z * kk(f, S - 70, S - 8) * (1 - kk(f, S + 36, S + 66));
  });
  s *= 1 + 0.06 * kk(f, T.turns[NG] + 30, T.pin) * (1 - kk(f, d0 + 20, Math.max(d0 + 30, settleAt)));
  s *= 1 - 0.06 * kk(f, T.final + 10, T.frames - 5, SM);
  // 跟隨強度：開場與最後一頁收斂到正中
  const follow = 0.22 * kk(f, 40, 120) * (1 - kk(f, d0 + 20, Math.max(d0 + 30, settleAt)));
  const cx = mix(960, ax, follow);
  let cy = mix(540, ay, follow);
  // 拍點重擊
  let punch = 0, shake = 0, rot = 0;
  T.stamps.forEach((S, i) => {
    const d = decay(f, S, 6);
    const m = i === CLIMAX && NG > 1 ? 1.8 : 1;
    punch += 0.05 * d * m;
    shake += 7 * d * m * Math.sin((f - S) * 2.3);
    rot += 0.7 * d * m * Math.sin((f - S) * 1.7 + 1);
  });
  punch += 0.02 * decay(f, T.pin, 5);
  T.draws.forEach((d) => (punch += 0.012 * decay(f, d, 5)));
  punch += 0.025 * decay(f, T.final, 10);
  s *= 1 + punch;
  cy += shake;
  return {cx, cy, s, rot};
};
