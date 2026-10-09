/* 範本廣A「一個形狀不剪接」：畫面上只有一個圓角形狀，從頭到尾不剪接，依 storyboard 的 states 順序一路變形——
   按鈕→讀取打勾→動態島→播放器（拖進度）→滑桿（拖過頭會拉長）→開關→開關鈕變液態分頁指示器→長條圖＋提示框→⌘K 搜尋→通知，
   最後變回第一個狀態，無縫循環。狀態可以任意排列、重複、省略；內容（字）全部來自 storyboard，時間全部來自 timeline.json
   （engine/timeline.py 依內容多寡算出；配樂音效讀同一份）。原作：02_試做/廣告30風格 H2（屏榮版，14 秒）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import T from './timeline.json';
import {P, S, track, keysOf, cl, mix, win, Key} from './spring';
import {FONT, INK, MUTE, LINE, STROKE, gray, tw, Txt, Box, Cursor, CheckPath} from './ui';

/* eslint-disable @typescript-eslint/no-explicit-any */
type St = {type: string; i: number; t0: number; t1: number; ev: Record<string, number>; d: any};
const SS = T.states as unknown as St[];
const R = T.reprise; // 片尾變回第一個狀態的那一格
const isKnob = (s?: St) => !!s && (s.type === 'toggle' || s.type === 'tabs');

/* ───── 每個狀態的形狀（寬、高、圓角、亮度、鏡頭縮放）：寬度依字數伸縮，鏡頭讓形狀填滿畫面 ───── */
type G = {w: number; h: number; r: number; L: number; z: number};
const tabSlot = (s: St) => Math.max(275, ...(s.d.tabs || []).map((t: any) => tw(t.a, 42) + tw(t.b, 42) + 10 + 60));
const geo = (s: St): G => {
  const d = s.d;
  switch (s.type) {
    case 'button': {
      const w = Math.max(380, tw(d.label, 46, 3) + 130);
      return {w, h: 110, r: 55, L: 20, z: 2.3 * Math.min(1, 380 / w)};
    }
    case 'loading':
      return {w: 120, h: 120, r: 60, L: 20, z: 2.5};
    case 'island': {
      const w = Math.max(560, (d.tag ? tw(d.tag, 36) + 14 : 0) + tw(d.text, 36) + 215);
      return {w, h: 104, r: 52, L: 14, z: 1.75 * Math.min(1, 560 / w)};
    }
    case 'player':
      return {w: 860, h: 340, r: 48, L: 255, z: 1.2};
    case 'slider':
      return {w: 760, h: 112, r: 56, L: 255, z: 1.35};
    case 'toggle': {
      const w = Math.max(520, tw(d.label, 44) + 210);
      return {w, h: 150, r: 75, L: 212, z: 1.75 * Math.min(1, 520 / w)};
    }
    case 'tabs': {
      const w = tabSlot(s) * d.tabs.length + 15;
      return {w, h: 128, r: 64, L: 255, z: 1.4 * Math.min(1, 840 / w)};
    }
    case 'chart':
      return {w: 1040, h: 600, r: 44, L: 255, z: 1.0};
    case 'search':
      return {w: 880, h: 112, r: 30, L: 255, z: 1.3};
    default: {
      const w = Math.max(720, 82 + tw(d.text, 40) + 160);
      return {w, h: 112, r: 56, L: 255, z: 1.5 * Math.min(1, 720 / w)};
    }
  }
};
const GEO = SS.map(geo);

const ROWS: {t: number; s: Partial<G>}[] = [];
SS.forEach((s, i) => {
  ROWS.push({t: s.t0, s: GEO[i]});
  if (s.type === 'button') ROWS.push({t: s.ev.hover, s: {L: 58}});
  if (s.type === 'toggle') ROWS.push({t: s.ev.flip, s: {L: 20}});
  if (s.type === 'search') ROWS.push({t: s.ev.results, s: {h: 262, z: GEO[i].z * 0.96}});
});
ROWS.push({t: R, s: GEO[0]});
ROWS.sort((a, b) => a.t - b.t);
const KW = keysOf(ROWS, 'w');
const KH = keysOf(ROWS, 'h');
const KR = keysOf(ROWS, 'r');
const KLum = keysOf(ROWS, 'L');
const KZ = keysOf(ROWS, 'z');

