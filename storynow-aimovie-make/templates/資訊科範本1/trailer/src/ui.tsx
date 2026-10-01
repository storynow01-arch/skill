import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, spring, useVideoConfig} from 'remotion';
import {C, EN, MONO, NUM, TC, TOTAL, ease, glow} from './theme';

/* ---------------- 背景：3D 透視格線 + 粒子 + 捲動程式碼 ---------------- */
const BG_CODE = [
  'for (int i = 0; i < n; i++) sum += a[i];',
  'def train(model, data): return model.fit(data)',
  'struct Node { int key; Node *left, *right; };',
  'GPIO.output(LED_PIN, GPIO.HIGH)',
  'tensor = torch.relu(W @ x + b)',
  'digitalWrite(13, HIGH); delay(250);',
  'MOVJ P[1] V=50 ; MOVL P[2] V=200',
  'mqtt.publish("haiching/it/iot", payload)',
  'esp_wifi_start(); xTaskCreate(loop, "ai", 4096);',
  'quick_sort(arr, 0, n - 1);',
  'ip route 10.0.0.0 255.0.0.0 192.168.1.1',
  'yield from edge_ai.infer(frame)',
];

export const Background: React.FC<{accent: string; code?: number; grid?: number}> = ({accent, code = 0.5, grid = 1}) => {
  const f = useCurrentFrame();
  const scroll = (f * 4) % 120;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 42%, ${C.bg1} 0%, ${C.bg0} 62%, #01030a 100%)`}}>
      {/* 地板格線 */}
      <div style={{position: 'absolute', left: -1000, right: -1000, top: 620, height: 1200, opacity: 0.55 * grid,
        transform: 'perspective(600px) rotateX(72deg)', transformOrigin: '50% 0%',
        backgroundImage: `linear-gradient(${accent}88 2px, transparent 2px), linear-gradient(90deg, ${accent}66 2px, transparent 2px)`,
        backgroundSize: '120px 120px', backgroundPosition: `0 ${scroll}px`,
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 618, height: 3, opacity: grid,
        background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: glow(accent, 0.6)}} />
      {/* 捲動程式碼 */}
      {code > 0 && [30, 1200].map((x, k) => (
        <div key={x} style={{position: 'absolute', left: x, top: -((f * 1.4 + k * 300) % 420), width: 700, opacity: 0.16 * code,
          fontFamily: MONO, fontSize: 20, lineHeight: '35px', color: accent, whiteSpace: 'pre'}}>
          {Array.from({length: 48}, (_, i) => BG_CODE[(i + k * 5) % BG_CODE.length]).join('\n')}
        </div>
      ))}
      {/* 粒子 */}
      {Array.from({length: 70}, (_, i) => {
        const sp = 0.3 + random(`s${i}`) * 1.4;
        const y = (random(`y${i}`) * 1080 - f * sp + 2160) % 1080;
        const x = random(`x${i}`) * 1920 + Math.sin(f / 30 + i) * 10;
        const s = 1 + random(`z${i}`) * 3;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s,
          background: accent, opacity: (0.2 + random(`o${i}`) * 0.6) * grid, boxShadow: `0 0 ${s * 3}px ${accent}`}} />;
      })}
    </AbsoluteFill>
  );
};

