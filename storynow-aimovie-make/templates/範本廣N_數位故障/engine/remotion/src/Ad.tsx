/* 廣N 數位故障 Glitch：訊號被干擾的螢幕。資訊不是「出現」而是「解碼成功」——亂碼、色版錯開、撕裂，然後在拍點鎖定。
   招牌轉場：每次換章前 4 格～後 5 格，畫面切成 20 條撕裂、新舊兩章的切條互相穿插，整格 RGB 三色版爆開再收回。
   跳格：偶爾讓畫面停在前一格（不在換章時）。下方 180px 只放靜止角標，快速變化的雜訊都在 y<880 以上淡出。
   章的順序、每章的字、每章多長全部讀 timeline.json（timeline.py 依 storyboard 排好）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {GL, MONO, TC, VT} from './fonts';
import {B, BG, CYN, Chap, EI, EO, GRN, LAB, MAG, RED, WHT, abs, k, rnd, rnd01} from './kit';
import {ChChannels, ChLayers, ChOpen} from './chA';
import {ChErrors, ChLogo, ChNumbers, ChStatus} from './chB';

const CHS = T.chapters as unknown as Chap[];
const CH = CHS.map((c) => c.from);
const N = CHS.length;
const PRE = 4;
const POST = 5;
const VIEW: Record<string, React.FC<{t: number; f: number; c: Chap; i: number}>> = {
  open: ChOpen, layers: ChLayers, channels: ChChannels, errors: ChErrors, numbers: ChNumbers, status: ChStatus, logo: ChLogo,
};
const HUD = T.d.hud as {left: string; right: string; rightSize: number};

const at = (f: number) => {
  let i = 0;
  while (i + 1 < N && f >= CH[i + 1]) i++;
  return {i, t: f - CH[i]};
};
const chap = (i: number, t: number, f: number) => {
  const V = VIEW[CHS[i].type];
  return <V t={Math.max(0, t)} f={f} c={CHS[i]} i={i} />;
};

/** 整格 RGB 三色版分離濾鏡 */
const RGBFilter: React.FC<{dx: number}> = ({dx}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      <filter id="adNrgb" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
        <feOffset in="r" dx={dx} dy={0} result="r2" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
        <feOffset in="g" dx={-dx * 0.6} dy={dx * 0.25} result="g2" />
        <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
        <feOffset in="b" dx={-dx} dy={-dx * 0.2} result="b2" />
        <feBlend mode="screen" in="r2" in2="g2" result="rg" />
        <feBlend mode="screen" in="rg" in2="b2" />
      </filter>
    </defs>
  </svg>
);

