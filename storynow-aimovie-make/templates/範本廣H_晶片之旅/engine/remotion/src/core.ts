/* 範本廣H「晶片之旅」核心：無限推進的深度 Z、城市 2.5D 投影攝影機、電子（主角）的路徑。
   所有時間點都讀 timeline.json（由 engine/timeline.py 依 storyboard 算好），畫面與音效同一份數字。
   原作 02_試做/廣告30風格 src/ads/ad17/core.ts 固定 6 座地標、4 字校名、60 秒；這裡地標 3～6 座、名稱 2～8 字、片長依內容。 */
import TJ from './timeline.json';
import {EIO, EO, k, lerp} from './kit';

export type Glyph = {ch: string; cols: number; rows: string[]; x: number};
type TLT = {
  fps: number; frames: number; beatFrames: number; barFrames: number; pitchFrames: number;
  marks: Record<'board' | 'pkg' | 'die' | 'wafer' | 'city' | 'gateRun' | 'silence' | 'drop' | 'pull' | 'board2' | 'name' | 'slogan' | 'web', number>;
  pushPass: number[]; pullPass: number[]; land: number[]; boardBeeps: number[]; cityBeeps: number[]; chipBeeps: number[];
  nnFire: number[]; nameCh: number[];
  d: {
    board: {top: string; topSize: number; bottom: string; bottomSize: number};
    chip: {lines: string[]; size: number; code: string; codeSize: number};
    towers: string[]; towerSize: number; drop: string[]; dropSize: number;
    name: {text: string; glyphs: Glyph[]; grid: number; cell: number; top: number};
    slogan: string[]; sloganSize: number; url: string; urlSize: number;
  };
};
export const T = TJ as unknown as TLT;
export const J = T;
export const M = T.marks;
export const B = T.beatFrames;
export const BAR = T.barFrames;
export const NT = T.land.length; // 地標座數
export const RATIO = 5; // 每一層：子層佔父層中央 1/5
export const F = 1100; // 投影焦距（像素）
export const PS = T.pullPass[0]; // 拉遠：城市→晶圓 開始
export const PE = M.board2; // 拉遠結束、回到電路板

/* 靜音一拍時「所有東西停住」：動態用的格數 */
export const mframe = (f: number) => f - Math.min(Math.max(f - M.silence, 0), M.drop - M.silence);

/* ───── 無限推進：第 k 層的縮放 = 5^(Z-k) ───── */
const SEG = (M.city - M.pkg) / 3;
export const plateZ = (f: number): number => {
  if (f < M.pkg) {
    const u = Math.max(0, f) / M.pkg;
    return -0.2 + 1.2 * Math.pow(u, 2.1);
  }
  if (f < M.city) {
    const x = (f - M.pkg) / SEG;
    const i = Math.floor(x);
    const u = x - i;
    return 1 + i + u + (0.7 * Math.sin(2 * Math.PI * u)) / (2 * Math.PI);
  }
  if (f < PS) return 4;
  if (f < PE) {
    const u = (f - PS) / (PE - PS);
    return 4 - 4.1 * (0.5 - 0.5 * Math.cos(Math.PI * u));
  }
  return -0.1 - 0.05 * k(f, PE, PE + 60, EIO);
};
export const sc = (Z: number, layer: number) => Math.pow(RATIO, Z - layer);
/** 收尾：整塊電路板往下移，讓出上方給名稱 */
export const panY = (f: number) => 430 * k(f, PE - 18, PE + 20, EIO);

/* ───── 折線工具 ───── */
export type P2 = [number, number];
export type WP = [number, number, number]; // [格, x, y]
export const along = (wps: WP[], f: number): P2 => {
  if (f <= wps[0][0]) return [wps[0][1], wps[0][2]];
  for (let i = 1; i < wps.length; i++) {
    if (f <= wps[i][0]) {
      const a = wps[i - 1], b = wps[i];
      const u = b[0] === a[0] ? 1 : (f - a[0]) / (b[0] - a[0]);
      return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
    }
  }
  const z = wps[wps.length - 1];
  return [z[1], z[2]];
};

