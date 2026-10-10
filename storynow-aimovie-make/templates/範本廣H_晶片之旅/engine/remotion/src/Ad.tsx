/* 範本廣H「晶片之旅」：一個不中斷的鏡頭——從電路板一路推進晶片（封裝→金線→晶粒→發光城市），
   電子光點是主角；邏輯閘前全部停一拍、完全安靜，drop 時神經網路像煙火連鎖點亮；最後一路拉遠回電路板，走線排出名稱。
   原作 02_試做/廣告30風格 src/ads/Ad17.tsx（屏榮電機電子群、60 秒）；畫面上的字全部改讀 timeline.json 的 d（storyboard）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {EB, EO, k, pulse, rnd, rnd01} from './kit';
import {B, BAR, cityCam, elecScreen, J, M, mframe, NT, panY, plateZ, project, PS, PE, sc, T, TOWERS} from './core';
import {BoardPlate, DiePlate, LidPlate, PIX, SILK, WirePlate} from './Plates';
import {City, TOWER_H, towerLit} from './City';
import {Finale} from './Finale';

const ITEMS = T.d.towers;
const two = (n: number) => String(n).padStart(2, '0');

const Glow: React.FC<{size: number; family?: string; color?: string; glow?: string; children: string}> = ({size, family = PIX, color = '#ffffff', glow = '#7ff6ff', children}) => (
  <div style={{position: 'relative', fontFamily: family, fontSize: size, lineHeight: 1.05, whiteSpace: 'nowrap'}}>
    <div style={{position: 'absolute', inset: 0, color: glow, filter: 'blur(14px)', opacity: 0.95}}>{children}</div>
    <div style={{position: 'relative', color}}>{children}</div>
  </div>
);

/* 推進／拉遠時飛過的微塵（星野式：每顆有自己的深度，越過鏡頭時拉出殘影） */
const DUST = Array.from({length: 90}, (_, i) => ({
  a: rnd01(`da${i}`) * Math.PI * 2,
  r: 120 + rnd01(`dr${i}`) * 900,
  d: -0.6 + (i / 90) * 5.2 + rnd(`dd${i}`) * 0.05,
  w: 2 + rnd01(`dw${i}`) * 3,
}));
const DCOL = ['#ffd27a', '#e9eef5', '#ffe08a', '#ff9de6', '#7ff6ff'];
const Dust: React.FC<{f: number}> = ({f}) => {
  const on = f < M.city + 25 || (f >= PS - 5 && f < PE + 10);
  if (!on) return null;
  const Za = plateZ(f + 4); // 背景微塵比前景早一步動
  const Zb = plateZ(f + 1);
  const lines: React.ReactNode[] = [];
  DUST.forEach((p, i) => {
    const s1 = Math.pow(5, Za - p.d), s0 = Math.pow(5, Zb - p.d);
    if (s1 < 0.25 || s1 > 5) return;
    const op = Math.min(1, (s1 - 0.25) / 0.6) * Math.min(1, (5 - s1) / 1.5);
    const x1 = 960 + Math.cos(p.a) * p.r * s1, y1 = 540 + Math.sin(p.a) * p.r * s1;
    const x0 = 960 + Math.cos(p.a) * p.r * s0, y0 = 540 + Math.sin(p.a) * p.r * s0;
    const col = DCOL[Math.max(0, Math.min(4, Math.floor(p.d + 0.5)))];
    lines.push(<line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={col} strokeWidth={p.w * Math.min(2.2, s1)} strokeLinecap="round" opacity={op * 0.8} />);
  });
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {lines}
    </svg>
  );
};

/* 主角：電子光點＋殘影拖尾（3～6 層逐漸透明，當動態模糊） */
const Electron: React.FC<{f: number}> = ({f}) => {
  const now = elecScreen(f);
  if (!now) return null;
  const silent = f >= M.silence && f < M.drop;
  const beat = silent ? 0 : pulse(Math.max(0, f), B, 0.4);
  const ghosts: React.ReactNode[] = [];
  const tail: string[] = [`${now[0]},${now[1]}`];
  for (let j = 1; j <= 6; j++) {
    const p = elecScreen(f - j * 1.6);
    if (!p) break;
    tail.push(`${p[0]},${p[1]}`);
    if (j <= 5) ghosts.push(<circle key={j} cx={p[0]} cy={p[1]} r={13 - j * 1.6} fill="#bffcff" opacity={0.55 - j * 0.09} />);
  }
  const R = 13 * (1 + 0.4 * beat);
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="e17g">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={1} />
          <stop offset="30%" stopColor="#7ff6ff" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#7ff6ff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <polyline points={tail.join(' ')} stroke="#7ff6ff" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.55} />
      {ghosts}
      <circle cx={now[0]} cy={now[1]} r={R * 6} fill="url(#e17g)" />
      <circle cx={now[0]} cy={now[1]} r={R} fill="#ffffff" />
    </svg>
  );
};

