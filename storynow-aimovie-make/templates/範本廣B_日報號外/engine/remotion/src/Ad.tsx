/* 範本廣B「日報號外」：深夜趕印號外。
   輪轉機印報 → 抽出一份攤平、蓋上印章 → 鏡頭像讀者的眼睛在大報紙上平移推近：頭條（打字機）→ 圖示統計 → 圓餅（紅筆標註）
   → 勾選專欄（打勾）→ 分類廣告（滾數字、畫圈）→ 翻到第二版（網點照片）→ 摺起來丟上報紙堆 → 背面大名（紅筆畫線）＋手搖鈴。
   貫穿全片的主角：編輯的紅鉛筆。四個專欄可省略（鏡頭與鉛筆自動跳過）；時間全部讀 timeline.json（timeline.py 依內容算）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {k, lerp, EO, EIO, bell, fitFs} from './kit';
import {SERIF, PLAY} from './fonts';
import {Page1, Page1Back, Page2, Back, PaperBase, Lines, Cols, G, BACK, PW, PH, BW, BH, PAPER, INK, RED, alongPath, ellipsePts, D, HAS} from './pages';

/* eslint-disable @typescript-eslint/no-explicit-any */
const MK = T.marks as Record<string, number>;
const TT = T as any;
const END = T.frames;

/* ───── 鏡頭：在報紙（世界座標）上平移、推近、拉遠；讀的時候慢慢漂一點 ───── */
type Pose = [number, number, number]; // 中心 x、中心 y、縮放
const L: Pose = [1200, 900, 0.56];
const STACK = {x: 3800, y: 300};
const S0: Pose = [STACK.x + BW / 2, STACK.y + BH / 2 + 20, 0.5];
const S1: Pose = [STACK.x + BW / 2, STACK.y + BH / 2 + 10, 0.56];
const OUT: Pose = [1200, 1700, 0.31];
const drift = (p: Pose, dx: number): Pose => [p[0] + dx, p[1] - 8, p[2]];
const KEYS: [number, Pose][] = (() => {
  const out: [number, Pose][] = [[MK.land, L], [MK.camHead, L]];
  const stop = (start: number, lead: number, p: Pose, until: number) => {
    out.push([start + lead, p], [until, drift(p, 30)]);
  };
  stop(MK.camHead, 30, [830, 1040, 0.95], MK.camDeck);
  const sec: [string, string, number, Pose][] = [
    ['picto', 'camChart', 30, [680, 2000, 0.85]],
    ['pie', 'camPie', 27, [1750, 2010, 0.9]],
    ['checklist', 'camCol', 30, [700, 2860, 0.85]],
    ['ad', 'camAds', 27, [1800, 2800, 1.0]],
  ];
  const starts = sec.filter(([h]) => HAS[h]).map(([, m]) => MK[m]).concat(MK.camOut);
  stop(MK.camDeck, 18, [900, 1250, 0.85], starts[0]);
  sec.filter(([h]) => HAS[h]).forEach(([, m, lead, p], i) => stop(MK[m], lead, p, starts[i + 1]));
  out.push([MK.flip, OUT], [MK.p2, OUT], [MK.p2 + 36, [1200, 1100, 0.56]], [MK.camOut2, [1235, 1090, 0.6]],
    [MK.fold, [1200, 1700, 0.29]], [MK.toss, [1200, 1700, 0.29]], [MK.stack + 15, S0], [END, S1]);
  return out;
})();
const P0: Pose = [1200, 1700, 0.12];
const mixPose = (a: Pose, b: Pose, p: number): Pose => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), a[2] * Math.pow(b[2] / a[2], p)];
const cam = (f: number): Pose => {
  if (f < MK.land) return mixPose(P0, L, k(f, MK.cut, MK.land, EIO));
  for (let i = 0; i + 1 < KEYS.length; i++) {
    const [fa, a] = KEYS[i], [fb, b] = KEYS[i + 1];
    if (f < fb) return mixPose(a, b, k(f, fa, fb, i + 2 === KEYS.length ? EO : EIO));
  }
  return KEYS[KEYS.length - 1][1];
};

