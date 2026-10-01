/* 元件庫實測：等角世界（iso）＋角色（character）＋砸入字（kinetic）組合在同一個場景 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {makeIso, Buddy, Bubble, makeBeat, slam} from '../lib';
import {useTheme} from '../theme';
import type {SceneProps} from '../scenes';

export const Showcase: React.FC<SceneProps> = ({cues}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const W = makeIso({ox: 700, oy: 260, s: 64, font: t.f.tc});
  const K = makeBeat(128);
  const x = interpolate(f, [10, 70], [1, 7], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <W.Ground x0={-1} y0={-1} x1={11} y1={8} color="#16324f" />
        <W.Strip x0={1} y0={2.6} x1={9} y1={3.6} color="#5C6B7A" />
        <W.Box x={0} y={1} w={1.6} d={4} h={1.6} color={t.c.accent} label="A" lsize={34} />
        <W.Box x={8.6} y={1} w={1.6} d={4} h={1.6} color={t.c.accent2} label="B" lsize={34} />
        <W.Box x={x} y={2.7} w={0.8} d={0.8} h={0.7} color="#E8B96A" label="#1" lsize={18} />
        <Buddy x={1480} y={700} color={t.c.accent3} name="小B" mood={f < 60 ? 'confused' : 'happy'} scale={0.7} font={t.f.tc} />
      </svg>
      <Bubble x={1300} y={300} text={f < 60 ? '收到什麼？' : '收到第 1 箱！'} at={cue(cues, 0)} font={t.f.tc} size={40} tail="right" />
      <div style={{position: 'absolute', left: 140, top: 130, fontFamily: t.f.tc, fontWeight: 900, fontSize: 90, color: t.c.fg, ...slam(f, K.f(1))}}>元件庫組合</div>
    </AbsoluteFill>
  );
};
const cue = (c: number[], i: number) => c?.[i] ?? 0;