/* 按下去的小縮放：被點的狀態（按鈕、動態島）在交界那一格、開關翻面、讀取打勾彈一下 */
const press: Key[] = [];
const pr = (t: number, depth: number) => press.push({t, v: depth, w: 45, z: 0.9}, {t: t + 4, v: 1, w: 22, z: 0.8});
SS.forEach((s) => {
  if (s.type === 'button' || s.type === 'island') pr(s.t1, 0.95);
  if (s.type === 'toggle') pr(s.ev.flip, 0.95);
  if (s.type === 'loading') press.push({t: s.ev.check, v: 1.07, w: 30, z: 0.85}, {t: s.ev.check + 4, v: 1, w: 18, z: 0.8});
});
press.sort((a, b) => a.t - b.t);
const KPress: Key[] = press.length ? press : [{t: 0, v: 1}];

/* ───── 播放器、滑桿的直接操作（數值由游標位置算） ───── */
const TRK = {x0: -90, w: 480};
const RATE = 0.0025;
const V0 = 0.55;
const VW = 510;
const rubber = (v: number) => 110 * (1 - Math.exp((-Math.max(0, v - 1) * VW) / 150));

/* ───── 開關鈕＝液態分頁指示器：左右兩邊各坐一個彈簧，前緣快、後緣慢 ───── */
const FAST = 26;
const SLOW = 12;
const tabX = (s: St, k: number) => (k - (s.d.tabs.length - 1) / 2) * tabSlot(s);
const KnL: Key[] = [], KnR: Key[] = [], KnT: Key[] = [], KnC: Key[] = [];
const KNOB_RUNS: [number, number][] = [];
SS.forEach((s, i) => {
  if (!isKnob(s)) return;
  const prev = SS[i - 1];
  const cont = isKnob(prev);
  const at = cont ? s.t0 : s.t0 - 20;
  if (cont) KNOB_RUNS[KNOB_RUNS.length - 1][1] = s.t1;
  else KNOB_RUNS.push([s.t0, s.t1]);
  const lastL = KnL.length ? KnL[KnL.length - 1].v : 0;
  const lr = (t: number, l: number, r: number) => {
    const right = l > (KnL.length ? KnL[KnL.length - 1].v : lastL);
    KnL.push({t, v: l, w: right ? SLOW : FAST});
    KnR.push({t, v: r, w: right ? FAST : SLOW});
  };
  if (s.type === 'toggle') {
    const w = GEO[i].w;
    lr(at, -w / 2 + 16, -w / 2 + 134);
    KnT.push({t: at, v: -59}, {t: s.ev.hover, v: -63}, {t: s.ev.flip, v: -59});
    KnC.push({t: at, v: 255});
    lr(s.ev.flip, w / 2 - 134, w / 2 - 16);
  } else {
    const half = tabSlot(s) / 2 - 0.5;
    lr(at, tabX(s, 0) - half, tabX(s, 0) + half);
    KnT.push({t: at, v: -56});
    KnC.push({t: at, v: 20});
    for (let k = 1; k < s.d.tabs.length; k++) lr(s.ev[`tab${k}`], tabX(s, k) - half, tabX(s, k) + half);
  }
});
const KnB: Key[] = KnT.map((k) => ({...k, v: -k.v}));

