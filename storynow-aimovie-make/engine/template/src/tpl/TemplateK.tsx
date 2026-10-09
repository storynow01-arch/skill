/* 範本 K：宇宙風 Cosmos —— 太空船航行：每個場景＝航線上的一個星體，鏡頭沿航線飛過去，抵達時 HUD 鎖定框「LOCKED」，全像資料面板展開，
   重點在旁白念到時逐行出現；回顧場景拉遠成星圖，走過的星依序點亮打勾。
   招牌特徵（概念忠實度）：①深空三層視差星點＋星雲漸層，航行時星點拉成光線 ②每個場景一顆星體（各自配色與特徵環）③鏡頭沿航線飛行（中途微拉遠）
   ④抵達鎖定框「LOCKED」＋全像面板逐行出現 ⑤發光大數字＋掃描圈 ⑥星圖：航線點亮、走過的星打勾 ⑦字幕＋畫面下緣深色漸層底。
   品檢約束：星空與內容一律 y<900（星空 svg 高 900＋遮罩）；LOCKED 只在標籤範圍柔和脈動（每秒 2 次）；面板 16 格展開／10 格收起；
   星點閃爍各自相位；循環平移的繞回點在畫面外；隨機一律 random(seed)；不用 feTurbulence／大模糊。
   場景語彙同範本 A～D（title／scenario／definition／cards／vs／stat／quiz／recap／qaEnd），欄位見 templates/範本風格_場景語彙.md。 */
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Easing, Sequence, interpolate, random, staticFile, useCurrentFrame} from 'remotion';
import {QaProbe} from '../QaProbe';
import {TplSpec, captionAt, cue, textW, wrap} from './common';
import {RollNum, rollProgress} from '../lib/rollnum';
import {BrandLogo} from './brand';
import {
  BG, Body, BodyG, CYAN, Cam, Diamond, GREEN, HoloPanel, LockFrame, NOTO, ORANGE, ORB, PALS, PAL_DANGER, PAL_GATE, PAL_HOME, PAL_SAFE, PAL_SUN,
  PURPLE, Pal, Pt, RED, Reveal, SUBTXT, ScanRing, SharedDefs, Ship, Starfield, clamp, glow, pop, pr,
} from '../lib/cosmos/kit';
import {CosmosIcon} from '../lib/cosmos/icons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;
type Scene = TplSpec['scenes'][number];

/* ───── 文字工具 ───── */
/** 物件文字分行：畫面上不放「，；」、不以「。」結尾（品檢「物件標點」）——逗號處優先斷行，放得下一行時改成全形空白 */
const lines = (raw: unknown, n: number, max: number): string[] => {
  const s = String(raw ?? '').trim().replace(/[。]+$/, '');
  const segs = s.split(/[，；]/).map((x) => x.trim()).filter(Boolean);
  if (!segs.length) return [];
  const joined = segs.join('　');
  if (textW(joined) <= n) return [joined];
  const out = segs.flatMap((x) => wrap(x, n));
  return out.length <= max ? out : wrap(joined, n).slice(0, max);
};
/** 每行都放得進 maxW 的字級 */
const fitL = (ls: string[], maxW: number, base: number, min = 26) =>
  Math.max(min, Math.min(base, ...ls.map((l) => maxW / Math.max(1, textW(l) * 1.04))));
const isAscii = (s: string) => /^[\u0000-ÿ]*$/.test(s);
const pad2 = (n: number) => String(n).padStart(2, '0');
const LETTER = (i: number) => String.fromCharCode(65 + i);

const INFO: Record<string, {en: string; zh: string}> = {
  title: {en: 'ORIGIN', zh: '母星'}, scenario: {en: 'ALERT', zh: '警戒星'}, definition: {en: 'CORE', zh: '核心星'},
  cards: {en: 'SYSTEM', zh: '衛星系'}, vs: {en: 'BINARY', zh: '雙星'}, stat: {en: 'STAR', zh: '恆星'},
  quiz: {en: 'GATE', zh: '星門'}, recap: {en: 'STAR MAP', zh: '星圖'}, qaEnd: {en: 'FINAL', zh: '終點站'},
};
const info = (t: string) => INFO[t] ?? INFO.definition;
const palOf = (i: number): Pal => PALS[i % PALS.length];

/* ───── 時間 ───── */
const PRE = 14;                 // 航行：切點前 14 格出發
const POST = 16;                // 切點後 16 格抵達
const POST_MAP = 30;            // 星圖拉遠／拉近：切點後 30 格
const CLOSE = 12;               // 場景最後 12 格收起面板

/* ───── 各場景的版面座標（以畫面座標設計；鏡頭停在該場景時 1:1 對齊） ───── */
const CARDS_TOP = 500;
const cardGeo = (n: number) => {
  const cw = (1800 - (n - 1) * 24) / n;
  return Array.from({length: n}, (_, j) => ({x: 60 + j * (cw + 24), w: cw, cx: 60 + j * (cw + 24) + cw / 2}));
};
const ORBIT = {cx: 960, cy: 300, rx: 820, ry: 160};
const orbitY = (x: number) => ORBIT.cy + ORBIT.ry * Math.sqrt(Math.max(0, 1 - ((x - ORBIT.cx) / ORBIT.rx) ** 2));
const quizYs = (n: number) => (n <= 2 ? [380, 620] : [310, 500, 690]).slice(0, Math.max(1, n));
const QZ = {gx: 300, gy: 490, gr: 140, dx: 1180};
const qaXs = [330, 750, 1170, 1590];
const QA_Y = 470;

const vsPal = (fr?: string): {pal: Pal; spot?: boolean; clouds?: boolean; ring?: boolean} =>
  fr === 'danger' ? {pal: PAL_DANGER, spot: true} : fr === 'success' ? {pal: PAL_SAFE, clouds: true} : {pal: PALS[0], ring: true};

/** 這個場景在世界裡的星體（版面座標） */
const bodiesOf = (s: Scene, i: number): Body[] => {
  const p = s.props ?? {};
  const id = `k${i}`;
  const pal = palOf(i);
  switch (s.type) {
    case 'title': return [{id, kind: 'planet', x: 960, y: 680, r: 180, ...PAL_HOME, ring: {tilt: -10, k: 1.7}, bands: 5}];
    case 'scenario': return [{id, kind: 'planet', x: 480, y: 500, r: 190, ...PAL_DANGER, spot: true, bands: 4}];
    case 'definition': return [{id, kind: 'planet', x: 380, y: 470, r: 170, ...pal, ring: {tilt: -16, k: 1.7}, bands: 5}];
    case 'cards': {
      const n = Math.max(1, Math.min(4, (p.cards ?? []).length));
      return [{id, kind: 'planet', x: ORBIT.cx, y: ORBIT.cy, r: 100, ...pal, ring: {tilt: 8, k: 1.8, dashed: true}, bands: 4},
        ...cardGeo(n).map((g, j) => ({id: `${id}m${j}`, kind: 'moon' as const, x: g.cx, y: orbitY(g.cx), r: 34, ...palOf(i + j + 1)}))];
    }
    case 'vs': {
      const L = vsPal(p.left?.frame ?? 'danger'), R = vsPal(p.right?.frame ?? 'success');
      return [
        {id: `${id}a`, kind: 'planet', x: 480, y: 360, r: 140, ...L.pal, spot: L.spot, clouds: L.clouds, ring: L.ring ? {tilt: -12, k: 1.7} : undefined, bands: 3},
        {id: `${id}b`, kind: 'planet', x: 1440, y: 360, r: 140, ...R.pal, spot: R.spot, clouds: R.clouds, ring: R.ring ? {tilt: 12, k: 1.7} : undefined, bands: 3},
      ];
    }
    case 'stat': return [{id, kind: 'sun', x: 460, y: 470, r: 150, ...PAL_SUN}];
    case 'quiz': {
      const ys = quizYs((p.options ?? []).length);
      return [{id, kind: 'gate', x: QZ.gx, y: QZ.gy, r: QZ.gr, ...PAL_GATE},
        ...ys.map((y, j) => ({id: `${id}d${j}`, kind: 'moon' as const, x: QZ.dx, y, r: 38, ...palOf(i + j + 1)}))];
    }
    case 'qaEnd': return qaXs.map((x, j) => ({id: `${id}q${j}`, kind: 'planet' as const, x, y: QA_Y, r: 78, ...palOf(i + j + 1),
      ring: j % 2 ? {tilt: -14, k: 1.7} : undefined, bands: 4}));
    case 'recap': return [];
    default: return [{id, kind: 'planet', x: 380, y: 470, r: 170, ...pal, bands: 5}];
  }
};

