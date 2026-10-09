/* 範本 B：創客手稿 Maker's Notebook —— 一鏡到底。每個場景是大筆記本上的一個區塊，鏡頭一路滑過去，最後拉遠看整本。
   招牌特徵（概念忠實度）：①看不見的筆即時畫出一切——**筆尖永遠在正在畫的那一筆上**（penkit）
   ②草圖畫完會活起來（sketches：上色＋閃燈／轉動／擴散）③便利貼、紅筆圈、螢光筆 ④一鏡到底不硬切。字幕＝紙膠帶。 */
import React from 'react';
import {AbsoluteFill, Audio, Easing, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadKai} from '@remotion/google-fonts/LXGWWenKaiTC';
import {loadFont as loadHand} from '@remotion/google-fonts/Caveat';
import {makePenKit} from '../lib/penkit';
import {QaProbe} from '../QaProbe';
import {TplSpec, captionAt, cue, fit, sceneIndex, textW, wrap} from './common';
import {BrandLogo} from './brand';

const KAI = loadKai('normal', {weights: ['700'], ignoreTooManyRequestsWarning: true}).fontFamily;
const HAND = loadHand('normal', {weights: ['700']}).fontFamily;
const INK = '#23324A', RED = '#E2483D', YEL = '#FFD84D', BLUE = '#2F6FD6', GREEN = '#2E9E5B', PAPER = '#FBF8F1';
const io = Easing.inOut(Easing.cubic);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const RW = 1700, RH = 1000, GAP = 180, COLS = 3, MARGIN = 260;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = {p: any; cues: number[]; dur: number; s: number; f: number};

const region = (i: number) => ({x: MARGIN + (i % COLS) * (RW + GAP), y: MARGIN + Math.floor(i / COLS) * (RH + GAP)});
const T0 = (r: R, k: number) => r.s + Math.round(Math.min(r.dur * 0.15, 24)) + k;   // 鏡頭到位後開始畫
const C = (r: R, i: number | undefined, fb: number) => r.s + cue(r.cues, i, fb);
const pop = (f: number, at: number) => interpolate(f, [at, at + 12], [0, 1], {...clamp, easing: Easing.out(Easing.back(1.5))});
const K = (r: R) => makePenKit(r.f, r.s, r.dur, INK);
/** 字的描寫時間：依字數，每字約 1.6 格 */
const tdur = (s: string, min = 10) => Math.max(min, Math.round(textW(s) * 1.6));

const Sticky: React.FC<{x: number; y: number; w: number; h: number; color?: string; rot?: number; a: number; children?: React.ReactNode}> = ({x, y, w, h, color = YEL, rot = 0, a, children}) => (
  <g transform={`translate(${x} ${y + (1 - a) * 120}) rotate(${rot})`} opacity={a > 0 ? 1 : 0}>
    <rect x={6} y={10} width={w} height={h} fill="#0002" />
    <rect width={w} height={h} fill={color} />
    <rect x={w / 2 - 50} y={-14} width={100} height={30} fill="#ffffffaa" />
    {children}
  </g>
);

