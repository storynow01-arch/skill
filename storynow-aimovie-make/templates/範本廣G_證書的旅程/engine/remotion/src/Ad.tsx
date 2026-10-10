/* 範本廣G「證書的旅程」：水彩繪本。
   主角是一張會飄、會害羞的紙片（上面的字讀 storyboard 的 hero）：房間角落醒來 → 飛出窗外 → 穿過 1～4 道門、每道門蓋一個章 → 被貼上塗鴉牆正中央。
   場景轉換＝翻頁（書頁先動，紙片晚一拍被風帶過去）。時間表全在 timeline.json（由 engine/timeline.py 依內容排出）。
   原作：02_試做/廣告30風格 src/ads/Ad16.tsx（固定 3 道門、60 秒、屏榮幼保科）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {T, NG, CLIMAX, BX, BY, PW, PH, kk, mix, OUT, SM, pose, speed, camera, wp, stampPt, look, rnd} from './core';
import {CertBody, SealsOnCert, Stamp, Defs, paperPath} from './cert';
import {Spread, Crayon} from './scenes';
import {FONT} from './fonts';

const L = T.turnLen;

/* ───── 半頁（翻頁用） ───── */
const Half: React.FC<{i: number; f: number; side: 'L' | 'R'; left: number}> = ({i, f, side, left}) => (
  <div style={{position: 'absolute', left, top: 0, width: PW, height: PH, overflow: 'hidden', backfaceVisibility: 'hidden'}}>
    <div style={{position: 'absolute', left: side === 'L' ? 0 : -PW, top: 0}}>
      <Spread i={i} f={f} />
    </div>
    <div style={{position: 'absolute', inset: 0, background: `linear-gradient(${side === 'L' ? 'to left' : 'to right'}, rgba(120,80,50,0.24), rgba(120,80,50,0.06) 40px, rgba(120,80,50,0) 90px)`}} />
  </div>
);

