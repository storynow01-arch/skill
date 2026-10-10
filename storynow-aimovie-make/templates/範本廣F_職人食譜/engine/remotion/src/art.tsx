/* 扁平插畫：料理檯、食材、烤箱、計時器、盤子、主角的手（全部以中心 0,0 為原點）。
   原作：02_試做/廣告30風格 第 15 支 ad15/art.tsx。通用化：麵粉袋的「麵粉」字改成麥穗圖樣、桌牌的店名改成刀叉圖樣、
   小卡的字讀 storyboard；新增打蛋碗（第 4 項材料）、蛋糕（第 4 個步驟）與手拿打蛋器／莓果。 */
import React from 'react';
import {random} from 'remotion';
import {C} from './core';
import {WENKAI as FONT} from './fonts';

const SH = 'rgba(70,45,20,0.18)';

/** 料理檯（亮木紋，靜態） */
export const Counter: React.FC = () => {
  const planks = Array.from({length: 7}, (_, i) => i);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
      {planks.map((i) => {
        const y = i * 160 - 40;
        const tone = 0.94 + random(`pl${i}`) * 0.08;
        const base = `rgb(${Math.round(232 * tone)},${Math.round(205 * tone)},${Math.round(164 * tone)})`;
        return (
          <g key={i}>
            <rect x={0} y={y} width={1920} height={160} fill={base} />
            {Array.from({length: 7}, (_, j) => {
              const yy = y + 18 + j * 20 + random(`g${i}${j}`) * 8;
              const a = 3 + random(`a${i}${j}`) * 5;
              const ph = random(`p${i}${j}`) * 6;
              let d = `M0,${yy}`;
              for (let x = 0; x <= 1920; x += 80) d += ` L${x},${(yy + Math.sin(x / 210 + ph) * a).toFixed(1)}`;
              return <path key={j} d={d} stroke="rgba(150,105,60,0.16)" strokeWidth={1.6 + random(`w${i}${j}`) * 1.5} fill="none" />;
            })}
            <rect x={0} y={y + 157} width={1920} height={3} fill="rgba(120,80,40,0.22)" />
            {random(`k${i}`) > 0.5 && <ellipse cx={300 + random(`kx${i}`) * 1500} cy={y + 80} rx={26} ry={9} fill="rgba(140,95,50,0.18)" />}
          </g>
        );
      })}
      {/* 亞麻布（右下，靜態） */}
      <g transform="translate(1560 930) rotate(-8)">
        <rect x={-260} y={-90} width={520} height={260} rx={6} fill="#EDE6DA" />
        {Array.from({length: 9}, (_, i) => <rect key={i} x={-260} y={-70 + i * 26} width={520} height={4} fill="rgba(110,140,170,0.35)" />)}
        <rect x={-260} y={-90} width={520} height={14} fill="rgba(110,140,170,0.55)" />
      </g>
      {/* 迷迭香、鹽罐 */}
      <g transform="translate(1000 960) rotate(18)">
        <rect x={-120} y={-3} width={240} height={6} rx={3} fill="#6A7F45" />
        {Array.from({length: 16}, (_, i) => (
          <ellipse key={i} cx={-110 + i * 14} cy={i % 2 ? -10 : 10} rx={11} ry={3.5} fill="#5E7A3E" transform={`rotate(${i % 2 ? -30 : 30} ${-110 + i * 14} ${i % 2 ? -10 : 10})`} />
        ))}
      </g>
      <circle cx={1270} cy={985} r={46} fill={SH} />
      <circle cx={1262} cy={976} r={46} fill="#F6F3EE" />
      <circle cx={1262} cy={976} r={34} fill="#FFFFFF" />
      {Array.from({length: 18}, (_, i) => <circle key={i} cx={1262 + Math.cos(i * 2.4) * (i * 1.6)} cy={976 + Math.sin(i * 2.4) * (i * 1.6)} r={2.2} fill="#D8D2C8" />)}
    </svg>
  );
};

