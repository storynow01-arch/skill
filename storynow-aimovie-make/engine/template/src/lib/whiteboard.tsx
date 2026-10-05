/* 白板手繪（範本D）：物件先描黑框、再上色並輕彈一下；一支馬克筆的筆尖永遠貼著正在畫的那一筆。
   物件＝資料（DrawItem／TextItem，含開始格、長度、位置），由 TemplateD 依場景排好時間，再交給這裡畫。
   圖示庫 WB_ICONS（扁平上色、黑色描邊，約 -100..100 座標）；沒有對應時退回 lib/sketches 的線稿＋淡色圓底，再沒有就畫圓框＋emoji。 */
import React from 'react';
import {Easing, interpolate} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {EMOJI_TO_SKETCH, sketchFor} from './sketches';

export const WB = {
  ink: '#26313d', blue: '#2b86bf', sky: '#9fd6ee', orange: '#f39a33', yellow: '#f7c94a', red: '#e5543f', green: '#3daa6a',
  white: '#ffffff', gray: '#c9ced4', skin: '#f3c9a6', brown: '#c98f55', kraft: '#d9a868', paper: '#efeff0',
};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.inOut(Easing.cubic);
export const lerp = (f: number, a: number, b: number, from = 0, to = 1, e = ease) =>
  b <= a ? (f >= b ? to : from) : interpolate(f, [a, b], [from, to], {...clamp, easing: e});

/* ---------- 物件 ---------- */
export type Fill = {d: string; c: string; o?: number};
export type Shape = {strokes: string[]; fills?: Fill[]; w?: number; ink?: string; extra?: React.ReactNode; o?: [number, number]};
export type Sfx = 'pop' | 'ding' | 'buzz' | 'none';
export type DrawItem = {kind: 'shape'; at: number; dur: number; x: number; y: number; s?: number; rot?: number; shape: Shape; sfx?: Sfx; boxId?: string};
export type TextItem = {kind: 'text'; at: number; dur: number; x: number; y: number; text: string; size: number; color?: string;
  bold?: boolean; anchor?: 'start' | 'middle'; sfx?: Sfx; box?: string};   // box＝所屬容器（品檢：字不可超出）
export type Item = DrawItem | TextItem;

const lenCache = new Map<string, number>();
export const plen = (d: string) => {
  let v = lenCache.get(d);
  if (v === undefined) { v = Math.max(1, getLength(d)); lenCache.set(d, v); }
  return v;
};
/** 字寬估計（全形 1、半形 0.56） */
export const wbTextW = (t: string, size: number) =>
  [...t].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? (ch === ' ' ? 0.3 : 0.56) : 1.0) * size, 0);

/** 某物件在 f 時的筆尖（世界座標）；沒在畫回傳 null */
export const tipOf = (it: Item, f: number): {x: number; y: number} | null => {
  const t = f - it.at;
  if (t < 0 || t > it.dur) return null;
  const p = it.dur ? t / it.dur : 1;
  if (it.kind === 'text') {
    const w = wbTextW(it.text, it.size);
    const x0 = it.anchor === 'middle' ? it.x - w / 2 : it.x;
    return {x: x0 + w * p, y: it.y - it.size * 0.35 + Math.sin(f * 1.7) * it.size * 0.22};
  }
  const {strokes, o = [0, 0]} = it.shape;
  const lens = strokes.map(plen);
  let L = lens.reduce((a, b) => a + b, 0) * p;
  for (let i = 0; i < lens.length; i++) {
    if (L <= lens[i] || i === lens.length - 1) {
      const pt = getPointAtLength(strokes[i], Math.min(L, lens[i]));
      const s = it.s ?? 1, r = ((it.rot ?? 0) * Math.PI) / 180;
      const px = (pt.x + o[0]) * s, py = (pt.y + o[1]) * s;
      return {x: it.x + px * Math.cos(r) - py * Math.sin(r), y: it.y + px * Math.sin(r) + py * Math.cos(r)};
    }
    L -= lens[i];
  }
  return null;
};

