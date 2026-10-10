/* 範本廣E「一鏡到底」——色鉛筆畫的主角從清晨家門口出發，鏡頭一路往右跟拍、不剪接：
   依 storyboard 經過 0～3 個站點（站牌搭車經過看板／招牌入口＋鐘響＋黑板／水池跳水），傍晚走進房間（門口小黑板、門牌、冷氣吊牌），
   書桌自習 → 關燈上床 → 鏡頭推進窗戶，星空裡浮出名稱、標語、網址。線條每 3 格沸騰一次、天色由早到晚、整片紙紋。
   主角、車、鏡頭、天色、事件格全部讀 timeline.json（engine/timeline.py 依內容排）；畫面上的字全部讀 storyboard。
   原作：02_試做/廣告30風格 第 13 支 Ad13.tsx（固定 60 秒）。 */
import React from 'react';
import {AbsoluteFill, Audio, interpolateColors, staticFile, useCurrentFrame} from 'remotion';
import {Defs, G, Ln, Sh, Tx, ell} from './draw';
import {BUS_W, BusBack, BusFront, Head, Kid} from './kid';
import {PAPER} from './paper';
import {GY, R, RideSt, TL, WC, WIN, ZOOM_S, cam, kid, ss, zoomP} from './track';
import {Clouds, Ground, Parallax, V, World} from './world';

const ci = (f: number, keys: [number, string][]) => interpolateColors(f, keys.map((k) => k[0]), keys.map((k) => k[1]));
const SKY = TL.sky;
const RIDES = TL.st.filter((e) => e.type === 'ride') as RideSt[];
const POOLS = TL.st.filter((e) => e.type === 'pool');
const END = TL.d.end;

/** 拍點上的鏡頭重擊：推近＋震動（整個畫面一起動，很快衰減）。拍點來自時間表（開車、鐘響、落水、關燈…） */
const punch = (f: number) => {
  let s = 0, x = 0, y = 0;
  for (const [at, ps, sx, sy] of TL.hits) {
    const d = f - at;
    if (d < 0 || d > 16) continue;
    const e = Math.exp(-d / 4);
    s += ps * e;
    x += Math.sin(d * 2.3) * sx * e;
    y += Math.sin(d * 2.9 + 1) * sy * e;
  }
  return {s, x, y};
};

const STARS = Array.from({length: 30}, (_, i) => ({x: WIN.x + 18 + ((i * 97) % 414), y: WIN.y + 16 + ((i * 53 + (i % 5) * 31) % 300), r: 1.6 + (i % 4) * 0.9, p: i * 1.7}));

