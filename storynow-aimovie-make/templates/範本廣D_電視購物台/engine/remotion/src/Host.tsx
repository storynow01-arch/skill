/* 誇張購物台主持人（SVG 卡通）：姿勢關鍵格內插、跳起來、眼睛看重點、嘴巴講話、星星眼、冒汗。
   姿勢、跳躍、講話時段、對白全部依 timeline.json 的商品區排出（省略的區自動跳過）。原作：02_試做/廣告30風格 第 19 支 */
import React from 'react';
import {EIO, k, lerp, pulse, sp} from './kit';
import {INK, RED, WHITE, Y} from './parts';
import T from './timeline.json';

/* eslint-disable @typescript-eslint/no-explicit-any */
const m = T.m as any;
const BF = T.beatFrames;
const Z: Record<string, any> = Object.fromEntries((T.zones as any[]).map((z) => [z.type, z.ev]));
const SAYD = ((T.d as any).say || {}) as Record<string, string>;
type Pose = {l1: number; l2: number; r1: number; r2: number; mouth: number; eyes: number; star: number; lx: number; ly: number; brow: number; wig: number; sweat: number};
const BASE: Pose = {l1: 20, l2: 221, r1: 20, r2: 30, mouth: 0, eyes: 0, star: 0, lx: 0.7, ly: 0, brow: 0, wig: 0, sweat: 0};
const P: Record<string, Pose> = {
  neutral: BASE,
  cheer: {...BASE, l1: 150, l2: 168, r1: 150, r2: 168, star: 1, lx: 0, ly: -0.4, brow: 1},
  wave: {...BASE, r1: 135, r2: 168, lx: 0, ly: 0, wig: 1},
  point: {...BASE, r1: 96, r2: 92, lx: 1, ly: -0.1, brow: 0.5},
  pointUp: {...BASE, r1: 120, r2: 125, lx: 1, ly: -0.7, brow: 0.8},
  shock: {...BASE, l1: 125, l2: 150, r1: 125, r2: 150, mouth: 1, eyes: 1, lx: 1, ly: 0, brow: 1},
  windup: {...BASE, r1: 168, r2: 205, lx: 1, ly: -0.3, brow: 0.9},
  watch: {...BASE, l1: 30, l2: 300, r1: 22, r2: 268, mouth: 1, eyes: 1, lx: 0.4, ly: 0.7, brow: 1, sweat: 1},
};
const KEYS: [number, keyof typeof P][] = (() => {
  const p = Z.price;
  const out: [number, keyof typeof P][] = [[0, 'cheer'], [m.hello, 'wave'], [p.orig, 'point'], [p.shock, 'shock'], [p.roll, 'windup'], [p.wave, 'point'],
    [p.zero, 'cheer'], [p.free + 20, 'point']];
  if (p.more !== undefined) out.push([p.more, 'cheer']);
  if (Z.bonus) out.push([Z.bonus.start + 6, 'point'], [Z.bonus.plus, 'pointUp'], [Z.bonus.card, 'point'], [Z.bonus.card24, 'cheer'], [Z.bonus.card24 + 30, 'neutral']);
  if (Z.tags) {
    out.push([Z.tags.start + 4, 'pointUp']);
    (Z.tags.tags as number[]).slice(1).forEach((t) => out.push([t, 'point']));
    out.push([Z.tags.tags[Z.tags.tags.length - 1] + 30, 'cheer']);
  }
  if (Z.gifts) out.push([Z.gifts.start, 'pointUp'], [Z.gifts.box1, 'point'], [Z.gifts.both, 'wave'], [Z.gifts.double, 'cheer'], [Z.gifts.double + 34, 'neutral']);
  if (Z.chips) out.push([Z.chips.start, 'pointUp'], [Z.chips.chips[0], 'point']);
  if (Z.countdown) out.push([Z.countdown.start, 'watch'], [Z.countdown.act, 'wave']);
  out.push([Z.call.start, 'point'], [Z.call.num, 'cheer'], [Z.call.web, 'point'], [m.end, 'cheer']);
  return out.sort((a, b) => a[0] - b[0]);
})();
const mixPose =(a: Pose, b: Pose, p: number): Pose => {
  const o = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((key) => (o[key] = lerp(a[key], b[key], p)));
  return o;
};
const poseAt = (f: number): Pose => {
  let i = 0;
  while (i + 1 < KEYS.length && f >= KEYS[i + 1][0]) i++;
  if (i === 0) return P[KEYS[0][1]];
  const p = k(f, KEYS[i][0], KEYS[i][0] + 7, EIO);
  return mixPose(P[KEYS[i - 1][1]], P[KEYS[i][1]], p);
};
/** 跳起來：拋物線（回傳往上的位移，正值＝往上） */
const JUMPS: [number, number, number][] = [
  [Z.price.zero, 130, 18], ...(Z.price.more !== undefined ? [[Z.price.more, 170, 20]] as [number, number, number][] : []),
  ...(Z.bonus ? [[Z.bonus.card24, 90, 14]] as [number, number, number][] : []), ...(Z.gifts ? [[Z.gifts.double, 130, 18]] as [number, number, number][] : []),
  [Z.call.num, 90, 14], [m.end, 150, 20],
];
export const hostLift = (f: number) => {
  let y = 0;
  for (const [at, h, d] of JUMPS) {
    const t = f - at;
    if (t >= 0 && t < d) y += h * 4 * (t / d) * (1 - t / d);
  }
  return y;
};
/** 講話時段（嘴巴開合） */
const TALK: [number, number][] = [[m.hello, m.hello + 26], [Z.price.shock, Z.price.shock + 30], [Z.call.call, Z.call.call + 40], [m.end, m.end + 30],
  ...(Z.price.more !== undefined ? [[Z.price.more, Z.price.more + 26]] as [number, number][] : []),
  ...(Z.bonus ? [[Z.bonus.plus, Z.bonus.plus + 20]] as [number, number][] : []), ...(Z.gifts ? [[Z.gifts.early, Z.gifts.early + 20]] as [number, number][] : []),
  ...(Z.countdown ? [[Z.countdown.act, Z.countdown.act + 40]] as [number, number][] : [])];
