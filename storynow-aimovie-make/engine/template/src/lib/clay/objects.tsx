/* 範本L 補上的通用黏土物件（2026-10-08）：書、鬧鐘、鉛筆、麥克風、標靶、對話框、清單夾板、筆電、手機、桌曆、
   放大鏡、警告牌、星星、愛心、齒輪、火箭、一疊紙、長條圖、黏土小人、投影幕、閃電、大叉叉、大勾勾。
   同 props.tsx：以「底部中央」為落地點，寬高 = 基準尺寸 × s；填色用 kit 的 G()／R() 漸層。 */
import React from 'react';
import {CREAM, G, GR, MU, NV, OR, R, RED, mix} from './kit';
import {S, Svg} from './props';

const HOLE = '#e9e5dc';
const GOLDC = '#e9b93a';

/** 直立的書（封面＋書頁側邊） */
export const BookC: React.FC<S & {c?: string}> = ({s = 1, c = 'b'}) => (
  <Svg w={200} h={230} s={s}>
    <rect x={44} y={16} width={140} height={208} rx={18} fill="#efe8da" />
    <path d="M 52 26 H 176 M 52 40 H 176 M 52 54 H 176" stroke="#d6cdbb" strokeWidth={3} />
    <rect x={16} y={10} width={150} height={214} rx={20} fill={G(c)} />
    <rect x={16} y={10} width={26} height={214} rx={12} fill="#000" opacity={0.12} />
    <rect x={58} y={58} width={88} height={40} rx={12} fill="#fff" opacity={0.85} />
    <rect x={68} y={120} width={70} height={10} rx={5} fill="#fff" opacity={0.5} />
    <ellipse cx={60} cy={34} rx={20} ry={8} fill="#fff" opacity={0.3} />
  </Svg>
);

/** 打開的書 */
export const OpenBook: React.FC<S> = ({s = 1}) => (
  <Svg w={280} h={170} s={s}>
    <path d="M 10 60 L 140 76 L 270 60 L 270 156 L 140 166 L 10 156 Z" fill={G('b')} />
    <path d="M 22 46 Q 80 28 138 56 L 138 152 Q 80 128 22 144 Z" fill={G('w')} />
    <path d="M 258 46 Q 200 28 142 56 L 142 152 Q 200 128 258 144 Z" fill="#f1ece2" />
    <path d="M 42 70 Q 80 60 122 76 M 42 94 Q 80 84 122 100 M 42 118 Q 80 108 122 124 M 158 76 Q 200 60 238 70 M 158 100 Q 200 84 238 94"
      stroke="#cfc6b6" strokeWidth={5} fill="none" strokeLinecap="round" />
  </Svg>
);

/** 鬧鐘（t＝秒數，指針慢慢走） */
export const Clock: React.FC<S & {t?: number}> = ({s = 1, t = 0}) => (
  <Svg w={220} h={230} s={s}>
    <circle cx={52} cy={44} r={30} fill={R('y')} />
    <circle cx={168} cy={44} r={30} fill={R('y')} />
    <path d="M 60 200 L 40 226 M 160 200 L 180 226" stroke={G('k')} strokeWidth={14} strokeLinecap="round" />
    <circle cx={110} cy={126} r={92} fill={R('o')} />
    <circle cx={110} cy={126} r={72} fill={R('w')} />
    {[0, 1, 2, 3].map((k) => <circle key={k} cx={110 + 58 * Math.cos(k * Math.PI / 2)} cy={126 + 58 * Math.sin(k * Math.PI / 2)} r={6} fill={NV} opacity={0.7} />)}
    <line x1={110} y1={126} x2={110 + 34 * Math.sin(1 + t * 0.4)} y2={126 - 34 * Math.cos(1 + t * 0.4)} stroke={NV} strokeWidth={10} strokeLinecap="round" />
    <line x1={110} y1={126} x2={110 + 52 * Math.sin(t * 2.4)} y2={126 - 52 * Math.cos(t * 2.4)} stroke={OR} strokeWidth={7} strokeLinecap="round" />
    <circle cx={110} cy={126} r={9} fill={R('b')} />
    <rect x={98} y={22} width={24} height={16} rx={6} fill={G('k')} />
  </Svg>
);

