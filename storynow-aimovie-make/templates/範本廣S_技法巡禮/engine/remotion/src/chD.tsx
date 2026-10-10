/* morph「SHAPE MORPH」：右側色塊每段由下往上換色（換色線經過圖形時圖形也跟著換配色），圖示依拍點一個變一個，最後變成圓（接收尾）；
   左側每段換一組字（色塊小標、大標、項目），舊的往上滑出。
   logo「LOGO LOCKUP」：全片元素螺旋收斂、同心環收縮、每拍硬切一個詞，重擊那一拍出 logo lockup 定格。
   原作 chD.tsx 的第 7、8 章；字與圖示全部讀 timeline.json，每段長度、重擊那一拍由 timeline.py 依字數排。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, ChP, EI, EIO, EO, MaskLine, Pt, abs, align, bell, circlePts, k, lerp, mixPts, nb, ptsPath, resample, rnd, sp} from './kit';
import {ARCH, SG, TC} from './fonts';

/* ═════════ morph ═════════ */
const PLANE: Pt[] = [[0, -190], [20, -160], [24, -40], [190, 40], [190, 72], [24, 30], [20, 120], [72, 158], [72, 182], [0, 166], [-72, 182], [-72, 158], [-20, 120], [-24, 30], [-190, 72], [-190, 40], [-24, -40], [-20, -160]];
const FUJI: Pt[] = [[-230, 150], [-70, -100], [-36, -120], [36, -120], [70, -100], [230, 150]];
const CUP: Pt[] = [[-140, -100], [110, -100], [112, -70], [168, -72], [198, -36], [194, 14], [160, 46], [100, 52], [72, 92], [196, 92], [170, 126], [-190, 126], [-214, 92], [-96, 92], [-132, -10]];
const BADGE: Pt[] = Array.from({length: 32}, (_, i) => {
  const a = -Math.PI / 2 + (i / 32) * Math.PI * 2;
  const r = i % 2 ? 150 : 176;
  return [Math.cos(a) * r, -30 + Math.sin(a) * r];
});
const HOUSE: Pt[] = [[0, -190], [205, -10], [150, -10], [150, 180], [-150, 180], [-150, -10], [-205, -10]];
const HEART: Pt[] = Array.from({length: 80}, (_, i) => {
  const a = (i / 80) * Math.PI * 2;
  const x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
  return [x * 11.5, -y * 11.5 - 10];
});
const BAG: Pt[] = [[-150, -70], [150, -70], [172, 180], [-172, 180]];
const TROPHY: Pt[] = [[-120, -170], [120, -170], [120, -150], [184, -150], [176, -76], [112, -30], [34, 36], [28, 96], [96, 112], [104, 172], [-104, 172], [-96, 112], [-28, 96], [-34, 36], [-112, -30], [-176, -76], [-184, -150], [-120, -150]];
const RAW: Record<string, Pt[]> = {plane: PLANE, globe: circlePts(172, 90), mountain: FUJI, cup: CUP, badge: BADGE, house: HOUSE, heart: HEART, bag: BAG,
  trophy: TROPHY, circle: circlePts(172, 90)};
const SX = 1400, SY = 490;
const BAR_COL = [
  {bg: C.blue, fg: C.white, sh: C.coral, tagBg: C.blue, tagFg: C.white},
  {bg: C.coral, fg: C.white, sh: C.bg, tagBg: C.coral, tagFg: C.white},
  {bg: C.white, fg: C.bg, sh: C.coral, tagBg: C.white, tagFg: C.bg},
  {bg: C.blue, fg: C.white, sh: C.coral, tagBg: C.blue, tagFg: C.white},
];