/** 對白（storyboard 的 say；沒寫的就不說） */
export const SAY: [number, number, string][] = ([
  [m.hello, Z.price.orig - 4, SAYD.hello ?? '大家好！'],
  [Z.price.shock + 4, Z.price.roll - 2, SAYD.shock ?? '原價耶！'],
  ...(Z.countdown ? [[Z.countdown.start + 20, Z.countdown.act - 4, SAYD.hurry ?? '快！快！']] : []),
  [Z.call.web + 8, m.end - 6, SAYD.call ?? '快打電話！'],
] as [number, number, string][]).filter(([a, b, s]) => s && b - a > 8);
const dir = (a: number, side: number): [number, number] => [side * Math.sin((a * Math.PI) / 180), Math.cos((a * Math.PI) / 180)];

const StarEye: React.FC<{cx: number; cy: number; r: number}> = ({cx, cy, r}) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return <path d={d + 'Z'} fill={Y} stroke={INK} strokeWidth={5} strokeLinejoin="round" />;
};

export const Host: React.FC<{f: number}> = ({f}) => {
  const po = poseAt(f);
  // 進場：從下面彈上來
  const enter = sp(f, m.hostIn, 11, 170, 0.9);
  const lift = hostLift(f);
  const bob = 7 * pulse(f, BF, 0.45);
  const y = (1 - enter) * 760 - lift - bob;
  // 落地壓扁、空中拉長
  const air = lift > 4 ? 1 : 0;
  const sq = 1 + air * 0.06 - 0.05 * pulse(f, BF, 0.25);
  const talking = TALK.some(([a, b]) => f >= a && f < b);
  const open = talking ? 0.25 + 0.75 * Math.abs(Math.sin(f * 0.8)) : 0.55;
  const blink = f % 97 < 3 && po.eyes < 0.5 && po.star < 0.5;
  const wig = po.wig * 26 * Math.sin(f * 0.55);
  const arms = [
    {side: -1, a1: po.l1, a2: po.l2, sx: 130, sy: 352, mic: true},
    {side: 1, a1: po.r1, a2: po.r2 + wig, sx: 270, sy: 352, mic: false},
  ];
  const lx = po.lx * 9, ly = po.ly * 9;
  const mouthD = (() => {
    // 0＝大笑（D 字）、1＝O 字
    const w = lerp(62, 26, po.mouth), d = lerp(18 + open * 46, 40, po.mouth);
    if (po.mouth > 0.6) return `M${200 - w},284 Q200,${284 - d} ${200 + w},284 Q200,${284 + d * 1.3} ${200 - w},284Z`;
    return `M${200 - w},270 Q200,${266} ${200 + w},270 Q${200 + w * 0.9},${270 + d * 1.5} 200,${270 + d * 1.5} Q${200 - w * 0.9},${270 + d * 1.5} ${200 - w},270Z`;
  })();
  return (
    <div style={{position: 'absolute', left: 130, top: 175, width: 400, height: 640}}>
      {/* 地上的影子（不跟著跳） */}
      <svg width={400} height={640} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <ellipse cx={200} cy={628} rx={130 - lift * 0.3} ry={20} fill="rgba(10,10,40,0.35)" />
      </svg>
      <svg width={400} height={640} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', transform: `translateY(${y}px) scale(${2 - sq},${sq})`, transformOrigin: '200px 630px'}}>
        {/* 腿 */}
        <rect x={150} y={470} width={42} height={150} rx={14} fill="#1b1f5e" stroke={INK} strokeWidth={6} />
        <rect x={208} y={470} width={42} height={150} rx={14} fill="#1b1f5e" stroke={INK} strokeWidth={6} />
        <ellipse cx={162} cy={624} rx={40} ry={18} fill={INK} />
        <ellipse cx={240} cy={624} rx={40} ry={18} fill={INK} />
        {/* 西裝 */}
        <path d="M120,345 Q200,318 280,345 L268,492 Q200,506 132,492Z" fill={RED} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
        <path d="M172,334 L200,420 L228,334Z" fill={WHITE} stroke={INK} strokeWidth={5} />
        <path d="M200,345 L176,330 L176,358Z M200,345 L224,330 L224,358Z" fill={Y} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
        <circle cx={200} cy={345} r={7} fill={Y} stroke={INK} strokeWidth={4} />
        <circle cx={200} cy={444} r={8} fill={Y} stroke={INK} strokeWidth={3} />
        <circle cx={200} cy={472} r={8} fill={Y} stroke={INK} strokeWidth={3} />
        <path d="M150,410 L176,410" stroke={Y} strokeWidth={8} strokeLinecap="round" />
        {/* 頭 */}
        <circle cx={92} cy={232} r={22} fill="#ffc28f" stroke={INK} strokeWidth={6} />
        <circle cx={308} cy={232} r={22} fill="#ffc28f" stroke={INK} strokeWidth={6} />
        <circle cx={200} cy={228} r={110} fill="#ffcf9e" stroke={INK} strokeWidth={7} />
        {/* 油頭 */}
        <path d="M92,214 Q78,120 160,104 Q240,70 300,128 Q326,160 310,214 Q300,170 262,156 Q226,178 150,150 Q108,160 92,214Z" fill="#2a1a10" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        <path d="M150,112 Q200,92 252,112" stroke="#6b4a33" strokeWidth={8} fill="none" strokeLinecap="round" />
        {/* 眉毛 */}
        <path d={`M132,${178 - po.brow * 14} Q158,${164 - po.brow * 18} 184,${176 - po.brow * 12}`} stroke={INK} strokeWidth={11} fill="none" strokeLinecap="round" />
        <path d={`M216,${176 - po.brow * 12} Q242,${164 - po.brow * 18} 268,${178 - po.brow * 14}`} stroke={INK} strokeWidth={11} fill="none" strokeLinecap="round" />
        {/* 眼睛 */}
        {po.star > 0.5 ? (
          <>
            <StarEye cx={158} cy={210} r={34} />
            <StarEye cx={242} cy={210} r={34} />
          </>
        ) : blink ? (
          <>
            <path d="M134,212 Q158,224 182,212" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
            <path d="M218,212 Q242,224 266,212" stroke={INK} strokeWidth={7} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            {[158, 242].map((cx) => (
              <g key={cx}>
                <ellipse cx={cx} cy={210} rx={24 + po.eyes * 6} ry={28 + po.eyes * 8} fill={WHITE} stroke={INK} strokeWidth={6} />
                <circle cx={cx + lx} cy={212 + ly} r={12 - po.eyes * 3} fill={INK} />
                <circle cx={cx + lx + 4} cy={207 + ly} r={4} fill={WHITE} />
              </g>
            ))}
          </>
        )}
        {/* 腮紅、八字鬍、嘴 */}
        <ellipse cx={122} cy={262} rx={20} ry={12} fill="#ff7a8a" opacity={0.7} />
        <ellipse cx={278} cy={262} rx={20} ry={12} fill="#ff7a8a" opacity={0.7} />
        <path d={mouthD} fill="#8a0f2a" stroke={INK} strokeWidth={6} strokeLinejoin="round" />
        {po.mouth < 0.6 && <path d={`M${200 - lerp(62, 26, po.mouth) + 8},272 L${200 + lerp(62, 26, po.mouth) - 8},272 L${200 + 40},286 L${200 - 40},286Z`} fill={WHITE} />}
        <path d="M150,252 Q176,238 200,252 Q224,238 250,252 Q232,262 200,256 Q168,262 150,252Z" fill="#2a1a10" />
        {po.sweat > 0.3 && (
          <path d={`M300,${150 + ((f * 3) % 40)} q12,22 0,30 q-12,-8 0,-30Z`} fill="#6fd0ff" stroke={INK} strokeWidth={4} opacity={po.sweat} />
        )}
        {/* 手臂 */}
        {arms.map((a, i) => {
          const [d1x, d1y] = dir(a.a1, a.side);
          const [d2x, d2y] = dir(a.a2, a.side);
          const ex = a.sx + d1x * 92, ey = a.sy + d1y * 92;
          const hx = ex + d2x * 86, hy = ey + d2y * 86;
          return (
            <g key={i}>
              <path d={`M${a.sx},${a.sy} L${ex},${ey} L${hx},${hy}`} stroke={INK} strokeWidth={46} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d={`M${a.sx},${a.sy} L${ex},${ey} L${hx},${hy}`} stroke={RED} strokeWidth={34} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {!a.mic && <rect x={hx - d2x * 26 - 13} y={hy - d2y * 26 - 9} width={26} height={18} rx={4} fill={Y} stroke={INK} strokeWidth={4} transform={`rotate(${-a.a2 * a.side + 90},${hx - d2x * 26},${hy - d2y * 26})`} />}
              {a.mic && (
                <g>
                  <rect x={hx - 9} y={hy - 70} width={18} height={70} rx={6} fill="#cfd3dc" stroke={INK} strokeWidth={5} />
                  <circle cx={hx} cy={hy - 82} r={22} fill="#3a3a48" stroke={INK} strokeWidth={5} />
                  <path d={`M${hx - 14},${hy - 88} L${hx + 14},${hy - 88} M${hx - 16},${hy - 78} L${hx + 16},${hy - 78}`} stroke="#777" strokeWidth={3} />
                </g>
              )}
              <circle cx={hx} cy={hy} r={25} fill={WHITE} stroke={INK} strokeWidth={6} />
              <path d={`M${hx - 10},${hy - 6} L${hx + 10},${hy - 6}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
