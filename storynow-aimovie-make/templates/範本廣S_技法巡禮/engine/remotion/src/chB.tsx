/* data「DATA VISUALIZATION」：2～4 個面板橫向排列，每個面板結束時甩鏡到下一個
   （ring 環形圖／bars 堆疊柱／slot 吃角子老虎數字＋印章／dots 粒子聚成點陣數字）。
   grid「SWISS GRID SYSTEM」：12 欄格線畫出 → 卡片依拍點滑入 → 波浪翻面再翻回 → 每拍重排版面（輪流放大一張）→ 聚焦一張（接「鏡頭穿越卡片」）。
   原作 chB.tsx 的第 3、4 章；字全部讀 timeline.json，面板數、卡片數、每段停多久由 timeline.py 依字數排。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, ChP, DOT_FONT, EI, EIO, EO, MaskLine, Roller, abs, bell, em, k, lerp, nb, rnd, sp} from './kit';
import {ARCH, SG, TC} from './fonts';

type P = Record<string, any>;
const tag = (txt: string, col: string = C.coral, fs = 28): React.ReactNode => (
  <span style={{display: 'inline-block', padding: '6px 16px', border: `2px solid ${col}`, color: col, fontFamily: TC, fontWeight: 700,
    fontSize: fs, letterSpacing: 4, whiteSpace: 'nowrap'}}>{txt}</span>
);
/** 字串裡的數字標成白色（其餘沿用外層顏色） */
const numWhite = (s: string) => s.split(/([0-9][0-9.,:/%]*)/).map((x, i) => (i % 2 ? <span key={i} style={{color: C.white}}>{x}</span> : x));
const lockOf = (n: string, a: number, step: number) => Array.from(n.replace(/[^0-9]/g, '')).map((_, i) => a + i * step);

