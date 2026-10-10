/* 範本廣I「點線面」：一個點（主角）在製圖紙上一路升維——
   0D 點 → 1D 線（勾出物件線稿，紅）→ 2D 面（拼成色面，藍）→ 3D 體（摺成方塊、印出物件，黃）
   → 4D 時間（全景跟拍子跳，點長成鏡頭、鑽進去看片中片）→ 全部收回成一個點，落在名稱後當句點。整支一鏡到底。
   時間、鏡頭、主角路徑、物件、字全部讀 timeline.json（timeline.py 依 storyboard 算好）。 */
import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {easeOutBack, EI, k, lerp, LIN, pulse, rnd} from './kit';
import {BF, C, Cam, cam, camT, D, DimLine, Dim, hero, MK, punch, SG, T, textW, WText} from './lib';
import {LineObj, Phase0, PlaneObj, SolidObj} from './Objects';
import {Film} from './Film';

const TX = T.TX, LY = T.LY, sW = T.sWide;
const film = D.film;
const H = T.head;

/* ───── 收回：整組往那個點縮進去 ───── */
const collapse = (f: number, t0: number) => k(f, t0, t0 + 14, EI);
const colT = (p: number, cx: number, cy: number) =>
  `translate(${lerp(cx, TX, p)} ${lerp(cy, LY, p)}) scale(${1 - p}) translate(${-cx} ${-cy})`;

/* ───── 動起來時滿場的幾何積木 ───── */
const wideW = film && film.wide ? textW(film.wide, film.wideSize / sW, 6 / sW) : 0;
const sideOff = Math.max(1150, wideW / 2 + 200);
const BLOCKS = Array.from({length: 26}, (_, i) => {
  const low = i % 2 === 0;
  const side = i % 4 < 2 ? -1 : 1;
  return {
    x: low ? TX + rnd(`bx${i}`) * 2400 : TX + side * (sideOff + Math.abs(rnd(`bx${i}`)) * 1250),
    y: low ? 140 + Math.abs(rnd(`by${i}`)) * 340 : -330 + (150 + Math.abs(rnd(`by${i}`)) * 160 - 540) / sW,
    kind: i % 4,
    r: 55 + 45 * Math.abs(rnd(`br${i}`)),
    ph: Math.abs(rnd(`bp${i}`)) * 4,
  };
});
const Blocks: React.FC<{f: number}> = ({f}) => {
  const on = k(f, MK.hit, MK.hit + 12, easeOutBack);
  if (on <= 0) return null;
  const beat = (f - MK.hit) / BF;
  return (
    <g>
      {BLOCKS.map((b, i) => {
        const hopY = -40 * Math.abs(Math.sin((beat + b.ph) * Math.PI / 2));
        const rot = beat * 45 * (i % 2 ? 1 : -1);
        const col = [C.red, C.blue, C.yellow, C.ink][b.kind];
        const shape =
          b.kind === 0 ? <circle r={b.r} fill={col} /> :
          b.kind === 1 ? <rect x={-b.r} y={-b.r} width={b.r * 2} height={b.r * 2} fill={col} /> :
          b.kind === 2 ? <path d={`M${-b.r},${b.r * 0.8}L${b.r},${b.r * 0.8}L0,${-b.r}Z`} fill={col} /> :
          <rect x={-b.r * 1.4} y={-12} width={b.r * 2.8} height={24} fill={col} />;
        return <g key={i} transform={`translate(${b.x} ${b.y + hopY}) scale(${on}) rotate(${rot})`}>{shape}</g>;
      })}
    </g>
  );
};

/* ───── 製圖紙格線（背景比前景早 4 格動） ───── */
const Grid: React.FC<{c: Cam}> = ({c}) => {
  const minor = 40 * c.s, major = 200 * c.s;
  const ox = (960 - c.x * c.s) % major, oy = (540 - c.y * c.s) % major;
  const mo = Math.min(1, Math.max(0, (minor - 10) / 14));
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <defs>
        <pattern id="gA" width={minor} height={minor} patternUnits="userSpaceOnUse" x={(960 - c.x * c.s) % minor} y={(540 - c.y * c.s) % minor}>
          <path d={`M${minor},0L0,0L0,${minor}`} fill="none" stroke={C.grid} strokeWidth={1} opacity={0.6 * mo} />
        </pattern>
        <pattern id="gB" width={major} height={major} patternUnits="userSpaceOnUse" x={ox} y={oy}>
          <path d={`M${major},0L0,0L0,${major}`} fill="none" stroke={C.grid} strokeWidth={1.6} />
        </pattern>
      </defs>
      <rect width={1920} height={1080} fill="url(#gA)" />
      <rect width={1920} height={1080} fill="url(#gB)" />
    </svg>
  );
};

