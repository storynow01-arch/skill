/* 範本 A：闖關遊戲 LEVEL UP —— 任何內容都變成遊戲畫面。
   title→WORLD 開場、scenario→QUEST、definition→NEW ITEM GET、cards→INVENTORY、vs→VS 對戰、quiz→QUIZ BATTLE、
   stat→STATUS 計分、recap→STAGE CLEAR、qaEnd→FINAL BOSS QUIZ；字幕＝RPG 對話框（名牌＝spec.narrator）。 */
import React from 'react';
import {AbsoluteFill, Audio, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadPixel} from '@remotion/google-fonts/PressStart2P';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {QaProbe} from '../QaProbe';
import {PixelIcon} from '../lib/iconkit';
import {TplSpec, captionAt, cue, fit, wrap} from './common';

const PX = loadPixel('normal', {weights: ['400']}).fontFamily;
const TC = loadTC('normal', {weights: ['900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const C = {sky1: '#1A1C2C', sky2: '#3B5DC9', gold: '#FFCD75', white: '#F4F4F4', blue: '#41A6F6', green: '#A7F070', red: '#EF7D57', dark: '#333C57', ink: '#1A1C2C'};
const step = (f: number, n = 2) => Math.floor(f / n) * n;
const q8 = (v: number) => Math.round(v / 8) * 8;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number};

const T: React.FC<{children: React.ReactNode; size: number; color?: string; style?: React.CSSProperties; px?: boolean}> = ({children, size, color = C.white, style, px}) => (
  <div style={{fontFamily: px ? PX : TC, fontWeight: px ? 400 : 900, fontSize: size, color, lineHeight: 1.3, textShadow: `${Math.max(3, size / 14)}px ${Math.max(3, size / 14)}px 0 ${C.ink}`, ...style}}>{children}</div>
);
const SPRITE = ['...11111....', '..1111111...', '..2222222...', '..2262262...', '..2222222...', '...22222....', '..3333333...',
  '.333333333..', '.2.33333.2..', '...33333....', '...44.44....', '...44.44....', '..55..55....'];
const PAL: Record<string, string> = {'1': '#5A3A2E', '2': '#FFD2A8', '3': C.blue, '4': '#29366F', '5': C.ink, '6': C.ink};
const SPRITE_WALK = [...SPRITE.slice(0, 10), '...44.44....', '..44...44...', '.55.....55..'];
const Sprite: React.FC<{x: number; y: number; s?: number; walk?: boolean}> = ({x, y, s = 10, walk}) => (
  <div style={{position: 'absolute', left: x, top: y}}>
    {(walk ? SPRITE_WALK : SPRITE).map((row, r) => row.split('').map((ch, c) => ch === '.' ? null : <div key={`${r}-${c}`} style={{position: 'absolute', left: c * s, top: r * s, width: s, height: s, background: PAL[ch]}} />))}
  </div>
);
const Stars: React.FC<{f: number}> = ({f}) => <>{Array.from({length: 70}, (_, i) => (
  <div key={i} style={{position: 'absolute', left: Math.round(random(`sx${i}`) * 1920 / 4) * 4, top: Math.round(random(`sy${i}`) * 640 / 4) * 4, width: i % 9 ? 4 : 8, height: i % 9 ? 4 : 8,
    background: Math.floor(f / 6 + i) % 7 === 0 ? C.gold : C.white, opacity: 0.8}} />))}</>;
const Box: React.FC<{children: React.ReactNode; color?: string; style?: React.CSSProperties}> = ({children, color = C.white, style}) => (
  <div style={{background: C.dark, border: `8px solid ${color}`, boxShadow: '10px 10px 0 #000', ...style}}>{children}</div>
);
const Pop: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties}> = ({at, children, style}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const s = spring({frame: step(f) - at, fps, config: {damping: 8, stiffness: 170}});
  return <div style={{transform: `scale(${Math.max(0, s)})`, opacity: s > 0.05 ? 1 : 0, ...style}}>{children}</div>;
};
const Coins: React.FC<{at: number; x: number; y: number}> = ({at, x, y}) => {
  const f = useCurrentFrame(); const d = step(f - at);
  if (d < 0 || d > 22) return null;
  return <>{Array.from({length: 8}, (_, k) => {
    const vx = (random(`c${at}${k}`) - 0.5) * 22, vy = -14 - random(`v${at}${k}`) * 10;
    return <div key={k} style={{position: 'absolute', left: q8(x + vx * d), top: q8(y + vy * d + 0.9 * d * d), width: 22, height: 22, background: C.gold, border: `4px solid ${C.ink}`, opacity: 1 - d / 22}} />;
  })}</>;
};
const Banner: React.FC<{text: string; color?: string; top?: number}> = ({text, color = C.gold, top = 130}) => (
  <Pop at={0} style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center'}}>
    <Box color={color} style={{padding: '12px 40px'}}><T px size={34} color={color}>{text}</T></Box>
  </Pop>
);

const Title: React.FC<P> = ({p}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const eb = String(p.eyebrow ?? '');
  const size = fit(p.title, 1600, 150);
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      {eb && <T px size={40} color={C.gold} style={{marginBottom: 40}}>{/^\d/.test(eb) ? `WORLD ${eb}` : eb}</T>}
      <div style={{display: 'flex'}}>
        {Array.from(p.title as string).map((ch, i) => {
          const s = spring({frame: step(f) - 6 - i * 3, fps, config: {damping: 8, stiffness: 160}});
          return <T key={i} size={size} style={{transform: `translateY(${q8((1 - s) * -560)}px)`, textShadow: `10px 10px 0 ${C.ink}`}}>{ch}</T>;
        })}
      </div>
      {p.en && <T px size={26} color={C.blue} style={{marginTop: 30, letterSpacing: 6}}>{p.en}</T>}
      <T px size={30} style={{marginTop: 60, opacity: Math.floor(f / 15) % 2 ? 1 : 0.2}}>▶ PRESS START</T>
      <div style={{position: 'absolute', left: 200, top: 770, width: 200, height: 24, background: C.green, borderBottom: '8px solid #3E1F3E'}} />
      <Sprite x={240} y={q8(640 - (1 - Math.max(0, spring({frame: step(f) - 24, fps, config: {damping: 9, stiffness: 140}}))) * 900)} />
    </AbsoluteFill>
  );
};

