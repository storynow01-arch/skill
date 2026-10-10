/* 一整條連續的世界（世界座標，x 從家門口一路往右到最後房間的窗邊）。每個物件依鏡頭範圍裁掉看不到的。
   站點依 timeline.json 的 st 排列：ride（站牌＋田野小鎮＋看板）、building（招牌入口＋室內黑板）、pool（水池跳水），
   最後固定是傍晚的房間。building／pool／room 照原作座標畫，再整組平移到這一站的位置（dx）。
   原作：02_試做/廣告30風格 第 13 支 ad13/world.tsx；牌子上的字全部改讀 storyboard。 */
import React from 'react';
import {random} from 'remotion';
import {Ln, Pt, Sh, Tx, ell, rect, rrect} from './draw';
import {Kid} from './kid';
import {BuildingSt, GY, PoolSt, R, RideSt, TL, seg} from './track';

export const V = {x0: 0, x1: 1920}; // 目前看得到的世界範圍（Ad.tsx 每格設定）
const vis = (a: number, b: number) => b > V.x0 - 60 && a < V.x1 + 60;
const vd = (dx: number) => (a: number, b: number) => vis(a + dx, b + dx);
const r01 = (s: string) => random(s);
const INK = '#4a3328';

/* ───── 地面（各站的地面種類由時間表給） ───── */
export const Ground: React.FC = () => (
  <g>
    {TL.ground.filter(([a, b]) => vis(a, b)).map(([a0, b0, t]) => {
      const a = Math.max(a0, V.x0 - 200);
      const b = Math.min(b0, V.x1 + 200);
      const key = t + a0;
      if (t === 'road') {
        const dashes = [];
        for (let x = Math.floor(a / 160) * 160; x < b; x += 160) dashes.push(<rect key={x} x={x} y={958} width={80} height={7} fill="#fbf6e6" opacity={0.9} />);
        return (
          <g key={key}>
            <Sh p={rect(a, GY, b - a, 26)} fill="#e6dbc8" ink={INK} id={'sw' + a0} sw={2.4} amp={1} />
            <Sh p={rect(a, GY + 26, b - a, 70)} fill="#9c9ba4" ink={INK} id={'rd' + a0} sw={2.4} hatch={2} amp={1} />
            {dashes}
            <Sh p={rect(a, GY + 96, b - a, 100)} fill="#9fcf6a" ink={null} id={'vg' + a0} />
          </g>
        );
      }
      const col = {yard: '#ead6a4', deck: '#d9ecf0', path: '#dccbab', wood: '#c99868'}[t] as string;
      const lines = [];
      if (t === 'deck' || t === 'wood') {
        const step = t === 'deck' ? 70 : 150;
        for (let x = Math.ceil(a / step) * step; x < b; x += step) lines.push(<line key={x} x1={x} y1={GY + 4} x2={x} y2={1080} stroke={t === 'deck' ? '#a9c6cf' : '#9c6c44'} strokeWidth={2} opacity={0.7} />);
        if (t === 'wood') [960, 1020].forEach((y) => lines.push(<line key={'h' + y} x1={a} y1={y} x2={b} y2={y} stroke="#9c6c44" strokeWidth={2} opacity={0.6} />));
      }
      if (t === 'yard') {
        for (let x = Math.ceil(a / 90) * 90; x < b; x += 90)
          lines.push(<path key={x} d={`M${x},${GY + 30 + (x % 7) * 6}l6,-14l5,12l6,-16l4,16`} fill="none" stroke="#c9a86b" strokeWidth={2.4} strokeLinecap="round" />);
      }
      return (
        <g key={key}>
          <Sh p={rect(a, GY, b - a, 190)} fill={col} ink={INK} id={'gr' + a0} sw={2.4} amp={1} hatch={t === 'wood' ? 2 : 1} />
          {lines}
        </g>
      );
    })}
  </g>
);

/* ───── 遠山、近丘、雲（視差，螢幕座標） ───── */
const ridge = (seed: string, w: number, base: number, hMin: number, hMax: number, n: number): string => {
  const pts: string[] = [`M0,${base}`];
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    const y = base - (hMin + (hMax - hMin) * (0.5 + 0.5 * Math.sin(i * 0.9 + r01(seed + i) * 2)) * (0.6 + 0.4 * r01(seed + 'b' + i)));
    pts.push(`L${x.toFixed(0)},${y.toFixed(0)}`);
  }
  pts.push(`L${w},${base}Z`);
  return pts.join('');
};
const MTN = ridge('m', 3000, 900, 160, 330, 26);
const HIL = ridge('h', 2600, 900, 70, 170, 20);
export const Parallax: React.FC<{cam: number}> = ({cam}) => {
  const m = -((cam * 0.12) % 3000);
  const h = -((cam * 0.3) % 2600);
  return (
    <g>
      {[0, 1].map((i) => (
        <g key={'m' + i} transform={`translate(${m + i * 3000} 0)`}>
          <path d={MTN} fill="#a9bed8" stroke="#7d8fab" strokeWidth={2.5} />
          <path d={MTN} fill="url(#h13)" />
        </g>
      ))}
      {[0, 1].map((i) => (
        <g key={'h' + i} transform={`translate(${h + i * 2600} 0)`}>
          <path d={HIL} fill="#bcdba0" stroke="#86a96a" strokeWidth={2.5} />
          <path d={HIL} fill="url(#h13)" />
        </g>
      ))}
    </g>
  );
};
export const Clouds: React.FC<{cam: number; op: number}> = ({cam, op}) => (
  <g opacity={op}>
    {[0, 1, 2, 3, 4].map((i) => {
      const x = ((i * 700 + 200 - cam * 0.07) % 3500 + 3500) % 3500 - 300;
      const y = 120 + (i % 3) * 70;
      return (
        <g key={i} transform={`translate(${x} ${y})`}>
          <Sh p={[...ell(0, 0, 90, 34, 16)]} fill="#ffffff" ink="#a9b4c4" id={'cl' + i} sw={2.2} hatch={0} />
          <Sh p={ell(-40, -18, 44, 32, 14)} fill="#ffffff" ink="#a9b4c4" id={'cl2' + i} sw={2.2} hatch={0} />
          <Sh p={ell(30, -26, 52, 38, 14)} fill="#ffffff" ink="#a9b4c4" id={'cl3' + i} sw={2.2} hatch={0} />
        </g>
      );
    })}
  </g>
);

