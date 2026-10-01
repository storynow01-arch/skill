import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {Theme, glowOf} from './theme';

const BG_CODE = [
  'for (int i = 0; i < n; i++) sum += a[i];', 'def train(model, data): return model.fit(data)',
  'struct Node { int key; Node *left, *right; };', 'GPIO.output(LED_PIN, GPIO.HIGH)', 'tensor = torch.relu(W @ x + b)',
  'ip route 10.0.0.0 255.0.0.0 192.168.1.1', 'mqtt.publish("school/it/iot", payload)', 'yield from edge_ai.infer(frame)',
  'ping -c 4 192.168.0.1', 'tcpdump -i eth0 port 80', 'SYN → SYN/ACK → ACK', 'TTL=64  ID=0x1c46  PROTO=TCP',
];

const Particles: React.FC<{color: string; n?: number; alpha?: number; square?: boolean}> = ({color, n = 60, alpha = 1, square}) => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({length: n}, (_, i) => {
        const sp = 0.3 + random(`s${i}`) * 1.3;
        const y = (random(`y${i}`) * 1080 - f * sp + 2160) % 1080;
        const x = random(`x${i}`) * 1920 + Math.sin(f / 30 + i) * 10;
        const s = square ? 4 + Math.floor(random(`z${i}`) * 3) * 4 : 1 + random(`z${i}`) * 3;
        return <div key={i} style={{position: 'absolute', left: square ? Math.round(x / 4) * 4 : x, top: square ? Math.round(y / 4) * 4 : y,
          width: s, height: s, borderRadius: square ? 0 : s, background: color, opacity: (0.2 + random(`o${i}`) * 0.6) * alpha}} />;
      })}
    </>
  );
};

const CodeRain: React.FC<{t: Theme; alpha: number}> = ({t, alpha}) => {
  const f = useCurrentFrame();
  if (alpha <= 0) return null;
  return (
    <>
      {[30, 1200].map((x, k) => (
        <div key={x} style={{position: 'absolute', left: x, top: -((f * 1.4 + k * 300) % 420), width: 700, opacity: 0.14 * alpha,
          fontFamily: t.f.mono, fontSize: 20, lineHeight: '35px', color: t.c.accent, whiteSpace: 'pre'}}>
          {Array.from({length: 48}, (_, i) => BG_CODE[(i + k * 5) % BG_CODE.length]).join('\n')}
        </div>
      ))}
    </>
  );
};