const Extras: React.FC<{w: Record<string, number>; fg: string; bgc: string}> = ({w, fg, bgc}) => (
  <g>
    {(w.globe ?? 0) > 0 && <g opacity={w.globe} fill="none" stroke={bgc} strokeWidth={6}>
      <ellipse cx={0} cy={0} rx={70} ry={168} /><ellipse cx={0} cy={0} rx={130} ry={168} />
      <line x1={-170} y1={0} x2={170} y2={0} /><line x1={-150} y1={-80} x2={150} y2={-80} /><line x1={-150} y1={80} x2={150} y2={80} />
    </g>}
    {(w.mountain ?? 0) > 0 && <polyline opacity={w.mountain} points="-110,-12 -70,10 -40,-20 0,14 40,-20 70,10 110,-12" fill="none" stroke={bgc} strokeWidth={10} strokeLinejoin="round" />}
    {(w.cup ?? 0) > 0 && <g opacity={w.cup}>
      <ellipse cx={150} cy={-12} rx={22} ry={28} fill={bgc} />
      {[-70, -10, 50].map((x, i) => <path key={i} d={`M${x},-130 q20,-25 0,-50 q-20,-25 0,-50`} fill="none" stroke={fg} strokeWidth={9} strokeLinecap="round" />)}
    </g>}
    {(w.badge ?? 0) > 0 && <g opacity={w.badge}>
      <polygon points="-90,110 -40,110 -50,200 -80,180 -110,200" fill={fg} /><polygon points="40,110 90,110 110,200 80,180 50,200" fill={fg} />
      <polyline points="-60,-30 -15,15 70,-75" fill="none" stroke={bgc} strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
    </g>}
    {(w.house ?? 0) > 0 && <g opacity={w.house}><rect x={-40} y={70} width={80} height={110} fill={bgc} /><rect x={60} y={20} width={50} height={50} fill={bgc} /></g>}
    {(w.bag ?? 0) > 0 && <path opacity={w.bag} d="M-70,-68 C-70,-170 70,-170 70,-68" fill="none" stroke={fg} strokeWidth={18} strokeLinecap="round" />}
    {(w.trophy ?? 0) > 0 && <polygon opacity={w.trophy} fill={bgc} points={Array.from({length: 10}, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 22 : 54;
      return `${(Math.cos(a) * r).toFixed(1)},${(-90 + Math.sin(a) * r).toFixed(1)}`;
    }).join(' ')} />}
  </g>
);

export const ChMorph: React.FC<ChP> = ({t, c}) => {
  const names = c.shapes as string[];
  const SH: Pt[][] = [resample(RAW[names[0]])];
  for (let i = 1; i < names.length; i++) SH.push(align(SH[i - 1], resample(RAW[names[i]])));
  const MAT = (c.morph as number[]).map(nb);
  let pts = SH[0];
  const w: Record<string, number> = {};
  let cur = 0, pulse = 0, rot = 0, mid = false;
  for (let i = 0; i < MAT.length; i++) {
    const p = k(t, MAT[i] - 4, MAT[i] + 6, EIO);
    if (p <= 0) break;
    pts = mixPts(pts, SH[i + 1], p);
    cur = i + 1;
    pulse = Math.max(pulse, bell(k(t, MAT[i] - 4, MAT[i] + 8, (x) => x)));
    rot += (i % 2 ? -1 : 1) * 360 * p;
    if (p < 1) {
      w[names[i]] = Math.max(w[names[i]] ?? 0, Math.max(0, 1 - p * 3));
      w[names[i + 1]] = Math.max(w[names[i + 1]] ?? 0, Math.max(0, p * 3 - 2));
      mid = true;
      break;
    }
  }
  if (!mid) w[names[cur]] = 1;
  const d = ptsPath(pts);
  const sc = (1 + 0.14 * pulse) * sp(t, -4, 12, 200);
  const blockIn = k(t, -6, 10, EIO);
  const G = c.groups as Record<string, any>[];
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {G.map((g, i) => {
        const bar = BAR_COL[i % 4];
        const wipe = i === 0 ? blockIn : k(t, nb(g.at) - 3, nb(g.at) + 7, EIO);
        if (wipe <= 0) return null;
        if (i + 1 < G.length && k(t, nb(G[i + 1].at) - 3, nb(G[i + 1].at) + 7, EIO) >= 1) return null;
        return (
          <div key={i} style={{...abs, left: 1000, top: 120, width: 800, height: 740, background: bar.bg, clipPath: `inset(${(1 - wipe) * 100}% 0 0 0)`}}>
            <svg style={{...abs, left: 0, top: 0, overflow: 'visible'}} width={800} height={740}>
              <g transform={`translate(${SX - 1000} ${SY - 120}) rotate(${rot}) scale(${sc})`}>
                <path d={d} fill={bar.sh} transform="translate(18 18)" />
                <path d={d} fill={bar.fg} />
                <Extras w={w} fg={bar.fg} bgc={bar.bg} />
              </g>
            </svg>
            <div style={{...abs, right: 26, top: 20, fontFamily: SG, fontWeight: 700, fontSize: 22, letterSpacing: 6, color: bar.fg, opacity: 0.7}}>{`${String(c.no).padStart(2, '0')}.${i + 1}`}</div>
            {c.tag && <div style={{...abs, left: 26, bottom: 18, fontFamily: SG, fontWeight: 500, fontSize: 18, letterSpacing: 6, color: bar.fg, opacity: 0.55}}>{c.tag}</div>}
          </div>
        );
      })}
      {G.map((g, i) => {
        const bar = BAR_COL[i % 4];
        const s = nb(g.at);
        const last = i + 1 >= G.length;
        const e = nb(g.at + g.nb) - 7;
        if (t < s - 2 || (!last && t > e + 8)) return null;
        const out = last ? 0 : k(t, e, e + 6, EI);
        const lines: React.ReactNode[] = [];
        let y = 0;
        if (g.tag) {
          lines.push(<MaskLine key="tag" p={k(t, s, s + 10)} out={out} style={{...abs, top: y}}>
            <span style={{fontFamily: TC, fontWeight: 900, fontSize: g.tagSize, color: bar.tagFg, background: bar.tagBg, padding: '4px 18px', display: 'inline-block',
              whiteSpace: 'nowrap'}}>{g.tag}</span></MaskLine>);
          y += 90;
        }
        (g.title as {text: string; size: number}[]).forEach((tl, j) => {
          lines.push(<MaskLine key={`t${j}`} p={k(t, s + 3 + j * 2, s + 14 + j * 2)} out={out} style={{...abs, top: y, fontFamily: TC, fontWeight: 900, fontSize: tl.size,
            color: C.white, whiteSpace: 'nowrap', lineHeight: 1.2}}>{tl.text}</MaskLine>);
          y += 100;
        });
        y += 24;
        (g.items as {text: string; size: number}[]).forEach((it, j) => {
          lines.push(<MaskLine key={`i${j}`} p={k(t, s + 8 + j * 3, s + 18 + j * 3)} out={out} style={{...abs, top: y, fontFamily: TC, fontWeight: 700, fontSize: it.size,
            color: C.dim, whiteSpace: 'nowrap', lineHeight: 1.3}}><span style={{color: C.coral, marginRight: 14}}>—</span>{it.text}</MaskLine>);
          y += 66;
        });
        return <div key={i} style={{...abs, left: 120, top: 220, width: 840, height: 640}}>{lines}</div>;
      })}
    </AbsoluteFill>
  );
};