/* ───── 清晨：家門口 ───── */
const Home: React.FC<{f: number}> = ({f}) => {
  if (!vis(-200, 1320)) return null;
  const door = seg(f, [[TL.marks.doorOpen, 0], [TL.marks.doorOpen + 10, 1, 'o']]);
  const birds = [0, 1, 2].map((i) => {
    const x = 300 + i * 90 + f * 3.2;
    const y = 220 + i * 26 + Math.sin(f * 0.05 + i) * 10;
    const up = Math.floor(f / 4 + i) % 2 === 0;
    return <Ln key={i} p={[[x - 16, y + (up ? -8 : 6)], [x, y], [x + 16, y + (up ? -8 : 6)]]} id={'bird' + i} ink="#4a4a5a" sw={3} />;
  });
  return (
    <g>
      {birds}
      <Sh p={rect(780, 390, 50, 100)} fill="#b0533c" ink={INK} id="chim" />
      <Sh p={rect(200, 480, 700, 420)} fill="#f6d8a4" ink={INK} id="house" />
      <Sh p={[[160, 492], [550, 250], [940, 492]]} fill="#d9634a" ink={INK} id="roof" hatch={2} />
      <Sh p={rect(290, 560, 180, 140)} fill="#cdeaf6" ink={INK} id="hwin" hatch={0} />
      <Ln p={[[380, 560], [380, 700]]} id="hwm" ink={INK} sw={3} />
      <Ln p={[[290, 630], [470, 630]]} id="hwh" ink={INK} sw={3} />
      <Sh p={[[290, 560], [330, 560], [314, 700], [290, 700]]} fill="#f3a3b8" ink={INK} id="cur1" sw={2} />
      <Sh p={[[470, 560], [430, 560], [446, 700], [470, 700]]} fill="#f3a3b8" ink={INK} id="cur2" sw={2} />
      <Sh p={rect(270, 700, 220, 20)} fill="#e88d5a" ink={INK} id="sill" sw={2} />
      {[300, 350, 400, 450].map((x, i) => <Sh key={x} p={ell(x + 10, 690, 16, 14, 10)} fill={['#f26b6b', '#ffd04a', '#f59ac0', '#ffffff'][i]} ink={INK} id={'fl' + i} sw={2} hatch={0} />)}
      <Sh p={rect(590, 670, 120, 230)} fill="#5a3a2a" ink={INK} id="doorhole" hatch={0} />
      <Sh p={rect(590, 670, 120 * (1 - 0.82 * door), 230)} fill="#b8673f" ink={INK} id="doorp" hatch={2} />
      <circle cx={590 + 120 * (1 - 0.82 * door) - 16} cy={790} r={6} fill="#ffd04a" stroke={INK} strokeWidth={2} />
      <Sh p={rect(570, 890, 160, 14)} fill="#c9b79a" ink={INK} id="step" sw={2} />
      <Ln p={[[1000, 900], [1000, 760]]} id="mbp" ink="#6b4a32" sw={8} />
      <Sh p={rrect(960, 710, 84, 56, 14)} fill="#4f8fd0" ink={INK} id="mb" />
      <Ln p={[[1180, 900], [1180, 640]]} id="trunk" ink="#7a5232" sw={18} />
      <Sh p={ell(1180, 560, 130, 110, 22)} fill="#7fc25a" ink="#3f6e2e" id="crown" />
      <Sh p={ell(1120, 610, 70, 60, 16)} fill="#94d06a" ink="#3f6e2e" id="crown2" />
    </g>
  );
};