/* ───── 圖紙外框、標題、維度指示（畫面座標，靜止） ───── */
const DIMS = ['0D', '1D', '2D', '3D', '4D'];
const DCOL = [C.ink, C.red, C.blue, C.yellow, C.red];
const Hud: React.FC<{f: number}> = ({f}) => {
  const s = T.secs;
  let idx = 0;
  for (const b of [s.line, s.plane, s.solid, s.motion]) idx += k(f, b - 8, b + 6);
  idx -= 4 * k(f, MK.collapse, MK.logo - 4);
  const ci = Math.round(idx);
  const mx = 1430 + idx * 96;
  const op = 1 - k(f, MK.logo, MK.logo + 20);
  const tw = D.title ? textW(D.title, 34) + 28 : 0;
  const nm = D.end.name;
  const bw = textW(nm, 34, 2) + 56;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <rect x={28} y={28} width={1864} height={1024} fill="none" stroke={C.ink} strokeWidth={2} />
      <g opacity={op}>
        {D.title && (
          <g>
            <rect x={50} y={50} width={tw} height={66} fill={C.paper} />
            <WText id="hudT" x={64} y={96} size={34} text={D.title} p={1} weight={300} />
          </g>
        )}
        <rect x={1386} y={48} width={488} height={92} fill={C.paper} />
        <line x1={1430} x2={1814} y1={118} y2={118} stroke={C.ink} strokeWidth={1.5} />
        {DIMS.map((d, i) => (
          <g key={d}>
            <line x1={1430 + i * 96} x2={1430 + i * 96} y1={110} y2={126} stroke={C.ink} strokeWidth={1.5} />
            <text x={1430 + i * 96} y={96} fontSize={34} fontFamily={SG} fontWeight={i === ci ? 400 : 300} fill={i === ci ? DCOL[i] : C.mute} textAnchor="middle">{d}</text>
          </g>
        ))}
        <circle cx={mx} cy={118} r={9} fill={DCOL[Math.max(0, Math.min(4, ci))]} />
      </g>
      <rect x={1892 - bw} y={986} width={bw} height={66} fill={C.paper} stroke={C.ink} strokeWidth={2} />
      <WText id="hudN" x={1892 - bw / 2} y={1031} size={34} text={nm} p={1} weight={300} anchor="middle" ls={2} />
      <g stroke={C.ink} strokeWidth={1.5}>
        <line x1={64} x2={304} y1={1024} y2={1024} />
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={64 + i * 60} x2={64 + i * 60} y1={1014} y2={1034} />)}
      </g>
      <text x={320} y={1036} fontSize={34} fontFamily={SG} fontWeight={300} fill={C.ink}>1 : 1</text>
    </svg>
  );
};

