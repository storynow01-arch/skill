/* 範本L 黏土小道具（2026-10-08 從屏榮黏土玩具風搬來，拿掉校名等寫死的字；通用新物件在 objects.tsx）：
   全部以「底部中央」為落地點，寬高 = 基準尺寸 × s。
   填色用 kit 的 G()（直向頂亮底暗）與 R()（球面）漸層，做出軟軟有厚度的感覺。 */
import React from 'react';
import {BALOO, CREAM, FAT, G, MU, NV, OR, R, TC, mix} from './kit';

export type S = {s?: number};
export const Svg: React.FC<{w: number; h: number; s: number; children: React.ReactNode}> = ({w, h, s, children}) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={w * s} height={h * s} style={{overflow: 'visible', display: 'block'}}>{children}</svg>
);

/** 路牌（三塊箭頭板） */
export const SignPost: React.FC<S & {labels?: string[]}> = ({s = 1, labels = ['？', '？', '？']}) => (
  <Svg w={300} h={330} s={s}>
    <rect x={138} y={60} width={24} height={262} rx={10} fill={G('wd')} />
    <ellipse cx={150} cy={322} rx={40} ry={9} fill={mix('#b97a45', '#000000', 0.3)} />
    <g transform="rotate(-6 150 90)">
      <path d="M 40 60 L 230 60 Q 244 60 244 74 L 244 104 Q 244 118 230 118 L 40 118 L 10 89 Z" fill={G('o')} />
      <text x={130} y={106} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={44} fill="#fff">{labels[0]}</text>
    </g>
    <g transform="rotate(5 150 160)">
      <path d="M 70 132 L 260 132 L 290 161 L 260 190 L 70 190 Q 56 190 56 176 L 56 146 Q 56 132 70 132 Z" fill={G('g')} />
      <text x={170} y={178} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={44} fill="#fff">{labels[1]}</text>
    </g>
    <g transform="rotate(-3 150 230)">
      <path d="M 60 204 L 220 204 L 246 232 L 220 260 L 60 260 Q 46 260 46 246 L 46 218 Q 46 204 60 204 Z" fill={G('y')} />
      <text x={146} y={248} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={42} fill="#fff">{labels[2]}</text>
    </g>
    <circle cx={150} cy={52} r={14} fill={R('wd')} />
  </Svg>
);

/** 小樹叢（三顆黏土球） */
export const Bush: React.FC<S & {c?: string}> = ({s = 1, c = 'g'}) => (
  <Svg w={140} h={100} s={s}>
    <circle cx={40} cy={64} r={34} fill={R(c)} />
    <circle cx={100} cy={64} r={34} fill={R(c)} />
    <circle cx={70} cy={44} r={40} fill={R(c)} />
  </Svg>
);