/** 砧板＋蔥（chops＝已剁下的段數 0..4，各自的彈出進度） */
export const CuttingBoard: React.FC<{cuts: number[]}> = ({cuts}) => {
  const n = cuts.filter((c) => c > 0).length;
  return (
    <svg width={360} height={240} viewBox="-180 -120 360 240" style={{overflow: 'visible'}}>
      <rect x={-162} y={-98} width={330} height={210} rx={22} fill={SH} />
      <rect x={-170} y={-108} width={330} height={210} rx={22} fill="#C9935C" />
      <rect x={-156} y={-94} width={302} height={182} rx={16} fill="#D7A46B" />
      <circle cx={130} cy={-78} r={9} fill="#B07A45" />
      {/* 蔥：剩下的長段 */}
      <rect x={-120} y={-14} width={150 - n * 26} height={20} rx={10} fill="#7DB04A" />
      <rect x={-120} y={-14} width={70} height={20} rx={10} fill="#EEF3DA" />
      <path d={`M${30 - n * 26},-4 l60,-26 M${30 - n * 26},-4 l66,-8 M${30 - n * 26},-4 l58,14`} stroke="#6DA040" strokeWidth={8} strokeLinecap="round" />
      {/* 剁下的蔥花 */}
      {cuts.map((c, i) =>
        c > 0 ? (
          <g key={i} transform={`translate(${44 + i * 22 - n * 26 + 40} ${i % 2 ? 26 : 36}) scale(${c})`}>
            {[0, 1, 2].map((j) => (
              <circle key={j} cx={j * 9 - 9} cy={(j % 2) * 8} r={6.5} fill="#8FC25A" stroke="#E6F0C8" strokeWidth={2.5} />
            ))}
          </g>
        ) : null
      )}
    </svg>
  );
};

/** 麵粉袋（標籤畫麥穗圖樣，不寫字） */
export const Flour: React.FC = () => (
  <svg width={240} height={260} viewBox="-120 -130 240 260" style={{overflow: 'visible'}}>
    <path d="M-86,-96 Q0,-120 86,-96 L98,104 Q0,124 -98,104 Z" fill={SH} transform="translate(8 10)" />
    <path d="M-86,-96 Q0,-120 86,-96 L98,104 Q0,124 -98,104 Z" fill="#F1E6D0" />
    <path d="M-86,-96 Q0,-80 86,-96 L80,-70 Q0,-56 -80,-70 Z" fill="#E2D2B4" />
    <rect x={-62} y={-30} width={124} height={78} rx={8} fill="#C2553B" />
    <g stroke="#FFF4E0" strokeWidth={4} strokeLinecap="round" fill="#FFF4E0">
      <path d="M0,40 L0,-20" fill="none" />
      {[-12, 0, 12, 24].map((y, i) => (
        <g key={i}>
          <ellipse cx={-9} cy={y - 8} rx={5} ry={10} transform={`rotate(-30 -9 ${y - 8})`} />
          <ellipse cx={9} cy={y - 8} rx={5} ry={10} transform={`rotate(30 9 ${y - 8})`} />
        </g>
      ))}
      <ellipse cx={0} cy={-26} rx={5} ry={10} />
    </g>
    <ellipse cx={-30} cy={88} rx={28} ry={8} fill="#FFFFFF" opacity={0.8} />
  </svg>
);

/** 攪拌碗（egg＝蛋液出現進度 0..1） */
export const Bowl: React.FC<{egg: number}> = ({egg}) => (
  <svg width={220} height={220} viewBox="-110 -110 220 220" style={{overflow: 'visible'}}>
    <circle cx={8} cy={10} r={96} fill={SH} />
    <circle cx={0} cy={0} r={96} fill="#9CC3C9" />
    <circle cx={0} cy={0} r={78} fill="#F5F1EA" />
    <circle cx={0} cy={0} r={78} fill="none" stroke="#E2DCD2" strokeWidth={6} />
    {egg > 0 && (
      <g transform={`scale(${egg})`}>
        <path d="M-40,-8 Q-34,-40 2,-36 Q40,-34 38,0 Q36,34 0,34 Q-44,30 -40,-8 Z" fill="#FFFDF6" />
        <circle cx={-2} cy={-2} r={20} fill="#F6B323" />
        <circle cx={-8} cy={-8} r={6} fill="#FFD777" />
      </g>
    )}
  </svg>
);

