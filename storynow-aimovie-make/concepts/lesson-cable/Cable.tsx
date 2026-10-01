/* 1-1 概念 3：穿越網路線（10 秒試看）—— 鏡頭鑽進網路線，在光隧道裡跟著資料走 */
import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {loadFont as loadTC} from '@remotion/google-fonts/NotoSansTC';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const TC = loadTC('normal', {weights: ['700', '900'], ignoreTooManyRequestsWarning: true}).fontFamily;
const MONO = loadMono('normal', {weights: ['700']}).fontFamily;
const CY = '#3EE6FF', OR = '#FFA53D', RED = '#FF4D5E', GREEN = '#4DFFA0', DEEP = '#020817';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CX = 960, CYY = 540;
const proj = (ang: number, rad: number, z: number) => [CX + Math.cos(ang) * rad / z, CYY + Math.sin(ang) * rad / z] as const;

const Tunnel: React.FC<{f: number; speed: number; tint: string}> = ({f, speed, tint}) => (
  <svg width={1920} height={1080} style={{position: 'absolute'}}>
    {Array.from({length: 22}, (_, i) => {
      const z = (((i - f * speed) % 22) + 22) % 22 + 0.35;
      const r = 760 / z;
      return <circle key={i} cx={CX} cy={CYY} r={r} fill="none" stroke={i % 4 === 0 ? tint : CY} strokeWidth={Math.max(1, 9 / z)} opacity={Math.min(0.9, 1.4 / z)} />;
    })}
    {Array.from({length: 46}, (_, i) => {
      const a = random(`sa${i}`) * Math.PI * 2, z = ((random(`sz${i}`) * 10 - f * speed * 1.6) % 10 + 10) % 10 + 0.4;
      const [x1, y1] = proj(a, 700, z), [x2, y2] = proj(a, 700, z + 0.5);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 ? CY : OR} strokeWidth={Math.max(1, 4 / z)} opacity={Math.min(1, 1.2 / z)} />;
    })}
  </svg>
);
const Capsule: React.FC<{x: number; y: number; s: number; label: string; c?: string; broken?: number}> = ({x, y, s, label, c = OR, broken = 0}) => (
  <div style={{position: 'absolute', left: x - 90 * s, top: y - 40 * s, width: 180 * s, height: 80 * s, borderRadius: 40 * s, background: `linear-gradient(90deg, ${c}, #fff4)`,
    boxShadow: `0 0 ${30 * s}px ${c}`, border: `${3 * s}px solid #fff`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 1 - broken,
    transform: broken ? `scale(${1 + broken}) rotate(${broken * 40}deg)` : undefined}}>
    <span style={{fontFamily: MONO, fontWeight: 700, fontSize: 30 * s, color: DEEP}}>{label}</span>
  </div>
);
const Holo: React.FC<{text: string; at: number; f: number; top: number; c?: string; size?: number}> = ({text, at, f, top, c = CY, size = 54}) => f < at ? null : (
  <div style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', opacity: Math.min(1, (f - at) / 8)}}>
    <span style={{fontFamily: TC, fontWeight: 900, fontSize: size, color: c, padding: '8px 30px', border: `2px solid ${c}`, background: '#02081799',
      textShadow: `0 0 18px ${c}`, boxShadow: `0 0 24px ${c}55`, clipPath: f - at < 6 ? `inset(0 ${100 - (f - at) * 17}% 0 0)` : undefined}}>{text}</span>
  </div>
);

