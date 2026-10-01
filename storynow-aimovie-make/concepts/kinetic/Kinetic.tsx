/* 概念 C：動態字體快剪 Kinetic Type —— 文字本身就是畫面，每半拍一刀（10 秒試看） */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const TC = loadTC('normal', {weights: ['900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const EN = loadInter('normal', {weights: ['900']}).fontFamily;
const MONO = loadMono('normal', {weights: ['700']}).fontFamily;
const BK = '#000', WH = '#fff', AC = '#D4FF00', GOLD = '#FFC23D';
const BEAT = (60 / 145) * 30; // 12.41 frames
const B = (n: number) => Math.round(n * BEAT);
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 重拍砸入：放大＋模糊 → 定格，帶微震 */
const slam = (f: number, at: number) => {
  const d = f - at;
  const s = interpolate(d, [0, 4], [2.6, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const blur = interpolate(d, [0, 4], [18, 0], clamp);
  const shake = d >= 0 && d < 5 ? (random(`k${at}${d}`) - 0.5) * 24 : 0;
  return {transform: `translate(${shake}px, ${shake * 0.6}px) scale(${s})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined};
};

const Full: React.FC<{bg: string; children: React.ReactNode; style?: React.CSSProperties}> = ({bg, children, style}) => (
  <AbsoluteFill style={{background: bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', ...style}}>{children}</AbsoluteFill>
);

const CODE = ['int main(void) {', 'print("hello")', 'for i in range(10):', 'if (sensor > 30)', 'model.detect(frame)', 'digitalWrite(13, HIGH);',
  'while (dream) learn();', 'return future;', 'esp32.send(data)', 'arm.move(x, y)', 'import numpy as np', '#include <stdio.h>'];

export const Kinetic: React.FC = () => {
  const f = useCurrentFrame();

  // 0–3.5 拍：你 / 的 / 未來 / 自 / 己
  if (f < B(4)) {
    const seq: [number, string, string, string, number][] = [[0, '你', BK, WH, 520], [1, '的', WH, BK, 520], [2, '未來', BK, AC, 470],
      [3, '自', AC, BK, 560], [3.5, '己', BK, WH, 560]];
    const cur = [...seq].reverse().find(([b]) => f >= B(b))!;
    return <Full bg={cur[2]}><div style={{fontFamily: TC, fontWeight: 900, fontSize: cur[4], color: cur[3], lineHeight: 1, ...slam(f, B(cur[0]))}}>{cur[1]}</div></Full>;
  }

  // 4–7 拍：「寫」→ 碎成程式碼
  if (f < B(7)) {
    const burst = f - B(5);
    return (
      <Full bg={BK}>
        {burst < 2 && <div style={{fontFamily: TC, fontWeight: 900, fontSize: 900, color: WH, lineHeight: 1, ...slam(f, B(4))}}>寫</div>}
        {burst >= 0 && Array.from({length: 46}, (_, i) => {
          const a = random(`a${i}`) * Math.PI * 2, sp = 18 + random(`v${i}`) * 40;
          return <div key={i} style={{position: 'absolute', left: 960 + Math.cos(a) * sp * burst - 200, top: 540 + Math.sin(a) * sp * burst * 0.7,
            fontFamily: MONO, fontWeight: 700, fontSize: 26 + (i % 4) * 12, color: i % 5 === 0 ? AC : WH, whiteSpace: 'nowrap',
            transform: `rotate(${(random(`r${i}`) - 0.5) * burst * 6}deg)`, opacity: Math.max(0, 1 - burst / 34)}}>{CODE[i % CODE.length]}</div>;
        })}
        {burst >= 4 && <div style={{position: 'absolute', fontFamily: EN, fontWeight: 900, fontSize: 140, color: AC, ...slam(f, B(5) + 4)}}>C × PYTHON</div>}
      </Full>
    );
  }

  // 7–10 拍：「AI」→ 變成掃描的眼睛
  if (f < B(10)) {
    const d = f - B(7.5);
    const scanY = ((f - B(7.5)) * 26) % 1080;
    return (
      <Full bg={BK}>
        <div style={{position: 'relative', fontFamily: EN, fontWeight: 900, fontSize: 820, color: WH, lineHeight: 0.8, letterSpacing: -30, ...slam(f, B(7))}}>
          AI
          {d >= 0 && (
            <div style={{position: 'absolute', left: '8%', top: '38%', width: 230, height: 130, borderRadius: '50%', background: WH,
              border: `14px solid ${BK}`, transform: `scaleY(${Math.min(1, d / 5)})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
              <div style={{width: 80, height: 80, borderRadius: 40, background: AC, border: `16px solid ${BK}`,
                transform: `translateX(${Math.sin(d / 3) * 45}px)`}} />
            </div>
          )}
        </div>
        {d >= 0 && <div style={{position: 'absolute', left: 0, right: 0, top: scanY, height: 8, background: AC, boxShadow: `0 0 40px ${AC}`}} />}
        {d >= 8 && <div style={{position: 'absolute', bottom: 120, fontFamily: TC, fontWeight: 900, fontSize: 90, color: AC, ...slam(f, B(7.5) + 8)}}>看得懂世界</div>}
      </Full>
    );
  }

  // 10–13 拍：分割畫面 ESP32 ｜ 手臂
  if (f < B(13)) {
    const d = f - B(10);
    return (
      <AbsoluteFill style={{flexDirection: 'row'}}>
        <div style={{flex: 1, background: WH, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          transform: `translateY(${interpolate(d, [0, 5], [-1080, 0], clamp)}px)`}}>
          <div style={{fontFamily: EN, fontWeight: 900, fontSize: 230, color: BK, letterSpacing: -6}}>
            {'ESP32'.split('').map((ch, i) => <span key={i} style={{color: Math.floor((d + i * 3) / 4) % 3 === 0 ? AC : BK,
              textShadow: Math.floor((d + i * 3) / 4) % 3 === 0 ? `0 0 30px ${AC}` : undefined}}>{ch}</span>)}
          </div>
        </div>
        <div style={{flex: 1, background: BK, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          transform: `translateY(${interpolate(d, [0, 5], [1080, 0], clamp)}px)`}}>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: 300, color: WH, display: 'flex'}}>
            <span style={{display: 'inline-block', transformOrigin: '50% 90%', transform: `rotate(${Math.sin(d / 4) * 18}deg)`}}>手</span>
            <span style={{display: 'inline-block', transformOrigin: '10% 50%', transform: `rotate(${Math.sin(d / 4 + 1) * -28}deg)`, color: AC}}>臂</span>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  // 13–16 拍：滿版「10」（數字裡是點陣地圖）→ 穿越「0」
  if (f < B(16)) {
    const d = f - B(13);
    const zoom = interpolate(f, [B(15.2), B(16)], [1, 26], {...clamp, easing: Easing.in(Easing.cubic)});
    return (
      <Full bg={BK}>
        <div style={{fontFamily: EN, fontWeight: 900, fontSize: 980, lineHeight: 0.85, letterSpacing: -40,
          backgroundImage: `radial-gradient(${AC} 3.5px, transparent 4px), linear-gradient(135deg, #1b2a00, #3b5a00)`,
          backgroundSize: `22px 22px, 100% 100%`, backgroundPosition: `${d * 3}px 0, 0 0`,
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextStroke: `6px ${AC}`,
          transform: `scale(${zoom})`, transformOrigin: '70% 50%', ...(d < 5 ? slam(f, B(13)) : {})}}>10</div>
        {f >= B(14) && zoom < 2 && <div style={{position: 'absolute', bottom: 70, fontFamily: TC, fontWeight: 900, fontSize: 96, color: WH,
          background: BK, padding: '0 30px', ...slam(f, B(14))}}>位 國 際 國 手</div>}
      </Full>
    );
  }

  // 16–19 拍：「12」金牌
  if (f < B(19)) {
    const d = f - B(16);
    return (
      <Full bg={WH}>
        <div style={{display: 'flex', alignItems: 'flex-end', gap: 30, ...slam(f, B(16))}}>
          <div style={{fontFamily: EN, fontWeight: 900, fontSize: 620, lineHeight: 0.8, letterSpacing: -20,
            backgroundImage: `linear-gradient(180deg, #FFF3C2 0%, ${GOLD} 45%, #A86B00 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent'}}>12</div>
          <div style={{fontFamily: TC, fontWeight: 900, fontSize: 120, color: BK, lineHeight: 1.1, opacity: d > 6 ? 1 : 0}}>面<br />金牌</div>
        </div>
        {Array.from({length: 12}, (_, i) => {
          const at = 4 + i * 2;
          if (d < at) return null;
          return <div key={i} style={{position: 'absolute', left: 120 + i * 145, top: 60, width: 90, height: 90, borderRadius: 45, background: GOLD,
            border: `8px solid ${BK}`, transform: `translateY(${interpolate(d - at, [0, 4], [-200, 0], clamp)}px)`}} />;
        })}
      </Full>
    );
  }

  // 19 拍之後：最終一句組裝 → 定格
  const words = [['你的', 19], ['未來，', 19.5], ['自己', 20], ['寫', 21]] as [string, number][];
  const flash = f >= B(23) && f < B(23) + 4;
  return (
    <Full bg={flash ? AC : BK}>
      <div style={{display: 'flex', alignItems: 'baseline'}}>
        {words.map(([w, b]) => f >= B(b) ? (
          <span key={w} style={{fontFamily: TC, fontWeight: 900, fontSize: w === '寫' ? 230 : 170, color: w === '寫' ? AC : WH, display: 'inline-block',
            ...slam(f, B(b))}}>{w}</span>
        ) : null)}
      </div>
      {f >= B(22) && <div style={{position: 'absolute', bottom: 150, fontFamily: EN, fontWeight: 900, fontSize: 44, letterSpacing: 18, color: WH, ...slam(f, B(22))}}>
        HAICHING · IT</div>}
    </Full>
  );
};