/* ───── 站牌（ride 站的起點；原作座標 O=1000） ───── */
const BusGlyph: React.FC = () => (
  <g>
    <Sh p={rrect(1536, 428, 88, 52, 10)} fill="#2f6fb5" ink="#24508a" id="glyph" sw={2.4} hatch={0} />
    <rect x={1546} y={436} width={30} height={18} fill="#fffdf4" />
    <rect x={1584} y={436} width={30} height={18} fill="#fffdf4" />
    <circle cx={1556} cy={484} r={8} fill="#24508a" />
    <circle cx={1604} cy={484} r={8} fill="#24508a" />
  </g>
);
const Stop: React.FC<{e: RideSt}> = ({e}) => {
  const dx = e.O - 1000;
  if (!vd(dx)(1420, 1900)) return null;
  const d = e.d;
  return (
    <g transform={`translate(${dx} 0)`}>
      <Ln p={[[1580, 900], [1580, 520]]} id={'pole' + e.i} ink="#5d6470" sw={10} />
      <Sh p={ell(1580, 460, 96, 96, 26)} fill="#2f6fb5" ink={INK} id={'stopc' + e.i} sw={3} hatch={0} />
      <Sh p={ell(1580, 460, 78, 78, 24)} fill="#fffdf4" ink={null} id={'stopi' + e.i} />
      {d.stop ? <Tx x={1580} y={478} s={50} c="#24508a">{d.stop}</Tx> : <BusGlyph />}
      {d.board ? (
        <g>
          <Sh p={rect(1440, 570, 280, 64)} fill="#fffdf4" ink={INK} id={'stopb' + e.i} sw={2.8} />
          <Tx x={1580} y={616} s={38} c="#2d3a6b">{d.board}</Tx>
        </g>
      ) : null}
      {d.note ? (
        <g transform="rotate(3 1726 690)">
          <Sh p={rect(1576, 650, 300, 76)} fill="#fff19a" ink={INK} id={'note' + e.i} sw={2.4} />
          <Sh p={rect(1562, 640, 40, 18)} fill="#e9e1c8" ink={null} id={'tape' + e.i} op={0.85} />
          <Tx x={1726} y={702} s={36} c="#b03a2a">{d.note}</Tx>
        </g>
      ) : null}
    </g>
  );
};

/* ───── 鄉間：稻田、樹、電線桿、小鎮、看板（長度跟著這一站的車程） ───── */
const Country: React.FC<{e: RideSt}> = ({e}) => {
  const [a, b] = e.country;
  if (!vis(a - 100, b + 100)) return null;
  const bb = e.billboard;
  const T1: [number, number] = [a + 120, a + 120 + 800];
  const T2: [number, number] = [bb + 520, Math.min(b, bb + 520 + 800)];
  const towns = [T1, T2].filter(([x0, x1]) => x1 - x0 >= 400 && !(x1 > bb - 440 && x0 < bb + 440));
  const free = (x0: number, x1: number) => !towns.some(([p, q]) => x1 > p - 60 && x0 < q + 60) && !(x1 > bb - 400 && x0 < bb + 400);
  const fields = [];
  for (let x = a + 100; x + 560 < b; x += 620) {
    if (!vis(x, x + 560) || !free(x, x + 560)) continue;
    fields.push(
      <g key={x}>
        <Sh p={rect(x, 790, 560, 110)} fill="#9fd26b" ink="#5f8f3a" id={'fd' + x} sw={2.2} />
        {[812, 836, 860, 884].map((y) => <Ln key={y} p={[[x + 16, y], [x + 544, y]]} id={'fr' + x + y} ink="#6aa443" sw={2.4} op={0.8} />)}
      </g>,
    );
  }
  const poles = Array.from({length: Math.max(0, Math.floor((b - a) / 560))}, (_, i) => a + 200 + i * 560).filter((x) => x < b - 100);
  const palms = Array.from({length: Math.floor((b - a) / 270)}, (_, i) => a + 300 + i * 270 + r01('pa' + e.i + i) * 140).filter((x) => x < b - 80 && free(x - 60, x + 60));
  return (
    <g>
      {fields}
      {poles.filter((x) => vis(x - 560, x + 600)).map((x, i) => (
        <g key={x}>
          <Ln p={[[x, 900], [x, 480]]} id={'pl' + x} ink="#6b5a4a" sw={9} />
          <Ln p={[[x - 40, 500], [x + 40, 500]]} id={'pc' + x} ink="#6b5a4a" sw={6} />
          {i < poles.length - 1 ? <path d={`M${x - 36},502Q${x + 244},560 ${x + 524},502`} fill="none" stroke="#5b5b66" strokeWidth={2} /> : null}
          {i < poles.length - 1 ? <path d={`M${x + 36},502Q${x + 316},556 ${x + 596},502`} fill="none" stroke="#5b5b66" strokeWidth={2} /> : null}
        </g>
      ))}
      {palms.filter((x) => vis(x - 80, x + 80)).map((x) => {
        const h = 330 + r01('ph' + x) * 90;
        return (
          <g key={x}>
            <Ln p={[[x, 900], [x + 6, 900 - h / 2], [x + 2, 900 - h]]} id={'pt' + x} ink="#8a6a46" sw={9} />
            {[-70, -30, 10, 50, 90, 140].map((an, j) => {
              const ar = (an - 90) * (Math.PI / 180);
              return <Ln key={j} p={[[x + 2, 900 - h], [x + 2 + Math.cos(ar) * 50, 900 - h + Math.sin(ar) * 30 - 10], [x + 2 + Math.cos(ar) * 88, 900 - h + Math.sin(ar) * 22 + 22]]} id={'pf' + x + j} ink="#4f9a3c" sw={7} />;
            })}
          </g>
        );
      })}
      {towns.map(([ta, tb], t) =>
        vis(ta, tb)
          ? Array.from({length: Math.floor((tb - ta) / 200)}, (_, i) => {
              const x = ta + i * 200;
              const h = 260 + (i % 3) * 50;
              const c = ['#f2c6a0', '#cfe0f0', '#f7e1a0', '#e8c2d2'][(i + t) % 4];
              const aw = ['#e05c4a', '#4c8fd0', '#55a86a', '#f0a23a'][(i + t * 2) % 4];
              const id = 'tw' + e.i + t + i;
              return (
                <g key={x}>
                  <Sh p={rect(x, 900 - h, 190, h)} fill={c} ink={INK} id={id} />
                  <Sh p={[[x - 6, 760], [x + 196, 760], [x + 180, 800], [x + 10, 800]]} fill={aw} ink={INK} id={id + 'a'} sw={2.4} />
                  <Sh p={rect(x + 30, 920 - h, 56, 60)} fill="#cdeaf6" ink={INK} id={id + 'w'} sw={2.2} hatch={0} />
                  <Sh p={rect(x + 110, 920 - h, 56, 60)} fill="#cdeaf6" ink={INK} id={id + 'v'} sw={2.2} hatch={0} />
                  <Sh p={rect(x + 60, 820, 70, 80)} fill="#7a5a44" ink={INK} id={id + 'd'} sw={2.2} />
                </g>
              );
            })
          : null,
      )}
      {/* 看板：大字＋小字（讀 storyboard） */}
      {vis(bb - 400, bb + 400) ? (
        <g>
          <Ln p={[[bb - 200, 900], [bb - 200, 640]]} id={'bbl' + e.i} ink="#6b5a4a" sw={14} />
          <Ln p={[[bb + 200, 900], [bb + 200, 640]]} id={'bbr' + e.i} ink="#6b5a4a" sw={14} />
          <Sh p={rect(bb - 370, 330, 740, 316)} fill="#fffaf0" ink={INK} id={'bb' + e.i} sw={3.4} />
          <Sh p={rect(bb - 348, 352, 696, 272)} ink="#e0503a" id={'bbi' + e.i} sw={5} />
          <Tx x={bb} y={e.d.small ? 520 : 540} s={132} c="#d8432f">{e.d.big}</Tx>
          {e.d.small ? <Tx x={bb} y={596} s={48} c="#2d3a6b">{e.d.small}</Tx> : null}
          {[[bb - 310, 390], [bb + 320, 400], [bb - 290, 590], [bb + 310, 588]].map(([x, y], i) => (
            <path key={i} d={`M${x},${y - 14}L${x + 4},${y - 4}L${x + 14},${y}L${x + 4},${y + 4}L${x},${y + 14}L${x - 4},${y + 4}L${x - 14},${y}L${x - 4},${y - 4}Z`} fill="#ffd04a" stroke={INK} strokeWidth={2} />
          ))}
        </g>
      ) : null}
    </g>
  );
};

