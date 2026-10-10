/* 範本廣J 直播房間（原作第 20 支照搬，只改 SVG id）（世界座標；手機螢幕在世界 x 690..1230、y 60..1020）
   WallLayer＝遠景牆面（鏡頭早一拍先動），FrontLayer＝環形燈、腳架、桌面（跟手機同一個鏡頭） */
import React from 'react';

/* 牆面：一次畫好的靜態 SVG */
export const Wall: React.FC = () => (
  <svg style={{position: 'absolute', left: -1400, top: -900}} width={5200} height={2300} viewBox="-1400 -900 5200 2300">
    <defs>
      <linearGradient id="ajwall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFEFE3" />
        <stop offset="1" stopColor="#FFD8C6" />
      </linearGradient>
      <linearGradient id="ajsky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#A8DDFB" />
        <stop offset="1" stopColor="#FFF1D8" />
      </linearGradient>
      <radialGradient id="ajsun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFF6D8" stopOpacity="0.9" />
        <stop offset="1" stopColor="#FFF6D8" stopOpacity="0" />
      </radialGradient>
      <pattern id="ajdots" width="90" height="90" patternUnits="userSpaceOnUse">
        <circle cx="45" cy="45" r="7" fill="#FFC9B4" opacity="0.55" />
      </pattern>
    </defs>
    <rect x={-1400} y={-900} width={5200} height={2300} fill="url(#ajwall)" />
    <rect x={-1400} y={-900} width={5200} height={2300} fill="url(#ajdots)" />
    {/* 窗戶（左） */}
    <g>
      <rect x={-960} y={-160} width={700} height={820} rx={40} fill="#FFFFFF" />
      <rect x={-930} y={-130} width={640} height={760} rx={26} fill="url(#ajsky)" />
      <circle cx={-480} cy={40} r={180} fill="url(#ajsun)" />
      <ellipse cx={-760} cy={120} rx={90} ry={34} fill="#fff" opacity={0.85} />
      <ellipse cx={-700} cy={100} rx={70} ry={40} fill="#fff" opacity={0.85} />
      <rect x={-615} y={-130} width={10} height={760} fill="#fff" />
      <rect x={-930} y={240} width={640} height={10} fill="#fff" />
      <path d="M-1000 -200 Q -900 250 -1010 700 L -1100 700 L -1100 -200 Z" fill="#FF9DB8" />
      <path d="M-220 -200 Q -320 250 -210 700 L -120 700 L -120 -200 Z" fill="#FF9DB8" />
      <rect x={-1120} y={-215} width={1020} height={22} rx={11} fill="#C98B63" />
    </g>
    {/* 串燈 */}
    <path d="M-1400 -260 Q -500 -120 400 -250 Q 1300 -110 2200 -250 Q 3000 -130 3800 -250" fill="none" stroke="#B78A6A" strokeWidth={4} />
    {Array.from({length: 46}, (_, i) => {
      const x = -1380 + i * 112;
      const seg = Math.floor((x + 1400) / 900);
      const u = ((x + 1400) % 900) / 900;
      const y = -258 + Math.sin(u * Math.PI) * 120 - (seg === 0 ? 0 : 0);
      const c = ['#FFD45C', '#FF8FB1', '#FFB36B', '#9EDCF0'][i % 4];
      return (
        <g key={i}>
          <circle cx={x} cy={y + 22} r={26} fill={c} opacity={0.25} />
          <circle cx={x} cy={y + 22} r={11} fill={c} />
        </g>
      );
    })}
    {/* 左邊層架：植物、書、相框 */}
    <g>
      <rect x={60} y={300} width={520} height={22} rx={8} fill="#C98B63" />
      <rect x={110} y={196} width={36} height={104} rx={6} fill="#8FC9E6" />
      <rect x={150} y={180} width={30} height={120} rx={6} fill="#FFB36B" />
      <rect x={184} y={210} width={40} height={90} rx={6} fill="#FF8FB1" />
      <path d="M330 300 L 320 230 L 420 230 L 410 300 Z" fill="#F6A07A" />
      <path d="M370 232 C 330 160 300 150 280 120 C 330 130 360 170 370 232 C 380 150 410 120 450 100 C 430 150 400 180 370 232" fill="#7CC98A" />
      <rect x={470} y={170} width={96} height={124} rx={10} fill="#fff" />
      <rect x={482} y={182} width={72} height={86} rx={6} fill="#FFE1B8" />
      <circle cx={518} cy={226} r={22} fill="#EE9A4D" />
      <circle cx={510} cy={222} r={3} fill="#3B2620" />
      <circle cx={526} cy={222} r={3} fill="#3B2620" />
    </g>
    {/* 右邊招牌板（揭曉時亮燈） */}
    <rect x={1560} y={110} width={1200} height={640} rx={60} fill="#FFF8F1" stroke="#FFC7B0" strokeWidth={10} />
    {/* 右側落地燈與貓爬架色塊 */}
    <g>
      <rect x={2960} y={-80} width={14} height={1200} fill="#B78A6A" />
      <path d="M2860 -80 L 3080 -80 L 3030 -230 L 2910 -230 Z" fill="#FFC75C" />
      <ellipse cx={2967} cy={-60} rx={140} ry={60} fill="#FFE9A8" opacity={0.5} />
      <rect x={3150} y={240} width={300} height={40} rx={20} fill="#E7B86A" />
      <rect x={3260} y={280} width={60} height={840} fill="#E7B86A" />
      <circle cx={3290} cy={520} r={70} fill="#FF9DB8" />
    </g>
  </svg>
);

