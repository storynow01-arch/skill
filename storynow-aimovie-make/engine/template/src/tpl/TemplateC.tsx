/* 範本 C：動態字體快剪 Kinetic Type —— 文字就是畫面，重點在拍點上砸入，場景之間硬切。
   黑白＋單一螢光強調色；字幕＝小黑條（大螢幕／靜音 YouTube 都看得懂）。 */
import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {QaProbe} from '../QaProbe';
import {TplSpec, captionAt, cue, fit, sceneIndex, wrap} from './common';

const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const EN = loadInter('normal', {weights: ['900']}).fontFamily;
const BK = '#000', WH = '#fff', AC = '#D4FF00', RED = '#FF3B4E', GOLD = '#FFC23D';
const EMOJI = '"Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number; bf: number};

/** 第 at 格砸入 */
const slam = (lf: number, at: number): React.CSSProperties => {
  const d = lf - at;
  const s = interpolate(d, [0, 4], [2.4, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const blur = interpolate(d, [0, 4], [14, 0], clamp);
  const sh = d >= 0 && d < 5 ? (random(`k${at}${d}`) - 0.5) * 20 : 0;
  return {transform: `translate(${sh}px, ${sh * 0.6}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: d < 0 ? 0 : 1};
};
const Big: React.FC<{c: string; size: number; font?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({c, size, font = TC, style, children}) => (
  <div style={{fontFamily: font, fontWeight: 900, fontSize: size, color: c, lineHeight: 1.05, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
const Full: React.FC<{bg: string; children: React.ReactNode}> = ({bg, children}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{children}</AbsoluteFill>
);
const Tag: React.FC<{text: string; c?: string; bg?: string; style?: React.CSSProperties}> = ({text, c = BK, bg = AC, style}) => (
  <div style={{fontFamily: TC, fontWeight: 900, fontSize: 40, color: c, background: bg, padding: '4px 22px', display: 'inline-block', ...style}}>{text}</div>
);
/** 把一句話切成 2–4 字的節拍詞組 */
const chunks = (s: string) => {
  const out: string[] = []; let cur = '';
  for (const ch of Array.from(s)) { cur += ch; if (/[，、。：！？·\s]/.test(ch) || cur.length >= 3) { out.push(cur.trim()); cur = ''; } }
  if (cur.trim()) out.push(cur.trim());
  return out.filter(Boolean);
};

const Title: React.FC<P> = ({p, dur, bf}) => {
  const lf = useCurrentFrame();
  const parts = chunks(p.title);
  const assembleAt = Math.min(Math.round(parts.length * bf), Math.round(dur * 0.55));
  if (lf < assembleAt) {
    const k = Math.min(parts.length - 1, Math.floor(lf / bf));
    const bgs = [BK, WH, AC], fgs = [WH, BK, BK];
    return <Full bg={bgs[k % 3]}><Big c={fgs[k % 3]} size={fit(parts[k], 1600, 480)} style={slam(lf, Math.round(k * bf))}>{parts[k]}</Big></Full>;
  }
  return (
    <Full bg={BK}>
      {p.eyebrow && <Tag text={String(p.eyebrow)} style={{position: 'absolute', top: 200, ...slam(lf, assembleAt)}} />}
      <Big c={WH} size={fit(p.title, 1700, 200)} style={slam(lf, assembleAt)}>{p.title}</Big>
      {p.en && <Big c={AC} size={40} font={EN} style={{position: 'absolute', bottom: 230, letterSpacing: 12, ...slam(lf, assembleAt + Math.round(bf))}}>{p.en}</Big>}
    </Full>
  );
};

const Scenario: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const pills: string[] = p.pills ?? [];
  const k = pills.reduce((acc, _, i) => (lf >= cue(cues, p.cueMap?.[i], 20 + i * 30) ? i : acc), -1);
  const last = k === pills.length - 1 && p.lastIsProblem !== false;
  if (k < 0) return (
    <Full bg={BK}>
      <span style={{fontFamily: EMOJI, fontSize: 360, ...slam(lf, 0)}}>{p.icon ?? '❓'}</span>
      <Big c={WH} size={fit(p.heading ?? '', 1600, 80)} style={{position: 'absolute', bottom: 200, ...slam(lf, 6)}}>{p.heading}</Big>
    </Full>
  );
  const at = cue(cues, p.cueMap?.[k], 20 + k * 30);
  return (
    <Full bg={last ? RED : k % 2 ? WH : BK}>
      <Big c={last ? WH : k % 2 ? BK : WH} size={fit(pills[k], 1600, 300)} style={slam(lf, at)}>{pills[k]}{last ? '?!' : ''}</Big>
      <div style={{position: 'absolute', top: 150, display: 'flex', gap: 16}}>
        {pills.slice(0, k).map((x) => <Tag key={x} text={'✓ ' + x} bg={k % 2 ? BK : WH} c={k % 2 ? WH : BK} />)}
      </div>
    </Full>
  );
};

const Definition: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const big: string = p.bigText, hl: string = p.highlight ?? '';
  const k = hl ? big.indexOf(hl) : -1;
  const hlAt = cue(cues, p.cueMap?.[1], 40);
  const bar = interpolate(lf, [hlAt, hlAt + 8], [0, 1], clamp);
  const notes: string[] = p.sideNotes ?? [];
  const size = fit(big, 1700, 220);
  return (
    <Full bg={BK}>
      {p.label && <Tag text={p.label} style={{position: 'absolute', top: 170, left: 120, ...slam(lf, 0)}} />}
      <Big c={WH} size={size} style={slam(lf, cue(cues, p.cueMap?.[0], 6))}>
        {k < 0 ? big : <>{big.slice(0, k)}<span style={{color: bar > 0 ? AC : WH, position: 'relative'}}>{hl}
          <span style={{position: 'absolute', left: 0, bottom: -size * 0.12, height: size * 0.1, width: `${bar * 100}%`, background: AC}} /></span>{big.slice(k + hl.length)}</>}
      </Big>
      <div style={{position: 'absolute', bottom: 190, display: 'flex', gap: 24}}>
        {notes.map((n, i) => <div key={n} style={slam(lf, cue(cues, p.noteCues?.[i], 50 + i * 15))}><Tag text={n} bg={WH} /></div>)}
      </div>
    </Full>
  );
};

const Cards: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const cards: {icon?: string; title: string; note?: string}[] = p.cards ?? [];
  const k = cards.reduce((acc, _, i) => (lf >= cue(cues, p.cueMap?.[i], 20 + i * 30) ? i : acc), -1);
  if (k < 0) return <Full bg={BK}><Big c={WH} size={fit(p.heading ?? '', 1700, 150)} style={slam(lf, 0)}>{p.heading}</Big></Full>;
  const at = cue(cues, p.cueMap?.[k], 20 + k * 30);
  const c = cards[k];
  const inv = k % 2 === 1;
  return (
    <Full bg={inv ? WH : BK}>
      <div style={{position: 'absolute', top: 140, display: 'flex', gap: 14}}>
        {cards.map((x, i) => <Tag key={i} text={`${i + 1} ${x.title}`} bg={i === k ? AC : inv ? '#ddd' : '#222'} c={i === k ? BK : inv ? '#999' : '#777'} />)}
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 60, ...slam(lf, at)}}>
        <span style={{fontFamily: EMOJI, fontSize: 260}}>{c.icon ?? '⭐'}</span>
        <div>
          <Big c={inv ? BK : WH} size={fit(c.title, 1000, 200)}>{c.title}</Big>
          {c.note && <Big c={inv ? '#333' : AC} size={fit(c.note, 1000, 64)} style={{marginTop: 24, whiteSpace: 'normal', maxWidth: 1000}}>{c.note}</Big>}
        </div>
      </div>
      {p.footer && lf >= cue(cues, cues.length - 1, 120) && <Tag text={p.footer} bg={RED} c={WH} style={{position: 'absolute', bottom: 190, ...slam(lf, cue(cues, cues.length - 1, 120))}} />}
    </Full>
  );
};

const Vs: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const half = (s: {frame: string; icon: string; text: string}, i: number) => {
    const at = cue(cues, p.cueMap?.[i], i ? 40 : 6);
    const y = interpolate(lf, [at, at + 6], [i ? 1080 : -1080, 0], {...clamp, easing: Easing.out(Easing.cubic)});
    const bad = s.frame === 'danger';
    return (
      <div style={{flex: 1, background: i ? WH : BK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `translateY(${y}px)`, padding: 40}}>
        <Big c={bad ? RED : s.frame === 'success' ? '#18A957' : AC} size={200}>{bad ? '✕' : s.frame === 'success' ? '✓' : '●'}</Big>
        {wrap(s.text, 9).slice(0, 3).map((ln, k) => <Big key={k} c={i ? BK : WH} size={fit(ln, 820, 90)} style={{marginTop: 10}}>{ln}</Big>)}
      </div>
    );
  };
  return (
    <AbsoluteFill style={{flexDirection: 'row'}}>
      {half(p.left, 0)}{half(p.right, 1)}
      <div style={{position: 'absolute', left: 900, top: 480, width: 120, height: 120, borderRadius: 60, background: AC, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Big c={BK} size={56} font={EN}>{!p.mid || p.mid === 'vs' ? 'VS' : p.mid}</Big></div>
      {p.footerPill && lf >= cue(cues, cues.length - 1, 90) && <Tag text={p.footerPill} style={{position: 'absolute', left: 0, right: 0, margin: '0 auto', width: 'fit-content', bottom: 180,
        ...slam(lf, cue(cues, cues.length - 1, 90))}} />}
    </AbsoluteFill>
  );
};

const Quiz: React.FC<P> = ({p, cues, dur}) => {
  const lf = useCurrentFrame();
  const reveal = cue(cues, p.revealCue, dur * 0.6);
  const r = lf >= reveal;
  const opts: string[] = p.options ?? [];
  const think = Math.max(0, Math.min(1, (lf - cue(cues, 1, 20)) / Math.max(1, reveal - cue(cues, 1, 20))));
  return (
    <Full bg={BK}>
      <Tag text="QUIZ" style={{position: 'absolute', top: 150, ...slam(lf, 0)}} />
      <Big c={WH} size={fit(p.question, 1700, 110)} style={{position: 'absolute', top: 260, ...slam(lf, 4)}}>{p.question}</Big>
      <div style={{position: 'absolute', top: 500, display: 'flex', gap: 40}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return <div key={o} style={{padding: '30px 50px', background: r ? (ok ? AC : '#222') : WH, opacity: r && !ok ? 0.4 : 1, ...slam(lf, 10 + i * 6)}}>
            <Big c={BK} size={fit(o, 1500 / opts.length - 100, 90)}>{r && ok ? '✓ ' : ''}{o}</Big></div>;
        })}
      </div>
      {!r && <div style={{position: 'absolute', bottom: 200, left: 300, right: 300, height: 14, background: '#333'}}><div style={{width: `${think * 100}%`, height: '100%', background: AC}} /></div>}
      {r && p.afterNote && <Big c={AC} size={fit(p.afterNote, 1600, 56)} style={{position: 'absolute', bottom: 190, ...slam(lf, reveal + 10)}}>{p.afterNote}</Big>}
    </Full>
  );
};

const Stat: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const at = cue(cues, 0, 6);
  const v = Math.round(p.value * interpolate(lf, [at, at + 24], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}));
  const txt = `${v}${p.suffix ?? ''}`;
  return (
    <Full bg={BK}>
      <div style={{fontFamily: EN, fontWeight: 900, fontSize: fit(String(p.value) + (p.suffix ?? ''), 1250, 520), lineHeight: 0.85, letterSpacing: -20,
        backgroundImage: `radial-gradient(${AC} 3.5px, transparent 4px)`, backgroundSize: '22px 22px', WebkitBackgroundClip: 'text', backgroundClip: 'text',
        color: 'transparent', WebkitTextStroke: `6px ${AC}`, ...slam(lf, at)}}>{txt}</div>
      <Big c={WH} size={fit(p.label ?? '', 1600, 90)} style={{position: 'absolute', bottom: 210, background: BK, padding: '0 30px', ...slam(lf, at + 12)}}>{p.label}</Big>
      {p.sub && <Big c={AC} size={fit(p.sub, 1600, 44)} style={{position: 'absolute', top: 130, ...slam(lf, at + 18)}}>{p.sub}</Big>}
    </Full>
  );
};

const Recap: React.FC<P> = ({p, cues}) => {
  const lf = useCurrentFrame();
  const take: string[] = p.takeaway ?? [];
  const nAt = cue(cues, p.nextCue, 1e9);
  if (lf >= nAt && p.nextTeaser) return (
    <Full bg={AC}><Big c={BK} size={60} font={EN} style={{position: 'absolute', top: 300, letterSpacing: 14, ...slam(lf, nAt)}}>NEXT ▶</Big>
      <Big c={BK} size={fit(p.nextTeaser, 1600, 200)} style={slam(lf, nAt + 4)}>{p.nextTeaser}</Big></Full>
  );
  return (
    <Full bg={BK}>
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34}}>
        {take.map((t, i) => {
          const at = cue(cues, p.takeCues?.[i], 20 + i * 40);
          return <Big key={t} c={i % 2 ? AC : WH} size={fit(t, 1700, 110)} style={slam(lf, at)}>{t}</Big>;
        })}
      </div>
    </Full>
  );
};

const QaEnd: React.FC<P> = ({p}) => {
  const lf = useCurrentFrame(); const {fps} = useVideoConfig();
  const ans = Math.round((p.answerSec ?? 4) * fps);
  const r = lf >= ans;
  const opts: string[] = p.options ?? [];
  return (
    <Full bg={BK}>
      <Big c={WH} size={fit(p.question, 1700, 80)} style={{position: 'absolute', top: 150, ...slam(lf, 0)}}>{p.question}</Big>
      <div style={{position: 'absolute', top: 330, left: 160, right: 160, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 30}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return <div key={o} style={{background: r ? (ok ? AC : '#222') : WH, opacity: r && !ok ? 0.4 : 1, padding: '26px 30px', ...slam(lf, 4 + i * 3)}}>
            <Big c={BK} size={fit(o, 700, 56)}>{String.fromCharCode(65 + i)}. {o}</Big></div>;
        })}
      </div>
      <div style={{position: 'absolute', bottom: 190, left: 300, right: 300, height: 14, background: '#333'}}><div style={{width: `${Math.min(1, lf / ans) * 100}%`, height: '100%', background: r ? AC : RED}} /></div>
    </Full>
  );
};

const SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, quiz: Quiz, stat: Stat, recap: Recap, qaEnd: QaEnd};

export const TemplateC: React.FC<TplSpec & {bpm?: number}> = (spec) => {
  const f = useCurrentFrame();
  const bf = (60 / (spec.bpm ?? 145)) * spec.fps;
  const idx = sceneIndex(spec, f);
  const cur = spec.scenes[idx];
  const flash = idx > 0 && f - cur.from < 3;
  const cap = captionAt(spec, f, 6);
  const fade = Math.max(0, 1 - f / 4, (f - (spec.totalFrames - 16)) / 16);
  return (
    <AbsoluteFill style={{background: BK}}>
      {spec.scenes.map((s) => {
        const Comp = SCENES[s.type];
        return Comp ? <Sequence key={s.id} from={s.from} durationInFrames={s.dur}><Comp p={s.props} cues={s.cues} dur={s.dur} bf={bf} /></Sequence> : null;
      })}
      {flash && <AbsoluteFill style={{background: AC, opacity: 1 - (f - cur.from) / 3}} />}
      {cap && <div data-qa="caption" style={{position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center'}}>
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 36, color: WH, background: 'rgba(0,0,0,0.8)', padding: '8px 28px', borderLeft: `6px solid ${AC}`, maxWidth: 1600}}>{cap.text}</div></div>}
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.55} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
