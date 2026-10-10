/* 範本廣I：主角一路畫出來／拼出來／摺出來印出來的物件（世界座標）。
   物件幾何由 timeline.py 的圖形庫依 storyboard 挑好、放好；這裡只負責「每一維的畫法」：
   1D 線稿（點當筆尖一筆一筆畫）、2D 色面（描外框 → 對角線鋪色 → 細節彈出 → 分身）、3D 體（展開圖摺成方塊 → 擠出物件一層層印出）。 */
import React from 'react';
import {easeOutBack, k, lerp, LIN, pulse} from './kit';
import {Angle, BF, C, centroid, colOf, D, Dim, DimLine, Draw, iso, MK, nozzle, Part, polyD, Pt, SG, shadeOf, T, tint, V3, WText} from './lib';

const pd = (p: Part) => polyD(p.pts, p.closed);
const TAGC = [C.ink, C.red, C.blue, tint(C.yellow, 0.62)];

/* ───── 0 維：作圖輔助線、開場字 ───── */
export const Phase0: React.FC<{f: number}> = ({f}) => {
  const h = T.head;
  const op = 1 - k(f, h.drag + 50, h.drag + 80);
  if (op <= 0) return null;
  const g = k(f, 4, 40);
  return (
    <g opacity={op}>
      <line x1={-900 * g} x2={900 * g} y1={0} y2={0} stroke={C.mute} strokeWidth={1.5} strokeDasharray="10 8" />
      <line x1={0} x2={0} y1={-560 * g} y2={260 * g} stroke={C.mute} strokeWidth={1.5} strokeDasharray="10 8" />
      <circle cx={0} cy={0} r={60} fill="none" stroke={C.mute} strokeWidth={1.5} strokeDasharray="4 6" opacity={k(f, h.pop + 10, h.pop + 30)} />
      <WText id="p0a" x={-600} y={-345} size={D.kickerSize} text={D.kicker} p={k(f, h.kicker, h.kicker + 25, LIN)} weight={300} fill={C.mute} />
      <WText id="p0b" x={-600} y={-240} size={D.lineSize} text={D.line} p={k(f, h.line, h.line + h.lineDur, LIN)} weight={100} />
      <WText id="p0c" x={40} y={-48} size={30} text="P (0, 0)" p={k(f, h.pop + 15, h.pop + 30, LIN)} family={SG} fill={C.ink} />
      <WText id="p0d" x={-150} y={118} size={34} text="0D" p={k(f, h.tag, h.tag + 12, LIN)} family={SG} weight={400} anchor="end" />
      <line x1={-18} y1={18} x2={-120} y2={92} stroke={C.ink} strokeWidth={1.5} opacity={k(f, h.tag - 6, h.tag + 4)} />
      <WText id="p0f" x={-600} y={-160} size={D.askSize} text={D.ask} p={k(f, h.ask, h.ask + 28, LIN)} weight={300} fill={C.mute} />
    </g>
  );
};

/* ───── 每一維共用的標註：主標註（物件上方）、維度標籤（左邊）、小標註（地平線下） ───── */
const Labels: React.FC<{f: number; d: Dim; op: number; top: number; left: number}> = ({f, d, op, top, left}) => (
  <g opacity={op}>
    <WText id={`lb${d.n}`} x={d.X} y={top} size={d.labelSize} text={d.label} p={k(f, d.labelAt, d.labelAt + 30, LIN)} weight={100} anchor="middle" ls={8} />
    <WText id={`tg${d.n}`} x={left} y={-40} size={44} text={`${d.n}D`} p={k(f, d.labelAt - 10, d.labelAt + 4, LIN)} family={SG} weight={400} anchor="end" fill={TAGC[d.n]} />
    <WText id={`nt${d.n}`} x={d.X} y={96} size={d.noteSize} text={d.note} p={k(f, d.noteAt, d.noteAt + 26, LIN)} weight={300} anchor="middle" fill={TAGC[d.n]} />
  </g>
);

