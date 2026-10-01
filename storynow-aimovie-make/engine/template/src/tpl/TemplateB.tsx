/* 範本 B：創客手稿 Maker's Notebook —— 一鏡到底。每個場景是大筆記本上的一個區塊，鏡頭一路滑過去，最後拉遠看整本。
   所有內容都用「逐筆描出」呈現；字幕＝紙膠帶。 */
import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadKai} from '@remotion/google-fonts/LXGWWenKaiTC';
import {loadFont as loadHand} from '@remotion/google-fonts/Caveat';
import {DrawPath, DrawText, Pencil} from '../lib/draw';
import {QaProbe} from '../QaProbe';
import {TplSpec, captionAt, cue, fit, sceneIndex, wrap} from './common';

const KAI = loadKai('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;
const HAND = loadHand('normal', {weights: ['700']}).fontFamily;
const INK = '#23324A', RED = '#E2483D', YEL = '#FFD84D', BLUE = '#2F6FD6', GREEN = '#2E9E5B', PAPER = '#FBF8F1';
const EMOJI = '"Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const io = Easing.inOut(Easing.cubic);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const RW = 1700, RH = 1000, GAP = 180, COLS = 3, MARGIN = 260;   // 每個區塊的大小與排列
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = {p: any; cues: number[]; dur: number; s: number; f: number};   // s＝場景在全片的起始 frame（繪製時間用全片時間）

const region = (i: number) => ({x: MARGIN + (i % COLS) * (RW + GAP), y: MARGIN + Math.floor(i / COLS) * (RH + GAP)});
const T0 = (r: R, k: number) => r.s + Math.round(r.dur * 0.15) + k;      // 區塊開始畫的時間
const C = (r: R, i: number | undefined, fb: number) => r.s + cue(r.cues, i, fb);

const Sticky: React.FC<{x: number; y: number; w: number; h: number; color?: string; rot?: number; a: number; children?: React.ReactNode}> = ({x, y, w, h, color = YEL, rot = 0, a, children}) => (
  <g transform={`translate(${x} ${y + (1 - a) * 120}) rotate(${rot})`} opacity={a > 0 ? 1 : 0}>
    <rect x={6} y={10} width={w} height={h} fill="#0002" />
    <rect width={w} height={h} fill={color} />
    <rect x={w / 2 - 50} y={-14} width={100} height={30} fill="#ffffffaa" />
    {children}
  </g>
);
const pop = (f: number, at: number) => interpolate(f, [at, at + 12], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.5))});
const Lines: React.FC<{x: number; y: number; text: string; per: number; size: number; color?: string; font?: string; start: number; f: number; lh?: number; dur?: number}> = (
  {x, y, text, per, size, color = INK, font = KAI, start, f, lh = 1.25, dur = 14}) => (
  <>{wrap(text, per).map((ln, i) => <DrawText key={i} x={x} y={y + i * size * lh} text={ln} size={size} font={font} color={color} start={start + i * 6} dur={dur} f={f} />)}</>
);

