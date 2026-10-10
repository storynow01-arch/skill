/* 範本廣K「紅點作品集」：一顆紅點一路帶鏡——落地蓋出縮寫大字 → 連續鏡頭掃過數字組合 → 鑽進紅點 → 前一個值被劃掉換成後一個值 →
   DROP 星形大數字 → 甩鏡圓環大數字 → 名稱一刀一刀疊上 → 全部吸回紅點 → LOGO 重擊。
   段落、時間、字全部讀 timeline.json（timeline.py 依 storyboard 排好）；程式裡沒有任何題材的字。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {ANTON, SERIF} from './fonts';
import {EI, EIO, EO, LIN, MaskLine, Pt, Roller, bell, circlePts, k, lerp, mixPts, ptsPath, resample, rnd, sp} from './kit';
import T from './timeline.json';

type Sc = {kind: string; a: number; b: number; [key: string]: unknown};
const D = T.d as any;
const SC = T.scenes as unknown as Sc[];
const BF = T.beatFrames;
const W = 1920;
export const C = {paper: '#F2ECDF', ink: '#17151B', red: '#FF4B1F', lime: '#D8FF3C'};
const abs = (x: number, y: number, extra?: React.CSSProperties): React.CSSProperties => ({position: 'absolute', left: x, top: y, ...extra});
const isCJK = (c: string) => (c.codePointAt(0) as number) >= 0x2e80;
const emw = (s: string, latin = 0.55) => Array.from(s).reduce((a, c) => a + (isCJK(c) ? 1 : c === ' ' ? 0.3 : latin), 0);
/** Anton 只有拉丁字，× ＋ ～ 這類符號在 Anton 裡很小或缺字：這些字改用宋體，其他照 Anton */
const Mixed: React.FC<{text: string}> = ({text}) => (
  <>{Array.from(text).map((c, i) => (/[A-Za-z0-9 .,:;'"!?&@#%$/()\-]/.test(c) ? c : <span key={i} style={{fontFamily: SERIF, fontWeight: 900}}>{c}</span>))}</>
);
const RED = SC.find((s) => s.kind === 'swap' || s.kind === 'bridge') as Sc;
const BOOM = RED.boom as number;

/** 鏡頭重擊：各拍點的推鏡與震動（拍點與強度由 timeline.py 排） */
const camera = (f: number) => {
  let s = 0, x = 0, y = 0, r = 0;
  for (const [h, a] of T.hits as [number, number][]) {
    const d = f - h;
    if (d < 0 || d > 16) continue;
    s += 0.07 * a * Math.exp(-d / 3.5);
    const sh = 26 * a * Math.exp(-d / 2.6);
    const fl = Math.floor(f);
    x += sh * rnd(`x${h}-${fl}`);
    y += sh * rnd(`y${h}-${fl}`);
    r += 0.8 * a * Math.exp(-d / 3) * rnd(`r${h}-${fl}`);
  }
  return {s: 1 + s, x, y, r};
};

/** 殘影：把同一個畫面在過去幾個時間點各畫一次、逐層變淡（代替動態模糊） */
const Ghost: React.FC<{f: number; n?: number; step?: number; on?: boolean; render: (t: number) => React.ReactNode}> = ({f, n = 4, step = 0.5, on = true, render}) => (
  <>
    {on && Array.from({length: n}, (_, i) => n - i).map((i) => (
      <div key={i} style={{position: 'absolute', inset: 0, opacity: 0.38 * (1 - i / (n + 1))}}>{render(f - i * step)}</div>
    ))}
    <div style={{position: 'absolute', inset: 0}}>{render(f)}</div>
  </>
);

const whipOut = (f: number, h: number, d = 7) => -W * 1.1 * k(f, h - d, h, EI);
const whipIn = (f: number, h: number, d = 7) => W * 1.1 * (1 - k(f, h, h + d, EO));
/** 甩鏡包裝：整段內容水平甩出／甩入，速度快時畫殘影 */
const Whip: React.FC<{f: number; inAt?: number; outAt?: number; children: (f: number) => React.ReactNode}> = ({f, inAt, outAt, children}) => {
  const off = (t: number) => (inAt !== undefined && t >= inAt ? whipIn(t, inAt) : 0) + (outAt !== undefined && t < outAt ? whipOut(t, outAt) : 0);
  const v = Math.abs(off(f) - off(f - 1));
  const ghosts = v > 40 ? [3, 2, 1] : [];
  return (
    <>
      {ghosts.map((i) => (
        <div key={i} style={{position: 'absolute', inset: 0, transform: `translateX(${off(f - i * 0.35)}px)`, opacity: 0.12 * (4 - i)}}>{children(f)}</div>
      ))}
      <div style={{position: 'absolute', inset: 0, transform: `translateX(${off(f)}px)`}}>{children(f)}</div>
    </>
  );
};

/* ───────── 開場：紅點落下，蓋出縮寫大字 ───────── */
const A_S = D.markSize as number;
const A_SL = (D.slots as number[]).map((x) => x * A_S);
const A_TOT = A_SL.reduce((a, b) => a + b, 0);
const A_X0 = 960 - A_TOT / 2;
const A_CUM = A_SL.reduce((acc: number[], w) => [...acc, acc[acc.length - 1] + w], [0]);
const A_H = A_S * 1.04;
const A_TOP = 520 - A_H / 2;
const A_SC = Math.max(0.6, A_S / 520);
const A_PTS: Pt[] = [[960, 520 + 80 * A_SC], ...A_SL.map((_, i) => [A_X0 + A_CUM[i + 1] + 40 * A_SC, 520 + 0.327 * A_S] as Pt)];
const dotA = (f: number, s: Sc) => {
  const land = s.land as number;
  const L = s.letters as number[];
  if (f < land) return {x: 960, y: lerp(-160, A_PTS[0][1], Math.pow(k(f, 0, land, LIN), 1.8)), sx: 1 - 0.25 * k(f, 0, land, LIN), sy: 1 + 0.6 * k(f, 0, land, LIN)};
  let x = A_PTS[0][0], y = A_PTS[0][1], lift = 0;
  L.forEach((h, i) => {
    const p = k(f, h - 3, h, EIO);
    x = lerp(x, A_PTS[i + 1][0], p);
    y = lerp(y, A_PTS[i + 1][1], p);
    lift += 110 * A_SC * bell(p);
  });
  const d = f - land;
  const sq = d < 14 ? Math.exp(-d / 3) * Math.cos(d * 0.9) : 0;
  return {x, y: y - lift, sx: 1 + 0.55 * sq, sy: 1 - 0.45 * sq};
};
const SceneOpen: React.FC<{f: number; s: Sc}> = ({f, s}) => {
  const land = s.land as number;
  const L = s.letters as number[];
  const d = f - land;
  const R0 = 62 * A_SC;
  const mark = Array.from(D.mark as string);
  const aw = emw(D.above) * D.aboveSize + 6 * D.above.length;
  const bw = emw(D.below, 0.5) * D.belowSize + 14 * D.below.length;
  return (
    <>
      {d >= 0 && d < 22 && [0, 5].map((o) => {
        const dd = d - o;
        if (dd < 0) return null;
        const r = 70 * A_SC + dd * 26;
        const [cx, cy] = A_PTS[0];
        return <div key={o} style={abs(cx - r, cy - r, {width: r * 2, height: r * 2, borderRadius: '50%', border: `${Math.max(1, 10 - dd * 0.5)}px solid ${C.ink}`, opacity: 1 - dd / 22})} />;
      })}
      {L.map((h, i) => {
        if (f < h - 1) return null;
        const letter = (t: number, key: number, op: number) => {
          const p = k(t, h - 1, h + 4, EO);
          const dir = i % 2 ? -1 : 1;
          return (
            <div key={key} style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - p) * 105 * dir}%)`, opacity: op}}>
              {mark[i]}
            </div>
          );
        };
        return (
          <div key={i} style={abs(A_X0 + A_CUM[i], A_TOP, {width: A_SL[i], height: A_H, overflow: 'hidden', fontFamily: ANTON, fontSize: A_S, lineHeight: `${A_H}px`, textAlign: 'center', color: C.ink, whiteSpace: 'nowrap'})}>
            {letter(f - 2, 2, 0.15)}
            {letter(f - 1, 1, 0.3)}
            {letter(f, 0, 1)}
          </div>
        );
      })}
      {D.above && (
        <MaskLine p={k(f, s.above as number, (s.above as number) + 6)} style={abs(Math.max(60, Math.min(A_X0 + 14, 1860 - aw)), A_TOP - D.aboveSize * 1.45, {fontFamily: SERIF, fontWeight: 900, fontSize: D.aboveSize, color: C.ink, letterSpacing: 6, whiteSpace: 'nowrap'})}>
          {D.above}
        </MaskLine>
      )}
      {D.below && (
        <MaskLine p={k(f, s.below as number, (s.below as number) + 6)} style={abs(Math.max(60, Math.min(A_X0 + 18, 1860 - bw)), A_TOP + A_H + 10, {fontFamily: ANTON, fontSize: D.belowSize, color: C.red, letterSpacing: 14, whiteSpace: 'nowrap'})}>
          <Mixed text={D.below} />
        </MaskLine>
      )}
      <Ghost f={f} on={f < land + 1} step={0.8} render={(t) => {
        const q = dotA(t, s);
        return <div style={abs(q.x - R0, q.y - R0, {width: R0 * 2, height: R0 * 2, borderRadius: '50%', background: C.red, transform: `scale(${q.sx},${q.sy})`})} />;
      }} />
    </>
  );
};
/** 鑽進紅點（開場直接接紅底時）：鏡頭對準最後一顆紅點一路推到 70 倍 */
const DiveWrap: React.FC<{f: number; dive: number; red: number; at: Pt; children: React.ReactNode}> = ({f, dive, red, at, children}) => {
  const pd = k(f, dive - 4, red, EI);
  const pf = k(f, dive - 4, dive + 4, EO);
  const cx = lerp(960, at[0], pf), cy = lerp(540, at[1], pf);
  const z = Math.exp(lerp(0, Math.log(70), pd));
  return <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})`}}>{children}</div>;
};

/* ───────── 數字組合（一條連續鏡頭） ───────── */
const ROW_Y = 520, NUM = 340, UNIT = 230;
const numW = (s: string) => Array.from(s).reduce((a, c) => a + (/[0-9]/.test(c) ? 0.6 : isCJK(c) ? 1 : 0.32) * NUM, 0);
const B_ITEMS = (() => {
  let x = 0;
  const out = (D.counts as {num: string; unit: string}[]).map((c) => {
    const nw = numW(c.num);
    const uw = c.unit ? emw(c.unit) * UNIT + 14 : 0;
    const it = {num: c.num, unit: c.unit, nx: x, nw, ux: x + nw + 12, uw, dx: x + nw + 12 + uw + 30};
    x = it.dx + 50;
    return it;
  });
  const rowW = out.length ? out[out.length - 1].dx + 40 : 0;
  const ox = 960 - rowW / 2;
  return {items: out.map((it) => ({...it, nx: it.nx + ox, ux: it.ux + ox, dx: it.dx + ox})), za: Math.min(1, 1760 / Math.max(1, rowW))};
})();
const camB = (f: number, s: Sc) => {
  const H = s.h as number[];
  const cams: [number, number, number, number][] = B_ITEMS.items.map((it, i) => {
    const w = it.dx - it.nx + 40;
    return [H[i], (it.nx + it.dx) / 2, ROW_Y, Math.max(B_ITEMS.za, Math.min(2.2, 1100 / w))];
  });
  cams.push([s.assemble as number, 960, ROW_Y, B_ITEMS.za]);
  let [, cx, cy, z] = cams[0];
  for (let i = 1; i < cams.length; i++) {
    const p = k(f, cams[i][0] - 8, cams[i][0], EIO);
    cx = lerp(cx, cams[i][1], p);
    cy = lerp(cy, cams[i][2], p);
    z = Math.exp(lerp(Math.log(z), Math.log(cams[i][3]), p));
  }
  // 鑽進紅點
  const dive = s.dive as number;
  const red = s.b;
  const pd = k(f, dive - 4, red, EI);
  const pf = k(f, dive - 4, dive + 4, EO);
  const last = B_ITEMS.items[B_ITEMS.items.length - 1];
  cx = lerp(cx, last.dx, pf);
  cy = lerp(cy, 612, pf);
  z = Math.exp(lerp(Math.log(z), Math.log(70), pd));
  return {cx, cy, z};
};
const dotB = (f: number, s: Sc) => {
  const H = s.h as number[];
  const P = B_ITEMS.items.map((it) => [it.dx, 612] as Pt);
  let [x, y] = P[0];
  let lift = 0;
  for (let i = 1; i < P.length; i++) {
    const p = k(f, H[i] - 8, H[i], EIO);
    x = lerp(x, P[i][0], p);
    y = lerp(y, P[i][1], p);
    lift += 160 * bell(p);
  }
  return {x, y: y - lift};
};
const SceneCounts: React.FC<{f: number; s: Sc}> = ({f, s}) => {
  const {cx, cy, z} = camB(f, s);
  const H = s.h as number[];
  const asm = s.assemble as number;
  const tk = k(f, asm, asm + 7);
  const tick = D.ticker as string[];
  const n = B_ITEMS.items.length;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: 1080, transformOrigin: '0 0', transform: `translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})`}}>
      {tick.length > 0 && [0, 1].map((b) => (
        <div key={b} style={abs(-1200, b ? 790 : 200, {width: W + 2400, height: 74, overflow: 'hidden', borderTop: `3px solid ${C.ink}`, borderBottom: `3px solid ${C.ink}`, opacity: tk, clipPath: `inset(0 ${(1 - tk) * 100}% 0 0)`})}>
          <div style={{position: 'absolute', top: 6, left: b ? -1400 + (f - asm) * 13 : -(f - asm) * 13, whiteSpace: 'nowrap', fontFamily: SERIF, fontWeight: 900, fontSize: 44, lineHeight: '58px', color: C.ink}}>
            {Array.from({length: Math.ceil(8000 / Math.max(200, tick.reduce((a, t) => a + emw(t) * 44 + 100, 0)))}).flatMap(() => tick).map((t, i) => (
              <span key={i}>
                {t}
                <span style={{color: C.red, margin: '0 28px'}}>●</span>
              </span>
            ))}
          </div>
        </div>
      ))}
      {B_ITEMS.items.map((it, i) => {
        const h = H[i];
        if (f < h - 1) return null;
        const sN = lerp(1.6, 1, k(f, h - 1, h + 5, EO));
        const a = k(f, h + 1, h + 6, EO);
        const b2 = k(f, h + 6, h + 12, EI);
        return (
          <React.Fragment key={i}>
            <div style={abs(it.nx, ROW_Y - 200, {width: it.nw, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink, fontFamily: ANTON, fontSize: NUM, transform: `scale(${sN})`})}>
              <Roller value={it.num} t={f} start={h - 2} lock={[h + 8]} laps={1} cw={0.6} />
            </div>
            {it.unit && (
              <div style={abs(it.ux, ROW_Y - 200, {width: it.uw, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink, fontFamily: SERIF, fontWeight: 900, fontSize: UNIT, lineHeight: 1})}>
                <span style={{opacity: f >= h + 6 ? 1 : 0, whiteSpace: 'nowrap'}}>{it.unit}</span>
                <div style={abs(-6, 70, {width: it.uw + 12, height: 260, background: i === n - 1 ? C.ink : C.red, transformOrigin: b2 > 0 ? 'right' : 'left', transform: `scaleX(${b2 > 0 ? 1 - b2 : a})`})} />
              </div>
            )}
          </React.Fragment>
        );
      })}
      {f >= H[0] + 4 && (() => {
        const q = dotB(f, s);
        const r = 30 * sp(f, H[0] + 4, 9);
        return <div style={abs(q.x - r, q.y - r, {width: r * 2, height: r * 2, borderRadius: '50%', background: C.red})} />;
      })()}
    </div>
  );
};

/* ───────── 紅底：前一個值被劃掉換成後一個值（swap）／只留一拍紅底（bridge） ───────── */
const SceneRed: React.FC<{f: number; s: Sc}> = ({f, s}) => {
  const gap = s.gap as number;
  const boom = s.boom as number;
  const gs = 1 - k(f, gap, boom, EI);
  const dot = f >= gap && (() => {
    const r = 44 * k(f, gap, boom - 2, EO);
    return <div style={abs(960 - r, 540 - r, {width: r * 2, height: r * 2, borderRadius: '50%', background: C.paper})} />;
  })();
  if (s.kind === 'bridge') return <>{dot}</>;
  const S = D.swap;
  const red = s.a;
  const fs = S.fromSize as number;
  const chars = Array.from(S.from as string);
  const cws = chars.map((c) => (/[0-9]/.test(c) ? 0.566 : isCJK(c) ? 1.0 : 0.45) * fs);
  const fuW = S.fromUnit ? emw(S.fromUnit) * fs * 0.37 + 10 : 0;
  const tot = cws.reduce((a, b) => a + b, 0) + fuW;
  const NX = 960 - tot / 2;
  const xs = cws.reduce((acc: number[], w) => [...acc, acc[acc.length - 1] + w], [0]);
  const bh = fs * 1.1, by = 550 - bh / 2;
  const drop = s.drop as number, zero = s.zero as number;
  const fly = (i: number) => {
    const t = f - (drop + i * 1.2);
    if (t <= 0) return {x: 0, y: 0, r: 0};
    return {x: (i - chars.length / 2) * 13 * t, y: -70 * t + 1.5 * t * t, r: rnd(`c${i}`) * 9 * t};
  };
  const nd = chars.filter((c) => /[0-9]/.test(c)).length;
  const lock = Array.from({length: Math.max(1, nd)}, (_, i) => (i === nd - 1 ? (s.rollEnd as number) : red + 6 + i * 3));
  let di = 0;
  const ts = S.toSize as number;
  const toW = emw(S.to, 0.53) * ts;
  const tuS = ts * 0.32;
  const tuW = S.unit ? emw(S.unit) * tuS : 0;
  const gx = 960 - (toW + 20 + tuW) / 2;
  const TY = 600; // 後一個值的中心高度（上方留給標題）
  const zd = f - zero;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, transformOrigin: '960px 540px', transform: `scale(${gs})`, opacity: gs > 0.02 ? 1 : 0}}>
        {S.label && (
          <MaskLine p={k(f, red + 2, red + 10)} style={abs(0, 150, {width: W, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: S.labelSize, color: C.ink, letterSpacing: 10})}>
            {S.label}
          </MaskLine>
        )}
        {chars.map((d, i) => {
          const q = fly(i);
          if (q.y < -900) return null;
          const isD = /[0-9]/.test(d);
          const L = isD ? lock[Math.min(di++, lock.length - 1)] : 0;
          return (
            <div key={i} style={abs(NX + xs[i], by, {width: cws[i], height: bh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: isD ? ANTON : SERIF, fontWeight: isD ? 400 : 900, fontSize: fs, color: C.paper, transform: `translate(${q.x}px, ${q.y}px) rotate(${q.r}deg)`, opacity: isD ? 1 : k(f, red + 2 + i * 2, red + 6 + i * 2, LIN)})}>
              {isD ? <Roller value={d} t={f} start={red} lock={[L]} laps={1} cw={0.58} /> : d}
            </div>
          );
        })}
        {S.fromUnit && (() => {
          const q = fly(chars.length - 0.5);
          return <div style={abs(NX + xs[chars.length] + 10, by + bh - fs * 0.37 * 1.6, {fontFamily: SERIF, fontWeight: 900, fontSize: fs * 0.37, color: C.paper, transform: `translate(${q.x}px, ${q.y}px) rotate(${q.r}deg)`})}>{S.fromUnit}</div>;
        })()}
        {(() => {
          const q = fly(chars.length * 0.3);
          const p = k(f, s.strike as number, (s.strike as number) + 5, EO);
          return <div style={abs(NX - 30, 535, {width: tot + 60, height: Math.max(24, fs * 0.105), background: C.ink, transformOrigin: 'left', transform: `translate(${q.x}px, ${q.y}px) rotate(${-4 + q.r}deg) scaleX(${p})`})} />;
        })()}
        {zd >= -1 && (
          <>
            {zd >= 0 && zd < 14 && (() => {
              const r = 0.34 * ts + zd * 48;
              const cx = gx + toW / 2;
              return <div style={abs(cx - r, TY - r, {width: r * 2, height: r * 2, borderRadius: '50%', border: `14px solid ${C.paper}`, opacity: 1 - zd / 14})} />;
            })()}
            <Ghost f={f} on={zd < 5} n={3} step={1} render={(t) => {
              const zz = k(t, zero - 1, zero + 4, EO);
              return <div style={abs(gx, TY - ts * 0.54, {width: toW, height: ts * 1.08, textAlign: 'center', fontFamily: ANTON, fontSize: ts, lineHeight: `${ts * 1.08}px`, color: C.paper, whiteSpace: 'nowrap', transform: `scale(${lerp(2.8, 1, zz)})`, opacity: zz > 0 ? 1 : 0})}>{S.to}</div>;
            }} />
            {S.unit && <div style={abs(gx + toW + 20, TY - ts * 0.21, {fontFamily: SERIF, fontWeight: 900, fontSize: tuS, color: C.ink, whiteSpace: 'nowrap', transform: `scale(${lerp(2, 1, k(f, zero + 1, zero + 5, EO))})`, opacity: k(f, zero + 1, zero + 2, LIN)})}>{S.unit}</div>}
            {S.note && (
              <div style={abs(0, 930, {width: W, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: S.noteSize, color: C.ink, opacity: k(f, zero + 3, zero + 8, LIN), letterSpacing: 4})}>
                {S.note}
              </div>
            )}
          </>
        )}
      </div>
      {dot}
    </>
  );
};

