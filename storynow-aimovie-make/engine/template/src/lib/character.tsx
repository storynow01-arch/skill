/* 角色劇元件（來自「電腦小劇場」）：有表情的螢幕臉角色、對話泡泡、擬聲字。
   <Buddy x y color="#4D8DF7" name="小A" mood="happy|confused|sweat|proud|surprised" squash={0~1} lean={度} />  （放在 <svg> 內）
   <Bubble x y text at tail="left|right" />、<Onomato text="咚！" at x y color />  （HTML 層） */
import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

export type Mood = 'happy' | 'confused' | 'sweat' | 'proud' | 'surprised';

export const Buddy: React.FC<{x: number; y: number; color: string; name?: string; mood: Mood; squash?: number; lean?: number; ink?: string; font?: string; scale?: number}> = (
  {x, y, color, name, mood, squash = 0, lean = 0, ink = '#2B2B3A', font = 'sans-serif', scale = 1}) => {
  const f = useCurrentFrame();
  const breathe = Math.sin(f / 7) * 0.02;
  const sx = (1 + squash * 0.18 + breathe) * scale, sy = (1 - squash * 0.18 - breathe) * scale;
  const eye = (cx: number) => mood === 'confused' ? <text x={cx} y={20} textAnchor="middle" fontSize={56} fontWeight={900} fill={ink}>@</text>
    : mood === 'proud' ? <path d={`M ${cx - 22} 10 Q ${cx} -14 ${cx + 22} 10`} stroke={ink} strokeWidth={9} fill="none" strokeLinecap="round" />
    : mood === 'surprised' ? <circle cx={cx} cy={0} r={20} fill="none" stroke={ink} strokeWidth={8} />
    : <ellipse cx={cx} cy={0} rx={13} ry={mood === 'sweat' ? 9 : 18} fill={ink} />;
  const mouth = mood === 'happy' || mood === 'proud' ? 'M -46 50 Q 0 92 46 50' : mood === 'confused' ? 'M -36 70 Q -12 56 0 70 T 36 70'
    : mood === 'surprised' ? 'M -16 64 a 16 18 0 1 0 32 0 a 16 18 0 1 0 -32 0' : 'M -36 72 h 72';
  return (
    <g transform={`translate(${x} ${y}) rotate(${lean}) scale(${sx} ${sy})`}>
      <rect x={-40} y={150} width={80} height={60} fill="#9AA4B2" />
      <rect x={-110} y={205} width={220} height={26} rx={13} fill="#9AA4B2" />
      <rect x={-180} y={-150} width={360} height={300} rx={40} fill={color} stroke={ink} strokeWidth={8} />
      <rect x={-150} y={-120} width={300} height={240} rx={26} fill="#fff" />
      <g transform="translate(0 -10)">{eye(-60)}{eye(60)}<path d={mouth} stroke={ink} strokeWidth={9} fill="none" strokeLinecap="round" /></g>
      {mood === 'sweat' && <path d="M 130 -90 q 16 30 0 44 q -16 -14 0 -44" fill="#7CC8FF" stroke={ink} strokeWidth={4} />}
      {name && <text y={290} textAnchor="middle" fontFamily={font} fontWeight={900} fontSize={46} fill={ink}>{name}</text>}
    </g>
  );
};

export const Bubble: React.FC<{x: number; y: number; text: string; at: number; until?: number; color?: string; size?: number; tail?: 'left' | 'right'; ink?: string; font?: string}> = (
  {x, y, text, at, until = 1e9, color = '#fff', size = 52, tail = 'left', ink = '#2B2B3A', font = 'sans-serif'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  if (f < at || f >= until) return null;
  const s = spring({frame: f - at, fps, config: {damping: 10, stiffness: 200}});
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `scale(${s})`, transformOrigin: tail === 'left' ? '0% 100%' : '100% 100%',
      background: color, border: `6px solid ${ink}`, borderRadius: 40, padding: '18px 34px', fontFamily: font, fontWeight: 900, fontSize: size, color: ink, whiteSpace: 'nowrap'}}>
      {text}
      <div style={{position: 'absolute', bottom: -30, [tail]: 50, width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent',
        borderTop: `30px solid ${ink}`}} />
    </div>
  );
};

export const Onomato: React.FC<{text: string; at: number; x: number; y: number; color: string; rot?: number; size?: number; hold?: number; ink?: string; font?: string}> = (
  {text, at, x, y, color, rot = -8, size = 130, hold = 40, ink = '#2B2B3A', font = 'sans-serif'}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  if (f < at || f > at + hold) return null;
  const s = spring({frame: f - at, fps, config: {damping: 7, stiffness: 260}});
  return <div style={{position: 'absolute', left: x, top: y, fontFamily: font, fontWeight: 900, fontSize: size, color, transform: `scale(${s}) rotate(${rot}deg)`,
    WebkitTextStroke: `8px ${ink}`, paintOrder: 'stroke'}}>{text}</div>;
};
