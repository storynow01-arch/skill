/* 概念 B：創客手稿 Maker's Notebook —— 一鏡到底，筆在巨大筆記本上即時畫出一切（10 秒試看） */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {loadFont as loadKai} from '@remotion/google-fonts/LXGWWenKaiTC';
import {loadFont as loadHand} from '@remotion/google-fonts/Caveat';

export const KAI = loadKai('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;
export const HAND = loadHand('normal', {weights: ['700']}).fontFamily;
export const INK = '#23324A', RED = '#E2483D', YEL = '#FFD84D', BLUE = '#2F6FD6', PAPER = '#FBF8F1';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], {...clamp, easing: io});

/* 一鏡到底的攝影機關鍵格：[frame, 中心x, 中心y, 縮放, 旋轉(度)] */
const CAM: [number, number, number, number, number][] = [
  [0, 760, 470, 1.7, -2], [62, 820, 470, 1.6, -1], [100, 2080, 640, 1.25, 2], [168, 2120, 660, 1.32, 1],
  [200, 980, 1540, 1.3, -3], [238, 1000, 1560, 1.35, -2], [276, 1720, 1120, 0.62, 0], [300, 1720, 1120, 0.6, 0]];
const camAt = (f: number) => {
  const k = CAM.findIndex(([fr], i) => i < CAM.length - 1 && f >= fr && f < CAM[i + 1][0]);
  if (k < 0) return CAM[CAM.length - 1].slice(1) as number[];
  const [f0, ...a] = CAM[k], [f1, ...b] = CAM[k + 1];
  const t = io((f - f0) / (f1 - f0));
  return a.map((v, i) => v + (b[i] - v) * t);
};

/** 描邊逐筆畫出的文字（先畫外框，再填色） */
export const DrawText: React.FC<{x: number; y: number; text: string; size: number; font: string; color: string; start: number; dur: number; f: number}> = (
  {x, y, text, size, font, color, start, dur, f}) => {
  const p = prog(f, start, start + dur);
  const fill = prog(f, start + dur * 0.6, start + dur + 8);
  return (
    <text x={x} y={y} fontFamily={font} fontWeight={700} fontSize={size} fill={color} fillOpacity={fill} stroke={color} strokeWidth={2.2}
      strokeDasharray={3000} strokeDashoffset={3000 * (1 - p)} style={{opacity: p > 0 ? 1 : 0}}>{text}</text>
  );
};
/** 逐筆畫出的線條 */
export const DrawPath: React.FC<{d: string; start: number; dur: number; f: number; color?: string; w?: number; len?: number}> = (
  {d, start, dur, f, color = INK, w = 5, len = 1200}) => {
  const p = prog(f, start, start + dur);
  return <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={len} strokeDashoffset={len * (1 - p)} opacity={p > 0 ? 1 : 0} />;
};

export const Pencil: React.FC<{x: number; y: number; on: boolean}> = ({x, y, on}) => on ? (
  <g transform={`translate(${x} ${y}) rotate(-35)`}>
    <rect x={0} y={-9} width={150} height={18} fill="#F2B233" stroke={INK} strokeWidth={2} />
    <polygon points="0,-9 -26,0 0,9" fill="#F5D7A1" stroke={INK} strokeWidth={2} />
    <polygon points="-18,-3 -26,0 -18,3" fill={INK} />
    <rect x={150} y={-9} width={20} height={18} fill="#E58FA0" stroke={INK} strokeWidth={2} />
  </g>
) : null;