/* ───── 電子在各層的路線（該層座標，中心 0,0；轉彎點＝音效「嗶」） ───── */
const bb = T.boardBeeps;
const cb = T.chipBeeps;
export const ROUTE_BOARD: WP[] = [
  [4, -1500, 300], [bb[0], -760, 300], [bb[1], -760, -330], [bb[2], -430, -330], [bb[3], -430, 16], [bb[4], -205, 16], [M.pkg, 0, 0],
];
export const ROUTE_WIRE: WP[] = [[M.pkg, 0, 0], [cb[0], 0, -330], [cb[1], -560, -330], [cb[2], -560, 0], [M.die, 0, 0]];
export const ROUTE_DIE: WP[] = [[M.die, 0, 0], [cb[3], 420, 0], [cb[4], 420, 320], [cb[5], 0, 320], [M.wafer, 0, 0]];
// 城市：世界座標 (x, z)，俯視時畫面上方＝ +z
const PRE: WP[] = [[M.wafer, 0, 0], [cb[6], -420, 0], [cb[7], -420, -300], [cb[8], 0, -300], [M.city, 0, 0]];

/* 城市主幹道：從降落點往 +z 跑，每個地標前橫移一段；衝向邏輯閘時加速 */
const V0 = 9;
const arc = (f: number) => {
  const a = Math.min(f, M.gateRun) - M.city;
  if (f <= M.gateRun) return V0 * a;
  const dt = Math.min(f, M.silence) - M.gateRun;
  return V0 * a + V0 * dt + 0.5 * (11 / (M.silence - M.gateRun)) * dt * dt;
};
type CW = {f: number; s: number; x: number; z: number; dx: number; dz: number};
const CITY: CW[] = (() => {
  const out: CW[] = [];
  let x = 0, z = 0, dx = 0, dz = 1;
  out.push({f: M.city, s: 0, x, z, dx, dz});
  const turns = [...T.cityBeeps].sort((a, b) => a - b);
  turns.forEach((tf, i) => {
    const prev = out[out.length - 1];
    const s = arc(tf);
    x = prev.x + prev.dx * (s - prev.s);
    z = prev.z + prev.dz * (s - prev.s);
    const pair = Math.floor(i / 2);
    if (i % 2 === 0) {
      dx = pair % 2 === 0 ? 1 : -1;
      dz = 0;
    } else {
      dx = 0;
      dz = 1;
    }
    out.push({f: tf, s, x, z, dx, dz});
  });
  return out;
})();
export const cityGround = (fIn: number): P2 => {
  const f = Math.min(fIn, M.silence);
  if (f < M.city) return along(PRE, f);
  let w = CITY[0];
  for (const c of CITY) if (c.f <= f) w = c;
  const d = arc(f) - w.s;
  return [w.x + w.dx * d, w.z + w.dz * d];
};
/** 主幹道折線（畫地面的發光道路、建築避開它） */
export const AVENUE: P2[] = (() => {
  const pts: P2[] = PRE.map((p) => [p[1], p[2]] as P2);
  CITY.slice(1).forEach((c) => pts.push([c.x, c.z]));
  pts.push(cityGround(M.silence));
  return pts;
})();
export const GP = cityGround(M.silence); // 邏輯閘前的停點
export const GATE_Z = GP[1] + 40;
export const G2: [number, number, number] = [GP[0], 12, GP[1] + 160];
export const LAND_POS: P2[] = T.land.map((lf) => cityGround(lf));
export const TOWERS = LAND_POS.map((p, i) => ({x: p[0] + (i % 2 === 0 ? -250 : 250), z: p[1] + 160, i}));

/* ───── 神經網路（drop 時在邏輯閘上方點亮） ───── */
export const NN_COUNTS = [4, 6, 7, 7, 6, 4];
export const NN = NN_COUNTS.map((n, l) =>
  Array.from({length: n}, (_, i) => ({
    x: GP[0] + (i - (n - 1) / 2) * 300 + ((i * 53 + l * 29) % 70) - 35,
    y: 480 + l * 134 + ((i * 37 + l * 11) % 50),
    z: GATE_Z + 300 + l * 80 + ((i * 71) % 120),
  })),
);

