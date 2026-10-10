/* 廣M 特調剖面：SVG 插畫零件（背景、吧台、杯子、液體、冰塊、瓶子、長柄匙、裝飾、黑板）。原作的零件照搬，事件改讀每一層的時間 */
import React from 'react';
import {k, lerp, rnd, rnd01} from './kit';
import {
  agit, BASE_Y, C, cube, GARNISH, glassPose, GX, ICE_T, IN_BOT, innerHW, isPour, level, MK, mix, outerHW, pp, RIM_Y, Step, STEPS, stops, surfY, topColor, vessel, yOf, CAP,
} from './model';

/* ───── 背景（牆、磁磚、層架、窗光）：靜態，交給視差層移動 ───── */
const SHELF_ITEMS: [number, number, number, string][] = [
  // x, 寬, 高, 顏色
  [120, 70, 150, '#F2C7A5'], [210, 52, 110, '#BFDCCB'], [300, 88, 80, '#F6E1A6'], [560, 60, 170, '#C9D6F0'], [640, 74, 120, '#F3C9C9'],
  [1240, 64, 160, '#BFDCCB'], [1320, 90, 90, '#F6E1A6'], [1430, 56, 130, '#F2C7A5'], [1700, 70, 150, '#C9D6F0'], [2050, 80, 110, '#F3C9C9'],
  [2180, 54, 160, '#BFDCCB'], [2600, 70, 140, '#F6E1A6'], [2700, 60, 100, '#C9D6F0'],
];
export const Background: React.FC = () => (
  <svg width={4400} height={1300} viewBox="-400 -100 4400 1300" style={{position: 'absolute', left: -400, top: -100}}>
    <defs>
      <linearGradient id="mwall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FBF6EA" />
        <stop offset="1" stopColor="#EEF3EA" />
      </linearGradient>
      <pattern id="mtile" width="120" height="60" patternUnits="userSpaceOnUse">
        <rect width="120" height="60" fill="none" stroke="#000" strokeOpacity="0.035" strokeWidth="2" />
        <rect x="-60" y="30" width="120" height="30" fill="none" stroke="#000" strokeOpacity="0.035" strokeWidth="2" />
        <rect x="60" y="30" width="120" height="30" fill="none" stroke="#000" strokeOpacity="0.035" strokeWidth="2" />
      </pattern>
    </defs>
    <rect x={-400} y={-100} width={4400} height={1300} fill="url(#mwall)" />
    <rect x={-400} y={380} width={4400} height={520} fill="url(#mtile)" />
    {/* 窗光 */}
    <polygon points="1300,-100 1700,-100 1100,900 700,900" fill="#FFFFFF" opacity={0.35} />
    <polygon points="1780,-100 1900,-100 1300,900 1180,900" fill="#FFFFFF" opacity={0.3} />
    {/* 層架 */}
    <rect x={-400} y={232} width={4400} height={16} fill="#E4CFAE" />
    <rect x={-400} y={248} width={4400} height={8} fill="#D3BB95" opacity={0.6} />
    {SHELF_ITEMS.map(([x, w, h, c], i) => (
      <g key={i} opacity={0.75}>
        <rect x={x} y={232 - h} width={w} height={h} rx={i % 3 === 0 ? w / 2.5 : 10} fill={c} />
        <rect x={x + w * 0.3} y={232 - h - 18} width={w * 0.4} height={22} rx={5} fill={c} />
        <rect x={x + 6} y={232 - h + 12} width={6} height={h - 30} rx={3} fill="#fff" opacity={0.5} />
      </g>
    ))}
    {/* 盆栽 */}
    <g transform="translate(860,232)" opacity={0.85}>
      <path d="M-34,0 L-26,-46 L26,-46 L34,0 Z" fill="#E7A98A" />
      {[-60, -30, 0, 30, 60].map((a, i) => (
        <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 40} cy={-80 - Math.cos((a * Math.PI) / 180) * 30} rx={14} ry={34} fill="#9CCFA8" transform={`rotate(${a} ${Math.sin((a * Math.PI) / 180) * 40} ${-80 - Math.cos((a * Math.PI) / 180) * 30})`} />
      ))}
    </g>
  </svg>
);