const Book: React.FC<{f: number}> = ({f}) => {
  const ti = T.turns.findIndex((t) => f >= t && f < t + L);
  if (ti < 0) {
    const pg = T.turns.filter((t) => f >= t + L).length;
    return (
      <>
        <Half i={pg} f={f} side="L" left={0} />
        <Half i={pg} f={f} side="R" left={PW} />
      </>
    );
  }
  const p = kk(f, T.turns[ti], T.turns[ti] + L, SM);
  const ang = -180 * p;
  const lift = Math.sin(Math.PI * p);
  return (
    <div style={{position: 'absolute', inset: 0, perspective: 3200, perspectiveOrigin: `${PW}px ${PH / 2}px`}}>
      <Half i={ti} f={f} side="L" left={0} />
      <Half i={ti + 1} f={f} side="R" left={PW} />
      {/* 翻起的書頁投在下一頁的影子 */}
      <div style={{position: 'absolute', left: PW, top: 0, width: PW, height: PH,
        background: `linear-gradient(to right, rgba(90,60,40,${0.28 * lift}), rgba(90,60,40,0) ${Math.max(8, 100 * Math.cos((Math.PI * p) / 2))}%)`, opacity: p < 0.5 ? 1 : 0}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH,
        background: `linear-gradient(to left, rgba(90,60,40,${0.28 * lift}), rgba(90,60,40,0) ${Math.max(8, 100 * Math.cos((Math.PI * (1 - p)) / 2))}%)`, opacity: p >= 0.5 ? 1 : 0}} />
      <div style={{position: 'absolute', left: PW, top: 0, width: PW, height: PH, transformOrigin: '0 50%', transformStyle: 'preserve-3d',
        transform: `rotateY(${ang}deg)`}}>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden'}}>
          <Half i={ti} f={f} side="R" left={0} />
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(to right, rgba(80,50,30,${0.32 * Math.min(1, p * 2)}), rgba(255,250,235,${0.25 * lift}))`}} />
        </div>
        <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)'}}>
          <Half i={ti + 1} f={f} side="L" left={0} />
          <div style={{position: 'absolute', inset: 0, background: `linear-gradient(to left, rgba(80,50,30,${0.32 * Math.min(1, (1 - p) * 2)}), rgba(255,250,235,${0.25 * lift}))`}} />
        </div>
      </div>
    </div>
  );
};

/* ───── 桌面小物（靜態：蠟筆、便條紙） ───── */
const Crayons: React.FC = () => (
  <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
    {[
      [60, 1010, -20, '#f29bb0'], [40, 780, 70, '#7cbf86'], [1870, 300, 100, '#4f95c4'], [1790, 1030, 8, '#ffd36e'], [330, 1040, 4, '#e89a4a'],
    ].map(([x, y, r, c], i) => (
      <g key={i} transform={`translate(${x},${y}) rotate(${r})`}>
        <rect x={-70} y={-11} width={140} height={22} rx={6} fill={c as string} />
        <rect x={-40} y={-11} width={60} height={22} fill="#fff" opacity={0.35} />
        <path d="M70,-11 L96,0 L70,11 Z" fill={c as string} />
      </g>
    ))}
    {[[1850, 820, '#a9d4f0'], [90, 160, '#f6a7ba']].map(([x, y, c], i) => (
      <g key={'b' + i} transform={`translate(${x},${y}) rotate(${i ? -12 : 15})`}>
        <rect x={-42} y={-42} width={84} height={84} rx={8} fill={c as string} stroke="#6b4a3a" strokeOpacity={0.4} strokeWidth={3} />
      </g>
    ))}
  </svg>
);

/* ───── 紙片與它身邊的東西（畫面座標） ───── */
const Actor: React.FC<{f: number}> = ({f}) => {
  const P = pose(f);
  const v = speed(f);
  const tf = (q: {x: number; y: number; rot: number; sc: number}, sx = 1, sy = 1) =>
    `translate(${BX + q.x},${BY + q.y}) rotate(${q.rot}) scale(${q.sc * sx},${q.sc * sy})`;
  const ghostO = Math.max(0, Math.min(1, (v - 9) / 14));
  const cx = BX + P.x, cy = BY + P.y;
  const SC = T.stamps[CLIMAX];
  const SP = stampPt(CLIMAX);
  // 高潮的水彩紙花
  const conf = (at: number, n: number, ox: number, oy: number, pw: number, seed: string) =>
    f >= at && f < at + 90
      ? Array.from({length: n}, (_, k) => {
          const t = f - at;
          const a = rnd(seed + 'a' + k) * Math.PI;
          const sp = (10 + 9 * (rnd(seed + 's' + k) + 1)) * pw;
          const x = ox + Math.sin(a) * sp * t * 0.9;
          const y = oy - Math.cos(a) * sp * t * 0.9 * (a > -2 && a < 2 ? 1 : -0.3) + 0.22 * t * t;
          const o = 1 - kk(f, at + 45, at + 90);
          const c = ['#f6a7ba', '#ffd36e', '#9fd8c0', '#a9d4f0', '#c9b6ec'][k % 5];
          return k % 3 === 0 ? (
            <path key={k} d={`M${x},${y - 9} L${x + 4},${y - 2} L${x + 11},${y} L${x + 4},${y + 2} L${x},${y + 9} L${x - 4},${y + 2} L${x - 11},${y} L${x - 4},${y - 2} Z`} fill={c} opacity={o} />
          ) : (
            <ellipse key={k} cx={x} cy={y} rx={8} ry={5} transform={`rotate(${t * 9 + k * 40},${x},${y})`} fill={c} opacity={o * 0.9} />
          );
        })
      : null;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <Defs />
      {/* 穿過門的亮光圈 */}
      {T.gatePass.map((g, i) => {
        if (f < g - 2 || f > g + 30) return null;
        const p = kk(f, g - 2, g + 30, OUT);
        const G = look(i);
        const gx = BX + G.x, gy = BY + G.ground - G.h * 0.95 + 140;
        return (
          <g key={i} opacity={1 - p}>
            <circle cx={gx} cy={gy} r={40 + 150 * p} fill="none" stroke="#fff3a8" strokeWidth={14 * (1 - p) + 2} />
            {Array.from({length: 8}, (_, k) => {
              const a = (k / 8) * Math.PI * 2 + i;
              const r = 50 + 180 * p;
              return <circle key={k} cx={gx + Math.cos(a) * r} cy={gy + Math.sin(a) * r} r={7 * (1 - p) + 2} fill={['#ffd36e', '#f6a7ba', '#9fd8c0'][k % 3]} />;
            })}
          </g>
        );
      })}
      {NG > 1 && conf(SC, 46, BX + SP[0], BY + SP[1] - 40, 1, 'c3')}
      {conf(T.final, 34, 960, 260, 0.8, 'fn')}
      {/* 睡覺的 Zzz */}
      {f < T.wake + 10 &&
        [0, 1, 2].map((k) => {
          const ph = ((f + k * 22) % 66) / 66;
          return (
            <text key={k} x={cx + 140 + ph * 50} y={cy - 110 - ph * 100} fontFamily={FONT} fontSize={30 + ph * 22} fill="#7aa8d0"
              opacity={Math.sin(Math.PI * ph) * (1 - kk(f, T.wake, T.wake + 10))}>z</text>
          );
        })}
      {/* 影子 */}
      <g transform={`translate(${16 + 10 * P.flying},${20 + 26 * P.flying})`} opacity={0.13 - 0.05 * P.flying}>
        <g transform={tf(P, P.sx, P.sy)}><path d={paperPath(2.5, f * 0.45)} fill="#6b3a1a" /></g>
      </g>
      {/* 動態模糊：殘影 */}
      {ghostO > 0 &&
        [4, 3, 2, 1].map((k) => {
          const q = pose(f - k * 1.3);
          return (
            <g key={k} transform={tf(q, q.sx, q.sy)} opacity={(0.34 - k * 0.07) * ghostO}>
              <CertBody f={f} flying={1} ghost />
            </g>
          );
        })}
      {/* 紙片本人 */}
      <g transform={tf(P, P.sx, P.sy)}>
        <CertBody f={f} flying={P.flying} />
        <SealsOnCert f={f} />
        {f >= T.pin - 2 &&
          [[-128, -104, -38], [128, -104, 38]].map(([x, y, r], k) => {
            const p = kk(f, T.pin - 2 + k * 3, T.pin + 6 + k * 3, OUT);
            return (
              <g key={k} transform={`translate(${x},${y}) rotate(${r}) scale(${mix(1.6, 1, p)})`} opacity={p}>
                <rect x={-46} y={-15} width={92} height={30} fill={k ? '#bfe6cf' : '#f6b3c3'} opacity={0.85} />
                <path d="M-46,-15 L-40,-8 L-46,0 L-40,8 L-46,15 M46,-15 L40,-8 L46,0 L40,8 L46,15" stroke="#fff" strokeWidth={2} fill="none" opacity={0.6} />
              </g>
            );
          })}
        <Stamp f={f} />
      </g>
    </svg>
  );
};

/** 最後一頁：紙片的對話泡泡（wall.bubble） */
const Bubble: React.FC<{f: number}> = ({f}) => {
  const w = T.writes.bubble;
  const txt = T.d.wall.bubble;
  if (!w || !txt || f < w[0] - 6) return null;
  const a = w[0];
  const p = kk(f, a - 6, a + 8, OUT);
  const size = T.d.wall.bubbleSize;
  const bw = 300;
  const x = BX + 840 - 452, y = BY + 226;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: bw, height: 104, transform: `scale(${mix(0.4, 1, p)})`, transformOrigin: '100% 60%', opacity: Math.min(1, p * 2)}}>
      <svg width={bw + 30} height={110} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={`M18,8 L${bw - 18},8 Q${bw - 2},8 ${bw - 2},24 L${bw - 2},46 L${bw + 26},64 L${bw - 2},62 L${bw - 2},80 Q${bw - 2},96 ${bw - 18},96 L18,96 Q2,96 2,80 L2,24 Q2,8 18,8 Z`}
          fill="#fffaf0" stroke="#e3b673" strokeWidth={4} />
      </svg>
      <Crayon text={txt} x={bw / 2} y={52 - size * 0.6} size={size} color="#5fa86f" p={wp(f, 'bubble')} align="center" seed="bb" />
    </div>
  );
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const C = camera(f);
  return (
    <AbsoluteFill style={{background: '#efe2cd', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #f8eedd 0%, #efe2cd 55%, #e6d4ba 100%)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0',
        transform: `translate(960px,540px) rotate(${C.rot}deg) scale(${C.s}) translate(${-C.cx}px,${-C.cy}px)`}}>
        <Crayons />
        <div style={{position: 'absolute', left: BX - 22, top: BY - 18, width: 1680 + 44, height: 900 + 40, borderRadius: 18, background: '#e8a6a0',
          boxShadow: '0 26px 60px rgba(110,70,40,0.28)'}} />
        <div style={{position: 'absolute', left: BX - 8, top: BY - 6, width: 1680 + 16, height: 900 + 14, borderRadius: 6, background: '#f3e7d2',
          boxShadow: 'inset 0 -6px 0 #eadbc2'}} />
        <div style={{position: 'absolute', left: BX, top: BY, width: 1680, height: 900}}>
          <Book f={f} />
        </div>
        <Actor f={f} />
        <Bubble f={f} />
      </div>
    </AbsoluteFill>
  );
};
