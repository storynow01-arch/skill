/* 由電路構成的發光城市（2.5D：自己算透視投影，SVG 畫，不是真 3D）。電晶體＝大樓、導線＝道路、電子＝車流光點。
   原作 02_試做/廣告30風格 src/ads/ad17/City.tsx；地標座數改讀時間表（3～6 座），其餘照原作。 */
import React from 'react';
import {clamp, EO, k, lerp, rnd01} from './kit';
import {interpolate} from 'remotion';
import {AVENUE, B, BAR, Cam, cityCam, F, GATE_Z, GP, J, M, mframe, NEAR, NN, project, scr, toCam, TOWERS} from './core';

type V3 = [number, number, number];
const GRID = 240;
const TW = 70; // 地標塔半寬
export const TOWER_H = 300;

/* 線段在相機前方的部分（近平面裁切） */
const clipSeg = (c: Cam, a: V3, b: V3): [[number, number], [number, number], number] | null => {
  let qa = toCam(c, a[0], a[1], a[2]);
  let qb = toCam(c, b[0], b[1], b[2]);
  if (qa[2] < NEAR && qb[2] < NEAR) return null;
  if (qa[2] < NEAR) {
    const u = (NEAR - qa[2]) / (qb[2] - qa[2]);
    qa = [lerp(qa[0], qb[0], u), lerp(qa[1], qb[1], u), NEAR];
  } else if (qb[2] < NEAR) {
    const u = (NEAR - qb[2]) / (qa[2] - qb[2]);
    qb = [lerp(qb[0], qa[0], u), lerp(qb[1], qa[1], u), NEAR];
  }
  return [scr(qa), scr(qb), (qa[2] + qb[2]) / 2];
};

const distToAvenue = (x: number, z: number) => {
  let best = 1e9;
  for (let i = 1; i < AVENUE.length; i++) {
    const a = AVENUE[i - 1], b = AVENUE[i];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const L2 = dx * dx + dz * dz || 1;
    const u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2));
    const d = Math.hypot(x - a[0] - u * dx, z - a[1] - u * dz);
    if (d < best) best = d;
  }
  return best;
};

type Box = {x0: number; x1: number; z0: number; z1: number; h: number; tower: number};
const boxCache = new Map<string, Box[]>();
const blockBoxes = (i: number, j: number): Box[] => {
  const key = `${i},${j}`;
  const hit = boxCache.get(key);
  if (hit) return hit;
  const out: Box[] = [];
  const n = 1 + Math.floor(rnd01(`n${key}`) * 2.2);
  for (let q = 0; q < n; q++) {
    const w = 50 + rnd01(`w${key}${q}`) * 80, d = 50 + rnd01(`d${key}${q}`) * 80;
    const x0 = i * GRID + 30 + rnd01(`x${key}${q}`) * (GRID - 60 - w);
    const z0 = j * GRID + 30 + rnd01(`z${key}${q}`) * (GRID - 60 - d);
    const cx = x0 + w / 2, cz = z0 + d / 2;
    const dA = distToAvenue(cx, cz);
    if (dA < 150) continue;
    if (Math.abs(cx - GP[0]) < 420 && cz > GP[1] - 260 && cz < GATE_Z + 1500) continue;
    if (TOWERS.some((t) => Math.abs(t.x - cx) < 150 && Math.abs(t.z - cz) < 150)) continue;
    const h = (30 + Math.pow(rnd01(`h${key}${q}`), 1.6) * 230) * Math.min(1, 0.3 + (dA - 150) / 350);
    out.push({x0, x1: x0 + w, z0, z1: z0 + d, h, tower: -1});
  }
  boxCache.set(key, out);
  return out;
};
const TOWER_BOX: Box[] = TOWERS.map((t) => ({x0: t.x - TW, x1: t.x + TW, z0: t.z - TW, z1: t.z + TW, h: TOWER_H, tower: t.i}));