export const Cable: React.FC = () => {
  const f = useCurrentFrame();

  /* 0–50：從教室筆電鑽進網路線 */
  if (f < 50) {
    const z = interpolate(f, [0, 50], [1, 40], {...clamp, easing: Easing.in(Easing.cubic)});
    return (
      <AbsoluteFill style={{background: '#0B1426', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${z})`, transformOrigin: '1180px 640px'}}>
          <div style={{position: 'absolute', left: 520, top: 360, width: 560, height: 340, background: '#1E2A44', border: '10px solid #8FA3C8', borderRadius: 16}} />
          <div style={{position: 'absolute', left: 470, top: 700, width: 660, height: 30, background: '#8FA3C8', borderRadius: 12}} />
          <div style={{position: 'absolute', left: 1080, top: 620, width: 100, height: 40, background: '#8FA3C8'}} />
          <div style={{position: 'absolute', left: 1160, top: 622, width: 40, height: 36, borderRadius: 18, background: CY, boxShadow: `0 0 40px ${CY}`}} />
          <div style={{position: 'absolute', left: 1200, top: 632, width: 600, height: 16, background: '#556', borderRadius: 8}} />
        </div>
        <div style={{position: 'absolute', left: 80, top: 60, fontFamily: MONO, fontSize: 26, color: CY, letterSpacing: 6}}>INSIDE THE CABLE · 1-1</div>
        {f > 38 && <AbsoluteFill style={{background: CY, opacity: (f - 38) / 12}} />}
      </AbsoluteFill>
    );
  }

  const lf = f - 50;
  const jam = f >= 140 && f < 210;
  const speed = jam ? 0.02 : 0.12;
  const tint = jam && Math.floor(f / 5) % 2 ? RED : OR;
  // 閘門（50–140）
  const gateZ = interpolate(lf, [0, 40], [6, 1.6], {...clamp, easing: Easing.out(Easing.cubic)});
  const match = f >= 96;
  const open = interpolate(f, [104, 122], [0, 1], clamp);
  // 大資料塊（140–210）→ 膠囊（210–300）
  const blockZ = interpolate(f, [140, 160], [4, 1.3], {...clamp, easing: Easing.out(Easing.cubic)});
  const crack = f >= 205;

  return (
    <AbsoluteFill style={{background: `radial-gradient(circle, #0A2A44, ${DEEP} 70%)`, overflow: 'hidden'}}>
      <Tunnel f={f} speed={speed} tint={tint} />
      {f < 50 + 20 && <AbsoluteFill style={{background: CY, opacity: Math.max(0, 1 - lf / 12)}} />}

      {/* 協定閘門 */}
      {f < 140 && (() => {
        const r = 520 / gateZ;
        const sh = (left: boolean) => match ? 'polygon(10% 10%, 90% 10%, 90% 90%, 10% 90%)'
          : left ? 'polygon(50% 0, 100% 100%, 0 100%)' : 'polygon(10% 10%, 90% 10%, 90% 90%, 10% 90%)';
        const col = match ? GREEN : RED;
        return (
          <>
            {[-1, 1].map((s) => (
              <div key={s} style={{position: 'absolute', left: CX - r + (s > 0 ? r : 0) + s * open * r, top: CYY - r, width: r, height: r * 2,
                background: '#06152Acc', border: `${6 / gateZ * 2}px solid ${col}`, boxShadow: `0 0 40px ${col}`, borderRadius: s < 0 ? `${r}px 0 0 ${r}px` : `0 ${r}px ${r}px 0`,
                display: 'flex', alignItems: 'center', justifyContent: s < 0 ? 'flex-end' : 'flex-start'}}>
                <div style={{width: r * 0.36, height: r * 0.36, margin: r * 0.08, background: col, clipPath: sh(s < 0)}} />
              </div>
            ))}
            {!match && lf > 20 && <Capsule x={CX} y={CYY + Math.sin(lf / 2) * 6} s={1.4 / gateZ * 1.6} label="DATA" c={OR} />}
            <Holo f={f} at={70} top={120} text={match ? '鑰匙對上 → 閘門打開' : '形狀對不上，進不去'} c={match ? GREEN : RED} size={48} />
            <Holo f={f} at={110} top={860} text="通訊協定 ＝ 雙方都同意的規則" c={GREEN} />
          </>
        );
      })()}

      {/* 大資料塊卡住 */}
      {f >= 140 && !crack && (
        <div style={{position: 'absolute', left: CX - 700 / blockZ, top: CYY - 420 / blockZ, width: 1400 / blockZ, height: 840 / blockZ,
          background: `repeating-linear-gradient(45deg, ${OR}55 0 20px, ${OR}22 20px 40px)`, border: `${10 / blockZ}px solid ${RED}`, boxShadow: `0 0 60px ${RED}`,
          transform: jam ? `translate(${Math.sin(f * 2) * 8}px, 0)` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <span style={{fontFamily: TC, fontWeight: 900, fontSize: 120 / blockZ, color: '#fff'}}>大檔案 8 GB</span>
        </div>
      )}
      {jam && <Holo f={f} at={160} top={110} text="⚠ 太大了，隧道塞住" c={RED} />}

      {/* 膠囊分岔前進 */}
      {crack && Array.from({length: 8}, (_, k) => {
        const lane = [-0.9, 0, 0.9][k % 3] - Math.PI / 2 + (k > 4 ? Math.PI : 0) * 0.3;
        const d = f - 207 - k * 4;
        if (d < 0) return null;
        const lost = k === 4;
        const z = interpolate(d, [0, 70], [1.1, 7], clamp);
        const [x, y] = proj(lane, 420 + k * 20, z * 0.6 + 0.4);
        const broken = lost ? interpolate(f, [238, 252], [0, 1], clamp) : 0;
        return <Capsule key={k} x={x} y={y} s={1.5 / z} label={`#${k + 1}→B`} broken={broken} />;
      })}
      {crack && f >= 258 && (() => {
        const d = f - 258, z = interpolate(d, [0, 40], [1.1, 6], clamp);
        const [x, y] = proj(-Math.PI / 2 + 0.4, 460, z * 0.6 + 0.4);
        return <><Capsule x={x} y={y} s={1.5 / z} label="#5→B" c={GREEN} /><Holo f={f} at={258} top={760} text="#5 重送" c={GREEN} size={40} /></>;
      })()}
      {crack && <Holo f={f} at={214} top={110} text="每一顆膠囊 ＝ 封包" c={OR} />}
      {crack && <Holo f={f} at={232} top={880} text="門牌 ＋ 編號，走不同的路" c={CY} size={42} />}
    </AbsoluteFill>
  );
};