/* ───── 桌椅 ───── */
export const Desk: React.FC<{x: number; id: string}> = ({x, id}) => (
  <g>
    <Sh p={rect(x - 26, 866, 44, 10)} fill="#d69b5c" ink={INK} id={id + 'seat'} sw={2.2} hatch={0} />
    <Ln p={[[x - 24, 866], [x - 24, 790]]} id={id + 'back'} ink="#9a6a3c" sw={6} />
    <Ln p={[[x - 20, 876], [x - 20, 900]]} id={id + 'cl1'} ink="#7a7a80" sw={4} />
    <Ln p={[[x + 14, 876], [x + 14, 900]]} id={id + 'cl2'} ink="#7a7a80" sw={4} />
    <Sh p={rect(x + 34, 800, 120, 12)} fill="#e0a868" ink={INK} id={id + 'top'} sw={2.4} hatch={0} />
    <Ln p={[[x + 44, 812], [x + 44, 900]]} id={id + 'dl1'} ink="#7a7a80" sw={4} />
    <Ln p={[[x + 144, 812], [x + 144, 900]]} id={id + 'dl2'} ink="#7a7a80" sw={4} />
    <Sh p={rect(x + 60, 788, 54, 12)} fill="#ffffff" ink={INK} id={id + 'book'} sw={2} hatch={0} />
  </g>
);

