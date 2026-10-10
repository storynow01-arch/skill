/* 範本廣G：跨頁場景（水彩底圖＋SVG 物件＋蠟筆字）。第 0 頁房間角落、第 1～N 頁每頁一道門、最後一頁塗鴉牆。
   畫面上的字全部讀 timeline.json（storyboard）；版面位置是跨頁座標（1680×900）。 */
import React from 'react';
import {Img} from 'remotion';
import {T, NG, BGS, GRAIN, kk, mix, OUT, decay, wp, rnd, textW, look} from './core';
import {RED} from './cert';
import {FONT} from './fonts';

const INK = '#6b4a3a';
const D = T.d;
const crayonMask: React.CSSProperties = {
  WebkitMaskImage: `url(${GRAIN})`, maskImage: `url(${GRAIN})`, WebkitMaskSize: '256px 256px', maskSize: '256px 256px',
};

/** 蠟筆字：一個字一個字寫出來 */
export const Crayon: React.FC<{
  text: string; x: number; y: number; size: number; color: string; p: number; align?: 'left' | 'center' | 'right'; seed?: string; style?: React.CSSProperties;
}> = ({text, x, y, size, color, p, align = 'left', seed = 'c', style}) => {
  if (!text) return null;
  const chars = Array.from(text);
  const n = chars.length;
  const tx = align === 'center' ? 'translateX(-50%)' : align === 'right' ? 'translateX(-100%)' : undefined;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: tx, whiteSpace: 'nowrap',
      fontFamily: FONT, fontSize: size, lineHeight: 1.15, color, ...crayonMask, ...style}}>
      {chars.map((c, i) => {
        const q = Math.max(0, Math.min(1, p * n - i));
        const e = OUT(q);
        return (
          <span key={i} style={{display: 'inline-block', opacity: Math.min(1, q * 1.6),
            transform: `translateY(${(1 - e) * size * 0.25 + rnd(seed + i) * size * 0.03}px) rotate(${rnd(seed + 'r' + i) * 3 + (1 - e) * -12}deg) scale(${mix(1.35, 1, e)})`}}>
            {c === ' ' ? ' ' : c}
          </span>
        );
      })}
    </div>
  );
};

/* ───── 小物件 ───── */
export const starPath = (cx: number, cy: number, R: number, r: number) =>
  'M' + Array.from({length: 10}, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }).join('L') + 'Z';