/** 咖啡杯（fill＝牛奶倒入 0..1；heart＝拉花 0..1） */
export const Cup: React.FC<{fill: number; heart: number}> = ({fill, heart}) => (
  <svg width={240} height={240} viewBox="-120 -120 240 240" style={{overflow: 'visible'}}>
    <circle cx={10} cy={12} r={104} fill={SH} />
    <circle cx={0} cy={0} r={104} fill="#FFFFFF" />
    <circle cx={0} cy={0} r={104} fill="none" stroke="#EAE4DA" strokeWidth={3} />
    <rect x={64} y={-20} width={70} height={40} rx={20} fill="#FFFFFF" transform="rotate(30)" />
    <circle cx={0} cy={0} r={66} fill="#FBF8F3" />
    <circle cx={0} cy={0} r={60} fill="#6B3E22" />
    <circle cx={0} cy={0} r={60 * fill} fill="#C99A6B" />
    <circle cx={0} cy={0} r={46 * fill} fill="#D9B48A" />
    {heart > 0 && (
      <path transform={`scale(${heart * 1.25})`} d="M0,22 C-30,2 -30,-24 -12,-24 C-4,-24 0,-16 0,-12 C0,-16 4,-24 12,-24 C30,-24 30,2 0,22 Z" fill="#FFF8EE" />
    )}
  </svg>
);

/** 牛皮紙小籤 */
export const Tag: React.FC<{text: string}> = ({text}) => (
  <svg width={250} height={90} viewBox="-125 -45 250 90" style={{overflow: 'visible'}}>
    <path d="M-110,-32 L90,-32 L116,0 L90,32 L-110,32 Z" fill={SH} transform="translate(5 6)" />
    <path d="M-110,-32 L90,-32 L116,0 L90,32 L-110,32 Z" fill={C.kraft} />
    <circle cx={92} cy={0} r={6} fill="#EFE3CF" />
    <path d="M98,0 C130,-10 140,20 170,6" stroke="#B8463A" strokeWidth={3} fill="none" />
    <text x={-12} y={12} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={34} fill={C.ink}>{text}</text>
  </svg>
);

/** 桌牌（黑板小立牌，畫刀叉與咖啡熱氣圖樣，不寫字） */
export const Tent: React.FC = () => (
  <svg width={320} height={180} viewBox="-160 -90 320 180" style={{overflow: 'visible'}}>
    <rect x={-140} y={-66} width={290} height={150} rx={6} fill={SH} />
    <rect x={-148} y={-76} width={290} height={150} rx={6} fill="#2F4A3F" />
    <rect x={-138} y={-66} width={270} height={130} rx={4} fill="none" stroke="#E9D9B5" strokeWidth={3} />
    <g stroke="#F6EBD2" strokeWidth={6} strokeLinecap="round" fill="none">
      <path d="M-70,-40 L-70,44 M-82,-40 L-82,-10 Q-70,4 -58,-10 L-58,-40" />
      <path d="M58,44 L58,-40 Q80,-20 70,10 L58,10" />
    </g>
    <circle cx={-6} cy={6} r={34} fill="none" stroke={C.yellow} strokeWidth={5} />
    <path d="M-16,-46 q10,-12 0,-24 M2,-46 q10,-12 0,-24" stroke="#E9D9B5" strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

/** 小碟＋濃縮咖啡 */
export const Saucer: React.FC = () => (
  <svg width={150} height={150} viewBox="-75 -75 150 150" style={{overflow: 'visible'}}>
    <circle cx={6} cy={8} r={64} fill={SH} />
    <circle cx={0} cy={0} r={64} fill="#F7F4EF" />
    <circle cx={0} cy={0} r={40} fill="#FFFFFF" />
    <circle cx={0} cy={0} r={30} fill="#5A3019" />
    <circle cx={-6} cy={-6} r={10} fill="#8A5A36" opacity={0.6} />
  </svg>
);

/** 銀色餐蓋（飯店） */
export const Cloche: React.FC = () => (
  <svg width={260} height={260} viewBox="-130 -130 260 260" style={{overflow: 'visible'}}>
    <circle cx={12} cy={14} r={118} fill={SH} />
    <circle cx={0} cy={0} r={118} fill="#E8E8E6" />
    <circle cx={0} cy={0} r={100} fill="url(#clg)" />
    <defs>
      <radialGradient id="clg" cx="38%" cy="34%" r="70%">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="0.5" stopColor="#C9CCCF" />
        <stop offset="1" stopColor="#8E9399" />
      </radialGradient>
    </defs>
    <circle cx={0} cy={0} r={22} fill="#B8BCC0" />
    <circle cx={-4} cy={-4} r={12} fill="#F2F3F4" />
    <path d="M-60,-62 A86,86 0 0,1 30,-82" stroke="#FFFFFF" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.8} />
  </svg>
);

