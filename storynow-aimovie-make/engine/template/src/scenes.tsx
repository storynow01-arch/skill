/* 通用場景庫 —— 全部只用 theme token，換 style 就換整體風格。
   每個場景收到：p（spec 裡的 props）、cues（該場景每句旁白的起始 frame，教學模式用來對齊動畫）、dur、accent */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {ease, easeIO, glowOf, useTheme} from './theme';
import {ChapterTag, Chip, CodeWindow, Heading, Pop, abs, panelStyle} from './kit';
import {FxCounter, FxEnter, FxTitle} from './motion';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SceneProps = {p: any; cues: number[]; dur: number; accent: string};
export const cue = (cues: number[], i: number, fb: number) => (cues && cues[i] !== undefined ? cues[i] : fb);

const Chapter: React.FC<{p: SceneProps['p']; accent: string}> = ({p, accent}) =>
  p.chapter ? <ChapterTag num={p.chapter.num} zh={p.chapter.zh} en={p.chapter.en} accent={accent} /> : null;

export const Title: React.FC<SceneProps> = ({p, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const a = ease(f, 0, 18);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      {p.eyebrow && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 18 : 30, letterSpacing: 10, color: accent, opacity: ease(f, 4, 14)}}>{p.eyebrow}</div>}
      <div style={{width: 900 * ease(f, 6, 22), height: 2, background: `${accent}99`, margin: '26px 0 14px'}} />
      <div style={{letterSpacing: 4, opacity: a > 0 ? 1 : 0}}><FxTitle text={p.title} size={p.size ?? 150} accent={accent} /></div>
      <div style={{width: 1300 * ease(f, 8, 24), height: 3, background: accent, boxShadow: glowOf(t, accent, 0.6), margin: '14px 0 28px'}} />
      {p.subtitle && <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 42, color: t.c.fg, opacity: ease(f, 14, 16)}}>{p.subtitle}</div>}
      {p.en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 16 : 28, letterSpacing: 8, color: t.c.muted, marginTop: 16,
        opacity: ease(f, 20, 16)}}>{p.en}</div>}
    </AbsoluteFill>
  );
};