/* ───── 游標路徑（世界座標，原點＝形狀中心） ───── */
const REST = {x: 240, y: 118};
const CUR: {t: number; x: number; y: number}[] = [];
const chartBars = (s: St) => {
  const n = s.d.bars.length;
  const slot = 940 / n;
  return s.d.bars.map((b: any, k: number) => ({...b, x: -470 + slot * (k + 0.5), bw: Math.min(170, slot * 0.6)}));
};
SS.forEach((s, i) => {
  const g = GEO[i];
  const e = s.ev;
  switch (s.type) {
    case 'button': CUR.push({t: s.t0 + 8, x: Math.min(70, g.w / 2 - 60), y: 22}); break;
    case 'loading': CUR.push({t: s.t0 + 7, x: 150, y: 118}); break;
    case 'island': CUR.push({t: s.t0 + 13, x: g.w / 2 - 110, y: 22}); break;
    case 'player': {
      const kx = TRK.x0 + (0.12 + (e.scrubDown - e.play) * RATE) * TRK.w;
      CUR.push({t: s.t0 + 8, x: 150, y: 104}, {t: e.scrubDown - 18, x: kx, y: 32}, {t: e.scrubDown + 2, x: kx + 252, y: 32});
      break;
    }
    case 'slider': {
      const hx0 = -260 + V0 * 510;
      CUR.push({t: s.t0 + 1, x: hx0, y: 6}, {t: e.volDown + 2, x: hx0 + 420, y: 6});
      break;
    }
    case 'toggle': CUR.push({t: s.t0 + 5, x: -g.w / 2 + 75, y: 10}); break;
    case 'tabs':
      CUR.push({t: s.t0 + 4, x: tabX(s, 1), y: 14});
      for (let k = 1; k < s.d.tabs.length - 1; k++) CUR.push({t: e[`tab${k}`] + 4, x: tabX(s, k + 1), y: 14});
      break;
    case 'chart': CUR.push({t: Math.max(s.t0 + 4, e.hover - 11), x: chartBars(s)[s.d.highlight ?? 0].x, y: 60}); break;
    case 'search': CUR.push({t: s.t0 + 2, x: 330, y: 150}, {t: e.results + 2, x: 300, y: 64}); break;
    default: CUR.push({t: s.t0 + 8, x: REST.x, y: REST.y});
  }
});
CUR.sort((a, b) => a.t - b.t);
/* 停留時游標像真人一樣每拍輕輕晃一下（原提示詞：每一拍都有事情發生、不要空白時間）；拖曳與點擊前後不晃 */
const DRIFT: [number, number][] = [[14, -8], [-6, 9], [10, 6], [-12, -5]];
const busy = SS.flatMap((s) => Object.values(s.ev).concat(s.t1)).sort((a, b) => a - b);
for (let i = 0, n = CUR.length; i < n; i++) {
  const a = CUR[i];
  const end = i + 1 < n ? CUR[i + 1].t : P + CUR[0].t;
  for (let t = a.t + 30, k = 0; t < Math.min(end - 14, P - 1); t += 15, k++) {
    if (busy.some((b) => Math.abs(b - t) < 10)) continue;
    const [dx, dy] = DRIFT[k % 4];
    CUR.push({t, x: a.x + dx, y: a.y + dy});
  }
}
CUR.sort((a, b) => a.t - b.t);
const KCX: Key[] = CUR.map((c) => ({t: c.t, v: c.x}));
const KCY: Key[] = CUR.map((c) => ({t: c.t, v: c.y}));
const curX = (f: number) => track(KCX, f, 13, 0.9);
const curY = (f: number) => track(KCY, f, 13, 0.9);
const cp: Key[] = [];
const cpr = (a: number, b = a + 4) => cp.push({t: a, v: 0.84, w: 45, z: 0.9}, {t: b, v: 1, w: 24, z: 0.8});
SS.forEach((s) => {
  const e = s.ev;
  if (s.type === 'button' || s.type === 'island' || s.type === 'search') cpr(s.t1);
  if (s.type === 'player') cpr(e.play), cpr(e.scrubDown, e.scrubUp);
  if (s.type === 'slider') cpr(e.volDown, e.volUp);
  if (s.type === 'toggle') cpr(e.flip);
  if (s.type === 'tabs') for (let k = 1; k < s.d.tabs.length; k++) cpr(e[`tab${k}`]);
});
cp.sort((a, b) => a.t - b.t);
const KCP: Key[] = cp.length ? cp : [{t: 0, v: 1}];

const progress = (s: St, f: number) => {
  const e = s.ev;
  const pAuto = (ff: number) => (ff < e.play ? 0.12 : 0.12 + (ff - e.play) * RATE);
  if (f < e.scrubDown) return pAuto(f);
  const held = (ff: number) => pAuto(e.scrubDown) + (curX(ff) - curX(e.scrubDown)) / TRK.w;
  if (f < e.scrubUp) return cl(held(f));
  return cl(held(e.scrubUp) + (f - e.scrubUp) * RATE);
};
const volume = (s: St, f: number) => {
  const e = s.ev;
  const held = (ff: number) => V0 + (curX(ff) - curX(e.volDown)) / VW;
  if (f < e.volDown) return {v: V0, extra: 0};
  if (f < e.volUp) return {v: cl(held(f)), extra: rubber(held(f))};
  return {v: cl(held(e.volUp)), extra: rubber(held(e.volUp)) * (1 - S(f - e.volUp, 17, 0.8))};
};