/* ───── building：招牌入口＋室內（剖面）：鐘、黑板、座位（原作座標 O=9300） ───── */
const Building: React.FC<{e: BuildingSt; f: number; pane: string}> = ({e, f, pane}) => {
  if (!vd(e.dx)(9300, 11300)) return null;
  const ring = f >= e.bell && f < e.bell + 50 ? Math.sin((f - e.bell) * 1.9) * 5 : 0;
  const id = 'b' + e.i;
  const bd = e.d.board;
  return (
    <g transform={`translate(${e.dx} 0)`}>
      {/* 招牌入口 */}
      <Sh p={rect(9420, 470, 54, 430)} fill="#efe3cf" ink={INK} id={id + 'gp1'} />
      <Sh p={rect(9740, 470, 54, 430)} fill="#efe3cf" ink={INK} id={id + 'gp2'} />
      <Sh p={rect(9362, 410, 490, 100)} fill="#a9412f" ink={INK} id={id + 'garch'} hatch={2} />
      <Sh p={rect(9376, 422, 462, 76)} ink="#f3d27a" id={id + 'garchi'} sw={2.4} />
      <Tx x={9607} y={482} s={64} c="#fff6dc">{e.d.sign}</Tx>
      {/* 室內 */}
      <Sh p={[[9780, 300], [10430, 220], [11120, 300]]} fill="#c95c44" ink={INK} id={id + 'roof'} hatch={2} />
      <Sh p={rect(9860, 300, 1180, 600)} fill="#fbefd6" ink={INK} id={id + 'wall'} />
      <Sh p={rect(9820, 300, 44, 600)} fill="#e3c9a0" ink={INK} id={id + 'wl'} />
      <Sh p={rect(11040, 300, 44, 600)} fill="#e3c9a0" ink={INK} id={id + 'wr'} />
      <Sh p={rect(9860, 300, 1180, 30)} fill="#e3c9a0" ink={INK} id={id + 'ceil'} sw={2} />
      <g transform={`rotate(${ring} 9810 360)`}>
        <Sh p={ell(9800, 400, 30, 30, 16)} fill="#e04a3a" ink={INK} id={id + 'bell'} />
        <circle cx={9800} cy={400} r={8} fill="#ffd04a" />
      </g>
      {ring !== 0 ? <Ln p={[[9752, 370], [9736, 360]]} id={id + 'bl1'} ink="#e04a3a" sw={3} /> : null}
      {ring !== 0 ? <Ln p={[[9752, 430], [9736, 440]]} id={id + 'bl2'} ink="#e04a3a" sw={3} /> : null}
      {/* 黑板：1～2 行粉筆字（讀 storyboard） */}
      <Sh p={rect(10010, 420, 560, 250)} fill="#3f6b50" ink="#6b4a2a" id={id + 'board'} sw={6} hatch={1} />
      {bd.map((t, i) => (
        <Tx key={i} x={10050} y={bd.length === 1 ? 560 : 512 + i * 82} s={48} c="#f4f1e6" w={400} a="start" op={0.94}>{t}</Tx>
      ))}
      <Ln p={[[10380, 644], [10420, 624], [10460, 644], [10500, 624], [10540, 644]]} id={id + 'cwave'} ink="#9fd8ff" sw={3} />
      <Sh p={rect(10040, 664, 80, 10)} fill="#f4f1e6" ink={null} id={id + 'chalk'} />
      {/* 窗 */}
      <Sh p={rect(10680, 420, 300, 230)} fill={pane} ink={INK} id={id + 'win'} hatch={0} />
      <Ln p={[[10830, 420], [10830, 650]]} id={id + 'wm'} ink={INK} sw={4} />
      <Ln p={[[10700, 440], [10760, 500]]} id={id + 'wg'} ink="#ffffff" sw={4} op={0.8} />
      <Desk x={10180} id={id + 'd1'} />
      <Desk x={10380} id={id + 'd2'} />
      <Desk x={10580} id={id + 'd3'} />
      {/* 旁邊座位的人 */}
      <g transform={`translate(10180 ${GY})`}><Kid pose="sit" bag={false} id={id + 'c1'} shirt="#f3b0c4" hair="#2b1f1a" blink={(f + 40) % 89 < 3} /></g>
      <g transform={`translate(10580 ${GY})`}><Kid pose="sit" bag={false} id={id + 'c2'} shirt="#a8dca0" hair="#8a5a32" blink={(f + 13) % 103 < 3} /></g>
    </g>
  );
};