/* ═════════ 1 維：點當筆尖勾出線稿；閃一下時紅色部件亮起 ═════════ */
export const LineObj: React.FC<{d: Dim; f: number; motion: number; labelsOp: number}> = ({d, f, motion, labelsOp}) => {
  const fl = d.flash as number;
  const flash = f >= fl ? Math.exp(-(f - fl) / 6) : 0;
  const mFlash = motion > 0 && f >= MK.hit ? Math.max(0, 1 - ((f - MK.hit) % (2 * BF)) / 8) * motion : 0;
  const glow = Math.max(flash, mFlash);
  const lit = k(f, fl, fl + 10);
  const [x0, y0, x1] = d.bb;
  const [ax, ay] = d.acc;
  return (
    <g>
      {d.parts.map((p, i) => p.fill === 'r' && <path key={`g${i}`} d={pd(p)} fill={C.red} opacity={0.2 * lit + 0.25 * glow} />)}
      {d.parts.map((p, i) => (
        <Draw key={i} d={pd(p)} len={p.len} p={k(f, p.t0 as number, (p.t0 as number) + (p.dur as number), LIN)} sw={p.w} />
      ))}
      {glow > 0.02 && (
        <g opacity={glow}>
          <circle cx={ax} cy={ay} r={36 + 60 * (1 - glow)} fill="#fff" />
          {[...Array(10)].map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            const r0 = 48, r1 = 105 + 90 * (1 - glow);
            return <line key={i} x1={ax + Math.cos(a) * r0} y1={ay + Math.sin(a) * r0} x2={ax + Math.cos(a) * r1} y2={ay + Math.sin(a) * r1} stroke={i % 2 ? C.red : C.ink} strokeWidth={4} />;
          })}
        </g>
      )}
      <g opacity={labelsOp}>
        <DimLine x1={x0} y1={y0 - 40} x2={x1} y2={y0 - 40} p={k(f, d.dimAt, d.dimAt + 22)} />
        <DimLine x1={x0 - 50} y1={y0} x2={x0 - 50} y2={0} p={k(f, d.dimAt + 8, d.dimAt + 30)} />
      </g>
      <Labels f={f} d={d} op={labelsOp} top={y0 - 100} left={x0 - 90} />
    </g>
  );
};

/* ═════════ 2 維：描外框 → 色面沿對角線鋪滿 → 細節一格格彈出 → 左右生出分身 ═════════ */
const PlaneBody: React.FC<{d: Dim; f: number; motion: number; swap: boolean; id: string; stroke: boolean}> = ({d, f, motion, swap, id, stroke}) => {
  const fl = d.fill as number;
  const fp = k(f, fl, fl + 10);
  const [x0, y0, x1, y1] = d.bb;
  const W = x1 - x0, H = y1 - y0;
  const sw = (c: string | null) => (swap && c === C.red ? C.blue : swap && c === C.blue ? C.red : c);
  const mv = motion > 0 ? (f - MK.hit) / BF : 0;
  return (
    <g>
      <clipPath id={`tf${id}`}>
        <path d={`M${x0},${y0}L${x0 + (W + H) * 1.05 * fp},${y0}L${x0},${y0 + (W + H) * 1.05 * fp}Z`} />
      </clipPath>
      <g clipPath={`url(#tf${id})`}>
        {d.parts.map((p, i) => {
          const c = sw(colOf(p.fill, 2));
          return p.role === 'o' && c && p.closed ? <path key={i} d={pd(p)} fill={c} /> : null;
        })}
      </g>
      {d.parts.map((p, i) => {
        if (p.role !== 'd') return null;
        const pop = easeOutBack(k(f, p.t0 as number, (p.t0 as number) + 10, LIN));
        if (pop <= 0) return null;
        const [cx, cy] = centroid(p.pts);
        const c = sw(colOf(p.fill, 2));
        const wig = motion * Math.sin((mv + i * 0.5) * Math.PI / 2) * 10;
        const sq = 1 + 0.18 * pulse(f, BF) * motion * (i % 2);
        return (
          <g key={i} transform={`translate(${cx} ${cy}) scale(${pop * sq}) rotate(${wig}) translate(${-cx} ${-cy})`}>
            {c && p.closed ? <path d={pd(p)} fill={c} /> : <path d={pd(p)} fill="none" stroke={C.ink} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />}
          </g>
        );
      })}
      {d.parts.map((p, i) => (p.role === 'o' ? (
        stroke ? <Draw key={`s${i}`} d={pd(p)} len={p.len} p={k(f, p.t0 as number, (p.t0 as number) + (p.dur as number), LIN)} sw={p.w} />
          : <path key={`s${i}`} d={pd(p)} fill="none" stroke={C.ink} strokeWidth={p.w} strokeLinejoin="round" strokeLinecap="round" />
      ) : null))}
    </g>
  );
};