export const Statement: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Chapter p={p} accent={accent} />
      <Heading zh={p.heading} en={p.en} accent={accent} top={p.chapter ? 330 : 260} size={p.size ?? 84} />
      {p.body && <div style={abs({left: 140, right: 200, top: p.chapter ? 520 : 460, fontFamily: t.f.tc, fontWeight: 500, fontSize: 40, lineHeight: 1.6,
        color: t.c.fg, opacity: ease(f, cue(cues, 1, 12), 14)})}>{p.body}</div>}
      <div style={abs({left: 140, top: 760, display: 'flex', gap: 22, flexWrap: 'wrap'})}>
        {(p.chips ?? []).map((s: string, i: number) => (
          <Pop key={s} delay={cue(cues, i + 1, 18 + i * 6)}><Chip text={s} color={[t.c.accent, t.c.accent2, t.c.accent3][i % 3]} /></Pop>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Stat: React.FC<SceneProps> = ({p, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const big = t.f.num.includes('Press') ? 150 : 250;
  return (
    <AbsoluteFill>
      <Chapter p={p} accent={accent} />
      <div style={abs({left: 140, top: 360, display: 'flex', alignItems: 'flex-end', gap: 22})}>
        <FxCounter to={p.value} suffix={p.suffix ?? ''} size={big} color={accent} />
        {p.unit && <span style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 72, color: t.c.fg, marginBottom: 14}}>{p.unit}</span>}
      </div>
      <div style={abs({left: 150, top: 700, opacity: ease(f, 15, 14)})}>
        <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 56, color: t.c.fg}}>{p.label}</div>
        {p.sub && <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 32, color: accent, marginTop: 10}}>{p.sub}</div>}
        {p.en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 14 : 22, letterSpacing: 5, color: t.c.muted, marginTop: 12}}>{p.en}</div>}
      </div>
      {p.side && (
        <div style={abs({right: 160, top: 320, width: 620, display: 'flex', flexDirection: 'column', gap: 26})}>
          {p.side.map((s: string, i: number) => (
            <FxEnter key={s} delay={20 + i * 8}><div style={{...panelStyle(t, accent), padding: '26px 34px', fontFamily: t.f.tc, fontWeight: 700, fontSize: 36, color: t.c.fg}}>{s}</div></FxEnter>
          ))}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Cards: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const n = p.cards.length;
  const w = n <= 2 ? 700 : n === 3 ? 500 : 390;
  const cols = [t.c.accent, t.c.accent2, t.c.accent3, t.c.ok];
  return (
    <AbsoluteFill>
      <Chapter p={p} accent={accent} />
      <Heading zh={p.heading} en={p.en} accent={accent} top={p.chapter ? 300 : 170} center={!p.chapter} />
      <div style={abs({left: 0, right: 0, top: p.chapter ? 480 : 400, display: 'flex', justifyContent: 'center', gap: 40})}>
        {p.cards.map((c: {icon?: string; title: string; note?: string}, i: number) => {
          const at = p.cueMap ? cue(cues, p.cueMap[i], 10 + i * 10) : cue(cues, i + (p.cueOffset ?? 1), 10 + i * 10);
          const a = ease(f, at, 14);
          const col = cols[i % cols.length];
          return (
            <div key={i} style={{width: w, minHeight: 360, padding: '40px 36px', ...panelStyle(t, col, a > 0.95), opacity: 0.25 + 0.75 * a,
              transform: `translateY(${(1 - a) * 40}px)`, textAlign: 'center'}}>
              <div style={{fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 34 : 64, color: col, textShadow: glowOf(t, col, 0.6), fontFamily: `${t.f.num}, "Segoe UI Emoji", "Noto Color Emoji"`}}>{c.icon ?? String(i + 1).padStart(2, '0')}</div>
              <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 46, color: t.c.fg, marginTop: 22}}>{c.title}</div>
              {c.note && <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 30, color: t.c.muted, marginTop: 18, lineHeight: 1.5, whiteSpace: 'pre-line'}}>{c.note}</div>}
            </div>
          );
        })}
      </div>
      {p.footer && (
        <div style={abs({left: 0, right: 0, top: 830, display: 'flex', justifyContent: 'center', opacity: ease(f, cue(cues, cues.length - 1, 90), 14)})}>
          <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 38, color: t.c.fg, padding: '10px 40px', borderRadius: t.radius ? 50 : 0,
            border: `3px solid ${t.c.accent2}`, background: `${t.c.accent2}22`}}>{p.footer}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Code: React.FC<SceneProps> = ({p, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Chapter p={p} accent={accent} />
      <Heading zh={p.heading} en={p.en} accent={accent} top={330} />
      {(p.chips ?? []).length > 0 && (
        <div style={abs({left: 140, top: 520, display: 'flex', flexDirection: 'column', gap: 20})}>
          {p.chips.map((s: string, i: number) => <Pop key={s} delay={14 + i * 6}><Chip text={s} color={accent} /></Pop>)}
        </div>
      )}
      {p.files.map((fl: {title: string; lines: string[]}, i: number) => {
        const a = ease(f, 3 + i * 10, 14);
        return <CodeWindow key={fl.title} title={fl.title} lines={fl.lines} accent={i ? t.c.accent2 : accent} start={8 + i * 22} cpf={3.6}
          style={{left: 900 + i * 60 + (1 - a) * 200, top: 230 + i * 380, width: 860, opacity: a}} />;
      })}
    </AbsoluteFill>
  );
};

