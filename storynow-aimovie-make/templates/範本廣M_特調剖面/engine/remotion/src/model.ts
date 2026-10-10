/* 廣M 特調剖面：杯子幾何、每一層液體的狀態、冰塊、鏡頭。全部只由格數決定；事件時間與每一層的內容讀 timeline.json（timeline.py 依 storyboard 排好）。 */
import {EIO, EO, k, lerp, rnd} from './kit';
import T from './timeline.json';

export type Step = {
  kind: 'liquid' | 'soda' | 'float' | 'ice' | 'stir' | 'garnish';
  name: string; nameSize: number; amount: string; unit: string; amountSize: number; note: string; noteSize: number;
  items: [string, number][]; color: string; short: string; shortSize: number; count: number; vessel: string; react: boolean;
  from: number; to: number; vol: number; pour?: number[]; tagAt?: number; reactAt?: number; ice?: number[]; disp?: number;
  stir?: number[]; lemon?: number; mint?: number[]; straw?: number;
};
export const STEPS = T.steps as unknown as Step[];
export const MK = T.marks as unknown as {
  glassLand: number; first: number; drop: number; riser: number[]; react: number | null; reveal: number; stamp: number | null; truck: number; logo: number; end: number;
};
export const D = T.d;
export const FRAMES = T.frames as number;
export const isPour = (s: Step) => s.kind === 'liquid' || s.kind === 'soda' || s.kind === 'float';
export const POURS = STEPS.filter(isPour);
export const ICE = STEPS.find((s) => s.kind === 'ice');
export const ICE_T: number[] = ICE?.ice ?? [];
export const GARNISH = STEPS.find((s) => s.kind === 'garnish');
export const REACT = STEPS.find((s) => s.react);

/* ───── 杯子（世界座標）───── */
export const GX = 900; // 杯子中心
export const BASE_Y = 870; // 杯底＝吧台面
export const IN_BOT = 836; // 杯內底
export const RIM_Y = 330; // 杯口
export const PX = 1.45; // 每單位幾像素（容量 300）
export const CAP = 300;
export const yOf = (ml: number) => IN_BOT - ml * PX;
/** 杯內壁半寬（往上略開） */
export const innerHW = (y: number) => lerp(128, 153, (IN_BOT - y) / (IN_BOT - RIM_Y));
export const outerHW = (y: number) => lerp(141, 166, (BASE_Y - y) / (BASE_Y - RIM_Y));

