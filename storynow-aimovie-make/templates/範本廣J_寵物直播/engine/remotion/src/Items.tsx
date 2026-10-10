/* 範本廣J 通用小物庫（SVG，中心在 0,0，大小約 150）。商品、關鍵字貼紙、展示台都畫這些。
   原作第 20 支的碗、骨頭、數位（圖表手機）、行銷（大聲公）、創新（燈泡）、禮盒、獎盃、證照照搬；
   通用版加上球、杯子、書、袋子、蛋糕、筆電、日曆、愛心、星星、獎牌、優惠券（同一套粉橘配色）。 */
import React from 'react';

export type ItemKind =
  | 'bowl' | 'bone' | 'ball' | 'cup' | 'book' | 'bag' | 'gift' | 'cake' | 'chart' | 'megaphone' | 'bulb'
  | 'laptop' | 'calendar' | 'heart' | 'star' | 'trophy' | 'medal' | 'ticket' | 'cert';

const Paw: React.FC<{x: number; y: number; s: number; c: string}> = ({x, y, s, c}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={c}>
    <ellipse cx={0} cy={6} rx={12} ry={10} />
    <circle cx={-13} cy={-8} r={5} />
    <circle cx={-4} cy={-15} r={5} />
    <circle cx={6} cy={-15} r={5} />
    <circle cx={14} cy={-7} r={5} />
  </g>
);

const HEART = 'M0 -22 C -12 -50 -62 -46 -62 -8 C -62 22 -24 44 0 66 C 24 44 62 22 62 -8 C 62 -46 12 -50 0 -22 Z';
const starPts = (r: number, ri: number) =>
  Array.from({length: 10}, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const q = i % 2 ? ri : r;
    return `${(Math.cos(a) * q).toFixed(1)},${(Math.sin(a) * q).toFixed(1)}`;
  }).join(' ');

