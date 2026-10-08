/* 範本I 漫畫風符號物件（viewBox 0 0 100 100，粗黑線＋白／黃／網點）。
   <ComicIcon icon=…> 找圖順序：①這裡的漫畫圖示（名稱或 emoji）②lib/sketches.ts 的線稿（改成粗黑線＋白底）③圓框＋emoji／文字。
   一律不會出現空白或「?」：沒給 icon 時畫星星。 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {sketchFor} from '../sketches';
import {EN, INK, TC, Y, pop} from './kit';

const S = {stroke: INK, strokeWidth: 5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
const W = {...S, fill: '#fff'};
const YF = {...S, fill: Y};
const HT = {...S, fill: 'url(#cmHtD)'};
const N = {...S, fill: 'none'};

export const COMIC_ICONS: Record<string, React.ReactNode> = {
  trophy: (<g>
    <path d="M28 22 Q12 22 14 36 Q16 48 32 48" {...N} /><path d="M72 22 Q88 22 86 36 Q84 48 68 48" {...N} />
    <path d="M28 14 H72 V38 Q72 62 50 64 Q28 62 28 38 Z" {...YF} />
    <path d="M50 24 l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1 Z" fill="#fff" stroke={INK} strokeWidth={3} />
    <rect x={44} y={64} width={12} height={14} {...W} /><rect x={28} y={78} width={44} height={12} fill={INK} />
  </g>),
  plane: (<g>
    <path d="M44 48 L30 18 L42 18 L64 46 Z" {...W} /><path d="M50 60 L46 86 L58 84 L68 56 Z" {...W} />
    <path d="M14 54 L8 38 L18 38 L28 50 Z" {...W} />
    <path d="M8 58 L80 40 Q96 36 93 47 Q90 55 78 57 L20 68 Q8 68 8 58 Z" {...W} />
    <circle cx={60} cy={50} r={3} fill={INK} /><circle cx={70} cy={48} r={3} fill={INK} /><circle cx={50} cy={53} r={3} fill={INK} />
  </g>),
  cert: (<g>
    <rect x={8} y={16} width={84} height={62} {...W} />
    <path d="M20 30 H80 M20 42 H70 M20 54 H56" stroke="#999" strokeWidth={4} strokeLinecap="round" />
    <path d="M64 76 L60 96 L70 90 L78 98 L80 78 Z" {...W} />
    <circle cx={72} cy={70} r={13} {...YF} /><circle cx={72} cy={70} r={6} fill="none" stroke={INK} strokeWidth={3} />
  </g>),
  paw: (<g fill={INK}>
    <ellipse cx={50} cy={64} rx={20} ry={17} /><circle cx={26} cy={42} r={9} /><circle cx={41} cy={27} r={9} />
    <circle cx={59} cy={27} r={9} /><circle cx={74} cy={42} r={9} />
  </g>),
  dog: (<g>
    <circle cx={50} cy={54} r={32} {...W} />
    <path d="M22 30 Q6 40 14 66 Q24 64 30 46 Z" fill={INK} /><path d="M78 30 Q94 40 86 66 Q76 64 70 46 Z" fill={INK} />
    <circle cx={39} cy={50} r={5} fill={INK} /><circle cx={61} cy={50} r={5} fill={INK} />
    <ellipse cx={50} cy={64} rx={8} ry={6} fill={INK} /><path d="M42 74 Q50 82 58 74" {...N} />
    <path d="M50 76 Q52 90 58 84" fill={Y} stroke={INK} strokeWidth={3} />
  </g>),
  cart: (<g>
    <path d="M6 16 H20 L30 64 H80 L88 30 H24" {...N} /><path d="M28 30 H86 L80 58 H32 Z" {...HT} />
    <circle cx={36} cy={80} r={8} {...W} /><circle cx={74} cy={80} r={8} {...W} />
  </g>),
  laptop: (<g>
    <rect x={16} y={16} width={68} height={48} rx={4} {...W} />
    <path d="M26 54 L40 42 L52 48 L72 28" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M64 26 L74 26 L74 36" {...N} />
    <rect x={26} y={50} width={6} height={8} fill={Y} /><path d="M6 70 H94 L88 82 H12 Z" fill={INK} />
  </g>),
  cup: (<g>
    <path d="M36 28 Q30 20 36 12 M50 28 Q44 20 50 10 M64 28 Q58 20 64 12" {...N} strokeWidth={4} />
    <path d="M70 44 Q86 44 84 56 Q82 68 70 64" {...N} />
    <path d="M22 34 H70 V62 Q70 82 46 82 Q22 82 22 62 Z" {...W} />
    <ellipse cx={46} cy={34} rx={24} ry={4} fill="url(#cmHtD)" stroke={INK} strokeWidth={3} />
    <path d="M30 52 H62" stroke={Y} strokeWidth={8} />
    <ellipse cx={46} cy={88} rx={36} ry={6} {...W} />
  </g>),
  hotel: (<g>
    <rect x={30} y={4} width={40} height={12} {...YF} />
    <rect x={20} y={18} width={60} height={76} {...W} />
    {[0, 1, 2].map((c) => [0, 1, 2, 3].map((r) => (
      <rect key={`${c}${r}`} x={28 + c * 16} y={26 + r * 13} width={10} height={8} fill={(c + r) % 3 === 0 ? Y : INK} stroke={INK} strokeWidth={2} />
    )))}
    <rect x={42} y={78} width={16} height={16} fill={INK} />
  </g>),
  bowl: (<g>
    <path d="M60 46 L90 10 M68 48 L96 16" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    <path d="M30 40 Q24 30 30 22 M46 40 Q40 30 46 20" {...N} strokeWidth={4} />
    <path d="M8 46 H92 Q90 84 50 86 Q10 84 8 46 Z" {...W} />
    <path d="M14 58 H86 Q82 70 76 74 H24 Q18 70 14 58 Z" fill={Y} />
    <path d="M8 46 H92 Q90 84 50 86 Q10 84 8 46 Z" {...N} />
  </g>),
  camera: (<g>
    <rect x={30} y={18} width={26} height={14} {...W} />
    <rect x={8} y={28} width={84} height={56} rx={8} {...W} />
    <circle cx={50} cy={56} r={20} fill={INK} /><circle cx={50} cy={56} r={10} fill="#fff" stroke={INK} strokeWidth={3} />
    <circle cx={46} cy={52} r={3} fill={INK} /><rect x={70} y={36} width={14} height={8} {...YF} strokeWidth={3} />
  </g>),
  printer: (<g>
    <rect x={12} y={10} width={76} height={80} {...W} /><rect x={12} y={10} width={76} height={12} fill={INK} />
    <path d="M45 22 h10 v10 l-5 7 l-5 -7 Z" fill={INK} />
    <path d="M38 56 L50 50 L62 56 L62 70 L50 76 L38 70 Z" {...YF} strokeWidth={3} /><path d="M38 56 L50 62 L62 56 M50 62 V76" {...N} strokeWidth={3} />
    <rect x={20} y={76} width={60} height={6} fill={INK} />
  </g>),
  laser: (<g>
    <rect x={40} y={10} width={20} height={20} fill={INK} />
    <path d="M50 30 V64" stroke={Y} strokeWidth={8} /><path d="M50 30 V64" stroke={INK} strokeWidth={2} />
    <path d="M50 58 l4 8 8 2 -8 2 -4 8 -4 -8 -8 -2 8 -2 Z" {...YF} strokeWidth={3} />
    <rect x={8} y={72} width={84} height={20} {...W} /><path d="M20 82 H80" stroke="#999" strokeWidth={3} strokeDasharray="6 6" />
  </g>),
  tablet: (<g>
    <rect x={18} y={6} width={64} height={88} rx={9} fill={INK} />
    <rect x={24} y={14} width={52} height={66} fill="#fff" />
    <path d="M30 64 Q40 30 50 50 Q60 70 70 30" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
    <circle cx={64} cy={28} r={6} fill={Y} stroke={INK} strokeWidth={3} /><circle cx={50} cy={87} r={3} fill="#fff" />
  </g>),
  clapper: (<g>
    <g transform="rotate(-14 14 40)"><rect x={14} y={24} width={72} height={16} {...W} />
      <path d="M24 24 L34 40 H44 L34 24 Z M48 24 L58 40 H68 L58 24 Z M72 24 L82 40 H86 V36 L78 24 Z" fill={INK} /></g>
    <rect x={14} y={40} width={72} height={48} {...W} />
    <path d="M42 52 L62 64 L42 76 Z" {...YF} />
  </g>),
  baby: (<g>
    <path d="M20 66 Q50 104 80 66 Q50 54 20 66 Z" {...YF} />
    <circle cx={50} cy={44} r={26} {...W} />
    <path d="M44 20 Q50 10 56 18 Q52 16 50 22" {...N} strokeWidth={4} />
    <path d="M38 44 Q41 40 44 44 M56 44 Q59 40 62 44" {...N} strokeWidth={3} />
    <path d="M44 54 Q50 60 56 54" {...N} strokeWidth={3} />
    <circle cx={34} cy={52} r={4} fill="#f6a" opacity={0.0} />
  </g>),
  coin: (<g>
    <circle cx={50} cy={50} r={36} {...YF} /><circle cx={50} cy={50} r={26} fill="none" stroke={INK} strokeWidth={3} />
    <text x={50} y={64} textAnchor="middle" fontFamily={EN} fontSize={40} fill={INK}>$</text>
  </g>),
  bag: (<g>
    <path d="M34 36 Q12 64 20 88 H80 Q88 64 66 36 Z" {...YF} />
    <path d="M36 36 H64 L58 26 L68 12 L32 12 L42 26 Z" {...YF} />
    <path d="M34 36 H66" stroke={INK} strokeWidth={6} />
    <text x={50} y={78} textAnchor="middle" fontFamily={EN} fontSize={36} fill={INK}>$</text>
  </g>),
  chip: (<g>
    {[0, 1, 2, 3, 4].map((i) => (
      <g key={i} stroke={INK} strokeWidth={5}>
        <path d={`M${30 + i * 10} 10 V24 M${30 + i * 10} 76 V90 M10 ${30 + i * 10} H24 M76 ${30 + i * 10} H90`} />
      </g>
    ))}
    <rect x={22} y={22} width={56} height={56} rx={4} fill={INK} />
    <rect x={32} y={32} width={36} height={36} fill={Y} />
    <text x={50} y={62} textAnchor="middle" fontFamily={EN} fontSize={26} fill={INK}>AI</text>
  </g>),
  circuit: (<g>
    <path d="M10 20 H40 V50 H70 V20 H90 M10 80 H30 V60 H60 V90 M70 50 V80 H90" {...N} strokeWidth={4} />
    {[[40, 20], [70, 50], [30, 80], [60, 60], [90, 20], [90, 80], [10, 20], [10, 80]].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r={6} fill={i % 2 ? Y : '#fff'} stroke={INK} strokeWidth={4} />
    ))}
  </g>),
  phone: (<g>
    <rect x={28} y={6} width={44} height={88} rx={8} {...W} /><rect x={34} y={16} width={32} height={60} fill="url(#cmHtD)" />
    <circle cx={50} cy={85} r={4} fill={INK} />
  </g>),
  bolt: (<path d="M58 4 L22 56 H46 L38 96 L80 38 H54 Z" {...YF} />),
  bus: (<g>
    <rect x={6} y={20} width={88} height={56} rx={10} {...YF} />
    {[0, 1, 2].map((i) => <rect key={i} x={14 + i * 20} y={28} width={16} height={18} {...W} strokeWidth={4} />)}
    <rect x={74} y={28} width={14} height={30} {...W} strokeWidth={4} />
    <path d="M6 58 H94" stroke={INK} strokeWidth={4} />
    <circle cx={26} cy={78} r={10} fill={INK} /><circle cx={26} cy={78} r={4} fill="#fff" />
    <circle cx={74} cy={78} r={10} fill={INK} /><circle cx={74} cy={78} r={4} fill="#fff" />
    <circle cx={90} cy={66} r={4} fill="#fff" stroke={INK} strokeWidth={2} />
  </g>),
  bed: (<g>
    <path d="M10 20 V90 M90 20 V90" stroke={INK} strokeWidth={6} />
    <rect x={10} y={26} width={80} height={16} {...W} /><rect x={50} y={18} width={34} height={10} {...W} strokeWidth={3} />
    <rect x={10} y={64} width={80} height={16} {...HT} /><rect x={50} y={56} width={34} height={10} {...W} strokeWidth={3} />
  </g>),
  ac: (<g>
    <rect x={8} y={14} width={84} height={34} rx={6} {...W} /><path d="M18 38 H82" stroke={INK} strokeWidth={4} />
    <circle cx={80} cy={24} r={3} fill={Y} stroke={INK} strokeWidth={2} />
    <path d="M24 58 Q30 66 24 74 Q18 82 24 90 M50 58 Q56 66 50 74 Q44 82 50 90 M76 58 Q82 66 76 74 Q70 82 76 90" {...N} strokeWidth={4} />
  </g>),
  lamp: (<g>
    <path d="M30 22 L62 6 L72 26 L40 42 Z" {...YF} />
    <path d="M50 30 L30 64 L44 86" {...N} strokeWidth={6} /><rect x={24} y={84} width={44} height={8} fill={INK} />
    <path d="M44 46 L40 60 M54 44 L56 58 M62 38 L72 48" stroke={INK} strokeWidth={3} strokeLinecap="round" />
  </g>),
  book: (<g>
    <path d="M50 28 Q30 18 8 24 V80 Q30 74 50 84 Q70 74 92 80 V24 Q70 18 50 28 Z" {...W} />
    <path d="M50 28 V84" stroke={INK} strokeWidth={4} />
    <path d="M18 38 Q30 34 42 38 M18 50 Q30 46 42 50 M58 38 Q70 34 82 38 M58 50 Q70 46 82 50" {...N} strokeWidth={3} />
  </g>),
  cap: (<g>
    <path d="M50 18 L94 36 L50 54 L6 36 Z" fill={INK} />
    <path d="M26 44 V64 Q50 78 74 64 V44 L50 54 Z" fill={INK} />
    <path d="M94 36 V66" stroke={Y} strokeWidth={5} /><circle cx={94} cy={70} r={6} {...YF} strokeWidth={3} />
  </g>),
  cross: (<g>
    <circle cx={50} cy={50} r={42} {...W} />
    <path d="M40 18 H60 V40 H82 V60 H60 V82 H40 V60 H18 V40 H40 Z" {...YF} />
  </g>),
  suitcase: (<g>
    <path d="M38 30 V18 H62 V30" {...N} />
    <rect x={12} y={30} width={76} height={58} rx={6} {...YF} />
    <path d="M30 30 V88 M70 30 V88" stroke={INK} strokeWidth={5} />
    <circle cx={50} cy={58} r={9} fill="#fff" stroke={INK} strokeWidth={3} />
  </g>),
  star: (<path d="M50 6 L62 36 L94 38 L68 58 L78 92 L50 72 L22 92 L32 58 L6 38 L38 36 Z" {...YF} />),
  heart: (<path d="M50 88 Q10 60 10 34 Q10 12 30 12 Q44 12 50 26 Q56 12 70 12 Q90 12 90 34 Q90 60 50 88 Z" {...YF} />),
  square: (<rect x={16} y={16} width={68} height={68} {...W} strokeWidth={6} />),
  cube: (<g>
    <path d="M50 8 L90 28 L50 48 L10 28 Z" {...YF} />
    <path d="M10 28 L50 48 V92 L10 72 Z" {...W} />
    <path d="M90 28 L50 48 V92 L90 72 Z" {...HT} />
  </g>),
  school: (<g>
    <path d="M50 4 V22" stroke={INK} strokeWidth={4} /><path d="M50 4 L68 9 L50 14 Z" fill={Y} stroke={INK} strokeWidth={3} />
    <path d="M30 34 L50 20 L70 34 Z" {...W} />
    <rect x={8} y={34} width={84} height={58} {...W} />
    {[0, 1, 2, 3].map((c) => [0, 1].map((r) => (
      <rect key={`${c}${r}`} x={14 + c * 20 + (c > 1 ? 8 : 0)} y={42 + r * 18} width={10} height={10} fill={INK} />
    )))}
    <rect x={42} y={66} width={16} height={26} fill={Y} stroke={INK} strokeWidth={4} />
  </g>),
  monitor: (<g>
    <rect x={8} y={12} width={84} height={58} rx={4} {...W} />
    <rect x={16} y={20} width={68} height={8} fill={INK} /><circle cx={22} cy={24} r={2} fill="#fff" />
    <rect x={16} y={34} width={40} height={6} fill={Y} stroke={INK} strokeWidth={2} />
    <path d="M16 48 H80 M16 58 H64" stroke="#999" strokeWidth={4} />
    <path d="M40 70 L36 88 H64 L60 70" fill={INK} />
  </g>),
  // ── 2026-10-07 範本I 補的通用圖示 ──
  bulb: (<g>
    <path d="M50 8 Q22 8 22 38 Q22 54 36 64 V74 H64 V64 Q78 54 78 38 Q78 8 50 8 Z" {...YF} />
    <path d="M38 80 H62 M40 90 H60" {...N} /><path d="M42 50 L50 36 L58 50" {...N} strokeWidth={4} />
  </g>),
  clock: (<g>
    <circle cx={50} cy={52} r={40} {...W} /><circle cx={50} cy={52} r={32} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="3 13" />
    <path d="M50 52 V28 M50 52 L68 62" {...N} strokeWidth={6} /><circle cx={50} cy={52} r={5} fill={Y} stroke={INK} strokeWidth={3} />
  </g>),
  pencil: (<g>
    <path d="M20 80 L28 58 L70 16 L84 30 L42 72 Z" {...YF} /><path d="M20 80 L28 58 L42 72 Z" {...W} />
    <path d="M20 80 L24 70 L30 76 Z" fill={INK} /><path d="M62 24 L76 38" {...N} />
  </g>),
  mic: (<g>
    <rect x={36} y={8} width={28} height={50} rx={14} {...HT} />
    <path d="M24 40 Q24 70 50 70 Q76 70 76 40" {...N} /><path d="M50 70 V86 M34 90 H66" {...N} strokeWidth={6} />
  </g>),
  target: (<g>
    <circle cx={46} cy={54} r={38} {...W} /><circle cx={46} cy={54} r={26} {...YF} /><circle cx={46} cy={54} r={12} {...W} />
    <path d="M46 54 L88 12" {...N} strokeWidth={6} /><path d="M78 10 L90 10 L90 22" {...N} />
  </g>),
  warning: (<g>
    <path d="M50 8 L94 88 H6 Z" {...YF} /><path d="M50 36 V62" {...N} strokeWidth={9} /><circle cx={50} cy={75} r={5} fill={INK} />
  </g>),
  chart: (<g>
    <path d="M10 10 V90 H92" {...N} strokeWidth={6} />
    <rect x={22} y={56} width={16} height={34} {...W} /><rect x={46} y={40} width={16} height={50} {...HT} /><rect x={70} y={20} width={16} height={70} {...YF} />
  </g>),
  magnifier: (<g>
    <circle cx={42} cy={42} r={30} {...W} /><circle cx={42} cy={42} r={20} fill="url(#cmHtY)" stroke="none" />
    <path d="M64 64 L90 90" stroke={INK} strokeWidth={14} strokeLinecap="round" />
  </g>),
  people: (<g>
    <circle cx={30} cy={34} r={14} {...W} /><path d="M8 84 Q8 54 30 54 Q52 54 52 84 Z" {...HT} />
    <circle cx={66} cy={28} r={16} {...W} /><path d="M40 90 Q40 54 66 54 Q92 54 92 90 Z" {...YF} />
  </g>),
  calendar: (<g>
    <rect x={10} y={18} width={80} height={72} {...W} /><rect x={10} y={18} width={80} height={18} fill={INK} />
    <path d="M30 10 V26 M70 10 V26" {...N} strokeWidth={6} />
    {[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (
      <rect key={`${r}${c}`} x={18 + c * 18} y={44 + r * 14} width={10} height={8} fill={r === 1 && c === 2 ? Y : INK} stroke={INK} strokeWidth={1} />
    )))}
  </g>),
  chat: (<g>
    <path d="M10 14 H70 V54 H34 L20 68 V54 H10 Z" {...W} />
    <path d="M40 40 H90 V76 H82 V90 L68 76 H40 Z" {...YF} />
    <circle cx={56} cy={58} r={3} fill={INK} /><circle cx={66} cy={58} r={3} fill={INK} /><circle cx={76} cy={58} r={3} fill={INK} />
  </g>),
  gear: (<g>
    <path d="M44 6 H56 L58 18 L68 22 L78 14 L86 22 L78 32 L82 42 L94 44 V56 L82 58 L78 68 L86 78 L78 86 L68 78 L58 82 L56 94 H44 L42 82 L32 78 L22 86 L14 78 L22 68 L18 58 L6 56 V44 L18 42 L22 32 L14 22 L22 14 L32 22 L42 18 Z" {...YF} />
    <circle cx={50} cy={50} r={14} {...W} />
  </g>),
  check: (<g>
    <rect x={10} y={10} width={80} height={80} {...W} />
    <path d="M24 52 L42 70 L78 26" fill="none" stroke={INK} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M24 52 L42 70 L78 26" fill="none" stroke={Y} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
  </g>),
  rocket: (<g>
    <path d="M50 6 Q74 26 70 66 H30 Q26 26 50 6 Z" {...W} /><circle cx={50} cy={36} r={9} {...YF} />
    <path d="M30 50 L14 72 L30 66 M70 50 L86 72 L70 66" {...HT} /><path d="M40 70 L50 94 L60 70 Z" {...YF} />
  </g>),
};

/** emoji → 漫畫圖示名 */
export const EMOJI_TO_COMIC: Record<string, string> = {
  '🏆': 'trophy', '✈️': 'plane', '✈': 'plane', '📜': 'cert', '🐾': 'paw', '🐶': 'dog', '🐕': 'dog', '🛒': 'cart', '💻': 'laptop', '☕': 'cup',
  '🏨': 'hotel', '🏢': 'hotel', '🍜': 'bowl', '🍚': 'bowl', '📷': 'camera', '📸': 'camera', '🖨️': 'printer', '🖨': 'printer', '📱': 'phone', '📲': 'phone',
  '🎬': 'clapper', '🎥': 'clapper', '👶': 'baby', '🪙': 'coin', '💰': 'coin', '💲': 'coin', '🛍️': 'bag', '🤖': 'chip', '🔌': 'circuit', '⚡': 'bolt',
  '🚌': 'bus', '🚍': 'bus', '🛏️': 'bed', '🛏': 'bed', '❄️': 'ac', '📚': 'book', '📖': 'book', '📘': 'book', '🎓': 'cap', '🏥': 'cross', '➕': 'cross',
  '💼': 'suitcase', '🧳': 'suitcase', '⭐': 'star', '🌟': 'star', '✨': 'star', '❤️': 'heart', '❤': 'heart', '💖': 'heart', '🧊': 'cube', '📦': 'cube',
  '🏫': 'school', '🖥️': 'monitor', '🖥': 'monitor', '💡': 'bulb', '⏰': 'clock', '⏱️': 'clock', '🕒': 'clock', '✏️': 'pencil', '✏': 'pencil', '📝': 'pencil',
  '🎤': 'mic', '🎙️': 'mic', '🎯': 'target', '⚠️': 'warning', '⚠': 'warning', '❗': 'warning', '📊': 'chart', '📈': 'chart', '🔍': 'magnifier', '🔎': 'magnifier',
  '👥': 'people', '🧑‍🤝‍🧑': 'people', '👫': 'people', '📅': 'calendar', '🗓️': 'calendar', '📆': 'calendar', '💬': 'chat', '🗨️': 'chat', '⚙️': 'gear', '⚙': 'gear',
  '✅': 'check', '☑️': 'check', '✔️': 'check', '🚀': 'rocket',
};