/* ---------------- HUD ---------------- */
export const Hud: React.FC<{accent: string; label: string; absFrame: number}> = ({accent, label, absFrame}) => {
  const corner = (s: React.CSSProperties) => (
    <div style={{position: 'absolute', width: 46, height: 46, borderColor: accent, borderStyle: 'solid', borderWidth: 0, opacity: 0.85, ...s}} />
  );
  const sec = absFrame / 30;
  const tc = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(Math.floor(sec % 60)).padStart(2, '0')}:${String(absFrame % 30).padStart(2, '0')}`;
  const lab: React.CSSProperties = {position: 'absolute', fontFamily: EN, fontWeight: 700, fontSize: 21, letterSpacing: 3};
  return (
    <AbsoluteFill>
      {corner({left: 40, top: 40, borderLeftWidth: 3, borderTopWidth: 3})}
      {corner({right: 40, top: 40, borderRightWidth: 3, borderTopWidth: 3})}
      {corner({left: 40, bottom: 40, borderLeftWidth: 3, borderBottomWidth: 3})}
      {corner({right: 40, bottom: 40, borderRightWidth: 3, borderBottomWidth: 3})}
      <div style={{...lab, left: 72, top: 58, color: '#ffffffaa'}}>HAICHING IT // OFFICIAL TRAILER 2026</div>
      <div style={{...lab, right: 72, top: 58, color: accent}}>{label}</div>
      <div style={{...lab, left: 72, bottom: 56, color: '#ffffff88', fontFamily: MONO, fontWeight: 400, fontSize: 19, letterSpacing: 1}}>
        <span style={{color: C.pink}}>●</span> REC {tc}
      </div>
      <div style={{position: 'absolute', right: 72, bottom: 66, width: 350, height: 3, background: '#ffffff22'}}>
        <div style={{width: `${(absFrame / TOTAL) * 100}%`, height: '100%', background: accent, boxShadow: glow(accent, 0.4)}} />
      </div>
    </AbsoluteFill>
  );
};

/* ---------------- 文字元件 ---------------- */
export const ChapterTag: React.FC<{num: string; zh: string; en: string; accent: string}> = ({num, zh, en, accent}) => {
  const f = useCurrentFrame();
  const a = ease(f, 0, 14);
  return (
    <div style={{position: 'absolute', left: 110, top: 140, display: 'flex', alignItems: 'center', gap: 26, opacity: a,
      transform: `translateX(${(1 - a) * -60}px)`}}>
      <div style={{width: 8, height: 90, background: accent, boxShadow: glow(accent, 0.6)}} />
      <div style={{fontFamily: NUM, fontWeight: 900, fontSize: 76, color: accent, textShadow: glow(accent, 0.7)}}>{num}</div>
      <div>
        <div style={{fontFamily: TC, fontWeight: 700, fontSize: 42, color: C.white}}>{zh}</div>
        <div style={{fontFamily: EN, fontWeight: 700, fontSize: 20, letterSpacing: 5, color: accent}}>{en}</div>
      </div>
    </div>
  );
};

export const Heading: React.FC<{zh: string; en: string; accent: string; top?: number; left?: number; size?: number; delay?: number}> = (
  {zh, en, accent, top = 290, left = 140, size = 64, delay = 4}) => {
  const f = useCurrentFrame();
  const a = ease(f, delay, 16);
  return (
    <div style={{position: 'absolute', left, top, opacity: a, transform: `translateX(${(1 - a) * -40}px)`}}>
      <div style={{fontFamily: TC, fontWeight: 900, fontSize: size, color: C.white, textShadow: glow(accent, 0.5)}}>{zh}</div>
      <div style={{fontFamily: EN, fontWeight: 700, fontSize: 22, letterSpacing: 6, color: accent, marginTop: 2}}>{en}</div>
    </div>
  );
};

export const Counter: React.FC<{to: number; delay?: number; dur?: number; suffix?: string; size: number; color: string; style?: React.CSSProperties}> = (
  {to, delay = 6, dur = 42, suffix = '', size, color, style}) => {
  const f = useCurrentFrame();
  const v = Math.round(to * ease(f, delay, dur));
  return (
    <span style={{fontFamily: NUM, fontWeight: 900, fontSize: size, color, lineHeight: 1, textShadow: glow(color, 1.1),
      fontVariantNumeric: 'tabular-nums', ...style}}>{v}{suffix}</span>
  );
};

export const Pop: React.FC<{delay: number; children: React.ReactNode; style?: React.CSSProperties}> = ({delay, children, style}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f - delay, fps, config: {damping: 11, stiffness: 160}});
  return <div style={{transform: `scale(${s})`, opacity: Math.min(1, s * 1.5), ...style}}>{children}</div>;
};

/* ---------------- 程式碼視窗 ---------------- */
const KW = new Set(['int', 'void', 'return', 'while', 'for', 'if', 'include', 'import', 'from', 'def', 'in', 'as', 'struct']);

const tokenize = (line: string): [string, string][] => {
  const ci = line.indexOf('//');
  if (ci >= 0) return [...tokenize(line.slice(0, ci)), [line.slice(ci), C.grey]];
  const out: [string, string][] = [];
  const re = /"[^"]*"|<[^>]*>|[A-Za-z_]\w*|\d+|\s+|./g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const s = m[0];
    const next = line[re.lastIndex] ?? '';
    let col = '#96B4D2';
    if (s.startsWith('"') || (s.startsWith('<') && s.endsWith('>'))) col = C.orange;
    else if (KW.has(s)) col = C.pink;
    else if (/^\d+$/.test(s)) col = C.gold;
    else if (/^[A-Za-z_]/.test(s)) col = next === '(' ? C.cyan : C.white;
    out.push([s, col]);
  }
  return out;
};

export const CodeWindow: React.FC<{title: string; lines: string[]; accent: string; start: number; cpf: number; style?: React.CSSProperties; fontSize?: number}> = (
  {title, lines, accent, start, cpf, style, fontSize = 23}) => {
  const f = useCurrentFrame();
  let budget = Math.max(0, Math.floor((f - start) * cpf));
  const blink = Math.floor(f / 8) % 2 === 0;
  return (
    <div style={{position: 'absolute', background: 'linear-gradient(160deg, #0c1c3acc, #06101ecc)', border: `2px solid ${accent}99`,
      borderRadius: 14, boxShadow: `0 0 40px ${accent}33, inset 0 0 30px ${accent}11`, overflow: 'hidden', backdropFilter: 'blur(4px)', ...style}}>
      <div style={{height: 38, background: '#0e2446', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px'}}>
        {[C.pink, C.gold, C.green].map((c) => <div key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />)}
        <div style={{fontFamily: MONO, color: C.grey, fontSize: 17, marginLeft: 14}}>{title}</div>
      </div>
      <div style={{padding: '18px 24px', fontFamily: MONO, fontSize, lineHeight: 1.55, whiteSpace: 'pre'}}>
        {lines.map((ln, i) => {
          if (budget <= 0 && i > 0) return <div key={i}>&nbsp;</div>;
          const shown = ln.slice(0, budget);
          const cursorHere = budget > 0 && budget <= ln.length + 3;
          budget -= ln.length + 3;
          return (
            <div key={i}>
              <span style={{color: '#ffffff33', marginRight: 22}}>{String(i + 1).padStart(2, ' ')}</span>
              {tokenize(shown).map(([s, c], k) => <span key={k} style={{color: c}}>{s}</span>)}
              {cursorHere && blink && <span style={{background: C.cyan, color: C.cyan}}>_</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const Medal: React.FC<{size: number; color: string; label?: string}> = ({size, color, label}) => (
  <svg width={size * 2} height={size * 3.2} viewBox="-100 -220 200 320" style={{overflow: 'visible'}}>
    <polygon points="-60,-210 -5,-210 25,-70 -30,-70" fill={C.blue} />
    <polygon points="60,-210 5,-210 -25,-70 30,-70" fill={C.pink} />
    <defs>
      <radialGradient id={`mg${color}`} cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
        <stop offset="35%" stopColor={color} />
        <stop offset="100%" stopColor={color} stopOpacity={0.55} />
      </radialGradient>
    </defs>
    <circle r="100" fill={`url(#mg${color})`} stroke="#fff" strokeWidth="8" style={{filter: `drop-shadow(0 0 18px ${color})`}} />
    <circle r="72" fill="none" stroke="#00000033" strokeWidth="8" />
    {label && <text y="30" textAnchor="middle" fontFamily={TC} fontWeight={900} fontSize="84" fill="#3a2a08">{label}</text>}
  </svg>
);