/* 播放／暫停變形 */
type Pt = [number, number];
const PLAY_A: Pt[] = [[7, 2], [19, 9.5], [19, 24.5], [7, 32]];
const PLAY_B: Pt[] = [[19, 9.5], [32, 17], [32, 17], [19, 24.5]];
const PAUSE_A: Pt[] = [[6, 3], [14, 3], [14, 31], [6, 31]];
const PAUSE_B: Pt[] = [[20, 3], [28, 3], [28, 31], [20, 31]];
const poly = (a: Pt[], b: Pt[], p: number) => 'M' + a.map((q, i) => `${mix(q[0], b[i][0], p)},${mix(q[1], b[i][1], p)}`).join('L') + 'Z';

type W = {o: number; blur: number; on: boolean};
const Layer: React.FC<{w: W; children: React.ReactNode}> = ({w, children}) =>
  w.on ? (
    <div style={{position: 'absolute', left: 0, top: 0, opacity: w.o, filter: w.blur > 0.2 ? `blur(${w.blur.toFixed(2)}px)` : undefined}}>{children}</div>
  ) : null;

/* ───── 各狀態的內容（座標原點＝形狀中心） ───── */
type CP = {s: St; f: number; g: G; w: number; h: number; ex: number; kn: {l: number; r: number; t: number; b: number; rad: number}};

const Button: React.FC<CP> = ({s}) => <Txt x={0} y={0} size={46} color="#fff" ls={3}>{s.d.label}</Txt>;

const Loading: React.FC<CP> = ({s, f}) => (
  <svg width={120} height={120} viewBox="-60 -60 120 120" style={{position: 'absolute', left: -60, top: -60}}>
    <circle
      r={34} fill="none" stroke="#fff" strokeWidth={STROKE + 1} strokeLinecap="round"
      strokeDasharray={`${2 * Math.PI * 34 * (0.26 + 0.74 * S(f - s.ev.check, 16, 0.9))} 999`}
      transform={`rotate(${(Math.min(f, s.ev.check) - s.t0) * 17 + S(f - s.ev.check, 10, 0.95) * 70 - 90})`}
    />
    <CheckPath p={S(f - s.ev.check - 2, 18, 0.95)} color="#fff" />
  </svg>
);

const Island: React.FC<CP> = ({s, f, g}) => (
  <>
    <div style={{position: 'absolute', left: -g.w / 2 + 39, top: -9, width: 18, height: 18, borderRadius: 9, background: '#fff', opacity: 0.45 + 0.55 * Math.exp(-(f % 15) / 5)}} />
    <Txt x={-g.w / 2 + 75} y={0} size={36} color="#fff" align="l">
      {s.d.tag}
      {s.d.tag ? <span style={{marginLeft: 14}}>{s.d.text}</span> : s.d.text}
    </Txt>
    {[0, 1, 2, 3, 4].map((i) => {
      const bh = 10 + 30 * Math.abs(Math.sin(f * 0.33 + i * 1.3)) * (0.55 + 0.45 * Math.exp(-(f % 15) / 6));
      return <Box key={i} x={g.w / 2 - 120 + i * 18} y={-bh / 2} w={8} h={bh} r={4} bg="#fff" />;
    })}
  </>
);