/** 招牌轉場：新舊兩章切條穿插＋切條橫移＋色版爆開 */
const Tear: React.FC<{A: React.ReactNode; Bn: React.ReactNode; d: number; f: number; force?: number}> = ({A, Bn, d, f, force}) => {
  const amt = force ?? (d < 0 ? k(d, -PRE, 0, EI) : 1 - k(d, 0, POST, EO));
  const mixP = d < -2 ? 0.08 : d < 0 ? 0.3 : d < 2 ? 0.7 : d < 4 ? 0.9 : 1;
  const n = 20;
  const cuts = [0];
  for (let i = 1; i < n; i++) cuts.push((i / n + (rnd(`tc${f}${i}`) * 0.35) / n) * 1080);
  cuts.push(1080);
  const jumpX = d >= 0 && d < 2 ? rnd(`jx${f}`) * 40 : 0;
  const jumpY = d >= 0 && d < 2 ? rnd(`jy${f}`) * 24 : 0;
  return (
    <AbsoluteFill style={{filter: amt > 0.05 ? 'url(#adNrgb)' : undefined, transform: `translate(${jumpX}px,${jumpY}px)`}}>
      <RGBFilter dx={Math.round(amt * 30)} />
      {cuts.slice(0, -1).map((y0, j) => {
        const y1 = cuts[j + 1];
        const useB = rnd01(`tb${f}_${j}`) < mixP;
        const r = rnd(`tx${f}_${j}`);
        const x = (Math.abs(r) > 0.35 ? r * 420 : r * 60) * amt;
        const bar = amt > 0.5 && rnd01(`tbar${f}_${j}`) < 0.12 && y0 < 840;
        return (
          <AbsoluteFill key={j} style={{clipPath: `inset(${y0}px 0 ${1080 - y1}px 0)`, transform: `translateX(${x.toFixed(1)}px)`}}>
            {useB ? Bn : A}
            {bar && <div style={{...abs, left: 0, right: 0, top: y0, height: y1 - y0, background: [MAG, CYN, GRN][j % 3], opacity: 0.45, mixBlendMode: 'screen'}} />}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

/** 背景：深灰藍＋中央略亮＋像素格（靜態） */
const Backdrop: React.FC = () => (
  <>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #2b3044 0%, #22253350 55%, transparent 80%)'}} />
    <AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1.5px, transparent 1.6px)', backgroundSize: '24px 24px'}} />
  </>
);

/** 掃描線（靜態）＋慢慢下移的亮帶（低對比） */
const Scan: React.FC<{f: number}> = ({f}) => (
  <>
    <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 2px, transparent 2px 5px)', pointerEvents: 'none'}} />
    <div style={{...abs, left: 0, right: 0, top: ((f * 4) % 1500) - 300, height: 220, background: 'linear-gradient(to bottom, transparent, rgba(160,200,255,0.05), transparent)'}} />
  </>
);

/** 固定角標：上方章節標籤、下方靜止 REC 標與右下角標 */
const Hud: React.FC<{i: number}> = ({i}) => {
  const bc = `3px solid rgba(255,255,255,0.35)`;
  const mark = (s: React.CSSProperties) => <div style={{...abs, width: 34, height: 34, ...s}} />;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {mark({left: 36, top: 36, borderLeft: bc, borderTop: bc})}
      {mark({right: 36, top: 36, borderRight: bc, borderTop: bc})}
      {mark({left: 36, bottom: 36, borderLeft: bc, borderBottom: bc})}
      {mark({right: 36, bottom: 36, borderRight: bc, borderBottom: bc})}
      <div style={{...abs, left: 92, top: 52, fontFamily: MONO, fontWeight: 700, fontSize: 28, color: GRN, opacity: 0.85, whiteSpace: 'nowrap'}}>
        {LAB.seq} {pad(i + 1)}/{pad(N)} · {CHS[i].label}
      </div>
      <div style={{...abs, left: 92, bottom: 62, display: 'flex', alignItems: 'center', gap: 16, fontFamily: MONO, fontWeight: 700, fontSize: 28, color: WHT, opacity: 0.8, whiteSpace: 'nowrap'}}>
        <span style={{width: 18, height: 18, borderRadius: 9, background: RED, display: 'inline-block'}} />
        {LAB.rec}{HUD.left ? ` · ${HUD.left}` : ''}
      </div>
      {HUD.right !== '' && (
        <div style={{...abs, right: 92, bottom: 62, fontFamily: TC, fontWeight: 700, fontSize: HUD.rightSize, color: WHT, opacity: 0.7, whiteSpace: 'nowrap'}}>
          {HUD.right}
        </div>
      )}
    </AbsoluteFill>
  );
};

export const Ad: React.FC = () => {
  const f0 = useCurrentFrame();
  // 換章轉場
  let j = -1;
  let d = 0;
  for (let q = 1; q < N; q++) {
    const dd = f0 - CH[q];
    if (dd >= -PRE && dd <= POST) {
      j = q;
      d = dd;
    }
  }
  // 跳格：非轉場時偶爾重複前一格（最後 100 格不跳，收尾要穩）
  const f = j < 0 && f0 > 2 && f0 < T.frames - 100 && rnd01(`hold${f0}`) < 0.07 ? f0 - 1 : f0;
  const {i, t} = at(f);
  // 章內小故障：每小節第 3 拍起 2 格輕微撕裂（收尾章不做）
  const ph = f - CH[i];
  const beatIdx = Math.floor(ph / B);
  const inBeat = ph - beatIdx * B;
  const micro = j < 0 && i < N - 1 && beatIdx % 4 === 2 && inBeat < 2;
  let body: React.ReactNode;
  if (j > 0) {
    body = <Tear A={chap(j - 1, f - CH[j - 1], f)} Bn={chap(j, f - CH[j], f)} d={d} f={f} />;
  } else if (micro) {
    body = <Tear A={chap(i, t, f)} Bn={chap(i, t, f)} d={POST} f={f} force={0.12} />;
  } else {
    body = chap(i, t, f);
  }
  return (
    <AbsoluteFill style={{background: BG, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <Backdrop />
      {body}
      <Scan f={f0} />
      <Hud i={j > 0 && d >= 0 ? j : i} />
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每個字（含亂碼字池）用每一種字型串接各排一次，看有沒有缺字方塊 */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  const row = (fam: string, w: number, color: string, label: string) => (
    <div style={{marginTop: 14}}>
      <div style={{fontFamily: 'monospace', fontSize: 20, color: '#9aa0c4'}}>{label}</div>
      <div style={{fontFamily: fam, fontWeight: w, fontSize: 34, lineHeight: 1.22, color, wordBreak: 'break-all'}}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{background: BG, padding: 30, color: WHT}}>
      {row(TC, 700, WHT, 'Noto Sans TC 700')}
      {row(TC, 900, GRN, 'Noto Sans TC 900')}
      {row(MONO, 700, CYN, 'Space Mono → Noto Sans TC')}
      {row(GL, 400, MAG, 'Rubik Glitch → Noto Sans TC')}
      {row(VT, 400, '#ffe14d', 'VT323 → Noto Sans TC')}
    </AbsoluteFill>
  );
};