export const Timeline: React.FC<SceneProps> = ({p, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const y = 660, x0 = 200, x1 = 1720;
  const pr = easeIO(f, 6, 66);
  const items = p.items as {year: string; title: string; note?: string}[];
  return (
    <AbsoluteFill>
      <Chapter p={p} accent={accent} />
      <Heading zh={p.heading} en={p.en} accent={accent} top={p.chapter ? 300 : 170} />
      <div style={abs({left: x0, top: y - 2, width: (x1 - x0) * pr, height: 4, background: accent, boxShadow: glowOf(t, accent, 0.6)})} />
      {items.map((it, i) => {
        const x = x0 + 80 + (i * (x1 - x0 - 160)) / Math.max(1, items.length - 1);
        const a = ease(f, 6 + (66 * (x - x0)) / (x1 - x0), 10);
        const up = i % 2 === 0;
        return (
          <div key={i} style={{opacity: a}}>
            <div style={abs({left: x - 16, top: y - 16, width: 32, height: 32, borderRadius: t.radius ? 16 : 0, border: `4px solid ${accent}`, background: t.c.bg, transform: `scale(${a})`})} />
            <div style={abs({left: x - 200, width: 400, textAlign: 'center', top: up ? y - 210 : y + 50})}>
              <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: t.f.num.includes('Press') ? 32 : 60, color: accent, textShadow: glowOf(t, accent, 0.6)}}>{it.year}</div>
              <div style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 30, color: t.c.fg, marginTop: 6}}>{it.title}</div>
              {it.note && <div style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 24, color: t.c.muted}}>{it.note}</div>}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const Compare: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const side = (s: {title: string; items: string[]; tone?: string}, i: number) => {
    const col = s.tone === 'bad' ? t.c.bad : s.tone === 'ok' ? t.c.ok : i ? t.c.accent2 : accent;
    const a = ease(f, cue(cues, i + 1, 8 + i * 14), 14);
    return (
      <div style={{width: 700, padding: '40px 44px', ...panelStyle(t, col, true), opacity: 0.2 + 0.8 * a, transform: `translateX(${(1 - a) * (i ? 60 : -60)}px)`}}>
        <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 50, color: col}}>{s.title}</div>
        {s.items.map((it) => <div key={it} style={{fontFamily: t.f.tc, fontWeight: 500, fontSize: 34, color: t.c.fg, marginTop: 22}}>• {it}</div>)}
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Chapter p={p} accent={accent} />
      <Heading zh={p.heading} en={p.en} accent={accent} top={p.chapter ? 300 : 170} center={!p.chapter} />
      <div style={abs({left: 0, right: 0, top: p.chapter ? 470 : 380, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50})}>
        {side(p.left, 0)}
        <div style={{fontFamily: t.f.num, fontWeight: t.w.num, fontSize: 70, color: t.c.muted}}>{p.mid ?? 'VS'}</div>
        {side(p.right, 1)}
      </div>
    </AbsoluteFill>
  );
};

export const Closing: React.FC<SceneProps> = ({p, cues, accent}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
      <FxTitle text={p.title} size={p.size ?? 130} accent={accent} />
      <div style={{width: 1200 * ease(f, 8, 24), height: 3, background: accent, margin: '18px 0 26px', boxShadow: glowOf(t, accent, 0.6)}} />
      {p.subtitle && <div style={{fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: 54, color: accent, letterSpacing: 10, opacity: ease(f, 12, 14)}}>{p.subtitle}</div>}
      {(p.lines ?? []).map((l: string, i: number) => (
        <div key={l} style={{fontFamily: t.f.tc, fontWeight: 700, fontSize: 36, color: t.c.fg, marginTop: 18, opacity: ease(f, cue(cues, i, 24 + i * 10), 14)}}>{l}</div>
      ))}
      {p.en && <div style={{fontFamily: t.f.en, fontWeight: t.w.en, fontSize: t.f.en.includes('Press') ? 13 : 22, letterSpacing: 5, color: t.c.muted, marginTop: 26, opacity: ease(f, 40, 16)}}>{p.en}</div>}
    </AbsoluteFill>
  );
};

export const GENERIC: Record<string, React.FC<SceneProps>> = {
  title: Title, statement: Statement, stat: Stat, cards: Cards, code: Code, timeline: Timeline, compare: Compare, closing: Closing,
};