/* ---------- 各場景（區塊內座標 0..RW × 0..RH） ---------- */
const Title: React.FC<R> = (r) => {
  const k = K(r); const size = fit(r.p.title, RW - 200, 160);
  const tEnd = T0(r, 8) + tdur(r.p.title, 24);
  return <>
    {r.p.eyebrow && k.text({x: 100, y: 220, text: String(r.p.eyebrow), size: 64, font: HAND, color: BLUE, start: T0(r, 0), dur: 10})}
    {k.text({x: 100, y: 520, text: r.p.title, size, font: KAI, color: INK, start: T0(r, 10), dur: tdur(r.p.title, 24)})}
    {k.path({d: `M 100 560 Q ${RW / 2} 600 ${RW - 150} 550`, start: tEnd + 2, dur: 12, color: RED, w: 10})}
    {r.p.en && k.text({x: 110, y: 680, text: r.p.en, size: 50, font: HAND, color: BLUE, start: tEnd + 16, dur: 14})}
    {k.pen()}
  </>;
};
const Scenario: React.FC<R> = (r) => {
  const k = K(r); const pills: string[] = r.p.pills ?? [];
  const head = wrap(r.p.heading ?? '', 22);
  return <>
    {head.map((ln, i) => k.text({x: 80, y: 170 + i * 80, text: ln, size: 64, font: KAI, color: INK, start: T0(r, i * 10), dur: tdur(ln)}))}
    {k.sketch(r.p.sketch ?? r.p.icon, 130, 330, 400, T0(r, 14))}
    {pills.map((x, i) => {
      const at = C(r, r.p.cueMap?.[i], 20 + i * 30), y = 360 + i * 150;
      const last = i === pills.length - 1 && r.p.lastIsProblem !== false;
      return <g key={x}>
        {k.path({d: `M 700 ${y - 50} h 64 v 64 h -64 Z`, start: at - 8, dur: 8, w: 5})}
        {last ? k.path({d: `M 708 ${y - 42} l 48 48 M 756 ${y - 42} l -48 48`, start: at, dur: 8, color: RED, w: 8})
          : k.path({d: `M 708 ${y - 18} l 18 20 l 34 -44`, start: at, dur: 8, color: GREEN, w: 8})}
        {k.text({x: 800, y: y + 6, text: x, size: fit(x, 850, 60), font: KAI, color: last ? RED : INK, start: at + 8, dur: tdur(x)})}
      </g>;
    })}
    {k.pen()}
  </>;
};
const Definition: React.FC<R> = (r) => {
  const k = K(r);
  const big: string = r.p.bigText, hl: string = r.p.highlight ?? '';
  const size = fit(big, RW - 200, 130);
  const ix = hl ? big.indexOf(hl) : -1;
  const pre = textW(Array.from(big).slice(0, Math.max(0, ix)).join('')) * size;
  const hlw = textW(hl) * size;
  const hlAt = Math.max(C(r, r.p.cueMap?.[1], 40), T0(r, 6) + tdur(big, 20));
  const mk = interpolate(r.f, [hlAt, hlAt + 12], [0, 1], {...clamp, easing: io});
  const notes: string[] = r.p.sideNotes ?? [];
  return <>
    {r.p.label && <g opacity={r.f > T0(r, 0) ? 1 : 0}><rect x={80} y={90} width={Math.max(300, textW(String(r.p.label)) * 46 + 40)} height={80} fill="#9ED8FF" opacity={0.85} />
      <text x={100} y={148} fontFamily={KAI} fontWeight={700} fontSize={44} fill={INK}>{r.p.label}</text></g>}
    {ix >= 0 && <rect x={100 + pre} y={430 - size * 0.62} width={hlw * mk} height={size * 0.7} fill={YEL} opacity={0.85} />}
    {k.text({x: 100, y: 430, text: big, size, font: KAI, color: INK, start: T0(r, 6), dur: tdur(big, 20)})}
    {ix >= 0 && k.path({d: `M ${100 + pre} ${430 + 18} h ${hlw}`, start: hlAt, dur: 12, color: RED, w: 8})}
    {notes.map((n, i) => {
      const at = C(r, r.p.noteCues?.[i], 50 + i * 15);
      const w = (RW - 260) / Math.max(1, notes.length) - 40;
      return <Sticky key={n} x={100 + i * (w + 60)} y={560} w={w} h={220} rot={(i - 1) * 3} a={pop(r.f, at)} color={['#FFE680', '#BDE0FE', '#CDEAC0'][i % 3]}>
        <text x={w / 2} y={130} textAnchor="middle" fontFamily={KAI} fontWeight={700} fontSize={fit(n, w - 40, 52)} fill={INK}>{n}</text>
      </Sticky>;
    })}
    {k.pen()}
  </>;
};
const Cards: React.FC<R> = (r) => {
  const k = K(r);
  const cards: {icon?: string; sketch?: string; title: string; note?: string}[] = r.p.cards ?? [];
  const n = Math.max(1, cards.length), w = Math.min(460, (RW - 200) / n - 50);
  const head = wrap(r.p.heading ?? '', 24);
  return <>
    {head.map((ln, i) => k.text({x: 80, y: 170 + i * 80, text: ln, size: 64, font: KAI, color: INK, start: T0(r, i * 10), dur: tdur(ln)}))}
    {cards.map((c, i) => {
      const at = C(r, r.p.cueMap?.[i], 20 + i * 30);
      const x = 100 + i * (w + 50);
      return <g key={i}>
        <Sticky x={x} y={300} w={w} h={480} rot={0} a={pop(r.f, at)} color={['#FFE680', '#FFC8DD', '#BDE0FE', '#CDEAC0'][i % 4]} />
        {r.f >= at && k.sketch(c.sketch ?? c.icon, x + w / 2 - 90, 330, 180, at + 6)}
        {r.f >= at && k.text({x: x + 24, y: 590, text: c.title, size: fit(c.title, w - 48, 54), font: KAI, color: INK, start: at + 40, dur: tdur(c.title)})}
        {r.f >= at && c.note && wrap(c.note, Math.max(4, Math.floor((w - 48) / 34))).slice(0, 3).map((ln, j) =>
          k.text({x: x + 24, y: 660 + j * 46, text: ln, size: 34, font: KAI, color: BLUE, start: at + 50 + j * 6, dur: tdur(ln, 8)}))}
      </g>;
    })}
    {r.p.footer && k.text({x: 100, y: 820, text: '★ ' + r.p.footer, size: fit(r.p.footer, RW - 300, 54), font: KAI, color: RED, start: C(r, r.cues.length - 1, 120) + 10, dur: tdur(r.p.footer)})}
    {k.pen()}
  </>;
};
const Vs: React.FC<R> = (r) => {
  const k = K(r);
  const side = (sd: {frame: string; icon: string; sketch?: string; text: string}, i: number) => {
    const at = C(r, r.p.cueMap?.[i], i ? 40 : 6), x = i ? 920 : 100;
    const col = sd.frame === 'danger' ? RED : sd.frame === 'success' ? GREEN : BLUE;
    const lines = wrap(sd.text, 11).slice(0, 3);
    const stampAt = at + 34 + lines.length * 14;
    const st = interpolate(r.f, [stampAt, stampAt + 6], [2.2, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    return <g key={i}>
      {k.path({d: `M ${x} 160 h 680 v 600 h -680 Z`, start: at - 10, dur: 12, w: 6})}
      {k.sketch(sd.sketch ?? sd.icon, x + 260, 190, 160, at + 2)}
      {lines.map((ln, j) => k.text({x: x + 40, y: 470 + j * 70, text: ln, size: 58, font: KAI, color: INK, start: at + 34 + j * 14, dur: tdur(ln)}))}
      {sd.frame !== 'primary' && r.f > stampAt && <g transform={`translate(${x + 590} 240) scale(${st}) rotate(-12)`}>
        <circle r={70} fill="none" stroke={col} strokeWidth={10} /><text y={30} textAnchor="middle" fontFamily={KAI} fontWeight={700} fontSize={90} fill={col}>{sd.frame === 'danger' ? '✕' : '✓'}</text></g>}
    </g>;
  };
  return <>
    {side(r.p.left, 0)}
    <text x={850} y={500} textAnchor="middle" fontFamily={HAND} fontWeight={700} fontSize={120} fill={INK} opacity={r.f > T0(r, 10) ? 1 : 0}>{!r.p.mid || r.p.mid === 'vs' ? 'vs' : r.p.mid}</text>
    {side(r.p.right, 1)}
    {r.p.footerPill && k.text({x: 100, y: 820, text: '→ ' + r.p.footerPill, size: fit(r.p.footerPill, RW - 300, 56), font: KAI, color: RED, start: C(r, r.cues.length - 1, 90) + 6, dur: tdur(r.p.footerPill)})}
    {k.pen()}
  </>;
};
const Quiz: React.FC<R> = (r) => {
  const k = K(r);
  const opts: string[] = r.p.options ?? [];
  const reveal = C(r, r.p.revealCue, r.dur * 0.6);
  const w = (RW - 200 - (opts.length - 1) * 60) / Math.max(1, opts.length);
  const q = wrap(r.p.question, 22);
  return <>
    <g opacity={r.f > T0(r, 0) ? 1 : 0}><rect x={80} y={90} width={260} height={80} fill="#FFC8DD" /><text x={100} y={148} fontFamily={KAI} fontWeight={700} fontSize={44} fill={INK}>小測驗</text></g>
    {q.map((ln, i) => k.text({x: 100, y: 300 + i * 90, text: ln, size: 72, font: KAI, color: INK, start: T0(r, 6 + i * 14), dur: tdur(ln)}))}
    {opts.map((o, i) => {
      const x = 100 + i * (w + 60), st = T0(r, 30) + i * 20;
      return <g key={o}>
        {k.path({d: `M ${x} 500 h ${w} v 220 h ${-w} Z`, start: st, dur: 10, w: 5})}
        {k.text({x: x + 40, y: 630, text: `${String.fromCharCode(65 + i)}. ${o}`, size: fit(o + 'AA', w - 80, 60), font: KAI, color: INK, start: st + 10, dur: tdur(o + 'AA')})}
        {i === r.p.answerIndex && k.path({d: `M ${x + w / 2} 480 C ${x + w + 60} 480, ${x + w + 60} 740, ${x + w / 2} 745 C ${x - 60} 750, ${x - 60} 480, ${x + w / 2 + 40} 485`,
          start: reveal, dur: 14, color: RED, w: 10})}
      </g>;
    })}
    {r.p.afterNote && k.text({x: 100, y: 820, text: r.p.afterNote, size: fit(r.p.afterNote, RW - 250, 54), font: KAI, color: RED, start: reveal + 20, dur: tdur(r.p.afterNote)})}
    {k.pen()}
  </>;
};
const Stat: React.FC<R> = (r) => {
  const k = K(r);
  const at = Math.max(C(r, 0, 10), T0(r, 0));
  const num = `${r.p.value}${r.p.suffix ?? ''}`;
  const lab = wrap(r.p.label ?? '', 10), sub = wrap(r.p.sub ?? '', 14);
  return <>
    {k.text({x: 200, y: 560, text: num, size: 380, font: HAND, color: RED, start: at, dur: 22})}
    {k.path({d: 'M 520 210 C 900 200, 940 640, 520 650 C 120 660, 80 230, 420 200 C 480 195, 540 200, 600 220', start: at + 24, dur: 16, color: RED, w: 12})}
    {lab.map((ln, i) => k.text({x: 980, y: 420 + i * 100, text: ln, size: 80, font: KAI, color: INK, start: at + 42 + i * 12, dur: tdur(ln)}))}
    {sub.map((ln, i) => k.text({x: 980, y: 660 + i * 60, text: ln, size: 48, font: KAI, color: BLUE, start: at + 70 + i * 12, dur: tdur(ln)}))}
    {k.pen()}
  </>;
};
const Recap: React.FC<R> = (r) => {
  const k = K(r);
  const take: string[] = r.p.takeaway ?? [], recap: string[] = r.p.recap ?? [];
  const nAt = C(r, r.p.nextCue, 120);
  return <>
    {k.text({x: 80, y: 170, text: '今天帶走', size: 72, font: KAI, color: RED, start: T0(r, 0), dur: 10})}
    {take.map((t, i) => {
      const at = Math.max(C(r, r.p.takeCues?.[i], 20 + i * 40), T0(r, 12));
      const y = 330 + i * 130;
      return <g key={t}>{k.path({d: `M 90 ${y - 24} l 20 22 l 40 -50`, start: at, dur: 8, color: GREEN, w: 9})}
        {k.text({x: 170, y, text: t, size: fit(t, recap.length ? 1000 : 1400, 64), font: KAI, color: INK, start: at + 8, dur: tdur(t)})}</g>;
    })}
    {recap.map((t, i) => k.text({x: 1240, y: 330 + i * 70, text: '· ' + t, size: fit(t, 400, 38), font: KAI, color: BLUE, start: T0(r, 30) + i * 14, dur: tdur(t, 8)}))}
    {r.p.nextTeaser && <>
      {k.path({d: 'M 100 800 h 260 l -30 -24 M 360 800 l -30 24', start: nAt, dur: 10, color: RED, w: 8})}
      {k.text({x: 400, y: 820, text: '下一節：' + r.p.nextTeaser, size: 64, font: KAI, color: RED, start: nAt + 10, dur: tdur('下一節：' + r.p.nextTeaser)})}
    </>}
    {k.pen()}
  </>;
};
const QaEnd: React.FC<R> = (r) => {
  const k = K(r);
  const {fps} = useVideoConfig();
  const ans = r.s + Math.round((r.p.answerSec ?? 4) * fps);
  const opts: string[] = r.p.options ?? [];
  const q = wrap(r.p.question, 24);
  return <>
    {q.map((ln, i) => k.text({x: 80, y: 170 + i * 80, text: ln, size: 64, font: KAI, color: INK, start: r.s + 4 + i * 8, dur: tdur(ln, 8)}))}
    {opts.map((o, i) => {
      const x = 100 + (i % 2) * 780, y = 380 + Math.floor(i / 2) * 230, st = r.s + 20 + i * 12;
      return <g key={o}>
        {k.path({d: `M ${x} ${y} h 720 v 170 h -720 Z`, start: st, dur: 6, w: 5})}
        {k.text({x: x + 30, y: y + 105, text: `${String.fromCharCode(65 + i)}. ${o}`, size: fit(o + 'AA', 660, 52), font: KAI, color: INK, start: st + 6, dur: 6})}
        {i === r.p.answerIndex && k.path({d: `M ${x + 360} ${y - 20} C ${x + 800} ${y - 20}, ${x + 800} ${y + 190}, ${x + 360} ${y + 195} C ${x - 80} ${y + 200}, ${x - 80} ${y - 20}, ${x + 400} ${y - 15}`,
          start: ans, dur: 12, color: RED, w: 10})}
      </g>;
    })}
    {k.pen()}
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
  const outro = Math.min(1, Math.max(0, (f - (spec.totalFrames - 60)) / 45));
  if (outro > 0) cam = cam.map((v, k) => v + ([W / 2, H / 2, Math.min(1920 / W, 1080 / H) * 0.95, 0][k] - v) * io(outro));
  const [cx, cy, z, rot] = cam;
  const cap = captionAt(spec, f, 8);
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 8, (f - (spec.totalFrames - 15)) / 15);
  return (
    <AbsoluteFill style={{background: '#8A6A4A', overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(90deg, #8A6A4A 0 38px, #7E5F41 38px 40px, #94735A 40px 90px)'}} />
      <div data-qa="canvas" style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0',
        transform: `translate(960px, 540px) rotate(${rot}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`}}>
        <div style={{position: 'absolute', left: 80, top: 80, width: W - 160, height: H - 160, background: PAPER, borderRadius: 24, boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
          backgroundImage: 'linear-gradient(#cfdcf0 1.5px, transparent 1.5px), linear-gradient(90deg, #cfdcf0 1.5px, transparent 1.5px)', backgroundSize: '50px 50px'}} />
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          {Array.from({length: 24}, (_, i) => <circle key={i} cx={200 + random(`dx${i}`) * (W - 400)} cy={200 + random(`dy${i}`) * (H - 400)} r={6} fill={[RED, BLUE, YEL][i % 3]} opacity={0.3} />)}
          {spec.scenes.map((s, i) => {
            const Comp = SCENES[s.type];
            const g = region(i);
            if (!Comp || f < s.from - 30) return null;
            return <g key={s.id} transform={`translate(${g.x} ${g.y})`}><Comp p={s.props} cues={s.cues} dur={s.dur} s={s.from} f={f} /></g>;
          })}
        </svg>
      </div>
      {cap && (
        <div data-qa="caption" style={{position: 'absolute', left: 0, right: 0, bottom: 50, display: 'flex', justifyContent: 'center'}}>
          <div style={{fontFamily: KAI, fontWeight: 700, fontSize: 42, color: INK, background: '#FFF4C7ee', padding: '10px 40px', transform: 'rotate(-0.8deg)', maxWidth: 1500,
            boxShadow: '0 6px 14px rgba(0,0,0,0.25)', borderLeft: '10px dashed #F2C94C', borderRight: '10px dashed #F2C94C'}}>{cap.text}</div>
        </div>
      )}
      <BrandLogo logo={spec.brand?.logo} width={spec.brand?.logoWidth} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.5} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