/** 廚師帽（俯視） */
export const Hat: React.FC = () => (
  <svg width={200} height={170} viewBox="-100 -85 200 170" style={{overflow: 'visible'}}>
    <ellipse cx={8} cy={10} rx={86} ry={70} fill={SH} />
    {[[-40, -20, 44], [10, -36, 46], [50, -4, 42], [-20, 26, 44], [30, 34, 40]].map(([x, y, r], i) => (
      <circle key={i} cx={x} cy={y} r={r} fill="#FFFFFF" stroke="#E7E3DC" strokeWidth={3} />
    ))}
    <rect x={-70} y={52} width={140} height={22} rx={8} fill="#F4F1EB" stroke="#E2DDD3" strokeWidth={2} />
  </svg>
);

/** 香料小碗 */
export const Spice: React.FC<{color: string; seed: number}> = ({color, seed}) => (
  <svg width={130} height={130} viewBox="-65 -65 130 130" style={{overflow: 'visible'}}>
    <circle cx={6} cy={7} r={54} fill={SH} />
    <circle cx={0} cy={0} r={54} fill="#3E5C76" />
    <circle cx={0} cy={0} r={42} fill={color} />
    {Array.from({length: 14}, (_, i) => (
      <circle key={i} cx={Math.cos(i * 2.39 + seed) * (6 + i * 2.2)} cy={Math.sin(i * 2.39 + seed) * (6 + i * 2.2)} r={2.5} fill="rgba(0,0,0,0.18)" />
    ))}
  </svg>
);

/** 八角 */
export const Anise: React.FC = () => (
  <svg width={80} height={80} viewBox="-40 -40 80 80">
    {Array.from({length: 8}, (_, i) => (
      <ellipse key={i} cx={0} cy={-18} rx={8} ry={17} fill="#7A3F22" transform={`rotate(${i * 45})`} />
    ))}
    <circle r={6} fill="#5A2C16" />
  </svg>
);

/** 烤盤（dough＝麵團出現 0..1） */
export const Dish: React.FC<{dough: number}> = ({dough}) => (
  <svg width={380} height={260} viewBox="-190 -130 380 260" style={{overflow: 'visible'}}>
    <rect x={-170} y={-104} width={356} height={226} rx={40} fill={SH} />
    <rect x={-178} y={-114} width={356} height={226} rx={40} fill="#F4EFE6" />
    <rect x={-150} y={-88} width={300} height={174} rx={28} fill="#E36C4F" />
    <rect x={-138} y={-76} width={276} height={150} rx={22} fill="#F7F1E8" />
    {dough > 0 && (
      <g transform={`scale(${dough})`}>
        <ellipse cx={0} cy={0} rx={112} ry={58} fill="#EBC27F" />
        <ellipse cx={-20} cy={-14} rx={60} ry={24} fill="#F6D79C" />
        {[-60, -20, 20, 60].map((x) => <path key={x} d={`M${x - 14},-30 l28,60`} stroke="#C8934A" strokeWidth={6} strokeLinecap="round" />)}
      </g>
    )}
  </svg>
);

