/* 時間表（timeline.json，engine/timeline.py 依 storyboard 算好）：主角、交通車、鏡頭的每一格位置，各站的事件格與世界座標。
   畫面只照這份畫；配樂（music.py）讀同一份，所以音效一定對得上。 */
import T from './timeline.json';

export type RideSt = {
  i: number; type: 'ride'; O: number; pole: number; KS: number; BS: number; dist: number;
  busEnter: number; busStop: number; busDoor: number; board: number; doorClose: number; go: number; arrive: number; alight: number;
  country: [number, number]; billboard: number;
  d: {stop: string; board: string; note: string; bus: string; big: string; small: string};
  bus: {x: (number | null)[]; door: number[]; v: number[]};
};
export type BuildingSt = {i: number; type: 'building'; O: number; dx: number; bell: number; sit: number; stand: number; desk: number; d: {sign: string; board: string[]}};
export type PoolSt = {i: number; type: 'pool'; O: number; dx: number; crouch: number; jump: number; splash: number; surface: number; climb: number; entry: number; d: {sign: string}};
export type Station = RideSt | BuildingSt | PoolSt;
export type RoomSt = {
  O: number; dx: number; start: number; dormDoor: number; acOn: number; sitDesk: number; lampOff: number; inBed: number; zoom: number; text: number; chord: number;
  bed: number; desk: number; d: {easel: string[]; plate: string[]; tag: string; note: string};
};
type TLT = {
  fps: number; frames: number; marks: {doorOpen: number; walkStart: number}; st: Station[]; room: RoomSt;
  kid: {x: number[]; y: number[]; pose: number[]; ph: number[]; flip: number[]; bag: number[]; rot: number[]; mode: number[]};
  cam: number[]; ground: [number, number, string][]; hits: [number, number, number, number][];
  sky: {tint: [number, string][]; top: [number, string][]; bot: [number, string][]; night: [number, number]; sunEnd: number; sunHide: number; streetLamp: number};
  d: {end: {name: string; slogan: string; url: string}}; poses: string[]; modes: string[];
};
export const TL = T as unknown as TLT;
export const R = TL.room;
export const GY = 900;

export const ss = (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * p));
const eo = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
type K = [number, number, ('s' | 'l' | 'o')?];
/** 分段補間：每段可選 s（緩進緩出）l（等速）o（減速） */
export const seg = (f: number, keys: K[]) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1, e = 's'] = keys[i + 1];
    if (f <= f1) {
      const p = (f - f0) / (f1 - f0);
      const q = e === 'l' ? p : e === 'o' ? eo(p) : ss(p);
      return v0 + (v1 - v0) * q;
    }
  }
  return keys[keys.length - 1][1];
};

const at = (f: number) => Math.max(0, Math.min(TL.frames - 1, Math.round(f)));
export type Pose = 'stand' | 'walk' | 'run' | 'sit' | 'crouch' | 'jump' | 'reach' | 'wave' | 'look';
export type KidState = {vis: boolean; x: number; y: number; pose: Pose; ph: number; flip: boolean; bag: boolean; rot: number; mode: 'body' | 'swim' | 'bed' | 'none'};
export const kid = (f: number): KidState => {
  const i = at(f);
  const k = TL.kid;
  const mode = TL.modes[k.mode[i]] as KidState['mode'];
  return {vis: mode !== 'none', x: k.x[i], y: k.y[i], pose: TL.poses[k.pose[i]] as Pose, ph: k.ph[i], flip: !!k.flip[i], bag: !!k.bag[i], rot: k.rot[i], mode};
};
export const cam = (f: number) => TL.cam[at(f)];

/* 最後鏡頭推進房間的窗戶（原作座標 15520，整個房間平移 R.dx） */
export const WIN = {x: 15520 + R.dx, y: 200, w: 450, h: 420};
export const WC = {x: WIN.x + WIN.w / 2, y: WIN.y + WIN.h / 2};
export const ZOOM_S = 2.35;
export const zoomP = (f: number) => ss((f - R.zoom) / 84);
