/* 同一套線稿（sketches.ts），依範本畫成不同風格——範本裡不直接用 emoji（emoji 是彩色圖片，會破壞像素／黑白螢光的世界觀）。
   | 元件        | 範本            | 進場                         | 畫完後（alive）                    |
   | PixelIcon   | A 闖關遊戲      | 一列一列「載入」              | 一格一格跳、閃燈、硬幣式翻轉        |
   | NeonIcon    | C 動態字體快剪  | 一拍內描完線條               | 螢光填色＋發光、跳動／轉動          |
   | （penkit.sketch） | B 創客手稿 | 筆逐筆畫出（筆跟著走）        | 上色＋閃燈／轉動／擴散              |
   找不到對應線稿：A 畫「?」磚、C 畫「?」圈，並在建置時列出（make_video.py 會警告），請把新線稿補進 sketches.ts。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {pathPolys} from './penkit';
import {Sketch, sketchFor} from './sketches';

type Pt = [number, number];
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/* ---------- 點陣化 ---------- */
type Raster = {g: number; line: Set<number>; fill: Set<number>};
const cache = new Map<string, Raster>();
const inside = (polys: Pt[][], x: number, y: number) => {
  let c = false;
  for (const p of polys) for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    const [xi, yi] = p[i], [xj, yj] = p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
export const rasterize = (sk: Sketch, g = 20): Raster => {
  const key = sk.paths.join('|') + g;
  const hit = cache.get(key);
  if (hit) return hit;
  const cell = 200 / g, line = new Set<number>(), fill = new Set<number>();
  const put = (x: number, y: number) => { if (x >= 0 && y >= 0 && x < g && y < g) line.add(y * g + x); };
  for (const d of sk.paths) for (const poly of pathPolys(d)) {
    for (let i = 1; i < poly.length; i++) {
      let [x0, y0] = [Math.floor(poly[i - 1][0] / cell), Math.floor(poly[i - 1][1] / cell)];
      const [x1, y1] = [Math.floor(poly[i][0] / cell), Math.floor(poly[i][1] / cell)];
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let guard = 0; guard < 400; guard++) {
        put(x0, y0);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
  }
  const first = pathPolys(sk.paths[0]).filter((p) => p.length > 2);
  const closed = first.length > 0 && first.every((p) => Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 14);
  if (closed) for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) {
    const k = y * g + x;
    if (!line.has(k) && inside(first, (x + 0.5) * cell, (y + 0.5) * cell)) fill.add(k);
  }
  const r = {g, line, fill};
  cache.set(key, r);
  return r;
};

/** 像素圖示（範本 A）：f＝目前格、at＝開始格（同一時間軸） */
export const PixelIcon: React.FC<{name?: string; size: number; f: number; at?: number; line?: string; fill?: string; shade?: string; style?: React.CSSProperties}> = (
  {name, size, f, at = 0, line = '#F4F4F4', fill = '#41A6F6', shade, style}) => {
  const sk = sketchFor(name);
  const d = f - at;
  if (!sk) {
    const on = d >= 0;
    return (
      <div style={{width: size, height: size, background: on ? '#FFCD75' : 'transparent', border: `${size / 14}px solid #1A1C2C`, boxShadow: `${size / 16}px ${size / 16}px 0 #000`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace', fontWeight: 900, fontSize: size * 0.6, color: '#1A1C2C', ...style}}>{on ? '?' : ''}</div>
    );
  }
  const {g, line: L, fill: F} = rasterize(sk);
  const rows = Math.floor(Math.max(0, d) / 1.2);                // 載入：每 1.2 格多一列
  const life = d - g * 1.2;
  const fc = sk.fill ?? fill, dark = '#1A1C2C';
  let tf = '';
  if (life > 0) {
    const s = Math.floor(life / 5);
    if (sk.alive === 'bob') tf = `translateY(${s % 2 ? -size / g : 0}px)`;
    if (sk.alive === 'pulse') tf = `scale(${s % 4 === 0 ? 1.08 : 1})`;
    if (sk.alive === 'spin') tf = `scaleX(${[1, 0.6, 0.2, 0.6][Math.floor(life / 4) % 4]})`;
  }
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < Math.min(g, rows); y++) for (let x = 0; x < g; x++) {
    const k = y * g + x;
    const isL = L.has(k), isF = F.has(k);
    if (!isL && !isF) continue;
    const wave = sk.alive === 'wave' && life > 0 && isL ? (Math.floor(life / 6) % 4 >= Math.floor((g - y) / (g / 4)) ? 1 : 0.35) : 1;
    cells.push(<rect key={k} x={x} y={y} width={1.02} height={1.02} opacity={wave}
      fill={isL ? line : shade && y > g * 0.62 ? shade : fc} />);
  }
  const dots = life > 0 && sk.dots ? sk.dots.map(([dx, dy], i) => {
    const on = Math.floor((life + i * 5) / 8) % 2 === 0;
    const x = Math.floor(dx / (200 / g)), y = Math.floor(dy / (200 / g));
    return <rect key={`d${i}`} x={x - 0.5} y={y - 0.5} width={1.6} height={1.6} fill={on ? '#FFCD75' : dark} />;
  }) : null;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${g} ${g}`} shapeRendering="crispEdges"
      style={{overflow: 'visible', filter: `drop-shadow(${size / 24}px ${size / 24}px 0 #000)`, transform: tf, ...style}}>{cells}{dots}</svg>
  );
};

/** 螢光線條圖示（範本 C）：一拍內描完，接著螢光填色＋發光並依 alive 動 */
export const NeonIcon: React.FC<{name?: string; size: number; f: number; at?: number; beat?: number; stroke?: string; accent?: string; style?: React.CSSProperties}> = (
  {name, size, f, at = 0, beat = 12, stroke = '#fff', accent = '#D4FF00', style}) => {
  const sk = sketchFor(name);
  const d = f - at;
  if (!sk) {
    const p = interpolate(d, [0, beat], [0, 1], clamp);
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" style={style}>
        <circle cx={100} cy={100} r={84} fill="none" stroke={stroke} strokeWidth={10} strokeDasharray={530} strokeDashoffset={530 * (1 - p)} />
        <text x={100} y={138} textAnchor="middle" fontSize={110} fontWeight={900} fill={accent} opacity={p >= 1 ? 1 : 0}>?</text>
      </svg>
    );
  }
  const n = sk.paths.length, per = beat / n;
  const done = at + beat, life = f - done;
  const glow = interpolate(life, [0, 6], [0, 1], clamp);
  let tf = '';
  if (life > 0) {
    if (sk.alive === 'bob') tf = `translate(0 ${Math.sin(life / 4) * 6})`;
    if (sk.alive === 'pulse') tf = `translate(100 100) scale(${1 + 0.06 * Math.abs(Math.sin(life / 4))}) translate(-100 -100)`;
    if (sk.alive === 'spin') tf = `rotate(${Math.sin(life / 8) * 14} 100 100)`;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{overflow: 'visible', filter: glow > 0 ? `drop-shadow(0 0 ${14 * glow}px ${accent})` : undefined, ...style}}>
      <g transform={tf}>
        <path d={sk.paths[0]} fill={accent} opacity={0.9 * glow} stroke="none" />
        {sk.paths.map((p, i) => {
          const t = interpolate(f, [at + i * per, at + (i + 1) * per], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
          const wave = sk.alive === 'wave' && life > 0 && i > 0 ? (Math.floor(life / 5) % n >= i ? 1 : 0.3) : 1;
          return <path key={i} d={p} fill="none" stroke={stroke} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" pathLength={1}
            strokeDasharray={1} strokeDashoffset={1 - t} opacity={t > 0 ? wave : 0} />;
        })}
        {life > 0 && sk.dots?.map(([dx, dy], i) => (
          <circle key={i} cx={dx} cy={dy} r={10} fill={Math.floor((life + i * 4) / 6) % 2 === 0 ? accent : 'none'} stroke={stroke} strokeWidth={4} />
        ))}
      </g>
    </svg>
  );
};