/* ───── 場景內時間（世界與面板共用） ───── */
const cardAt = (p: Any, cues: number[], j: number, arr: number) => Math.max(arr, cue(cues, p.cueMap?.[j], 20 + j * 30));
const vsAt = (p: Any, cues: number[], side: number, arr: number) => Math.max(arr, cue(cues, p.cueMap?.[side], side ? 40 : 6));
const quizReveal = (p: Any, cues: number[], dur: number) => cue(cues, p.revealCue, Math.round(dur * 0.6));
const qaAns = (p: Any) => Math.round((p.answerSec ?? 4) * 30);

/* ───── 航線計畫：每個場景一個錨點（回顧＝星圖不佔錨點），鏡頭分段飛行 ───── */
type Seg = {t0: number; t1: number; a: Cam; b: Cam; dip: number; leg: number};
type Plan = {anchors: (Pt | null)[]; nodes: number[]; legs: Pt[][]; segs: Seg[]; mapCam: Cam; arr: number[]};

const makePlan = (spec: TplSpec): Plan => {
  const sc = spec.scenes;
  const nodes = sc.map((s, i) => (s.type === 'recap' ? -1 : i)).filter((i) => i >= 0);
  const m = Math.max(1, nodes.length);
  const cols = m <= 3 ? m : Math.ceil(Math.sqrt(m));
  const anchors: (Pt | null)[] = sc.map(() => null);
  nodes.forEach((si, k) => {
    const r = Math.floor(k / cols);
    let c = k % cols;
    if (r % 2) c = cols - 1 - c;
    anchors[si] = {x: c * 2400 + (random(`kax${k}`) - 0.5) * 400, y: r * 1600 + (random(`kay${k}`) - 0.5) * 360};
  });
  // 航線：相鄰節點之間的二次曲線（41 點取樣）
  const legs: Pt[][] = nodes.slice(0, -1).map((si, k) => {
    const a = anchors[si]!, b = anchors[nodes[k + 1]]!;
    const len = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len, o = (k % 2 ? 1 : -1) * 0.14 * len;
    const c = {x: (a.x + b.x) / 2 + nx * o, y: (a.y + b.y) / 2 + ny * o};
    return Array.from({length: 41}, (_, t0) => {
      const t = t0 / 40;
      return {x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y};
    });
  });
  // 星圖鏡頭：整個星系放進畫面左側（x 50～1030、y 120～870），右側留給回顧面板
  const xs = nodes.map((i) => anchors[i]!.x), ys = nodes.map((i) => anchors[i]!.y);
  const x0 = Math.min(...xs) - 900, x1 = Math.max(...xs) + 900, y0 = Math.min(...ys) - 420, y1 = Math.max(...ys) + 440;
  const z = Math.min(980 / (x1 - x0), 750 / (y1 - y0), 0.5);
  const mapCam: Cam = {x: (x0 + x1) / 2 - (540 - 960) / z, y: (y0 + y1) / 2 - (495 - 450) / z, z};
  const camOf = (i: number): Cam => (anchors[i] ? {x: anchors[i]!.x, y: anchors[i]!.y, z: 1} : mapCam);
  const legOf = sc.map((_, i) => {
    const k = nodes.indexOf(i);
    return k > 0 ? k - 1 : -1;
  });
  const arr = sc.map((_, i) => (i === 0 ? 6 : !anchors[i] || !anchors[i - 1] ? POST_MAP : POST));
  const segs: Seg[] = sc.slice(1).map((s, k) => {
    const i = k + 1;
    const det = !!anchors[i] && !!anchors[i - 1];
    return {t0: s.from - PRE, t1: s.from + arr[i], a: camOf(i - 1), b: camOf(i), dip: det ? 0.42 : 0, leg: legOf[i]};
  });
  return {anchors, nodes, legs, segs, mapCam, arr};
};