const Scenario: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const pills: string[] = p.pills ?? [];
  return (
    <AbsoluteFill>
      <Banner text="★ QUEST ★" />
      <T size={fit(p.heading, 1500, 58)} style={{position: 'absolute', top: 250, width: '100%', textAlign: 'center'}}>{p.heading}</T>
      <Box style={{position: 'absolute', left: 220, top: 380, width: 380, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <PixelIcon name={p.sketch ?? p.icon} size={260} f={f} at={4} fill={C.red} />
      </Box>
      <div style={{position: 'absolute', left: 720, top: 400, display: 'flex', flexDirection: 'column', gap: 34}}>
        {pills.map((x, i) => {
          const at = cue(cues, p.cueMap?.[i], 20 + i * 30);
          const last = i === pills.length - 1 && p.lastIsProblem !== false;
          const on = f >= at;
          return (
            <div key={x} style={{display: 'flex', alignItems: 'center', gap: 26, opacity: on ? 1 : 0.25}}>
              <div style={{width: 64, height: 64, border: `6px solid ${last ? C.red : C.green}`, background: on ? (last ? C.red : C.green) : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center'}}><T size={30} color={C.ink}>{on ? (last ? '✕' : '✓') : ''}</T></div>
              <T size={fit(x, 900, last ? 58 : 50)} color={last && on ? C.red : C.white}
                style={{transform: last && on && f - at < 10 ? `translateX(${(random(`s${f}`) - 0.5) * 20}px)` : undefined}}>{x}{last && on ? ' ?!' : ''}</T>
            </div>
          );
        })}
      </div>
      <Sprite x={1660} y={640} />
    </AbsoluteFill>
  );
};

const Definition: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const big: string = p.bigText, hl: string = p.highlight ?? '';
  const k = hl ? big.indexOf(hl) : -1;
  const hlOn = f >= cue(cues, p.cueMap?.[1], 40);
  const notes: string[] = p.sideNotes ?? [];
  return (
    <AbsoluteFill>
      <Banner text="✦ NEW ITEM GET! ✦" />
      {Array.from({length: 14}, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + f / 30, r = 380 + Math.sin(f / 8 + i) * 20;
        return <div key={i} style={{position: 'absolute', left: q8(960 + Math.cos(a) * r), top: q8(500 + Math.sin(a) * r * 0.45), width: 16, height: 16, background: i % 2 ? C.gold : C.white}} />;
      })}
      <Pop at={6} style={{position: 'absolute', left: 260, right: 260, top: 280}}>
        <Box color={C.gold} style={{padding: '30px 50px', textAlign: 'center'}}>
          {p.label && <div style={{display: 'inline-block', background: C.blue, padding: '6px 22px', marginBottom: 20}}><T size={30}>{p.label}</T></div>}
          <T size={fit(big, 1250, 110)}>
            {k < 0 ? big : <>{big.slice(0, k)}<span style={{color: hlOn ? C.gold : C.white, textDecoration: hlOn ? 'underline' : 'none', textDecorationThickness: 10,
              textUnderlineOffset: 16}}>{hl}</span>{big.slice(k + hl.length)}</>}
          </T>
        </Box>
      </Pop>
      <div style={{position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center', gap: 40}}>
        {notes.map((n, i) => <Pop key={n} at={cue(cues, p.noteCues?.[i], 50 + i * 15)}><Box color={C.green} style={{padding: '14px 30px'}}><T size={40}>▸ {n}</T></Box></Pop>)}
      </div>
    </AbsoluteFill>
  );
};

const Cards: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const cards: {icon?: string; sketch?: string; title: string; note?: string}[] = p.cards ?? [];
  const w = cards.length <= 2 ? 620 : cards.length === 3 ? 480 : 380;
  return (
    <AbsoluteFill>
      <Banner text="INVENTORY" color={C.blue} />
      <T size={fit(p.heading ?? '', 1500, 52)} style={{position: 'absolute', top: 240, width: '100%', textAlign: 'center'}}>{p.heading}</T>
      <div style={{position: 'absolute', left: 0, right: 0, top: 350, display: 'flex', justifyContent: 'center', gap: 40}}>
        {cards.map((c, i) => {
          const at = cue(cues, p.cueMap?.[i], 20 + i * 30);
          const on = f >= at;
          return (
            <div key={i} style={{position: 'relative'}}>
              <Box color={on ? C.gold : '#666'} style={{width: w, height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transform: on && f - at < 8 ? `translateY(${-q8(Math.sin(((f - at) / 8) * Math.PI) * 30)}px)` : undefined}}>
                {on ? <>
                  <PixelIcon name={c.sketch ?? c.icon} size={130} f={f} at={at} fill={C.gold} />
                  <T size={fit(c.title, w - 60, 48)} style={{marginTop: 18}}>{c.title}</T>
                  {c.note && <T size={fit(c.note, (w - 40) * 1.8, 28)} color={C.blue} style={{marginTop: 12, textAlign: 'center', padding: '0 20px'}}>{c.note}</T>}
                </> : <T px size={120} color="#666">?</T>}
              </Box>
              <T px size={22} color={C.gold} style={{position: 'absolute', left: 16, top: 14}}>{i + 1}</T>
              <Coins at={at} x={w / 2} y={60} />
            </div>
          );
        })}
      </div>
      {p.footer && f >= cue(cues, cues.length - 1, 120) && (
        <Pop at={cue(cues, cues.length - 1, 120)} style={{position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center'}}>
          <Box color={C.red} style={{padding: '8px 30px'}}><T size={34}>TIP：{p.footer}</T></Box>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

const Vs: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const side = (s: {frame: string; icon: string; sketch?: string; text: string}, i: number) => {
    const at = cue(cues, p.cueMap?.[i], i ? 40 : 6);
    const col = s.frame === 'danger' ? C.red : s.frame === 'success' ? C.green : C.blue;
    return (
      <Pop at={at}>
        <Box color={col} style={{width: 640, height: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px'}}>
          <T px size={24} color={col}>{s.frame === 'danger' ? 'ENEMY' : s.frame === 'success' ? 'HERO' : 'PLAYER'}</T>
          <PixelIcon name={s.sketch ?? s.icon} size={150} f={f} at={at} fill={col} style={{marginTop: 14}} />
          <T size={fit(s.text, 1100, 44)} style={{marginTop: 20, textAlign: 'center', lineHeight: 1.4}}>{s.text}</T>
        </Box>
      </Pop>
    );
  };
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50}}>
        {side(p.left, 0)}
        <T px size={100} color={C.gold} style={{transform: `scale(${1 + 0.08 * Math.sin(f / 4)})`}}>{!p.mid || p.mid === 'vs' ? 'VS' : p.mid}</T>
        {side(p.right, 1)}
      </div>
      {p.footerPill && (
        <Pop at={cue(cues, cues.length - 1, 90)} style={{position: 'absolute', left: 0, right: 0, top: 730, display: 'flex', justifyContent: 'center'}}>
          <Box color={C.gold} style={{padding: '10px 34px'}}><T size={36}>TIP：{p.footerPill}</T></Box>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

const Quiz: React.FC<P> = ({p, cues, dur}) => {
  const f = useCurrentFrame();
  const reveal = cue(cues, p.revealCue, dur * 0.6);
  const r = f >= reveal;
  const opts: string[] = p.options ?? [];
  const cursor = r ? p.answerIndex : Math.floor(f / 10) % Math.max(1, opts.length);
  return (
    <AbsoluteFill>
      <Banner text="!! QUIZ BATTLE !!" color={C.red} />
      <Box style={{position: 'absolute', left: 260, right: 260, top: 250, padding: '24px 40px'}}><T size={fit('Q：' + p.question, 1280, 60)}>Q：{p.question}</T></Box>
      <div style={{position: 'absolute', left: 260, right: 260, top: 450, display: 'flex', gap: 50}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return (
            <Box key={o} color={r ? (ok ? C.green : '#555') : C.white} style={{flex: 1, height: 170, display: 'flex', alignItems: 'center', gap: 20, padding: '0 30px', opacity: r && !ok ? 0.45 : 1}}>
              <T px size={44} color={C.gold} style={{width: 50}}>{cursor === i ? '▶' : ''}</T>
              <T size={fit(o, 1200 / opts.length - 120, 52)}>{String.fromCharCode(65 + i)}. {o}</T>
            </Box>
          );
        })}
      </div>
      {r && <Pop at={reveal} style={{position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center'}}><T px size={56} color={C.green}>CORRECT! +100 XP</T></Pop>}
      {r && p.afterNote && f > reveal + 24 && <T size={fit(p.afterNote, 1500, 36)} color={C.gold} style={{position: 'absolute', top: 760, width: '100%', textAlign: 'center'}}>{p.afterNote}</T>}
      <Coins at={reveal} x={1300} y={500} />
    </AbsoluteFill>
  );
};

const Stat: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const at = cue(cues, 0, 8);
  const per = Math.max(1, Math.floor(40 / Math.max(1, p.value)));
  const v = Math.min(p.value, Math.max(0, Math.floor((f - at) / per)));
  return (
    <AbsoluteFill style={{alignItems: 'center'}}>
      <Banner text="STATUS" color={C.green} />
      <Box color={C.gold} style={{position: 'absolute', top: 280, width: 1200, padding: '40px 0', textAlign: 'center'}}>
        <T px size={150} color={C.gold}>{v}{p.suffix ?? ''}</T>
        <T size={fit(p.label ?? '', 1100, 64)} style={{marginTop: 20}}>{p.label}</T>
        {p.sub && <T size={fit(p.sub, 1100, 36)} color={C.blue} style={{marginTop: 14}}>{p.sub}</T>}
      </Box>
      <Coins at={at + p.value * per} x={960} y={420} />
    </AbsoluteFill>
  );
};

const Recap: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const take: string[] = p.takeaway ?? [], recap: string[] = p.recap ?? [];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center', gap: 30}}>
        {[0, 1, 2].map((i) => <Pop key={i} at={4 + i * 8}><T px size={90} color={C.gold}>★</T></Pop>)}
      </div>
      <T px size={60} color={C.green} style={{position: 'absolute', top: 240, width: '100%', textAlign: 'center'}}>STAGE CLEAR!</T>
      <Box color={C.gold} style={{position: 'absolute', left: 140, top: 350, width: recap.length ? 1000 : 1640, padding: '24px 36px'}}>
        <T px size={24} color={C.gold}>LOOT</T>
        {take.map((t, i) => <div key={t} style={{opacity: f >= cue(cues, p.takeCues?.[i], 20 + i * 40) ? 1 : 0.15}}>
          <T size={fit('◆ ' + t, recap.length ? 920 : 1560, 44)} style={{marginTop: 18}}>◆ {t}</T></div>)}
      </Box>
      {recap.length > 0 && <Box color={C.blue} style={{position: 'absolute', left: 1180, top: 350, width: 600, padding: '24px 30px'}}>
        <T px size={24} color={C.blue}>RESULT</T>
        {recap.map((t, i) => <div key={t} style={{opacity: f > 24 + i * 8 ? 1 : 0}}><T size={fit('✓ ' + t, 540, 30)} style={{marginTop: 14}}>✓ {t}</T></div>)}
      </Box>}
      {p.nextTeaser && f >= cue(cues, p.nextCue, 120) && (
        <Pop at={cue(cues, p.nextCue, 120)} style={{position: 'absolute', left: 0, right: 0, top: 770, display: 'flex', justifyContent: 'center'}}>
          <T size={42} color={C.gold}>NEXT ▶ {p.nextTeaser}</T>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

const QaEnd: React.FC<P> = ({p}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const ans = Math.round((p.answerSec ?? 4) * fps);
  const r = f >= ans;
  const opts: string[] = p.options ?? [];
  return (
    <AbsoluteFill>
      <Banner text="FINAL BOSS QUIZ" color={C.red} top={110} />
      <div style={{position: 'absolute', left: 260, right: 260, top: 230}}>
        <div style={{height: 30, border: `6px solid ${C.white}`, background: C.dark}}><div style={{width: `${Math.max(0, 1 - f / ans) * 100}%`, height: '100%', background: C.red}} /></div>
        <T size={fit(p.question, 1400, 50)} style={{marginTop: 30}}>{p.question}</T>
      </div>
      <div style={{position: 'absolute', left: 260, right: 260, top: 430, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 26}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return <Box key={o} color={r ? (ok ? C.green : '#555') : C.white} style={{padding: '22px 26px', opacity: r && !ok ? 0.4 : 1}}>
            <T size={fit(o, 600, 36)}>{r && ok ? '✓' : String.fromCharCode(65 + i) + '.'} {o}</T></Box>;
        })}
      </div>
      {r && <T px size={50} color={C.green} style={{position: 'absolute', top: 790, width: '100%', textAlign: 'center'}}>STAGE CLEAR!</T>}
    </AbsoluteFill>
  );
};


/* ---------- 世界地圖：關卡之間主角走過去（招牌特徵）。每個場景＝地圖上的一關。 ---------- */
const GAME: Record<string, string> = {title: 'START', scenario: 'QUEST', definition: 'ITEM', cards: 'SHOP', vs: 'VS', stat: 'STATUS', quiz: 'BATTLE', recap: 'CLEAR', qaEnd: 'BOSS'};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shortOf = (p: any) => Array.from(String(p.label ?? p.heading ?? p.title ?? p.question ?? p.bigText ?? '')).slice(0, 7).join('');
const NODE = (k: number) => 360 + k * 620;
const GROUND = 780;
type Win = {start: number; end: number} | null;
/** 走地圖的時段：上一關旁白講完後 → 下一關第一句之前（最長 2 秒） */
export const walkWindows = (spec: TplSpec): Win[] => spec.scenes.map((s, i) => {
  if (i === 0) return null;
  const prev = spec.scenes[i - 1];
  const capEnd = Math.max(prev.from, ...spec.captions.filter((c) => c.from >= prev.from && c.from < prev.from + prev.dur).map((c) => c.to));
  const end = s.from + Math.min(Math.max(8, (s.cues?.[0] ?? 10) - 2), 14);
  let start = Math.max(capEnd + 6, prev.from + Math.round(prev.dur * 0.5));
  start = Math.min(start, s.from - 12);
  return {start: Math.max(start, end - 60), end};
});
const WorldMap: React.FC<{f: number; spec: TplSpec; i: number; w: {start: number; end: number}}> = ({f, spec, i, w}) => {
  const len = w.end - 8 - w.start, t = (f - w.start) / Math.max(1, len);
  const walkT = Math.max(0, Math.min(1, (t - 0.3) / 0.55));
  const x0 = NODE(i - 1) + 120, x1 = NODE(i) - 40;
  const hx = x0 + (x1 - x0) * walkT;
  const walking = t > 0.3 && t < 0.85;
  const hop = t >= 0.85 ? Math.sin(Math.min(1, (t - 0.85) / 0.15) * Math.PI) * 60 : 0;
  const cam = Math.max(0, hx - 760);
  const d = f - w.start;
  const shake = d < 6 ? (random(`ms${f}`) - 0.5) * 18 : 0;
  const rise = Math.min(1, d / Math.max(1, len * 0.3));
  const worldW = NODE(spec.scenes.length) + 800;
  return (
    <AbsoluteFill data-qa="canvas" style={{background: `linear-gradient(${C.sky1}, ${C.sky2})`, overflow: 'hidden'}}>
      <Stars f={f} />
      {Array.from({length: 14}, (_, k) => <div key={k} style={{position: 'absolute', left: q8(k * 300 - ((cam * 0.4) % 300) - 150), top: GROUND - 160 - (k % 3) * 60, width: 0, height: 0,
        borderLeft: '170px solid transparent', borderRight: '170px solid transparent', borderBottom: `${160 + (k % 3) * 60}px solid #29366F`}} />)}
      <div style={{position: 'absolute', left: 0, top: 0, width: worldW, height: 1080, transform: `translate(${-q8(cam) + shake}px, ${shake / 2}px)`}}>
        {Array.from({length: Math.ceil(worldW / 64)}, (_, k) => (
          <div key={k} style={{position: 'absolute', left: k * 64, top: GROUND, width: 64, height: 300, background: '#73464C', borderTop: `16px solid ${C.green}`,
            boxShadow: 'inset -6px -6px 0 #3E1F3E, inset 6px 6px 0 #AB5236'}} />))}
        {spec.scenes.map((s, k) => {
          const done = k < i - 1 || (k === i - 1 && rise > 0);
          const fy = k === i - 1 ? 260 - 240 * rise : done ? 20 : 260;
          return (
            <div key={s.id} style={{position: 'absolute', left: NODE(k) + 100, top: GROUND - 300}}>
              <div style={{position: 'absolute', left: 0, top: 0, width: 10, height: 300, background: C.white}} />
              <div style={{position: 'absolute', left: 10, top: q8(fy), width: 80, height: 54, background: done ? C.green : C.red, clipPath: 'polygon(0 0,100% 50%,0 100%)'}} />
              <div style={{position: 'absolute', left: -120, top: -150, width: 250, padding: '8px 0', textAlign: 'center', background: C.dark, border: `6px solid ${done ? C.green : k === i ? C.gold : C.white}`}}>
                <T px size={14} color={done ? C.green : C.white}>{`STAGE ${k + 1}`}</T>
                <T px size={14} color={C.gold} style={{marginTop: 6}}>{GAME[s.type] ?? ''}</T>
                <T size={fit(shortOf(s.props), 220, 28)} style={{marginTop: 4}}>{shortOf(s.props)}</T>
              </div>
            </div>
          );
        })}
        <Coins at={w.start} x={NODE(i - 1) + 100} y={GROUND - 320} />
        <Sprite x={q8(hx)} y={GROUND - 130 - q8(hop) + (walking && Math.floor(f / 4) % 2 ? -8 : 0)} walk={walking && Math.floor(f / 4) % 2 === 1} />
      </div>
      {t < 0.5 && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', transform: `scale(${Math.min(1, d / 5)})`}}>
          <Box color={C.gold} style={{padding: '14px 44px', textAlign: 'center'}}>
            <T px size={36} color={C.gold}>SKILL UNLOCKED!</T>
            <T size={30} style={{marginTop: 8}}>{shortOf(spec.scenes[i - 1].props)}</T>
          </Box>
        </div>
      )}
    </AbsoluteFill>
  );
};

const SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, quiz: Quiz, stat: Stat, recap: Recap, qaEnd: QaEnd};

export const TemplateA: React.FC<TplSpec & {narrator?: string}> = (spec) => {
  const f = useCurrentFrame();
  const total = spec.totalFrames;
  const wins = walkWindows(spec);
  const wi = wins.findIndex((w) => w && f >= w.start && f < w.end);
  const win = wi > 0 ? wins[wi] : null;
  const onMap = !!win && f < win.end - 8;
  const dissolve = win && !onMap ? (f - (win.end - 8)) / 8 : 1;
  const cleared = wins.filter((w) => w && f >= w.start + 4).length;
  const nClear = Math.max(1, spec.scenes.length - 1);
  const fade = Math.max(0, 1 - f / 8, (f - (total - 24)) / 24);
  const cap = captionAt(spec, f, 8);
  const lines = cap ? wrap(cap.text, 30) : [];
  return (
    <AbsoluteFill style={{background: `linear-gradient(${C.sky1}, ${C.sky2})`, overflow: 'hidden'}}>
      <Stars f={f} />
      {Array.from({length: 10}, (_, i) => <div key={i} style={{position: 'absolute', left: i * 220 - 60, bottom: 0, width: 0, height: 0, opacity: 0.55,
        borderLeft: '150px solid transparent', borderRight: '150px solid transparent', borderBottom: `${130 + (i % 3) * 50}px solid #29366F`}} />)}
      {!onMap && spec.scenes.map((s) => {
        const Comp = SCENES[s.type];
        return Comp ? <Sequence key={s.id} from={s.from} durationInFrames={s.dur}><Comp p={s.props} cues={s.cues} dur={s.dur} /></Sequence> : null;
      })}
      {onMap && win && <WorldMap f={f} spec={spec} i={wi} w={win} />}
      <div style={{position: 'absolute', left: 40, top: 30, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <T px size={22} color={C.gold}>{`LV.${1 + cleared}`}</T>
          <div style={{width: 320, height: 24, border: `5px solid ${C.white}`, background: C.dark}}><div style={{width: `${(cleared / nClear) * 100}%`, height: '100%', background: C.green}} /></div>
          <T px size={16}>XP</T>
        </div>
        <T px size={22}>SCORE {String(cleared * 1000).padStart(6, '0')}</T>
      </div>
      {dissolve < 1 && (
        <AbsoluteFill style={{display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)'}}>
          {Array.from({length: 24 * 14}, (_, i) => <div key={i} style={{background: C.ink, opacity: random(`w${i}`) > dissolve ? 1 : 0}} />)}
        </AbsoluteFill>
      )}
      {cap && (() => {
        const chars = Array.from(cap.text);
        const n = Math.ceil(chars.length * Math.min(1, (f - cap.from) / Math.max(1, (cap.to - cap.from) * 0.8)));
        let left = n;
        return (
          <div data-qa="caption" style={{position: 'absolute', left: 200, right: 200, bottom: 34, minHeight: 120, background: C.ink, border: `8px solid ${C.white}`,
            boxShadow: '10px 10px 0 #000', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '10px 40px'}}>
            <div style={{position: 'absolute', left: 30, top: -38, background: C.blue, border: `6px solid ${C.white}`, padding: '2px 18px'}}><T size={22}>{spec.narrator ?? '學長'}</T></div>
            {lines.map((ln, i) => { const show = Array.from(ln).slice(0, Math.max(0, left)).join(''); left -= Array.from(ln).length; return <T key={i} size={38}>{show || ' '}</T>; })}
          </div>
        );
      })()}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 4px)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.45} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