const Player: React.FC<CP> = ({s, f}) => {
  const e = s.ev;
  const p = progress(s, f);
  const pp = S(f - e.play, 22, 0.86);
  const playPress = track([{t: e.play, v: 0.9, w: 45, z: 0.9}, {t: e.play + 4, v: 1, w: 22, z: 0.8}], f);
  const knob = 26 + 10 * track([{t: e.scrubDown, v: 1, w: 30}, {t: e.scrubUp, v: 0, w: 30}], f);
  return (
    <>
      <Box x={-390} y={-130} w={260} h={260} r={28} bg={INK}>
        <Txt x={130} y={s.d.coverSub ? 112 : 130} size={92} color="#fff" ls={-2}>{s.d.cover}</Txt>
        {s.d.coverSub && <Txt x={130} y={196} size={30} w={500} color="#bdb8b1">{s.d.coverSub}</Txt>}
      </Box>
      <Txt x={-90} y={-102} size={56} align="l">{s.d.title}</Txt>
      {s.d.subtitle && <Txt x={-90} y={-44} size={30} w={500} color={MUTE} align="l">{s.d.subtitle}</Txt>}
      <Box x={TRK.x0} y={26} w={TRK.w} h={8} r={4} bg={LINE} />
      <Box x={TRK.x0} y={26} w={p * TRK.w} h={8} r={4} bg={INK} />
      <Box x={TRK.x0 + p * TRK.w - knob / 2} y={30 - knob / 2} w={knob} h={knob} r={knob / 2} bg={INK} />
      <svg width={40} height={40} viewBox="0 0 40 40" style={{position: 'absolute', left: 20, top: 90}}>
        <path d="M8 6 h5 v28 h-5 Z M34 6 L15 20 L34 34 Z" fill={INK} strokeLinejoin="round" />
      </svg>
      <div style={{position: 'absolute', left: 108, top: 68, width: 84, height: 84, borderRadius: 42, background: INK, transform: `scale(${playPress})`}}>
        <svg width={34} height={34} viewBox="0 0 34 34" style={{position: 'absolute', left: 25, top: 25}}>
          <path d={poly(PLAY_A, PAUSE_A, pp)} fill="#fff" />
          <path d={poly(PLAY_B, PAUSE_B, pp)} fill="#fff" />
        </svg>
      </div>
      <svg width={40} height={40} viewBox="0 0 40 40" style={{position: 'absolute', left: 240, top: 90}}>
        <path d="M32 6 h-5 v28 h5 Z M6 6 L25 20 L6 34 Z" fill={INK} strokeLinejoin="round" />
      </svg>
    </>
  );
};

const Slider: React.FC<CP> = ({s, f, ex}) => {
  const vol = volume(s, f);
  const tL = -260 - ex / 2;
  const tR = 250 + ex / 2;
  const hx = tL + vol.v * (tR - tL);
  const held = track([{t: s.ev.volDown, v: 1, w: 30}, {t: s.ev.volUp, v: 0, w: 30}], f);
  const k = 46 + 10 * held;
  return (
    <>
      <svg width={56} height={48} viewBox="0 0 56 48" style={{position: 'absolute', left: -352 - ex / 2, top: -24}}>
        <path d="M4 17 h9 l12 -10 v34 l-12 -10 h-9 Z" fill={INK} strokeLinejoin="round" />
        <path d="M33 16 q6 8 0 16" fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
        <path d="M40 9 q12 15 0 30" fill="none" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
      </svg>
      <Box x={tL} y={-9} w={tR - tL} h={18} r={9} bg={LINE} />
      <Box x={tL} y={-9} w={hx - tL} h={18} r={9} bg={INK} />
      <Box x={hx - k / 2} y={-k / 2} w={k} h={k} r={30} bg={INK} style={{border: '5px solid #fff', boxSizing: 'border-box'}} />
      <Txt x={292 + ex / 2} y={0} size={30} w={500} color={MUTE} align="l">{s.d.label}</Txt>
    </>
  );
};

const TabLabels: React.FC<{s: St; color: string}> = ({s, color}) => (
  <>
    {s.d.tabs.map((t: any, k: number) => (
      <Txt key={k} x={tabX(s, k)} y={0} size={42} color={color}>
        {t.a}
        {t.b && <span style={{marginLeft: t.a ? 10 : 0}}>{t.b}</span>}
      </Txt>
    ))}
  </>
);