/* ───── 2.5D 攝影機 ───── */
export type Cam = {x: number; y: number; z: number; sp: number; cp: number; clip: number | null};
const mk = (t: [number, number, number], D: number, pitch: number, clip: number | null = null): Cam => {
  const p = (pitch * Math.PI) / 180;
  const sp = Math.sin(p), cp = Math.cos(p);
  return {x: t[0], y: t[1] + D * sp, z: t[2] - D * cp, sp, cp, clip};
};
type Rig = {t: [number, number, number]; D: number; pitch: number};
const mixRig = (a: Rig, b: Rig, u: number): Rig => ({
  t: [lerp(a.t[0], b.t[0], u), lerp(a.t[1], b.t[1], u), lerp(a.t[2], b.t[2], u)],
  D: Math.exp(lerp(Math.log(a.D), Math.log(b.D), u)),
  pitch: lerp(a.pitch, b.pitch, u),
});
const chaseRig = (fIn: number): Rig => {
  const f = Math.min(mframe(fIn), M.silence);
  const Zc = 4 + 0.555 * (1 - Math.exp(-(f - M.city) / 37.6));
  const back = k(f, M.gateRun, M.silence, EIO); // 衝向邏輯閘時鏡頭往後拉、把整座閘框進來
  const D = (F / Math.pow(RATIO, Zc - 4)) * (1 + 1.6 * back);
  const pitch = 90 - 70 * k(f, M.city, M.city + T.pitchFrames, EIO) - 6 * back;
  let sx = 0, sz = 0;
  const offs = [-16, -8, 0, 8, 16, 24];
  for (const o of offs) {
    const g = cityGround(Math.max(M.city, f + o));
    sx += g[0];
    sz += g[1];
  }
  const u = k(f, M.city, M.city + 48, EIO);
  return {t: [lerp(0, sx / offs.length, u), 0, lerp(0, sz / offs.length, u) + 150 * u], D, pitch};
};
const dropRig = (f: number): Rig => ({t: [GP[0] + 120 * Math.sin((f - M.drop) / 70), 800, GATE_Z + 400], D: 1300, pitch: 0});
const topRig = (s: number, at: [number, number, number]): Rig => ({t: at, D: F / s, pitch: 90});

export const cityCam = (f: number): Cam => {
  const Z = plateZ(f);
  if (f < M.city) {
    const s = Math.pow(RATIO, Z - 4);
    const r = topRig(s, [0, 0, 0]);
    return mk(r.t, r.D, r.pitch, s);
  }
  if (f >= PS) {
    const s = Math.pow(RATIO, Z - 4);
    const r = topRig(s, G2);
    return mk(r.t, r.D, r.pitch, s);
  }
  let r: Rig;
  if (f < M.drop) r = chaseRig(f);
  else if (f < M.pull) r = mixRig(chaseRig(M.silence), dropRig(f), k(f, M.drop, M.drop + 30, EO));
  else r = mixRig(dropRig(f), topRig(1, G2), k(f, M.pull, PS, EIO));
  return mk(r.t, r.D, r.pitch, null);
};

/** 世界座標 → 相機座標（xc 右、yc 上、zc 深） */
export const toCam = (c: Cam, x: number, y: number, z: number): [number, number, number] => {
  const dx = x - c.x, dy = y - c.y, dz = z - c.z;
  return [dx, dy * c.cp + dz * c.sp, -dy * c.sp + dz * c.cp];
};
export const NEAR = 30;
export const scr = (q: [number, number, number]): P2 => [960 + (F * q[0]) / q[2], 540 - (F * q[1]) / q[2]];
export const project = (c: Cam, x: number, y: number, z: number): P2 | null => {
  const q = toCam(c, x, y, z);
  if (q[2] < NEAR) return null;
  return scr(q);
};

