import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, dropGlow, ease, glowOf, useTheme} from './theme';

export const abs = (s: React.CSSProperties): React.CSSProperties => ({position: 'absolute', ...s});

/* ---------------- HUD（四角框 + 標籤 + 進度條） ---------------- */
export const Hud: React.FC<{left?: string; right?: string; accent: string; frame: number; total: number}> = ({left, right, accent, frame, total}) => {
  const t = useTheme();
  const top = t.letterbox ? 110 : 40;
  const corner = (s: React.CSSProperties) => (
    <div style={{position: 'absolute', width: 46, height: 46, borderColor: accent, borderStyle: 'solid', borderWidth: 0, opacity: 0.8, ...s}} />
  );
  const lab: React.CSSProperties = {position: 'absolute', fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 13 : 21, letterSpacing: 3};
  return (
    <AbsoluteFill>
      {corner({left: 40, top, borderLeftWidth: 3, borderTopWidth: 3})}
      {corner({right: 40, top, borderRightWidth: 3, borderTopWidth: 3})}
      {corner({left: 40, bottom: top, borderLeftWidth: 3, borderBottomWidth: 3})}
      {corner({right: 40, bottom: top, borderRightWidth: 3, borderBottomWidth: 3})}
      {left && <div style={{...lab, left: 72, top: top + 18, color: t.c.muted}}>{left}</div>}
      {right && <div style={{...lab, right: 72, top: top + 18, color: accent}}>{right}</div>}
      <div style={{position: 'absolute', right: 72, bottom: top + 26, width: 350, height: 3, background: `${t.c.muted}44`}}>
        <div style={{width: `${(frame / total) * 100}%`, height: '100%', background: accent}} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- 字幕 ---------------- */
export const Captions: React.FC<{caps: {text: string; from: number; to: number}[]; frame: number}> = ({caps, frame}) => {
  const t = useTheme();
  const cur = caps.find((c) => frame >= c.from && frame < c.to);
  if (!cur) return null;
  const a = Math.min(1, (frame - cur.from) / 4, (cur.to - frame) / 4);
  return (
    <div style={abs({left: 0, right: 0, bottom: t.letterbox ? 108 : 64, display: 'flex', justifyContent: 'center', opacity: a})}>
      <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc >= 700 ? 700 : t.w.tc, fontSize: 40, color: t.dark ? '#fff' : t.c.fg, padding: '10px 34px',
        borderRadius: Math.min(t.radius, 14), background: t.dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
        boxShadow: t.dark ? 'none' : '0 4px 18px rgba(0,0,0,0.12)', letterSpacing: 1}}>{cur.text}</div>
    </div>
  );
};

/* ---------------- 章節標籤 / 標題 ---------------- */
export const ChapterTag: React.FC<{num: string; zh: string; en?: string; accent: string}> = ({num, zh, en, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const a = ease(f, 0, 14);
  return (
    <div style={abs({left: 110, top: t.letterbox ? 170 : 140, display: 'flex', alignItems: 'center', gap: 26, opacity: a, transform: `translateX(${(1 - a) * -60}px)`})}>
      <div style={{width: 8, height: 90, background: accent, boxShadow: glowOf(t, accent, 0.6)}} />
      <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 44 : 76, color: accent, textShadow: glowOf(t, accent, 0.7)}}>{num}</div>
      <div>
        <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 42, color: t.c.fg}}>{zh}</div>
        {en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 13 : 20, letterSpacing: 5, color: accent}}>{en}</div>}
      </div>
    </div>
  );
};

export const Heading: React.FC<{zh: string; en?: string; accent: string; top?: number; left?: number; size?: number; delay?: number; center?: boolean}> = (
  {zh, en, accent, top = 150, left = 140, size = 64, delay = 2, center}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const a = ease(f, delay, 16);
  const pos: React.CSSProperties = center ? {left: 0, right: 0, textAlign: 'center'} : {left};
  return (
    <div style={abs({...pos, top: top + (t.letterbox ? 30 : 0), opacity: a, transform: `translateY(${(1 - a) * 24}px)`})}>
      <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: size, color: t.c.fg, textShadow: glowOf(t, accent, 0.45), lineHeight: 1.2}}>{zh}</div>
      {en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 14 : 22, letterSpacing: 6, color: accent, marginTop: 6}}>{en}</div>}
    </div>
  );
};

export const Counter: React.FC<{to: number; delay?: number; dur?: number; suffix?: string; size: number; color: string; style?: React.CSSProperties}> = (
  {to, delay = 6, dur = 42, suffix = '', size, color, style}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const v = Math.round(to * ease(f, delay, dur));
  return <span style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: size, color, lineHeight: 1, textShadow: glowOf(t, color, 1.1),
    fontVariantNumeric: 'tabular-nums', ...style}}>{v}{suffix}</span>;
};

export const Pop: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay, children, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 12, stiffness: 160}});
  return <div style={{transform: `scale(${s})`, opacity: Math.min(1, s * 1.5), ...style}}>{children}</div>;
};

/* ---------------- 面板 / 卡片 / 膠囊 ---------------- */
export const panelStyle = (t: Theme, accent: string, strong = false): React.CSSProperties => ({
  background: t.bg === 'blobs' ? 'rgba(255,255,255,0.10)' : t.c.panel,
  border: `${t.bg === 'swissgrid' ? 3 : 2}px solid ${strong ? accent : t.dark ? `${accent}88` : `${t.c.fg}22`}`,
  borderRadius: t.radius,
  boxShadow: t.dark ? (t.glow > 0.01 ? `0 0 30px ${accent}22` : 'none') : '0 10px 30px rgba(0,0,0,0.08)',
  backdropFilter: t.bg === 'blobs' ? 'blur(18px)' : undefined,
});