const UNIT_MAX = 324;
const BASE = 210;
const Chart: React.FC<CP> = ({s, f}) => {
  const bars = chartBars(s);
  const max = Math.max(...bars.map((b: any) => b.v));
  const hi = s.d.highlight ?? 0;
  const hl = S(f - s.ev.hover, 20, 0.9);
  const tip = s.d.tip;
  const hb = bars[hi];
  const hbTop = BASE - Math.max(40, (UNIT_MAX * hb.v) / max);
  const lines: string[] = tip?.lines || [];
  const tipH = lines.length === 0 ? 80 : lines.length === 1 ? 120 : 160;
  const right = hb.x + hb.bw / 2 + 20 + 490 <= 520;
  const tipX = right ? hb.x + hb.bw / 2 + 20 : hb.x - hb.bw / 2 - 20 - 490;
  /* 提示框不可以蓋住別根長條的數字：從高到低找一個不重疊的位置（蓋到長條本身沒關係） */
  const valRects = bars.map((b: any) => {
    const top = BASE - Math.max(40, (UNIT_MAX * b.v) / max);
    return {x0: b.x - 60, x1: b.x + 60, y0: top - 62, y1: top - 10};
  });
  const clear = (y: number) => valRects.every((r: any) => r.x1 < tipX || r.x0 > tipX + 490 || r.y1 < y || r.y0 > y + tipH);
  const pref = Math.max(-200, Math.min(BASE - tipH - 10, hbTop - 78));
  const cands = [pref];
  for (let y = -200; y <= BASE - tipH - 10; y += 10) cands.push(y);
  const tipY = cands.find(clear) ?? pref;
  return (
    <>
      <Txt x={-470} y={-240} size={40} align="l">{s.d.title}</Txt>
      {s.d.note && <Txt x={470} y={-240} size={31} w={500} color={MUTE} align="r">{s.d.note}</Txt>}
      {[1, 2, 3].map((k) => (
        <Box key={k} x={-470} y={BASE - 108 * k - 1} w={940} h={2} r={1} bg="#EEEBE6" />
      ))}
      <Box x={-470} y={BASE - 1} w={940} h={3} r={1.5} bg="#D9D4CD" />
      {bars.map((b: any, i: number) => {
        const gr = S(f - (s.t0 + 3 + 4 * i), 14, 0.86);
        const bh = Math.max(40, (UNIT_MAX * b.v) / max) * gr;
        const col = i === hi ? INK : gray(mix(20, 206, hl));
        const lab = cl((f - (s.t0 + 13 + 4 * i)) / 5);
        return (
          <React.Fragment key={i}>
            <Box x={b.x - b.bw / 2} y={BASE - bh} w={b.bw} h={bh} r={14} bg={col} style={{borderBottomLeftRadius: 3, borderBottomRightRadius: 3}} />
            <Txt x={b.x} y={BASE - bh - 36} size={44} color={i === hi ? INK : gray(mix(20, 150, hl))} style={{opacity: lab}}>{b.show ?? b.v}</Txt>
            <Txt x={b.x} y={BASE + 42} size={34} w={500} color="#6f6a63">{b.l}</Txt>
          </React.Fragment>
        );
      })}
      {tip && hl > 0.002 && (
        <div style={{position: 'absolute', left: tipX, top: tipY, opacity: hl, transform: `translateY(${(1 - hl) * 16}px)`, filter: hl < 0.98 ? `blur(${(1 - hl) * 6}px)` : undefined}}>
          <div style={{position: 'absolute', left: right ? -9 : 477, top: Math.min(70, tipH / 2 - 11), width: 22, height: 22, background: INK, transform: 'rotate(45deg)', borderRadius: 4}} />
          <Box x={0} y={0} w={490} h={tipH} r={20} bg={INK}>
            <Txt x={30} y={40} size={36} color="#fff" align="l">{tip.head}</Txt>
            {lines.map((ln, k) => (
              <Txt key={k} x={30} y={90 + 40 * k} size={31} w={500} color="#e9e5df" align="l">{ln}</Txt>
            ))}
          </Box>
        </div>
      )}
    </>
  );
};