/* ───── 電子（主角）在城市與 drop 時的世界座標 ───── */
export const elecWorld = (f: number): [number, number, number] => {
  if (f < M.drop) {
    const g = cityGround(f);
    return [g[0], 12, g[1]];
  }
  const L = NN.map((layer) => layer[Math.floor(layer.length / 2)]);
  if (f < T.nnFire[5]) {
    // 從閘門沿各層中間節點往上竄
    const pts: [number, number, number, number][] = [[M.drop, GP[0], 12, GATE_Z], ...L.map((n, l) => [T.nnFire[l] + (l === 0 ? 3 : 0), n.x, n.y, n.z] as [number, number, number, number])];
    pts[1][0] = M.drop + 4;
    for (let i = 1; i < pts.length; i++) {
      if (f <= pts[i][0]) {
        const a = pts[i - 1], b = pts[i];
        const u = EO((f - a[0]) / (b[0] - a[0]));
        return [lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)];
      }
    }
  }
  const top = L[5];
  const amp = 160 * k(f, T.nnFire[5], T.nnFire[5] + 30, EO);
  const ang = (f - T.nnFire[5]) / 16;
  const orbit: [number, number, number] = [top.x + amp * Math.sin(ang), top.y + 0.6 * amp * Math.cos(ang) - 0.6 * amp, top.z];
  const back = k(f, M.pull - 30, M.pull + 10, EIO);
  return [lerp(orbit[0], G2[0], back), lerp(orbit[1], G2[1], back), lerp(orbit[2], G2[2], back)];
};

/* ───── 收尾：名稱點陣、走線（畫面座標；排版由 timeline.py 依名稱字數算好） ───── */
const NM = T.d.name;
export const GL = NM.glyphs;
export const CELL = NM.cell;
export const NAME_TOP = NM.top;
export const NAME_H = NM.grid * CELL;
export const NAME_BOT = NAME_TOP + NAME_H - 6; // 走線接到字的底部
export const BUS_Y = 528;
export const BUS_L = Math.min(700, GL[0].x);
export const BUS_R = Math.max(1650, GL[GL.length - 1].x + 120);
export const ROUTE_FINAL: WP[] = (() => {
  const c = T.nameCh;
  const step = c.length > 1 ? c[1] - c[0] : B;
  const up = Math.min(3, step * 0.3), down = Math.min(5, step * 0.4);
  const w: WP[] = [[PE + 8, 830, 880], [PE + 22, 700, 880], [c[0] - 10, 700, BUS_Y]];
  GL.forEach((g, i) => {
    w.push([c[i] - up, g.x, BUS_Y], [c[i], g.x, NAME_BOT], [c[i] + down, g.x, BUS_Y]);
  });
  const last = c[c.length - 1];
  w.push([last + down + 12, BUS_R, BUS_Y]);
  for (let i = 1; i < w.length; i++) if (w[i][0] <= w[i - 1][0]) w[i][0] = w[i - 1][0] + 0.5;
  return w;
})();

/** 電子在畫面上的位置（像素） */
export const elecScreen = (f: number): P2 | null => {
  const Z = plateZ(f);
  if (f < M.pkg) {
    const p = along(ROUTE_BOARD, f), s = sc(Z, 0);
    return [960 + p[0] * s, 540 + p[1] * s];
  }
  if (f < M.die) {
    const p = along(ROUTE_WIRE, f), s = sc(Z, 2);
    return [960 + p[0] * s, 540 + p[1] * s];
  }
  if (f < M.wafer) {
    const p = along(ROUTE_DIE, f), s = sc(Z, 3);
    return [960 + p[0] * s, 540 + p[1] * s];
  }
  if (f < PS) {
    const c = cityCam(f);
    const w = elecWorld(f);
    return project(c, w[0], w[1], w[2]);
  }
  const center: P2 = [960, 540 + panY(f)];
  if (f < PE + 8) return center;
  const p = along(ROUTE_FINAL, f);
  const u = k(f, PE + 8, PE + 16, EIO);
  return [lerp(center[0], p[0], u), lerp(center[1], p[1], u)];
};