/* ───── 主角：紅鉛筆（世界座標的筆尖位置＋抬筆高度） ───── */
type PS = {x: number; y: number; l: number};
type Seg = {a: number; b: number; at: (p: number) => PS};
const SEGS: Seg[] = (() => {
  const s: Seg[] = [];
  let cur: PS = {x: 3300, y: 300, l: 1};
  const moveTo = (a: number, b: number, x: number, y: number, l = 0.3) => {
    const from = cur, to = {x, y, l};
    s.push({a, b: Math.max(a + 1, b), at: (p) => {
      const e = EIO(p);
      return {x: lerp(from.x, to.x, e), y: lerp(from.y, to.y, e), l: lerp(from.l, to.l, e) + bell(p) * 0.45};
    }});
    cur = to;
  };
  const trace = (a: number, b: number, pts: [number, number][]) => {
    s.push({a, b, at: (p) => {
      const [x, y] = alongPath(pts, p);
      return {x, y, l: 0};
    }});
    const e = pts[pts.length - 1];
    cur = {x: e[0], y: e[1], l: 0};
  };
  const tap = (t: number, x: number, y: number) => {
    moveTo(t - 4, t - 1, x, y, 0.45);
    s.push({a: t - 1, b: t + 4, at: (p) => ({x, y, l: p < 0.25 ? lerp(0.45, 0, p / 0.25) : lerp(0, 0.35, (p - 0.25) / 0.75)})});
    cur = {x, y, l: 0.35};
  };
  moveTo(MK.land - 10, MK.stamp + 4, 2050, 560, 0.6);
  moveTo(MK.camHead, MK.typeHead - 2, 100, 1090, 0.25);
  (TT.typeHead as number[]).forEach((t, i) => {
    const g = G.headChar(i);
    moveTo(t, t + 4, g.x, g.y + 20, 0.12);
  });
  if ((TT.typeDeck as number[]).length) {
    moveTo(MK.camDeck, MK.typeDeck - 2, 140, 1530, 0.25);
    (TT.typeDeck as number[]).forEach((t, i) => {
      const g = G.deckChar(i);
      moveTo(t, t + 3, g.x, g.y + 8, 0.1);
    });
  }
  if (HAS.picto) {
    moveTo(MK.camChart + 6, MK.picto - 6, G.picto(0).x + 40, G.picto(0).y, 0.5);
    (TT.picto as number[]).forEach((t, i) => tap(t, G.picto(i).x + 30, G.picto(i).y + 10));
  }
  if (HAS.pie) {
    moveTo(MK.camPie + 4, MK.pie - 1, G.pie.x, G.pie.y - G.pie.r, 0.3);
    s.push({a: MK.pie, b: MK.pie + 40, at: (p) => {
      const a = -Math.PI / 2 + Math.PI * 2 * Math.min(1, Number(D.pie.fraction)) * p;
      return {x: G.pie.x + Math.cos(a) * G.pie.r, y: G.pie.y + Math.sin(a) * G.pie.r, l: 0};
    }});
    cur = {x: G.pie.x, y: G.pie.y + G.pie.r, l: 0};
    moveTo(MK.pie + 42, MK.note - 1, G.note[0][0], G.note[0][1], 0.2);
    trace(MK.note, MK.note + 26, G.note);
    const ring = ellipsePts(G.ring.x, G.ring.y, G.ring.rx, G.ring.ry);
    moveTo(MK.note + 28, MK.ring - 1, ring[0][0], ring[0][1], 0.25);
    trace(MK.ring, MK.ring + 26, ring);
  }
  if (HAS.checklist) {
    (TT.checks as number[]).forEach((t, i) => {
      const c = G.check(i);
      moveTo(i === 0 ? MK.camCol + 6 : t - 12, t - 1, c[0][0], c[0][1], 0.35);
      trace(t, t + 8, c);
    });
  }
  if (HAS.ad) {
    moveTo(MK.camAds + 4, MK.roll10 - 4, G.ring10.x, 2990, 0.4);
    const r10 = ellipsePts(G.ring10.x, G.ring10.y, G.ring10.rx, G.ring10.ry);
    moveTo(MK.ring10 - 12, MK.ring10 - 1, r10[0][0], r10[0][1], 0.25);
    trace(MK.ring10, MK.ring10 + 26, r10);
  }
  moveTo(MK.camOut, MK.flip + 10, 2750, 1100, 0.9);
  moveTo(MK.p2 + 4, MK.photo - 8, G.label(0).x, G.label(0).y, 0.4);
  (TT.photos as number[]).forEach((t, i) => tap(t, G.label(i).x + 40, G.label(i).y));
  moveTo(MK.camOut2 - 10, MK.fold, 2900, 1000, 1);
  const ul = BACK.underline.map(([x, y]) => [x + STACK.x, y + STACK.y] as [number, number]);
  moveTo(MK.toss + 10, MK.underline - 2, ul[0][0], ul[0][1], 0.4);
  trace(MK.underline, MK.underline + 22, ul);
  moveTo(MK.underline + 26, MK.underline + 54, ul[2][0] + 160, ul[2][1] + 140, 0.15);
  return s;
})();
const pen = (f: number): PS => {
  let st: PS = {x: 3300, y: 300, l: 1};
  for (const g of SEGS) {
    if (f < g.a) break;
    st = g.at(f >= g.b ? 1 : (f - g.a) / (g.b - g.a));
  }
  return st;
};
const PEN_TXT: string = D.paper.en || '';
const Pencil: React.FC<{ghost?: number}> = ({ghost}) => {
  if (ghost) return <g opacity={ghost}><path d="M0,0 L120,-32 L742,-32 L742,32 L120,32 Z" fill={RED} /></g>;
  return (
    <>
      <path d="M0,0 L120,-32 L120,32 Z" fill="#e3c79f" />
      <path d="M0,0 L38,-10 L38,10 Z" fill={RED} />
      <rect x={120} y={-32} width={500} height={64} fill={RED} />
      <rect x={120} y={-32} width={500} height={18} fill="#e0435a" />
      <rect x={120} y={10} width={500} height={22} fill="#9c0c24" />
      <rect x={620} y={-34} width={52} height={68} fill="#77706a" />
      <rect x={672} y={-32} width={70} height={64} rx={14} fill={INK} />
      <text x={200} y={14} fontFamily={PLAY} fontWeight={700} fontSize={Math.min(36, 400 / Math.max(1, PEN_TXT.length * 0.62))} fill={PAPER} opacity={0.9}>{PEN_TXT}</text>
    </>
  );
};
const PencilLayer: React.FC<{f: number}> = ({f}) => {
  if (f < MK.land - 12) return null;
  const st = pen(f);
  const rot = 34 + st.l * 6;
  const ghosts = [1, 2, 3].map((d) => pen(f - d)).filter((q, i, arr) => Math.hypot(q.x - (i ? arr[i - 1].x : st.x), q.y - (i ? arr[i - 1].y : st.y)) > 18);
  return (
    <svg width={10} height={10} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {ghosts.map((q, i) => (
        <g key={i} transform={`translate(${q.x - q.l * 14},${q.y - q.l * 26}) rotate(${34 + q.l * 6})`}>
          <Pencil ghost={[0.26, 0.15, 0.08][i]} />
        </g>
      ))}
      <g transform={`translate(${st.x + 26 + st.l * 70},${st.y + 34 + st.l * 90}) rotate(${rot})`} opacity={0.22}>
        <path d="M0,0 L120,-32 L742,-32 L742,32 L120,32 Z" fill={INK} />
      </g>
      <g transform={`translate(${st.x - st.l * 14},${st.y - st.l * 26}) rotate(${rot}) scale(${1 + st.l * 0.06})`}>
        <Pencil />
      </g>
    </svg>
  );
};