/** 鉛筆（斜放） */
export const Pencil: React.FC<S> = ({s = 1}) => (
  <Svg w={260} h={200} s={s}>
    <g transform="rotate(-32 130 100)">
      <rect x={40} y={78} width={160} height={44} rx={10} fill={G('y')} />
      <rect x={40} y={92} width={160} height={8} fill="#fff" opacity={0.3} />
      <rect x={20} y={78} width={26} height={44} rx={10} fill={G('p')} />
      <rect x={40} y={78} width={14} height={44} fill={G('gr')} />
      <path d="M 200 78 L 246 100 L 200 122 Z" fill="#efc795" />
      <path d="M 232 93 L 246 100 L 232 107 Z" fill="#3b2a22" />
    </g>
  </Svg>
);

/** 麥克風（含立架） */
export const Mic: React.FC<S> = ({s = 1}) => (
  <Svg w={160} h={280} s={s}>
    <ellipse cx={80} cy={266} rx={60} ry={12} fill={G('k')} />
    <rect x={74} y={150} width={12} height={116} rx={6} fill={G('gr')} />
    <path d="M 36 96 Q 36 160 80 160 Q 124 160 124 96" stroke={G('gr')} strokeWidth={10} fill="none" strokeLinecap="round" />
    <rect x={50} y={20} width={60} height={110} rx={30} fill={R('k')} />
    <path d="M 56 44 H 104 M 54 64 H 106 M 54 84 H 106 M 56 104 H 104" stroke="#6a6a78" strokeWidth={4} strokeLinecap="round" />
    <ellipse cx={66} cy={40} rx={7} ry={14} fill="#fff" opacity={0.3} />
  </Svg>
);

/** 標靶（插著一支箭） */
export const Target: React.FC<S> = ({s = 1}) => (
  <Svg w={240} h={250} s={s}>
    <path d="M 80 236 L 120 150 L 160 236" stroke={G('wd')} strokeWidth={14} strokeLinecap="round" fill="none" />
    <circle cx={120} cy={110} r={96} fill={R('r')} />
    <circle cx={120} cy={110} r={72} fill={R('w')} />
    <circle cx={120} cy={110} r={48} fill={R('r')} />
    <circle cx={120} cy={110} r={24} fill={R('w')} />
    <line x1={124} y1={106} x2={212} y2={30} stroke={G('br')} strokeWidth={9} strokeLinecap="round" />
    <path d="M 200 22 L 226 12 L 218 40 Z" fill={G('g')} />
    <circle cx={122} cy={108} r={7} fill={NV} />
  </Svg>
);

/** 對話框（三個點輪流跳） */
export const Chat: React.FC<S & {f?: number}> = ({s = 1, f = 0}) => (
  <Svg w={240} h={210} s={s}>
    <rect x={10} y={22} width={220} height={150} rx={60} fill={mix(CREAM, '#000000', 0.12)} />
    <rect x={10} y={14} width={220} height={150} rx={60} fill={G('w')} />
    <path d="M 60 150 L 50 196 L 104 156 Z" fill={G('w')} />
    {[0, 1, 2].map((k) => <circle key={k} cx={74 + k * 46} cy={88 - 6 * Math.max(0, Math.sin(f / 5 - k * 0.9))} r={15} fill={R(['o', 'y', 'g'][k])} />)}
  </Svg>
);

/** 清單夾板（三行打勾） */
export const Clipboard: React.FC<S> = ({s = 1}) => (
  <Svg w={210} h={260} s={s}>
    <rect x={10} y={20} width={190} height={236} rx={22} fill={G('wd')} />
    <rect x={26} y={44} width={158} height={198} rx={12} fill={G('w')} />
    <rect x={66} y={8} width={78} height={32} rx={12} fill={G('gr')} />
    {[0, 1, 2].map((k) => (
      <g key={k}>
        <rect x={42} y={70 + k * 56} width={30} height={30} rx={8} fill="#fff" stroke="#cfc6b6" strokeWidth={4} />
        <path d={`M 47 ${86 + k * 56} l 8 8 l 14 -18`} stroke={GR} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x={84} y={78 + k * 56} width={84} height={12} rx={6} fill="#cfc6b6" />
      </g>
    ))}
  </Svg>
);

