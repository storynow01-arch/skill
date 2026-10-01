/* 三概念完整版共用：時間軸（由 full_build.py 產生）與場景查詢 */
import timing from './timing.json';

export type Scene = {id: string; from: number; dur: number; bars: number; voiceAt: number; voiceDur: number; text: string};
export type Concept = 'A' | 'B' | 'C';
export const T = timing as unknown as Record<Concept, {bpm: number; totalFrames: number; scenes: Scene[]}>;

/** 目前的場景與場景內 frame（lf）、場景進度（p 0~1） */
export const sceneAt = (c: Concept, f: number) => {
  const list = T[c].scenes;
  const sc = list.find((s) => f >= s.from && f < s.from + s.dur) ?? list[list.length - 1];
  const lf = f - sc.from;
  return {sc, lf, p: Math.min(1, lf / sc.dur), idx: list.indexOf(sc)};
};
export const S = (c: Concept, id: string) => T[c].scenes.find((s) => s.id === id)!;
/** 每拍的 frame 數 */
export const beatF = (c: Concept) => (60 / T[c].bpm) * 30;
