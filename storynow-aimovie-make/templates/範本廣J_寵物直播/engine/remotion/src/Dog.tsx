/* 範本廣J 柴犬主播（原作第 20 支照搬）。原點＝身體底部中央（站在櫃台上）。
   blink 0..1 閉眼、tail 尾巴角度、tilt 歪頭角度、arm 右前腳角度（0＝放下，-100＝往右上指，揮手時在 -140±25 擺）、
   bark 0..1 張嘴、look 眼珠水平偏移、hop 身體上下 */
import React from 'react';

export type DogPose = {blink: number; tail: number; tilt: number; arm: number; bark: number; look: number; hop: number; squash: number};

const OR = '#EE9A4D';
const OR2 = '#D97E33';
const CR = '#FFF4E3';
const INK = '#3B2620';

export const Dog: React.FC<{p: DogPose}> = ({p}) => {
  const eyeH = 15 * (1 - p.blink) + 1.6;
  return (
    <g transform={`translate(0 ${p.hop}) scale(${1 + p.squash * 0.06} ${1 - p.squash * 0.06})`}>
      {/* 尾巴（捲尾，在身體後面） */}
      <g transform={`translate(-78 -70) rotate(${p.tail})`}>
        <path d="M0 0 C -40 -10 -62 -52 -38 -80 C -18 -102 18 -86 8 -60 C 2 -44 -22 -46 -20 -30" fill="none" stroke={OR} strokeWidth={30} strokeLinecap="round" />
        <path d="M-30 -74 C -16 -88 6 -80 2 -64" fill="none" stroke={CR} strokeWidth={12} strokeLinecap="round" />
      </g>
      {/* 身體 */}
      <ellipse cx={0} cy={-88} rx={92} ry={98} fill={OR} />
      <ellipse cx={0} cy={-70} rx={56} ry={74} fill={CR} />
      {/* 頸上的粉紅領巾 */}
      <path d="M-70 -158 Q 0 -120 70 -158 L 62 -136 Q 0 -100 -62 -136 Z" fill="#FF5C8A" />
      <path d="M-14 -126 L 14 -126 L 0 -96 Z" fill="#FF3B6E" />
      {/* 左前腳（放在櫃台上） */}
      <ellipse cx={-46} cy={-10} rx={30} ry={20} fill={CR} />
      <path d="M-58 -14 v8 M-46 -16 v9 M-34 -14 v8" stroke={OR2} strokeWidth={3} strokeLinecap="round" />
      {/* 右前腳（會舉起來指東西／揮手），以肩膀為軸 */}
      <g transform={`translate(52 -112) rotate(${p.arm})`}>
        <rect x={-21} y={-6} width={42} height={106} rx={21} fill={OR} />
        <ellipse cx={0} cy={100} rx={26} ry={22} fill={CR} />
        <circle cx={0} cy={104} r={8} fill="#FF9EB8" />
      </g>
      {/* 頭（歪頭以脖子為軸） */}
      <g transform={`translate(0 -178) rotate(${p.tilt}) translate(0 -54)`}>
        {/* 耳朵 */}
        <path d="M-96 -26 L -78 -112 L -22 -66 Z" fill={OR} stroke={OR} strokeWidth={14} strokeLinejoin="round" />
        <path d="M-80 -40 L -72 -90 L -40 -64 Z" fill="#FFC9B0" />
        <path d="M96 -26 L 78 -112 L 22 -66 Z" fill={OR} stroke={OR} strokeWidth={14} strokeLinejoin="round" />
        <path d="M80 -40 L 72 -90 L 40 -64 Z" fill="#FFC9B0" />
        {/* 耳機頭帶 */}
        <path d="M-100 -4 C -100 -96 100 -96 100 -4" fill="none" stroke="#5B4A7A" strokeWidth={9} />
        {/* 臉 */}
        <ellipse cx={0} cy={0} rx={108} ry={90} fill={OR} />
        <path d="M-96 22 C -80 -14 -40 -10 -18 20 C -8 4 8 4 18 20 C 40 -10 80 -14 96 22 C 86 76 40 92 0 92 C -40 92 -86 76 -96 22 Z" fill={CR} />
        {/* 柴犬的白眉點 */}
        <ellipse cx={-40} cy={-44} rx={12} ry={8} fill={CR} />
        <ellipse cx={40} cy={-44} rx={12} ry={8} fill={CR} />
        {/* 眼睛 */}
        <g>
          <ellipse cx={-40 + p.look} cy={-10} rx={12} ry={eyeH} fill={INK} />
          <ellipse cx={40 + p.look} cy={-10} rx={12} ry={eyeH} fill={INK} />
          {p.blink < 0.5 && <circle cx={-36 + p.look} cy={-16} r={4.5} fill="#fff" />}
          {p.blink < 0.5 && <circle cx={44 + p.look} cy={-16} r={4.5} fill="#fff" />}
        </g>
        {/* 腮紅 */}
        <ellipse cx={-70} cy={22} rx={18} ry={11} fill="#FF8FA8" opacity={0.6} />
        <ellipse cx={70} cy={22} rx={18} ry={11} fill="#FF8FA8" opacity={0.6} />
        {/* 鼻子與嘴 */}
        <ellipse cx={0} cy={18} rx={14} ry={10} fill={INK} />
        <circle cx={-4} cy={14} r={3} fill="#fff" opacity={0.6} />
        {p.bark > 0.05 ? (
          <g>
            <path d={`M-22 34 Q 0 ${40 + 34 * p.bark} 22 34 Z`} fill="#8A2236" />
            <ellipse cx={0} cy={36 + 22 * p.bark} rx={11} ry={8 * p.bark + 2} fill="#FF7E9A" />
          </g>
        ) : (
          <path d="M-18 32 Q -9 44 0 32 Q 9 44 18 32" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
        )}
        {/* 耳機（右耳罩＋麥克風） */}
        <rect x={-114} y={-26} width={24} height={48} rx={12} fill="#7A63A8" />
        <rect x={90} y={-26} width={24} height={48} rx={12} fill="#7A63A8" />
        <path d="M-104 16 Q -96 58 -44 52" fill="none" stroke="#5B4A7A" strokeWidth={6} strokeLinecap="round" />
        <circle cx={-42} cy={52} r={9} fill="#3E3355" />
      </g>
    </g>
  );
};