export const Background: React.FC<{t: Theme; accent: string; code?: number; intensity?: number}> = ({t, accent, code = 0, intensity = 1}) => {
  const f = useCurrentFrame();
  const c = t.c;
  const k = intensity;
  switch (t.bg) {
    case 'grid3d':
      return (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 42%, ${c.bg2} 0%, ${c.bg} 62%, #01030a 100%)`}}>
          <div style={{position: 'absolute', left: -1000, right: -1000, top: 620, height: 1200, opacity: 0.55 * k,
            transform: 'perspective(600px) rotateX(72deg)', transformOrigin: '50% 0%',
            backgroundImage: `linear-gradient(${accent}88 2px, transparent 2px), linear-gradient(90deg, ${accent}66 2px, transparent 2px)`,
            backgroundSize: '120px 120px', backgroundPosition: `0 ${(f * 4) % 120}px`,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)'}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 618, height: 3, opacity: k,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: glowOf(t, accent, 0.6)}} />
          <CodeRain t={t} alpha={code} />
          <Particles color={accent} alpha={k} />
        </AbsoluteFill>
      );
    case 'blueprint':
      return (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, ${c.bg2}, ${c.bg} 75%)`}}>
          <AbsoluteFill style={{opacity: 0.9 * k, backgroundImage:
            `linear-gradient(#ffffff30 1.5px, transparent 1.5px), linear-gradient(90deg, #ffffff30 1.5px, transparent 1.5px),
             linear-gradient(#ffffff12 1px, transparent 1px), linear-gradient(90deg, #ffffff12 1px, transparent 1px)`,
            backgroundSize: '160px 160px, 160px 160px, 32px 32px, 32px 32px', backgroundPosition: `${-f * 0.4}px 0`}} />
          <svg width={1920} height={1080} style={{position: 'absolute', opacity: 0.35 * k}}>
            <circle cx={1650} cy={880} r={140 + Math.sin(f / 40) * 6} fill="none" stroke="#fff" strokeWidth={1.5} strokeDasharray="6 8" />
            <line x1={1510} y1={880} x2={1790} y2={880} stroke="#fff" strokeWidth={1} />
            <line x1={1650} y1={740} x2={1650} y2={1020} stroke="#fff" strokeWidth={1} />
            <text x={1800} y={870} fill="#fff" fontFamily={t.f.mono} fontSize={16}>R140</text>
            <rect x={80} y={900} width={260} height={110} fill="none" stroke="#fff" strokeWidth={1.5} />
            <text x={96} y={930} fill="#fff" fontFamily={t.f.mono} fontSize={15}>DWG NO. {String(Math.floor(f / 30)).padStart(3, '0')}</text>
            <text x={96} y={960} fill="#fff" fontFamily={t.f.mono} fontSize={15}>SCALE 1:1</text>
            <text x={96} y={990} fill="#fff" fontFamily={t.f.mono} fontSize={15}>REV A</text>
          </svg>
          <CodeRain t={t} alpha={code * 0.6} />
        </AbsoluteFill>
      );
    case 'softlight':
      return (
        <AbsoluteFill style={{background: `linear-gradient(160deg, ${c.bg2} 0%, ${c.bg} 60%)`}}>
          {[[c.accent, 1500, 180, 420], [c.accent2, 250, 900, 380], [c.accent3, 1700, 950, 260]].map(([col, x, y, r], i) => (
            <div key={i} style={{position: 'absolute', left: (x as number) + Math.sin(f / 50 + i) * 30 - (r as number),
              top: (y as number) + Math.cos(f / 60 + i) * 20 - (r as number), width: (r as number) * 2, height: (r as number) * 2,
              borderRadius: '50%', background: col as string, opacity: 0.1 * k, filter: 'blur(60px)'}} />
          ))}
          <AbsoluteFill style={{opacity: 0.5 * k, backgroundImage: `radial-gradient(${c.muted}55 1.5px, transparent 1.5px)`, backgroundSize: '36px 36px'}} />
        </AbsoluteFill>
      );
    case 'synthsun':
      return (
        <AbsoluteFill style={{background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg2} 55%, #5B0E5E 62%, ${c.bg} 62.2%)`}}>
          <div style={{position: 'absolute', left: 960 - 260, top: 380, width: 520, height: 520, borderRadius: '50%', opacity: 0.9 * k,
            background: `linear-gradient(180deg, ${c.accent2} 0%, ${c.accent} 70%)`,
            maskImage: 'repeating-linear-gradient(180deg, black 0px, black 26px, transparent 26px, transparent 34px)',
            boxShadow: `0 0 120px ${c.accent}88`}} />
          <div style={{position: 'absolute', left: -1000, right: -1000, top: 668, height: 1100, opacity: 0.8 * k,
            transform: 'perspective(500px) rotateX(70deg)', transformOrigin: '50% 0%',
            backgroundImage: `linear-gradient(${c.accent} 3px, transparent 3px), linear-gradient(90deg, ${c.accent3} 3px, transparent 3px)`,
            backgroundSize: '110px 110px', backgroundPosition: `0 ${(f * 5) % 110}px`}} />
          <div style={{position: 'absolute', left: 0, right: 0, top: 664, height: 4, background: c.accent3, boxShadow: `0 0 30px ${c.accent3}`}} />
          <Particles color="#fff" n={40} alpha={0.6 * k} />
        </AbsoluteFill>
      );
    case 'matrix': {
      const cols = 64;
      return (
        <AbsoluteFill style={{background: c.bg}}>
          {Array.from({length: cols}, (_, i) => {
            const sp = 4 + random(`m${i}`) * 9;
            const y0 = ((f * sp + random(`o${i}`) * 2000) % 1600) - 400;
            const chars = Array.from({length: 22}, (_, j) => '01アイウエオカキクケコ<>/{}#$'.charAt(Math.floor(random(`${i}-${j}-${Math.floor(f / 6)}`) * 22)));
            return (
              <div key={i} style={{position: 'absolute', left: i * 30, top: y0, fontFamily: t.f.mono, fontSize: 22, lineHeight: '26px',
                color: c.accent, opacity: (0.08 + random(`a${i}`) * 0.22) * k, whiteSpace: 'pre', textAlign: 'center', width: 26}}>
                {chars.join('\n')}
              </div>
            );
          })}
          <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 30%, ${c.bg} 85%)`}} />
        </AbsoluteFill>
      );
    }
    case 'blobs':
      return (
        <AbsoluteFill style={{background: c.bg, overflow: 'hidden'}}>
          {[[c.accent, 500, 350, 520], [c.accent2, 1450, 300, 460], [c.accent3, 1100, 850, 520], ['#5B3CFF', 300, 900, 420]].map(([col, x, y, r], i) => (
            <div key={i} style={{position: 'absolute', width: (r as number) * 2, height: (r as number) * 2, borderRadius: '50%',
              left: (x as number) - (r as number) + Math.sin(f / 45 + i * 2) * 120, top: (y as number) - (r as number) + Math.cos(f / 55 + i) * 90,
              background: col as string, opacity: 0.45 * k, filter: 'blur(110px)'}} />
          ))}
          <AbsoluteFill style={{opacity: 0.06, backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '4px 4px'}} />
        </AbsoluteFill>
      );
    case 'swissgrid':
      return (
        <AbsoluteFill style={{background: c.bg}}>
          {Array.from({length: 13}, (_, i) => <div key={i} style={{position: 'absolute', left: 80 + i * 146.6, top: 0, bottom: 0, width: 1, background: '#00000014'}} />)}
          {Array.from({length: 7}, (_, i) => <div key={i} style={{position: 'absolute', top: 60 + i * 160, left: 0, right: 0, height: 1, background: '#00000010'}} />)}
          <div style={{position: 'absolute', right: 0, top: 0, width: 18, height: 1080 * Math.min(1, f / 40), background: c.accent, opacity: k}} />
          <div style={{position: 'absolute', left: 1500, top: 700 + Math.sin(f / 50) * 20, width: 260, height: 260, borderRadius: '50%', border: `2px solid ${c.fg}22`}} />
        </AbsoluteFill>
      );
    case 'chalk':
      return (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, ${c.bg2}, ${c.bg} 80%)`}}>
          <AbsoluteFill style={{opacity: 0.18, backgroundImage:
            'repeating-radial-gradient(circle at 20% 30%, #ffffff10 0 2px, transparent 2px 9px), repeating-linear-gradient(35deg, #ffffff08 0 1px, transparent 1px 7px)'}} />
          {Array.from({length: 7}, (_, i) => (
            <div key={i} style={{position: 'absolute', left: random(`cx${i}`) * 1700, top: random(`cy${i}`) * 950, width: 180 + random(`cw${i}`) * 240,
              height: 40 + random(`ch${i}`) * 60, background: '#ffffff', opacity: 0.035, filter: 'blur(14px)', transform: `rotate(${random(`cr${i}`) * 40 - 20}deg)`}} />
          ))}
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: '#6B4A2B', borderTop: '6px solid #845C36'}} />
          <div style={{position: 'absolute', left: 1500, bottom: 40, width: 90, height: 14, background: '#F4F1E6', borderRadius: 4}} />
          <div style={{position: 'absolute', left: 1610, bottom: 40, width: 60, height: 14, background: '#FFE680', borderRadius: 4}} />
        </AbsoluteFill>
      );
    case 'pixelstars':
      return (
        <AbsoluteFill style={{background: `linear-gradient(180deg, ${c.bg} 0%, ${c.bg2} 100%)`, imageRendering: 'pixelated'}}>
          {Array.from({length: 90}, (_, i) => {
            const x = Math.round(((random(`px${i}`) * 1920 - f * (1 + (i % 3))) % 1920 + 1920) % 1920 / 8) * 8;
            const y = Math.round(random(`py${i}`) * 820 / 8) * 8;
            const tw = Math.floor(f / 8 + i) % 5 === 0;
            return <div key={i} style={{position: 'absolute', left: x, top: y, width: i % 7 ? 4 : 8, height: i % 7 ? 4 : 8, background: tw ? c.accent2 : '#fff', opacity: 0.8 * k}} />;
          })}
          {Array.from({length: 30}, (_, i) => {
            const h = 60 + Math.round(random(`mh${i}`) * 6) * 24;
            return <div key={i} style={{position: 'absolute', left: i * 64 - ((f * 1.5) % 64), bottom: 0, width: 64, height: h, background: '#29366F', borderTop: `8px solid ${c.accent3}55`}} />;
          })}
        </AbsoluteFill>
      );
    case 'rays':
      return (
        <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 30%, ${c.bg2} 0%, ${c.bg} 70%)`}}>
          <div style={{position: 'absolute', left: 960, top: -200, width: 0, height: 0}}>
            {Array.from({length: 9}, (_, i) => (
              <div key={i} style={{position: 'absolute', left: -60, top: 0, width: 120, height: 1600, transformOrigin: '50% 0%',
                transform: `rotate(${(i - 4) * 11 + Math.sin(f / 70 + i) * 3}deg)`,
                background: `linear-gradient(180deg, ${c.accent}40, transparent 80%)`, filter: 'blur(18px)', opacity: 0.55 * k}} />
            ))}
          </div>
          <Particles color={c.accent2} n={50} alpha={0.7 * k} />
        </AbsoluteFill>
      );
    default:
      return <AbsoluteFill style={{background: c.bg}} />;
  }
};

/** 全片共用疊加層：掃描線、暗角、遮幅 */
export const Finish: React.FC<{t: Theme}> = ({t}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    {t.scanlines && <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)'}} />}
    {t.dark && <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.55) 100%)'}} />}
    {t.letterbox && <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 90, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 90, background: '#000'}} />
    </>}
  </AbsoluteFill>
);