/* ───── 結尾：名稱寫出來，點落在名稱後當句點 ───── */
const Logo: React.FC<{f: number}> = ({f}) => {
  const E = D.end;
  const L0 = MK.logo, land = MK.land;
  const size = E.nameSize, ls = 20;
  const w = textW(E.name, size, ls);
  const x0 = 960 - w / 2 - 34;
  const np = k(f, MK.nameAt, MK.nameAt + MK.nameDur, LIN);
  const front = x0 + w * np;
  const PER: [number, number] = [x0 + w + 4, 568];
  let dx = 960, dy = lerp(540, 575, k(f, L0, L0 + 12));
  dx = Math.max(dx, front + 40);
  if (f >= land - 14) {
    const u = k(f, land - 14, land, LIN);
    const e = u * u * (3 - 2 * u);
    const a: [number, number] = [Math.max(960, x0 + w + 40), 575];
    dx = lerp(a[0], PER[0], e); dy = lerp(a[1], PER[1], e) - 130 * Math.sin(Math.PI * u);
  }
  let r = lerp(14 * sW * 1.6, 22, k(f, L0 - 15, L0));
  const sq = (f >= land && f < land + 9 ? Math.sin(((f - land) / 9) * Math.PI) * 0.3 : 0) + (f >= MK.last ? 0.35 * Math.exp(-(f - MK.last) / 5) : 0);
  if (f > land) r += 4 * pulse(f - land, BF, 0.3) * (f < MK.last - 10 ? 1 : 0);
  const ring = f >= L0 ? k(f, L0, L0 + 20) : 0;
  const pz = punch(f);
  const [tSub, tSl, tUrl] = E.texts;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <g transform={pz.t}>
        {ring > 0 && ring < 1 && <circle cx={960} cy={540} r={30 + 500 * ring} fill="none" stroke={C.ink} strokeWidth={3} opacity={1 - ring} />}
        <WText id="lg1" x={x0} y={575} size={size} text={E.name} p={np} weight={100} ls={ls} pen={C.ink} />
        <circle cx={PER[0]} cy={PER[1]} r={64} fill="none" stroke={C.mute} strokeWidth={1.5} strokeDasharray="4 6" opacity={k(f, land, land + 12)} />
        <WText id="lg2" x={PER[0] + 40} y={PER[1] - 80} size={36} text="P (0, 0)" p={k(f, MK.plabel, MK.plabel + 14, LIN)} family={SG} fill={C.mute} />
        <DimLine x1={x0} y1={630} x2={x0 + w + 30} y2={630} p={k(f, MK.dimLine, MK.dimLine + 16)} />
        {tSub !== null && <WText id="lg3" x={960} y={712} size={E.subSize} text={E.sub} p={k(f, tSub, tSub + 24, LIN)} weight={300} anchor="middle" fill={C.red} ls={4} />}
        {tSl !== null && <WText id="lg4" x={960} y={806} size={E.sloganSize} text={E.slogan} p={k(f, tSl, tSl + 26, LIN)} weight={300} anchor="middle" ls={12} />}
        {tUrl !== null && <WText id="lg5" x={960} y={878} size={E.urlSize} text={E.url} p={k(f, tUrl, tUrl + 22, LIN)} family={SG} anchor="middle" ls={3} fill={C.ink} />}
        <g transform={`translate(${dx} ${dy}) scale(${1 + sq} ${1 - sq})`}>
          <circle r={r} fill={C.ink} />
        </g>
      </g>
    </svg>
  );
};

/* ───── 鏡頭：點長成的鏡頭，裡面是片中片 ───── */
const Lens: React.FC<{f: number}> = ({f}) => {
  const grow = easeOutBack(k(f, MK.lens0, MK.lens1, LIN));
  const r = f < MK.lensBack ? lerp(14, T.lensR, grow) : lerp(T.lensR, 14, k(f, MK.lensBack, MK.collapse));
  const q = 1 / T.sDive;
  const blades = Math.max(1 - k(f, MK.dive, MK.dive + 10), k(f, MK.lensBack - 12, MK.lensBack));
  const sw = 5 / sW;
  return (
    <g>
      <circle cx={TX} cy={LY} r={r} fill={C.soft} />
      <clipPath id="lensClip"><circle cx={TX} cy={LY} r={r * 0.96} /></clipPath>
      <g clipPath="url(#lensClip)">
        <g transform={`translate(${TX - 960 * q} ${LY - 540 * q}) scale(${q})`}>
          <Film f={f} />
        </g>
      </g>
      {blades > 0 && (
        <g transform={`rotate(${(f - MK.lens0) * 4} ${TX} ${LY})`} opacity={blades}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return <line key={i} x1={TX + Math.cos(a) * r * 0.96} y1={LY + Math.sin(a) * r * 0.96} x2={TX + Math.cos(a + 1.3) * r * 0.42} y2={LY + Math.sin(a + 1.3) * r * 0.42} stroke={C.ink} strokeWidth={sw * 0.6} />;
          })}
        </g>
      )}
      <circle cx={TX} cy={LY} r={r} fill="none" stroke={C.ink} strokeWidth={sw} />
      <circle cx={TX} cy={LY} r={r * 1.12} fill="none" stroke={C.red} strokeWidth={sw * 0.5} strokeDasharray={`${sw * 2} ${sw * 2}`} opacity={grow * (1 - k(f, MK.dive, MK.dive + 8))} />
    </g>
  );
};

