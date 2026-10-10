/* 廣S 技法巡禮（動態設計作品集 showreel）：沒有旁白、跟著 128 BPM 配樂走。
   每一章炫一種動態設計手法（右上角標出技法名與章號），章與章之間的轉場本身也是招牌：
   斜向色條掃過 bars／珊瑚圓點圓形擦除 dot／方格磚翻蓋 tiles／鏡頭穿越卡片 through／液態波浪上漲 wave／橫向切片位移 slices／圖形放大穿越 zoom。
   規則：每格只畫目前章（轉場時加上前一章）；章的順序、每章的字、每章多長、用哪種轉場全部讀 timeline.json；畫面最下 180px 只放靜止的角標。
   原作 Showreel.tsx（固定 8 章 60 秒）→ 章型可挑、轉場依相鄰章輪流。 */
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {B, C, Chap, DigitCol, EI, EIO, EO, H, W, abs, clamp, k, lerp} from './kit';
import {ARCH, FAM, SG, TC} from './fonts';
import {ChOpen, ChType} from './chA';
import {ChData, ChGrid} from './chB';
import {ChIso, ChLines} from './chC';
import {ChLogo, ChMorph} from './chD';

const CHS = T.chapters as unknown as Chap[];
const CH = CHS.map((c) => c.from);
const N = CHS.length;
const VIEW: Record<string, React.FC<{t: number; c: Chap}>> = {
  open: ChOpen, type: ChType, data: ChData, grid: ChGrid, iso: ChIso, lines: ChLines, morph: ChMorph, logo: ChLogo,
};
const scene = (i: number, f: number) => {
  const V = VIEW[CHS[i].type];
  return <V t={f - CH[i]} c={CHS[i]} />;
};
/** 從 (x, y) 蓋滿整個畫面要多大的半徑 */
const cover = (x: number, y: number) => Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y)) + 40;

type Tr = (d: number, A: React.ReactNode, Bn: React.ReactNode, prev: Chap) => React.ReactNode;

/** 斜向色條：七條斜向色條依序掃入蓋滿，換章拍後繼續往右掃出 */
const bars: Tr = (d, A, Bn) => {
  const cols = [C.coral, C.blue, C.white, C.bg3, C.coral, C.blue, C.white];
  return (
    <>
      {d < 0 ? A : Bn}
      <AbsoluteFill style={{overflow: 'hidden'}}>
        <div style={{...abs, left: 960 - 1600, top: 540 - 1600, width: 3200, height: 3200, transform: 'rotate(-24deg)'}}>
          {cols.map((c, j) => {
            const x = d < 0 ? -3300 * (1 - k(d, -12 + j * 0.8, -5 + j * 0.8, EIO)) : 3300 * k(d, j * 0.9, 9 + j * 0.9, EIO);
            return <div key={j} style={{...abs, left: x, top: (j * 3200) / 7 - 1, width: 3200, height: 3200 / 7 + 2, background: c}} />;
          })}
        </div>
      </AbsoluteFill>
    </>
  );
};

/** 珊瑚圓點：上一章的圓點（錨點）放大成珊瑚圓蓋滿，下一章從同一圓心以圓形擦除打開 */
const dot: Tr = (d, A, Bn, prev) => {
  const [x, y] = prev.anchor;
  const R = cover(x, y);
  const rC = interpolate(d, [-14, 1], [60, R], {...clamp, easing: EI});
  const rB = interpolate(d, [-1, 13], [0, R], {...clamp, easing: EO});
  return (
    <>
      {rC < R - 30 && A}
      <svg style={{...abs, left: 0, top: 0}} width={W} height={H}><circle cx={x} cy={y} r={rC} fill={C.coral} /></svg>
      {rB > 0 && (
        <>
          <AbsoluteFill style={{clipPath: `circle(${rB}px at ${x}px ${y}px)`}}>{Bn}</AbsoluteFill>
          <svg style={{...abs, left: 0, top: 0}} width={W} height={H}>
            <circle cx={x} cy={y} r={rB} fill="none" stroke={C.white} strokeWidth={10 * (1 - rB / R)} />
          </svg>
        </>
      )}
    </>
  );
};

/** 方格磚：8×5 方格磚依對角線長出蓋滿，換章拍後再依序縮掉 */
const tiles: Tr = (d, A, Bn) => {
  const out: React.ReactNode[] = [];
  for (let c = 0; c < 8; c++) for (let r = 0; r < 5; r++) {
    const dl = (c + r) * 0.5;
    const s = d < 0 ? k(d, -13 + dl, -7 + dl, EO) : 1 - k(d, dl, dl + 8, EI);
    if (s <= 0) continue;
    out.push(<div key={`${c}-${r}`} style={{...abs, left: c * 240 - 1, top: r * 216 - 1, width: 242, height: 218,
      background: (c + r) % 4 === 0 ? C.coral : C.blue, transform: `scale(${s})`}} />);
  }
  return <>{d < 0 ? A : Bn}{out}</>;
};