/* 前景：環形燈（在手機後面）、腳架、桌面與桌上的小東西 */
export const RingLight: React.FC<{glow: number}> = ({glow}) => (
  <svg style={{position: 'absolute', left: 160, top: -260}} width={1600} height={1600} viewBox="160 -260 1600 1600">
    <defs>
      <radialGradient id="ajring" cx="960" cy="540" r="760" gradientUnits="userSpaceOnUse">
        <stop offset="0.7" stopColor="#FFF4E8" stopOpacity="0" />
        <stop offset="0.79" stopColor="#FFF4E8" stopOpacity="0.95" />
        <stop offset="0.84" stopColor="#FFF4E8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <circle cx={960} cy={540} r={760} fill="url(#ajring)" opacity={0.5 + glow * 0.5} />
    <circle cx={960} cy={540} r={620} fill="none" stroke="#FFFDF8" strokeWidth={44} />
    <circle cx={960} cy={540} r={620} fill="none" stroke="#F3E3D6" strokeWidth={8} strokeDasharray="4 30" opacity={0.6} />
  </svg>
);

export const Desk: React.FC = () => (
  <svg style={{position: 'absolute', left: -1400, top: 960}} width={5200} height={1000} viewBox="-1400 960 5200 1000">
    {/* 腳架 */}
    <rect x={944} y={1020} width={32} height={110} fill="#4A3F55" />
    <path d="M960 1100 L 870 1140 M960 1100 L 1050 1140" stroke="#4A3F55" strokeWidth={14} strokeLinecap="round" />
    {/* 桌面 */}
    <rect x={-1400} y={1128} width={5200} height={40} fill="#EBC199" />
    <rect x={-1400} y={1168} width={5200} height={800} fill="#D9A276" />
    <rect x={-1400} y={1168} width={5200} height={10} fill="#C78E62" />
    {/* 出貨紙箱（貼肉球膠帶） */}
    <g>
      <rect x={60} y={960} width={260} height={170} rx={8} fill="#D6A26E" />
      <rect x={60} y={1030} width={260} height={30} fill="#FF8FB1" />
      <rect x={340} y={1010} width={200} height={120} rx={8} fill="#E2B27E" />
      <rect x={340} y={1056} width={200} height={24} fill="#FFB36B" />
      <rect x={100} y={880} width={200} height={84} rx={8} fill="#E8BD8C" />
      <rect x={100} y={910} width={200} height={20} fill="#9EDCF0" />
    </g>
    {/* 筆電（螢幕上是商店後台） */}
    <g>
      <path d="M1460 1128 L 1940 1128 L 1990 1150 L 1410 1150 Z" fill="#B9B3C9" />
      <rect x={1490} y={826} width={420} height={300} rx={14} fill="#4A3F55" />
      <rect x={1506} y={842} width={388} height={268} rx={6} fill="#FFF6F0" />
      <rect x={1506} y={842} width={388} height={40} fill="#FF7A8F" />
      <rect x={1530} y={1000} width={36} height={90} rx={4} fill="#FFB36B" />
      <rect x={1580} y={960} width={36} height={130} rx={4} fill="#FF8A7A" />
      <rect x={1630} y={920} width={36} height={170} rx={4} fill="#FF5C8A" />
      <path d="M1700 1060 L 1760 1010 L 1810 1030 L 1870 950" fill="none" stroke="#7A63A8" strokeWidth={8} strokeLinecap="round" />
    </g>
    {/* 馬克杯、骨頭玩偶 */}
    <rect x={2140} y={1040} width={90} height={90} rx={14} fill="#9EDCF0" />
    <path d="M2230 1060 Q 2270 1080 2230 1110" fill="none" stroke="#9EDCF0" strokeWidth={12} />
    <rect x={-300} y={1080} width={160} height={40} rx={20} fill="#FFF3D6" />
  </svg>
);
