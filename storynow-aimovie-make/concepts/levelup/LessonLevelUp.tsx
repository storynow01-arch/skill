/* 概念 A「闖關遊戲」的教學渲染器：吃標準 spec.json（任何教學分鏡），把每種教學場景畫成遊戲畫面。
   title→WORLD 開場、scenario→QUEST、definition→NEW ITEM GET、cards→INVENTORY、vs→VS 對戰、
   quiz→QUIZ BATTLE、recap→STAGE CLEAR、qaEnd→FINAL BOSS QUIZ；字幕＝RPG 對話框。 */
import React from 'react';
import {AbsoluteFill, Audio, random, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, PixText, Sprite, Stars} from './LevelUp';
import type {Spec} from '../Video';

const EMOJI = '"Segoe UI Emoji", "Noto Color Emoji", sans-serif';
const step = (f: number, n = 2) => Math.floor(f / n) * n;
const q8 = (v: number) => Math.round(v / 8) * 8;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type P = {p: any; cues: number[]; dur: number};
const cue = (cues: number[], i: number | undefined, fb: number) => (i !== undefined && i >= 0 && cues[i] !== undefined ? cues[i] : fb);

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
    return <div key={k} style={{position: 'absolute', left: q8(x + vx * d), top: q8(y + vy * d + 0.9 * d * d), width: 22, height: 22, background: C.gold,
      border: `4px solid ${C.ink}`, opacity: 1 - d / 22}} />;
  })}</>;
};
const Banner: React.FC<{text: string; color?: string; top?: number}> = ({text, color = C.gold, top = 130}) => (
  <Pop at={0} style={{position: 'absolute', left: 0, right: 0, top, display: 'flex', justifyContent: 'center'}}>
    <Box color={color} style={{padding: '12px 40px'}}><PixText size={34} color={color}>{text}</PixText></Box>
  </Pop>
);

/* ===================== 場景 ===================== */
const Title: React.FC<P> = ({p}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const world = /^\d/.test(p.eyebrow) ? `WORLD ${p.eyebrow}` : `WORLD 1-1 · ${p.eyebrow}`;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <PixText size={44} color={C.gold} style={{marginBottom: 40}}>{world}</PixText>
      <div style={{display: 'flex'}}>
        {Array.from(p.title as string).map((ch, i) => {
          const s = spring({frame: step(f) - 6 - i * 3, fps, config: {damping: 8, stiffness: 160}});
          return <PixText key={i} tc size={150} style={{transform: `translateY(${q8((1 - s) * -560)}px)`, textShadow: `10px 10px 0 ${C.ink}`}}>{ch}</PixText>;
        })}
      </div>
      <PixText size={28} color={C.blue} style={{marginTop: 30, letterSpacing: 8}}>{p.en}</PixText>
      <PixText size={30} style={{marginTop: 60, opacity: Math.floor(f / 15) % 2 ? 1 : 0.2}}>▶ PRESS START</PixText>
    </AbsoluteFill>
  );
};

