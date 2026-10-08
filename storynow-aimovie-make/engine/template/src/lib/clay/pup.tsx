/* 範本L 固定主角：使用者畫的捲毛小狗（貴賓／泰迪），做成黏土玩具質感（2026-10-08 從屏榮黏土玩具風搬來，造型整支保留）。
   原圖：fbreels拆解/吉祥物_參考圖1.png。
   造型照原畫：金黃淺橘棕捲毛（頭頂與垂耳是一團團黏土小球）、大黑眼、粉紅腮紅、咖啡色小鼻子；
   雙手抱紅色愛心、背深藍書包、頭上小燈泡＋「Lv.3」徽章、面前一本打開的書和鉛筆。
   會眨眼、呼吸、彈跳、驚訝（O 嘴）、開心（笑嘴）、揮手、燈泡亮起。
   品檢：整隻標 data-qa="ignore"（徽章字不算畫面文字）；燈泡亮起是白→黃的連續漸變（不在 0.5 硬切）。 */
import React from 'react';
import {interpolate} from 'remotion';
import {BALOO, G, R, drop, mix} from './kit';

export type Mood = 'happy' | 'wow' | 'grin';
export const BADGE = 'Lv.3';

const FUR_L = '#f8d39b';
const EYE = '#1d1620';
const NOSE = '#6b4128';

/** 一團捲毛（黏土小球群） */
const Curls: React.FC<{c: [number, number, number][]; k?: string}> = ({c, k = 'fur'}) => (
  <>
    {c.map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r} fill={R(k)} />
    ))}
  </>
);

