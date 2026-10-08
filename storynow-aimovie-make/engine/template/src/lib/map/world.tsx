/* 範本J 地圖風：世界（一張大羊皮紙地圖）、站點排列、鏡頭、地形、路線與圖釘。
   ・每個場景＝路線上的一站，站點蛇行排列（每列 COLS 站），每站佔一塊 1920×1080 的區域，站與站之間留空隙放山、樹、湖、等高線
   ・鏡頭：在換場前 PRE 格出發、換場後 POST 格到站（中途微拉遠，看得到大地圖），紅色虛線路線同步畫過去，到站時圖釘插下
   ・地形全部「模組外算一次」（useMemo），只畫鏡頭附近的物件；不用 feTurbulence／大模糊 */
import React, {useMemo} from 'react';
import {random} from 'remotion';
import {
  CINZEL, CompassRose, DashRoute, INK, KAI, Mount, P, PAPER, PAPER2, Pin, RED, SEA, SEA_INK, SERIF, TABLE, Tree, Waves, blob, easeIO, pr, quadPts, smooth,
} from './kit';

export const SX = 2400, SY = 1500, COLS = 3, MARGIN = 900;
export const PRE = 10, POST = 22;          // 鏡頭在換場前 PRE 格出發、換場後 POST 格到站
export const PIN_AT = POST - 4;            // 到站後第幾格插圖釘（場景內格數）

type Sc = {type: string; from: number; dur: number};

/** 第 i 站的左上角（世界座標；蛇行排列，鏡頭移動距離最短） */
export const stationOrigin = (i: number): P => {
  const row = Math.floor(i / COLS), col = row % 2 ? COLS - 1 - (i % COLS) : i % COLS;
  return {x: MARGIN + col * SX, y: MARGIN + row * SY};
};
/** 每種站的「路線終點＋圖釘」位置（站內座標，避開版面物件） */
export const ANCHOR: Record<string, P> = {
  title: {x: 170, y: 820}, scenario: {x: 560, y: 600}, definition: {x: 680, y: 800}, cards: {x: 66, y: 525},
  vs: {x: 290, y: 500}, stat: {x: 960, y: 846}, quiz: {x: 200, y: 600}, recap: {x: 850, y: 860}, qaEnd: {x: 66, y: 610},
};
export const anchorOf = (i: number, type: string): P => {
  const o = stationOrigin(i), a = ANCHOR[type] ?? {x: 960, y: 600};
  return {x: o.x + a.x, y: o.y + a.y};
};
export const worldSize = (n: number) => {
  const rows = Math.ceil(Math.max(1, n) / COLS);
  return {W: MARGIN * 2 + (COLS - 1) * SX + 1920, H: MARGIN * 2 + (rows - 1) * SY + 1080};
};

/* ───── 鏡頭 ───── */
export type Cam = {x: number; y: number; z: number};
export const restCam = (i: number): Cam => {
  const o = stationOrigin(i);
  return {x: o.x + 960, y: o.y + 450, z: 1};
};
/** 第 i 段路線（i≥1：第 i-1 站 → 第 i 站）的進度 0→1，與鏡頭移動同步 */
export const legP = (f: number, s: Sc) => easeIO(Math.max(0, Math.min(1, (f - (s.from - PRE)) / (PRE + POST))));
export const camAt = (f: number, scenes: Sc[]): Cam => {
  let c = restCam(0);
  for (let i = 1; i < scenes.length; i++) {
    const t0 = scenes[i].from - PRE, t1 = scenes[i].from + POST;
    if (f < t0) break;
    if (f >= t1) { c = restCam(i); continue; }
    const e = easeIO((f - t0) / (t1 - t0));
    const a = restCam(i - 1), b = restCam(i);
    const dip = Math.min(0.34, Math.hypot(b.x - a.x, b.y - a.y) / 7000);
    c = {x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, z: 1 - dip * Math.sin(Math.PI * e)};
  }
  const intro = 0.9 + 0.1 * pr(f, 0, 48);             // 開場從稍遠處推近
  // 不做鏡頭微呼吸：±0.6% 的整片縮放會讓文字每隔一段時間對齊像素、整片同時跳 1px，被最終品檢判成畫面突跳（2026-10-08 實測 73 處）
  return {x: c.x, y: c.y, z: c.z * intro};
};
/** 世界點 → 畫面點 */
export const toScreen = (p: P, cam: Cam): P => ({x: (p.x - cam.x) * cam.z + 960, y: (p.y - cam.y) * cam.z + 450});