export const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx},${cy + s * 0.9} C${cx - s * 1.4},${cy} ${cx - s * 0.9},${cy - s * 1.1} ${cx},${cy - s * 0.35} C${cx + s * 0.9},${cy - s * 1.1} ${cx + s * 1.4},${cy} ${cx},${cy + s * 0.9} Z`;

const Flower: React.FC<{x: number; y: number; c: string; s?: number}> = ({x, y, c, s = 1}) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path d="M0,0 Q4,30 0,56" stroke="#7cbf86" strokeWidth={4} fill="none" />
    {Array.from({length: 5}, (_, i) => (
      <circle key={i} cx={Math.cos((i / 5) * Math.PI * 2) * 11} cy={Math.sin((i / 5) * Math.PI * 2) * 11} r={10} fill={c} />
    ))}
    <circle r={7} fill="#ffd36e" />
  </g>
);

/** 房間角落（通用）：矮書櫃＋書＋盆栽、地上的坐墊、檯燈。原作是幼兒園的積木與球，這裡換成任何主題都能用的房間 */
const Corner: React.FC = () => (
  <g>
    {/* 矮書櫃 */}
    <rect x={120} y={560} width={420} height={230} rx={12} fill="#f3d3a0" stroke={INK} strokeWidth={3} strokeOpacity={0.55} />
    <rect x={138} y={578} width={384} height={92} rx={6} fill="#e9c08a" />
    <rect x={138} y={682} width={384} height={92} rx={6} fill="#e9c08a" />
    {[['#f6a7ba', 34, 80], ['#9fd8c0', 28, 72], ['#a9d4f0', 38, 86], ['#ffd36e', 26, 70], ['#c9b6ec', 32, 80], ['#f29bb0', 30, 76]].map(([c, w, h], i) => (
      <rect key={i} x={152 + i * 40} y={670 - (h as number)} width={w as number} height={h as number} rx={4} fill={c as string} stroke={INK} strokeWidth={2} strokeOpacity={0.35} />
    ))}
    <g transform="rotate(-14,420,670)">
      <rect x={404} y={598} width={30} height={72} rx={4} fill="#bfe6cf" stroke={INK} strokeWidth={2} strokeOpacity={0.35} />
    </g>
    {[['#a9d4f0', 120], ['#f6a7ba', 110], ['#ffd36e', 128]].map(([c, w], i) => (
      <rect key={'s' + i} x={170 + i * 6} y={758 - i * 22} width={w as number} height={20} rx={4} fill={c as string} stroke={INK} strokeWidth={2} strokeOpacity={0.35} />
    ))}
    <path d={heartPath(450, 726, 18)} fill="#f29bb0" opacity={0.85} />
    {/* 書櫃上的盆栽 */}
    <path d="M196,560 L210,500 L270,500 L284,560 Z" fill="#e89a7a" stroke={INK} strokeWidth={3} strokeOpacity={0.5} />
    {[[-30, -60, -25], [0, -78, 0], [28, -58, 28], [-14, -40, -50], [16, -42, 50]].map(([dx, dy, r], i) => (
      <ellipse key={i} cx={240 + (dx as number)} cy={500 + (dy as number)} rx={14} ry={32} fill={i % 2 ? '#7cbf86' : '#93d3a0'}
        transform={`rotate(${r},${240 + (dx as number)},${500 + (dy as number)})`} />
    ))}
    {/* 書櫃上的檯燈 */}
    <path d="M430,560 L430,470" stroke={INK} strokeWidth={5} strokeOpacity={0.6} />
    <ellipse cx={430} cy={560} rx={34} ry={8} fill="#d9a46b" />
    <path d="M384,476 L404,420 L456,420 L476,476 Z" fill="#fff1a0" stroke={INK} strokeWidth={3} strokeOpacity={0.5} />
    {/* 地上的坐墊 */}
    <g transform="translate(800,772)">
      <ellipse rx={92} ry={30} fill="#f6b3c3" stroke={INK} strokeWidth={3} strokeOpacity={0.45} />
      <ellipse cy={-8} rx={74} ry={20} fill="#f9c9d4" />
      <circle cy={-8} r={6} fill="#e9849b" />
    </g>
  </g>
);

/** 門：拱門＋兩片門板（open 0→1 打開） */
const GateArt: React.FC<{i: number; open: number; glow: number}> = ({i, open, glow}) => {
  const {x, ground, h, w, frame, door} = look(i);
  const top = ground - h;
  const r = w / 2;
  const inner = w - 56;
  const dh = h - 40;
  const pw = inner / 2;
  return (
    <g transform={`translate(${x},0)`}>
      <ellipse cx={0} cy={ground + 6} rx={w * 0.75} ry={18} fill="#6b8a5a" opacity={0.15} />
      {/* 門後的光 */}
      <path d={`M${-inner / 2},${ground} L${-inner / 2},${top + r} A${inner / 2},${inner / 2} 0 0 1 ${inner / 2},${top + r} L${inner / 2},${ground} Z`} fill="#fffbe0" />
      <circle cx={0} cy={top + h * 0.55} r={inner * 0.9} fill="#fff6c0" opacity={0.6 * glow} />
      {/* 門板 */}
      <g transform={`translate(${-inner / 2},0) scale(${1 - 0.86 * open},1)`}>
        <path d={`M0,${ground} L0,${top + r} A${inner / 2},${inner / 2} 0 0 1 ${pw},${top + 28} L${pw},${ground} Z`} fill={door} stroke={INK} strokeWidth={3} strokeOpacity={0.5} />
        <circle cx={pw - 16} cy={ground - dh * 0.42} r={6} fill="#ffd36e" />
      </g>
      <g transform={`translate(${inner / 2},0) scale(${-(1 - 0.86 * open)},1)`}>
        <path d={`M0,${ground} L0,${top + r} A${inner / 2},${inner / 2} 0 0 1 ${pw},${top + 28} L${pw},${ground} Z`} fill={door} stroke={INK} strokeWidth={3} strokeOpacity={0.5} />
        <circle cx={pw - 16} cy={ground - dh * 0.42} r={6} fill="#ffd36e" />
      </g>
      {/* 拱框 */}
      <path d={`M${-r},${ground} L${-r},${top + r} A${r},${r} 0 0 1 ${r},${top + r} L${r},${ground} L${inner / 2},${ground} L${inner / 2},${top + r} A${inner / 2},${inner / 2} 0 0 0 ${-inner / 2},${top + r} L${-inner / 2},${ground} Z`}
        fill={frame} stroke={INK} strokeWidth={3.5} strokeOpacity={0.6} strokeLinejoin="round" />
      {/* 藤蔓小花 */}
      {Array.from({length: 7}, (_, k) => {
        const a = Math.PI + (k / 6) * Math.PI;
        return <circle key={k} cx={Math.cos(a) * (r - 14)} cy={top + r + Math.sin(a) * (r - 14)} r={9} fill={['#f6a7ba', '#fff', '#ffd36e'][k % 3]} stroke={INK} strokeOpacity={0.3} strokeWidth={2} />;
      })}
      {/* 門牌（第幾道門） */}
      <g transform={`translate(0,${top - 30})`}>
        <path d="M0,0 L0,34" stroke={INK} strokeWidth={3} opacity={0.6} />
        <circle r={30} fill="#fff" stroke={INK} strokeWidth={3} strokeOpacity={0.6} />
        <text y={12} textAnchor="middle" fontFamily={FONT} fontSize={36} fill={INK}>{i + 1}</text>
      </g>
    </g>
  );
};

const gateOpen = (f: number, i: number) => kk(f, T.gateOpen[i], T.gateOpen[i] + 22, OUT);
const gateGlow = (f: number, i: number) => kk(f, T.gateOpen[i], T.gateOpen[i] + 22) * (0.6 + 0.4 * decay(f, T.gatePass[i], 12));

/** 左邊的小屋（有 sign 時出現；招牌上的字讀 storyboard） */
const House: React.FC = () => (
  <g>
    <rect x={110} y={500} width={520} height={290} rx={10} fill="#ffe1cf" stroke={INK} strokeWidth={3} strokeOpacity={0.5} />
    <path d="M80,512 L370,360 L660,512 Z" fill="#9fd8c0" stroke={INK} strokeWidth={3} strokeOpacity={0.5} strokeLinejoin="round" />
    <rect x={160} y={600} width={110} height={90} rx={8} fill="#a9d4f0" stroke="#fff" strokeWidth={6} />
    <rect x={470} y={600} width={110} height={90} rx={8} fill="#a9d4f0" stroke="#fff" strokeWidth={6} />
    <path d="M320,790 L320,640 Q370,600 420,640 L420,790 Z" fill="#f6a7ba" stroke={INK} strokeWidth={3} strokeOpacity={0.5} />
    <rect x={70} y={420} width={600} height={78} rx={14} fill="#fffaf0" stroke="#e3b673" strokeWidth={4} />
    <path d={heartPath(370, 405, 18)} fill="#f29bb0" />
    <Flower x={150} y={760} c="#ffd36e" s={0.7} /> <Flower x={600} y={760} c="#f6a7ba" s={0.7} />
  </g>
);

/* ───── 場景 ───── */
const SOpen: React.FC<{f: number}> = ({f}) => {
  const curtain = Math.sin(Math.PI * kk(f, T.toWindow[0], T.turns[0] + 20)) * 10;
  const side = D.side.filter(Boolean);
  return (
    <>
      <svg width={1680} height={900} style={{position: 'absolute', left: 0, top: 0}}>
        {/* 窗戶 */}
        <rect x={1130} y={250} width={370} height={310} fill="none" stroke="#fff" strokeWidth={18} />
        <rect x={1120} y={240} width={390} height={330} fill="none" stroke={INK} strokeWidth={3} opacity={0.5} />
        <path d="M1315,250 L1315,560 M1130,405 L1500,405" stroke="#fff" strokeWidth={10} />
        <path d={`M1090,220 Q${1150 + curtain},380 1100,600 L1170,600 Q${1190 + curtain},400 1170,220 Z`} fill="#f6b3c3" opacity={0.85} />
        <path d={`M1540,220 Q${1480 - curtain},380 1530,600 L1460,600 Q${1440 - curtain},400 1460,220 Z`} fill="#f6b3c3" opacity={0.85} />
        <rect x={1080} y={205} width={470} height={18} rx={9} fill="#d9a46b" />
        <Corner />
      </svg>
      <Crayon text={D.kicker} x={110} y={86} size={50} color="#e9849b" p={wp(f, 'kicker')} seed="a" />
      <Crayon text={D.title} x={100} y={160} size={92} color={INK} p={wp(f, 'title')} seed="b" />
      {side[0] && <Crayon text={side[0]} x={890} y={52} size={56} color="#4f95c4" p={wp(f, 'side0')} seed="c" />}
      {side[1] && <Crayon text={side[1]} x={1010} y={118} size={60} color="#e07b6a" p={wp(f, 'side1')} seed="d" />}
    </>
  );
};

const FLOWERS: [number, number, string, number][][] = [
  [[790, 690, '#f6a7ba', 1], [1120, 700, '#a9d4f0', 0.9], [260, 720, '#ffd36e', 0.8], [1500, 700, '#f6a7ba', 1.1]],
  [[800, 710, '#ffd36e', 1], [1130, 720, '#fff', 0.9], [360, 760, '#a9d4f0', 0.9]],
  [[830, 700, '#f6a7ba', 1.1], [1180, 710, '#fff', 1], [1520, 740, '#ffd36e', 0.8]],
  [[810, 700, '#a9d4f0', 1], [1150, 705, '#f6a7ba', 0.9], [300, 740, '#fff', 0.9], [1480, 720, '#ffd36e', 1]],
];

/** 第 i 道門的跨頁 */
const SGate: React.FC<{f: number; i: number}> = ({f, i}) => {
  const g = D.gates[i];
  const L = look(i);
  // 等式：eq 各段＋蓋章後補上「＝big」，整條置中
  const eqParts = g.eq.map((x, j) => (j ? '＝' : '') + x);
  const eqTail = g.eq.length && g.big ? '＝' + g.big : '';
  const eqW = eqParts.reduce((a, s) => a + textW(s, 64), 0) + textW(eqTail, 64);
  // 大字：從 x=1120 起寫，太長就整組往左移，右邊留 50
  const bigW = Math.max(textW(g.big, 76), textW(g.label, 46));
  const bx = Math.min(1120, 1630 - bigW);
  return (
    <>
      <svg width={1680} height={900} style={{position: 'absolute', left: 0, top: 0}}>
        {g.sign && <House />}
        <GateArt i={i} open={gateOpen(f, i)} glow={gateGlow(f, i)} />
        {FLOWERS[i % 4]
          .filter(([x]) => !g.sign || x > 700)
          .filter(([x]) => Math.abs(x - L.x) > L.w / 2 + 30)
          .map(([x, y, c, s], k) => <Flower key={k} x={x} y={y} c={c} s={s} />)}
      </svg>
      {g.say && <Crayon text={g.say} x={100} y={110} size={62} color="#4f95c4" p={wp(f, `g${i}say`)} seed={`e${i}`} />}
      {g.sign && <Crayon text={g.sign} x={370} y={459 - g.signsize * 0.62} size={g.signsize} color="#4f8f6a" p={wp(f, `g${i}sign`)} align="center" seed={`k${i}`} />}
      {g.eq.length > 0 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center'}}>
          <div style={{position: 'relative', width: eqW, height: 80}}>
            {eqParts.map((s, j) => {
              const x0 = eqParts.slice(0, j).reduce((a, q) => a + textW(q, 64), 0);
              return <Crayon key={j} text={s} x={x0} y={0} size={64} color={j ? '#c0574a' : INK} p={wp(f, `g${i}eq${j}`)} seed={`h${i}${j}`} />;
            })}
            {eqTail && <Crayon text={eqTail} x={eqW - textW(eqTail, 64)} y={0} size={64} color={RED} p={wp(f, `g${i}eqz`)} seed={`j${i}`} />}
          </div>
        </div>
      )}
      {!g.eq.length && g.big && (
        <>
          {g.label && <Crayon text={g.label} x={bx} y={74} size={46} color="#6aa56a" p={Math.min(1, wp(f, `g${i}big`) * 1.6)} seed={`f${i}`} />}
          <Crayon text={g.big} x={bx} y={136} size={76} color={RED} p={wp(f, `g${i}big`)} seed={`g${i}`} />
        </>
      )}
    </>
  );
};

/** 最後一頁：塗鴉牆 */
const PADS = [['#e9849b', '#fde3ea'], ['#e89a4a', '#fff1cf'], ['#5fa86f', '#e3f5e6'], ['#4f95c4', '#e3f0fb'], ['#9a6fc4', '#efe6fb']];
const DOODLE = ['sun', 'flower', 'heart', 'star'] as const;
const TAPES = ['#f9d77e', '#bfe6cf', '#f6b3c3', '#bcdcf5', '#c9b6ec'];
const Tape: React.FC<{x: number; y: number; r: number; c?: string}> = ({x, y, r, c = '#f9d77e'}) => (
  <rect x={x - 38} y={y - 13} width={76} height={26} fill={c} opacity={0.75} transform={`rotate(${r},${x},${y})`} />
);
const W = D.wall;
const cardAnim = (f: number, i: number, x: number) => {
  const at = T.draws[Math.min(i, T.draws.length - 1)];
  const p = kk(f, at - 14, at, OUT);
  const left = x < 840;
  return {
    p,
    dx: (left ? -1 : 1) * 260 * (1 - p),
    dy: 120 * (1 - p),
    rot: rnd('dr' + i) * 5 + (1 - p) * (left ? -30 : 30),
    sc: mix(1.5, 1, p) * (1 + 0.06 * decay(f, at, 4)),
  };
};

const SWall: React.FC<{f: number}> = ({f}) => {
  const banner = W.mode === 'banner';
  const bw = textW(W.name, W.bannerSize) + 120;
  const ba = banner ? cardAnim(f, 0, 600) : null;
  return (
    <>
      <svg width={1680} height={900} style={{position: 'absolute', left: 0, top: 0}}>
        {/* 牆上原本就有的塗鴉 */}
        <g transform="rotate(-5,240,250)">
          <rect x={130} y={150} width={220} height={190} fill="#fff" stroke="#f0cf95" strokeWidth={3} />
          <path d="M170,300 L170,240 L240,190 L310,240 L310,300 Z" fill="#ffd36e" stroke="#e89a4a" strokeWidth={4} />
          <rect x={225} y={260} width={30} height={40} fill="#f29bb0" />
          <Tape x={240} y={150} r={4} />
        </g>
        <g transform="rotate(4,1440,250)">
          <rect x={1330} y={150} width={220} height={190} fill="#fff" stroke="#f0cf95" strokeWidth={3} />
          <circle cx={1400} cy={220} r={34} fill="#ffd36e" />
          {Array.from({length: 8}, (_, i) => (
            <path key={i} d={`M${1400 + Math.cos(i * 0.785) * 44},${220 + Math.sin(i * 0.785) * 44} L${1400 + Math.cos(i * 0.785) * 60},${220 + Math.sin(i * 0.785) * 60}`} stroke="#f2b84b" strokeWidth={5} strokeLinecap="round" />
          ))}
          <path d="M1350,320 Q1440,260 1530,320" stroke="#7cbf86" strokeWidth={8} fill="none" />
          <Tape x={1440} y={150} r={-6} c="#bfe6cf" />
        </g>
        <g transform="rotate(3,230,620)">
          <rect x={130} y={530} width={200} height={180} fill="#fff" stroke="#f0cf95" strokeWidth={3} />
          <Flower x={190} y={600} c="#f6a7ba" /> <Flower x={270} y={610} c="#a9d4f0" />
          <Tape x={230} y={530} r={-3} c="#c9b6ec" />
        </g>
        <g transform="rotate(-4,1450,620)">
          <rect x={1350} y={530} width={200} height={180} fill="#fff" stroke="#f0cf95" strokeWidth={3} />
          {['#f7b9c4', '#fbe2a0', '#c5ecc0', '#bcdcf5'].map((c, k) => (
            <path key={k} d={`M${1380 + k * 10},680 A${70 - k * 10},${70 - k * 10} 0 0 1 ${1520 - k * 10},680`} stroke={c} strokeWidth={10} fill="none" />
          ))}
          <Tape x={1450} y={530} r={5} />
        </g>
        {/* 名稱：一格一字的塗鴉卡 */}
        {W.cards.map((d, i) => {
          const a = cardAnim(f, i, d.x);
          if (a.p <= 0) return null;
          const [, pad] = PADS[i % PADS.length];
          const dd = DOODLE[i % 4];
          return (
            <g key={i} transform={`translate(${d.x + a.dx},${d.y + a.dy}) rotate(${a.rot}) scale(${a.sc * d.s})`} opacity={Math.min(1, a.p * 2)}>
              <rect x={-104} y={-104} width={208} height={208} fill="#fff" stroke="#f0cf95" strokeWidth={3} />
              <rect x={-94} y={-94} width={188} height={188} fill={pad} />
              {dd === 'sun' && <circle cx={58} cy={-58} r={22} fill="#ffd36e" />}
              {dd === 'flower' && <Flower x={-62} y={-66} c="#f6a7ba" s={0.6} />}
              {dd === 'heart' && <path d={heartPath(60, -60, 18)} fill="#f29bb0" />}
              {dd === 'star' && <path d={starPath(-60, -60, 22, 10)} fill="#ffd36e" />}
              <Tape x={0} y={-104} r={rnd('tp' + i) * 8} c={TAPES[i % TAPES.length]} />
            </g>
          );
        })}
        {/* 名稱太長：一張橫幅 */}
        {ba && ba.p > 0 && (
          <g transform={`translate(${840 + ba.dx * 0.3},${640 + ba.dy}) rotate(${-2 + (1 - ba.p) * -10}) scale(${ba.sc})`} opacity={Math.min(1, ba.p * 2)}>
            <path d={`M${-bw / 2},-80 L${bw / 2},-80 L${bw / 2 - 26},0 L${bw / 2},80 L${-bw / 2},80 L${-bw / 2 + 26},0 Z`} fill="#fff1cf" stroke="#f0cf95" strokeWidth={4} />
            <Tape x={-bw / 2 + 60} y={-80} r={-6} c="#f6b3c3" />
            <Tape x={bw / 2 - 60} y={-80} r={5} c="#bfe6cf" />
          </g>
        )}
      </svg>
      {W.cards.map((d, i) => {
        const a = cardAnim(f, i, d.x);
        if (a.p <= 0) return null;
        return (
          <div key={i} style={{position: 'absolute', left: d.x + a.dx - 100, top: d.y + a.dy - 100, width: 200, height: 200, opacity: Math.min(1, a.p * 2),
            transform: `rotate(${a.rot}deg) scale(${a.sc * d.s})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, fontSize: 140, color: PADS[i % PADS.length][0], lineHeight: 1, paddingTop: 16, ...crayonMask}}>
            {d.ch}
          </div>
        );
      })}
      {ba && ba.p > 0 && (
        <div style={{position: 'absolute', left: 840 + ba.dx * 0.3 - bw / 2, top: 640 + ba.dy - 80, width: bw, height: 160, opacity: Math.min(1, ba.p * 2),
          transform: `rotate(${-2 + (1 - ba.p) * -10}deg) scale(${ba.sc})`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: W.bannerSize, color: '#e9849b', lineHeight: 1, whiteSpace: 'nowrap', ...crayonMask}}>
          {W.name}
        </div>
      )}
      <Crayon text={W.slogan} x={840} y={44} size={W.sloganSize} color="#e07b6a" p={wp(f, 'slogan')} align="center" seed="n" />
      <Crayon text={W.url} x={840} y={W.mode === 'row' ? 738 : 44 + W.sloganSize * 1.2} size={W.urlSize} color={INK} p={wp(f, 'url')} align="center" seed="o" />
    </>
  );
};

/** 第 i 個跨頁（水彩底＋物件＋字） */
export const Spread: React.FC<{i: number; f: number}> = ({i, f}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1680, height: 900}}>
    <Img src={BGS[i]} style={{position: 'absolute', left: 0, top: 0, width: 1680, height: 900}} />
    {i === 0 ? <SOpen f={f} /> : i <= NG ? <SGate f={f} i={i - 1} /> : <SWall f={f} />}
  </div>
);
