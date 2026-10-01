/* 真實照片／影片元件，**沒有素材時自動退回插畫**。
   素材由 build.py 在建置時解析：存在的檔案複製進 public/media/，props 帶 {src, ok}；不存在的 ok=false → 這裡畫退回版。
   <Photo m={{src, ok, focus:[0.5,0.4]}} w h frame="full|card|polaroid|circle" kb="in|out|left|right" fallback={{icon:'🤖', label:'機械手臂實作'}} /> */
import React from 'react';
import {Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

export type Media = {src?: string; ok?: boolean; kind?: 'image' | 'video'; focus?: [number, number]; start?: number};
export type Fallback = {icon?: string; label?: string; colors?: [string, string]};
const EMOJI = '"Segoe UI Emoji", "Noto Color Emoji", sans-serif';

/** Ken Burns：in 推近、out 拉遠、left/right 平移 */
const kenBurns = (kb: string, p: number, focus: [number, number]) => {
  const [fx, fy] = focus;
  if (kb === 'out') return {scale: interpolate(p, [0, 1], [1.18, 1.0]), x: 0, y: 0, ox: fx, oy: fy};
  if (kb === 'left') return {scale: 1.15, x: interpolate(p, [0, 1], [3, -3]), y: 0, ox: fx, oy: fy};
  if (kb === 'right') return {scale: 1.15, x: interpolate(p, [0, 1], [-3, 3]), y: 0, ox: fx, oy: fy};
  return {scale: interpolate(p, [0, 1], [1.0, 1.18]), x: 0, y: 0, ox: fx, oy: fy};
};

/** 退回插畫：漸層＋大圖示＋標籤（沒有照片時一樣好看） */
export const FallbackArt: React.FC<{fb?: Fallback; w: number; h: number; font?: string}> = ({fb = {}, w, h, font = 'sans-serif'}) => {
  const f = useCurrentFrame();
  const [c1, c2] = fb.colors ?? ['#1F3B73', '#4D8DF7'];
  return (
    <div style={{width: w, height: h, background: `linear-gradient(135deg, ${c1}, ${c2})`, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', position: 'relative', overflow: 'hidden'}}>
      {Array.from({length: 6}, (_, i) => <div key={i} style={{position: 'absolute', width: w * 0.5, height: w * 0.5, borderRadius: '50%', border: '2px solid #ffffff22',
        left: (i * 0.2 - 0.1) * w, top: (((i * 37) % 100) / 100 - 0.25) * h, transform: `scale(${1 + 0.05 * Math.sin(f / 20 + i)})`}} />)}
      <span style={{fontFamily: EMOJI, fontSize: Math.min(w, h) * 0.36, transform: `translateY(${Math.sin(f / 12) * 6}px)`}}>{fb.icon ?? '📷'}</span>
      {fb.label && <span style={{fontFamily: font, fontWeight: 900, fontSize: Math.min(w, h) * 0.08, color: '#fff', marginTop: h * 0.03, textAlign: 'center', padding: '0 6%'}}>{fb.label}</span>}
    </div>
  );
};

export const Photo: React.FC<{m?: Media; w: number; h: number; frame?: 'full' | 'card' | 'polaroid' | 'circle'; kb?: string; fallback?: Fallback;
  caption?: string; font?: string; accent?: string; dur?: number}> = ({m, w, h, frame = 'card', kb = 'in', fallback, caption, font = 'sans-serif', accent = '#fff', dur}) => {
  const f = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const p = Math.min(1, f / (dur ?? durationInFrames));
  const k = kenBurns(kb, p, m?.focus ?? [0.5, 0.5]);
  const inner = m?.ok && m.src ? (
    <div style={{width: w, height: h, overflow: 'hidden', position: 'relative'}}>
      <div style={{width: '100%', height: '100%', transform: `translate(${k.x}%, ${k.y}%) scale(${k.scale})`, transformOrigin: `${k.ox * 100}% ${k.oy * 100}%`}}>
        {m.kind === 'video'
          ? <OffthreadVideo src={staticFile(m.src)} startFrom={m.start ?? 0} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
          : <Img src={staticFile(m.src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${(m.focus ?? [0.5, 0.5])[0] * 100}% ${(m.focus ?? [0.5, 0.5])[1] * 100}%`}} />}
      </div>
    </div>
  ) : <FallbackArt fb={fallback} w={w} h={h} font={font} />;

  if (frame === 'polaroid') return (
    <div style={{background: '#fff', padding: `${w * 0.04}px ${w * 0.04}px ${w * 0.16}px`, boxShadow: '0 20px 40px rgba(0,0,0,0.35)', position: 'relative'}}>
      {inner}
      {caption && <div style={{position: 'absolute', left: 0, right: 0, bottom: w * 0.04, textAlign: 'center', fontFamily: font, fontWeight: 700, fontSize: w * 0.06, color: '#23324A'}}>{caption}</div>}
    </div>
  );
  if (frame === 'circle') return <div style={{width: w, height: h, borderRadius: '50%', overflow: 'hidden', border: `8px solid ${accent}`, boxShadow: `0 0 40px ${accent}66`}}>{inner}</div>;
  if (frame === 'full') return <div style={{width: w, height: h, position: 'relative'}}>{inner}</div>;
  return (
    <div style={{borderRadius: 18, overflow: 'hidden', border: `4px solid ${accent}`, boxShadow: `0 20px 50px rgba(0,0,0,0.4)`, position: 'relative'}}>
      {inner}
      {caption && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, padding: '14px 24px', background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
        fontFamily: font, fontWeight: 900, fontSize: Math.max(28, w * 0.045), color: '#fff'}}>{caption}</div>}
    </div>
  );
};