/* ───────── 大數字：星形 DROP／圓環 ───────── */
const STAR: Pt[] = resample(Array.from({length: 36}, (_, i) => {
  const a = -Math.PI / 2 + (i / 36) * Math.PI * 2;
  const r = i % 2 ? 400 : 480;
  return [Math.cos(a) * r, Math.sin(a) * r] as Pt;
}), 180);
const CIRC: Pt[] = resample(circlePts(400, 180), 180);
const latinUnit = (u: string) => u !== '' && !Array.from(u).some(isCJK);
const SceneStat: React.FC<{f: number; s: Sc}> = ({f, s}) => {
  const st = D.stats[s.i as number];
  const a = s.a;
  const d = f - a;
  const vs = st.size as number;
  const label = st.label && (
    <MaskLine p={k(f, a + 3, a + 10)} style={abs(0, 70, {width: W, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: st.labelSize, color: C.ink, letterSpacing: 8})}>
      {st.label}
    </MaskLine>
  );
  const note = st.note && (
    <div style={abs(0, 955, {width: W, textAlign: 'center', fontFamily: SERIF, fontWeight: 900, fontSize: st.noteSize, color: C.ink, letterSpacing: 4, opacity: k(f, a + 14, a + 20, LIN)})}>
      {st.note}
    </div>
  );
  if (st.shape === 'star') {
    const grow = sp(f, a, 10, 160);
    const beatPulse = d > 0 ? Math.exp(-((d % BF) / 3)) * 0.05 : 0;
    const morph = s.outWhip ? k(f, s.b - 10, s.b, EIO) : 0;
    const pts = mixPts(STAR, CIRC, morph);
    const us = vs * 0.46;
    return (
      <>
        <svg width={W} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          <g transform={`translate(960 580) rotate(${d * 0.7}) scale(${grow * (1 + beatPulse)})`}>
            <path d={ptsPath(pts)} fill={C.red} />
          </g>
        </svg>
        {label}
        <div style={abs(0, 300, {width: W, height: 560, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink, transform: `scale(${lerp(1.5, 1, k(f, a, a + 6, EO))})`})}>
          <span style={{fontFamily: ANTON, fontSize: vs, whiteSpace: 'nowrap'}}>
            <Roller value={st.value} t={f} start={a} lock={[a + 10, a + 16]} laps={2} cw={0.56} />
          </span>
          {st.unit && (
            <span style={{fontFamily: latinUnit(st.unit) ? ANTON : SERIF, fontWeight: latinUnit(st.unit) ? 400 : 900, fontSize: us, marginLeft: 10, marginTop: vs * 0.21, whiteSpace: 'nowrap', opacity: k(f, a + 15, a + 17, LIN), transform: `scale(${lerp(1.8, 1, k(f, a + 15, a + 21, EO))})`}}>{st.unit}</span>
          )}
        </div>
        {note}
      </>
    );
  }
  const p = st.pct * k(f, a, a + 20, EO);
  const R = 330, CY = 590, L = 2 * Math.PI * R;
  const ang = -Math.PI / 2 + p * Math.PI * 2;
  const us = vs * 0.5;
  return (
    <>
      <svg width={W} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={960} cy={CY} r={R} fill="none" stroke={C.ink} strokeOpacity={0.12} strokeWidth={70} />
        <circle cx={960} cy={CY} r={R} fill="none" stroke={C.red} strokeWidth={70} strokeDasharray={`${L * p} ${L}`} transform={`rotate(-90 960 ${CY})`} />
        {p > 0.01 && <circle cx={960 + Math.cos(ang) * R} cy={CY + Math.sin(ang) * R} r={24} fill={C.paper} />}
      </svg>
      {label}
      <div style={abs(0, CY - 240, {width: W, height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink, fontFamily: ANTON})}>
        <span style={{fontSize: vs, whiteSpace: 'nowrap'}}>
          <Roller value={st.value} t={f} start={a} lock={[a + 12, a + 18]} laps={1} cw={0.56} />
        </span>
        {st.unit && <span style={{fontFamily: latinUnit(st.unit) ? ANTON : SERIF, fontWeight: latinUnit(st.unit) ? 400 : 900, fontSize: us, color: C.red, marginTop: vs / 3, marginLeft: 6, whiteSpace: 'nowrap'}}>{st.unit}</span>}
      </div>
      {note}
    </>
  );
};

