/* 筆跟著筆跡：每一筆（字、線、線稿）都登記「位置＋開始時間＋長度」，筆尖永遠停在正在畫的那一筆的尖端。
   用法（在一個場景元件裡）：
     const K = makePenKit(f, sceneFrom, sceneDur);
     return <>{K.text({x, y, text, size, font, color, start, dur})}{K.path({d, start, dur})}{K.sketch('router', x, y, 1.2, start)}{K.pen()}</>;
   規則：沒有在畫 → 筆停在剛畫完的位置 8 格後收起；場景外 → 不畫筆。不會再有「飄在空中」的筆。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {DrawPath, DrawText, Pencil} from './draw';
import {Sketch, sketchFor} from './sketches';
import {textW} from '../tpl/common';

type Pt = [number, number];
export type Stroke = {start: number; dur: number; pts: Pt[]};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 把 SVG 路徑近似成折線（M L H V C Q A Z，大小寫皆可）。整圈的 a 弧（終點≈起點）當成圓，圓心在起點正下方 r。 */
export const pathPoints = (d: string): Pt[] => {
  const pts: Pt[] = [];
  let cx = 0, cy = 0, sx = 0, sy = 0;
  const re = /([MmLlHhVvCcQqAaZz])([^MmLlHhVvCcQqAaZz]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(d))) {
    const c = m[1], rel = c === c.toLowerCase();
    const n = (m[2].match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
    const C = c.toUpperCase();
    if (C === 'Z') { cx = sx; cy = sy; pts.push([cx, cy]); continue; }
    if (C === 'M') {
      for (let i = 0; i + 1 < n.length; i += 2) {
        cx = (rel ? cx : 0) + n[i]; cy = (rel ? cy : 0) + n[i + 1];
        if (i === 0) { sx = cx; sy = cy; }
        pts.push([cx, cy]);
      }
    } else if (C === 'L') {
      for (let i = 0; i + 1 < n.length; i += 2) { cx = (rel ? cx : 0) + n[i]; cy = (rel ? cy : 0) + n[i + 1]; pts.push([cx, cy]); }
    } else if (C === 'H') { for (const v of n) { cx = (rel ? cx : 0) + v; pts.push([cx, cy]); } }
    else if (C === 'V') { for (const v of n) { cy = (rel ? cy : 0) + v; pts.push([cx, cy]); } }
    else if (C === 'C' || C === 'Q') {
      const k = C === 'C' ? 6 : 4;
      for (let i = 0; i + k - 1 < n.length; i += k) {
        const p = Array.from({length: k / 2}, (_, j) => [(rel ? cx : 0) + n[i + j * 2], (rel ? cy : 0) + n[i + j * 2 + 1]] as Pt);
        const p0: Pt = [cx, cy];
        for (let s = 1; s <= 8; s++) {
          const t = s / 8;
          if (C === 'C') {
            const [a, b, e] = p, u = 1 - t;
            pts.push([u ** 3 * p0[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t ** 3 * e[0], u ** 3 * p0[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t ** 3 * e[1]]);
          } else {
            const [a, e] = p, u = 1 - t;
            pts.push([u * u * p0[0] + 2 * u * t * a[0] + t * t * e[0], u * u * p0[1] + 2 * u * t * a[1] + t * t * e[1]]);
          }
        }
        [cx, cy] = p[p.length - 1];
      }
    } else if (C === 'A') {
      for (let i = 0; i + 6 < n.length; i += 7) {
        const r = n[i], ex = (rel ? cx : 0) + n[i + 5], ey = (rel ? cy : 0) + n[i + 6];
        if (Math.hypot(ex - cx, ey - cy) < 2) {           // 整圈
          const ox = cx, oy = cy + r;
          for (let s = 1; s <= 24; s++) { const a = -Math.PI / 2 - (s / 24) * Math.PI * 2; pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r]); }
        } else pts.push([ex, ey]);
        cx = ex; cy = ey;
      }
    }
  }
  return pts;
};