/** 鏡頭穿越卡片：上一章放大、聚焦卡片框內就是下一章（grid 之後用聚焦的那張卡；其他章用畫面中央的框） */
const through: Tr = (d, A, Bn, prev) => {
  const [fx, fy, fw, fh] = (prev.focusRect as number[] | undefined) ?? [660, 330, 600, 338];
  const z = k(d, -10, 12, EIO);
  const fcx = fx + fw / 2, fcy = fy + fh / 2;
  const sMax = Math.max(W / fw, H / fh) * 1.02;
  const s = lerp(1, sMax, z);
  const cx = lerp(fcx, 960, z), cy = lerp(fcy, 540, z);
  const rw = fw * s, rh = fh * s;
  const L = cx - rw / 2, Tp = cy - rh / 2;
  const bs = lerp(fw / W, 1, z);
  const bIn = k(d, -8, 0);
  return (
    <>
      {z < 1 && <AbsoluteFill style={{transform: `translate(${cx - fcx * s}px, ${cy - fcy * s}px) scale(${s})`, transformOrigin: '0 0'}}>{A}</AbsoluteFill>}
      <AbsoluteFill style={{clipPath: `inset(${Math.max(0, Tp)}px ${Math.max(0, W - L - rw)}px ${Math.max(0, H - Tp - rh)}px ${Math.max(0, L)}px)`, opacity: bIn}}>
        <AbsoluteFill style={{transform: `translate(${cx - 960}px, ${cy - 540}px) scale(${bs})`, transformOrigin: '960px 540px'}}>{Bn}</AbsoluteFill>
      </AbsoluteFill>
    </>
  );
};

/** 液態波浪：珊瑚、藍兩層波浪上漲，下一章跟在最後一層浪後面 */
const wavePath = (level: number, amp: number, d: number, ph: number) => {
  let s = `M0,${H + 200}`;
  for (let x = 0; x <= W; x += 40) {
    const y = level + amp * Math.sin(x / 180 + d * 0.35 + ph) + amp * 0.45 * Math.sin(x / 77 - d * 0.5 + ph * 2);
    s += ` L${x},${y.toFixed(1)}`;
  }
  return s + ` L${W},${H + 200} Z`;
};
const wave: Tr = (d, A, Bn) => {
  const lv = (p: number) => H + 120 - p * (H + 260);
  const pc = k(d, -16, -2, EIO), pb = k(d, -12, 3, EIO), pB = k(d, -8, 12, EIO);
  return (
    <>
      {pb < 1 && A}
      <svg style={{...abs, left: 0, top: 0}} width={W} height={H}>
        <path d={wavePath(lv(pc), 50 * Math.sin(Math.PI * pc), d, 0)} fill={C.coral} />
        <path d={wavePath(lv(pb), 60 * Math.sin(Math.PI * pb), d, 2)} fill={C.blue} />
      </svg>
      {pB > 0 && <AbsoluteFill style={{clipPath: `path('${wavePath(lv(pB), 55 * Math.sin(Math.PI * pB), d, 4)}')`}}>{Bn}</AbsoluteFill>}
    </>
  );
};

/** 橫向切片：下一章切成 8 條橫向切片，左右交錯滑入（每條前緣帶色條） */
const slices: Tr = (d, A, Bn) => {
  const n = 8, sh = H / n;
  const all = k(d, -9 + (n - 1) * 1.2, -9 + (n - 1) * 1.2 + 10, EO) >= 1;
  return (
    <>
      {!all && A}
      {Array.from({length: n}, (_, j) => {
        const p = k(d, -9 + j * 1.2, -9 + j * 1.2 + 10, EO);
        if (p <= 0) return null;
        const dir = j % 2 ? 1 : -1;
        const x = dir * W * (1 - p);
        return (
          <AbsoluteFill key={j} style={{clipPath: `inset(${j * sh - 0.5}px 0 ${H - (j + 1) * sh - 0.5}px 0)`}}>
            <AbsoluteFill style={{transform: `translateX(${x}px)`}}>
              {Bn}
              {p < 1 && <div style={{...abs, top: j * sh, height: sh, width: 36, [dir > 0 ? 'left' : 'right']: -36, background: j % 2 ? C.coral : C.blue}} />}
            </AbsoluteFill>
          </AbsoluteFill>
        );
      })}
    </>
  );
};

/** 圖形放大穿越：上一章的主圖形（錨點）放大成白圓蓋滿畫面，換章拍後從中心打開一個洞穿越到下一章 */
const zoom: Tr = (d, A, Bn, prev) => {
  if (d < 0) {
    const [x, y] = prev.anchor;
    const r = interpolate(d, [-12, 0], [180, cover(x, y) + 120], {...clamp, easing: EI});
    return (
      <>
        {A}
        <svg style={{...abs, left: 0, top: 0}} width={W} height={H}><circle cx={x} cy={y} r={r} fill={C.white} /></svg>
      </>
    );
  }
  const p = k(d, 0, 15, EO);
  const R = 1200 * p;
  return (
    <>
      <AbsoluteFill style={{transform: `scale(${lerp(1.3, 1, p)})`, transformOrigin: '960px 500px'}}>{Bn}</AbsoluteFill>
      <AbsoluteFill style={{background: `radial-gradient(circle at 960px 500px, transparent ${R}px, ${C.white} ${R + 1}px)`}} />
      <svg style={{...abs, left: 0, top: 0}} width={W} height={H}>
        <circle cx={960} cy={500} r={R} fill="none" stroke={C.coral} strokeWidth={18 * (1 - p)} />
      </svg>
    </>
  );
};
const TRS: Record<string, Tr> = {bars, dot, tiles, through, wave, slices, zoom};

