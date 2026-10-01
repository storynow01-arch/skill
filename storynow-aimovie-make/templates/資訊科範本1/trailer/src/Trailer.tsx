import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {C, TOTAL, bar} from './theme';
import {Background, Hud} from './ui';
import {AiIot, Algo, Career, Code, Gold12, Intro, Nat56, Outro, Rate, Robot, Timeline, Title, Unis, WorldSkills} from './scenes';

// [起始小節, 結束小節, 元件, 主色, HUD 標籤] — 與 audio/make_music.py 的段落一致
const SCENES: [number, number, React.FC, string, string][] = [
  [0, 4, Intro, C.cyan, 'BOOT'],
  [4, 6, Title, C.cyan, 'TITLE'],
  [6, 8, Code, C.cyan, '01 / AI & SOFTWARE'],
  [8, 10, Algo, C.cyan, '01 / AI & SOFTWARE'],
  [10, 12, AiIot, C.cyan, '01 / AI & SOFTWARE'],
  [12, 14, Robot, C.cyan, '01 / AI & SOFTWARE'],
  [14, 16, WorldSkills, C.gold, '02 / CHAMPIONS'],
  [16, 18, Gold12, C.gold, '02 / CHAMPIONS'],
  [18, 20, Nat56, C.gold, '02 / CHAMPIONS'],
  [20, 22, Timeline, C.gold, '02 / CHAMPIONS'],
  [22, 24, Rate, C.violet, '03 / FUTURE PATHWAYS'],
  [24, 26, Unis, C.violet, '03 / FUTURE PATHWAYS'],
  [26, 29, Career, C.violet, '03 / FUTURE PATHWAYS'],
  [29, 32, Outro, C.cyan, 'HAICHING IT'],
];
const IMPACTS = [4, 14, 22, 29].map(bar);
const CUTS = SCENES.slice(1).map((s) => bar(s[0]));

const Overlays: React.FC = () => {
  const f = useCurrentFrame();
  const flash = Math.max(0, ...IMPACTS.map((i) => (f >= i && f < i + 15 ? (1 - (f - i) / 15) ** 2 : 0)));
  const g = Math.max(0, ...CUTS.map((c) => 1 - Math.abs(f - c) / 4));
  const fade = interpolate(f, [0, 12, TOTAL - 36, TOTAL - 1], [1, 0, 0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 故障切片 */}
      {g > 0 && Array.from({length: 7}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 0, right: 0, top: random(`gy${f}${i}`) * 1040, height: 6 + random(`gh${f}${i}`) * 40,
          background: i % 2 ? `${C.cyan}55` : `${C.pink}44`, transform: `translateX(${(random(`gx${f}${i}`) - 0.5) * 200 * g}px)`, mixBlendMode: 'screen'}} />
      ))}
      {/* 掃描線 + 暗角 */}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.65) 100%)'}} />
      <AbsoluteFill style={{background: '#fff', opacity: flash * 0.85}} />
      <AbsoluteFill style={{background: '#000', opacity: fade}} />
    </AbsoluteFill>
  );
};

export const Trailer: React.FC = () => {
  const f = useCurrentFrame();
  const cur = SCENES.find(([s, e]) => f >= bar(s) && f < bar(e)) ?? SCENES[SCENES.length - 1];
  const [, , , accent, label] = cur;
  const quiet = cur[2] === Intro || cur[2] === Title || cur[2] === Outro;
  const g = Math.max(0, ...CUTS.map((c) => 1 - Math.abs(f - c) / 4));
  return (
    <AbsoluteFill style={{backgroundColor: C.bg0}}>
      <Background accent={accent} code={quiet ? 0 : 0.5} grid={cur[2] === Intro ? Math.min(1, f / 105) : 1} />
      {/* 色差：切點時 RGB 分離 */}
      <AbsoluteFill style={{filter: g > 0 ? `drop-shadow(${12 * g}px 0 0 ${C.pink}aa) drop-shadow(${-12 * g}px 0 0 ${C.cyan}aa)` : undefined}}>
        {SCENES.map(([s, e, Comp]) => (
          <Sequence key={s} from={bar(s)} durationInFrames={bar(e) - bar(s)}>
            <Comp />
          </Sequence>
        ))}
      </AbsoluteFill>
      <Hud accent={accent} label={label} absFrame={f} />
      <Overlays />
      <Audio src={staticFile('soundtrack.wav')} />
    </AbsoluteFill>
  );
};