/* ───── 吧台 ───── */
export const Counter: React.FC<{f: number; dx: number}> = ({f, dx}) => {
  const L = level(f) / CAP;
  const tc = topColor(f);
  return (
    <g>
      <rect x={-600} y={BASE_Y} width={4800} height={26} fill="#F4DFC0" />
      <rect x={-600} y={BASE_Y + 26} width={4800} height={600} fill="#E3BC8E" />
      <rect x={-600} y={BASE_Y + 26} width={4800} height={8} fill="#CFA270" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={-600} y={BASE_Y + 70 + i * 46} width={4800} height={3} fill="#D5AB7C" opacity={0.6} />
      ))}
      {/* 杯影＋彩色焦散光 */}
      <ellipse cx={GX + 26 + dx} cy={BASE_Y + 6} rx={200} ry={14} fill="#6B4520" opacity={0.16} />
      {L > 0.02 && <ellipse cx={GX + 150 + dx} cy={BASE_Y + 10} rx={70 + 110 * L} ry={9} fill={tc} opacity={0.18 + 0.2 * L} />}
    </g>
  );
};

/* ───── 杯子 ───── */
const glassOutline = () => {
  const t = RIM_Y, b = BASE_Y;
  return `M${GX - outerHW(t)},${t} L${GX - outerHW(b - 20)},${b - 20} Q${GX - outerHW(b)},${b} ${GX - outerHW(b) + 22},${b} L${GX + outerHW(b) - 22},${b} Q${GX + outerHW(b)},${b} ${GX + outerHW(b - 20)},${b - 20} L${GX + outerHW(t)},${t}`;
};
/** 杯子的變形（落地、晃動）：繞杯底中心 */
export const glassTf = (f: number) => {
  const g = glassPose(f);
  return `translate(0 ${g.fall}) rotate(${g.rot} ${GX} ${BASE_Y}) translate(${GX} ${BASE_Y}) scale(${g.sx} ${g.sy}) translate(${-GX} ${-BASE_Y})`;
};
export const GlassBack: React.FC = () => (
  <g>
    <path d={glassOutline() + 'Z'} fill="#DDEFF5" opacity={0.35} />
    <ellipse cx={GX} cy={RIM_Y} rx={outerHW(RIM_Y)} ry={13} fill="none" stroke="#9FB9C6" strokeOpacity={0.5} strokeWidth={3} />
  </g>
);
export const GlassFront: React.FC = () => {
  const ol = glassOutline();
  return (
    <g>
      {/* 厚杯底 */}
      <path d={`M${GX - innerHW(IN_BOT)},${IN_BOT} L${GX + innerHW(IN_BOT)},${IN_BOT} L${GX + outerHW(BASE_Y - 4) - 6},${BASE_Y - 4} L${GX - outerHW(BASE_Y - 4) + 6},${BASE_Y - 4} Z`} fill="#CFE7EF" opacity={0.75} />
      <rect x={GX - 110} y={IN_BOT + 8} width={220} height={6} rx={3} fill="#fff" opacity={0.7} />
      <path d={ol} fill="none" stroke="#8FAFBF" strokeOpacity={0.75} strokeWidth={5} strokeLinejoin="round" />
      {/* 內壁 */}
      <path d={`M${GX - innerHW(RIM_Y + 8)},${RIM_Y + 8} L${GX - innerHW(IN_BOT)},${IN_BOT} M${GX + innerHW(RIM_Y + 8)},${RIM_Y + 8} L${GX + innerHW(IN_BOT)},${IN_BOT}`} stroke="#fff" strokeOpacity={0.55} strokeWidth={3} />
      {/* 反光條 */}
      <path d={`M${GX - outerHW(RIM_Y + 40) + 22},${RIM_Y + 40} L${GX - outerHW(BASE_Y - 60) + 22},${BASE_Y - 60} L${GX - outerHW(BASE_Y - 60) + 46},${BASE_Y - 60} L${GX - outerHW(RIM_Y + 40) + 48},${RIM_Y + 40} Z`} fill="#fff" opacity={0.5} />
      <path d={`M${GX - outerHW(RIM_Y + 60) + 60},${RIM_Y + 60} L${GX - outerHW(RIM_Y + 300) + 60},${RIM_Y + 300}`} stroke="#fff" strokeOpacity={0.4} strokeWidth={6} strokeLinecap="round" />
      <path d={`M${GX + outerHW(RIM_Y + 50) - 26},${RIM_Y + 50} L${GX + outerHW(BASE_Y - 80) - 26},${BASE_Y - 80}`} stroke="#fff" strokeOpacity={0.45} strokeWidth={8} strokeLinecap="round" />
      {/* 杯口 */}
      <path d={`M${GX - outerHW(RIM_Y)},${RIM_Y} A${outerHW(RIM_Y)},13 0 0 0 ${GX + outerHW(RIM_Y)},${RIM_Y}`} fill="none" stroke="#fff" strokeOpacity={0.95} strokeWidth={4} />
    </g>
  );
};
/** 杯子落下時的殘影（動態模糊） */
export const GlassGhosts: React.FC<{f: number}> = ({f}) => {
  if (f >= MK.glassLand || f < 4) return null;
  const v = (2 * f * 760) / MK.glassLand ** 2;
  return (
    <g>
      {[1, 2, 3, 4].map((m) => (
        <path key={m} d={glassOutline() + 'Z'} transform={`translate(0 ${glassPose(f).fall - v * 0.45 * m})`} fill="#DDEFF5" fillOpacity={0.25 / m} stroke="#8FAFBF" strokeOpacity={0.35 / m} strokeWidth={5} />
      ))}
    </g>
  );
};