/* ───────── 名稱一刀一刀疊上去 ───────── */
const SceneNames: React.FC<{f: number; s: Sc}> = ({f, s}) => {
  const N = s.n as number[];
  const NM = D.names as {tag: string; tagSize: number; pillW: number; name: string; size: number}[];
  let cur = 0;
  for (let i = 1; i < N.length; i++) cur += k(f, N[i] - 1, N[i] + 3, EO);
  const cs = k(f, s.collapse as number, s.b - 1, EI);
  const LH = 170;
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: '960px 540px', transform: `scale(${1 - cs * 0.98})`, opacity: cs > 0.97 ? 0 : 1}}>
      {NM.map((p, i) => {
        if (f < N[i] - 1) return null;
        const y = 540 - 70 + (i - cur) * LH;
        if (y < -200) return null;
        const op = Math.max(0.2, 1 - 0.3 * Math.max(0, cur - i));
        const line = (t: number, key: number, o: number) => {
          const x = 1500 * (1 - k(t, N[i] - 1, N[i] + 4, EO));
          return (
            <div key={key} style={abs(420 + x, y, {height: 140, display: 'flex', alignItems: 'center', opacity: o})}>
              {p.tag && <div style={{width: p.pillW, height: 84, borderRadius: 42, background: C.ink, color: C.lime, fontFamily: SERIF, fontWeight: 900, fontSize: p.tagSize, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', marginRight: 36}}>{p.tag}</div>}
              <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: p.size, color: C.ink, whiteSpace: 'nowrap', lineHeight: 1}}>{p.name}</div>
            </div>
          );
        };
        const moving = f < N[i] + 4;
        return (
          <div key={i} style={{position: 'absolute', inset: 0, opacity: op}}>
            {moving && line(f - 2, 2, 0.15)}
            {moving && line(f - 1, 1, 0.3)}
            {line(f, 0, 1)}
          </div>
        );
      })}
      <div style={abs(340, 540 - 34, {width: 68, height: 68, borderRadius: '50%', background: C.red, transform: `scale(${sp(f, N[0], 10)})`})} />
    </div>
  );
};