export const Chip: React.FC<{text: string; color: string; size?: number; style?: React.CSSProperties}> = ({text, color, size = 28, style}) => {
  const t = useTheme();
  return <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: size, color: t.c.fg, border: `2px solid ${color}`, borderRadius: t.radius ? 40 : 0,
    padding: '8px 26px', background: `${color}1c`, whiteSpace: 'nowrap', ...style}}>{text}</div>;
};

/* ---------------- 程式碼視窗 ---------------- */
const KW = new Set(['int', 'void', 'return', 'while', 'for', 'if', 'include', 'import', 'from', 'def', 'in', 'as', 'struct', 'print']);
const tokenize = (t: Theme, line: string): [string, string][] => {
  const ci = line.search(/\/\/|#(?!include)/);
  if (ci >= 0) return [...tokenize(t, line.slice(0, ci)), [line.slice(ci), t.c.muted]];
  const out: [string, string][] = [];
  const re = /"[^"]*"|<[^>]*>|[A-Za-z_]\w*|\d+|\s+|./g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const s = m[0]; const next = line[re.lastIndex] ?? '';
    let col = t.c.muted;
    if (s.startsWith('"') || (s.startsWith('<') && s.endsWith('>'))) col = t.c.accent2;
    else if (KW.has(s)) col = t.c.bad;
    else if (/^\d+$/.test(s)) col = t.c.accent2;
    else if (/^[A-Za-z_]/.test(s)) col = next === '(' ? t.c.accent : t.c.fg;
    out.push([s, col]);
  }
  return out;
};

export const CodeWindow: React.FC<{title: string; lines: string[]; accent: string; start?: number; cpf?: number; style?: React.CSSProperties; fontSize?: number}> = (
  {title, lines, accent, start = 6, cpf = 3.5, style, fontSize = 23}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  let budget = Math.max(0, Math.floor((f - start) * cpf));
  const blink = Math.floor(f / 8) % 2 === 0;
  return (
    <div style={{position: 'absolute', overflow: 'hidden', ...panelStyle(t, accent), ...style}}>
      <div style={{height: 38, background: `${accent}22`, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px'}}>
        {[t.c.bad, t.c.accent2, t.c.ok].map((c) => <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />)}
        <div style={{fontFamily: t.f.mono, color: t.c.muted, fontSize: 17, marginLeft: 14}}>{title}</div>
      </div>
      <div style={{padding: '18px 24px', fontFamily: t.f.mono, fontSize, lineHeight: 1.55, whiteSpace: 'pre'}}>
        {lines.map((ln, i) => {
          if (budget <= 0 && i > 0) return <div key={i}>&nbsp;</div>;
          const shown = ln.slice(0, budget);
          const here = budget > 0 && budget <= ln.length + 3;
          budget -= ln.length + 3;
          return (
            <div key={i}>
              <span style={{color: `${t.c.muted}88`, marginRight: 22}}>{String(i + 1).padStart(2, ' ')}</span>
              {tokenize(t, shown).map(([s, c], k) => <span key={k} style={{color: c}}>{s}</span>)}
              {here && blink && <span style={{background: accent, color: accent}}>_</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ---------------- 轉場（依風格） ---------------- */
export const TransitionIn: React.FC<{t: Theme; f: number; children: React.ReactNode}> = ({t, f, children}) => {
  const p = Math.min(1, f / 12);
  const e = 1 - (1 - p) ** 3;
  let style: React.CSSProperties = {};
  switch (t.transition) {
    case 'slide': style = {transform: `translateX(${(1 - e) * 120}px)`, opacity: e}; break;
    case 'blur': style = {filter: e < 1 ? `blur(${(1 - e) * 24}px)` : undefined, opacity: e, transform: `scale(${1.04 - 0.04 * e})`}; break;
    case 'fade': style = {opacity: Math.min(1, f / 18)}; break;
    case 'wipe': style = {clipPath: `inset(0 ${(1 - e) * 100}% 0 0)`}; break;
    case 'pixel': style = {opacity: Math.round(e * 4) / 4}; break;
    default: style = {};
  }
  return <AbsoluteFill style={style}>{children}</AbsoluteFill>;
};

/** 切點特效：glitch 切片、wipe 光條、pixel 方塊 */
export const CutFx: React.FC<{t: Theme; g: number; frame: number}> = ({t, g, frame}) => {
  if (g <= 0) return null;
  if (t.transition === 'glitch')
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        {Array.from({length: 7}, (_, i) => {
          const r = (s: string) => (Math.sin((frame + 1) * 12.9898 + i * 78.233 + s.length) * 43758.5453) % 1;
          return <div key={i} style={abs({left: 0, right: 0, top: Math.abs(r('y')) * 1040, height: 6 + Math.abs(r('hh')) * 40,
            background: i % 2 ? `${t.c.accent}55` : `${t.c.bad}44`, transform: `translateX(${r('xxx') * 200 * g}px)`, mixBlendMode: 'screen'})} />;
        })}
      </AbsoluteFill>
    );
  if (t.transition === 'wipe')
    return <div style={abs({top: 0, bottom: 0, width: 14, left: `${(1 - g) * 100}%`, background: t.c.accent, opacity: g, boxShadow: glowOf(t, t.c.accent, 0.6)})} />;
  if (t.transition === 'pixel')
    return (
      <AbsoluteFill style={{display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', pointerEvents: 'none'}}>
        {Array.from({length: 24 * 14}, (_, i) => <div key={i} style={{background: t.c.bg, opacity: ((i * 7919) % 100) / 100 < g ? 1 : 0}} />)}
      </AbsoluteFill>
    );
  return null;
};

export {dropGlow};