const lengthOf = (pts: Pt[]) => pts.reduce((L, p, i) => (i ? L + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
const pointAt = (pts: Pt[], t: number): Pt => {
  if (pts.length < 2) return pts[0] ?? [0, 0];
  const L = lengthOf(pts) * Math.max(0, Math.min(1, t));
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= L) { const k = seg ? (L - acc) / seg : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
    acc += seg;
  }
  return pts[pts.length - 1];
};

export const makePenKit = (f: number, sceneFrom: number, sceneDur: number, ink = '#23324A') => {
  const strokes: Stroke[] = [];
  const text = (p: {x: number; y: number; text: string; size: number; font: string; color: string; start: number; dur: number}) => {
    const w = textW(p.text) * p.size * 0.98;
    strokes.push({start: p.start, dur: p.dur, pts: [[p.x, p.y - p.size * 0.32], [p.x + w, p.y - p.size * 0.32]]});
    return <DrawText key={`t${p.start}${p.text}`} {...p} f={f} />;
  };
  const path = (p: {d: string; start: number; dur: number; color?: string; w?: number; ox?: number; oy?: number; s?: number}) => {
    const s = p.s ?? 1, ox = p.ox ?? 0, oy = p.oy ?? 0;
    const local = pathPoints(p.d);
    const len = Math.max(40, lengthOf(local) * 1.08 + 10);
    strokes.push({start: p.start, dur: p.dur, pts: local.map(([x, y]) => [ox + x * s, oy + y * s] as Pt)});
    return <DrawPath key={`p${p.start}${p.d.slice(0, 20)}`} d={p.d} start={p.start} dur={p.dur} f={f} color={p.color ?? ink} w={(p.w ?? 5) / s} len={len} />;
  };
  /** 線稿：逐筆畫出（筆跟著走），畫完上色並依 alive 動起來；沒有對應線稿就畫圓框再貼 emoji */
  const sketch = (nameOrEmoji: string | undefined, x: number, y: number, size: number, start: number, accent = '#9ED8FF') => {
    const sk: Sketch | null = sketchFor(nameOrEmoji);
    const s = size / 200;
    if (!sk) {
      const circle = `M 100 10 a 90 90 0 1 0 0.1 0`;
      const done = start + 16;
      return (
        <g key={`sk${start}`}>
          <g transform={`translate(${x} ${y}) scale(${s})`}>{path({d: circle, start, dur: 16, ox: x, oy: y, s, w: 6})}</g>
          <text x={x + size / 2} y={y + size * 0.66} textAnchor="middle" fontFamily='"Segoe UI Emoji", "Noto Color Emoji", sans-serif' fontSize={size * 0.5}
            opacity={interpolate(f, [done, done + 8], [0, 1], clamp)}>{nameOrEmoji}</text>
        </g>
      );
    }
    const per = 9, total = sk.paths.length * per + 6;
    const done = start + total;
    const life = f - done;
    const alive = Math.max(0, Math.min(1, life / 10));
    const fill = interpolate(f, [done, done + 12], [0, 0.45], clamp);
    let tf = '';
    if (life > 0) {
      if (sk.alive === 'bob') tf = `translate(0 ${Math.sin(life / 6) * 5 * alive})`;
      if (sk.alive === 'pulse') tf = `translate(100 100) scale(${1 + 0.04 * Math.sin(life / 5) * alive}) translate(-100 -100)`;
      if (sk.alive === 'spin') tf = `rotate(${Math.sin(life / 12) * 10 * alive} 100 100)`;
    }
    return (
      <g key={`sk${start}`} transform={`translate(${x} ${y}) scale(${s})`}>
        <g transform={tf}>
          <path d={sk.paths[0]} fill={sk.fill ?? accent} opacity={fill} stroke="none" />
          {sk.paths.map((d, i) => {
            const isWave = sk.alive === 'wave' && i > 0 && life > 0;
            const el = path({d, start: start + i * per, dur: per + 4, ox: x, oy: y, s, w: 6});
            return isWave ? <g key={i} opacity={0.35 + 0.65 * ((Math.floor(life / 6) % sk.paths.length) >= i ? 1 : 0)}>{el}</g> : <g key={i}>{el}</g>;
          })}
          {sk.dots && life > 0 && sk.dots.map(([dx, dy], i) => (
            <circle key={i} cx={dx} cy={dy} r={9} fill={Math.floor((life + i * 5) / 8) % 2 === 0 ? '#FFD84D' : 'none'} stroke={ink} strokeWidth={3}
              style={{filter: Math.floor((life + i * 5) / 8) % 2 === 0 ? 'drop-shadow(0 0 8px #FFD84D)' : undefined}} />
          ))}
        </g>
      </g>
    );
  };
  /** 筆：在場景時間內，停在「最晚開始、仍在畫」的那一筆尖端；剛畫完的 8 格停在終點；其餘時間收起 */
  const pen = () => {
    if (f < sceneFrom || f > sceneFrom + sceneDur + 4) return null;
    const active = strokes.filter((s) => f >= s.start && f < s.start + s.dur).sort((a, b) => b.start - a.start)[0];
    let tip: Pt | null = null;
    if (active) {
      const t = interpolate(f, [active.start, active.start + active.dur], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
      tip = pointAt(active.pts, t);
    } else {
      const last = strokes.filter((s) => f >= s.start + s.dur && f < s.start + s.dur + 8).sort((a, b) => b.start + b.dur - (a.start + a.dur))[0];
      if (last) tip = last.pts[last.pts.length - 1];
    }
    if (!tip) return null;
    const jx = Math.sin(f * 2.1) * 2, jy = Math.cos(f * 1.7) * 2;
    return <g key="pen" transform={`translate(${tip[0] + 21.3 + jx} ${tip[1] - 14.9 + jy})`}><Pencil x={0} y={0} ink={ink} /></g>;
  };
  return {strokes, text, path, sketch, pen};
};