/* ---------- 各場景（區塊內座標 0..RW × 0..RH） ---------- */
const Title: React.FC<R> = (r) => {
  const size = fit(r.p.title, RW - 200, 160);
  return <>
    {r.p.eyebrow && <DrawText x={100} y={220} text={String(r.p.eyebrow)} size={64} font={HAND} color={BLUE} start={T0(r, 0)} dur={14} f={r.f} />}
    <DrawText x={100} y={520} text={r.p.title} size={size} font={KAI} color={INK} start={T0(r, 8)} dur={Math.round(r.dur * 0.4)} f={r.f} />
    <DrawPath d={`M 100 ${560} Q ${RW / 2} ${600} ${RW - 150} ${550}`} start={T0(r, 8) + Math.round(r.dur * 0.4)} dur={12} f={r.f} color={RED} w={10} len={2200} />
    {r.p.en && <DrawText x={110} y={680} text={r.p.en} size={50} font={HAND} color={BLUE} start={T0(r, 20) + Math.round(r.dur * 0.4)} dur={14} f={r.f} />}
  </>;
};
const Scenario: React.FC<R> = (r) => {
  const pills: string[] = r.p.pills ?? [];
  return <>
    <Lines x={80} y={170} text={r.p.heading ?? ''} per={22} size={64} start={T0(r, 0)} f={r.f} />
    <DrawPath d="M 330 320 a 210 210 0 1 0 0.1 0" start={T0(r, 6)} dur={16} f={r.f} w={6} len={1400} />
    <text x={330} y={600} textAnchor="middle" fontFamily={EMOJI} fontSize={220} opacity={r.f > T0(r, 14) ? 1 : 0}>{r.p.icon ?? '❓'}</text>
    {pills.map((x, i) => {
      const at = C(r, r.p.cueMap?.[i], 20 + i * 30), y = 360 + i * 150;
      const last = i === pills.length - 1 && r.p.lastIsProblem !== false;
      return <g key={x}>
        <DrawPath d={`M 700 ${y - 50} h 64 v 64 h -64 Z`} start={at - 8} dur={8} f={r.f} w={5} len={300} />
        {last ? <DrawPath d={`M 708 ${y - 42} l 48 48 M 756 ${y - 42} l -48 48`} start={at} dur={8} f={r.f} color={RED} w={8} len={160} />
          : <DrawPath d={`M 708 ${y - 18} l 18 20 l 34 -44`} start={at} dur={8} f={r.f} color={GREEN} w={8} len={120} />}
        <DrawText x={800} y={y + 6} text={x} size={fit(x, 850, 60)} font={KAI} color={last ? RED : INK} start={at} dur={12} f={r.f} />
      </g>;
    })}
  </>;
};
const Definition: React.FC<R> = (r) => {
  const big: string = r.p.bigText, hl: string = r.p.highlight ?? '';
  const size = fit(big, RW - 200, 130);
  const k = hl ? big.indexOf(hl) : -1;
  const pre = Array.from(big).slice(0, Math.max(0, k)).reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? 0.56 : 1), 0) * size;
  const hlw = Array.from(hl).length * size;
  const hlAt = C(r, r.p.cueMap?.[1], 40);
  const mk = interpolate(r.f, [hlAt, hlAt + 12], [0, 1], {...clamp, easing: io});
  const notes: string[] = r.p.sideNotes ?? [];
  return <>
    {r.p.label && <g opacity={r.f > T0(r, 0) ? 1 : 0}><rect x={80} y={90} width={Math.max(300, Array.from(String(r.p.label)).length * 46 + 40)} height={80} fill="#9ED8FF" opacity={0.85} />
      <text x={100} y={148} fontFamily={KAI} fontWeight={700} fontSize={44} fill={INK}>{r.p.label}</text></g>}
    {k >= 0 && <rect x={100 + pre} y={430 - size * 0.55} width={hlw * mk} height={size * 0.62} fill={YEL} opacity={0.85} />}
    <DrawText x={100} y={430} text={big} size={size} font={KAI} color={INK} start={T0(r, 6)} dur={Math.round(r.dur * 0.3)} f={r.f} />
    {notes.map((n, i) => {
      const at = C(r, r.p.noteCues?.[i], 50 + i * 15);
      const w = (RW - 260) / Math.max(1, notes.length) - 40;
      return <Sticky key={n} x={100 + i * (w + 60)} y={600} w={w} h={220} rot={(i - 1) * 3} a={pop(r.f, at)} color={['#FFE680', '#BDE0FE', '#CDEAC0'][i % 3]}>
        <text x={w / 2} y={130} textAnchor="middle" fontFamily={KAI} fontWeight={700} fontSize={fit(n, w - 40, 52)} fill={INK}>{n}</text>
      </Sticky>;
    })}
  </>;
};
const Cards: React.FC<R> = (r) => {
  const cards: {icon?: string; title: string; note?: string}[] = r.p.cards ?? [];
  const n = Math.max(1, cards.length), w = Math.min(460, (RW - 200) / n - 50);
  return <>
    <Lines x={80} y={170} text={r.p.heading ?? ''} per={24} size={64} start={T0(r, 0)} f={r.f} />
    {cards.map((c, i) => {
      const at = C(r, r.p.cueMap?.[i], 20 + i * 30);
      return <Sticky key={i} x={100 + i * (w + 50)} y={300} w={w} h={500} rot={(i % 2 ? 2 : -2)} a={pop(r.f, at)} color={['#FFE680', '#FFC8DD', '#BDE0FE', '#CDEAC0'][i % 4]}>
        <text x={w / 2} y={170} textAnchor="middle" fontFamily={EMOJI} fontSize={120}>{c.icon ?? '⭐'}</text>
        <text x={w / 2} y={290} textAnchor="middle" fontFamily={KAI} fontWeight={700} fontSize={fit(c.title, w - 40, 58)} fill={INK}>{c.title}</text>
        {c.note && wrap(c.note, Math.max(4, Math.floor((w - 40) / 34))).slice(0, 3).map((ln, k) => (
          <text key={k} x={w / 2} y={370 + k * 46} textAnchor="middle" fontFamily={KAI} fontWeight={700} fontSize={34} fill={BLUE}>{ln}</text>))}
      </Sticky>;
    })}
    {r.p.footer && <DrawText x={100} y={820} text={'★ ' + r.p.footer} size={fit(r.p.footer, RW - 300, 54)} font={KAI} color={RED} start={C(r, r.cues.length - 1, 120)} dur={16} f={r.f} />}
  </>;
};
const Vs: React.FC<R> = (r) => {
  const side = (s: {frame: string; icon: string; text: string}, i: number) => {
    const at = C(r, r.p.cueMap?.[i], i ? 40 : 6), x = i ? 920 : 100;
    const col = s.frame === 'danger' ? RED : s.frame === 'success' ? GREEN : BLUE;
    const st = interpolate(r.f, [at + 14, at + 20], [2.2, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    return <g key={i}>
      <DrawPath d={`M ${x} 160 h 680 v 600 h -680 Z`} start={at - 10} dur={12} f={r.f} w={6} len={2600} />
      <text x={x + 340} y={390} textAnchor="middle" fontFamily={EMOJI} fontSize={150} opacity={r.f > at ? 1 : 0}>{s.icon}</text>
      {wrap(s.text, 11).slice(0, 3).map((ln, k) => <DrawText key={k} x={x + 40} y={530 + k * 70} text={ln} size={58} font={KAI} color={INK} start={at + k * 5} dur={14} f={r.f} />)}
      {s.frame !== 'primary' && r.f > at + 14 && <g transform={`translate(${x + 590} 240) scale(${st}) rotate(-12)`}>
        <circle r={70} fill="none" stroke={col} strokeWidth={10} /><text y={30} textAnchor="middle" fontFamily={KAI} fontWeight={700} fontSize={90} fill={col}>{s.frame === 'danger' ? '✕' : '✓'}</text></g>}
    </g>;
  };
  return <>
    {side(r.p.left, 0)}
    <text x={850} y={500} textAnchor="middle" fontFamily={HAND} fontWeight={700} fontSize={120} fill={INK} opacity={r.f > T0(r, 10) ? 1 : 0}>{!r.p.mid || r.p.mid === 'vs' ? 'vs' : r.p.mid}</text>
    {side(r.p.right, 1)}
    {r.p.footerPill && <DrawText x={100} y={820} text={'→ ' + r.p.footerPill} size={fit(r.p.footerPill, RW - 300, 56)} font={KAI} color={RED} start={C(r, r.cues.length - 1, 90)} dur={16} f={r.f} />}
  </>;
};
const Quiz: React.FC<R> = (r) => {
  const opts: string[] = r.p.options ?? [];
  const reveal = C(r, r.p.revealCue, r.dur * 0.6);
  const w = (RW - 200 - (opts.length - 1) * 60) / Math.max(1, opts.length);
  return <>
    <g opacity={r.f > T0(r, 0) ? 1 : 0}><rect x={80} y={90} width={260} height={80} fill="#FFC8DD" /><text x={100} y={148} fontFamily={KAI} fontWeight={700} fontSize={44} fill={INK}>小測驗</text></g>
    <Lines x={100} y={300} text={r.p.question} per={22} size={72} start={T0(r, 6)} f={r.f} />
    {opts.map((o, i) => {
      const x = 100 + i * (w + 60);
      return <g key={o}>
        <DrawPath d={`M ${x} 520 h ${w} v 220 h ${-w} Z`} start={T0(r, 20) + i * 6} dur={12} f={r.f} w={5} len={2400} />
        <DrawText x={x + 40} y={650} text={`${String.fromCharCode(65 + i)}. ${o}`} size={fit(o + 'AA', w - 80, 60)} font={KAI} color={INK} start={T0(r, 26) + i * 6} dur={14} f={r.f} />
        {i === r.p.answerIndex && <DrawPath d={`M ${x + w / 2} 500 C ${x + w + 60} 500, ${x + w + 60} 760, ${x + w / 2} 765 C ${x - 60} 770, ${x - 60} 500, ${x + w / 2 + 40} 505`}
          start={reveal} dur={12} f={r.f} color={RED} w={10} len={2400} />}
      </g>;
    })}
    {r.p.afterNote && <DrawText x={100} y={820} text={r.p.afterNote} size={fit(r.p.afterNote, RW - 250, 54)} font={KAI} color={RED} start={reveal + 20} dur={18} f={r.f} />}
  </>;
};
const Stat: React.FC<R> = (r) => {
  const at = C(r, 0, 10);
  const num = `${r.p.value}${r.p.suffix ?? ''}`;
  return <>
    <DrawText x={200} y={560} text={num} size={380} font={HAND} color={RED} start={at} dur={22} f={r.f} />
    <DrawPath d={`M 520 210 C 900 200, 940 640, 520 650 C 120 660, 80 230, 420 200 C 480 195, 540 200, 600 220`} start={at + 20} dur={14} f={r.f} color={RED} w={12} len={2600} />
    <Lines x={980} y={420} text={r.p.label ?? ''} per={10} size={80} start={at + 26} f={r.f} />
    {r.p.sub && <Lines x={980} y={700} text={r.p.sub} per={14} size={48} color={BLUE} start={at + 40} f={r.f} />}
  </>;
};
const Recap: React.FC<R> = (r) => {
  const take: string[] = r.p.takeaway ?? [], recap: string[] = r.p.recap ?? [];
  return <>
    <DrawText x={80} y={170} text="今天帶走" size={72} font={KAI} color={RED} start={T0(r, 0)} dur={12} f={r.f} />
    {take.map((t, i) => {
      const at = C(r, r.p.takeCues?.[i], 20 + i * 40), y = 320 + i * 130;
      return <g key={t}><DrawPath d={`M 90 ${y - 24} l 20 22 l 40 -50`} start={at} dur={8} f={r.f} color={GREEN} w={9} len={120} />
        <DrawText x={170} y={y} text={t} size={fit(t, recap.length ? 1000 : 1400, 64)} font={KAI} color={INK} start={at} dur={16} f={r.f} /></g>;
    })}
    {recap.map((t, i) => <DrawText key={t} x={1240} y={320 + i * 70} text={'· ' + t} size={fit(t, 400, 38)} font={KAI} color={BLUE} start={T0(r, 20) + i * 6} dur={12} f={r.f} />)}
    {r.p.nextTeaser && <>
      <DrawPath d="M 100 800 h 260 l -30 -24 M 360 800 l -30 24" start={C(r, r.p.nextCue, 120)} dur={10} f={r.f} color={RED} w={8} len={500} />
      <DrawText x={400} y={820} text={'下一節：' + r.p.nextTeaser} size={64} font={KAI} color={RED} start={C(r, r.p.nextCue, 120) + 6} dur={16} f={r.f} />
    </>}
  </>;
};
const QaEnd: React.FC<R> = (r) => {
  const {fps} = useVideoConfig();
  const ans = r.s + Math.round((r.p.answerSec ?? 4) * fps);
  const opts: string[] = r.p.options ?? [];
  return <>
    <Lines x={80} y={160} text={r.p.question} per={24} size={64} start={T0(r, 0)} f={r.f} />
    {opts.map((o, i) => {
      const x = 100 + (i % 2) * 780, y = 380 + Math.floor(i / 2) * 230;
      return <g key={o}>
        <DrawPath d={`M ${x} ${y} h 720 v 170 h -720 Z`} start={T0(r, 6) + i * 4} dur={10} f={r.f} w={5} len={1900} />
        <DrawText x={x + 30} y={y + 105} text={`${String.fromCharCode(65 + i)}. ${o}`} size={fit(o + 'AA', 660, 52)} font={KAI} color={INK} start={T0(r, 10) + i * 4} dur={12} f={r.f} />
        {i === r.p.answerIndex && <DrawPath d={`M ${x + 360} ${y - 20} C ${x + 800} ${y - 20}, ${x + 800} ${y + 190}, ${x + 360} ${y + 195} C ${x - 80} ${y + 200}, ${x - 80} ${y - 20}, ${x + 400} ${y - 15}`}
          start={ans} dur={10} f={r.f} color={RED} w={10} len={2400} />}
      </g>;
    })}
  </>;
};
const SCENES: Record<string, React.FC<R>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, quiz: Quiz, stat: Stat, recap: Recap, qaEnd: QaEnd};

export const TemplateB: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const n = spec.scenes.length;
  const rows = Math.ceil(n / COLS);
  const W = MARGIN * 2 + COLS * RW + (COLS - 1) * GAP, H = MARGIN * 2 + rows * RH + (rows - 1) * GAP;
  const idx = sceneIndex(spec, f);
  const cur = spec.scenes[idx];
  const camOf = (i: number) => {const g = region(i); return [g.x + RW / 2, g.y + RH / 2, 1.0, (i % 2 ? 1.2 : -1.2)];};
  const from = idx === 0 ? [region(0).x + RW / 2 - 200, region(0).y + RH / 2, 1.25, -2] : camOf(idx - 1);
  let cam = camOf(idx);
  const p = io(Math.min(1, (f - cur.from) / Math.max(1, Math.min(cur.dur * 0.3, 40))));
  cam = from.map((v, k) => v + (cam[k] - v) * p);
  const outro = Math.min(1, Math.max(0, (f - (spec.totalFrames - 60)) / 45));   // 最後拉遠看整本
  if (outro > 0) cam = cam.map((v, k) => v + ([W / 2, H / 2, Math.min(1920 / W, 1080 / H) * 0.95, 0][k] - v) * io(outro));
  const [cx, cy, z, rot] = cam;
  const cap = captionAt(spec, f, 8);
  const pen = (() => {
    const r0 = region(idx), t = (f - cur.from) / cur.dur;
    if (t < 0.12 || t > 0.85) return null;
    return [r0.x + 150 + t * (RW - 300), r0.y + 300 + Math.sin(f / 7) * 120 + t * 300];
  })();
  const fade = Math.max(0, 1 - f / 8, (f - (spec.totalFrames - 15)) / 15);
  return (
    <AbsoluteFill style={{background: '#8A6A4A', overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(90deg, #8A6A4A 0 38px, #7E5F41 38px 40px, #94735A 40px 90px)'}} />
      <div data-qa="canvas" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
        transform: `translate(960px, 540px) rotate(${rot}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`}}>
        <div style={{position: 'absolute', left: 80, top: 80, width: W - 160, height: H - 160, background: PAPER, borderRadius: 24, boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
          backgroundImage: 'linear-gradient(#cfdcf0 1.5px, transparent 1.5px), linear-gradient(90deg, #cfdcf0 1.5px, transparent 1.5px)', backgroundSize: '50px 50px'}} />
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          {spec.scenes.map((s, i) => {
            const Comp = SCENES[s.type];
            const g = region(i);
            if (!Comp || f < s.from - 30) return null;
            return <g key={s.id} transform={`translate(${g.x} ${g.y})`}><Comp p={s.props} cues={s.cues} dur={s.dur} s={s.from} f={f} /></g>;
          })}
          {pen && <Pencil x={pen[0]} y={pen[1]} />}
          {Array.from({length: 24}, (_, i) => <circle key={i} cx={200 + random(`dx${i}`) * (W - 400)} cy={200 + random(`dy${i}`) * (H - 400)} r={6} fill={[RED, BLUE, YEL][i % 3]} opacity={0.3} />)}
        </svg>
      </div>
      {cap && (
        <div data-qa="caption" style={{position: 'absolute', left: 0, right: 0, bottom: 50, display: 'flex', justifyContent: 'center'}}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: 42, color: INK, background: '#FFF4C7ee', padding: '10px 40px', transform: 'rotate(-0.8deg)', maxWidth: 1500,
            boxShadow: '0 6px 14px rgba(0,0,0,0.25)', borderLeft: '10px dashed #F2C94C', borderRight: '10px dashed #F2C94C'}}>{cap.text}</div>
        </div>
      )}
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.5} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