/* ═════════ data 面板 ═════════ */
const Ring: React.FC<{t: number; p: P}> = ({t, p}) => {
  const cx = 600, cy = 480;
  const ring = (r: number, pct: number, col: string, a: number, b: number) => {
    const c = 2 * Math.PI * r;
    const q = k(t, a, b, EIO);
    return (
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.faint} strokeWidth={38} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={col} strokeWidth={38} strokeDasharray={`${c * pct * q} ${c}`} />
      </g>
    );
  };
  const ticks = Array.from({length: 80}, (_, i) => {
    const a = (i / 80) * Math.PI * 2 - Math.PI / 2;
    const on = k(t, i * 0.35, i * 0.35 + 6);
    const big = i % 10 === 0;
    const r0 = 318, r1 = big ? 350 : 334;
    return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1}
      stroke={big ? C.white : C.dim} strokeWidth={big ? 3 : 2} opacity={on} />;
  });
  const pctU = p.unit === '%';
  return (
    <>
      <svg style={{...abs, left: 0, top: 0}} width={1920} height={1080}>
        {ticks}
        {ring(270, p.pct, C.blue, 2, 40)}
        {p.pct2 !== null && p.pct2 !== undefined && ring(206, p.pct2, C.coral, 14, 46)}
      </svg>
      {p.center && <div style={{...abs, left: cx - 190, width: 380, top: cy - 64, textAlign: 'center', fontFamily: TC, fontWeight: 900, fontSize: p.centerSize,
        color: C.white, opacity: k(t, 8, 18), whiteSpace: 'nowrap'}}>{p.center}</div>}
      {p.centerSub && <div style={{...abs, left: cx - 190, width: 380, top: cy + 14, textAlign: 'center', fontFamily: TC, fontWeight: 700, fontSize: p.centerSubSize,
        color: C.dim, opacity: k(t, 12, 22), whiteSpace: 'nowrap'}}>{p.centerSub}</div>}
      <div style={{...abs, left: 1040, top: 190}}>
        {p.tag && <MaskLine p={k(t, 0, 10)}>{tag(p.tag, C.blue, p.tagSize)}</MaskLine>}
        <div style={{fontFamily: ARCH, fontSize: p.big, lineHeight: 1, color: C.white, marginTop: 18, height: p.big, display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap'}}>
          <Roller value={p.n} t={t} start={2} lock={lockOf(p.n, 30, 8)} />
          {p.unit && <span style={{color: C.blue, fontFamily: pctU ? ARCH : TC, fontWeight: 900, fontSize: pctU ? p.big : p.big * 0.6,
            marginLeft: pctU ? 0 : 14, lineHeight: 1, paddingBottom: pctU ? 0 : p.big * 0.06}}>{p.unit}</span>}
        </div>
        {p.head && <MaskLine p={k(t, 16, 28)} style={{fontFamily: TC, fontWeight: 900, fontSize: p.headSize, color: C.white, marginTop: 8, whiteSpace: 'nowrap'}}>{p.head}</MaskLine>}
        {(p.n2 || p.note) && <div style={{width: 680 * k(t, 22, 36, EIO), height: 2, background: C.faint, margin: '26px 0'}} />}
        {p.n2 && (
          <div style={{display: 'flex', alignItems: 'flex-end', gap: 18}}>
            {p.pre2 && <MaskLine p={k(t, 20, 30)} style={{fontFamily: TC, fontWeight: 900, fontSize: p.pre2Size, color: C.white, paddingBottom: 14, whiteSpace: 'nowrap'}}>{p.pre2}</MaskLine>}
            <div style={{fontFamily: ARCH, fontSize: 120, lineHeight: 1, height: 120, color: C.coral, opacity: k(t, 18, 24), display: 'flex', alignItems: 'flex-end', whiteSpace: 'nowrap'}}>
              <Roller value={p.n2} t={t} start={18} lock={lockOf(p.n2, 40, 6)} />
              {p.unit2 && <span style={{fontFamily: p.unit2 === '%' ? ARCH : TC, fontWeight: 900, fontSize: p.unit2 === '%' ? 120 : 72, marginLeft: 6}}>{p.unit2}</span>}
            </div>
          </div>
        )}
        {p.note && <MaskLine p={k(t, 28, 40)} style={{fontFamily: TC, fontWeight: 700, fontSize: p.noteSize, color: C.dim, marginTop: 14, whiteSpace: 'nowrap'}}>{p.note}</MaskLine>}
      </div>
    </>
  );
};

const Bars: React.FC<{t: number; p: P}> = ({t, p}) => {
  const N = p.slabs as number;
  const step = Math.min(27, 640 / N);
  return (
    <>
      {Array.from({length: N}, (_, i) => {
        const q = k(t, 2 + i * Math.min(1.35, 32 / N), 12 + i * Math.min(1.35, 32 / N));
        const top = i === N - 1;
        const w = top ? 420 : 360;
        return (
          <div key={i} style={{...abs, left: 560 - w / 2, top: 830 - i * step - 120 * (1 - q), width: w, height: step * 0.74,
            background: top ? C.coral : i % 6 === 5 ? C.white : C.blue, opacity: q * (top ? 1 : 0.55 + 0.45 * (i / (N - 1)))}} />
        );
      })}
      <div style={{...abs, left: 800, top: 830 - (N - 1) * step, width: 2, height: (N - 1) * step + 20, background: C.faint, transform: `scaleY(${k(t, 0, 30)})`,
        transformOrigin: 'bottom'}} />
      {Array.from({length: 5}, (_, i) => (
        <div key={i} style={{...abs, left: 800, top: 840 - (i * (N - 1) * step) / 4, width: 22, height: 2, background: C.dim, opacity: k(t, 4 + i * 6, 10 + i * 6)}} />
      ))}
      <div style={{...abs, left: 1000, top: 200}}>
        {p.tag && <MaskLine p={k(t, 0, 10)}>{tag(p.tag, C.coral, p.tagSize)}</MaskLine>}
        {p.head && <MaskLine p={k(t, 4, 14)} style={{fontFamily: TC, fontWeight: 900, fontSize: p.headSize, color: C.white, marginTop: 20, whiteSpace: 'nowrap'}}>{p.head}</MaskLine>}
        <div style={{display: 'flex', alignItems: 'flex-end', marginTop: 6}}>
          <div style={{fontFamily: ARCH, fontSize: p.big, lineHeight: 1, height: p.big, color: C.white, whiteSpace: 'nowrap'}}>
            <Roller value={p.n} t={t} start={4} lock={lockOf(p.n, 30, 8)} />
          </div>
          {p.unit && <div style={{fontFamily: TC, fontWeight: 900, fontSize: p.unitSize, color: C.coral, lineHeight: 1, marginLeft: 16, paddingBottom: p.big * 0.085,
            transform: `scale(${sp(t, 38, 10, 300)})`, transformOrigin: 'left bottom', whiteSpace: 'nowrap'}}>{p.unit}</div>}
        </div>
        {p.note && <MaskLine p={k(t, 30, 42)} style={{fontFamily: TC, fontWeight: 700, fontSize: p.noteSize, color: C.dim, marginTop: 18, whiteSpace: 'nowrap'}}>{p.note}</MaskLine>}
      </div>
    </>
  );
};

const Slot: React.FC<{t: number; p: P}> = ({t, p}) => {
  const digits = (p.n as string).split('');
  const bw = p.bw as number, x0 = p.x0 as number;
  const stamp = sp(t, nb(3) - 2, 11, 320);
  const hiSet = new Set(Array.from(p.hi as string));
  const us = (130 * bw) / 200;
  let di = 0;
  return (
    <>
      <div style={{...abs, left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: TC, fontWeight: 900, fontSize: p.headSize, color: C.white,
        letterSpacing: p.headSize * 0.1, whiteSpace: 'nowrap'}}>
        <MaskLine p={k(t, -2, 10)}>{Array.from(p.head as string).map((ch, i) => (hiSet.has(ch) ? <span key={i} style={{color: C.coral}}>{ch}</span> : ch))}</MaskLine>
      </div>
      {digits.map((d, i) => {
        const isD = /[0-9]/.test(d);
        const lock = 12 + (isD ? di++ : di) * 7;
        const lockFlash = isD && t >= lock ? Math.exp(-(t - lock) / 5) : 0;
        return (
          <div key={i} style={{...abs, left: x0 + i * bw, top: 380, width: bw * 0.9, height: bw * 1.25, background: C.bg2, overflow: 'hidden',
            border: `3px solid ${lockFlash > 0.05 ? C.coral : C.faint}`, opacity: k(t, i * 1.5, i * 1.5 + 6)}}>
            <div style={{fontFamily: ARCH, fontSize: bw, lineHeight: 1, color: C.white, textAlign: 'center', marginTop: bw * 0.12}}>
              <Roller value={d} t={t} start={0} lock={[lock]} laps={2} cw={0.9} />
            </div>
            <div style={{...abs, left: 0, right: 0, top: bw * 0.615, height: 2, background: 'rgba(0,0,0,0.5)'}} />
          </div>
        );
      })}
      {p.unit && <div style={{...abs, left: x0 + digits.length * bw + 10, top: 380 + bw * 1.25 - us * 1.25, fontFamily: TC, fontWeight: 900, fontSize: us,
        color: C.white, opacity: k(t, 40, 46), whiteSpace: 'nowrap'}}>{p.unit}</div>}
      {p.note && (
        <div style={{...abs, left: 0, right: 0, top: 700, textAlign: 'center', fontFamily: TC, fontWeight: 700, fontSize: p.noteSize, color: C.dim, whiteSpace: 'nowrap'}}>
          <MaskLine p={k(t, 40, 50)}>{numWhite(p.note)}</MaskLine>
        </div>
      )}
      {p.stamp && (
        <div style={{...abs, left: p.stampX - 110, top: 300 - 110, width: 220, height: 220, borderRadius: '50%', background: C.coral, color: C.white,
          fontFamily: TC, fontWeight: 900, fontSize: p.stampSize, lineHeight: '220px', textAlign: 'center', opacity: Math.min(1, stamp * 3), whiteSpace: 'nowrap',
          transform: `rotate(${-14 + (1 - stamp) * 40}deg) scale(${lerp(2.4, 1, stamp)})`, boxShadow: `0 0 0 10px ${C.bg}, 0 0 0 14px ${C.coral}`}}>{p.stamp}</div>
      )}
    </>
  );
};

const Dots: React.FC<{t: number; p: P}> = ({t, p}) => {
  const str = p.n as string;
  const s = p.dsp as number, x0 = 250, y0 = 502 - 3 * s;
  const dots: React.ReactNode[] = [];
  str.split('').forEach((ch, ci) => {
    const g = DOT_FONT[ch];
    if (!g) return;
    const hot = !/[0-9]/.test(ch);
    g.forEach((row, ry) => row.split('').forEach((v, rx) => {
      const x = x0 + ci * 6 * s + rx * s, y = y0 + ry * s;
      const id = `${ci}-${rx}-${ry}`;
      if (v === '0') {
        dots.push(<circle key={id} cx={x} cy={y} r={4 * (s / 44)} fill={C.faint} opacity={k(t, 0, 10)} />);
        return;
      }
      const at = (rnd(`d${id}`) + 1) * 7 - 2;
      const q = k(t, at, at + 20, EO);
      const sx = 960 + rnd(`x${id}`) * 1000, sy = 470 + rnd(`y${id}`) * 360;
      dots.push(<circle key={id} cx={lerp(sx, x, q)} cy={lerp(sy, y, q)} r={lerp(5, 17 * (s / 44), q)} fill={hot ? C.coral : C.white} opacity={Math.min(1, q * 2)} />);
    }));
  });
  const bottom = y0 + 6 * s + 17 * (s / 44);
  return (
    <>
      <div style={{...abs, left: x0 - 20, top: 130}}>
        {p.tag && <MaskLine p={k(t, -2, 8)}>{tag(p.tag, C.blue, p.tagSize)}</MaskLine>}
        {p.head && <MaskLine p={k(t, 2, 12)} style={{fontFamily: TC, fontWeight: 900, fontSize: p.headSize, color: C.white, marginTop: 14, whiteSpace: 'nowrap'}}>{p.head}</MaskLine>}
      </div>
      <svg style={{...abs, left: 0, top: 0}} width={1920} height={1080}>{dots}</svg>
      {p.unit && <div style={{...abs, left: p.ux, top: bottom - p.unitSize * 1.02, fontFamily: TC, fontWeight: 900, fontSize: p.unitSize, lineHeight: 1, color: C.white,
        transform: `scale(${sp(t, 26, 11, 260)})`, transformOrigin: 'left bottom', whiteSpace: 'nowrap'}}>{p.unit}</div>}
      {(p.unit2 as string[]).length > 0 && (
        <div style={{...abs, left: p.u2x, top: bottom - (p.unit2.length * 121), fontFamily: TC, fontWeight: 900, fontSize: 110, color: C.coral, lineHeight: 1.1}}>
          {(p.unit2 as string[]).map((ch, i) => <MaskLine key={i} p={k(t, 32 + i * 3, 42 + i * 3)}>{ch}</MaskLine>)}
        </div>
      )}
      {p.note && <div style={{...abs, left: x0 - 20, top: 770, fontFamily: TC, fontWeight: 700, fontSize: p.noteSize, color: C.dim, whiteSpace: 'nowrap'}}>
        <MaskLine p={k(t, 30, 42)}>{p.note}</MaskLine>
      </div>}
    </>
  );
};

const PANELS: Record<string, React.FC<{t: number; p: P}>> = {ring: Ring, bars: Bars, slot: Slot, dots: Dots};

export const ChData: React.FC<ChP> = ({t, c}) => {
  const ps = c.panels as P[];
  let cam = 0, skew = 0;
  for (let i = 1; i < ps.length; i++) {
    const b = nb(ps[i].at);
    const raw = k(t, b - 8, b + 5, (x) => x);
    cam += EIO(raw);
    skew += bell(raw);
  }
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {/* 背景：面板編號大字（跟著鏡頭慢一點移動，做出視差） */}
      {ps.map((_, i) => (
        <div key={i} style={{...abs, left: 1040 + (i - cam) * 1100, top: 700, fontFamily: ARCH, fontSize: 200, color: 'transparent',
          WebkitTextStroke: `2px ${C.line}`, lineHeight: 1}}>{`0${i + 1}`}</div>
      ))}
      <div style={{...abs, inset: 0, transform: `translateX(${-cam * 1920}px) skewX(${-skew * 7}deg)`}}>
        {ps.map((p, i) => {
          if (Math.abs(cam - i) > 1) return null;
          const V = PANELS[p.kind];
          return (
            <div key={i} style={{...abs, left: i * 1920, top: 0, width: 1920, height: 1080}}>
              <V t={t - nb(p.at) + (i ? 6 : 0)} p={p} />
            </div>
          );
        })}
      </div>
      <div style={{...abs, left: 120, top: 120, display: 'flex', gap: 10}}>
        {ps.map((_, i) => (
          <div key={i} style={{width: 60, height: 6, background: C.faint, overflow: 'hidden'}}>
            <div style={{width: `${Math.max(0, Math.min(1, cam - i + 1)) * 100}%`, height: '100%', background: C.coral}} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ═════════ grid ═════════ */
type Rect = [number, number, number, number];
const X0 = 120, Y0 = 220, AW = 1680, AH = 650;
const GBG = [C.bg3, C.blue, C.coral];

const Card: React.FC<{it: P; i: number; r: Rect; back: boolean; plan: number}> = ({it, i, r, back, plan}) => {
  const [, , w, h] = r;
  const fs = Math.min(h * 0.3, (w - 56) / Math.max(1, em(it.name)), 92);
  const face: React.CSSProperties = {...abs, inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden'};
  const bg = back ? (it.g === 2 ? C.bg : C.white) : GBG[it.g];
  const fg = back ? (it.g === 0 ? C.bg : it.g === 1 ? C.blue : C.coral) : C.white;
  const bt = it.note || it.name;
  return (
    <div style={{...face, background: bg, transform: back ? 'rotateY(180deg)' : undefined, border: it.g === 0 && !back ? `2px solid ${C.faint}` : undefined}}>
      <div style={{...abs, left: 22, top: 16, fontFamily: SG, fontWeight: 700, fontSize: 22, color: fg, opacity: 0.8}}>{String(i + 1).padStart(2, '0')}</div>
      <div style={{...abs, right: 20, top: 12, fontFamily: SG, fontWeight: 500, fontSize: 26, color: fg, opacity: 0.6}}>+</div>
      {!back ? (
        <>
          <div style={{...abs, left: 22, bottom: 18 + fs * 0.62, fontFamily: TC, fontWeight: 900, fontSize: fs, color: fg, whiteSpace: 'nowrap', lineHeight: 1.1}}>{it.name}</div>
          {it.note && <div style={{...abs, left: 24, bottom: 16, fontFamily: TC, fontWeight: 700, fontSize: Math.max(18, fs * 0.36), color: fg, opacity: 0.6, whiteSpace: 'nowrap'}}>{it.note}</div>}
        </>
      ) : (
        <div style={{...abs, left: 22, right: 22, bottom: 20, fontFamily: TC, fontWeight: 900, fontSize: Math.min(h * 0.22, (w - 50) / Math.max(1, em(bt, 0.62)), 56),
          color: fg, lineHeight: 1.15}}>{bt}</div>
      )}
      {plan > 0 && !back && (
        <div style={{...abs, inset: 0, background: C.bg2, opacity: plan,
          backgroundImage: `linear-gradient(${C.line} 2px, transparent 2px), linear-gradient(90deg, ${C.line} 2px, transparent 2px)`, backgroundSize: '40px 40px'}}>
          <div style={{...abs, left: 26, top: 22, fontFamily: TC, fontWeight: 900, fontSize: Math.min(64, (w - 52) / Math.max(1, em(it.name))), color: C.white, whiteSpace: 'nowrap'}}>{it.name}</div>
          {it.note && <div style={{...abs, left: 30, top: 22 + Math.min(64, (w - 52) / Math.max(1, em(it.name))) * 1.35, fontFamily: TC, fontWeight: 700,
            fontSize: Math.min(30, (w - 60) / Math.max(1, em(it.note))), color: C.coral, whiteSpace: 'nowrap'}}>{it.note}</div>}
        </div>
      )}
    </div>
  );
};

/** 標題裡的數字用 Archivo Black、珊瑚／藍交替 */
const numArch = (s: string) => s.split(/([0-9]+)/).map((x, i) => (i % 2 ? <span key={i} style={{color: (i >> 1) % 2 ? C.blue : C.coral, fontFamily: ARCH}}>{x}</span> : x));

export const ChGrid: React.FC<ChP> = ({t, c}) => {
  const items = c.items as P[];
  const L0 = c.L0 as Rect[];
  const lays = c.lays as {at: number; L: Rect[]}[];
  const b = c.b as Record<string, number>;
  const cols = c.cols as number;
  const rectAt = (i: number): Rect => {
    let r = L0[i];
    for (const ly of lays) {
      const p = k(t, nb(ly.at) - 3, nb(ly.at) + 8, EIO);
      if (p <= 0) break;
      const n = ly.L[i];
      r = [lerp(r[0], n[0], p), lerp(r[1], n[1], p), lerp(r[2], n[2], p), lerp(r[3], n[3], p)];
    }
    return r;
  };
  const out = k(t, nb(b.out), nb(b.out + 1) + 4);
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <svg style={{...abs, left: 0, top: 0, opacity: 1 - out}} width={1920} height={1080}>
        {Array.from({length: 13}, (_, i) => {
          const p = k(t, i * 0.9, i * 0.9 + 14, EIO);
          const x = X0 + (i * AW) / 12;
          return <line key={i} x1={x} y1={Y0 - 20} x2={x} y2={Y0 - 20 + (AH + 40) * p} stroke={i % 3 === 0 ? C.faint : C.line} strokeWidth={2} />;
        })}
        {[0, 1, 2, 3].map((i) => {
          const p = k(t, 4 + i * 2, 18 + i * 2, EIO);
          const y = Y0 + (i * AH) / 3;
          return <line key={i} x1={X0 - 20} y1={y} x2={X0 - 20 + (AW + 40) * p} y2={y} stroke={C.line} strokeWidth={2} />;
        })}
        {Array.from({length: 12}, (_, i) => (
          <text key={i} x={X0 + (i * AW) / 12 + 8} y={Y0 - 30} fill={C.dim} fontFamily={SG} fontSize={14} opacity={k(t, 6 + i, 12 + i)}>{String(i + 1).padStart(2, '0')}</text>
        ))}
      </svg>
      {c.head && (
        <div style={{...abs, left: X0, top: 104, fontFamily: TC, fontWeight: 900, fontSize: c.headSize, color: C.white, opacity: 1 - out, whiteSpace: 'nowrap'}}>
          <MaskLine p={k(t, 0, 12)}>{numArch(c.head)}</MaskLine>
        </div>
      )}
      {c.tag && <div style={{...abs, right: X0, top: 128, fontFamily: SG, fontWeight: 500, fontSize: 22, letterSpacing: 8, color: C.dim, opacity: k(t, 4, 14) * (1 - out)}}>{c.tag}</div>}
      {items.map((it, i) => {
        const row = Math.floor(i / cols), col = i % cols;
        const at = nb(1 + row) + col * 2;
        const p = k(t, at, at + 12);
        if (t < at - 1) return null;
        const dir = row % 2 ? 1 : -1;
        const r = rectAt(i);
        const d = (row + col) * 2.2;
        const rot = 180 * k(t, nb(b.flip1) + d, nb(b.flip1) + d + 11, EIO) + 180 * k(t, nb(b.flip2) + d, nb(b.flip2) + d + 11, EIO);
        const isF = i === c.focus;
        const gone = isF ? 0 : k(t, nb(b.out) + i * 0.8, nb(b.out) + i * 0.8 + 9, EI);
        const plan = isF ? k(t, nb(b.out), nb(b.out + 1)) : 0;
        return (
          <div key={i} style={{...abs, left: r[0] + dir * 800 * (1 - p), top: r[1], width: r[2], height: r[3], opacity: Math.min(1, p * 2) * (1 - gone),
            transform: `perspective(1600px) rotateY(${rot}deg) scale(${1 - gone * 0.5})`, transformStyle: 'preserve-3d'}}>
            <Card it={it} i={i} r={r} back={false} plan={plan} />
            <Card it={it} i={i} r={r} back plan={0} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