export const Ad: React.FC = () => {
  const f = useCurrentFrame();
  G.f = f;
  G.b = Math.floor(f / 3);

  // ───── 鏡頭 ─────
  const zp = zoomP(f);
  const camX = f < R.zoom ? cam(f) : cam(R.zoom);
  const S = 1 + (ZOOM_S - 1) * zp;
  const Px = WC.x - camX + (960 - (WC.x - camX)) * zp;
  const Py = WC.y + (470 - WC.y) * zp;
  const worldT = `translate(${Px.toFixed(2)} ${Py.toFixed(2)}) scale(${S.toFixed(4)}) translate(${-WC.x} ${-WC.y})`;
  V.x0 = WC.x - Px / S;
  V.x1 = V.x0 + 1920 / S;
  const hit = punch(f);
  const punchT = `translate(${960 + hit.x} ${540 + hit.y}) scale(${1 + hit.s}) translate(-960 -540)`;

  // ───── 天色與光 ─────
  const tint = ci(f, SKY.tint);
  const skyT = ci(f, SKY.top);
  const skyB = ci(f, SKY.bot);
  const pane = interpolateColors(0.45, [0, 1], [skyT, skyB]);
  const night = ss((f - SKY.night[0]) / (SKY.night[1] - SKY.night[0]));
  const lampOn = f < R.lampOff;
  const sunP = Math.min(1, f / SKY.sunEnd);
  const sunX = 220 + 1365 * sunP;
  const sunY = 740 - 580 * Math.sin(Math.PI * sunP);
  const sunC = interpolateColors(sunP, [0, 0.46, 0.88, 1], ['#ffe3a0', '#fff0a0', '#ff9a5a', '#ff8a6a']);

  // ───── 主角與車 ─────
  const blink = f % 97 < 3;
  const kidAt = (ff: number, op = 1) => {
    const s = kid(ff);
    if (!s.vis || s.mode !== 'body') return null;
    return (
      <g key={'k' + ff} opacity={op} transform={`translate(${s.x.toFixed(1)} ${(GY + s.y).toFixed(1)})${s.rot ? ` rotate(${s.rot} 0 -120)` : ''}${s.flip ? ' scale(-1 1)' : ''}`}>
        <Kid pose={s.pose} ph={s.ph} bag={s.bag} blink={blink} />
      </g>
    );
  };
  const k = kid(f);
  const jumping = POOLS.some((e) => e.type === 'pool' && f >= e.jump && f < e.splash);
  const swimPool = POOLS.find((e) => e.type === 'pool' && f >= e.surface && f < e.climb);
  const buses = RIDES.map((e) => {
    const bx = e.bus.x[Math.min(f, TL.frames - 1)];
    if (bx === null || bx === undefined) return null;
    if (!(bx + BUS_W > V.x0 - 100 && bx < V.x1 + 100)) return null;
    const bv = e.bus.v[Math.min(f, TL.frames - 1)];
    return {e, bx, bv};
  }).filter((b): b is {e: RideSt; bx: number; bv: number} => b !== null);

  // 名稱浮出（世界座標，在窗玻璃上）
  const reveal = (a: number, b: number) => ss((f - a) / (b - a));
  const r1 = reveal(R.text, R.text + 36);
  const r2 = reveal(R.text + 34, R.text + 62);
  const r3 = reveal(R.text + 58, R.text + 84);
  const wy = (sy: number) => WC.y + (sy - 470) / ZOOM_S;
  const nameY = END.slogan || END.url ? 405 : 470;

  return (
    <AbsoluteFill style={{background: '#f7efe0', overflow: 'hidden'}}>
      <Audio src={staticFile('music.wav')} />
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
        <Defs />
        <defs>
          <linearGradient id="sky13" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyT} />
            <stop offset="1" stopColor={skyB} />
          </linearGradient>
          <clipPath id="win13"><rect x={WIN.x} y={WIN.y} width={WIN.w} height={WIN.h} /></clipPath>
          <clipPath id="t1"><rect x={WIN.x - 300} y={WIN.y - 200} width={(WIN.w + 600) * r1} height={WIN.h + 400} /></clipPath>
          <clipPath id="t2"><rect x={WIN.x - 300} y={WIN.y - 200} width={(WIN.w + 600) * r2} height={WIN.h + 400} /></clipPath>
          <clipPath id="t3"><rect x={WIN.x - 300} y={WIN.y - 200} width={(WIN.w + 600) * r3} height={WIN.h + 400} /></clipPath>
        </defs>
        <g transform={punchT}>
          {/* 天空（螢幕座標） */}
          <rect x={-200} y={-200} width={2320} height={1480} fill="url(#sky13)" />
          {f < SKY.sunHide ? (
            <g>
              <Sh p={ell(sunX, sunY, 62, 62, 20)} fill={sunC} ink="#e09a4a" id="sun" sw={3} hatch={0} />
              {Array.from({length: 10}, (_, i) => {
                const a = (i / 10) * Math.PI * 2 + f * 0.004;
                return <Ln key={i} p={[[sunX + Math.cos(a) * 80, sunY + Math.sin(a) * 80], [sunX + Math.cos(a) * 104, sunY + Math.sin(a) * 104]]} id={'ray' + i} ink="#f0b04a" sw={4} />;
              })}
            </g>
          ) : null}
          <Clouds cam={camX} op={1 - night} />
          <Parallax cam={camX} />

          {/* 世界 */}
          <g transform={worldT}>
            <Ground />
            <World f={f} pane={pane} lampOn={lampOn} streetLamp={f > SKY.streetLamp} />
            {/* 交通車後半（車內）、主角、車身 */}
            {buses.map(({e, bx}) => (
              <g key={'bb' + e.i} transform={`translate(${bx.toFixed(1)} ${GY + 50})`}>
                <BusBack rider={f >= e.doorClose && f < e.alight - 2} wave={f < e.go + 70 ? Math.sin(f * 0.45) : null} />
              </g>
            ))}
            {/* 速度線（車快的時候） */}
            {buses.map(({e, bx, bv}) =>
              bv > 8
                ? [0, 1, 2, 3, 4].map((i) => {
                    const y = GY + 50 - 60 - i * 58;
                    const len = Math.min(260, bv * 8) * (0.6 + 0.4 * ((i * 7) % 3) / 2);
                    return <Ln key={e.i + '-' + i} p={[[bx - 30 - len, y], [bx - 30, y]]} id={'spd' + i} ink="#6a5a4a" sw={3.6} op={0.8} />;
                  })
                : null,
            )}
            {jumping ? [6, 4, 2].map((d, i) => kidAt(f - d, [0.12, 0.2, 0.32][i])) : null}
            {kidAt(f)}
            {buses.map(({e, bx, bv}) => (
              <g key={'bf' + e.i} transform={`translate(${bx.toFixed(1)} ${GY + 50})`}>
                <BusFront door={e.bus.door[Math.min(f, TL.frames - 1)]} wheel={bx / 46} label={e.d.bus}
                  dust={Math.abs(bv) > 1 ? 1 : f >= e.busEnter && f < e.arrive + 30 ? 0.5 : 0} />
              </g>
            ))}
            {/* 游泳 */}
            {k.mode === 'swim' ? (
              <g transform={`translate(${k.x.toFixed(1)} ${GY + 4})`}>
                {(() => {
                  const a = (((f - (swimPool && swimPool.type === 'pool' ? swimPool.surface : 0)) % 18) / 18) * Math.PI * 2;
                  const hx = Math.cos(a + Math.PI) * 52;
                  const hy = -Math.sin(a) * 60;
                  return hy < 0 ? <Ln p={[[10, -30], [10 + hx * 0.5, -30 + hy * 0.6], [10 + hx, -30 + hy]]} id="sarm" ink="#ffd6b5" sw={11} /> : null;
                })()}
                <g transform="translate(0 -30) scale(0.78)"><Head id="swim" wet /></g>
                <Ln p={[[-40, 2], [-90, -6], [-140, 2]]} id="wake1" ink="#ffffff" sw={4} op={0.85} />
                <Ln p={[[-60, 10], [-120, 14]]} id="wake2" ink="#ffffff" sw={3} op={0.6} />
              </g>
            ) : null}
            {/* 睡覺 */}
            {k.mode === 'bed' ? (
              <g transform={`translate(${R.dx} 0)`}>
                <g transform="translate(15322 768) rotate(-70) scale(0.82)"><Head id="bed" sleep={f > R.inBed + 10} /></g>
                <Sh p={[[15000, 812], [15020, 772], [15120, 756], [15220, 764], [15290, 780], [15296, 812]]} fill="#ffd77a" ink="#4a3328" id="blanket" sw={2.6} />
                {[0, 1, 2].map((i) => {
                  const t = ((f - R.inBed) / 40 + i / 3) % 1;
                  const x = 15350 + t * 60 + i * 6;
                  const y = 720 - t * 120;
                  const s = 10 + i * 4;
                  return f > R.inBed + 12 && f < R.zoom + 30 ? <path key={i} d={`M${x},${y}h${s}l${-s},${s}h${s}`} fill="none" stroke="#5a6aa0" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={Math.sin(t * Math.PI)} /> : null;
                })}
              </g>
            ) : null}
          </g>

          {/* 時間的光：整片乘上天色 */}
          <rect x={-200} y={-200} width={2320} height={1480} fill={tint} style={{mixBlendMode: 'multiply'}} />

          {/* 不被天色壓暗的光：檯燈、房間燈、月光、星星、窗上的字 */}
          <g transform={worldT}>
            {night > 0 && lampOn ? (
              <g style={{mixBlendMode: 'screen'}}>
                <ellipse cx={14700 + R.dx} cy={420} rx={900} ry={520} fill="url(#glow13)" opacity={0.28 * night} />
                <ellipse cx={14790 + R.dx} cy={740} rx={430} ry={330} fill="url(#glow13)" opacity={Math.min(1, 1.1 * night)} />
              </g>
            ) : null}
            {!lampOn ? (
              <g style={{mixBlendMode: 'screen'}}>
                <path d={`M${WIN.x},${WIN.y + WIN.h}L${WIN.x + WIN.w},${WIN.y + WIN.h}L${WIN.x + WIN.w - 160},${GY + 120}L${WIN.x - 420},${GY + 120}Z`} fill="url(#beam13)" opacity={0.75} />
              </g>
            ) : null}
            {night > 0 ? (
              <g clipPath="url(#win13)" opacity={night}>
                {STARS.map((s, i) => {
                  const tw = 0.55 + 0.45 * Math.sin(f * 0.09 + s.p);
                  return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff8dc" opacity={tw} />;
                })}
                <path d={`M${WIN.x + 404},234A40,40 0 1 1 ${WIN.x + 404},314A31,40 0 1 0 ${WIN.x + 404},234Z`} fill="#fff4c8" stroke="#e8d08a" strokeWidth={1.5} />
                {f >= R.zoom && f < R.zoom + 40 ? (
                  (() => {
                    const t = (f - R.zoom) / 40;
                    const x = WIN.x + 60 + t * 260;
                    const y = WIN.y + 40 + t * 90;
                    return <line x1={x - 50} y1={y - 18} x2={x} y2={y} stroke="#fffbe6" strokeWidth={2.4} strokeLinecap="round" opacity={Math.sin(t * Math.PI)} />;
                  })()
                ) : null}
              </g>
            ) : null}
            {f >= R.text ? (
              <g>
                <ellipse cx={WC.x} cy={wy(520)} rx={210} ry={100} fill="url(#txglow13)" />
                <g clipPath="url(#t1)">
                  <Tx x={WC.x} y={wy(nameY + 3)} s={150 / ZOOM_S} c="#ffe08a" op={0.35} ls={2}>{END.name}</Tx>
                  <Tx x={WC.x} y={wy(nameY)} s={150 / ZOOM_S} c="#fff4d2" ls={2}>{END.name}</Tx>
                </g>
                {END.slogan ? (
                  <g clipPath="url(#t2)">
                    <Tx x={WC.x} y={wy(548)} s={74 / ZOOM_S} c="#fff4d2">{END.slogan}</Tx>
                  </g>
                ) : null}
                {END.url ? (
                  <g clipPath="url(#t3)">
                    <Tx x={WC.x} y={wy(END.slogan ? 640 : 560)} s={46 / ZOOM_S} c="#cfe0ff" w={400}>{END.url}</Tx>
                  </g>
                ) : null}
                {END.slogan ? <Ln p={[[WC.x - 150, wy(580)], [WC.x - 150 + 300 * r2, wy(580)]]} id="uline" ink="#ffd97a" sw={1.4} op={0.8 * r2} /> : null}
              </g>
            ) : null}
          </g>
        </g>
      </svg>
      {/* 畫紙紋理（靜態，乘在整個畫面上） */}
      <AbsoluteFill style={{backgroundImage: `url(${PAPER})`, backgroundSize: '512px 512px', mixBlendMode: 'multiply', pointerEvents: 'none'}} />
    </AbsoluteFill>
  );
};
