/* open「KINETIC TYPE」：中央細線畫開 → 三個幾何形狀依拍點彈出、每拍硬切大字、螺旋收攏 → 爆開成名稱大字（上下切片位移）＋英文縮寫描邊飛入再填色
   type「TYPE DECONSTRUCT」：兩行字逐字砸入、合併成一行、描邊／填色波浪交替、切片位移、翻轉、重點字以外退暗、炸散，
   最後只留中間的珊瑚色圓點放大成圓（接下一章的圓形擦除）。
   原作 chA.tsx 的第 1、2 章；字全部讀 timeline.json，章內拍點由 timeline.py 依字數伸縮。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, C, ChP, EI, EIO, EO, LAB, abs, bell, k, lerp, nb, rnd, sp, warp} from './kit';
import {ARCH, SG, TC} from './fonts';

/* ═════════ open ═════════ */
const CX = 960, CY = 500;
const random01 = (s: string) => (rnd(s) + 1) / 2;
const PARTS = Array.from({length: 54}, (_, j) => ({
  a: random01(`pa${j}`) * Math.PI * 2,
  d: 420 + random01(`pd${j}`) * 900,
  s: 10 + random01(`ps${j}`) * 26,
  r: rnd(`pr${j}`) * 540,
  kind: j % 3,
  col: [C.blue, C.coral, C.white][(j * 7) % 3],
}));

export const Shape: React.FC<{kind: number; size: number; color: string; outline?: boolean}> = ({kind, size, color, outline}) => {
  const st = outline ? {fill: 'none', stroke: color, strokeWidth: 9} : {fill: color};
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{overflow: 'visible', display: 'block'}}>
      {kind === 0 && <circle r={46} {...st} />}
      {kind === 1 && <rect x={-42} y={-42} width={84} height={84} {...st} />}
      {kind === 2 && <polygon points="0,-48 44,36 -44,36" {...st} strokeLinejoin="miter" />}
    </svg>
  );
};
/** 「●」標成珊瑚色 */
const dotted = (s: string) => s.split('●').flatMap((x, i) => (i ? [<span key={i} style={{color: C.coral}}>●</span>, x] : [x]));

