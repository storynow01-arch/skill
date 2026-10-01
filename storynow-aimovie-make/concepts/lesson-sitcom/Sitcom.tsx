/* 1-1 概念 2：電腦小劇場（10 秒試看）—— 小A、小B 兩台有表情的電腦 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';

const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const BG1 = '#FFF6E5', BG2 = '#FFE3B8', INK = '#2B2B3A', BLUE = '#4D8DF7', ORANGE = '#FF8A3D', RED = '#F0454B', GREEN = '#2FB872', YEL = '#FFD23F';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Mood = 'happy' | 'confused' | 'sweat' | 'proud';
/** 有表情的電腦：螢幕臉＋擠壓伸展 */
const Buddy: React.FC<{x: number; y: number; c: string; name: string; mood: Mood; squash?: number; lean?: number}> = ({x, y, c, name, mood, squash = 0, lean = 0}) => {
  const f = useCurrentFrame();
  const breathe = Math.sin(f / 7) * 0.02;
  const sx = 1 + squash * 0.18 + breathe, sy = 1 - squash * 0.18 - breathe;
  const eye = (cx: number) => mood === 'confused' ? <text x={cx} y={20} textAnchor="middle" fontSize={56} fontWeight={900} fill={INK}>@</text>
    : mood === 'proud' ? <path d={`M ${cx - 22} 10 Q ${cx} -14 ${cx + 22} 10`} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" />
    : <ellipse cx={cx} cy={0} rx={13} ry={mood === 'sweat' ? 9 : 18} fill={INK} />;
  const mouth = mood === 'happy' || mood === 'proud' ? 'M -46 50 Q 0 92 46 50' : mood === 'confused' ? 'M -36 70 Q -12 56 0 70 T 36 70' : 'M -36 72 h 72';
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean}) scale(${sx} ${sy})`}>
      <rect x={-40} y={150} width={80} height={60} fill="#9AA4B2" />
      <rect x={-110} y={205} width={220} height={26} rx={13} fill="#9AA4B2" />
      <rect x={-180} y={-150} width={360} height={300} rx={40} fill={c} stroke={INK} strokeWidth={8} />
      <rect x={-150} y={-120} width={300} height={240} rx={26} fill="#fff" />
      <g transform="translate(0 -10)">{eye(-60)}{eye(60)}<path d={mouth} stroke={INK} strokeWidth={9} fill="none" strokeLinecap="round" /></g>
      {mood === 'sweat' && <path d="M 130 -90 q 16 30 0 44 q -16 -14 0 -44" fill="#7CC8FF" stroke={INK} strokeWidth={4} />}
      <text y={290} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={46} fill={INK}>{name}</text>
    </g>
  );
};
const Bubble: React.FC<{x: number; y: number; text: string; at: number; color?: string; size?: number; tail?: 'left' | 'right'}> = (
  {x, y, text, at, color = '#fff', size = 52, tail = 'left'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 200}});
  if (f < at) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: tail === 'left' ? '0% 100%' : '100% 100%',
      background: color, border: `6px solid ${INK}`, borderRadius: 40, padding: '18px 34px', fontFamily: TC, fontWeight: 900, fontSize: size, color: INK, whiteSpace: 'nowrap'}}>
      {text}
      <div style={{position: 'absolute', bottom: -30, [tail]: 50, width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent',
        borderTop: `30px solid ${INK}`}} />
    </div>
  );
};
const Onomato: React.FC<{text: string; at: number; x: number; y: number; c: string; rot?: number}> = ({text, at, x, y, c, rot = -8}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: f - at, fps, config: {damping: 7, stiffness: 260}});
  if (f < at || f > at + 40) return null;
  return <div style={{position: 'absolute', left: x, top: y, fontFamily: TC, fontWeight: 900, fontSize: 130, color: c, transform: `scale(${s}) rotate(${rot}deg)`,
    WebkitTextStroke: `8px ${INK}`, paintOrder: 'stroke'}}>{text}</div>;
};

export const Sitcom: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  // 0–80 誤會、80–150 規則書＋握手、150–240 大檔卡住、240–300 切成小箱
  const moodB: Mood = f < 30 ? 'happy' : f < 120 ? 'confused' : 'happy';
  const moodA: Mood = f < 160 ? 'happy' : f < 238 ? 'sweat' : 'proud';
  const lean = f >= 120 && f < 150 ? Math.sin(((f - 120) / 30) * Math.PI) * 8 : 0;
  const book = spring({frame: f - 84, fps, config: {damping: 12}});
  const stamp = spring({frame: f - 118, fps, config: {damping: 8, stiffness: 240}});
  const push = interpolate(f, [160, 200], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const stuck = f >= 200 && f < 240;
  const jiggle = stuck ? Math.sin(f * 2.2) * 10 : 0;
  const cut = f >= 240;

  return (
    <AbsoluteFill style={{background: `radial-gradient(circle at 50% 40%, ${BG1}, ${BG2})`, overflow: 'hidden'}}>
      {/* 舞台燈與地板 */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 200, background: '#E9B87A', borderTop: `8px solid ${INK}`}} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        {/* 網路線 */}
        <path d="M 600 760 C 800 860, 1120 860, 1320 760" stroke={INK} strokeWidth={14} fill="none" />
        <path d="M 600 760 C 800 860, 1120 860, 1320 760" stroke={GREEN} strokeWidth={6} fill="none" strokeDasharray="20 16" strokeDashoffset={-f * 3} />
        <Buddy x={430 + (f >= 120 && f < 150 ? 20 : 0)} y={560} c={BLUE} name="小A" mood={moodA} squash={stuck ? 0.4 : 0} lean={lean} />
        <Buddy x={1490 - (f >= 120 && f < 150 ? 20 : 0)} y={560} c={ORANGE} name="小B" mood={moodB} lean={-lean} />
        {/* 大檔卡在網路線 */}
        {f >= 160 && !cut && (
          <g transform={`translate(${interpolate(push, [0, 1], [430, 820]) + jiggle} ${interpolate(push, [0, 1], [380, 700])}) rotate(${stuck ? jiggle : 0})`}>
            <rect x={-130} y={-160} width={260} height={320} rx={16} fill="#fff" stroke={INK} strokeWidth={8} />
            <text y={-60} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={54} fill={INK}>大檔案</text>
            <text y={20} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={44} fill={RED}>8 GB</text>
          </g>
        )}
        {/* 切成小箱飛出 */}
        {cut && Array.from({length: 6}, (_, k) => {
          const d = f - 244 - k * 3;
          if (d < 0) return null;
          const p = Math.min(1, d / 30);
          const x = interpolate(p, [0, 1], [820, 1300]) + (k - 2.5) * 30, y = 700 - Math.sin(p * Math.PI) * (160 + k * 20);
          return <g key={k} transform={`translate(${x} ${y}) rotate(${d * 8})`}><rect x={-40} y={-40} width={80} height={80} fill={YEL} stroke={INK} strokeWidth={6} />
            <text y={14} textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize={34} fill={INK}>{k + 1}</text></g>;
        })}
      </svg>
      {f < 84 && <Bubble x={160} y={150} text="嗨！檔案收到了嗎？" at={10} />}
      {f < 120 && <Bubble x={1130} y={150} text="#@%&*？？？" at={34} color="#FFE1E1" tail="right" />}
      {f >= 140 && f < 160 && <Bubble x={1150} y={150} text="懂了！" at={140} color="#DDF7E8" tail="right" />}
      {/* 規則書 */}
      {f >= 84 && f < 165 && (
        <div style={{position: 'absolute', left: 760, top: 160, width: 400, padding: '24px 30px', background: '#fff', border: `6px solid ${INK}`, borderRadius: 18,
          transform: `translateY(${(1 - book) * -500}px) rotate(3deg)`, fontFamily: TC, color: INK}}>
          <div style={{fontWeight: 900, fontSize: 44}}>📖 規則書</div>
          <div style={{fontWeight: 700, fontSize: 30, marginTop: 6}}>A 怎麼送，B 就怎麼收</div>
          {f >= 118 && <div style={{position: 'absolute', right: -40, bottom: -50, padding: '10px 18px', border: `8px solid ${RED}`, borderRadius: 14, color: RED,
            fontWeight: 900, fontSize: 36, background: '#fff', transform: `scale(${2.6 - 1.6 * stamp}) rotate(-12deg)`}}>雙方都同意</div>}
        </div>
      )}
      <Onomato text="咚！" at={118} x={1250} y={330} c={RED} />
      <Onomato text="卡住！" at={202} x={720} y={300} c={ORANGE} rot={6} />
      <Onomato text="切！" at={240} x={860} y={260} c={GREEN} rot={-10} />
      {f >= 150 && f < 200 && <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', fontFamily: TC, fontWeight: 900, fontSize: 60, color: INK}}>規則對上了 ＝ <span style={{color: RED}}>通訊協定</span></div>}
      {f >= 262 && <div style={{position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', fontFamily: TC, fontWeight: 900, fontSize: 60, color: INK}}>切成小箱 ＝ <span style={{color: GREEN}}>封包</span></div>}
    </AbsoluteFill>
  );
};