/** 筆電 */
export const Laptop: React.FC<S> = ({s = 1}) => (
  <Svg w={290} h={200} s={s}>
    <rect x={40} y={10} width={210} height={150} rx={18} fill={G('k')} />
    <rect x={54} y={24} width={182} height={120} rx={8} fill={G('s')} />
    <rect x={74} y={46} width={80} height={14} rx={7} fill="#fff" opacity={0.7} />
    <rect x={74} y={72} width={130} height={10} rx={5} fill="#fff" opacity={0.45} />
    <rect x={74} y={92} width={110} height={10} rx={5} fill="#fff" opacity={0.45} />
    <path d="M 10 162 L 280 162 Q 286 186 262 190 L 28 190 Q 4 186 10 162 Z" fill={G('gr')} />
    <rect x={118} y={164} width={54} height={8} rx={4} fill="#8d877c" />
  </Svg>
);

/** 手機 */
export const Phone: React.FC<S> = ({s = 1}) => (
  <Svg w={140} h={240} s={s}>
    <rect x={10} y={8} width={120} height={226} rx={26} fill={G('k')} />
    <rect x={20} y={30} width={100} height={176} rx={10} fill={G('s')} />
    <rect x={32} y={48} width={76} height={34} rx={10} fill="#fff" opacity={0.75} />
    <rect x={32} y={94} width={56} height={34} rx={10} fill={MU} opacity={0.9} />
    <rect x={52} y={14} width={36} height={8} rx={4} fill="#55555f" />
    <circle cx={70} cy={220} r={7} fill="#55555f" />
  </Svg>
);

/** 桌曆 */
export const Calendar: React.FC<S> = ({s = 1}) => (
  <Svg w={220} h={220} s={s}>
    <rect x={10} y={30} width={200} height={182} rx={24} fill={G('w')} />
    <path d="M 10 54 Q 10 30 34 30 L 186 30 Q 210 30 210 54 L 210 80 L 10 80 Z" fill={G('r')} />
    <rect x={50} y={12} width={16} height={40} rx={8} fill={G('k')} />
    <rect x={154} y={12} width={16} height={40} rx={8} fill={G('k')} />
    {[0, 1, 2, 3].map((c) => [0, 1, 2].map((r) => (
      <rect key={`${c}${r}`} x={34 + c * 40} y={100 + r * 34} width={26} height={22} rx={6} fill={c === 2 && r === 1 ? OR : '#d8d1c3'} />
    )))}
  </Svg>
);

/** 放大鏡 */
export const Magnifier: React.FC<S> = ({s = 1}) => (
  <Svg w={230} h={230} s={s}>
    <line x1={140} y1={140} x2={206} y2={206} stroke={G('br')} strokeWidth={30} strokeLinecap="round" />
    <circle cx={92} cy={92} r={78} fill={R('gr')} />
    <circle cx={92} cy={92} r={60} fill="#cfe8f7" />
    <ellipse cx={70} cy={66} rx={18} ry={28} fill="#fff" opacity={0.6} transform="rotate(35 70 66)" />
  </Svg>
);

const TRI = 'M 120 12 Q 132 12 140 26 L 228 186 Q 236 204 214 206 L 26 206 Q 4 204 12 186 L 100 26 Q 108 12 120 12 Z';
/** 警告三角牌 */
export const Warning: React.FC<S> = ({s = 1}) => (
  <Svg w={240} h={220} s={s}>
    <path d={TRI} fill={mix(MU, '#000000', 0.25)} transform="translate(0 8)" />
    <path d={TRI} fill={G('y')} />
    <rect x={108} y={64} width={24} height={82} rx={12} fill={NV} />
    <circle cx={120} cy={172} r={14} fill={NV} />
  </Svg>
);