/* ───────── LOGO ───────── */
const SceneLogo: React.FC<{f: number; s: Sc}> = ({f, s}) => {
  const L = s.a;
  const SL = s.slogan as number;
  const G = D.logo;
  const sc = sp(f, L, 9, 200);
  const nameBottom = 501;
  const slog = G.slogan as string[];
  const urlTop = 580 + G.sloganSize * 1.2 + 34;
  return (
    <>
      <div style={abs(520 - 200, 480 - 200, {width: 400, height: 400, borderRadius: '50%', background: C.red, transform: `scale(${lerp(0.15, 1, sc)})`, display: 'flex', alignItems: 'center', justifyContent: 'center'})}>
        <span style={{fontFamily: ANTON, fontSize: G.markSize, color: C.paper, letterSpacing: 4, whiteSpace: 'nowrap', opacity: k(f, L + 2, L + 5, LIN)}}>{G.mark}</span>
      </div>
      <Ghost f={f} on={f < L + 5} n={3} step={1} render={(t) => {
        const p = k(t, L, L + 5, EO);
        return <div style={abs(790, nameBottom - G.nameSize * 1.1, {fontFamily: SERIF, fontWeight: 900, fontSize: G.nameSize, color: C.ink, lineHeight: 1.1, letterSpacing: 6, whiteSpace: 'nowrap', transformOrigin: 'left center', transform: `translateX(${(1 - p) * 300}px) scale(${lerp(1.4, 1, p)})`, opacity: p > 0 ? 1 : 0})}>{G.name}</div>;
      }} />
      <div style={abs(796, 540, {width: 860, height: 6, background: C.ink, transformOrigin: 'left', transform: `scaleX(${k(f, L + 3, L + 12, EO)})`})} />
      {slog.length > 0 && (
        <div style={abs(796, 580, {display: 'flex', fontFamily: SERIF, fontWeight: 900, fontSize: G.sloganSize, lineHeight: 1.2, letterSpacing: 4, whiteSpace: 'nowrap'})}>
          <MaskLine p={k(f, SL, SL + 7)} style={{color: slog.length > 1 ? C.ink : C.red}}>{slog[0]}</MaskLine>
          {slog.length > 1 && <div style={{width: G.sloganSize}} />}
          {slog.length > 1 && <MaskLine p={k(f, SL + 5, SL + 12)} style={{color: C.red}}>{slog[1]}</MaskLine>}
        </div>
      )}
      {G.url && <div style={abs(800, slog.length ? urlTop : 590, {fontFamily: ANTON, fontSize: G.urlSize, color: C.ink, letterSpacing: 6, whiteSpace: 'nowrap', opacity: k(f, SL + 10, SL + 18, LIN)})}><Mixed text={G.url} /></div>}
    </>
  );
};