const Scenario: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const pills: string[] = p.pills;
  return (
    <AbsoluteFill>
      <Banner text="★ QUEST ★" />
      <PixText size={58} tc style={{position: 'absolute', top: 250, width: '100%', textAlign: 'center'}}>{p.heading}</PixText>
      <Box style={{position: 'absolute', left: 220, top: 380, width: 380, height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <span style={{fontFamily: EMOJI, fontSize: 210, transform: `translateY(${Math.floor(f / 12) % 2 ? -10 : 0}px) rotate(${p.spin ? step(f, 3) * 8 : 0}deg)`}}>{p.icon}</span>
      </Box>
      <div style={{position: 'absolute', left: 720, top: 400, display: 'flex', flexDirection: 'column', gap: 34}}>
        {pills.map((x, i) => {
          const at = cue(cues, p.cueMap?.[i], 20 + i * 30);
          const last = i === pills.length - 1;
          const on = f >= at;
          return (
            <div key={x} style={{display: 'flex', alignItems: 'center', gap: 26, opacity: on ? 1 : 0.25}}>
              <div style={{width: 64, height: 64, border: `6px solid ${last ? C.red : C.green}`, background: on ? (last ? C.red : C.green) : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center'}}><PixText size={30} color={C.ink}>{on ? (last ? '✕' : '✓') : ''}</PixText></div>
              <PixText size={last ? 60 : 50} tc color={last && on ? C.red : C.white}
                style={{transform: last && on && f - at < 10 ? `translateX(${(random(`s${f}`) - 0.5) * 20}px)` : undefined}}>{x}{last && on ? ' ?!' : ''}</PixText>
            </div>
          );
        })}
      </div>
      <Sprite x={1640} y={620} s={10} />
    </AbsoluteFill>
  );
};

const Definition: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const big: string = p.bigText, hl: string = p.highlight ?? '';
  const k = big.indexOf(hl);
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
          <div style={{display: 'inline-block', background: C.blue, padding: '6px 22px', marginBottom: 20}}><PixText size={30} tc>{p.label}</PixText></div>
          <PixText size={110} tc>
            {k < 0 ? big : <>{big.slice(0, k)}<span style={{color: hlOn ? C.gold : C.white, textDecoration: hlOn ? 'underline' : 'none',
              textDecorationThickness: 10, textUnderlineOffset: 16, filter: hlOn && Math.floor(f / 6) % 2 ? 'brightness(1.4)' : undefined}}>{hl}</span>{big.slice(k + hl.length)}</>}
          </PixText>
        </Box>
      </Pop>
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center', gap: 40}}>
        {notes.map((n, i) => {
          const at = cue(cues, p.noteCues?.[i], 50 + i * 15);
          return <Pop key={n} at={at}><Box color={C.green} style={{padding: '14px 30px'}}><PixText size={40} tc>▸ {n}</PixText></Box></Pop>;
        })}
      </div>
    </AbsoluteFill>
  );
};

const Cards: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const cards: {icon?: string; title: string; note?: string}[] = p.cards;
  const w = cards.length <= 2 ? 620 : 480;
  return (
    <AbsoluteFill>
      <Banner text="INVENTORY" color={C.blue} />
      <PixText size={52} tc style={{position: 'absolute', top: 240, width: '100%', textAlign: 'center'}}>{p.heading}</PixText>
      <div style={{position: 'absolute', left: 0, right: 0, top: 350, display: 'flex', justifyContent: 'center', gap: 40}}>
        {cards.map((c, i) => {
          const at = cue(cues, p.cueMap?.[i], 20 + i * 30);
          const on = f >= at;
          return (
            <div key={i} style={{position: 'relative'}}>
              <Box color={on ? C.gold : '#666'} style={{width: w, height: 380, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transform: on && f - at < 8 ? `translateY(${-q8(Math.sin(((f - at) / 8) * Math.PI) * 30)}px)` : undefined}}>
                {on ? (
                  <>
                    <span style={{fontFamily: EMOJI, fontSize: 110}}>{c.icon}</span>
                    <PixText size={48} tc style={{marginTop: 18}}>{c.title}</PixText>
                    {c.note && <PixText size={28} tc color={C.blue} style={{marginTop: 12, textAlign: 'center', padding: '0 20px'}}>{c.note}</PixText>}
                  </>
                ) : <PixText size={120} color="#666">?</PixText>}
              </Box>
              <PixText size={22} color={C.gold} style={{position: 'absolute', left: 16, top: 14}}>{i + 1}</PixText>
              <Coins at={at} x={w / 2} y={60} />
            </div>
          );
        })}
      </div>
      {p.footer && f >= cue(cues, cues.length - 1, 120) && (
        <Pop at={cue(cues, cues.length - 1, 120)} style={{position: 'absolute', left: 0, right: 0, top: 790, display: 'flex', justifyContent: 'center'}}>
          <Box color={C.red} style={{padding: '8px 30px'}}><PixText size={34} tc>TIP：{p.footer}</PixText></Box>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

const Vs: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const side = (s: {frame: string; icon: string; text: string}, i: number) => {
    const at = cue(cues, p.cueMap?.[i], i ? 40 : 6);
    const col = s.frame === 'danger' ? C.red : s.frame === 'success' ? C.green : C.blue;
    const on = f >= at;
    return (
      <Pop at={at}>
        <Box color={col} style={{width: 640, height: 470, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px'}}>
          <PixText size={24} color={col}>{s.frame === 'danger' ? 'ENEMY' : s.frame === 'success' ? 'HERO' : 'PLAYER'}</PixText>
          <span style={{fontFamily: EMOJI, fontSize: 130, color: col, marginTop: 10, transform: on && s.frame === 'danger' ? `translateX(${Math.sin(f / 3) * 6}px)` : undefined}}>{s.icon}</span>
          <PixText size={44} tc style={{marginTop: 20, textAlign: 'center', lineHeight: 1.4}}>{s.text}</PixText>
        </Box>
      </Pop>
    );
  };
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 170, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 50}}>
        {side(p.left, 0)}
        <PixText size={110} color={C.gold} style={{transform: `scale(${1 + 0.08 * Math.sin(f / 4)})`}}>{p.mid === 'vs' ? 'VS' : p.mid}</PixText>
        {side(p.right, 1)}
      </div>
      {p.footerPill && (
        <Pop at={cue(cues, cues.length - 1, 90)} style={{position: 'absolute', left: 0, right: 0, top: 730, display: 'flex', justifyContent: 'center'}}>
          <Box color={C.gold} style={{padding: '10px 34px'}}><PixText size={36} tc>TIP：{p.footerPill}</PixText></Box>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

const Quiz: React.FC<P> = ({p, cues, dur}) => {
  const f = useCurrentFrame();
  const reveal = cue(cues, p.revealCue, dur * 0.6);
  const r = f >= reveal;
  const opts: string[] = p.options;
  const cursor = r ? p.answerIndex : Math.floor(f / 10) % opts.length;
  return (
    <AbsoluteFill>
      <Banner text="!! QUIZ BATTLE !!" color={C.red} />
      <Box style={{position: 'absolute', left: 260, right: 260, top: 250, padding: '24px 40px'}}><PixText size={60} tc>Q：{p.question}</PixText></Box>
      <div style={{position: 'absolute', left: 260, right: 260, top: 450, display: 'flex', gap: 50}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          const col = r ? (ok ? C.green : '#555') : C.white;
          return (
            <Box key={o} color={col} style={{flex: 1, height: 170, display: 'flex', alignItems: 'center', gap: 20, padding: '0 30px', opacity: r && !ok ? 0.45 : 1,
              transform: r && !ok && f - reveal < 10 ? `translateX(${(random(`q${f}`) - 0.5) * 24}px)` : undefined}}>
              <PixText size={44} color={C.gold} style={{width: 50}}>{cursor === i ? '▶' : ''}</PixText>
              <PixText size={52} tc>{String.fromCharCode(65 + i)}. {o}</PixText>
            </Box>
          );
        })}
      </div>
      {r && <Pop at={reveal} style={{position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center'}}>
        <PixText size={56} color={C.green}>CORRECT! +100 XP</PixText></Pop>}
      {r && p.afterNote && f > reveal + 24 && <PixText size={36} tc color={C.gold} style={{position: 'absolute', top: 760, width: '100%', textAlign: 'center'}}>{p.afterNote}</PixText>}
      <Coins at={reveal} x={1300} y={500} />
    </AbsoluteFill>
  );
};

const Recap: React.FC<P> = ({p, cues}) => {
  const f = useCurrentFrame();
  const take: string[] = p.takeaway ?? [], recap: string[] = p.recap ?? [];
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', left: 0, right: 0, top: 120, display: 'flex', justifyContent: 'center', gap: 30}}>
        {[0, 1, 2].map((i) => <Pop key={i} at={4 + i * 8}><PixText size={90} color={C.gold}>★</PixText></Pop>)}
      </div>
      <PixText size={60} color={C.green} style={{position: 'absolute', top: 240, width: '100%', textAlign: 'center'}}>STAGE CLEAR!</PixText>
      <Box color={C.gold} style={{position: 'absolute', left: 140, top: 350, width: 1000, padding: '24px 36px'}}>
        <PixText size={24} color={C.gold}>LOOT</PixText>
        {take.map((t, i) => <div key={t} style={{opacity: f >= cue(cues, p.takeCues?.[i], 20 + i * 40) ? 1 : 0.15}}>
          <PixText size={44} tc style={{marginTop: 18}}>◆ {t}</PixText></div>)}
      </Box>
      <Box color={C.blue} style={{position: 'absolute', left: 1180, top: 350, width: 600, padding: '24px 30px'}}>
        <PixText size={24} color={C.blue}>RESULT</PixText>
        {recap.map((t, i) => <div key={t} style={{opacity: f > 24 + i * 8 ? 1 : 0}}><PixText size={30} tc style={{marginTop: 14}}>✓ {t}</PixText></div>)}
      </Box>
      {p.nextTeaser && f >= cue(cues, p.nextCue, 120) && (
        <Pop at={cue(cues, p.nextCue, 120)} style={{position: 'absolute', left: 0, right: 0, top: 770, display: 'flex', justifyContent: 'center'}}>
          <PixText size={42} tc color={C.gold}>NEXT ▶ WORLD 1-2：{p.nextTeaser}</PixText>
        </Pop>
      )}
    </AbsoluteFill>
  );
};

const QaEnd: React.FC<P> = ({p}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const ans = Math.round((p.answerSec ?? 4) * fps);
  const r = f >= ans;
  const opts: string[] = p.options;
  return (
    <AbsoluteFill>
      <Banner text="FINAL BOSS QUIZ" color={C.red} top={110} />
      <div style={{position: 'absolute', left: 260, right: 260, top: 230}}>
        <div style={{height: 30, border: `6px solid ${C.white}`, background: C.dark}}>
          <div style={{width: `${Math.max(0, 1 - f / ans) * 100}%`, height: '100%', background: C.red}} />
        </div>
        <PixText size={50} tc style={{marginTop: 30}}>{p.question}</PixText>
      </div>
      <div style={{position: 'absolute', left: 260, right: 260, top: 430, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 26}}>
        {opts.map((o, i) => {
          const ok = i === p.answerIndex;
          return <Box key={o} color={r ? (ok ? C.green : '#555') : C.white} style={{padding: '22px 26px', opacity: r && !ok ? 0.4 : 1}}>
            <PixText size={36} tc>{r && ok ? '✓' : String.fromCharCode(65 + i) + '.'} {o}</PixText></Box>;
        })}
      </div>
      {r && <PixText size={50} color={C.green} style={{position: 'absolute', top: 790, width: '100%', textAlign: 'center'}}>WORLD 1-1 CLEAR!</PixText>}
    </AbsoluteFill>
  );
};

const SCENES: Record<string, React.FC<P>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, quiz: Quiz, recap: Recap, qaEnd: QaEnd};

/* ===================== RPG 對話框字幕 ===================== */
const Dialog: React.FC<{caps: Spec['captions']; f: number}> = ({caps, f}) => {
  const c = caps.find((x) => f >= x.from && f < x.to + 8);
  if (!c) return null;
  const chars = Array.from(c.text);
  const shown = chars.slice(0, Math.ceil(chars.length * Math.min(1, (f - c.from) / Math.max(1, (c.to - c.from) * 0.8)))).join('');
  return (
    <div style={{position: 'absolute', left: 200, right: 200, bottom: 34, height: 120, background: C.ink, border: `8px solid ${C.white}`, boxShadow: '10px 10px 0 #000',
      display: 'flex', alignItems: 'center', padding: '0 40px'}}>
      <div style={{position: 'absolute', left: 30, top: -38, background: C.blue, border: `6px solid ${C.white}`, padding: '2px 18px'}}><PixText size={22} tc>學長</PixText></div>
      <PixText size={40} tc>{shown}</PixText>
    </div>
  );
};

export const LessonLevelUp: React.FC<Spec> = (spec) => {
  const f = useCurrentFrame();
  const total = spec.totalFrames;
  const idx = spec.scenes.findIndex((s) => f >= s.from && f < s.from + s.dur);
  const cur = spec.scenes[Math.max(0, idx)];
  const lf = f - cur.from;
  const wipe = lf < 10 ? lf / 10 : 1;
  const fade = Math.max(0, 1 - f / 8, (f - (total - 24)) / 24);
  return (
    <AbsoluteFill style={{background: `linear-gradient(${C.sky1}, ${C.sky2})`, overflow: 'hidden'}}>
      <Stars f={f} />
      {Array.from({length: 10}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: i * 220 - 60, bottom: 0, width: 0, height: 0, opacity: 0.55,
          borderLeft: '150px solid transparent', borderRight: '150px solid transparent', borderBottom: `${130 + (i % 3) * 50}px solid #29366F`}} />))}
      {spec.scenes.map((s) => {
        const Comp = SCENES[s.type];
        return Comp ? <Sequence key={s.id} from={s.from} durationInFrames={s.dur}><Comp p={s.props} cues={s.cues} dur={s.dur} /></Sequence> : null;
      })}
      {/* HUD：WORLD、經驗值＝課程進度、分數 */}
      <div style={{position: 'absolute', left: 40, top: 30, right: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          <PixText size={24} color={C.gold}>WORLD 1-1</PixText>
          <div style={{width: 320, height: 24, border: `5px solid ${C.white}`, background: C.dark}}><div style={{width: `${(f / total) * 100}%`, height: '100%', background: C.green}} /></div>
          <PixText size={16}>XP</PixText>
        </div>
        <PixText size={22}>SCORE {String(Math.max(0, idx) * 1000).padStart(6, '0')}</PixText>
      </div>
      {/* 換場：像素溶解 */}
      {wipe < 1 && idx > 0 && (
        <AbsoluteFill style={{display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)'}}>
          {Array.from({length: 24 * 14}, (_, i) => <div key={i} style={{background: C.ink, opacity: random(`w${i}`) > wipe ? 1 : 0}} />)}
        </AbsoluteFill>
      )}
      <Dialog caps={spec.captions} f={f} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0 2px, transparent 2px 4px)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.music && <Audio src={staticFile(spec.music)} volume={(fr) => {
        const talking = spec.duck.some(([a, b]) => fr >= a - 6 && fr <= b + 10);
        return talking ? 0.16 : 0.42;
      }} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      {spec.music && <Audio src={staticFile('lesson_sfx.wav')} />}
    </AbsoluteFill>
  );
};