/** 烤箱（正面扁平）：door＝門關上程度 0..1；glow＝爐內熱度 0..1；inside＝門開時看到的東西 */
export const Oven: React.FC<{door: number; glow: number; inside?: React.ReactNode}> = ({door, glow, inside}) => (
  <div style={{position: 'relative', width: 480, height: 680}}>
    <svg width={480} height={680} viewBox="0 0 480 680" style={{position: 'absolute', left: 0, top: 0}}>
      <rect x={16} y={18} width={460} height={660} rx={26} fill="rgba(60,40,20,0.22)" />
      <rect x={0} y={0} width={460} height={650} rx={26} fill="#E5E1DA" />
      <rect x={0} y={0} width={460} height={120} rx={26} fill="#C9C3B8" />
      <rect x={0} y={90} width={460} height={30} fill="#C9C3B8" />
      {[90, 170, 290, 370].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy={60} r={28} fill="#3A3A3A" />
          <circle cx={x} cy={60} r={20} fill="#555" />
          <rect x={x - 3} y={36} width={6} height={22} rx={3} fill="#EDEDED" transform={`rotate(${i * 50 - 40} ${x} 60)`} />
        </g>
      ))}
      <rect x={210} y={44} width={40} height={32} rx={6} fill="#2D2D2D" />
      <circle cx={230} cy={60} r={6} fill={glow > 0.02 ? '#FF9A3C' : '#553'} />
      {/* 爐腔 */}
      <rect x={30} y={150} width={400} height={460} rx={18} fill="#3B2E28" />
      <rect x={30} y={150} width={400} height={460} rx={18} fill="#FF8A2A" opacity={0.15 + glow * 0.55} />
      {[260, 420].map((y) => <rect key={y} x={44} y={y} width={372} height={6} rx={3} fill="#8B7C70" />)}
      <path d="M60,580 Q90,560 120,580 T180,580 T240,580 T300,580 T360,580 T400,580" stroke={glow > 0.05 ? '#FF6A1A' : '#704D3A'} strokeWidth={8} fill="none" />
    </svg>
    <div style={{position: 'absolute', left: 30, top: 150, width: 400, height: 460, overflow: 'hidden', borderRadius: 18}}>{inside}</div>
    {/* 門：由下往上翻起 */}
    <div style={{position: 'absolute', left: 20, top: 140, width: 420, height: 480, transform: `scaleY(${door})`, transformOrigin: '50% 100%', opacity: door > 0.02 ? 1 : 0}}>
      <svg width={420} height={480} viewBox="0 0 420 480">
        <rect x={0} y={0} width={420} height={480} rx={20} fill="#D8D3CA" />
        <rect x={60} y={20} width={300} height={22} rx={11} fill="#9C9286" />
        <rect x={40} y={80} width={340} height={300} rx={18} fill="#2A201C" />
        <rect x={40} y={80} width={340} height={300} rx={18} fill="url(#ovg)" opacity={0.25 + glow * 0.75} />
        <defs>
          <radialGradient id="ovg" cx="50%" cy="60%" r="65%">
            <stop offset="0" stopColor="#FFC060" />
            <stop offset="0.6" stopColor="#E86A20" />
            <stop offset="1" stopColor="#5A2A14" />
          </radialGradient>
        </defs>
        <ellipse cx={210} cy={250} rx={110} ry={44} fill="#3A2416" opacity={0.55} />
        <ellipse cx={210} cy={240} rx={86} ry={30} fill="#C47A30" opacity={0.25 + glow * 0.6} />
        <path d="M70,110 L150,110" stroke="#FFFFFF" strokeWidth={8} strokeLinecap="round" opacity={0.25} />
      </svg>
    </div>
  </div>
);

/** 計時器：angle＝刻度盤轉角 */
export const Timer: React.FC<{angle: number}> = ({angle}) => (
  <svg width={240} height={240} viewBox="-120 -120 240 240" style={{overflow: 'visible'}}>
    <circle cx={10} cy={12} r={100} fill={SH} />
    <circle cx={0} cy={0} r={100} fill="#E8664E" />
    <circle cx={0} cy={0} r={84} fill="#F8F3EA" />
    <g transform={`rotate(${angle})`}>
      {Array.from({length: 24}, (_, i) => (
        <rect key={i} x={-2} y={-80} width={4} height={i % 4 === 0 ? 20 : 10} rx={2} fill={i % 4 === 0 ? '#4A3426' : '#9A8A7A'} transform={`rotate(${i * 15})`} />
      ))}
      <rect x={-14} y={-50} width={28} height={100} rx={14} fill="#E8664E" />
      <rect x={-6} y={-40} width={12} height={80} rx={6} fill="#F59A84" />
    </g>
    <path d="M0,-108 L-12,-126 L12,-126 Z" fill="#4A3426" />
  </svg>
);

/** 盤子（俯視）：只畫瓷盤本身，擺盤內容另外疊 */
export const Plate: React.FC = () => (
  <svg width={620} height={620} viewBox="-310 -310 620 620" style={{overflow: 'visible'}}>
    <circle cx={14} cy={18} r={288} fill="rgba(70,45,20,0.2)" />
    <circle cx={0} cy={0} r={288} fill="#FBFAF6" />
    <circle cx={0} cy={0} r={288} fill="none" stroke="#E6E1D7" strokeWidth={4} />
    <circle cx={0} cy={0} r={222} fill="#F3F0EA" />
    <circle cx={0} cy={0} r={222} fill="none" stroke="#E8E3DA" strokeWidth={6} />
    <circle cx={0} cy={0} r={262} fill="none" stroke="#2F5E7A" strokeWidth={3} opacity={0.5} />
    <path d="M-200,-170 A262,262 0 0,1 -40,-258" stroke="#FFFFFF" strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.9} />
  </svg>
);