export const PlaneObj: React.FC<{d: Dim; f: number; motion: number; labelsOp: number}> = ({d, f, motion, labelsOp}) => {
  const cpAt = d.copies as number;
  const cp = k(f, cpAt, cpAt + 18);
  const [x0, y0, x1] = d.bb;
  const bob = (i: number) => motion * -26 * Math.abs(Math.sin(((f - MK.hit) / BF + i * 0.5) * Math.PI / 2));
  return (
    <g>
      {cp > 0 && [-1, 1].map((sd) => [3, 2, 1, 0].map((g) => {
        const cg = k(f - g * 1.5, cpAt, cpAt + 18);
        if (g > 0 && (cg <= 0 || cg >= 1)) return null;
        const t = `translate(${d.X + sd * 760 * cg} ${bob(sd + 2)}) scale(0.62) translate(${-d.X} 0)`;
        return (
          <g key={`${sd}${g}`} opacity={g === 0 ? 1 : 0.22 / g} transform={t}>
            {g === 0 ? <PlaneBody d={d} f={f} motion={motion} swap={sd > 0} id={`c${sd}`} stroke={false} />
              : <rect x={x0} y={y0} width={x1 - x0} height={-y0} fill={C.blue} />}
          </g>
        );
      }))}
      <g transform={`translate(0 ${bob(0)})`}>
        <PlaneBody d={d} f={f} motion={motion} swap={false} id="m" stroke />
      </g>
      <g opacity={labelsOp}>
        <DimLine x1={x0} y1={y0 - 40} x2={x1} y2={y0 - 40} p={k(f, d.dimAt, d.dimAt + 22)} />
        <DimLine x1={x1 + 50} y1={y0} x2={x1 + 50} y2={0} p={k(f, d.dimAt + 8, d.dimAt + 30)} />
        <Angle x={x0} y={y0} a0={0} a1={Math.PI / 2} r={40} p={k(f, d.dimAt + 12, d.dimAt + 27)} />
      </g>
      <Labels f={f} d={d} op={labelsOp} top={y0 - 100} left={x0 - 90} />
    </g>
  );
};

/* ═════════ 3 維：展開圖摺成方塊 → 物件擠出成 2.5D、在方塊上一層層印出來 ═════════ */
type Face = {pts: V3[]; key: string};
const foldFaces = (f: number, folds: number[], A: number): Face[] => {
  const ang = (i: number) => (Math.PI / 2) * k(f, folds[i], folds[i] + 12, easeOutBack);
  const thF = ang(0), thR = ang(1), thL = ang(2), thB = ang(3), thT = ang(4);
  const sq: [number, number][] = [[0, 0], [A, 0], [A, A], [0, A]];
  return [
    {key: 'bottom', pts: sq.map(([u, v]) => [u, v, 0] as V3)},
    {key: 'front', pts: sq.map(([u, v]) => [u, A + v * Math.cos(thF), v * Math.sin(thF)] as V3)},
    {key: 'back', pts: sq.map(([u, v]) => [u, -v * Math.cos(thB), v * Math.sin(thB)] as V3)},
    {key: 'right', pts: sq.map(([u, v]) => [A + v * Math.cos(thR), u, v * Math.sin(thR)] as V3)},
    {key: 'left', pts: sq.map(([u, v]) => [-v * Math.cos(thL), u, v * Math.sin(thL)] as V3)},
    {key: 'top', pts: sq.map(([u, e]) => [u, -A * Math.cos(thB) - e * Math.cos(thB + thT), A * Math.sin(thB) + e * Math.sin(thB + thT)] as V3)},
  ];
};
const depth = (q: V3[]) => q.reduce((s, p) => s + p[0] + p[1] + p[2], 0) / q.length;
const DEP = 46; // 擠出深度（往後上方，沿等角的縱深軸）
const OFF: Pt = [DEP * 0.866, -DEP * 0.5];