export const Pup: React.FC<{
  x: number; y: number; s?: number; f: number; mood?: Mood; hops?: number[]; wave?: boolean; look?: number;
  seed?: number; enter?: number; bulb?: number; book?: boolean; flip?: boolean; heartUp?: number;
}> = ({x, y, s = 1, f, mood = 'happy', hops = [], wave = false, look = 0, seed = 0, enter, bulb = 0, book = false, flip = false, heartUp = 0}) => {
  // 出場：從上方掉下來
  let dy = 0, sx = 1, sy = 1, op = 1, sh = 1;
  if (enter !== undefined) {
    if (f < enter) return null;
    const d = drop(f, enter, 520);
    dy = d.y; sx = d.sx; sy = d.sy; op = d.o; sh = d.sh;
  }
  // 彈跳
  let hopV = 0;
  for (const at of hops) {
    const t = f - at;
    if (t >= 0 && t < 20) {
      const u = t / 20;
      dy += -Math.sin(Math.PI * u) * 85 * s;
      hopV = Math.cos(Math.PI * u);
      const squash = t < 3 ? (3 - t) / 3 : t > 17 ? (t - 17) / 3 : 0;
      sy *= 1 - 0.12 * squash + 0.06 * Math.sin(Math.PI * u);
      sx *= 1 + 0.12 * squash - 0.04 * Math.sin(Math.PI * u);
    }
  }
  // 呼吸
  sy *= 1 + 0.018 * Math.sin(f / 10 + seed);
  sx *= 1 - 0.01 * Math.sin(f / 10 + seed);
  // 眨眼（每 ~3.7 秒一次，4 格）
  const ph = (f + seed * 41) % 112;
  const blink = ph < 4 ? 0.12 : 1;
  const tilt = 4 * Math.sin(f / 23 + seed);
  const ear = 4 * Math.sin(f / 13 + seed) + hopV * 10;
  const lx = look * 5;
  const wow = mood === 'wow';
  const armA = wave ? -125 + 22 * Math.sin(f / 4) : 0;
  const lit = interpolate(bulb, [0, 1], [0, 1]);
  const shW = 210 * s * (enter !== undefined ? 0.45 + 0.55 * sh : 1) * (1 + Math.min(0, dy) / (400 * s) * 0.5);

  return (
    <>
      <div style={{position: 'absolute', left: x - shW / 2, top: y - shW * 0.09, width: shW, height: shW * 0.18, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(70,50,30,0.38), rgba(70,50,30,0))', opacity: sh}} />
      <div data-qa="ignore" style={{position: 'absolute', left: x - 130 * s, top: y - 300 * s, width: 260 * s, height: 324 * s, opacity: op,
        transform: `translateY(${dy}px) scale(${(flip ? -1 : 1) * sx}, ${sy})`, transformOrigin: `50% ${(300 / 324) * 100}%`}}>
        <svg viewBox="-130 -300 260 324" width={260 * s} height={324 * s} style={{overflow: 'visible'}}>
          {/* 書包（身體後面） */}
          <g>
            <rect x={18} y={-152} width={74} height={116} rx={26} fill={G('bp')} />
            <rect x={26} y={-150} width={60} height={42} rx={18} fill={mix('#24427f', '#ffffff', 0.18)} />
            <rect x={38} y={-84} width={42} height={34} rx={12} fill={mix('#24427f', '#000000', 0.15)} />
            <rect x={70} y={-176} width={10} height={36} rx={4} fill={G('r')} transform="rotate(12 75 -158)" />
            <rect x={56} y={-170} width={9} height={30} rx={4} fill={G('y')} transform="rotate(-8 60 -155)" />
            <circle cx={56} cy={-112} r={5} fill={G('y')} />
          </g>
          {/* 腿與腳 */}
          <ellipse cx={-26} cy={-26} rx={21} ry={28} fill={R('fur')} />
          <ellipse cx={26} cy={-26} rx={21} ry={28} fill={R('fur')} />
          <ellipse cx={-30} cy={-8} rx={25} ry={13} fill={R('fur')} />
          <ellipse cx={30} cy={-8} rx={25} ry={13} fill={R('fur')} />
          {/* 身體 */}
          <ellipse cx={0} cy={-78} rx={52} ry={54} fill={R('fur')} />
          <Curls c={[[-48, -60, 11], [48, -60, 11], [-38, -36, 11], [38, -36, 11]]} />
          {/* 書包背帶 */}
          <path d="M 36 -124 Q 46 -90 40 -50" stroke={mix('#24427f', '#000000', 0.1)} strokeWidth={10} fill="none" strokeLinecap="round" />
          {/* 上臂（在愛心後面） */}
          <ellipse cx={-42} cy={-92 - heartUp * 10} rx={15} ry={24} fill={R('fur')} transform={`rotate(-22 -42 ${-92 - heartUp * 10})`} />
          {!wave && <ellipse cx={42} cy={-92 - heartUp * 10} rx={15} ry={24} fill={R('fur')} transform={`rotate(22 42 ${-92 - heartUp * 10})`} />}
          {/* 愛心（雙手抱著） */}
          <g transform={`translate(0 ${-68 - heartUp * 14}) scale(${1.32 + 0.06 * Math.sin(f / 6)})`}>
            <path d="M 0 -18 C -6 -34 -36 -34 -36 -10 C -36 8 -12 20 0 30 C 12 20 36 8 36 -10 C 36 -34 6 -34 0 -18 Z" fill={R('r')} />
            <ellipse cx={-17} cy={-16} rx={8} ry={5} fill="#fff" opacity={0.55} transform="rotate(-30 -17 -16)" />
          </g>
          {/* 小手掌（在愛心前面） */}
          <ellipse cx={-36} cy={-62 - heartUp * 14} rx={13} ry={11} fill={R('fur')} />
          {!wave && <ellipse cx={36} cy={-62 - heartUp * 14} rx={13} ry={11} fill={R('fur')} />}
          {/* 揮手的右手 */}
          {wave && (
            <g transform={`rotate(${armA} 40 -108)`}>
              <ellipse cx={40} cy={-84} rx={15} ry={24} fill={R('fur')} />
              <ellipse cx={40} cy={-62} rx={13} ry={11} fill={R('fur')} />
            </g>
          )}
          {/* 頭（含耳朵） */}
          <g transform={`rotate(${tilt} 0 -112)`}>
            {/* 頭（圓頭、只留頭頂一撮蓬蓬捲毛） */}
            <ellipse cx={0} cy={-158} rx={56} ry={52} fill={R('fur')} />
            <Curls c={[[-24, -202, 17], [24, -202, 17], [-11, -213, 19], [11, -213, 19], [0, -222, 17]]} />
            {/* 大垂耳：一串捲毛黏土球，從頭頂兩側垂到臉頰以下 */}
            <g transform={`rotate(${ear} -48 -190)`}>
              <ellipse cx={-70} cy={-138} rx={25} ry={46} fill={R('furd')} transform="rotate(12 -70 -138)" />
              <Curls k="furd" c={[[-58, -182, 15], [-72, -168, 15], [-80, -146, 15], [-82, -122, 15], [-76, -100, 15], [-62, -96, 12], [-66, -130, 13], [-60, -152, 12]]} />
            </g>
            <g transform={`rotate(${-ear} 48 -190)`}>
              <ellipse cx={70} cy={-138} rx={25} ry={46} fill={R('furd')} transform="rotate(-12 70 -138)" />
              <Curls k="furd" c={[[58, -182, 15], [72, -168, 15], [80, -146, 15], [82, -122, 15], [76, -100, 15], [62, -96, 12], [66, -130, 13], [60, -152, 12]]} />
            </g>
            {/* 口鼻（嘴套稍微突出、淺色） */}
            <ellipse cx={0} cy={-128} rx={30} ry={7} fill="#c9873f" opacity={0.35} />
            <ellipse cx={0} cy={-136} rx={30} ry={22} fill={R('mz')} />
            {/* 腮紅 */}
            <ellipse cx={-38} cy={-140} rx={11} ry={6.5} fill="#f28a96" opacity={0.75} />
            <ellipse cx={38} cy={-140} rx={11} ry={6.5} fill="#f28a96" opacity={0.75} />
            {/* 眉毛 */}
            <path d={`M -32 ${wow ? -186 : -180} Q -22 ${wow ? -192 : -184} -12 ${wow ? -186 : -178}`} stroke={NOSE} strokeWidth={4} fill="none" strokeLinecap="round" />
            <path d={`M 12 ${wow ? -186 : -178} Q 22 ${wow ? -192 : -184} 32 ${wow ? -186 : -180}`} stroke={NOSE} strokeWidth={4} fill="none" strokeLinecap="round" />
            {/* 眼睛（眨眼＝縱向壓扁） */}
            {[-22, 22].map((ex) => (
              <g key={ex} transform={`translate(${ex + lx} -158) scale(1 ${blink})`}>
                <circle r={wow ? 14 : 12.5} fill={EYE} />
                <circle cx={4} cy={-5} r={4.6} fill="#fff" />
                <circle cx={-4} cy={4} r={2} fill="#fff" opacity={0.85} />
              </g>
            ))}
            {/* 鼻子 */}
            <ellipse cx={0} cy={-143} rx={8} ry={5.5} fill={NOSE} />
            <ellipse cx={-2} cy={-145} rx={3} ry={1.6} fill="#fff" opacity={0.6} />
            {/* 嘴 */}
            {wow ? (
              <g>
                <ellipse cx={0} cy={-127} rx={7} ry={9} fill="#5a2a2a" />
                <ellipse cx={0} cy={-122} rx={4.5} ry={3.5} fill="#f28a96" />
              </g>
            ) : mood === 'grin' ? (
              <g>
                <path d="M -12 -134 Q 0 -114 12 -134 Z" fill="#5a2a2a" />
                <ellipse cx={0} cy={-124} rx={5} ry={3.5} fill="#f28a96" />
              </g>
            ) : (
              <path d="M -10 -133 Q -5 -126 0 -132 Q 5 -126 10 -133" stroke="#5a2a2a" strokeWidth={3.2} fill="none" strokeLinecap="round" />
            )}
            {/* 小燈泡 */}
            <g transform="translate(0 -252)">
              {lit > 0 && [0, 1, 2, 3, 4].map((k) => {
                const a = (-150 + k * 30) * Math.PI / 180;
                return <line key={k} x1={Math.cos(a) * 22} y1={Math.sin(a) * 22} x2={Math.cos(a) * 32} y2={Math.sin(a) * 32} stroke={'#e0a52e'} strokeWidth={4} strokeLinecap="round" opacity={lit} />;
              })}
              {lit > 0 && <circle r={26} fill="#ffe27a" opacity={0.35 * lit} />}
              <circle r={14} fill={R('w')} />
              {lit > 0 && <circle r={14} fill={R('y')} opacity={lit} />}
              <rect x={-7} y={11} width={14} height={9} rx={3} fill={G('gr')} />
            </g>
            {/* Lv 徽章 */}
            <g transform="translate(0 -290)">
              <rect x={-30} y={-14} width={60} height={28} rx={14} fill={G('br')} />
              <text x={0} y={7} textAnchor="middle" fontFamily={BALOO} fontWeight={800} fontSize={19} fill="#fff">{BADGE}</text>
            </g>
          </g>
          {/* 面前的書和鉛筆 */}
          {book && (
            <g transform="translate(-6 14)">
              <path d="M -78 -2 L -4 -10 L 4 -10 L 78 -2 L 82 10 L -82 10 Z" fill={G('b')} />
              <path d="M -74 -6 Q -40 -16 -2 -10 L -2 4 Q -40 -2 -76 6 Z" fill="#fbf8f2" />
              <path d="M 74 -6 Q 40 -16 2 -10 L 2 4 Q 40 -2 76 6 Z" fill="#f1ece2" />
              <path d="M -60 -6 L -18 -9 M -60 -1 L -18 -4 M 18 -9 L 60 -6 M 18 -4 L 60 -1" stroke="#c9c1b2" strokeWidth={2} />
              <g transform="rotate(-14 96 4)">
                <rect x={70} y={0} width={48} height={8} rx={3} fill={G('y')} />
                <path d="M 118 0 L 128 4 L 118 8 Z" fill="#e8c9a0" />
                <rect x={66} y={0} width={6} height={8} rx={2} fill={G('p')} />
              </g>
            </g>
          )}
        </svg>
      </div>
    </>
  );
};