export const ChOpen: React.FC<ChP> = ({t: t0, c}) => {
  const t = warp(t0, c.warp);
  const n8 = nb(8);
  const lineW = 1500 * k(t, 0, 10);
  const lineFade = 1 - k(t, nb(4), nb(5));
  const conv = k(t, nb(4), n8 - 1, EI);
  const theta = conv * Math.PI * 2.6;
  const beatPulse = (n: number) => (t >= nb(n) ? Math.exp(-(t - nb(n)) / 4) : 0);
  const pulse = beatPulse(5) + beatPulse(6) + beatPulse(7);
  const shapes = [
    {kind: 0, x0: -300, col: C.blue, at: nb(1), outline: false},
    {kind: 1, x0: 0, col: C.coral, at: nb(2), outline: false},
    {kind: 2, x0: 300, col: C.white, at: nb(3), outline: true},
  ];
  const collide = 1 - k(t, n8 - 3, n8, EI);
  const ex = k(t, n8, n8 + 34);
  const ring = k(t, n8, n8 + 26, EO);
  const flash = t >= n8 ? 0.5 * (1 - k(t, n8, n8 + 6, (x) => x)) : 0;
  const chars = c.title as string[];
  const S = c.titleSize as number;
  const fillWipe = k(t, nb(12), nb(12) + 9, EIO);
  const slice = (n: number) => 46 * (S / 300) * bell(k(t, nb(n), nb(n) + 9, (x) => x));
  const sl = slice(12) + slice(14) * -1;
  const riser = k(t, nb(14), nb(16), EI);
  const marqX = 1500 - (t - nb(10)) * 16;
  const words = c.words as string[];
  const mark = c.mark as string[];
  const mS = c.markSize as number, mCell = mS * 0.89;
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {/* 背景：巨大描邊字橫移 */}
      {t > nb(10) && LAB.marquee && (
        <div style={{...abs, left: marqX, top: 330, fontFamily: ARCH, fontSize: 400, lineHeight: 1, color: 'transparent',
          WebkitTextStroke: `3px ${C.blue}`, whiteSpace: 'nowrap', opacity: 0.55 * k(t, nb(10), nb(11))}}>{LAB.marquee}</div>
      )}
      {/* 第 2 小節：每拍硬切的大字 */}
      {t >= nb(4) && t < n8 && words.length > 0 && (() => {
        const i = Math.min(words.length - 1, Math.floor((t - nb(4)) / B));
        const s = 1 + 0.12 * Math.exp(-(t - nb(4 + i)) / 3);
        return (
          <div style={{...abs, left: 0, right: 0, top: CY - 150, textAlign: 'center', fontFamily: ARCH, fontSize: 280, lineHeight: 1,
            color: i % 2 ? 'transparent' : 'rgba(244,239,230,0.1)', WebkitTextStroke: i % 2 ? `3px ${C.faint}` : undefined,
            transform: `scale(${s})`, letterSpacing: 10, whiteSpace: 'nowrap'}}>{words[i]}</div>
        );
      })()}
      {/* 中央細線＋兩端小標 */}
      <div style={{...abs, left: CX - lineW / 2, top: CY - 1, width: lineW, height: 2, background: C.white, opacity: 0.7 * lineFade}} />
      <div style={{...abs, left: CX - 750, top: CY + 18, fontFamily: SG, fontWeight: 500, fontSize: c.tagSize, letterSpacing: 6, color: C.dim,
        opacity: k(t, 4, 14) * lineFade, whiteSpace: 'nowrap'}}>{c.tag}</div>
      <div style={{...abs, left: CX + 750 - 560, width: 560, textAlign: 'right', top: CY + 18, fontFamily: SG, fontWeight: 500, fontSize: 18,
        letterSpacing: 6, color: C.dim, opacity: k(t, 4, 14) * lineFade, whiteSpace: 'nowrap'}}>{c.reel}</div>
      {/* 三個幾何形狀 */}
      {t < n8 && shapes.map((s, i) => {
        const p = sp(t, s.at, 10, 260);
        const r = s.x0 * (1 - conv);
        const x = r * Math.cos(theta), y = r * Math.sin(theta) * 0.62;
        const spin = (1 - p) * -120 + conv * (i === 1 ? 540 : 260) * (i === 2 ? -1 : 1);
        const sc = p * (1 + 0.16 * pulse) * lerp(1, 0.55, conv) * collide;
        return (
          <div key={i} style={{...abs, left: CX + x - 90, top: CY + y - 90, width: 180, height: 180, transform: `rotate(${spin}deg) scale(${sc})`}}>
            <Shape kind={s.kind} size={180} color={s.col} outline={s.outline} />
          </div>
        );
      })}
      {/* 震波環 */}
      {t >= n8 && ring < 1 && (
        <svg style={{...abs, left: 0, top: 0}} width={1920} height={1080}>
          <circle cx={CX} cy={CY} r={40 + 1150 * ring} fill="none" stroke={C.white} strokeWidth={34 * (1 - ring)} opacity={1 - ring} />
          <circle cx={CX} cy={CY} r={20 + 760 * k(t, n8 + 2, n8 + 30)} fill="none" stroke={C.coral} strokeWidth={14 * (1 - ring)} opacity={1 - ring} />
        </svg>
      )}
      {/* 爆開的碎片 */}
      {t >= n8 && ex < 1 && PARTS.map((q, j) => {
        const fade = 1 - k(t, n8 + 14, n8 + 34, (x) => x);
        const x = CX + Math.cos(q.a) * q.d * ex, y = CY + Math.sin(q.a) * q.d * ex * 0.38;
        return (
          <div key={j} style={{...abs, left: x - q.s / 2, top: y - q.s / 2, width: q.s, height: q.s, opacity: fade, transform: `rotate(${q.r * ex}deg)`}}>
            <Shape kind={q.kind} size={q.s} color={q.col} outline={j % 4 === 0} />
          </div>
        );
      })}
      {/* 主標題群（最後一小節整群推近，接轉場） */}
      <div style={{...abs, inset: 0, transform: `scale(${1 + 0.16 * riser})`, transformOrigin: `${CX}px ${CY}px`}}>
        {t > nb(10) - 2 && c.kicker && (
          <div style={{...abs, left: 0, right: 0, top: 226 - Math.max(0, S - 300) * 0.5, textAlign: 'center', fontFamily: SG, fontWeight: 700,
            fontSize: c.kickerSize, letterSpacing: c.kickerSize * 0.7, color: C.white, overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <div style={{transform: `translateY(${(1 - k(t, nb(10), nb(10) + 10)) * 110}%)`}}>{dotted(c.kicker)}</div>
          </div>
        )}
        {/* 名稱：上下兩半各自位移（切片） */}
        {t >= n8 && chars.map((ch, j) => {
          const p = sp(t, n8 + j * Math.min(3, 12 / chars.length), 13, 240);
          const sc = lerp(2.4, 1, p);
          const [x, wd] = c.titleX[j] as [number, number];
          const half = (top: boolean) => (
            <div style={{...abs, inset: 0, clipPath: top ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)', transform: `translateX(${(top ? 1 : -1) * sl}px)`}}>{ch}</div>
          );
          return (
            <div key={j} style={{...abs, left: x - wd / 2, top: 465 - S * 0.55, width: wd, height: S * 1.1, fontFamily: TC, fontWeight: 900, fontSize: S,
              lineHeight: `${S * 1.1}px`, textAlign: 'center', color: C.white, opacity: Math.min(1, p * 2.5), transform: `scale(${sc})`}}>
              {half(true)}
              {half(false)}
            </div>
          );
        })}
        {/* 英文縮寫：先描邊飛入，第 12 拍由左往右填色 */}
        {t >= nb(9) && mark.map((ch, j) => {
          if (ch === ' ') return null;
          const p = sp(t, nb(9) + j * Math.min(2.2, 12 / mark.length), 14, 220);
          const fx = CX + (j - (mark.length - 1) / 2) * mCell;
          const x = lerp(CX, fx, p), y = lerp(CY, 726 + Math.max(0, S - 300) * 0.3, p);
          const st: React.CSSProperties = {...abs, inset: 0, textAlign: 'center', lineHeight: `${mS * 1.07}px`};
          return (
            <div key={j} style={{...abs, left: x - mCell / 2, top: y - mS * 0.535, width: mCell, height: mS * 1.07, fontFamily: ARCH, fontSize: mS,
              transform: `scale(${p}) rotate(${(1 - p) * 90}deg)`}}>
              <div style={{...st, color: 'transparent', WebkitTextStroke: `4px ${C.coral}`}}>{ch}</div>
              <div style={{...st, color: C.coral, clipPath: `inset(0 ${100 - Math.max(0, Math.min(100, fillWipe * mark.length * 100 - j * 100))}% 0 0)`}}>{ch}</div>
            </div>
          );
        })}
      </div>
      {flash > 0 && <AbsoluteFill style={{background: C.white, opacity: flash}} />}
    </AbsoluteFill>
  );
};

/* ═════════ type ═════════ */
const LY = 480;
type Glyph = {ch: string; row: 0 | 1; i: number; j: number; idx: number};

export const ChType: React.FC<ChP> = ({t, c}) => {
  const r1 = c.r1 as string[], r2 = c.r2 as string[];
  const n1 = r1.length, n2 = r2.length, N = c.n as number;
  const CELL = c.cell as number, SP = c.sp as number, FS = (210 * CELL) / 250;
  const b = c.b as Record<string, number>;
  const hi = new Set(c.hi as number[]);
  const jc = n1; // 圓點的位置
  const xOf = (j: number) => 960 + (j - (N - 1) / 2) * SP;
  const glyphs: Glyph[] = [
    ...r1.map((ch, i) => ({ch, row: 0 as const, i, j: i, idx: i})),
    ...r2.map((ch, i) => ({ch, row: 1 as const, i, j: n1 + 1 + i, idx: n1 + i})),
  ];
  const merge = (j: number) => k(t, nb(b.m) - 3 + j * 0.7, nb(b.m) + 9 + j * 0.7, EIO);
  const marq = -(t + 40) * 4;
  const dotIn = sp(t, nb(b.m) + 4, 9, 260);
  const dotGrow = k(t, nb(b.boom), nb(b.boom + 1), EO);
  const dotR = 16 * dotIn + 44 * dotGrow;
  const bgOut = 1 - k(t, nb(b.boom - 1), nb(b.boom));
  const mScale = Math.min(1, (SP / CELL) * 1.03);
  const rowAt = (row: number, i: number) => nb(row ? b.r2 + i * 0.5 : i * 0.5);
  const marquee = `${c.marquee}　${c.marquee}　${c.marquee}　${c.marquee}`;
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      {/* 背景：極淡的描邊字跑馬 */}
      {[0, 1].map((r) => (
        <div key={r} style={{...abs, left: r ? -marq - 2400 : marq, top: r ? 90 : 740, fontFamily: TC, fontWeight: 900, fontSize: 120, color: 'transparent',
          WebkitTextStroke: `2px ${C.line}`, whiteSpace: 'nowrap', letterSpacing: 30, opacity: bgOut}}>{marquee}</div>
      ))}
      {/* 兩行時的基準線 */}
      {[0, 1].map((r) => {
        const n = r ? n2 : n1;
        if (!n) return null;
        const p = k(t, rowAt(r, 0), rowAt(r, 0) + 16);
        const w = (n * CELL + 60) * p * (1 - merge(N / 2));
        return <div key={r} style={{...abs, left: 960 - w / 2, top: (r ? 600 : 300) + CELL * 0.52, width: w, height: 3, background: r ? C.coral : C.blue}} />;
      })}
      {glyphs.map((g) => {
        const at = rowAt(g.row, g.i);
        const p = sp(t, at, 14, 280, 0.7);
        if (t < at - 1) return null;
        const m = merge(g.j);
        const n = g.row ? n2 : n1;
        const x2 = 960 + (g.i - (n - 1) / 2) * CELL, y2 = g.row ? 600 : 300;
        let x = lerp(x2, xOf(g.j), m), y = lerp(y2, LY, m);
        let sc = lerp(1, mScale, m), skew = 0;
        if (g.row === 0) {
          y += (g.i % 2 ? 1 : -1) * 420 * (1 - p);
          sc *= 1 + 0.9 * (1 - p);
        } else {
          x += 1100 * (1 - p);
          skew = -24 * (1 - p);
        }
        const base = (g.i + g.row) % 2 === 0 ? 1 : 0;
        const f1 = k(t, nb(b.fill1) + g.j * 1.3, nb(b.fill1) + g.j * 1.3 + 5);
        const f2 = k(t, nb(b.fill2) + g.j * 1.3, nb(b.fill2) + g.j * 1.3 + 5);
        const fill = lerp(lerp(base, 1 - base, f1), base, f2);
        const sl = 54 * (CELL / 250) * bell(k(t, nb(b.slice) + g.j * 0.6, nb(b.slice) + g.j * 0.6 + 10, (q) => q));
        const flip = 360 * k(t, nb(b.flip) + g.j * 1.4, nb(b.flip) + g.j * 1.4 + 12, EIO);
        const isHi = hi.has(g.idx);
        const dimOut = isHi || hi.size === 0 ? 0 : k(t, nb(b.dim), nb(b.dim) + 8);
        const fly = k(t, nb(b.boom) + Math.abs(g.j - jc) * 0.8, nb(b.boom) + 12 + Math.abs(g.j - jc) * 0.8, EI);
        x += (g.j - jc) * 520 * (SP / 190) * fly;
        y += rnd(`fy${g.j}`) * 500 * fly;
        const col = isHi ? C.coral : C.white;
        const half = (top: boolean) => (
          <div style={{...abs, inset: 0, clipPath: top ? 'inset(0 0 50% 0)' : 'inset(50% 0 0 0)', transform: `translateX(${(top ? 1 : -1) * sl}px)`}}>
            <div style={{...abs, inset: 0, color: 'transparent', WebkitTextStroke: `4px ${col}`, opacity: 1 - dimOut * 0.7}}>{g.ch}</div>
            <div style={{...abs, inset: 0, color: col, opacity: fill * (1 - dimOut * 0.85)}}>{g.ch}</div>
          </div>
        );
        return (
          <div key={g.j} style={{...abs, left: x - CELL / 2, top: y - CELL / 2, width: CELL, height: CELL, fontFamily: TC, fontWeight: 900,
            fontSize: FS, lineHeight: `${CELL}px`, textAlign: 'center', opacity: Math.min(1, p * 3) * (1 - fly),
            transform: `perspective(900px) scale(${sc}) skewX(${skew}deg) rotateX(${flip}deg) rotate(${(g.j - jc) * 30 * fly}deg)`}}>
            {half(true)}
            {half(false)}
          </div>
        );
      })}
      {/* 重點字底線（退暗那一拍）＋中間的珊瑚點 */}
      {glyphs.filter((g) => hi.has(g.idx)).map((g, q) => {
        const p = k(t, nb(b.dim) + q * 2, nb(b.dim) + q * 2 + 10) * (1 - k(t, nb(b.boom), nb(b.boom) + 6));
        const w = SP * 0.86;
        return <div key={g.j} style={{...abs, left: xOf(g.j) - w / 2, top: LY + CELL * mScale * 0.42, width: w * p, height: 8, background: C.coral}} />;
      })}
      {dotR > 0.5 && (
        <div style={{...abs, left: c.dotX - dotR, top: LY - dotR, width: dotR * 2, height: dotR * 2, borderRadius: '50%', background: C.coral}} />
      )}
      {c.sub && (
        <div style={{...abs, left: 0, right: 0, top: 650, textAlign: 'center', fontFamily: SG, fontWeight: 500, fontSize: c.subSize,
          letterSpacing: c.subSize * 0.64, color: C.dim, whiteSpace: 'pre', opacity: k(t, nb(b.fill1), nb(b.fill1 + 1)) * (1 - k(t, nb(b.boom), nb(b.boom) + 6))}}>
          {c.sub}
        </div>
      )}
    </AbsoluteFill>
  );
};