/** 線稿（200×200）改畫成漫畫風：粗黑線、第一筆封閉路徑塗白（線稿有指定填色時塗黃） */
const SketchArt: React.FC<{name: string}> = ({name}) => {
  const sk = sketchFor(name)!;
  return (
    <g transform="scale(0.5)">
      {sk.paths.map((d, i) => (
        <path key={i} d={d} fill={i === 0 && /Z\s*$/.test(d) ? (sk.fill ? Y : '#fff') : 'none'} stroke={INK} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {(sk.dots ?? []).map(([cx, cy], i) => <circle key={`d${i}`} cx={cx} cy={cy} r={9} fill={Y} stroke={INK} strokeWidth={5} />)}
    </g>
  );
};

/** 這個 icon 字串用哪一種畫法 */
export const iconKind = (icon?: string): 'comic' | 'sketch' | 'emoji' | 'none' => {
  if (!icon) return 'none';
  if (COMIC_ICONS[icon] || COMIC_ICONS[EMOJI_TO_COMIC[icon] ?? '']) return 'comic';
  if (sketchFor(icon)) return 'sketch';
  return 'emoji';
};

/** 圖示畫面（100×100 座標）：漫畫圖示 → 線稿 → 圓框＋emoji／短字；沒給 icon 畫星星 */
export const IconArt: React.FC<{icon?: string}> = ({icon}) => {
  const kind = iconKind(icon);
  if (kind === 'comic') return <>{COMIC_ICONS[icon!] ?? COMIC_ICONS[EMOJI_TO_COMIC[icon!]]}</>;
  if (kind === 'sketch') return <SketchArt name={icon!} />;
  if (kind === 'none') return <>{COMIC_ICONS.star}</>;
  const t = Array.from(icon!);
  const isEmoji = /\p{Extended_Pictographic}/u.test(icon!);
  return (
    <g>
      <circle cx={50} cy={50} r={44} fill="#fff" stroke={INK} strokeWidth={6} />
      <circle cx={50} cy={50} r={36} fill="url(#cmHtY)" />
      <text x={50} y={isEmoji ? 66 : 64} textAnchor="middle" fontSize={isEmoji ? 46 : t.length > 2 ? 30 : 40}
        fontFamily={isEmoji ? undefined : /[一-鿿]/.test(icon!) ? TC : EN} fontWeight={900} fill={INK}>{icon}</text>
    </g>
  );
};

/** 在 at 格彈出的圖示（x,y 為左上；data-qa="ignore"：圖示內的 $、AI、emoji 不算畫面文字） */
export const ComicIcon: React.FC<{icon?: string; at: number; x: number; y: number; size: number; rot?: number; wobble?: boolean}> = (
  {icon, at, x, y, size, rot = 0, wobble = false}) => {
  const f = useCurrentFrame();
  if (f < at) return null;
  const k = pop(f, at, 10);
  const wb = wobble ? Math.sin((f - at) / 8) * 5 : 0;
  return (
    <div data-qa="ignore" style={{position: 'absolute', left: x, top: y, width: size, height: size, transform: `scale(${k}) rotate(${rot + wb}deg)`}}>
      <svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}><IconArt icon={icon} /></svg>
    </div>
  );
};