const Search: React.FC<CP> = ({s, f, h}) => {
  const top = -h / 2;
  const q = Array.from(String(s.d.query));
  const nKeys = q.filter((_, k) => f >= s.ev[`key${k}`]).length;
  const typed = q.slice(0, nKeys).join('');
  const lastKey = s.ev[`key${q.length - 1}`];
  const caretOn = f < lastKey + 4 || Math.floor((f - lastKey) / 8) % 2 === 1;
  const res = cl((f - s.ev.results - 1) / 5);
  const rowPress = track([{t: s.t1, v: 0.96, w: 45, z: 0.9}, {t: s.t1 + 4, v: 1, w: 22, z: 0.8}], f);
  return (
    <>
      <svg width={44} height={44} viewBox="0 0 44 44" style={{position: 'absolute', left: -414, top: top + 56 - 22}}>
        <circle cx={18} cy={18} r={11.5} fill="none" stroke={INK} strokeWidth={STROKE} />
        <path d="M27 27 L37 37" stroke={INK} strokeWidth={STROKE} strokeLinecap="round" />
      </svg>
      {typed === '' ? (
        <Txt x={-352} y={top + 56} size={40} w={500} color="#a39e97" align="l">{s.d.placeholder}</Txt>
      ) : (
        <Txt x={-352} y={top + 56} size={40} align="l">{typed}</Txt>
      )}
      {caretOn && <Box x={-352 + tw(typed, 40) + 4} y={top + 56 - 23} w={4} h={46} r={2} bg={INK} />}
      <Box x={346} y={top + 56 - 23} w={78} h={46} r={12} bg="#EFEBE6">
        <Txt x={39} y={23} size={28} w={600} color="#57534d">⌘K</Txt>
      </Box>
      {res > 0 && (
        <div style={{position: 'absolute', left: 0, top: 0, opacity: res, filter: res < 0.98 ? `blur(${(1 - res) * 7}px)` : undefined}}>
          <Box x={-440} y={top + 111} w={880} h={2} r={1} bg="#ECE8E2" />
          <Box x={-424} y={top + 126} w={848} h={110} r={22} bg={INK} style={{transform: `scale(${rowPress})`}}>
            <Txt x={32} y={55} size={36} color="#fff" align="l">
              {s.d.result}
              {s.d.resultSub && (
                <>
                  <span style={{color: '#bdb8b1'}}>・</span>
                  {s.d.resultSub}
                </>
              )}
            </Txt>
            <svg width={40} height={36} viewBox="0 0 40 36" style={{position: 'absolute', right: 30, top: 37}}>
              <path d="M34 4 v14 h-26 M15 10 l-8 8 l8 8" fill="none" stroke="#fff" strokeWidth={STROKE - 1} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
        </div>
      )}
    </>
  );
};

const Toast: React.FC<CP> = ({s, f}) => {
  const gw = 82 + tw(s.d.text, 40);
  const x0 = -gw / 2;
  return (
    <>
      <div style={{position: 'absolute', left: x0, top: -30, width: 60, height: 60, borderRadius: 30, background: INK}}>
        <svg width={60} height={60} viewBox="-30 -30 60 60">
          <CheckPath p={S(f - s.t0 - 4, 20, 0.95)} color="#fff" scale={0.72} />
        </svg>
      </div>
      <Txt x={x0 + 82} y={0} size={40} align="l">{s.d.text}</Txt>
    </>
  );
};