/* ───── 地形（依站數算一次） ───── */
const inStation = (x: number, y: number, n: number, pad = 0) => {
  for (let i = 0; i < n; i++) {
    const o = stationOrigin(i);
    if (x > o.x - pad && x < o.x + 1920 + pad && y > o.y - pad && y < o.y + 1080 + pad) return true;
  }
  return false;
};
const makeTerrain = (n: number) => {
  const {W, H} = worldSize(n);
  const rows = Math.ceil(n / COLS);
  // 北方海岸（世界上緣）
  const coast: P[] = [];
  for (let x = -80, i = 0; x <= W + 80; x += 380, i++) coast.push({x, y: MARGIN * 0.42 + (random(`coast${i}`) - 0.5) * 220});
  const coastD = smooth(coast, false);
  const seaD = `${coastD}L${W + 80} -80L-80 -80Z`;
  // 湖：每兩列之間的中間欄空隙
  const lakes: (P & {d: string; r: number})[] = [];
  for (let r = 0; r < rows - 1; r++) {
    const o = stationOrigin(r * COLS + 1);
    const c = {x: o.x + 960 + (random(`lk${r}`) - 0.5) * 600, y: o.y + 1080 + (SY - 1080) / 2};
    lakes.push({...c, r: 150, d: blob(c.x, c.y, 150, `lake${r}`, 9, 0.16)});
  }
  // 等高線山丘：站與站之間的空隙
  const hills: (P & {r: number})[] = [];
  for (let i = 0; i < n; i++) {
    const o = stationOrigin(i);
    hills.push({x: o.x + 1920 + (SX - 1920) / 2, y: o.y + 300 + random(`hy${i}`) * 500, r: 180 + random(`hr${i}`) * 80});
    hills.push({x: o.x + 400 + random(`hx${i}`) * 1100, y: o.y + 1080 + (SY - 1080) / 2 + (random(`hy2${i}`) - 0.5) * 120, r: 160 + random(`hr2${i}`) * 60});
  }
  const contours = hills.flatMap((h, hi) => [0.35, 0.6, 0.82, 1].map((k, ki) => ({d: blob(h.x, h.y, h.r * k, `hill${hi}-${ki}`, 10, 0.18), cx: h.x, cy: h.y, k})));
  // 樹與山：只放在站與站之間（站內由各站自己點綴），避開湖
  const free = (x: number, y: number) => x > 140 && x < W - 140 && y > MARGIN * 0.42 + 200 && y < H - 140 && !inStation(x, y, n, 30)
    && lakes.every((l) => Math.hypot(l.x - x, l.y - y) > l.r + 90);
  const scatter = (seed: string, cnt: number) => {
    const out: P[] = [];
    for (let i = 0; out.length < cnt && i < cnt * 20; i++) {
      const x = random(`${seed}x${i}`) * W, y = random(`${seed}y${i}`) * H;
      if (free(x, y)) out.push({x, y});
    }
    return out;
  };
  const area = (W * H) / 1e6;
  const trees = scatter('tree', Math.round(area * 4.5));
  const mounts = scatter('mount', Math.round(area * 1.6));
  const blots = Array.from({length: Math.round(area * 1.4)}, (_, i) => ({
    x: random(`bx${i}`) * W, y: random(`by${i}`) * H, r: 140 + random(`br${i}`) * 320, o: 0.05 + random(`bo${i}`) * 0.07,
  }));
  // 圖例框與大羅盤：放在第一個站右側空隙的下方
  const o0 = stationOrigin(Math.min(1, n - 1));
  const legend = {x: o0.x - (SX - 1920) / 2 - 280, y: o0.y + 1080 + 40};
  const rose = {x: stationOrigin(0).x - 420, y: stationOrigin(0).y + 560};
  return {W, H, coastD, seaD, lakes, contours, trees, mounts, blots, legend, rose};
};