const easeIO = Easing.inOut(Easing.cubic);
const lerpCam = (s: Seg, t: number): Cam => {
  const e = easeIO(Math.max(0, Math.min(1, t)));
  const z = Math.exp(Math.log(s.a.z) + (Math.log(s.b.z) - Math.log(s.a.z)) * e) * (1 - s.dip * Math.sin(Math.PI * e));
  return {x: s.a.x + (s.b.x - s.a.x) * e, y: s.a.y + (s.b.y - s.a.y) * e, z};
};
const camAt = (plan: Plan, spec: TplSpec, f: number): Cam => {
  const first = plan.anchors[0] ? {x: plan.anchors[0]!.x, y: plan.anchors[0]!.y, z: 1} : plan.mapCam;
  const pushEnd = Math.max(20, Math.min(90, (spec.scenes[1]?.from ?? 120) - PRE - 6));
  let c: Cam = {...first, z: first.z * interpolate(f, [0, pushEnd], [0.9, 1], {...clamp, easing: Easing.out(Easing.cubic)})};
  for (const s of plan.segs) {
    if (f < s.t0) break;
    c = f >= s.t1 ? s.b : lerpCam(s, (f - s.t0) / (s.t1 - s.t0));
  }
  return {x: c.x, y: c.y, z: c.z * (1 + 0.006 * Math.sin(f / 50))};
};
const partial = (pts: Pt[], p: number) => {
  if (p <= 0) return [] as Pt[];
  if (p >= 1) return pts;
  const fi = p * (pts.length - 1), i = Math.floor(fi), t = fi - i, a = pts[i], b = pts[i + 1];
  return [...pts.slice(0, i + 1), {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t}];
};
const ptsD = (pts: Pt[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join('');
/** 第 k 段航線飛過的比例 */
const legTravel = (plan: Plan, f: number, k: number) => {
  const s = plan.segs.find((g) => g.leg === k);
  return s ? easeIO(interpolate(f, [s.t0, s.t1], [0, 1], clamp)) : 0;
};

/* ───── 世界：航線、各場景星體（含軌道、航道、連線）、星圖打勾、太空船 ───── */
const SceneWorld: React.FC<{s: Scene; i: number; lf: number; f: number; arr: number}> = ({s, i, lf, f, arr}) => {
  const p = s.props ?? {};
  const cues = s.cues ?? [];
  const bodies = bodiesOf(s, i);
  const behind: React.ReactNode[] = [], ahead: React.ReactNode[] = [];
  let dimOf = (_k: number) => 1;
  if (s.type === 'cards') {
    const n = bodies.length - 1;
    behind.push(<ellipse key="orb" cx={ORBIT.cx} cy={ORBIT.cy} rx={ORBIT.rx} ry={ORBIT.ry} fill="none" stroke={CYAN} strokeOpacity={0.28} strokeWidth={2} strokeDasharray="6 10" />);
    cardGeo(n).forEach((g, j) => {
      const at = cardAt(p, cues, j, arr), k = pr(lf, at, 10), y0 = orbitY(g.cx) + 40;
      if (k > 0) behind.push(<line key={`cn${j}`} x1={g.cx} y1={y0} x2={g.cx} y2={y0 + (CARDS_TOP - y0) * k} stroke={CYAN} strokeOpacity={0.75} strokeWidth={2.5} />);
    });
    dimOf = (k) => (k === 0 ? 1 : 0.35 + 0.65 * pr(lf, cardAt(p, cues, k - 1, arr), 10));
  }
  if (s.type === 'vs') {
    const at1 = vsAt(p, cues, 1, arr), k = pr(lf, at1, 14);
    if (k > 0) behind.push(<line key="vsl" x1={640} y1={360} x2={640 + 640 * k} y2={360} stroke={ORANGE} strokeOpacity={0.5} strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-lf * 1.5} />);
    dimOf = (k) => 0.35 + 0.65 * pr(lf, vsAt(p, cues, k, arr), 10);
  }
  if (s.type === 'scenario') {
    const ph = (((lf % 45) + 45) % 45) / 45;     // 擴散警示環：頭尾透明度都是 0，繞回時看不出跳動
    ahead.push(<circle key="al" cx={480} cy={500} r={190 * (1.15 + 0.45 * ph)} fill="none" stroke={RED} strokeWidth={4} opacity={0.55 * Math.sin(Math.PI * ph)} />);
  }
  if (s.type === 'title' || s.type === 'definition') {   // 繞行的小衛星（在行星後方時畫在後面）
    const b = bodies[0], a = f / 70 + i;
    const moon = <BodyG key="mn" b={{id: `k${i}mn`, kind: 'moon', x: b.x + Math.cos(a) * b.r * 2.1, y: b.y + Math.sin(a) * b.r * 0.55, r: b.r * 0.16, ...palOf(i + 3)}} f={f} />;
    (Math.sin(a) > 0 ? ahead : behind).push(moon);
  }
  if (s.type === 'quiz') {
    const ys = quizYs((p.options ?? []).length);
    const reveal = quizReveal(p, cues, s.dur), rk = pr(lf, reveal, 10);
    const sx = QZ.gx + QZ.gr + 10;
    const curve = (y: number) => `M${sx} ${QZ.gy}C${sx + 300} ${QZ.gy} ${QZ.dx - 360} ${y} ${QZ.dx - 44} ${y}`;
    ys.forEach((y, j) => {
      const at = Math.max(arr, 20 + j * 12), a = pr(lf, at, 12);
      const right = j === p.answerIndex;
      const c = right ? CYAN : rk > 0 ? RED : CYAN;
      behind.push(
        <g key={`rt${j}`} opacity={a}>
          <path d={curve(y)} fill="none" stroke={c} strokeOpacity={right ? 0.7 : 0.7 - 0.45 * rk} strokeWidth={3} strokeDasharray="14 10" strokeDashoffset={-lf * 1.2} />
          {right && rk > 0 && (<>
            <path d={curve(y)} fill="none" stroke={ORANGE} strokeOpacity={0.3 * rk} strokeWidth={16} strokeLinecap="round" />
            <path d={curve(y)} fill="none" stroke="#fff4dc" strokeOpacity={rk} strokeWidth={4} strokeLinecap="round" />
          </>)}
        </g>,
      );
    });
    dimOf = (k) => (k === 0 || rk <= 0 || k - 1 === p.answerIndex ? 1 : 1 - 0.6 * rk);
    // 太空船：揭曉前在星門口待命，揭曉後沿正確航道飛過去
    const yA = ys[Math.max(0, Math.min(ys.length - 1, p.answerIndex ?? 0))];
    const t = easeIO(interpolate(lf, [reveal + 6, reveal + 54], [0, 1], clamp));
    const P0 = {x: sx, y: QZ.gy}, P1 = {x: sx + 300, y: QZ.gy}, P2 = {x: QZ.dx - 360, y: yA}, P3 = {x: QZ.dx - 44, y: yA};
    const bz = (u: number) => ({
      x: (1 - u) ** 3 * P0.x + 3 * (1 - u) ** 2 * u * P1.x + 3 * (1 - u) * u * u * P2.x + u ** 3 * P3.x,
      y: (1 - u) ** 3 * P0.y + 3 * (1 - u) ** 2 * u * P1.y + 3 * (1 - u) * u * u * P2.y + u ** 3 * P3.y,
    });
    const q = bz(t), q2 = bz(Math.min(1, t + 0.01)), q1 = bz(Math.max(0, t - 0.01));
    const ang = (Math.atan2(q2.y - q1.y, q2.x - q1.x) * 180) / Math.PI;
    const hover = Math.sin(lf / 14) * 5 * (1 - t);
    const sa = pr(lf, arr, 10) * (1 - pr(lf, reveal + 50, 8));
    ahead.push(<g key="ship" transform={`translate(${q.x} ${q.y + hover}) rotate(${ang})`} opacity={sa}><Ship f={f} s={1.3} /></g>);
  }
  if (s.type === 'qaEnd') {
    const ans = qaAns(p), k = pr(lf, ans, 10);
    const ai = Math.max(0, Math.min(3, p.answerIndex ?? 0));
    dimOf = (j) => (j === ai ? 1 : 1 - 0.62 * k);
    const b = bodies[ai];
    if (k > 0) ahead.push(<circle key="ag" cx={b.x} cy={b.y} r={b.r * (1.5 + 0.06 * Math.sin(lf / 12))} fill="none" stroke={ORANGE} strokeWidth={4} opacity={0.8 * k} />);
  }
  return (
    <>
      {behind}
      {bodies.map((b, k) => <BodyG key={b.id} b={b} f={f} bob={b.kind === 'moon' ? 0 : Math.sin(f / 45 + i + k) * 4} opacity={dimOf(k)} />)}
      {ahead}
    </>
  );
};

const World: React.FC<{spec: TplSpec; plan: Plan; f: number; cam: Cam}> = ({spec, plan, f, cam}) => {
  const z = cam.z, vw = 1920 / z, vh = 1080 / z, x0 = cam.x - 960 / z, y0 = cam.y - 450 / z;
  const mapA = interpolate(z, [0.3, 0.55], [1, 0], clamp);
  const sw = (px: number) => px / z;
  const ri = spec.scenes.findIndex((s) => s.type === 'recap');
  const recapFrom = ri >= 0 ? spec.scenes[ri].from + plan.arr[ri] : 1e9;
  const visitedBefore = plan.nodes.filter((i) => ri < 0 || i < ri);
  const lightAt = (k: number) => recapFrom + 6 + k * 9;
  /** 星圖上這顆星亮不亮：回顧時依序點亮；還沒去的星維持暗 */
  const litK = (si: number) => {
    const k = visitedBefore.indexOf(si);
    if (k < 0) return f >= spec.scenes[si].from + plan.arr[si] ? 1 : 0;
    return f < recapFrom - 30 ? 1 : pr(f, lightAt(k), 10);
  };
  // 太空船位置：正在飛的那段航線，或最後抵達的節點
  let ship: {p: Pt; a: number; on: number} | null = null;
  for (let k = 0; k < plan.legs.length; k++) {
    const t = legTravel(plan, f, k);
    if (t <= 0) break;
    const L = plan.legs[k];
    const pts = partial(L, Math.min(t, 0.999));
    const q = pts[pts.length - 1], q0 = pts[Math.max(0, pts.length - 2)];
    ship = {p: t < 1 ? q : L[L.length - 1], a: Math.atan2(q.y - q0.y, q.x - q0.x), on: t < 1 ? Math.sin(Math.PI * t) : 0};
  }
  if (!ship && plan.nodes.length) ship = {p: plan.anchors[plan.nodes[0]]!, a: -Math.PI / 2, on: 0};
  const shipA = ship ? Math.max(mapA, ship.on) : 0;
  return (
    <svg width={1920} height={1080} viewBox={`${x0} ${y0} ${vw} ${vh}`} style={{position: 'absolute', inset: 0}}>
      <SharedDefs />
      {plan.legs.map((L, k) => {
        const done = partial(L, legTravel(plan, f, k));
        const endLit = ri >= 0 && f >= recapFrom - 30 ? litK(plan.nodes[k + 1]) : 1;
        return (
          <g key={k}>
            <path d={ptsD(L)} fill="none" stroke={CYAN} strokeOpacity={0.16 + 0.22 * mapA} strokeWidth={sw(2.2)} strokeDasharray={`${sw(12)} ${sw(9)}`} strokeLinecap="round" />
            {done.length > 1 && (<>
              <path d={ptsD(done)} fill="none" stroke={CYAN} strokeOpacity={(0.14 + 0.2 * mapA) * (0.5 + 0.5 * endLit)} strokeWidth={sw(12)} strokeLinecap="round" />
              <path d={ptsD(done)} fill="none" stroke="#c8f6ff" strokeOpacity={0.5 + 0.4 * endLit} strokeWidth={sw(3.2)} strokeLinecap="round" />
            </>)}
          </g>
        );
      })}
      {spec.scenes.map((s, i) => {
        const A = plan.anchors[i];
        if (!A) return null;
        if (A.x + 1100 < x0 || A.x - 1100 > x0 + vw || A.y + 700 < y0 || A.y - 700 > y0 + vh) return null;
        const lit = 1 - 0.62 * mapA * (1 - litK(i));
        return (
          <g key={s.id} transform={`translate(${A.x - 960} ${A.y - 450})`} opacity={lit}>
            <SceneWorld s={s} i={i} lf={f - s.from} f={f} arr={plan.arr[i]} />
          </g>
        );
      })}
      {/* 星圖：走過的星依序打勾 */}
      {mapA > 0 && ri >= 0 && visitedBefore.map((si, k) => {
        const A = plan.anchors[si]!;
        const mb = bodiesOf(spec.scenes[si], si)[0];   // 勾勾放在主星體右上角
        const cx = A.x + (mb ? mb.x - 960 + mb.r * 1.05 : 0), cy = A.y + (mb ? mb.y - 450 - mb.r * 1.05 : -560);
        const c = pop(f, lightAt(k) + 4, 12);
        if (c <= 0) return null;
        return (
          <g key={`ck${si}`} transform={`translate(${cx} ${cy}) scale(${c / z})`} opacity={mapA}>
            <circle r={20} fill="rgba(8,20,40,0.85)" stroke={GREEN} strokeWidth={3} />
            <path d="M-9 0L-2 8L10 -7" fill="none" stroke={GREEN} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      {ship && shipA > 0 && (
        <g transform={`translate(${ship.p.x} ${ship.p.y}) rotate(${(ship.a * 180) / Math.PI}) scale(${1.3 / z})`} opacity={shipA}><Ship f={f} /></g>
      )}
    </svg>
  );
};

/* ───── 面板層：9 種場景 ───── */
type OP = {p: Any; cues: number[]; dur: number; i: number; arr: number; code: string; f: number; out: number;
  toS: (x: number, y: number) => Pt; z: number};

const H = (c: string, t: string, size = 18): React.ReactNode => (
  <div style={{fontFamily: ORB, fontWeight: 700, fontSize: size, letterSpacing: 5, color: c, whiteSpace: 'nowrap', lineHeight: 1.2}}>{t}</div>
);
const txt = (size: number, color = '#fff', w = 900): React.CSSProperties => ({fontFamily: NOTO, fontWeight: w, fontSize: size, color, lineHeight: 1.25, whiteSpace: 'nowrap'});

/** 鎖定框層（螢幕座標，跟著星體走） */
const Locks: React.FC<{children?: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={900} style={{position: 'absolute', left: 0, top: 0, overflow: 'hidden'}}>{children}</svg>
);
const lockOf = (o: OP, lx: number, ly: number, r: number, at: number, extra: {label?: string; color?: string; code?: string} = {}) => {
  const q = o.toS(lx, ly);
  return <LockFrame key={`${lx}-${ly}`} f={o.f} at={at} sx={q.x} sy={q.y} r={r * o.z} code={o.code} out={o.out} {...extra} />;
};
/** 鎖定框到面板的連線 */
const Link: React.FC<{o: OP; lx: number; ly: number; r: number; tx: number; ty: number; at: number; c?: string}> = ({o, lx, ly, r, tx, ty, at, c = ORANGE}) => {
  const k = pr(o.f, at, 12);
  if (k <= 0) return null;
  const q = o.toS(lx, ly), s = r * o.z * 1.32;
  return <polyline points={`${q.x + s} ${q.y - s} ${q.x + s + 50} ${ty} ${tx} ${ty}`} fill="none" stroke={c} strokeWidth={2.5} strokeOpacity={0.8 * (1 - o.out)}
    pathLength={1} strokeDasharray={`${k} 2`} />;
};

/** title：母星特寫＋上方發光大標題 */
const Title: React.FC<OP> = (o) => {
  const {p, cues, f} = o;
  const b = Math.max(14, cue(cues, 0, 14));
  const eyebrow = String(p.eyebrow ?? '');
  const tl = lines(p.title, 10, 2);
  const ts = fitL(tl, 1500, tl.length > 1 ? 100 : 128, 56);
  const sub = String(p.subtitle ?? ''), en = String(p.en ?? '');
  const tp = pop(f, b, 14);
  const sp = pr(f, b + 22, 16);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 104, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{...txt(30, CYAN, 700), fontFamily: isAscii(eyebrow) ? ORB : NOTO, letterSpacing: 8, opacity: pr(f, 6, 12), height: 40}}>
        {eyebrow ? `◆ ${eyebrow} ◆` : 'DESTINATION ▸ KNOWLEDGE'}
      </div>
      <div style={{marginTop: 8, opacity: Math.min(1, tp), transform: `scale(${0.82 + 0.18 * Math.min(1.04, tp)})`, textAlign: 'center'}}>
        {tl.map((l, k) => <div key={k} style={{...txt(ts), letterSpacing: 6, ...glow(PURPLE), lineHeight: 1.18}}>{l}</div>)}
      </div>
      {sub && (
        <div style={{...txt(fitL([sub], 1300, 54, 30), ORANGE), letterSpacing: 10, marginTop: 10, opacity: sp, textShadow: `0 0 14px ${ORANGE}88`,
          clipPath: `inset(-20% ${(1 - sp) * 50}% -20% ${(1 - sp) * 50}%)`}}>{sub}</div>
      )}
      {en && <div style={{...txt(24, CYAN, 700), fontFamily: ORB, letterSpacing: 10, marginTop: 8, opacity: pr(f, b + 30, 14)}}>{en}</div>}
    </div>
  );
};

/** scenario：紅色警戒星＋右側 ALERT 面板（雷達上逐一出現光點，問題逐條出現） */
const Scenario: React.FC<OP> = (o) => {
  const {p, cues, f, arr} = o;
  const pills: string[] = (p.pills ?? []).slice(0, 5);
  const lastP = p.lastIsProblem !== false;
  const ats = pills.map((_, j) => Math.max(arr + 4, cue(cues, p.cueMap?.[j], 20 + j * 30)));
  const hl = lines(p.heading, 9, 2);
  const hs = fitL(hl, 470, 60, 32);
  const rowH = 84, top = 186;
  const h = top + pills.length * rowH + (lastP ? 16 : 0) + 30;
  const blips = [[38, -40], [-46, 18], [20, 46], [-28, -48], [52, 10]];
  return (<>
    <Locks>
      {lockOf(o, 480, 500, 190, arr, {color: RED, label: 'WARNING'})}
      <Link o={o} lx={480} ly={500} r={190} tx={1000} ty={150} at={arr + 4} c={RED} />
    </Locks>
    <HoloPanel f={f} at={arr - 2} x={1000} y={120} w={860} h={h} acc={RED} out={o.out}>
      {H(RED, `◆ ALERT ▸ ${o.code}`)}
      <CosmosIcon icon={p.sketch ?? p.icon ?? '⚠️'} at={arr + 6} x={0} y={42} size={100} />
      <div style={{position: 'absolute', left: 120, top: 40 + (hl.length > 1 ? 0 : hs * 0.35)}}>
        {hl.map((l, k) => <div key={k} style={{...txt(hs), ...glow(RED)}}>{l}</div>)}
      </div>
      {/* 雷達：每個現象一個光點 */}
      <svg width={150} height={150} viewBox="-75 -75 150 150" style={{position: 'absolute', right: -6, top: -4}}>
        <circle r={66} fill="rgba(40,8,12,0.6)" stroke={RED} strokeOpacity={0.6} strokeWidth={2} />
        <circle r={44} fill="none" stroke={RED} strokeOpacity={0.3} />
        <circle r={22} fill="none" stroke={RED} strokeOpacity={0.3} />
        <g transform={`rotate(${f * 4})`}>
          <path d="M0 0L66 0A66 66 0 0 0 46.7 -46.7Z" fill={RED} opacity={0.22} />
          <line x1={0} y1={0} x2={66} y2={0} stroke="#ffd0d0" strokeWidth={2} />
        </g>
        {pills.map((_, j) => {
          const k = pop(f, ats[j], 12);
          const [bx, by] = blips[j % blips.length];
          const last = lastP && j === pills.length - 1;
          return k > 0 && <circle key={j} cx={bx} cy={by} r={(last ? 7 : 5) * Math.min(1.2, k)} fill={last ? '#fff' : ORANGE} stroke={last ? RED : 'none'} strokeWidth={3} />;
        })}
      </svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 160, height: 2, background: `linear-gradient(90deg, ${RED}, transparent)`}} />
      {pills.map((t, j) => {
        const last = lastP && j === pills.length - 1;
        const ls = lines(t, 99, 1);
        const sz = fitL(ls, last ? 600 : 680, last ? 50 : 44, 28);
        return (
          <Reveal key={j} f={f} at={ats[j]} style={{position: 'absolute', left: 0, right: 0, top: top + j * rowH + (last ? 10 : 0), height: last ? rowH : rowH - 8,
            display: 'flex', alignItems: 'center', gap: 20, paddingLeft: last ? 16 : 6, boxSizing: 'border-box',
            background: last ? 'rgba(255,90,90,0.16)' : undefined, borderLeft: last ? `5px solid ${RED}` : undefined}}>
            {last
              ? <div style={{fontFamily: ORB, fontWeight: 900, fontSize: 30, color: '#1a0505', background: RED, padding: '0 10px', lineHeight: 1.3}}>?!</div>
              : <Diamond c={ORANGE} />}
            <div style={{...txt(sz, last ? '#fff' : '#eaf2ff'), ...(last ? glow(RED) : {})}}>{ls[0]}</div>
          </Reveal>
        );
      })}
    </HoloPanel>
  </>);
};

/** definition 的大字一行：highlight 那段在 hlAt 時畫上發光底線並轉青色 */
const BigLine: React.FC<{text: string; hl: string; hlAt: number; size: number; f: number}> = ({text, hl, hlAt, size, f}) => {
  const i = hl ? text.indexOf(hl) : -1;
  const k = pr(f, hlAt, 12);
  const st: React.CSSProperties = {...txt(size), letterSpacing: 4, ...glow('#5a8cff'), lineHeight: 1.3};
  if (i < 0) return <div style={st}>{text}</div>;
  return (
    <div style={st}>
      {text.slice(0, i)}
      <span style={{position: 'relative', color: k > 0.5 ? '#9ff6ff' : '#fff'}}>
        {hl}
        <span style={{position: 'absolute', left: 0, bottom: -size * 0.04, height: size * 0.09, width: `${k * 100}%`, background: CYAN,
          boxShadow: `0 0 14px ${CYAN}, 0 0 30px ${CYAN}`, borderRadius: 2}} />
      </span>
      {text.slice(i + hl.length)}
    </div>
  );
};

/** definition：行星＋全像大字定義（重點發光底線），下方補充晶片 */
const Definition: React.FC<OP> = (o) => {
  const {p, cues, f, arr} = o;
  const big = String(p.bigText ?? p.title ?? ''), hl = String(p.highlight ?? '');
  const notes: string[] = (p.sideNotes ?? []).slice(0, 3);
  const hasN = notes.length > 0;
  const fh = hasN ? 470 : 640;
  const bl = (() => {     // 換行時盡量不要把 highlight 切成兩半
    const one = lines(big, 99, 1);
    if (one.length === 1 && fitL(one, 1040, 116, 20) >= 78) return one;   // 一行放得下（字級 ≥78）就不換行，避免最後一個字掉到第二行
    const ls = lines(big, Math.ceil(textW(one[0] ?? big) / 2), 2);
    if (hl && ls.length === 2 && !ls.some((ln) => ln.includes(hl)) && big.includes(hl)) {
      const j = big.indexOf(hl), cut = j + hl.length <= 11 ? j + hl.length : j;
      return [big.slice(0, cut), big.slice(cut)].filter(Boolean);
    }
    return ls;
  })();
  const size = fitL(bl, 1040, 116, 56);
  const at0 = Math.max(arr + 6, cue(cues, p.cueMap?.[0], arr + 6)), hlAt = Math.max(at0 + 10, cue(cues, p.cueMap?.[1], at0 + 30));
  const nw = hasN ? (1180 - (notes.length - 1) * 24) / notes.length : 0;
  const label = p.label ? String(p.label) : '';
  const bp = pr(f, at0, 14);
  return (<>
    <Locks>
      {lockOf(o, 380, 470, 170, arr)}
      <Link o={o} lx={380} ly={470} r={170} tx={680} ty={170} at={arr + 4} />
    </Locks>
    <HoloPanel f={f} at={arr - 2} x={680} y={130} w={1180} h={fh} acc={CYAN} out={o.out}>
      {H(CYAN, `◆ DEFINITION ▸ ${o.code}`)}
      {label && (
        <div style={{position: 'absolute', left: 0, top: 36, ...txt(fitL([label], 600, 34, 24), '#1a0c00'), background: ORANGE, padding: '2px 16px',
          borderRadius: 4, boxShadow: `0 0 16px ${ORANGE}88`, opacity: pr(f, arr + 8, 10)}}>{label}</div>
      )}
      {f >= at0 && (
        <div style={{position: 'absolute', left: '50%', top: fh * (hasN ? 0.56 : 0.5) - 26, transform: `translate(-50%, -50%) scale(${0.9 + 0.1 * bp})`,
          opacity: Math.min(1, bp * 1.4), textAlign: 'center', clipPath: `inset(-30% ${(1 - bp) * 50}% -30% ${(1 - bp) * 50}%)`}}>
          {bl.map((ln, k) => <BigLine key={k} text={ln} hl={hl} hlAt={hlAt} size={size} f={f} />)}
        </div>
      )}
    </HoloPanel>
    {notes.map((t, j) => {
      const at = Math.max(at0 + 10, cue(cues, p.noteCues?.[j], at0 + 40 + j * 15));
      const ls = lines(t, 9, 2);
      const acc = palOf(o.i + j + 1).acc;
      return (
        <HoloPanel key={j} f={f} at={at} x={680 + j * (nw + 24)} y={630} w={nw} h={150} acc={acc} out={o.out} pad="18px 24px">
          <div style={{display: 'flex', alignItems: 'center', gap: 18, height: '100%'}}>
            <Diamond c={acc} size={18} />
            <div>{ls.map((l, k) => <div key={k} style={txt(fitL(ls, nw - 110, 46, 26), '#eaf2ff')}>{l}</div>)}</div>
          </div>
        </HoloPanel>
      );
    })}
  </>);
};

/** cards：中央行星＋2～4 顆衛星，每顆衛星垂下一張資料卡 */
const Cards: React.FC<OP> = (o) => {
  const {p, cues, f, arr} = o;
  const cards: {icon?: string; sketch?: string; title?: string; note?: string}[] = (p.cards ?? []).slice(0, 4);
  const n = Math.max(1, cards.length);
  const geo = cardGeo(n);
  const ch = p.footer ? 290 : 360;
  const heading = String(p.heading ?? '');
  const lastAt = cards.length ? cardAt(p, cues, cards.length - 1, arr) : arr + 20;
  const footAt = Math.max(lastAt + 12, cue(cues, cues.length - 1, lastAt + 12));
  return (<>
    <Locks>{lockOf(o, ORBIT.cx, ORBIT.cy, 100, arr)}</Locks>
    <Reveal f={f} at={arr} style={{position: 'absolute', left: 64, top: 100}}>
      {H(CYAN, `◆ SYSTEM ▸ ${o.code}`)}
      {heading && <div style={{...txt(fitL([heading], 660, 58, 32)), ...glow(CYAN), marginTop: 4}}>{heading}</div>}
    </Reveal>
    {cards.map((c, j) => {
      const g = geo[j], at = cardAt(p, cues, j, arr), acc = palOf(o.i + j + 1).acc;
      const iw = g.w - 48;
      const s = Math.min(104, ch * 0.3);
      const title = String(c.title ?? '');
      const ts = fitL([title], iw, 50, 28);
      const nl = c.note ? lines(c.note, Math.max(4, Math.floor(iw / 38)), 2) : [];
      const ns = fitL(nl.length ? nl : [' '], iw, 36, 22);
      return (
        <HoloPanel key={j} f={f} at={at} x={g.x} y={CARDS_TOP} w={g.w} h={ch} acc={acc} out={o.out} origin="center top" pad="16px 24px">
          <div style={{fontFamily: ORB, fontWeight: 900, fontSize: 22, color: acc, letterSpacing: 3}}>{pad2(j + 1)}</div>
          <CosmosIcon icon={c.sketch ?? c.icon} at={at + 4} x={(iw - s) / 2} y={14} size={s} float />
          <div style={{position: 'absolute', left: 0, right: 0, top: s + 30, textAlign: 'center'}}>
            {title && <Reveal f={f} at={at + 6} center style={{...txt(ts), ...glow(acc)}}>{title}</Reveal>}
            {nl.length > 0 && <Reveal f={f} at={at + 10} center style={{marginTop: 8}}>{nl.map((l, k) => <div key={k} style={txt(ns, SUBTXT, 700)}>{l}</div>)}</Reveal>}
          </div>
        </HoloPanel>
      );
    })}
    {p.footer && (
      <Reveal f={f} at={footAt} center style={{position: 'absolute', left: 0, right: 0, top: 812, display: 'flex', justifyContent: 'center'}}>
        <div style={{...txt(fitL([String(p.footer)], 1300, 38, 26)), padding: '4px 34px', border: `2px solid ${ORANGE}`, borderRadius: 6,
          background: 'rgba(40,20,4,0.6)', boxShadow: `0 0 18px ${ORANGE}66`}}>{lines(p.footer, 99, 1)[0]}</div>
      </Reveal>
    )}
  </>);
};

/** vs：雙星對比（紅色危險星 vs 綠色宜居星），中間 VS，下方各自的資料面板 */
const Vs: React.FC<OP> = (o) => {
  const {p, cues, f, arr} = o;
  const at1 = vsAt(p, cues, 1, arr);
  const side = (sd: {frame?: string; icon?: string; sketch?: string; text?: string} | undefined, j: number) => {
    const d = sd ?? {};
    const fr = d.frame ?? (j ? 'success' : 'danger');
    const at = vsAt(p, cues, j, arr);
    const c = fr === 'danger' ? RED : fr === 'success' ? GREEN : CYAN;
    const head = fr === 'danger' ? 'NG ▸ DANGER ZONE' : fr === 'success' ? 'OK ▸ HABITABLE' : 'TARGET ▸ SIGNAL';
    const ls = lines(d.text, 8, 2);
    return (
      <HoloPanel key={j} f={f} at={at + 4} x={j ? 1080 : 120} y={580} w={720} h={196} acc={c} out={o.out} pad="18px 28px">
        {H(c, head)}
        <CosmosIcon icon={d.sketch ?? d.icon} at={at + 8} x={0} y={38} size={104} />
        <div style={{position: 'absolute', left: 130, top: 34, height: 128, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          {ls.map((l, k) => <Reveal key={k} f={f} at={at + 8 + k * 4} style={txt(fitL(ls, 520, 52, 28))}>{l}</Reveal>)}
        </div>
      </HoloPanel>
    );
  };
  const mid = !p.mid || String(p.mid).toLowerCase() === 'vs' ? 'VS' : String(p.mid);
  const mp = pop(f, at1 - 2, 12);
  const fp = p.footerPill ? lines(p.footerPill, 99, 1)[0] : '';
  const footAt = Math.max(at1 + 14, cue(cues, cues.length - 1, at1 + 30) + 6);
  const lab = (fr?: string) => (fr === 'danger' ? {label: 'DANGER', color: RED} : fr === 'success' ? {label: 'SAFE', color: GREEN} : {label: 'LOCKED', color: ORANGE});
  return (<>
    <Locks>
      {lockOf(o, 480, 360, 140, vsAt(p, cues, 0, arr), {...lab(p.left?.frame ?? 'danger'), code: `${o.code}A`})}
      {lockOf(o, 1440, 360, 140, at1, {...lab(p.right?.frame ?? 'success'), code: `${o.code}B`})}
    </Locks>
    {side(p.left, 0)}
    {side(p.right, 1)}
    {mp > 0 && (
      <div style={{position: 'absolute', left: 960, top: 360, transform: `translate(-50%, -50%) scale(${Math.min(1.1, mp)})`, opacity: Math.min(1, mp * 1.5),
        fontFamily: isAscii(mid) ? ORB : NOTO, fontWeight: 900, fontSize: isAscii(mid) ? 110 : 96, color: '#fff', ...glow(ORANGE), whiteSpace: 'nowrap'}}>{mid}</div>
    )}
    {fp && (
      <Reveal f={f} at={footAt} center style={{position: 'absolute', left: 0, right: 0, top: 802, display: 'flex', justifyContent: 'center'}}>
        <div style={{...txt(fitL([fp], 1200, 40, 26)), padding: '4px 34px', border: `2px solid ${ORANGE}`, borderRadius: 6, background: 'rgba(40,20,4,0.6)',
          boxShadow: `0 0 18px ${ORANGE}66`}}>{fp}</div>
      </Reveal>
    )}
  </>);
};

/** stat：恆星＋掃描圈＋發光大數字（lib/rollnum 滾輪式往上數：每位上下滑動、前快後慢，不逐格換字） */
const Stat: React.FC<OP> = (o) => {
  const {p, cues, f, arr} = o;
  const at = Math.max(arr + 6, cue(cues, 0, arr + 6));
  const raw = String(p.value ?? ''), suf = String(p.suffix ?? '');
  const units = raw.length * 0.8 + (suf ? (isAscii(suf) ? suf.length * 0.35 : suf.length * 0.5) : 0);
  const size = Math.min(210, 560 / Math.max(1, units));
  const label = lines(p.label, 15, 2), sub = lines(p.sub, 16, 2);
  const acc = '#ffd36b';
  const np = pop(f, at, 13);
  const scan = interpolate(f - at, [0, 40], [-1, 1], clamp);
  return (<>
    <Locks>{lockOf(o, 460, 470, 150, arr)}</Locks>
    {label[0] && (
      <Reveal f={f} at={arr + 4} center style={{position: 'absolute', left: 880, width: 900, top: label.length > 1 ? 96 : 120, textAlign: 'center'}}>
        {label.map((l, k) => <div key={k} style={{...txt(fitL(label, 880, 58, 30)), ...glow(acc)}}>{l}</div>)}
      </Reveal>
    )}
    <div style={{position: 'absolute', left: 1330 - 250, top: 466 - 250, width: 500, height: 500}}>
      {f >= at - 4 && <ScanRing f={f} at={at - 4} acc={acc} size={500} />}
      {f >= at && scan < 1 && (
        <div data-qa="ignore" style={{position: 'absolute', left: 30, right: 30, top: 250 + scan * 200, height: 3, background: acc, opacity: 0.6 * (1 - Math.abs(scan)),
          boxShadow: `0 0 16px ${acc}`}} />
      )}
    </div>
    {f >= at && (
      <div style={{position: 'absolute', left: 1330, top: 466, transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * Math.min(1.05, np)})`, opacity: Math.min(1, np * 1.6),
        display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap'}}>
        <span style={{fontFamily: ORB, fontWeight: 900, fontSize: size, color: '#fff', lineHeight: 1, textShadow: `0 0 14px ${acc}, 0 0 40px ${acc}`}}>
          <RollNum text={raw} p={rollProgress(f, at, 36)} digitW={0.82} h={1} />
        </span>
        {suf && <span style={{fontFamily: isAscii(suf) ? ORB : NOTO, fontWeight: 900, fontSize: size * 0.42, color: acc, marginLeft: 10, textShadow: `0 0 16px ${acc}`}}>{suf}</span>}
      </div>
    )}
    {sub[0] && (
      <Reveal f={f} at={at + 24} center style={{position: 'absolute', left: 880, width: 900, top: 742, textAlign: 'center'}}>
        {sub.map((l, k) => <div key={k} style={txt(fitL(sub, 860, 42, 26), SUBTXT, 700)}>{l}</div>)}
      </Reveal>
    )}
  </>);
};

/** quiz：星門＋三條航道選項，揭曉時正確航道亮起、太空船飛過去 */
const Quiz: React.FC<OP> = (o) => {
  const {p, cues, f, arr, dur} = o;
  const opts: string[] = (p.options ?? []).slice(0, 3);
  const ys = quizYs(opts.length);
  const reveal = quizReveal(p, cues, dur);
  const rk = pr(f, reveal, 10);
  const q = lines(p.question, 24, 2);
  return (<>
    <Locks>{lockOf(o, QZ.gx, QZ.gy, QZ.gr, arr, {label: 'GATE'})}</Locks>
    <Reveal f={f} at={arr} style={{position: 'absolute', left: 64, top: 104, display: 'flex', alignItems: 'flex-start', gap: 26}}>
      <div style={{fontFamily: ORB, fontWeight: 900, fontSize: 30, color: '#1a0c00', background: ORANGE, padding: '2px 16px', borderRadius: 4, marginTop: 8}}>QUIZ</div>
      <div>{q.map((l, k) => <div key={k} style={{...txt(fitL(q, 1500, 54, 30)), ...glow(CYAN)}}>{l}</div>)}</div>
    </Reveal>
    {opts.map((t, j) => {
      const at = Math.max(arr, 20 + j * 12) + 6;
      const right = j === p.answerIndex;
      const hot = rk > 0 && right;
      const ls = lines(t, 10, 2);
      return (
        <HoloPanel key={j} f={f} at={at} x={1250} y={ys[j] - 58} w={600} h={116} acc={hot ? ORANGE : CYAN} out={o.out} pad="0 24px" dim={right ? 1 : 1 - 0.5 * rk}>
          <div style={{display: 'flex', alignItems: 'center', gap: 22, height: '100%'}}>
            <div style={{fontFamily: ORB, fontWeight: 900, fontSize: 40, color: hot ? ORANGE : CYAN, width: 46, textAlign: 'center'}}>{LETTER(j)}</div>
            <div>{ls.map((l, k) => <div key={k} style={txt(fitL(ls, 400, 42, 26))}>{l}</div>)}</div>
          </div>
          {hot && (
            <svg width={56} height={56} viewBox="-28 -28 56 56" style={{position: 'absolute', right: -10, top: 30, transform: `scale(${pop(f, reveal, 12)})`}}>
              <circle r={24} fill="rgba(30,16,4,0.9)" stroke={ORANGE} strokeWidth={3} />
              <path d="M-11 0L-3 9L12 -8" fill="none" stroke={ORANGE} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </HoloPanel>
      );
    })}
    {p.afterNote && (
      <Reveal f={f} at={reveal + 16} center style={{position: 'absolute', left: 560, width: 1300, top: 800, display: 'flex', justifyContent: 'center'}}>
        <div style={{...txt(fitL([String(p.afterNote)], 1160, 40, 26)), padding: '4px 30px', border: `2px solid ${ORANGE}`, borderRadius: 6,
          background: 'rgba(40,20,4,0.6)'}}>{lines(p.afterNote, 99, 1)[0]}</div>
      </Reveal>
    )}
  </>);
};

/** recap：拉遠看星圖（世界層依序點亮打勾），右側任務日誌：重點逐條打勾＋下一站預告 */
const Recap: React.FC<OP> = (o) => {
  const {p, cues, f, arr} = o;
  const take: string[] = (p.takeaway ?? []).slice(0, 3), rec: string[] = (p.recap ?? []).slice(0, 3);
  const nextAt = Math.max(arr + 30, cue(cues, p.nextCue, 120));
  const teaser = p.nextTeaser ? lines(p.nextTeaser, 13, 2) : [];
  const rowH = 118, top = 120;
  const chipTop = top + take.length * rowH + 4;
  const recS = rec.length ? fitL([rec.join('　　　')], 640, 30, 20) : 0;
  return (
    <HoloPanel f={f} at={arr - 6} x={1080} y={116} w={780} h={748} acc={CYAN} out={o.out} pad="22px 32px">
      {H(CYAN, 'MISSION LOG ▸ RECAP')}
      <div style={{...txt(54), ...glow(PURPLE), marginTop: 6}}>重點回顧</div>
      {take.map((t, j) => {
        const at = Math.max(arr + 4, cue(cues, p.takeCues?.[j], arr + 10 + j * 40));
        const ls = lines(t, 11, 2);
        const k = pr(f, at, 10);
        return (
          <div key={j} style={{position: 'absolute', left: 0, right: 0, top: top + j * rowH, height: rowH - 14, display: 'flex', alignItems: 'center', gap: 22}}>
            <svg width={58} height={58} viewBox="0 0 58 58" style={{flex: 'none'}}>
              <rect x={3} y={3} width={52} height={52} rx={6} fill="rgba(10,30,50,0.7)" stroke={k > 0 ? GREEN : CYAN} strokeWidth={3} strokeOpacity={0.9} />
              {k > 0 && <path d="M14 30L25 41L45 18" fill="none" stroke={GREEN} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={`${k} 2`} />}
            </svg>
            <Reveal f={f} at={at + 2}>{ls.map((l, kk) => <div key={kk} style={txt(fitL(ls, 600, 44, 26))}>{l}</div>)}</Reveal>
          </div>
        );
      })}
      {rec.length > 0 && (
        <Reveal f={f} at={arr + 20} style={{position: 'absolute', left: 0, top: chipTop, display: 'flex', gap: 14}}>
          {rec.map((r, j) => (
            <div key={j} style={{...txt(recS, CYAN, 700), padding: '2px 14px', border: `1.5px solid ${CYAN}88`, borderRadius: 4, background: 'rgba(10,30,60,0.5)'}}>{r}</div>
          ))}
        </Reveal>
      )}
      {teaser.length > 0 && (
        <Reveal f={f} at={nextAt} style={{position: 'absolute', left: 0, right: 0, bottom: 4, borderTop: `2px solid ${ORANGE}66`, paddingTop: 14}}>
          {H(ORANGE, 'NEXT DESTINATION ▸', 20)}
          {teaser.map((l, k) => <div key={k} style={{...txt(fitL(teaser, 680, 46, 28)), ...glow(ORANGE)}}>{l}</div>)}
        </Reveal>
      )}
    </HoloPanel>
  );
};

/** qaEnd：最後一站——四個目的地選一，揭曉時正確的星被鎖定 */
const QaEnd: React.FC<OP> = (o) => {
  const {p, f, arr} = o;
  const opts: string[] = (p.options ?? []).slice(0, 4);
  const ans = qaAns(p), ak = pr(f, ans, 10);
  const q = lines(p.question, 24, 2);
  const ai = Math.max(0, Math.min(3, p.answerIndex ?? 0));
  return (<>
    <Locks>{lockOf(o, qaXs[ai], QA_Y, 78, ans, {label: 'LOCKED', code: 'ANSWER'})}</Locks>
    <Reveal f={f} at={Math.max(4, arr - 6)} center style={{position: 'absolute', left: 0, right: 0, top: 100, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
      <div style={{fontFamily: ORB, fontWeight: 900, fontSize: 24, color: '#1a0c00', background: ORANGE, padding: '0 18px', borderRadius: 4, letterSpacing: 4}}>FINAL QUIZ</div>
      <div style={{marginTop: 10, textAlign: 'center'}}>{q.map((l, k) => <div key={k} style={{...txt(fitL(q, 1500, 56, 30)), ...glow(CYAN)}}>{l}</div>)}</div>
    </Reveal>
    {opts.map((t, j) => {
      const at = Math.max(arr, 16) + j * 8;
      const hot = ak > 0 && j === ai;
      const ls = lines(t, 7, 2);
      return (
        <HoloPanel key={j} f={f} at={at} x={qaXs[j] - 190} y={590} w={380} h={130} acc={hot ? ORANGE : CYAN} out={o.out} pad="0 20px"
          origin="center top" dim={j === ai ? 1 : 1 - 0.5 * ak}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, height: '100%'}}>
            <div style={{fontFamily: ORB, fontWeight: 900, fontSize: 40, color: hot ? ORANGE : CYAN, width: 44, textAlign: 'center'}}>{LETTER(j)}</div>
            <div>{ls.map((l, k) => <div key={k} style={txt(fitL(ls, 270, 44, 26))}>{l}</div>)}</div>
          </div>
        </HoloPanel>
      );
    })}
  </>);
};

const SCENES: Record<string, React.FC<OP>> = {title: Title, scenario: Scenario, definition: Definition, cards: Cards, vs: Vs, stat: Stat, quiz: Quiz, recap: Recap, qaEnd: QaEnd};

/** 一個場景的面板層：最後 CLOSE 格淡出收起（data-qa="ignore"：離場中的元素不算版面） */
const Layer: React.FC<{s: Scene; i: number; last: boolean; arr: number; cam: Cam; anchor: Pt | null}> = ({s, i, last, arr, cam, anchor}) => {
  const f = useCurrentFrame();
  const out = last ? 0 : pr(f, s.dur - CLOSE, 10);
  const Comp = SCENES[s.type] ?? Definition;
  const A = anchor ?? {x: cam.x, y: cam.y};
  const toS = (x: number, y: number): Pt => ({x: (A.x + x - 960 - cam.x) * cam.z + 960, y: (A.y + y - 450 - cam.y) * cam.z + 450});
  const code = `${info(s.type).en.replace(' ', '')}-${pad2(i + 1)}`;
  return (
    <div data-qa={out > 0 ? 'ignore' : undefined} style={{position: 'absolute', inset: 0, opacity: 1 - out}}>
      <Comp p={s.props ?? {}} cues={s.cues ?? []} dur={s.dur} i={i} arr={arr} code={code} f={f} out={out} toS={toS} z={cam.z} />
    </div>
  );
};

/* ───── 駕駛艙 HUD（全部在 y<900） ───── */
const Hud: React.FC<{spec: TplSpec; plan: Plan; f: number}> = ({spec, plan, f}) => {
  const boot = pr(f, 4, 20);
  const n = spec.scenes.length;
  const si = Math.max(0, spec.scenes.findIndex((s) => f >= s.from && f < s.from + s.dur));
  const s = spec.scenes[si];
  const seg = plan.segs.findIndex((g) => f >= g.t0 && f < g.t1);
  const tgt = seg >= 0 ? spec.scenes[seg + 1] : null;
  const L = 60 * boot;
  const box = [[34, 34, 1, 1], [1886, 34, -1, 1], [34, 876, 1, -1], [1886, 876, -1, -1]];
  const g = seg >= 0 ? plan.segs[seg] : null;
  const navA = g ? interpolate(f, [g.t0, g.t0 + 8, g.t1 - 10, g.t1], [0, 1, 1, 0], clamp) : 0;
  const hudL = spec.hud?.left ? String(spec.hud.left) : '';
  return (
    <>
      <svg width={1920} height={900} style={{position: 'absolute', left: 0, top: 0}} opacity={boot}>
        {box.map(([x, y, dx, dy], k) => (
          <path key={k} d={`M${x} ${y + dy * L}L${x} ${y}L${x + dx * L} ${y}`} fill="none" stroke={CYAN} strokeOpacity={0.7} strokeWidth={3} />
        ))}
        <g transform="translate(78 60)">
          <circle r={22} fill="rgba(10,30,60,0.55)" stroke={CYAN} strokeOpacity={0.6} strokeWidth={2} />
          <circle r={11} fill="none" stroke={CYAN} strokeOpacity={0.3} />
          <g transform={`rotate(${f * 5})`}>
            <path d="M0 0L22 0A22 22 0 0 0 15.6 -15.6Z" fill={CYAN} opacity={0.25} />
            <line x1={0} y1={0} x2={22} y2={0} stroke="#c8f6ff" strokeWidth={1.5} />
          </g>
        </g>
        <g transform={`translate(${1850 - (n - 1) * 30} 58)`}>
          {spec.scenes.map((sc, k) => {
            const v = f >= sc.from;
            return (
              <g key={k} transform={`translate(${k * 30} 0)`}>
                {k > 0 && <line x1={-24} y1={0} x2={-7} y2={0} stroke={CYAN} strokeOpacity={v ? 0.9 : 0.25} strokeWidth={2} />}
                <circle r={k === si ? 7 : v ? 6 : 4.5} fill={v ? (k === si ? ORANGE : CYAN) : 'none'} stroke={k === si ? ORANGE : CYAN} strokeOpacity={0.85} strokeWidth={2} />
              </g>
            );
          })}
        </g>
        <g transform="translate(960 450)" opacity={navA * 0.85}>
          <circle r={34} fill="none" stroke={CYAN} strokeWidth={2} />
          {[0, 90, 180, 270].map((a) => <line key={a} x1={44} y1={0} x2={74} y2={0} stroke={CYAN} strokeWidth={2.5} transform={`rotate(${a})`} />)}
        </g>
      </svg>
      <div style={{position: 'absolute', left: 116, top: 46, opacity: boot, display: 'flex', alignItems: 'baseline', gap: 16, whiteSpace: 'nowrap'}}>
        {hudL && <span style={{fontFamily: NOTO, fontWeight: 900, fontSize: 24, color: '#fff', textShadow: `0 0 10px ${CYAN}`}}>{hudL}</span>}
        <span style={{fontFamily: ORB, fontWeight: 700, fontSize: 17, letterSpacing: 4, color: CYAN}}>{`STARSHIP NAV ▸ SECTOR ${pad2(si + 1)} ${info(s.type).en}`}</span>
      </div>
      {tgt && navA > 0 && (
        <div data-qa="ignore" style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', opacity: navA}}>
          <div style={{fontFamily: ORB, fontWeight: 700, fontSize: 20, letterSpacing: 8, color: CYAN}}>NAVIGATING</div>
          <div style={{fontFamily: NOTO, fontWeight: 900, fontSize: 48, color: '#fff', textShadow: `0 0 16px ${CYAN}`}}>{`航向 ▸ ${info(tgt.type).zh}`}</div>
        </div>
      )}
    </>
  );
};

export const TemplateK: React.FC<TplSpec> = (spec) => {
  const f = useCurrentFrame();
  const plan = useMemo(() => makePlan(spec), [spec]);
  const cam = camAt(plan, spec, f);
  const prev = camAt(plan, spec, f - 1);
  const cap = captionAt(spec, f, 8);
  // 緊接上一句（間隔 ≤10 格）時直接換字、不淡入：淡入的前 2 格字幕太淡，會被最終品檢判成字幕閃爍
  const capPrev = cap ? spec.captions[spec.captions.indexOf(cap) - 1] : undefined;
  const capO = !cap ? 0 : capPrev && cap.from - capPrev.to <= 10 ? 1 : interpolate(f, [cap.from - 2, cap.from + 3], [0, 1], clamp);
  const capS = cap ? fitL([cap.text], 1760, 54, 34) : 54;
  const fade = Math.max(0, spec.brand ? 0 : 1 - f / 10, (f - (spec.totalFrames - 12)) / 12);
  const mask = 'linear-gradient(to bottom, #000 0px, #000 850px, transparent 900px)';
  return (
    <AbsoluteFill style={{backgroundColor: BG, overflow: 'hidden'}}>
      {/* 深空＋星系：下緣 850→900 漸隱，字幕區沒有移動中的星點 */}
      <AbsoluteFill style={{WebkitMaskImage: mask, maskImage: mask}}>
        <Starfield f={f} cam={cam} prev={prev} />
        <World spec={spec} plan={plan} f={f} cam={cam} />
      </AbsoluteFill>
      {/* 駕駛艙暈影 */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0) 58%, rgba(2,3,10,0.55) 100%)', pointerEvents: 'none'}} />
      {spec.scenes.map((s, i) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} layout="none">
          <Layer s={s} i={i} last={i === spec.scenes.length - 1} arr={plan.arr[i]} cam={cam} anchor={plan.anchors[i]} />
        </Sequence>
      ))}
      <Hud spec={spec} plan={plan} f={f} />
      {/* 字幕底：固定在畫面下緣的深色漸層（y 900→1080） */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 900, height: 180, background: 'linear-gradient(rgba(5,7,15,0), rgba(5,7,15,0.9) 40%, rgba(5,7,15,0.94))'}} />
      {cap && (
        <div data-qa="caption" style={{position: 'absolute', left: 60, right: 60, top: 952, textAlign: 'center', opacity: capO, fontFamily: NOTO, fontWeight: 900,
          fontSize: capS, color: '#fff', letterSpacing: 2, whiteSpace: 'nowrap', WebkitTextStroke: '8px #05070f', paintOrder: 'stroke fill'}}>{cap.text}</div>
      )}
      <BrandLogo logo={spec.brand?.logo} width={spec.brand?.logoWidth} />
      <AbsoluteFill style={{background: '#000', opacity: fade, pointerEvents: 'none'}} />
      {spec.qa && <QaProbe w={spec.width} h={spec.height} />}
      {spec.music && <Audio src={staticFile(spec.music)} volume={spec.musicVolume ?? 0.4} />}
      {spec.voice && <Audio src={staticFile(spec.voice)} />}
      <Audio src={staticFile('tpl_sfx.wav')} />
    </AbsoluteFill>
  );
};