export const Item: React.FC<{k: ItemKind; open?: number}> = ({k, open = 0}) => {
  switch (k) {
    case 'bowl':
      return (
        <g>
          <ellipse cx={0} cy={-10} rx={74} ry={18} fill="#FFD2DF" />
          <path d="M-74 -10 Q -66 52 0 56 Q 66 52 74 -10 Z" fill="#FF7FA5" />
          <ellipse cx={0} cy={-12} rx={60} ry={12} fill="#C9764A" />
          <circle cx={-20} cy={-15} r={8} fill="#A65C33" />
          <circle cx={14} cy={-13} r={8} fill="#A65C33" />
          <Paw x={0} y={26} s={1} c="#fff" />
        </g>
      );
    case 'bone':
      return (
        <g transform="rotate(-18)">
          <rect x={-56} y={-14} width={112} height={28} rx={14} fill="#FFF3D6" stroke="#E7B86A" strokeWidth={5} />
          {[-1, 1].map((d) => (
            <g key={d}>
              <circle cx={d * 60} cy={-17} r={20} fill="#FFF3D6" stroke="#E7B86A" strokeWidth={5} />
              <circle cx={d * 60} cy={17} r={20} fill="#FFF3D6" stroke="#E7B86A" strokeWidth={5} />
            </g>
          ))}
          <rect x={-56} y={-11} width={112} height={22} fill="#FFF3D6" />
          <circle cx={-14} cy={0} r={5} fill="#7FD1E8" />
          <circle cx={8} cy={0} r={5} fill="#FF8FB1" />
        </g>
      );
    case 'ball':
      return (
        <g>
          <circle r={62} fill="#7FD1E8" />
          <path d="M-62 0 Q 0 -34 62 0" fill="none" stroke="#fff" strokeWidth={10} />
          <path d="M-58 22 Q 0 -8 58 22" fill="none" stroke="#FF8FB1" strokeWidth={8} />
          <path d="M-8 -62 Q 30 0 -8 62" fill="none" stroke="#fff" strokeWidth={8} />
          <ellipse cx={-26} cy={-30} rx={12} ry={18} fill="#fff" opacity={0.5} transform="rotate(30 -26 -30)" />
        </g>
      );
    case 'cup':
      return (
        <g>
          <path d="M-14 -70 Q -28 -86 -14 -100 M 14 -70 Q 0 -86 14 -100" fill="none" stroke="#FFB0CB" strokeWidth={6} strokeLinecap="round" />
          <path d="M-58 -54 L 58 -54 L 46 50 Q 0 62 -46 50 Z" fill="#FFF3EA" stroke="#FF7FA5" strokeWidth={6} />
          <path d="M56 -30 Q 94 -30 88 6 Q 82 30 50 26" fill="none" stroke="#FF7FA5" strokeWidth={10} />
          <ellipse cx={0} cy={-54} rx={58} ry={14} fill="#C9764A" />
          <path d="M-12 -58 Q 0 -66 12 -58 Q 0 -50 -12 -58 Z" fill="#FFE3C4" />
          <Paw x={0} y={6} s={1} c="#FF8FB1" />
          <ellipse cx={0} cy={66} rx={78} ry={12} fill="#FFD2DF" />
        </g>
      );
    case 'book':
      return (
        <g transform="rotate(-8)">
          <path d="M-76 -50 Q -38 -64 0 -46 Q 38 -64 76 -50 L 76 56 Q 38 42 0 60 Q -38 42 -76 56 Z" fill="#FF7FA5" />
          <path d="M-68 -54 Q -34 -66 -4 -50 L -4 50 Q -34 36 -68 48 Z" fill="#FFF8F1" />
          <path d="M68 -54 Q 34 -66 4 -50 L 4 50 Q 34 36 68 48 Z" fill="#FFF8F1" />
          {[-30, -10, 10].map((y, i) => (
            <path key={i} d={`M-56 ${y - 6} Q -34 ${y - 14} -16 ${y - 4}`} fill="none" stroke="#F2C9A8" strokeWidth={6} strokeLinecap="round" />
          ))}
          <path d="M44 -58 L 44 -14 L 52 -22 L 60 -14 L 60 -58" fill="#FFC531" />
          <Paw x={36} y={14} s={0.9} c="#FFB0CB" />
        </g>
      );
    case 'bag':
      return (
        <g>
          <path d="M-30 -40 Q -30 -86 0 -86 Q 30 -86 30 -40" fill="none" stroke="#C9764A" strokeWidth={9} />
          <path d="M-66 -44 L 66 -44 L 74 66 L -74 66 Z" fill="#FF9A62" />
          <path d="M-66 -44 L 66 -44 L 68 -20 L -68 -20 Z" fill="#FF7FA5" />
          <circle cx={-30} cy={-40} r={7} fill="#C9764A" />
          <circle cx={30} cy={-40} r={7} fill="#C9764A" />
          <path d="M0 4 C -6 -10 -30 -8 -30 8 C -30 22 -12 32 0 42 C 12 32 30 22 30 8 C 30 -8 6 -10 0 4 Z" fill="#fff" />
        </g>
      );
    case 'gift':
      return (
        <g>
          <g transform={`translate(0 ${-36 - open * 70}) rotate(${-open * 28})`}>
            <rect x={-78} y={-22} width={156} height={34} rx={6} fill="#FF5C8A" />
            <rect x={-12} y={-22} width={24} height={34} fill="#FFD84A" />
            <path d="M0 -22 C -40 -66 -64 -30 0 -22 C 64 -30 40 -66 0 -22" fill="#FFD84A" />
          </g>
          <rect x={-68} y={-24} width={136} height={96} rx={6} fill="#FF7FA5" />
          <rect x={-12} y={-24} width={24} height={96} fill="#FFD84A" />
        </g>
      );
    case 'cake':
      return (
        <g>
          <ellipse cx={0} cy={62} rx={82} ry={14} fill="#FFD2DF" />
          <path d="M-66 -6 L 66 -6 L 66 56 Q 0 66 -66 56 Z" fill="#E7B86A" />
          <path d="M-66 18 L 66 18" stroke="#FFF3D6" strokeWidth={10} />
          <path d="M-70 -10 Q -60 -40 0 -40 Q 60 -40 70 -10 Q 52 8 34 -6 Q 18 10 0 -6 Q -18 10 -34 -6 Q -52 8 -70 -10 Z" fill="#FFF8F1" />
          <circle cx={0} cy={-52} r={14} fill="#FF3B5C" />
          <path d="M0 -64 Q 6 -80 18 -82" fill="none" stroke="#7CC98A" strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case 'chart':
      return (
        <g>
          <rect x={-62} y={-80} width={124} height={160} rx={18} fill="#3D3A5C" />
          <rect x={-52} y={-68} width={104} height={136} rx={8} fill="#F4F1FF" />
          <rect x={-40} y={10} width={16} height={40} rx={3} fill="#FFB36B" />
          <rect x={-16} y={-8} width={16} height={58} rx={3} fill="#FF8A7A" />
          <rect x={8} y={-30} width={16} height={80} rx={3} fill="#FF5C8A" />
          <path d="M-40 -34 L -12 -46 L 10 -40 L 38 -58" fill="none" stroke="#7A63A8" strokeWidth={5} strokeLinecap="round" />
          <circle cx={38} cy={-58} r={6} fill="#7A63A8" />
        </g>
      );
    case 'megaphone':
      return (
        <g transform="rotate(-14)">
          <path d="M-56 -20 L 34 -66 L 34 66 L -56 20 Z" fill="#FF8A5C" />
          <rect x={-74} y={-24} width={24} height={48} rx={8} fill="#FF5C8A" />
          <ellipse cx={34} cy={0} rx={14} ry={66} fill="#FFC1A6" />
          <path d="M-46 22 L -30 64 L -12 60 L -24 28" fill="#E0567E" />
          <path d="M60 -40 Q 76 -50 74 -30" fill="none" stroke="#FF5C8A" strokeWidth={6} strokeLinecap="round" />
          <path d="M64 0 L 90 0" stroke="#FF5C8A" strokeWidth={6} strokeLinecap="round" />
          <path d="M60 40 Q 76 50 74 30" fill="none" stroke="#FF5C8A" strokeWidth={6} strokeLinecap="round" />
        </g>
      );
    case 'bulb':
      return (
        <g>
          <circle cx={0} cy={-18} r={84} fill="#FFE27A" opacity={0.35} />
          <path d="M-46 -24 A 50 50 0 1 1 46 -24 Q 40 8 24 26 L -24 26 Q -40 8 -46 -24 Z" fill="#FFD84A" />
          <path d="M-16 0 Q 0 -30 16 0" fill="none" stroke="#FF9A3C" strokeWidth={5} />
          <rect x={-26} y={28} width={52} height={14} rx={5} fill="#B9B3C9" />
          <rect x={-22} y={44} width={44} height={14} rx={5} fill="#9E97B2" />
          <ellipse cx={-20} cy={-44} rx={10} ry={16} fill="#fff" opacity={0.7} transform="rotate(30 -20 -44)" />
        </g>
      );
    case 'laptop':
      return (
        <g>
          <rect x={-70} y={-66} width={140} height={96} rx={10} fill="#4A3F55" />
          <rect x={-60} y={-56} width={120} height={76} rx={5} fill="#FFF6F0" />
          <rect x={-60} y={-56} width={120} height={14} fill="#FF7A8F" />
          <path d="M-46 -24 L -26 -24 M -46 -10 L -6 -10 M -46 4 L -18 4" stroke="#B9B3C9" strokeWidth={6} strokeLinecap="round" />
          <path d="M8 6 L 24 -12 L 36 -4 L 50 -26" fill="none" stroke="#7A63A8" strokeWidth={5} strokeLinecap="round" />
          <path d="M-86 30 L 86 30 L 96 50 L -96 50 Z" fill="#B9B3C9" />
          <rect x={-20} y={34} width={40} height={6} rx={3} fill="#9E97B2" />
        </g>
      );
    case 'calendar':
      return (
        <g transform="rotate(-6)">
          <rect x={-66} y={-60} width={132} height={124} rx={14} fill="#FFFBF2" stroke="#FF7FA5" strokeWidth={6} />
          <path d="M-66 -46 Q -66 -60 -52 -60 L 52 -60 Q 66 -60 66 -46 L 66 -24 L -66 -24 Z" fill="#FF7FA5" />
          <rect x={-40} y={-76} width={12} height={28} rx={6} fill="#5A2840" />
          <rect x={28} y={-76} width={12} height={28} rx={6} fill="#5A2840" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2, 3].map((c) => (
              <rect key={`${r}${c}`} x={-50 + c * 26} y={-12 + r * 24} width={16} height={14} rx={3} fill={r === 1 && c === 2 ? '#FF5C8A' : '#F2C9A8'} />
            )),
          )}
        </g>
      );
    case 'heart':
      return (
        <g>
          <path d={HEART} fill="#FF5C8A" transform="translate(0 -14)" />
          <ellipse cx={-30} cy={-30} rx={10} ry={16} fill="#fff" opacity={0.55} transform="rotate(-30 -30 -30)" />
        </g>
      );
    case 'star':
      return (
        <g>
          <polygon points={starPts(78, 36)} fill="#FFD84A" stroke="#FF9A3C" strokeWidth={6} strokeLinejoin="round" />
          <circle cx={-16} cy={-4} r={6} fill="#5A2840" />
          <circle cx={16} cy={-4} r={6} fill="#5A2840" />
          <path d="M-10 12 Q 0 20 10 12" fill="none" stroke="#5A2840" strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    case 'trophy':
      return (
        <g>
          <path d="M-52 -78 L 52 -78 Q 54 0 0 16 Q -54 0 -52 -78 Z" fill="#FFC531" />
          <path d="M-52 -64 Q -92 -64 -80 -30 Q -70 -8 -44 -14" fill="none" stroke="#FFC531" strokeWidth={10} />
          <path d="M52 -64 Q 92 -64 80 -30 Q 70 -8 44 -14" fill="none" stroke="#FFC531" strokeWidth={10} />
          <rect x={-10} y={14} width={20} height={30} fill="#E8A81C" />
          <rect x={-44} y={42} width={88} height={22} rx={5} fill="#E8A81C" />
          <rect x={-52} y={62} width={104} height={18} rx={5} fill="#8A5A2B" />
          <polygon points={starPts(26, 12)} fill="#FFF1B8" transform="translate(0 -38)" />
          <ellipse cx={-26} cy={-56} rx={7} ry={16} fill="#fff" opacity={0.55} transform="rotate(20 -26 -56)" />
        </g>
      );
    case 'medal':
      return (
        <g>
          <path d="M-40 -86 L -8 -18 L 8 -18 L -12 -86 Z" fill="#FF5C8A" />
          <path d="M40 -86 L 8 -18 L -8 -18 L 12 -86 Z" fill="#7FD1E8" />
          <circle cx={0} cy={22} r={52} fill="#FFC531" />
          <circle cx={0} cy={22} r={38} fill="#FFD84A" stroke="#E8A81C" strokeWidth={5} />
          <polygon points={starPts(24, 11)} fill="#E8A81C" transform="translate(0 22)" />
          <ellipse cx={-22} cy={2} rx={7} ry={14} fill="#fff" opacity={0.55} transform="rotate(30 -22 2)" />
        </g>
      );
    case 'ticket':
      return (
        <g transform="rotate(-10)">
          <path d="M-84 -48 L 84 -48 L 84 -14 A 14 14 0 0 0 84 14 L 84 48 L -84 48 L -84 14 A 14 14 0 0 0 -84 -14 Z" fill="#FF7FA5" />
          <path d="M-74 -38 L 74 -38 L 74 38 L -74 38 Z" fill="none" stroke="#FFF3D6" strokeWidth={4} strokeDasharray="10 8" />
          <path d="M34 -38 L 34 38" stroke="#fff" strokeWidth={4} strokeDasharray="6 7" />
          <circle cx={-26} cy={0} r={22} fill="#FFD84A" />
          <path d="M-36 10 L -16 -10" stroke="#FF5C8A" strokeWidth={5} strokeLinecap="round" />
          <circle cx={-34} cy={-8} r={5} fill="#FF5C8A" />
          <circle cx={-18} cy={8} r={5} fill="#FF5C8A" />
          <polygon points={starPts(16, 7)} fill="#FFF3D6" transform="translate(56 0)" />
        </g>
      );
    case 'cert':
      return (
        <g transform="rotate(-6)">
          <rect x={-74} y={-56} width={148} height={112} rx={8} fill="#FFFBF2" stroke="#E7B86A" strokeWidth={6} />
          <rect x={-56} y={-38} width={112} height={8} rx={4} fill="#F2C9A8" />
          <rect x={-56} y={-20} width={84} height={8} rx={4} fill="#F2C9A8" />
          <rect x={-56} y={-2} width={96} height={8} rx={4} fill="#F2C9A8" />
          <circle cx={42} cy={30} r={20} fill="#FF5C8A" />
          <path d="M34 46 L 30 66 L 42 58 L 54 66 L 50 46" fill="#FF5C8A" />
        </g>
      );
  }
  return null;
};
