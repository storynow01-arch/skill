/* 皇小米（YouTube 頻道主角，照頻道 logo 改成線稿風）：金色捲毛小狗、垂耳、藏青書包、抱著紅心、皺眉認真臉。
   (x, y)＝腳底中心；scale 1 時全身約 380px 高。
   mood：idle 抱心、think 歪頭＋小 o 嘴、idea 冒星星、happy 瞇眼笑、wave 揮手、point 右手指向右邊、oops 打叉時驚訝 */
import React from 'react';
import {C, pop} from './kit';

export type Mood = 'idle' | 'think' | 'idea' | 'happy' | 'wave' | 'point' | 'oops';
const INK = '#1B1B1B', FUR = '#F0B95A', FUR2 = '#DE9C3E', NAVY = '#2F4B7C', HEART = '#D9483B', PINK = '#F2A39A';

/** 捲毛外框：圓周上 n 個小鼓包 */
const fluffy = (cx: number, cy: number, rx: number, ry: number, n: number, bump = 0.13, rot = 0) => {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = rot + (i / n) * Math.PI * 2, am = rot + ((i - 0.5) / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
    else d += ` Q${(cx + Math.cos(am) * rx * (1 + bump)).toFixed(1)} ${(cy + Math.sin(am) * ry * (1 + bump)).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + ' Z';
};
const HEAD = fluffy(0, -232, 92, 84, 18);
const EAR_L = fluffy(-94, -196, 34, 62, 10, 0.16, 0.3);
const EAR_R = fluffy(94, -196, 34, 62, 10, 0.16, -0.3);

/** 有黑邊的金色手臂（粗黑線上疊細金線） */
const Arm: React.FC<{d: string}> = ({d}) => (
  <>
    <path d={d} stroke={INK} strokeWidth={30} strokeLinecap="round" fill="none" />
    <path d={d} stroke={FUR} strokeWidth={22} strokeLinecap="round" fill="none" />
  </>
);
const Heart: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 30 C-40 4 -46 -26 -24 -34 C-12 -38 -2 -30 0 -20 C2 -30 12 -38 24 -34 C46 -26 40 4 0 30 Z" fill={HEART} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
);

export const Mascot: React.FC<{f: number; x: number; y: number; scale?: number; mood?: Mood; moodAt?: number; flip?: boolean; shadow?: boolean}> = ({f, x, y, scale = 1, mood = 'idle', moodAt = 0, flip, shadow = true}) => {
  const m: Mood = f >= moodAt ? mood : 'idle';
  const bob = Math.sin(f / 9) * 2.2;
  const blink = f % 84 > 79 && m !== 'happy';
  const lit = m === 'idea' || m === 'happy';
  const wave = Math.sin((f - moodAt) / 3) * 14;
  const shock = m === 'oops' ? Math.sin((f - moodAt) * 2.4) * 3 * Math.max(0, 1 - (f - moodAt) / 14) : 0;
  const closed = m === 'happy' || m === 'wave';
  return (
    <svg width={340 * scale} height={430 * scale} viewBox="-170 -400 340 430" style={{position: 'absolute', left: x - 170 * scale, top: y - 400 * scale, overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
      {shadow && <ellipse cx={0} cy={6} rx={80} ry={10} fill="rgba(0,0,0,0.10)" />}
      <g strokeLinejoin="round" strokeLinecap="round">
        {/* 尾巴、書包（在身體後面） */}
        <path d="M54 -64 C82 -70 92 -48 74 -36 C86 -30 72 -16 60 -28" fill={FUR} stroke={INK} strokeWidth={4} />
        <g transform={`translate(0 ${bob * 0.5})`}>
          <path d="M34 -158 C82 -162 98 -130 96 -80 C95 -54 80 -46 56 -48 L40 -60 Z" fill={NAVY} stroke={INK} strokeWidth={4} />
          <path d="M62 -112 C84 -114 90 -100 88 -82 C86 -70 66 -70 60 -80 Z" fill="#3E5E96" stroke={INK} strokeWidth={3} />
          <path d="M74 -130 L74 -116 M70 -132 L80 -128" stroke={HEART} strokeWidth={4} />
        </g>
        {/* 腳 */}
        <path d="M-50 -64 C-56 -36 -58 -12 -48 -4 C-36 4 -20 0 -18 -10 L-12 -54 Z" fill={FUR} stroke={INK} strokeWidth={4} />
        <path d="M50 -64 C56 -36 58 -12 48 -4 C36 4 20 0 18 -10 L12 -54 Z" fill={FUR} stroke={INK} strokeWidth={4} />
        {/* 身體 */}
        <g transform={`translate(0 ${bob * 0.6})`}>
          <path d="M-60 -48 C-70 -110 -58 -160 0 -162 C58 -160 70 -110 60 -48 C40 -36 -40 -36 -60 -48 Z" fill={FUR} stroke={INK} strokeWidth={4} />
          <path d="M-22 -40 C-14 -52 14 -52 22 -40" fill="none" stroke={INK} strokeWidth={3} />
          {/* 書包背帶 */}
          <path d="M40 -156 C30 -120 34 -90 46 -64" fill="none" stroke={NAVY} strokeWidth={9} />
          {/* 手＋紅心 */}
          {m === 'wave' ? (
            <>
              <Heart x={-6} y={-108} />
              <Arm d="M-52 -138 C-62 -112 -50 -96 -30 -100" />
            </>
          ) : m === 'point' ? (
            <>
              <Heart x={-8} y={-108} />
              <Arm d="M-52 -138 C-62 -112 -50 -96 -30 -100" />
              <Arm d="M50 -134 C80 -132 110 -128 136 -126" />
              <path d="M134 -138 C150 -140 168 -134 170 -126 C168 -120 150 -116 136 -116 Z" fill={FUR} stroke={INK} strokeWidth={4} />
            </>
          ) : (
            <>
              <Heart x={0} y={-108} />
              <Arm d="M-52 -138 C-64 -112 -52 -96 -32 -102" />
              <Arm d="M52 -138 C64 -112 52 -96 32 -102" />
            </>
          )}
        </g>
        {/* 頭（耳朵、臉、燈泡） */}
        {/* 驚訝時只有頭顫抖（腳和身體不動：整身晃會被最終品檢 F2 當成畫面下緣抖動，2026-10-10） */}
        <g transform={`translate(${shock} ${bob}) rotate(${m === 'think' ? -6 : 0} 0 -170)`}>
          {/* 想通了：頭右上冒小星星（2026-10-10 使用者說燈泡天線不用） */}
          {lit && [[96, -318, 1], [126, -278, 0.7], [70, -350, 0.55]].map(([sx, sy, k], i) => {
            const t = pop(f, moodAt + i * 3, 10), r = 22 * k * t;
            return <path key={i} d={`M${sx} ${sy - r} Q${sx} ${sy} ${sx + r} ${sy} Q${sx} ${sy} ${sx} ${sy + r} Q${sx} ${sy} ${sx - r} ${sy} Q${sx} ${sy} ${sx} ${sy - r} Z`} fill="#F7D154" stroke={INK} strokeWidth={3} />;
          })}
          <path d={HEAD} fill={FUR} stroke={INK} strokeWidth={4.5} />
          <path d="M-60 -276 C-44 -296 -20 -306 0 -306" fill="none" stroke={FUR2} strokeWidth={4} />
          <path d={EAR_L} fill={FUR2} stroke={INK} strokeWidth={4.5} />
          <path d={EAR_R} fill={FUR2} stroke={INK} strokeWidth={4.5} />
          {/* 臉 */}
          <circle cx={-52} cy={-196} r={10} fill={PINK} opacity={0.85} />
          <circle cx={52} cy={-196} r={10} fill={PINK} opacity={0.85} />
          {closed ? (
            <path d="M-44 -222 Q-30 -238 -16 -222 M16 -222 Q30 -238 44 -222" fill="none" stroke={INK} strokeWidth={5} />
          ) : blink ? (
            <path d="M-46 -222 L-14 -222 M14 -222 L46 -222" stroke={INK} strokeWidth={5} />
          ) : (
            <>
              {[-30, 30].map((ex) => (
                <g key={ex}>
                  <circle cx={ex} cy={-222} r={m === 'oops' ? 19 : 17} fill={C.white} stroke={INK} strokeWidth={3.5} />
                  <circle cx={ex + (m === 'point' ? 5 : 0)} cy={-218} r={m === 'oops' ? 7 : 10} fill={INK} />
                  <circle cx={ex + 4 + (m === 'point' ? 5 : 0)} cy={-223} r={3.5} fill={C.white} />
                </g>
              ))}
            </>
          )}
          {/* 眉毛：平常是認真的皺眉，開心時上揚 */}
          <path d={closed || m === 'idea' ? 'M-46 -258 Q-32 -266 -18 -260 M18 -260 Q32 -266 46 -258' : m === 'oops' ? 'M-46 -262 Q-32 -270 -18 -264 M18 -264 Q32 -270 46 -262' : 'M-46 -256 L-18 -246 M46 -256 L18 -246'} fill="none" stroke={INK} strokeWidth={5.5} />
          <path d="M-8 -202 C-8 -196 8 -196 8 -202 C8 -208 -8 -208 -8 -202 Z" fill={INK} />
          {closed || m === 'idea' ? (
            <path d="M-16 -188 Q0 -168 16 -188 Z" fill="#8C2A22" stroke={INK} strokeWidth={3} />
          ) : m === 'think' || m === 'oops' ? (
            <ellipse cx={0} cy={-182} rx={7} ry={m === 'oops' ? 10 : 6} fill="#8C2A22" stroke={INK} strokeWidth={3} />
          ) : (
            <path d="M-12 -186 Q-6 -180 0 -186 Q6 -180 12 -186" fill="none" stroke={INK} strokeWidth={3.5} />
          )}
        </g>
        {m === 'wave' && (
          <g transform={`translate(0 ${bob * 0.6}) rotate(${wave} 56 -138)`}>
            <Arm d="M54 -138 C96 -146 126 -170 140 -214" />
            <path d="M126 -222 C122 -244 132 -256 140 -246 L142 -258 C144 -270 156 -268 155 -256 L158 -262 C162 -272 174 -266 168 -252 C176 -252 176 -238 166 -226 C158 -214 134 -210 126 -222 Z" fill={FUR} stroke={INK} strokeWidth={4} />
          </g>
        )}
      </g>
    </svg>
  );
};