/* ═════════ logo ═════════ */
const Item: React.FC<{id: string; card: string}> = ({id, card}) => {
  if (id.startsWith('#')) {
    const s = id.slice(1);
    const parts = s.split(/([0-9][0-9.,:/%]*)/).filter(Boolean);
    return (
      <div style={{display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap', lineHeight: 1}}>
        {parts.map((x, i) => /^[0-9]/.test(x)
          ? <span key={i} style={{fontFamily: ARCH, fontSize: 86, color: C.white}}>{x}</span>
          : <span key={i} style={{fontFamily: TC, fontWeight: 900, fontSize: 60, color: i % 2 ? C.blue : C.coral}}>{x}</span>)}
      </div>
    );
  }
  switch (id) {
    case 'c': return <svg width={140} height={140}><circle cx={70} cy={70} r={64} fill={C.blue} /></svg>;
    case 's': return <svg width={140} height={140}><rect x={14} y={14} width={112} height={112} fill={C.coral} /></svg>;
    case 'tri': return <svg width={140} height={140}><polygon points="70,8 132,124 8,124" fill="none" stroke={C.white} strokeWidth={9} /></svg>;
    case 'card': return <div style={{width: 220, height: 120, background: C.bg3, border: `2px solid ${C.faint}`, fontFamily: TC, fontWeight: 900, fontSize: 28, color: C.white,
      padding: 14, boxSizing: 'border-box', overflow: 'hidden', lineHeight: 1.2}}>{card}</div>;
    case 'cube': return <svg width={140} height={140} viewBox="-70 -70 140 140"><polygon points="0,-60 52,-30 0,0 -52,-30" fill={C.white} /><polygon points="-52,-30 0,0 0,60 -52,30" fill={C.blue} /><polygon points="52,-30 0,0 0,60 52,30" fill={C.blueD} /></svg>;
    case 'chip': return <svg width={140} height={140}><rect x={30} y={30} width={80} height={80} fill={C.bg2} stroke={C.white} strokeWidth={4} />{[45, 70, 95].map((v) => <g key={v} stroke={C.dim} strokeWidth={5}><line x1={v} y1={10} x2={v} y2={30} /><line x1={v} y1={110} x2={v} y2={130} /><line x1={10} y1={v} x2={30} y2={v} /><line x1={110} y1={v} x2={130} y2={v} /></g>)}</svg>;
    case 'plane': return <svg width={140} height={140} viewBox="-200 -200 400 400"><path d={ptsPath(PLANE)} fill={C.white} transform="rotate(45)" /></svg>;
    case 'ring': return <svg width={140} height={140}><circle cx={70} cy={70} r={52} fill="none" stroke={C.faint} strokeWidth={16} /><circle cx={70} cy={70} r={52} fill="none" stroke={C.coral} strokeWidth={16} strokeDasharray="230 400" transform="rotate(-90 70 70)" /></svg>;
    default: return <svg width={140} height={140}>{[0, 1, 2, 3].map((i) => <rect key={i} x={10 + i * 32} y={120 - (i + 1) * 26} width={24} height={(i + 1) * 26} fill={i === 3 ? C.coral : C.blue} />)}</svg>;
  }
};
const BURST = Array.from({length: 40}, (_, j) => ({a: (j / 40) * Math.PI * 2 + rnd(`ba${j}`) * 0.2, d: 500 + (rnd(`bd${j}`) + 1) * 400, s: 8 + (rnd(`bs${j}`) + 1) * 8, c: [C.blue, C.coral, C.white][j % 3]}));
/** 「・」標成珊瑚色 */
const dotted = (s: string) => s.split('・').flatMap((x, i) => (i ? [<span key={i} style={{color: C.coral}}>・</span>, x] : [x]));

export const ChLogo: React.FC<ChP> = ({t, c}) => {
  const CX = 960, CY = 500;
  const HIT = nb(c.hit);
  const hit = t >= HIT;
  const g = sp(t, HIT, 14, 180, 0.9);
  const ring = k(t, HIT, HIT + 30, EO);
  const flash = hit ? 0.42 * (1 - k(t, HIT, HIT + 7, (x) => x)) : 0;
  const shake = hit ? Math.exp(-(t - HIT) / 4) * 14 : 0;
  const shx = shake * Math.sin((t - HIT) * 2.1), shy = shake * Math.cos((t - HIT) * 2.7);
  const suck = k(t, HIT - 8, HIT, EI);
  const ITEMS = c.items as string[];
  const WORDS = c.words as string[];
  const w0 = c.w0 as number;
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <svg style={{...abs, left: 0, top: 0}} width={1920} height={1080}>
        {Array.from({length: Math.ceil(c.hit) + 2}, (_, n) => {
          const p = k(t, nb(n - 2), nb(n), EI);
          if (p <= 0 || p >= 1 || hit) return null;
          return <circle key={n} cx={CX} cy={CY} r={1150 * (1 - p)} fill="none" stroke={n % 2 ? C.blue : C.faint} strokeWidth={3 + 6 * p} opacity={0.3 + 0.7 * p} />;
        })}
        {hit && (
          <g opacity={k(t, HIT + 6, HIT + 30)}>
            <circle cx={CX} cy={CY} r={430} fill="none" stroke={C.faint} strokeWidth={2} strokeDasharray="4 14" transform={`rotate(${(t - HIT) * 0.25} ${CX} ${CY})`} />
            <circle cx={CX} cy={CY} r={470} fill="none" stroke={C.line} strokeWidth={10} strokeDasharray="120 60" transform={`rotate(${-(t - HIT) * 0.15} ${CX} ${CY})`} />
          </g>
        )}
        {hit && ring < 1 && <>
          <circle cx={CX} cy={CY} r={60 + 1200 * ring} fill="none" stroke={C.white} strokeWidth={40 * (1 - ring)} opacity={1 - ring} />
          <circle cx={CX} cy={CY} r={30 + 900 * k(t, HIT + 3, HIT + 30)} fill="none" stroke={C.coral} strokeWidth={16 * (1 - ring)} opacity={1 - ring} />
        </>}
        {hit && BURST.map((b, j) => {
          const p = k(t, HIT, HIT + 40, EO);
          const fade = 1 - k(t, HIT + 20, HIT + 50, (x) => x);
          if (fade <= 0) return null;
          return <rect key={j} x={CX + Math.cos(b.a) * b.d * p - b.s / 2} y={CY + Math.sin(b.a) * b.d * p * 0.3 - b.s / 2} width={b.s} height={b.s} fill={b.c} opacity={fade}
            transform={`rotate(${j * 37 + p * 200} ${CX + Math.cos(b.a) * b.d * p} ${CY + Math.sin(b.a) * b.d * p * 0.3})`} />;
        })}
      </svg>
      {/* 重擊前：每拍硬切一個詞 */}
      {WORDS.length > 0 && t >= nb(w0) && !hit && (() => {
        const i = Math.min(WORDS.length - 1, Math.floor((t - nb(w0)) / nb(1)));
        const s = (1 + 0.15 * Math.exp(-(t - nb(w0 + i)) / 3)) * (1 - suck);
        return (
          <div style={{...abs, left: 0, right: 0, top: CY - 130, textAlign: 'center', fontFamily: TC, fontWeight: 900, fontSize: 230, lineHeight: '260px',
            color: i % 2 ? 'transparent' : 'rgba(244,239,230,0.16)', WebkitTextStroke: i % 2 ? `3px rgba(244,239,230,0.35)` : undefined,
            transform: `scale(${s})`, letterSpacing: 20, whiteSpace: 'nowrap'}}>{WORDS[i]}</div>
        );
      })()}
      {/* 全片元素螺旋收斂 */}
      {!hit && ITEMS.map((id, j) => {
        const a0 = (j / ITEMS.length) * Math.PI * 2 + 0.3;
        const p = k(t, j * 1.5, HIT - 1, EI);
        const th = a0 + p * Math.PI * 1.1;
        const r = (1020 + rnd(`r${j}`) * 120) * (1 - p);
        const x = CX + Math.cos(th) * r, y = CY + Math.sin(th) * r * 0.38;
        return (
          <div key={id + j} style={{...abs, left: x, top: y, transform: `translate(-50%,-50%) scale(${lerp(1.1, 0.15, p)}) rotate(${(1 - p) * (j % 2 ? 40 : -40)}deg)`,
            opacity: 1 - k(t, HIT - 6, HIT - 1)}}>
            <Item id={id} card={c.card} />
          </div>
        );
      })}
      {hit && (
        <div style={{...abs, inset: 0, transform: `translate(${shx}px, ${shy}px) scale(${lerp(1.4, 1, g)})`, transformOrigin: `${CX}px ${CY}px`, opacity: Math.min(1, g * 3)}}>
          <svg style={{...abs, left: 560 - 130, top: CY - 130, overflow: 'visible'}} width={260} height={260} viewBox="-130 -130 260 260">
            {(() => {
              const a = sp(t, HIT, 12, 240), b = sp(t, HIT + 2, 12, 240), cc = sp(t, HIT + 4, 12, 240);
              return <>
                <circle cx={-32 - 200 * (1 - a)} cy={-28} r={88} fill={C.blue} />
                <rect x={-6} y={-6 + 200 * (1 - b)} width={110} height={110} fill={C.coral} opacity={0.96} />
                <polygon points="0,-118 92,46 -92,46" fill="none" stroke={C.white} strokeWidth={10} transform={`translate(${200 * (1 - cc)} 22) rotate(${(1 - cc) * 90})`} />
              </>;
            })()}
          </svg>
          <div style={{...abs, left: 730, top: CY - 180}}>
            {c.en && <MaskLine p={k(t, HIT + 2, HIT + 12)} style={{fontFamily: SG, fontWeight: 700, fontSize: c.enSize, letterSpacing: c.enSize * 0.55, color: C.coral, whiteSpace: 'nowrap'}}>{c.en}</MaskLine>}
            <MaskLine p={k(t, HIT, HIT + 8)} style={{fontFamily: TC, fontWeight: 900, fontSize: c.nameSize, color: C.white, whiteSpace: 'nowrap', marginTop: 14, lineHeight: 1.25}}>{c.name}</MaskLine>
            {c.slogan && <MaskLine p={k(t, HIT + 4, HIT + 14)} style={{fontFamily: TC, fontWeight: 700, fontSize: c.sloganSize, color: C.white, whiteSpace: 'nowrap',
              letterSpacing: c.sloganSize * 0.16, marginTop: 6, lineHeight: 1.3}}>{dotted(c.slogan)}</MaskLine>}
            <div style={{width: 600 * k(t, HIT + 8, HIT + 22, EIO), height: 4, background: C.coral, margin: '26px 0 22px'}} />
            {(c.url || c.tel) && <MaskLine p={k(t, HIT + 12, HIT + 22)} style={{fontFamily: SG, fontWeight: 700, fontSize: c.urlSize, color: C.white, whiteSpace: 'nowrap'}}>
              {c.url}{c.tel && <span style={{color: C.dim, fontWeight: 500, marginLeft: c.url ? 36 : 0}}>{c.tel}</span>}
            </MaskLine>}
          </div>
        </div>
      )}
      {flash > 0 && <AbsoluteFill style={{background: C.white, opacity: flash}} />}
    </AbsoluteFill>
  );
};