/* ───── pool：水池（原作座標 O=11200） ───── */
const SPLASH = Array.from({length: 30}, (_, i) => ({vx: (r01('sx' + i) - 0.5) * 22, vy: -14 - r01('sy' + i) * 16, r: 5 + r01('sr' + i) * 8}));
const Pool: React.FC<{e: PoolSt; f: number}> = ({e, f}) => {
  if (!vd(e.dx)(11200, 13300)) return null;
  const surf = (x: number) => 905 + Math.sin(x * 0.018 + f * 0.12) * 4;
  const wpts: Pt[] = [];
  for (let x = 11850; x <= 13100; x += 25) wpts.push([x, surf(x)]);
  const t = f - e.splash;
  const id = 'p' + e.i;
  return (
    <g transform={`translate(${e.dx} 0)`}>
      <Ln p={[[11380, 900], [11380, 680]]} id={id + 'sl'} ink="#6b5a4a" sw={9} />
      <Ln p={[[11560, 900], [11560, 680]]} id={id + 'sr'} ink="#6b5a4a" sw={9} />
      <Sh p={rect(11290, 520, 360, 170)} fill="#eaf6ff" ink={INK} id={id + 'sign'} sw={3} />
      <Tx x={11470} y={608} s={80} c="#1f63a8">{e.d.sign}</Tx>
      <Ln p={[[11330, 650], [11370, 636], [11410, 650], [11450, 636], [11490, 650], [11530, 636], [11570, 650], [11610, 636]]} id={id + 'swave'} ink="#4aa8e0" sw={4} />
      <path d="M11640,560Q12450,640 13240,560" fill="none" stroke="#6b5a4a" strokeWidth={2.4} />
      {Array.from({length: 22}, (_, i) => {
        const x = 11680 + i * 72;
        const p = (x - 11640) / 1600;
        const y = 560 + 4 * 80 * p * (1 - p) * 0.95;
        return <path key={i} d={`M${x},${y}L${x + 34},${y + 1}L${x + 17},${y + 40}Z`} fill={['#e8574a', '#ffd04a', '#4c8fd0', '#55b06a'][i % 4]} stroke={INK} strokeWidth={1.8} />;
      })}
      <Ln p={[[11640, 900], [11640, 550]]} id={id + 'pp1'} ink="#6b5a4a" sw={8} />
      <Ln p={[[13240, 900], [13240, 550]]} id={id + 'pp2'} ink="#6b5a4a" sw={8} />
      <Sh p={rect(11630, 872, 70, 28)} fill="#d0d6dc" ink={INK} id={id + 'dbase'} sw={2.4} />
      <Sh p={rect(11610, 860, 200, 12)} fill="#f2f2ee" ink={INK} id={id + 'dboard'} sw={2.4} hatch={0} />
      {f >= e.crouch ? <Sh p={rrect(11650, 830, 40, 30, 8)} fill="#f07f55" ink={INK} id={id + 'bag'} sw={2.2} /> : null}
      <Sh p={rect(11830, 900, 20, 180)} fill="#ffffff" ink={INK} id={id + 'wl'} sw={2} hatch={0} />
      <Sh p={rect(13100, 900, 20, 180)} fill="#ffffff" ink={INK} id={id + 'wr'} sw={2} hatch={0} />
      <path d={'M11850,1080L' + wpts.map((p) => `${p[0]},${p[1].toFixed(1)}`).join('L') + 'L13100,1080Z'} fill="#63c3ea" />
      <path d={'M11850,1080L' + wpts.map((p) => `${p[0]},${p[1].toFixed(1)}`).join('L') + 'L13100,1080Z'} fill="url(#h13)" />
      <Ln p={wpts} id={id + 'surf'} ink="#2c7fb0" sw={3} amp={0.8} />
      {[960, 1010, 1050].map((y, i) => <Ln key={y} p={[[11900 + i * 120, y], [12000 + i * 120, y]]} id={id + 'wl' + i} ink="#ffffff" sw={3} op={0.6} />)}
      {t >= 0 && t < 40 ? (
        <g>
          {(() => {
            const h = 150 * Math.sin(Math.min(1, t / 26) * Math.PI) * (t < 26 ? 1 : 0);
            const w = 60 + t * 4;
            return h > 2 ? <Sh p={[[12060 - w, 905], [12060 - w * 0.7, 905 - h], [12060 - w * 0.35, 905 - h * 0.55], [12060, 905 - h * 1.1], [12060 + w * 0.35, 905 - h * 0.55], [12060 + w * 0.7, 905 - h], [12060 + w, 905]]} fill="#d8f2ff" ink="#2c7fb0" id={id + 'crown'} sw={3} /> : null;
          })()}
          {SPLASH.map((d, i) => {
            const x = 12060 + d.vx * t;
            const y = 900 + d.vy * t + 0.9 * t * t;
            return y < 905 ? <Sh key={i} p={ell(x, y, d.r, d.r * 1.2, 8)} fill="#bfe8ff" ink="#2c7fb0" id={id + 'drop' + i} sw={2} hatch={0} /> : null;
          })}
        </g>
      ) : null}
      {t >= 0 && t < 90
        ? [0, 1].map((i) => {
            const tt = t - i * 12;
            return tt > 0 ? <ellipse key={i} cx={12060} cy={907} rx={30 + tt * 4} ry={6 + tt * 0.4} fill="none" stroke="#ffffff" strokeWidth={3} opacity={Math.max(0, 1 - tt / 70)} /> : null;
          })
        : null}
      {t > 2 && t < 26
        ? [0, 1, 2, 3, 4].map((i) => <circle key={i} cx={12060 + Math.sin(i * 2.1 + t * 0.3) * 20} cy={1060 - (t * 6 + i * 22) % 150} r={5 + (i % 3) * 2} fill="none" stroke="#ffffff" strokeWidth={2.4} />)
        : null}
    </g>
  );
};