const DimGroup: React.FC<{d: Dim; f: number; motion: number; labelsOp: number}> = ({d, f, motion, labelsOp}) =>
  d.n === 1 ? <LineObj d={d} f={f} motion={motion} labelsOp={labelsOp} /> :
  d.n === 2 ? <PlaneObj d={d} f={f} motion={motion} labelsOp={labelsOp} /> :
  <SolidObj d={d} f={f} motion={motion} labelsOp={labelsOp} />;

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  const c = cam(f);
  const cg = cam(f + 4);
  const pz = punch(f);
  const motion = k(f, MK.hit - 2, MK.hit + 4);
  const labelsOp = 1 - k(f, MK.labelsOff, MK.labelsOff + 18);
  const Hh = hero(f);
  const worldOn = f < MK.logo + 2;
  const C0 = MK.collapse;
  const colOf3 = {3: collapse(f, C0), 2: collapse(f, C0 + 5), 1: collapse(f, C0 + 10)} as Record<number, number>;
  const cL = collapse(f, C0 + 15);
  const xs = T.xs;
  const dragEnd = (T.segs.find((s) => s.k === 'drag')?.t1 ?? H.drag + 22);
  const groundEnd = f < dragEnd ? Math.max(0, Hh.x) : lerp(xs[0] - 500, xs[xs.length - 1] + 1100, k(f, dragEnd, MK.hit - 20, LIN));
  const lensOn = !!film && f >= MK.lens0 && f < C0;
  const bob = (i: number) => motion * -30 * Math.abs(Math.sin(((f - MK.hit) / BF + i * 0.5) * Math.PI / 2));
  const wideOp = film ? k(f, MK.wide, MK.wide + 6) * (1 - k(f, MK.lens0 + 8, MK.lens0 + 20)) : k(f, MK.wide, MK.wide + 6) * (1 - k(f, C0 - 6, C0));
  const wideY = -330 + (215 - 540) / sW;
  return (
    <AbsoluteFill style={{background: C.paper, overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <Grid c={cg} />
      {worldOn && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <g transform={pz.t}>
            <g transform={camT(c)}>
              <Phase0 f={f} />
              {f >= H.drag && (
                <g transform={colT(cL, (xs[0] + xs[xs.length - 1]) / 2, 0)}>
                  <line x1={0} x2={groundEnd} y1={0} y2={0} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
                  {motion > 0 && Array.from({length: 44}, (_, i) => {
                    const x = (i * 180 + (f - MK.hit) * 24) % 7900;
                    return <rect key={i} x={x} y={-6} width={90} height={12} fill={[C.red, C.blue, C.yellow, C.ink][i % 4]} opacity={motion} />;
                  })}
                </g>
              )}
              {D.dims.map((d, i) => f >= d.start - 10 && (
                <g key={d.n} transform={`${colT(colOf3[d.n], d.X, -300)} translate(0 ${d.n === 1 ? bob(i) : 0})`}>
                  <DimGroup d={d} f={f} motion={motion} labelsOp={labelsOp} />
                </g>
              ))}
              {f >= MK.hit - 5 && (
                <g transform={colT(colOf3[3], TX, -330)}>
                  <Blocks f={f} />
                </g>
              )}
              {film && film.wide && wideOp > 0 && (
                <g opacity={wideOp}>
                  <WText id="w1" x={TX} y={wideY} size={film.wideSize / sW} text={film.wide} p={k(f, MK.wide, MK.wide + 26, LIN)} weight={100} anchor="middle" ls={6 / sW} />
                </g>
              )}
              {lensOn && <Lens f={f} />}
              {f >= H.pop && f < MK.logo - 15 && !lensOn && [4, 3, 2, 1, 0].map((g) => {
                const h = g === 0 ? Hh : hero(f - g * 0.8);
                if (g > 0 && Math.hypot(h.x - Hh.x, h.y - Hh.y) < 10) return null;
                const r = 14 * h.sc;
                return (
                  <g key={g} opacity={g === 0 ? 1 : 0.3 / g} transform={`translate(${h.x} ${h.y}) scale(${h.sx} ${h.sy})`}>
                    <circle cx={0} cy={0} r={r} fill={C.ink} />
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      )}
      {f >= MK.logo - 15 && <Logo f={f} />}
      <Hud f={f} />
    </AbsoluteFill>
  );
};