/** 出處小卡（標題＋網址或電話，都讀 storyboard） */
export const Card: React.FC<{head: string; url: string}> = ({head, url}) => (
  <svg width={480} height={220} viewBox="-240 -110 480 220" style={{overflow: 'visible'}}>
    <rect x={-222} y={-88} width={460} height={190} rx={8} fill={SH} />
    <rect x={-230} y={-98} width={460} height={190} rx={8} fill="#F4E6CC" />
    <rect x={-218} y={-86} width={436} height={166} rx={5} fill="none" stroke="#C9A877" strokeWidth={2} strokeDasharray="8 6" />
    {head && <text x={0} y={url ? -22 : 10} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={34} fill={C.sauce}>{head}</text>}
    {url && <text x={0} y={head ? 36 : 10} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={30} fill={C.ink}>{url}</text>}
  </svg>
);

/** 打蛋碗（mix＝打蛋器攪拌進度 0..1：蛋液慢慢變成滑順的麵糊） */
export const WhiskBowl: React.FC<{mix: number}> = ({mix}) => (
  <svg width={240} height={240} viewBox="-120 -120 240 240" style={{overflow: 'visible'}}>
    <circle cx={8} cy={10} r={104} fill={SH} />
    <circle cx={0} cy={0} r={104} fill="#E9C46A" />
    <circle cx={0} cy={0} r={86} fill="#F5F1EA" />
    <circle cx={0} cy={0} r={70} fill="#F3DFA8" />
    <circle cx={-14} cy={-6} r={20 * (1 - mix)} fill="#F6B323" />
    <circle cx={18} cy={12} r={18 * (1 - mix)} fill="#F6B323" />
    <path d={`M-48,0 Q-24,${-26 * mix} 0,0 T48,0`} stroke="#E8C77A" strokeWidth={6} fill="none" opacity={mix} strokeLinecap="round" />
    <path d={`M-40,24 Q-16,${4 - 20 * mix} 8,24 T50,22`} stroke="#E8C77A" strokeWidth={5} fill="none" opacity={mix} strokeLinecap="round" />
  </svg>
);

/** 蛋糕（俯視一小片在盤上；berry＝莓果放上去 0..1） */
export const Cake: React.FC<{berry: number}> = ({berry}) => (
  <svg width={240} height={240} viewBox="-120 -120 240 240" style={{overflow: 'visible'}}>
    <circle cx={8} cy={10} r={100} fill={SH} />
    <circle cx={0} cy={0} r={100} fill="#FFFFFF" />
    <circle cx={0} cy={0} r={100} fill="none" stroke="#E6E1D7" strokeWidth={3} />
    <path d="M-60,50 L0,-70 L60,50 Z" fill="#E9C99A" />
    <path d="M-48,36 L0,-56 L48,36 Z" fill="#F6E7CE" />
    <path d="M-60,50 L60,50 L56,62 L-56,62 Z" fill="#C99A62" />
    <path d="M-30,-6 Q0,-20 30,-6" stroke="#FFFFFF" strokeWidth={8} fill="none" strokeLinecap="round" />
    {berry > 0 && (
      <g transform={`translate(0 -4) scale(${berry})`}>
        <path d="M-14,-6 Q0,-24 14,-6 Q14,16 0,22 Q-14,16 -14,-6 Z" fill="#D9364A" />
        <path d="M-8,-12 L0,-20 L8,-12" stroke="#5C8B39" strokeWidth={4} fill="none" strokeLinecap="round" />
        {[[-5, 0], [5, 2], [0, 10], [-4, 12]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.6} fill="#FFE07A" />)}
      </g>
    )}
  </svg>
);