const render = (sc: Sc, f: number) => {
  switch (sc.kind) {
    case 'open': return <SceneOpen f={f} s={sc} />;
    case 'counts': return <SceneCounts f={f} s={sc} />;
    case 'swap': case 'bridge': return <SceneRed f={f} s={sc} />;
    case 'stat': return <SceneStat f={f} s={sc} />;
    case 'names': return <SceneNames f={f} s={sc} />;
    default: return <SceneLogo f={f} s={sc} />;
  }
};

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const cam = camera(f);
  const red = f >= RED.a && f < BOOM + 8;
  // 背景點陣：比前景早 10 格開始移動（背景先動，剪接像被帶著走）
  const gx = -(T.slides as number[]).reduce((a, h) => a + 640 * k(f, h - 10, h + 4, EI), 0);
  const boomR = 44 + 1500 * k(f, BOOM, BOOM + 7, (x) => 1 - Math.pow(1 - x, 3));
  const ri = SC.indexOf(RED);
  return (
    <AbsoluteFill style={{background: red ? C.red : C.paper, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <div style={{position: 'absolute', inset: 0, transform: `translate(${cam.x}px, ${cam.y}px) rotate(${cam.r}deg) scale(${cam.s})`}}>
        <div style={{position: 'absolute', inset: -120, backgroundImage: `radial-gradient(circle, ${C.ink}22 2.5px, transparent 3px)`, backgroundSize: '64px 64px', backgroundPosition: `${gx}px 0px`}} />
        {SC.map((sc, i) => {
          const isRed = i === ri;
          const end = isRed ? BOOM + 8 : sc.b;
          if (f < sc.a || f >= end) return null;
          if (sc.kind === 'open' && sc.out === 'dive') {
            const last = A_PTS[A_PTS.length - 1];
            return <DiveWrap key={i} f={f} dive={sc.dive as number} red={sc.b} at={last}>{render(sc, f)}</DiveWrap>;
          }
          if (isRed) return <React.Fragment key={i}>{render(sc, f)}</React.Fragment>;
          const inAt = sc.kind === 'counts' || sc.in === 'whip' ? sc.a : undefined;
          const outAt = sc.out === 'whip' || sc.outWhip ? sc.b : undefined;
          const body = <Whip f={f} inAt={inAt} outAt={outAt}>{(t) => render(sc, t)}</Whip>;
          if (i === ri + 1 && f < BOOM + 8) {
            return (
              <div key={i} style={{position: 'absolute', inset: 0, clipPath: `circle(${boomR}px at 960px 540px)`}}>
                <div style={{position: 'absolute', inset: 0, background: C.paper}} />
                {body}
              </div>
            );
          }
          return <React.Fragment key={i}>{body}</React.Fragment>;
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 全字測試圖：storyboard 用到的每一個字，上半排宋體、下半排 Anton 串接（Anton 缺的中文會退回宋體） */
export const FontTest: React.FC = () => {
  const txt = Array.from(new Set(Array.from((T.allText as string).replace(/\s/g, '')))).join('');
  return (
    <AbsoluteFill style={{background: C.paper, padding: 40, color: C.ink}}>
      <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 56, lineHeight: 1.25, wordBreak: 'break-all'}}>{txt}</div>
      <div style={{fontFamily: ANTON, fontSize: 56, lineHeight: 1.25, marginTop: 30, color: C.red, wordBreak: 'break-all'}}>{txt}</div>
    </AbsoluteFill>
  );
};