const Toggle: React.FC<CP & {on: boolean}> = ({s, g, on}) => {
  const cx = (-g.w / 2 + 134 + g.w / 2 - 10) / 2; // 鈕以外那一段的中心（OFF 時字在右、ON 時在左）
  return on ? <Txt x={-cx} y={0} size={44} color="#fff">{s.d.label}</Txt> : <Txt x={cx} y={0} size={44} color="#5f5b55">{s.d.label}</Txt>;
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();

  /* 目前所在的狀態（片尾變回第一個） */
  const ci = f >= R ? 0 : SS.findIndex((s) => f >= s.t0 && f < s.t1);
  const cur = SS[ci < 0 ? 0 : ci];

  /* 滑桿拖過頭會把整個形狀拉長 */
  let ex = 0;
  for (const s of SS) if (s.type === 'slider' && f >= s.t0 - 2 && f < s.t1 + 6) ex = volume(s, f).extra;

  const w = track(KW, f) + ex;
  const h = track(KH, f) - ex * 0.1;
  const r = Math.min(track(KR, f), h / 2, w / 2);
  const L = track(KLum, f);
  const cx = ex / 2;
  const pz = track(KPress, f, 22, 0.8);
  const z = track(KZ, f, 9, 0.95); // 鏡頭：比形狀慢一點的彈簧

  const mx = curX(f);
  const my = curY(f);
  const cpz = track(KCP, f);

  const s = 44 * z;
  const dot = 1.5 * Math.sqrt(z);

  /* 指示器 */
  const kn = {l: track(KnL, f), r: track(KnR, f), t: track(KnT, f, 20, 0.85), b: track(KnB, f, 20, 0.85), rad: 0};
  kn.rad = Math.max(0, Math.min(kn.r - kn.l, kn.b - kn.t) / 2);
  const kCol = gray(track(KnC, f));
  const wKnob = KNOB_RUNS.map(([a, b]) => win(f, a, b)).reduce((m, x) => (x.o > m.o ? x : m), {o: 0, blur: 0, on: false} as W);

  const O: React.CSSProperties = {position: 'absolute', left: '50%', top: '50%', width: 0, height: 0};

  return (
    <AbsoluteFill style={{background: '#E8E4DE', overflow: 'hidden', fontFamily: FONT}}>
      <Audio src={staticFile('music.wav')} />
      <AbsoluteFill
        style={{
          backgroundImage: `radial-gradient(circle, #D2CCC4 ${dot}px, rgba(210,204,196,0) ${dot + 0.8}px)`,
          backgroundSize: `${s}px ${s}px`,
          backgroundPosition: `${960 - s / 2}px ${540 - s / 2}px`,
        }}
      />
      <div style={{position: 'absolute', left: 960, top: 540, width: 0, height: 0, transform: `scale(${z})`}}>
        <div
          style={{
            position: 'absolute', left: cx - w / 2, top: -h / 2, width: w, height: h, borderRadius: r, background: gray(L),
            transform: `scale(${pz})`, overflow: 'hidden',
            boxShadow: '0 18px 44px rgba(70,55,40,0.13), 0 2px 5px rgba(40,30,20,0.08)',
          }}
        >
          <div style={O}>
            {SS.map((st, i) => {
              const ww = i === 0 ? win(f, R, st.t1) : win(f, st.t0, st.t1);
              if (!ww.on) return null;
              const p: CP = {s: st, f, g: GEO[i], w, h, ex, kn};
              switch (st.type) {
                case 'button': return <Layer key={i} w={ww}><Button {...p} /></Layer>;
                case 'loading': return <Layer key={i} w={ww}><Loading {...p} /></Layer>;
                case 'island': return <Layer key={i} w={ww}><Island {...p} /></Layer>;
                case 'player': return <Layer key={i} w={ww}><Player {...p} /></Layer>;
                case 'slider': return <Layer key={i} w={ww}><Slider {...p} /></Layer>;
                case 'toggle':
                  return (
                    <React.Fragment key={i}>
                      <Layer w={win(f, st.t0, st.ev.flip)}><Toggle {...p} on={false} /></Layer>
                      <Layer w={win(f, st.ev.flip, st.t1)}><Toggle {...p} on /></Layer>
                    </React.Fragment>
                  );
                case 'tabs': return <Layer key={i} w={ww}><TabLabels s={st} color={INK} /></Layer>;
                case 'chart': return <Layer key={i} w={ww}><Chart {...p} /></Layer>;
                case 'search': return <Layer key={i} w={ww}><Search {...p} /></Layer>;
                default: return <Layer key={i} w={ww}><Toast {...p} /></Layer>;
              }
            })}

            {/* 開關鈕＝液態指示器 */}
            {wKnob.on && (
              <div
                style={{
                  position: 'absolute', left: kn.l, top: kn.t, width: kn.r - kn.l, height: kn.b - kn.t, borderRadius: kn.rad, background: kCol, opacity: wKnob.o,
                  boxShadow: cur.type === 'toggle' ? '0 3px 8px rgba(0,0,0,0.18)' : undefined,
                }}
              />
            )}

            {/* 分頁白字：只露出指示器範圍 */}
            {SS.map((st, i) => {
              if (st.type !== 'tabs') return null;
              const ww = win(f, st.t0, st.t1);
              if (!ww.on) return null;
              return (
                <Layer key={`w${i}`} w={ww}>
                  <div
                    style={{
                      position: 'absolute', left: -w / 2, top: -h / 2, width: w, height: h,
                      clipPath: `inset(${kn.t + h / 2}px ${w / 2 - kn.r}px ${h / 2 - kn.b}px ${kn.l + w / 2}px round ${kn.rad}px)`,
                    }}
                  >
                    <div style={{position: 'absolute', left: w / 2, top: h / 2}}>
                      <TabLabels s={st} color="#fff" />
                    </div>
                  </div>
                </Layer>
              );
            })}
          </div>
        </div>

        {/* 游標：也在世界裡，跟著鏡頭；尺寸只部分跟著縮放 */}
        <Cursor x={mx} y={my} s={cpz / Math.sqrt(z)} />
      </div>
    </AbsoluteFill>
  );
};