/* ───── 主角：主廚的手（指尖在 0,0；手臂往 -y 延伸出畫面） ───── */
export type Tool = 'none' | 'chalk' | 'eraser' | 'cleaver' | 'egg' | 'pitcher' | 'pinch' | 'whisk' | 'berry';
export const Hand: React.FC<{grip: number; tool: Tool; pour?: number}> = ({grip, tool, pour = 0}) => {
  const fl = 62 * (1 - grip * 0.45);
  const toolEl = (() => {
    switch (tool) {
      case 'chalk':
        return <rect x={-7} y={-26} width={14} height={46} rx={5} fill={C.chalk} transform="rotate(-20)" />;
      case 'eraser':
        return (
          <g transform="translate(0 -30)">
            <rect x={-80} y={-34} width={160} height={74} rx={10} fill="#B58552" />
            <rect x={-80} y={24} width={160} height={18} rx={6} fill="#5C6670" />
            <rect x={-70} y={-24} width={140} height={10} rx={5} fill="#C99A68" />
          </g>
        );
      case 'cleaver':
        return (
          <g transform="translate(0 -20) rotate(-8)">
            <rect x={-20} y={-60} width={34} height={100} rx={10} fill="#5A3A26" />
            <rect x={-150} y={6} width={190} height={92} rx={8} fill="#C9CDD1" />
            <rect x={-150} y={84} width={190} height={14} rx={6} fill="#EEF1F3" />
            <circle cx={-128} cy={30} r={9} fill="#8D9399" />
          </g>
        );
      case 'egg':
        return <ellipse cx={0} cy={6} rx={34} ry={44} fill="#F3E2C7" stroke="#E3CDA9" strokeWidth={3} />;
      case 'pitcher':
        return (
          <g transform={`rotate(${pour * 35})`}>
            <circle cx={0} cy={-10} r={52} fill="#D5D9DD" />
            <circle cx={0} cy={-10} r={40} fill="#F4EEE4" />
            <path d="M40,-30 L76,-10 L40,10 Z" fill="#C5CACF" />
          </g>
        );
      case 'whisk':
        return (
          <g transform="translate(0 6)">
            <rect x={-8} y={-40} width={16} height={40} rx={6} fill="#5A3A26" />
            {[-18, -6, 6, 18].map((x, i) => <path key={i} d={`M0,0 Q${x * 2.4},40 0,78 Q${-x * 0.6},40 0,0`} stroke="#C9CDD1" strokeWidth={4} fill="none" />)}
          </g>
        );
      case 'berry':
        return (
          <g transform="translate(0 10)">
            <path d="M-14,-6 Q0,-24 14,-6 Q14,16 0,22 Q-14,16 -14,-6 Z" fill="#D9364A" />
            <path d="M-8,-12 L0,-20 L8,-12" stroke="#5C8B39" strokeWidth={4} fill="none" strokeLinecap="round" />
          </g>
        );
      default:
        return null;
    }
  })();
  return (
    <svg width={400} height={1600} viewBox="-200 -1500 400 1600" style={{overflow: 'visible', position: 'absolute', left: -200, top: -1500}}>
      {/* 影子 */}
      <g transform="translate(22 26)" opacity={0.16}>
        <rect x={-74} y={-1500} width={148} height={1360} rx={40} fill="#3A2410" />
        <ellipse cx={0} cy={-96} rx={70} ry={78} fill="#3A2410" />
      </g>
      {tool === 'eraser' || tool === 'cleaver' || tool === 'pitcher' ? toolEl : null}
      {/* 袖子（白色廚師服）＋袖口 */}
      <rect x={-78} y={-1500} width={156} height={1340} rx={36} fill="#FBFAF7" />
      <rect x={-78} y={-1500} width={30} height={1340} fill="#ECE8E1" />
      <rect x={-82} y={-210} width={164} height={42} rx={14} fill="#E9E4DA" />
      <rect x={-82} y={-196} width={164} height={8} fill="#C9463A" />
      {/* 手掌 */}
      <ellipse cx={0} cy={-104} rx={64} ry={70} fill="#EDB88E" />
      <ellipse cx={14} cy={-112} rx={36} ry={40} fill="#F4C9A2" />
      {/* 大拇指 */}
      <rect x={-22} y={-42} width={30} height={78 - grip * 20} rx={15} fill="#E2A97E" transform={`rotate(${48 - grip * 20} -60 -96) translate(-64 -110)`} />
      {/* 四指 */}
      {[-36, -12, 12, 36].map((x, i) => {
        const len = fl * (i === 0 || i === 3 ? 0.86 : 1);
        return (
          <g key={i}>
            <rect x={x - 11} y={-62} width={22} height={len + 10} rx={11} fill={i % 2 ? '#E9B286' : '#EDB88E'} />
            <rect x={x - 6} y={-62 + len - 6} width={12} height={10} rx={5} fill="#F7D6BC" />
          </g>
        );
      })}
      {tool === 'chalk' || tool === 'egg' || tool === 'whisk' || tool === 'berry' ? toolEl : null}
      {tool === 'pinch' && <circle cx={0} cy={4} r={7} fill="#B5462E" />}
    </svg>
  );
};
