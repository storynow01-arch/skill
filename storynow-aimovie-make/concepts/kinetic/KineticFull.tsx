/* 概念 C 完整 60 秒：動態字體快剪 —— 文字就是畫面，切點全在拍點上 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {T, beatF, sceneAt} from './shared';

const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const EN = loadInter('normal', {weights: ['900']}).fontFamily;
const MONO = loadMono('normal', {weights: ['700']}).fontFamily;
const BK = '#000', WH = '#fff', AC = '#D4FF00', GOLD = '#FFC23D', SIL = '#D7DEE8', BRZ = '#D9894E';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const BF = beatF('C');

const slam = (lf: number, atBeat: number) => {
  const d = lf - Math.round(atBeat * BF);
  const s = interpolate(d, [0, 4], [2.6, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const blur = interpolate(d, [0, 4], [16, 0], clamp);
  const sh = d >= 0 && d < 5 ? (random(`k${atBeat}${d}`) - 0.5) * 22 : 0;
  return {transform: `translate(${sh}px, ${sh * 0.6}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity: d < 0 ? 0 : 1};
};
const on = (lf: number, b: number) => lf >= Math.round(b * BF);
const Full: React.FC<{bg: string; children: React.ReactNode}> = ({bg, children}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>{children}</AbsoluteFill>
);
const Big: React.FC<{c: string; size: number; font?: string; style?: React.CSSProperties; children: React.ReactNode}> = ({c, size, font = TC, style, children}) => (
  <div style={{fontFamily: font, fontWeight: 900, fontSize: size, color: c, lineHeight: 1, whiteSpace: 'nowrap', ...style}}>{children}</div>
);
const CODE = ['int main(void) {', 'print("hello")', 'for i in range(10):', 'if (sensor > 30)', 'model.detect(frame)', 'digitalWrite(13, HIGH);',
  'while (dream) learn();', 'return future;', 'esp32.send(data)', 'arm.move(x, y)', 'import numpy as np', '#include <stdio.h>'];

const Caption: React.FC<{f: number}> = ({f}) => {
  const {sc} = sceneAt('C', f);
  const d = f - sc.voiceAt;
  if (d < 0 || d > sc.voiceDur + 10) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: TC, fontWeight: 700, fontSize: 36, color: WH, background: 'rgba(0,0,0,0.78)', padding: '8px 28px', borderLeft: `6px solid ${AC}`}}>{sc.text}</div>
    </div>
  );
};

export const KineticFull: React.FC = () => {
  const f = useCurrentFrame();
  const {sc, lf} = sceneAt('C', f);
  let body: React.ReactNode = null;

  switch (sc.id) {
    case 'S1': {
      const chunks: [number, string, string, string][] = [[0, 'print(', BK, WH], [1.5, '"Hello,', WH, BK], [3, '未來的', BK, AC], [4.5, '學弟妹")', AC, BK]];
      if (!on(lf, 6.5)) {
        const cur = [...chunks].reverse().find(([b]) => on(lf, b)) ?? chunks[0];
        body = <Full bg={cur[2]}><Big c={cur[3]} size={300} font={cur[1].match(/[一-鿿]/) ? TC : MONO} style={slam(lf, cur[0])}>{cur[1]}</Big></Full>;
      } else if (!on(lf, 9)) {
        body = <Full bg={BK}><Big c={WH} size={86} font={MONO} style={slam(lf, 6.5)}>print("Hello, <span style={{fontFamily: TC, color: AC}}>未來的學弟妹</span>")</Big>
          <Big c={AC} size={60} font={EN} style={{position: 'absolute', bottom: 200, opacity: Math.floor(lf / 6) % 2}}>⏎ ENTER</Big></Full>;
      } else {
        const d = lf - Math.round(9 * BF);
        body = (
          <Full bg={d < 3 ? WH : BK}>
            {Array.from('print("Hello,未來的學弟妹")').map((ch, i) => {
              const a = random(`e${i}`) * Math.PI * 2, sp = 20 + random(`es${i}`) * 40;
              return <Big key={i} c={i % 3 ? WH : AC} size={90} font={TC} style={{position: 'absolute', left: 960 + Math.cos(a) * sp * d - 45, top: 540 + Math.sin(a) * sp * d - 45,
                transform: `rotate(${d * (i % 2 ? 9 : -9)}deg)`, opacity: Math.max(0, 1 - d / 24)}}>{ch}</Big>;
            })}
          </Full>
        );
      }
      break;
    }
    case 'S2': {
      const seq: [number, string, string, string, number][] = [[0, '你的', BK, WH, 460], [2, '未來，', WH, BK, 420], [4, '自己', AC, BK, 460], [6, '寫', BK, AC, 760]];
      if (!on(lf, 8)) {
        const cur = [...seq].reverse().find(([b]) => on(lf, b)) ?? seq[0];
        body = <Full bg={cur[2]}><Big c={cur[3]} size={cur[4]} style={slam(lf, cur[0])}>{cur[1]}</Big></Full>;
      } else {
        body = (
          <Full bg={BK}>
            <div style={{display: 'flex', alignItems: 'baseline'}}>
              {[['你的未來，', WH, 8], ['自己', WH, 8.5], ['寫', AC, 9]].map(([w, c, b]) => <Big key={w as string} c={c as string} size={w === '寫' ? 230 : 170} style={slam(lf, b as number)}>{w}</Big>)}
            </div>
            <Big c={WH} size={60} style={{marginTop: 30, letterSpacing: 24, ...slam(lf, 11)}}>海青工商 資訊科</Big>
          </Full>
        );
      }
      break;
    }
    case 'S3': {
      const burst = lf - Math.round(2 * BF);
      body = (
        <Full bg={BK}>
          {burst < 2 && <Big c={WH} size={900} style={slam(lf, 0)}>寫</Big>}
          {burst >= 0 && Array.from({length: 46}, (_, i) => {
            const a = random(`a${i}`) * Math.PI * 2, sp = 18 + random(`v${i}`) * 40;
            return <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * sp * burst - 200, top: 540 + Math.sin(a) * sp * burst * 0.7,
              fontFamily: MONO, fontWeight: 700, fontSize: 26 + (i % 4) * 12, color: i % 5 === 0 ? AC : WH, whiteSpace: 'nowrap',
              transform: `rotate(${(random(`r${i}`) - 0.5) * burst * 6}deg)`, opacity: Math.max(0, 1 - burst / 40)}}>{CODE[i % CODE.length]}</div>;
          })}
          {on(lf, 5) && <div style={{position: 'absolute', display: 'flex', gap: 40, alignItems: 'center'}}>
            <Big c={WH} size={260} font={EN} style={slam(lf, 5)}>C</Big><Big c={AC} size={150} font={EN} style={slam(lf, 6)}>×</Big>
            <Big c={WH} size={220} font={EN} style={slam(lf, 7)}>PYTHON</Big></div>}
          {on(lf, 9) && <Big c={BK} size={140} font={EN} style={{position: 'absolute', bottom: 120, background: AC, padding: '0 30px', ...slam(lf, 9)}}>→ AI</Big>}
        </Full>
      );
      break;
    }
    case 'S4': {
      const d = lf - Math.round(1 * BF);
      body = (
        <Full bg={BK}>
          <div style={{position: 'relative', fontFamily: EN, fontWeight: 900, fontSize: 820, color: WH, lineHeight: 0.8, letterSpacing: -30, ...slam(lf, 0)}}>
            AI
            {d >= 0 && <div style={{position: 'absolute', left: '8%', top: '38%', width: 230, height: 130, borderRadius: '50%', background: WH, border: `14px solid ${BK}`,
              transform: `scaleY(${Math.min(1, d / 5)})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{width: 80, height: 80, borderRadius: 40, background: AC, border: `16px solid ${BK}`, transform: `translateX(${Math.sin(d / 3) * 45}px)`}} /></div>}
          </div>
          {d >= 0 && <div style={{position: 'absolute', left: 0, right: 0, top: (d * 26) % 1080, height: 8, background: AC, boxShadow: `0 0 40px ${AC}`}} />}
          {on(lf, 8) && <Big c={BK} size={120} style={{position: 'absolute', bottom: 130, background: AC, padding: '0 34px', ...slam(lf, 8)}}>看得懂世界</Big>}
        </Full>
      );
      break;
    }
    case 'S5': {
      const d = lf;
      body = (
        <AbsoluteFill style={{flexDirection: 'row'}}>
          <div style={{flex: 1, background: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${interpolate(d, [0, 5], [-1080, 0], clamp)}px)`}}>
            <Big c={BK} size={230} font={EN} style={{letterSpacing: -6}}>{'ESP32'.split('').map((ch, i) => {
              const lit = Math.floor((d + i * 3) / 4) % 3 === 0;
              return <span key={i} style={{color: lit ? AC : BK, textShadow: lit ? `0 0 30px ${AC}, 0 0 4px #000` : undefined}}>{ch}</span>;
            })}</Big>
          </div>
          <div style={{flex: 1, background: BK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
            transform: `translateY(${interpolate(d, [0, 5], [1080, 0], clamp)}px)`}}>
            {on(lf, 6) && <Big c={WH} size={210} style={{...slam(lf, 6), transform: `${slam(lf, 6).transform} rotate(${Math.sin(lf / 3) * 6}deg)`}}>會動</Big>}
            {on(lf, 8) && <Big c={AC} size={210} style={{...slam(lf, 8), textShadow: Math.floor(lf / 4) % 2 ? `0 0 50px ${AC}` : 'none'}}>會亮</Big>}
          </div>
        </AbsoluteFill>
      );
      break;
    }
    case 'S6': {
      const g = interpolate(lf, [Math.round(3 * BF), Math.round(9 * BF)], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
      body = (
        <Full bg={BK}>
          <div style={{display: 'flex', alignItems: 'flex-end', ...slam(lf, 0)}}>
            <Big c={WH} size={380} style={{transformOrigin: '50% 95%', transform: `rotate(${-10 + Math.sin(g * Math.PI) * 14}deg)`}}>手</Big>
            <Big c={AC} size={380} style={{transformOrigin: '5% 50%', transform: `rotate(${-40 + g * 70}deg)`}}>臂</Big>
          </div>
          <Big c={BK} size={110} style={{position: 'absolute', left: interpolate(g, [0, 1], [1400, 1250]), top: interpolate(g, [0, 0.5, 1], [860, 420, 300]),
            background: WH, padding: '0 20px', opacity: on(lf, 2) ? 1 : 0}}>方塊</Big>
          {on(lf, 10) && <Big c={BK} size={130} style={{position: 'absolute', bottom: 100, background: AC, padding: '0 34px', ...slam(lf, 10)}}>指揮！</Big>}
        </Full>
      );
      break;
    }
    case 'S7': {
      const zoom = interpolate(lf, [Math.round(8.5 * BF), sc.dur], [1, 26], {...clamp, easing: Easing.in(Easing.cubic)});
      body = (
        <Full bg={BK}>
          <div style={{fontFamily: EN, fontWeight: 900, fontSize: 980, lineHeight: 0.85, letterSpacing: -40,
            backgroundImage: `radial-gradient(${AC} 3.5px, transparent 4px)`, backgroundSize: '22px 22px', backgroundPosition: `${lf * 3}px 0`,
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextStroke: `6px ${AC}`,
            transform: `scale(${zoom})`, transformOrigin: '70% 50%', ...(lf < 6 ? slam(lf, 0) : {})}}>10</div>
          {on(lf, 4) && zoom < 2 && <Big c={WH} size={96} style={{position: 'absolute', bottom: 110, background: BK, padding: '0 30px', letterSpacing: 10, ...slam(lf, 4)}}>位國際國手</Big>}
        </Full>
      );
      break;
    }
    case 'S8': {
      const d = lf;
      body = (
        <Full bg={WH}>
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 30, ...slam(lf, 0)}}>
            <div style={{fontFamily: EN, fontWeight: 900, fontSize: 620, lineHeight: 0.8, letterSpacing: -20,
              backgroundImage: `linear-gradient(180deg, #FFF3C2 0%, ${GOLD} 45%, #A86B00 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>12</div>
            <Big c={BK} size={120} style={{lineHeight: 1.1, ...slam(lf, 6)}}>面<br />金牌</Big>
          </div>
          {Array.from({length: 12}, (_, i) => {
            const at = Math.round((1 + i * 0.5) * BF);
            if (d < at) return null;
            return <div key={i} style={{position: 'absolute', left: 120 + i * 145, top: 60, width: 90, height: 90, borderRadius: 45, background: GOLD, border: `8px solid ${BK}`,
              transform: `translateY(${interpolate(d - at, [0, 4], [-200, 0], clamp)}px)`}} />;
          })}
        </Full>
      );
      break;
    }
    case 'S9': {
      body = (
        <Full bg={BK}>
          <div style={{position: 'absolute', left: 220, top: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
            {[['金', GOLD, 0], ['銀', SIL, 2], ['銅', BRZ, 4]].map(([w, c, b]) => (
              <Big key={w as string} c={BK} size={230} style={{background: c as string, padding: '0 60px', ...slam(lf, b as number)}}>{w}</Big>
            ))}
          </div>
          {on(lf, 6) && <div style={{position: 'absolute', right: 140, top: 360, transform: 'rotate(-8deg)'}}><Big c={AC} size={280} style={slam(lf, 6)}>全包！</Big></div>}
          {on(lf, 9) && <Big c={WH} size={56} style={{position: 'absolute', left: 120, bottom: 140, letterSpacing: 8, ...slam(lf, 9)}}>第 56 屆分區賽 · 雙職類</Big>}
        </Full>
      );
      break;
    }
    case 'S10': {
      const unis: [string, number][] = [['臺科大', 1], ['雲科大', 4], ['高科大', 7]];
      body = (
        <Full bg={BK}>
          {Array.from({length: 14}, (_, k) => {
            const ph = ((lf * 0.04 + k / 14) % 1);
            const s = 0.05 + ph * ph * 3;
            return <div key={k} style={{position: 'absolute', width: 1920 * s, height: 1080 * s, border: `${3 + ph * 10}px solid ${k % 3 ? WH : AC}`, opacity: ph}} />;
          })}
          {unis.map(([u, b]) => {
            const d = lf - Math.round(b * BF);
            if (d < 0 || d > Math.round(3 * BF)) return null;
            const s = interpolate(d, [0, Math.round(3 * BF)], [0.15, 6], {...clamp, easing: Easing.in(Easing.quad)});
            return <Big key={u} c={WH} size={220} style={{position: 'absolute', transform: `scale(${s})`, opacity: s > 4 ? 0 : 1, filter: s > 2 ? `blur(${(s - 2) * 3}px)` : undefined}}>{u}</Big>;
          })}
          {on(lf, 11) && <div style={{position: 'absolute', display: 'flex', alignItems: 'flex-end', gap: 30, background: BK, padding: '20px 60px', ...slam(lf, 11)}}>
            <Big c={AC} size={400} font={EN}>26</Big><Big c={WH} size={100} style={{lineHeight: 1.2}}>人次<br />國立大專</Big></div>}
        </Full>
      );
      break;
    }
    default: {
      const words: [string, number][] = [['你的', 0], ['未來，', 1], ['自己', 2], ['寫', 3]];
      const flash = lf >= Math.round(12 * BF) && lf < Math.round(12 * BF) + 4;
      body = (
        <Full bg={flash ? AC : BK}>
          <div style={{display: 'flex', alignItems: 'baseline'}}>
            {words.map(([w, b]) => on(lf, b) ? <Big key={w} c={w === '寫' ? AC : WH} size={w === '寫' ? 240 : 180} style={slam(lf, b)}>{w}</Big> : null)}
          </div>
          {on(lf, 6) && <Big c={WH} size={60} style={{position: 'absolute', bottom: 210, letterSpacing: 24, ...slam(lf, 6)}}>海青工商 資訊科</Big>}
          {on(lf, 8) && <Big c={AC} size={34} font={EN} style={{position: 'absolute', bottom: 150, letterSpacing: 14, ...slam(lf, 8)}}>HAICHING · IT · 2026</Big>}
        </Full>
      );
    }
  }

  const fade = Math.max(0, 1 - f / 4, (f - (T.C.totalFrames - 16)) / 16);
  return (
    <AbsoluteFill>
      {body}
      <Caption f={f} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