/* ───── 開場：輪轉印刷機 ───── */
const PRESS_UNIT = 760;
const MiniPage: React.FC<{x: number; o?: number}> = ({x, o = 1}) => (
  <div style={{position: 'absolute', left: x, top: 0, width: PRESS_UNIT - 40, height: 460, opacity: o}}>
    <div style={{position: 'absolute', left: 30, top: 26, fontFamily: SERIF, fontWeight: 900, fontSize: fitFs(D.paper.name, 96, 420), color: INK, lineHeight: 1, whiteSpace: 'nowrap'}}>{D.paper.name}</div>
    <div style={{position: 'absolute', left: 470, top: 22, width: 200, height: 104, background: RED, color: PAPER, fontFamily: SERIF, fontWeight: 900, fontSize: fitFs(D.paper.extra ?? '號外', 76, 190), lineHeight: '104px', textAlign: 'center'}}>{D.paper.extra ?? '號外'}</div>
    <div style={{position: 'absolute', left: 30, top: 142, width: 640, height: 8, background: INK}} />
    <div style={{position: 'absolute', left: 30, top: 170, width: 420, height: 70, background: INK, opacity: 0.85}} />
    <div style={{position: 'absolute', left: 470, top: 170, width: 200, height: 150, background: 'repeating-radial-gradient(circle at 50% 50%, #1a1714 0 6px, transparent 6px 14px)', opacity: 0.6}} />
    <Lines x={30} y={262} w={420} h={170} gap={30} th={10} />
    <Lines x={470} y={340} w={200} h={92} gap={30} th={10} />
  </div>
);
const Roller: React.FC<{y: number; h: number; f: number; dir: number}> = ({y, h, f, dir}) => (
  <div style={{position: 'absolute', left: -20, top: y, width: 1960, height: h, overflow: 'hidden', borderRadius: 18,
    background: 'linear-gradient(to bottom, #1d1a17 0%, #6d665e 30%, #b9b2a6 46%, #6d665e 62%, #1d1a17 100%)'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: -60, bottom: -60,
      background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0.28) 0 6px, transparent 6px 46px)',
      transform: `translateY(${((f * 23 * dir) % 46 + 46) % 46}px)`}} />
  </div>
);
const Press: React.FC<{f: number}> = ({f}) => {
  const off = (f * 62) % PRESS_UNIT;
  const o = 1 - k(f, MK.cut + 12, MK.land - 6, EIO);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{opacity: o, background: 'radial-gradient(ellipse at 50% 45%, #5a5249 0%, #2e2924 75%)'}}>
      <Roller y={110} h={200} f={f} dir={1} />
      <div style={{position: 'absolute', left: 0, top: 300, width: 1920, height: 460, background: PAPER, overflow: 'hidden'}}>
        {[3, 2, 1, 0].map((g) => (
          <React.Fragment key={g}>
            {Array.from({length: 4}, (_, i) => <MiniPage key={i} x={i * PRESS_UNIT - off + g * 16} o={g === 0 ? 1 : [0, 0.3, 0.18, 0.1][g]} />)}
          </React.Fragment>
        ))}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0) 18%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.25))'}} />
      </div>
      <Roller y={750} h={130} f={f} dir={-1} />
      <div style={{position: 'absolute', left: 0, top: 880, width: 1920, height: 200, background: 'linear-gradient(to bottom, #3b352f, #26221e)'}}>
        {Array.from({length: 9}, (_, i) => (
          <div key={i} style={{position: 'absolute', left: 90 + i * 220, top: 70, width: 30, height: 30, borderRadius: 15, background: '#6b635a'}} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ───── 報紙堆 ───── */
const Stack: React.FC = () => (
  <>
    {[[-60, 120, -4], [70, 90, 3], [-30, 60, -2], [40, 30, 1.5], [-10, 12, -0.8]].map(([dx, dy, r], i) => (
      <div key={i} style={{position: 'absolute', left: STACK.x + dx, top: STACK.y + dy, width: BW, height: BH, transform: `rotate(${r}deg)`,
        boxShadow: '0 10px 0 #d8d1c2, 0 26px 0 rgba(0,0,0,0.25)'}}>
        <PaperBase w={BW} h={BH} />
        <div style={{position: 'absolute', left: 100, top: 80, width: 900, height: 120, background: INK, opacity: 0.8}} />
        <div style={{position: 'absolute', left: 1900, top: 70, width: 400, height: 140, background: RED}} />
        <Cols x={100} y={300} w={2200} h={1300} n={5} />
      </div>
    ))}
  </>
);

/* ───── 主畫面 ───── */
export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const c = cam(f);
  const bg = cam(Math.min(END, f + 4)); // 背景（桌面紋理）比前景早一步動
  const hits: number[] = [MK.stamp, ...(HAS.picto ? TT.picto : []), ...(HAS.checklist ? TT.checks : []), ...TT.photos, MK.stack, MK.flip + 40, MK.land];
  if (HAS.ad) hits.push(MK.roll10 + 40);
  let punch = 0;
  for (const t of hits) if (f >= t && f < t + 14) punch = Math.max(punch, Math.exp(-(f - t) / 3.5));
  let shake = 0;
  for (const t of TT.pressA as number[]) if (f >= t && f < t + 10) shake = Math.max(shake, Math.exp(-(f - t) / 2.5));
  for (const t of TT.pressB as number[]) if (f >= t && f < t + 8) shake = Math.max(shake, 0.4 * Math.exp(-(f - t) / 2) * k(f, MK.p2, MK.stack, (x) => x));
  const sy = shake * 6 * (Math.floor(f / 2) % 2 ? 1 : -1);

  const flight = f < MK.land ? k(f, MK.cut, MK.land, EIO) : 1;
  const tiltX = (1 - flight) * 58, tiltZ = (1 - flight) * -9;
  const flipA = 180 * k(f, MK.flip, MK.flip + 36, EIO);
  const p1Away = k(f, MK.p2 + 4, MK.p2 + 54, EIO) * -2800;
  const foldA = 180 * k(f, MK.fold, MK.crease, EIO);
  const tossP = k(f, MK.toss, MK.stack, EIO);
  const showP1 = f >= MK.cut && f < MK.p2 + 56;
  const showP2 = f >= MK.flip - 2 && f < MK.crease + 1;
  const folded = f >= MK.crease;
  const tossPos = (p: number) => ({x: STACK.x * p, y: STACK.y * p - bell(p) * 500, s: 1 + bell(p) * 0.12, r: -6 * bell(p)});
  const world = (pose: Pose, extra = '') => `translate(960px, 540px) ${extra} scale(${pose[2]}) translate(${-pose[0]}px, ${-pose[1]}px)`;

  return (
    <AbsoluteFill style={{background: '#4b423a', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill style={{transform: `translateY(${sy}px) scale(${1 + punch * 0.028})`}}>
        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #6a5d50 0%, #463d35 80%)'}} />
        <AbsoluteFill style={{
          background: `linear-gradient(180deg, rgba(0,0,0,0.08) 0 18%, rgba(255,255,255,0.035) 18% 53%, rgba(0,0,0,0.045) 53% 100%)`,
          backgroundSize: `100% ${170 * bg[2]}px`, backgroundPosition: `0px ${540 - bg[1] * bg[2]}px`}} />
        <Press f={f} />
        <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, perspective: 2200}}>
          <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transformStyle: 'preserve-3d',
            transform: world(c, f < MK.land ? `rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)` : '')}}>
            {f >= MK.flip - 60 && <Stack />}
            {showP2 && (
              <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, perspective: 9000, perspectiveOrigin: '1200px 1700px'}}>
                <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH / 2, overflow: 'hidden', boxShadow: '0 30px 0 rgba(0,0,0,0.22), 0 14px 0 rgba(0,0,0,0.18)'}}>
                  <Page2 f={f} />
                </div>
                <div style={{position: 'absolute', left: 0, top: PH / 2, width: PW, height: PH / 2, transformOrigin: '50% 0', transformStyle: 'preserve-3d',
                  transform: `rotateX(${foldA}deg)`}}>
                  <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backfaceVisibility: 'hidden', boxShadow: '0 30px 0 rgba(0,0,0,0.22), 0 14px 0 rgba(0,0,0,0.18)'}}>
                    <div style={{position: 'absolute', left: 0, top: -PH / 2, width: PW, height: PH}}><Page2 f={f} /></div>
                    <div style={{position: 'absolute', inset: 0, background: '#000', opacity: Math.sin((foldA * Math.PI) / 180) * 0.3}} />
                  </div>
                  <div style={{position: 'absolute', inset: 0, overflow: 'hidden', backfaceVisibility: 'hidden', transform: 'rotateX(180deg)'}}>
                    <Back f={f} />
                    <div style={{position: 'absolute', inset: 0, background: '#000', opacity: Math.sin((foldA * Math.PI) / 180) * 0.3}} />
                  </div>
                </div>
                <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, background: 'linear-gradient(to right, rgba(0,0,0,0.45), rgba(0,0,0,0) 70%)',
                  opacity: bell(flipA / 180) * 0.8}} />
              </div>
            )}
            {folded && (
              <>
                {[3, 2].map((d) => {
                  const q = tossPos(k(f - d, MK.toss, MK.stack, EIO));
                  const vel = Math.abs(tossP - k(f - d, MK.toss, MK.stack, EIO));
                  if (vel < 0.02 || tossP >= 1) return null;
                  return <div key={d} style={{position: 'absolute', left: q.x, top: q.y, width: BW, height: BH, transform: `rotate(${q.r}deg) scale(${q.s})`, opacity: d === 2 ? 0.22 : 0.12, background: PAPER}} />;
                })}
                {(() => {
                  const q = tossPos(tossP);
                  return (
                    <div style={{position: 'absolute', left: q.x, top: q.y, width: BW, height: BH, transform: `rotate(${q.r}deg) scale(${q.s})`,
                      boxShadow: `${bell(tossP) * 60}px ${26 + bell(tossP) * 160}px 0 rgba(0,0,0,${0.3 - bell(tossP) * 0.12})`}}>
                      <Back f={f} />
                    </div>
                  );
                })()}
              </>
            )}
            {showP1 && (
              <div style={{position: 'absolute', left: p1Away, top: 0, width: PW, height: PH, perspective: 9000, perspectiveOrigin: '0px 1700px'}}>
                {f < MK.land && [2, 1].map((d) => {
                  const pp = k(f - d * 1.5, MK.cut, MK.land, EIO);
                  if (flight - pp < 0.02) return null;
                  const g = mixPose(P0, L, pp);
                  const s = g[2] / c[2];
                  return (
                    <div key={d} style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, background: PAPER, opacity: d === 1 ? 0.22 : 0.12,
                      transformOrigin: '0 0', transform: `translate(${c[0] - g[0] * s}px, ${c[1] - g[1] * s}px) scale(${s})`}} />
                  );
                })}
                <div style={{position: 'absolute', left: 0, top: 0, width: PW, height: PH, transformOrigin: '0 50%', transformStyle: 'preserve-3d',
                  transform: `rotateY(${-flipA}deg)`, boxShadow: flipA < 1 ? '0 30px 0 rgba(0,0,0,0.22), 0 14px 0 rgba(0,0,0,0.18)' : undefined}}>
                  <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden'}}>
                    <Page1 f={f} />
                    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to left, rgba(0,0,0,0.35), rgba(0,0,0,0))', opacity: bell(flipA / 180)}} />
                  </div>
                  <div style={{position: 'absolute', inset: 0, backfaceVisibility: 'hidden', overflow: 'hidden', transform: 'rotateY(180deg)'}}>
                    <Page1Back />
                  </div>
                </div>
              </div>
            )}
            <PencilLayer f={f} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