const fogMix = (z: number) => Math.min(1, Math.max(0, (z - 600) / 3600));
const mixHex = (a: string, b: string, u: number) => {
  const pa = [1, 3, 5].map((o) => parseInt(a.slice(o, o + 2), 16));
  const pb = [1, 3, 5].map((o) => parseInt(b.slice(o, o + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], u))).join(',')})`;
};
const FOG = '#2f6f96';

/* 地標點亮進度（0 未亮 → 1 全亮） */
export const towerLit = (f: number, i: number) => k(f, J.land[i] - 2, J.land[i] + 10, EO);

const ptsStr = (p: [number, number][]) => p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');

export const City: React.FC<{f: number}> = ({f}) => {
  const c = cityCam(f);
  const mf = mframe(f);
  const top = c.clip !== null;
  const els: React.ReactNode[] = [];
  let id = 0;

  // 視野範圍（世界座標）
  const fx = c.x, fz = top ? c.z : c.z;
  const half = top ? 1100 : 1700;
  const zA = top ? c.z - 700 : c.z - 100;
  const zB = top ? c.z + 700 : c.z + 3400;
  const i0 = Math.floor((fx - half) / GRID), i1 = Math.ceil((fx + half) / GRID);
  const j0 = Math.floor(zA / GRID), j1 = Math.ceil(zB / GRID);
  void fz;

  // 地面＋天空
  const hy = c.cp > 0.01 ? 540 - (F * (c.sp / c.cp)) : -99999; // 地平線
  const horizon = Math.max(-200, Math.min(1300, hy));

  // 道路格線
  for (let i = i0; i <= i1; i++) {
    const s = clipSeg(c, [i * GRID, 0, zA], [i * GRID, 0, zB]);
    if (!s) continue;
    els.push(<line key={id++} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#46e6d6" strokeOpacity={0.42} strokeWidth={2.2} />);
  }
  for (let j = j0; j <= j1; j++) {
    const s = clipSeg(c, [fx - half, 0, j * GRID], [fx + half, 0, j * GRID]);
    if (!s) continue;
    els.push(<line key={id++} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#46e6d6" strokeOpacity={0.42 * (1 - fogMix(s[2]) * 0.8)} strokeWidth={2.2} />);
  }
  // 車流光點（含殘影拖尾）
  const dots: React.ReactNode[] = [];
  for (let i = i0; i <= i1; i++) {
    for (let q = 0; q < 3; q++) {
      const sp = (5 + rnd01(`ts${i}${q}`) * 9) * (q % 2 ? 1 : -1);
      const span = zB - zA;
      const z = zA + ((((rnd01(`tz${i}${q}`) * 5000 + mf * sp) % span) + span) % span);
      const x = i * GRID + (q % 2 ? 8 : -8);
      const s = clipSeg(c, [x, 2, z - sp * 5], [x, 2, z]);
      if (!s) continue;
      const r = Math.max(1.6, Math.min(9, 2400 / s[2]));
      const col = q % 2 ? '#ffbe55' : '#7ff6ff';
      dots.push(<line key={id++} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke={col} strokeWidth={r * 1.3} strokeLinecap="round" opacity={0.55} />);
      dots.push(<circle key={id++} cx={s[1][0]} cy={s[1][1]} r={r} fill="#ffffff" opacity={0.9} />);
    }
  }
  for (let j = j0; j <= j1; j++) {
    for (let q = 0; q < 2; q++) {
      const sp = (6 + rnd01(`us${j}${q}`) * 8) * (q % 2 ? 1 : -1);
      const span = 2 * half;
      const x = fx - half + ((((rnd01(`ux${j}${q}`) * 5000 + mf * sp) % span) + span) % span);
      const z = j * GRID + (q % 2 ? 8 : -8);
      const s = clipSeg(c, [x - sp * 5, 2, z], [x, 2, z]);
      if (!s) continue;
      const r = Math.max(1.6, Math.min(9, 2400 / s[2]));
      const col = q % 2 ? '#ffbe55' : '#7ff6ff';
      dots.push(<line key={id++} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke={col} strokeWidth={r * 1.3} strokeLinecap="round" opacity={0.55} />);
      dots.push(<circle key={id++} cx={s[1][0]} cy={s[1][1]} r={r} fill="#ffffff" opacity={0.9} />);
    }
  }

  // 主幹道（電子的路）
  const avenue: React.ReactNode[] = [];
  for (let a = 1; a < AVENUE.length; a++) {
    const p = AVENUE[a - 1], q = AVENUE[a];
    const s = clipSeg(c, [p[0], 0, p[1]], [q[0], 0, q[1]]);
    if (!s) continue;
    const w = Math.max(3, Math.min(30, 14000 / s[2]));
    avenue.push(<line key={id++} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#7ff6ff" strokeWidth={w} strokeLinecap="round" />);
  }

  // 大樓（遠到近）
  const boxes: Box[] = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) boxes.push(...blockBoxes(i, j));
  boxes.push(...TOWER_BOX);
  const withD = boxes
    .map((b) => {
      const q = toCam(c, (b.x0 + b.x1) / 2, b.h / 2, (b.z0 + b.z1) / 2);
      return {b, d: q[2]};
    })
    .filter((o) => o.d > NEAR + 80 && o.d < 5200)
    .sort((a, b) => b.d - a.d);
  const bld: React.ReactNode[] = [];
  for (const {b, d} of withD) {
    const P = (x: number, y: number, z: number) => project(c, x, y, z);
    const corners = [P(b.x0, 0, b.z0), P(b.x1, 0, b.z0), P(b.x1, 0, b.z1), P(b.x0, 0, b.z1), P(b.x0, b.h, b.z0), P(b.x1, b.h, b.z0), P(b.x1, b.h, b.z1), P(b.x0, b.h, b.z1)];
    if (corners.some((p) => p === null)) continue;
    const C = corners as [number, number][];
    const fg = fogMix(d);
    const lit = b.tower >= 0 ? towerLit(mf, b.tower) : 0;
    const side = mixHex(lit > 0 ? '#24609a' : '#1d4c7e', FOG, fg);
    const side2 = mixHex(lit > 0 ? '#1b4c80' : '#173f6a', FOG, fg);
    const topc = mixHex(lit > 0 ? '#3f8cc8' : '#2e72a8', FOG, fg);
    const edge = b.tower >= 0 ? (lit > 0 ? '#ffe3a0' : '#7ff6ff') : '#5ff0e4';
    const faces: [number[], string][] = [];
    if (c.z < b.z0) faces.push([[0, 1, 5, 4], side]);
    if (c.z > b.z1) faces.push([[3, 2, 6, 7], side]);
    if (c.x < b.x0) faces.push([[0, 3, 7, 4], side2]);
    if (c.x > b.x1) faces.push([[1, 2, 6, 5], side2]);
    if (c.y > b.h) faces.push([[4, 5, 6, 7], topc]);
    for (const [ix, col] of faces) {
      bld.push(<polygon key={id++} points={ptsStr(ix.map((n) => C[n]))} fill={col} stroke={edge} strokeOpacity={0.75 * (1 - fg)} strokeWidth={1.6} />);
    }
    // 窗戶燈列（琥珀）
    if (c.z < b.z0 && !top) {
      const rows = b.tower >= 0 ? 7 : Math.max(1, Math.floor(b.h / 45));
      for (let r = 1; r <= rows; r++) {
        const y = (b.h * r) / (rows + 1);
        const a = P(b.x0 + 8, y, b.z0), e = P(b.x1 - 8, y, b.z0);
        if (!a || !e) continue;
        const on = b.tower >= 0 ? lit : rnd01(`win${b.x0}${r}`) > 0.35 ? 1 : 0.25;
        bld.push(<line key={id++} x1={a[0]} y1={a[1]} x2={e[0]} y2={e[1]} stroke={b.tower >= 0 && lit > 0 ? '#fff1c4' : '#ffb84a'} strokeWidth={Math.max(1.2, 1500 / d)} opacity={(0.25 + 0.7 * on) * (1 - fg)} />);
      }
    }
    // 地標塔頂的光
    if (b.tower >= 0) {
      const t = P((b.x0 + b.x1) / 2, b.h + 30, (b.z0 + b.z1) / 2);
      if (t) {
        const r = Math.max(10, 9000 / d) * (0.5 + lit);
        bld.push(<circle key={id++} cx={t[0]} cy={t[1]} r={r * 2.2} fill="url(#c17beacon)" opacity={0.35 + 0.65 * lit} />);
      }
    }
  }

  // 邏輯閘（站在路上的 AND 閘，輸出朝上）
  const gate: React.ReactNode[] = [];
  if (!top || f > M.pull) {
    const gpts: [number, number][] = [];
    const R = 230;
    const push = (x: number, y: number) => {
      const p = project(c, GP[0] + x, y, GATE_Z);
      if (p) gpts.push(p);
    };
    push(-R, 0);
    push(-R, 210);
    for (let a = 0; a <= 16; a++) push(-R * Math.cos((Math.PI * a) / 16), 210 + R * Math.sin((Math.PI * a) / 16));
    push(R, 0);
    if (gpts.length > 10) {
      const run = k(mf, M.gateRun, M.silence, (x) => x * x);
      const silent = f >= M.silence && f < M.drop;
      const boom = f >= M.drop ? Math.exp(-(f - M.drop) / 25) : 0;
      const fill = silent ? 0.12 : f >= M.drop ? 0.18 + 0.4 * boom : 0.25 + 0.45 * run;
      gate.push(<polygon key={id++} points={ptsStr(gpts)} fill={f >= M.drop ? '#7ff6ff' : '#ffb84a'} fillOpacity={fill} stroke={f >= M.drop ? '#e9ffff' : '#ffd38a'} strokeWidth={6} strokeLinejoin="round" />);
      // 兩條輸入腳
      for (const x of [-110, 110]) {
        const s = clipSeg(c, [GP[0] + x, 0, GATE_Z - 260], [GP[0] + x, 0, GATE_Z]);
        if (s) gate.push(<line key={id++} x1={s[0][0]} y1={s[0][1]} x2={s[1][0]} y2={s[1][1]} stroke="#ffd38a" strokeWidth={5} />);
      }
      // 輸出腳朝上
      const o1 = project(c, GP[0], 440, GATE_Z), o2 = project(c, GP[0], 600, GATE_Z);
      if (o1 && o2) gate.push(<line key={id++} x1={o1[0]} y1={o1[1]} x2={o2[0]} y2={o2[1]} stroke={f >= M.drop ? '#e9ffff' : '#ffd38a'} strokeWidth={6} />);
    }
  }

  // 神經網路（drop）
  const nn: React.ReactNode[] = [];
  const nnOn = interpolate(f, [M.drop - 1, M.drop, M.pull, M.pull + 30], [0, 1, 1, 0], clamp);
  if (nnOn > 0) {
    const P3 = NN.map((layer) => layer.map((n) => ({n, p: project(c, n.x, n.y, n.z), d: toCam(c, n.x, n.y, n.z)[2]})));
    // 閘門輸出光束
    const gTop = project(c, GP[0], 600, GATE_Z);
    // 連線
    for (let l = 0; l < P3.length; l++) {
      const fireAt = J.nnFire[l];
      const lit = k(f, fireAt, fireAt + 4, EO);
      const srcs = l === 0 ? [{p: gTop, d: 1000}] : P3[l - 1];
      for (const a of srcs) {
        for (const b of P3[l]) {
          if (!a.p || !b.p) continue;
          nn.push(<line key={id++} x1={a.p[0]} y1={a.p[1]} x2={b.p[0]} y2={b.p[1]} stroke={l % 2 ? '#ffbe55' : '#7ff6ff'} strokeWidth={2.4} opacity={(0.12 + 0.55 * lit) * nnOn} />);
          if (lit > 0.5) {
            const ph = ((f - fireAt) / B + rnd01(`ph${l}${b.n.x}${a.p[0] > 0 ? 1 : 0}`)) % 1;
            nn.push(<circle key={id++} cx={lerp(a.p[0], b.p[0], ph)} cy={lerp(a.p[1], b.p[1], ph)} r={4} fill="#ffffff" opacity={0.9 * nnOn} />);
          }
        }
      }
    }
    // 節點＋煙火
    P3.forEach((layer, l) => {
      const fireAt = J.nnFire[l];
      layer.forEach(({p, d}, i) => {
        if (!p) return;
        const sz = Math.max(8, Math.min(40, 26000 / d));
        const lit = k(f, fireAt, fireAt + 3, EO);
        // 每小節再爆一次（錯開）
        const sinceBar = (f - M.drop) % BAR;
        const rb = f > fireAt + 20 && Math.floor((f - M.drop) / BAR) % 2 === (l + i) % 2 ? sinceBar : 999;
        const bursts = [f - fireAt, rb];
        for (const t of bursts) {
          if (t < 0 || t > 34) continue;
          const g = EO(Math.min(1, t / 24));
          const op = (1 - t / 34) * nnOn;
          const L = sz * (2.2 + 3.5 * g);
          for (let a = 0; a < 12; a++) {
            const ang = (a / 12) * Math.PI * 2 + l;
            const r0 = L * 0.45;
            nn.push(<line key={id++} x1={p[0] + Math.cos(ang) * r0} y1={p[1] + Math.sin(ang) * r0} x2={p[0] + Math.cos(ang) * L} y2={p[1] + Math.sin(ang) * L} stroke={a % 2 ? '#ffd27a' : '#bffcff'} strokeWidth={3} strokeLinecap="round" opacity={op} />);
          }
          nn.push(<circle key={id++} cx={p[0]} cy={p[1]} r={L * 1.05} fill="none" stroke="#ffffff" strokeWidth={2} opacity={op * 0.6} />);
        }
        nn.push(<circle key={id++} cx={p[0]} cy={p[1]} r={sz * 2.6} fill="url(#c17beacon)" opacity={(0.15 + 0.85 * lit) * nnOn} />);
        nn.push(<circle key={id++} cx={p[0]} cy={p[1]} r={sz * 0.55} fill={lit > 0.5 ? '#ffffff' : '#5c8fb8'} opacity={nnOn} />);
      });
    });
  }

  const W = 1920, H = 1080;
  const s = c.clip ?? 1;
  const cw = W * s, chh = H * s;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id="c17sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#173a68" />
          <stop offset="100%" stopColor="#3a8aa8" />
        </linearGradient>
        <linearGradient id="c17ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6f96" />
          <stop offset="100%" stopColor="#17406a" />
        </linearGradient>
        <radialGradient id="c17beacon">
          <stop offset="0%" stopColor="#fff6d8" stopOpacity={1} />
          <stop offset="35%" stopColor="#ffc860" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#ffc860" stopOpacity={0} />
        </radialGradient>
        <clipPath id="c17clip">
          <rect x={960 - cw / 2} y={540 - chh / 2} width={cw} height={chh} />
        </clipPath>
        <filter id="c17blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
      </defs>
      <g clipPath={top ? 'url(#c17clip)' : undefined}>
        {top ? (
          <rect x={0} y={0} width={W} height={H} fill="#1f5684" />
        ) : (
          <>
            <rect x={0} y={0} width={W} height={Math.max(0, horizon)} fill="url(#c17sky)" />
            <rect x={0} y={Math.max(0, horizon)} width={W} height={H} fill="url(#c17ground)" />
            {horizon > 0 && <rect x={0} y={horizon - 60} width={W} height={120} fill="#5fd0d8" opacity={0.25} />}
          </>
        )}
        {els}
        {dots}
        <g filter="url(#c17blur)" opacity={0.9}>{avenue}</g>
        <g opacity={0.95}>{avenue}</g>
        {bld}
        {gate}
        {nn}
      </g>
    </svg>
  );
};