/** 書（直立書背，可放文字） */
export const Spine: React.FC<{w: number; h: number; c: string; text: string; star?: boolean; size?: number}> = ({w, h, c, text, star, size = 38}) => (
  <div style={{width: w, height: h, borderRadius: 16, position: 'relative',
    background: `linear-gradient(to right, ${mix(c, '#000000', 0.18)}, ${mix(c, '#ffffff', 0.22)} 30%, ${c} 62%, ${mix(c, '#000000', 0.25)})`,
    boxShadow: `inset 0 4px 0 rgba(255,255,255,0.35), inset 0 -6px 0 rgba(0,0,0,0.15), 0 10px 16px rgba(70,50,30,0.25)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 22, height: 8, background: 'rgba(255,255,255,0.45)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 22, height: 8, background: 'rgba(255,255,255,0.45)'}} />
    {star && <div style={{position: 'absolute', top: 26, fontSize: 26, color: '#fff'}}>★</div>}
    <div style={{writingMode: 'vertical-rl', fontFamily: TC, fontWeight: 900, fontSize: size, color: '#fff', letterSpacing: 2,
      textShadow: `0 2px 0 ${mix(c, '#000000', 0.35)}`, marginTop: star ? 44 : 0}}>{text}</div>
  </div>
);

/** 橫放的書（疊講台用） */
export const FlatBook: React.FC<{w: number; c: string; h?: number}> = ({w, c, h = 62}) => (
  <div style={{width: w, height: h, borderRadius: 14, position: 'relative',
    background: `linear-gradient(to bottom, ${mix(c, '#ffffff', 0.3)}, ${c} 45%, ${mix(c, '#000000', 0.25)})`,
    boxShadow: `inset 0 3px 0 rgba(255,255,255,0.35), 0 8px 12px rgba(70,50,30,0.22)`}}>
    <div style={{position: 'absolute', right: 10, top: 10, bottom: 10, width: '72%', borderRadius: 8,
      background: 'repeating-linear-gradient(to bottom, #fbf8f2 0 5px, #e6dfd2 5px 7px)'}} />
  </div>
);

/** 購物車 */
export const Cart: React.FC<S> = ({s = 1}) => (
  <Svg w={300} h={250} s={s}>
    <path d="M 12 30 L 58 30 L 70 62" stroke={NV} strokeWidth={14} strokeLinecap="round" fill="none" />
    <path d="M 62 60 L 286 60 Q 296 60 293 72 L 268 168 Q 265 180 252 180 L 96 180 Q 84 180 82 168 Z" fill={G('o')} />
    {[110, 150, 190, 230].map((x) => <line key={x} x1={x} y1={70} x2={x - 4} y2={170} stroke="rgba(255,255,255,0.45)" strokeWidth={6} strokeLinecap="round" />)}
    <line x1={80} y1={100} x2={282} y2={100} stroke="rgba(255,255,255,0.45)" strokeWidth={6} />
    <line x1={88} y1={140} x2={272} y2={140} stroke="rgba(255,255,255,0.45)" strokeWidth={6} />
    <path d="M 96 180 L 92 206 L 262 206" stroke={NV} strokeWidth={12} strokeLinecap="round" fill="none" />
    <circle cx={112} cy={226} r={20} fill={R('b')} />
    <circle cx={242} cy={226} r={20} fill={R('b')} />
    <circle cx={112} cy={226} r={7} fill="#fff" opacity={0.6} />
    <circle cx={242} cy={226} r={7} fill="#fff" opacity={0.6} />
  </Svg>
);

/** 腳掌印 */
export const Paw: React.FC<S & {c?: string}> = ({s = 1, c = 'br'}) => (
  <Svg w={70} h={70} s={s}>
    <ellipse cx={35} cy={46} rx={18} ry={15} fill={R(c)} />
    <circle cx={14} cy={28} r={8} fill={R(c)} />
    <circle cx={27} cy={15} r={8} fill={R(c)} />
    <circle cx={43} cy={15} r={8} fill={R(c)} />
    <circle cx={56} cy={28} r={8} fill={R(c)} />
  </Svg>
);

/** 金色獎盃 */
export const Trophy: React.FC<S> = ({s = 1}) => (
  <Svg w={220} h={270} s={s}>
    <path d="M 52 40 Q 6 40 14 84 Q 22 120 70 124" stroke={'#c99a22'} strokeWidth={14} fill="none" strokeLinecap="round" />
    <path d="M 168 40 Q 214 40 206 84 Q 198 120 150 124" stroke={'#c99a22'} strokeWidth={14} fill="none" strokeLinecap="round" />
    <path d="M 40 20 L 180 20 Q 180 140 110 158 Q 40 140 40 20 Z" fill={G('gd')} />
    <ellipse cx={110} cy={22} rx={70} ry={12} fill={mix('#e9b93a', '#ffffff', 0.35)} />
    <ellipse cx={80} cy={70} rx={10} ry={28} fill="#fff" opacity={0.35} />
    <text x={110} y={110} textAnchor="middle" fontFamily={FAT} fontWeight={900} fontSize={54} fill="#fff" opacity={0.9}>★</text>
    <rect x={96} y={154} width={28} height={40} fill={G('gd')} />
    <rect x={60} y={192} width={100} height={26} rx={8} fill={G('gd')} />
    <rect x={44} y={216} width={132} height={50} rx={12} fill={G('br')} />
    <rect x={74} y={230} width={72} height={22} rx={5} fill={mix('#e9b93a', '#ffffff', 0.2)} />
  </Svg>
);

/** 證書（紙張＋紅色緞帶章） */
export const Cert: React.FC<S & {title?: string}> = ({s = 1, title}) => (
  <Svg w={240} h={190} s={s}>
    <g transform="rotate(-4 120 95)">
      <rect x={14} y={14} width={212} height={156} rx={14} fill={mix(CREAM, '#000000', 0.12)} />
      <rect x={10} y={8} width={212} height={156} rx={14} fill={G('w')} />
      <rect x={22} y={20} width={188} height={132} rx={8} fill="none" stroke={MU} strokeWidth={4} />
      {title ? (
        <text x={116} y={66} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={30} fill={NV}>{title}</text>
      ) : <rect x={56} y={44} width={120} height={14} rx={7} fill={NV} opacity={0.8} />}
      <rect x={46} y={86} width={140} height={8} rx={4} fill="#cfc6b6" />
      <rect x={46} y={104} width={110} height={8} rx={4} fill="#cfc6b6" />
      <path d="M 170 128 L 160 176 L 174 168 L 184 180 L 190 132 Z" fill={G('r')} />
      <circle cx={180} cy={126} r={22} fill={R('r')} />
      <circle cx={180} cy={126} r={12} fill="none" stroke="#fff" strokeWidth={3} opacity={0.7} />
    </g>
  </Svg>
);

/** 小黑板 */
export const Board: React.FC<{text?: string}> = ({text = 'ABC'}) => (
  <div style={{width: 300, height: 210, borderRadius: 22, padding: 16, boxSizing: 'border-box',
    background: `linear-gradient(to bottom, ${mix('#b97a45', '#ffffff', 0.25)}, #b97a45 50%, ${mix('#b97a45', '#000000', 0.25)})`,
    boxShadow: '0 10px 0 #7d4f2a, 0 22px 26px rgba(70,50,30,0.25)'}}>
    <div style={{width: '100%', height: '100%', borderRadius: 12, background: 'linear-gradient(to bottom, #3f7a5c, #2d5e45)',
      boxShadow: 'inset 0 6px 12px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: TC, fontWeight: 900, fontSize: 64, color: '#f4f1e8', letterSpacing: 6}}>{text}</div>
  </div>
);

/** 小地球（含紅色定位點） */
export const Globe: React.FC<S & {spin?: number}> = ({s = 1, spin = 0}) => (
  <Svg w={280} h={320} s={s}>
    <defs>
      <clipPath id="clGlobe"><circle cx={140} cy={130} r={118} /></clipPath>
    </defs>
    <path d="M 140 262 L 140 292" stroke={G('wd')} strokeWidth={16} />
    <ellipse cx={140} cy={300} rx={70} ry={16} fill={G('wd')} />
    <circle cx={140} cy={130} r={118} fill={R('s')} />
    <g clipPath="url(#clGlobe)" transform={`translate(${-(spin % 1) * 0} 0)`}>
      <g transform={`translate(${-40 + spin * 60} 0)`}>
        <path d="M 40 70 Q 80 40 120 70 Q 140 110 100 130 Q 60 150 40 120 Z" fill={R('g')} />
        <path d="M 150 150 Q 190 140 200 180 Q 190 230 150 220 Q 130 190 150 150 Z" fill={R('g')} />
        <path d="M 200 70 Q 222 60 230 84 Q 226 110 206 112 Q 192 96 200 70 Z" fill={R('g')} />
      </g>
    </g>
    <ellipse cx={100} cy={70} rx={36} ry={20} fill="#fff" opacity={0.28} transform="rotate(-30 100 70)" />
    <circle cx={214} cy={92} r={11} fill={R('r')} stroke="#fff" strokeWidth={4} />
  </Svg>
);

/** 紙飛機 */
export const Plane: React.FC<S> = ({s = 1}) => (
  <Svg w={150} h={90} s={s}>
    <path d="M 4 44 L 146 6 L 60 60 Z" fill="#ffffff" />
    <path d="M 60 60 L 146 6 L 74 86 Z" fill="#e2ddd3" />
    <path d="M 4 44 L 60 60 L 52 70 Z" fill="#cfc8bb" />
  </Svg>
);

/** 碗（中餐） */
export const Bowl: React.FC<S> = ({s = 1}) => (
  <Svg w={170} h={130} s={s}>
    <ellipse cx={85} cy={50} rx={62} ry={30} fill={R('w')} />
    {[50, 70, 90, 110].map((x, i) => <path key={i} d={`M ${x} 34 Q ${x + 10} 50 ${x - 4} 62`} stroke={MU} strokeWidth={6} fill="none" strokeLinecap="round" />)}
    <path d="M 10 54 Q 85 70 160 54 Q 150 118 85 120 Q 20 118 10 54 Z" fill={G('b')} />
    <path d="M 30 80 Q 85 94 140 80" stroke="#fff" strokeWidth={5} fill="none" opacity={0.6} />
    <line x1={110} y1={10} x2={150} y2={56} stroke={G('wd')} strokeWidth={6} strokeLinecap="round" />
    <line x1={124} y1={6} x2={160} y2={52} stroke={G('wd')} strokeWidth={6} strokeLinecap="round" />
  </Svg>
);

/** 蛋糕 */
export const Cake: React.FC<S> = ({s = 1}) => (
  <Svg w={170} h={170} s={s}>
    <ellipse cx={85} cy={160} rx={80} ry={10} fill={G('gr')} />
    <rect x={14} y={92} width={142} height={66} rx={20} fill={G('w')} />
    <path d="M 14 108 Q 30 124 46 108 Q 62 124 78 108 Q 94 124 110 108 Q 126 124 142 108 Q 150 116 156 108 L 156 100 Q 156 90 140 90 L 30 90 Q 14 90 14 100 Z" fill={G('p')} />
    <rect x={38} y={44} width={94} height={54} rx={18} fill={G('w')} />
    <path d="M 38 60 Q 50 72 62 60 Q 74 72 86 60 Q 98 72 110 60 Q 122 72 132 60 L 132 56 Q 132 44 118 44 L 52 44 Q 38 44 38 56 Z" fill={G('p')} />
    <circle cx={85} cy={34} r={14} fill={R('r')} />
    <path d="M 85 22 Q 90 8 100 6" stroke="#2f8a57" strokeWidth={4} fill="none" />
  </Svg>
);

/** 飲料杯（吸管） */
export const Drink: React.FC<S> = ({s = 1}) => (
  <Svg w={120} h={180} s={s}>
    <path d="M 78 4 L 66 60" stroke={G('r')} strokeWidth={9} strokeLinecap="round" />
    <path d="M 18 40 L 102 40 L 92 170 Q 90 178 80 178 L 40 178 Q 30 178 28 170 Z" fill="#ffffff" opacity={0.55} />
    <path d="M 22 74 L 98 74 L 92 168 Q 90 174 82 174 L 38 174 Q 30 174 28 168 Z" fill={G('o')} />
    <circle cx={46} cy={150} r={7} fill={INKISH} />
    <circle cx={66} cy={160} r={7} fill={INKISH} />
    <circle cx={76} cy={140} r={7} fill={INKISH} />
    <rect x={12} y={30} width={96} height={16} rx={8} fill={G('w')} />
    <rect x={30} y={60} width={8} height={90} rx={4} fill="#fff" opacity={0.4} />
  </Svg>
);
const INKISH = '#3b2a22';

/** 咖啡杯 */
export const Cup: React.FC<S & {f?: number}> = ({s = 1, f = 0}) => (
  <Svg w={150} h={150} s={s}>
    {[0, 1].map((k) => (
      <path key={k} d={`M ${60 + k * 26} 50 q -10 -14 0 -26 q 10 -12 0 -24`} stroke="#fff" strokeWidth={6} fill="none" strokeLinecap="round"
        opacity={0.5 + 0.3 * Math.sin(f / 7 + k * 2)} transform={`translate(0 ${-3 * Math.sin(f / 9 + k)})`} />
    ))}
    <ellipse cx={75} cy={138} rx={64} ry={12} fill={G('w')} />
    <path d="M 120 78 Q 148 80 140 104 Q 132 120 112 116" stroke={mix(CREAM, '#000000', 0.12)} strokeWidth={10} fill="none" />
    <path d="M 26 62 L 124 62 Q 122 132 75 134 Q 28 132 26 62 Z" fill={G('w')} />
    <ellipse cx={75} cy={62} rx={49} ry={10} fill="#7a4a2a" />
  </Svg>
);

/** 飯店服務鈴 */
export const Bell: React.FC<S> = ({s = 1}) => (
  <Svg w={170} h={130} s={s}>
    <rect x={10} y={104} width={150} height={22} rx={10} fill={G('br')} />
    <path d="M 22 104 Q 22 40 85 36 Q 148 40 148 104 Z" fill={G('gd')} />
    <ellipse cx={60} cy={66} rx={12} ry={20} fill="#fff" opacity={0.4} transform="rotate(30 60 66)" />
    <rect x={78} y={18} width={14} height={20} rx={4} fill={G('gd')} />
    <ellipse cx={85} cy={16} rx={18} ry={7} fill={G('gd')} />
  </Svg>
);

/** 相機 */
export const Camera: React.FC<S> = ({s = 1}) => (
  <Svg w={230} h={170} s={s}>
    <rect x={40} y={14} width={64} height={30} rx={10} fill={G('k')} />
    <rect x={10} y={34} width={210} height={130} rx={28} fill={G('k')} />
    <rect x={10} y={70} width={210} height={50} fill={mix('#34343f', '#ffffff', 0.12)} />
    <circle cx={120} cy={100} r={50} fill={R('gr')} />
    <circle cx={120} cy={100} r={36} fill={R('b')} />
    <circle cx={106} cy={86} r={10} fill="#fff" opacity={0.6} />
    <rect x={170} y={46} width={32} height={18} rx={6} fill={G('y')} />
    <circle cx={34} cy={52} r={7} fill={R('r')} />
  </Svg>
);

/** 3D 列印機（正在印一個小方塊） */
export const Printer: React.FC<S & {p?: number}> = ({s = 1, p = 1}) => (
  <Svg w={230} h={250} s={s}>
    <rect x={10} y={10} width={210} height={236} rx={26} fill={G('gr')} />
    <rect x={30} y={40} width={170} height={170} rx={16} fill="#5d5a55" />
    <rect x={30} y={40} width={170} height={170} rx={16} fill="url(#cgv-s)" opacity={0.25} />
    <rect x={40} y={66} width={150} height={12} rx={6} fill={G('k')} />
    <rect x={98 + 20 * Math.sin(p * 12)} y={72} width={34} height={34} rx={8} fill={G('o')} />
    <path d={`M ${108 + 20 * Math.sin(p * 12)} 106 l 7 12 l 7 -12 Z`} fill={G('k')} />
    <rect x={56} y={190} width={118} height={12} rx={6} fill={G('k')} />
    <rect x={88} y={190 - 54 * p} width={54} height={54 * p} rx={8} fill={G('y')} />
    <circle cx={190} cy={228} r={7} fill={R('g')} />
  </Svg>
);

/** 雷射切割機 */
export const Laser: React.FC<S & {f?: number}> = ({s = 1, f = 0}) => (
  <Svg w={270} h={180} s={s}>
    <rect x={10} y={60} width={250} height={116} rx={22} fill={G('w')} />
    <path d="M 20 64 L 34 14 Q 38 6 48 6 L 222 6 Q 232 6 236 14 L 250 64 Z" fill={G('b')} />
    <path d="M 46 56 L 56 20 L 214 20 L 224 56 Z" fill="#9fc2e8" opacity={0.6} />
    <line x1={135 + 50 * Math.sin(f / 6)} y1={30} x2={135 + 50 * Math.sin(f / 6)} y2={56} stroke="#ff4b4b" strokeWidth={4} />
    <circle cx={135 + 50 * Math.sin(f / 6)} cy={56} r={5} fill="#ffb0a0" />
    <rect x={30} y={100} width={120} height={14} rx={7} fill="#d8d1c3" />
    <circle cx={210} cy={120} r={14} fill={R('o')} />
    <circle cx={238} cy={120} r={8} fill={R('g')} />
  </Svg>
);

/** 平板 */
export const Tablet: React.FC<{w?: number}> = ({w = 230}) => (
  <div style={{width: w, height: w * 0.72, borderRadius: w * 0.1, padding: w * 0.05, boxSizing: 'border-box',
    background: 'linear-gradient(to bottom, #4a4a55, #26262e)', boxShadow: '0 8px 0 #18181e, 0 18px 22px rgba(70,50,30,0.3)'}}>
    <div style={{width: '100%', height: '100%', borderRadius: w * 0.05, overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(135deg, #9fd0f5, #6fa8e8 60%, #5a86d0)'}}>
      <div style={{position: 'absolute', left: '14%', top: '22%', width: '34%', height: '50%', borderRadius: '50%', background: '#e0a52e'}} />
      <div style={{position: 'absolute', left: '46%', top: '38%', width: '40%', height: '40%', borderRadius: 10, background: '#d9663a', transform: 'rotate(12deg)'}} />
    </div>
  </div>
);

/** 場記板 */
export const Clapper: React.FC<S & {open?: number}> = ({s = 1, open = 0}) => (
  <Svg w={210} h={190} s={s}>
    <rect x={14} y={60} width={182} height={124} rx={18} fill={G('k')} />
    <rect x={30} y={96} width={150} height={10} rx={5} fill="#fff" opacity={0.7} />
    <rect x={30} y={124} width={110} height={10} rx={5} fill="#fff" opacity={0.7} />
    <rect x={30} y={152} width={130} height={10} rx={5} fill="#fff" opacity={0.7} />
    <g transform={`rotate(${-24 * open} 18 56)`}>
      <rect x={14} y={28} width={182} height={30} rx={8} fill={G('w')} />
      {[0, 1, 2, 3].map((k) => <path key={k} d={`M ${30 + k * 44} 28 L ${54 + k * 44} 28 L ${42 + k * 44} 58 L ${18 + k * 44} 58 Z`} fill={'#2f2f38'} />)}
    </g>
  </Svg>
);

/** 積木（立方體＋字母） */
export const Block: React.FC<{c: string; ch: string; size?: number}> = ({c, ch, size = 110}) => (
  <div style={{width: size, height: size, borderRadius: size * 0.2,
    background: `linear-gradient(to bottom, ${mix(c, '#ffffff', 0.32)}, ${c} 50%, ${mix(c, '#000000', 0.22)})`,
    boxShadow: `inset 0 4px 0 rgba(255,255,255,0.4), inset 0 -8px 0 rgba(0,0,0,0.14), 0 12px 16px rgba(70,50,30,0.24)`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BALOO, fontWeight: 800, fontSize: size * 0.62, color: '#fff',
    textShadow: `0 4px 0 ${mix(c, '#000000', 0.3)}`}}>{ch}</div>
);

/** 嬰兒床 */
export const Crib: React.FC<S> = ({s = 1}) => (
  <Svg w={320} h={230} s={s}>
    <rect x={20} y={40} width={22} height={186} rx={10} fill={G('wd')} />
    <rect x={278} y={40} width={22} height={186} rx={10} fill={G('wd')} />
    <rect x={40} y={120} width={240} height={46} rx={18} fill={G('w')} />
    <path d="M 120 120 Q 200 100 280 120 L 280 160 L 120 160 Z" fill={G('p')} />
    <circle cx={86} cy={118} r={26} fill={R('w')} />
    {[64, 102, 140, 178, 216, 254].map((x) => <rect key={x} x={x} y={70} width={12} height={110} rx={6} fill={G('wd')} />)}
    <rect x={30} y={60} width={260} height={18} rx={9} fill={G('wd')} />
    <rect x={30} y={176} width={260} height={18} rx={9} fill={G('wd')} />
  </Svg>
);

/** 晶片 */
export const Chip: React.FC<S & {glow?: number; label?: string}> = ({s = 1, glow = 0, label = ''}) => (
  <Svg w={240} h={240} s={s}>
    {[0, 1, 2, 3, 4].map((k) => (
      <React.Fragment key={k}>
        <rect x={54 + k * 30} y={6} width={14} height={40} rx={5} fill={G('gr')} />
        <rect x={54 + k * 30} y={194} width={14} height={40} rx={5} fill={G('gr')} />
        <rect x={6} y={54 + k * 30} width={40} height={14} rx={5} fill={G('gr')} />
        <rect x={194} y={54 + k * 30} width={40} height={14} rx={5} fill={G('gr')} />
      </React.Fragment>
    ))}
    {glow > 0 && <rect x={20} y={20} width={200} height={200} rx={40} fill="#ffd45a" opacity={0.35 * glow} />}
    <rect x={36} y={36} width={168} height={168} rx={30} fill={G('k')} />
    <rect x={56} y={56} width={128} height={128} rx={20} fill={mix('#34343f', '#ffffff', 0.12)} />
    <text x={120} y={146} textAnchor="middle" fontFamily={BALOO} fontWeight={800} fontSize={86} fill={mix('#ffd45a', '#888888', 1 - glow)} opacity={0.3 + 0.7 * glow}>{label}</text>
  </Svg>
);

/** 燈泡 */
export const Bulb: React.FC<S & {lit?: number}> = ({s = 1, lit = 0}) => (
  <Svg w={150} h={220} s={s}>
    {lit > 0 && <circle cx={75} cy={70} r={72} fill="#ffe27a" opacity={0.35 * lit} />}
    {lit > 0 && [0, 1, 2, 3, 4, 5, 6].map((k) => {
      const a = (-180 + k * 30) * Math.PI / 180;
      return <line key={k} x1={75 + Math.cos(a) * 66} y1={70 + Math.sin(a) * 66} x2={75 + Math.cos(a) * 84} y2={70 + Math.sin(a) * 84}
        stroke={MU} strokeWidth={7} strokeLinecap="round" opacity={lit} />;
    })}
    <circle cx={75} cy={70} r={56} fill={R('w')} />
    <path d="M 50 110 L 100 110 L 96 150 L 54 150 Z" fill={R('w')} />
    {lit > 0 && <circle cx={75} cy={70} r={56} fill={R('y')} opacity={lit} />}
    {lit > 0 && <path d="M 50 110 L 100 110 L 96 150 L 54 150 Z" fill={R('y')} opacity={lit} />}
    <rect x={50} y={148} width={50} height={46} rx={10} fill={G('gr')} />
    <rect x={46} y={160} width={58} height={8} rx={4} fill="#8d877c" />
    <rect x={46} y={176} width={58} height={8} rx={4} fill="#8d877c" />
    <path d="M 62 214 Q 75 222 88 214" stroke="#8d877c" strokeWidth={8} fill="none" strokeLinecap="round" />
    <ellipse cx={55} cy={50} rx={12} ry={20} fill="#fff" opacity={0.5} transform="rotate(30 55 50)" />
  </Svg>
);

/** 小豬撲滿 */
export const Piggy: React.FC<S> = ({s = 1}) => (
  <Svg w={320} h={250} s={s}>
    <ellipse cx={60} cy={222} rx={20} ry={24} fill={R('p')} />
    <ellipse cx={240} cy={222} rx={20} ry={24} fill={R('p')} />
    <ellipse cx={110} cy={226} rx={20} ry={22} fill={R('p')} />
    <ellipse cx={200} cy={226} rx={20} ry={22} fill={R('p')} />
    <path d="M 290 120 q 26 -8 20 -30" stroke={mix('#f2a7b5', '#000000', 0.12)} strokeWidth={8} fill="none" strokeLinecap="round" />
    <ellipse cx={160} cy={140} rx={140} ry={92} fill={R('p')} />
    <path d="M 70 60 L 92 20 L 116 58 Z" fill={G('p')} />
    <path d="M 168 52 L 196 16 L 214 56 Z" fill={G('p')} />
    <rect x={130} y={54} width={70} height={12} rx={6} fill="#a8536a" />
    <ellipse cx={34} cy={140} rx={30} ry={36} fill={R('p')} />
    <ellipse cx={26} cy={128} rx={5} ry={8} fill="#a8536a" />
    <ellipse cx={26} cy={152} rx={5} ry={8} fill="#a8536a" />
    <circle cx={80} cy={110} r={10} fill="#2a2230" />
    <circle cx={83} cy={106} r={3.5} fill="#fff" />
    <ellipse cx={100} cy={146} rx={14} ry={8} fill="#f28a96" opacity={0.7} />
    <ellipse cx={130} cy={92} rx={40} ry={18} fill="#fff" opacity={0.25} transform="rotate(-15 130 92)" />
  </Svg>
);

/** 金幣 */
export const Coin: React.FC<S> = ({s = 1}) => (
  <Svg w={80} h={80} s={s}>
    <circle cx={40} cy={44} r={34} fill={mix('#e9b93a', '#000000', 0.25)} />
    <circle cx={40} cy={38} r={34} fill={R('gd')} />
    <circle cx={40} cy={38} r={24} fill="none" stroke="#fff" strokeWidth={4} opacity={0.5} />
    <text x={40} y={52} textAnchor="middle" fontFamily={FAT} fontWeight={900} fontSize={34} fill="#fff" opacity={0.85}>★</text>
  </Svg>
);

/** 價格吊牌（文字＋劃掉線） */
export const Tag: React.FC<{text: string; strike?: number}> = ({text, strike = 0}) => (
  <div style={{position: 'relative', width: 400, height: 220}}>
    <svg viewBox="0 0 400 220" width={400} height={220} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <path d="M 20 40 Q 0 -10 -20 30" stroke="#8a7a62" strokeWidth={4} fill="none" />
      <path d="M 70 14 L 370 14 Q 392 14 392 36 L 392 184 Q 392 206 370 206 L 70 206 L 10 110 Z" fill={mix('#e0a52e', '#000000', 0.25)} transform="translate(0 8)" />
      <path d="M 70 14 L 370 14 Q 392 14 392 36 L 392 184 Q 392 206 370 206 L 70 206 L 10 110 Z" fill={G('y')} />
      <circle cx={60} cy={110} r={16} fill={BGHOLE} />
      <path d="M 20 40 Q 30 90 60 110" stroke="#8a7a62" strokeWidth={4} fill="none" />
    </svg>
    <div style={{position: 'absolute', left: 90, right: 10, top: 14, bottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: TC, fontWeight: 900, fontSize: 84, color: '#fff', textShadow: `0 4px 0 ${mix('#e0a52e', '#000000', 0.3)}`}}>{text}</div>
    {strike > 0 && (
      <svg viewBox="0 0 400 220" width={400} height={220} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line x1={110} y1={150} x2={110 + 260 * strike} y2={150 - 90 * strike} stroke={'#d94a4a'} strokeWidth={20} strokeLinecap="round" />
        <line x1={110} y1={145} x2={110 + 260 * strike} y2={145 - 90 * strike} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.35} />
      </svg>
    )}
  </div>
);
const BGHOLE = '#e9e5dc';

/** 交通車 */
export const Bus: React.FC<S & {wheel?: number}> = ({s = 1, wheel = 0}) => (
  <Svg w={440} h={240} s={s}>
    <rect x={10} y={20} width={420} height={170} rx={40} fill={G('y')} />
    <rect x={10} y={130} width={420} height={18} fill={OR} opacity={0.85} />
    {[0, 1, 2, 3].map((k) => <rect key={k} x={40 + k * 78} y={44} width={62} height={64} rx={14} fill={'#bfe0f5'} />)}
    {[0, 1, 2, 3].map((k) => <rect key={k} x={48 + k * 78} y={50} width={14} height={50} rx={6} fill="#fff" opacity={0.5} />)}
    <rect x={358} y={44} width={56} height={120} rx={14} fill={'#bfe0f5'} />
    <rect x={150} y={154} width={120} height={30} rx={10} fill="#fff" opacity={0.9} />
    <circle cx={414} cy={160} r={9} fill="#fff6c8" />
    {[100, 340].map((cx) => (
      <g key={cx} transform={`rotate(${wheel} ${cx} 196)`}>
        <circle cx={cx} cy={196} r={36} fill={R('k')} />
        <circle cx={cx} cy={196} r={15} fill={G('gr')} />
        <rect x={cx - 3} y={164} width={6} height={20} fill="#777" />
      </g>
    ))}
  </Svg>
);

/** 宿舍小屋（四格窗＋冷氣） */
export const House: React.FC<S & {lit?: number}> = ({s = 1, lit = 0}) => (
  <Svg w={340} h={320} s={s}>
    <rect x={30} y={120} width={280} height={196} rx={22} fill={G('w')} />
    <path d="M 4 136 L 170 14 L 336 136 Q 340 150 326 150 L 14 150 Q 0 150 4 136 Z" fill={G('o')} />
    <rect x={232} y={40} width={34} height={60} rx={8} fill={G('br')} />
    {[[70, 170], [190, 170], [70, 236], [190, 236]].map(([x, y], i) => (
      <g key={i}>
        <rect x={x} y={y} width={80} height={52} rx={12} fill={lit > 0 ? mix('#bfe0f5', '#ffe27a', lit) : '#bfe0f5'} />
        <rect x={x + 38} y={y} width={4} height={52} fill="#fff" opacity={0.7} />
      </g>
    ))}
    <rect x={250} y={170} width={48} height={26} rx={8} fill={G('w')} stroke="#d0c8b8" strokeWidth={3} />
    <line x1={256} y1={186} x2={292} y2={186} stroke="#b9b1a2" strokeWidth={3} />
  </Svg>
);

/** 游泳池 */
export const Pool: React.FC<S & {f?: number}> = ({s = 1, f = 0}) => (
  <Svg w={440} h={190} s={s}>
    <rect x={6} y={30} width={428} height={156} rx={50} fill={G('w')} />
    <rect x={30} y={50} width={380} height={116} rx={38} fill={G('t')} />
    {[0, 1, 2].map((k) => (
      <path key={k} d={`M ${70 + k * 100} ${100 + 12 * (k % 2)} q 18 ${-10 + 4 * Math.sin(f / 8 + k)} 36 0 q 18 ${10 - 4 * Math.sin(f / 8 + k)} 36 0`} stroke="#fff" strokeWidth={5} fill="none"
        strokeLinecap="round" opacity={0.6} />
    ))}
    <path d="M 360 10 L 360 90 M 392 10 L 392 90" stroke={G('gr')} strokeWidth={8} strokeLinecap="round" />
    <path d="M 360 34 L 392 34 M 360 60 L 392 60" stroke={'#a7a197'} strokeWidth={6} />
  </Svg>
);
