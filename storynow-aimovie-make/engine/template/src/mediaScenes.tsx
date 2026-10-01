/* 照片場景：photo（滿版照片）、gallery（3–4 張照片牆）、split（半照片＋重點）。
   props 裡的 media 由 build.py 解析成 {src, ok}；ok=false 時自動用 fallback 插畫，影片照常產出。 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, glowOf, useTheme} from './theme';
import {Heading, abs} from './kit';
import {SceneProps, cue} from './scenes';
import {Photo} from './lib/media';
import {FxEnter} from './motion';

/** 滿版照片＋標題壓字 */
export const PhotoScene: React.FC<SceneProps> = ({p, cues, dur, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div style={abs({left: 0, top: 0})}>
        <Photo m={p.media} w={1920} h={1080} frame="full" kb={p.kb ?? 'in'} fallback={p.fallback} font={t.f.tc} dur={dur} />
      </div>
      <AbsoluteFill style={{background: 'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.25) 55%, transparent 80%)'}} />
      <div style={abs({left: 140, top: 300, maxWidth: 1000, opacity: ease(f, 6, 16), transform: `translateX(${(1 - ease(f, 6, 16)) * -40}px)`})}>
        <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: p.size ?? 96, color: '#fff', lineHeight: 1.2, whiteSpace: 'pre-line', textShadow: glowOf(t, accent, 0.5)}}>{p.heading}</div>
        {p.en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: 24, letterSpacing: 6, color: accent, marginTop: 12}}>{p.en}</div>}
        {(p.points ?? []).map((s: string, i: number) => (
          <FxEnter key={s} delay={cue(cues, i + 1, 24 + i * 12)} style={{marginTop: 22}}>
            <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 40, color: '#fff'}}><span style={{color: accent}}>▍</span>{s}</div>
          </FxEnter>
        ))}
      </div>
      {p.media && !p.media.ok && p.showMissing && (
        <div style={abs({right: 40, top: 110, fontFamily: t.f.tc, fontSize: 22, color: '#fff', background: '#0008', padding: '4px 12px'})}>（示意圖：未提供照片）</div>
      )}
    </AbsoluteFill>
  );
};

/** 照片牆：依旁白 cue 一張張進場 */
export const GalleryScene: React.FC<SceneProps> = ({p, cues, dur, accent}) => {
  const t = useTheme();
  const items = p.items as {media?: {src?: string; ok?: boolean}; caption?: string; fallback?: {icon?: string; label?: string}}[];
  const n = items.length;
  const w = n <= 2 ? 720 : n === 3 ? 520 : 400, h = Math.round(w * 0.72);
  const polaroid = ['chalk', 'softlight', 'swissgrid'].includes(t.bg) || p.frame === 'polaroid';
  return (
    <AbsoluteFill>
      <Heading zh={p.heading} en={p.en} accent={accent} top={130} center />
      <div style={abs({left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', gap: 44})}>
        {items.map((it, i) => (
          <FxEnter key={i} delay={p.cueMap ? cue(cues, p.cueMap[i], 10 + i * 12) : 10 + i * 12}
            style={{transform: polaroid ? `rotate(${(i - (n - 1) / 2) * 3}deg)` : undefined}}>
            <Photo m={it.media} w={w} h={h} frame={polaroid ? 'polaroid' : 'card'} kb={['in', 'left', 'out', 'right'][i % 4]} fallback={it.fallback}
              caption={it.caption} font={t.f.tc} accent={accent} dur={dur} />
          </FxEnter>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** 半照片＋重點條列 */
export const SplitScene: React.FC<SceneProps> = ({p, cues, dur, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const right = p.side === 'right';
  return (
    <AbsoluteFill>
      <div style={abs({[right ? 'right' : 'left']: 0, top: 0, opacity: ease(f, 0, 12)})}>
        <Photo m={p.media} w={900} h={1080} frame="full" kb={p.kb ?? (right ? 'left' : 'right')} fallback={p.fallback} font={t.f.tc} dur={dur} />
      </div>
      <div style={abs({[right ? 'left' : 'right']: 120, top: 220, width: 800})}>
        <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 80, color: t.c.fg, textShadow: glowOf(t, accent, 0.4), opacity: ease(f, 4, 14)}}>{p.heading}</div>
        {p.en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: 22, letterSpacing: 6, color: accent, marginTop: 8, opacity: ease(f, 8, 14)}}>{p.en}</div>}
        {(p.points ?? []).map((s: string, i: number) => (
          <FxEnter key={s} delay={cue(cues, i + 1, 20 + i * 12)} style={{marginTop: 30}}>
            <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 44, color: t.c.fg, borderLeft: `8px solid ${accent}`, paddingLeft: 24}}>{s}</div>
          </FxEnter>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const MEDIA_SCENES: Record<string, React.FC<SceneProps>> = {photo: PhotoScene, gallery: GalleryScene, split: SplitScene};