/** 一個部件擠出成 2.5D：背面 → 側面 → 正面 */
const Extruded: React.FC<{p: Part; i: number}> = ({p, i}) => {
  const c = colOf(p.fill, 3);
  const back = p.pts.map(([x, y]) => [x + OFF[0], y + OFF[1]] as Pt);
  const n = p.pts.length;
  const sides: React.ReactNode[] = [];
  // 細的開放線（格線、文字線、蒸氣）只畫在正面，不擠出（擠出會變成一排灰色擋板）
  const edges = !p.closed && p.w <= 4 && p.role === 'd' ? 0 : p.closed ? n : n - 1;
  for (let j = 0; j < edges; j++) {
    const a = p.pts[j], b = p.pts[(j + 1) % n];
    const q: Pt[] = [a, b, [b[0] + OFF[0], b[1] + OFF[1]], [a[0] + OFF[0], a[1] + OFF[1]]];
    const nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const lit = 0.62 + 0.25 * Math.max(0, (-ny) / (Math.hypot(nx, ny) || 1));
    sides.push(<path key={j} d={polyD(q)} fill={c ? tint(c, lit) : tint(C.grid, 0.9)} stroke={C.ink} strokeWidth={1.6} strokeLinejoin="round" />);
  }
  return (
    <g key={i}>
      {c && p.closed && <path d={polyD(back)} fill={tint(c, 0.6)} stroke={C.ink} strokeWidth={1.6} />}
      {sides}
      {c && p.closed ? <path d={polyD(p.pts)} fill={c} stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        : <path d={polyD(p.pts, p.closed)} fill="none" stroke={C.ink} strokeWidth={p.w} strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
};

export const SolidObj: React.FC<{d: Dim; f: number; motion: number; labelsOp: number}> = ({d, f, motion, labelsOp}) => {
  const A = d.A as number, PO = d.PO as Pt, folds = d.folds as number[];
  const netP = k(f, d.netAt as number, (d.netAt as number) + (d.netDur as number), LIN);
  const fillP = k(f, folds[0] - 4, folds[0] + 4);
  const faces = foldFaces(f, folds, A).sort((a, b) => depth(a.pts) - depth(b.pts));
  const rail = k(f, d.rail as number, (d.rail as number) + 10, easeOutBack);
  const plate = k(f, d.plate as number, (d.plate as number) + 10, easeOutBack);
  const [x0, y0, x1, y1] = d.bb;
  const h = k(f, d.print0 as number, d.print1 as number, LIN) * (y1 - y0);
  const nz = nozzle(f);
  const layers: number[] = [];
  for (let y = y1 - 12; y > y1 - h; y -= 14) layers.push(y);
  const bob = motion * -24 * Math.abs(Math.sin(((f - MK.hit) / BF + 1) * Math.PI / 2));
  return (
    <g transform={`translate(0 ${bob})`}>
      <Draw d={polyD(d.net as Pt[], false)} len={d.netLen as number} p={netP} sw={4} op={1 - k(f, folds[0] + 2, folds[0] + 8)} />
      {fillP > 0 && faces.map((fc) => (
        <path key={fc.key} d={polyD(fc.pts.map((p) => iso(PO, p)))} fill={tint(C.yellow, shadeOf(fc.pts) + 0.15)}
          fillOpacity={fillP} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
      ))}
      {plate > 0 && (
        <path d={polyD(([[18, 18], [A - 18, 18], [A - 18, A - 18], [18, A - 18]] as Pt[]).map(([a, b]) => iso(PO, [a, b, A + 4 + 160 * (1 - plate)])))}
          fill={C.blue} stroke={C.ink} strokeWidth={2.5} opacity={Math.min(1, plate * 2)} />
      )}
      {h > 1 && (
        <g>
          <clipPath id="printClip"><rect x={x0 - 40} y={y1 - h - 2} width={x1 - x0 + 160} height={h + 40} /></clipPath>
          <clipPath id="objShape">{d.parts.filter((p) => p.closed).map((p, i) => <path key={i} d={polyD(p.pts)} />)}</clipPath>
          <g clipPath="url(#printClip)">
            {d.parts.map((p, i) => <Extruded key={i} p={p} i={i} />)}
            <g clipPath="url(#objShape)" opacity={0.22}>
              {layers.map((y, i) => <line key={i} x1={x0} x2={x1} y1={y} y2={y} stroke={C.ink} strokeWidth={1.4} />)}
            </g>
          </g>
        </g>
      )}
      {rail > 0 && (
        <line x1={x0 - 40} x2={x1 + 80} y1={(f >= (d.print0 as number) ? nz[1] - 26 : y1 - 30) - 220 * (1 - rail)} y2={(f >= (d.print0 as number) ? nz[1] - 26 : y1 - 30) - 220 * (1 - rail)}
          stroke={C.ink} strokeWidth={8} strokeLinecap="round" opacity={Math.min(1, rail * 2)} />
      )}
      <g opacity={labelsOp}>
        <DimLine x1={iso(PO, [0, A, 0])[0]} y1={30} x2={iso(PO, [A, 0, 0])[0]} y2={30} p={k(f, d.dimAt, d.dimAt + 22)} />
      </g>
      <Labels f={f} d={d} op={labelsOp} top={Math.min(y0 + OFF[1], iso(PO, [0, 0, A])[1]) - 110} left={iso(PO, [0, A, 0])[0] - 60} />
    </g>
  );
};

export const nozzleY = (f: number) => nozzle(f)[1];
export const lerpPt = (a: Pt, b: Pt, p: number): Pt => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];
