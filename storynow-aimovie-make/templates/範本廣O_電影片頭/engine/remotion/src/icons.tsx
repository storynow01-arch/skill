/* 廣O 幾何剪影圖庫（都畫在 200×200 的框內；fill＝剪影色、hole＝挖空處的底色）。
   原作 ad04/lib.tsx 的 11 種（拿掉題材專屬的鳥居）＋通用補充 8 種。storyboard 用小寫鍵名指定（icon／art 欄位）。 */
import React from 'react';

export type SP = {fill: string; hole: string; t?: number; wheel?: string};

const Student: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M58 24 L100 6 L142 24 L100 42Z" fill={fill} />
    <rect x={134} y={24} width={6} height={34} fill={fill} />
    <circle cx={100} cy={52} r={27} fill={fill} />
    <path d="M56 88 L144 88 L162 200 L38 200Z" fill={fill} />
    <rect x={120} y={112} width={44} height={58} fill={hole} transform="rotate(-12 142 141)" />
  </g>
);
const Chef: React.FC<SP> = ({fill, hole}) => (
  <g>
    <circle cx={74} cy={34} r={22} fill={fill} />
    <circle cx={100} cy={22} r={28} fill={fill} />
    <circle cx={126} cy={34} r={22} fill={fill} />
    <rect x={72} y={34} width={56} height={30} fill={fill} />
    <rect x={72} y={60} width={56} height={6} fill={hole} />
    <circle cx={100} cy={94} r={24} fill={fill} />
    <path d="M52 126 L148 126 L162 200 L38 200Z" fill={fill} />
    <circle cx={100} cy={150} r={5} fill={hole} />
    <circle cx={100} cy={174} r={5} fill={hole} />
  </g>
);
const Plane: React.FC<SP> = ({fill}) => (
  <g>
    <path d="M10 100 Q20 87 60 87 L170 92 Q198 100 170 108 L60 113 Q20 113 10 100Z" fill={fill} />
    <path d="M112 92 L78 26 L98 26 L144 92Z" fill={fill} />
    <path d="M112 108 L78 174 L98 174 L144 108Z" fill={fill} />
    <path d="M24 92 L8 58 L22 58 L48 90Z" fill={fill} />
  </g>
);
const Camera: React.FC<SP> = ({fill, hole}) => (
  <g>
    <rect x={55} y={38} width={60} height={30} rx={4} fill={fill} />
    <rect x={15} y={60} width={170} height={112} rx={12} fill={fill} />
    <circle cx={100} cy={116} r={43} fill={hole} />
    <circle cx={100} cy={116} r={30} fill={fill} />
    <circle cx={100} cy={116} r={11} fill={hole} />
    <rect x={150} y={72} width={22} height={12} fill={hole} />
  </g>
);
const Chip: React.FC<SP> = ({fill, hole}) => (
  <g>
    {[0, 1, 2, 3, 4].map((i) => {
      const p = 58 + i * 21;
      return (
        <g key={i}>
          <rect x={p - 5} y={20} width={10} height={24} fill={fill} />
          <rect x={p - 5} y={156} width={10} height={24} fill={fill} />
          <rect x={20} y={p - 5} width={24} height={10} fill={fill} />
          <rect x={156} y={p - 5} width={24} height={10} fill={fill} />
        </g>
      );
    })}
    <rect x={44} y={44} width={112} height={112} rx={6} fill={fill} />
    <rect x={68} y={68} width={64} height={64} fill={hole} />
    <rect x={82} y={82} width={36} height={36} fill={fill} />
  </g>
);
const Bag: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M70 72 Q70 22 100 22 Q130 22 130 72" stroke={fill} strokeWidth={12} fill="none" />
    <path d="M38 70 L162 70 L174 196 L26 196Z" fill={fill} />
    <ellipse cx={100} cy={146} rx={22} ry={18} fill={hole} />
    <circle cx={74} cy={120} r={9} fill={hole} />
    <circle cx={90} cy={106} r={9} fill={hole} />
    <circle cx={110} cy={106} r={9} fill={hole} />
    <circle cx={126} cy={120} r={9} fill={hole} />
  </g>
);
const Family: React.FC<SP> = ({fill}) => (
  <g>
    <circle cx={70} cy={40} r={25} fill={fill} />
    <path d="M38 74 L102 74 L116 200 L24 200Z" fill={fill} />
    <rect x={96} y={110} width={46} height={11} fill={fill} transform="rotate(18 96 110)" />
    <circle cx={150} cy={108} r={17} fill={fill} />
    <path d="M128 132 L172 132 L180 200 L120 200Z" fill={fill} />
  </g>
);
const Plate: React.FC<SP> = ({fill, hole}) => (
  <g>
    <circle cx={100} cy={100} r={66} fill={fill} />
    <circle cx={100} cy={100} r={46} fill={hole} />
    <circle cx={100} cy={100} r={34} fill={fill} />
    <path d="M100 66 Q118 100 100 134 M70 100 L130 100" stroke={hole} strokeWidth={5} fill="none" />
    <rect x={10} y={60} width={8} height={120} fill={fill} />
    <rect x={2} y={30} width={6} height={40} fill={fill} />
    <rect x={20} y={30} width={6} height={40} fill={fill} />
    <path d="M182 30 Q198 70 190 110 L190 180 L182 180Z" fill={fill} />
  </g>
);
const FilmCam: React.FC<SP> = ({fill, hole, t = 0}) => (
  <g>
    {[[62, 48, 34], [134, 44, 38]].map(([x, y, r], i) => (
      <g key={i} transform={`rotate(${t * 9} ${x} ${y})`}>
        <circle cx={x} cy={y} r={r} fill={fill} />
        {[0, 1, 2].map((j) => <circle key={j} cx={x + Math.cos(j * 2.094) * r * 0.5} cy={y + Math.sin(j * 2.094) * r * 0.5} r={r * 0.22} fill={hole} />)}
      </g>
    ))}
    <rect x={28} y={88} width={130} height={72} rx={6} fill={fill} />
    <path d="M156 106 L198 86 L198 162 L156 142Z" fill={fill} />
    <rect x={70} y={160} width={14} height={40} fill={fill} />
  </g>
);
export const Bus: React.FC<SP> = ({fill, hole, wheel, t = 0}) => (
  <g>
    <rect x={4} y={10} width={192} height={96} rx={14} fill={fill} />
    {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={16 + i * 32} y={24} width={24} height={30} rx={3} fill={hole} />)}
    <rect x={174} y={24} width={16} height={46} rx={3} fill={hole} />
    <rect x={4} y={74} width={192} height={6} fill={hole} />
    {[46, 156].map((cx) => (
      <g key={cx} transform={`rotate(${t * 24} ${cx} 106)`}>
        <circle cx={cx} cy={106} r={19} fill={wheel ?? hole} />
        <rect x={cx - 3} y={92} width={6} height={28} fill={fill} />
        <rect x={cx - 14} y={103} width={28} height={6} fill={fill} />
      </g>
    ))}
  </g>
);
export const Lamp: React.FC<SP> = ({fill}) => (
  <g>
    <rect x={20} y={182} width={90} height={14} fill={fill} />
    <rect x={58} y={96} width={12} height={92} fill={fill} transform="rotate(-18 64 188)" />
    <rect x={60} y={86} width={78} height={12} fill={fill} transform="rotate(30 60 92)" />
    <path d="M120 100 L180 128 L160 162 L108 128Z" fill={fill} />
  </g>
);
/* ───── 通用補充 ───── */
const Cup: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M30 70 L150 70 L138 168 Q136 186 118 186 L62 186 Q44 186 42 168Z" fill={fill} />
    <path d="M146 88 Q192 88 186 122 Q180 152 138 150" stroke={fill} strokeWidth={14} fill="none" />
    <rect x={14} y={186} width={152} height={12} rx={6} fill={fill} />
    <path d="M84 96 Q100 84 116 96 Q108 128 90 150 Q72 128 84 96Z" fill={hole} />
    {[64, 96, 128].map((x, i) => <path key={i} d={`M${x} 54 Q${x - 12} 38 ${x} 24 Q${x + 12} 10 ${x} -4`} stroke={fill} strokeWidth={9} fill="none" strokeLinecap="round" />)}
  </g>
);
const Book: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M100 52 Q60 30 8 40 L8 172 Q60 162 100 184Z" fill={fill} />
    <path d="M100 52 Q140 30 192 40 L192 172 Q140 162 100 184Z" fill={fill} />
    {[70, 96, 122].map((y, i) => (
      <g key={i}>
        <path d={`M28 ${y} Q58 ${y - 6} 84 ${y + 6}`} stroke={hole} strokeWidth={7} fill="none" />
        <path d={`M116 ${y + 6} Q142 ${y - 6} 172 ${y}`} stroke={hole} strokeWidth={7} fill="none" />
      </g>
    ))}
    <rect x={96} y={52} width={8} height={132} fill={hole} />
  </g>
);
const Cake: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M16 110 L176 64 L184 186 L16 186Z" fill={fill} />
    <path d="M16 140 L182 116 L183 132 L16 156Z" fill={hole} />
    <path d="M16 110 L176 64 L178 82 Q150 100 120 94 Q90 112 60 104 Q36 120 16 120Z" fill={hole} opacity={0.55} />
    <circle cx={150} cy={50} r={20} fill={fill} />
    <path d="M150 30 Q160 10 176 6" stroke={fill} strokeWidth={6} fill="none" />
  </g>
);
const Laptop: React.FC<SP> = ({fill, hole}) => (
  <g>
    <rect x={30} y={30} width={140} height={100} rx={8} fill={fill} />
    <rect x={44} y={44} width={112} height={72} fill={hole} />
    <path d="M58 64 L76 80 L58 96 M88 98 L120 98" stroke={fill} strokeWidth={8} fill="none" />
    <path d="M6 140 L194 140 L180 170 L20 170Z" fill={fill} />
    <rect x={84} y={148} width={32} height={8} fill={hole} />
  </g>
);
const Clock: React.FC<SP> = ({fill, hole, t = 0}) => (
  <g>
    <circle cx={100} cy={106} r={86} fill={fill} />
    <circle cx={100} cy={106} r={66} fill={hole} />
    {Array.from({length: 12}, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return <circle key={i} cx={100 + Math.cos(a) * 54} cy={106 + Math.sin(a) * 54} r={i % 3 ? 3 : 6} fill={fill} />;
    })}
    <rect x={95} y={66} width={10} height={44} fill={fill} transform={`rotate(${t * 0.5} 100 106)`} />
    <rect x={96} y={52} width={8} height={58} fill={fill} transform={`rotate(${t * 6} 100 106)`} />
    <circle cx={100} cy={106} r={10} fill={fill} />
    <rect x={88} y={4} width={24} height={18} fill={fill} />
  </g>
);
const Pin: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M100 196 Q40 120 40 78 Q40 18 100 18 Q160 18 160 78 Q160 120 100 196Z" fill={fill} />
    <circle cx={100} cy={78} r={28} fill={hole} />
  </g>
);
const House: React.FC<SP> = ({fill, hole}) => (
  <g>
    <path d="M100 16 L192 92 L172 92 L172 196 L28 196 L28 92 L8 92Z" fill={fill} />
    <rect x={80} y={128} width={40} height={68} fill={hole} />
    <rect x={46} y={106} width={26} height={26} fill={hole} />
    <rect x={128} y={106} width={26} height={26} fill={hole} />
    <rect x={136} y={30} width={18} height={40} fill={fill} />
  </g>
);
const Ticket: React.FC<SP> = ({fill, hole}) => (
  <g transform="rotate(-12 100 100)">
    <path d="M10 56 L190 56 L190 84 Q174 100 190 116 L190 144 L10 144 L10 116 Q26 100 10 84Z" fill={fill} />
    <path d="M140 62 L140 138" stroke={hole} strokeWidth={5} strokeDasharray="10 8" />
    <rect x={32} y={78} width={88} height={12} fill={hole} />
    <rect x={32} y={100} width={60} height={10} fill={hole} />
  </g>
);

export const ICONS: Record<string, React.FC<SP>> = {
  student: Student, chef: Chef, plane: Plane, camera: Camera, chip: Chip, bag: Bag, family: Family, plate: Plate, filmcam: FilmCam,
  bus: Bus, lamp: Lamp, cup: Cup, book: Book, cake: Cake, laptop: Laptop, clock: Clock, pin: Pin, house: House, ticket: Ticket,
};
export const Icon: React.FC<SP & {name: string}> = ({name, ...p}) => {
  const I = ICONS[name] ?? Student;
  return <I {...p} />;
};