/** 地圖本體（世界座標，鏡頭用 SVG viewBox：向量縮放、清晰）＋路線＋圖釘 */
export const Terrain: React.FC<{f: number; cam: Cam; scenes: Sc[]}> = ({f, cam, scenes}) => {
  const n = scenes.length;
  const T = useMemo(() => makeTerrain(n), [n]);
  const legs = useMemo(() => scenes.map((s, i) => (i === 0 ? [] : quadPts(anchorOf(i - 1, scenes[i - 1].type), anchorOf(i, s.type), (i % 2 ? 1 : -1) * 0.16))),
    [scenes]);
  const vw = 1920 / cam.z, vh = 1080 / cam.z;
  const x0 = cam.x - 960 / cam.z, y0 = cam.y - 450 / cam.z;
  const near = (x: number, y: number, m = 450) => x > x0 - m && x < x0 + vw + m && y > y0 - m && y < y0 + vh + m;
  const k = Math.max(1, 0.62 / cam.z);
  const {W, H} = T;
  return (
    <svg data-qa="ignore" width={1920} height={1080} viewBox={`${x0} ${y0} ${vw} ${vh}`} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="mqEdge" cx="50%" cy="50%" r="72%">
          <stop offset="62%" stopColor="#8a5a2b" stopOpacity={0} />
          <stop offset="100%" stopColor="#6b3f1c" stopOpacity={0.45} />
        </radialGradient>
      </defs>
      <rect x={x0 - 10} y={y0 - 10} width={vw + 20} height={vh + 20} fill={TABLE} />
      <rect x={30} y={40} width={W} height={H} fill="#000" opacity={0.35} />
      <rect x={0} y={0} width={W} height={H} fill={PAPER} />
      {T.blots.map((b, i) => near(b.x, b.y, b.r) && <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#c39a5c" opacity={b.o} />)}
      {/* 經緯格線 */}
      <g stroke="#a88a52" strokeWidth={2.5 * k} opacity={0.3} strokeDasharray={`${18 * k} ${14 * k}`}>
        {Array.from({length: Math.floor(W / 480)}, (_, i) => (i + 1) * 480).filter((x) => x > x0 - 10 && x < x0 + vw + 10)
          .map((x) => <line key={`v${x}`} x1={x} y1={Math.max(0, y0)} x2={x} y2={Math.min(H, y0 + vh)} />)}
        {Array.from({length: Math.floor(H / 480)}, (_, i) => (i + 1) * 480).filter((y) => y > y0 - 10 && y < y0 + vh + 10)
          .map((y) => <line key={`h${y}`} x1={Math.max(0, x0)} y1={y} x2={Math.min(W, x0 + vw)} y2={y} />)}
      </g>
      {/* 北方海岸 */}
      {y0 < MARGIN && (<>
        <path d={T.seaD} fill={SEA} opacity={0.75} />
        {[1, 2, 3].map((i) => <path key={i} d={T.coastD} transform={`translate(0 ${i * 24})`} fill="none" stroke={SEA_INK} strokeWidth={3 * k} opacity={0.5 - i * 0.12} />)}
        <path d={T.coastD} fill="none" stroke={INK} strokeWidth={6 * k} />
        {[0.15, 0.4, 0.65, 0.88].map((t, i) => <Waves key={i} x={W * t} y={MARGIN * 0.18} n={3} k={k} />)}
        <text x={W * 0.52} y={MARGIN * 0.22} textAnchor="middle" fontFamily={CINZEL} fontWeight={700} fontSize={64} fill={SEA_INK} letterSpacing={18} opacity={0.8}>MARE NOSTRUM</text>
      </>)}
      {/* 湖 */}
      {T.lakes.map((l, i) => near(l.x, l.y, 300) && (
        <g key={i}>
          <path d={l.d} fill={SEA} stroke={INK} strokeWidth={5 * k} />
          <Waves x={l.x - 40} y={l.y} n={2} k={k} />
        </g>
      ))}
      {/* 等高線 */}
      <g fill="none" stroke="#9c7440" opacity={0.42}>
        {T.contours.map((c, i) => near(c.cx, c.cy, 400) && <path key={i} d={c.d} strokeWidth={(c.k === 1 ? 3.5 : 2.5) * k} />)}
      </g>
      {T.mounts.map((m, i) => near(m.x, m.y) && <Mount key={i} x={m.x} y={m.y} k={k} />)}
      {T.trees.map((t, i) => near(t.x, t.y) && <Tree key={i} x={t.x} y={t.y} k={k} />)}
      {/* 圖例框 */}
      {near(T.legend.x + 280, T.legend.y + 180, 500) && (
        <g transform={`translate(${T.legend.x} ${T.legend.y})`}>
          <rect width={560} height={300} fill={PAPER2} stroke={INK} strokeWidth={5} />
          <rect x={12} y={12} width={536} height={276} fill="none" stroke={INK} strokeWidth={2} />
          <text x={280} y={70} textAnchor="middle" fontFamily={SERIF} fontWeight={900} fontSize={46} fill={INK}>圖　例</text>
          <line x1={50} y1={135} x2={160} y2={135} stroke={RED} strokeWidth={9} strokeDasharray="22 14" strokeLinecap="round" />
          <text x={190} y={150} fontFamily={KAI} fontWeight={700} fontSize={40} fill={INK}>探索路線</text>
          <g transform="translate(105 250) scale(0.55)">
            <line x1={0} y1={0} x2={0} y2={-60} stroke="#7a7a7a" strokeWidth={6} /><circle cx={0} cy={-84} r={32} fill={RED} stroke="#6e1712" strokeWidth={4} />
          </g>
          <text x={190} y={232} fontFamily={KAI} fontWeight={700} fontSize={40} fill={INK}>已到訪</text>
        </g>
      )}
      {near(T.rose.x, T.rose.y, 400) && <g transform={`translate(${T.rose.x} ${T.rose.y})`}><CompassRose size={200} rot={Math.sin(f / 70) * 3} /></g>}
      {/* 紙張燒黃邊與雙框 */}
      <rect x={0} y={0} width={W} height={H} fill="url(#mqEdge)" />
      <rect x={45} y={45} width={W - 90} height={H - 90} fill="none" stroke={INK} strokeWidth={8 * k} />
      <rect x={65} y={65} width={W - 130} height={H - 130} fill="none" stroke={INK} strokeWidth={3 * k} />
      {/* 紅色虛線路線（換站時和鏡頭同步畫出） */}
      {scenes.map((s, i) => {
        if (i === 0) return null;
        const p = legP(f, s);
        if (p <= 0) return null;
        const pts = legs[i];
        const a = pts[0], b = pts[pts.length - 1];
        if (!near((a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(b.x - a.x, b.y - a.y))) return null;
        return <DashRoute key={i} pts={pts} p={p} w={10 * k} f={f} />;
      })}
      {/* 每站的圖釘（到站時插下，之後一直留著＝走過的路） */}
      {scenes.map((s, i) => {
        const a = anchorOf(i, s.type);
        if (!near(a.x, a.y, 300)) return null;
        return <Pin key={i} x={a.x} y={a.y} f={f} at={s.from + (i === 0 ? 8 : PIN_AT)} size={Math.min(k, 2.2)} />;
      })}
      {/* 第一站起點的小旗 */}
      {n > 0 && near(anchorOf(0, scenes[0].type).x, anchorOf(0, scenes[0].type).y) && (() => {
        const a = anchorOf(0, scenes[0].type);
        return <circle cx={a.x} cy={a.y} r={14} fill={PAPER} stroke={RED} strokeWidth={5} opacity={pr(f, 4, 10)} />;
      })()}
    </svg>
  );
};
