/* 動態字體（來自「動態字體快剪」）：以拍為單位的砸入、序列字卡、碎裂。
   const K = makeBeat(145);               // BPM
   K.on(lf, 4)                            // 第 4 拍之後
   <span style={slam(lf, K.f(2))}>寫</span>   // 第 2 拍砸入（放大＋模糊→定格＋微震）
   <WordSeq lf={lf} beatF={K.bf} seq={[[0,'你',BK,WH,460],[2,'未來',WH,BK,420]]} font=… />
   <Shatter lf={lf} at={K.f(5)} items={CODE} color=… />  */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random} from 'remotion';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const makeBeat = (bpm: number, fps = 30) => {
  const bf = (60 / bpm) * fps;
  return {bf, f: (beat: number) => Math.round(beat * bf), on: (lf: number, beat: number) => lf >= Math.round(beat * bf)};
};

/** 在第 at 格砸入：2.6 倍＋模糊 → 1 倍，前 5 格微震；at 之前隱藏 */
export const slam = (lf: number, at: number, from = 2.6): React.CSSProperties => {
  const d = lf - at;
  const s = interpolate(d, [0, 4], [from, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const blur = interpolate(d, [0, 4], [16, 0], clamp);
  const sh = d >= 0 && d < 5 ? (random(`k${at}${d}`) - 0.5) * 22 : 0;
  return {transform: `translate(${sh}px, ${sh * 0.6}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: d < 0 ? 0 : 1};
};

/** 一拍換一張全螢幕字卡：[拍, 文字, 背景色, 字色, 字級] */
export const WordSeq: React.FC<{lf: number; beatF: number; seq: [number, string, string, string, number][]; font: string}> = ({lf, beatF, seq, font}) => {
  const cur = [...seq].reverse().find(([b]) => lf >= Math.round(b * beatF)) ?? seq[0];
  return (
    <AbsoluteFill style={{background: cur[2], alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: font, fontWeight: 900, fontSize: cur[4], color: cur[3], lineHeight: 1, whiteSpace: 'nowrap', ...slam(lf, Math.round(cur[0] * beatF))}}>{cur[1]}</div>
    </AbsoluteFill>
  );
};

/** 從中心爆散的文字碎片（程式碼、符號） */
export const Shatter: React.FC<{lf: number; at: number; items: string[]; color: string; accent?: string; font: string; n?: number; life?: number}> = (
  {lf, at, items, color, accent = color, font, n = 46, life = 40}) => {
  const d = lf - at;
  if (d < 0 || d > life) return null;
  return (
    <>{Array.from({length: n}, (_, i) => {
      const a = random(`a${i}`) * Math.PI * 2, sp = 18 + random(`v${i}`) * 40;
      return <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * sp * d - 200, top: 540 + Math.sin(a) * sp * d * 0.7, fontFamily: font, fontWeight: 700,
        fontSize: 26 + (i % 4) * 12, color: i % 5 === 0 ? accent : color, whiteSpace: 'nowrap', transform: `rotate(${(random(`r${i}`) - 0.5) * d * 6}deg)`,
        opacity: Math.max(0, 1 - d / life)}}>{items[i % items.length]}</div>;
    })}</>
  );
};
