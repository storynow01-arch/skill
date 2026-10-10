/* iso「2.5D ISOMETRIC」：先是 2D 平面圖，整個世界旋轉 45°、壓扁、長出高度變成等角場景（平面多邊形畫法，不是真 3D）；
   逐層長高的塔、雷射沿路徑描線的平台、燈與相機腳架、懸浮平板；2～4 個標註引線指向物件，鏡頭推近再橫移。
   lines「LINES & PATHS」：晶片描邊 → 走線依拍點點亮 → 2～6 個標籤沿線抵達 → 晶片通電、晶圓格點亮、脈衝沿線跑 → 描線畫出英文字標。
   原作 chC.tsx 的第 5、6 章；字全部讀 timeline.json，章內拍點由 timeline.py 依字數伸縮。 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, ChP, DigitCol, EIO, EO, MaskLine, abs, k, lerp, nb, rnd, sp, warp} from './kit';
import {ARCH, SG, TC} from './fonts';

const no2 = (n: number) => String(n).padStart(2, '0');

/* ═════════ iso ═════════ */
type Box = {x0: number; y0: number; x1: number; y1: number; z0: number; z1: number; top: string; s1: string; s2: string; op?: number; key: string; lift?: number};

export const ChIso: React.FC<ChP> = ({t: t0, c}) => {
  const t = warp(t0, c.warp);
  const m = k(t, nb(4) - 2, nb(6), EIO);
  const hz = k(t, nb(5), nb(7) + 4, EO);
  const push = k(t, nb(8), nb(12), EIO);
  const pan = k(t, nb(12), nb(14) + 6, EIO);
  const S = 1.12 + 0.14 * push + 0.06 * pan;
  const cx = 1120 - 90 * pan, cy = 580 + 10 * push;
  const a = (m * Math.PI) / 4;
  const ca = Math.cos(a), sa = Math.sin(a);
  const P = (x: number, y: number, z: number): [number, number] => {
    const xr = x * ca - y * sa, yr = x * sa + y * ca;
    return [cx + xr * S, cy + yr * S * (1 - 0.5 * m) - z * S * m * hz * 0.95];
  };
  const depth = (x: number, y: number) => x * sa + y * ca;
  const poly = (pts: [number, number][]) => pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
  const tiles: React.ReactNode[] = [];
  const TS = 80;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const p = sp(t, (i + j) * 1.5, 13, 260);
    if (p <= 0.001) continue;
    const x0 = -320 + i * TS, y0 = -320 + j * TS;
    const mx = x0 + TS / 2, my = y0 + TS / 2;
    const s = (TS / 2) * Math.min(p, 1.08) - 2;
    tiles.push(<polygon key={`${i}-${j}`} points={poly([P(mx - s, my - s, 0), P(mx + s, my - s, 0), P(mx + s, my + s, 0), P(mx - s, my + s, 0)])}
      fill={(i + j) % 2 ? C.bg3 : '#20243a'} stroke={C.line} strokeWidth={1.5} />);
  }
  const boxes: Box[] = [];
  const add = (b: Box) => boxes.push(b);
  const appear = (at: number) => sp(t, at, 12, 200);
  const wallP = appear(10);
  add({key: 'wb', x0: -320, y0: -330, x1: 320, y1: -318, z0: 0, z1: 180 * wallP, top: C.dim, s1: '#2a2f45', s2: '#2a2f45'});
  add({key: 'wl', x0: -332, y0: -318, x1: -320, y1: 120, z0: 0, z1: 180 * wallP, top: C.dim, s1: '#323856', s2: '#323856'});
  const prP = appear(14);
  const px0 = -270, py0 = -250, px1 = -110, py1 = -90;
  add({key: 'pb', x0: px0, y0: py0, x1: px1, y1: py1, z0: 0, z1: 24 * prP, top: '#3a4160', s1: '#262b40', s2: '#1d2133'});
  const layers = [8, 9, 10, 11, 12].reduce((s, n) => s + 26 * k(t, nb(n), nb(n) + 6, EO), 10 * prP);
  add({key: 'pp', x0: -215, y0: -195, x1: -165, y1: -145, z0: 24, z1: 24 + layers, top: C.coral, s1: '#c8443b', s2: '#9c3029'});
  [[px0, py0], [px1 - 12, py0], [px0, py1 - 12], [px1 - 12, py1 - 12]].forEach(([x, y], i) =>
    add({key: `pp${i}`, x0: x, y0: y, x1: x + 12, y1: y + 12, z0: 0, z1: 210 * prP, top: C.white, s1: '#9aa0b8', s2: '#6d7390'}));
  add({key: 'pt', x0: px0, y0: py0, x1: px1, y1: py1, z0: 200 * prP, z1: 212 * prP, top: '#4a5274', s1: '#363c58', s2: '#2a2f45', op: 0.9, lift: 300});
  const nz = Math.sin(t * 0.32) * 34;
  add({key: 'pn', x0: -200 + nz, y0: -180, x1: -180 + nz, y1: -160, z0: 150, z1: 200 * prP, top: C.coral, s1: '#c8443b', s2: '#9c3029', op: prP, lift: 310});
  const lzP = appear(18);
  const lx0 = 30, ly0 = -270, lx1 = 290, ly1 = -100, lh = 110;
  add({key: 'lz', x0: lx0, y0: ly0, x1: lx1, y1: ly1, z0: 0, z1: lh * lzP, top: '#2b3150', s1: '#20253c', s2: '#181c2e'});
  const caP = appear(22);
  add({key: 'ls', x0: -270, y0: 130, x1: -255, y1: 145, z0: 0, z1: 170 * caP, top: C.white, s1: '#9aa0b8', s2: '#6d7390'});
  add({key: 'lb', x0: -300, y0: 100, x1: -220, y1: 175, z0: 170 * caP, z1: 240 * caP, top: C.white, s1: '#e8e2d6', s2: '#cfc8ba'});
  add({key: 'cs', x0: -50, y0: 150, x1: -38, y1: 162, z0: 0, z1: 110 * caP, top: C.white, s1: '#9aa0b8', s2: '#6d7390'});
  add({key: 'cb', x0: -80, y0: 120, x1: -10, y1: 175, z0: 110 * caP, z1: 160 * caP, top: '#3a4160', s1: '#262b40', s2: '#1d2133'});
  add({key: 'cl', x0: -10, y0: 132, x1: 22, y1: 162, z0: 120 * caP, z1: 150 * caP, top: C.blue, s1: C.blueD, s2: '#122c78'});
  const tbP = appear(26);
  [0, 1, 2].forEach((i) => {
    const bob = Math.sin(t * 0.09 + i * 1.7) * 8;
    const z = (40 + i * 52 + bob) * tbP;
    add({key: `tb${i}`, x0: 120 + i * 18, y0: 40 + i * 18, x1: 270 + i * 18, y1: 150 + i * 18, z0: z, z1: z + 7, top: C.blue, s1: '#d7d0c3', s2: '#b8b1a4', op: tbP, lift: i * 10});
  });
  boxes.sort((A, Bx) => {
    const da = depth((A.x0 + A.x1) / 2, (A.y0 + A.y1) / 2) + (A.lift ?? 0);
    const db = depth((Bx.x0 + Bx.x1) / 2, (Bx.y0 + Bx.y1) / 2) + (Bx.lift ?? 0);
    return da - db;
  });
  const drawBox = (b: Box) => {
    const top = [P(b.x0, b.y0, b.z1), P(b.x1, b.y0, b.z1), P(b.x1, b.y1, b.z1), P(b.x0, b.y1, b.z1)];
    const front = [P(b.x0, b.y1, b.z0), P(b.x1, b.y1, b.z0), P(b.x1, b.y1, b.z1), P(b.x0, b.y1, b.z1)];
    const right = [P(b.x1, b.y0, b.z0), P(b.x1, b.y1, b.z0), P(b.x1, b.y1, b.z1), P(b.x1, b.y0, b.z1)];
    return (
      <g key={b.key} opacity={b.op ?? 1}>
        <polygon points={poly(front)} fill={b.s1} />
        <polygon points={poly(right)} fill={b.s2} />
        <polygon points={poly(top)} fill={b.top} />
      </g>
    );
  };
  const star: [number, number][] = Array.from({length: 11}, (_, i) => {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 26 : 62;
    return [160 + Math.cos(ang) * r * 1.4, -185 + Math.sin(ang) * r];
  });
  const lp = k(t, nb(9), nb(12), (x) => x);
  const segN = star.length - 1;
  const fl = lp * segN;
  const done = star.slice(0, Math.floor(fl) + 1);
  const si = Math.min(segN - 1, Math.floor(fl));
  const fr = Math.min(1, fl - si);
  const head: [number, number] = [lerp(star[si][0], star[si + 1][0], fr), lerp(star[si][1], star[si + 1][1], fr)];
  const lzTop = lh * lzP;
  const laserPts = [...done, head].map(([x, y]) => P(x, y, lzTop));
  const headS = P(head[0], head[1], lzTop);
  const emitter = P(head[0], head[1], lzTop + 70);
  const ANCH = [
    {anchor: P(-190, -170, 215), dx: 190, dy: -40},
    {anchor: P(160, -185, 110), dx: 80, dy: -110},
    {anchor: P(-260, 140, 245), dx: -100, dy: 200},
    {anchor: P(230, 130, 150), dx: 140, dy: 70},
  ];
  const notes = (c.notes as {text: string; size: number}[]).map((n, i) => ({...n, ...ANCH[i], at: nb(8 + i)}));
  const planLab = 1 - k(t, nb(4) - 4, nb(4) + 4);
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <svg style={{...abs, left: 0, top: 0}} width={1920} height={1080}>
        <g opacity={0.6 * planLab}>
          {Array.from({length: 25}, (_, i) => <line key={`v${i}`} x1={i * 80} y1={0} x2={i * 80} y2={1080} stroke={C.line} strokeWidth={1} />)}
          {Array.from({length: 14}, (_, i) => <line key={`h${i}`} x1={0} y1={i * 80} x2={1920} y2={i * 80} stroke={C.line} strokeWidth={1} />)}
        </g>
        {tiles}
        <g opacity={planLab}>
          {[[px0, py0, px1, py1], [lx0, ly0, lx1, ly1], [-300, 100, -10, 175], [120, 40, 306, 186]].map((r, i) => (
            <polygon key={i} points={poly([P(r[0], r[1], 0), P(r[2], r[1], 0), P(r[2], r[3], 0), P(r[0], r[3], 0)])} fill="none"
              stroke={i % 2 ? C.coral : C.blue} strokeWidth={3} strokeDasharray="10 8" opacity={k(t, 14 + i * 4, 20 + i * 4)} />
          ))}
        </g>
        {boxes.map(drawBox)}
        {lp > 0 && (
          <g>
            <polyline points={poly(laserPts)} fill="none" stroke={C.coral} strokeWidth={4} strokeLinejoin="round" />
            {lp < 1 && <line x1={emitter[0]} y1={emitter[1]} x2={headS[0]} y2={headS[1]} stroke={C.coral} strokeWidth={3} opacity={0.9} />}
            <circle cx={headS[0]} cy={headS[1]} r={14} fill={C.coral} opacity={0.3} />
            <circle cx={headS[0]} cy={headS[1]} r={6} fill={C.white} />
          </g>
        )}
        {notes.map((n, i) => {
          const p = k(t, n.at, n.at + 10);
          if (p <= 0) return null;
          const [ax, ay] = n.anchor;
          const ex = ax + n.dx * p, ey = ay + n.dy * p;
          return (
            <g key={i}>
              <circle cx={ax} cy={ay} r={7} fill={C.white} />
              <circle cx={ax} cy={ay} r={7 + 16 * p} fill="none" stroke={C.white} strokeWidth={2} opacity={1 - p} />
              <polyline points={`${ax},${ay} ${ex},${ey} ${ex + (n.dx > 0 ? 40 : -40) * p},${ey}`} fill="none" stroke={C.white} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {notes.map((n, i) => {
        const p = k(t, n.at + 4, n.at + 14);
        const [ax, ay] = n.anchor;
        const ex = ax + n.dx + (n.dx > 0 ? 48 : -48), ey = ay + n.dy;
        return (
          <div key={i} style={{...abs, top: ey - 28, ...(n.dx > 0 ? {left: ex} : {right: 1920 - ex}), whiteSpace: 'nowrap'}}>
            <MaskLine p={p} style={{display: 'flex', alignItems: 'center', gap: 12}}>
              <span style={{fontFamily: SG, fontWeight: 700, fontSize: 20, color: C.coral}}>{`${no2(c.no)}.${i + 1}`}</span>
              <span style={{fontFamily: TC, fontWeight: 900, fontSize: n.size, color: C.white}}>{n.text}</span>
            </MaskLine>
          </div>
        );
      })}
      <div style={{...abs, left: 120, top: 112}}>
        <MaskLine p={k(t, 4, 16)} style={{fontFamily: TC, fontWeight: 900, fontSize: c.headSize, color: C.white, whiteSpace: 'nowrap'}}>{c.head}</MaskLine>
        {c.sub && <MaskLine p={k(t, 8, 20)} style={{fontFamily: TC, fontWeight: 700, fontSize: c.subSize, color: C.coral, marginTop: 4, whiteSpace: 'nowrap'}}>{c.sub}</MaskLine>}
      </div>
      {c.iso && (
        <div style={{...abs, left: 120, top: 292, display: 'flex', alignItems: 'baseline', gap: 16, opacity: k(t, 12, 22)}}>
          <span style={{fontFamily: TC, fontWeight: 900, fontSize: 44, color: C.dim, whiteSpace: 'nowrap'}}>{c.iso}</span>
          <span style={{fontFamily: ARCH, fontSize: 120, lineHeight: 1, height: 120, color: m > 0.5 ? C.coral : C.white, display: 'inline-flex'}}>
            <DigitCol w={2 + m} cw={0.72} />D
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ═════════ lines ═════════ */
type Pt = [number, number];
type Trace = {pts: Pt[]; len: number; cum: number[]; at: number; label?: number};
const CHX = 960, CHY = 470, CHH = 120;
const mkTrace = (pts: Pt[], at: number, label?: number): Trace => {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return {pts, cum, len: cum[cum.length - 1], at, label};
};
const pointAt = (tr: Trace, d: number): Pt => {
  const dd = Math.max(0, Math.min(tr.len, d));
  let i = 1;
  while (i < tr.cum.length - 1 && tr.cum[i] < dd) i++;
  const a = tr.pts[i - 1], b = tr.pts[i];
  const seg = tr.cum[i] - tr.cum[i - 1];
  const u = seg > 0 ? (dd - tr.cum[i - 1]) / seg : 0;
  return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
};
const DRAW = 12;

export const ChLines: React.FC<ChP> = ({t, c}) => {
  const items = c.items as {text: string; size: number}[];
  const ly = c.ly as number[];
  const rows = ly.length;
  const bb = c.b as {at: number[]; p: number; logo: boolean};
  const PW = bb.p;
  const TRACES: Trace[] = [];
  items.forEach((_, i) => {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 2);
    const yc = CHY + (row - (rows - 1) / 2) * 50;
    const ty = ly[row];
    const x1 = CHX + side * (CHH + 40);
    const dx = Math.abs(ty - yc);
    const x2 = x1 + side * dx;
    TRACES.push(mkTrace([[CHX + side * CHH, yc], [x1, yc], [x2, ty], [CHX + side * 420, ty]], nb(bb.at[i]), i));
  });
  [-1, 1].forEach((v) => {
    for (let j = 0; j < 7; j++) {
      const ox = (j - 3) * 32;
      const sx = CHX + ox, sy = CHY + v * CHH;
      const l1 = 30 + (rnd(`l1${v}${j}`) + 1) * 30;
      const dir = ox === 0 ? 0 : Math.sign(ox);
      const l2 = 40 + Math.abs(ox) * 1.6;
      const l3 = v < 0 ? 60 + (rnd(`l3${v}${j}`) + 1) * 40 : 50 + (rnd(`l3${v}${j}`) + 1) * 30;
      const p1: Pt = [sx, sy + v * l1];
      const p2: Pt = [p1[0] + dir * l2, p1[1] + v * l2];
      const p3: Pt = [p2[0], Math.max(150, Math.min(800, p2[1] + v * l3))];   // 通電後鏡頭推近 1.22 倍：下方走線最低 800，推近後仍在 y 880 以上（不進下方 180 px）
      const p4: Pt = [p3[0] + dir * (40 + Math.abs(ox) * 4), p3[1]];
      TRACES.push(mkTrace([[sx, sy], p1, p2, p3, p4], nb(1) + Math.abs(j - 3) * 2));
    }
  });
  const chipDraw = k(t, 0, nb(1), EIO);
  const power = k(t, nb(PW), nb(PW) + 6);
  const zoom = k(t, nb(PW), nb(PW + 4), EIO);
  const dimAll = bb.logo ? k(t, nb(PW + 4), nb(PW + 4) + 10) : 0;
  const logo = k(t, nb(PW + 4) + 2, nb(PW + 6) + 8, (x) => x);
  const logoFill = k(t, nb(PW + 6) + 8, nb(PW + 7) + 6);
  const per = 4 * CHH * 2;
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const at = nb(PW) + (rnd(`w${i}${j}`) + 1) * 1.9 * 14;
    const on = k(t, at, at + 5);
    cells.push(<rect key={`${i}-${j}`} x={CHX - 96 + i * 32 + 3} y={CHY - 96 + j * 32 + 3} width={26} height={26}
      fill={on > 0 ? ((i + j) % 3 ? C.blue : C.white) : 'none'} opacity={0.15 + 0.85 * on * power} stroke={C.faint} strokeWidth={1} />);
  }
  const pulses: React.ReactNode[] = [];
  for (let n = PW; n <= PW + 7; n++) {
    TRACES.forEach((tr, i) => {
      if ((i + n) % 3 !== 0) return;
      const d = (t - nb(n)) * 26;
      if (d < 0 || d > tr.len) return;
      const [x, y] = pointAt(tr, d);
      pulses.push(<g key={`${n}-${i}`}><circle cx={x} cy={y} r={14} fill={C.coral} opacity={0.25} /><circle cx={x} cy={y} r={5.5} fill={C.white} /></g>);
    });
  }
  return (
    <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
      <div style={{...abs, inset: 0, transform: `scale(${1 + 0.22 * zoom - 0.12 * dimAll})`, transformOrigin: `${CHX}px ${CHY}px`}}>
        <svg style={{...abs, left: 0, top: 0}} width={1920} height={1080}>
          <g opacity={0.5}>
            {Array.from({length: 23 * 10}, (_, i) => {
              const x = 120 + (i % 23) * 76, y = 150 + Math.floor(i / 23) * 76;
              return <circle key={i} cx={x} cy={y} r={2} fill={C.faint} />;
            })}
          </g>
          <g opacity={1 - dimAll * 0.75}>
            {TRACES.map((tr, i) => {
              const p = k(t, tr.at, tr.at + DRAW, EO);
              if (p <= 0) return null;
              const lit = tr.label !== undefined;
              const end = tr.pts[tr.pts.length - 1];
              return (
                <g key={i}>
                  <polyline points={tr.pts.map((q) => q.join(',')).join(' ')} fill="none" stroke={lit ? C.blue : C.faint} strokeWidth={lit ? 5 : 3}
                    strokeLinejoin="round" strokeDasharray={`${tr.len} ${tr.len}`} strokeDashoffset={tr.len * (1 - p)} />
                  <circle cx={end[0]} cy={end[1]} r={lit ? 10 : 6} fill={C.bg} stroke={lit ? C.coral : C.dim} strokeWidth={3} opacity={k(t, tr.at + DRAW - 3, tr.at + DRAW)} />
                </g>
              );
            })}
            <rect x={CHX - CHH} y={CHY - CHH} width={CHH * 2} height={CHH * 2} fill={power > 0 ? C.bg2 : 'none'} stroke={C.white} strokeWidth={4}
              strokeDasharray={`${per} ${per}`} strokeDashoffset={per * (1 - chipDraw)} />
            {Array.from({length: 4 * 7}, (_, i) => {
              const s = Math.floor(i / 7), j = i % 7;
              const o = (j - 3) * 32;
              const pr_ = k(t, nb(1) + j, nb(1) + j + 6);
              const L = 16 * pr_;
              const [x1, y1, x2, y2] = s === 0 ? [CHX - CHH, CHY + o, CHX - CHH - L, CHY + o] : s === 1 ? [CHX + CHH, CHY + o, CHX + CHH + L, CHY + o]
                : s === 2 ? [CHX + o, CHY - CHH, CHX + o, CHY - CHH - L] : [CHX + o, CHY + CHH, CHX + o, CHY + CHH + L];
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={C.dim} strokeWidth={6} />;
            })}
            {cells}
            {c.chip && <text x={CHX} y={CHY + c.chipSize * 0.354} textAnchor="middle" fontFamily={ARCH} fontWeight={900} fontSize={c.chipSize} fill={power > 0 ? C.white : 'none'}
              stroke={C.white} strokeWidth={2} opacity={k(t, 6, 16)}>{c.chip}</text>}
            {pulses}
          </g>
          {bb.logo && logo > 0 && (
            <text x={CHX} y={CHY + c.markSize * 0.34} textAnchor="middle" fontFamily={ARCH} fontWeight={900} fontSize={c.markSize} letterSpacing={10}
              fill={C.blue} fillOpacity={logoFill} stroke={C.coral} strokeWidth={4} strokeDasharray="1500 1500" strokeDashoffset={1500 * (1 - logo)}>{c.mark}</text>
          )}
        </svg>
        {TRACES.filter((tr) => tr.label !== undefined).map((tr) => {
          const i = tr.label!;
          const side = i % 2 ? 1 : -1;
          const y = ly[Math.floor(i / 2)];
          const p = k(t, tr.at + DRAW - 4, tr.at + DRAW + 8);
          const pos: React.CSSProperties = side < 0 ? {right: 1920 - (CHX - 440)} : {left: CHX + 440};
          return (
            <div key={i} style={{...abs, top: y - 40, ...pos, textAlign: side < 0 ? 'right' : 'left', opacity: 1 - dimAll * 0.7}}>
              <MaskLine p={p}>
                <div style={{fontFamily: SG, fontWeight: 700, fontSize: 18, color: C.coral, letterSpacing: 4}}>{`${no2(c.no)}.${i + 1}`}</div>
                <div style={{fontFamily: TC, fontWeight: 900, fontSize: items[i].size, color: C.white, whiteSpace: 'nowrap'}}>{items[i].text}</div>
              </MaskLine>
            </div>
          );
        })}
      </div>
      <div style={{...abs, left: 120, top: 104, opacity: 1 - dimAll * 0.6}}>
        <MaskLine p={k(t, 2, 14)} style={{fontFamily: TC, fontWeight: 900, fontSize: c.headSize, color: C.white, whiteSpace: 'nowrap'}}>{c.head}</MaskLine>
      </div>
      {c.tag && <div style={{...abs, right: 120, top: 120, fontFamily: SG, fontWeight: 500, fontSize: 22, letterSpacing: 8, color: C.dim, opacity: k(t, 6, 16)}}>{c.tag}</div>}
    </AbsoluteFill>
  );
};