/* 地標標籤：電子經過時塔頂點亮，學習項目跟著亮起 */
const Labels: React.FC<{f: number}> = ({f}) => {
  if (f < J.land[0] - 4 || f >= M.silence) return null;
  const c = cityCam(f);
  const mf = mframe(f);
  return (
    <>
      {ITEMS.map((txt, i) => {
        const a = J.land[i] - 2;
        const end = i < NT - 1 ? J.land[i + 1] - 6 : M.gateRun + 30;
        if (f < a || f > end) return null;
        const t = TOWERS[i];
        const anc = project(c, t.x, TOWER_H * 0.7, t.z);
        const pin = EB(k(mf, a, a + 12, (x) => x));
        const out = k(f, end - 8, end, EO);
        const x = 960 + (i % 2 === 0 ? -430 : 430);
        const yb = 330;
        const lit = towerLit(mf, i);
        return (
          <div key={i}>
            <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: (1 - out) * lit}}>
              {anc && <line x1={anc[0]} y1={anc[1]} x2={x} y2={yb} stroke="#ffe3a0" strokeWidth={3} strokeDasharray="6 6" />}
              {anc && <circle cx={anc[0]} cy={anc[1]} r={8} fill="#fff6d8" />}
            </svg>
            <div
              style={{
                position: 'absolute', left: x, top: yb, transform: `translate(-50%, -100%) scale(${0.6 + 0.4 * pin})`, transformOrigin: '50% 100%',
                opacity: Math.min(1, pin * 1.5) * (1 - out), background: 'rgba(8,28,58,0.72)', border: '3px solid #7ff6ff', borderRadius: 6, padding: '14px 26px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              }}
            >
              <div style={{fontFamily: SILK, fontSize: 30, color: '#ffc860', letterSpacing: 3}}>{`${two(i + 1)} / ${two(NT)}`}</div>
              <Glow size={T.d.towerSize}>{txt}</Glow>
            </div>
          </div>
        );
      })}
    </>
  );
};

/* drop 的大標（storyboard 的 drop：1～2 段，第 2 段晚一小節掃出） */
const DROP = T.d.drop;
const DropTitle: React.FC<{f: number}> = ({f}) => {
  if (!DROP.length || f < M.drop + 8 || f > M.pull + 24) return null;
  const a = Math.floor(k(f, M.drop + 10, M.drop + 22) * 8) / 8;
  const b = Math.floor(k(f, M.drop + BAR + 8, M.drop + BAR + 20) * 8) / 8;
  const out = k(f, M.pull - 4, M.pull + 20, EO);
  return (
    <div style={{position: 'absolute', top: 56, left: 0, width: 1920, display: 'flex', justifyContent: 'center', gap: 36, opacity: 1 - out, transform: `translateY(${-out * 120}px)`}}>
      <div style={{clipPath: `inset(0 ${(1 - a) * 100}% 0 0)`}}>
        <Glow size={T.d.dropSize}>{DROP[0]}</Glow>
      </div>
      {DROP[1] && (
        <div style={{clipPath: `inset(0 ${(1 - b) * 100}% 0 0)`}}>
          <Glow size={T.d.dropSize} glow="#ffc860">{DROP[1]}</Glow>
        </div>
      )}
    </div>
  );
};

/* 鏡頭重擊：推進時每拍、城市每小節、drop 每拍；drop 瞬間加震動 */
const camHit = (f: number) => {
  let s = 0;
  if (f >= M.pkg && f < M.city) s = 0.02 * pulse(f - M.pkg, B, 0.35);
  else if (f >= M.city && f < M.silence) s = 0.035 * pulse(f - M.city, BAR, 0.1);
  else if (f >= M.drop && f < M.pull) s = 0.05 * pulse(f - M.drop, B, 0.4);
  const sh = f >= M.drop && f < M.drop + 30 ? 30 * Math.exp(-(f - M.drop) / 9) : 0;
  return {s: 1 + s, x: sh * rnd(`sx${f}`), y: sh * rnd(`sy${f}`)};
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const Z = plateZ(f);
  const pan = panY(f);
  const inCity = f >= M.city && f < PS;
  const hit = camHit(f);

  const plate = (layer: number, node: React.ReactNode) => {
    const s = sc(Z, layer);
    if (s < 0.03) return null;
    if (layer < 4 && Z >= layer + 1 && pan === 0) return null; // 子層已蓋滿畫面
    return (
      <div key={layer} style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translate(0px, ${pan}px) scale(${s})`, transformOrigin: '960px 540px'}}>
        {node}
      </div>
    );
  };
  const lidGlow = pulse(Math.max(0, f), B, 0.4);
  const print = Math.floor(k(f, 10, 52, (x) => x) * 12) / 12;
  const silent = f >= M.silence && f < M.drop;
  const flash = f >= M.drop ? 0.8 * Math.exp(-(f - M.drop) / 5) : 0;

  return (
    <AbsoluteFill style={{background: '#1f6545', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill style={{transform: `translate(${hit.x}px, ${hit.y}px) scale(${hit.s})`}}>
        {!inCity && (
          <>
            {plate(0, <BoardPlate lit={k(f, 0, 30)} print={f < M.city ? print : 1} />)}
            {plate(1, <LidPlate glow={lidGlow} />)}
            {plate(2, <WirePlate lit={k(f, M.pkg - 10, M.pkg + 20)} />)}
            {plate(3, <DiePlate hue={(Z - 3) * 50} lit={k(f, M.die - 10, M.die + 20)} />)}
            {sc(Z, 4) >= 0.03 && pan === 0 && <City f={f} />}
          </>
        )}
        {inCity && <City f={f} />}
        <Dust f={f} />
        <Finale f={f} />
        <Labels f={f} />
        <DropTitle f={f} />
        <Electron f={f} />
      </AbsoluteFill>
      {/* 靜音一拍：全部暗一階（亮度仍 > 10%） */}
      {silent && <AbsoluteFill style={{background: '#000814', opacity: 0.32}} />}
      {flash > 0.01 && <AbsoluteFill style={{background: '#e9ffff', opacity: flash}} />}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,10,20,0.38) 100%)'}} />
    </AbsoluteFill>
  );
};