/* ───── 顏色 ───── */
export const C = {
  ink: '#2A2833',
  mint: '#3FAE6A',
  lemon: '#FFD93B',
  red: '#D8473B',
  ice: '#5AA9D6',
};
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mix = (a: string, b: string, p: number) => {
  const A = hex(a), B = hex(b);
  const c = A.map((v, i) => Math.round(lerp(v, B[i], Math.max(0, Math.min(1, p)))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
};
/** 字用的深一階顏色（淺色的層在白底上看不清） */
export const ink = (c: string) => {
  const [r, g, b] = hex(c);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? mix(c, '#3A2A10', 0.35) : c;
};
export const REACT_C = D.react.color as string;

/* ───── 倒入進度 ───── */
/** 倒液體的進度 0→1（傾倒後 8 格液柱落到液面才開始算） */
export const pp = (f: number, w?: number[]) => (w ? k(f, w[0] + 8, w[1] - 4, (x) => x * x * (3 - 2 * x)) : 0);
/** 容器（瓶子）動作：進場→傾斜→倒→回正→離場 */
export const vessel = (f: number, w: number[], angle: number) => {
  const [a, b] = w;
  const enter = k(f, a - 16, a, EO);
  const tilt = k(f, a - 4, a + 8, EIO) * (1 - k(f, b - 6, b + 4, EIO));
  const exit = k(f, b + 4, b + 18, (x) => x * x);
  return {on: f > a - 16 && f < b + 18, dx: (1 - enter) * 560 + exit * 620, dy: -(1 - enter) * 440 - exit * 520, rot: tilt * angle, tilt};
};
/** 顏色反應進度 */
export const reactP = (f: number) => (MK.react != null ? k(f, MK.react, MK.react + 42, EO) : 0);

/* ───── 每一層（液體帶）───── */
export type Band = {s: number; e: number; c0: string; c1: string; soft: number; idx: number};
/** 第 f 格時杯裡的液體帶（由下往上）。冰塊排開的體積加在當時最上面那一層；攪拌讓前面幾層的交界變柔 */
export const bands = (f: number): Band[] => {
  const out: Band[] = [];
  let cum = 0;
  STEPS.forEach((s, idx) => {
    if (isPour(s)) {
      const p = pp(f, s.pour);
      if (p <= 0) return;
      const rp = s.react ? reactP(f) : 0;
      const c = s.color;
      // 顏色反應：從交界往上變色（下段完全變、上段只變一點）
      out.push({s: cum, e: cum + s.vol * p, c0: mix(c, REACT_C, rp), c1: mix(mix(c, '#ffffff', 0.16), REACT_C, rp * 0.35), soft: 4 + 18 * rp, idx});
      cum += s.vol * p;
    } else if (s.kind === 'ice' && out.length) {
      let add = 0;
      (s.ice ?? []).forEach((t) => (add += (s.disp ?? 0) * k(f, t + 4, t + 12, EO)));
      out[out.length - 1].e += add;
      cum += add;
    } else if (s.kind === 'stir' && s.stir) {
      const sp = k(f, s.stir[0] + 4, s.stir[1] - 8, EIO);
      out.forEach((b) => (b.soft = Math.max(b.soft, lerp(4, 30, sp))));
    }
  });
  return out;
};
export const level = (f: number) => {
  const b = bands(f);
  return b.length ? b[b.length - 1].e : 0;
};
export const surfY = (f: number) => yOf(level(f));
/** 液體漸層色標（單位：容量） */
export const stops = (f: number): [number, string][] => {
  const B = bands(f);
  const st: [number, string][] = [];
  B.forEach((b, i) => {
    const lo = i === 0 ? b.s : b.s + b.soft / 2;
    const nx = B[i + 1];
    const hi = nx ? b.e - nx.soft / 2 : b.e;
    if (hi <= lo) {
      st.push([(lo + hi) / 2, mix(b.c0, b.c1, 0.5)]);
    } else {
      st.push([lo, b.c0], [hi, b.c1]);
    }
  });
  if (!st.length) st.push([0, '#ffffff']);
  return st;
};
/** 液面頂端的顏色（濺起的水珠、液面亮面用） */
export const topColor = (f: number) => {
  const B = bands(f);
  return B.length ? B[B.length - 1].c1 : '#ffffff';
};

/** 液面晃動強度 */
export const agit = (f: number) => {
  let a = 0.25;
  for (const s of POURS) {
    const w = s.pour as number[];
    a += 1.1 * k(f, w[0] + 6, w[0] + 14) * (1 - k(f, w[1] - 4, w[1] + 24));
  }
  for (const s of STEPS) {
    if (s.kind === 'stir' && s.stir) a += 1.6 * k(f, s.stir[0] + 4, s.stir[0] + 10) * (1 - k(f, s.stir[1] - 6, s.stir[1] + 20));
  }
  ICE_T.forEach((t) => {
    if (f >= t + 4) a += 2.4 * Math.exp(-(f - t - 4) / 10);
  });
  for (const t of [MK.drop, GARNISH?.lemon]) if (t != null && f >= t) a += 0.9 * Math.exp(-(f - t) / 12);
  return a;
};

/** 杯子被冰塊撞到時微微晃（度數）＋落地壓扁 */
export const glassPose = (f: number) => {
  let rot = 0;
  ICE_T.forEach((t, i) => {
    const d = f - t - 4;
    if (d >= 0) rot += (i % 2 ? -1 : 1) * 1.5 * Math.exp(-d / 9) * Math.sin(d * 0.75);
  });
  if (GARNISH?.lemon != null) {
    const dl = f - GARNISH.lemon;
    if (dl >= 0) rot += 1.0 * Math.exp(-dl / 8) * Math.sin(dl * 0.8);
  }
  const land = MK.glassLand;
  const fall = f < land ? -(1 - (f / land) ** 2) * 760 : 0;
  const d = f - land;
  const sq = d >= 0 ? 0.075 * Math.exp(-d / 5) * Math.cos(d * 0.65) : 0;
  return {rot, fall, sx: 1 + sq * 0.7, sy: 1 - sq};
};

/* ───── 冰塊 ───── */
const REST: [number, number, number][] = [
  [-62, 54, 12], [56, 58, -10], [0, 60, 26], [-84, -10, -8], [84, -12, 14], [2, -16, -20],
];
/** 冰塊浮在液面；液體太少時停在杯底（下排）或疊在下排上面（上排） */
const restY = (sy: number, ry: number) => Math.min(sy + ry, IN_BOT - 40 - (ry < 20 ? 64 : 0));
export const cube = (f: number, i: number) => {
  const t = ICE_T[i];
  if (t == null) return null;
  const hit = t + 4;
  const [rx, ry, rr] = REST[i];
  const x0 = GX + rnd(`ix${i}`) * 50;
  if (f < t - 12) return null;
  if (f < hit) {
    const p = (f - (t - 12)) / (hit - (t - 12));
    const ys = Math.min(surfY(hit), restY(surfY(hit), ry));
    const y = lerp(-140, ys, p * p);
    const v = (2 * p * (ys + 140)) / (hit - (t - 12)); // 每格速度
    return {x: lerp(x0, GX + rx, p * 0.4), y, rot: rr + (1 - p) * 140 * (i % 2 ? 1 : -1), v, inLiquid: false};
  }
  const d = f - hit;
  const settle = k(f, hit, hit + 22, EO);
  const bob = 60 * Math.exp(-d / 7) * Math.cos(d * 0.35);
  const sy = surfY(f);
  const floating = sy + ry < IN_BOT - 40 - (ry < 20 ? 64 : 0);
  return {
    x: lerp(lerp(x0, GX + rx, 0.4), GX + rx, settle),
    y: restY(sy, ry) + (floating ? bob * (1 - settle * 0.6) + 2.5 * Math.sin(f * 0.09 + i * 1.7) : 0),
    rot: rr + 6 * Math.sin(f * 0.07 + i) * (0.4 + Math.min(1, agit(f) * 0.3)) * (floating ? 1 : 0.2),
    v: 0,
    inLiquid: true,
  };
};

/* ───── 鏡頭（世界中心 cx,cy 與縮放 z）：依層數自動排關鍵格 ───── */
const buildKeys = (): [number, number, number, number][] => {
  const K: [number, number, number, number][] = [[0, 960, 540, 1.0], [Math.min(70, MK.first - 12), 960, 540, 1.0], [MK.first + 28, 900, 520, 1.07]];
  const n = STEPS.length;
  STEPS.forEach((s, i) => {
    const p = n > 1 ? i / (n - 1) : 1;
    if (i === 0) return;
    K.push([s.from + 10, lerp(905, 862, p), lerp(535, 462, p), lerp(1.07, 1.22, p)]);
  });
  K.push([MK.reveal - 22, 880, 445, 1.24]);
  K.push([MK.reveal + 22, 930, 525, 1.0]);
  K.push([MK.truck - 4, 930, 540, 1.0]);
  K.push([MK.truck + 52, 2600, 540, 1.0]);
  K.push([MK.end, 2616, 540, 1.0]);
  // 保證格數遞增
  for (let i = 1; i < K.length; i++) if (K[i][0] <= K[i - 1][0]) K[i][0] = K[i - 1][0] + 1;
  return K;
};
const KEYS = buildKeys();
export const camBase = (f: number) => {
  let i = 0;
  while (i + 1 < KEYS.length - 1 && f >= KEYS[i + 1][0]) i++;
  const [a, ax, ay, az] = KEYS[i];
  const [b, bx, by, bz] = KEYS[i + 1];
  const p = k(f, a, b, EIO);
  return {x: lerp(ax, bx, p), y: lerp(ay, by, p), z: lerp(az, bz, p)};
};
/** 拍點重擊：落杯、冰塊、高潮、檸檬片、印章時整個鏡頭推一下／震一下 */
export const camKick = (f: number) => {
  let z = 0, sx = 0, sy = 0;
  const hit = (t: number | null | undefined, amt: number, shake: number) => {
    if (t == null) return;
    const d = f - t;
    if (d < 0 || d > 24) return;
    const e = Math.exp(-d / 5);
    z += amt * e;
    sx += shake * e * Math.sin(d * 2.1);
    sy += shake * e * Math.cos(d * 2.7);
  };
  hit(MK.glassLand, 0.02, 10);
  ICE_T.forEach((t, i) => hit(t + 4, 0.018, i === ICE_T.length - 1 ? 9 : 5));
  hit(MK.drop, 0.05, 6);
  hit(GARNISH?.lemon, 0.02, 4);
  hit(MK.stamp, 0.035, 16);
  return {z, sx, sy};
};
export const cam = (f: number) => {
  const c = camBase(f);
  const kk = camKick(f);
  return {x: c.x + kk.sx, y: c.y + kk.sy, z: c.z * (1 + kk.z)};
};
/** 結尾杯子沿吧台滑到黑板旁（像出餐） */
export const SLIDE = 1100;
export const slideX = (f: number) => k(f, MK.truck - 2, MK.truck + 46, EIO) * SLIDE;
export const camCss = (c: {x: number; y: number; z: number}) => `translate(${960 - c.x * c.z}px, ${540 - c.y * c.z}px) scale(${c.z})`;