/* ───── 最後的房間（原作座標 O=13230）：門口小黑板、門牌、冷氣吊牌、書桌便條都讀 storyboard ───── */
const Bed: React.FC<{x: number}> = ({x}) => (
  <g>
    <Ln p={[[x, 900], [x, 740]]} id="bedp1" ink="#8a5a3a" sw={12} />
    <Ln p={[[x + 400, 900], [x + 400, 660]]} id="bedp2" ink="#8a5a3a" sw={12} />
    <Sh p={rect(x + 400 - 6, 680, 12, 140)} fill="#b07a4a" ink={INK} id="bedhb" sw={2.4} />
    <Sh p={rect(x, 830, 400, 18)} fill="#b07a4a" ink={INK} id="bedfr" sw={2.4} hatch={2} />
    <Sh p={rrect(x + 8, 800, 384, 32, 10)} fill="#fbfbf6" ink={INK} id="bedmt" sw={2.2} hatch={0} />
    <Sh p={rrect(x + 300, 778, 86, 30, 12)} fill="#ffffff" ink={INK} id="bedpl" sw={2.2} hatch={0} />
    <Sh p={rrect(x + 14, 786, 270, 26, 10)} fill="#b5e0a0" ink={INK} id="bedbl" sw={2.2} />
  </g>
);
const Chest: React.FC = () => (
  <g>
    <Sh p={rect(13900, 680, 280, 220)} fill="#d9a46a" ink={INK} id="chest" hatch={2} />
    {[700, 766, 832].map((y, i) => (
      <g key={y}>
        <Sh p={rect(13916, y, 248, 56)} fill="#e8bd86" ink={INK} id={'drw' + i} sw={2.2} hatch={0} />
        <circle cx={14040} cy={y + 28} r={6} fill="#7a5232" />
      </g>
    ))}
    <Sh p={rrect(13930, 630, 50, 50, 8)} fill="#e07a4a" ink={INK} id="cpot" sw={2.2} />
    <Sh p={ell(13955, 606, 44, 34, 12)} fill="#7fc25a" ink="#3f6e2e" id="cplant" sw={2.2} />
    <Sh p={rect(14070, 600, 80, 80)} fill="#fffaf0" ink={INK} id="frame" sw={3} />
    <Sh p={[[14080, 670], [14100, 640], [14118, 656], [14130, 632], [14142, 670]]} fill="#9fd26b" ink={null} id="frpic" />
  </g>
);
export const Room: React.FC<{f: number; pane: string; lampOn: boolean; streetLamp: boolean}> = ({f, pane, lampOn, streetLamp}) => {
  if (!vd(R.dx)(13150, 16900)) return null;
  const door = seg(f, [[R.dormDoor, 0], [R.dormDoor + 10, 1, 'o'], [R.acOn - 10, 1], [R.acOn, 0]]);
  const ac = f >= R.acOn;
  const d = R.d;
  const pl = d.plate;
  return (
    <g transform={`translate(${R.dx} 0)`}>
      {/* 路燈 */}
      <Ln p={[[13230, 900], [13230, 520], [13280, 500]]} id="slamp" ink="#5d6470" sw={8} />
      <Sh p={[[13262, 490], [13310, 490], [13300, 516], [13270, 516]]} fill={streetLamp ? '#ffe9a0' : '#e8e8e0'} ink={INK} id="slh" sw={2.2} hatch={0} />
      {/* 門口小黑板 */}
      {d.easel.length ? (
        <g>
          <Ln p={[[13320, 900], [13360, 600]]} id="ez1" ink="#8a5a3a" sw={7} />
          <Ln p={[[13580, 900], [13540, 600]]} id="ez2" ink="#8a5a3a" sw={7} />
          <Sh p={rect(13290, 560, 320, 236)} fill="#3d644c" ink="#7a5232" id="pboard" sw={7} />
          {d.easel[0] ? <Tx x={13450} y={620} s={44} c="#f6f2e4" op={0.95}>{d.easel[0]}</Tx> : null}
          {d.easel[1] ? <Tx x={13450} y={672} s={36} c="#f6f2e4" w={400} op={0.95}>{d.easel[1]}</Tx> : null}
          {d.easel[2] ? <Tx x={13450} y={756} s={66} c="#ffe27a">{d.easel[2]}</Tx> : null}
        </g>
      ) : null}
      {/* 外牆與門 */}
      <Sh p={rect(13540, 80, 3400, 70)} fill="#b9573f" ink={INK} id="droof" hatch={2} />
      <Sh p={rect(13600, 150, 220, 750)} fill="#e7b088" ink={INK} id="dfac" />
      {[220, 300, 380, 660, 740].map((y) => <Ln key={y} p={[[13604, y], [13816, y]]} id={'brk' + y} ink="#c98a62" sw={2.4} />)}
      <Sh p={rect(13650, 680, 120, 220)} fill="#5a3a2a" ink={INK} id="ddoor" hatch={0} />
      <Sh p={rect(13650, 680, 120 * (1 - 0.8 * door), 220)} fill="#b8673f" ink={INK} id="ddp" hatch={2} />
      {/* 房間剖面 */}
      <Sh p={rect(13820, 150, 3100, 750)} fill="#fbeacf" ink={INK} id="rwall" />
      {Array.from({length: 40}, (_, i) => 13880 + i * 80).filter((x) => vis(x + R.dx, x + R.dx)).map((x) => <line key={x} x1={x} y1={160} x2={x} y2={890} stroke="#f1d3ad" strokeWidth={6} />)}
      <Sh p={rect(13820, 150, 3100, 26)} fill="#e7d0b0" ink={INK} id="rceil" sw={2} />
      {/* 門牌（畫在牆前面，可以比外牆寬） */}
      {pl.length ? (
        <g>
          <Sh p={rect(13580, 452, 260, 170)} fill="#fffaf0" ink="#7a5232" id="dplate" sw={4} />
          {pl.length === 1 ? (
            <Tx x={13710} y={556} s={52} c="#c0392b">{pl[0]}</Tx>
          ) : (
            <g>
              <Tx x={13710} y={514} s={40}>{pl[0]}</Tx>
              <Tx x={13710} y={592} s={52} c="#c0392b">{pl[1]}</Tx>
            </g>
          )}
        </g>
      ) : null}
      {/* 冷氣＋吊牌 */}
      <Sh p={rrect(13980, 200, 290, 96, 14)} fill="#f6f8fa" ink={INK} id="ac" hatch={0} />
      <Ln p={[[14000, 278], [14250, 278]]} id="acv" ink="#8a96a4" sw={3} />
      <circle cx={14244} cy={226} r={6} fill={ac ? '#3fd06a' : '#9aa2aa'} />
      {ac
        ? [0, 1, 2].map((i) => {
            const ph = ((f - R.acOn) * 0.05 + i / 3) % 1;
            const y0 = 300 + ph * 120;
            const x0 = 14040 + i * 80;
            return <path key={i} d={`M${x0},${y0}q14,14 0,28q-14,14 0,28`} fill="none" stroke="#7cc8f0" strokeWidth={4} strokeLinecap="round" opacity={0.9 * Math.sin(ph * Math.PI)} />;
          })
        : null}
      {d.tag ? (
        <g>
          <Ln p={[[14290, 296], [14330, 330]]} id="tagstr" ink="#7a6a5a" sw={2} />
          <g transform="rotate(-4 14416 360)">
            <Sh p={rrect(14296, 330, 240, 64, 12)} fill="#d6efff" ink={INK} id="actag" sw={2.6} />
            <Tx x={14436} y={375} s={38} c="#1f5f9e">{d.tag}</Tx>
            <g transform="translate(14328 362)">{[0, 60, 120].map((a) => <line key={a} x1={-14 * Math.cos((a * Math.PI) / 180)} y1={-14 * Math.sin((a * Math.PI) / 180)} x2={14 * Math.cos((a * Math.PI) / 180)} y2={14 * Math.sin((a * Math.PI) / 180)} stroke="#3a8ad0" strokeWidth={3.4} strokeLinecap="round" />)}</g>
          </g>
        </g>
      ) : null}
      <Chest />
      {/* 天花板燈 */}
      <Ln p={[[14700, 176], [14700, 230]]} id="cord" ink="#6b5a4a" sw={3} />
      <Sh p={[[14650, 230], [14750, 230], [14730, 262], [14670, 262]]} fill={lampOn ? '#fff2b0' : '#e8e2d2'} ink={INK} id="clamp" sw={2.4} hatch={0} />
      {/* 書架、便條、書桌、檯燈 */}
      <Sh p={rect(14560, 550, 340, 14)} fill="#c98a52" ink={INK} id="shelf" sw={2.4} />
      {[0, 1, 2, 3, 4, 5].map((i) => <Sh key={i} p={rect(14580 + i * 34, 470 - (i % 2) * 14, 28, 80 + (i % 2) * 14)} fill={['#e8574a', '#4c8fd0', '#ffd04a', '#55b06a', '#f59ac0', '#8a6ad0'][i]} ink={INK} id={'bk' + i} sw={2} />)}
      {d.note ? (
        <g transform="rotate(-3 14722 384)">
          {/* 貼在書架上方的牆上：不會被檯燈燈罩和主角的頭擋住 */}
          <Sh p={rect(14572, 342, 300, 82)} fill="#ffe98a" ink={INK} id="snote" sw={2.6} />
          <Sh p={rect(14700, 332, 44, 18)} fill="#f0b0c0" ink={null} id="spin" op={0.9} />
          <Tx x={14722} y={396} s={38} c="#3b2f2a">{d.note}</Tx>
        </g>
      ) : null}
      <Desk x={14520} id="dd" />
      <Sh p={rect(14554, 800, 340, 14)} fill="#e0a868" ink={INK} id="dtop" sw={2.4} hatch={0} />
      <Ln p={[[14880, 814], [14880, 900]]} id="dleg" ink="#7a7a80" sw={5} />
      <Sh p={ell(14830, 796, 34, 8, 12)} fill="#5d6470" ink={INK} id="lbase" sw={2.2} hatch={0} />
      <Ln p={[[14830, 792], [14850, 720], [14800, 676]]} id="larm" ink="#5d6470" sw={6} />
      <Sh p={[[14770, 660], [14826, 664], [14812, 704], [14752, 694]]} fill={lampOn ? '#fff1a8' : '#e06a4a'} ink={INK} id="lshade" sw={2.4} hatch={0} />
      <Bed x={14980} />
      {/* 窗 */}
      <Sh p={rect(15500, 180, 490, 460)} fill="#b07a4a" ink={INK} id="wframe" hatch={2} />
      <Sh p={rect(15520, 200, 450, 420)} fill={pane} ink={INK} id="wpane" hatch={0} />
      <Sh p={rect(15480, 630, 530, 22)} fill="#c98a52" ink={INK} id="wsill" sw={2.4} />
      <Sh p={[[15440, 170], [15540, 170], [15520, 520], [15470, 660], [15440, 660]]} fill="#f6b3c8" ink={INK} id="curL" sw={2.4} />
      <Sh p={[[16050, 170], [15950, 170], [15970, 520], [16020, 660], [16050, 660]]} fill="#f6b3c8" ink={INK} id="curR" sw={2.4} />
      <Sh p={rrect(15890, 584, 56, 46, 8)} fill="#e07a4a" ink={INK} id="pot" sw={2.2} />
      <Sh p={ell(15918, 560, 40, 30, 12)} fill="#7fc25a" ink="#3f6e2e" id="plant" sw={2.2} />
    </g>
  );
};

/** 整個世界（主角與交通車另外畫） */
export const World: React.FC<{f: number; pane: string; lampOn: boolean; streetLamp: boolean}> = ({f, pane, lampOn, streetLamp}) => (
  <g>
    <Home f={f} />
    {TL.st.map((e) =>
      e.type === 'ride' ? (
        <g key={e.i}><Country e={e} /><Stop e={e} /></g>
      ) : e.type === 'building' ? (
        <Building key={e.i} e={e} f={f} pane={pane} />
      ) : (
        <Pool key={e.i} e={e} f={f} />
      ),
    )}
    <Room f={f} pane={pane} lampOn={lampOn} streetLamp={streetLamp} />
  </g>
);