export const FILL_DUR = 9;
export const DrawShape: React.FC<{it: DrawItem; f: number}> = ({it, f}) => {
  const t = f - it.at;
  if (t < 0) return null;
  const {shape} = it;
  const lens = shape.strokes.map(plen);
  let L = lens.reduce((a, b) => a + b, 0) * Math.min(1, it.dur ? t / it.dur : 1);
  const fillP = lerp(t, it.dur, it.dur + FILL_DUR);
  const bump = 1 + 0.05 * Math.sin(Math.PI * lerp(t, it.dur, it.dur + 10, 0, 1, Easing.linear));
  const s = (it.s ?? 1) * bump;
  const [ox, oy] = shape.o ?? [0, 0];
  return (
    <g data-qa-box={it.boxId} transform={`translate(${it.x} ${it.y}) rotate(${it.rot ?? 0}) scale(${s}) translate(${ox} ${oy})`}>
      <g opacity={fillP}>{shape.fills?.map((fl, i) => <path key={i} d={fl.d} fill={fl.c} opacity={fl.o ?? 1} />)}</g>
      {shape.strokes.map((d, i) => {
        const vis = Math.max(0, Math.min(lens[i], L));
        L -= lens[i];
        if (vis <= 0) return null;
        return <path key={i} d={d} fill="none" stroke={shape.ink ?? WB.ink} strokeWidth={(shape.w ?? 7.5) / (it.s ?? 1)}
          strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${lens[i]} ${lens[i] + 10}`} strokeDashoffset={lens[i] - vis} />;
      })}
      {shape.extra && <g opacity={fillP}>{shape.extra}</g>}
    </g>
  );
};

export const DrawText: React.FC<{it: TextItem; f: number; id: string; hand: string; bold: string}> = ({it, f, id, hand, bold}) => {
  const t = f - it.at;
  if (t < 0) return null;
  const p = Math.min(1, it.dur ? t / it.dur : 1);
  const w = wbTextW(it.text, it.size);
  const x0 = it.anchor === 'middle' ? it.x - w / 2 : it.x;
  return (
    <g>
      <clipPath id={id}><rect x={x0 - 40} y={it.y - it.size * 1.3} width={(w + 90) * p} height={it.size * 1.8} /></clipPath>
      <text data-qa-in={it.box} clipPath={`url(#${id})`} x={it.x} y={it.y} textAnchor={it.anchor ?? 'start'} style={{fontFamily: it.bold ? bold : hand}}
        fontWeight={it.bold ? 900 : 700} fontSize={it.size} fill={it.color ?? WB.ink}>{it.text}</text>
    </g>
  );
};

/** 馬克筆（筆尖在原點，朝右下斜放），附淡陰影 */
export const Marker: React.FC<{x: number; y: number; scale: number; tilt: number}> = ({x, y, scale, tilt}) => (
  <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${48 + tilt})`}>
    <rect x={48} y={11} width={330} height={30} rx={12} fill="#000" opacity={0.16} transform="translate(0 14)" />
    <polygon points="2,0 30,-9 30,9" fill={WB.ink} />
    <path d="M30 -11 L52 -14 L52 14 L30 11 Z" fill="#9aa3ab" stroke={WB.ink} strokeWidth={4} strokeLinejoin="round" />
    <rect x={52} y={-15} width={250} height={30} rx={8} fill="#fff" stroke={WB.ink} strokeWidth={4} />
    <rect x={150} y={-15} width={40} height={30} fill={WB.blue} stroke={WB.ink} strokeWidth={4} />
    <rect x={290} y={-17} width={70} height={34} rx={10} fill={WB.blue} stroke={WB.ink} strokeWidth={4} />
    <path d="M62 -7 H140" stroke="#dfe5ea" strokeWidth={5} strokeLinecap="round" />
  </g>
);

/* ---------- 形狀小工具 ---------- */
export const R = (x: number, y: number, w: number, h: number, r = 0) =>
  r ? `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
    : `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
export const O = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
const Ln = (...p: number[]) => `M${p[0]} ${p[1]}` + Array.from({length: p.length / 2 - 1}, (_, i) => ` L${p[2 + i * 2]} ${p[3 + i * 2]}`).join('');
const C = WB;

/* ---------- 標記（打勾、打叉、底線、圈起來、卡片、箭頭） ---------- */
export const check = (): Shape => ({strokes: ['M-40 0 L-10 32 L45 -38'], w: 16, ink: C.green});
export const cross = (): Shape => ({strokes: ['M-38 -38 L38 38', 'M38 -38 L-38 38'], w: 16, ink: C.red});
export const question = (): Shape => ({strokes: ['M-35 -40 C -35 -95, 45 -95, 45 -45 C 45 -10, 5 -5, 5 30', O(5, 70, 7)], w: 16, ink: C.red, fills: [{d: O(5, 70, 7), c: C.red}]});
export const arrow = (len: number, bend = 0): Shape => ({strokes: [`M0 0 Q ${len / 2} ${bend} ${len} 0`, `M${len - 26} -18 L${len} 0 L${len - 26} 18`], w: 7});
export const underline = (w: number, c = C.orange): Shape => ({strokes: [`M0 0 C ${w * 0.3} 10, ${w * 0.7} -8, ${w} 4`], w: 9, ink: c});
export const circleMark = (rx: number, ry: number, c = C.red): Shape => ({
  strokes: [`M${-rx} 0 C ${-rx} ${-ry * 1.3}, ${rx} ${-ry * 1.3}, ${rx} 0 C ${rx} ${ry * 1.3}, ${-rx * 1.1} ${ry * 1.2}, ${-rx * 0.9} ${-ry * 0.2}`], w: 9, ink: c,
});
export const card = (w: number, h: number, c: string): Shape => {
  const d = R(-w / 2, -h / 2, w, h, 22);
  return {strokes: [d], fills: [{d, c, o: 0.9}], w: 6};
};
export const box = (w: number, h: number): Shape => ({strokes: [R(-w / 2, -h / 2, w, h, 14)], w: 6});

/* ---------- 圖示庫 ---------- */
export const WB_ICONS: Record<string, () => Shape> = {
  computer: () => ({
    strokes: [R(-95, -80, 190, 125, 10), R(-80, -66, 160, 97, 4), Ln(-20, 45, -28, 78), Ln(20, 45, 28, 78), Ln(-60, 80, 60, 80)],
    fills: [{d: R(-95, -80, 190, 125, 10), c: C.blue}, {d: R(-80, -66, 160, 97, 4), c: C.sky}, {d: 'M-20 45 L-28 78 L28 78 L20 45 Z', c: C.gray}],
    extra: <path d="M-60 -50 L-30 -50 M-60 -35 L-10 -35" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.8} />,
  }),
  laptop: () => ({
    strokes: [R(-80, -70, 160, 105, 8), R(-68, -58, 136, 82, 3), 'M-80 35 L-105 62 L105 62 L80 35'],
    fills: [{d: R(-80, -70, 160, 105, 8), c: C.blue}, {d: R(-68, -58, 136, 82, 3), c: C.sky}, {d: 'M-80 35 L-105 62 L105 62 L80 35 Z', c: C.gray}],
  }),
  phone: () => ({
    strokes: [R(-45, -85, 90, 170, 16), R(-35, -66, 70, 120, 3), O(0, 70, 6)],
    fills: [{d: R(-45, -85, 90, 170, 16), c: C.orange}, {d: R(-35, -66, 70, 120, 3), c: C.sky}],
  }),
  bubble: () => {
    const d = 'M-80 -50 Q-80 -70 -60 -70 H60 Q80 -70 80 -50 V10 Q80 30 60 30 H-10 L-40 60 L-30 30 H-60 Q-80 30 -80 10 Z';
    return {strokes: [d], fills: [{d, c: C.white}]};
  },
  question,
  book: () => {
    const cover = 'M-90 -70 Q-45 -90 0 -70 Q45 -90 90 -70 V70 Q45 50 0 70 Q-45 50 -90 70 Z';
    return {strokes: [cover, 'M0 -70 V70', 'M-70 -40 Q-40 -52 -16 -40', 'M-70 -10 Q-40 -22 -16 -10', 'M16 -40 Q40 -52 70 -40', 'M16 -10 Q40 -22 70 -10'], fills: [{d: cover, c: C.yellow}]};
  },
  handshake: () => {
    const a = 'M-110 -10 L-60 -40 L-10 -30 L30 0 L10 25 L-30 0 L-60 30 L-110 30 Z';
    const b = 'M110 -10 L60 -40 L20 -40 L-20 -10 L0 10 L30 -10 L60 30 L110 30 Z';
    return {strokes: [a, b], fills: [{d: a, c: C.orange}, {d: b, c: C.blue}]};
  },
  envelope: () => ({
    strokes: [R(-95, -60, 190, 120, 6), 'M-95 -60 L0 10 L95 -60', 'M-70 25 H-20', 'M-70 42 H0'],
    fills: [{d: R(-95, -60, 190, 120, 6), c: C.white}, {d: 'M-95 -60 L0 10 L95 -60 Z', c: '#e9eef3'}],
  }),
  stamp: () => {
    const edge = R(-55, -70, 110, 140, 4);
    return {strokes: [edge, R(-38, -52, 76, 104, 4), 'M-24 30 L-4 -10 L10 10 L22 -20 L30 30'], fills: [{d: edge, c: C.white}, {d: R(-38, -52, 76, 104, 4), c: C.red}]};
  },
  mailbox: () => {
    const body = 'M-50 -40 Q-50 -95 0 -95 Q50 -95 50 -40 V60 H-50 Z';
    return {strokes: [body, R(-34, -58, 68, 14, 4), 'M-12 60 V100 M12 60 V100', 'M-60 100 H60'], fills: [{d: body, c: C.red}, {d: R(-34, -58, 68, 14, 4), c: C.ink}]};
  },
  house: () => {
    const roof = 'M-100 0 L0 -90 L100 0 Z';
    return {strokes: [roof, 'M-80 -10 V90 H80 V-10', R(-22, 30, 44, 60, 4)],
      fills: [{d: roof, c: C.red}, {d: 'M-80 -10 V90 H80 V-10 L0 -80 Z', c: C.yellow}, {d: R(-22, 30, 44, 60, 4), c: C.blue}]};
  },
  ear: () => {
    const d = 'M-30 60 C -60 40, -70 -20, -40 -60 C -10 -95, 55 -90, 60 -30 C 64 10, 30 20, 20 45 C 12 65, -10 80, -30 60 Z';
    return {strokes: [d, 'M-20 -30 C -5 -55, 30 -50, 30 -20 C 30 0, 5 0, 5 20'], fills: [{d, c: C.skin}]};
  },
  gauge: () => {
    const arc = 'M-90 40 A 90 90 0 1 1 90 40 Z';
    return {strokes: [arc, 'M0 30 L55 -40', O(0, 30, 10)], fills: [{d: arc, c: C.sky}, {d: O(0, 30, 10), c: C.ink}]};
  },
  file: () => {
    const d = 'M-70 -95 H35 L70 -60 V95 H-70 Z';
    return {strokes: [d, 'M35 -95 V-60 H70', 'M-45 -40 H40', 'M-45 -10 H40', 'M-45 20 H40', 'M-45 50 H20'], fills: [{d, c: C.white}, {d: 'M35 -95 V-60 H70 Z', c: C.gray}]};
  },
  sofa: () => {
    const back = R(-90, -50, 180, 60, 18), seat = R(-110, 0, 220, 50, 16);
    return {strokes: [back, seat, 'M-90 50 V70 M90 50 V70'], fills: [{d: back, c: C.blue}, {d: seat, c: C.sky}]};
  },
  package: () => {
    const front = 'M-50 -20 L10 -20 L10 50 L-50 50 Z', top = 'M-50 -20 L-25 -45 L35 -45 L10 -20 Z', side = 'M10 -20 L35 -45 L35 25 L10 50 Z';
    return {strokes: [front, top, side, 'M-20 -20 V5'], fills: [{d: front, c: C.kraft}, {d: top, c: '#ecc690'}, {d: side, c: C.brown}]};
  },
  packet: () => ({
    strokes: [R(-95, -60, 190, 120, 6), 'M-95 -60 L0 10 L95 -60', R(-45, 10, 50, 36, 3)],
    fills: [{d: R(-95, -60, 190, 120, 6), c: C.white}, {d: 'M-95 -60 L0 10 L95 -60 Z', c: '#e9eef3'}, {d: R(-45, 10, 50, 36, 3), c: C.yellow}],
  }),
  road: () => ({
    strokes: ['M-130 -30 C -60 -50, 60 -10, 130 -30', 'M-130 30 C -60 10, 60 50, 130 30', 'M-110 0 H-80 M-50 0 H-20 M10 0 H40 M70 0 H100'],
    fills: [{d: 'M-130 -30 C -60 -50, 60 -10, 130 -30 L130 30 C 60 50, -60 10, -130 30 Z', c: C.gray}],
  }),
  routes: () => ({
    strokes: ['M-130 0 C -60 -90, 60 -90, 130 0', 'M-130 0 H130', 'M-130 0 C -60 90, 60 90, 130 0', O(-130, 0, 14), O(130, 0, 14)],
    w: 6, fills: [{d: O(-130, 0, 14), c: C.orange}, {d: O(130, 0, 14), c: C.blue}],
  }),
  retry: () => ({strokes: ['M40 -10 A 42 42 0 1 1 20 -40', 'M8 -55 L22 -38 L2 -26'], w: 9, ink: C.green}),
  tag: () => {
    const d = 'M-60 -30 H40 L65 0 L40 30 H-60 Z';
    return {strokes: [d, O(-40, 0, 7)], fills: [{d, c: C.orange}]};
  },
  bulb: () => {
    const d = 'M0 -80 C 50 -80, 70 -30, 40 10 C 28 26, 26 40, 26 52 H-26 C -26 40, -28 26, -40 10 C -70 -30, -50 -80, 0 -80 Z';
    return {strokes: [d, R(-26, 52, 52, 30, 6), 'M-14 0 L0 -24 L14 0'], fills: [{d, c: C.yellow}, {d: R(-26, 52, 52, 30, 6), c: C.gray}]};
  },
  lock: () => {
    const body = R(-60, -10, 120, 95, 12);
    return {strokes: [body, 'M-38 -10 V-40 A 38 38 0 0 1 38 -40 V-10', 'M0 25 V50'], fills: [{d: body, c: C.yellow}]};
  },
  clock: () => ({strokes: [O(0, 0, 80), 'M0 0 V-50 M0 0 L35 20'], fills: [{d: O(0, 0, 80), c: C.white}]}),
  trophy: () => {
    const cup = 'M-55 -80 H55 V-30 A55 55 0 0 1 -55 -30 Z';
    return {strokes: [cup, 'M-55 -60 H-80 Q-80 -10 -40 -10 M55 -60 H80 Q80 -10 40 -10', 'M0 25 V55', R(-45, 55, 90, 30, 6)],
      fills: [{d: cup, c: C.yellow}, {d: R(-45, 55, 90, 30, 6), c: C.orange}]};
  },
  person: () => {
    const head = O(0, -50, 34), body = 'M-70 90 Q-70 0 0 0 Q70 0 70 90 Z';
    return {strokes: [head, body], fills: [{d: head, c: C.skin}, {d: body, c: C.blue}]};
  },
  globe: () => ({strokes: [O(0, 0, 80), 'M-80 0 H80', 'M0 -80 Q-50 0 0 80 M0 -80 Q50 0 0 80'], fills: [{d: O(0, 0, 80), c: C.sky}]}),
  cloud: () => {
    const d = 'M-60 50 Q-100 50 -95 15 Q-90 -15 -55 -12 Q-45 -60 0 -55 Q40 -52 50 -15 Q95 -15 95 18 Q95 50 60 50 Z';
    return {strokes: [d], fills: [{d, c: C.white}]};
  },
  wifi: () => ({strokes: [O(0, 55, 9), 'M-32 28 Q0 0 32 28', 'M-60 2 Q0 -48 60 2', 'M-88 -24 Q0 -96 88 -24'], w: 10, ink: C.blue, fills: [{d: O(0, 55, 9), c: C.blue}]}),
  rocket: () => {
    const body = 'M0 -95 Q45 -50 35 40 H-35 Q-45 -50 0 -95 Z';
    return {strokes: [body, 'M-35 20 L-65 60 L-30 50 M35 20 L65 60 L30 50', O(0, -30, 15), 'M-15 45 L0 85 L15 45'],
      fills: [{d: body, c: C.white}, {d: O(0, -30, 15), c: C.sky}, {d: 'M-15 45 L0 85 L15 45 Z', c: C.orange}]};
  },
  warning: () => {
    const d = 'M0 -85 L90 75 H-90 Z';
    return {strokes: [d, 'M0 -30 V20', 'M0 45 V48'], fills: [{d, c: C.yellow}]};
  },
  gear: () => {
    const teeth = Array.from({length: 8}, (_, i) => { const a = (i / 8) * Math.PI * 2; return `M${Math.cos(a) * 60} ${Math.sin(a) * 60} L${Math.cos(a) * 85} ${Math.sin(a) * 85}`; }).join(' ');
    return {strokes: [O(0, 0, 60), teeth, O(0, 0, 22)], w: 9, fills: [{d: O(0, 0, 60), c: C.gray}, {d: O(0, 0, 22), c: C.white}]};
  },
  magnifier: () => ({strokes: [O(-15, -15, 55), 'M25 25 L80 80'], w: 10, fills: [{d: O(-15, -15, 55), c: C.sky}]}),
  checklist: () => {
    const d = R(-65, -90, 130, 180, 10);
    return {strokes: [d, 'M-45 -45 L-35 -35 L-15 -55 M5 -45 H45', 'M-45 5 L-35 15 L-15 -5 M5 5 H45', 'M-45 55 L-35 65 L-15 45 M5 55 H45'], fills: [{d, c: C.white}]};
  },
  network: () => ({strokes: [O(0, -60, 22), O(-70, 55, 22), O(70, 55, 22), 'M-10 -40 L-58 35 M10 -40 L58 35 M-48 55 H48'],
    fills: [{d: O(0, -60, 22), c: C.orange}, {d: O(-70, 55, 22), c: C.blue}, {d: O(70, 55, 22), c: C.blue}]}),
  server: () => ({strokes: [R(-60, -85, 120, 50, 6), R(-60, -25, 120, 50, 6), R(-60, 35, 120, 50, 6)],
    fills: [{d: R(-60, -85, 120, 50, 6), c: C.blue}, {d: R(-60, -25, 120, 50, 6), c: C.blue}, {d: R(-60, 35, 120, 50, 6), c: C.blue}],
    extra: <g fill={C.green}><circle cx={-38} cy={-60} r={7} /><circle cx={-38} cy={0} r={7} /><circle cx={-38} cy={60} r={7} /></g>}),
};

const EXTRA_EMOJI: Record<string, string> = {
  '🤝': 'handshake', '👂': 'ear', '📄': 'file', '📃': 'file', '🗂️': 'file', '🛋️': 'sofa', '🛋': 'sofa', '🛣️': 'road', '❓': 'question', '❔': 'question',
  '✅': 'check', '✔️': 'check', '❌': 'cross', '✖️': 'cross', '🏷️': 'tag', '🎫': 'stamp', '📯': 'stamp', '⏲️': 'gauge', '🏎️': 'gauge', '💬': 'bubble', '🔀': 'routes',
  '🔁': 'retry', '🔄': 'retry', '📨': 'packet', '📩': 'packet', '🖥️': 'computer', '💻': 'laptop', '📦': 'package', '🏠': 'house', '🏫': 'house',
};

/** 名稱或 emoji → 可描線的圖示。依序：白板圖示 → 線稿庫（淡色圓底）→ 圓框＋emoji */
export const iconFor = (key?: string): Shape => {
  if (key) {
    const name = WB_ICONS[key] ? key : EXTRA_EMOJI[key] ?? EMOJI_TO_SKETCH[key];
    if (name === 'check') return check();
    if (name === 'cross') return cross();
    if (name && WB_ICONS[name]) return WB_ICONS[name]();
    const sk = sketchFor(key) ?? sketchFor(name);
    if (sk) return {strokes: sk.paths, o: [-100, -100], w: 7, fills: [{d: O(100, 100, 82), c: sk.fill ?? C.sky, o: 0.75}]};
  }
  return {strokes: [O(0, 0, 80)], fills: [{d: O(0, 0, 80), c: C.sky, o: 0.6}],
    extra: key ? <text x={0} y={30} textAnchor="middle" fontSize={84}>{key}</text> : undefined};
};