/* ───── 液體 ───── */
const liquidPath = (sy: number, f: number, amp: number) => {
  const hw = innerHW(sy);
  const n = 20;
  let d = '';
  for (let j = 0; j <= n; j++) {
    const x = GX - hw + (2 * hw * j) / n;
    const edge = Math.sin((Math.PI * j) / n);
    const y = sy + amp * edge * (0.6 * Math.sin(j * 0.9 + f * 0.33) + 0.4 * Math.sin(j * 0.37 - f * 0.21));
    d += (j === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }
  const r = Math.min(18, (IN_BOT - sy) * 0.5);
  const bw = innerHW(IN_BOT);
  d += `L${GX + bw},${IN_BOT - r} Q${GX + bw},${IN_BOT} ${GX + bw - r},${IN_BOT} L${GX - bw + r},${IN_BOT} Q${GX - bw},${IN_BOT} ${GX - bw},${IN_BOT - r} Z`;
  return d;
};
const SODAS = STEPS.filter((s) => s.kind === 'soda');
const STIRS = STEPS.filter((s) => s.kind === 'stir');
export const Liquid: React.FC<{f: number}> = ({f}) => {
  const L = level(f);
  if (L < 0.4) return null;
  const sy = yOf(L);
  const a = agit(f);
  const amp = Math.min(10, 1.2 + a * 2.6);
  const st = stops(f);
  const tc = topColor(f);
  const d = liquidPath(sy, f, amp);
  // 氣泡（氣泡層倒進來之後一直冒，慢慢變少）
  let amount = 0, foam = 0;
  for (const s of SODAS) {
    const [a0, b0] = s.pour as number[];
    if (f > a0 + 10) amount = Math.max(amount, Math.min(1, k(f, a0 + 10, b0)) * (1 - 0.55 * k(f, b0 + 20, b0 + 160)));
    foam = Math.max(foam, k(f, a0 + 12, a0 + 36) * (1 - k(f, b0 - 10, b0 + 60)));
  }
  let stir = 0;
  for (const s of STIRS) {
    const [a0, b0] = s.stir as number[];
    stir = Math.max(stir, k(f, a0 + 4, a0 + 10) * (1 - k(f, b0 - 8, b0 + 10)));
  }
  const span = IN_BOT - 16 - sy;
  return (
    <g>
      <defs>
        <linearGradient id="mliq" gradientUnits="userSpaceOnUse" x1="0" y1={yOf(0)} x2="0" y2={yOf(CAP)}>
          {st.map(([ml, c], i) => (
            <stop key={i} offset={Math.max(0, Math.min(1, ml / CAP))} stopColor={c} />
          ))}
        </linearGradient>
        <clipPath id="mliqclip">
          <path d={d} />
        </clipPath>
        <linearGradient id="mshade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity={0.28} />
          <stop offset="0.35" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.8" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.14} />
        </linearGradient>
      </defs>
      <path d={d} fill="url(#mliq)" opacity={0.86} />
      <path d={d} fill="url(#mshade)" />
      <g clipPath="url(#mliqclip)">
        {/* 攪拌漩渦 */}
        {stir > 0 &&
          [0, 1, 2].map((i) => (
            <ellipse key={i} cx={GX} cy={(sy + IN_BOT) / 2} rx={60 + i * 32} ry={(IN_BOT - sy) * (0.2 + i * 0.1)} fill="none" stroke="#fff" strokeOpacity={0.45 * stir} strokeWidth={5} strokeDasharray="90 220" strokeDashoffset={-f * (22 + i * 6)} />
          ))}
        {/* 上升氣泡 */}
        {amount > 0 &&
          Array.from({length: 54}, (_, i) => {
            if (rnd01(`bv${i}`) > amount) return null;
            const s = 2.4 + rnd01(`bs${i}`) * 3.2;
            const yy = IN_BOT - 16 - ((f * s + rnd01(`bp${i}`) * 900) % Math.max(20, span));
            const hw = innerHW(yy) - 16;
            const x = GX + rnd(`bx${i}`) * hw + 4 * Math.sin(f * 0.2 + i);
            const r = 2.5 + rnd01(`br${i}`) * 4;
            return <circle key={i} cx={x} cy={yy} r={r} fill="#fff" fillOpacity={0.35} stroke="#fff" strokeOpacity={0.85} strokeWidth={1.6} />;
          })}
        {/* 氣泡層的泡沫 */}
        {foam > 0 && (
          <g opacity={foam}>
            <rect x={GX - 200} y={sy - 4} width={400} height={14 + 10 * foam} fill="#FFFDF2" opacity={0.6} />
            {Array.from({length: 16}, (_, i) => (
              <circle key={i} cx={GX - innerHW(sy) + 10 + i * ((innerHW(sy) * 2 - 20) / 15)} cy={sy + 6 + 4 * Math.sin(i * 2.3 + f * 0.3)} r={5 + 3 * rnd01(`fm${i}`)} fill="#fff" opacity={0.8} />
            ))}
          </g>
        )}
      </g>
      {/* 液面亮面 */}
      <ellipse cx={GX} cy={sy} rx={innerHW(sy) - 2} ry={7 + amp * 0.35} fill={mix(tc, '#ffffff', 0.4)} opacity={0.85} transform={`rotate(${1.2 * Math.min(3, a) * Math.sin(f * 0.3)} ${GX} ${sy})`} />
    </g>
  );
};

/* ───── 冰塊 ───── */
const CubeShape: React.FC<{x: number; y: number; rot: number; o?: number}> = ({x, y, rot, o = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
    <rect x={-37} y={-34} width={74} height={68} rx={15} fill="#F4FBFF" fillOpacity={0.42} stroke="#fff" strokeOpacity={0.95} strokeWidth={3.5} />
    <rect x={-25} y={-24} width={30} height={16} rx={7} fill="#fff" opacity={0.75} />
    <path d="M18,-20 L26,10" stroke="#fff" strokeOpacity={0.6} strokeWidth={4} strokeLinecap="round" />
    <path d="M-30,22 Q0,32 30,22" stroke="#7FB6D6" strokeOpacity={0.35} strokeWidth={5} fill="none" strokeLinecap="round" />
  </g>
);
export const Ice: React.FC<{f: number}> = ({f}) => (
  <g>
    {ICE_T.map((t, i) => {
      const c = cube(f, i);
      if (!c) return null;
      return (
        <g key={i}>
          {c.v > 6 && [4, 3, 2, 1].map((m) => <CubeShape key={m} x={c.x} y={c.y - c.v * 0.42 * m} rot={c.rot} o={0.32 / m} />)}
          <CubeShape x={c.x} y={c.y} rot={c.rot} />
        </g>
      );
    })}
  </g>
);

/* ───── 濺起的水珠（冰塊落下時） ───── */
export const Splashes: React.FC<{f: number}> = ({f}) => {
  const out: React.ReactNode[] = [];
  const burst = (t: number, x0: number, n: number, seed: string, power: number) => {
    const d = f - t;
    if (d < 0 || d > 20) return;
    if (level(t) < 8) return; // 杯裡還沒有液體就不濺
    const sy0 = surfY(t);
    const col = topColor(t);
    for (let j = 0; j < n; j++) {
      const vx = rnd(`${seed}x${j}`) * 5 * power;
      const vy = -(7 + rnd01(`${seed}y${j}`) * 7) * power;
      const x = x0 + rnd(`${seed}o${j}`) * 30 + vx * d;
      const y = sy0 + vy * d + 0.75 * d * d;
      if (y > sy0 + 4) continue;
      const vyy = vy + 1.5 * d;
      const ang = (Math.atan2(vyy, vx) * 180) / Math.PI;
      const r = 4 + rnd01(`${seed}r${j}`) * 4;
      out.push(<ellipse key={`${seed}${j}`} cx={x} cy={y} rx={r * 1.8} ry={r} fill={col} stroke="#fff" strokeOpacity={0.6} strokeWidth={1.5} transform={`rotate(${ang} ${x} ${y})`} opacity={1 - d / 22} />);
    }
  };
  ICE_T.forEach((t, i) => {
    const c = cube(t + 4, i);
    if (c) burst(t + 4, c.x, 9, `ice${i}`, 1);
  });
  return <g>{out}</g>;
};

/* ───── 液柱 ───── */
export const Stream: React.FC<{f: number; w: number[]; x: number; y0: number; yEnd: number; color: string; width: number}> = ({f, w, x, y0, yEnd, color, width}) => {
  const [a, b] = w;
  if (f < a + 2 || f > b + 10) return null;
  const head = Math.min(yEnd, y0 + (f - (a + 2)) * 46);
  const tail = y0 + Math.max(0, f - (b - 4)) * 46;
  if (tail >= yEnd - 2) return null;
  const n = 10;
  const L: string[] = [], R: string[] = [];
  for (let j = 0; j <= n; j++) {
    const y = lerp(tail, head, j / n);
    const ww = width * (1 - 0.35 * ((y - y0) / Math.max(1, yEnd - y0)));
    const xx = x + 2.2 * Math.sin(y * 0.05 + f * 0.9) + (y - y0) * 0.03;
    L.push(`${(xx - ww / 2).toFixed(1)},${y.toFixed(1)}`);
    R.unshift(`${(xx + ww / 2).toFixed(1)},${y.toFixed(1)}`);
  }
  const hitting = head >= yEnd - 1;
  return (
    <g>
      <polygon points={[...L, ...R].join(' ')} fill={color} opacity={0.95} />
      <line x1={x - width * 0.15} y1={tail} x2={x - width * 0.1 + (head - y0) * 0.03} y2={head} stroke="#fff" strokeOpacity={0.55} strokeWidth={2.5} />
      {hitting && (
        <g>
          <ellipse cx={x + (yEnd - y0) * 0.03} cy={yEnd} rx={width * 2.2} ry={6} fill="#fff" opacity={0.55} />
          {[0, 1, 2, 3, 4].map((j) => {
            const ph = (f + j * 2.6) % 9;
            const sd = `${j}-${Math.floor((f + j * 2.6) / 9)}`;
            const vx = rnd(`sx${sd}`) * 4;
            const vy = -(4 + rnd01(`sy${sd}`) * 4);
            return <circle key={j} cx={x + vx * ph} cy={yEnd + vy * ph + 0.6 * ph * ph} r={3.5} fill={color} opacity={1 - ph / 9} />;
          })}
        </g>
      )}
    </g>
  );
};

/* ───── 瓶子們（本地座標：倒口在原點）───── */
const Fill: React.FC<{d: string; id: string; color: string; frac: number; top: number; bottom: number}> = ({d, id, color, frac, top, bottom}) => (
  <g>
    <defs>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
    </defs>
    <rect x={-300} y={lerp(bottom, top, frac)} width={600} height={600} fill={color} clipPath={`url(#${id})`} opacity={0.92} />
  </g>
);
const BOTTLE = 'M-6,0 L6,0 L10,40 L24,40 L24,70 L52,78 Q60,80 60,92 L60,240 Q60,256 44,256 L-44,256 Q-60,256 -60,240 L-60,92 Q-60,80 -52,78 L-24,70 L-24,40 L-10,40 Z';
const CARAFE = 'M0,0 L22,10 L150,10 L150,30 C176,60 182,130 176,200 L170,262 Q168,282 148,282 L32,282 Q12,282 10,262 L4,200 C-2,130 4,64 22,32 Z';
const SODA = 'M-14,0 L14,0 L14,90 C14,120 48,130 48,170 L48,330 Q48,344 34,344 L-34,344 Q-48,344 -48,330 L-48,170 C-48,130 -14,120 -14,90 Z';
const PITCHER = 'M0,0 Q20,-8 40,4 L130,4 L130,12 C142,60 142,112 126,150 Q120,166 100,166 L40,166 Q20,166 16,150 C2,112 6,50 22,24 Q10,12 0,0 Z';
/** 每種容器：倒口位置（世界座標）、傾斜角、液柱寬 */
export const VESSEL: Record<string, {x: number; y: number; angle: number; width: number; total: number}> = {
  bottle: {x: GX + 20, y: 210, angle: -150, width: 11, total: 0.9},
  carafe: {x: GX + 70, y: 186, angle: -100, width: 20, total: 0.95},
  soda: {x: GX + 60, y: 168, angle: -116, width: 17, total: 0.95},
  pitcher: {x: GX + 40, y: 300, angle: -84, width: 14, total: 0.95},
};
const VesselBody: React.FC<{s: Step; i: number; fr: number}> = ({s, i, fr}) => {
  const c = s.color;
  switch (s.vessel) {
    case 'bottle':
      return (
        <g>
          <path d={BOTTLE} fill="#FFF6E0" opacity={0.6} />
          <Fill d={BOTTLE} id={`mv${i}`} color={c} frac={0.25 + 0.6 * fr} top={70} bottom={256} />
          <rect x={-60} y={140} width={120} height={70} fill="#FFFFFF" opacity={0.92} />
          {[0, 1, 2].map((j) => <circle key={j} cx={-28 + j * 28} cy={175} r={11} fill={mix(c, '#ffffff', 0.25)} />)}
          <rect x={-24} y={40} width={48} height={32} rx={6} fill={mix(c, '#000000', 0.25)} />
          <path d={BOTTLE} fill="none" stroke={mix(c, '#5A4630', 0.6)} strokeWidth={4} strokeLinejoin="round" />
        </g>
      );
    case 'carafe':
      return (
        <g>
          <path d="M170,52 C222,62 230,170 182,196" fill="none" stroke="#9FB9C6" strokeWidth={14} strokeLinecap="round" />
          <path d={CARAFE} fill="#E9F5F9" opacity={0.65} />
          <Fill d={CARAFE} id={`mv${i}`} color={c} frac={0.1 + 0.78 * fr} top={30} bottom={282} />
          <path d={CARAFE} fill="none" stroke="#8FAFBF" strokeWidth={5} strokeLinejoin="round" />
          <path d="M30,60 L26,240" stroke="#fff" strokeOpacity={0.6} strokeWidth={10} strokeLinecap="round" />
        </g>
      );
    case 'soda':
      return (
        <g>
          <path d={SODA} fill="#BFE6CF" opacity={0.75} />
          <Fill d={SODA} id={`mv${i}`} color={mix(c, '#ffffff', 0.45)} frac={0.1 + 0.75 * fr} top={130} bottom={344} />
          <rect x={-48} y={200} width={96} height={80} fill="#fff" opacity={0.95} />
          <circle cx={0} cy={240} r={24} fill={c} />
          <circle cx={0} cy={240} r={24} fill="none" stroke={mix(c, '#000000', 0.2)} strokeWidth={5} />
          <path d={SODA} fill="none" stroke="#5FA27C" strokeWidth={5} strokeLinejoin="round" />
          <path d="M-30,150 L-30,320" stroke="#fff" strokeOpacity={0.6} strokeWidth={9} strokeLinecap="round" />
        </g>
      );
    default:
      return (
        <g>
          <path d="M128,30 C176,34 176,120 128,128" fill="none" stroke="#E9E2D6" strokeWidth={14} strokeLinecap="round" />
          <path d={PITCHER} fill="#FFFFFF" opacity={0.7} />
          <Fill d={PITCHER} id={`mv${i}`} color={c} frac={0.12 + 0.75 * fr} top={14} bottom={166} />
          <path d={PITCHER} fill="none" stroke="#B8AFA2" strokeWidth={5} strokeLinejoin="round" />
        </g>
      );
  }
};
export const Vessels: React.FC<{f: number}> = ({f}) => (
  <g>
    {STEPS.map((s, i) => {
      if (!isPour(s)) return null;
      const V = VESSEL[s.vessel] ?? VESSEL.pitcher;
      const v = vessel(f, s.pour as number[], V.angle);
      if (!v.on) return null;
      const fr = 1 - pp(f, s.pour) * V.total;
      return (
        <g key={i} transform={`translate(${V.x + v.dx} ${V.y + v.dy}) rotate(${v.rot})`}>
          <VesselBody s={s} i={i} fr={fr} />
        </g>
      );
    })}
  </g>
);
export const Streams: React.FC<{f: number}> = ({f}) => {
  const sy = surfY(f);
  return (
    <g>
      {STEPS.map((s, i) => {
        if (!isPour(s)) return null;
        const V = VESSEL[s.vessel] ?? VESSEL.pitcher;
        return (
          <Stream key={i} f={f} w={s.pour as number[]} x={V.x} y0={V.y} yEnd={s.kind === 'float' ? Math.min(sy, IN_BOT) - 26 : Math.min(sy, IN_BOT)}
            color={s.kind === 'soda' ? mix(s.color, '#ffffff', 0.6) : s.color} width={V.width} />
        );
      })}
    </g>
  );
};

/* ───── 吧叉匙（長柄攪拌匙） ───── */
const BarSpoon: React.FC<{x: number; y: number; rot: number; flip?: boolean}> = ({x, y, rot, flip}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <line x1={0} y1={-6} x2={0} y2={-600} stroke="#B9C2CA" strokeWidth={9} strokeLinecap="round" />
    <line x1={0} y1={-20} x2={0} y2={-590} stroke="#8D98A3" strokeWidth={9} strokeDasharray="6 10" />
    <circle cx={0} cy={-606} r={14} fill="#C9D1D8" stroke="#8D98A3" strokeWidth={3} />
    <ellipse cx={0} cy={flip ? -4 : 8} rx={24} ry={13} fill="#D3DAE0" stroke="#8D98A3" strokeWidth={3} />
    <ellipse cx={-6} cy={flip ? -8 : 4} rx={9} ry={4} fill="#fff" opacity={0.8} />
  </g>
);
/** 攪拌用（畫在液體後面，透過液體看得到） */
export const StirSpoon: React.FC<{f: number}> = ({f}) => (
  <g>
    {STIRS.map((s, i) => {
      const [a, b] = s.stir as number[];
      if (f < a - 12 || f > b + 14) return null;
      const inP = k(f, a - 12, a, (x) => 1 - (1 - x) ** 3);
      const outP = k(f, b - 2, b + 14, (x) => x * x);
      const ph = ((f - a) * Math.PI) / 10 + Math.PI / 2;
      const sw = k(f, a, a + 6) * (1 - k(f, b - 6, b));
      const x = GX + 72 * Math.sin(ph) * sw;
      const y = IN_BOT - 46 - (1 - inP) * 720 - outP * 760;
      return <BarSpoon key={i} x={x} y={y} rot={10 * Math.sin(ph) * sw - 4} />;
    })}
  </g>
);
/** 浮層：倒在湯匙背上（畫在液體前面） */
export const FloatSpoon: React.FC<{f: number}> = ({f}) => (
  <g>
    {STEPS.filter((s) => s.kind === 'float').map((s, i) => {
      const [a, b] = s.pour as number[];
      if (f < a - 22 || f > b + 20) return null;
      const inP = k(f, a - 22, a - 6, (x) => 1 - (1 - x) ** 3);
      const outP = k(f, b + 2, b + 20, (x) => x * x);
      const sy = Math.min(surfY(f), IN_BOT);
      return <BarSpoon key={i} x={GX + 44 - (1 - inP) * 300 - outP * 300} y={sy - 18 - (1 - inP) * 420 - outP * 460} rot={-34} flip />;
    })}
  </g>
);

/* ───── 裝飾：吸管、檸檬片、薄荷葉（garnish 層才有）───── */
const STRAW_A = {x: GX - 40, y: IN_BOT - 34};
const STRAW_B = {x: GX - 215, y: RIM_Y - 200};
export const Straw: React.FC<{f: number}> = ({f}) => {
  if (GARNISH?.straw == null) return null;
  const p = k(f, GARNISH.straw - 12, GARNISH.straw, (x) => 1 - (1 - x) ** 3);
  if (p <= 0) return null;
  const dx = STRAW_B.x - STRAW_A.x, dy = STRAW_B.y - STRAW_A.y;
  const off = (1 - p) * 1.1;
  const a = {x: STRAW_A.x + dx * off, y: STRAW_A.y + dy * off}, b = {x: STRAW_B.x + dx * off, y: STRAW_B.y + dy * off};
  return (
    <g>
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeWidth={20} strokeLinecap="round" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2FB3A8" strokeWidth={20} strokeDasharray="18 18" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#fff" strokeOpacity={0.5} strokeWidth={5} transform="translate(-5 0)" />
    </g>
  );
};
const LemonWheel: React.FC = () => (
  <g>
    <circle r={64} fill="#FFF3B0" stroke="#F2BE1A" strokeWidth={9} />
    <circle r={52} fill={C.lemon} />
    {Array.from({length: 9}, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return <line key={i} x1={0} y1={0} x2={Math.cos(a) * 52} y2={Math.sin(a) * 52} stroke="#FFF6C8" strokeWidth={5} />;
    })}
    <circle r={8} fill="#FFF6C8" />
    <ellipse cx={-22} cy={-26} rx={14} ry={7} fill="#fff" opacity={0.7} transform="rotate(-30 -22 -26)" />
  </g>
);
export const Lemon: React.FC<{f: number}> = ({f}) => {
  const t = GARNISH?.lemon;
  if (t == null || f < t - 12) return null;
  const tx = GX + 146, ty = RIM_Y + 6;
  const p = Math.min(1, (f - (t - 12)) / 12);
  const y = f < t ? lerp(-160, ty, p * p) : ty;
  const v = f < t ? (2 * p * (ty + 160)) / 12 : 0;
  const d = f - t;
  const sq = d >= 0 ? 0.12 * Math.exp(-d / 4) * Math.cos(d * 0.9) : 0;
  const rot = f < t ? -20 + (1 - p) * 180 : -20 + 4 * Math.exp(-d / 8) * Math.sin(d * 0.8);
  return (
    <g>
      {v > 6 && [3, 2, 1].map((m) => (
        <g key={m} transform={`translate(${tx} ${y - v * 0.45 * m}) rotate(${rot})`} opacity={0.3 / m}>
          <LemonWheel />
        </g>
      ))}
      <g transform={`translate(${tx} ${y}) rotate(${rot}) scale(${1 + sq} ${1 - sq})`}>
        <LemonWheel />
      </g>
    </g>
  );
};
const Leaf: React.FC<{rot: number; s?: number}> = ({rot, s = 1}) => (
  <g transform={`rotate(${rot}) scale(${s})`}>
    <path d="M0,0 C18,-20 50,-22 74,0 C50,22 18,20 0,0 Z" fill={C.mint} />
    <path d="M4,0 L66,0" stroke="#BDE7C8" strokeWidth={3} />
    {[18, 34, 50].map((x) => <path key={x} d={`M${x},0 L${x + 10},-9 M${x},0 L${x + 10},9`} stroke="#BDE7C8" strokeWidth={2} />)}
  </g>
);
export const Mint: React.FC<{f: number}> = ({f}) => (
  <g>
    {(GARNISH?.mint ?? []).map((t, i) => {
      if (f < t - 14) return null;
      const p = Math.min(1, (f - (t - 14)) / 14);
      const sy = Math.min(surfY(f), IN_BOT - 20);
      const tx = GX - 70 + i * 52, ty = sy - 30 - i * 10;
      const y = f < t ? lerp(-120, ty, 1 - (1 - p) ** 2) : ty + 3 * Math.sin((f - t) * 0.12 + i);
      const x = f < t ? tx + 40 * Math.sin(p * 5 + i) : tx;
      const r = f < t ? (1 - p) * 120 + (i ? 30 : -150) : i ? 30 : -150;
      return (
        <g key={i} transform={`translate(${x} ${y})`}>
          <Leaf rot={r} s={1.05} />
          <Leaf rot={r + 50} s={0.85} />
        </g>
      );
    })}
  </g>
);

/* ───── 牆上黑板（結尾） ───── */
export const BOARD = {x: 2450, y: 140, w: 960, h: 690};
export const Board: React.FC = () => (
  <g>
    <rect x={BOARD.x - 18} y={BOARD.y - 18} width={BOARD.w + 36} height={BOARD.h + 36} rx={18} fill="#C79A64" />
    <rect x={BOARD.x - 18} y={BOARD.y - 18} width={BOARD.w + 36} height={BOARD.h + 36} rx={18} fill="none" stroke="#A97C48" strokeWidth={4} />
    <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} rx={8} fill="#2F4A40" />
    <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h} rx={8} fill="#fff" opacity={0.04} />
    <ellipse cx={BOARD.x + BOARD.w * 0.3} cy={BOARD.y + BOARD.h * 0.35} rx={300} ry={160} fill="#fff" opacity={0.035} />
    <rect x={BOARD.x + 60} y={BOARD.y + BOARD.h + 18} width={200} height={14} rx={4} fill="#B58552" />
    <rect x={BOARD.x + 90} y={BOARD.y + BOARD.h + 8} width={60} height={12} rx={5} fill="#F4F1E6" />
  </g>
);

export {cube};