/* ───── 固定資訊列（只在上方；下方只有靜止角標） ───── */
const Hud: React.FC<{f: number}> = ({f}) => {
  const lastBeat = Math.floor(f / B) * B;
  const beatGlow = Math.exp(-(f - lastBeat) / 5);
  let w = 1;
  for (let i = 1; i < N; i++) w += k(f, CH[i] - 4, CH[i] + 6, EIO);
  const fadeEnd = 1 - 0.5 * k(f, T.logoHit, T.logoHit + 20);
  const mark = (style: React.CSSProperties) => <div style={{...abs, width: 26, height: 26, ...style}} />;
  const bc = `2px solid ${C.faint}`;
  const tot = String(N).padStart(2, '0');
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {mark({left: 28, top: 28, borderLeft: bc, borderTop: bc})}
      {mark({right: 28, top: 28, borderRight: bc, borderTop: bc})}
      {mark({left: 28, bottom: 28, borderLeft: bc, borderBottom: bc})}
      {mark({right: 28, bottom: 28, borderRight: bc, borderBottom: bc})}
      {T.d.hud && (
        <div style={{...abs, left: 64, top: 44, display: 'flex', alignItems: 'center', gap: 14, fontFamily: SG, fontWeight: 500, fontSize: T.d.hudSize,
          letterSpacing: 6, color: C.white, opacity: 0.75 * fadeEnd, whiteSpace: 'nowrap'}}>
          <span style={{width: 10, height: 10, borderRadius: 5, background: C.coral, opacity: 0.35 + 0.65 * beatGlow, display: 'inline-block'}} />
          {T.d.hud}
        </div>
      )}
      {/* 淡淡的深色光暈墊底：轉場白圓蓋滿畫面時，章號仍看得到 */}
      <div style={{...abs, right: 64, top: 40, display: 'flex', alignItems: 'center', gap: 22, opacity: 0.8 * fadeEnd, textShadow: '0 0 6px rgba(10,11,16,0.85), 0 0 2px rgba(10,11,16,0.9)'}}>
        <div style={{position: 'relative', width: 380, height: 24, overflow: 'hidden'}}>
          {CHS.map((c, i) => {
            const p = i === 0 ? 1 : k(f, CH[i] - 2, CH[i] + 8);
            const o = i === N - 1 ? 0 : k(f, CH[i + 1] - 4, CH[i + 1] + 4);
            if (p <= 0 || o >= 1) return null;
            return <div key={i} style={{...abs, right: 0, top: 0, fontFamily: SG, fontWeight: 500, fontSize: 18, letterSpacing: 6, color: C.dim,
              transform: `translateY(${(1 - p) * 100 - o * 100}%)`, opacity: p * (1 - o), whiteSpace: 'nowrap'}}>{c.tech}</div>;
          })}
        </div>
        <div style={{fontFamily: SG, fontWeight: 700, fontSize: 26, color: C.white, display: 'flex', lineHeight: 1, height: 26}}>
          0<DigitCol w={w} cw={0.62} /><span style={{color: C.dim, margin: '0 6px'}}>/</span>{tot}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  let ci = 0;
  while (ci + 1 < N && f >= CH[ci + 1]) ci++;
  let content: React.ReactNode = null;
  for (let i = 1; i < N; i++) {
    const [pre, post] = CHS[i].win;
    const d = f - CH[i];
    if (d >= pre && d < post) {
      content = TRS[CHS[i].trans](d, scene(i - 1, f), scene(i, f), CHS[i - 1]);
      break;
    }
  }
  if (!content) content = scene(ci, f);
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      {content}
      <Hud f={f} />
    </AbsoluteFill>
  );
};

/** 全字測試圖：用到的每個字用每一種字型（串接後）各排一次，看有沒有缺字方塊 */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  const row = (fam: string, w: number, label: string) => (
    <div style={{marginTop: 14}}>
      <div style={{fontFamily: 'monospace', fontSize: 20, color: C.coral}}>{label}</div>
      <div style={{fontFamily: fam, fontWeight: w, fontSize: 34, lineHeight: 1.22, color: C.white, wordBreak: 'break-all'}}>{txt}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{background: C.bg, padding: 30}}>
      {row(TC, 900, `Noto Sans TC 900（${FAM.tc}）`)}
      {row(ARCH, 400, `Archivo Black → Noto Sans TC（${FAM.ar}）`)}
      {row(SG, 700, `Space Grotesk 700 → Noto Sans TC（${FAM.sg}）`)}
    </AbsoluteFill>
  );
};