/** 星星 */
export const Star: React.FC<S> = ({s = 1}) => {
  const p = Array.from({length: 10}, (_, k) => {
    const r = k % 2 ? 42 : 88, a = -Math.PI / 2 + k * Math.PI / 5;
    return `${(100 + r * Math.cos(a)).toFixed(1)},${(104 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return (
    <Svg w={200} h={200} s={s}>
      <polygon points={p} fill={mix(GOLDC, '#000000', 0.25)} transform="translate(0 8)" strokeLinejoin="round" stroke={mix(GOLDC, '#000000', 0.25)} strokeWidth={16} />
      <polygon points={p} fill={G('gd')} strokeLinejoin="round" stroke={GOLDC} strokeWidth={16} />
      <ellipse cx={80} cy={70} rx={12} ry={20} fill="#fff" opacity={0.45} transform="rotate(30 80 70)" />
    </Svg>
  );
};

/** 愛心 */
export const Heart: React.FC<S> = ({s = 1}) => (
  <Svg w={200} h={190} s={s}>
    <path d="M 100 56 C 84 10 10 14 12 72 C 14 120 70 150 100 180 C 130 150 186 120 188 72 C 190 14 116 10 100 56 Z" fill={R('r')} />
    <ellipse cx={58} cy={60} rx={20} ry={12} fill="#fff" opacity={0.5} transform="rotate(-30 58 60)" />
  </Svg>
);

/** 齒輪（spin＝角度，可慢慢轉） */
export const Gear: React.FC<S & {spin?: number}> = ({s = 1, spin = 0}) => (
  <Svg w={210} h={210} s={s}>
    <g transform={`rotate(${spin} 105 105)`}>
      {Array.from({length: 8}, (_, k) => (
        <rect key={k} x={90} y={6} width={30} height={46} rx={10} fill={G('gr')} transform={`rotate(${k * 45} 105 105)`} />
      ))}
      <circle cx={105} cy={105} r={74} fill={R('gr')} />
      <circle cx={105} cy={105} r={30} fill={HOLE} />
    </g>
  </Svg>
);

/** 火箭 */
export const Rocket: React.FC<S & {f?: number}> = ({s = 1, f = 0}) => (
  <Svg w={170} h={280} s={s}>
    <path d={`M 62 226 Q 85 ${262 + 8 * Math.sin(f / 3)} 108 226 Z`} fill={G('y')} />
    <path d="M 40 170 L 10 226 L 56 210 Z" fill={G('r')} />
    <path d="M 130 170 L 160 226 L 114 210 Z" fill={G('r')} />
    <path d="M 85 8 Q 140 60 132 214 L 38 214 Q 30 60 85 8 Z" fill={G('w')} />
    <circle cx={85} cy={100} r={26} fill={R('s')} stroke="#d8d1c3" strokeWidth={8} />
    <path d="M 85 8 Q 108 28 118 52 L 52 52 Q 62 28 85 8 Z" fill={G('r')} />
  </Svg>
);

/** 一疊紙（文件、講稿） */
export const Papers: React.FC<S> = ({s = 1}) => (
  <Svg w={240} h={220} s={s}>
    {[[-10, 18], [6, 10], [-3, 0]].map(([r, dy], k) => (
      <g key={k} transform={`rotate(${r} 120 110) translate(0 ${dy})`}>
        <rect x={44} y={26} width={160} height={180} rx={14} fill={mix(CREAM, '#000000', 0.1 + k * 0.02)} />
        <rect x={40} y={20} width={160} height={180} rx={14} fill={G('w')} />
        {k === 2 && [0, 1, 2, 3].map((l) => <rect key={l} x={62} y={52 + l * 32} width={l === 0 ? 80 : 116} height={12} rx={6} fill={l === 0 ? OR : '#d4ccbd'} />)}
      </g>
    ))}
  </Svg>
);

/** 長條圖（三根黏土柱；p＝長高進度） */
export const Chart: React.FC<S & {p?: number}> = ({s = 1, p = 1}) => (
  <Svg w={250} h={210} s={s}>
    <rect x={10} y={186} width={230} height={20} rx={10} fill={G('gr')} />
    {([[30, 70, 'b'], [100, 120, 'y'], [170, 170, 'o']] as [number, number, string][]).map(([x, h, c], k) => (
      <rect key={k} x={x} y={186 - h * p} width={52} height={h * p} rx={14} fill={G(c)} />
    ))}
  </Svg>
);

/** 黏土小人（觀眾、聽眾） */
export const Person: React.FC<S & {c?: string}> = ({s = 1, c = 's'}) => (
  <Svg w={150} h={230} s={s}>
    <path d="M 20 226 Q 20 120 75 120 Q 130 120 130 226 Z" fill={G(c)} />
    <circle cx={75} cy={70} r={50} fill={R('mz')} />
    <circle cx={58} cy={70} r={6} fill="#2a2230" />
    <circle cx={92} cy={70} r={6} fill="#2a2230" />
    <path d="M 62 90 Q 75 100 88 90" stroke="#5a2a2a" strokeWidth={5} fill="none" strokeLinecap="round" />
    <ellipse cx={46} cy={86} rx={8} ry={5} fill="#f28a96" opacity={0.7} />
    <ellipse cx={104} cy={86} rx={8} ry={5} fill="#f28a96" opacity={0.7} />
    <path d="M 26 62 Q 30 14 75 18 Q 120 14 124 62 Q 100 40 75 44 Q 50 40 26 62 Z" fill={G('br')} />
  </Svg>
);

/** 投影幕（三腳架＋圖表） */
export const Screen: React.FC<S> = ({s = 1}) => (
  <Svg w={280} h={280} s={s}>
    <path d="M 140 200 L 80 274 M 140 200 L 200 274 M 140 200 L 140 274" stroke={G('k')} strokeWidth={10} strokeLinecap="round" />
    <rect x={14} y={14} width={252} height={186} rx={18} fill={G('w')} stroke="#d4ccbd" strokeWidth={6} />
    <rect x={4} y={4} width={272} height={20} rx={10} fill={G('k')} />
    <rect x={44} y={54} width={110} height={16} rx={8} fill={NV} />
    <rect x={44} y={86} width={80} height={12} rx={6} fill="#d4ccbd" />
    {[[170, 70], [204, 100], [238, 40]].map(([x, h], k) => <rect key={k} x={x - 14} y={176 - h} width={24} height={h} rx={8} fill={[OR, MU, GR][k]} />)}
  </Svg>
);

const BOLT = 'M 96 8 L 22 136 L 76 136 L 56 232 L 140 92 L 86 92 L 112 8 Z';
/** 閃電 */
export const Bolt: React.FC<S> = ({s = 1}) => (
  <Svg w={160} h={240} s={s}>
    <path d={BOLT} fill={mix(MU, '#000000', 0.25)} transform="translate(0 8)" strokeLinejoin="round" stroke={mix(MU, '#000000', 0.25)} strokeWidth={10} />
    <path d={BOLT} fill={G('y')} strokeLinejoin="round" stroke={MU} strokeWidth={10} />
  </Svg>
);

/** 大叉叉（壞做法） */
export const Cross: React.FC<S> = ({s = 1}) => (
  <Svg w={160} h={160} s={s}>
    <path d="M 34 34 L 126 126 M 126 34 L 34 126" stroke={mix(RED, '#000000', 0.3)} strokeWidth={34} strokeLinecap="round" transform="translate(0 8)" />
    <path d="M 34 34 L 126 126 M 126 34 L 34 126" stroke={RED} strokeWidth={34} strokeLinecap="round" />
    <path d="M 40 36 L 70 66" stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.35} />
  </Svg>
);

/** 大勾勾（好做法） */
export const Tick: React.FC<S> = ({s = 1}) => (
  <Svg w={180} h={160} s={s}>
    <path d="M 26 84 L 70 128 L 154 30" stroke={mix(GR, '#000000', 0.3)} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(0 8)" />
    <path d="M 26 84 L 70 128 L 154 30" stroke={GR} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M 32 82 L 56 106" stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.35} />
  </Svg>
);