export const Notebook: React.FC = () => {
  const f = useCurrentFrame();
  const [cx, cy, z, rot] = camAt(f);

  // 筆的位置：跟著目前正在畫的東西走
  const penTrack: [number, number, number, number, number, number][] = [ // [start, end, x0, y0, x1, y1]
    [6, 56, 330, 470, 1250, 470], [104, 150, 1700, 400, 2500, 860], [210, 236, 820, 1640, 1150, 1600], [244, 274, 1180, 1250, 2420, 1250]];
  const pen = penTrack.find(([a, b]) => f >= a && f <= b);
  const penPos = pen ? [pen[2] + (pen[4] - pen[2]) * ((f - pen[0]) / (pen[1] - pen[0])), pen[3] + (pen[5] - pen[3]) * ((f - pen[0]) / (pen[1] - pen[0])) + Math.sin(f * 1.7) * 8] : null;

  const ledOn = f > 150;
  const armAng = f > 150 ? Math.sin((f - 150) / 9) * 25 : 0;
  const polaroid = prog(f, 196, 214);
  const sticky = prog(f, 228, 242);

  return (
    <AbsoluteFill style={{background: '#8A6A4A', overflow: 'hidden'}}>
      {/* 木桌紋理 */}
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(90deg, #8A6A4A 0 38px, #7E5F41 38px 40px, #94735A 40px 90px)', opacity: 0.9}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: 3600, height: 2300, transformOrigin: '0 0',
        transform: `translate(960px, 540px) rotate(${rot}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`}}>
        {/* 筆記本頁面 */}
        <div style={{position: 'absolute', left: 120, top: 80, width: 3360, height: 2140, background: PAPER, borderRadius: 18,
          boxShadow: '0 30px 60px rgba(0,0,0,0.35)', backgroundImage: 'linear-gradient(#cfdcf0 1.5px, transparent 1.5px), linear-gradient(90deg, #cfdcf0 1.5px, transparent 1.5px)',
          backgroundSize: '48px 48px'}} />
        {Array.from({length: 22}, (_, i) => <div key={i} style={{position: 'absolute', left: 92, top: 140 + i * 94, width: 56, height: 30, borderRadius: 15,
          border: '7px solid #9AA3AE', background: 'transparent'}} />)}
        <svg width={3600} height={2300} style={{position: 'absolute', left: 0, top: 0}}>
          {/* ① 第一行程式 */}
          <DrawText x={330} y={500} text={'print("Hello")'} size={150} font={HAND} color={BLUE} start={6} dur={50} f={f} />
          <DrawPath d="M 330 540 Q 800 575 1250 530" start={50} dur={12} f={f} color={RED} w={7} len={1000} />
          <DrawText x={360} y={680} text="← 你寫的第一行" size={56} font={KAI} color={INK} start={56} dur={20} f={f} />

          {/* ② ESP32 線路草圖 → 活起來 */}
          <DrawPath d="M 1760 420 h 300 v 220 h -300 Z" start={104} dur={16} f={f} w={6} len={1100} />
          <DrawText x={1800} y={555} text="ESP32" size={70} font={HAND} color={INK} start={110} dur={14} f={f} />
          {[[2300, 380], [2420, 520], [2300, 700]].map(([x, y], i) => (
            <g key={i}>
              <DrawPath d={`M 2060 ${470 + i * 70} C 2160 ${470 + i * 70}, ${x - 120} ${y}, ${x - 34} ${y}`} start={118 + i * 6} dur={14} f={f} w={4} len={500} />
              <circle cx={x} cy={y} r={30} fill={ledOn && Math.floor((f - 150 + i * 5) / 8) % 2 === 0 ? YEL : 'none'} stroke={INK} strokeWidth={5}
                opacity={f > 124 + i * 6 ? 1 : 0} style={{filter: ledOn ? `drop-shadow(0 0 14px ${YEL})` : undefined}} />
            </g>
          ))}
          {/* 手臂草圖 */}
          <g transform="translate(1980 960)" opacity={f > 132 ? 1 : 0}>
            <DrawPath d="M -90 40 h 180" start={132} dur={8} f={f} w={6} len={200} />
            <g transform={`rotate(${-30 + armAng})`}>
              <DrawPath d="M 0 30 L 0 -150" start={136} dur={8} f={f} w={9} len={200} />
              <g transform={`translate(0 -150) rotate(${60 - armAng * 1.5})`}>
                <DrawPath d="M 0 0 L 150 0" start={142} dur={8} f={f} w={8} len={200} />
                <DrawPath d="M 150 0 l 20 -24 M 150 0 l 20 24" start={148} dur={6} f={f} w={6} len={80} />
                <circle cx={0} cy={0} r={14} fill={PAPER} stroke={INK} strokeWidth={5} />
              </g>
              <circle cx={0} cy={30} r={16} fill={PAPER} stroke={INK} strokeWidth={5} />
            </g>
          </g>
          <DrawText x={2200} y={1080} text="草圖 → 真的會動！" size={54} font={KAI} color={RED} start={150} dur={16} f={f} />

          {/* ③ 榮耀頁：手寫 10 ＋ 麥克筆圈 */}
          <DrawText x={760} y={1720} text="10" size={260} font={HAND} color={RED} start={208} dur={22} f={f} />
          <DrawPath d="M 980 1560 C 1180 1560, 1220 1760, 1000 1780 C 760 1800, 700 1620, 860 1560 C 920 1540, 1000 1545, 1060 1575"
            start={226} dur={14} f={f} color={RED} w={10} len={1300} />
          <DrawText x={1120} y={1720} text="位國際國手" size={84} font={KAI} color={INK} start={230} dur={18} f={f} />

          {/* ④ 你的頁面：標題 */}
          <DrawText x={1180} y={1280} text="你的未來，自己寫" size={150} font={KAI} color={INK} start={244} dur={30} f={f} />
          <DrawPath d="M 1180 1320 Q 1800 1350 2420 1305" start={274} dur={10} f={f} color={BLUE} w={9} len={1400} />

          {penPos && <Pencil x={penPos[0]} y={penPos[1]} on />}
        </svg>
        {/* 拍立得 + 膠帶 */}
        <div style={{position: 'absolute', left: 360 - (1 - polaroid) * 700, top: 1300 + (1 - polaroid) * 300, width: 340, height: 400, background: '#fff',
          padding: '22px 22px 80px', boxShadow: '0 16px 30px rgba(0,0,0,0.25)', transform: `rotate(${-8 + (1 - polaroid) * -20}deg)`, opacity: polaroid > 0 ? 1 : 0}}>
          <div style={{width: '100%', height: '100%', background: 'linear-gradient(160deg, #2b4c7e, #f2b233)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: 120, height: 120, borderRadius: 60, background: YEL, border: '10px solid #fff6', boxShadow: '0 0 30px #ffd84d'}} />
          </div>
          <div style={{fontFamily: HAND, fontSize: 40, color: INK, textAlign: 'center', marginTop: 8}}>WorldSkills!</div>
          <div style={{position: 'absolute', left: 110, top: -26, width: 130, height: 46, background: '#ffffffaa', transform: 'rotate(4deg)'}} />
        </div>
        {/* 便利貼 */}
        <div style={{position: 'absolute', left: 1180, top: 1790 + (1 - sticky) * 200, width: 380, height: 200, background: YEL, padding: 26,
          boxShadow: '0 10px 18px rgba(0,0,0,0.2)', transform: `rotate(${3 - (1 - sticky) * 10}deg)`, opacity: sticky > 0 ? 1 : 0,
          fontFamily: KAI, fontWeight: 700, fontSize: 52, color: INK, lineHeight: 1.3}}>12 面<br />全國金牌 ★</div>
        {/* 紙屑小點綴 */}
        {Array.from({length: 18}, (_, i) => <div key={i} style={{position: 'absolute', left: 300 + random(`dx${i}`) * 3000, top: 180 + random(`dy${i}`) * 1950,
          width: 10, height: 10, borderRadius: 5, background: [RED, BLUE, YEL][i % 3], opacity: 0.35}} />)}
      </div>
    </AbsoluteFill>
  );
};
