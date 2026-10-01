import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Background, Finish} from './backgrounds';
import {Captions, CutFx, Hud, TransitionIn} from './kit';
import {GENERIC} from './scenes';
import {CUSTOM} from './custom';
import {LESSON} from './lesson';
import {MEDIA_SCENES} from './mediaScenes';
import {ImpactFx} from './motion';
import {QaProbe} from './QaProbe';
import {ThemeProvider, makeTheme} from './theme';

export type Spec = {
  style: string; fps: number; width: number; height: number; totalFrames: number; mode: 'teach' | 'promo';
  hud?: {left?: string; right?: string} | null;
  music?: string | null; voice?: string | null; musicVolume?: number; duckTo?: number;
  duck: [number, number][]; impacts: number[];
  captions: {text: string; from: number; to: number}[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scenes: {id: string; type: string; from: number; dur: number; accent?: string; code?: number; hud?: string; props: any; cues: number[]}[];
};

const ALL = {...GENERIC, ...LESSON, ...MEDIA_SCENES, ...CUSTOM};

export const Video: React.FC<Spec> = (spec) => {
  const f = useCurrentFrame();
  const t = useMemo(() => makeTheme(spec.style), [spec.style]);
  const cur = spec.scenes.find((s) => f >= s.from && f < s.from + s.dur) ?? spec.scenes[spec.scenes.length - 1];
  const acc = (a?: string) => (!a ? t.c.accent : a.startsWith('#') ? a : (t.c as Record<string, string>)[a] ?? t.c.accent);
  const accent = acc(cur.accent);
  const cuts = spec.scenes.slice(1).map((s) => s.from);
  const g = Math.max(0, ...cuts.map((c) => 1 - Math.abs(f - c) / (t.transition === 'pixel' ? 6 : 4)));
  const flash = Math.max(0, ...spec.impacts.map((i) => (f >= i && f < i + 15 ? (1 - (f - i) / 15) ** 2 : 0)));
  const fade = Math.max(0, 1 - f / 12, (f - (spec.totalFrames - 30)) / 29);
  const mv = spec.musicVolume ?? (spec.mode === 'teach' ? 0.5 : 1);
  const duckTo = spec.duckTo ?? 0.16;
  const musicVol = (fr: number) => {
    let d = 0;
    for (const [a, b] of spec.duck) d = Math.max(d, Math.min(1, (fr - a + 8) / 8, (b + 12 - fr) / 12));
    return mv * (1 - Math.max(0, d) * (1 - duckTo / mv));
  };
  return (
    <ThemeProvider theme={t}>
      <AbsoluteFill style={{backgroundColor: t.c.bg}}>
        <Background t={t} accent={accent} code={cur.code ?? 0} intensity={f < 90 && spec.mode === 'promo' ? Math.min(1, f / 90) : 1} />
        {spec.scenes.map((s) => {
          const Comp = ALL[s.type];
          if (!Comp) throw new Error(`未知場景類型: ${s.type}`);
          return (
            <Sequence key={s.id} from={s.from} durationInFrames={s.dur}>
              <TransitionIn t={t} f={f - s.from}>
                <Comp p={s.props} cues={s.cues} dur={s.dur} accent={acc(s.accent)} />
              </TransitionIn>
            </Sequence>
          );
        })}
        {spec.hud && <Hud left={spec.hud.left} right={cur.hud ?? spec.hud.right} accent={accent} frame={f} total={spec.totalFrames} />}
        <Captions caps={spec.captions} frame={f} />
        <ImpactFx t={t} frame={f} impacts={spec.impacts} />
        <CutFx t={t} g={g} frame={f} />
        {(spec as Spec & {qa?: boolean}).qa && <QaProbe w={spec.width} h={spec.height} />}
        <Finish t={t} />
        <AbsoluteFill style={{background: t.dark ? '#fff' : t.c.accent, opacity: flash * (t.dark ? 0.8 : 0.35), pointerEvents: 'none'}} />
        <AbsoluteFill style={{background: '#000', opacity: Math.min(1, fade), pointerEvents: 'none'}} />
        {spec.music && <Audio src={staticFile(spec.music)} volume={musicVol} />}
        {spec.voice && <Audio src={staticFile(spec.voice)} />}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
