/* 動態語言（Motion Language）：讓每種風格連「特效怎麼動」都不一樣。
   styles.json 每個風格的 "motion": {title, counter, enter, fx} 決定：
     title   標題出現方式    glitchDecode | neonFlicker | pixelDrop | rise(預設)
     counter 數字計數方式    slot | chrome | coin | plain(預設)
     enter   項目進場方式    scanOpen | roadSlide | itemBounce | fadeUp(預設)
     fx      衝擊特效        dataBurst | laserSweep | pixelConfetti | none(預設)
   場景只呼叫 <FxTitle> / <FxCounter> / <FxEnter>，換風格就換動態。 */
import React from 'react';
import {AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import STYLES from './styles.json';
import {Theme, ease, glowOf, useTheme} from './theme';

export type Motion = {title: string; counter: string; enter: string; fx: string};
const DEFAULT: Motion = {title: 'rise', counter: 'plain', enter: 'fadeUp', fx: 'none'};
export const motionOf = (t: Theme): Motion =>
  ({...DEFAULT, ...((STYLES as Record<string, {motion?: Partial<Motion>}>)[t.id]?.motion ?? {})});

const GLYPHS = '01<>/{}[]#$%&*+=;:アイウエカキクサシス░▒▓';
const glyph = (seed: string) => GLYPHS[Math.floor(random(seed) * GLYPHS.length)];
const step = (f: number, n: number) => Math.floor(f / n) * n;   // 像素風：時間量化成格

/* =================== 標題 =================== */
export const FxTitle: React.FC<{text: string; size: number; color?: string; accent: string; delay?: number; style?: React.CSSProperties}> = (
  {text, size, color, accent, delay = 0, style}) => {
  const t = useTheme();
  const f = useCurrentFrame() - delay;
  const {fps} = useVideoConfig();
  const m = motionOf(t).title;
  const chars = Array.from(text);
  const base: React.CSSProperties = {fontFamily: t.f.tc, fontWeight: t.w.tc, fontSize: size, lineHeight: 1.15, color: color ?? t.c.fg,
    whiteSpace: 'nowrap', display: 'inline-block', ...style};

  if (m === 'glitchDecode') {
    const split = Math.max(0, 1 - f / 40) * 10;
    return (
      <span style={{...base, textShadow: `${split}px 0 ${t.c.bad}cc, ${-split}px 0 ${accent}cc, ${glowOf(t, accent, 1.2)}`}}>
        {chars.map((ch, i) => {
          const at = 4 + i * 2.5;
          if (f < at - 10) return <span key={i} style={{opacity: 0}}>{ch}</span>;
          if (f < at) return <span key={i} style={{color: accent, opacity: 0.85}}>{ch === ' ' ? ' ' : glyph(`${i}-${Math.floor(f / 2)}`)}</span>;
          const jit = f < at + 4 ? (random(`j${i}${f}`) - 0.5) * 12 : 0;
          return <span key={i} style={{display: 'inline-block', transform: `translateX(${jit}px)`}}>{ch}</span>;
        })}
      </span>
    );
  }

  if (m === 'neonFlicker') {
    const chrome: React.CSSProperties = {backgroundImage: `linear-gradient(180deg, #ffffff 0%, #fff6c8 38%, ${t.c.accent2} 48%, ${t.c.accent} 62%, #6a1bb0 100%)`,
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'};
    const row = (mirror: boolean) => (
      <span style={{...base, display: 'block', transform: mirror ? 'scaleY(-0.55)' : undefined, opacity: mirror ? 0.28 : 1,
        WebkitMaskImage: mirror ? 'linear-gradient(to top, black, transparent 80%)' : undefined,
        filter: mirror ? 'blur(2px)' : `drop-shadow(0 0 ${10 * t.glow}px ${accent}) drop-shadow(0 0 ${28 * t.glow}px ${accent}88)`}}>
        {chars.map((ch, i) => {
          const on = 6 + i * 3 + random(`on${i}`) * 6;
          let o = 0;
          if (f >= on) o = 1;
          else if (f > on - 8) o = random(`fl${i}-${f}`) > 0.55 ? 1 : 0.15;
          if (o === 1 && random(`hum${i}-${Math.floor(f / 3)}`) > 0.985) o = 0.5;
          return <span key={i} style={{...chrome, opacity: o}}>{ch}</span>;
        })}
      </span>
    );
    return <span style={{display: 'inline-block', textAlign: 'center'}}>{row(false)}<span style={{display: 'block', height: size * 0.08}} />{row(true)}</span>;
  }

  if (m === 'pixelDrop') {
    return (
      <span style={{...base, textShadow: `${Math.round(size / 18)}px ${Math.round(size / 18)}px 0 ${t.c.bg2}`}}>
        {chars.map((ch, i) => {
          const s = spring({frame: step(f, 2) - 3 - i * 3, fps, config: {damping: 9, stiffness: 140}});
          const y = Math.round(((1 - s) * -420) / 8) * 8;
          return <span key={i} style={{display: 'inline-block', transform: `translateY(${y}px)`, opacity: s > 0.02 ? 1 : 0,
            color: i % 2 ? (color ?? t.c.fg) : (color ?? t.c.fg)}}>{ch}</span>;
        })}
      </span>
    );
  }

  const a = ease(f, 0, 18);
  return <span style={{...base, textShadow: glowOf(t, accent, 1.2), opacity: a, transform: `translateY(${(1 - a) * 30}px) scale(${1.1 - 0.1 * a})`}}>{text}</span>;
};

/* =================== 計數器 =================== */
export const FxCounter: React.FC<{to: number; size: number; color: string; suffix?: string; delay?: number; dur?: number}> = (
  {to, size, color, suffix = '', delay = 6, dur = 42}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = motionOf(t).counter;
  const p = ease(f, delay, dur);
  const numStyle: React.CSSProperties = {fontFamily: t.f.num, fontWeight: t.w.num, fontSize: size, lineHeight: 1, color};

  if (m === 'slot') {
    // 里程表：每一位數獨立滾動
    const v = to * p;
    const digits = String(to).length;
    const h = size * 1.05;
    return (
      <span style={{position: 'relative', display: 'inline-flex', alignItems: 'flex-end', filter: `drop-shadow(0 0 ${14 * t.glow}px ${color})`}}>
        {Array.from({length: digits}, (_, k) => {
          const place = 10 ** (digits - 1 - k);
          const pos = (v / place) % 10;
          const roll = p < 1 ? pos : Math.floor((to / place) % 10);
          return (
            <span key={k} style={{display: 'inline-block', height: h, overflow: 'hidden', width: size * 0.66}}>
              <span style={{display: 'block', transform: `translateY(${-roll * h}px)`}}>
                {Array.from({length: 11}, (_, d) => <span key={d} style={{...numStyle, display: 'block', height: h, textAlign: 'center'}}>{d % 10}</span>)}
              </span>
            </span>
          );
        })}
        <span style={numStyle}>{suffix}</span>
        {p > 0 && p < 1 && <span style={{position: 'absolute', left: -20, right: -20, height: 6, top: `${(f * 9) % 100}%`, background: color, opacity: 0.7, boxShadow: `0 0 20px ${color}`}} />}
      </span>
    );
  }

  if (m === 'chrome') {
    // 鉻金屬立體數字：從地平線衝出、帶殘影
    const s = spring({frame: f - delay, fps, config: {damping: 13, stiffness: 90}});
    const v = Math.round(to * p);
    const chrome: React.CSSProperties = {backgroundImage: `linear-gradient(180deg, #ffffff 0%, #d8e6ff 40%, ${t.c.accent3} 50%, #ffffff 56%, ${t.c.accent} 100%)`,
      WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'};
    const layer = (k: number) => (
      <span key={k} style={{...numStyle, ...chrome, position: k ? 'absolute' : 'relative', left: 0, top: 0, opacity: k ? 0.25 / k : 1,
        transform: `translateY(${k * (1 - s) * 60}px)`, filter: k ? 'blur(3px)' : `drop-shadow(0 6px 0 ${t.c.accent}) drop-shadow(0 0 24px ${t.c.accent}aa)`}}>
        {v}{suffix}
      </span>
    );
    return (
      <span style={{position: 'relative', display: 'inline-block', transform: `perspective(800px) translateY(${(1 - s) * 260}px) rotateX(${(1 - s) * 50}deg) scale(${0.3 + 0.7 * s})`,
        transformOrigin: '50% 100%'}}>
        {[3, 2, 1, 0].map(layer)}
      </span>
    );
  }

  if (m === 'coin') {
    // 8-bit 跳數：一格一格跳，每 +1 噴金幣
    const per = Math.max(2, Math.floor(dur / Math.max(1, to)));
    const v = Math.max(0, Math.min(to, Math.floor((f - delay) / per) + 1));
    const lastAt = delay + (v - 1) * per;
    const pop = f - lastAt < 4 && v > 0 ? 1.18 : 1;
    return (
      <span style={{position: 'relative', display: 'inline-block'}}>
        <span style={{...numStyle, display: 'inline-block', transform: `scale(${pop})`, textShadow: `${size / 16}px ${size / 16}px 0 ${t.c.bg2}`}}>{f < delay ? 0 : v}{suffix}</span>
        {Array.from({length: to}, (_, k) => {
          const at = delay + k * per;
          const d = f - at;
          if (d < 0 || d > 22) return null;
          const dx = (random(`cx${k}`) - 0.5) * size * 1.6;
          const y = Math.round((-d * 9 + d * d * 0.55) / 4) * 4;
          return (
            <React.Fragment key={k}>
              <span style={{position: 'absolute', left: `calc(50% + ${dx}px)`, top: y, width: 26, height: 26, background: t.c.accent2,
                border: `4px solid ${t.c.bg}`, boxShadow: `inset -5px -5px 0 #c9871f`, opacity: 1 - d / 22}} />
              <span style={{position: 'absolute', left: '100%', top: -d * 3, fontFamily: t.f.num, fontSize: size * 0.18, color: t.c.accent3,
                opacity: 1 - d / 22, marginLeft: 10}}>+1</span>
            </React.Fragment>
          );
        })}
      </span>
    );
  }

  return <span style={{...numStyle, textShadow: glowOf(t, color, 1.1), fontVariantNumeric: 'tabular-nums'}}>{Math.round(to * p)}{suffix}</span>;
};

/* =================== 項目進場 =================== */
export const FxEnter: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties; from?: 'left' | 'right'}> = (
  {delay, children, style, from = 'right'}) => {
  const t = useTheme();
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = motionOf(t).enter;
  if (m === 'scanOpen') {
    const a = ease(f, delay, 12);
    return (
      <div style={{position: 'relative', ...style}}>
        <div style={{clipPath: `inset(${(1 - a) * 50}% 0 ${(1 - a) * 50}% 0)`, opacity: a > 0 ? 1 : 0}}>{children}</div>
        {a > 0 && a < 1 && <div style={{position: 'absolute', left: -10, right: -10, top: '50%', height: 3, background: t.c.accent,
          boxShadow: `0 0 18px ${t.c.accent}`, transform: `scaleX(${a * 1.2})`}} />}
      </div>
    );
  }
  if (m === 'roadSlide') {
    const s = spring({frame: f - delay, fps, config: {damping: 15, stiffness: 80}});
    return <div style={{transform: `perspective(900px) translateZ(${(1 - s) * -900}px) translateX(${(1 - s) * (from === 'right' ? -300 : 300)}px)`,
      opacity: Math.min(1, s * 1.5), filter: s < 0.9 ? `blur(${(1 - s) * 6}px)` : undefined, ...style}}>{children}</div>;
  }
  if (m === 'itemBounce') {
    const s = spring({frame: step(f, 2) - delay, fps, config: {damping: 7, stiffness: 170}});
    return <div style={{transform: `translateY(${Math.round(((1 - s) * -80) / 4) * 4}px) scale(${Math.max(0, s)})`, opacity: s > 0.05 ? 1 : 0, ...style}}>{children}</div>;
  }
  const a = ease(f, delay, 14);
  return <div style={{transform: `translateY(${(1 - a) * 30}px)`, opacity: a, ...style}}>{children}</div>;
};

/* =================== 衝擊特效（全片層級，跟著 impacts 觸發） =================== */
export const ImpactFx: React.FC<{t: Theme; frame: number; impacts: number[]}> = ({t, frame, impacts}) => {
  const m = motionOf(t).fx;
  const hit = impacts.find((i) => frame >= i && frame < i + 40);
  if (m === 'none' || hit === undefined) return null;
  const d = frame - hit;
  if (m === 'dataBurst') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        {Array.from({length: 46}, (_, k) => {
          const ang = random(`a${hit}${k}`) * Math.PI * 2, sp = 14 + random(`s${hit}${k}`) * 30;
          const x = 960 + Math.cos(ang) * sp * d, y = 540 + Math.sin(ang) * sp * d * 0.6;
          return <span key={k} style={{position: 'absolute', left: x, top: y, fontFamily: t.f.mono, fontSize: 18 + (k % 3) * 8,
            color: k % 4 ? t.c.accent : t.c.accent2, opacity: Math.max(0, 1 - d / 30), textShadow: `0 0 10px ${t.c.accent}`}}>{glyph(`g${hit}${k}`)}</span>;
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: `${(d / 30) * 100}%`, height: 4, background: t.c.accent, opacity: Math.max(0, 1 - d / 30),
          boxShadow: `0 0 30px ${t.c.accent}`}} />
      </AbsoluteFill>
    );
  }
  if (m === 'laserSweep') {
    return (
      <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
        {[0, 1, 2].map((k) => {
          const x = -400 + (d - k * 4) * 90;
          return <div key={k} style={{position: 'absolute', top: -200, left: x, width: 26 - k * 6, height: 1500, transform: 'rotate(22deg)',
            background: [t.c.accent, t.c.accent3, t.c.accent2][k], opacity: Math.max(0, 0.9 - d / 36), boxShadow: `0 0 40px ${[t.c.accent, t.c.accent3, t.c.accent2][k]}`}} />;
        })}
      </AbsoluteFill>
    );
  }
  if (m === 'pixelConfetti') {
    const q = step(d, 2);
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        {Array.from({length: 54}, (_, k) => {
          const vx = (random(`vx${hit}${k}`) - 0.5) * 46, vy = -20 - random(`vy${hit}${k}`) * 26;
          const x = Math.round((960 + vx * q) / 8) * 8, y = Math.round((540 + vy * q + 1.4 * q * q) / 8) * 8;
          const col = [t.c.accent, t.c.accent2, t.c.accent3, t.c.bad][k % 4];
          return <div key={k} style={{position: 'absolute', left: x, top: y, width: k % 3 ? 12 : 20, height: k % 3 ? 12 : 20, background: col,
            opacity: q > 34 ? 0 : 1}} />;
        })}
      </AbsoluteFill>
    );
  }
  return null;
};
